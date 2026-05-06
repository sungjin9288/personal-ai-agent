#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { GLOBAL_USER_SCOPE_ID } from './core/constants.mjs';
import {
  convertMissionAttachmentFile,
  getDocumentConversionCapabilities,
} from './core/document-conversion-service.mjs';
import { createId } from './core/id.mjs';
import { createMissionService } from './core/mission-service.mjs';
import { compactOutputFile } from './core/output-compaction-service.mjs';
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

function readOptions(args, name) {
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) {
      continue;
    }
    const value = args[index + 1];
    if (value) {
      values.push(value);
    }
  }

  return values;
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

function parsePositiveIntegerOption(args, name) {
  const value = readOption(args, name, '');
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseConstraints(rawValue) {
  return String(rawValue || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendUnique(list, value) {
  return list.includes(value) ? list : [...list, value];
}

function printHelp() {
  console.log(`Personal AI Agent

Commands:
  overview global [--provider-since <iso-timestamp>]
  overview maintenance [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--outcome <effective|no-op|impactful>] [--since <iso-timestamp>]
  overview operator-timeline [--provider-since <iso-timestamp>]
  overview profiles [--workspace <workspaceId>] [--mode <engineering|knowledge>] [--used-only] [--status <stable|watch|follow-up-required>] [--reason-code <quality-gate-blocked|specialist-follow-up-open|specialist-follow-up-overdue|specialist-follow-up-needs-reminder>] [--adoption-drift-status <growing|steady|declining|unused>] [--adoption-drift-reason-code <mission-volume-growing|mission-volume-declining|workspace-footprint-growing|workspace-footprint-declining|unused-profile>] [--usage-trend <growing|steady|declining|unused>] [--workspace-usage-trend <growing|steady|declining|unused>] [--workspace-adoption-drift-status <growing|steady|declining|unused>] [--workspace-adoption-drift-reason-code <workspace-mission-volume-growing|workspace-mission-volume-declining|workspace-profile-footprint-growing|workspace-profile-footprint-declining|unused-workspace>] [--drift-only] [--workspace-status <stable|watch|follow-up-required>] [--workspace-reason-code <quality-gate-blocked|specialist-follow-up-open|specialist-follow-up-overdue|specialist-follow-up-needs-reminder>] [--workspace-drift-only]
  overview providers [--since <iso-timestamp>]

  provider list
  provider check <stub|openai|anthropic|local|hermes>
  provider activity [--provider <stub|openai|anthropic|local|hermes>] [--role <manager|planner|executor|reviewer|specialist>] [--status <running|blocked|failed|completed|merged|abandoned>] [--since <iso-timestamp>]
  provider activity-timeline [--provider <stub|openai|anthropic|local|hermes>] [--role <manager|planner|executor|reviewer|specialist>] [--status <running|blocked|failed|completed|merged|abandoned>] [--since <iso-timestamp>]
  provider events [--provider <stub|openai|anthropic|local|hermes>] [--family <probe|execution|attention>] [--ok <true|false>] [--attempted <true|false>] [--role <manager|planner|executor|reviewer|specialist>] [--status <running|blocked|failed|completed|merged|abandoned>] [--since <iso-timestamp>]
  provider probe <stub|openai|anthropic|local|hermes>
  provider history [--provider <stub|openai|anthropic|local|hermes>] [--ok <true|false>] [--attempted <true|false>]
  provider timeline [--provider <stub|openai|anthropic|local|hermes>] [--ok <true|false>] [--attempted <true|false>]

  workspace add <path> [--name <name>]
  workspace list
  workspace show <workspaceId>
  workspace overview <workspaceId> [--provider-since <iso-timestamp>]
  workspace timeline <workspaceId> [--provider-since <iso-timestamp>]

  mission create --workspace <workspaceId> --mode <engineering|knowledge> --title <title> [--objective <text>] [--deliverable <type>] [--constraints <text|text>] [--attachment <path>]
  mission list
  mission run <missionId> [--provider <stub|openai|anthropic|local|hermes>] [--fallback-provider <stub|openai|anthropic|local|hermes>[,...]]
  mission show <missionId> [--provider-since <iso-timestamp>]
  mission timeline <missionId> [--provider-since <iso-timestamp>]
  mission execution preflight <missionId> [--request-approval]
  mission execution start <missionId>
  mission execution stop <missionId>
  mission execution status <missionId>
  mission execution logs <missionId> [--execution <executionSessionId>]

  session list <missionId>
  session show <missionId>
  session show <missionId> --session <sessionId>

  action inbox [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision|provider-attention-required|provider-health-drift-required|specialist-follow-up-required|monitoring-required|handoff-required|maintenance-required>] [--provider <stub|openai|anthropic|local|hermes>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--needs-reminder] [--overdue]
  action provider-attention [--provider <stub|openai|anthropic|local|hermes>] [--workspace <workspaceId>] [--mission <missionId>] [--status <pending|acknowledged|resolved|recovered>] [--needs-reminder] [--overdue]
  action provider-health-drift [--provider <stub|openai|anthropic|local|hermes>] [--workspace <workspaceId>] [--mission <missionId>] [--overdue]
  action specialist-follow-ups [--provider <stub|openai|anthropic|local|hermes>] [--workspace <workspaceId>] [--mission <missionId>] [--status <blocked|failed>] [--needs-reminder] [--overdue]
  action maintenance-history [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--outcome <effective|no-op|impactful>] [--since <iso-timestamp>]
  action reviewer-followups [--workspace <workspaceId>] [--mission <missionId>] [--status <open|resolved>] [--kind <rerun-fixed|superseded|scope-reduced|accepted-risk>]
  action owner-handoffs [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--status <pending|acknowledged>] [--needs-reminder] [--overdue]
  action maintenance [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--note <text>]
  action log-overdue [--workspace <workspaceId>] [--mission <missionId>] [--class <retry-ready|blocked|awaiting-human-decision|provider-health-drift-required|specialist-follow-up-required>] [--provider <stub|openai|anthropic|local|hermes>] [--priority <low|medium|high|urgent>] [--owner <human-approver|mission-owner|workspace-owner>]
  action escalated [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--effective-owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>] [--tier <normal|warning|critical|resolved>] [--needs-reminder]
  action remind-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--tier <normal|warning|critical>] [--due] [--overdue] [--note <text>]
  action remind-owner-handoffs [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--due] [--overdue] [--note <text>]
  action remind-provider-attention [--provider <stub|openai|anthropic|local|hermes>] [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--due] [--overdue] [--note <text>]
  action remind-specialist-follow-ups [--provider <stub|openai|anthropic|local|hermes>] [--workspace <workspaceId>] [--mission <missionId>] [--status <blocked|failed>] [--due] [--overdue] [--note <text>]
  action sync-escalations [--workspace <workspaceId>] [--mission <missionId>] [--owner <human-approver|mission-owner|workspace-owner>] [--status <open|resolved>]
  action remediate-provider-attention <actionId>
  action remediate-specialist-follow-up <actionId>
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
  memory facts [--scope <user|workspace|mission>] [--workspace <workspaceId>] [--mission <missionId>] [--status <active|retired|all>] [--compact]

  converter diagnostics [--converter <path>]

  artifact compact-output --mission <missionId> --session <sessionId> --input <path> [--source <name>] [--title <title>] [--file-name <name>] [--max-head-lines <n>] [--max-tail-lines <n>] [--max-issue-lines <n>]

  doc log --type <devlog|incident|reference> --title <title> --content <text>
`);
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function compactFactGraph(graph) {
  const nodeById = new Map((graph.nodes || []).map((node) => [node.id, node]));
  return {
    edges: (graph.edges || []).slice(0, 10).map((edge) => ({
      fromNodeId: edge.fromNodeId,
      fromStatement: nodeById.get(edge.fromNodeId)?.statement || '',
      id: edge.id,
      relation: edge.relation,
      relationReason: edge.relationReason || `related by shared fact terms: ${(edge.sharedTokens || []).slice(0, 8).join(', ')}`,
      sharedTokens: Array.isArray(edge.sharedTokens) ? edge.sharedTokens.slice(0, 8) : [],
      status: edge.status,
      toNodeId: edge.toNodeId,
      toStatement: nodeById.get(edge.toNodeId)?.statement || '',
      weight: edge.weight || 0,
    })),
    nodes: (graph.nodes || []).slice(0, 10).map((node) => ({
      id: node.id,
      provenance: Array.isArray(node.provenance) ? node.provenance.slice(0, 1) : [],
      retiredReason: node.retiredReason || '',
      scope: node.scope,
      scopeId: node.scopeId,
      sourceId: node.sourceId,
      statement: node.statement,
      status: node.status,
      updatedAt: node.updatedAt || node.createdAt || null,
      version: node.version || 1,
    })),
    summary: graph.summary,
  };
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
    printJson(
      service.getGlobalOverview({
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'converter' && command === 'diagnostics') {
    printJson(
      await getDocumentConversionCapabilities({
        converterCommand: readOption(rest, '--converter', ''),
      }),
    );
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
    printJson(
      service.getGlobalOperatorTimeline({
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'overview' && command === 'profiles') {
    printJson(
      service.getOrchestrationProfilesOverview({
        adoptionDriftReasonCode: readOption(rest, '--adoption-drift-reason-code', ''),
        adoptionDriftStatus: readOption(rest, '--adoption-drift-status', ''),
        driftOnly: hasOption(rest, '--drift-only'),
        mode: readOption(rest, '--mode', ''),
        reasonCode: readOption(rest, '--reason-code', ''),
        status: readOption(rest, '--status', ''),
        usageTrend: readOption(rest, '--usage-trend', ''),
        usedOnly: hasOption(rest, '--used-only'),
        workspaceAdoptionDriftReasonCode: readOption(rest, '--workspace-adoption-drift-reason-code', ''),
        workspaceAdoptionDriftStatus: readOption(rest, '--workspace-adoption-drift-status', ''),
        workspaceDriftOnly: hasOption(rest, '--workspace-drift-only'),
        workspaceId: readOption(rest, '--workspace', ''),
        workspaceReasonCode: readOption(rest, '--workspace-reason-code', ''),
        workspaceStatus: readOption(rest, '--workspace-status', ''),
        workspaceUsageTrend: readOption(rest, '--workspace-usage-trend', ''),
      }),
    );
    return;
  }

  if (group === 'overview' && command === 'providers') {
    printJson(
      service.getProviderOverview({
        since: readOption(rest, '--since', ''),
      }),
    );
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
        since: readOption(rest, '--since', ''),
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
        since: readOption(rest, '--since', ''),
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
        since: readOption(rest, '--since', ''),
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
    printJson(
      service.getWorkspaceOverview(rest[0], {
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'workspace' && command === 'timeline') {
    printJson(
      service.getWorkspaceTimeline(rest[0], {
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'mission' && command === 'create') {
    const attachmentPaths = readOptions(rest, '--attachment');
    const attachments = await Promise.all(
      attachmentPaths.map(async (attachmentPath) => {
        const converted = await convertMissionAttachmentFile({ filePath: attachmentPath });
        return {
          content: converted.content,
          conversion: converted.conversion,
          fileName: path.basename(attachmentPath),
          mimeType: converted.conversion?.converted ? 'text/markdown' : undefined,
          source: converted.conversion?.converted ? 'cli-converted' : 'cli',
        };
      }),
    );
    printJson(
      service.createMission({
        attachments,
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
    const provider = readOption(rest, '--provider', '');
    const fallbackProvider = readOption(rest, '--fallback-provider', '');
    const commandParts = ['mission', 'run', missionId];
    if (provider) {
      commandParts.push('--provider', provider);
    }
    if (fallbackProvider) {
      commandParts.push('--fallback-provider', fallbackProvider);
    }
    const result = await service.runMission(missionId, {
      fallbackProvider,
      provider,
      providerSpecified: hasOption(rest, '--provider'),
      sourceContext: {
        channel: 'cli',
        command: commandParts.join(' '),
        sourceType: 'cli',
      },
    });

    printJson({
      approvalId: result.approval ? result.approval.id : null,
      artifactPath: result.artifactPath,
      missionId: result.mission.id,
      provider: result.provider,
      providerFallback: result.providerFallback || null,
      reviewerVerdict: result.reviewerVerdict,
      sessionId: result.session.id,
      status: result.mission.status,
    });
    return;
  }

  if (group === 'mission' && command === 'show') {
    printJson(
      service.showMission(rest[0], {
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'mission' && command === 'timeline') {
    printJson(
      service.getMissionTimeline(rest[0], {
        providerSince: readOption(rest, '--provider-since', ''),
      }),
    );
    return;
  }

  if (group === 'mission' && command === 'execution') {
    const [subcommand, missionId, ...executionRest] = rest;

    if (subcommand === 'preflight') {
      printJson(
        service.preflightExecution(missionId, {
          requestApproval: hasOption(executionRest, '--request-approval'),
        }),
      );
      return;
    }

    if (subcommand === 'start') {
      printJson(service.startExecution(missionId));
      return;
    }

    if (subcommand === 'stop') {
      printJson(service.stopExecution(missionId));
      return;
    }

    if (subcommand === 'status') {
      printJson(service.getExecutionStatus(missionId));
      return;
    }

    if (subcommand === 'logs') {
      printJson(
        service.getExecutionLogs(missionId, {
          executionId: readOption(executionRest, '--execution', ''),
        }),
      );
      return;
    }
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
        providerId: readOption(rest, '--provider', ''),
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

  if (group === 'action' && command === 'provider-health-drift') {
    printJson(
      service.getProviderHealthDriftInbox({
        missionId: readOption(rest, '--mission', ''),
        overdueOnly: hasOption(rest, '--overdue'),
        providerId: readOption(rest, '--provider', ''),
        workspaceId: readOption(rest, '--workspace', ''),
      }),
    );
    return;
  }

  if (group === 'action' && command === 'specialist-follow-ups') {
    printJson(
      service.getSpecialistFollowUpInbox({
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
        providerId: readOption(rest, '--provider', ''),
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

  if (group === 'action' && command === 'remind-specialist-follow-ups') {
    printJson(
      service.remindSpecialistFollowUps(
        {
          dueOnly: hasOption(rest, '--due'),
          missionId: readOption(rest, '--mission', ''),
          overdueOnly: hasOption(rest, '--overdue'),
          providerId: readOption(rest, '--provider', ''),
          status: readOption(rest, '--status', ''),
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

  if (group === 'action' && command === 'remediate-provider-attention') {
    printJson(await service.remediateProviderAttention(rest[0]));
    return;
  }

  if (group === 'action' && command === 'remediate-specialist-follow-up') {
    printJson(await service.remediateSpecialistFollowUp(rest[0]));
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

  if (group === 'memory' && command === 'facts') {
    const scope = readOption(rest, '--scope', '');
    const filter = {
      status: readOption(rest, '--status', 'active'),
    };

    if (scope) {
      filter.scope = scope;
      filter.scopeId = resolveScopeId(scope, rest);
    }

    const graph = service.listFactGraph(filter);
    printJson(hasOption(rest, '--compact') ? compactFactGraph(graph) : graph);
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

  if (group === 'artifact' && command === 'compact-output') {
    const missionId = readOption(rest, '--mission');
    const sessionId = readOption(rest, '--session');
    const inputPath = readOption(rest, '--input');

    if (!missionId || !sessionId || !inputPath) {
      throw new Error('artifact compact-output requires --mission, --session, and --input.');
    }

    const mission = store.getMission(missionId);
    if (!mission) {
      throw new Error(`mission not found: ${missionId}`);
    }

    const session = store.getSession(sessionId);
    if (!session || session.missionId !== missionId) {
      throw new Error(`session not found for mission: ${sessionId}`);
    }

    const compacted = compactOutputFile({
      inputPath,
      maxHeadLines: parsePositiveIntegerOption(rest, '--max-head-lines'),
      maxIssueLines: parsePositiveIntegerOption(rest, '--max-issue-lines'),
      maxTailLines: parsePositiveIntegerOption(rest, '--max-tail-lines'),
      sourceName: readOption(rest, '--source', ''),
    });
    const artifactFileName = readOption(rest, '--file-name', 'output-compaction-summary.md');
    const artifactPath = store.writeArtifactContent({
      content: compacted.markdown,
      fileName: artifactFileName,
      missionId,
      sessionId,
    });
    const artifact = store.saveArtifact({
      id: createId('artifact'),
      createdAt: new Date().toISOString(),
      fileName: artifactFileName,
      kind: 'output_compaction',
      metadata: {
        compact: compacted.summary.compact,
        inputPath: compacted.inputPath,
        raw: compacted.summary.raw,
        signals: compacted.summary.signals,
        sourceName: compacted.summary.sourceName,
        status: compacted.summary.status,
      },
      missionId,
      path: artifactPath,
      role: 'operator',
      sessionId,
      title: readOption(rest, '--title', 'Output Compaction Summary'),
    });

    store.updateSession(sessionId, (currentSession) => ({
      ...currentSession,
      artifactIds: appendUnique(Array.isArray(currentSession.artifactIds) ? currentSession.artifactIds : [], artifact.id),
    }));

    printJson({
      artifact,
      compact: compacted.summary.compact,
      inputPath: compacted.inputPath,
      raw: compacted.summary.raw,
      signals: compacted.summary.signals,
      status: compacted.summary.status,
    });
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
