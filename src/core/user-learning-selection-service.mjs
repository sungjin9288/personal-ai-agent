import { createHash } from 'node:crypto';

import { GLOBAL_USER_SCOPE_ID } from './constants.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';
import { buildUserLearningSelectionOverrides } from './user-learning-selection.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

function hashText(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function validateAuditNote(note, label) {
  if (containsTrainingSecret(note)) {
    throw new Error(`User learning selection override ${label} cannot contain raw secrets.`);
  }
  if (containsRawCustomerPayload(note)) {
    throw new Error(
      `User learning selection override ${label} cannot contain raw customer payloads.`,
    );
  }
}

function readTimestamp(now) {
  const value = normalizeText(now());
  if (!value || !Number.isFinite(Date.parse(value))) {
    throw new Error('User learning selection override clock is invalid.');
  }
  return value;
}

function appendHistory(candidate, historyEntry) {
  const history = Array.isArray(candidate.userLearningSelectionOverrideHistory)
    ? candidate.userLearningSelectionOverrideHistory
    : [];
  return [...history, historyEntry];
}

export function createUserLearningSelectionService({
  getMission,
  getWorkspace,
  now,
  store,
  writeUpdatedLearningCandidateArtifact,
}) {
  function getPromotionEvidence(candidateId) {
    const candidate = store
      .listLearningCandidates()
      .find((item) => item.id === normalizeText(candidateId));
    if (!candidate) {
      throw new Error(`Learning candidate not found: ${candidateId}`);
    }

    const mission = getMission(candidate.missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const promotion = candidate.promotionDecision;
    const memory = store
      .listMemoryEntries({ scope: 'user', scopeId: GLOBAL_USER_SCOPE_ID })
      .find((entry) => entry.id === promotion?.memoryId);
    return {
      candidate,
      memory,
      workspace,
      eligible:
        candidate.workspaceId === workspace.id &&
        !normalizeText(workspace.tenantId) &&
        candidate.promotionStatus === 'promoted' &&
        candidate.promotionVerification?.status === 'passed' &&
        candidate.promotionScopeAuthorization?.status === 'consumed' &&
        promotion?.decision === 'approve' &&
        promotion?.target === 'memory' &&
        promotion?.scope === 'user' &&
        promotion?.scopeId === GLOBAL_USER_SCOPE_ID &&
        memory?.kind === 'decision' &&
        memory?.scope === 'user' &&
        memory?.scopeId === GLOBAL_USER_SCOPE_ID,
    };
  }

  function getEligiblePromotion(candidateId) {
    const evidence = getPromotionEvidence(candidateId);
    if (!evidence.eligible) {
      throw new Error('User learning selection override evidence is incomplete.');
    }
    return evidence;
  }

  function getUserLearningSelectionOverrideReadModel(candidateId) {
    const { candidate, eligible, memory, workspace } = getPromotionEvidence(candidateId);
    if (!eligible) {
      return null;
    }

    const observedAt = readTimestamp(now);
    const current = buildUserLearningSelectionOverrides({
      learningCandidates: [candidate],
      observedAt,
    })[0] || null;

    return {
      candidateId: candidate.id,
      current,
      historyCount: Array.isArray(candidate.userLearningSelectionOverrideHistory)
        ? candidate.userLearningSelectionOverrideHistory.length
        : 0,
      memoryId: memory.id,
      observedAt,
      scope: 'user',
      scopeId: GLOBAL_USER_SCOPE_ID,
      sourceWorkspaceId: workspace.id,
      status: current?.status || 'not-set',
    };
  }

  function setUserLearningSelectionOverride(candidateId, { expiresAt = '', note = '' } = {}) {
    const { candidate, memory } = getEligiblePromotion(candidateId);
    const normalizedNote = normalizeText(note);
    if (!normalizedNote) {
      throw new Error('User learning selection override note is required.');
    }
    validateAuditNote(normalizedNote, 'note');

    const setAt = readTimestamp(now);
    const normalizedExpiresAt = normalizeText(expiresAt);
    if (
      !normalizedExpiresAt ||
      !Number.isFinite(Date.parse(normalizedExpiresAt)) ||
      Date.parse(normalizedExpiresAt) <= Date.parse(setAt)
    ) {
      throw new Error('User learning selection override expiration must be in the future.');
    }

    const selectionOverride = {
      candidateId: candidate.id,
      expiresAt: normalizedExpiresAt,
      id: `${candidate.id}:user-learning-selection-override:${Date.parse(setAt)}`,
      memoryId: memory.id,
      note: normalizedNote,
      noteHash: hashText(normalizedNote),
      scope: 'user',
      scopeId: GLOBAL_USER_SCOPE_ID,
      setAt,
      setBy: 'local-operator',
      status: 'active',
    };
    const historyEntry = {
      action: 'set',
      at: setAt,
      expiresAt: normalizedExpiresAt,
      memoryId: memory.id,
      note: normalizedNote,
      noteHash: selectionOverride.noteHash,
      overrideId: selectionOverride.id,
      performedBy: 'local-operator',
      scope: 'user',
      scopeId: GLOBAL_USER_SCOPE_ID,
    };
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      updatedAt: setAt,
      userLearningSelectionOverride: selectionOverride,
      userLearningSelectionOverrideHistory: appendHistory(current, historyEntry),
    }));
    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return {
      learningCandidate: updatedCandidate,
      selectionOverride,
    };
  }

  function clearUserLearningSelectionOverride(candidateId, { note = '' } = {}) {
    const { candidate } = getEligiblePromotion(candidateId);
    const currentOverride = candidate.userLearningSelectionOverride;
    if (!currentOverride || currentOverride.status !== 'active') {
      throw new Error('User learning selection override is not active.');
    }

    const normalizedNote = normalizeText(note);
    if (!normalizedNote) {
      throw new Error('User learning selection override clear note is required.');
    }
    validateAuditNote(normalizedNote, 'clear note');

    const clearedAt = readTimestamp(now);
    const clearNoteHash = hashText(normalizedNote);
    const historyEntry = {
      action: 'clear',
      at: clearedAt,
      memoryId: currentOverride.memoryId,
      note: normalizedNote,
      noteHash: clearNoteHash,
      overrideId: currentOverride.id,
      performedBy: 'local-operator',
      scope: 'user',
      scopeId: GLOBAL_USER_SCOPE_ID,
    };
    const selectionOverride = {
      ...currentOverride,
      clearNote: normalizedNote,
      clearNoteHash,
      clearedAt,
      clearedBy: 'local-operator',
      status: 'cleared',
    };
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      updatedAt: clearedAt,
      userLearningSelectionOverride: selectionOverride,
      userLearningSelectionOverrideHistory: appendHistory(current, historyEntry),
    }));
    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return {
      learningCandidate: updatedCandidate,
      selectionOverride,
    };
  }

  return {
    clearUserLearningSelectionOverride,
    getUserLearningSelectionOverrideReadModel,
    setUserLearningSelectionOverride,
  };
}
