import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildRuntimeDataDeleteConfirmationToken,
  buildRuntimeDataInventory,
  deleteRuntimeData,
  exportRuntimeDataBundle,
} from '../src/core/runtime-data-lifecycle.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-data-lifecycle-'));
const exportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-data-export-'));

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'runtime-data-lifecycle-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--title',
    'Runtime Data Lifecycle Smoke',
    '--objective',
    'Verify runtime data inventory, export, and confirmed delete verification.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['memory', 'add', '--scope', 'mission', '--mission', mission.id, '--kind', 'fact', '--content', 'Lifecycle export fact.'],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

const inventory = buildRuntimeDataInventory({ rootDir: tempRoot });
assert.equal(inventory.exists, true);
assert.equal(inventory.stateExists, true);
assert.equal(inventory.collectionCounts.workspaces, 1);
assert.equal(inventory.collectionCounts.missions, 1);
assert.equal(inventory.collectionCounts.memoryEntries, 1);
assert.equal(inventory.collectionCounts.sessions, 1);
assert.equal(inventory.collectionCounts.artifacts > 0, true);
assert.equal(inventory.fileCount > 0, true);
assert.equal(Boolean(inventory.stateSha256), true);

const exportResult = exportRuntimeDataBundle({ outputDir: exportRoot, rootDir: tempRoot });
assert.equal(fs.existsSync(exportResult.manifestPath), true);
assert.equal(exportResult.manifest.exportedFileCount, inventory.fileCount);
assert.equal(exportResult.manifest.inventory.stateSha256, inventory.stateSha256);
assert.equal(
  exportResult.manifest.exportedFiles.some((file) => file.path === 'var/state.json' && file.sha256 === inventory.stateSha256),
  true,
);
assert.equal(
  exportResult.manifest.exportedFiles.every((file) => !path.isAbsolute(file.path)),
  true,
);

assert.throws(
  () => deleteRuntimeData({ confirmationToken: 'delete-runtime-data:wrong', rootDir: tempRoot }),
  /exact confirmation token/,
);

const confirmationToken = buildRuntimeDataDeleteConfirmationToken({ rootDir: tempRoot });
const deleteResult = deleteRuntimeData({ confirmationToken, rootDir: tempRoot });
assert.equal(deleteResult.deleted, true);
assert.equal(deleteResult.before.stateSha256, inventory.stateSha256);
assert.equal(deleteResult.after.exists, false);
assert.equal(fs.existsSync(path.join(tempRoot, 'var')), false);
assert.equal(fs.existsSync(exportResult.manifestPath), true);

console.log(
  JSON.stringify(
    {
      deleted: deleteResult.deleted,
      exportedFileCount: exportResult.manifest.exportedFileCount,
      mode: 'runtime-data-lifecycle',
      ok: true,
      stateSha256: inventory.stateSha256,
    },
    null,
    2,
  ),
);

fs.rmSync(tempRoot, { force: true, recursive: true });
fs.rmSync(exportRoot, { force: true, recursive: true });
