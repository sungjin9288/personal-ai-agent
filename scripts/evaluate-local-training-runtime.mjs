import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import {
  buildLocalTrainingExecutionApproval,
  createLocalTrainingRuntime,
  LOCAL_TRAINING_PROTOCOL_VERSION,
} from '../src/core/local-training-runtime.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { createApprovedTrainingRecordFixtureSet } from './training-record-fixture-runtime.mjs';
import {
  createLocalTrainingPostAcquisitionReadinessFixture,
} from './evaluate-local-training-post-acquisition-readiness.mjs';

export const LOCAL_TRAINING_RUNTIME_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-evidence/v1';

const APPROVED_AT = '2026-07-17T01:00:00.000Z';
const COMPLETED_AT = '2026-07-17T01:30:01.000Z';
const EXPIRES_AT = '2026-07-17T02:00:00.000Z';
const STARTED_AT = '2026-07-17T01:30:00.000Z';
const TRAINER_ID = 'fixture-local-trainer-v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function readJson(repoDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoDir, relativePath), 'utf8'));
}

function createRuntime(repoDir, mode = 'success', options = {}) {
  const timestamps = [STARTED_AT, COMPLETED_AT];
  return createLocalTrainingRuntime({
    args: [path.join(repoDir, 'fixtures', 'local-training-command.mjs'), '--mode', mode],
    clock: () => timestamps.shift() || COMPLETED_AT,
    command: process.execPath,
    cwd: repoDir,
    env: {
      HOME: process.env.HOME,
      OPENAI_API_KEY: 'must-not-reach-child',
      PATH: process.env.PATH,
      TMPDIR: process.env.TMPDIR,
    },
    trainerId: TRAINER_ID,
    ...options,
  });
}

function buildApproval(readinessPackage, overrides = {}) {
  return buildLocalTrainingExecutionApproval({
    approvedAt: APPROVED_AT,
    approvedBy: 'local-operator',
    baseModelId: 'approved-local-base-model',
    executionKind: 'fixture-simulated',
    expiresAt: EXPIRES_AT,
    readinessPackage,
    rollbackOwner: 'local-operator',
    trainerId: TRAINER_ID,
    ...overrides,
  });
}

