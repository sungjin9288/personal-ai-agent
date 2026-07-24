import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { assertApprovedTrainingRecordForDataset } from '../src/core/training-dataset-quality.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertFineTuningPrivateReviewedExampleAuthorityCurrent,
  assertFineTuningPrivateReviewedExampleSourceCurrent,
  assertFineTuningPrivateReviewedExampleWindow,
  assertSameFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleSource,
} from './helpers/fine-tuning-private-reviewed-example-authority.mjs';
import {
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';

const HISTORY_NAME = 'private-reviewed-example-canonical-records';
const PENDING_PREFIX = '.private-reviewed-example-canonical-record-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir });
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Private reviewed example canonicalization lock',
});

let result;
try {
  const authority = loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir });
  assertSameFineTuningPrivateReviewedExampleAuthority(initial, authority);
  const current = loadFineTuningPrivateReviewedExampleSource({ authority, filename: filenames.sourceBundle, repoDir });
  result = materialize(current);
} finally {
  lock.release();
}

assertFineTuningPrivateReviewedExampleWindow(loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir }));
console.log(JSON.stringify({
  status: result.status,
  recordStored: true,
  eligibilityEvaluated: true,
  trainingAuthorized: false,
  externalProviderCalls: 'none',
  productionReadyClaim: false,
}, null, 2));

function materialize(current) {
  assertFineTuningPrivateReviewedExampleAuthorityCurrent(current);
  assertFineTuningPrivateReviewedExampleSourceCurrent(current);
  const root = historyRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(
    root,
    `${PENDING_PREFIX}${current.item.itemHash}-${current.artifactPreparationResolution.artifactPreparationResolutionHash}`,
  );
  const history = inspectHistory({ current, pendingDirectory, root });
  if (history.final) {
    return assertStoredBundle(current, history.final);
  }
  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.21 canonical record history', { repoDir });
  }

  let bundle = history.pending;
  if (bundle && !bundle.receipt) {
    bundle = {
      record: bundle.record,
      receipt: buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
        admission: current.admission,
        artifactPreparationResolution: current.artifactPreparationResolution,
        item: current.item,
        record: bundle.record,
        sourceBundle: current.sourceBundle,
        workspace: current.workspace,
      }),
    };
    writeExclusivePrivateJson(path.join(pendingDirectory, 'receipt.json'), bundle.receipt, 'F1.21 recovered canonical receipt', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
  }
  if (!bundle) {
    const record = buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: current.admission,
      artifactPreparationResolution: current.artifactPreparationResolution,
      item: current.item,
      materializedAt: new Date().toISOString(),
      sourceBundle: current.sourceBundle,
      workspace: current.workspace,
    });
    const receipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
      admission: current.admission,
      artifactPreparationResolution: current.artifactPreparationResolution,
      item: current.item,
      record,
      sourceBundle: current.sourceBundle,
      workspace: current.workspace,
    });
    bundle = { receipt, record };
    makePrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
    writeExclusivePrivateJson(path.join(pendingDirectory, 'record.json'), record, 'F1.21 pending canonical record', { repoDir });
    writeExclusivePrivateJson(path.join(pendingDirectory, 'receipt.json'), receipt, 'F1.21 pending canonical receipt', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.21 pending canonical record', { repoDir });
  }
  assertReady({ current, bundle, pendingDirectory, root });
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error('F1.21 final canonical record already exists.');
  }
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.21 canonical record history', { repoDir });
  const published = readBundle(finalDirectory, 'F1.21 published canonical record');
  if (JSON.stringify(published) !== JSON.stringify(bundle)) {
    throw new Error('F1.21 published canonical record changed.');
  }
  return assertStoredBundle(current, published);
}

