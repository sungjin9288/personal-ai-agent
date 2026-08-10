import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createCouncilConcurrentRetryTerminalityShadow } from '../src/core/council-concurrent-retry-terminality-shadow.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverPath = path.join(repoDir, 'src', 'web', 'server.mjs');
const ROLE_IDS = ['research', 'implementation', 'verification'];

function completion(stageId, outcome = 'completed', attemptNumber = 1) {
  return { attemptId: `attempt:${stageId}:${attemptNumber}`, outcome, stageId };
}

function timeoutEvents(siblingOutcomes = ['completed', 'completed']) {
  return [
    completion('opening:research', 'timeout'),
    completion('opening:implementation', siblingOutcomes[0]),
    completion('opening:verification', siblingOutcomes[1]),
  ];
}

function projected(stageId, outcome) {
  return completion(stageId, outcome, 2);
}

function surfaceArgs(completionEvents, projectedRetryOutcome) {
  return [
    'council',
    'concurrent-retry-terminality-shadow',
    '--role', 'verification', '--role', 'research', '--role', 'implementation',
    ...completionEvents.flatMap(({ stageId, attemptId, outcome }) => [
      '--completion-event', `${stageId}|${attemptId}|${outcome}`,
    ]),
    '--projected-retry-outcome', `${projectedRetryOutcome.stageId}|${projectedRetryOutcome.attemptId}|${projectedRetryOutcome.outcome}`,
  ];
}

function createExpected() {
  const completionEvents = timeoutEvents();
  const projectedRetryOutcome = projected('opening:research', 'completed');
  return {
    completionEvents,
    projectedRetryOutcome,
    value: createCouncilConcurrentRetryTerminalityShadow({
      completionEvents,
      projectedRetryOutcome,
      roleIds: ROLE_IDS,
    }),
  };
}

test('retry terminality operator surface preserves the deterministic scenario matrix', () => {
  const { value } = createExpected();
  assert.equal(value.contractVersion, 'council-concurrent-retry-terminality-shadow-v1.1e');
  assert.equal(value.state, 'projected-barrier-ready');
  assert.equal(value.retryLineage.parentAttempt.attemptNumber, 1);
  assert.equal(value.retryLineage.projectedAttempt.attemptNumber, 2);
  assert.equal(value.retryTerminality.nextBarrier.state, 'projected-ready');
  assert.equal(value.retryDecision, 'keep-retry-disabled');
  assert.equal(value.decision, 'keep-dispatch-disabled');
  assert.equal(Object.values(value.executionCounts).every((count) => count === 0), true);

  assert.equal(
    createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: timeoutEvents(['failed', 'completed']),
      projectedRetryOutcome: projected('opening:research', 'completed'),
    }).state,
    'projected-barrier-blocked',
  );
  assert.equal(
    createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: timeoutEvents(),
      projectedRetryOutcome: projected('opening:research', 'failed'),
    }).state,
    'retry-exhausted',
  );
  assert.equal(
    createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: [
        ...['opening:research', 'opening:implementation', 'opening:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'chair:synthesis'].map((stageId) => completion(stageId)),
        completion('reviewer:review', 'timeout'),
      ],
      projectedRetryOutcome: projected('reviewer:review', 'completed'),
    }).state,
    'projection-complete',
  );
  assert.equal(
    createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: [completion('opening:research', 'failed')],
      projectedRetryOutcome: projected('opening:research', 'completed'),
    }).state,
    'retry-outcome-rejected',
  );

  for (const roleIds of [
    ['research', 'product', 'implementation', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'security', 'verification', 'operations'],
  ]) {
    const result = createCouncilConcurrentRetryTerminalityShadow({ roleIds });
    assert.equal(result.state, 'outside-synthetic-envelope');
    assert.equal(result.retryLineage, null);
  }
});

