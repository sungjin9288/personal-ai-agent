import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getMissionPack } from '../src/packs/index.mjs';
import { createStubProvider } from '../src/providers/stub-provider.mjs';

const workspace = {
  id: 'workspace-a',
  name: 'Workspace A',
  path: '/tmp/workspace-a',
};
const mission = {
  constraints: [],
  deliverableType: 'decision-memo',
  id: 'mission-a',
  mode: 'knowledge',
  objective: 'Prepare a narrow verification path for workspace execution approval.',
  title: 'Workspace learning adaptation',
  workspaceId: workspace.id,
};
const pack = getMissionPack({ mission, workspace });
const provider = createStubProvider({ rootDir: process.cwd() });

function runPlanner(memoryEntries) {
  return provider.run({
    memoryEntries,
    mission,
    pack,
    role: 'planner',
    workspace,
  });
}

test('stub planner applies mission memory and same-workspace approved decisions', () => {
  const missionMemory = {
    content: 'The reviewer failed the prior evidence check.',
    kind: 'note',
    scope: 'mission',
    scopeId: mission.id,
  };
  const workspaceDecision = {
    content: 'Narrow the verification path before requesting workspace execution again.',
    kind: 'decision',
    scope: 'workspace',
    scopeId: workspace.id,
  };

  const output = runPlanner([missionMemory, workspaceDecision]);

  assert.deepEqual(output.adaptationNotes, [missionMemory.content, workspaceDecision.content]);
  assert.ok(
    output.planSteps.includes(
      'Address the prior reviewer finding before drafting the next proposal.',
    ),
  );
  assert.ok(
    output.planSteps.includes(
      'Narrow the verification path before requesting workspace execution again.',
    ),
  );
});

test('stub planner ignores workspace facts and decisions from another workspace', () => {
  const workspaceFact = {
    content: 'Narrow the verification path before requesting workspace execution again.',
    kind: 'fact',
    scope: 'workspace',
    scopeId: workspace.id,
  };
  const foreignDecision = {
    content: 'The reviewer failed the foreign workspace evidence check.',
    kind: 'decision',
    scope: 'workspace',
    scopeId: 'workspace-b',
  };

  const output = runPlanner([workspaceFact, foreignDecision]);

  assert.deepEqual(output.adaptationNotes, []);
  assert.equal(output.planSteps.length, pack.plannerGuidance.length);
});