function inspectHistory({ current, pendingDirectory, root }) {
  let final = null;
  let pending = null;
  let emptyPending = null;
  for (const name of readPrivateDirectory(root, 'F1.21 canonical record history', { repoDir })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(`^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!isFinal && !isPending) throw new Error('F1.21 canonical record history is invalid.');
    const names = readPrivateDirectory(directory, 'F1.21 canonical record history entry', { repoDir });
    if (names.length === 0 && directory === pendingDirectory) {
      if (emptyPending) throw new Error('F1.21 pending canonical record history is ambiguous.');
      emptyPending = directory;
      continue;
    }
    const bundle = names.length === 1 && names[0] === 'record.json'
      ? { receipt: null, record: readRecord(directory, 'F1.21 pending canonical record') }
      : readBundle(directory, 'F1.21 stored canonical record');
    if (!bundle.receipt && directory !== pendingDirectory) {
      throw new Error(
        'F1.21 contains an unresolved sibling record-only pending history.',
      );
    }
    const itemHash = bundle.receipt?.item?.itemHash || current.item.itemHash;
    const resolutionHash = bundle.receipt?.artifactPreparationResolution?.artifactPreparationResolutionHash ||
      current.artifactPreparationResolution.artifactPreparationResolutionHash;
    const expectedName = isFinal ? itemHash : `${PENDING_PREFIX}${itemHash}-${resolutionHash}`;
    if (name !== expectedName || (bundle.receipt && bundle.receipt.workspace.workspaceHash !== current.workspace.workspaceHash)) {
      throw new Error('F1.21 canonical record history lineage is invalid.');
    }
    if (bundle.receipt && bundle.receipt.item.itemHash !== current.item.itemHash) {
      if (isPending) {
        throw new Error('F1.21 contains unresolved sibling pending history.');
      }
      continue;
    }
    if (
      !bundle.receipt &&
      JSON.stringify(bundle.record.example) !== JSON.stringify(current.item.example)
    ) {
      throw new Error('F1.21 canonical record history contains a foreign record.');
    }
    if (isFinal) {
      if (final) throw new Error('F1.21 final canonical record history is ambiguous.');
      final = bundle;
    } else {
      if (pending) throw new Error('F1.21 pending canonical record history is ambiguous.');
      pending = bundle;
    }
  }
  if (final && (pending || emptyPending)) throw new Error('F1.21 final canonical record conflicts with pending history.');
  return { emptyPending, final, pending };
}

function readBundle(directory, label) {
  const names = readPrivateDirectory(directory, label, { repoDir });
  if (JSON.stringify(names) !== JSON.stringify(['receipt.json', 'record.json'])) {
    throw new Error(`${label} bundle is invalid.`);
  }
  const record = readRecord(directory, `${label} record`);
  const receipt = readPrivateJsonState(path.join(directory, 'receipt.json'), `${label} receipt`, { repoDir }).value;
  assertApprovedTrainingRecordForDataset(record);
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record });
  return { receipt, record };
}

function readRecord(directory, label) {
  const record = readPrivateJsonState(path.join(directory, 'record.json'), label, { repoDir }).value;
  assertApprovedTrainingRecordForDataset(record);
  return record;
}

function assertStoredBundle(current, bundle) {
  const expected = buildFineTuningPrivateReviewedExampleCanonicalRecord({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    materializedAt: bundle.record.createdAt,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  if (JSON.stringify(expected) !== JSON.stringify(bundle.record)) {
    throw new Error('F1.21 canonical record drifted from its live source.');
  }
  const expectedReceipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
    admission: current.admission,
    artifactPreparationResolution: current.artifactPreparationResolution,
    item: current.item,
    record: bundle.record,
    sourceBundle: current.sourceBundle,
    workspace: current.workspace,
  });
  if (JSON.stringify(expectedReceipt) !== JSON.stringify(bundle.receipt)) {
    throw new Error('F1.21 canonical record receipt drifted from its live source.');
  }
  return { ...bundle.record, status: 'private-reviewed-example-canonical-record-materialized' };
}

function assertReady({ current, bundle, pendingDirectory, root }) {
  const authority = loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir });
  const reread = loadFineTuningPrivateReviewedExampleSource({ authority, filename: filenames.sourceBundle, repoDir });
  assertSameFineTuningPrivateReviewedExampleAuthority(current, reread);
  const history = inspectHistory({ current: reread, pendingDirectory, root });
  if (history.final || history.emptyPending || !history.pending || JSON.stringify(history.pending) !== JSON.stringify(bundle)) {
    throw new Error('F1.21 pending canonical record changed before publish.');
  }
  assertStoredBundle(reread, bundle);
}

function historyRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash), 'F1.21 canonical record history', { repoDir });
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
  if (args.length !== fields.length * 2 || fields.some((field, index) => args[index * 2] !== `--${field}` || !args[index * 2 + 1])) {
    throw new Error('Expected exact private F1.21 input filenames.');
  }
  return Object.fromEntries(fields.map((field, index) => [
    field === 'artifact-preparation-resolution' ? 'artifactPreparationResolution' :
      field === 'execution-request' ? 'executionRequest' :
        field === 'execution-resolution' ? 'executionResolution' :
          field === 'intake-resolution' ? 'intakeResolution' :
            field === 'private-collection-plan' ? 'privateCollectionPlan' :
              field === 'source-bundle' ? 'sourceBundle' : field,
    args[index * 2 + 1],
  ]));
}
