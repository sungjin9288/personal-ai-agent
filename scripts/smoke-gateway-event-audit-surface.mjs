import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GATEWAY_EVENT_SCHEMA_VERSION } from '../src/core/gateway-event-service.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-gateway-event-audit-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const help = spawnSync(process.execPath, [cliPath, 'overview', 'gateway-events', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
  },
});
assert.equal(help.status, 0);
assert.match(help.stdout, /overview gateway-events/);
assert.match(help.stdout, /gatewayEvent records/);
assert.match(help.stdout, /permission decisions/);
assert.match(help.stdout, /sandbox decisions/);
assert.match(help.stdout, /without raw secrets or customer payloads/);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'gateway-event-audit-workspace'],
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
    'Gateway event audit surface',
    '--objective',
    'Verify operator gateway event audit summaries are derived from policy records.',
  ],
});
assert.ok(mission.gatewayEventId, 'mission create should expose a gateway event id');

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(run.status, 'completed');
assert.ok(run.gatewayEventId, 'mission run should expose a gateway event id');

const audit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'gateway-events'],
});

assert.equal(audit.summary.recordCount, 2);
assert.equal(audit.summary.eventTypeCounts['mission-create'], 1);
assert.equal(audit.summary.eventTypeCounts['mission-run'], 1);
assert.equal(audit.summary.routeCounts['mission.create'], 1);
assert.equal(audit.summary.routeCounts['mission.run'], 1);
assert.equal(audit.summary.sourceTypeCounts.cli, 2);
assert.equal(audit.summary.channelCounts.cli, 2);
assert.equal(audit.summary.channelAdapterStatusCounts.enabled, 2);
assert.equal(audit.summary.identitySessionContextCount, 2);
assert.equal(audit.summary.identityBindingStatusCounts.bound, 2);
assert.equal(audit.summary.permissionDecisionCount, 2);
assert.equal(audit.summary.permissionDecisionResultCounts.allow, 2);
assert.equal(audit.summary.permissionDecisionPolicyCounts['local-runtime-gateway-permission/v1'], 2);
assert.equal(audit.summary.permissionApprovalRequiredCount, 0);
assert.equal(audit.summary.sandboxDecisionCount, 2);
assert.equal(audit.summary.sandboxModeCounts['local-runtime'], 2);
assert.equal(audit.summary.sandboxPolicyCounts['local-runtime-sandbox-policy/v1'], 2);
assert.equal(audit.summary.providerCounts.stub, 1);
assert.equal(audit.summary.providerCounts.none, 1);
assert.equal(audit.summary.providerFallbackRequestedCount, 0);
assert.deepEqual(audit.summary.providerFallbackPolicyCounts, {});
assert.equal(audit.summary.workspaceCounts[workspace.id], 2);
assert.equal(audit.summary.missionCounts[mission.id], 2);
assert.equal(audit.summary.evidencePolicy.artifactEligibleCount, 2);
assert.equal(audit.summary.evidencePolicy.noRawSecretsCount, 2);
assert.equal(audit.summary.evidencePolicy.noRawCustomerPayloadsCount, 2);
assert.equal(audit.summary.evidencePolicy.rawPayloadIncluded, false);
assert.equal(audit.summary.evidencePolicy.routeVisibleInTimelineCount, 2);
assert.equal(audit.summary.stopReason, '');
assert.equal(audit.summary.productionReadyClaim, false);
assert.equal(audit.summary.latestRecord.sessionId, run.sessionId);

const createRecord = audit.records.find((record) => record.eventType === 'mission-create');
assert.ok(createRecord);
assert.equal(createRecord.gatewayEventId, mission.gatewayEventId);
assert.equal(createRecord.schemaVersion, GATEWAY_EVENT_SCHEMA_VERSION);
assert.equal(createRecord.route, 'mission.create');
assert.equal(createRecord.sessionId, null);
assert.equal(createRecord.providerId, null);
assert.equal(createRecord.evidencePolicy.rawPayloadIncluded, false);

