#!/usr/bin/env node
import { GLOBAL_USER_SCOPE_ID } from './core/constants.mjs';
import { createMissionService } from './core/mission-service.mjs';
import { resolveRootDir } from './core/root.mjs';
import { createStore } from './core/store.mjs';

function readOption(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] || fallback;
}

function hasOption(args, name) {
  return args.includes(name);
}

function parseBooleanOption(args, name) {
  const value = readOption(args, name, '');
  if (!value) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function parseConstraints(rawValue) {
  return String(rawValue || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Personal AI Agent

Commands:
  overview global
  overview maintenance [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--outcome <effective|no-op|impactful>] [--since <iso-timestamp>]
  overview operator-timeline
  overview providers

  provider list
  provider check <stub|openai|anthropic|local>
  provider activity [--provider <stub|openai|anthropic|local>] [--role <manager|planner|executor|reviewer>] [--status <executing|completed|failed>]
  provider activity-timeline [--provider <stub|openai|anthropic|local>] [--role <manager|planner|executor|reviewer>] [--status <executing|completed|failed>]
  provider events [--provider <stub|openai|anthropic|local>] [--family <probe|execution|attention>] [--ok <true|false>] [--attempted <true|false>] [--role <manager|planner|executor|reviewer>] [--status <executing|completed|failed>]
  provider probe <stub|openai|anthropic|local>
  provider history [--provider <stub|openai|anthropic|local>] [--ok <true|false>] [--attempted <true|false>]
  provider timeline [--provider <stub|openai|anthropic|local>] [--ok <true|false>] [--attempted <true|false>]

  workspace add <path> [--name <name>]
  workspace list
  workspace show <workspaceId>
  workspace overview <workspaceId>
  workspace timeline <workspaceId>

  mission create --workspace <workspaceId> --mode <engineering|knowledge> --title <title> [--objective <text>] [--deliverable <type>] [--constraints <text|text>]
  mission list
  mission run <missionId> [--provider <stub|openai|anthropic|local>]
  mission show <missionId>
  mission timeline <missionId>

  session list <missionId>
  session show <missionId>
  session show <missionId> --session <sessionId>

  action inbox [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision|provider-attention-required|monitoring-required|handoff-required|maintenance-required>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--needs-reminder] [--overdue]
  action provider-attention [--provider <stub|openai|anthropic|local>] [--workspace <workspaceId>] [--mission <missionId>] [--status <pending|acknowledged|resolved|recovered>] [--needs-reminder] [--overdue]
  action maintenance-history [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--outcome <effective|no-op|impactful>] [--since <iso-timestamp>]
  action reviewer-followups [--workspace <workspaceId>] [--mission <missionId>] [--status <open|resolved>] [--kind <rerun-fixed|superseded|scope-reduced|accepted-risk>]
  action owner-handoffs [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--status <pending|acknowledged>] [--needs-reminder] [--overdue]
  action maintenance [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--note <text>]
  action log-overdue [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>]
  action escalated [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>] [--tier <normal|warning|critical|resolved>] [--needs-reminder]
  action remind-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--tier <normal|warning|critical>] [--due] [--overdue] [--note <text>]
  action remind-owner-handoffs [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--due] [--overdue] [--note <text>]
  action remind-provider-attention [--provider <stub|openai|anthropic|local>] [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--due] [--overdue] [--note <text>]
  action sync-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>]
  action resolve-reviewer-follow-up <actionId> [--kind <rerun-fixed|superseded|scope-reduced|accepted-risk>] [--note <text>]
  action acknowledge-provider-attention <actionId> [--note <text>]
  action resolve-provider-attention <actionId> [--note <text>]
  action acknowledge-owner-handoff <escalationId> [--note <text>]
  action resolve-escalation <escalationId> [--note <text>]
  approval inbox [--workspace <workspaceId>] [--mission <missionId>]
  approval list [--status <pending|approved|rejected>]
  approval resolve <approvalId> --decision <approve|reject> [--reason <text>]

  memory list [--scope <user|workspace|mission>] [--workspace <workspaceId>] [--mission <missionId>]
  memory add --scope <user|workspace|mission> --kind <preference|decision|fact> --content <text> [--workspace <workspaceId>] [--mission <missionId>]

  doc log --type <devlog|incident|reference> --title <title> --content <text>
`);
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function resolveScopeId(scope, args) {
  if (scope === 'user') {
    return GLOBAL_USER_SCOPE_ID;
  }

  if (scope === 'workspace') {
    const workspaceId = readOption(args, '--workspace');
    if (!workspaceId) {
      throw new Error('workspace scope requires --workspace <workspaceId>.');
    }
    return workspaceId;
  }

  if (scope === 'mission') {
    const missionId = readOption(args, '--mission');
    if (!missionId) {
      throw new Error('mission scope requires --mission <missionId>.');
    }
    return missionId;
  }

  return '';
}

async function main() {
  const rootDir = resolveRootDir();
  const store = createStore({ rootDir });
  const service = createMissionService({ store, rootDir });

  const args = process.argv.slice(2);
  const [group, command, ...rest] = args;

  if (!group) {
    printHelp();
    return;
  }

  if (group === 'overview' && command === 'global') {
    printJson(service.getGlobalOverview());
    return;
  }

  if (group === 'overview' && command === 'maintenance') {
    printJson(
      service.getMaintenanceOverview({
        missionId: readOption(rest, '--mission', ''),
        outcome: readOption(rest, '--outcome', ''),
        owner: readOption(rest, '--owner', ''),
        since: readOption(rest, '--since', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'overview' && command === 'operator-timeline') {
    printJson(service.getGlobalOperatorTimeline());
    return;
  }

  if (group === 'overview' && command === 'providers') {
    printJson(service.getProviderOverview());
    return;
  }

  if (group === 'provider' && command === 'list') {
    printJson(service.listProviders());
    return;
  }

  if (group === 'provider' && command === 'check') {
    printJson(service.checkProvider(rest[0]));
    return;
  }

  if (group === 'provider' && command === 'activity') {
    printJson(
      service.getProviderExecutionHistory({
        providerId: readOption(rest, '--provider', ''),
        role: readOption(rest, '--role', ''),
        status: readOption(rest, '--status', ''),
      }),
    );
    return;
  }

  if (group === 'provider' && command === 'activity-timeline') {
    printJson(
      service.getProviderExecutionTimeline({
        providerId: readOption(rest, '--provider', ''),
        role: readOption(rest, '--role', ''),
        status: readOption(rest, '--status', ''),
      }),
    );
    return;
  }

  if (group === 'provider' && command === 'events') {
    printJson(
      service.getProviderEventTimeline({
        attempted: parseBooleanOption(rest, '--attempted'),
        family: readOption(rest, '--family', ''),
        ok: parseBooleanOption(rest, '--ok'),
        providerId: readOption(rest, '--provider', ''),
        role: readOption(rest, '--role', ''),
        status: readOption(rest, '--status', ''),
      }),
    );
    return;
  }

  if (group === 'provider' && command === 'probe') {
    printJson(await service.probeProvider(rest[0]));
    return;
  }

  if (group === 'provider' && command === 'history') {
    printJson(
      service.listProviderProbeHistory({
        attempted: parseBooleanOption(rest, '--attempted'),
        ok: parseBooleanOption(rest, '--ok'),
        providerId: readOption(rest, '--provider', ''),
      }),
    );
    return;
  }

  if (group === 'provider' && command === 'timeline') {
    printJson(
      service.getProviderProbeTimeline({
        attempted: parseBooleanOption(rest, '--attempted'),
        ok: parseBooleanOption(rest, '--ok'),
        providerId: readOption(rest, '--provider', ''),
      }),
    );
    return;
  }

  if (group === 'workspace' && command === 'add') {
    printJson(
      service.addWorkspace({
        workspacePath: rest[0],
        name: readOption(rest, '--name', ''),
      }),
    );
    return;
  }

  if (group === 'workspace' && command === 'list') {
    printJson(store.listWorkspaces());
    return;
  }

  if (group === 'workspace' && command === 'show') {
    printJson(service.getWorkspace(rest[0]));
    return;
  }

  if (group === 'workspace' && command === 'overview') {
    printJson(service.getWorkspaceOverview(rest[0]));
    return;
  }

  if (group === 'workspace' && command === 'timeline') {
    printJson(service.getWorkspaceTimeline(rest[0]));
    return;
  }

  if (group === 'mission' && command === 'create') {
    printJson(
      service.createMission({
        workspaceId: readOption(rest, '--workspace'),
        mode: readOption(rest, '--mode', 'knowledge'),
        title: readOption(rest, '--title', 'Untitled mission'),
        objective: readOption(rest, '--objective', 'Clarify the next best move.'),
        deliverableType: readOption(rest, '--deliverable', ''),
        constraints: parseConstraints(readOption(rest, '--constraints', '')),
      }),
    );
    return;
  }

  if (group === 'mission' && command === 'list') {
    printJson(service.listMissions());
    return;
  }

  if (group === 'mission' && command === 'run') {
    const missionId = rest[0];
    const provider = readOption(rest, '--provider', 'stub');
    const result = await service.runMission(missionId, {
      provider,
      providerSpecified: hasOption(rest, '--provider'),
    });

    printJson({
      approvalId: result.approval ? result.approval.id : null,
      artifactPath: result.artifactPath,
      missionId: result.mission.id,
      provider: result.provider,
      reviewerVerdict: result.reviewerVerdict,
      sessionId: result.session.id,
      status: result.mission.status,
    });
    return;
  }

  if (group === 'mission' && command === 'show') {
    printJson(service.showMission(rest[0]));
    return;
  }

  if (group === 'mission' && command === 'timeline') {
    printJson(service.getMissionTimeline(rest[0]));
    return;
  }

  if (group === 'session' && command === 'show') {
    printJson(
      service.showSession(rest[0], {
        sessionId: readOption(rest, '--session', ''),
      }),
    );
    return;
  }

  if (group === 'session' && command === 'list') {
    printJson(service.listSessions(rest[0]));
    return;
  }

  if (group === 'action' && command === 'inbox') {
    printJson(
      service.getActionInbox({
        actionClass: readOption(rest, '--class', ''),
        effectiveOwner: readOption(rest, '--effective-owner', ''),
        missionId: readOption(rest, '--mission', ''),
        needsReminderOnly: hasOption(rest, '--needs-reminder'),
        owner: readOption(rest, '--owner', ''),
        overdueOnly: hasOption(rest, '--overdue'),
        priority: readOption(rest, '--priority', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'provider-attention') {
    printJson(
      service.getProviderAttentionInbox({
        missionId: readOption(rest, '--mission', ''),
        needsReminderOnly: hasOption(rest, '--needs-reminder'),
        overdueOnly: hasOption(rest, '--overdue'),
        providerId: readOption(rest, '--provider', ''),
        status: readOption(rest, '--status', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'maintenance-history') {
    printJson(
      service.getMaintenanceOverview({
        missionId: readOption(rest, '--mission', ''),
        outcome: readOption(rest, '--outcome', ''),
        owner: readOption(rest, '--owner', ''),
        since: readOption(rest, '--since', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'reviewer-followups') {
    printJson(
      service.getReviewerFollowUpInbox({
        kind: readOption(rest, '--kind', ''),
        missionId: readOption(rest, '--mission', ''),
        status: readOption(rest, '--status', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'owner-handoffs') {
    printJson(
      service.getOwnerHandoffInbox({
        missionId: readOption(rest, '--mission', ''),
        needsReminderOnly: hasOption(rest, '--needs-reminder'),
        owner: readOption(rest, '--owner', ''),
        overdueOnly: hasOption(rest, '--overdue'),
        status: readOption(rest, '--status', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'maintenance') {
    printJson(
      service.runActionMaintenance({
        missionId: readOption(rest, '--mission', ''),
        note: readOption(rest, '--note', ''),
        owner: readOption(rest, '--owner', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'log-overdue') {
    printJson(
      service.logOverdueActions({
        actionClass: readOption(rest, '--class', ''),
        missionId: readOption(rest, '--mission', ''),
        owner: readOption(rest, '--owner', ''),
        priority: readOption(rest, '--priority', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'escalated') {
    printJson(
      service.getEscalatedInbox({
        effectiveOwner: readOption(rest, '--effective-owner', ''),
        missionId: readOption(rest, '--mission', ''),
        needsReminderOnly: hasOption(rest, '--needs-reminder'),
        owner: readOption(rest, '--owner', ''),
        status: readOption(rest, '--status', ''),
        tier: readOption(rest, '--tier', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'sync-escalations') {
    printJson(
      service.syncEscalations({
        missionId: readOption(rest, '--mission', ''),
        owner: readOption(rest, '--owner', ''),
        status: readOption(rest, '--status', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'remind-escalations') {
    printJson(
      service.remindEscalations({
        dueOnly: hasOption(rest, '--due'),
        missionId: readOption(rest, '--mission', ''),
        note: readOption(rest, '--note', ''),
        owner: readOption(rest, '--owner', ''),
        overdueOnly: hasOption(rest, '--overdue'),
        tier: readOption(rest, '--tier', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'remind-owner-handoffs') {
    printJson(
      service.remindOwnerHandoffs(
        {
          dueOnly: hasOption(rest, '--due'),
          missionId: readOption(rest, '--mission', ''),
          owner: readOption(rest, '--owner', ''),
          overdueOnly: hasOption(rest, '--overdue'),
          workspaceId: readOption(rest, '--workspace', ''),
        },
        readOption(rest, '--note', ''),
      ),
    );
    return;
  }

  if (group === 'action' && command === 'remind-provider-attention') {
    printJson(
      service.remindProviderAttention(
        {
          dueOnly: hasOption(rest, '--due'),
          missionId: readOption(rest, '--mission', ''),
          owner: readOption(rest, '--owner', ''),
          overdueOnly: hasOption(rest, '--overdue'),
          providerId: readOption(rest, '--provider', ''),
          workspaceId: readOption(rest, '--workspace', ''),
        },
        readOption(rest, '--note', ''),
      ),
    );
    return;
  }

  if (group === 'action' && command === 'resolve-reviewer-follow-up') {
    printJson(
      service.resolveReviewerFollowUp(rest[0], {
        kind: readOption(rest, '--kind', ''),
        note: readOption(rest, '--note', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'acknowledge-provider-attention') {
    printJson(
      service.acknowledgeProviderAttention(rest[0], {
        note: readOption(rest, '--note', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'resolve-provider-attention') {
    printJson(
      service.resolveProviderAttention(rest[0], {
        note: readOption(rest, '--note', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'acknowledge-owner-handoff') {
    printJson(
      service.acknowledgeOwnerHandoff(rest[0], {
        note: readOption(rest, '--note', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'resolve-escalation') {
    printJson(
      service.resolveEscalation(rest[0], {
        note: readOption(rest, '--note', ''),
      }),
    );
    return;
  }

  if (group === 'approval' && command === 'list') {
    printJson(
      service.listApprovals({
        status: readOption(rest, '--status', ''),
      }),
    );
    return;
  }

  if (group === 'approval' && command === 'inbox') {
    printJson(
      service.getApprovalInbox({
        missionId: readOption(rest, '--mission', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'approval' && command === 'resolve') {
    printJson(
      service.resolveApproval(rest[0], {
        decision: readOption(rest, '--decision'),
        reason: readOption(rest, '--reason', ''),
      }),
    );
    return;
  }

  if (group === 'memory' && command === 'list') {
    const scope = readOption(rest, '--scope', '');
    const filter = {};

    if (scope) {
      filter.scope = scope;
      filter.scopeId = resolveScopeId(scope, rest);
    }

    printJson(service.listMemory(filter));
    return;
  }

  if (group === 'memory' && command === 'add') {
    const scope = readOption(rest, '--scope');
    printJson(
      service.addMemory({
        scope,
        scopeId: resolveScopeId(scope, rest),
        kind: readOption(rest, '--kind'),
        content: readOption(rest, '--content'),
      }),
    );
    return;
  }

  if (group === 'doc' && command === 'log') {
    printJson(
      service.logDocument({
        type: readOption(rest, '--type'),
        title: readOption(rest, '--title'),
        content: readOption(rest, '--content'),
      }),
    );
    return;
  }

  printHelp();
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
