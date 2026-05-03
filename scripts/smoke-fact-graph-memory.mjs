import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-fact-graph-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'fact-graph-workspace'],
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
    'Fact graph memory smoke',
    '--objective',
    'Verify memory facts are mirrored into a temporal fact graph with provenance.',
  ],
});

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

const workspaceFact = service.addMemory({
  content: 'Provider retry policy uses bounded backoff for transient model failures.',
  kind: 'fact',
  scope: 'workspace',
  scopeId: workspace.id,
});

const relatedWorkspaceFact = service.addMemory({
  content: 'Provider retry policy records transient failure evidence for operators.',
  kind: 'fact',
  scope: 'workspace',
  scopeId: workspace.id,
});

const missionFact = service.addMemory({
  content: 'Release evidence requires a smoke command before closeout.',
  kind: 'fact',
  scope: 'mission',
  scopeId: mission.id,
});

service.addMemory({
  content: 'Prefer concise handoff summaries.',
  kind: 'preference',
  scope: 'mission',
  scopeId: mission.id,
});

let graph = service.listFactGraph({ status: 'active' });
assert.equal(graph.summary.total, 3);
assert.equal(graph.summary.activeCount, 3);
assert.equal(graph.summary.activeEdgeCount, 1);
assert.equal(graph.nodes.some((node) => node.sourceId === workspaceFact.id), true);
assert.equal(graph.nodes.some((node) => node.sourceId === relatedWorkspaceFact.id), true);
assert.equal(graph.nodes.some((node) => node.sourceId === missionFact.id), true);
assert.equal(graph.nodes.every((node) => node.provenance?.[0]?.sourceType === 'memory'), true);
assert.equal(graph.edges[0].relation, 'shared-keyword');
assert.match(graph.edges[0].relationReason, /provider, retry, policy/);
assert.deepEqual(
  graph.edges[0].sharedTokens.filter((token) => ['provider', 'retry', 'policy', 'transient'].includes(token)),
  ['provider', 'retry', 'policy', 'transient'],
);

const missionGraph = service.listFactGraph({ scope: 'mission', scopeId: mission.id, status: 'active' });
assert.equal(missionGraph.summary.total, 1);
assert.equal(missionGraph.nodes[0].statement, missionFact.content);

const initialMissionDetail = service.showMission(mission.id);
assert.equal(initialMissionDetail.harness.memory.factGraphPreview.workspace.nodes.length, 2);
assert.equal(initialMissionDetail.harness.memory.factGraphPreview.workspace.edges.length, 1);
assert.equal(
  initialMissionDetail.harness.memory.factGraphPreview.workspace.edges[0].sharedTokens.includes('provider'),
  true,
);
assert.match(
  initialMissionDetail.harness.memory.factGraphPreview.workspace.edges[0].relationReason,
  /shared fact terms/,
);
assert.match(
  initialMissionDetail.harness.memory.factGraphPreview.workspace.edges[0].fromStatement,
  /Provider retry policy/,
);

const updatedMissionFact = service.updateMemory({
  content: 'Release evidence requires a smoke command and diff check before closeout.',
  kind: 'fact',
  memoryId: missionFact.id,
  scope: 'mission',
  scopeId: mission.id,
});

graph = service.listFactGraph({ sourceId: updatedMissionFact.id, status: 'active' });
assert.equal(graph.summary.total, 1);
assert.equal(graph.nodes[0].version, 2);
assert.equal(graph.nodes[0].revisions.length, 1);
assert.match(graph.nodes[0].revisions[0].statement, /smoke command before closeout/);
assert.match(graph.nodes[0].statement, /diff check before closeout/);

service.updateMemory({
  content: 'Release evidence requirement moved to decision memory after review.',
  kind: 'decision',
  memoryId: updatedMissionFact.id,
  scope: 'mission',
  scopeId: mission.id,
});

graph = service.listFactGraph({ sourceId: updatedMissionFact.id, status: 'all' });
assert.equal(graph.summary.total, 1);
assert.equal(graph.nodes[0].status, 'retired');
assert.equal(graph.nodes[0].retiredReason, 'memory-kind-changed');

service.deleteMemory({
  memoryId: workspaceFact.id,
  scope: 'workspace',
  scopeId: workspace.id,
});

const allGraph = service.listFactGraph({ status: 'all' });
assert.equal(allGraph.summary.total, 3);
assert.equal(allGraph.summary.activeCount, 1);
assert.equal(allGraph.summary.retiredCount, 2);
assert.equal(allGraph.summary.edgeCount, 1);
assert.equal(allGraph.summary.retiredEdgeCount, 1);

const cliGraph = runCli({
  rootDir: tempRoot,
  args: ['memory', 'facts', '--status', 'all'],
});
assert.equal(cliGraph.summary.total, 3);
assert.equal(cliGraph.summary.edgeCount, 1);
assert.equal(cliGraph.nodes.some((node) => node.retiredReason === 'memory-deleted'), true);

const compactCliGraph = runCli({
  rootDir: tempRoot,
  args: ['memory', 'facts', '--status', 'all', '--compact'],
});
assert.equal(compactCliGraph.summary.total, 3);
assert.equal(compactCliGraph.nodes.length, 3);
assert.equal(compactCliGraph.edges.length, 1);
assert.equal(compactCliGraph.edges[0].fromStatement || compactCliGraph.edges[0].toStatement ? true : false, true);
assert.match(compactCliGraph.edges[0].relationReason, /shared fact terms/);
assert.equal(compactCliGraph.nodes.every((node) => !Array.isArray(node.revisions)), true);

const missionDetail = service.showMission(mission.id);
assert.equal(missionDetail.harness.memory.missionFactGraph.retiredCount, 1);
assert.equal(missionDetail.harness.memory.workspaceFactGraph.retiredCount, 1);
assert.equal(missionDetail.harness.memory.workspaceFactGraph.activeCount, 1);
assert.equal(missionDetail.harness.memory.workspaceFactGraph.retiredEdgeCount, 1);
assert.equal(missionDetail.harness.memory.factGraphPreview.workspace.nodes.length, 1);
assert.equal(missionDetail.harness.memory.factGraphPreview.workspace.edges.length, 0);

console.log(
  JSON.stringify(
    {
      graphNodeCount: allGraph.summary.total,
      graphEdgeCount: allGraph.summary.edgeCount,
      missionId: mission.id,
      mode: 'fact-graph-memory',
      ok: true,
      retiredCount: allGraph.summary.retiredCount,
    },
    null,
    2,
  ),
);
