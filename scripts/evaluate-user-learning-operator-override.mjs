import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import {
  assertUserLearningOperatorOverrideEvidence,
  buildUserLearningOperatorOverrideEvidence,
} from '../src/core/user-learning-operator-override.mjs';
import {
  approveFeedbackMemory,
  authorizeFeedbackScope,
  createFeedbackMission,
  createFeedbackWorkspace,
  getFeedbackMissionTimeline,
  hashText,
  observeFeedbackRun,
  readFeedbackUserLearningSelection,
  runFeedbackMission,
  setFeedbackUserLearningOverride,
} from './approved-learning-feedback-runtime.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(
  repoDir,
  'fixtures',
  'user-learning-operator-override-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

validateFixture(fixture, testCase);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-user-learning-override-'),
);
let evidence;
try {
  const sourceWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-a',
    name: 'user-learning-override-source',
    rootDir: tempRoot,
  });
  const crossWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-b',
    name: 'user-learning-override-cross-workspace',
    rootDir: tempRoot,
  });
  const olderSourceMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: sourceMissionCase(testCase, 'older'),
    workspaceId: sourceWorkspace.id,
  });
  const newerSourceMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: sourceMissionCase(testCase, 'newer'),
    workspaceId: crossWorkspace.id,
  });
  const targetMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: targetMissionCase(testCase),
    workspaceId: sourceWorkspace.id,
  });
  const crossWorkspaceMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: targetMissionCase(testCase),
    workspaceId: crossWorkspace.id,
  });

  const olderSourceResult = runFeedbackMission({
    label: 'P9 older source',
    missionId: olderSourceMission.id,
    rootDir: tempRoot,
  });
  const newerSourceResult = runFeedbackMission({
    label: 'P9 newer source',
    missionId: newerSourceMission.id,
    rootDir: tempRoot,
  });
  authorizeFeedbackScope({
    candidateId: olderSourceResult.learningCandidateId,
    note: testCase.olderScopeAuthorizationNote,
    rootDir: tempRoot,
    scope: 'user',
  });
  const { memory: olderMemory } = approveFeedbackMemory({
    candidateId: olderSourceResult.learningCandidateId,
    note: testCase.olderPromotionNote,
    rootDir: tempRoot,
    scope: 'user',
  });
  authorizeFeedbackScope({
    candidateId: newerSourceResult.learningCandidateId,
    note: testCase.newerScopeAuthorizationNote,
    rootDir: tempRoot,
    scope: 'user',
  });
  const { memory: newerMemory } = approveFeedbackMemory({
    candidateId: newerSourceResult.learningCandidateId,
    note: testCase.newerPromotionNote,
    rootDir: tempRoot,
    scope: 'user',
  });
  if (Date.parse(olderMemory.createdAt) >= Date.parse(newerMemory.createdAt)) {
    throw new Error('P9 memory timestamps do not preserve the older-to-newer order.');
  }

  let userLearningNow = '2027-01-01T00:00:00.000Z';
  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({
    rootDir: tempRoot,
    store,
    userLearningClock: () => userLearningNow,
  });
  const baselineResult = await runServiceMission({
    label: 'P9 baseline latest revision',
    missionId: targetMission.id,
    service,
  });

  const firstSetResult = setFeedbackUserLearningOverride({
    candidateId: olderSourceResult.learningCandidateId,
    expiresAt: '2099-01-01T00:00:00.000Z',
    note: testCase.firstOverrideNote,
    rootDir: tempRoot,
  });
  const activeOverrideResult = await runServiceMission({
    label: 'P9 active operator override',
    missionId: targetMission.id,
    service,
  });
  const crossWorkspaceActiveResult = await runServiceMission({
    label: 'P9 cross-workspace active operator override',
    missionId: crossWorkspaceMission.id,
    service,
  });

  userLearningNow = '2100-01-01T00:01:00.000Z';
  const expiredResult = await runServiceMission({
    label: 'P9 expired override fallback',
    missionId: targetMission.id,
    service,
  });

  userLearningNow = '2100-01-01T00:02:00.000Z';
  const secondSetResult = service.setUserLearningSelectionOverride(
    olderSourceResult.learningCandidateId,
    {
      expiresAt: '2101-01-01T00:00:00.000Z',
      note: testCase.secondOverrideNote,
    },
  );
  const repinnedResult = await runServiceMission({
    label: 'P9 repinned operator override',
    missionId: targetMission.id,
    service,
  });

  userLearningNow = '2100-01-01T00:03:00.000Z';
  const clearResult = service.clearUserLearningSelectionOverride(
    olderSourceResult.learningCandidateId,
    { note: testCase.clearOverrideNote },
  );
  const clearedResult = await runServiceMission({
    label: 'P9 cleared override fallback',
    missionId: targetMission.id,
    service,
  });

  const observations = {
    activeOverride: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'older',
      sessionId: activeOverrideResult.sessionId,
      testCase,
    }),
    baseline: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'newer',
      sessionId: baselineResult.sessionId,
      testCase,
    }),
    cleared: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'newer',
      sessionId: clearedResult.sessionId,
      testCase,
    }),
    crossWorkspaceActive: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'older',
      sessionId: crossWorkspaceActiveResult.sessionId,
      testCase,
    }),
    expired: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'newer',
      sessionId: expiredResult.sessionId,
      testCase,
    }),
    newerSource: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: null,
      sessionId: newerSourceResult.sessionId,
      testCase,
    }),
    olderSource: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: null,
      sessionId: olderSourceResult.sessionId,
      testCase,
    }),
    repinned: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'older',
      sessionId: repinnedResult.sessionId,
      testCase,
    }),
  };
  const quality = evaluatePhases({ newerMemory, observations, olderMemory, testCase });
  const finalCandidate = clearResult.learningCandidate;
  const history = finalCandidate.userLearningSelectionOverrideHistory;
  const timeline = getFeedbackMissionTimeline({
    missionId: olderSourceMission.id,
    rootDir: tempRoot,
  }).timeline;
  const overrideTimeline = timeline
    .map((event, index) => ({ ...event, index }))
    .filter((event) => event.kind.startsWith('user-learning-selection-override-'));

  evidence = buildUserLearningOperatorOverrideEvidence({
    fixtureBinding: {
      caseId: testCase.id,
      clearOverrideNoteHash: hashText(testCase.clearOverrideNote),
      firstOverrideNoteHash: hashText(testCase.firstOverrideNote),
      fixtureHash: hashText(fixtureText),
      newerObjectiveHash: hashText(testCase.newerSourceObjective),
      newerPromotionNoteHash: hashText(testCase.newerPromotionNote),
      olderObjectiveHash: hashText(testCase.olderSourceObjective),
      olderPromotionNoteHash: hashText(testCase.olderPromotionNote),
      secondOverrideNoteHash: hashText(testCase.secondOverrideNote),
      targetObjectiveHash: hashText(testCase.targetObjective),
    },
    observedAt: '2100-01-01T00:04:00.000Z',
    overrideLifecycle: {
      cleared: historyEvent(history[2]),
      expiredObservedAt: '2100-01-01T00:01:00.000Z',
      firstSet: historyEvent(history[0]),
      secondSet: historyEvent(history[1]),
    },
    phases: {
      activeOverride: observations.activeOverride.summary,
      baseline: observations.baseline.summary,
      cleared: observations.cleared.summary,
      crossWorkspaceActive: observations.crossWorkspaceActive.summary,
      expired: observations.expired.summary,
      repinned: observations.repinned.summary,
    },
    promotions: {
      newer: promotionRecord(
        findCandidate(store, newerSourceResult.learningCandidateId),
        newerMemory,
      ),
      older: promotionRecord(finalCandidate, olderMemory),
    },
    quality,
    sourceRuns: {
      newer: observations.newerSource.summary,
      older: observations.olderSource.summary,
    },
    timeline: overrideTimeline.map((event) => ({
      at: event.at,
      index: event.index,
      kind: event.kind,
      overrideId: event.overrideId,
    })),
    topology: {
      crossWorkspaceId: crossWorkspace.id,
      crossWorkspaceMission: missionBinding(crossWorkspaceMission),
      newerSourceMission: missionBinding(newerSourceMission),
      olderSourceMission: missionBinding(olderSourceMission),
      sourceWorkspaceId: sourceWorkspace.id,
      targetMission: missionBinding(targetMission),
    },
  });
  assertUserLearningOperatorOverrideEvidence(evidence);
  if (!evidence.actualUserLearningOperatorOverrideValidated) {
    throw new Error(`P9 user operator override failed: ${JSON.stringify(evidence.results)}.`);
  }
  if (firstSetResult.selectionOverride.id !== history[0].overrideId) {
    throw new Error('P9 CLI override result does not match persisted history.');
  }
  if (secondSetResult.selectionOverride.id !== history[1].overrideId) {
    throw new Error('P9 service override result does not match persisted history.');
  }
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualUserLearningOperatorOverrideValidated: true,
  automaticPreferenceLearningValidated: false,
  costFree: true,
  externalProviderCalls: 'none',
  hostedTenantUserPersonalizationValidated: false,
  mode: 'user-learning-operator-override',
  multiUserIsolationValidated: false,
  ok: true,
  productionReadyClaim: false,
  sessionCount: 8,
}, null, 2));

