import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertWorkspaceLearningPersonalizationEvidence,
  buildWorkspaceLearningPersonalizationEvidence,
} from '../src/core/workspace-learning-personalization.mjs';
import {
  approveFeedbackMemory,
  authorizeFeedbackScope,
  createFeedbackMission,
  createFeedbackWorkspace,
  getFeedbackMissionTimeline,
  hashText,
  observeFeedbackRun,
  rollbackFeedbackMemory,
  runFeedbackMission,
} from './approved-learning-feedback-runtime.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(
  repoDir,
  'fixtures',
  'workspace-learning-personalization-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

validateFixture(fixture, testCase);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-workspace-learning-'),
);
let evidence;
try {
  const sourceWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-a',
    name: 'workspace-learning-source',
    rootDir: tempRoot,
  });
  const foreignWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-b',
    name: 'workspace-learning-foreign',
    rootDir: tempRoot,
  });
  const sourceMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: missionCase(testCase, 'source'),
    workspaceId: sourceWorkspace.id,
  });
  const siblingMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: missionCase(testCase, 'target'),
    workspaceId: sourceWorkspace.id,
  });
  const foreignMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: missionCase(testCase, 'target'),
    workspaceId: foreignWorkspace.id,
  });

  const sourceResult = runFeedbackMission({
    label: 'P3 source',
    missionId: sourceMission.id,
    rootDir: tempRoot,
  });
  const sourceRun = observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    label: 'P3 source',
    memoryContent: '',
    memoryId: '',
    rootDir: tempRoot,
    sessionId: sourceResult.sessionId,
  }).summary;
  const beforePromotion = runTargets({
    foreignMission,
    label: 'before promotion',
    memory: null,
    rootDir: tempRoot,
    siblingMission,
    testCase,
  });

  authorizeFeedbackScope({
    candidateId: sourceResult.learningCandidateId,
    note: testCase.scopeAuthorizationNote,
    rootDir: tempRoot,
  });
  const { memory } = approveFeedbackMemory({
    candidateId: sourceResult.learningCandidateId,
    note: testCase.promotionNote,
    rootDir: tempRoot,
    scope: 'workspace',
  });
  const afterPromotion = runTargets({
    foreignMission,
    label: 'after promotion',
    memory,
    rootDir: tempRoot,
    siblingMission,
    testCase,
  });
  if (
    afterPromotion.sibling.summary.retrieval.matchTermCount <
    testCase.minimumRetrievalMatchTermCount
  ) {
    throw new Error('P3 sibling retrieval did not meet the term-match gate.');
  }

  const rolledBackCandidate = rollbackFeedbackMemory({
    candidateId: sourceResult.learningCandidateId,
    note: 'Rollback the workspace learning memory after the local personalization evaluation.',
    rootDir: tempRoot,
  });
  const afterRollback = runTargets({
    foreignMission,
    label: 'after rollback',
    memory,
    rootDir: tempRoot,
    siblingMission,
    testCase,
  });
  const audit = capturePromotionAudit({
    candidateId: sourceResult.learningCandidateId,
    missionId: sourceMission.id,
    rootDir: tempRoot,
  });

  const quality = {
    afterPromotion: evaluateTargets({ memory, observations: afterPromotion, testCase }),
    afterRollback: evaluateTargets({ memory, observations: afterRollback, testCase }),
    beforePromotion: evaluateTargets({ memory, observations: beforePromotion, testCase }),
  };

  evidence = buildWorkspaceLearningPersonalizationEvidence({
    audit,
    fixtureBinding: {
      caseId: testCase.id,
      expectedPlanStepHash: hashText(testCase.expectedPlanStep),
      fixtureHash: hashText(fixtureText),
      promotionNoteHash: hashText(testCase.promotionNote),
      scopeAuthorizationNoteHash: hashText(testCase.scopeAuthorizationNote),
      sourceObjectiveHash: hashText(testCase.sourceObjective),
      targetObjectiveHash: hashText(testCase.targetObjective),
    },
    observedAt: new Date().toISOString(),
    phases: {
      afterPromotion: summaries(afterPromotion),
      afterRollback: summaries(afterRollback),
      beforePromotion: summaries(beforePromotion),
    },
    promotion: {
      candidateId: rolledBackCandidate.id,
      finalStatus: rolledBackCandidate.promotionStatus,
      memoryContentHash: hashText(memory.content),
      memoryId: memory.id,
      memoryRollbackStatus: rolledBackCandidate.promotionRollback?.memoryRollbackStatus,
      rollbackAction: rolledBackCandidate.promotionDecision?.rollback?.action,
      rollbackStatus: rolledBackCandidate.promotionDecision?.rollback?.status,
      scope: rolledBackCandidate.promotionDecision?.scope,
      scopeAuthorizationFromScope:
        rolledBackCandidate.promotionScopeAuthorization?.fromScope,
      scopeAuthorizationFromScopeId:
        rolledBackCandidate.promotionScopeAuthorization?.fromScopeId,
      scopeAuthorizationId: rolledBackCandidate.promotionScopeAuthorization?.id,
      scopeAuthorizationStatus: rolledBackCandidate.promotionScopeAuthorization?.status,
      scopeAuthorizationToScope: rolledBackCandidate.promotionScopeAuthorization?.toScope,
      scopeAuthorizationToScopeId:
        rolledBackCandidate.promotionScopeAuthorization?.toScopeId,
      scopeId: rolledBackCandidate.promotionDecision?.scopeId,
      target: rolledBackCandidate.promotionDecision?.target,
      verificationId: rolledBackCandidate.promotionVerification?.id,
      verificationStatus: rolledBackCandidate.promotionVerification?.status,
    },
    quality,
    sourceRun,
    topology: {
      foreignMission: missionBinding(foreignMission),
      foreignWorkspaceId: foreignWorkspace.id,
      siblingMission: missionBinding(siblingMission),
      sourceMission: missionBinding(sourceMission),
      sourceWorkspaceId: sourceWorkspace.id,
    },
  });
  assertWorkspaceLearningPersonalizationEvidence(evidence);
  if (!evidence.actualWorkspaceLearningPersonalizationValidated) {
    throw new Error(
      `P3 workspace learning personalization failed: ${JSON.stringify(evidence.results)}.`,
    );
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
  actualWorkspaceLearningPersonalizationValidated: true,
  controlledCrossMissionApplicationValidated: true,
  costFree: true,
  crossMissionGeneralizationValidated: false,
  externalProviderCalls: 'none',
  foreignWorkspaceIsolationValidated: true,
  generalAnswerQualityImprovementValidated: false,
  mode: 'workspace-learning-personalization',
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  productionReadyClaim: false,
  sessionCount: 7,
  siblingPlanStepCounts: [
    evidence.phases.beforePromotion.sibling.adaptation.planStepCount,
    evidence.phases.afterPromotion.sibling.adaptation.planStepCount,
    evidence.phases.afterRollback.sibling.adaptation.planStepCount,
  ],
  siblingQualityStatuses: [
    evidence.quality.beforePromotion.sibling.status,
    evidence.quality.afterPromotion.sibling.status,
    evidence.quality.afterRollback.sibling.status,
  ],
}, null, 2));

