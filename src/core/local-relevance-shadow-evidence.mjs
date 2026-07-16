import { createHash } from 'node:crypto';

import { assertLocalRelevanceShadowObservation } from './local-relevance-shadow.mjs';
import { assertLocalRerankerRuntimeStability } from './local-reranker-runtime-stability.mjs';

export const LOCAL_RELEVANCE_SHADOW_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-evidence/v1';

const REQUIRED_ROLES = Object.freeze(['executor', 'manager', 'planner', 'reviewer']);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function buildEvidenceContent({
  expectedSourceKeyHash,
  mission,
  observations,
  observedAt,
  priorStability,
  runtime,
} = {}) {
  assertLocalRerankerRuntimeStability(priorStability);
  const normalizedObservations = ensureArray(observations);
  normalizedObservations.forEach(assertLocalRelevanceShadowObservation);
  if (!normalizedObservations.length || !isSha256(expectedSourceKeyHash)) {
    throw new Error('Shadow integration evidence requires observations and expected source binding.');
  }
  if (!Number.isFinite(Date.parse(normalizeText(observedAt)))) {
    throw new Error('Shadow integration evidence observedAt must be a valid timestamp.');
  }

  const priorBinding = priorStability.runs[0]?.binding || {};
  const scorer = priorStability.priorEnvelope?.scorer || {};
  const normalizedRuntime = {
    cloudFeaturesDisabled: runtime?.cloudFeaturesDisabled === true,
    externalProviderCalls: 'none',
    kind: normalizeText(runtime?.kind),
    modelDigest: normalizeText(runtime?.modelDigest),
    networkIsolation: 'not-proven',
    transportLoopback: runtime?.transportLoopback === true,
    version: normalizeText(runtime?.version),
  };
  if (
    normalizedRuntime.kind !== 'ollama' ||
    !normalizedRuntime.version ||
    !normalizedRuntime.transportLoopback ||
    normalizedRuntime.modelDigest !== priorBinding.modelDigest
  ) {
    throw new Error('Shadow integration runtime must retain the R10 loopback model binding.');
  }

  const roles = [...new Set(normalizedObservations.map((item) => item.scope.role))].sort();
  const roleCoveragePassed = REQUIRED_ROLES.every((role) => roles.includes(role));
  const scorerBindingPassed = normalizedObservations.every((item) =>
    item.scorer.id === scorer.id &&
    item.scorer.modelId === scorer.modelId &&
    item.scorer.promptHash === priorBinding.promptHash &&
    item.scorer.promptVersion === priorBinding.promptVersion,
  );
  const providerInputPreserved = normalizedObservations.every((item) =>
    item.providerInput.changed === false &&
    item.providerInput.lexicalResultHash === item.providerInput.returnedResultHash,
  );
  const observedCount = normalizedObservations.filter((item) => item.status === 'observed').length;
  const expectedTopOneCount = normalizedObservations.filter(
    (item) => item.selection.shadowSourceKeyHashes[0] === expectedSourceKeyHash,
  ).length;
  const lexicalTopOneCount = normalizedObservations.filter(
    (item) => item.selection.lexicalSourceKeyHashes[0] === expectedSourceKeyHash,
  ).length;
  const changedTopOneCount = normalizedObservations.filter(
    (item) => item.selection.topSourceChanged === true,
  ).length;
  const validated =
    priorStability.actualLocalRerankerRuntimeStabilityValidated === true &&
    priorStability.runtimeActivation === false &&
    normalizedRuntime.cloudFeaturesDisabled &&
    mission?.status === 'completed' &&
    mission?.providerId === 'stub' &&
    mission?.artifactShadowMetadataFound === false &&
    mission?.storeShadowMetadataFound === false &&
    roleCoveragePassed &&
    scorerBindingPassed &&
    providerInputPreserved &&
    observedCount === normalizedObservations.length &&
    expectedTopOneCount === normalizedObservations.length;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowIntegrationQualified: false,
    actualLocalRelevanceShadowIntegrationValidated: validated,
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    governance: {
      licenseApproved: false,
      osLevelEgressIsolationProven: false,
      productionConcurrencyApproved: false,
      rollbackOwnerApproved: false,
      runtimeActivationApproved: false,
    },
    mission: {
      auditMutationRequired: false,
      artifactShadowMetadataFound: mission?.artifactShadowMetadataFound === true,
      observationCount: normalizedObservations.length,
      providerId: normalizeText(mission?.providerId),
      providerInputPreserved,
      requiredRoles: [...REQUIRED_ROLES],
      roleCoveragePassed,
      roles,
      status: normalizeText(mission?.status),
      storeSchemaMutationRequired: false,
      storeShadowMetadataFound: mission?.storeShadowMetadataFound === true,
    },
    observations: normalizedObservations,
    observedAt: normalizeText(observedAt),
    priorBinding: {
      modelDigest: priorBinding.modelDigest,
      promptHash: priorBinding.promptHash,
      promptVersion: priorBinding.promptVersion,
      resourceEnvelopeHash: priorStability.priorEnvelope.envelopeHash,
      runtimeStabilityHash: priorStability.stabilityHash,
      scorerId: priorBinding.scorerId,
    },
    productionReadyClaim: false,
    quality: {
      changedTopOneCount,
      controlledFixtureOnly: true,
      expectedSourceKeyHash,
      expectedTopOneCount,
      lexicalTopOneCount,
      observationCount: normalizedObservations.length,
      scorerBindingPassed,
    },
    rollback: {
      mode: 'lexical',
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_EVIDENCE_SCHEMA_VERSION,
    status: validated
      ? 'shadow-mission-integration-passed-governance-blocked'
      : 'failed-keep-lexical',
  };
}

export function buildLocalRelevanceShadowEvidence(input = {}) {
  const content = buildEvidenceContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-relevance-shadow-evidence-${evidenceHash}`,
  };
}

export function assertLocalRelevanceShadowEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `local-relevance-shadow-evidence-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    ensureArray(evidence?.observations).forEach(assertLocalRelevanceShadowObservation);
  } catch (error) {
    errors.push(`observation:${error.message}`);
  }
  if (
    evidence?.schemaVersion !== LOCAL_RELEVANCE_SHADOW_EVIDENCE_SCHEMA_VERSION ||
    evidence?.activation?.authorized !== false ||
    evidence?.runtimeActivation !== false ||
    evidence?.productionReadyClaim !== false ||
    evidence?.runtime?.externalProviderCalls !== 'none' ||
    evidence?.mission?.providerInputPreserved !== true ||
    evidence?.mission?.artifactShadowMetadataFound !== false ||
    evidence?.mission?.storeSchemaMutationRequired !== false ||
    evidence?.mission?.auditMutationRequired !== false
  ) {
    errors.push('claim-boundary');
  }
  if (
    evidence?.actualLocalRelevanceShadowIntegrationValidated !== true ||
    evidence?.actualLocalRelevanceShadowIntegrationQualified !== false ||
    evidence?.status !== 'shadow-mission-integration-passed-governance-blocked'
  ) {
    errors.push('decision');
  }
  if (errors.length) {
    throw new Error(`Local relevance shadow evidence failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