async function runServiceMission({ label, missionId, service }) {
  const result = await service.runMission(missionId, {
    provider: 'stub',
    providerSpecified: true,
    sourceContext: { channel: 'local', route: 'p9.user-learning-override' },
  });
  if (
    result.mission?.status !== 'completed' ||
    result.provider !== 'stub' ||
    result.reviewerVerdict !== 'pass' ||
    !result.learningCandidate?.id ||
    !result.session?.id
  ) {
    throw new Error(`${label} did not complete with reviewer pass and learning candidate.`);
  }
  return {
    learningCandidateId: result.learningCandidate.id,
    sessionId: result.session.id,
  };
}

function observePhase({ newerMemory, olderMemory, rootDir, selected, sessionId, testCase }) {
  const olderObservation = observeFeedbackRun({
    expectedPlanStep: `Incorporate the latest mission memory into the next draft: ${olderMemory.content}`,
    expectMemoryApplied: selected === 'older',
    label: `P9 ${sessionId} older memory`,
    memoryContent: olderMemory.content,
    memoryId: olderMemory.id,
    rootDir,
    sessionId,
  });
  const newerObservation = observeFeedbackRun({
    expectedPlanStep: testCase.newerExpectedPlanStep,
    expectMemoryApplied: selected === 'newer',
    label: `P9 ${sessionId} newer memory`,
    memoryContent: newerMemory.content,
    memoryId: newerMemory.id,
    rootDir,
    sessionId,
  });
  const primary = selected === 'older' ? olderObservation : newerObservation;
  return {
    answerQuality: primary.answerQuality,
    summary: {
      artifacts: primary.summary.artifacts,
      externalProviderCallCount: primary.summary.externalProviderCallCount,
      exposures: {
        newer: newerObservation.summary.memoryExposure,
        older: olderObservation.summary.memoryExposure,
      },
      providerId: primary.summary.providerId,
      reviewerVerdict: primary.summary.reviewerVerdict,
      selection: readFeedbackUserLearningSelection({ rootDir, sessionId }),
      sessionId,
      status: primary.summary.status,
    },
  };
}

