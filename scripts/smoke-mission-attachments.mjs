import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-mission-attachments-'));
const workspacePath = path.join(tempRoot, 'workspace');
const missionAttachmentPath = path.join(tempRoot, 'requirements.md');

fs.mkdirSync(workspacePath, { recursive: true });
fs.writeFileSync(
  missionAttachmentPath,
  '# Requirements\n- Need deterministic attachment coverage for specialist runs.\n- Include source excerpts in prompt context.\n',
  'utf8',
);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'mission-attachments-workspace'],
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
    '--deliverable',
    'decision-memo',
    '--title',
    'Mission attachments smoke',
    '--objective',
    'Verify mission-scoped attachments are stored and injected into the managed multi-agent prompt.',
    '--attachment',
    missionAttachmentPath,
  ],
});

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

const addedAttachment = service.addMissionAttachment({
  content: 'Investigation notes\nlatest error summary: provider drift was resolved after prompt normalization.',
  fileName: 'investigation.log',
  mimeType: 'text/plain',
  missionId: mission.id,
  source: 'ui',
});

assert.ok(fs.existsSync(addedAttachment.path));

const beforeRun = service.showMission(mission.id);
assert.equal(beforeRun.harness.attachments.summary.total, 2);
assert.equal(beforeRun.summary.attachmentCounts.total, 2);
assert.equal(
  beforeRun.harness.attachments.recentEntries.some((entry) => entry.fileName === 'requirements.md'),
  true,
);
assert.equal(
  beforeRun.harness.attachments.recentEntries.some((entry) => entry.fileName === 'investigation.log'),
  true,
);

const run = await service.runMission(mission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(run.mission.status, 'completed');

const latestSession = service.showSession(mission.id);
const managerPrompt = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-prompt.md');
const managerContext = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-context.md');

assert.ok(managerPrompt);
assert.ok(managerContext);

const managerPromptContent = fs.readFileSync(managerPrompt.path, 'utf8');
const managerContextContent = fs.readFileSync(managerContext.path, 'utf8');

assert.match(managerPromptContent, /## Mission Attachments/);
assert.match(managerPromptContent, /requirements\.md/);
assert.match(managerPromptContent, /Need deterministic attachment coverage for specialist runs\./);
assert.match(managerPromptContent, /investigation\.log/);
assert.match(managerPromptContent, /latest error summary: provider drift was resolved after prompt normalization\./);

assert.match(managerContextContent, /## Attached Inputs/);
assert.match(managerContextContent, /requirements\.md/);
assert.match(managerContextContent, /investigation\.log/);

console.log(
  JSON.stringify(
    {
      ok: true,
      missionId: mission.id,
      attachmentCount: beforeRun.harness.attachments.summary.total,
      sessionId: latestSession.session.id,
    },
    null,
    2,
  ),
);