function runTargets({ foreignMission, label, memory, rootDir, siblingMission, testCase }) {
  const siblingResult = runFeedbackMission({
    label: `P3 sibling ${label}`,
    missionId: siblingMission.id,
    rootDir,
  });
  const foreignResult = runFeedbackMission({
    label: `P3 foreign ${label}`,
    missionId: foreignMission.id,
    rootDir,
  });
  return {
    foreign: observeFeedbackRun({
      expectedPlanStep: testCase.expectedPlanStep,
      expectMemoryApplied: false,
      label: `P3 foreign ${label}`,
      memoryContent: memory?.content || '',
      memoryId: memory?.id || '',
      rootDir,
      sessionId: foreignResult.sessionId,
    }),
    sibling: observeFeedbackRun({
      expectedPlanStep: testCase.expectedPlanStep,
      expectMemoryApplied: Boolean(memory),
      label: `P3 sibling ${label}`,
      memoryContent: memory?.content || '',
      memoryId: memory?.id || '',
      rootDir,
      sessionId: siblingResult.sessionId,
    }),
  };
}

function evaluateTargets({ memory, observations, testCase }) {
  const sourceKey = `memory:${memory.id}`;
  return {
    foreign: evaluateAnswerQualityCase({
      answer: {
        citedSourceKeys: observations.foreign.answerQuality.citedSourceKeys,
        text: observations.foreign.answerQuality.answerText,
      },
      expectedSourceKeys: [],
      forbiddenAnswerTerms: [testCase.isolationMarker],
      forbiddenSourceKeys: [sourceKey],
      id: `${testCase.id}-foreign`,
      requiredAnswerTerms: [],
      retrievedItems: observations.foreign.answerQuality.retrievedItems,
      reviewerVerdict: observations.foreign.summary.reviewerVerdict,
    }),
    sibling: evaluateAnswerQualityCase({
      answer: {
        citedSourceKeys: observations.sibling.answerQuality.citedSourceKeys,
        text: observations.sibling.answerQuality.answerText,
      },
      expectedSourceKeys: [sourceKey],
      forbiddenAnswerTerms: [],
      forbiddenSourceKeys: [],
      id: `${testCase.id}-sibling`,
      requiredAnswerTerms: testCase.requiredAnswerTerms,
      retrievedItems: observations.sibling.answerQuality.retrievedItems,
      reviewerVerdict: observations.sibling.summary.reviewerVerdict,
    }),
  };
}

