import { MISSION_MODES } from './constants.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateUtc(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getUtcMonthRange(isoTimestamp) {
  const parsed = Date.parse(String(isoTimestamp || ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const monthEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
  const monthKey = formatDateUtc(monthStart).slice(0, 7);

  return {
    key: monthKey,
    monthEndDate: formatDateUtc(monthEnd),
    monthKey,
    monthStartDate: formatDateUtc(monthStart),
  };
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items].sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || ''))).at(-1);
}

function accumulateCountMap(target, source = {}) {
  for (const [key, value] of Object.entries(source || {})) {
    const normalizedValue = Number(value || 0);
    if (!normalizedValue) {
      continue;
    }
    target[key] = (target[key] || 0) + normalizedValue;
  }

  return target;
}

function buildCountMapDelta(currentCounts = {}, previousCounts = {}) {
  const keys = new Set([...Object.keys(currentCounts || {}), ...Object.keys(previousCounts || {})]);
  const delta = {};

  for (const key of [...keys].sort((left, right) => String(left).localeCompare(String(right)))) {
    const normalizedDelta = Number(currentCounts?.[key] || 0) - Number(previousCounts?.[key] || 0);
    if (!normalizedDelta) {
      continue;
    }
    delta[key] = normalizedDelta;
  }

  return delta;
}

