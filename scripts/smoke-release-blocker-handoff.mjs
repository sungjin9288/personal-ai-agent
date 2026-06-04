import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));

assert.equal(
  packageJson.scripts['smoke:release-blocker-handoff'],
  'node scripts/smoke-release-blocker-handoff.mjs',
);

const allBlockers = runCli(['overview', 'release-blockers']);
assert.equal(allBlockers.releaseReadiness.productionReadyClaimAllowed, false);
assert.equal(allBlockers.releaseReadiness.productionReadyBlocked, true);
assert.equal(allBlockers.releaseReadiness.currentOpenBlockerActionCount, 7);
assert.equal(allBlockers.summary.actionCount, 7);
assert.equal(allBlockers.summary.categoryCounts['provider-account'], 2);
assert.equal(allBlockers.summary.categoryCounts['provider-architecture'], 2);
assert.equal(allBlockers.summary.categoryCounts['provider-operations'], 1);
assert.equal(allBlockers.summary.categoryCounts['target-deployment'], 1);
assert.equal(allBlockers.summary.categoryCounts['release-decision'], 1);
assert.equal(allBlockers.summary.providerActionCount, 4);
assert.equal(allBlockers.summary.providerCounts.openai, 1);
assert.equal(allBlockers.summary.providerCounts.anthropic, 1);
assert.equal(allBlockers.summary.providerCounts.local, 1);
assert.equal(allBlockers.summary.providerCounts.hermes, 1);
assert.equal(allBlockers.summary.runtimeAuditCommandCount, 6);
assert.equal(allBlockers.summary.closureVerificationCount, 7);
assert.equal(allBlockers.summary.closureVerificationProductionReadyBlockedCount, 7);
assert.equal(allBlockers.summary.topPriorityProvider, 'anthropic');
assert.match(allBlockers.summary.topPriorityStopReason, /Target Anthropic provider account lacks account ownership proof/);
for (const action of allBlockers.items) {
  assert.equal(action.status, 'blocked');
  assert.equal(action.closureVerification.productionReadyClaimAllowed, false);
  assert.equal(action.closureVerification.sameBoundaryRequired, true);
  assert.equal(action.closureVerification.targetBoundaryRequired, true);
  assert.equal(action.closureVerification.defaultDisposition, 'keep-blocked');
  assert.equal(action.closureVerification.acceptedDispositionValues.includes('closed-after-evidence'), true);
  assert.equal(action.closureVerification.forbiddenEvidence.includes('raw API keys or tokens'), true);
  assert.equal(action.closureVerification.requiredDecisionFields.includes('releaseReadinessNote'), true);
}

const hermesHandoff = runCli(['overview', 'release-blockers', '--provider', 'hermes']);
assert.equal(hermesHandoff.filters.provider, 'hermes');
assert.equal(hermesHandoff.filters.includeSharedProviderOperations, true);
assert.equal(hermesHandoff.filters.sharedProviderOperationsScope, 'included with provider hermes handoff scope');
assert.equal(hermesHandoff.summary.actionCount, 2);
assert.equal(hermesHandoff.summary.categoryCounts['provider-architecture'], 1);
assert.equal(hermesHandoff.summary.categoryCounts['provider-operations'], 1);
assert.equal(hermesHandoff.summary.providerCounts.hermes, 1);
assert.equal(hermesHandoff.summary.runtimeAuditCommandCount, 6);

const hermesProviderAction = hermesHandoff.items.find((item) => item.provider === 'hermes');
assert.equal(Boolean(hermesProviderAction), true, JSON.stringify(hermesHandoff.items));
assert.equal(hermesProviderAction.category, 'provider-architecture');
assert.match(hermesProviderAction.nextEvidence, /HERMES_PROVIDER_MODEL model pinning proof/);
assert.match(hermesProviderAction.stopReason, /Target Hermes provider architecture lacks endpoint ownership proof/);
assert.equal(
  hermesProviderAction.commands.some((command) => command.command === 'npm run smoke:target-hermes-provider-architecture'),
  true,
  JSON.stringify(hermesProviderAction.commands),
);
assert.equal(
  hermesProviderAction.commands.some(
    (command) =>
      command.kind === 'live-validation' &&
      command.command === 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
  ),
  true,
  JSON.stringify(hermesProviderAction.commands),
);
assert.equal(
  hermesProviderAction.evidenceDocs.some(
    (doc) => doc.path === 'docs/target-hermes-provider-architecture-v1.md' && doc.exists === true,
  ),
  true,
  JSON.stringify(hermesProviderAction.evidenceDocs),
);
assert.equal(
  hermesProviderAction.closureVerification.requiredProofs.includes('provider endpoint or model architecture approval proof'),
  true,
  JSON.stringify(hermesProviderAction.closureVerification.requiredProofs),
);

