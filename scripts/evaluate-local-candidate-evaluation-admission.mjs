import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  admitLocalCandidateEvaluation,
  buildLocalCandidateEvaluationRequest,
} from '../src/core/local-candidate-evaluation-admission.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from './evaluate-local-training-candidate-artifact-verification.mjs';
import {
  createLocalCandidateEvaluatorFixture,
} from './local-candidate-evaluator-fixture.mjs';

export const LOCAL_CANDIDATE_EVALUATION_ADMISSION_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-admission-evidence/v4';

const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function resealRequest(request, changes) {
  const {
    id: ignoredId,
    requestHash: ignoredRequestHash,
    ...content
  } = request;
  const changed = {
    ...content,
    ...changes,
  };
  const requestHash = hashRecord(changed);
  return {
    ...changed,
    id: `local-candidate-evaluation-request-${requestHash}`,
    requestHash,
  };
}

function rejectionMatches(operation, pattern) {
  try {
    operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

function buildRequest(fixture, verification, overrides = {}) {
  return buildLocalCandidateEvaluationRequest({
    candidateArtifactVerification: verification,
    currentPermission: fixture.permission,
    evaluationKind: 'fixture-simulated',
    evaluationSuiteContent: fixture.evaluationSuiteContent,
    evaluatorId: 'fixture-local-candidate-evaluator-v1',
    evaluatorProvenance: fixture.evaluatorProvenance,
    expiresAt: EXPIRES_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-evaluation-operator',
    ...overrides,
  });
}

function admit(fixture, verification, request, overrides = {}) {
  return admitLocalCandidateEvaluation({
    candidateArtifactVerification: verification,
    currentPermission: fixture.permission,
    evaluationSuiteContent: fixture.evaluationSuiteContent,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request,
    ...overrides,
  });
}

export async function evaluateLocalCandidateEvaluationAdmission({
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode: 'recorded-local-training',
      repoDir,
    });
  const fixtureOnly =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode: 'fixture-simulated',
      repoDir,
    });
  try {
    fixture.evaluationSuiteContent = fs.readFileSync(
      path.join(
        repoDir,
        'fixtures',
        'answer-quality-cases-v1.json',
      ),
      'utf8',
    );
    fixtureOnly.evaluationSuiteContent =
      fixture.evaluationSuiteContent;
    fixture.evaluatorProvenance =
      createLocalCandidateEvaluatorFixture({
        repoDir,
      }).provenance;
    fixtureOnly.evaluatorProvenance =
      fixture.evaluatorProvenance;
    const verification = await fixture.verifier.verify(
      fixture.input,
    );
    const fixtureVerification =
      await fixtureOnly.verifier.verify(fixtureOnly.input);
    const request = buildRequest(fixture, verification);
    const admission = admit(
      fixture,
      verification,
      request,
    );
    const suiteDrift = resealRequest(request, {
      evaluationSuite: {
        ...request.evaluationSuite,
        thresholdsHash: '0'.repeat(64),
      },
    });
    const suiteContentDrift =
      `${fixture.evaluationSuiteContent}\n`;
    const artifactDrift = resealRequest(request, {
      candidateArtifactVerification: {
        ...request.candidateArtifactVerification,
        verificationHash: '0'.repeat(64),
      },
    });
    const resourceDrift = resealRequest(request, {
      resourceLimits: {
        ...request.resourceLimits,
        maxRuntimeMs:
          request.resourceLimits.maxRuntimeMs + 1,
      },
    });
    const failureGuards = {
      actualCandidateEvidenceRequired: rejectionMatches(
        () => buildRequest(fixtureOnly, fixtureVerification),
        /recorded candidate artifact verification/,
      ),
      artifactVerificationBindingRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          artifactDrift,
        ),
        /integrity-or-current-binding/,
      ),
      currentPermissionRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          request,
          {
            currentPermission: {
              ...fixture.permission,
              id: 'local-training-permission-stale',
            },
          },
        ),
        /permission failed: integrity|current-permission-binding/,
      ),
      evaluationDoesNotExecute:
        admission.actualModelEvaluated === false,
      evaluatorProvenanceIntegrityRequired:
        rejectionMatches(
          () =>
            admit(
              fixture,
              verification,
              {
                ...request,
                evaluatorProvenance: {
                  ...request.evaluatorProvenance,
                  executable: {
                    ...request.evaluatorProvenance.executable,
                    sha256: '0'.repeat(64),
                  },
                },
              },
            ),
          /integrity-or-current-binding/,
        ),
      explicitNoRevocationRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          request,
          {
            permissionRevocation: undefined,
          },
        ),
        /explicit current no-revocation state/,
      ),
      externalCallsRemainDisabled:
        admission.externalProviderCalls === 'none' &&
        admission.externalSubmissionAuthorized === false,
      f1EvaluationSuiteBindingRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          suiteDrift,
        ),
        /integrity-or-current-binding/,
      ),
      f1EvaluationSuiteBytesRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          request,
          {
            evaluationSuiteContent: suiteContentDrift,
          },
        ),
        /integrity-or-current-binding/,
      ),
      requestIntegrityRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          {
            ...request,
            requestedBy: 'another-operator',
          },
        ),
        /integrity-or-current-binding/,
      ),
      resourceEnvelopeBindingRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          resourceDrift,
        ),
        /integrity-or-current-binding/,
      ),
      requestTimeWindowRequired: rejectionMatches(
        () => admit(
          fixture,
          verification,
          request,
          {
            now: EXPIRES_AT,
          },
        ),
        /integrity-or-current-binding/,
      ),
      rolloutRemainsBlocked:
        admission.rolloutAuthorized === false &&
        admission.rollback.activationAuthorized === false,
      trainingRemainsBlocked:
        admission.trainingAuthorized === false &&
        admission.trainingProcessProvenanceVerified === false,
      unsafeOperatorMetadataRejected: rejectionMatches(
        () => buildRequest(
          fixture,
          verification,
          {
            requestedBy: 'api_key=secret-value',
          },
        ),
        /content-free metadata/,
      ),
    };
    const content = {
      admission: {
        actualModelEvaluated:
          admission.actualModelEvaluated,
        candidateEvaluationAuthorized:
          admission.candidateEvaluationAuthorized,
        remainingGates: admission.remainingGates,
        status: admission.status,
        trainingProcessProvenanceVerified:
          admission.trainingProcessProvenanceVerified,
      },
      claimBoundary: {
        actualCandidateArtifactsObserved: false,
        actualModelEvaluated: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      failureGuards,
      mode: 'local-candidate-evaluation-admission',
      request: {
        artifactFormat: request.candidate.artifactFormat,
        artifactSetBound: true,
        candidateEvaluationAuthorized:
          request.candidateEvaluationAuthorized,
        caseCount:
          request.evaluationSuite.caseIds.length,
        evaluationSuiteArtifactByteLength:
          request.evaluationSuite.artifact.byteLength,
        evaluationSuiteArtifactSha256:
          request.evaluationSuite.artifact.sha256,
        evaluationSuiteHash:
          hashRecord(request.evaluationSuite),
        evaluationKind: request.evaluationKind,
        evaluatorBundleArtifactSetSha256:
          request.evaluatorProvenance.bundle
            .artifactSetSha256,
        evaluatorBundleFileCount:
          request.evaluatorProvenance.bundle.fileCount,
        evaluatorExecutableSha256:
          request.evaluatorProvenance.executable.sha256,
        evaluatorIdHash: hashValue(request.evaluatorId),
        modelIdHash: hashValue(request.candidate.modelId),
        status: request.status,
      },
      schemaVersion:
        LOCAL_CANDIDATE_EVALUATION_ADMISSION_EVIDENCE_SCHEMA_VERSION,
      security: {
        contentFreeEvidence: true,
        currentPermissionRevalidated: true,
        explicitNoRevocationRequired: true,
        evaluatorProvenanceBound: true,
        f1EvaluationSuiteBound: true,
        f1EvaluationSuiteBytesBound: true,
        localEvaluationOnly: true,
        resourceEnvelopeBound: true,
      },
    };
    const evidenceHash = hashRecord(content);
    return {
      ...content,
      evidenceHash,
      id:
        `local-candidate-evaluation-admission-evidence-${evidenceHash}`,
    };
  } finally {
    fixture.cleanup();
    fixtureOnly.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const evidence =
    await evaluateLocalCandidateEvaluationAdmission();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
