import { createHash } from 'node:crypto';

import {
  buildApprovedTrainingRecord,
} from './approved-training-record.mjs';
import { assertApprovedTrainingRecordForDataset } from './training-dataset-quality.mjs';
import { assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord } from './fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_SOURCE_BUNDLE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-reviewed-example-source-bundle/v1';
export const FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_RECEIPT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-reviewed-example-canonicalization-receipt/v1';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`Private reviewed example canonicalization ${label} is invalid.`);
  }
}

function reference(value, prefix, hashField, label) {
  exactKeys(value, ['id', hashField], label);
  if (!isHash(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Private reviewed example canonicalization ${label} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

export function deriveFineTuningPrivateReviewedExampleSourceHashes(source) {
  const artifacts = Array.isArray(source?.artifacts) ? source.artifacts : [];
  const reviewerArtifact = artifacts.find((artifact) => artifact?.id === source?.reviewerArtifactId);
  const sourceArtifact = artifacts.find((artifact) => artifact?.id === source?.sourceArtifactId);
  const candidate = source?.candidate;
  const mission = source?.mission;
  const session = source?.session;
  const trainingWorkspace = source?.trainingWorkspace;
  const candidateArtifact = artifacts.find((artifact) => artifact?.id === candidate?.artifactId);
  if (!candidate || !mission || !session || !trainingWorkspace || !candidateArtifact || !reviewerArtifact || !sourceArtifact) {
    throw new Error('Private reviewed example canonicalization source projection is invalid.');
  }
  return {
    lineageSha256: hash({
      candidate,
      missionId: mission.id,
      sessionId: session.id,
      workspaceId: trainingWorkspace.id,
    }),
    referenceSha256: hash({
      candidateArtifact,
      reviewerArtifact,
      reviewerArtifactId: source.reviewerArtifactId,
      sourceArtifact,
      sourceArtifactId: source.sourceArtifactId,
    }),
    scopeReferenceSha256: hash({
      candidateMissionId: candidate.missionId,
      candidateScope: candidate.scope,
      candidateScopeId: candidate.scopeId,
      candidateWorkspaceId: candidate.workspaceId,
      missionWorkspaceId: mission.workspaceId,
      sessionMissionId: session.missionId,
    }),
  };
}

export function assertFineTuningPrivateReviewedExampleSourceBundle(value) {
  exactKeys(value, [
    'admission', 'example', 'item', 'lineageSha256', 'referenceSha256',
    'schemaVersion', 'scopeReferenceSha256', 'workspace', 'artifacts', 'candidate',
    'mission', 'reviewerArtifactId', 'session', 'sourceArtifactId', 'trainingWorkspace',
  ], 'source bundle');
  const admission = reference(value.admission, 'fine-tuning-private-collection-item-admission-', 'admissionHash', 'source admission');
  const item = reference(value.item, 'fine-tuning-private-collection-item-', 'itemHash', 'source item');
  const workspace = reference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash', 'source workspace');
  exactKeys(value.example, ['instruction', 'response'], 'source example');
  if (
    value.schemaVersion !== FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_SOURCE_BUNDLE_SCHEMA_VERSION ||
    typeof value.example.instruction !== 'string' || !value.example.instruction.trim() ||
    typeof value.example.response !== 'string' || !value.example.response.trim() ||
    !isHash(value.lineageSha256) || !isHash(value.referenceSha256) || !isHash(value.scopeReferenceSha256)
  ) {
    throw new Error('Private reviewed example canonicalization source bundle is invalid.');
  }
  const normalized = {
    admission,
    example: { instruction: value.example.instruction.trim(), response: value.example.response.trim() },
    item,
    lineageSha256: value.lineageSha256,
    referenceSha256: value.referenceSha256,
    schemaVersion: value.schemaVersion,
    scopeReferenceSha256: value.scopeReferenceSha256,
    workspace,
    artifacts: value.artifacts,
    candidate: value.candidate,
    mission: value.mission,
    reviewerArtifactId: value.reviewerArtifactId,
    session: value.session,
    sourceArtifactId: value.sourceArtifactId,
    trainingWorkspace: value.trainingWorkspace,
  };
  const expectedHashes = deriveFineTuningPrivateReviewedExampleSourceHashes(normalized);
  if (
    normalized.lineageSha256 !== expectedHashes.lineageSha256 ||
    normalized.referenceSha256 !== expectedHashes.referenceSha256 ||
    normalized.scopeReferenceSha256 !== expectedHashes.scopeReferenceSha256
  ) {
    throw new Error('Private reviewed example canonicalization source projection hashes are invalid.');
  }
  return normalized;
}

export function buildFineTuningPrivateReviewedExampleCanonicalRecord({
  admission,
  artifactPreparationResolution,
  item,
  materializedAt,
  sourceBundle,
  workspace,
} = {}) {
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(artifactPreparationResolution);
  const source = assertFineTuningPrivateReviewedExampleSourceBundle(sourceBundle);
  const materializedTime = Date.parse(materializedAt);
  const live =
    admission.workspace.workspaceHash === workspace.workspaceHash &&
    item.workspace.workspaceHash === workspace.workspaceHash &&
    item.admission.admissionHash === admission.admissionHash &&
    artifactPreparationResolution.workspace.workspaceHash === workspace.workspaceHash &&
    artifactPreparationResolution.item.itemHash === item.itemHash &&
    artifactPreparationResolution.admission.admissionHash === admission.admissionHash &&
    source.workspace.workspaceHash === workspace.workspaceHash &&
    source.item.itemHash === item.itemHash &&
    source.admission.admissionHash === admission.admissionHash &&
    source.lineageSha256 === admission.envelope.source.lineageSha256 &&
    source.referenceSha256 === admission.envelope.source.referenceSha256 &&
    source.scopeReferenceSha256 === admission.envelope.source.scopeReferenceSha256;
  if (
    !live ||
    admission.envelope.lane !== 'reviewed-examples' ||
    item.lane !== 'reviewed-examples' ||
    item.dataOrigin !== 'curated-synthetic' ||
    artifactPreparationResolution.target !== 'reviewed-example-canonicalization' ||
    artifactPreparationResolution.decision !== 'approve' ||
    artifactPreparationResolution.artifactPreparationAuthorized !== true ||
    artifactPreparationResolution.reviewedExampleCanonicalizationPreparationAllowed !== true ||
    artifactPreparationResolution.approvedTrainingRecordCreated !== false ||
    artifactPreparationResolution.eligibilityEvaluated !== false ||
    artifactPreparationResolution.actualModelTrainingExecuted !== false ||
    artifactPreparationResolution.trainingAuthorized !== false ||
    artifactPreparationResolution.fineTuningExecutionAuthorized !== false ||
    artifactPreparationResolution.externalSubmissionAuthorized !== false ||
    artifactPreparationResolution.productionReadyClaim !== false ||
    !Number.isFinite(materializedTime) ||
    materializedTime < Date.parse(item.storedAt) ||
    materializedTime < Date.parse(artifactPreparationResolution.resolvedAt) ||
    materializedTime >= Date.parse(item.expiresAt) ||
    materializedTime >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Private reviewed example canonicalization source lineage is invalid.');
  }
  if (JSON.stringify(source.example) !== JSON.stringify(item.example)) {
    throw new Error('Private reviewed example canonicalization source bundle content does not match the admitted item.');
  }
  const record = buildApprovedTrainingRecord({
    artifacts: source.artifacts,
    candidate: source.candidate,
    generatedAt: materializedAt,
    mission: source.mission,
    reviewerArtifactId: source.reviewerArtifactId,
    sanitizedExample: item.example,
    session: source.session,
    sourceArtifactId: source.sourceArtifactId,
    workspace: source.trainingWorkspace,
  });
  assertApprovedTrainingRecordForDataset(record);
  return record;
}

export function buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
  admission,
  artifactPreparationResolution,
  item,
  record,
  sourceBundle,
  workspace,
} = {}) {
  assertApprovedTrainingRecordForDataset(record);
  const source = assertFineTuningPrivateReviewedExampleSourceBundle(sourceBundle);
  const receipt = {
    artifactPreparationResolution: reference(
      { id: artifactPreparationResolution.id, artifactPreparationResolutionHash: artifactPreparationResolution.artifactPreparationResolutionHash },
      'fine-tuning-private-collection-item-artifact-preparation-resolution-',
      'artifactPreparationResolutionHash',
      'receipt artifact preparation resolution',
    ),
    admission: reference({ id: admission.id, admissionHash: admission.admissionHash }, 'fine-tuning-private-collection-item-admission-', 'admissionHash', 'receipt admission'),
    contentHash: record.contentHash,
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    id: `private-reviewed-example-canonicalization-receipt-${hash({ itemHash: item.itemHash, recordId: record.id })}`,
    item: reference({ id: item.id, itemHash: item.itemHash }, 'fine-tuning-private-collection-item-', 'itemHash', 'receipt item'),
    productionReadyClaim: false,
    recordId: record.id,
    recordSha256: hash(record),
    schemaVersion: FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_RECEIPT_SCHEMA_VERSION,
    sourceBinding: {
      lineageSha256: source.lineageSha256,
      referenceSha256: source.referenceSha256,
      scopeReferenceSha256: source.scopeReferenceSha256,
    },
    workspace: reference({ id: workspace.id, workspaceHash: workspace.workspaceHash }, 'fine-tuning-private-collection-workspace-', 'workspaceHash', 'receipt workspace'),
  };
  return assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record });
}

