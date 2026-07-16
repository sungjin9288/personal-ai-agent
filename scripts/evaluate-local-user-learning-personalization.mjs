import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalUserLearningPersonalizationEvidence,
  buildLocalUserLearningPersonalizationEvidence,
} from '../src/core/local-user-learning-personalization.mjs';
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
  'local-user-learning-personalization-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

validateFixture(fixture, testCase);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-local-user-learning-'),
);
let evidence;
try {
  const sourceWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-a',
    name: 'local-user-learning-source',
    rootDir: tempRoot,
  });
  const crossWorkspace = createFeedbackWorkspace({
    directoryName: 'workspace-b',
    name: 'local-user-learning-cross-workspace',
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
  const crossWorkspaceMission = createFeedbackMission({
    rootDir: tempRoot,
    testCase: missionCase(testCase, 'target'),
    workspaceId: crossWorkspace.id,
  });

  const sourceResult = runFeedbackMission({
    label: 'P7 source',
    missionId: sourceMission.id,
    rootDir: tempRoot,
  });
  const sourceRun = observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    label: 'P7 source',
    memoryContent: '',
    memoryId: '',
    rootDir: tempRoot,
    sessionId: sourceResult.sessionId,
  }).summary;
  const beforePromotion = runTargets({
    crossWorkspaceMission,
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
    scope: 'user',
  });
  const { memory } = approveFeedbackMemory({
    candidateId: sourceResult.learningCandidateId,
    note: testCase.promotionNote,
    rootDir: tempRoot,
    scope: 'user',
  });
  const afterPromotion = runTargets({
    crossWorkspaceMission,
    label: 'after promotion',
    memory,
    rootDir: tempRoot,
    siblingMission,
    testCase,
  });
  for (const observation of Object.values(afterPromotion)) {
    if (observation.summary.retrieval.matchTermCount < testCase.minimumRetrievalMatchTermCount) {
      throw new Error('P7 user memory retrieval did not meet the term-match gate.');
    }
  }

  const rolledBackCandidate = rollbackFeedbackMemory({
    candidateId: sourceResult.learningCandidateId,
    note: 'Rollback the local user learning memory after the controlled personalization evaluation.',
    rootDir: tempRoot,
  });
  const afterRollback = runTargets({
    crossWorkspaceMission,
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
    crossWorkspace: evaluateTargetPhases({
      memory,
      observations: {
        afterPromotion: afterPromotion.crossWorkspace,
        afterRollback: afterRollback.crossWorkspace,
        beforePromotion: beforePromotion.crossWorkspace,
      },
      target: 'cross-workspace',
      testCase,
    }),
    sibling: evaluateTargetPhases({
      memory,
      observations: {
        afterPromotion: afterPromotion.sibling,
        afterRollback: afterRollback.sibling,
        beforePromotion: beforePromotion.sibling,
      },
      target: 'sibling',
      testCase,
    }),
  };

  evidence = buildLocalUserLearningPersonalizationEvidence({
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
      crossWorkspace: targetSummaries({ afterPromotion, afterRollback, beforePromotion }, 'crossWorkspace'),
      sibling: targetSummaries({ afterPromotion, afterRollback, beforePromotion }, 'sibling'),
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
      scopeAuthorizationFromScope: rolledBackCandidate.promotionScopeAuthorization?.fromScope,
      scopeAuthorizationFromScopeId: rolledBackCandidate.promotionScopeAuthorization?.fromScopeId,
      scopeAuthorizationId: rolledBackCandidate.promotionScopeAuthorization?.id,
      scopeAuthorizationStatus: rolledBackCandidate.promotionScopeAuthorization?.status,
      scopeAuthorizationToScope: rolledBackCandidate.promotionScopeAuthorization?.toScope,
      scopeAuthorizationToScopeId: rolledBackCandidate.promotionScopeAuthorization?.toScopeId,
      scopeId: rolledBackCandidate.promotionDecision?.scopeId,
      target: rolledBackCandidate.promotionDecision?.target,
      verificationId: rolledBackCandidate.promotionVerification?.id,
      verificationStatus: rolledBackCandidate.promotionVerification?.status,
    },
    quality,
    sourceRun,
    topology: {
      crossWorkspaceId: crossWorkspace.id,
      crossWorkspaceMission: missionBinding(crossWorkspaceMission),
      siblingMission: missionBinding(siblingMission),
      sourceMission: missionBinding(sourceMission),
      sourceWorkspaceId: sourceWorkspace.id,
    },
  });
  assertLocalUserLearningPersonalizationEvidence(evidence);
  if (!evidence.actualLocalUserScopedPersonalizationValidated) {
    throw new Error(
      `P7 local user learning personalization failed: ${JSON.stringify(evidence.results)}.`,
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
  actualLocalUserScopedPersonalizationValidated: true,
  actualModelTrainingExecuted: false,
  costFree: true,
  externalProviderCalls: 'none',
  generalUserPersonalizationValidated: false,
  hostedTenantUserPersonalizationValidated: false,
  mode: 'local-user-learning-personalization',
  multiUserIsolationValidated: false,
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  productionReadyClaim: false,
  sessionCount: 7,
}, null, 2));

