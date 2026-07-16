import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertWorkspaceLearningConflictRevocationEvidence,
  buildWorkspaceLearningConflictRevocationEvidence,
} from '../src/core/workspace-learning-conflict-revocation.mjs';
import {
  approveFeedbackMemory,
  authorizeFeedbackScope,
  createFeedbackMission,
  createFeedbackWorkspace,
  getFeedbackMissionTimeline,
  hashText,
  observeFeedbackRun,
  readFeedbackWorkspaceLearningSelection,
  rollbackFeedbackMemory,
  runFeedbackMission,
} from './approved-learning-feedback-runtime.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(
  repoDir,
  'fixtures',
  'workspace-learning-conflict-revocation-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

validateFixture(fixture, testCase);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-workspace-learning-conflict-'),
);
let evidence;
try {
  const sourceWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-a',
    name: 'workspace-learning-conflict-source',
    rootDir: tempRoot,
  });
  const foreignWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-b',
    name: 'workspace-learning-conflict-foreign',
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
    workspaceId: sourceWorkspace.id,
  });
  const targetMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: targetMissionCase(testCase),
    workspaceId: sourceWorkspace.id,
  });
  const foreignMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: targetMissionCase(testCase),
    workspaceId: foreignWorkspace.id,
  });

  const olderSourceResult = runFeedbackMission({
    label: 'P4 older source',
    missionId: olderSourceMission.id,
    rootDir: tempRoot,
  });
  const newerSourceResult = runFeedbackMission({
    label: 'P4 newer source',
    missionId: newerSourceMission.id,
    rootDir: tempRoot,
  });
  const baselineResult = runFeedbackMission({
    label: 'P4 target baseline',
    missionId: targetMission.id,
    rootDir: tempRoot,
  });

  authorizeFeedbackScope({
    candidateId: olderSourceResult.learningCandidateId,
    note: testCase.olderScopeAuthorizationNote,
    rootDir: tempRoot,
  });
  const { memory: olderMemory } = approveFeedbackMemory({
    candidateId: olderSourceResult.learningCandidateId,
    note: testCase.olderPromotionNote,
    rootDir: tempRoot,
    scope: 'workspace',
  });
  const olderOnlyResult = runFeedbackMission({
    label: 'P4 target older only',
    missionId: targetMission.id,
    rootDir: tempRoot,
  });

  authorizeFeedbackScope({
    candidateId: newerSourceResult.learningCandidateId,
    note: testCase.newerScopeAuthorizationNote,
    rootDir: tempRoot,
  });
  const { memory: newerMemory } = approveFeedbackMemory({
    candidateId: newerSourceResult.learningCandidateId,
    note: testCase.newerPromotionNote,
    rootDir: tempRoot,
    scope: 'workspace',
  });
  if (Date.parse(olderMemory.createdAt) >= Date.parse(newerMemory.createdAt)) {
    throw new Error('P4 memory timestamps do not preserve the older-to-newer order.');
  }

  const conflictResult = runFeedbackMission({
    label: 'P4 target conflict',
    missionId: targetMission.id,
    rootDir: tempRoot,
  });
  const foreignConflictResult = runFeedbackMission({
    label: 'P4 foreign conflict',
    missionId: foreignMission.id,
    rootDir: tempRoot,
  });

  const newerRolledBackCandidate = rollbackFeedbackMemory({
    candidateId: newerSourceResult.learningCandidateId,
    note: 'Revoke the newer workspace decision and verify fallback to the older decision.',
    rootDir: tempRoot,
  });
  const afterNewerRevocationResult = runFeedbackMission({
    label: 'P4 target after newer revocation',
    missionId: targetMission.id,
    rootDir: tempRoot,
  });

  const olderRolledBackCandidate = rollbackFeedbackMemory({
    candidateId: olderSourceResult.learningCandidateId,
    note: 'Revoke the remaining workspace decision and restore the target baseline.',
    rootDir: tempRoot,
  });
  const afterFullRollbackResult = runFeedbackMission({
    label: 'P4 target after full rollback',
    missionId: targetMission.id,
    rootDir: tempRoot,
  });

  const observations = {
    afterFullRollback: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: null,
      sessionId: afterFullRollbackResult.sessionId,
      testCase,
    }),
    afterNewerRevocation: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'older',
      sessionId: afterNewerRevocationResult.sessionId,
      testCase,
    }),
    baseline: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: null,
      sessionId: baselineResult.sessionId,
      testCase,
    }),
    conflict: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'newer',
      sessionId: conflictResult.sessionId,
      testCase,
    }),
    foreignConflict: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: null,
      sessionId: foreignConflictResult.sessionId,
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
    olderOnly: observePhase({
      newerMemory,
      olderMemory,
      rootDir: tempRoot,
      selected: 'older',
      sessionId: olderOnlyResult.sessionId,
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
  };
  const quality = evaluatePhases({ newerMemory, observations, olderMemory, testCase });

  evidence = buildWorkspaceLearningConflictRevocationEvidence({
    fixtureBinding: {
      caseId: testCase.id,
      fixtureHash: hashText(fixtureText),
      newerObjectiveHash: hashText(testCase.newerSourceObjective),
      newerPromotionNoteHash: hashText(testCase.newerPromotionNote),
      newerScopeAuthorizationNoteHash: hashText(testCase.newerScopeAuthorizationNote),
      olderObjectiveHash: hashText(testCase.olderSourceObjective),
      olderPromotionNoteHash: hashText(testCase.olderPromotionNote),
      olderScopeAuthorizationNoteHash: hashText(testCase.olderScopeAuthorizationNote),
      targetObjectiveHash: hashText(testCase.targetObjective),
    },
    lifecycle: {
      newer: captureLifecycle({
        candidateId: newerSourceResult.learningCandidateId,
        missionId: newerSourceMission.id,
        rootDir: tempRoot,
      }),
      older: captureLifecycle({
        candidateId: olderSourceResult.learningCandidateId,
        missionId: olderSourceMission.id,
        rootDir: tempRoot,
      }),
    },
    observedAt: new Date().toISOString(),
    phases: {
      afterFullRollback: observations.afterFullRollback.summary,
      afterNewerRevocation: observations.afterNewerRevocation.summary,
      baseline: observations.baseline.summary,
      conflict: observations.conflict.summary,
      foreignConflict: observations.foreignConflict.summary,
      olderOnly: observations.olderOnly.summary,
    },
    promotions: {
      newer: promotionRecord(newerRolledBackCandidate, newerMemory),
      older: promotionRecord(olderRolledBackCandidate, olderMemory),
    },
    quality,
    sourceRuns: {
      newer: observations.newerSource.summary,
      older: observations.olderSource.summary,
    },
    topology: {
      foreignMission: missionBinding(foreignMission),
      foreignWorkspaceId: foreignWorkspace.id,
      newerSourceMission: missionBinding(newerSourceMission),
      olderSourceMission: missionBinding(olderSourceMission),
      sourceWorkspaceId: sourceWorkspace.id,
      targetMission: missionBinding(targetMission),
    },
  });
  assertWorkspaceLearningConflictRevocationEvidence(evidence);
  if (!evidence.actualWorkspaceLearningConflictRevocationValidated) {
    throw new Error(`P4 workspace learning conflict failed: ${JSON.stringify(evidence.results)}.`);
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
  actualWorkspaceLearningConflictRevocationValidated: true,
  conflictCandidateCount: evidence.phases.conflict.selection.candidateCount,
  conflictSelected: 'newer',
  costFree: true,
  externalProviderCalls: 'none',
  fallbackSelected: 'older',
  generalWorkspacePersonalizationValidated: false,
  learnedConflictResolutionValidated: false,
  mode: 'workspace-learning-conflict-revocation',
  ok: true,
  productionReadyClaim: false,
  sessionCount: 8,
}, null, 2));

