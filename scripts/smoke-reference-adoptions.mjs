import path from 'node:path';
import { runCommandWithHardTimeout } from './process-timeout-utils.mjs';
import { referenceAdoptionSmokeScripts } from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const scriptTimeoutMs = parsePositiveIntegerEnv(
  'PERSONAL_AI_AGENT_REFERENCE_ADOPTION_SCRIPT_TIMEOUT_MS',
  5 * 60 * 1000,
);

const results = [];

for (const scriptPath of referenceAdoptionSmokeScripts) {
  const startedAt = Date.now();
  const result = runCommandWithHardTimeout(process.execPath, [path.join(repoDir, scriptPath)], {
    cwd: repoDir,
    env: process.env,
    timeoutMs: scriptTimeoutMs,
  });
  const durationMs = Date.now() - startedAt;

  results.push({
    durationMs,
    exitCode: result.status,
    ok: result.status === 0 && !result.timedOut && !result.error,
    script: scriptPath,
    timedOut: Boolean(result.timedOut),
    timeoutMs: scriptTimeoutMs,
  });

  if (result.status !== 0 || result.timedOut || result.error) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    console.error(
      JSON.stringify(
        {
          error: result.error || '',
          failedScript: scriptPath,
          mode: 'reference-adoptions-smoke',
          ok: false,
          results,
          timedOut: Boolean(result.timedOut),
        },
        null,
        2,
      ),
    );
    process.exit(result.status || 1);
  }
}

console.log(
  JSON.stringify(
    {
      mode: 'reference-adoptions-smoke',
      ok: true,
      results,
      totalDurationMs: results.reduce((sum, item) => sum + item.durationMs, 0),
    },
    null,
    2,
  ),
);

function parsePositiveIntegerEnv(envKey, fallbackValue) {
  const rawValue = process.env[envKey];
  if (rawValue === undefined || rawValue === '') {
    return fallbackValue;
  }
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}