function runTargets({ crossWorkspaceMission, label, memory, rootDir, siblingMission, testCase }) {
  return {
    crossWorkspace: runTarget({
      label: `P7 cross-workspace ${label}`,
      memory,
      mission: crossWorkspaceMission,
      rootDir,
      testCase,
    }),
    sibling: runTarget({
      label: `P7 sibling ${label}`,
      memory,
      mission: siblingMission,
      rootDir,
      testCase,
    }),
  };
}

function runTarget({ label, memory, mission, rootDir, testCase }) {
  const result = runFeedbackMission({ label, missionId: mission.id, rootDir });
  return observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    expectMemoryApplied: Boolean(memory),
    label,
    memoryContent: memory?.content || '',
    memoryId: memory?.id || '',
    rootDir,
    sessionId: result.sessionId,
  });
}

function evaluateTargetPhases({ memory, observations, target, testCase }) {
  return Object.fromEntries(
    Object.entries(observations).map(([phase, observation]) => [
      phase,
      evaluateAnswerQualityCase({
        answer: {
          citedSourceKeys: observation.answerQuality.citedSourceKeys,
          text: observation.answerQuality.answerText,
        },
        expectedSourceKeys: [`memory:${memory.id}`],
        forbiddenAnswerTerms: [],
        forbiddenSourceKeys: [],
        id: `${testCase.id}-${target}`,
        requiredAnswerTerms: testCase.requiredAnswerTerms,
        retrievedItems: observation.answerQuality.retrievedItems,
        reviewerVerdict: observation.summary.reviewerVerdict,
      }),
    ]),
  );
}

function targetSummaries(phases, target) {
  return Object.fromEntries(
    Object.entries(phases).map(([phase, observations]) => [phase, observations[target].summary]),
  );
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
  if (index < 0 || !event) {
    throw new Error(`P7 audit event is missing: ${kind}.`);
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
    value?.schemaVersion !== 'personal-ai-agent-local-user-learning-personalization-cases/v1' ||
    value?.productionReadyClaim !== false ||
    value?.cases?.length !== 1 ||
    !candidate?.id ||
    !candidate?.expectedPlanStep ||
    !candidate?.promotionNote ||
    !candidate?.scopeAuthorizationNote ||
    !candidate?.sourceObjective ||
    !candidate?.targetObjective ||
    !Array.isArray(candidate?.requiredAnswerTerms) ||
    candidate.requiredAnswerTerms.length < 3 ||
    !Number.isInteger(candidate?.minimumRetrievalMatchTermCount)
  ) {
    throw new Error('P7 local user learning personalization fixture is invalid.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P7 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P7 local user learning personalization output must stay inside the repository.');
  }
  return { outputPath };
}