function observePhase({ newerMemory, olderMemory, rootDir, selected, sessionId, testCase }) {
  const olderExpectedPlanStep = `Incorporate the latest mission memory into the next draft: ${olderMemory.content}`;
  const olderObservation = observeFeedbackRun({
    expectedPlanStep: olderExpectedPlanStep,
    expectMemoryApplied: selected === 'older',
    label: `P4 ${sessionId} older memory`,
    memoryContent: olderMemory.content,
    memoryId: olderMemory.id,
    rootDir,
    sessionId,
  });
  const newerObservation = observeFeedbackRun({
    expectedPlanStep: testCase.newerExpectedPlanStep,
    expectMemoryApplied: selected === 'newer',
    label: `P4 ${sessionId} newer memory`,
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
      planStepCount: primary.summary.adaptation.planStepCount,
      providerId: primary.summary.providerId,
      retrieval: primary.summary.retrieval,
      reviewerVerdict: primary.summary.reviewerVerdict,
      selection: readFeedbackWorkspaceLearningSelection({ rootDir, sessionId }),
      sessionId,
      status: primary.summary.status,
    },
  };
}

function evaluatePhases({ newerMemory, observations, olderMemory, testCase }) {
  const newerSource = `memory:${newerMemory.id}`;
  const olderSource = `memory:${olderMemory.id}`;
  return {
    afterFullRollback: evaluatePhase({
      expectedSourceKeys: [newerSource],
      id: `${testCase.id}-baseline`,
      observation: observations.afterFullRollback,
      requiredAnswerTerms: testCase.newerRequiredAnswerTerms,
    }),
    afterNewerRevocation: evaluatePhase({
      expectedSourceKeys: [olderSource],
      forbiddenAnswerTerms: testCase.newerRequiredAnswerTerms,
      forbiddenSourceKeys: [newerSource],
      id: `${testCase.id}-older`,
      observation: observations.afterNewerRevocation,
      requiredAnswerTerms: testCase.olderRequiredAnswerTerms,
    }),
    baseline: evaluatePhase({
      expectedSourceKeys: [newerSource],
      id: `${testCase.id}-baseline`,
      observation: observations.baseline,
      requiredAnswerTerms: testCase.newerRequiredAnswerTerms,
    }),
    conflict: evaluatePhase({
      expectedSourceKeys: [newerSource],
      forbiddenAnswerTerms: testCase.olderRequiredAnswerTerms,
      forbiddenSourceKeys: [olderSource],
      id: `${testCase.id}-newer`,
      observation: observations.conflict,
      requiredAnswerTerms: testCase.newerRequiredAnswerTerms,
    }),
    foreignConflict: evaluatePhase({
      expectedSourceKeys: [],
      forbiddenAnswerTerms: [
        ...testCase.olderRequiredAnswerTerms,
        ...testCase.newerRequiredAnswerTerms,
      ],
      forbiddenSourceKeys: [olderSource, newerSource],
      id: `${testCase.id}-foreign`,
      observation: observations.foreignConflict,
      requiredAnswerTerms: [],
    }),
    olderOnly: evaluatePhase({
      expectedSourceKeys: [olderSource],
      forbiddenAnswerTerms: testCase.newerRequiredAnswerTerms,
      forbiddenSourceKeys: [newerSource],
      id: `${testCase.id}-older`,
      observation: observations.olderOnly,
      requiredAnswerTerms: testCase.olderRequiredAnswerTerms,
    }),
  };
}

