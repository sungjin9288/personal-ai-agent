import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const evidencePath = path.join(repoDir, 'docs', 'execution-v1-evidence.md');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipEvidence = args.includes('--skip-evidence');
const preserveArchivedLiveValidation = !args.includes('--no-preserve-archived-live-validation');
const explicitLiveFlags = args.filter((arg) => /^--live-(openai|anthropic|local|hermes)$/.test(arg));
const archivedLiveFlags = explicitLiveFlags.length
  ? explicitLiveFlags
  : detectArchivedLiveFlags(readOptionalFile(evidencePath));

const steps = buildSteps({
  archivedLiveFlags,
  preserveArchivedLiveValidation,
  skipEvidence,
});

if (dryRun) {
  printSummary({
    dryRun: true,
    ok: true,
    preserveArchivedLiveValidation,
    skippedEvidenceRefresh: skipEvidence,
    liveFlags: archivedLiveFlags,
    steps: steps.map((step) => ({
      name: step.name,
      command: formatCommand(step.args),
    })),
  });
  process.exit(0);
}

const results = [];
for (const step of steps) {
  results.push(runStep(step));
}

printSummary({
  dryRun: false,
  ok: true,
  preserveArchivedLiveValidation,
  skippedEvidenceRefresh: skipEvidence,
  liveFlags: archivedLiveFlags,
  steps: results,
});

function buildSteps({ archivedLiveFlags, preserveArchivedLiveValidation, skipEvidence }) {
  const output = [];

  if (!skipEvidence) {
    output.push({
      args: [
        'scripts/build-execution-v1-evidence.mjs',
        preserveArchivedLiveValidation ? '--preserve-archived-live-validation' : null,
        ...archivedLiveFlags,
      ].filter(Boolean),
      name: 'evidence',
    });
  }

  output.push(
    {
      args: ['scripts/build-execution-v1-closeout.mjs', '--reuse-existing-evidence'],
      name: 'closeout',
    },
    {
      args: ['scripts/build-execution-v1-handoff.mjs'],
      name: 'handoff-before-snapshot',
    },
    {
      args: ['scripts/build-production-provider-readiness.mjs'],
      name: 'production-provider-readiness',
    },
    {
      args: ['scripts/archive-execution-v1-snapshot.mjs'],
      name: 'snapshot-before-handoff-refresh',
    },
    {
      args: ['scripts/build-execution-v1-handoff.mjs'],
      name: 'handoff-after-snapshot',
    },
    {
      args: ['scripts/archive-execution-v1-snapshot.mjs'],
      name: 'snapshot-final',
    },
  );

  return output;
}

function detectArchivedLiveFlags(markdown) {
  const section = extractMarkdownSection(markdown, 'Live Validation');
  const providers = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^- (openai|anthropic|local|hermes): (passed|failed)(?: |\(|$)/);
    if (match && !providers.includes(match[1])) {
      providers.push(match[1]);
    }
  }
  return providers.map((provider) => `--live-${provider}`);
}

function extractMarkdownSection(markdown, heading) {
  const match = String(markdown || '').match(new RegExp(`(?:^|\\n)## ${escapeRegExp(heading)}\\n\\n([\\s\\S]*?)(?:\\n## |$)`));
  return match?.[1]?.trim() || '';
}

function runStep(step) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, step.args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 128 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `execution-v1 artifact refresh step failed: ${step.name}`,
        `command=${formatCommand(step.args)}`,
        result.error ? `error=${result.error.message}` : null,
        result.status !== null ? `exitCode=${result.status}` : null,
      ].filter(Boolean).join('\n'),
    );
  }

  return {
    command: formatCommand(step.args),
    durationMs,
    exitCode: result.status,
    name: step.name,
  };
}

function formatCommand(stepArgs) {
  return ['node', ...stepArgs].join(' ');
}

function printSummary(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function readOptionalFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
