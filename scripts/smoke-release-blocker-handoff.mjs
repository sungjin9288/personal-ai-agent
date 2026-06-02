import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
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
assert.equal(hermesOnly.summary.actionCount, 1);
assert.equal(hermesOnly.items[0].provider, 'hermes');
assert.equal(hermesOnly.items[0].category, 'provider-architecture');

const providerOpsOnly = runCli(['overview', 'release-blockers', '--category', 'provider-operations']);
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

console.log(
  JSON.stringify(
    {
      mode: 'release-blocker-handoff-smoke',
      ok: true,
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
