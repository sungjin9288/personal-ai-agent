import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-handoff-smoke-'));
const evidencePath = path.join(tempRoot, 'execution-v1-evidence.md');
const closeoutPath = path.join(tempRoot, 'execution-v1-closeout.md');
const handoffPath = path.join(tempRoot, 'execution-v1-handoff.md');
const commit = runGit(['rev-parse', 'HEAD']);
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const artifactSetSha256 = 'handoff-smoke-artifact-set';

fs.writeFileSync(evidencePath, [
  '# Execution v1 Evidence',
  '',
  '- generatedAt: 2026-05-01T00:00:00.000Z',
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  '- mode: execution-v1-verification',
  '- liveFlags: none',
  '',
  '## Deterministic Verification',
  '',
  '- smoke:execution-flow: passed',
  '- smoke:execution-cli: passed',
  '- smoke:ui-execution-console: passed',
  '- smoke:ui-execution-browser-e2e: passed',
  '- smoke:reference-adoptions: passed',
  '- smoke:execution-v1-live-helpers: passed',
  '',
  '## Deterministic Runtime Summary',
  '',
  '- smoke:execution-flow: 100ms elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '- smoke:execution-cli: 100ms elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '- smoke:ui-execution-console: 100ms elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '- smoke:ui-execution-browser-e2e: 1.0s elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '- smoke:reference-adoptions: 1.0s elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '- smoke:execution-v1-live-helpers: 1.0s elapsed, stdout 1B, stderr 0B, timeout 20.0m',
  '',
  '## Reference Adoption Aggregate',
  '',
  '- scriptCount: 15',
  '- totalDuration: 1.0s',
  '- ok: true',
  '',
  '- scripts/smoke-output-compaction.mjs: passed (10ms, timeout 5.0m, timedOut false)',
  '',
  '## Visual Evidence Manifest',
  '',
  '- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json',
  '- available: 2',
  '- missing: 0',
  '- visualArtifactCount: 1',
  `- artifactSetSha256: ${artifactSetSha256}`,
  '',
].join('\n'), 'utf8');

fs.writeFileSync(closeoutPath, [
  '# Execution v1 Closeout',
  '',
  '- generatedAt: 2026-05-01T00:00:01.000Z',
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  '- evidence: [execution-v1-evidence.md](execution-v1-evidence.md)',
  '',
  '## Closeout Checklist',
  '',
  '- [x] deterministic execution smoke 4종 통과',
  '- [x] reference adoption aggregate smoke gate 통과',
  '- [x] deterministic runtime summary evidence 기록',
  '- [x] engineering reviewer → execution manifest 생성 경로 연결',
  '- [x] execution lease approval → foreground execution session 연결',
  '- [x] operator console preflight/start/stop/log surface 반영',
  '- [x] CLI execution preflight/start/stop/status/logs 계약 반영',
  '- [ ] OpenAI live validation',
  '- [ ] Anthropic live validation',
  '- [x] Local provider live validation',
  '- [ ] Hermes live validation',
  '- [x] browser interaction E2E 자동화',
  '',
  '## Current Status',
  '',
  '- deterministic smoke: ready',
  '- reference adoption gate: ready',
  '- deterministic runtime summary: ready',
  '- openai live validation: missing-env',
  '- anthropic live validation: missing-env',
  '- local live validation: passed',
  '- hermes live validation: missing-env',
  '- browser interaction e2e: ready',
  '',
].join('\n'), 'utf8');

const result = spawnSync(process.execPath, [
  path.join(repoDir, 'scripts', 'build-execution-v1-handoff.mjs'),
  '--evidence-path',
  evidencePath,
  '--closeout-path',
  closeoutPath,
  '--output-path',
  handoffPath,
], {
  cwd: repoDir,
  encoding: 'utf8',
  env: process.env,
});

assert.equal(result.status, 0, result.stderr || result.stdout);
const payload = JSON.parse(String(result.stdout || '{}'));
assert.equal(payload.ok, true);
assert.equal(payload.outputPath, handoffPath);
assert.equal(payload.visualArtifactSetSha256, artifactSetSha256);
assert.equal(typeof payload.commitPushStatus?.summary, 'string');

