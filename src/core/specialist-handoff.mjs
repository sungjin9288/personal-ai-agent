import { ACTION_OWNERS } from './constants.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeStringList(items) {
  return Array.isArray(items) ? items.map((item) => normalizeText(item)).filter(Boolean) : [];
}

function normalizeActionOwner(value, fallback = 'workspace-owner') {
  const normalized = normalizeText(value, fallback);
  return ACTION_OWNERS.includes(normalized) ? normalized : fallback;
}

export function normalizeSpecialistHandoff(handoff, fallback = {}) {
  const source = ensureObject(handoff);
  const nextSource = ensureObject(source.nextHandoff);
  const currentState = normalizeText(source.currentState, fallback.currentState || fallback.summaryText || '');
  const deliverables = normalizeStringList(source.deliverables);
  const acceptanceCriteria = normalizeStringList(source.acceptanceCriteria);
  const evidence = normalizeStringList(source.evidence);
  const blockers = normalizeStringList(source.blockers);
  const nextHandoff = {
    recommendedOwner: normalizeActionOwner(nextSource.recommendedOwner, fallback.recommendedOwner || 'workspace-owner'),
    request: normalizeText(nextSource.request, fallback.nextAction || ''),
    targetRole: normalizeText(nextSource.targetRole, fallback.targetRole || 'manager-merge'),
  };

  if (!currentState && !deliverables.length && !acceptanceCriteria.length && !evidence.length && !nextHandoff.request) {
    return null;
  }

  return {
    acceptanceCriteria,
    blockers,
    currentState,
    deliverables,
    evidence,
    nextHandoff,
  };
}

export function buildFallbackSpecialistHandoff({
  specialistKind,
  status,
  summaryText,
  nextAction = '',
  recommendedOwner = 'workspace-owner',
}) {
  return normalizeSpecialistHandoff(
    {
      acceptanceCriteria: [`Close the ${specialistKind} branch in status ${status}.`],
      blockers: ['blocked', 'failed'].includes(status) ? [summaryText || `${specialistKind} branch requires follow-up.`] : [],
      currentState: summaryText || `${specialistKind} branch is ${status}.`,
      deliverables: [summaryText || `${specialistKind} specialist branch recorded a draft.`],
      evidence: [summaryText || `${specialistKind} specialist branch state captured.`],
      nextHandoff: {
        recommendedOwner,
        request: nextAction || `Review the ${specialistKind} branch and decide whether to resume or merge it.`,
        targetRole: 'manager-merge',
      },
    },
    {},
  );
}