function evaluatePhase({
  expectedSourceKeys,
  forbiddenAnswerTerms = [],
  forbiddenSourceKeys = [],
  id,
  observation,
  requiredAnswerTerms,
}) {
  return evaluateAnswerQualityCase({
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
}

function promotionRecord(candidate, memory) {
  return {
    candidateId: candidate.id,
    finalStatus: candidate.promotionStatus,
    memoryContentHash: hashText(memory.content),
    memoryCreatedAt: memory.createdAt,
    memoryId: memory.id,
    memoryRollbackStatus: candidate.promotionRollback?.memoryRollbackStatus,
    promotionDecisionNoteHash: hashText(candidate.promotionDecision?.note),
    rollbackAction: candidate.promotionDecision?.rollback?.action,
    rollbackStatus: candidate.promotionDecision?.rollback?.status,
    scope: candidate.promotionDecision?.scope,
    scopeAuthorizationFromScope: candidate.promotionScopeAuthorization?.fromScope,
    scopeAuthorizationFromScopeId: candidate.promotionScopeAuthorization?.fromScopeId,
    scopeAuthorizationId: candidate.promotionScopeAuthorization?.id,
    scopeAuthorizationNoteHash: hashText(candidate.promotionScopeAuthorization?.note),
    scopeAuthorizationStatus: candidate.promotionScopeAuthorization?.status,
    scopeAuthorizationToScope: candidate.promotionScopeAuthorization?.toScope,
    scopeAuthorizationToScopeId: candidate.promotionScopeAuthorization?.toScopeId,
    scopeId: candidate.promotionDecision?.scopeId,
    target: candidate.promotionDecision?.target,
    verificationId: candidate.promotionDecision?.verificationId,
    verificationStatus: candidate.promotionVerification?.status,
  };
}

function captureLifecycle({ candidateId, missionId, rootDir }) {
  const timeline = getFeedbackMissionTimeline({ missionId, rootDir }).timeline;
  const authorization = findTimelineEvent(
    timeline,
    candidateId,
    'learning-candidate-promotion-scope-authorized',
  );
  const promotion = findTimelineEvent(
    timeline,
    candidateId,
    'learning-candidate-promotion-approved',
  );
  const rollback = findTimelineEvent(
    timeline,
    candidateId,
    'learning-candidate-promotion-rolled-back',
  );
  return {
    authorizationAt: authorization.at,
    candidateId,
    memoryId: promotion.memoryId,
    missionId,
    promotionAt: promotion.at,
    rollbackAt: rollback.at,
    scopeAuthorizationId: authorization.scopeAuthorizationId,
  };
}

function findTimelineEvent(timeline, candidateId, kind) {
  const event = timeline.find(
    (item) => item.kind === kind && item.learningCandidateId === candidateId,
  );
  if (!event) {
    throw new Error(`P4 lifecycle event is missing: ${kind}.`);
  }
  return event;
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
    value?.schemaVersion !==
      'personal-ai-agent-workspace-learning-conflict-revocation-cases/v1' ||
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
    !Array.isArray(candidate?.olderRequiredAnswerTerms) ||
    !Array.isArray(candidate?.newerRequiredAnswerTerms)
  ) {
    throw new Error('P4 workspace learning conflict fixture is invalid.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P4 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = normalizeText(values.get('--output'));
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P4 workspace learning conflict output must stay inside the repository.');
  }
  return { outputPath };
}

function normalizeText(value) {
  return String(value || '').trim();
}
