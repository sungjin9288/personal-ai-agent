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
  overview operator-timeline

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

  action inbox [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision|monitoring-required>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--overdue]
  action reviewer-followups [--workspace <workspaceId>] [--mission <missionId>] [--status <open|resolved>] [--kind <rerun-fixed|superseded|scope-reduced|accepted-risk>]
  action log-overdue [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>]
  action escalated [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>] [--tier <normal|warning|critical|resolved>] [--needs-reminder]
  action remind-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--tier <normal|warning|critical>] [--due] [--overdue] [--note <text>]
  action sync-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>]
  action resolve-reviewer-follow-up <actionId> [--kind <rerun-fixed|superseded|scope-reduced|accepted-risk>] [--note <text>]
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

function main() {
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

  if (group === 'overview' && command === 'operator-timeline') {
    printJson(service.getGlobalOperatorTimeline());
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
    const result = service.runMission(missionId, {
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
        owner: readOption(rest, '--owner', ''),
        overdueOnly: hasOption(rest, '--overdue'),
        priority: readOption(rest, '--priority', ''),
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

  if (group === 'action' && command === 'resolve-reviewer-follow-up') {
    printJson(
      service.resolveReviewerFollowUp(rest[0], {
        kind: readOption(rest, '--kind', ''),
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
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