const handoff = fs.readFileSync(handoffPath, 'utf8');
assert.match(handoff, /^# Execution v1 Handoff/m);
assert.match(handoff, new RegExp(`^- commit: ${escapeRegExp(commit)}$`, 'm'));
assert.match(handoff, /^- commitPushStatus: .+$/m);
assert.match(handoff, /^- deterministic execution flow: ready$/m);
assert.match(handoff, /^- reference adoption aggregate: ready, 15 scripts, ok=true, totalDuration=1.0s$/m);
assert.match(handoff, /^- OpenAI live validation: blocked by missing `OPENAI_API_KEY`$/m);
assert.match(handoff, /^- Hermes live validation: blocked by missing `HERMES_PROVIDER_MODEL`$/m);
assert.match(handoff, new RegExp(`^- visual artifact set: ${escapeRegExp(artifactSetSha256)}$`, 'm'));
assert.equal(handoff.includes('npm run preflight:execution-v1:all'), true);
assert.equal(handoff.includes('npm run refresh:execution-v1-artifacts'), true);
assert.equal(handoff.includes('pilot export package'), true);
assert.equal(handoff.includes('node scripts/build-execution-v1-evidence.mjs --live-<provider>'), true);
assert.equal(
  handoff.includes(
    'Hermes live validation still requires target Hermes provider architecture evidence for endpoint ownership, HERMES_PROVIDER_MODEL model pinning, target secret injection, tool-call parsing, session lifecycle provenance, transcript policy, quota guard, telemetry, fallback and stop-condition decision, customer approval, target-boundary npm run live:execution-v1:hermes pass, release artifact hygiene result, and regenerated execution snapshot evidence',
  ),
  true,
);
assert.equal(
  handoff.includes('Attach approved target-boundary local provider endpoint ownership proof, LOCAL_PROVIDER_MODEL model pinning proof, network isolation proof, telemetry proof, quota and resource guard proof, and local provider live validation evidence'),
  true,
);
assert.equal(
  handoff.includes(
    'Attach approved target provider architecture evidence for Hermes, including endpoint ownership and model pinning proof, target secret injection, telemetry, fallback, customer approval, and target-boundary live validation',
  ),
  false,
);
assert.equal(
  handoff.includes(
    'Hermes live validation still requires target Hermes provider architecture evidence, and target local provider architecture approval still requires',
  ),
  false,
);
assert.equal(handoff.includes('npm run snapshot:execution-v1'), false);
assert.equal(
  handoff.includes('Commit and push the refreshed release artifacts')
    || handoff.includes('only commit/push again after intentionally changing release artifacts'),
  true,
);

const originMainCommit = runGitOptional(['rev-parse', '--verify', 'origin/main']);
if (originMainCommit) {
  const fallbackBranch = `codex/missing-publish-status-fixture-${process.pid}-${Date.now()}`;
  const fallbackEvidencePath = path.join(tempRoot, 'origin-main-fallback-evidence.md');
  const fallbackCloseoutPath = path.join(tempRoot, 'origin-main-fallback-closeout.md');
  const fallbackHandoffPath = path.join(tempRoot, 'origin-main-fallback-handoff.md');
  const fallbackEvidence = fs.readFileSync(evidencePath, 'utf8')
    .replace(`- branch: ${branch}`, `- branch: ${fallbackBranch}`)
    .replace(`- commit: ${commit}`, `- commit: ${originMainCommit}`);
  const fallbackCloseout = fs.readFileSync(closeoutPath, 'utf8')
    .replace(`- branch: ${branch}`, `- branch: ${fallbackBranch}`)
    .replace(`- commit: ${commit}`, `- commit: ${originMainCommit}`);
  fs.writeFileSync(fallbackEvidencePath, fallbackEvidence, 'utf8');
  fs.writeFileSync(fallbackCloseoutPath, fallbackCloseout, 'utf8');

  const fallbackResult = spawnSync(process.execPath, [
    path.join(repoDir, 'scripts', 'build-execution-v1-handoff.mjs'),
    '--evidence-path',
    fallbackEvidencePath,
    '--closeout-path',
    fallbackCloseoutPath,
    '--output-path',
    fallbackHandoffPath,
  ], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  assert.equal(fallbackResult.status, 0, fallbackResult.stderr || fallbackResult.stdout);
  const fallbackPayload = JSON.parse(String(fallbackResult.stdout || '{}'));
  assert.equal(fallbackPayload.ok, true);
  assert.equal(fallbackPayload.commitPushStatus?.pushed, true);
  assert.equal(fallbackPayload.commitPushStatus?.remoteRef, 'origin/main');
  assert.match(fs.readFileSync(fallbackHandoffPath, 'utf8'), /^- commitPushStatus: pushed to origin\/main$/m);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      branch,
      commit,
      outputPath: handoffPath,
      visualArtifactSetSha256: artifactSetSha256,
    },
    null,
    2,
  ),
);

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || '').trim();
}

function runGitOptional(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return '';
  }
  return String(result.stdout || '').trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