function evaluatePhases({ newerMemory, observations, olderMemory, testCase }) {
  const newerSource = `memory:${newerMemory.id}`;
  const olderSource = `memory:${olderMemory.id}`;
  const phaseSelection = {
    activeOverride: 'older',
    baseline: 'newer',
    cleared: 'newer',
    crossWorkspaceActive: 'older',
    expired: 'newer',
    repinned: 'older',
  };
  return Object.fromEntries(
    Object.entries(phaseSelection).map(([phase, selected]) => [
      phase,
      evaluatePhase({
        expectedSourceKeys: [selected === 'older' ? olderSource : newerSource],
        forbiddenAnswerTerms:
          selected === 'older'
            ? testCase.newerRequiredAnswerTerms
            : testCase.olderRequiredAnswerTerms,
        forbiddenSourceKeys: [selected === 'older' ? newerSource : olderSource],
        id: `${testCase.id}-${selected}`,
        observation: observations[phase],
        requiredAnswerTerms:
          selected === 'older'
            ? testCase.olderRequiredAnswerTerms
            : testCase.newerRequiredAnswerTerms,
      }),
    ]),
  );
}

function evaluatePhase({
  expectedSourceKeys,
  forbiddenAnswerTerms,
  forbiddenSourceKeys,
  id,
  observation,
  requiredAnswerTerms,
}) {
  const result = evaluateAnswerQualityCase({
    answer: {
      citedSourceKeys: observation.answerQuality.citedSourceKeys,
      text: observation.answerQuality.answerText,
    },
    expectedSourceKeys,
    forbiddenAnswerTerms,
    forbiddenSourceKeys,
    id,
    requiredAnswerTerms,
    retrievedItems: observation.answerQuality.retrievedItems,
    reviewerVerdict: observation.summary.reviewerVerdict,
  });
  return {
    id: result.id,
    metricsHash: hashText(JSON.stringify(result.metrics)),
    status: result.status,
  };
}

