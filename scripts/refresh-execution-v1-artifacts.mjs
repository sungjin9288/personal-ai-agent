import { runCommandWithHardTimeout } from './process-timeout-utils.mjs';

const repoDir = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipEvidence = args.includes('--skip-evidence');
const preserveArchivedLiveValidation = !args.includes('--no-preserve-archived-live-validation');
const explicitLiveFlags = args.filter((arg) => /^--live-(openai|anthropic|local|hermes)$/.test(arg));
const refreshStepTimeoutMs = parsePositiveIntegerEnv(
  'PERSONAL_AI_AGENT_REFRESH_STEP_TIMEOUT_MS',
  30 * 60 * 1000,
);

const steps = buildSteps({
  liveFlags: explicitLiveFlags,
  preserveArchivedLiveValidation,
  skipEvidence,
});

if (dryRun) {
  printSummary({
    dryRun: true,
    ok: true,
    preserveArchivedLiveValidation,
    skippedEvidenceRefresh: skipEvidence,
    stepTimeoutMs: refreshStepTimeoutMs,
    liveFlags: explicitLiveFlags,
    steps: steps.map((step) => ({
      name: step.name,
      command: formatCommand(step.args),
      timeoutMs: refreshStepTimeoutMs,
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
  stepTimeoutMs: refreshStepTimeoutMs,
  liveFlags: explicitLiveFlags,
  steps: results,
});

function buildSteps({ liveFlags, preserveArchivedLiveValidation, skipEvidence }) {
  const output = [];

  if (!skipEvidence) {
    output.push({
      args: [
        'scripts/build-execution-v1-evidence.mjs',
        preserveArchivedLiveValidation ? '--preserve-archived-live-validation' : null,
        ...liveFlags,
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
    {
      args: ['scripts/build-pilot-export-package.mjs'],
      name: 'pilot-export-package',
    },
  );

  return output;
}

function runStep(step) {
  const startedAt = Date.now();
  const result = runCommandWithHardTimeout(process.execPath, step.args, {
    cwd: repoDir,
    env: process.env,
    timeoutMs: refreshStepTimeoutMs,
  });
  const durationMs = Date.now() - startedAt;

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.timedOut || result.error || result.status !== 0) {
    throw new Error(
      [
        `execution-v1 artifact refresh step failed: ${step.name}`,
        `command=${formatCommand(step.args)}`,
        result.timedOut ? 'timedOut=true' : null,
        result.error ? `error=${result.error}` : null,
        result.signal ? `signal=${result.signal}` : null,
        result.status !== null ? `exitCode=${result.status}` : null,
        `durationMs=${durationMs}`,
        `timeoutMs=${refreshStepTimeoutMs}`,
      ].filter(Boolean).join('\n'),
    );
  }

  return {
    command: formatCommand(step.args),
    durationMs,
    exitCode: result.status,
    name: step.name,
    timedOut: false,
    timeoutMs: refreshStepTimeoutMs,
  };
}

function formatCommand(stepArgs) {
  return ['node', ...stepArgs].join(' ');
}

function printSummary(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function parsePositiveIntegerEnv(envKey, fallbackValue) {
  const rawValue = process.env[envKey];
  if (rawValue === undefined || rawValue === '') {
    return fallbackValue;
  }
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}
