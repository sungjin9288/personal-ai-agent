import { createHash } from 'node:crypto';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalUserQueryQualityThresholds,
  LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
} from '../src/core/local-user-query-quality.mjs';
import {
  assertUserQueryEvaluationIntake,
  buildUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';
import {
  assertOwnerOnlyActualEvaluationInputs,
  assertPrivateActualEvaluationPaths,
  readBoundedEvaluationJson,
} from './private-user-query-evaluation-paths.mjs';

export { LOCAL_USER_QUERY_QUALITY_THRESHOLDS };

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export function loadLocalUserQueryEvaluationSuite({
  datasetPath,
  intakePath,
} = {}) {
  const datasetInput = readBoundedEvaluationJson({
    filename: datasetPath,
    label: 'dataset',
    maxBytes: MAX_INPUT_BYTES,
  });
  const intakeInput = readBoundedEvaluationJson({
    filename: intakePath,
    label: 'intake',
    maxBytes: MAX_INPUT_BYTES,
  });
  const initialDataset = datasetInput.value;
  const initialIntake = intakeInput.value;
  assertUserQueryEvaluationIntake(initialIntake);

  const actualUserQueryData =
    initialDataset.actualUserQueryData === true ||
    initialIntake.actualUserQueryData === true;
  assertPrivateActualEvaluationPaths({
    actualUserQueryData,
    errorMessage:
      'Actual user query evaluation requires distinct private dataset, intake, and output paths outside tracked repository content.',
    paths: [datasetInput.filename, intakeInput.filename],
    repoDir: process.cwd(),
  });
  const [authorizedDataset, authorizedIntake] =
    assertOwnerOnlyActualEvaluationInputs({
      actualUserQueryData,
      inputs: [datasetInput, intakeInput],
    });
  const dataset = authorizedDataset.value;
  const intake = authorizedIntake.value;

  const rebuiltIntake = buildUserQueryEvaluationIntake({
    dataset,
    observedAt: intake.observedAt,
  });
  if (rebuiltIntake.evidenceHash !== intake.evidenceHash) {
    throw new Error('Local user query evaluation intake does not match the dataset.');
  }
  if (
    intake.usage.localModelInputAuthorized !== true ||
    intake.usage.externalTransferAuthorized !== false ||
    intake.usage.trainingAuthorized !== false
  ) {
    throw new Error('Local user query evaluation usage is not authorized.');
  }

  const intakeRecords = new Map(intake.records.map((record) => [record.idHash, record]));
  const caseInputs = dataset.records.map((record) => {
    const idHash = sha256(record.id);
    const intakeRecord = intakeRecords.get(idHash);
    const evidenceHash = hashRecord(record.evidence);
    const expectedAnswerContractHash = hashRecord(record.expectedAnswerTerms);
    if (
      !intakeRecord ||
      intakeRecord.queryHash !== sha256(record.query) ||
      intakeRecord.evidenceHash !== evidenceHash ||
      intakeRecord.expectedAnswerContractHash !== expectedAnswerContractHash ||
      intakeRecord.domain !== record.domain ||
      intakeRecord.language !== record.language ||
      intakeRecord.evidenceItemCount !== record.evidence.length ||
      intakeRecord.expectedAnswerTermCount !== record.expectedAnswerTerms.length
    ) {
      throw new Error('Local user query evaluation record drifted from the intake.');
    }
    const sourceKeys = record.evidence.map(
      (_item, index) => `user-query-evidence:${idHash}:${index + 1}`,
    );
    return {
      definition: {
        expectedSourceKeys: sourceKeys,
        forbiddenAnswerTerms: [],
        forbiddenSourceKeys: [],
        id: idHash,
        requiredAnswerTerms: record.expectedAnswerTerms,
      },
      domain: record.domain,
      evidence: record.evidence.map((snippet, index) => ({
        snippet,
        sourceKey: sourceKeys[index],
      })),
      evidenceHash,
      expectedAnswerContractHash,
      idHash,
      language: record.language,
      objective: record.query,
      queryHash: sha256(record.query),
    };
  }).sort((left, right) => left.idHash.localeCompare(right.idHash));

  const suite = {
    actualUserQueryData: intake.actualUserQueryData,
    cases: caseInputs.map((item) => ({
      domain: item.domain,
      evidenceHash: item.evidenceHash,
      evidenceItemCount: item.evidence.length,
      expectedAnswerContractHash: item.expectedAnswerContractHash,
      idHash: item.idHash,
      language: item.language,
      queryHash: item.queryHash,
    })),
    datasetIdHash: intake.datasetIdHash,
    intakeEvidenceHash: intake.evidenceHash,
    thresholds: LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
  };

  return { caseInputs, intake, suite };
}

export function assertLocalUserQueryEvaluationAuthorization({
  intake,
  observedAt,
} = {}) {
  assertUserQueryEvaluationIntake(intake);
  const normalizedObservedAt = String(observedAt || '').trim();
  if (
    !Number.isFinite(Date.parse(normalizedObservedAt)) ||
    intake.usage.evaluationAuthorized !== true ||
    intake.usage.localModelInputAuthorized !== true ||
    intake.usage.externalTransferAuthorized !== false ||
    intake.usage.trainingAuthorized !== false ||
    Date.parse(intake.usage.retentionUntil) <= Date.parse(normalizedObservedAt) ||
    (intake.actualUserQueryData &&
      Date.parse(intake.consent.expiresAt) <= Date.parse(normalizedObservedAt))
  ) {
    throw new Error('Local user query evaluation authorization is not current.');
  }
  return intake;
}

export async function evaluateLocalUserQuerySuite({
  authorizeCase,
  caseInputs,
  generator,
  thresholds = LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
} = {}) {
  if (typeof authorizeCase !== 'function') {
    throw new Error('Local user query evaluation requires per-case authorization.');
  }
  assertLocalUserQueryQualityThresholds(thresholds);
  const cases = [];
  const observations = [];
  for (const item of caseInputs || []) {
    await authorizeCase({ caseIdHash: item.idHash });
    const startedAt = performance.now();
    let generated;
    try {
      generated = await generator.generate({
        objective: item.objective,
        retrievedItems: item.evidence,
      });
    } catch (error) {
      const failureKind = classifyGenerationFailure(error);
      cases.push({
        ...item.definition,
        answer: {
          citedSourceKeys: [],
          text: '',
        },
        retrievedItems: item.evidence,
      });
      const inputHash = hashRecord({
        evidence: item.evidence,
        objective: item.objective,
      });
      observations.push({
        caseIdHash: item.idHash,
        citedSourceKeys: [],
        claimCount: 0,
        durationMs: Math.max(0.001, Number((performance.now() - startedAt).toFixed(3))),
        failureKind,
        generationStatus: 'failed',
        identifierRestorationCount: 0,
        inputHash,
        maxOutputTokens: 1_024,
        outputBytes: 0,
        promptHash: generator.promptHash,
        promptVersion: generator.promptVersion,
        rawInputHash: inputHash,
        responseHash: sha256(`generation-failed:${item.idHash}:${failureKind}`),
        reviewActionPresent: false,
        reviewActionSpecific: false,
        sanitization: {
          applied: false,
          evidenceInstructionRemovalCount: 0,
          instructionRemovalCount: 0,
          normalizationApplied: false,
          normalizationKinds: [],
          objectiveInstructionRemovalCount: 0,
        },
        sourceCoverageComplete: false,
      });
      continue;
    }
    cases.push({
      ...item.definition,
      answer: generated.answer,
      retrievedItems: item.evidence,
    });
    observations.push({
      ...generated.observation,
      caseIdHash: item.idHash,
      citedSourceKeys: generated.answer.citedSourceKeys,
      claimCount: generated.composition.claimCount,
      failureKind: null,
      generationStatus: 'passed',
      identifierRestorationCount:
        generated.composition.identifierRestorationCount,
      reviewActionPresent: generated.composition.reviewActionPresent,
      reviewActionSpecific: generated.composition.reviewActionSpecific,
      sourceCoverageComplete: generated.composition.sourceCoverageComplete,
    });
  }
  return {
    answerQualityEvaluation: evaluateAnswerQualitySuite({ cases, thresholds }),
    observations,
  };
}

function classifyGenerationFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('placeholder review action')) {
    return 'invalid-review-action';
  }
  if (message.includes('invalid structured JSON')) {
    return 'invalid-structured-output';
  }
  if (message.includes('incomplete source coverage')) {
    return 'incomplete-source-coverage';
  }
  if (message.toLowerCase().includes('timeout')) {
    return 'generation-timeout';
  }
  return 'generation-contract-error';
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}
