import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { createMissionCatalogService } from '../src/core/mission-catalog-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture() {
  const effects = [];
  const artifactWrites = [];
  const workspaces = [];
  const missions = [];
  const attachments = [];
  const store = {
    getMission: (missionId) => missions.find((item) => item.id === missionId) || null,
    getWorkspace: (workspaceId) => workspaces.find((item) => item.id === workspaceId) || null,
    listMissionAttachments: ({ missionId }) => attachments.filter((item) => item.missionId === missionId),
    listMissions: () => missions,
    listWorkspaces: () => workspaces,
    saveMission(mission) {
      effects.push('mission-save');
      missions.push(mission);
      return mission;
    },
    saveMissionAttachment(attachment) {
      effects.push('attachment-save');
      attachments.push(attachment);
      return attachment;
    },
    saveWorkspace(workspace) {
      effects.push('workspace-save');
      workspaces.push(workspace);
      return workspace;
    },
    updateMission(id, updater) {
      effects.push('mission-update');
      const index = missions.findIndex((item) => item.id === id);
      missions[index] = updater(missions[index]);
      return missions[index];
    },
    writeArtifactContent(input) {
      effects.push('attachment-write');
      artifactWrites.push(input);
      return `/artifacts/${input.fileName}`;
    },
  };
  const service = createMissionCatalogService({
    fileSystem: {
      existsSync() {
        effects.push('path-exists');
        return true;
      },
      statSync() {
        effects.push('path-stat');
        return { isDirectory: () => true };
      },
    },
    now: () => NOW,
    recordGatewayEvent() {
      effects.push('gateway-save');
      return { gatewayEvent: { id: 'gateway-1', schemaVersion: 1 } };
    },
    store,
  });

  return { artifactWrites, attachments, effects, missions, service, workspaces };
}

test('addWorkspace validates the path before checking duplicates and saving', () => {
  const fixture = createFixture();
  const workspace = fixture.service.addWorkspace({ workspacePath: '/tmp/catalog-workspace' });

  assert.deepEqual(fixture.effects, ['path-exists', 'path-stat', 'workspace-save']);
  assert.equal(workspace.path, path.resolve('/tmp/catalog-workspace'));
});

test('createMission stores attachments before gateway binding and final mission update', () => {
  const fixture = createFixture();
  const workspace = fixture.service.addWorkspace({ workspacePath: '/tmp/catalog-workspace' });
  fixture.effects.length = 0;

  const mission = fixture.service.createMission({
    attachments: [{ content: 'evidence', fileName: 'evidence.md' }],
    mode: 'knowledge',
    title: 'Catalog mission',
    workspaceId: workspace.id,
  });

  assert.deepEqual(fixture.effects, [
    'mission-save',
    'attachment-write',
    'attachment-save',
    'gateway-save',
    'mission-update',
  ]);
  assert.equal(mission.gatewayEventId, 'gateway-1');
  assert.equal(fixture.attachments[0].missionId, mission.id);
});

test('addMissionAttachment rejects unsupported binary input before artifact storage', () => {
  const fixture = createFixture();
  const workspace = fixture.service.addWorkspace({ workspacePath: '/tmp/catalog-workspace' });
  const mission = fixture.service.createMission({ workspaceId: workspace.id });
  fixture.effects.length = 0;

  assert.throws(
    () => fixture.service.addMissionAttachment({
      content: '\u0000binary',
      fileName: 'archive.zip',
      mimeType: 'image/png',
      missionId: mission.id,
    }),
    /Unsupported attachment type for archive.zip/,
  );
  assert.deepEqual(fixture.effects, []);
});

test('addMissionAttachment preserves the 12,000 character storage boundary and record schema', () => {
  const fixture = createFixture();
  const workspace = fixture.service.addWorkspace({ workspacePath: '/tmp/catalog-workspace' });
  const mission = fixture.service.createMission({ workspaceId: workspace.id });
  fixture.effects.length = 0;

  const attachment = fixture.service.addMissionAttachment({
    content: 'a'.repeat(12_001),
    fileName: 'large.txt',
    missionId: mission.id,
  });

  assert.equal(fixture.artifactWrites.at(-1).content.length, 12_000);
  assert.equal(attachment.charCount, 12_001);
  assert.equal(attachment.storedCharCount, 12_000);
  assert.equal(attachment.truncated, true);
  assert.equal(attachment.lineCount, 1);
});
