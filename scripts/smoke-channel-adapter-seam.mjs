import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CHANNEL_ADAPTER_DISABLED_STOP_REASON,
  CHANNEL_ADAPTER_POLICY_ID,
  CHANNEL_ADAPTER_REGISTRY_SCHEMA_VERSION,
  CHANNEL_ADAPTER_SCHEMA_VERSION,
  buildChannelAdapterSourceContext,
} from '../src/core/channel-adapter-registry.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-channel-adapter-seam-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const help = spawnSync(process.execPath, [cliPath, 'channel', 'adapters', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
  },
});

assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /channel adapters/);
assert.match(help.stdout, /disabled by default/);

const registry = runCli({
  rootDir: tempRoot,
  args: ['channel', 'adapters'],
});

assert.equal(registry.schemaVersion, CHANNEL_ADAPTER_REGISTRY_SCHEMA_VERSION);
assert.equal(registry.policy.id, CHANNEL_ADAPTER_POLICY_ID);
assert.equal(registry.policy.defaultExternalMessagingEnabled, false);
assert.equal(registry.policy.externalAdaptersDisabledByDefault, true);
assert.equal(registry.policy.stopReason, CHANNEL_ADAPTER_DISABLED_STOP_REASON);
assert.equal(registry.summary.adapterCount, 8);
assert.equal(registry.summary.enabledCount, 2);
assert.equal(registry.summary.disabledCount, 6);
assert.equal(registry.summary.externalMessagingAdapterCount, 5);
assert.equal(registry.summary.externalMessagingEnabledCount, 0);
assert.equal(registry.summary.stopReasonCounts[CHANNEL_ADAPTER_DISABLED_STOP_REASON], 6);

const adaptersById = new Map(registry.adapters.map((adapter) => [adapter.id, adapter]));
for (const adapterId of ['cli', 'web', 'schedule', 'slack', 'telegram', 'whatsapp', 'discord', 'email']) {
  assert.ok(adaptersById.has(adapterId), `missing adapter manifest: ${adapterId}`);
  assert.equal(adaptersById.get(adapterId).schemaVersion, CHANNEL_ADAPTER_SCHEMA_VERSION);
  assert.equal(adaptersById.get(adapterId).policyId, CHANNEL_ADAPTER_POLICY_ID);
  assert.equal(adaptersById.get(adapterId).evidencePolicy.noRawSecrets, true);
  assert.equal(adaptersById.get(adapterId).evidencePolicy.noRawCustomerPayloads, true);
  assert.equal(adaptersById.get(adapterId).secretRef, undefined);
}

for (const adapterId of ['slack', 'telegram', 'whatsapp', 'discord', 'email']) {
  const adapter = adaptersById.get(adapterId);
  assert.equal(adapter.enabled, false, `${adapterId} must not be enabled by default`);
  assert.equal(adapter.defaultEnabled, false, `${adapterId} must not default to enabled`);
  assert.equal(adapter.externalMessaging, true, `${adapterId} must be marked external messaging`);
  assert.equal(adapter.externalMessagingEnabled, false, `${adapterId} external messaging must stay disabled`);
  assert.equal(adapter.status, 'disabled');
  assert.equal(adapter.stopReason, CHANNEL_ADAPTER_DISABLED_STOP_REASON);
  assert.equal(adapter.capabilities.messageIngress, false);
  assert.equal(adapter.capabilities.messageEgress, false);
  assert.equal(adapter.capabilities.webhookIngress, false);
  assert.ok(adapter.capabilities.deniedCapabilities.includes('external-dispatch'));
  assert.deepEqual(
    adapter.enablementGates.filter((gate) => gate.required && !gate.satisfied).map((gate) => gate.id),
    [
      'pairing-boundary',
      'identity-binding',
      'workspace-routing',
      'retention-boundary',
      'permission-policy',
      'sandbox-policy',
      'support-boundary',
      'operator-approval',
    ],
  );
}

const enabledOnlyRegistry = runCli({
  rootDir: tempRoot,
  args: ['channel', 'adapters', '--enabled-only'],
});

assert.equal(enabledOnlyRegistry.summary.adapterCount, 2);
assert.deepEqual(enabledOnlyRegistry.adapters.map((adapter) => adapter.id).sort(), ['cli', 'web']);
assert.equal(enabledOnlyRegistry.summary.externalMessagingEnabledCount, 0);

const slackRegistry = runCli({
  rootDir: tempRoot,
  args: ['channel', 'adapters', '--channel', 'slack'],
});

assert.equal(slackRegistry.summary.adapterCount, 1);
assert.equal(slackRegistry.adapters[0].id, 'slack');
assert.equal(slackRegistry.adapters[0].enabled, false);
assert.equal(slackRegistry.adapters[0].stopReason, CHANNEL_ADAPTER_DISABLED_STOP_REASON);

const disabledRegistry = runCli({
  rootDir: tempRoot,
  args: ['channel', 'adapters', '--status', 'disabled'],
});

assert.equal(disabledRegistry.summary.adapterCount, 6);
assert.equal(disabledRegistry.summary.enabledCount, 0);
assert.equal(disabledRegistry.summary.externalMessagingEnabledCount, 0);

const slackSourceContext = buildChannelAdapterSourceContext('slack', {
  command: 'future channel ingress',
  route: 'channel.slack',
});

assert.equal(slackSourceContext.channelAdapterId, 'slack');
assert.equal(slackSourceContext.channelAdapterStatus, 'disabled');
assert.equal(slackSourceContext.channelAdapterStopReason, CHANNEL_ADAPTER_DISABLED_STOP_REASON);
assert.equal(slackSourceContext.externalMessagingEnabled, false);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'channel-adapter-seam-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Channel adapter seam mission',
    '--objective',
    'Verify the existing CLI gateway route carries channel adapter metadata.',
  ],
});

const missionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(missionRun.status, 'completed');
assert.ok(missionRun.gatewayEventId);

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id, '--session', missionRun.sessionId],
});

assert.equal(session.gatewayEvents.length, 1);
const gatewayEvent = session.gatewayEvents[0];
assert.equal(gatewayEvent.source.channel, 'cli');
assert.equal(gatewayEvent.source.sourceType, 'cli');
assert.equal(gatewayEvent.source.surface, 'cli');
assert.equal(gatewayEvent.source.channelAdapterId, 'cli');
assert.equal(gatewayEvent.source.channelAdapterPolicyId, CHANNEL_ADAPTER_POLICY_ID);
assert.equal(gatewayEvent.source.channelAdapterStatus, 'enabled');
assert.equal(gatewayEvent.source.channelAdapterStopReason, null);
assert.equal(gatewayEvent.source.externalMessagingEnabled, false);
assert.equal(gatewayEvent.route.name, 'mission.run');
assert.equal(gatewayEvent.evidencePolicy.noRawSecrets, true);
assert.equal(session.session.sourceContext.channelAdapterId, 'cli');
assert.equal(session.session.sourceContext.externalMessagingEnabled, false);

console.log(
  JSON.stringify(
    {
      adapterCount: registry.summary.adapterCount,
      disabledCount: registry.summary.disabledCount,
      externalMessagingEnabledCount: registry.summary.externalMessagingEnabledCount,
      mode: 'channel-adapter-seam',
      ok: true,
    },
    null,
    2,
  ),
);