test('CLI exposes exact retry terminality parity without filesystem writes', () => {
  const { completionEvents, projectedRetryOutcome, value: expected } = createExpected();
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-retry-surface-cli-'));
  try {
    const cli = spawnSync(process.execPath, [cliPath, ...surfaceArgs(completionEvents, projectedRetryOutcome)], {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), expected);
    assert.deepEqual(fs.readdirSync(rootDir), []);

    const malformed = spawnSync(process.execPath, [
      cliPath,
      'council', 'concurrent-retry-terminality-shadow',
      '--projected-retry-outcome',
    ], {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
    });
    assert.equal(malformed.status, 1);
    assert.deepEqual(JSON.parse(malformed.stdout), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-retry-terminality-shadow: projected retry outcome must use stageId|attemptId|outcome.',
    });
    assert.deepEqual(fs.readdirSync(rootDir), []);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test('stable request audit snapshots wait for active requests to become terminal', async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-retry-audit-stability-'));
  const auditPath = path.join(rootDir, 'var', 'runtime-requests.json');
  const terminalAudit = {
    active: [],
    terminal: [{ id: 'request-1', method: 'GET', path: '/example', statusCode: 200 }],
  };
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.writeFileSync(auditPath, JSON.stringify({
    active: [{ id: 'request-1', method: 'GET', path: '/example', status: 'active' }],
    terminal: [],
  }));
  const terminalRewrite = setTimeout(() => {
    fs.writeFileSync(auditPath, JSON.stringify(terminalAudit));
  }, 100);

  try {
    await waitForStableSnapshot(rootDir);
    assert.deepEqual(JSON.parse(fs.readFileSync(auditPath, 'utf8')), terminalAudit);
  } finally {
    clearTimeout(terminalRewrite);
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test('GET retry terminality preserves auth boundary and request-audit-only writes', async () => {
  const { completionEvents, projectedRetryOutcome, value: expected } = createExpected();
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-retry-surface-http-'));
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [serverPath], {
    cwd: repoDir,
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
      PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
      PERSONAL_AI_AGENT_UI_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(baseUrl, server);
    const before = await waitForStableSnapshot(rootDir);
    const params = new URLSearchParams();
    ROLE_IDS.forEach((roleId) => params.append('role', roleId));
    completionEvents.forEach(({ stageId, attemptId, outcome }) => params.append('completionEvent', `${stageId}|${attemptId}|${outcome}`));
    params.set('projectedRetryOutcome', `${projectedRetryOutcome.stageId}|${projectedRetryOutcome.attemptId}|${projectedRetryOutcome.outcome}`);
    const response = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    const afterValid = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(before, afterValid);
    assertAuditContains(rootDir, '/api/council/concurrent-retry-terminality-shadow', 200);

    const stale = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?role=research&role=implementation&role=verification&completionEvent=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A1%7Ctimeout&projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A3%7Ccompleted`);
    assert.equal(stale.status, 400);
    assert.deepEqual(await stale.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-retry-terminality-shadow: projected-retry-outcome-stale-attempt.',
    });
    const afterStale = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(afterValid, afterStale);

    const duplicate = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted&projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted`);
    assert.equal(duplicate.status, 400);
    assert.deepEqual(await duplicate.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-retry-terminality-shadow: projected retry outcome may be supplied once.',
    });
    const afterDuplicate = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(afterStale, afterDuplicate);

    const outside = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?role=research&role=product&role=architecture&role=implementation`);
    assert.equal(outside.status, 200);
    assert.equal((await outside.json()).state, 'outside-synthetic-envelope');
    assertOnlyRequestAuditChanged(afterDuplicate, await waitForStableSnapshot(rootDir));
  } finally {
    server.kill('SIGTERM');
    await onceExit(server);
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${child.exitCode}`);
    try {
      if ((await fetch(`${url}/api/health`)).ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('server did not become ready');
}

async function waitForStableSnapshot(directory) {
  let lastSnapshot = {};
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const before = snapshotFiles(directory);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const after = snapshotFiles(directory);
    lastSnapshot = after;
    if (Object.keys(before).some((entry) => path.basename(entry).includes('.tmp')) || Object.keys(after).some((entry) => path.basename(entry).includes('.tmp'))) continue;
    if (JSON.stringify(before) === JSON.stringify(after) && requestAuditIsSettled(directory)) return after;
  }
  throw new Error(`request-audit filesystem state did not stabilize: ${Object.keys(lastSnapshot).join(', ')}`);
}

function snapshotFiles(directory) {
  const snapshot = {};
  for (const entry of fs.readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relativePath = path.relative(directory, path.join(entry.parentPath, entry.name));
    if (relativePath.startsWith(`var${path.sep}runtime-requests.json.`) && relativePath.endsWith('.tmp')) continue;
    snapshot[relativePath] = createHash('sha256').update(fs.readFileSync(path.join(directory, relativePath))).digest('hex');
  }
  return snapshot;
}

function requestAuditIsSettled(directory) {
  const auditPath = path.join(directory, 'var', 'runtime-requests.json');
  if (!fs.existsSync(auditPath)) return true;
  try {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    return Array.isArray(audit.active) && audit.active.length === 0;
  } catch {
    return false;
  }
}

function assertAuditContains(rootDir, requestPath, statusCode) {
  const audit = JSON.parse(fs.readFileSync(path.join(rootDir, 'var', 'runtime-requests.json'), 'utf8'));
  assert.deepEqual(audit.active, []);
  assert.equal(audit.terminal.some((entry) => entry.method === 'GET' && entry.path === requestPath && entry.statusCode === statusCode), true);
}

function assertOnlyRequestAuditChanged(before, after) {
  const changedPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((filePath) => before[filePath] !== after[filePath])
    .sort();
  assert.deepEqual(changedPaths, ['var/runtime-requests.json']);
}

function onceExit(child) {
  return child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('exit', resolve));
}