function missionBinding(mission) {
  return {
    id: mission.id,
    objectiveHash: hashText(mission.objective),
    workspaceId: mission.workspaceId,
  };
}

function missionCase(testCase, kind) {
  return {
    deliverableType: testCase.deliverableType,
    mode: testCase.mode,
    objective: kind === 'source' ? testCase.sourceObjective : testCase.targetObjective,
    title: kind === 'source' ? testCase.sourceTitle : testCase.targetTitle,
  };
}

function summaries(observations) {
  return {
    foreign: observations.foreign.summary,
    sibling: observations.sibling.summary,
  };
}

function capturePromotionAudit({ candidateId, missionId, rootDir }) {
  const timeline = getFeedbackMissionTimeline({ missionId, rootDir }).timeline;
  return {
    authorization: auditEvent({
      candidateId,
      kind: 'learning-candidate-promotion-scope-authorized',
      missionId,
      timeline,
    }),
    promotion: auditEvent({
      candidateId,
      kind: 'learning-candidate-promotion-approved',
      missionId,
      timeline,
    }),
    rollback: auditEvent({
      candidateId,
      kind: 'learning-candidate-promotion-rolled-back',
      missionId,
      timeline,
    }),
  };
}

function auditEvent({ candidateId, kind, missionId, timeline }) {
  const index = timeline.findIndex(
    (event) => event.kind === kind && event.learningCandidateId === candidateId,
  );
  const event = timeline[index];
  if (!event) {
    throw new Error(`P3 promotion audit event is missing: ${kind}.`);
  }
  return {
    at: event.at,
    candidateId: event.learningCandidateId,
    index,
    kind: event.kind,
    missionId: event.missionId,
    scopeAuthorizationId: event.scopeAuthorizationId,
    status:
      kind === 'learning-candidate-promotion-approved'
        ? event.promotionVerificationStatus
        : kind === 'learning-candidate-promotion-rolled-back'
          ? event.memoryRollbackStatus
          : event.status,
  };
}

function validateFixture(value, candidate) {
  if (
    value?.schemaVersion !==
      'personal-ai-agent-workspace-learning-personalization-cases/v1' ||
    value?.productionReadyClaim !== false ||
    value?.cases?.length !== 1 ||
    !candidate?.id ||
    !candidate?.expectedPlanStep ||
    !candidate?.isolationMarker ||
    !candidate?.promotionNote ||
    !candidate?.scopeAuthorizationNote ||
    !candidate?.sourceObjective ||
    !candidate?.targetObjective ||
    !Array.isArray(candidate?.requiredAnswerTerms) ||
    candidate.requiredAnswerTerms.length < 3 ||
    !Number.isInteger(candidate?.minimumRetrievalMatchTermCount)
  ) {
    throw new Error('P3 workspace learning personalization fixture is invalid.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P3 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P3 workspace learning personalization output must stay inside the repository.');
  }
  return { outputPath };
}
