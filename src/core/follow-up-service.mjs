import {
  ACTION_OWNERS,
  REVIEWER_FOLLOW_UP_RESOLUTION_KINDS,
  REVIEWER_FOLLOW_UP_STATUSES,
} from './constants.mjs';
import {
  addDispatchMetadata,
  addFixedOperationalMetadata,
  buildReviewerFollowUpItemFromRecord,
  buildSpecialistFollowUpActionItem,
} from './action-item-builders.mjs';
import { buildSpecialistFollowUpReminderRecord } from './action-mutation-records.mjs';
import {
  deriveSlaHoursFromTimestamps,
  enrichEscalation,
} from './escalation-analytics.mjs';
import {
  resolveSpecialistFollowUpPolicy,
  resolveSpecialistFollowUpRoute,
  summarizeReviewerFollowUps,
  summarizeSpecialistFollowUpItems,
} from './follow-up-analytics.mjs';
import { createId } from './id.mjs';
import { formatProviderFailureDetail } from './provider-execution-summary.mjs';
import { normalizeProviderFailureKind } from './provider-telemetry.mjs';
import {
  formatAcceptedRiskEscalationTitle,
  formatReviewerFollowUpResolutionMemory,
  formatSpecialistFollowUpReminderDetail,
} from './reminder-formatters.mjs';
import {
  buildFallbackSpecialistHandoff,
  normalizeSpecialistHandoff,
} from './specialist-handoff.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  return normalized === 'executing' ? 'running' : normalized;
}

function getLatestSession(sessions) {
  if (!sessions.length) {
    return null;
  }

  return [...sessions]
    .sort((left, right) => String(left.startedAt || '').localeCompare(String(right.startedAt || '')))
    .at(-1);
}

function parseMarkdownBulletSection(content, sectionName) {
  const normalizedContent = String(content || '');
  const header = `## ${sectionName}`;
  const startIndex = normalizedContent.indexOf(header);

  if (startIndex === -1) {
    return [];
  }

  const nextHeaderIndex = normalizedContent.indexOf('\n## ', startIndex + header.length);
  const sectionBody = normalizedContent
    .slice(startIndex + header.length, nextHeaderIndex === -1 ? undefined : nextHeaderIndex)
    .trim();

  return sectionBody
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);
}

