import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  referenceAdoptionSmokeScriptCount,
  requiredReferenceAdoptionSmokeScripts,
} from './reference-adoption-scripts.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const requestedPort = await getFreePort();
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
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
  const baseUrl = await waitForServer(serverProcess);
  const status = await fetchJson(`${baseUrl}/api/execution-v1/status`);
  const isArtifactSyncCommit = status.artifactSyncCommit?.detected === true;
  const verifiedCommit = isArtifactSyncCommit ? status.artifactSyncCommit.verifiedCommit : status.currentCommit;

  assert.equal(status.artifactsMatchCurrentHead, true);
  assert.match(status.artifactState, /^(current|committed-current|local-current|artifact-sync-current)$/);
  assert.equal(status.commit, verifiedCommit);
  if (isArtifactSyncCommit) {
    assert.notEqual(status.currentCommit, verifiedCommit);
    assert.equal(status.artifactSyncCommit.currentCommit, status.currentCommit);
    assert.equal(status.artifactSyncCommit.changedPaths.length > 0, true);
    assert.equal(
      status.artifactSyncCommit.changedPaths.every((filePath) => isReleaseArtifactSyncPath(filePath)),
      true,
      JSON.stringify(status.artifactSyncCommit),
    );
    assert.equal(status.stale, false);
    assert.deepEqual(status.staleReasons, []);
    assert.equal(status.snapshotEligibility.allowed, false);
    assert.match(status.snapshotEligibility.reason, /artifact sync|release artifact sync/i);
    assert.equal(
      status.recommendedActions.some((entry) => entry.action === 'archive-release-snapshot'),
      false,
      JSON.stringify(status.recommendedActions),
    );
  } else {
    assert.equal(status.currentCommit, verifiedCommit);
  }
  assert.equal(typeof status.evidence?.generatedAt, 'string');
  assert.equal(typeof status.closeout?.generatedAt, 'string');
  assert.equal(typeof status.handoff?.generatedAt, 'string');
  assert.equal(status.handoff?.commit, verifiedCommit);
  assert.equal(status.summary.handoffReady, true);
  assert.equal(
    status.refreshPlan.affectsPaths.some((item) => String(item || '').endsWith('docs/execution-v1-handoff.md')),
    true,
    JSON.stringify(status.refreshPlan),
  );

  assert.equal(status.summary.coreDeterministicPassed, 4);
  assert.equal(status.summary.coreDeterministicTotal, 4);
  assert.equal(status.summary.deterministicPassed, 8);
  assert.equal(status.summary.deterministicTotal, 8);
  assert.equal(status.summary.deterministicRuntimeTotal, 8);
  assert.equal(status.summary.referenceAdoptionPassed, 1);
  assert.equal(status.summary.referenceAdoptionTotal, 1);
  assert.equal(status.summary.referenceAdoptionReady, true);
  assert.equal(status.summary.referenceAdoptionAggregateScriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.summary.baselineReferenceAdoptionAggregateScriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.summary.executionV1HelperPassed, 1);
  assert.equal(status.summary.executionV1HelperTotal, 1);
  assert.equal(status.summary.executionV1HelperReady, true);
  assert.equal(status.summary.productionReadinessGatePassed, 1);
  assert.equal(status.summary.productionReadinessGateTotal, 1);
  assert.equal(status.summary.productionReadinessGateReady, true);
  assert.equal(status.referenceAdoptionAggregate?.scriptCount, referenceAdoptionSmokeScriptCount);
  assert.equal(status.baseline?.referenceAdoptionAggregate?.scriptCount, referenceAdoptionSmokeScriptCount);
  for (const scriptPath of requiredReferenceAdoptionSmokeScripts) {
    const currentAggregateScript = status.referenceAdoptionAggregate.scripts.find(
      (entry) => entry.script === scriptPath && entry.status === 'passed',
    );
    const baselineAggregateScript = status.baseline.referenceAdoptionAggregate.scripts.find(
      (entry) => entry.script === scriptPath && entry.status === 'passed',
    );
    assert.equal(
      Boolean(currentAggregateScript),
      true,
      `missing current reference adoption aggregate script: ${scriptPath}`,
    );
    assert.equal(
      Boolean(baselineAggregateScript),
      true,
      `missing baseline reference adoption aggregate script: ${scriptPath}`,
    );
    assert.equal(typeof currentAggregateScript.timeout, 'string', JSON.stringify(currentAggregateScript));
    assert.equal(currentAggregateScript.timedOut, false, JSON.stringify(currentAggregateScript));
    assert.equal(typeof baselineAggregateScript.timeout, 'string', JSON.stringify(baselineAggregateScript));
    assert.equal(baselineAggregateScript.timedOut, false, JSON.stringify(baselineAggregateScript));
  }

  assert.equal(status.values['reference adoption gate'], 'ready');
  assert.equal(status.values['deterministic runtime summary'], 'ready');
  assert.equal(status.values['handoff generator'], 'ready');
  assert.equal(status.values['browser interaction e2e'], 'ready');
  assert.equal(status.values['openai live validation'], 'passed');
  assert.match(status.values['anthropic live validation'], /^failed /);
  assert.equal(
    status.providerReadiness.some(
      (entry) =>
        entry.provider === 'openai' &&
        entry.command === 'npm run live:execution-v1:openai' &&
        entry.evidenceCommand === 'node scripts/build-execution-v1-evidence.mjs --live-openai',
    ),
    true,
    JSON.stringify(status.providerReadiness),
  );
  assert.equal(
    status.recommendedActions.some((entry) => entry.provider === 'openai'),
    false,
    JSON.stringify(status.recommendedActions),
  );
  assert.equal(
    status.recommendedActions.some(
      (entry) =>
        entry.provider === 'anthropic' &&
        entry.envKey === 'ANTHROPIC_API_KEY' &&
        entry.command === 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic' &&
        entry.liveCommand === 'npm run live:execution-v1:anthropic' &&
        entry.evidenceCommand === 'node scripts/build-execution-v1-evidence.mjs --live-anthropic',
    ),
    true,
    JSON.stringify(status.recommendedActions),
  );
  assert.equal(
    status.recommendedActions.some(
      (entry) =>
        entry.provider === 'hermes' &&
        entry.envKey === 'HERMES_PROVIDER_MODEL' &&
        entry.command === 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes' &&
        entry.liveCommand === 'npm run live:execution-v1:hermes',
    ),
    true,
    JSON.stringify(status.recommendedActions),
  );

  const expectedScripts = [
    'smoke:execution-flow',
    'smoke:execution-cli',
    'smoke:ui-execution-console',
    'smoke:ui-execution-browser-e2e',
    'smoke:reference-adoptions',
    'smoke:execution-v1-live-helpers',
    'smoke:execution-v1-handoff',
    'smoke:production-readiness-gate',
  ];
  for (const script of expectedScripts) {
    assert.equal(
      status.deterministic.some((entry) => entry.script === script && entry.status === 'passed'),
      true,
      `missing passed deterministic script: ${script}`,
    );
    assert.equal(
      status.deterministicRuntime.some(
        (entry) =>
          entry.script === script &&
          typeof entry.elapsed === 'string' &&
          typeof entry.stdout === 'string' &&
          typeof entry.stderr === 'string' &&
          typeof entry.timeout === 'string',
      ),
      true,
      `missing deterministic runtime summary: ${script}`,
    );
  }

  assert.equal(status.snapshot?.exists, true);
  assert.equal(status.snapshot.matchesCurrentHead, true);
  assert.equal(status.snapshot.matchesGeneratedCommit, true);
  assert.equal(status.snapshot.verifiedCommit, verifiedCommit);
  assert.equal(
    String(status.snapshot.handoffPath || '').endsWith(`docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`),
    true,
    JSON.stringify(status.snapshot),
  );

  const artifactIds = new Set(status.handoffArtifacts.map((artifact) => artifact.id));
  for (const artifactId of ['browser-report', 'browser-screenshot', 'visual-evidence-manifest-json']) {
    assert.equal(artifactIds.has(artifactId), true, `missing handoff artifact: ${artifactId}`);
    assert.equal(
      status.handoffArtifacts.some((artifact) => artifact.id === artifactId && artifact.exists === true),
      true,
      `handoff artifact is not available: ${artifactId}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        artifactState: status.artifactState,
        artifactSyncCommit: isArtifactSyncCommit,
        branch: status.currentBranch,
        commit: status.currentCommit,
        deterministic: `${status.summary.deterministicPassed}/${status.summary.deterministicTotal}`,
        ok: true,
        referenceAdoptionReady: status.summary.referenceAdoptionReady,
        runtimeRows: status.summary.deterministicRuntimeTotal,
        snapshotCommit: status.snapshot.verifiedCommit,
      },
      null,
      2,
    ),
  );
} finally {
  serverProcess.kill('SIGTERM');
  await waitForExit(serverProcess, { timeoutMs: 5_000 });
}

function isReleaseArtifactSyncPath(filePath) {
  const relativePath = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return [
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-handoff.md',
    'docs/clean-deployment-release-v1.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-like-release-drill-v1.md',
    'docs/production-slo-operating-v1.md',
    'docs/production-retention-operating-v1.md',
    'docs/production-provider-readiness-v1.md',
    'docs/production-enterprise-controls-v1.md',
    'docs/target-slo-operations-v1.md',
    'docs/release-readiness-v1.md',
  ].includes(relativePath) || relativePath.startsWith('docs/releases/execution-v1/');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function waitForServer(processHandle, { timeoutMs = 10_000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      throw new Error(`server exited early: ${serverOutput.stderr || serverOutput.stdout}`);
    }

    const match = serverOutput.stdout.match(/"url":\s*"([^"]+)"/);
    if (match) {
      return match[1];
    }

    await delay(100);
  }

  throw new Error(`server did not start: ${serverOutput.stderr || serverOutput.stdout}`);
}

async function waitForExit(processHandle, { timeoutMs = 5_000 } = {}) {
  if (processHandle.exitCode !== null) {
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (processHandle.exitCode !== null) {
      return;
    }
    await delay(100);
  }

  processHandle.kill('SIGKILL');
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
