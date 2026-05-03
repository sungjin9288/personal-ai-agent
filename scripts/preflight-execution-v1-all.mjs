import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const providers = ['openai', 'anthropic', 'local', 'hermes'];

const results = providers.map((provider) => runProviderPreflight(provider));
const blocked = results.filter((result) => result.status === 'blocked' || !result.ok);
const readyForLive = results.filter((result) => result.status === 'ready-for-live-validation');
const missingEnv = results.filter((result) => result.status === 'ready-but-missing-env');

const ok = blocked.length === 0;
console.log(
  JSON.stringify(
    {
      blockedCount: blocked.length,
      missingEnvCount: missingEnv.length,
      ok,
      providers: results,
      readyForLiveCount: readyForLive.length,
      status: ok ? (missingEnv.length > 0 ? 'ready-but-missing-env' : 'ready-for-live-validation') : 'blocked',
    },
    null,
    2,
  ),
);

process.exit(ok ? 0 : 1);

function runProviderPreflight(provider) {
  const result = spawnSync('npm', ['run', `preflight:execution-v1:${provider}`], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  const parsed = parseJsonObject(result.stdout);
  if (result.status === 0 && parsed) {
    return parsed;
  }

  return {
    ok: false,
    provider,
    status: 'blocked',
    summary: compactOutput(result.stderr || result.stdout),
  };
}

function parseJsonObject(value) {
  const text = String(value || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function compactOutput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 320);
}