export function assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record } = {}) {
  exactKeys(receipt, [
    'admission', 'artifactPreparationResolution', 'contentHash', 'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized', 'id', 'item', 'productionReadyClaim', 'recordId',
    'recordSha256', 'schemaVersion', 'sourceBinding', 'workspace',
  ], 'receipt');
  if (record !== undefined) {
    assertApprovedTrainingRecordForDataset(record);
  }
  const admission = reference(receipt.admission, 'fine-tuning-private-collection-item-admission-', 'admissionHash', 'receipt admission');
  const item = reference(receipt.item, 'fine-tuning-private-collection-item-', 'itemHash', 'receipt item');
  const workspace = reference(receipt.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash', 'receipt workspace');
  const resolution = reference(receipt.artifactPreparationResolution, 'fine-tuning-private-collection-item-artifact-preparation-resolution-', 'artifactPreparationResolutionHash', 'receipt artifact preparation resolution');
  exactKeys(receipt.sourceBinding, ['lineageSha256', 'referenceSha256', 'scopeReferenceSha256'], 'receipt source binding');
  if (
    receipt.schemaVersion !== FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_RECEIPT_SCHEMA_VERSION ||
    !isHash(receipt.contentHash) ||
    !isHash(receipt.recordSha256) ||
    typeof receipt.recordId !== 'string' ||
    !receipt.recordId ||
    (record !== undefined && (
      receipt.contentHash !== record.contentHash ||
      receipt.recordId !== record.id ||
      receipt.recordSha256 !== hash(record)
    )) ||
    receipt.id !== `private-reviewed-example-canonicalization-receipt-${hash({ itemHash: item.itemHash, recordId: receipt.recordId })}` ||
    receipt.externalSubmissionAuthorized !== false || receipt.fineTuningExecutionAuthorized !== false || receipt.productionReadyClaim !== false ||
    ![receipt.sourceBinding.lineageSha256, receipt.sourceBinding.referenceSha256, receipt.sourceBinding.scopeReferenceSha256].every(isHash)
  ) throw new Error('Private reviewed example canonicalization receipt is invalid.');
  return { ...receipt, admission, artifactPreparationResolution: resolution, item, workspace };
}
