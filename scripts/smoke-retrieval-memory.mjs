import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
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
    'The verification evidence bundle captured provider drift remediation details for the next execution proposal.',
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
assert.match(retrievedPromptSection, /\[attachment\] incident-notes\.md chunk [12]:/);
assert.match(retrievedPromptSection, /execution validation rehearsal/i);
assert.match(retrievedPromptSection, /verification evidence bundle captured provider drift remediation/i);
assert.doesNotMatch(retrievedPromptSection, /banjo paprika nebula quartz xylophone/i);
assert.doesNotMatch(retrievedPromptSection, /weekend hiking route/i);

assert.match(retrievedContextSection, /\[memory\] workspace\/fact:/);
assert.match(retrievedContextSection, /\[attachment\] incident-notes\.md chunk [12]:/);
assert.doesNotMatch(retrievedContextSection, /banjo paprika nebula quartz xylophone/i);
assert.doesNotMatch(retrievedContextSection, /weekend hiking route/i);

assert.match(managerRetrievalContent, /# Retrieved Context/);
assert.match(managerRetrievalContent, /- role: manager/);
assert.match(managerRetrievalContent, /\[memory\] workspace\/fact/);
assert.match(managerRetrievalContent, /\[attachment\] incident-notes\.md chunk [12]/);
assert.match(managerRetrievalContent, /lexicalScore:/);
assert.match(managerRetrievalContent, /bm25Score:/);
assert.match(managerRetrievalContent, /phraseBoostScore:/);
assert.match(managerRetrievalContent, /matchTermCount:/);
assert.match(managerRetrievalContent, /matchedTerms: .*provider.*drift/i);
assert.match(managerRetrievalContent, /retrievalReason: matched \d+ query terms?:/);
assert.match(managerRetrievalContent, /retrievalReason: .*phraseBoost/i);
assert.match(managerRetrievalContent, /corpusSchema: personal-ai-agent-retrieval-corpus\/v1/);
assert.match(managerRetrievalContent, /corpusId: corpus-[a-f0-9]{64}/);
assert.match(managerRetrievalContent, /chunkId: chunk-[a-f0-9]{64}/);
assert.match(managerRetrievalContent, /contentHash: [a-f0-9]{64}/);
assert.match(managerRetrievalContent, /snippetHash: [a-f0-9]{64}/);
assert.match(managerRetrievalContent, /scope: (workspace|mission)\//);
assert.match(managerRetrievalContent, /revision: revision-[a-f0-9]{64}/);
assert.match(managerRetrievalContent, /provenance: \{/);
assert.match(managerRetrievalContent, /verification evidence bundle captured provider drift remediation/i);
assert.doesNotMatch(managerRetrievalContent, /weekend hiking route/i);
assert.doesNotMatch(managerRetrievalContent, /\/private\//);

assert.equal(missionDetail.harness?.retrieval?.summary?.ready, true);
assert.ok((missionDetail.harness?.retrieval?.roles || []).length >= 4);
assert.equal(missionDetail.harness?.retrieval?.latestArtifact?.id, latestRetrievalArtifact.id);
assert.equal(missionDetail.harness?.retrieval?.latestArtifact?.sessionId, latestSession.session.id);
assert.match(String(missionDetail.harness?.retrieval?.latestArtifact?.path || ''), /-retrieval\.md$/);
assert.equal(missionDetail.harness?.retrieval?.compare?.status, 'partial');
assert.equal(Number(missionDetail.harness?.retrieval?.compare?.sharedSourceCount || 0) >= 1, true);
assert.equal(Number(missionDetail.harness?.retrieval?.compare?.latestSnippetCount || 0) >= 1, true);
assert.equal(Array.isArray(missionDetail.harness?.retrieval?.compare?.previewOnlySources), true);
assert.equal(Array.isArray(missionDetail.harness?.retrieval?.compare?.latestOnlySources), true);
assert.equal(JSON.stringify(missionDetail.harness?.retrieval?.previewItems || []).includes('corpusId'), false);
assert.equal(JSON.stringify(missionDetail.harness?.retrieval?.previewItems || []).includes('contentHash'), false);
assert.equal(
  (missionDetail.harness?.retrieval?.previewItems || []).some((item) => String(item.sourceLabel || '').includes('workspace/fact')),
  true,
);
assert.equal(
  (missionDetail.harness?.retrieval?.previewItems || []).some((item) => String(item.sourceLabel || '').includes('incident-notes.md')),
  true,
);
assert.equal(
  (missionDetail.harness?.retrieval?.previewItems || []).some(
    (item) =>
      Array.isArray(item.matchedTerms) &&
      item.matchedTerms.includes('provider') &&
      item.matchedTerms.includes('drift') &&
      Number(item.phraseBoostScore || 0) > 0 &&
      String(item.retrievalReason || '').includes('matched'),
  ),
  true,
);

const phraseRankingContext = buildRetrievalContext({
  attachments: [],
  memoryEntries: [
    {
      content: 'Provider drift prompt normalization evidence is the exact phrase-level recovery path.',
      kind: 'fact',
      scope: 'workspace',
    },
    {
      content: 'Provider status changed. Drift analysis was delayed. Prompt review happened later. Normalization notes were stored separately.',
      kind: 'fact',
      scope: 'workspace',
    },
  ],
  mission: {
    constraints: [],
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Prioritize provider drift prompt normalization evidence.',
    title: 'Phrase proximity retrieval check',
  },
  pack: {
    requiredSections: [],
    reviewRules: [],
  },
  previousOutputs: {},
  providerRole: 'manager',
  role: 'manager',
});

assert.match(phraseRankingContext[0]?.snippet || '', /Provider drift prompt normalization/i);
assert.equal(Number(phraseRankingContext[0]?.phraseBoostScore || 0) > Number(phraseRankingContext[1]?.phraseBoostScore || 0), true);

const diversityContext = buildRetrievalContext({
  attachments: [],
  memoryEntries: [
    ...Array.from({ length: 6 }, (_, index) => ({
      content: `Provider drift prompt normalization evidence dominant source ${index + 1} includes execution validation context.`,
      kind: 'fact',
      scope: 'workspace',
    })),
    {
      content: 'Provider drift prompt normalization alternate decision remains visible for source diversity.',
      kind: 'decision',
      scope: 'mission',
    },
  ],
  mission: {
    constraints: [],
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Prioritize provider drift prompt normalization evidence.',
    title: 'Source diversity retrieval check',
  },
  pack: {
    requiredSections: [],
    reviewRules: [],
  },
  previousOutputs: {},
  providerRole: 'manager',
  role: 'manager',
});

assert.equal(diversityContext.length, 6);
assert.equal(
  diversityContext.some((item) => item.sourceLabel === 'mission/decision'),
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
