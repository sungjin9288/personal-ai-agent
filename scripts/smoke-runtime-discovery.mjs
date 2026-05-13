import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { createRuntimeJobRegistry } from '../src/core/runtime-job-registry.mjs';
import { createRuntimeRequestRegistry } from '../src/core/runtime-request-registry.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-discovery-'));
const workspacePath = path.join(tempRoot, 'workspace');
const requestedPort = await getFreePort();
const blocker = await listenBlocker(requestedPort);
const discoveryPath = path.join(tempRoot, 'var', 'server.json');
const runtimeJobRegistryPath = path.join(tempRoot, 'var', 'runtime-jobs.json');
const runtimeRequestRegistryPath = path.join(tempRoot, 'var', 'runtime-requests.json');
const runtimeStatusPath = path.join(tempRoot, 'var', 'runtime-status.json');
const serverOutput = { stderr: '', stdout: '' };
const malformedRegistryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-runtime-registry-malformed-'));

fs.mkdirSync(path.dirname(runtimeStatusPath), { recursive: true });
fs.mkdirSync(workspacePath, { recursive: true });
assertMalformedRegistryFallback(malformedRegistryRoot);
fs.writeFileSync(
  runtimeStatusPath,
  `${JSON.stringify(
    {
      host: '127.0.0.1',
      pid: 99999999,
      state: 'listening',
      status: 'listening',
      updatedAt: '2026-04-27T00:00:00.000Z',
      url: 'http://127.0.0.1:1',
    },
    null,
    2,
  )}\n`,
  'utf8',
);
fs.writeFileSync(
  runtimeRequestRegistryPath,
  `${JSON.stringify(
    {
      active: [
        {
          id: 'stale-active-request',
          method: 'GET',
          path: '/api/stale',
          pid: 99999999,
          startedAt: '2026-04-27T00:00:00.000Z',
          startedAtMs: Date.now() - 5000,
          status: 'active',
        },
      ],
      terminal: [],
      updatedAt: '2026-04-27T00:00:00.000Z',
    },
    null,
    2,
  )}\n`,
  'utf8',
);
fs.writeFileSync(
  runtimeJobRegistryPath,
  `${JSON.stringify(
    {
      active: [
        {
          id: 'stale-runtime-job',
          kind: 'execution-v1-refresh',
          pid: 99999999,
          requestId: 'stale-runtime-request',
          scope: 'current-surface',
          source: 'web-ui',
          startedAt: '2026-04-27T00:00:00.000Z',
          startedAtMs: Date.now() - 6000,
          status: 'active',
          summary: 'stale job fixture',
        },
      ],
      terminal: [],
      updatedAt: '2026-04-27T00:00:00.000Z',
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(requestedPort),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  const discovery = await waitForDiscovery(discoveryPath, serverProcess);

  assert.equal(discovery.status, 'listening');
  assert.equal(discovery.host, '127.0.0.1');
  assert.equal(discovery.requestedPort, requestedPort);
  assert.equal(discovery.fallback, true);
  assert.notEqual(discovery.actualPort, requestedPort);
  assert.equal(discovery.runtimeStatusPath, runtimeStatusPath);
  assert.equal(discovery.runtimeJobRegistryPath, runtimeJobRegistryPath);
  assert.equal(discovery.runtimeRequestRegistryPath, runtimeRequestRegistryPath);
  assert.equal(discovery.staleRuntimeJobCount, 1);
  assert.equal(discovery.staleRuntimeRequestCount, 1);
  assert.match(discovery.url, /^http:\/\/127\.0\.0\.1:\d+$/);

  const requestId = 'runtime-smoke-request';
  const healthResponse = await fetch(`${discovery.url}/api/health`, {
    headers: {
      'X-Request-Id': requestId,
    },
  });
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get('x-request-id'), requestId);

  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.discoveryPath, discoveryPath);
  assert.equal(health.port, discovery.actualPort);
  assert.equal(health.requestedPort, requestedPort);
  assert.equal(health.runtimeStatusPath, runtimeStatusPath);
  assert.equal(health.runtimeJobRegistryPath, runtimeJobRegistryPath);
  assert.equal(health.runtimeRequestRegistryPath, runtimeRequestRegistryPath);
  assert.equal(health.jobs?.registryPath, runtimeJobRegistryPath);
  assert.equal(health.requests?.registryPath, runtimeRequestRegistryPath);
  assert.equal(health.staleRuntimeJobCount, 1);
  assert.equal(health.staleRuntimeRequestCount, 1);
  assert.equal(health.runtime?.state, 'listening');
  assert.equal(health.runtime?.previousRuntime?.stale, true);
  assert.equal(health.runtime?.previousRuntime?.active, false);
  assert.equal(health.url, discovery.url);
  assert.equal(typeof health.requests?.activeCount, 'number');
  assert.equal(typeof health.requests?.recentCount, 'number');
  assert.equal(typeof health.jobs?.activeCount, 'number');
  assert.equal(typeof health.jobs?.recentCount, 'number');

  const metaResponse = await fetch(`${discovery.url}/api/meta`);
  assert.equal(metaResponse.status, 200);
  const generatedRequestId = String(metaResponse.headers.get('x-request-id') || '');
  assert.match(generatedRequestId, /^req_/);
  const meta = await metaResponse.json();
  assert.equal(meta.port, discovery.actualPort);
  assert.equal(meta.host, '127.0.0.1');

  const requestsResponse = await fetch(`${discovery.url}/api/runtime/requests`);
  assert.equal(requestsResponse.status, 200);
  const requestState = await requestsResponse.json();
  assert.equal(Array.isArray(requestState.requests?.active), true);
  assert.equal(Array.isArray(requestState.requests?.recent), true);
  assert.equal(requestState.requests.recent.some((entry) => entry.id === requestId && entry.path === '/api/health'), true);
  assert.equal(requestState.requests.recent.some((entry) => entry.id === generatedRequestId && entry.path === '/api/meta'), true);
  assert.equal(
    requestState.requests.recent.some((entry) => entry.id === 'stale-active-request' && entry.status === 'abandoned' && entry.stale === true),
    true,
  );
  assert.equal(
    requestState.requests.active.some((entry) => entry.id === requestsResponse.headers.get('x-request-id') && entry.path === '/api/runtime/requests'),
    true,
  );
  assert.equal(requestState.requests.registryPath, runtimeRequestRegistryPath);
  const persistedRequestRegistry = JSON.parse(fs.readFileSync(runtimeRequestRegistryPath, 'utf8'));
  assert.equal(Array.isArray(persistedRequestRegistry.active), true);
  assert.equal(Array.isArray(persistedRequestRegistry.terminal), true);
  assert.equal(
    persistedRequestRegistry.terminal.some((entry) => entry.id === 'stale-active-request' && entry.status === 'abandoned'),
    true,
  );

  const jobsResponse = await fetch(`${discovery.url}/api/runtime/jobs`);
  assert.equal(jobsResponse.status, 200);
  const jobState = await jobsResponse.json();
  assert.equal(Array.isArray(jobState.jobs?.active), true);
  assert.equal(Array.isArray(jobState.jobs?.recent), true);
  assert.equal(jobState.jobs.registryPath, runtimeJobRegistryPath);
  assert.equal(
    jobState.jobs.recent.some((entry) => entry.id === 'stale-runtime-job' && entry.status === 'abandoned' && entry.stale === true),
    true,
  );
  const persistedJobRegistry = JSON.parse(fs.readFileSync(runtimeJobRegistryPath, 'utf8'));
  assert.equal(Array.isArray(persistedJobRegistry.active), true);
  assert.equal(Array.isArray(persistedJobRegistry.terminal), true);
  assert.equal(
    persistedJobRegistry.terminal.some((entry) => entry.id === 'stale-runtime-job' && entry.status === 'abandoned'),
    true,
  );

  const workspaceResponse = await postJson(`${discovery.url}/api/workspaces`, {
    name: 'runtime-source-workspace',
    workspacePath,
  });
  assert.equal(workspaceResponse.workspace.path, workspacePath);

  const missionResponse = await postJson(`${discovery.url}/api/missions`, {
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Verify web runtime source context is captured on mission sessions.',
    title: 'Runtime source context mission',
    workspaceId: workspaceResponse.workspace.id,
  });
  const webRunRequestId = 'runtime-web-run-source';
  const runResponse = await fetch(`${discovery.url}/api/missions/${encodeURIComponent(missionResponse.mission.id)}/run`, {
    body: JSON.stringify({
      provider: 'stub',
    }),
    headers: {
      'content-type': 'application/json',
      'X-Request-Id': webRunRequestId,
    },
    method: 'POST',
  });
  assert.equal(runResponse.status, 200);
  const runResult = await runResponse.json();
  assert.equal(runResult.session.sourceContext.sourceType, 'web');
  assert.equal(runResult.session.sourceContext.channel, 'web');
  assert.equal(runResult.session.sourceContext.requestId, webRunRequestId);
  assert.equal(runResult.session.sourceContext.route, `/api/missions/${missionResponse.mission.id}/run`);

  const fallbackMissionResponse = await postJson(`${discovery.url}/api/missions`, {
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Verify web mission run can fall back through provider-failure-only policy.',
    title: 'Runtime fallback web mission',
    workspaceId: workspaceResponse.workspace.id,
  });
  const fallbackRunResponse = await fetch(
    `${discovery.url}/api/missions/${encodeURIComponent(fallbackMissionResponse.mission.id)}/run`,
    {
      body: JSON.stringify({
        fallbackProvider: 'stub',
        provider: 'anthropic',
      }),
      headers: {
        'content-type': 'application/json',
        'X-Request-Id': 'runtime-web-fallback-run',
      },
      method: 'POST',
    },
  );
  assert.equal(fallbackRunResponse.status, 200);
  const fallbackRunResult = await fallbackRunResponse.json();
  assert.equal(fallbackRunResult.mission.status, 'completed');
  assert.equal(fallbackRunResult.provider, 'stub');
  assert.equal(fallbackRunResult.providerFallback.policyId, 'provider-failure-only');
  assert.equal(fallbackRunResult.providerFallback.fallbackUsed, true);
  assert.deepEqual(fallbackRunResult.providerFallback.attemptedProviderIds, ['anthropic', 'stub']);

  const recoverablePolicyMissionResponse = await postJson(`${discovery.url}/api/missions`, {
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Verify web mission run stops on non-recoverable failures under recoverable-only policy.',
    title: 'Runtime recoverable-only web mission',
    workspaceId: workspaceResponse.workspace.id,
  });
  const recoverablePolicyRunResponse = await fetch(
    `${discovery.url}/api/missions/${encodeURIComponent(recoverablePolicyMissionResponse.mission.id)}/run`,
    {
      body: JSON.stringify({
        fallbackPolicy: 'recoverable-provider-failure-only',
        fallbackProvider: 'stub',
        provider: 'anthropic',
      }),
      headers: {
        'content-type': 'application/json',
        'X-Request-Id': 'runtime-web-recoverable-policy-run',
      },
      method: 'POST',
    },
  );
  assert.equal(recoverablePolicyRunResponse.status, 200);
  const recoverablePolicyRunResult = await recoverablePolicyRunResponse.json();
  assert.equal(recoverablePolicyRunResult.mission.status, 'failed');
  assert.equal(recoverablePolicyRunResult.provider, 'anthropic');
  assert.equal(recoverablePolicyRunResult.providerFallback.policyId, 'recoverable-provider-failure-only');
  assert.equal(recoverablePolicyRunResult.providerFallback.fallbackUsed, false);
  assert.deepEqual(recoverablePolicyRunResult.providerFallback.attemptedProviderIds, ['anthropic']);
  assert.equal(
    recoverablePolicyRunResult.providerFallback.attempts[0].fallbackStopReason,
    'non-recoverable-provider-failure',
  );

  const remediationActions = await fetchJson(
    `${discovery.url}/api/actions?missionId=${encodeURIComponent(recoverablePolicyMissionResponse.mission.id)}`,
  );
  const remediationAction = remediationActions.items.find((item) => item.actionType === 'provider-attention');
  assert.equal(Boolean(remediationAction), true, JSON.stringify(remediationActions.items));
  assert.equal(remediationAction.fallbackPolicyId, 'provider-failure-only');
  assert.deepEqual(remediationAction.fallbackPolicyOptions, [
    'provider-failure-only',
    'recoverable-provider-failure-only',
  ]);
  assert.match(remediationAction.fallbackRecommendedCommand, /--fallback-provider stub/);
  assert.match(
    remediationAction.recoverableFallbackRecommendedCommand,
    /--fallback-provider stub --fallback-policy recoverable-provider-failure-only/,
  );

  const fallbackRemediationResult = await postJson(
    `${discovery.url}/api/actions/provider-attention/${encodeURIComponent(remediationAction.actionId)}/remediate`,
    {
      fallbackProvider: 'stub',
    },
  );
  assert.equal(fallbackRemediationResult.fallbackPolicy, 'provider-failure-only');
  assert.equal(fallbackRemediationResult.remediationKind, 'mission-fallback-rerun');
  assert.equal(fallbackRemediationResult.primaryProviderId, 'anthropic');
  assert.equal(fallbackRemediationResult.result.missionStatus, 'completed');
  assert.equal(fallbackRemediationResult.result.provider, 'stub');
  assert.equal(fallbackRemediationResult.result.providerFallback.policyId, 'provider-failure-only');
  assert.equal(fallbackRemediationResult.result.providerFallback.fallbackUsed, true);
  assert.deepEqual(fallbackRemediationResult.result.providerFallback.attemptedProviderIds, ['anthropic', 'stub']);

  const recoverableRemediationMissionResponse = await postJson(`${discovery.url}/api/missions`, {
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: 'Verify provider attention remediation API stops strict fallback on non-recoverable provider failures.',
    title: 'Runtime provider attention recoverable remediation mission',
    workspaceId: workspaceResponse.workspace.id,
  });
  const recoverableRemediationRunResult = await postJson(
    `${discovery.url}/api/missions/${encodeURIComponent(recoverableRemediationMissionResponse.mission.id)}/run`,
    {
      provider: 'anthropic',
    },
  );
  assert.equal(recoverableRemediationRunResult.mission.status, 'failed');
  assert.equal(recoverableRemediationRunResult.provider, 'anthropic');

  const recoverableRemediationActions = await fetchJson(
    `${discovery.url}/api/actions?missionId=${encodeURIComponent(recoverableRemediationMissionResponse.mission.id)}`,
  );
  const recoverableRemediationAction = recoverableRemediationActions.items.find(
    (item) => item.actionType === 'provider-attention',
  );
  assert.equal(Boolean(recoverableRemediationAction), true, JSON.stringify(recoverableRemediationActions.items));

  const recoverableRemediationResult = await postJson(
    `${discovery.url}/api/actions/provider-attention/${encodeURIComponent(recoverableRemediationAction.actionId)}/remediate`,
    {
      fallbackPolicy: 'recoverable-provider-failure-only',
      fallbackProvider: 'stub',
    },
  );
  assert.equal(recoverableRemediationResult.fallbackPolicy, 'recoverable-provider-failure-only');
  assert.equal(recoverableRemediationResult.remediationKind, 'mission-fallback-rerun');
  assert.equal(recoverableRemediationResult.primaryProviderId, 'anthropic');
  assert.equal(recoverableRemediationResult.result.missionStatus, 'failed');
  assert.equal(recoverableRemediationResult.result.provider, 'anthropic');
  assert.equal(recoverableRemediationResult.result.providerFallback.policyId, 'recoverable-provider-failure-only');
  assert.equal(recoverableRemediationResult.result.providerFallback.fallbackUsed, false);
  assert.deepEqual(recoverableRemediationResult.result.providerFallback.attemptedProviderIds, ['anthropic']);
  assert.equal(
    recoverableRemediationResult.result.providerFallback.attempts[0].fallbackStopReason,
    'non-recoverable-provider-failure',
  );

  console.log(
    JSON.stringify(
      {
        actualPort: discovery.actualPort,
        mode: 'runtime-discovery',
        ok: true,
        requestedPort,
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  blocker.close();
  await waitForExit(serverProcess);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  assert.equal(response.status === 200 || response.status === 201, true);
  return await response.json();
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return await response.json();
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate local port.'));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function listenBlocker(port) {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function waitForDiscovery(filePath, processHandle) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Server exited early (${processHandle.exitCode}): ${serverOutput.stderr || serverOutput.stdout}`);
    }

    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed?.status === 'listening' && parsed?.url) {
        return parsed;
      }
    }

    await delay(50);
  }

  throw new Error(`Timed out waiting for server discovery file: ${filePath}\n${serverOutput.stderr || serverOutput.stdout}`);
}

async function waitForExit(processHandle) {
  if (processHandle.exitCode !== null) {
    return;
  }

  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    delay(2000),
  ]);
}

function assertMalformedRegistryFallback(rootDir) {
  const varDir = path.join(rootDir, 'var');
  fs.mkdirSync(varDir, { recursive: true });
  fs.writeFileSync(path.join(varDir, 'runtime-jobs.json'), '{ malformed jobs', 'utf8');
  fs.writeFileSync(path.join(varDir, 'runtime-requests.json'), '{ malformed requests', 'utf8');

  const jobRegistry = createRuntimeJobRegistry({ rootDir });
  const requestRegistry = createRuntimeRequestRegistry({ rootDir });

  assert.deepEqual(jobRegistry.readState().active, []);
  assert.deepEqual(jobRegistry.readState().terminal, []);
  assert.equal(jobRegistry.summarize().activeCount, 0);
  assert.deepEqual(requestRegistry.readState().active, []);
  assert.deepEqual(requestRegistry.readState().terminal, []);
  assert.equal(requestRegistry.summarize().activeCount, 0);
}
