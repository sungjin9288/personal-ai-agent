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
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-isolation-'));
const exportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-isolation-export-'));

const runtimeA = path.join(tempRoot, 'customer-a-runtime');
const runtimeB = path.join(tempRoot, 'customer-b-runtime');
const workspaceAPath = path.join(tempRoot, 'customer-a-workspace');
const workspaceBPath = path.join(tempRoot, 'customer-b-workspace');
fs.mkdirSync(workspaceAPath, { recursive: true });
fs.mkdirSync(workspaceBPath, { recursive: true });

try {
  const a = seedRuntime({
    contentMarker: 'customer-a-only-memory-marker',
    missionTitle: 'Customer A Isolation Mission',
    rootDir: runtimeA,
    workspaceName: 'customer-a-workspace',
    workspacePath: workspaceAPath,
  });
  const b = seedRuntime({
    contentMarker: 'customer-b-only-memory-marker',
    missionTitle: 'Customer B Isolation Mission',
    rootDir: runtimeB,
    workspaceName: 'customer-b-workspace',
    workspacePath: workspaceBPath,
  });

  assert.notEqual(a.workspace.id, b.workspace.id);
  assert.notEqual(a.mission.id, b.mission.id);
  assert.notEqual(a.run.sessionId, b.run.sessionId);

  const inventoryA = buildRuntimeDataInventory({ rootDir: runtimeA });
  const inventoryB = buildRuntimeDataInventory({ rootDir: runtimeB });
  assert.equal(inventoryA.exists, true);
  assert.equal(inventoryB.exists, true);
  assert.equal(inventoryA.collectionCounts.workspaces, 1);
  assert.equal(inventoryB.collectionCounts.workspaces, 1);
  assert.equal(inventoryA.collectionCounts.missions, 1);
  assert.equal(inventoryB.collectionCounts.missions, 1);
  assert.equal(inventoryA.collectionCounts.memoryEntries, 1);
  assert.equal(inventoryB.collectionCounts.memoryEntries, 1);
  assert.notEqual(inventoryA.stateSha256, inventoryB.stateSha256);

  const stateA = fs.readFileSync(path.join(runtimeA, 'var', 'state.json'), 'utf8');
  const stateB = fs.readFileSync(path.join(runtimeB, 'var', 'state.json'), 'utf8');
  assert.match(stateA, /customer-a-only-memory-marker/);
  assert.doesNotMatch(stateA, /customer-b-only-memory-marker|customer-b-workspace|Customer B Isolation Mission/);
  assert.match(stateB, /customer-b-only-memory-marker/);
  assert.doesNotMatch(stateB, /customer-a-only-memory-marker|customer-a-workspace|Customer A Isolation Mission/);

  const exportA = exportRuntimeDataBundle({ outputDir: path.join(exportRoot, 'a'), rootDir: runtimeA });
  const exportB = exportRuntimeDataBundle({ outputDir: path.join(exportRoot, 'b'), rootDir: runtimeB });
  assert.equal(exportA.manifest.inventory.stateSha256, inventoryA.stateSha256);
  assert.equal(exportB.manifest.inventory.stateSha256, inventoryB.stateSha256);
  assert.equal(exportA.manifest.exportedFiles.every((file) => !path.isAbsolute(file.path)), true);
  assert.equal(exportB.manifest.exportedFiles.every((file) => !path.isAbsolute(file.path)), true);
  assert.notEqual(exportA.manifest.inventory.stateSha256, exportB.manifest.inventory.stateSha256);

  const beforeDeleteB = buildRuntimeDataInventory({ rootDir: runtimeB });
  const deleteA = deleteRuntimeData({
    confirmationToken: buildRuntimeDataDeleteConfirmationToken({ rootDir: runtimeA }),
    rootDir: runtimeA,
  });
  const afterDeleteB = buildRuntimeDataInventory({ rootDir: runtimeB });
  assert.equal(deleteA.deleted, true);
  assert.equal(deleteA.after.exists, false);
  assert.equal(afterDeleteB.exists, true);
  assert.equal(afterDeleteB.stateSha256, beforeDeleteB.stateSha256);
  assert.equal(fs.existsSync(exportB.manifestPath), true);
  assert.equal(fs.existsSync(path.join(runtimeA, 'var')), false);
  assert.equal(fs.existsSync(path.join(runtimeB, 'var')), true);

  console.log(
    JSON.stringify(
      {
        deletedRuntimeA: deleteA.deleted,
        exportAFileCount: exportA.manifest.exportedFileCount,
        exportBFileCount: exportB.manifest.exportedFileCount,
        mode: 'runtime-isolation',
        ok: true,
        runtimeAStateSha256: inventoryA.stateSha256,
        runtimeBStateSha256: inventoryB.stateSha256,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
  fs.rmSync(exportRoot, { force: true, recursive: true });
}

function seedRuntime({ contentMarker, missionTitle, rootDir, workspaceName, workspacePath }) {
  const workspace = runCli({
    rootDir,
    args: ['workspace', 'add', workspacePath, '--name', workspaceName],
  });

  runCli({
    rootDir,
    args: [
      'memory',
      'add',
      '--scope',
      'workspace',
      '--workspace',
      workspace.id,
      '--kind',
      'fact',
      '--content',
      contentMarker,
    ],
  });

  const mission = runCli({
    rootDir,
    args: [
      'mission',
      'create',
      '--workspace',
      workspace.id,
      '--mode',
      'knowledge',
      '--title',
      missionTitle,
      '--objective',
      `Verify isolated runtime state for ${workspaceName}.`,
    ],
  });

  const run = runCli({
    rootDir,
    args: ['mission', 'run', mission.id, '--provider', 'stub'],
  });

  assert.equal(run.status, 'completed');

  return {
    mission,
    run,
    workspace,
  };
}