const sharedProviderOperationsAction = hermesHandoff.items.find((item) => item.category === 'provider-operations');
assert.equal(Boolean(sharedProviderOperationsAction), true, JSON.stringify(hermesHandoff.items));
assert.equal(sharedProviderOperationsAction.provider || '', '');
assert.match(sharedProviderOperationsAction.nextEvidence, /provider fallback runtime audit proof with mission run --fallback-provider --fallback-policy/);
assert.match(sharedProviderOperationsAction.stopReason, /recoverable-provider-failure-only stop reason/);
assert.equal(
  sharedProviderOperationsAction.commands.some(
    (command) =>
      command.kind === 'runtime-audit' &&
      command.command === 'npm run smoke:provider-attention-remediation',
  ),
  true,
  JSON.stringify(sharedProviderOperationsAction.commands),
);
assert.equal(
  sharedProviderOperationsAction.closureVerification.requiredProofs.includes('provider fallback runtime audit proof'),
  true,
  JSON.stringify(sharedProviderOperationsAction.closureVerification.requiredProofs),
);
assert.equal(
  sharedProviderOperationsAction.evidenceDocs.some(
    (doc) => doc.path === 'docs/target-provider-operations-v1.md' && doc.exists === true,
  ),
  true,
  JSON.stringify(sharedProviderOperationsAction.evidenceDocs),
);

const hermesOnly = runCli(['overview', 'release-blockers', '--provider', 'hermes', '--without-shared']);
assert.equal(hermesOnly.filters.includeSharedProviderOperations, false);
assert.equal(
  hermesOnly.filters.sharedProviderOperationsScope,
  'excluded for provider-only hermes handoff; handle shared provider-operations evidence separately',
);
assert.equal(hermesOnly.summary.actionCount, 1);
assert.equal(hermesOnly.items[0].provider, 'hermes');
assert.equal(hermesOnly.items[0].category, 'provider-architecture');

const providerOpsOnly = runCli(['overview', 'release-blockers', '--category', 'provider-operations']);
assert.equal(providerOpsOnly.filters.sharedProviderOperationsScope, 'included for full release blocker handoff scope');
assert.equal(providerOpsOnly.summary.actionCount, 1);
assert.equal(providerOpsOnly.summary.runtimeAuditCommandCount, 6);
assert.equal(providerOpsOnly.items[0].category, 'provider-operations');
assert.equal(
  providerOpsOnly.items[0].closureVerification.requiredCommands.some(
    (command) => command.command === 'npm run smoke:workspace-timeline' && command.kind === 'runtime-audit',
  ),
  true,
  JSON.stringify(providerOpsOnly.items[0].closureVerification.requiredCommands),
);

const providerOpsOwner = runCli(['overview', 'release-blockers', '--owner', 'provider-ops']);
assert.equal(providerOpsOwner.summary.actionCount, 5);
assert.equal(providerOpsOwner.summary.ownerCounts['provider-ops'], 5);
assert.equal(providerOpsOwner.summary.categoryCounts['provider-account'], 2);
assert.equal(providerOpsOwner.summary.categoryCounts['provider-architecture'], 2);
assert.equal(providerOpsOwner.summary.categoryCounts['provider-operations'], 1);

const help = runCliText(['overview', 'release-blockers', '--help']);
assert.match(help, /overview release-blockers/);
assert.match(help, /--without-shared/);
assert.match(help, /productionReadyClaim=false policy/);

const apiSmoke = await runReleaseBlockerHandoffApiSmoke();

console.log(
  JSON.stringify(
    {
      mode: 'release-blocker-handoff-smoke',
      ok: true,
      apiProviderScopedActionCount: apiSmoke.providerScopedActionCount,
      apiWithoutSharedActionCount: apiSmoke.withoutSharedActionCount,
      providerScopedActionCount: hermesHandoff.summary.actionCount,
      totalActionCount: allBlockers.summary.actionCount,
    },
    null,
    2,
  ),
);

function runCli(args) {
  return JSON.parse(runCliText(args));
}

function runCliText(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  return String(result.stdout || '').trim();
}