function promotionRecord(candidate, memory) {
  return {
    candidateId: candidate.id,
    memoryContentHash: hashText(memory.content),
    memoryCreatedAt: memory.createdAt,
    memoryId: memory.id,
    promotionNoteHash: hashText(candidate.promotionDecision?.note),
    promotionStatus: candidate.promotionStatus,
    scope: candidate.promotionDecision?.scope,
    scopeAuthorizationStatus: candidate.promotionScopeAuthorization?.status,
    scopeId: candidate.promotionDecision?.scopeId,
    target: candidate.promotionDecision?.target,
    verificationId: candidate.promotionDecision?.verificationId,
    verificationStatus: candidate.promotionVerification?.status,
  };
}

function historyEvent(event) {
  return {
    action: event.action,
    at: event.at,
    expiresAt: event.expiresAt,
    memoryId: event.memoryId,
    noteHash: event.noteHash,
    overrideId: event.overrideId,
    performedBy: event.performedBy,
    scope: event.scope,
    scopeId: event.scopeId,
  };
}

function findCandidate(store, candidateId) {
  const candidate = store.listLearningCandidates().find((item) => item.id === candidateId);
  if (!candidate) {
    throw new Error(`P9 learning candidate is missing: ${candidateId}.`);
  }
  return candidate;
}

function missionBinding(mission) {
  return {
    id: mission.id,
    objectiveHash: hashText(mission.objective),
    workspaceId: mission.workspaceId,
  };
}

function sourceMissionCase(value, kind) {
  const prefix = kind === 'older' ? 'older' : 'newer';
  return {
    deliverableType: value.deliverableType,
    mode: value.mode,
    objective: value[`${prefix}SourceObjective`],
    title: value[`${prefix}SourceTitle`],
  };
}

function targetMissionCase(value) {
  return {
    deliverableType: value.deliverableType,
    mode: value.mode,
    objective: value.targetObjective,
    title: value.targetTitle,
  };
}

function validateFixture(value, candidate) {
  if (
    value?.schemaVersion !== 'personal-ai-agent-user-learning-operator-override-cases/v1' ||
    value?.productionReadyClaim !== false ||
    value?.cases?.length !== 1 ||
    !candidate?.id ||
    !candidate?.olderPromotionNote ||
    !candidate?.newerPromotionNote ||
    !candidate?.olderScopeAuthorizationNote ||
    !candidate?.newerScopeAuthorizationNote ||
    !candidate?.olderSourceObjective ||
    !candidate?.newerSourceObjective ||
    !candidate?.targetObjective ||
    !candidate?.newerExpectedPlanStep ||
    !candidate?.firstOverrideNote ||
    !candidate?.secondOverrideNote ||
    !candidate?.clearOverrideNote
  ) {
    throw new Error('P9 user learning operator override fixture is invalid.');
  }
}

function parseOptions(args) {
  const outputIndex = args.indexOf('--output');
  return {
    outputPath:
      outputIndex >= 0 && args[outputIndex + 1]
        ? path.resolve(repoDir, args[outputIndex + 1])
        : '',
  };
}
