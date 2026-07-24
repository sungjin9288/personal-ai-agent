import path from 'node:path';

import {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { assertApprovedTrainingRecordForDataset } from '../../src/core/training-dataset-quality.mjs';
import {
  assertSamePrivateJsonState,
  readPrivateDirectory,
  readPrivateJsonState,
} from './private-json-state.mjs';

export function readFineTuningPrivateReviewedExampleHistory({ repoDir, label }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-reviewed-example-canonical-records',
  );
  const entries = [];
  const workspaces = readPrivateDirectory(
    root,
    `${label} workspaces`,
    { repoDir },
  );
  for (const workspaceHash of workspaces) {
    if (!/^[a-f0-9]{64}$/u.test(workspaceHash)) {
      throw new Error(`${label} is invalid.`);
    }
    const workspaceRoot = path.join(root, workspaceHash);
    const itemHashes = readPrivateDirectory(
      workspaceRoot,
      `${label} workspace`,
      { repoDir },
    );
    for (const itemHash of itemHashes) {
      if (!/^[a-f0-9]{64}$/u.test(itemHash)) {
        throw new Error(`${label} requires final history without pending entries.`);
      }
      const directory = path.join(workspaceRoot, itemHash);
      const names = readPrivateDirectory(directory, `${label} entry`, { repoDir });
      if (JSON.stringify(names) !== JSON.stringify(['receipt.json', 'record.json'])) {
        throw new Error(`${label} entry is invalid.`);
      }
      const record = readPrivateJsonState(
        path.join(directory, 'record.json'),
        `${label} record`,
        { repoDir },
      );
      const receipt = readPrivateJsonState(
        path.join(directory, 'receipt.json'),
        `${label} receipt`,
        { repoDir },
      );
      try {
        assertApprovedTrainingRecordForDataset(record.value);
        assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(
          receipt.value,
          { record: record.value },
        );
      } catch {
        throw new Error(`${label} entry is invalid.`);
      }
      if (
        receipt.value.workspace.workspaceHash !== workspaceHash ||
        receipt.value.item.itemHash !== itemHash
      ) {
        throw new Error(`${label} lineage is invalid.`);
      }
      entries.push({ itemHash, receipt, record, workspaceHash });
    }
  }
  return { entries, workspaces };
}

export function selectFineTuningPrivateReviewedExampleHistory(
  snapshot,
  current,
  { label },
) {
  const matches = snapshot.entries.filter(
    (entry) => entry.itemHash === current.item.itemHash,
  );
  if (
    matches.some(
      (entry) => entry.workspaceHash !== current.workspace.workspaceHash,
    )
  ) {
    throw new Error(`${label} contains a foreign workspace copy.`);
  }
  const local = matches.filter(
    (entry) => entry.workspaceHash === current.workspace.workspaceHash,
  );
  if (local.length !== 1) {
    throw new Error(`${label} requires one final F1.21 record.`);
  }
  const final = local[0];
  let expectedRecord;
  let expectedReceipt;
  try {
    expectedRecord = buildFineTuningPrivateReviewedExampleCanonicalRecord({
      admission: current.admission,
      artifactPreparationResolution: current.artifactPreparationResolution,
      item: current.item,
      materializedAt: final.record.value.createdAt,
      sourceBundle: current.sourceBundle,
      workspace: current.workspace,
    });
    expectedReceipt =
      buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
        admission: current.admission,
        artifactPreparationResolution: current.artifactPreparationResolution,
        item: current.item,
        record: expectedRecord,
        sourceBundle: current.sourceBundle,
        workspace: current.workspace,
      });
  } catch {
    throw new Error(`${label} source reconstruction drifted.`);
  }
  if (
    JSON.stringify(final.record.value) !== JSON.stringify(expectedRecord) ||
    JSON.stringify(final.receipt.value) !== JSON.stringify(expectedReceipt)
  ) {
    throw new Error(`${label} source reconstruction drifted.`);
  }
  return final;
}

export function assertSameFineTuningPrivateReviewedExampleHistory(
  before,
  after,
  label,
) {
  const structure = (snapshot) => ({
    entries: snapshot.entries.map(
      (entry) => `${entry.workspaceHash}/${entry.itemHash}`,
    ),
    workspaces: snapshot.workspaces,
  });
  if (JSON.stringify(structure(before)) !== JSON.stringify(structure(after))) {
    throw new Error(`${label} structure changed while projecting.`);
  }
  for (let index = 0; index < before.entries.length; index += 1) {
    assertSamePrivateJsonState(
      before.entries[index].record,
      after.entries[index].record,
      `${label} record`,
    );
    assertSamePrivateJsonState(
      before.entries[index].receipt,
      after.entries[index].receipt,
      `${label} receipt`,
    );
  }
}