const runRecord = audit.records.find((record) => record.eventType === 'mission-run');
assert.ok(runRecord);
assert.equal(runRecord.gatewayEventId, run.gatewayEventId);
assert.equal(runRecord.schemaVersion, GATEWAY_EVENT_SCHEMA_VERSION);
assert.equal(runRecord.route, 'mission.run');
assert.equal(runRecord.sessionId, run.sessionId);
assert.equal(runRecord.providerId, 'stub');
assert.equal(runRecord.identitySessionContextId, `${run.gatewayEventId}:identity-session`);
assert.equal(runRecord.identityBindingStatus, 'bound');
assert.equal(runRecord.permissionDecisionId, `${run.gatewayEventId}:permission`);
assert.equal(runRecord.permissionDecisionResult, 'allow');
assert.equal(runRecord.permissionPolicyId, 'local-runtime-gateway-permission/v1');
assert.equal(runRecord.sandboxDecisionId, `${run.gatewayEventId}:sandbox`);
assert.equal(runRecord.sandboxMode, 'local-runtime');
assert.equal(runRecord.sandboxPolicyId, 'local-runtime-sandbox-policy/v1');
assert.equal(runRecord.sourceType, 'cli');
assert.equal(runRecord.channelAdapterId, 'cli');
assert.equal(runRecord.channelAdapterStatus, 'enabled');
assert.equal(runRecord.externalMessagingEnabled, false);
assert.equal(runRecord.providerFallbackRequested, false);
assert.match(runRecord.detail, /identity\/session bound for mission\.run via cli/);
assert.match(runRecord.detail, /permission allow for mission-run on mission/);
assert.match(runRecord.detail, /sandbox local-runtime for mission-run on mission/);

const workspaceFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'gateway-events', '--workspace', workspace.id],
});
assert.equal(workspaceFiltered.summary.recordCount, 2);
assert.equal(workspaceFiltered.summary.filter.workspaceId, workspace.id);

const missionRunFiltered = runCli({
  rootDir: tempRoot,
  args: [
    'overview',
    'gateway-events',
    '--mission',
    mission.id,
    '--event-type',
    'mission-run',
    '--permission-decision',
    'allow',
    '--sandbox-mode',
    'local-runtime',
    '--source-type',
    'cli',
  ],
});
assert.equal(missionRunFiltered.summary.recordCount, 1);
assert.equal(missionRunFiltered.summary.filter.eventType, 'mission-run');
assert.equal(missionRunFiltered.summary.filter.permissionDecision, 'allow');
assert.equal(missionRunFiltered.summary.filter.sandboxMode, 'local-runtime');
assert.equal(missionRunFiltered.records[0].gatewayEventId, run.gatewayEventId);

const routeFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'gateway-events', '--route', 'mission.create'],
});
assert.equal(routeFiltered.summary.recordCount, 1);
assert.equal(routeFiltered.records[0].gatewayEventId, mission.gatewayEventId);

const sessionFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'gateway-events', '--session', run.sessionId],
});
assert.equal(sessionFiltered.summary.recordCount, 1);
assert.equal(sessionFiltered.summary.filter.sessionId, run.sessionId);
assert.equal(sessionFiltered.records[0].eventType, 'mission-run');

const emptySince = runCli({
  rootDir: tempRoot,
  args: ['overview', 'gateway-events', '--since', '2999-01-01T00:00:00.000Z'],
});
assert.equal(emptySince.summary.recordCount, 0);
assert.equal(emptySince.summary.stopReason, 'no-gateway-events');

console.log(
  JSON.stringify(
    {
      gatewayEventAuditCount: audit.summary.recordCount,
      latestGatewayEventId: audit.summary.latestRecord.gatewayEventId,
      mode: 'gateway-event-audit-surface',
      ok: true,
    },
    null,
    2,
  ),
);
