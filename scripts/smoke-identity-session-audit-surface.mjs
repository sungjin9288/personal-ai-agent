import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IDENTITY_SESSION_CONTEXT_POLICY_ID } from '../src/core/identity-session-context-service.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-identity-session-audit-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const help = spawnSync(process.execPath, [cliPath, 'overview', 'identity-sessions', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
  },
});
assert.equal(help.status, 0);
assert.match(help.stdout, /overview identity-sessions/);
assert.match(help.stdout, /identitySessionContext records/);
assert.match(help.stdout, /without raw secrets or customer payloads/);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'identity-session-audit-workspace'],
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
    'Identity session audit surface',
    '--objective',
    'Verify operator identity/session audit summaries are derived from gateway records.',
  ],
});

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(run.status, 'completed');

const audit = runCli({
  rootDir: tempRoot,
  args: ['overview', 'identity-sessions'],
});

assert.equal(audit.summary.recordCount, 2);
assert.equal(audit.summary.bindingStatusCounts.bound, 2);
assert.equal(audit.summary.policyCounts[IDENTITY_SESSION_CONTEXT_POLICY_ID], 2);
assert.equal(audit.summary.sourceTypeCounts.cli, 2);
assert.equal(audit.summary.channelCounts.cli, 2);
assert.equal(audit.summary.channelAdapterStatusCounts.enabled, 2);
assert.equal(audit.summary.workspaceCounts[workspace.id], 2);
assert.equal(audit.summary.missionCounts[mission.id], 2);
assert.equal(audit.summary.providerCounts.stub, 1);
assert.equal(audit.summary.providerCounts.none, 1);
assert.equal(audit.summary.memoryScopeCounts.mission, 2);
assert.equal(audit.summary.memoryLookupAfterBindingCount, 2);
assert.equal(audit.summary.sessionSeparationRequiredCount, 2);
assert.equal(audit.summary.externalMessagingEnabledCount, 0);
assert.equal(audit.summary.crossScopePromotionAllowedCount, 0);
assert.equal(audit.summary.evidencePolicy.noRawSecretsCount, 2);
assert.equal(audit.summary.evidencePolicy.noRawCustomerPayloadsCount, 2);
assert.equal(audit.summary.evidencePolicy.rawPayloadIncluded, false);
assert.equal(audit.summary.stopReason, '');
assert.equal(audit.summary.productionReadyClaim, false);
assert.equal(audit.summary.targetIdentitySessionOperationsClaimAllowed, false);
assert.equal(audit.summary.latestRecord.sessionId, run.sessionId);

const createRecord = audit.records.find((record) => record.gatewayEventType === 'mission-create');
assert.ok(createRecord);
assert.equal(createRecord.sessionRequired, false);
assert.equal(createRecord.sessionBound, false);
assert.equal(createRecord.bindingStatus, 'bound');
assert.equal(createRecord.providerId, null);

const runRecord = audit.records.find((record) => record.gatewayEventType === 'mission-run');
assert.ok(runRecord);
assert.equal(runRecord.identitySessionContextId, `${run.gatewayEventId}:identity-session`);
assert.equal(runRecord.gatewayEventId, run.gatewayEventId);
assert.equal(runRecord.sessionId, run.sessionId);
assert.equal(runRecord.sessionRequired, true);
assert.equal(runRecord.sessionBound, true);
assert.equal(runRecord.sourceType, 'cli');
assert.equal(runRecord.channelAdapterId, 'cli');
assert.equal(runRecord.evidencePolicy.rawPayloadIncluded, false);
assert.match(runRecord.detail, /identity\/session bound for mission\.run via cli/);

const workspaceFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'identity-sessions', '--workspace', workspace.id],
});
assert.equal(workspaceFiltered.summary.recordCount, 2);
assert.equal(workspaceFiltered.summary.filter.workspaceId, workspace.id);

const missionFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'identity-sessions', '--mission', mission.id, '--binding-status', 'bound'],
});
assert.equal(missionFiltered.summary.recordCount, 2);
assert.equal(missionFiltered.summary.filter.bindingStatus, 'bound');
assert.equal(missionFiltered.records.every((record) => record.bindingStatus === 'bound'), true);

const sessionFiltered = runCli({
  rootDir: tempRoot,
  args: ['overview', 'identity-sessions', '--session', run.sessionId, '--source-type', 'cli'],
});
assert.equal(sessionFiltered.summary.recordCount, 1);
assert.equal(sessionFiltered.summary.filter.sessionId, run.sessionId);
assert.equal(sessionFiltered.records[0].gatewayEventType, 'mission-run');

const emptySince = runCli({
  rootDir: tempRoot,
  args: ['overview', 'identity-sessions', '--since', '2999-01-01T00:00:00.000Z'],
});
assert.equal(emptySince.summary.recordCount, 0);
assert.equal(emptySince.summary.stopReason, 'no-identity-session-context-records');

console.log(
  JSON.stringify(
    {
      identitySessionAuditCount: audit.summary.recordCount,
      latestIdentitySessionContextId: audit.summary.latestRecord.identitySessionContextId,
      mode: 'identity-session-audit-surface',
      ok: true,
    },
    null,
    2,
  ),
);
