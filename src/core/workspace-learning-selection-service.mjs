import { createHash } from 'node:crypto';

import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';
import { buildWorkspaceLearningSelectionOverrides } from './workspace-learning-selection.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

function hashText(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function validateAuditNote(note, label) {
  if (containsTrainingSecret(note)) {
    throw new Error(`Workspace learning selection override ${label} cannot contain raw secrets.`);
  }
  if (containsRawCustomerPayload(note)) {
    throw new Error(
      `Workspace learning selection override ${label} cannot contain raw customer payloads.`,
    );
  }
}

function readTimestamp(now) {
  const value = normalizeText(now());
  if (!value || !Number.isFinite(Date.parse(value))) {
    throw new Error('Workspace learning selection override clock is invalid.');
  }
  return value;
}

function appendHistory(candidate, historyEntry) {
  const history = Array.isArray(candidate.workspaceLearningSelectionOverrideHistory)
    ? candidate.workspaceLearningSelectionOverrideHistory
    : [];
  return [...history, historyEntry];
}

export function createWorkspaceLearningSelectionService({
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
      .listMemoryEntries({ scope: 'workspace', scopeId: workspace.id })
      .find((entry) => entry.id === promotion?.memoryId);
    return {
      candidate,
      memory,
      workspace,
      eligible:
        candidate.workspaceId === workspace.id &&
        candidate.promotionStatus === 'promoted' &&
        candidate.promotionVerification?.status === 'passed' &&
        candidate.promotionScopeAuthorization?.status === 'consumed' &&
        promotion?.decision === 'approve' &&
        promotion?.target === 'memory' &&
        promotion?.scope === 'workspace' &&
        promotion?.scopeId === workspace.id &&
        memory?.kind === 'decision' &&
        memory?.scope === 'workspace' &&
        memory?.scopeId === workspace.id,
    };
  }

  function getEligiblePromotion(candidateId) {
    const evidence = getPromotionEvidence(candidateId);
    if (!evidence.eligible) {
      throw new Error('Workspace learning selection override evidence is incomplete.');
    }
    return evidence;
  }

  function getWorkspaceLearningSelectionOverrideReadModel(candidateId) {
    const { candidate, eligible, memory, workspace } = getPromotionEvidence(candidateId);
    if (!eligible) {
      return null;
    }

    const observedAt = readTimestamp(now);
    const current = buildWorkspaceLearningSelectionOverrides({
      learningCandidates: [candidate],
      observedAt,
      workspaceId: workspace.id,
    })[0] || null;

    return {
      candidateId: candidate.id,
      current,
      historyCount: Array.isArray(candidate.workspaceLearningSelectionOverrideHistory)
        ? candidate.workspaceLearningSelectionOverrideHistory.length
        : 0,
      memoryId: memory.id,
      observedAt,
      status: current?.status || 'not-set',
      workspaceId: workspace.id,
    };
  }

  function setWorkspaceLearningSelectionOverride(candidateId, { expiresAt = '', note = '' } = {}) {
    const { candidate, memory, workspace } = getEligiblePromotion(candidateId);
    const normalizedNote = normalizeText(note);
    if (!normalizedNote) {
      throw new Error('Workspace learning selection override note is required.');
    }
    validateAuditNote(normalizedNote, 'note');

    const setAt = readTimestamp(now);
    const normalizedExpiresAt = normalizeText(expiresAt);
    if (
      !normalizedExpiresAt ||
      !Number.isFinite(Date.parse(normalizedExpiresAt)) ||
      Date.parse(normalizedExpiresAt) <= Date.parse(setAt)
    ) {
      throw new Error('Workspace learning selection override expiration must be in the future.');
    }

    const selectionOverride = {
      candidateId: candidate.id,
      expiresAt: normalizedExpiresAt,
      id: `${candidate.id}:workspace-learning-selection-override:${Date.parse(setAt)}`,
      memoryId: memory.id,
      note: normalizedNote,
      noteHash: hashText(normalizedNote),
      setAt,
      setBy: 'local-operator',
      status: 'active',
      workspaceId: workspace.id,
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
      workspaceId: workspace.id,
    };
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      updatedAt: setAt,
      workspaceLearningSelectionOverride: selectionOverride,
      workspaceLearningSelectionOverrideHistory: appendHistory(current, historyEntry),
    }));
    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return {
      learningCandidate: updatedCandidate,
      selectionOverride,
    };
  }

  function clearWorkspaceLearningSelectionOverride(candidateId, { note = '' } = {}) {
    const { candidate, workspace } = getEligiblePromotion(candidateId);
    const currentOverride = candidate.workspaceLearningSelectionOverride;
    if (!currentOverride || currentOverride.status !== 'active') {
      throw new Error('Workspace learning selection override is not active.');
    }

    const normalizedNote = normalizeText(note);
    if (!normalizedNote) {
      throw new Error('Workspace learning selection override clear note is required.');
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
      workspaceId: workspace.id,
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
      workspaceLearningSelectionOverride: selectionOverride,
      workspaceLearningSelectionOverrideHistory: appendHistory(current, historyEntry),
    }));
    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return {
      learningCandidate: updatedCandidate,
      selectionOverride,
    };
  }

  return {
    clearWorkspaceLearningSelectionOverride,
    getWorkspaceLearningSelectionOverrideReadModel,
    setWorkspaceLearningSelectionOverride,
  };
}
