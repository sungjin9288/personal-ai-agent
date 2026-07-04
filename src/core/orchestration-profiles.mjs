import { MISSION_MODES, SPECIALIST_KINDS } from './constants.mjs';

const KNOWLEDGE_DELIVERABLE_TYPES = ['decision-memo', 'prd', 'execution-plan', 'research-brief', 'checklist'];
const ENGINEERING_DELIVERABLE_TYPES = ['implementation-proposal'];

const ORCHESTRATION_PROFILES = Object.freeze([
  {
    deliverableTypes: KNOWLEDGE_DELIVERABLE_TYPES,
    description: 'Research plus implementation handoff for knowledge synthesis missions.',
    displayName: 'Knowledge Research + Implementation',
    id: 'knowledge-research-implementation',
    mergeOwner: 'manager',
    mode: 'knowledge',
    parallelSpecialistKinds: ['research', 'implementation'],
    qualityGate: 'manager-merge-ready',
    retryPolicy: 'resume-blocked-or-failed-branch',
  },
  {
    deliverableTypes: KNOWLEDGE_DELIVERABLE_TYPES,
    description: 'Research, implementation, and verification fan-out for higher-confidence knowledge missions.',
    displayName: 'Knowledge Triad',
    id: 'knowledge-triad',
    mergeOwner: 'manager',
    mode: 'knowledge',
    parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    qualityGate: 'verification-signal-required',
    retryPolicy: 'resume-verification-fast',
  },
  {
    deliverableTypes: KNOWLEDGE_DELIVERABLE_TYPES,
    description: 'Research, implementation, verification, design, and documentation fan-out for full-spectrum knowledge synthesis.',
    displayName: 'Knowledge Full Spectrum',
    id: 'knowledge-full-spectrum',
    mergeOwner: 'manager',
    mode: 'knowledge',
    parallelSpecialistKinds: ['research', 'implementation', 'verification', 'design', 'documentation'],
    qualityGate: 'research-and-verification-signal-required',
    retryPolicy: 'resume-research-and-verification-fast',
  },
  {
    deliverableTypes: ENGINEERING_DELIVERABLE_TYPES,
    description: 'Implementation plus verification split for bounded engineering proposals.',
    displayName: 'Engineering Implementation + Verification',
    id: 'engineering-implementation-verification',
    mergeOwner: 'manager',
    mode: 'engineering',
    parallelSpecialistKinds: ['implementation', 'verification'],
    qualityGate: 'verification-signal-required',
    retryPolicy: 'resume-verification-fast',
  },
  {
    deliverableTypes: ENGINEERING_DELIVERABLE_TYPES,
    description: 'Research, implementation, and verification split for wider engineering discovery.',
    displayName: 'Engineering Triad',
    id: 'engineering-triad',
    mergeOwner: 'manager',
    mode: 'engineering',
    parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    qualityGate: 'research-and-verification-signal-required',
    retryPolicy: 'resume-research-and-verification-fast',
  },
  {
    deliverableTypes: ENGINEERING_DELIVERABLE_TYPES,
    description: 'Research, implementation, verification, design, and documentation split for broader engineering discovery and handoff.',
    displayName: 'Engineering Full Spectrum',
    harnessPatterns: [
      'hermes-agent-session-loop',
      'parallel-subagent-workstreams',
      'provider-aware-tool-calling',
      'memory-backed-handoff',
    ],
    id: 'engineering-full-spectrum',
    mergeOwner: 'manager',
    mode: 'engineering',
    parallelSpecialistKinds: ['research', 'implementation', 'verification', 'design', 'documentation'],
    qualityGate: 'research-and-verification-signal-required',
    recommendedProvider: 'hermes',
    runtimeBlueprint: 'hermes-agent-full-spectrum',
    retryPolicy: 'resume-research-and-verification-fast',
  },
]);

const PROFILE_BY_ID = new Map(ORCHESTRATION_PROFILES.map((profile) => [profile.id, profile]));

function normalizeText(value) {
  return String(value || '').trim();
}

function cloneProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    deliverableTypes: [...profile.deliverableTypes],
    harnessPatterns: Array.isArray(profile.harnessPatterns) ? [...profile.harnessPatterns] : [],
    parallelSpecialistKinds: [...profile.parallelSpecialistKinds],
  };
}

export function listOrchestrationProfiles() {
  return ORCHESTRATION_PROFILES.map((profile) => cloneProfile(profile));
}

export function resolveOrchestrationProfile({ deliverableType = '', mode = '', profileId = '' } = {}) {
  const normalizedMode = normalizeText(mode);
  const normalizedDeliverableType = normalizeText(deliverableType);
  const normalizedProfileId = normalizeText(profileId).toLowerCase();

  if (!normalizedProfileId) {
    return null;
  }

  const profile = PROFILE_BY_ID.get(normalizedProfileId);
  if (!profile) {
    throw new Error(`Unsupported orchestration profile: ${normalizedProfileId}`);
  }

  if (normalizedMode && MISSION_MODES.includes(normalizedMode) && profile.mode !== normalizedMode) {
    throw new Error(
      `Orchestration profile ${normalizedProfileId} only supports ${profile.mode} missions, not ${normalizedMode}.`,
    );
  }

  if (normalizedDeliverableType && !profile.deliverableTypes.includes(normalizedDeliverableType)) {
    throw new Error(
      `Orchestration profile ${normalizedProfileId} does not support deliverable type ${normalizedDeliverableType}.`,
    );
  }

  const invalidKinds = profile.parallelSpecialistKinds.filter((kind) => !SPECIALIST_KINDS.includes(kind));
  if (invalidKinds.length) {
    throw new Error(`Orchestration profile ${normalizedProfileId} contains unsupported specialist kinds.`);
  }

  return cloneProfile(profile);
}
