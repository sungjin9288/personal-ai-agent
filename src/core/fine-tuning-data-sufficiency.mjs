import { createHash } from 'node:crypto';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';

export const FINE_TUNING_DATA_SUFFICIENCY_POLICY_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-sufficiency-policy/v1';
export const FINE_TUNING_DATA_SUFFICIENCY_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-sufficiency/v1';

const DEVELOPMENT_REQUIREMENTS = Object.freeze({
  maximumAcceptedRiskRate: 0.1,
  minimumAcceptedExamples: 20,
  minimumAnswerQualityCases: 10,
  minimumMissionScopes: 10,
  minimumTrainExamples: 16,
  minimumValidationExamples: 4,
});

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(String(value || ''));
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function buildPolicyContent(requirements = DEVELOPMENT_REQUIREMENTS) {
  return {
    candidateReviewOnly: true,
    candidateReviewRequiresApproval: true,
    externalSubmissionAuthorized: false,
    policyBasis: 'development-stop-condition-not-production-quality-claim',
    productionQualityThresholdClaim: false,
    requirements: { ...requirements },
    schemaVersion: FINE_TUNING_DATA_SUFFICIENCY_POLICY_SCHEMA_VERSION,
    trainingAuthorized: false,
  };
}

export function buildFineTuningDataSufficiencyPolicy() {
  const content = buildPolicyContent();
  const policyHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-data-sufficiency-policy-${policyHash}`,
    policyHash,
  };
}

export function assertFineTuningDataSufficiencyPolicy(policy) {
  const { id, policyHash, ...content } = policy || {};
  const expected = buildPolicyContent();
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    policyHash !== expectedHash ||
    id !== `fine-tuning-data-sufficiency-policy-${expectedHash}`
  ) {
    throw new Error('Fine-tuning data sufficiency policy integrity failed.');
  }
  return policy;
}

function parseExamples(exportFile) {
  return String(exportFile.content)
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function measureReadiness(readinessPackage) {
  const train = parseExamples(readinessPackage.exports.train);
  const validation = parseExamples(readinessPackage.exports.validation);
  const examples = [...train, ...validation];
  const missionScopes = new Set(
    examples.map(
      (example) =>
        `${example.metadata.scope.workspaceId}/${example.metadata.scope.id}`,
    ),
  );
  const acceptedRiskRecordIds = examples
    .filter((example) => example.metadata.acceptedRisk)
    .map((example) => example.recordId)
    .sort();
  const manifestAcceptedRiskRecordIds = [
    ...readinessPackage.evaluationManifest.dataset
      .acceptedRiskRecordIds,
  ].sort();
  const acceptedRiskExamples = acceptedRiskRecordIds.length;
  if (
    acceptedRiskExamples !==
      readinessPackage.evaluationManifest.dataset.acceptedRiskRecordCount ||
    JSON.stringify(acceptedRiskRecordIds) !==
      JSON.stringify(manifestAcceptedRiskRecordIds)
  ) {
    throw new Error(
      'Fine-tuning data sufficiency accepted-risk binding failed.',
    );
  }
  const acceptedExamples = examples.length;

  return {
    acceptedExamples,
    acceptedRiskExamples,
    acceptedRiskRate:
      acceptedExamples === 0
        ? 0
        : Number((acceptedRiskExamples / acceptedExamples).toFixed(6)),
    answerQualityCases:
      readinessPackage.evaluationManifest.answerQualityBaseline.caseResults
        .length,
    missionScopes: missionScopes.size,
    trainExamples: train.length,
    validationExamples: validation.length,
  };
}

function check(id, passed) {
  return {
    id,
    passed: Boolean(passed),
    status: passed ? 'passed' : 'failed',
  };
}

function buildChecks(authority, bindings, measurements, requirements) {
  return [
    check(
      'readiness-package-validated',
      isSha256(bindings.readinessHash) &&
        isSha256(bindings.evaluationManifestHash) &&
        isSha256(bindings.trainSha256) &&
        isSha256(bindings.validationSha256),
    ),
    check(
      'dataset-integrity-bound',
      isSha256(bindings.datasetHash) &&
        isSha256(bindings.datasetManifestHash),
    ),
    check(
      'execution-authority-closed',
      authority.actualModelTrainingExecuted === false &&
        authority.candidateTrainingReviewAllowed === false &&
        authority.externalSubmissionAuthorized === false &&
        authority.fineTuningExecutionAuthorized === false &&
        authority.productionReadyClaim === false &&
        authority.trainingAuthorized === false,
    ),
    check(
      'accepted-example-minimum',
      measurements.acceptedExamples >= requirements.minimumAcceptedExamples,
    ),
    check(
      'train-example-minimum',
      measurements.trainExamples >= requirements.minimumTrainExamples,
    ),
    check(
      'validation-example-minimum',
      measurements.validationExamples >=
        requirements.minimumValidationExamples,
    ),
    check(
      'mission-scope-minimum',
      measurements.missionScopes >= requirements.minimumMissionScopes,
    ),
    check(
      'answer-quality-case-minimum',
      measurements.answerQualityCases >=
        requirements.minimumAnswerQualityCases,
    ),
    check(
      'accepted-risk-rate-within-limit',
      measurements.acceptedRiskRate <= requirements.maximumAcceptedRiskRate,
    ),
  ];
}

export function evaluateFineTuningDataSufficiencyChecks({
  authority,
  bindings,
  measurements,
  policy = buildFineTuningDataSufficiencyPolicy(),
} = {}) {
  assertFineTuningDataSufficiencyPolicy(policy);
  assertFineTuningDataSufficiencyMeasurements(measurements);
  return buildChecks(
    authority,
    bindings,
    measurements,
    policy.requirements,
  );
}

export function assertFineTuningDataSufficiencyMeasurements(measurements) {
  if (
    ![
      measurements?.acceptedExamples,
      measurements?.acceptedRiskExamples,
      measurements?.answerQualityCases,
      measurements?.missionScopes,
      measurements?.trainExamples,
      measurements?.validationExamples,
    ].every(isNonNegativeInteger) ||
    !Number.isFinite(measurements?.acceptedRiskRate) ||
    measurements.acceptedRiskRate < 0 ||
    measurements.acceptedRiskRate > 1 ||
    measurements.acceptedExamples !==
      measurements.trainExamples + measurements.validationExamples ||
    measurements.acceptedRiskExamples > measurements.acceptedExamples ||
    measurements.missionScopes > measurements.acceptedExamples ||
    measurements.acceptedRiskRate !==
      (measurements.acceptedExamples === 0
        ? 0
        : Number(
            (
              measurements.acceptedRiskExamples /
              measurements.acceptedExamples
            ).toFixed(6),
          ))
  ) {
    throw new Error('Fine-tuning data sufficiency measurements are invalid.');
  }
  return measurements;
}

function buildAssessmentContent({
  authority,
  bindings,
  measurements,
  policy,
}) {
  const checks = evaluateFineTuningDataSufficiencyChecks({
    authority,
    bindings,
    measurements,
    policy,
  });
  const failedCheckIds = checks
    .filter((item) => !item.passed)
    .map((item) => item.id);
  const developmentGatePassed = failedCheckIds.length === 0;

  return {
    actualModelTrainingExecuted:
      authority.actualModelTrainingExecuted,
    bindings,
    candidateTrainingReviewAllowed:
      authority.candidateTrainingReviewAllowed,
    candidateTrainingReviewReady: developmentGatePassed,
    checks,
    decision: developmentGatePassed
      ? 'request-candidate-training-review-approval'
      : 'collect-more-reviewed-data',
    developmentGatePassed,
    externalSubmissionAuthorized:
      authority.externalSubmissionAuthorized,
    failedCheckIds,
    fineTuningExecutionAuthorized:
      authority.fineTuningExecutionAuthorized,
    measurements,
    policy,
    productionReadyClaim: authority.productionReadyClaim,
    reviewerApprovalRequired: true,
    schemaVersion: FINE_TUNING_DATA_SUFFICIENCY_SCHEMA_VERSION,
    status: developmentGatePassed
      ? 'sufficient-for-candidate-review-request'
      : 'insufficient-data',
    trustedReadinessAdmissionBound: false,
    trainingAuthorized: authority.trainingAuthorized,
  };
}

function summarizePolicy(policy) {
  return {
    candidateReviewOnly: policy.candidateReviewOnly,
    candidateReviewRequiresApproval:
      policy.candidateReviewRequiresApproval,
    externalSubmissionAuthorized:
      policy.externalSubmissionAuthorized,
    id: policy.id,
    policyBasis: policy.policyBasis,
    policyHash: policy.policyHash,
    productionQualityThresholdClaim:
      policy.productionQualityThresholdClaim,
    requirements: { ...policy.requirements },
    schemaVersion: policy.schemaVersion,
    trainingAuthorized: policy.trainingAuthorized,
  };
}

export function assessFineTuningDataSufficiency({
  policy = buildFineTuningDataSufficiencyPolicy(),
  readinessPackage,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  assertFineTuningDataSufficiencyPolicy(policy);

  const content = buildAssessmentContent({
    authority: {
      actualModelTrainingExecuted: false,
      candidateTrainingReviewAllowed: false,
      externalSubmissionAuthorized:
        readinessPackage.externalSubmissionAuthorized,
      fineTuningExecutionAuthorized:
        readinessPackage.fineTuningExecutionAuthorized,
      productionReadyClaim: readinessPackage.productionReadyClaim,
      trainingAuthorized: false,
    },
    bindings: {
      datasetHash: readinessPackage.dataset.datasetHash,
      datasetManifestHash: readinessPackage.dataset.manifestHash,
      evaluationManifestHash: readinessPackage.evaluationManifestHash,
      readinessHash: readinessPackage.readinessHash,
      trainSha256: readinessPackage.exportDigests.train,
      validationSha256: readinessPackage.exportDigests.validation,
    },
    measurements: measureReadiness(readinessPackage),
    policy: summarizePolicy(policy),
  });
  const assessmentHash = hashRecord(content);
  return {
    ...content,
    assessmentHash,
    id: `fine-tuning-data-sufficiency-${assessmentHash}`,
  };
}

export function assertFineTuningDataSufficiencyAssessment(assessment) {
  const { assessmentHash, id, ...content } = assessment || {};
  const policy = content.policy || {};
  const fullPolicy = {
    candidateReviewOnly: policy.candidateReviewOnly,
    candidateReviewRequiresApproval:
      policy.candidateReviewRequiresApproval,
    externalSubmissionAuthorized:
      policy.externalSubmissionAuthorized,
    id: policy.id,
    policyBasis: policy.policyBasis,
    policyHash: policy.policyHash,
    productionQualityThresholdClaim:
      policy.productionQualityThresholdClaim,
    requirements: policy.requirements,
    schemaVersion: policy.schemaVersion,
    trainingAuthorized: policy.trainingAuthorized,
  };
  assertFineTuningDataSufficiencyPolicy(fullPolicy);

  const authority = {
    actualModelTrainingExecuted:
      content.actualModelTrainingExecuted,
    candidateTrainingReviewAllowed:
      content.candidateTrainingReviewAllowed,
    externalSubmissionAuthorized:
      content.externalSubmissionAuthorized,
    fineTuningExecutionAuthorized:
      content.fineTuningExecutionAuthorized,
    productionReadyClaim: content.productionReadyClaim,
    trainingAuthorized: content.trainingAuthorized,
  };
  if (Object.values(authority).some((value) => value !== false)) {
    throw new Error(
      'Fine-tuning data sufficiency authority boundary failed.',
    );
  }
  if (
    content.candidateTrainingReviewReady !==
      content.developmentGatePassed ||
    content.reviewerApprovalRequired !== true ||
    content.trustedReadinessAdmissionBound !== false
  ) {
    throw new Error(
      'Fine-tuning data sufficiency review boundary failed.',
    );
  }

  if (
    ![
      content.bindings?.datasetHash,
      content.bindings?.datasetManifestHash,
      content.bindings?.evaluationManifestHash,
      content.bindings?.readinessHash,
      content.bindings?.trainSha256,
      content.bindings?.validationSha256,
    ].every(isSha256)
  ) {
    throw new Error('Fine-tuning data sufficiency bindings are invalid.');
  }

  const measurements = assertFineTuningDataSufficiencyMeasurements(
    content.measurements,
  );

  const expected = buildAssessmentContent({
    authority,
    bindings: content.bindings,
    measurements,
    policy,
  });
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    assessmentHash !== expectedHash ||
    id !== `fine-tuning-data-sufficiency-${expectedHash}`
  ) {
    throw new Error('Fine-tuning data sufficiency assessment integrity failed.');
  }
  return assessment;
}