async function rejectionMatches(operation, pattern) {
  try {
    await operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

export async function evaluateLocalTrainingRuntimeContract({ repoDir = process.cwd() } = {}) {
  const readinessFixture = readJson(repoDir, 'fixtures/fine-tuning-readiness-cases-v1.json');
  const datasetFixture = readJson(repoDir, readinessFixture.datasetFixture);
  const answerQualityFixture = readJson(repoDir, readinessFixture.answerQualityFixture);
  const { records, stateBefore, statePath, tempRoot } = createApprovedTrainingRecordFixtureSet({
    cases: datasetFixture.cases,
    tempPrefix: 'personal-ai-agent-local-training-runtime-',
  });
  let admissionFixture;

  try {
    const datasetManifest = buildTrainingDatasetManifest({
      records,
      seed: datasetFixture.seed,
    });
    const baselineEvaluation = evaluateAnswerQualitySuite({
      cases: answerQualityFixture.cases.map(({ retrievalInput, ...definition }) => ({
        ...definition,
        retrievedItems: buildRetrievalContext(retrievalInput),
      })),
      thresholds: answerQualityFixture.thresholds,
    });
    const readinessPackage = buildFineTuningReadinessPackage({
      baselineEvaluation,
      datasetManifest,
      records,
    });
    const approval = buildApproval(readinessPackage);
    const runtime = createRuntime(repoDir);
    const run = await runtime.run({ approval, readinessPackage });
    admissionFixture =
      await createLocalTrainingPostAcquisitionReadinessFixture({
        mode: 'recorded-local-acquisition',
        repoDir,
      });
    const admissionTarget =
      admissionFixture.postAcquisitionReadiness.trainingTarget;
    const admissionApproval = buildLocalTrainingExecutionApproval({
      approvedAt: admissionFixture.permission.resolvedAt,
      approvedBy: admissionFixture.permission.resolvedBy,
      baseModelId: admissionTarget.baseModelId,
      executionKind: 'local-model-training',
      expiresAt: admissionFixture.permission.expiresAt,
      permission: admissionFixture.permission,
      readinessPackage: admissionFixture.readinessPackage,
      rollbackOwner: admissionTarget.rollbackOwner,
      trainerId: admissionTarget.trainerId,
    });
    const admissionInput = {
      approval: admissionApproval,
      currentPermission: admissionFixture.permission,
      permissionRevocation: null,
      postAcquisitionReadiness:
        admissionFixture.postAcquisitionReadiness,
      readinessPackage: admissionFixture.readinessPackage,
    };
    const admissionRuntimeOptions = {
      clock: () => '2026-07-17T08:41:00.000Z',
      trainerId: admissionTarget.trainerId,
    };

    const tamperedReadiness = structuredClone(readinessPackage);
    tamperedReadiness.exports.train.content += 'tampered\n';
    const failureGuards = {
      expiredApprovalBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'success', {
          clock: () => '2026-07-17T03:00:00.000Z',
        }).run({ approval, readinessPackage }),
        /time-window/,
      ),
      trainerReportMismatchBlocked: await rejectionMatches(
        () => createRuntime(
          repoDir,
          'success',
          admissionRuntimeOptions,
        ).run(admissionInput),
        /does not match the approved execution request/,
      ),
      postAcquisitionAdmissionRequired: await rejectionMatches(
        () => createRuntime(
          repoDir,
          'success',
          admissionRuntimeOptions,
        ).run({
          ...admissionInput,
          postAcquisitionReadiness: undefined,
        }),
        /post-acquisition-admission/,
      ),
      permissionRevocationBlocked: await rejectionMatches(
        () => createRuntime(
          repoDir,
          'success',
          admissionRuntimeOptions,
        ).run({
          ...admissionInput,
          permissionRevocation: {
            status: 'revoked',
          },
        }),
        /post-acquisition-admission/,
      ),
      staleCurrentPermissionBlocked: await rejectionMatches(
        () => createRuntime(
          repoDir,
          'success',
          admissionRuntimeOptions,
        ).run({
          ...admissionInput,
          currentPermission: {
            ...admissionFixture.permission,
            id: 'local-training-permission-stale',
          },
        }),
        /permission-current-state/,
      ),
      inputLimitBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'success', { maxInputBytes: 128 }).run({
          approval,
          readinessPackage,
        }),
        /input exceeds 128 bytes/,
      ),
      mismatchedResultBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'mismatch').run({ approval, readinessPackage }),
        /does not match the approved execution request/,
      ),
      outputLimitBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'large-output', { maxOutputBytes: 512 }).run({
          approval,
          readinessPackage,
        }),
        /stdout exceeds 512 bytes/,
      ),
      stderrRedacted: await rejectionMatches(
        () => createRuntime(repoDir, 'fail').run({ approval, readinessPackage }),
        /^Local training command exited with code 9\.$/,
      ),
      tamperedReadinessBlocked: await rejectionMatches(
        () => createRuntime(repoDir).run({
          approval,
          readinessPackage: tamperedReadiness,
        }),
        /Fine-tuning readiness package failed/,
      ),
      timeoutBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'hang', { timeoutMs: 50 }).run({
          approval,
          readinessPackage,
        }),
        /timed out after 50ms/,
      ),
      unsupportedOutputBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'unsupported-field').run({ approval, readinessPackage }),
        /contains unsupported fields/,
      ),
      unsafeMetadataBlocked: await rejectionMatches(
        () => createRuntime(repoDir, 'unsafe-metadata').run({ approval, readinessPackage }),
        /requires content-free candidate artifact metadata/,
      ),
    };

    const failedFailureGuards = Object.entries(failureGuards)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    assert.deepEqual(failedFailureGuards, [], 'every local training failure guard must pass');
    assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'runtime must not mutate the store');

    const evidence = {
      approval: {
        approvalHash: approval.approvalHash,
        expiresAt: approval.expiresAt,
        id: approval.id,
        localExecutionAuthorized: approval.localExecutionAuthorized,
        rollbackOwner: approval.rollbackOwner,
      },
      claimBoundary: {
        actualModelTrainingExecuted: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        localTrainingRuntimeContractValidated: true,
        postAcquisitionAdmissionContractValidated: true,
        productionReadyClaim: false,
        rolloutAuthorized: false,
      },
      dataset: {
        datasetHash: readinessPackage.dataset.datasetHash,
        readinessHash: readinessPackage.readinessHash,
        trainLineCount: readinessPackage.exports.train.lineCount,
        trainSha256: readinessPackage.exportDigests.train,
        validationLineCount: readinessPackage.exports.validation.lineCount,
        validationSha256: readinessPackage.exportDigests.validation,
      },
      execution: {
        actualModelTrainingExecuted: run.actualModelTrainingExecuted,
        candidateArtifactFormat: run.candidate.artifactFormat,
        candidateArtifactSha256: run.candidate.artifactSha256,
        candidateModelId: run.candidate.modelId,
        protocolVersion: LOCAL_TRAINING_PROTOCOL_VERSION,
        runHash: run.runHash,
        status: run.status,
        trainerReportedActualModelTrainingExecuted:
          run.trainerReportedActualModelTrainingExecuted,
        trainerId: runtime.trainerId,
      },
      failureGuards,
      mode: 'local-training-runtime-contract',
      schemaVersion: LOCAL_TRAINING_RUNTIME_EVIDENCE_SCHEMA_VERSION,
      security: {
        ...runtime.security,
        currentPermissionState:
          'revalidated-before-spawn',
        postAcquisitionAdmission:
          'required-before-spawn',
      },
      storeMutation: false,
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id: `local-training-runtime-evidence-${evidenceHash}`,
    };
  } finally {
    admissionFixture?.cleanup();
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
}
