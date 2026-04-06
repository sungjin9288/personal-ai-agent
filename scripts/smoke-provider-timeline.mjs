import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-timeline-'));

function runCli({ args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PERSONAL_AI_AGENT_ROOT: tempRoot,
    },
  });

  return {
    status: result.status,
    stderr: String(result.stderr || ''),
    stdout: String(result.stdout || ''),
  };
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION,
  LOCAL_PROVIDER_API_KEY: process.env.LOCAL_PROVIDER_API_KEY,
  LOCAL_PROVIDER_BASE_URL: process.env.LOCAL_PROVIDER_BASE_URL,
  LOCAL_PROVIDER_MODEL: process.env.LOCAL_PROVIDER_MODEL,
};

try {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.test/v1';
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
  process.env.ANTHROPIC_VERSION = '2023-06-01';
  process.env.LOCAL_PROVIDER_API_KEY = 'test-local-key';
  process.env.LOCAL_PROVIDER_BASE_URL = 'http://127.0.0.1:1234/v1';
  process.env.LOCAL_PROVIDER_MODEL = 'llama3.1-local';

  globalThis.fetch = async (url) => {
    if (url === 'https://api.anthropic.test/v1/models') {
      return {
        ok: false,
        status: 503,
        async text() {
          return 'upstream unavailable';
        },
      };
    }

    if (url === 'http://127.0.0.1:1234/v1/models') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'llama3.1-local' }, { id: 'qwen3-local' }],
          };
        },
      };
    }

    throw new Error(`Unexpected timeline probe url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  await service.probeProvider('stub');
  await service.probeProvider('anthropic');
  await service.probeProvider('local');
} finally {
  globalThis.fetch = originalFetch;

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

const timelineAllResult = runCli({
  args: ['provider', 'timeline'],
});
assert.equal(timelineAllResult.status, 0);
const timelineAll = JSON.parse(timelineAllResult.stdout);
assert.equal(timelineAll.summary.total, 3);
assert.equal(timelineAll.summary.attemptedCount, 3);
assert.equal(timelineAll.summary.successCount, 2);
assert.equal(timelineAll.summary.failureCount, 1);
assert.equal(timelineAll.summary.eventCounts['provider-probe-succeeded'], 2);
assert.equal(timelineAll.summary.eventCounts['provider-probe-failed'], 1);
assert.ok(Array.isArray(timelineAll.timeline));
assert.equal(timelineAll.timeline.length, 3);

for (let index = 1; index < timelineAll.timeline.length; index += 1) {
  assert.ok(String(timelineAll.timeline[index - 1].at) <= String(timelineAll.timeline[index].at));
}

const anthropicTimelineResult = runCli({
  args: ['provider', 'timeline', '--provider', 'anthropic'],
});
assert.equal(anthropicTimelineResult.status, 0);
const anthropicTimeline = JSON.parse(anthropicTimelineResult.stdout);
assert.equal(anthropicTimeline.timeline.length, 1);
assert.equal(anthropicTimeline.timeline[0].providerId, 'anthropic');
assert.equal(anthropicTimeline.timeline[0].kind, 'provider-probe-failed');
assert.match(anthropicTimeline.timeline[0].detail, /upstream unavailable/i);

const successTimelineResult = runCli({
  args: ['provider', 'timeline', '--ok', 'true'],
});
assert.equal(successTimelineResult.status, 0);
const successTimeline = JSON.parse(successTimelineResult.stdout);
assert.equal(successTimeline.timeline.length, 2);
assert.ok(successTimeline.timeline.every((event) => event.ok === true));

const attemptedTimelineResult = runCli({
  args: ['provider', 'timeline', '--attempted', 'true'],
});
assert.equal(attemptedTimelineResult.status, 0);
const attemptedTimeline = JSON.parse(attemptedTimelineResult.stdout);
assert.equal(attemptedTimeline.timeline.length, 3);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-timeline',
      totalEvents: timelineAll.summary.total,
    },
    null,
    2,
  ),
);
