import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertApprovedLearningRagFeedbackEvidence,
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';
import {
  approveFeedbackMemory,
  createFeedbackMission,
  createFeedbackWorkspace,
  hashText,
  observeFeedbackRun,
  rollbackFeedbackMemory,
  runFeedbackMission,
} from './approved-learning-feedback-runtime.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'approved-learning-rag-feedback-cases-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const testCase = fixture.cases?.[0];
const options = parseOptions(process.argv.slice(2));

if (
  fixture.schemaVersion !== 'personal-ai-agent-approved-learning-rag-feedback-cases/v1' ||
  fixture.cases?.length !== 1 ||
  !testCase?.id ||
  !testCase.objective ||
  !testCase.promotionNote ||
  !testCase.expectedPlanStep
) {
  throw new Error('P1 approved learning RAG feedback fixture is invalid.');
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-learning-rag-feedback-'));
let evidence;
try {
  const workspace = createFeedbackWorkspace({
    name: 'approved-learning-rag-feedback',
    rootDir: tempRoot,
  });
  const mission = createFeedbackMission({
    rootDir: tempRoot,
    testCase,
    workspaceId: workspace.id,
  });

  const beforeRun = runFeedbackMission({
    label: 'P1',
    missionId: mission.id,
    rootDir: tempRoot,
  });
  const beforePromotion = observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    label: 'P1',
    memoryContent: '',
    memoryId: '',
    rootDir: tempRoot,
    sessionId: beforeRun.sessionId,
  }).summary;

  const { memory } = approveFeedbackMemory({
    candidateId: beforeRun.learningCandidateId,
    note: testCase.promotionNote,
    rootDir: tempRoot,
  });

  const afterRun = runFeedbackMission({
    label: 'P1',
    missionId: mission.id,
    rootDir: tempRoot,
  });
  const afterPromotion = observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    label: 'P1',
    memoryContent: memory.content,
    memoryId: memory.id,
    rootDir: tempRoot,
    sessionId: afterRun.sessionId,
  }).summary;
  if (afterPromotion.retrieval.matchTermCount < testCase.minimumRetrievalMatchTermCount) {
    throw new Error('P1 promoted memory retrieval did not meet the fixture term-match gate.');
  }

  const rolledBackCandidate = rollbackFeedbackMemory({
    candidateId: beforeRun.learningCandidateId,
    note: 'Rollback the promoted memory after the local feedback-loop evaluation.',
    rootDir: tempRoot,
  });
  const rollbackRun = runFeedbackMission({
    label: 'P1',
    missionId: mission.id,
    rootDir: tempRoot,
  });
  const afterRollback = observeFeedbackRun({
    expectedPlanStep: testCase.expectedPlanStep,
    label: 'P1',
    memoryContent: memory.content,
    memoryId: memory.id,
    rootDir: tempRoot,
    sessionId: rollbackRun.sessionId,
  }).summary;

  evidence = buildApprovedLearningRagFeedbackEvidence({
    fixtureBinding: {
      caseId: testCase.id,
      expectedPlanStepHash: hashText(testCase.expectedPlanStep),
      fixtureHash: hashText(fixtureText),
      objectiveHash: hashText(testCase.objective),
      promotionNoteHash: hashText(testCase.promotionNote),
    },
    mission: {
      id: mission.id,
      objectiveHash: hashText(mission.objective),
      workspaceId: workspace.id,
    },
    observedAt: new Date().toISOString(),
    promotion: {
      candidateId: rolledBackCandidate.id,
      finalStatus: rolledBackCandidate.promotionStatus,
      memoryContentHash: hashText(memory.content),
      memoryId: memory.id,
      memoryRollbackStatus: rolledBackCandidate.promotionRollback?.memoryRollbackStatus,
      rollbackAction: rolledBackCandidate.promotionDecision?.rollback?.action,
      rollbackStatus: rolledBackCandidate.promotionDecision?.rollback?.status,
      scope: rolledBackCandidate.promotionDecision?.scope,
      scopeId: rolledBackCandidate.promotionDecision?.scopeId,
      target: rolledBackCandidate.promotionDecision?.target,
      verificationId: rolledBackCandidate.promotionVerification?.id,
      verificationStatus: rolledBackCandidate.promotionVerification?.status,
    },
    runs: {
      beforePromotion,
      afterPromotion,
      afterRollback,
    },
  });
  assertApprovedLearningRagFeedbackEvidence(evidence);
  if (!evidence.actualApprovedLearningRagFeedbackValidated) {
    throw new Error(
      `P1 approved learning RAG feedback gate failed: ${JSON.stringify(evidence.results)}.`,
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
  actualApprovedLearningRagFeedbackValidated: true,
  actualModelTrainingExecuted: false,
  costFree: true,
  externalProviderCalls: 'none',
  generalAnswerQualityImprovementValidated: false,
  mode: 'approved-learning-rag-feedback',
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  postPromotionPlanStepCount: evidence.runs.afterPromotion.adaptation.planStepCount,
  postPromotionRetrievalMatchTermCount: evidence.runs.afterPromotion.retrieval.matchTermCount,
  productionReadyClaim: false,
  rollbackPlanStepCount: evidence.runs.afterRollback.adaptation.planStepCount,
}, null, 2));

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P1 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = normalizeText(values.get('--output'));
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P1 approved learning RAG feedback output must stay inside the repository.');
  }
  return { outputPath };
}

function normalizeText(value) {
  return String(value || '').trim();
}