export function createFollowUpService({
  addMemoryEntry,
  buildParallelGroupStates,
  fileSystem,
  getLatestParallelGroupState,
  getMission,
  getWorkspace,
  now,
  providerRegistry,
  runMission,
  store,
}) {
  function listSpecialistFollowUpRemindersForItem(item) {
    const actionId = normalizeText(item?.actionId || '');
    return actionId ? store.listSpecialistFollowUpReminders({ actionId }) : [];
  }

  function deriveReviewerFollowUpSeed(mission, filter = {}) {
    const workspace = store.getWorkspace(mission.workspaceId);
    if (!workspace) {
      return null;
    }

    if (filter.workspaceId && workspace.id !== filter.workspaceId) {
      return null;
    }

    if (filter.missionId && mission.id !== filter.missionId) {
      return null;
    }

    const latestSession = getLatestSession(store.listSessionsByMission(mission.id));
    if (!latestSession || latestSession.status !== 'failed') {
      return null;
    }

    const reviewerRun = store.listAgentRunsBySession(latestSession.id).find((run) => run.role === 'reviewer') || null;
    if (!reviewerRun || reviewerRun.status !== 'failed') {
      return null;
    }

    const reviewerReport =
      store
        .listArtifactsBySession(latestSession.id)
        .filter((artifact) => artifact.fileName === 'reviewer-report.md')
        .at(-1) || null;

    const findings =
      reviewerReport && fileSystem.existsSync(reviewerReport.path)
        ? parseMarkdownBulletSection(fileSystem.readFileSync(reviewerReport.path, 'utf8'), 'Findings')
        : [];

    return {
      actionClass: 'retry-ready',
      actionId: `reviewer-follow-up:${mission.id}:${latestSession.id}`,
      actionType: 'reviewer-follow-up',
      createdAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.endedAt || latestSession.startedAt,
      deliverableType: mission.deliverableType,
      findings,
      missionId: mission.id,
      missionStatus: mission.status,
      missionTitle: mission.title,
      mode: mission.mode,
      reason: reviewerRun.outputSummary,
      reportPath: reviewerReport ? reviewerReport.path : null,
      requestedByRole: 'reviewer',
      resolutionKind: '',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: latestSession.id,
      sessionStatus: latestSession.status,
      status: 'open',
      title: `Reviewer follow-up required for ${mission.title}`,
      updatedAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.updatedAt || latestSession.endedAt || latestSession.startedAt,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }

  function listReviewerFollowUpRecords(filter = {}) {
    if (filter.status && !REVIEWER_FOLLOW_UP_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported reviewer follow-up status: ${filter.status}`);
    }
    if (filter.resolutionKind && !REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(filter.resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${filter.resolutionKind}`);
    }

    const allRecords = store.listReviewerFollowUps({
      actionId: filter.actionId,
      missionId: filter.missionId,
      sessionId: filter.sessionId,
      workspaceId: filter.workspaceId,
    });
    const records = allRecords.filter((record) => {
      if (filter.status && record.status !== filter.status) {
        return false;
      }
      if (filter.resolutionKind && record.resolutionKind !== filter.resolutionKind) {
        return false;
      }
      return true;
    });
    const recordActionIds = new Set(allRecords.map((record) => record.actionId));

    if (filter.status === 'resolved') {
      return records.sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    }

    const seeds = store
      .listMissions()
      .map((mission) => deriveReviewerFollowUpSeed(mission, filter))
      .filter(Boolean)
      .filter((seed) => !recordActionIds.has(seed.actionId));

    return [...records, ...seeds].sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function getReviewerFollowUpInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const effectiveStatus = filter.status || 'open';
    const items = listReviewerFollowUpRecords({
      actionId: filter.actionId,
      missionId: filter.missionId,
      resolutionKind: filter.kind || filter.resolutionKind,
      status: effectiveStatus,
      workspaceId: filter.workspaceId,
    })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        kind: filter.kind || filter.resolutionKind || null,
        missionId: filter.missionId || null,
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeReviewerFollowUps(items),
    };
  }

  function ensureReviewerFollowUpRecord(actionId) {
    const existingRecord = store.listReviewerFollowUps({ actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    const seed =
      store
        .listMissions()
        .map((mission) => deriveReviewerFollowUpSeed(mission))
        .find((item) => item && item.actionId === actionId) || null;

    if (!seed) {
      throw new Error(`Reviewer follow-up not found: ${actionId}`);
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function createReviewerFollowUpRecord(seed) {
    const existingRecord = store.listReviewerFollowUps({ actionId: seed.actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function buildReviewerFollowUpItems(filter = {}) {
    return listReviewerFollowUpRecords({ ...filter, status: 'open' })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildAcceptedRiskMonitoringItems(filter = {}) {
    return store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((escalation) => enrichEscalation(escalation))
      .filter(
        (escalation) =>
          (escalation.actionType === 'reviewer-accepted-risk' || escalation.sourceResolutionKind === 'accepted-risk') &&
          !escalation.pendingOwnerHandoff,
      )
      .map((escalation) =>
        addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'monitoring-required',
              actionId: escalation.actionId,
              actionType: 'accepted-risk-monitoring',
              createdAt: escalation.createdAt,
              deliverableType: escalation.deliverableType || null,
              escalationId: escalation.id,
              effectiveRecommendedOwner: escalation.effectiveRecommendedOwner || escalation.recommendedOwner || 'workspace-owner',
              missionId: escalation.missionId,
              reason: escalation.reason,
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner,
              sessionId: escalation.sessionId,
              sourceResolutionKind: escalation.sourceResolutionKind || 'accepted-risk',
              title: escalation.title,
              workspaceId: escalation.workspaceId,
              workspaceName: escalation.workspaceName,
              lastReminderAt: escalation.lastReminderAt || null,
              needsReminder: Boolean(escalation.needsReminder),
              nextReminderAt: escalation.nextReminderAt || null,
              ownerEscalationLevel: escalation.ownerEscalationLevel || 'base',
              ownerEscalationStep: Number(escalation.ownerEscalationStep || 0),
              ownerHistoryCount: Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory.length : 0,
              lastOwnerEscalatedAt: escalation.lastOwnerEscalatedAt || null,
              reminderCount: Number(escalation.reminderCount || 0),
              reminderCadenceHours: escalation.reminderCadenceHours || null,
              reminderHistoryCount: Array.isArray(escalation.reminderHistory) ? escalation.reminderHistory.length : 0,
            },
            {
              priority: escalation.priority || 'medium',
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner || 'workspace-owner',
            },
          ),
          {
            dueAt: escalation.dueAt,
            escalationRule: escalation.escalationRule,
            slaHours: deriveSlaHoursFromTimestamps(escalation.createdAt, escalation.dueAt),
          },
        ),
      )
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildSpecialistFollowUpItem({
    actionId,
    createdAt,
    detail,
    followUpSource = 'run-status',
    group,
    mission,
    providerId,
    run = null,
    specialistHandoff,
    specialistKind,
    status,
    workspace,
  }) {
    const followUpPolicy = resolveSpecialistFollowUpPolicy({
      followUpSource,
      orchestrationProfile: group.orchestrationProfile,
      specialistKind,
      status,
    });
    const remediationRoute = resolveSpecialistFollowUpRoute({
      actionId,
      followUpSource,
      missionId: mission.id,
      providerId,
      retryPolicy: followUpPolicy.retryPolicy,
      specialistKind,
    });
    const reminderRecords = listSpecialistFollowUpRemindersForItem({ actionId });

    return buildSpecialistFollowUpActionItem({
      actionId,
      createdAt,
      detail,
      followUpPolicy,
      followUpSource,
      group,
      mission,
      providerId,
      remediationRoute,
      reminderRecords,
      run,
      specialistHandoff,
      specialistKind,
      status,
      workspace,
    });
  }

  function buildSpecialistFollowUpItems(filter = {}) {
    return buildParallelGroupStates(filter)
      .flatMap((group) => {
        const mission = group.mission;
        const workspace = group.workspace;
        if (!mission || !workspace) {
          return [];
        }

        const directItems = [...group.latestByKind.values()]
          .filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)))
          .map((run) => {
            const specialistKind = normalizeText(run.specialistKind);
            const status = normalizeAgentRunStatus(run.status);
            const session = store.getSession(run.sessionId);
            const providerId = normalizeText(session?.provider || run.providerId, 'stub');
            const specialistHandoff =
              normalizeSpecialistHandoff(run.specialistHandoff, {
                nextAction: `Resolve the ${specialistKind} specialist ${status} state before merge.`,
                recommendedOwner: 'workspace-owner',
                summaryText: run.outputSummary,
              }) ||
              buildFallbackSpecialistHandoff({
                specialistKind,
                status,
                summaryText: normalizeText(run.outputSummary),
              });

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${specialistKind}:${run.id}`,
              createdAt: run.endedAt || run.startedAt || now(),
              detail: formatProviderFailureDetail({
                attemptCount: run.attemptCount,
                detail: run.outputSummary || `${specialistKind} specialist branch requires follow-up.`,
                failureKind: normalizeProviderFailureKind(run.failureKind),
                httpStatus: run.httpStatus,
                recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
                timedOut: Boolean(run.timedOut),
              }),
              group,
              mission,
              providerId,
              run,
              specialistHandoff,
              specialistKind,
              status,
              workspace,
            });
          });

        const directKinds = new Set(directItems.map((item) => item.specialistKind));
        const qualityGateItems = ensureArray(group.qualityGate?.violations)
          .filter((violation) => !directKinds.has(violation.specialistKind))
          .map((violation) => {
            const run = violation.sourceRun || group.latestByKind.get(violation.specialistKind) || null;
            const providerId = normalizeText(
              store.getSession(run?.sessionId)?.provider || run?.providerId,
              'stub',
            );
            const gateRequest = `Produce a completed ${violation.specialistKind} specialist signal to satisfy the ${group.qualityGate.qualityGate} gate before merge.`;
            const baseSpecialistHandoff =
              normalizeSpecialistHandoff(run?.specialistHandoff, {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              }) ||
              buildFallbackSpecialistHandoff({
                nextAction: gateRequest,
                specialistKind: violation.specialistKind,
                status: 'blocked',
                summaryText: violation.detail,
              });
            const specialistHandoff = normalizeSpecialistHandoff(
              {
                ...baseSpecialistHandoff,
                blockers: [...new Set([...(baseSpecialistHandoff?.blockers || []), violation.detail].filter(Boolean))],
                currentState: violation.detail,
                nextHandoff: {
                  ...(baseSpecialistHandoff?.nextHandoff || {}),
                  recommendedOwner:
                    baseSpecialistHandoff?.nextHandoff?.recommendedOwner || 'workspace-owner',
                  request: gateRequest,
                },
              },
              {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              },
            );

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${violation.specialistKind}:quality-gate`,
              createdAt: violation.at || run?.endedAt || run?.startedAt || now(),
              detail: violation.detail,
              followUpSource: 'quality-gate',
              group,
              mission,
              providerId,
              run,
              specialistHandoff,
              specialistKind: violation.specialistKind,
              status: 'blocked',
              workspace,
            });
          });

        return [...directItems, ...qualityGateItems];
      })
      .filter((item) => !filter.providerId || item.providerId === filter.providerId)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function summarizeSpecialistFollowUpScopedState(filter = {}) {
    const items = buildSpecialistFollowUpItems(filter);
    const blockedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'blocked');
    const failedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'failed');
    let status = 'clear';

    if (failedItems.length) {
      status = 'failed';
    } else if (blockedItems.length) {
      status = 'blocked';
    }

    return {
      blockedCount: blockedItems.length,
      failedCount: failedItems.length,
      latestActionId: items.at(-1)?.actionId || null,
      latestBlockedActionId: blockedItems.at(-1)?.actionId || null,
      latestFailedActionId: failedItems.at(-1)?.actionId || null,
      pendingCount: items.length,
      status,
    };
  }

  function getSpecialistFollowUpActionState(actionId) {
    const followUpItem = buildSpecialistFollowUpItems({}).find((item) => item.actionId === actionId);
    if (!followUpItem) {
      return null;
    }

    return {
      item: followUpItem,
      status: normalizeAgentRunStatus(followUpItem.status),
    };
  }

  function getSpecialistFollowUpInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }

    const items = buildSpecialistFollowUpItems(filter)
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeSpecialistFollowUpItems(items),
    };
  }

  function remindSpecialistFollowUps(filter = {}, note = '') {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = buildSpecialistFollowUpItems({
      missionId: filter.missionId,
      needsReminderOnly: Boolean(filter.dueOnly),
      overdueOnly: Boolean(filter.overdueOnly),
      providerId: filter.providerId,
      workspaceId: filter.workspaceId,
    })
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner);

    const items = candidates
      .map((item) =>
        store.saveSpecialistFollowUpReminder(
          buildSpecialistFollowUpReminderRecord({
            id: createId('specialist-follow-up-reminder'),
            item,
            note: normalizedNote,
            remindedAt: reminderTimestamp,
          }),
        ),
      )
      .map((record) => ({
        ...record,
        detail: formatSpecialistFollowUpReminderDetail(record),
      }))
      .sort((left, right) =>
        String(left.remindedAt || left.createdAt || '').localeCompare(String(right.remindedAt || right.createdAt || '')),
      );
    const remindedSummary = summarizeSpecialistFollowUpItems(
      items.map((item) => ({
        isOverdue: Boolean(item.overdue),
        providerId: item.providerId || null,
        reminderCount: 1,
        remediationRoute: item.remediationRoute || null,
        retryPolicy: item.retryPolicy || null,
        specialistKind: item.specialistKind,
        status: item.status,
        workspaceId: item.workspaceId || null,
      })),
    );

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.remindedAt || item.createdAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.overdue).length,
        providerCounts: remindedSummary.providerCounts,
        remediationRouteCounts: remindedSummary.remediationRouteCounts,
        remindedCount: items.length,
        retryPolicyCounts: remindedSummary.retryPolicyCounts,
        specialistKindCounts: remindedSummary.specialistKindCounts,
        statusCounts: remindedSummary.statusCounts,
        workspaceCounts: remindedSummary.workspaceCounts,
      },
    };
  }

  async function remediateSpecialistFollowUp(actionId) {
    const actionState = getSpecialistFollowUpActionState(actionId);
    if (!actionState) {
      throw new Error(`Specialist follow-up item not found: ${actionId}`);
    }

    const followUpItem = actionState.item;
    if (!followUpItem.missionId) {
      throw new Error(`Specialist follow-up is missing mission context: ${actionId}`);
    }

    const providerId = normalizeText(followUpItem.providerId, 'stub');
    const rerun = await runMission(followUpItem.missionId, {
      provider: providerId,
      providerSpecified: true,
    });
    const latestParallelGroup = getLatestParallelGroupState(followUpItem.missionId);

    return {
      actionId,
      missionId: followUpItem.missionId,
      parallelGroupId: followUpItem.parallelGroupId || null,
      postFollowUp: summarizeSpecialistFollowUpScopedState({
        missionId: followUpItem.missionId,
        parallelGroupId: followUpItem.parallelGroupId || null,
        providerId,
      }),
      previousStatus: actionState.status,
      providerId,
      fallbackRecommendedCommand: followUpItem.fallbackRecommendedCommand || null,
      recommendedCommand: followUpItem.recommendedCommand || null,
      remediationKind: 'mission-rerun',
      remediationRoute: followUpItem.remediationRoute || null,
      result: {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        parallelGroupId: latestParallelGroup?.parallelGroupId || null,
        provider: rerun.provider,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      },
      retryPolicy: followUpItem.retryPolicy || null,
      specialistKind: followUpItem.specialistKind,
      workspaceId: followUpItem.workspaceId || null,
    };
  }

  function openAcceptedRiskEscalation(followUp, resolutionNote) {
    const actionId = `accepted-risk:${followUp.actionId}`;
    const currentTimestamp = now();
    const existingOpenEscalation =
      store
        .listEscalations({
          actionId,
          status: 'open',
        })
        .at(-1) || null;

    if (existingOpenEscalation) {
      return store.updateEscalation(existingOpenEscalation.id, (current) => ({
        ...current,
        dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
        escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
        incidentPath: current.incidentPath || null,
        incidentTitle: current.incidentTitle || null,
        isOverdue: false,
        lastSeenAt: currentTimestamp,
        priority: 'medium',
        reason: resolutionNote,
        recommendedCommand: current.recommendedCommand,
        recommendedOwner: 'workspace-owner',
        sourceResolutionKind: 'accepted-risk',
        sourceReviewerFollowUpActionId: followUp.actionId,
        title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
        updatedAt: currentTimestamp,
      }));
    }

    const escalationId = createId('escalation');
    return store.saveEscalation({
      id: escalationId,
      actionId,
      actionClass: 'accepted-risk-monitoring',
      actionType: 'reviewer-accepted-risk',
      dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
      escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
      incidentPath: null,
      incidentTitle: null,
      isOverdue: false,
      lastSeenAt: currentTimestamp,
      missionId: followUp.missionId,
      priority: 'medium',
      reason: resolutionNote,
      recommendedCommand: `node src/cli.mjs action resolve-escalation ${escalationId} --note "<note>"`,
      recommendedOwner: 'workspace-owner',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: followUp.sessionId,
      sourceResolutionKind: 'accepted-risk',
      sourceReviewerFollowUpActionId: followUp.actionId,
      status: 'open',
      title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
      workspaceId: followUp.workspaceId,
      workspaceName: followUp.workspaceName,
      reminderCount: 0,
      reminderHistory: [],
      lastReminderAt: null,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    });
  }

  function resolveReviewerFollowUp(actionId, { kind = '', note = '' }) {
    const followUp = ensureReviewerFollowUpRecord(actionId);
    if (followUp.status !== 'open') {
      throw new Error(`Reviewer follow-up ${actionId} is already resolved.`);
    }

    const resolutionKind = normalizeText(kind, 'accepted-risk');
    if (!REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${resolutionKind}`);
    }
    const resolutionNote = normalizeText(note, 'Resolved without additional note.');
    const resolvedFollowUp = store.updateReviewerFollowUp(followUp.id, (current) => ({
      ...current,
      resolutionKind,
      resolutionNote,
      resolvedAt: now(),
      status: 'resolved',
      updatedAt: now(),
    }));

    const mission = getMission(resolvedFollowUp.missionId);
    addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatReviewerFollowUpResolutionMemory({
        mission,
        note: resolutionNote,
        resolutionKind,
      }),
    });

    let escalation = null;
    if (resolutionKind === 'accepted-risk') {
      escalation = openAcceptedRiskEscalation(resolvedFollowUp, resolutionNote);
    }

    return {
      escalation,
      followUp: resolvedFollowUp,
    };
  }


  return {
    buildAcceptedRiskMonitoringItems,
    buildReviewerFollowUpItems,
    buildSpecialistFollowUpItems,
    createReviewerFollowUpRecord,
    getReviewerFollowUpInbox,
    getSpecialistFollowUpInbox,
    listReviewerFollowUpRecords,
    remediateSpecialistFollowUp,
    remindSpecialistFollowUps,
    resolveReviewerFollowUp,
  };
}
