import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-retrieval-memory-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'retrieval-memory-workspace'],
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
    'Retrieval memory smoke',
    '--objective',
    'Verify retrieval memory prioritizes provider drift and prompt normalization context before drafting the next execution proposal.',
  ],
});

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

service.addMemory({
  content: 'Provider drift was resolved after prompt normalization narrowed the verification path for execution validation.',
  kind: 'fact',
  scope: 'workspace',
  scopeId: workspace.id,
});

service.addMemory({
  content: 'Banjo paprika nebula quartz xylophone.',
  kind: 'preference',
  scope: 'mission',
  scopeId: mission.id,
});

service.addMissionAttachment({
  content: [
    '# Incident Notes',
    'Prompt normalization resolved provider drift during the execution validation rehearsal.',
    '',
    '## Irrelevant Appendix',
    'Weekend hiking route and sandwich checklist.',
  ].join('\n'),
  fileName: 'incident-notes.md',
  mimeType: 'text/markdown',
  missionId: mission.id,
  source: 'ui',
});

const run = await service.runMission(mission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(run.mission.status, 'completed');

const latestSession = service.showSession(mission.id);
const missionDetail = service.showMission(mission.id);
const managerPrompt = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-prompt.md');
const managerContext = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-context.md');
const managerRetrieval = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-retrieval.md');
const latestRetrievalArtifact = latestSession.artifacts.filter((artifact) => artifact.kind === 'retrieval').at(-1);

assert.ok(managerPrompt);
assert.ok(managerContext);
assert.ok(managerRetrieval);
assert.ok(latestRetrievalArtifact);

const managerPromptContent = fs.readFileSync(managerPrompt.path, 'utf8');
const managerContextContent = fs.readFileSync(managerContext.path, 'utf8');
const managerRetrievalContent = fs.readFileSync(managerRetrieval.path, 'utf8');

const retrievedPromptSection =
  managerPromptContent.match(/## Retrieved Context\n([\s\S]*?)\n\n## Parallel Specialists/)?.[1] || '';
const retrievedContextSection =
  managerContextContent.match(/## Retrieved Context\n([\s\S]*?)\n\n## Governance/)?.[1] || '';

assert.ok(retrievedPromptSection);
assert.ok(retrievedContextSection);

assert.match(retrievedPromptSection, /\[memory\] workspace\/fact:/);
assert.match(retrievedPromptSection, /provider drift was resolved after prompt normalization/i);
assert.match(retrievedPromptSection, /\[attachment\] incident-notes\.md chunk 1:/);
assert.match(retrievedPromptSection, /execution validation rehearsal/i);
assert.doesNotMatch(retrievedPromptSection, /banjo paprika nebula quartz xylophone/i);
assert.doesNotMatch(retrievedPromptSection, /weekend hiking route/i);

assert.match(retrievedContextSection, /\[memory\] workspace\/fact:/);
assert.match(retrievedContextSection, /\[attachment\] incident-notes\.md chunk 1:/);
assert.doesNotMatch(retrievedContextSection, /banjo paprika nebula quartz xylophone/i);
assert.doesNotMatch(retrievedContextSection, /weekend hiking route/i);

assert.match(managerRetrievalContent, /# Retrieved Context/);
assert.match(managerRetrievalContent, /- role: manager/);
assert.match(managerRetrievalContent, /\[memory\] workspace\/fact/);
assert.match(managerRetrievalContent, /\[attachment\] incident-notes\.md chunk 1/);

assert.equal(missionDetail.harness?.retrieval?.summary?.ready, true);
assert.ok((missionDetail.harness?.retrieval?.roles || []).length >= 4);
assert.equal(missionDetail.harness?.retrieval?.latestArtifact?.id, latestRetrievalArtifact.id);
assert.equal(missionDetail.harness?.retrieval?.latestArtifact?.sessionId, latestSession.session.id);
assert.match(String(missionDetail.harness?.retrieval?.latestArtifact?.path || ''), /-retrieval\.md$/);
assert.equal(
  (missionDetail.harness?.retrieval?.previewItems || []).some((item) => String(item.sourceLabel || '').includes('workspace/fact')),
  true,
);
assert.equal(
  (missionDetail.harness?.retrieval?.previewItems || []).some((item) => String(item.sourceLabel || '').includes('incident-notes.md')),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      missionId: mission.id,
      mode: 'retrieval-memory',
      sessionId: latestSession.session.id,
    },
    null,
    2,
  ),
);
