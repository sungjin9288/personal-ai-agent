import fs from 'node:fs';
import path from 'node:path';

import { buildDeterministicFineTuningBaselineContext } from './local-training-permission-fixture.mjs';
import {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  buildFineTuningPrivateReviewedExampleDatasetImpactShadow,
} from '../src/core/fine-tuning-private-reviewed-example-dataset-impact.mjs';
import { assertApprovedTrainingRecordForDataset } from '../src/core/training-dataset-quality.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleSource,
} from './helpers/fine-tuning-private-reviewed-example-authority.mjs';
import { assertSamePrivateJsonState, readPrivateDirectory, readPrivateJsonState } from './helpers/private-json-state.mjs';

const PENDING_PREFIX = '.private-reviewed-example-canonical-record-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir, label: 'F1.22' });
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'F1.22 dataset impact shadow lock',
});

let projection;
try {
  const authority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initial, authority, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const current = loadFineTuningPrivateReviewedExampleSource({
    authority,
    filename: filenames.sourceBundle,
    label: 'F1.22',
    repoDir,
  });
  const stored = readFinalCanonicalBundle(current);
  const baselineContext = buildDeterministicFineTuningBaselineContext({ repoDir });
  projection = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
    baselineContext,
    record: stored.record.value,
    receipt: stored.receipt.value,
    trackedAssessment: current.tracked.assessment.value,
  });
  const finalAuthority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initial, finalAuthority, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const finalCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: finalAuthority,
    filename: filenames.sourceBundle,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(current, finalCurrent, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const finalStored = readFinalCanonicalBundle(finalCurrent);
  for (const key of Object.keys(stored.states)) {
    assertSamePrivateJsonState(stored.states[key], finalStored.states[key], `F1.22 ${key}`);
  }
  console.log(JSON.stringify(projection, null, 2));
} finally {
  lock.release();
}

function readFinalCanonicalBundle(current) {
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-reviewed-example-canonical-records', current.workspace.workspaceHash);
  let final = null;
  for (const name of readPrivateDirectory(root, 'F1.22 canonical record history', { repoDir })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(`^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!isFinal || isPending) {
      throw new Error('F1.22 requires one final F1.21 canonical record without pending history.');
    }
    if (name !== current.item.itemHash) {
      continue;
    }
    const names = readPrivateDirectory(directory, 'F1.22 canonical record history entry', { repoDir });
    if (
      JSON.stringify(names) !==
      JSON.stringify(['receipt.json', 'record.json'])
    ) {
      throw new Error('F1.22 requires one final F1.21 canonical record.');
    }
    const record = readPrivateJsonState(path.join(directory, 'record.json'), 'F1.22 record', { repoDir });
    const receipt = readPrivateJsonState(path.join(directory, 'receipt.json'), 'F1.22 receipt', { repoDir });
    assertApprovedTrainingRecordForDataset(record.value);
    assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(
      receipt.value,
      { record: record.value },
    );
    if (receipt.value.workspace.workspaceHash !== current.workspace.workspaceHash) {
      throw new Error('F1.22 F1.21 record lineage is invalid.');
    }
    if (receipt.value.item.itemHash !== current.item.itemHash) {
      throw new Error('F1.22 F1.21 record lineage is invalid.');
    }
    if (final) throw new Error('F1.22 F1.21 final canonical record history is ambiguous.');
    final = { receipt, record };
  }
  if (!final) throw new Error('F1.22 requires one final F1.21 canonical record.');
  const expectedRecord = buildFineTuningPrivateReviewedExampleCanonicalRecord({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    materializedAt: final.record.value.createdAt,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  const expectedReceipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    record: expectedRecord,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  if (
    JSON.stringify(expectedRecord) !== JSON.stringify(final.record.value) ||
    JSON.stringify(expectedReceipt) !== JSON.stringify(final.receipt.value)
  ) {
    throw new Error('F1.22 F1.21 source reconstruction drifted.');
  }
  return { ...final, states: final };
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'intake-resolution',
    'private-collection-plan',
    'execution-request',
    'execution-resolution',
    'artifact-preparation-resolution',
    'source-bundle',
  ];
  const invalid =
    args.length !== fields.length * 2 ||
    fields.some(
      (field, index) =>
        args[index * 2] !== `--${field}` || !args[index * 2 + 1],
    );
  if (invalid) {
    throw new Error('Expected exact private F1.22 input filenames.');
  }
  const keys = {
    'artifact-preparation-resolution': 'artifactPreparationResolution',
    'execution-request': 'executionRequest',
    'execution-resolution': 'executionResolution',
    'intake-resolution': 'intakeResolution',
    'private-collection-plan': 'privateCollectionPlan',
    'source-bundle': 'sourceBundle',
  };
  return Object.fromEntries(
    fields.map((field, index) => [
      keys[field] || field,
      args[index * 2 + 1],
    ]),
  );
}
