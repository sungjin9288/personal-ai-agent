import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-closeout-runtime-'));

const readyEvidencePath = path.join(tempRoot, 'ready-evidence.md');
const readyCloseoutPath = path.join(tempRoot, 'ready-closeout.md');
const missingRuntimeEvidencePath = path.join(tempRoot, 'missing-runtime-evidence.md');
const missingRuntimeCloseoutPath = path.join(tempRoot, 'missing-runtime-closeout.md');

fs.writeFileSync(readyEvidencePath, buildEvidenceMarkdown({ includeReferenceRuntime: true }), 'utf8');
fs.writeFileSync(missingRuntimeEvidencePath, buildEvidenceMarkdown({ includeReferenceRuntime: false }), 'utf8');

const readyResult = runCloseout({
  evidencePath: readyEvidencePath,
  outputPath: readyCloseoutPath,
});
assert.equal(readyResult.ok, true);
assert.equal(readyResult.reusedEvidence, true);
assert.equal(readyResult.evidencePath, readyEvidencePath);
assert.equal(readyResult.checklistPath, readyCloseoutPath);

const readyCloseout = fs.readFileSync(readyCloseoutPath, 'utf8');
assert.match(readyCloseout, /- \[x\] deterministic runtime summary evidence 기록/);
assert.match(readyCloseout, /- deterministic runtime summary: ready/);
assert.match(readyCloseout, /- \[ \] Hermes live validation/);
assert.match(readyCloseout, /- hermes live validation: missing-env/);
assert.match(readyCloseout, /- `npm run preflight:execution-v1:all`로 provider별 env\/readiness 상태를 먼저 확인할 것/);
assert.match(readyCloseout, /- OpenAI: `export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="\.\.\." && npm run live:execution-v1:openai` 실행할 것/);
assert.match(readyCloseout, /- Anthropic: `export ANTHROPIC_API_KEY="\.\.\." && npm run live:execution-v1:anthropic` 실행할 것/);
assert.match(readyCloseout, /- Local provider: `export LOCAL_PROVIDER_BASE_URL="\.\.\." && npm run live:execution-v1:local` 실행할 것/);
assert.match(readyCloseout, /- Hermes: `export HERMES_PROVIDER_MODEL="\.\.\." && npm run live:execution-v1:hermes` 실행할 것/);
assert.match(readyCloseout, new RegExp(`- evidence: \\[${path.basename(readyEvidencePath)}\\]\\(${escapeRegExp(path.basename(readyEvidencePath))}\\)`));

const missingRuntimeResult = runCloseout({
  evidencePath: missingRuntimeEvidencePath,
  outputPath: missingRuntimeCloseoutPath,
});
assert.equal(missingRuntimeResult.ok, true);
assert.equal(missingRuntimeResult.reusedEvidence, true);
assert.equal(missingRuntimeResult.evidencePath, missingRuntimeEvidencePath);
assert.equal(missingRuntimeResult.checklistPath, missingRuntimeCloseoutPath);

const missingRuntimeCloseout = fs.readFileSync(missingRuntimeCloseoutPath, 'utf8');
assert.match(missingRuntimeCloseout, /- \[ \] deterministic runtime summary evidence 기록/);
assert.match(missingRuntimeCloseout, /- deterministic runtime summary: not verified/);
assert.match(missingRuntimeCloseout, /- \[ \] Hermes live validation/);
assert.match(missingRuntimeCloseout, /- hermes live validation: missing-env/);
assert.match(missingRuntimeCloseout, /- `npm run preflight:execution-v1:all`로 provider별 env\/readiness 상태를 먼저 확인할 것/);

console.log(
  JSON.stringify(
    {
      mode: 'execution-v1-closeout-runtime-summary',
      ok: true,
      readyCloseoutPath,
      missingRuntimeCloseoutPath,
    },
    null,
    2,
  ),
);

function runCloseout({ evidencePath, outputPath }) {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/build-execution-v1-closeout.mjs',
      '--evidence-path',
      evidencePath,
      '--output-path',
      outputPath,
    ],
    {
      cwd: repoDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: '',
        HERMES_PROVIDER_MODEL: '',
        LOCAL_PROVIDER_BASE_URL: '',
        OPENAI_API_KEY: '',
      },
    },
  );

  if (result.status !== 0) {
    throw new Error(`build-execution-v1-closeout failed\n${result.stderr || result.stdout}`);
  }

  return JSON.parse(String(result.stdout || '{}'));
}

function buildEvidenceMarkdown({ includeReferenceRuntime }) {
  const runtimeLines = [
    '- smoke:execution-flow: 10ms elapsed, stdout 1B, stderr 0B, timeout 20.0m',
    '- smoke:execution-cli: 11ms elapsed, stdout 2B, stderr 0B, timeout 20.0m',
    '- smoke:ui-execution-console: 12ms elapsed, stdout 3B, stderr 0B, timeout 20.0m',
    '- smoke:ui-execution-browser-e2e: 13ms elapsed, stdout 4B, stderr 5B, timeout 20.0m',
  ];

  if (includeReferenceRuntime) {
    runtimeLines.push('- smoke:reference-adoptions: 14ms elapsed, stdout 6B, stderr 0B, timeout 20.0m');
    runtimeLines.push('- smoke:execution-v1-live-helpers: 15ms elapsed, stdout 7B, stderr 0B, timeout 20.0m');
    runtimeLines.push('- smoke:execution-v1-handoff: 16ms elapsed, stdout 8B, stderr 0B, timeout 20.0m');
  }

  return `${[
    '# Execution v1 Evidence',
    '',
    '## Deterministic Smoke Results',
    '',
    '- smoke:execution-flow: passed',
    '- smoke:execution-cli: passed',
    '- smoke:ui-execution-console: passed',
    '- smoke:ui-execution-browser-e2e: passed',
    '- smoke:reference-adoptions: passed',
    '- smoke:execution-v1-live-helpers: passed',
    '- smoke:execution-v1-handoff: passed',
    '',
    '## Deterministic Runtime Summary',
    '',
    ...runtimeLines,
    '',
    '## Live Validation',
    '',
    '- openai: skipped',
    '- anthropic: skipped',
    '- local: skipped',
    '',
  ].join('\n')}`;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
