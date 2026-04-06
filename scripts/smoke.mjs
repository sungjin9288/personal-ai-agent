import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createStore } from '../src/core/store.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-'));
const store = createStore({ rootDir: tempRoot });
const service = createMissionService(store);

const workspace = service.addWorkspace({
  workspacePath: '/tmp/example-workspace',
  name: 'example-workspace',
});

const knowledgeMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  title: 'Draft roadmap PRD',
  objective: 'Create a first-pass PRD for the next release.',
  deliverableType: 'prd',
});

const engineeringMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'engineering',
  title: 'Stabilize release smoke',
  objective: 'Define a bounded engineering plan for release smoke stabilization.',
  constraints: ['Keep blast radius small.'],
});

const knowledgeRun = service.runMission(knowledgeMission.id);
const engineeringRun = service.runMission(engineeringMission.id);

assert.equal(knowledgeRun.mission.status, 'planned');
assert.equal(engineeringRun.mission.status, 'planned');
assert.ok(fs.existsSync(knowledgeRun.promptPath));
assert.ok(fs.existsSync(knowledgeRun.artifactPath));
assert.ok(fs.existsSync(engineeringRun.promptPath));
assert.ok(fs.existsSync(engineeringRun.artifactPath));
assert.match(fs.readFileSync(knowledgeRun.artifactPath, 'utf8'), /# Product Requirements Document/);
assert.match(fs.readFileSync(knowledgeRun.artifactPath, 'utf8'), /## Requirements/);
assert.match(fs.readFileSync(engineeringRun.artifactPath, 'utf8'), /# Engineering Plan/);
assert.match(fs.readFileSync(engineeringRun.promptPath, 'utf8'), /# Engineering Mission Prompt/);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'personal-ai-agent-smoke',
      workspaceId: workspace.id,
      missions: [
        {
          id: knowledgeMission.id,
          artifactPath: knowledgeRun.artifactPath,
        },
        {
          id: engineeringMission.id,
          artifactPath: engineeringRun.artifactPath,
        },
      ],
    },
    null,
    2,
  ),
);
