import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { compactOutput } from '../src/core/output-compaction-service.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-output-compaction-'));
const workspacePath = path.join(tempRoot, 'workspace');
const rawOutputPath = path.join(tempRoot, 'long-smoke-output.log');

fs.mkdirSync(workspacePath, { recursive: true });

const repeatedLines = Array.from({ length: 80 }, (_, index) => `INFO cache warmed for shard ${index % 4}`);
const rawOutput = [
  'npm run smoke:provider-hardening',
  'setup started',
  ...repeatedLines,
  'WARNING deprecated provider fixture branch was exercised',
  'ERROR provider retry exhausted after 3 attempts',
  'AssertionError: expected retry telemetry to include blocked state',
  ...Array.from({ length: 90 }, (_, index) => `debug noise line ${index}`),
  'tail marker: raw output must remain auditable from the original file',
].join('\n');
fs.writeFileSync(rawOutputPath, rawOutput, 'utf8');

const directCompaction = compactOutput({
  content: rawOutput,
  sourceName: 'direct-smoke-output',
});
assert.equal(directCompaction.summary.status, 'attention-required');
assert.equal(directCompaction.summary.signals.errorLineCount >= 2, true);
assert.equal(directCompaction.summary.signals.warningLineCount, 1);
assert.equal(directCompaction.summary.signals.repeatedLineGroupCount >= 4, true);
assert.equal(directCompaction.summary.compact.estimatedTokens < directCompaction.summary.raw.estimatedTokens, true);
assert.match(directCompaction.markdown, /tail marker/);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'output-compaction-workspace'],
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
    'Output compaction smoke',
    '--objective',
    'Verify long command output can be compacted while preserving the raw log path.',
  ],
});

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(run.status, 'completed');

const compactionResult = runCli({
  rootDir: tempRoot,
  args: [
    'artifact',
    'compact-output',
    '--mission',
    mission.id,
    '--session',
    run.sessionId,
    '--input',
    rawOutputPath,
    '--source',
    'provider-hardening-smoke',
    '--file-name',
    'provider-hardening-output-summary.md',
    '--title',
    'Provider Hardening Output Summary',
    '--max-head-lines',
    '8',
    '--max-tail-lines',
    '8',
    '--max-issue-lines',
    '12',
  ],
});

assert.equal(compactionResult.status, 'attention-required');
assert.equal(compactionResult.inputPath, rawOutputPath);
assert.equal(compactionResult.signals.errorLineCount >= 2, true);
assert.equal(compactionResult.signals.warningLineCount, 1);
assert.equal(compactionResult.compact.estimatedTokens < compactionResult.raw.estimatedTokens, true);
assert.equal(compactionResult.artifact.kind, 'output_compaction');
assert.equal(compactionResult.artifact.metadata.inputPath, rawOutputPath);
assert.equal(compactionResult.artifact.metadata.sourceName, 'provider-hardening-smoke');

const artifactContent = fs.readFileSync(compactionResult.artifact.path, 'utf8');
assert.match(artifactContent, /# Output Compaction Summary/);
assert.match(artifactContent, /ERROR provider retry exhausted/);
assert.match(artifactContent, /WARNING deprecated provider fixture/);
assert.match(artifactContent, /tail marker/);
assert.doesNotMatch(artifactContent, /debug noise line 40/);

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });
const session = service.showSession(mission.id, { sessionId: run.sessionId });
const compactionArtifact = session.artifacts.find((artifact) => artifact.kind === 'output_compaction');
assert.ok(compactionArtifact);
assert.equal(compactionArtifact.id, compactionResult.artifact.id);

console.log(
  JSON.stringify(
    {
      artifactId: compactionResult.artifact.id,
      mode: 'output-compaction',
      ok: true,
      rawEstimatedTokens: compactionResult.raw.estimatedTokens,
      compactEstimatedTokens: compactionResult.compact.estimatedTokens,
      status: compactionResult.status,
    },
    null,
    2,
  ),
);