async function runReleaseBlockerHandoffApiSmoke() {
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
    const baseUrl = await waitForServer(serverProcess, serverOutput);
    const hermesApiHandoff = await fetchJson(`${baseUrl}/api/execution-v1/release-blockers?provider=hermes`);

    assert.equal(hermesApiHandoff.filters.provider, 'hermes');
    assert.equal(hermesApiHandoff.filters.includeSharedProviderOperations, true);
    assert.equal(hermesApiHandoff.filters.sharedProviderOperationsScope, 'included with provider hermes handoff scope');
    assert.equal(hermesApiHandoff.summary.actionCount, 2);
    assert.equal(hermesApiHandoff.summary.categoryCounts['provider-architecture'], 1);
    assert.equal(hermesApiHandoff.summary.categoryCounts['provider-operations'], 1);
    assert.equal(hermesApiHandoff.summary.providerCounts.hermes, 1);
    assert.equal(hermesApiHandoff.releaseReadiness.productionReadyClaimAllowed, false);
    assert.equal(hermesApiHandoff.releaseReadiness.productionReadyBlocked, true);

    const hermesApiProviderAction = hermesApiHandoff.items.find((item) => item.provider === 'hermes');
    assert.equal(Boolean(hermesApiProviderAction), true, JSON.stringify(hermesApiHandoff.items));
    assert.equal(hermesApiProviderAction.category, 'provider-architecture');
    assert.match(hermesApiProviderAction.stopReason, /Target Hermes provider architecture lacks endpoint ownership proof/);
    assert.equal(
      hermesApiProviderAction.closureVerification.requiredProofs.includes(
        'provider endpoint or model architecture approval proof',
      ),
      true,
      JSON.stringify(hermesApiProviderAction.closureVerification.requiredProofs),
    );

    const hermesApiEvidenceDoc = hermesApiProviderAction.evidenceDocs.find(
      (doc) => doc.path === 'docs/target-hermes-provider-architecture-v1.md',
    );
    assert.equal(Boolean(hermesApiEvidenceDoc), true, JSON.stringify(hermesApiProviderAction.evidenceDocs));
    assert.equal(hermesApiEvidenceDoc.exists, true, JSON.stringify(hermesApiEvidenceDoc));
    assert.equal(
      hermesApiEvidenceDoc.href,
      '/api/execution-v1/release-doc?path=docs%2Ftarget-hermes-provider-architecture-v1.md',
      JSON.stringify(hermesApiEvidenceDoc),
    );

    const hermesDocResponse = await fetch(`${baseUrl}${hermesApiEvidenceDoc.href}`);
    assert.equal(hermesDocResponse.status, 200);
    assert.match(hermesDocResponse.headers.get('content-type') || '', /^text\/markdown/);
    assert.match(await hermesDocResponse.text(), /Target Hermes Provider Architecture/i);

    const sharedApiAction = hermesApiHandoff.items.find((item) => item.category === 'provider-operations');
    assert.equal(Boolean(sharedApiAction), true, JSON.stringify(hermesApiHandoff.items));
    assert.equal(sharedApiAction.provider || '', '');
    assert.match(sharedApiAction.stopReason, /recoverable-provider-failure-only stop reason/);

    const hermesWithoutShared = await fetchJson(
      `${baseUrl}/api/execution-v1/release-blockers?provider=hermes&withoutShared=true`,
    );
    assert.equal(hermesWithoutShared.filters.includeSharedProviderOperations, false);
    assert.equal(
      hermesWithoutShared.filters.sharedProviderOperationsScope,
      'excluded for provider-only hermes handoff; handle shared provider-operations evidence separately',
    );
    assert.equal(hermesWithoutShared.summary.actionCount, 1);
    assert.equal(hermesWithoutShared.items[0].provider, 'hermes');
    assert.equal(hermesWithoutShared.items[0].category, 'provider-architecture');

    const hermesIncludeSharedFalse = await fetchJson(
      `${baseUrl}/api/execution-v1/release-blockers?provider=hermes&includeShared=false`,
    );
    assert.equal(hermesIncludeSharedFalse.filters.includeSharedProviderOperations, false);
    assert.equal(
      hermesIncludeSharedFalse.filters.sharedProviderOperationsScope,
      'excluded for provider-only hermes handoff; handle shared provider-operations evidence separately',
    );
    assert.equal(hermesIncludeSharedFalse.summary.actionCount, 1);

    const providerOpsOnly = await fetchJson(
      `${baseUrl}/api/execution-v1/release-blockers?category=provider-operations&owner=provider-ops`,
    );
    assert.equal(
      providerOpsOnly.filters.sharedProviderOperationsScope,
      'included for full release blocker handoff scope',
    );
    assert.equal(providerOpsOnly.summary.actionCount, 1);
    assert.equal(providerOpsOnly.items[0].category, 'provider-operations');
    assert.equal(providerOpsOnly.items[0].owner, 'provider-ops');
    assert.equal(
      providerOpsOnly.items[0].commands.some(
        (command) => command.kind === 'runtime-audit' && command.command === 'npm run smoke:provider-events',
      ),
      true,
      JSON.stringify(providerOpsOnly.items[0].commands),
    );

    return {
      providerScopedActionCount: hermesApiHandoff.summary.actionCount,
      withoutSharedActionCount: hermesWithoutShared.summary.actionCount,
    };
  } finally {
    serverProcess.kill('SIGTERM');
    await waitForExit(serverProcess);
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function waitForServer(processHandle, serverOutput, { timeoutMs = 10_000 } = {}) {
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
