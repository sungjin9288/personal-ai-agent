import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { normalizeStructuredOutput } from '../src/providers/structured-provider-utils.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-mission-quality-gate-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

function readArtifact(session, fileName) {
  const artifact = session.artifacts.find((item) => item.fileName === fileName);
  assert.ok(artifact, `Missing artifact: ${fileName}`);
  return fs.readFileSync(artifact.path, 'utf8');
}

function assertMissionQualityGate(content) {
  assert.match(content, /## Mission Quality Gate/);
  assert.match(content, /### Success Criteria/);
  assert.match(content, /### Assumptions/);
  assert.match(content, /### Minimal Change/);
  assert.match(content, /### Verification/);
}

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'quality-gate-workspace'],
});

const knowledgeMission = runCli({
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
    'Quality gate decision memo',
    '--objective',
    'Verify managed mission artifacts expose assumptions, success criteria, minimal change, and verification.',
  ],
});

const knowledgeRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', knowledgeMission.id, '--provider', 'stub'],
});
assert.equal(knowledgeRun.status, 'completed');

const knowledgeSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', knowledgeMission.id, '--session', knowledgeRun.sessionId],
});

const knowledgePlanner = readArtifact(knowledgeSession, 'planner-plan.md');
const knowledgeExecutor = readArtifact(knowledgeSession, 'decision-memo.md');
assertMissionQualityGate(knowledgePlanner);
assertMissionQualityGate(knowledgeExecutor);
assert.match(knowledgeExecutor, /All required sections are present exactly once: Context, Options, Recommendation, Why This Path, Next Action/);
assert.match(knowledgeExecutor, /Review the document against the objective, assumptions, and owner handoff/);

const engineeringMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Quality gate implementation proposal',
    '--objective',
    'Verify engineering proposals expose the mission quality gate before approval.',
  ],
});

const engineeringRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', engineeringMission.id, '--provider', 'stub'],
});
assert.equal(engineeringRun.status, 'awaiting_approval');

const engineeringSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', engineeringMission.id, '--session', engineeringRun.sessionId],
});
const engineeringPlanner = readArtifact(engineeringSession, 'planner-plan.md');
const engineeringExecutor = readArtifact(engineeringSession, 'implementation-proposal.md');
assertMissionQualityGate(engineeringPlanner);
assertMissionQualityGate(engineeringExecutor);
assert.match(engineeringExecutor, /Workspace mutation and shell execution require explicit approval/);
assert.match(engineeringExecutor, /Run or propose the narrowest meaningful smoke\/test path/);

const normalizedExternalExecutor = normalizeStructuredOutput(
  {
    output: {
      artifactContent: `# Implementation Proposal

## Diagnosis
- bounded diagnosis

## Implementation Plan
- inspect the target file

## Verification Plan
- run smoke:mission-quality-gate

## Next Action
Request explicit approval before mutating files.

## Risk Notes
- keep the change bounded
`,
      executionManifest: {
        steps: [
          {
            verificationTarget: 'mission quality gate smoke passes',
          },
        ],
      },
      nextAction: 'Request explicit approval before mutating files.',
      summaryText: 'External provider proposal without quality gate.',
    },
    role: 'executor',
  },
  {
    mission: {
      deliverableType: 'implementation-proposal',
      mode: 'engineering',
      objective: 'Normalize external provider executor output.',
      title: 'External provider quality gate',
    },
    pack: {
      artifactFileName: 'implementation-proposal.md',
      artifactTitle: 'Implementation Proposal',
      deliverableType: 'implementation-proposal',
      requiredSections: ['Diagnosis', 'Implementation Plan', 'Verification Plan', 'Next Action', 'Risk Notes'],
      reviewRules: [
        {
          description: 'Verification Plan must mention a smoke path.',
        },
      ],
      riskProfile: {
        actionKind: 'workspace-shell',
        reason: 'Engineering execution requires approval.',
        requiresApproval: true,
        title: 'Approve external provider quality gate',
      },
    },
    role: 'executor',
    workspace: {
      name: 'quality-gate-workspace',
      path: workspacePath,
    },
  },
  'OpenAI',
);

assertMissionQualityGate(normalizedExternalExecutor.artifactContent);
assert.match(normalizedExternalExecutor.artifactContent, /Verification target: mission quality gate smoke passes/);

console.log(
  JSON.stringify(
    {
      engineeringMissionId: engineeringMission.id,
      knowledgeMissionId: knowledgeMission.id,
      mode: 'mission-quality-gate',
      ok: true,
    },
    null,
    2,
  ),
);
