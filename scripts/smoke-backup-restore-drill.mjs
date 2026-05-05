import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildRuntimeDataInventory,
  buildTenantRuntimeDataDeleteConfirmationToken,
  buildTenantRuntimeDataInventory,
  createRuntimeDataBackup,
  deleteTenantRuntimeData,
  restoreRuntimeDataBackup,
} from '../src/core/runtime-data-lifecycle.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const backupDrillDoc = readRequiredFile(path.join(docsDir, 'backup-restore-drill-v1.md'));
const retentionDoc = readRequiredFile(path.join(docsDir, 'retention-delete-v1.md'));
const targetContractDoc = readRequiredFile(path.join(docsDir, 'target-deployment-contract-v1.md'));
const releaseReadinessDoc = readRequiredFile(path.join(docsDir, 'release-readiness-v1.md'));
const packageJson = JSON.parse(readRequiredFile(path.join(repoDir, 'package.json')));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-backup-restore-'));
const sourceRoot = path.join(tempRoot, 'source-runtime');
const restoreRoot = path.join(tempRoot, 'restore-runtime');
const secondRestoreRoot = path.join(tempRoot, 'second-restore-runtime');
const backupRoot = path.join(tempRoot, 'backup-root');

try {
  assert.equal(packageJson.scripts['smoke:backup-restore-drill'], 'node scripts/smoke-backup-restore-drill.mjs');
  assert.match(backupDrillDoc, /^# Backup Restore Drill v1$/m);
  assert.match(backupDrillDoc, /^- status: local-backup-restore-current$/m);
  assert.match(backupDrillDoc, /^- productionReadyClaim: false$/m);
  assert.match(backupDrillDoc, /not hosted backup evidence/);
  assert.match(backupDrillDoc, /restore refuses a non-clean runtime `var\/` directory/);
  assert.match(backupDrillDoc, /tenant delete isolation remains true after restore/);
  assert.match(backupDrillDoc, /encrypted backup storage and key ownership evidence/);
  assert.match(retentionDoc, /npm run smoke:backup-restore-drill/);
  assert.match(targetContractDoc, /backup\/restore drill/);
  assert.match(targetContractDoc, /target backup operations gates pass/);
  assert.match(releaseReadinessDoc, /local backup\/restore drill: passed/);

  seedTenantRuntime(sourceRoot);

  const sourceInventory = buildRuntimeDataInventory({ rootDir: sourceRoot });
  const sourceTenantA = buildTenantRuntimeDataInventory({ rootDir: sourceRoot, tenantId: 'tenant-a' });
  const sourceTenantB = buildTenantRuntimeDataInventory({ rootDir: sourceRoot, tenantId: 'tenant-b' });
  assert.equal(sourceInventory.exists, true);
  assert.equal(sourceInventory.collectionCounts.workspaces, 2);
  assert.equal(sourceTenantA.exists, true);
  assert.equal(sourceTenantB.exists, true);
  assert.notEqual(sourceTenantA.tenantStateSha256, sourceTenantB.tenantStateSha256);

  const backup = createRuntimeDataBackup({ backupDir: backupRoot, rootDir: sourceRoot });
  assert.equal(fs.existsSync(backup.manifestPath), true);
  assert.equal(backup.manifest.backupFileCount, sourceInventory.fileCount);
  assert.equal(backup.manifest.inventory.stateSha256, sourceInventory.stateSha256);
  assert.equal(backup.manifest.backedUpFiles.every((file) => !path.isAbsolute(file.path)), true);
  assert.equal(backup.manifest.backedUpFiles.every((file) => file.path.startsWith('var/')), true);
  assert.doesNotMatch(JSON.stringify(backup.manifest), /sk-|Bearer\s+|\/Users\/|\/var\/folders\//);

  fs.mkdirSync(path.join(restoreRoot, 'var'), { recursive: true });
  assert.throws(
    () => restoreRuntimeDataBackup({ backupPath: backup.backupPath, rootDir: restoreRoot }),
    /clean runtime var directory/,
  );
  fs.rmSync(path.join(restoreRoot, 'var'), { force: true, recursive: true });

  const restored = restoreRuntimeDataBackup({ backupPath: backup.backupPath, rootDir: restoreRoot });
  const restoredTenantA = buildTenantRuntimeDataInventory({ rootDir: restoreRoot, tenantId: 'tenant-a' });
  const restoredTenantB = buildTenantRuntimeDataInventory({ rootDir: restoreRoot, tenantId: 'tenant-b' });
  assert.equal(restored.restored, true);
  assert.equal(restored.restoredFileCount, sourceInventory.fileCount);
  assert.equal(restored.restoredInventory.stateSha256, sourceInventory.stateSha256);
  assert.equal(restoredTenantA.tenantStateSha256, sourceTenantA.tenantStateSha256);
  assert.equal(restoredTenantB.tenantStateSha256, sourceTenantB.tenantStateSha256);
  assert.match(fs.readFileSync(path.join(restoreRoot, 'var', 'state.json'), 'utf8'), /tenant-a-marker/);
  assert.match(fs.readFileSync(path.join(restoreRoot, 'var', 'state.json'), 'utf8'), /tenant-b-marker/);

  const beforeDeleteTenantB = buildTenantRuntimeDataInventory({ rootDir: restoreRoot, tenantId: 'tenant-b' });
  const deleteTenantA = deleteTenantRuntimeData({
    confirmationToken: buildTenantRuntimeDataDeleteConfirmationToken({ rootDir: restoreRoot, tenantId: 'tenant-a' }),
    rootDir: restoreRoot,
    tenantId: 'tenant-a',
  });
  const afterDeleteTenantB = buildTenantRuntimeDataInventory({ rootDir: restoreRoot, tenantId: 'tenant-b' });
  assert.equal(deleteTenantA.deleted, true);
  assert.equal(afterDeleteTenantB.exists, true);
  assert.equal(afterDeleteTenantB.tenantStateSha256, beforeDeleteTenantB.tenantStateSha256);
  assert.equal(fs.existsSync(path.join(restoreRoot, 'var', 'missions', 'mission-a')), false);
  assert.equal(fs.existsSync(path.join(restoreRoot, 'var', 'missions', 'mission-b')), true);

  const secondRestore = restoreRuntimeDataBackup({ backupPath: backup.backupPath, rootDir: secondRestoreRoot });
  const secondRestoreTenantA = buildTenantRuntimeDataInventory({ rootDir: secondRestoreRoot, tenantId: 'tenant-a' });
  assert.equal(secondRestore.restoredInventory.stateSha256, sourceInventory.stateSha256);
  assert.equal(secondRestoreTenantA.tenantStateSha256, sourceTenantA.tenantStateSha256);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'var', 'missions', 'mission-a', 'artifact.md')), true);

  console.log(
    JSON.stringify(
      {
        backupFileCount: backup.manifest.backupFileCount,
        backupSha256: backup.manifest.backupSha256,
        mode: 'backup-restore-drill',
        ok: true,
        restoredFileCount: restored.restoredFileCount,
        restoredStateSha256: restored.restoredInventory.stateSha256,
        tenantDeleteIsolated: true,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function seedTenantRuntime(rootDir) {
  const varDir = path.join(rootDir, 'var');
  fs.mkdirSync(path.join(varDir, 'missions', 'mission-a'), { recursive: true });
  fs.mkdirSync(path.join(varDir, 'missions', 'mission-b'), { recursive: true });
  fs.writeFileSync(path.join(varDir, 'missions', 'mission-a', 'artifact.md'), 'tenant-a-artifact-marker\n', 'utf8');
  fs.writeFileSync(path.join(varDir, 'missions', 'mission-b', 'artifact.md'), 'tenant-b-artifact-marker\n', 'utf8');
  fs.writeFileSync(path.join(varDir, 'state.json'), `${JSON.stringify(buildSeedState(), null, 2)}\n`, 'utf8');
}

function buildSeedState() {
  return {
    workspaces: [
      { id: 'workspace-a', name: 'Tenant A Workspace', path: '/tmp/tenant-a', tenantId: 'tenant-a' },
      { id: 'workspace-b', name: 'Tenant B Workspace', path: '/tmp/tenant-b', tenantId: 'tenant-b' },
    ],
    missions: [
      { id: 'mission-a', status: 'completed', title: 'Tenant A Mission', workspaceId: 'workspace-a' },
      { id: 'mission-b', status: 'completed', title: 'Tenant B Mission', workspaceId: 'workspace-b' },
    ],
    sessions: [
      { id: 'session-a', missionId: 'mission-a', workspaceId: 'workspace-a' },
      { id: 'session-b', missionId: 'mission-b', workspaceId: 'workspace-b' },
    ],
    artifacts: [
      { id: 'artifact-a', missionId: 'mission-a', path: 'var/missions/mission-a/artifact.md', sessionId: 'session-a' },
      { id: 'artifact-b', missionId: 'mission-b', path: 'var/missions/mission-b/artifact.md', sessionId: 'session-b' },
    ],
    memoryEntries: [
      { content: 'tenant-a-marker', id: 'memory-a', scope: 'mission', scopeId: 'mission-a' },
      { content: 'tenant-b-marker', id: 'memory-b', scope: 'mission', scopeId: 'mission-b' },
    ],
    missionAttachments: [],
    executionSessions: [],
    executionLeases: [],
    releaseActions: [],
    agentRuns: [],
    approvals: [],
    escalations: [],
    reviewerFollowUps: [],
    providerProbes: [],
    providerAttentionAcknowledgements: [],
    providerAttentionReminders: [],
    specialistFollowUpReminders: [],
    maintenanceRuns: [],
    factGraphNodes: [],
    factGraphEdges: [],
  };
}
