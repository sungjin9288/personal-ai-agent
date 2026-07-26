import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertApprovedLearningFeedbackQualityEvidence,
  buildApprovedLearningFeedbackQualityEvidence,
} from '../src/core/approved-learning-feedback-quality.mjs';
import {
  assertApprovedLearningRagFeedbackEvidence,
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';
import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
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
const fixturePath = path.join(
  repoDir,
  'fixtures',
  'approved-learning-feedback-quality-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const options = parseOptions(process.argv.slice(2));

validateFixture(fixture);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-learning-feedback-quality-'),
);
let evidence;
try {
  const workspace = createFeedbackWorkspace({
    name: 'approved-learning-feedback-quality',
    rootDir: tempRoot,
  });
  const records = fixture.cases.map((testCase) => {
    const mission = createFeedbackMission({
      rootDir: tempRoot,
      testCase,
      workspaceId: workspace.id,
    });
    const beforeRun = runFeedbackMission({
      label: `P2 ${testCase.id} baseline`,
      missionId: mission.id,
      rootDir: tempRoot,
    });
    const beforePromotion = observeFeedbackRun({
      expectedPlanStep: testCase.expectedPlanStep,
      label: `P2 ${testCase.id} baseline`,
      memoryContent: '',
      memoryId: '',
      rootDir: tempRoot,
      sessionId: beforeRun.sessionId,
    });
    return { beforePromotion, beforeRun, mission, testCase };
  });

  for (const record of records) {
    const { memory } = approveFeedbackMemory({
      candidateId: record.beforeRun.learningCandidateId,
      note: record.testCase.promotionNote,
      rootDir: tempRoot,
    });
    record.memory = memory;
  }

  for (const record of records) {
    const afterRun = runFeedbackMission({
      label: `P2 ${record.testCase.id} promoted`,
      missionId: record.mission.id,
      rootDir: tempRoot,
    });
    record.afterPromotion = observeFeedbackRun({
      expectedPlanStep: record.testCase.expectedPlanStep,
      label: `P2 ${record.testCase.id} promoted`,
      memoryContent: record.memory.content,
      memoryId: record.memory.id,
      rootDir: tempRoot,
      sessionId: afterRun.sessionId,
    });
    if (
      record.afterPromotion.summary.retrieval.matchTermCount <
      record.testCase.minimumRetrievalMatchTermCount
    ) {
      throw new Error(`P2 ${record.testCase.id} retrieval did not meet the term-match gate.`);
    }
  }

  const beforePromotionEvaluation = evaluatePhase(records, 'beforePromotion');
  const afterPromotionEvaluation = evaluatePhase(records, 'afterPromotion');
  if (beforePromotionEvaluation.status !== 'failed' || afterPromotionEvaluation.status !== 'passed') {
    throw new Error('P2 controlled quality delta did not move from failed baseline to passed promotion.');
  }

  for (const record of records) {
    record.rolledBackCandidate = rollbackFeedbackMemory({
      candidateId: record.beforeRun.learningCandidateId,
      note: `Rollback ${record.testCase.id} after the local multi-scenario feedback evaluation.`,
      rootDir: tempRoot,
    });
  }

  for (const record of records) {
    const rollbackRun = runFeedbackMission({
      label: `P2 ${record.testCase.id} rollback`,
      missionId: record.mission.id,
      rootDir: tempRoot,
    });
    record.afterRollback = observeFeedbackRun({
      expectedPlanStep: record.testCase.expectedPlanStep,
      label: `P2 ${record.testCase.id} rollback`,
      memoryContent: record.memory.content,
      memoryId: record.memory.id,
      rootDir: tempRoot,
      sessionId: rollbackRun.sessionId,
    });
  }

  const afterRollbackEvaluation = evaluatePhase(records, 'afterRollback');
  if (afterRollbackEvaluation.status !== 'failed') {
    throw new Error('P2 rollback quality evaluation did not restore the failed clean baseline.');
  }

  const feedbackCases = records.map((record) => {
    const candidate = record.rolledBackCandidate;
    const feedbackEvidence = buildApprovedLearningRagFeedbackEvidence({
      fixtureBinding: {
        caseId: record.testCase.id,
        expectedPlanStepHash: hashText(record.testCase.expectedPlanStep),
        fixtureHash: hashText(fixtureText),
        objectiveHash: hashText(record.testCase.objective),
        promotionNoteHash: hashText(record.testCase.promotionNote),
      },
      mission: {
        id: record.mission.id,
        objectiveHash: hashText(record.mission.objective),
        workspaceId: workspace.id,
      },
      observedAt: new Date().toISOString(),
      promotion: {
        candidateId: candidate.id,
        finalStatus: candidate.promotionStatus,
        memoryContentHash: hashText(record.memory.content),
        memoryId: record.memory.id,
        memoryRollbackStatus: candidate.promotionRollback?.memoryRollbackStatus,
        rollbackAction: candidate.promotionDecision?.rollback?.action,
        rollbackStatus: candidate.promotionDecision?.rollback?.status,
        scope: candidate.promotionDecision?.scope,
        scopeId: candidate.promotionDecision?.scopeId,
        target: candidate.promotionDecision?.target,
        verificationId: candidate.promotionVerification?.id,
        verificationStatus: candidate.promotionVerification?.status,
      },
      runs: {
        afterPromotion: record.afterPromotion.summary,
        afterRollback: record.afterRollback.summary,
        beforePromotion: record.beforePromotion.summary,
      },
    });
    assertApprovedLearningRagFeedbackEvidence(feedbackEvidence);
    if (!feedbackEvidence.actualApprovedLearningRagFeedbackValidated) {
      throw new Error(
        `P2 ${record.testCase.id} feedback loop failed: ${JSON.stringify({
          adaptation: feedbackEvidence.runs.afterPromotion.adaptation,
          results: feedbackEvidence.results,
        })}.`,
      );
    }
    return feedbackEvidence;
  });
  const isolation = afterPromotionEvaluation.cases.map((result, index) => {
    const record = records[index];
    return {
      caseId: result.id,
      expectedMemoryId: record.memory.id,
      expectedMemorySourceCount: result.counts.expectedSourceCount,
      foreignMemoryCandidateCount: records.length - 1,
      foreignMemoryIds: records
        .filter((_, recordIndex) => recordIndex !== index)
        .map((other) => other.memory.id),
      foreignMemoryRetrievedCount: result.counts.forbiddenRetrievedSourceCount,
      retrievedExpectedMemorySourceCount: result.counts.retrievedExpectedSourceCount,
      retrievedMemoryIds: record.afterPromotion.answerQuality.retrievedItems
        .map((item) => item.sourceKey)
        .filter((sourceKey) => sourceKey.startsWith('memory:'))
        .map((sourceKey) => sourceKey.slice('memory:'.length)),
    };
  });

  evidence = buildApprovedLearningFeedbackQualityEvidence({
    evaluations: {
      afterPromotion: afterPromotionEvaluation,
      afterRollback: afterRollbackEvaluation,
      beforePromotion: beforePromotionEvaluation,
    },
    feedbackCases,
    fixtureBinding: {
      caseIds: fixture.cases.map((testCase) => testCase.id),
      fixtureHash: hashText(fixtureText),
    },
    isolation,
    observedAt: new Date().toISOString(),
  });
  assertApprovedLearningFeedbackQualityEvidence(evidence);
  if (!evidence.actualApprovedLearningFeedbackQualityValidated) {
    throw new Error(
      `P2 approved learning feedback quality gate failed: ${JSON.stringify(evidence.results)}.`,
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
  actualApprovedLearningFeedbackQualityValidated: true,
  actualModelTrainingExecuted: false,
  afterPromotionCasePassRate: evidence.evaluations.afterPromotion.summary.metrics.casePassRate,
  beforePromotionCasePassRate: evidence.evaluations.beforePromotion.summary.metrics.casePassRate,
  caseCount: evidence.fixtureBinding.caseIds.length,
  costFree: true,
  crossMissionGeneralizationValidated: false,
  externalProviderCalls: 'none',
  foreignMemoryRetrievedCount: evidence.isolation.reduce(
    (total, item) => total + item.foreignMemoryRetrievedCount,
    0,
  ),
  generalAnswerQualityImprovementValidated: false,
  mode: 'approved-learning-feedback-quality',
  ok: true,
  outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
  productionReadyClaim: false,
  rollbackCasePassRate: evidence.evaluations.afterRollback.summary.metrics.casePassRate,
}, null, 2));

function evaluatePhase(records, phase) {
  return evaluateAnswerQualitySuite({
    cases: records.map((record) => {
      const observation = record[phase];
      const expectedSourceKey = `memory:${record.memory.id}`;
      return {
        answer: {
          citedSourceKeys: observation.answerQuality.citedSourceKeys,
          text: observation.answerQuality.answerText,
        },
        expectedSourceKeys: [expectedSourceKey],
        forbiddenAnswerTerms: records
          .filter((other) => other !== record)
          .map((other) => other.testCase.isolationMarker),
        forbiddenSourceKeys: records
          .filter((other) => other !== record)
          .map((other) => `memory:${other.memory.id}`),
        id: record.testCase.id,
        requiredAnswerTerms: record.testCase.requiredAnswerTerms,
        retrievedItems: observation.answerQuality.retrievedItems,
        reviewerVerdict: observation.summary.reviewerVerdict,
      };
    }),
  });
}

function validateFixture(value) {
  const cases = Array.isArray(value?.cases) ? value.cases : [];
  const ids = cases.map((testCase) => testCase?.id);
  const markers = cases.map((testCase) => testCase?.isolationMarker);
  const validCases = cases.every(
    (testCase) =>
      testCase?.deliverableType &&
      testCase?.expectedPlanStep &&
      testCase?.mode &&
      testCase?.objective &&
      testCase?.promotionNote &&
      Array.isArray(testCase?.requiredAnswerTerms) &&
      testCase.requiredAnswerTerms.length >= 3 &&
      testCase?.title &&
      Number.isInteger(testCase?.minimumRetrievalMatchTermCount),
  );
  if (
    value?.schemaVersion !==
      'personal-ai-agent-approved-learning-feedback-quality-cases/v1' ||
    value?.productionReadyClaim !== false ||
    cases.length !== 3 ||
    new Set(ids).size !== cases.length ||
    new Set(markers).size !== cases.length ||
    !validCases
  ) {
    throw new Error('P2 approved learning feedback quality fixture is invalid.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (key !== '--output' || value === undefined || values.has(key)) {
      throw new Error('Expected one optional P2 --output path.');
    }
    values.set(key, value);
  }
  const outputValue = normalizeText(values.get('--output'));
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('P2 approved learning feedback quality output must stay inside the repository.');
  }
  return { outputPath };
}

function normalizeText(value) {
  return String(value || '').trim();
}
