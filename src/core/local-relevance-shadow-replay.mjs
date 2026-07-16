import { createHash } from 'node:crypto';

import { assertLocalRelevanceBenchmarkFixture } from './local-relevance-benchmark.mjs';
import { assertLocalRelevanceShadowEvidence } from './local-relevance-shadow-evidence.mjs';
import { assertLocalRelevanceShadowObservation } from './local-relevance-shadow.mjs';

export const LOCAL_RELEVANCE_SHADOW_REPLAY_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-replay/v1';

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

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil((percentileValue / 100) * sorted.length) - 1, 0);
  return Number(sorted[index].toFixed(3));
}

function buildLatency(observations) {
  const durations = observations.map((item) => Number(item.latencyMs));
  return {
    maximumMs: percentile(durations, 100),
    modelInferenceCount: observations.reduce(
      (sum, item) => sum + Number(item.selection.inputCandidateCount || 0),
      0,
    ),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    shadowRerankPassCount: observations.length,
    totalMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(3)),
  };
}

function countBy(items, keyOf) {
  const counts = {};
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = Number(counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function buildLocalRelevanceShadowReplayFixtureContract({ fixture, fixtureHash } = {}) {
  assertLocalRelevanceBenchmarkFixture(fixture);
  if (!isSha256(fixtureHash)) {
    throw new Error('Shadow replay fixture hash must be SHA-256.');
  }

  const cases = fixture.scenarios.flatMap((scenario) => {
    if (ensureArray(scenario.expectedSources).length !== 1) {
      throw new Error(`Shadow replay requires one expected source per scenario: ${scenario.id}.`);
    }
    return ensureArray(scenario.queries).map((query) => ({
      expectedSourceType: normalizeText(scenario.expectedSources[0].type),
      id: `${normalizeText(scenario.id)}:${normalizeText(query.id)}`,
      queryId: normalizeText(query.id),
      scenarioId: normalizeText(scenario.id),
      variationType: normalizeText(query.variationType),
    }));
  }).sort((left, right) => left.id.localeCompare(right.id));
  const variationCounts = countBy(cases, (item) => item.variationType);
  const requiredVariationTypes = [...ensureArray(fixture.coverage.requiredVariationTypes)].sort();
  if (
    new Set(cases.map((item) => item.id)).size !== cases.length ||
    fixture.scenarios.length < Number(fixture.coverage.minimumScenarioCount || 0) ||
    requiredVariationTypes.some(
      (variationType) =>
        Number(variationCounts[variationType] || 0) <
        Number(fixture.coverage.minimumCasesPerVariation || 0),
    )
  ) {
    throw new Error('Shadow replay fixture does not satisfy the recorded coverage contract.');
  }

  const content = {
    caseCount: cases.length,
    cases,
    fixtureHash: normalizeText(fixtureHash),
    fixtureSchemaVersion: normalizeText(fixture.schemaVersion),
    requiredRoles: [...REQUIRED_ROLES],
    requiredVariationTypes,
    scenarioCount: fixture.scenarios.length,
    variationCounts,
  };
  return {
    ...content,
    contractHash: hashRecord(content),
  };
}

function normalizeFixtureContract(contract = {}) {
  const { contractHash, ...content } = contract;
  if (
    contractHash !== hashRecord(content) ||
    !isSha256(content.fixtureHash) ||
    !normalizeText(content.fixtureSchemaVersion) ||
    !Array.isArray(content.cases) ||
    !content.cases.length ||
    JSON.stringify(content.requiredRoles) !== JSON.stringify(REQUIRED_ROLES)
  ) {
    throw new Error('Unsupported shadow replay fixture contract.');
  }
  return contract;
}

function normalizeCase(input, expectedCase, priorShadowEvidence) {
  const observations = ensureArray(input.observations);
  observations.forEach(assertLocalRelevanceShadowObservation);
  const missionIdHash = normalizeText(input.mission?.missionIdHash);
  const expectedSourceKeyHash = normalizeText(input.expectedSourceKeyHash);
  if (
    normalizeText(input.id) !== expectedCase.id ||
    normalizeText(input.scenarioId) !== expectedCase.scenarioId ||
    normalizeText(input.queryId) !== expectedCase.queryId ||
    normalizeText(input.variationType) !== expectedCase.variationType ||
    normalizeText(input.expectedSourceType) !== expectedCase.expectedSourceType ||
    !isSha256(missionIdHash) ||
    !isSha256(expectedSourceKeyHash)
  ) {
    throw new Error(`Shadow replay case binding failed: ${expectedCase.id}.`);
  }
  const roles = observations.map((item) => item.scope.role).sort();
  if (
    observations.length !== REQUIRED_ROLES.length ||
    JSON.stringify(roles) !== JSON.stringify(REQUIRED_ROLES) ||
    observations.some((item) => item.scope.missionIdHash !== missionIdHash)
  ) {
    throw new Error(`Shadow replay requires exact four-role mission coverage: ${expectedCase.id}.`);
  }
  const priorScorer = priorShadowEvidence.observations[0].scorer;
  const scorerBindingPassed = observations.every((item) =>
    item.scorer.id === priorShadowEvidence.priorBinding.scorerId &&
    item.scorer.modelId === priorScorer.modelId &&
    item.scorer.promptHash === priorShadowEvidence.priorBinding.promptHash &&
    item.scorer.promptVersion === priorShadowEvidence.priorBinding.promptVersion
  );
  const providerInputPreserved = observations.every((item) =>
    item.providerInput.changed === false &&
    item.providerInput.lexicalResultHash === item.providerInput.returnedResultHash,
  );
  const expectedTopOneCount = observations.filter(
    (item) => item.selection.shadowSourceKeyHashes[0] === expectedSourceKeyHash,
  ).length;
  const lexicalExpectedTopOneCount = observations.filter(
    (item) => item.selection.lexicalSourceKeyHashes[0] === expectedSourceKeyHash,
  ).length;
  const observedCount = observations.filter((item) => item.status === 'observed').length;
  const passed =
    input.mission?.status === 'completed' &&
    input.mission?.providerId === 'stub' &&
    input.mission?.artifactShadowMetadataFound === false &&
    input.mission?.storeShadowMetadataFound === false &&
    scorerBindingPassed &&
    providerInputPreserved &&
    observedCount === observations.length &&
    expectedTopOneCount === observations.length;

  return {
    expectedSourceKeyHash,
    expectedSourceType: expectedCase.expectedSourceType,
    id: expectedCase.id,
    latency: buildLatency(observations),
    mission: {
      artifactShadowMetadataFound: input.mission?.artifactShadowMetadataFound === true,
      missionIdHash,
      providerId: normalizeText(input.mission?.providerId),
      status: normalizeText(input.mission?.status),
      storeShadowMetadataFound: input.mission?.storeShadowMetadataFound === true,
    },
    observations,
    quality: {
      changedTopOneCount: observations.filter((item) => item.selection.topSourceChanged === true).length,
      expectedTopOneCount,
      lexicalExpectedTopOneCount,
      observedCount,
      passed,
      providerInputPreserved,
      scorerBindingPassed,
    },
    queryId: expectedCase.queryId,
    scenarioId: expectedCase.scenarioId,
    variationType: expectedCase.variationType,
  };
}

function buildGroupMetrics(cases, groupKey) {
  const groups = new Map();
  for (const item of cases) {
    const key = item[groupKey];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return Object.fromEntries([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(
    ([key, groupCases]) => {
      const observations = groupCases.flatMap((item) => item.observations);
      return [key, {
        caseCount: groupCases.length,
        casePassRate: Number(
          (groupCases.filter((item) => item.quality.passed).length / groupCases.length).toFixed(4),
        ),
        changedTopOneCount: groupCases.reduce(
          (sum, item) => sum + item.quality.changedTopOneCount,
          0,
        ),
        expectedTopOneCount: groupCases.reduce(
          (sum, item) => sum + item.quality.expectedTopOneCount,
          0,
        ),
        latency: buildLatency(observations),
        lexicalExpectedTopOneCount: groupCases.reduce(
          (sum, item) => sum + item.quality.lexicalExpectedTopOneCount,
          0,
        ),
        observationCount: observations.length,
      }];
    },
  ));
}

function buildReplayContent({
  cases,
  fixtureContract,
  observedAt,
  priorShadowEvidence,
  queryContract,
  runtime,
} = {}) {
  assertLocalRelevanceShadowEvidence(priorShadowEvidence);
  const normalizedFixture = normalizeFixtureContract(fixtureContract);
  const caseById = new Map(ensureArray(cases).map((item) => [normalizeText(item.id), item]));
  if (
    caseById.size !== normalizedFixture.caseCount ||
    normalizedFixture.cases.some((item) => !caseById.has(item.id))
  ) {
    throw new Error('Shadow replay cases must exactly match the fixture contract.');
  }
  const normalizedCases = normalizedFixture.cases.map((expectedCase) =>
    normalizeCase(caseById.get(expectedCase.id), expectedCase, priorShadowEvidence),
  );
  const normalizedObservedAt = normalizeText(observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('Shadow replay observedAt must be a valid timestamp.');
  }
  const normalizedQueryContract = normalizeText(queryContract);
  if (!['full-retrieval-query-v1', 'mission-objective-v1'].includes(normalizedQueryContract)) {
    throw new Error('Shadow replay requires a supported query contract.');
  }
  const normalizedRuntime = {
    cloudFeaturesDisabled: runtime?.cloudFeaturesDisabled === true,
    externalProviderCalls: 'none',
    kind: normalizeText(runtime?.kind),
    modelDigest: normalizeText(runtime?.modelDigest),
    modelId: normalizeText(runtime?.modelId),
    networkIsolation: 'not-proven',
    transportLoopback: runtime?.transportLoopback === true,
    version: normalizeText(runtime?.version),
  };
  if (
    normalizedRuntime.kind !== 'ollama' ||
    !normalizedRuntime.transportLoopback ||
    !normalizedRuntime.version ||
    normalizedRuntime.modelDigest !== priorShadowEvidence.priorBinding.modelDigest ||
    normalizedRuntime.modelId !== priorShadowEvidence.observations[0].scorer.modelId
  ) {
    throw new Error('Shadow replay runtime must retain the R11 model binding.');
  }

  const observations = normalizedCases.flatMap((item) => item.observations);
  const passedCaseCount = normalizedCases.filter((item) => item.quality.passed).length;
  const expectedTopOneCount = normalizedCases.reduce(
    (sum, item) => sum + item.quality.expectedTopOneCount,
    0,
  );
  const lexicalExpectedTopOneCount = normalizedCases.reduce(
    (sum, item) => sum + item.quality.lexicalExpectedTopOneCount,
    0,
  );
  const changedTopOneCount = normalizedCases.reduce(
    (sum, item) => sum + item.quality.changedTopOneCount,
    0,
  );
  const validated =
    priorShadowEvidence.actualLocalRelevanceShadowIntegrationValidated === true &&
    normalizedRuntime.cloudFeaturesDisabled &&
    passedCaseCount === normalizedCases.length &&
    expectedTopOneCount === observations.length &&
    observations.every((item) => item.providerInput.changed === false);

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowReplayQualified: false,
    actualLocalRelevanceShadowReplayValidated: validated,
    cases: normalizedCases,
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    fixtureContract: normalizedFixture,
    governance: {
      licenseApproved: false,
      osLevelEgressIsolationProven: false,
      productionLatencyApproved: false,
      rollbackOwnerApproved: false,
      runtimeActivationApproved: false,
    },
    latency: buildLatency(observations),
    observedAt: normalizedObservedAt,
    priorShadowEvidence,
    productionReadyClaim: false,
    queryContract: normalizedQueryContract,
    quality: {
      caseCount: normalizedCases.length,
      casePassRate: Number((passedCaseCount / normalizedCases.length).toFixed(4)),
      changedTopOneCount,
      controlledFixtureOnly: true,
      expectedTopOneCount,
      lexicalExpectedTopOneCount,
      missionCount: normalizedCases.length,
      observationCount: observations.length,
      passedCaseCount,
      providerInputPreserved: observations.every(
        (item) => item.providerInput.lexicalResultHash === item.providerInput.returnedResultHash,
      ),
      scenarioCount: normalizedFixture.scenarioCount,
    },
    rollback: {
      mode: 'lexical',
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_REPLAY_SCHEMA_VERSION,
    status: validated
      ? 'multi-scenario-shadow-replay-passed-governance-blocked'
      : 'failed-keep-lexical',
    variationMetrics: buildGroupMetrics(normalizedCases, 'variationType'),
    scenarioMetrics: buildGroupMetrics(normalizedCases, 'scenarioId'),
  };
}

export function buildLocalRelevanceShadowReplay(input = {}) {
  const content = buildReplayContent(input);
  const replayHash = hashRecord(content);
  return {
    ...content,
    id: `local-relevance-shadow-replay-${replayHash}`,
    replayHash,
  };
}

export function assertLocalRelevanceShadowReplay(replay) {
  const { id, replayHash, ...content } = replay || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (replayHash !== expectedHash || id !== `local-relevance-shadow-replay-${expectedHash}`) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildReplayContent({
      cases: replay?.cases,
      fixtureContract: replay?.fixtureContract,
      observedAt: replay?.observedAt,
      priorShadowEvidence: replay?.priorShadowEvidence,
      queryContract: replay?.queryContract,
      runtime: replay?.runtime,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (
    replay?.activation?.authorized !== false ||
    replay?.runtimeActivation !== false ||
    replay?.productionReadyClaim !== false ||
    replay?.runtime?.externalProviderCalls !== 'none' ||
    replay?.quality?.providerInputPreserved !== true
  ) {
    errors.push('claim-boundary');
  }
  const expectedStatus = replay?.actualLocalRelevanceShadowReplayValidated === true
    ? 'multi-scenario-shadow-replay-passed-governance-blocked'
    : 'failed-keep-lexical';
  if (
    replay?.actualLocalRelevanceShadowReplayQualified !== false ||
    replay?.status !== expectedStatus
  ) {
    errors.push('decision');
  }
  if (errors.length) {
    throw new Error(`Local relevance shadow replay failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