export function summarizeOrchestrationProfileOverviewItems(items) {
  const adoptionDriftReasonCodeCounts = {};
  const adoptionDriftStatusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
  );
  const healthDriftReasonCodeCounts = {};
  const healthDriftStatusCounts = {
    'follow-up-required': 0,
    stable: 0,
    watch: 0,
  };
  const modeCounts = Object.fromEntries(MISSION_MODES.map((mode) => [mode, 0]));
  const qualityGateCounts = {};
  const retryPolicyCounts = {};
  const specialistFollowUpRemediationRouteCounts = {};
  const specialistFollowUpRetryPolicyCounts = {};
  const workspaceHealthDriftProfileCounts = {};
  const workspaceHealthDriftStatusCounts = {
    'follow-up-required': {},
    watch: {},
  };
  const workspaceUsageTrendProfileCounts = {};
  const workspaceUsageTrendStatusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, {}]),
  );
  const workspaceAdoptionDriftProfileCounts = {};
  const workspaceAdoptionDriftStatusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, {}]),
  );
  const workspaceMissionCounts = {};
  const workspaceProfileCounts = {};
  const touchedProfileIds = [];
  const touchedWorkspaceIds = new Set();
  let adoptionDriftProfileCount = 0;
  let healthDriftProfileCount = 0;
  let missionCountTotal = 0;
  let parallelGroupCountTotal = 0;
  let mergedParallelGroupCountTotal = 0;
  let qualityGateBlockedGroupCountTotal = 0;
  let specialistFollowUpLatestReminderAt = null;
  let specialistFollowUpNeedsReminderCountTotal = 0;
  let specialistFollowUpNextReminderAt = null;
  let specialistFollowUpOverdueCountTotal = 0;
  let specialistFollowUpRequiredCountTotal = 0;
  let specialistFollowUpReminderCountTotal = 0;
  let usedCount = 0;

  for (const item of items) {
    const adoptionDrift = item.adoptionDrift || summarizeOrchestrationProfileAdoptionDrift(item);
    const drift = item.healthDrift || summarizeOrchestrationProfileHealthDrift(item);
    const workspaceUsageTrend = item.workspaceUsageTrend || { status: 'unused' };

    if (adoptionDriftStatusCounts[adoptionDrift.status] !== undefined) {
      adoptionDriftStatusCounts[adoptionDrift.status] += 1;
    }
    if (adoptionDrift.status !== 'steady') {
      adoptionDriftProfileCount += 1;
    }
    for (const reasonCode of adoptionDrift.reasonCodes) {
      adoptionDriftReasonCodeCounts[reasonCode] = (adoptionDriftReasonCodeCounts[reasonCode] || 0) + 1;
    }
    if (healthDriftStatusCounts[drift.status] !== undefined) {
      healthDriftStatusCounts[drift.status] += 1;
    }
    if (drift.status !== 'stable') {
      healthDriftProfileCount += 1;
    }
    for (const reasonCode of drift.reasonCodes) {
      healthDriftReasonCodeCounts[reasonCode] = (healthDriftReasonCodeCounts[reasonCode] || 0) + 1;
    }
    if (modeCounts[item.mode] !== undefined) {
      modeCounts[item.mode] += 1;
    }
    qualityGateCounts[item.qualityGate || 'none'] = (qualityGateCounts[item.qualityGate || 'none'] || 0) + 1;
    retryPolicyCounts[item.retryPolicy || 'none'] = (retryPolicyCounts[item.retryPolicy || 'none'] || 0) + 1;
    missionCountTotal += Number(item.missionCount || 0);
    parallelGroupCountTotal += Number(item.parallelGroupCount || 0);
    mergedParallelGroupCountTotal += Number(item.mergedParallelGroupCount || 0);
    qualityGateBlockedGroupCountTotal += Number(item.qualityGateBlockedGroupCount || 0);
    specialistFollowUpRequiredCountTotal += Number(item.specialistFollowUpRequiredCount || 0);
    specialistFollowUpNeedsReminderCountTotal += Number(item.specialistFollowUpNeedsReminderCount || 0);
    specialistFollowUpOverdueCountTotal += Number(item.specialistFollowUpOverdueCount || 0);
    specialistFollowUpReminderCountTotal += Number(item.specialistFollowUpReminderCountTotal || 0);
    accumulateCountMap(
      specialistFollowUpRetryPolicyCounts,
      item.specialistFollowUpRetryPolicyCounts || {},
    );
    accumulateCountMap(
      specialistFollowUpRemediationRouteCounts,
      item.specialistFollowUpRemediationRouteCounts || {},
    );
    if (
      item.specialistFollowUpLatestReminderAt &&
      (!specialistFollowUpLatestReminderAt ||
        String(specialistFollowUpLatestReminderAt) < String(item.specialistFollowUpLatestReminderAt))
    ) {
      specialistFollowUpLatestReminderAt = item.specialistFollowUpLatestReminderAt;
    }
    if (
      item.specialistFollowUpNextReminderAt &&
      (!specialistFollowUpNextReminderAt ||
        String(specialistFollowUpNextReminderAt) > String(item.specialistFollowUpNextReminderAt))
    ) {
      specialistFollowUpNextReminderAt = item.specialistFollowUpNextReminderAt;
    }
    if (item.used) {
      usedCount += 1;
      touchedProfileIds.push(item.id);
      for (const workspaceId of item.touchedWorkspaceIds || []) {
        touchedWorkspaceIds.add(workspaceId);
        workspaceProfileCounts[workspaceId] = (workspaceProfileCounts[workspaceId] || 0) + 1;
        workspaceUsageTrendProfileCounts[workspaceId] =
          (workspaceUsageTrendProfileCounts[workspaceId] || 0) + 1;
        if (workspaceUsageTrendStatusCounts[workspaceUsageTrend.status]) {
          workspaceUsageTrendStatusCounts[workspaceUsageTrend.status][workspaceId] =
            (workspaceUsageTrendStatusCounts[workspaceUsageTrend.status][workspaceId] || 0) + 1;
        }
        workspaceAdoptionDriftProfileCounts[workspaceId] =
          (workspaceAdoptionDriftProfileCounts[workspaceId] || 0) + 1;
        if (drift.status !== 'stable') {
          workspaceHealthDriftProfileCounts[workspaceId] =
            (workspaceHealthDriftProfileCounts[workspaceId] || 0) + 1;
          if (workspaceHealthDriftStatusCounts[drift.status]) {
            workspaceHealthDriftStatusCounts[drift.status][workspaceId] =
              (workspaceHealthDriftStatusCounts[drift.status][workspaceId] || 0) + 1;
          }
        }
      }
      for (const status of ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES) {
        for (const workspaceId of item.workspaceAdoptionDrift?.workspaceIdsByStatus?.[status] || []) {
          if (workspaceAdoptionDriftStatusCounts[status]) {
            workspaceAdoptionDriftStatusCounts[status][workspaceId] =
              (workspaceAdoptionDriftStatusCounts[status][workspaceId] || 0) + 1;
          }
        }
      }
      accumulateCountMap(workspaceMissionCounts, item.workspaceMissionCounts || {});
    }
  }

  return {
    adoptionDriftProfileCount,
    adoptionDriftReasonCodeCounts,
    adoptionDriftStatusCounts,
    healthDriftProfileCount,
    healthDriftReasonCodeCounts,
    healthDriftStatusCounts,
    latestUsedProfile:
      getLatestItem(
        items
          .filter((item) => item.latestUsedAt)
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt,
          })),
        'latestUsedAt',
      ) || null,
    latestUsedWorkspace:
      getLatestItem(
        items
          .filter((item) => item.used && item.latestUsedAt)
          .map((item) => ({
            id:
              item.latestMission?.workspaceId ||
              item.latestParallelGroup?.workspaceId ||
              item.touchedWorkspaceIds?.[0] ||
              null,
            latestUsedAt: item.latestUsedAt,
            name:
              item.latestMission?.workspaceName ||
              item.latestParallelGroup?.workspaceName ||
              null,
            profileDisplayName: item.displayName,
            profileId: item.id,
            workspaceUsageTrend: item.workspaceUsageTrend || null,
          }))
          .filter((item) => item.id),
        'latestUsedAt',
      ) || null,
    mergedParallelGroupCountTotal,
    missionCountTotal,
    modeCounts,
    parallelGroupCountTotal,
    qualityGateBlockedGroupCountTotal,
    qualityGateCounts,
    retryPolicyCounts,
    specialistFollowUpLatestReminderAt,
    specialistFollowUpNeedsReminderCountTotal,
    specialistFollowUpNextReminderAt,
    specialistFollowUpOverdueCountTotal,
    specialistFollowUpRemediationRouteCounts,
    specialistFollowUpReminderCountTotal,
    specialistFollowUpRequiredCountTotal,
    specialistFollowUpRetryPolicyCounts,
    total: items.length,
    touchedProfileIds: touchedProfileIds.sort((left, right) => String(left).localeCompare(String(right))),
    touchedWorkspaceIds: [...touchedWorkspaceIds].sort((left, right) => String(left).localeCompare(String(right))),
    unusedCount: items.length - usedCount,
    usedCount,
    usedWorkspaceCount: touchedWorkspaceIds.size,
    workspaceAdoptionDriftProfileCounts,
    workspaceAdoptionDriftStatusCounts,
    workspaceHealthDriftProfileCounts,
    workspaceHealthDriftStatusCounts,
    workspaceMissionCounts,
    workspaceProfileCounts,
    workspaceUsageTrendProfileCounts,
    workspaceUsageTrendStatusCounts,
    latestHealthDriftWorkspace:
      getLatestItem(
        items
          .filter((item) => item.used && (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status !== 'stable')
          .map((item) => ({
            id:
              item.latestMission?.workspaceId ||
              item.latestParallelGroup?.workspaceId ||
              item.touchedWorkspaceIds?.[0] ||
              null,
            latestUsedAt:
              item.specialistFollowUpLatestReminderAt ||
              item.latestUsedAt ||
              '',
            name:
              item.latestMission?.workspaceName ||
              item.latestParallelGroup?.workspaceName ||
              null,
            profileDisplayName: item.displayName,
            profileId: item.id,
            status: (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status,
          }))
          .filter((item) => item.id),
        'latestUsedAt',
      ) || null,
    latestHealthDriftProfile:
      getLatestItem(
        items
          .filter((item) => (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status !== 'stable')
          .map((item) => ({
            displayName: item.displayName,
            healthDrift: item.healthDrift || summarizeOrchestrationProfileHealthDrift(item),
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt || item.specialistFollowUpLatestReminderAt || '',
          })),
        'latestUsedAt',
      ) || null,
    latestHealthDriftFollowUpRequiredProfile:
      getLatestItem(
        items
          .filter(
            (item) =>
              (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status ===
              'follow-up-required',
          )
          .map((item) => ({
            displayName: item.displayName,
            healthDrift: item.healthDrift || summarizeOrchestrationProfileHealthDrift(item),
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt || item.specialistFollowUpLatestReminderAt || '',
          })),
        'latestUsedAt',
      ) || null,
    latestHealthDriftWatchProfile:
      getLatestItem(
        items
          .filter(
            (item) =>
              (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status === 'watch',
          )
          .map((item) => ({
            displayName: item.displayName,
            healthDrift: item.healthDrift || summarizeOrchestrationProfileHealthDrift(item),
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt || item.specialistFollowUpLatestReminderAt || '',
          })),
        'latestUsedAt',
      ) || null,
    latestHealthDriftStableProfile:
      getLatestItem(
        items
          .filter(
            (item) =>
              (item.healthDrift || summarizeOrchestrationProfileHealthDrift(item)).status === 'stable',
          )
          .map((item) => ({
            displayName: item.displayName,
            healthDrift: item.healthDrift || summarizeOrchestrationProfileHealthDrift(item),
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt || item.specialistFollowUpLatestReminderAt || '',
          })),
        'latestUsedAt',
      ) || null,
    latestAdoptionDriftProfile:
      getLatestItem(
        items
          .filter((item) => (item.adoptionDrift || summarizeOrchestrationProfileAdoptionDrift(item)).status !== 'steady')
          .map((item) => ({
            adoptionDrift: item.adoptionDrift || summarizeOrchestrationProfileAdoptionDrift(item),
            displayName: item.displayName,
            id: item.id,
            latestMission: item.latestMission,
            latestParallelGroup: item.latestParallelGroup,
            latestUsedAt: item.latestUsedAt || '',
          })),
        'latestUsedAt',
      ) || null,
  };
}

export function summarizeOrchestrationProfileHealthDrift({
  qualityGateBlockedGroupCount = 0,
  specialistFollowUpNeedsReminderCount = 0,
  specialistFollowUpNextReminderAt = null,
  specialistFollowUpOverdueCount = 0,
  specialistFollowUpRequiredCount = 0,
  specialistFollowUpLatestReminderAt = null,
  specialistFollowUpReminderCountTotal = 0,
} = {}) {
  const reasonCodes = [];

  if (qualityGateBlockedGroupCount > 0) {
    reasonCodes.push('quality-gate-blocked');
  }
  if (specialistFollowUpOverdueCount > 0) {
    reasonCodes.push('specialist-follow-up-overdue');
  }
  if (specialistFollowUpNeedsReminderCount > 0) {
    reasonCodes.push('specialist-follow-up-needs-reminder');
  }
  if (specialistFollowUpRequiredCount > 0) {
    reasonCodes.push('specialist-follow-up-open');
  }

  let status = 'stable';
  if (qualityGateBlockedGroupCount > 0 || specialistFollowUpOverdueCount > 0) {
    status = 'follow-up-required';
  } else if (specialistFollowUpRequiredCount > 0 || specialistFollowUpNeedsReminderCount > 0) {
    status = 'watch';
  }

  return {
    latestReminderAt: specialistFollowUpLatestReminderAt,
    nextReminderAt: specialistFollowUpNextReminderAt,
    qualityGateBlockedGroupCount,
    reasonCodes,
    specialistFollowUpNeedsReminderCount,
    specialistFollowUpOverdueCount,
    specialistFollowUpReminderCountTotal,
    specialistFollowUpRequiredCount,
    status,
  };
}

export const ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES = [
  'quality-gate-blocked',
  'specialist-follow-up-needs-reminder',
  'specialist-follow-up-open',
  'specialist-follow-up-overdue',
];
export const ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES = ['declining', 'growing', 'steady', 'unused'];
export const ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES = [
  'mission-volume-declining',
  'mission-volume-growing',
  'unused-profile',
  'workspace-footprint-declining',
  'workspace-footprint-growing',
];
export const ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES = [
  'unused-workspace',
  'workspace-mission-volume-declining',
  'workspace-mission-volume-growing',
  'workspace-profile-footprint-declining',
  'workspace-profile-footprint-growing',
];

export function buildOrchestrationProfileUsageMonthlyBuckets(entries = []) {
  const bucketMap = new Map();

  for (const entry of entries) {
    const latestAt = String(entry?.latestAt || entry?.mission?.updatedAt || entry?.mission?.createdAt || '');
    if (!latestAt) {
      continue;
    }

    const monthRange = getUtcMonthRange(latestAt);
    if (!monthRange) {
      continue;
    }

    const current = bucketMap.get(monthRange.key) || {
      missionCount: 0,
      missionIds: new Set(),
      modeCounts: Object.fromEntries(MISSION_MODES.map((mode) => [mode, 0])),
      monthEndDate: monthRange.monthEndDate,
      monthKey: monthRange.monthKey,
      monthStartDate: monthRange.monthStartDate,
      profileCounts: {},
      touchedProfileIds: new Set(),
      touchedWorkspaceIds: new Set(),
      workspaceCounts: {},
    };

    current.missionCount += 1;
    if (entry?.mission?.id) {
      current.missionIds.add(entry.mission.id);
    }
    if (current.modeCounts[entry?.mission?.mode] !== undefined) {
      current.modeCounts[entry.mission.mode] += 1;
    }
    if (entry?.profile?.id) {
      current.profileCounts[entry.profile.id] = (current.profileCounts[entry.profile.id] || 0) + 1;
      current.touchedProfileIds.add(entry.profile.id);
    }
    if (entry?.workspace?.id) {
      current.workspaceCounts[entry.workspace.id] = (current.workspaceCounts[entry.workspace.id] || 0) + 1;
      current.touchedWorkspaceIds.add(entry.workspace.id);
    }

    bucketMap.set(monthRange.key, current);
  }

  return [...bucketMap.values()]
    .map((bucket) => {
      const missionIds = [...bucket.missionIds].sort((left, right) => String(left).localeCompare(String(right)));
      const touchedProfileIds = [...bucket.touchedProfileIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
      const touchedWorkspaceIds = [...bucket.touchedWorkspaceIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );

      return {
        missionCount: bucket.missionCount,
        missionIds,
        modeCounts: bucket.modeCounts,
        monthEndDate: bucket.monthEndDate,
        monthKey: bucket.monthKey,
        monthStartDate: bucket.monthStartDate,
        profileCounts: bucket.profileCounts,
        touchedProfileIds,
        touchedWorkspaceIds,
        usedProfileCount: touchedProfileIds.length,
        usedWorkspaceCount: touchedWorkspaceIds.length,
        workspaceCounts: bucket.workspaceCounts,
      };
    })
    .sort((left, right) => String(right.monthStartDate).localeCompare(String(left.monthStartDate)));
}

export function buildOrchestrationProfileUsageLatestMonthlyBucketDelta(monthlyBuckets = []) {
  const current = monthlyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = monthlyBuckets[1] || null;

  return {
    currentMonthStartDate: current.monthStartDate,
    missionCountDelta: Number(current.missionCount || 0) - Number(previous?.missionCount || 0),
    modeCountsDelta: buildCountMapDelta(current.modeCounts || {}, previous?.modeCounts || {}),
    previousMonthStartDate: previous?.monthStartDate || null,
    profileCountsDelta: buildCountMapDelta(current.profileCounts || {}, previous?.profileCounts || {}),
    usedProfileCountDelta: Number(current.usedProfileCount || 0) - Number(previous?.usedProfileCount || 0),
    usedWorkspaceCountDelta:
      Number(current.usedWorkspaceCount || 0) - Number(previous?.usedWorkspaceCount || 0),
    workspaceCountsDelta: buildCountMapDelta(current.workspaceCounts || {}, previous?.workspaceCounts || {}),
  };
}

export function summarizeOrchestrationProfileUsageEntries(entries = []) {
  const monthlyBuckets = buildOrchestrationProfileUsageMonthlyBuckets(entries);

  return {
    usageLatestMonthlyBucketDelta: buildOrchestrationProfileUsageLatestMonthlyBucketDelta(monthlyBuckets),
    usageLatestMonthlyBucketStartDate: monthlyBuckets[0]?.monthStartDate || null,
    usageMonthlyBucketCount: monthlyBuckets.length,
    usageMonthlyBuckets: monthlyBuckets,
    usageOldestMonthlyBucketStartDate: monthlyBuckets.at(-1)?.monthStartDate || null,
  };
}

export function getPreviousUtcMonthStartDate(monthStartDate) {
  const parsed = Date.parse(String(monthStartDate || ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
}

export function summarizeOrchestrationProfileUsageTrend({
  currentMonthStartDate = null,
  monthlyBuckets = [],
  used = false,
} = {}) {
  if (!used) {
    return {
      currentMonthMissionCount: 0,
      currentMonthStartDate,
      missionCountDelta: 0,
      previousMonthMissionCount: 0,
      previousMonthStartDate: currentMonthStartDate ? getPreviousUtcMonthStartDate(currentMonthStartDate) : null,
      status: 'unused',
    };
  }

  const previousMonthStartDate = currentMonthStartDate
    ? getPreviousUtcMonthStartDate(currentMonthStartDate)
    : null;
  const currentBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === currentMonthStartDate) || null;
  const previousBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === previousMonthStartDate) || null;
  const currentMonthMissionCount = Number(currentBucket?.missionCount || 0);
  const previousMonthMissionCount = Number(previousBucket?.missionCount || 0);
  const missionCountDelta = currentMonthMissionCount - previousMonthMissionCount;

  let status = 'steady';
  if (missionCountDelta > 0) {
    status = 'growing';
  } else if (missionCountDelta < 0) {
    status = 'declining';
  }

  return {
    currentMonthMissionCount,
    currentMonthStartDate,
    missionCountDelta,
    previousMonthMissionCount,
    previousMonthStartDate,
    status,
  };
}

export function summarizeOrchestrationProfileWorkspaceUsageTrend({
  currentMonthStartDate = null,
  monthlyBuckets = [],
  used = false,
} = {}) {
  if (!used) {
    return {
      currentMonthStartDate,
      currentMonthWorkspaceCount: 0,
      previousMonthStartDate: currentMonthStartDate ? getPreviousUtcMonthStartDate(currentMonthStartDate) : null,
      previousMonthWorkspaceCount: 0,
      status: 'unused',
      workspaceCountDelta: 0,
    };
  }

  const previousMonthStartDate = currentMonthStartDate
    ? getPreviousUtcMonthStartDate(currentMonthStartDate)
    : null;
  const currentBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === currentMonthStartDate) || null;
  const previousBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === previousMonthStartDate) || null;
  const currentMonthWorkspaceCount = Number(currentBucket?.usedWorkspaceCount || 0);
  const previousMonthWorkspaceCount = Number(previousBucket?.usedWorkspaceCount || 0);
  const workspaceCountDelta = currentMonthWorkspaceCount - previousMonthWorkspaceCount;

  let status = 'steady';
  if (workspaceCountDelta > 0) {
    status = 'growing';
  } else if (workspaceCountDelta < 0) {
    status = 'declining';
  }

  return {
    currentMonthStartDate,
    currentMonthWorkspaceCount,
    previousMonthStartDate,
    previousMonthWorkspaceCount,
    status,
    workspaceCountDelta,
  };
}

export function summarizeOrchestrationWorkspaceProfileFootprintTrend({
  currentMonthStartDate = null,
  monthlyBuckets = [],
  used = false,
} = {}) {
  if (!used) {
    return {
      currentMonthProfileCount: 0,
      currentMonthStartDate,
      previousMonthProfileCount: 0,
      previousMonthStartDate: currentMonthStartDate ? getPreviousUtcMonthStartDate(currentMonthStartDate) : null,
      profileCountDelta: 0,
      status: 'unused',
    };
  }

  const previousMonthStartDate = currentMonthStartDate
    ? getPreviousUtcMonthStartDate(currentMonthStartDate)
    : null;
  const currentBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === currentMonthStartDate) || null;
  const previousBucket =
    monthlyBuckets.find((bucket) => bucket.monthStartDate === previousMonthStartDate) || null;
  const currentMonthProfileCount = Number(currentBucket?.usedProfileCount || 0);
  const previousMonthProfileCount = Number(previousBucket?.usedProfileCount || 0);
  const profileCountDelta = currentMonthProfileCount - previousMonthProfileCount;

  let status = 'steady';
  if (profileCountDelta > 0) {
    status = 'growing';
  } else if (profileCountDelta < 0) {
    status = 'declining';
  }

  return {
    currentMonthProfileCount,
    currentMonthStartDate,
    previousMonthProfileCount,
    previousMonthStartDate,
    profileCountDelta,
    status,
  };
}

export function summarizeOrchestrationProfileAdoptionDrift({
  usageTrend = null,
  workspaceUsageTrend = null,
} = {}) {
  const normalizedUsageTrend = usageTrend?.status || 'unused';
  const normalizedWorkspaceUsageTrend = workspaceUsageTrend?.status || 'unused';
  const reasonCodes = [];

  if (normalizedUsageTrend === 'declining') {
    reasonCodes.push('mission-volume-declining');
  } else if (normalizedUsageTrend === 'growing') {
    reasonCodes.push('mission-volume-growing');
  }

  if (normalizedWorkspaceUsageTrend === 'declining') {
    reasonCodes.push('workspace-footprint-declining');
  } else if (normalizedWorkspaceUsageTrend === 'growing') {
    reasonCodes.push('workspace-footprint-growing');
  }

  let status = 'steady';
  if (normalizedUsageTrend === 'unused' && normalizedWorkspaceUsageTrend === 'unused') {
    status = 'unused';
    reasonCodes.push('unused-profile');
  } else if (
    normalizedUsageTrend === 'declining' ||
    normalizedWorkspaceUsageTrend === 'declining'
  ) {
    status = 'declining';
  } else if (
    normalizedUsageTrend === 'growing' ||
    normalizedWorkspaceUsageTrend === 'growing'
  ) {
    status = 'growing';
  }

  return {
    reasonCodes,
    status,
    usageTrendStatus: normalizedUsageTrend,
    workspaceUsageTrendStatus: normalizedWorkspaceUsageTrend,
  };
}

export function summarizeWorkspaceAdoptionDrift({
  missionTrend = null,
  profileFootprintTrend = null,
} = {}) {
  const normalizedMissionTrend = missionTrend?.status || 'unused';
  const normalizedProfileFootprintTrend = profileFootprintTrend?.status || 'unused';
  const reasonCodes = [];

  if (normalizedMissionTrend === 'declining') {
    reasonCodes.push('workspace-mission-volume-declining');
  } else if (normalizedMissionTrend === 'growing') {
    reasonCodes.push('workspace-mission-volume-growing');
  }

  if (normalizedProfileFootprintTrend === 'declining') {
    reasonCodes.push('workspace-profile-footprint-declining');
  } else if (normalizedProfileFootprintTrend === 'growing') {
    reasonCodes.push('workspace-profile-footprint-growing');
  }

  let status = 'steady';
  if (normalizedMissionTrend === 'unused' && normalizedProfileFootprintTrend === 'unused') {
    status = 'unused';
    reasonCodes.push('unused-workspace');
  } else if (
    normalizedMissionTrend === 'declining' ||
    normalizedProfileFootprintTrend === 'declining'
  ) {
    status = 'declining';
  } else if (
    normalizedMissionTrend === 'growing' ||
    normalizedProfileFootprintTrend === 'growing'
  ) {
    status = 'growing';
  }

  return {
    missionTrendStatus: normalizedMissionTrend,
    profileFootprintTrendStatus: normalizedProfileFootprintTrend,
    reasonCodes,
    status,
  };
}

export function summarizeWorkspaceHealthDriftEntries(entries = []) {
  const reasonCodeCounts = {};
  const statusCounts = {
    'follow-up-required': 0,
    stable: 0,
    watch: 0,
  };
  const workspaceIdsByStatus = {
    'follow-up-required': [],
    stable: [],
    watch: [],
  };
  let latestFollowUpRequiredWorkspace = null;
  let latestFollowUpRequiredWorkspaceAt = null;
  let latestStableWorkspace = null;
  let latestStableWorkspaceAt = null;
  let latestWatchWorkspace = null;
  let latestWatchWorkspaceAt = null;
  let latestWorkspace = null;
  let latestWorkspaceAt = null;

  for (const entry of entries) {
    if (statusCounts[entry.status] !== undefined) {
      statusCounts[entry.status] += 1;
    }
    if (workspaceIdsByStatus[entry.status]) {
      workspaceIdsByStatus[entry.status].push(entry.id);
    }
    for (const reasonCode of ensureArray(entry.reasonCodes)) {
      reasonCodeCounts[reasonCode] = (reasonCodeCounts[reasonCode] || 0) + 1;
    }
    const candidateLatestAt = entry.latestAt || null;
    if (
      candidateLatestAt &&
      (!latestWorkspaceAt || String(latestWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestWorkspaceAt = candidateLatestAt;
      latestWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        status: entry.status,
      };
    }
    if (
      entry.status === 'follow-up-required' &&
      candidateLatestAt &&
      (!latestFollowUpRequiredWorkspaceAt ||
        String(latestFollowUpRequiredWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestFollowUpRequiredWorkspaceAt = candidateLatestAt;
      latestFollowUpRequiredWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        status: entry.status,
      };
    }
    if (
      entry.status === 'watch' &&
      candidateLatestAt &&
      (!latestWatchWorkspaceAt || String(latestWatchWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestWatchWorkspaceAt = candidateLatestAt;
      latestWatchWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        status: entry.status,
      };
    }
    if (
      entry.status === 'stable' &&
      candidateLatestAt &&
      (!latestStableWorkspaceAt || String(latestStableWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestStableWorkspaceAt = candidateLatestAt;
      latestStableWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        status: entry.status,
      };
    }
  }

  for (const status of Object.keys(workspaceIdsByStatus)) {
    workspaceIdsByStatus[status] = workspaceIdsByStatus[status].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
  }

  return {
    latestFollowUpRequiredWorkspace,
    latestStableWorkspace,
    latestWatchWorkspace,
    latestWorkspace,
    reasonCodeCounts,
    reasonCodes: Object.keys(reasonCodeCounts).sort((left, right) =>
      String(left).localeCompare(String(right)),
    ),
    status:
      statusCounts['follow-up-required'] > 0
        ? 'follow-up-required'
        : statusCounts.watch > 0
          ? 'watch'
          : 'stable',
    statusCounts,
    workspaceCount: entries.length,
    workspaceIdsByStatus,
  };
}

export function summarizeWorkspaceAdoptionDriftEntries(entries = []) {
  const missionTrendStatusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
  );
  const profileFootprintTrendStatusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
  );
  const reasonCodeCounts = {};
  const statusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
  );
  const workspaceIdsByStatus = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, []]),
  );
  let latestDecliningWorkspace = null;
  let latestDecliningWorkspaceAt = null;
  let latestGrowingWorkspace = null;
  let latestGrowingWorkspaceAt = null;
  let latestProfile = null;
  let latestWorkspace = null;
  let latestWorkspaceAt = null;

  for (const entry of entries) {
    const adoptionStatus = entry.adoptionDrift?.status || 'unused';
    if (statusCounts[adoptionStatus] !== undefined) {
      statusCounts[adoptionStatus] += 1;
    }
    if (missionTrendStatusCounts[entry.missionTrend?.status] !== undefined) {
      missionTrendStatusCounts[entry.missionTrend.status] += 1;
    }
    if (profileFootprintTrendStatusCounts[entry.profileFootprintTrend?.status] !== undefined) {
      profileFootprintTrendStatusCounts[entry.profileFootprintTrend.status] += 1;
    }
    if (workspaceIdsByStatus[adoptionStatus]) {
      workspaceIdsByStatus[adoptionStatus].push(entry.id);
    }
    for (const reasonCode of ensureArray(entry.reasonCodes)) {
      reasonCodeCounts[reasonCode] = (reasonCodeCounts[reasonCode] || 0) + 1;
    }
    const candidateLatestAt = entry.latestAt || null;
    if (
      candidateLatestAt &&
      (!latestWorkspaceAt || String(latestWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestWorkspaceAt = candidateLatestAt;
      latestWorkspace = {
        adoptionDrift: entry.adoptionDrift || null,
        id: entry.id,
        latestAt: candidateLatestAt,
        missionTrend: entry.missionTrend || null,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        profileFootprintTrend: entry.profileFootprintTrend || null,
      };
      latestProfile = entry.profileId
        ? {
            adoptionDrift: entry.adoptionDrift || null,
            displayName: entry.profileDisplayName || null,
            id: entry.profileId || null,
            latestAt: candidateLatestAt,
            missionTrend: entry.missionTrend || null,
            workspaceId: entry.id,
            workspaceName: entry.name || null,
            profileFootprintTrend: entry.profileFootprintTrend || null,
          }
        : null;
    }
    if (
      adoptionStatus === 'growing' &&
      candidateLatestAt &&
      (!latestGrowingWorkspaceAt || String(latestGrowingWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestGrowingWorkspaceAt = candidateLatestAt;
      latestGrowingWorkspace = {
        adoptionDrift: entry.adoptionDrift || null,
        id: entry.id,
        latestAt: candidateLatestAt,
        missionTrend: entry.missionTrend || null,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileFootprintTrend: entry.profileFootprintTrend || null,
        profileId: entry.profileId || null,
      };
    }
    if (
      adoptionStatus === 'declining' &&
      candidateLatestAt &&
      (!latestDecliningWorkspaceAt ||
        String(latestDecliningWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestDecliningWorkspaceAt = candidateLatestAt;
      latestDecliningWorkspace = {
        adoptionDrift: entry.adoptionDrift || null,
        id: entry.id,
        latestAt: candidateLatestAt,
        missionTrend: entry.missionTrend || null,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileFootprintTrend: entry.profileFootprintTrend || null,
        profileId: entry.profileId || null,
      };
    }
  }

  for (const status of Object.keys(workspaceIdsByStatus)) {
    workspaceIdsByStatus[status] = workspaceIdsByStatus[status].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
  }

  const missionTrendStatus =
    missionTrendStatusCounts.declining > 0
      ? 'declining'
      : missionTrendStatusCounts.growing > 0
        ? 'growing'
        : missionTrendStatusCounts.steady > 0
          ? 'steady'
          : 'unused';
  const profileFootprintTrendStatus =
    profileFootprintTrendStatusCounts.declining > 0
      ? 'declining'
      : profileFootprintTrendStatusCounts.growing > 0
        ? 'growing'
        : profileFootprintTrendStatusCounts.steady > 0
          ? 'steady'
          : 'unused';

  return {
    latestDecliningWorkspace,
    latestGrowingWorkspace,
    latestProfile,
    latestWorkspace,
    missionTrendStatus,
    missionTrendStatusCounts,
    profileFootprintTrendStatus,
    profileFootprintTrendStatusCounts,
    reasonCodeCounts,
    reasonCodes: Object.keys(reasonCodeCounts).sort((left, right) =>
      String(left).localeCompare(String(right)),
    ),
    status:
      statusCounts.declining > 0
        ? 'declining'
        : statusCounts.growing > 0
          ? 'growing'
          : statusCounts.steady > 0
            ? 'steady'
            : 'unused',
    statusCounts,
    workspaceCount: entries.length,
    workspaceIdsByStatus,
  };
}

export function summarizeWorkspaceUsageTrendEntries(entries = []) {
  const statusCounts = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
  );
  const workspaceIdsByStatus = Object.fromEntries(
    ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, []]),
  );
  let latestWorkspace = null;
  let latestWorkspaceAt = null;
  let latestGrowingWorkspace = null;
  let latestGrowingWorkspaceAt = null;
  let latestDecliningWorkspace = null;
  let latestDecliningWorkspaceAt = null;

  for (const entry of entries) {
    if (statusCounts[entry.status] !== undefined) {
      statusCounts[entry.status] += 1;
    }
    if (workspaceIdsByStatus[entry.status]) {
      workspaceIdsByStatus[entry.status].push(entry.id);
    }
    const candidateLatestAt = entry.latestAt || null;
    if (
      candidateLatestAt &&
      (!latestWorkspaceAt || String(latestWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestWorkspaceAt = candidateLatestAt;
      latestWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        workspaceUsageTrend: entry.workspaceUsageTrend || null,
      };
    }
    if (
      entry.status === 'growing' &&
      candidateLatestAt &&
      (!latestGrowingWorkspaceAt || String(latestGrowingWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestGrowingWorkspaceAt = candidateLatestAt;
      latestGrowingWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        workspaceUsageTrend: entry.workspaceUsageTrend || null,
      };
    }
    if (
      entry.status === 'declining' &&
      candidateLatestAt &&
      (!latestDecliningWorkspaceAt || String(latestDecliningWorkspaceAt) < String(candidateLatestAt))
    ) {
      latestDecliningWorkspaceAt = candidateLatestAt;
      latestDecliningWorkspace = {
        id: entry.id,
        latestAt: candidateLatestAt,
        name: entry.name || null,
        profileDisplayName: entry.profileDisplayName || null,
        profileId: entry.profileId || null,
        workspaceUsageTrend: entry.workspaceUsageTrend || null,
      };
    }
  }

  for (const status of Object.keys(workspaceIdsByStatus)) {
    workspaceIdsByStatus[status] = workspaceIdsByStatus[status].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
  }

  return {
    latestDecliningWorkspace,
    latestWorkspace,
    latestGrowingWorkspace,
    statusCounts,
    workspaceCount: entries.length,
    workspaceIdsByStatus,
  };
}
