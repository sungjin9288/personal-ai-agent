import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildTenantRuntimeDataDeleteConfirmationToken,
  buildTenantRuntimeDataInventory,
  deleteTenantRuntimeData,
  exportTenantRuntimeDataBundle,
} from '../src/core/runtime-data-lifecycle.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-tenant-data-lifecycle-'));
const exportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-tenant-data-export-'));

try {
  seedTenantRuntime(tempRoot);

  const tenantAInventory = buildTenantRuntimeDataInventory({ rootDir: tempRoot, tenantId: 'tenant-a' });
  const tenantBInventory = buildTenantRuntimeDataInventory({ rootDir: tempRoot, tenantId: 'tenant-b' });
  assert.equal(tenantAInventory.exists, true);
  assert.equal(tenantBInventory.exists, true);
  assert.equal(tenantAInventory.collectionCounts.workspaces, 1);
  assert.equal(tenantBInventory.collectionCounts.workspaces, 1);
  assert.equal(tenantAInventory.collectionCounts.missions, 1);
  assert.equal(tenantBInventory.collectionCounts.missions, 1);
  assert.notEqual(tenantAInventory.tenantStateSha256, tenantBInventory.tenantStateSha256);

  const tenantAExport = exportTenantRuntimeDataBundle({
    outputDir: exportRoot,
    rootDir: tempRoot,
    tenantId: 'tenant-a',
  });
  const exportedState = JSON.parse(fs.readFileSync(path.join(tenantAExport.exportDir, 'var', 'state.json'), 'utf8'));
  const exportedText = JSON.stringify(exportedState);
  assert.equal(tenantAExport.manifest.policy.tenantId, 'tenant-a');
  assert.equal(tenantAExport.manifest.inventory.tenantStateSha256, tenantAInventory.tenantStateSha256);
  assert.equal(tenantAExport.manifest.exportedFiles.every((file) => !path.isAbsolute(file.path)), true);
  assert.match(exportedText, /tenant-a/);
  assert.doesNotMatch(exportedText, /tenant-b|mission-b|customer-b-only-marker/);
  assert.equal(
    tenantAExport.manifest.exportedFiles.some((file) => file.path.includes('mission-a') && file.sha256),
    true,
  );
  assert.equal(
    tenantAExport.manifest.exportedFiles.some((file) => file.path.includes('mission-b')),
    false,
  );

  assert.throws(
    () =>
      deleteTenantRuntimeData({
        confirmationToken: 'delete-tenant-runtime-data:wrong',
        rootDir: tempRoot,
        tenantId: 'tenant-a',
      }),
    /exact confirmation token/,
  );

  const beforeDeleteB = buildTenantRuntimeDataInventory({ rootDir: tempRoot, tenantId: 'tenant-b' });
  const deleteA = deleteTenantRuntimeData({
    confirmationToken: buildTenantRuntimeDataDeleteConfirmationToken({ rootDir: tempRoot, tenantId: 'tenant-a' }),
    rootDir: tempRoot,
    tenantId: 'tenant-a',
  });
  const afterDeleteA = buildTenantRuntimeDataInventory({ rootDir: tempRoot, tenantId: 'tenant-a' });
  const afterDeleteB = buildTenantRuntimeDataInventory({ rootDir: tempRoot, tenantId: 'tenant-b' });
  assert.equal(deleteA.deleted, true);
  assert.equal(afterDeleteA.exists, false);
  assert.equal(afterDeleteB.exists, true);
  assert.equal(afterDeleteB.tenantStateSha256, beforeDeleteB.tenantStateSha256);
  assert.equal(fs.existsSync(path.join(tempRoot, 'var', 'missions', 'mission-a')), false);
  assert.equal(fs.existsSync(path.join(tempRoot, 'var', 'missions', 'mission-b')), true);
  assert.equal(fs.existsSync(tenantAExport.manifestPath), true);

  console.log(
    JSON.stringify(
      {
        deletedTenantA: deleteA.deleted,
        exportedFileCount: tenantAExport.manifest.exportedFileCount,
        mode: 'tenant-data-lifecycle',
        ok: true,
        tenantAStateSha256: tenantAInventory.tenantStateSha256,
        tenantBStateSha256: beforeDeleteB.tenantStateSha256,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
  fs.rmSync(exportRoot, { force: true, recursive: true });
}

function seedTenantRuntime(rootDir) {
  const varDir = path.join(rootDir, 'var');
  fs.mkdirSync(path.join(varDir, 'missions', 'mission-a', 'sessions', 'session-a'), { recursive: true });
  fs.mkdirSync(path.join(varDir, 'missions', 'mission-b', 'sessions', 'session-b'), { recursive: true });
  fs.writeFileSync(
    path.join(varDir, 'missions', 'mission-a', 'sessions', 'session-a', 'artifact.md'),
    'customer-a-only-marker\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(varDir, 'missions', 'mission-b', 'sessions', 'session-b', 'artifact.md'),
    'customer-b-only-marker\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(varDir, 'state.json'),
    `${JSON.stringify(buildSeedState(), null, 2)}\n`,
    'utf8',
  );
}

function buildSeedState() {
  return {
    workspaces: [
      { createdAt: '2026-05-04T00:00:00.000Z', id: 'workspace-a', name: 'Tenant A', path: '/tmp/a', tenantId: 'tenant-a' },
      { createdAt: '2026-05-04T00:00:00.000Z', id: 'workspace-b', name: 'Tenant B', path: '/tmp/b', tenantId: 'tenant-b' },
    ],
    missions: [
      { createdAt: '2026-05-04T00:00:00.000Z', id: 'mission-a', status: 'created', title: 'A', workspaceId: 'workspace-a' },
      { createdAt: '2026-05-04T00:00:00.000Z', id: 'mission-b', status: 'created', title: 'B', workspaceId: 'workspace-b' },
    ],
    missionAttachments: [],
    sessions: [
      { id: 'session-a', missionId: 'mission-a', workspaceId: 'workspace-a' },
      { id: 'session-b', missionId: 'mission-b', workspaceId: 'workspace-b' },
    ],
    executionSessions: [],
    executionLeases: [],
    releaseActions: [],
    agentRuns: [],
    artifacts: [
      { id: 'artifact-a', missionId: 'mission-a', path: 'var/missions/mission-a/sessions/session-a/artifact.md', sessionId: 'session-a' },
      { id: 'artifact-b', missionId: 'mission-b', path: 'var/missions/mission-b/sessions/session-b/artifact.md', sessionId: 'session-b' },
    ],
    approvals: [],
    escalations: [],
    reviewerFollowUps: [],
    providerProbes: [],
    providerAttentionAcknowledgements: [],
    providerAttentionReminders: [],
    specialistFollowUpReminders: [],
    maintenanceRuns: [],
    memoryEntries: [
      { content: 'customer-a-only-marker', id: 'memory-a', scope: 'mission', scopeId: 'mission-a' },
      { content: 'customer-b-only-marker', id: 'memory-b', scope: 'mission', scopeId: 'mission-b' },
    ],
    factGraphNodes: [],
    factGraphEdges: [],
  };
}
