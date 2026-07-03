function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateUtc(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getUtcWeekRange(isoTimestamp) {
  const parsed = Date.parse(String(isoTimestamp || ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diffToMonday);
  const end = start + 6 * 24 * 60 * 60 * 1000;

  return {
    key: formatDateUtc(start),
    weekEndDate: formatDateUtc(end),
    weekStartDate: formatDateUtc(start),
  };
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

export function summarizeMaintenanceRuns(items) {
  const maintenanceImpactSummary = summarizeMaintenanceImpact(items);
  let acknowledgedMaintenanceRequiredCountTotal = 0;
  let effectiveRunCount = 0;
  const workspaceCounts = {};
  let escalationRemindedCountTotal = 0;
  let dueCandidateCountTotal = 0;
  let impactRunCount = 0;
  let latestEffectiveRun = null;
  let latestEffectiveRunAt = null;
  let latestNoOpRun = null;
  let latestNoOpRunAt = null;
  let latestRun = null;
  let latestRunAt = null;
  let ownerHandoffRemindedCountTotal = 0;
  let providerAttentionRemindedCountTotal = 0;
  let specialistFollowUpRemindedCountTotal = 0;
  const specialistFollowUpRemediationRouteCounts = {};
  const specialistFollowUpRetryPolicyCounts = {};
  let noOpRunCount = 0;
  let remainingMaintenanceRequiredCountTotal = 0;
  const recentRuns = [];
  let resolvedMaintenanceRequiredCountTotal = 0;
  let syncedCountTotal = 0;
  let totalRemindedCount = 0;

  for (const item of items) {
    const workspaceKey = item.workspaceId || 'global';
    workspaceCounts[workspaceKey] = (workspaceCounts[workspaceKey] || 0) + 1;
    acknowledgedMaintenanceRequiredCountTotal += Number(item.acknowledgedMaintenanceRequiredCount || 0);
    escalationRemindedCountTotal += Number(item.escalationRemindedCount || 0);
    dueCandidateCountTotal += Number(item.dueCandidateCountTotal || 0);
    ownerHandoffRemindedCountTotal += Number(item.ownerHandoffRemindedCount || 0);
    providerAttentionRemindedCountTotal += Number(item.providerAttentionRemindedCount || 0);
    specialistFollowUpRemindedCountTotal += Number(item.specialistFollowUpRemindedCount || 0);
    accumulateCountMap(
      specialistFollowUpRetryPolicyCounts,
      item.specialistFollowUpRetryPolicyCounts || item.specialistFollowUpRemindersSummary?.retryPolicyCounts || {},
    );
    accumulateCountMap(
      specialistFollowUpRemediationRouteCounts,
      item.specialistFollowUpRemediationRouteCounts ||
        item.specialistFollowUpRemindersSummary?.remediationRouteCounts ||
        {},
    );
    remainingMaintenanceRequiredCountTotal += Number(item.remainingMaintenanceRequiredCount || 0);
    resolvedMaintenanceRequiredCountTotal += Number(item.resolvedMaintenanceRequiredCount || 0);
    syncedCountTotal += Number(item.syncedCount || 0);
    totalRemindedCount += Number(item.totalRemindedCount || 0);
    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = isMaintenanceRunImpactful(item);

    if (isEffective) {
      effectiveRunCount += 1;
      if (!latestEffectiveRunAt || String(latestEffectiveRunAt) < String(item.createdAt || '')) {
        latestEffectiveRunAt = item.createdAt || null;
        latestEffectiveRun = item;
      }
    } else {
      noOpRunCount += 1;
      if (!latestNoOpRunAt || String(latestNoOpRunAt) < String(item.createdAt || '')) {
        latestNoOpRunAt = item.createdAt || null;
        latestNoOpRun = item;
      }
    }

    if (isImpactful) {
      impactRunCount += 1;
    }

    recentRuns.push({
      affectedMissionCount: affectedMissionIds.length,
      affectedMissionIds: affectedMissionIds.sort((left, right) => String(left).localeCompare(String(right))),
      createdAt: item.createdAt || null,
      id: item.id,
      isEffective,
      isImpactful,
      totalRemindedCount: Number(item.totalRemindedCount || 0),
    });

    if (!latestRunAt || String(latestRunAt) < String(item.createdAt || '')) {
      latestRunAt = item.createdAt || null;
      latestRun = item;
    }
  }

  return {
    acknowledgedMaintenanceRequiredCountTotal,
    affectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
    affectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
    dueCandidateCountTotal,
    effectiveRunCount,
    escalationRemindedCountTotal,
    impactRunCount,
    latestImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
    latestImpactRun: maintenanceImpactSummary.latestImpactRun,
    latestImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
    latestEffectiveRun,
    latestEffectiveRunAt,
    latestNoOpRun,
    latestNoOpRunAt,
    latestRun,
    latestRunAt,
    noOpRunCount,
    ownerHandoffRemindedCountTotal,
    providerAttentionRemindedCountTotal,
    specialistFollowUpRemediationRouteCounts,
    specialistFollowUpRemindedCountTotal,
    specialistFollowUpRetryPolicyCounts,
    recentRuns: recentRuns
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 5),
    remainingMaintenanceRequiredCountTotal,
    resolvedMaintenanceRequiredCountTotal,
    runCount: items.length,
    runOutcomeCounts: {
      effective: effectiveRunCount,
      impactful: impactRunCount,
      noOp: noOpRunCount,
      total: items.length,
    },
    syncedCountTotal,
    totalRemindedCount,
    workspaceCounts,
  };
}

export function summarizeMaintenancePressure(entries) {
  const dueWorkspaceCounts = {};
  let currentDueCandidateCountTotal = 0;
  let currentDueMonitoringCountTotal = 0;
  let currentDueOwnerHandoffCountTotal = 0;
  let currentDueProviderAttentionCountTotal = 0;
  let currentDueSpecialistFollowUpCountTotal = 0;
  let latestRequiredAction = null;
  let latestRequiredActionAt = null;
  let nextDueAt = null;

  for (const entry of entries) {
    const workspaceKey = entry.workspaceId || 'global';
    dueWorkspaceCounts[workspaceKey] = (dueWorkspaceCounts[workspaceKey] || 0) + 1;
    currentDueCandidateCountTotal += Number(entry.totalDueCandidateCount || 0);
    currentDueMonitoringCountTotal += Number(entry.dueMonitoringCount || 0);
    currentDueOwnerHandoffCountTotal += Number(entry.dueOwnerHandoffCount || 0);
    currentDueProviderAttentionCountTotal += Number(entry.dueProviderAttentionCount || 0);
    currentDueSpecialistFollowUpCountTotal += Number(entry.dueSpecialistFollowUpCount || 0);

    if (entry.nextDueAt && (!nextDueAt || String(nextDueAt) > String(entry.nextDueAt))) {
      nextDueAt = entry.nextDueAt;
    }

    if (!latestRequiredActionAt || String(latestRequiredActionAt) < String(entry.createdAt || '')) {
      latestRequiredActionAt = entry.createdAt || null;
      latestRequiredAction = entry;
    }
  }

  return {
    currentDueCandidateCountTotal,
    currentDueMonitoringCountTotal,
    currentDueOwnerHandoffCountTotal,
    currentDueProviderAttentionCountTotal,
    currentDueSpecialistFollowUpCountTotal,
    latestRequiredAction,
    latestRequiredActionAt,
    maintenanceDueWorkspaceIds: [...new Set(entries.map((entry) => entry.workspaceId).filter(Boolean))],
    maintenanceRequiredCount: entries.length,
    nextDueAt,
    dueWorkspaceCounts,
  };
}

export function getMaintenanceRunAffectedMissionIds(item) {
  return [...new Set([item.missionId, ...ensureArray(item.affectedMissionIds)].filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

export function isMaintenanceRunEffective(item) {
  return (
    Number(item.totalRemindedCount || 0) > 0 ||
    Number(item.acknowledgedMaintenanceRequiredCount || 0) > 0 ||
    Number(item.resolvedMaintenanceRequiredCount || 0) > 0
  );
}

export function isMaintenanceRunImpactful(item) {
  return getMaintenanceRunAffectedMissionIds(item).length > 0;
}

export function buildMaintenanceDailyBuckets(items) {
  const bucketMap = new Map();

  for (const item of items) {
    const createdAt = String(item.createdAt || '');
    if (!createdAt) {
      continue;
    }

    const date = createdAt.slice(0, 10);
    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = affectedMissionIds.length > 0;
    const current = bucketMap.get(date) || {
      affectedMissionIds: new Set(),
      date,
      effectiveRunCount: 0,
      impactRunCount: 0,
      noOpRunCount: 0,
      runCount: 0,
      specialistFollowUpRemediationRouteCounts: {},
      specialistFollowUpRetryPolicyCounts: {},
      totalRemindedCount: 0,
    };

    current.runCount += 1;
    current.totalRemindedCount += Number(item.totalRemindedCount || 0);
    accumulateCountMap(
      current.specialistFollowUpRetryPolicyCounts,
      item.specialistFollowUpRetryPolicyCounts || item.specialistFollowUpRemindersSummary?.retryPolicyCounts || {},
    );
    accumulateCountMap(
      current.specialistFollowUpRemediationRouteCounts,
      item.specialistFollowUpRemediationRouteCounts ||
        item.specialistFollowUpRemindersSummary?.remediationRouteCounts ||
        {},
    );
    if (isEffective) {
      current.effectiveRunCount += 1;
    } else {
      current.noOpRunCount += 1;
    }
    if (isImpactful) {
      current.impactRunCount += 1;
    }
    for (const missionId of affectedMissionIds) {
      current.affectedMissionIds.add(missionId);
    }
    bucketMap.set(date, current);
  }

  return [...bucketMap.values()]
    .map((bucket) => {
      const affectedMissionIds = [...bucket.affectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
      return {
        affectedMissionCount: affectedMissionIds.length,
        affectedMissionIds,
        date: bucket.date,
        effectiveRunCount: bucket.effectiveRunCount,
        impactRunCount: bucket.impactRunCount,
        noOpRunCount: bucket.noOpRunCount,
        runCount: bucket.runCount,
        specialistFollowUpRemediationRouteCounts: bucket.specialistFollowUpRemediationRouteCounts,
        specialistFollowUpRetryPolicyCounts: bucket.specialistFollowUpRetryPolicyCounts,
        totalRemindedCount: bucket.totalRemindedCount,
      };
    })
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

export function buildMaintenanceWeeklyBuckets(items) {
  const bucketMap = new Map();

  for (const item of items) {
    const createdAt = String(item.createdAt || '');
    if (!createdAt) {
      continue;
    }

    const weekRange = getUtcWeekRange(createdAt);
    if (!weekRange) {
      continue;
    }

    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = affectedMissionIds.length > 0;
    const current = bucketMap.get(weekRange.key) || {
      affectedMissionIds: new Set(),
      effectiveRunCount: 0,
      impactRunCount: 0,
      noOpRunCount: 0,
      runCount: 0,
      specialistFollowUpRemediationRouteCounts: {},
      specialistFollowUpRetryPolicyCounts: {},
      totalRemindedCount: 0,
      weekEndDate: weekRange.weekEndDate,
      weekStartDate: weekRange.weekStartDate,
    };

    current.runCount += 1;
    current.totalRemindedCount += Number(item.totalRemindedCount || 0);
    accumulateCountMap(
      current.specialistFollowUpRetryPolicyCounts,
      item.specialistFollowUpRetryPolicyCounts || item.specialistFollowUpRemindersSummary?.retryPolicyCounts || {},
    );
    accumulateCountMap(
      current.specialistFollowUpRemediationRouteCounts,
      item.specialistFollowUpRemediationRouteCounts ||
        item.specialistFollowUpRemindersSummary?.remediationRouteCounts ||
        {},
    );
    if (isEffective) {
      current.effectiveRunCount += 1;
    } else {
      current.noOpRunCount += 1;
    }
    if (isImpactful) {
      current.impactRunCount += 1;
    }
    for (const missionId of affectedMissionIds) {
      current.affectedMissionIds.add(missionId);
    }
    bucketMap.set(weekRange.key, current);
  }

  return [...bucketMap.values()]
    .map((bucket) => {
      const affectedMissionIds = [...bucket.affectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
      return {
        affectedMissionCount: affectedMissionIds.length,
        affectedMissionIds,
        effectiveRunCount: bucket.effectiveRunCount,
        impactRunCount: bucket.impactRunCount,
        noOpRunCount: bucket.noOpRunCount,
        runCount: bucket.runCount,
        specialistFollowUpRemediationRouteCounts: bucket.specialistFollowUpRemediationRouteCounts,
        specialistFollowUpRetryPolicyCounts: bucket.specialistFollowUpRetryPolicyCounts,
        totalRemindedCount: bucket.totalRemindedCount,
        weekEndDate: bucket.weekEndDate,
        weekStartDate: bucket.weekStartDate,
      };
    })
    .sort((left, right) => String(right.weekStartDate).localeCompare(String(left.weekStartDate)));
}

export function buildMaintenanceMonthlyBuckets(items) {
  const bucketMap = new Map();

  for (const item of items) {
    const createdAt = String(item.createdAt || '');
    if (!createdAt) {
      continue;
    }

    const monthRange = getUtcMonthRange(createdAt);
    if (!monthRange) {
      continue;
    }

    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = affectedMissionIds.length > 0;
    const current = bucketMap.get(monthRange.key) || {
      affectedMissionIds: new Set(),
      effectiveRunCount: 0,
      impactRunCount: 0,
      monthEndDate: monthRange.monthEndDate,
      monthKey: monthRange.monthKey,
      monthStartDate: monthRange.monthStartDate,
      noOpRunCount: 0,
      runCount: 0,
      specialistFollowUpRemediationRouteCounts: {},
      specialistFollowUpRetryPolicyCounts: {},
      totalRemindedCount: 0,
    };

    current.runCount += 1;
    current.totalRemindedCount += Number(item.totalRemindedCount || 0);
    accumulateCountMap(
      current.specialistFollowUpRetryPolicyCounts,
      item.specialistFollowUpRetryPolicyCounts || item.specialistFollowUpRemindersSummary?.retryPolicyCounts || {},
    );
    accumulateCountMap(
      current.specialistFollowUpRemediationRouteCounts,
      item.specialistFollowUpRemediationRouteCounts ||
        item.specialistFollowUpRemindersSummary?.remediationRouteCounts ||
        {},
    );
    if (isEffective) {
      current.effectiveRunCount += 1;
    } else {
      current.noOpRunCount += 1;
    }
    if (isImpactful) {
      current.impactRunCount += 1;
    }
    for (const missionId of affectedMissionIds) {
      current.affectedMissionIds.add(missionId);
    }
    bucketMap.set(monthRange.key, current);
  }

  return [...bucketMap.values()]
    .map((bucket) => {
      const affectedMissionIds = [...bucket.affectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
      return {
        affectedMissionCount: affectedMissionIds.length,
        affectedMissionIds,
        effectiveRunCount: bucket.effectiveRunCount,
        impactRunCount: bucket.impactRunCount,
        monthEndDate: bucket.monthEndDate,
        monthKey: bucket.monthKey,
        monthStartDate: bucket.monthStartDate,
        noOpRunCount: bucket.noOpRunCount,
        runCount: bucket.runCount,
        specialistFollowUpRemediationRouteCounts: bucket.specialistFollowUpRemediationRouteCounts,
        specialistFollowUpRetryPolicyCounts: bucket.specialistFollowUpRetryPolicyCounts,
        totalRemindedCount: bucket.totalRemindedCount,
      };
    })
    .sort((left, right) => String(right.monthStartDate).localeCompare(String(left.monthStartDate)));
}

export function buildMaintenanceLatestBucketDelta(dailyBuckets) {
  const current = dailyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = dailyBuckets[1] || null;
  return {
    affectedMissionCountDelta: Number(current.affectedMissionCount || 0) - Number(previous?.affectedMissionCount || 0),
    currentDate: current.date,
    effectiveRunCountDelta: Number(current.effectiveRunCount || 0) - Number(previous?.effectiveRunCount || 0),
    impactRunCountDelta: Number(current.impactRunCount || 0) - Number(previous?.impactRunCount || 0),
    noOpRunCountDelta: Number(current.noOpRunCount || 0) - Number(previous?.noOpRunCount || 0),
    previousDate: previous?.date || null,
    runCountDelta: Number(current.runCount || 0) - Number(previous?.runCount || 0),
    specialistFollowUpRemediationRouteCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRemediationRouteCounts || {},
      previous?.specialistFollowUpRemediationRouteCounts || {},
    ),
    specialistFollowUpRetryPolicyCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRetryPolicyCounts || {},
      previous?.specialistFollowUpRetryPolicyCounts || {},
    ),
    totalRemindedCountDelta: Number(current.totalRemindedCount || 0) - Number(previous?.totalRemindedCount || 0),
  };
}

export function buildMaintenanceLatestWeeklyBucketDelta(weeklyBuckets) {
  const current = weeklyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = weeklyBuckets[1] || null;
  return {
    affectedMissionCountDelta: Number(current.affectedMissionCount || 0) - Number(previous?.affectedMissionCount || 0),
    currentWeekEndDate: current.weekEndDate,
    currentWeekStartDate: current.weekStartDate,
    effectiveRunCountDelta: Number(current.effectiveRunCount || 0) - Number(previous?.effectiveRunCount || 0),
    impactRunCountDelta: Number(current.impactRunCount || 0) - Number(previous?.impactRunCount || 0),
    noOpRunCountDelta: Number(current.noOpRunCount || 0) - Number(previous?.noOpRunCount || 0),
    previousWeekEndDate: previous?.weekEndDate || null,
    previousWeekStartDate: previous?.weekStartDate || null,
    runCountDelta: Number(current.runCount || 0) - Number(previous?.runCount || 0),
    specialistFollowUpRemediationRouteCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRemediationRouteCounts || {},
      previous?.specialistFollowUpRemediationRouteCounts || {},
    ),
    specialistFollowUpRetryPolicyCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRetryPolicyCounts || {},
      previous?.specialistFollowUpRetryPolicyCounts || {},
    ),
    totalRemindedCountDelta: Number(current.totalRemindedCount || 0) - Number(previous?.totalRemindedCount || 0),
  };
}

export function buildMaintenanceLatestMonthlyBucketDelta(monthlyBuckets) {
  const current = monthlyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = monthlyBuckets[1] || null;
  return {
    affectedMissionCountDelta: Number(current.affectedMissionCount || 0) - Number(previous?.affectedMissionCount || 0),
    currentMonthEndDate: current.monthEndDate,
    currentMonthKey: current.monthKey,
    currentMonthStartDate: current.monthStartDate,
    effectiveRunCountDelta: Number(current.effectiveRunCount || 0) - Number(previous?.effectiveRunCount || 0),
    impactRunCountDelta: Number(current.impactRunCount || 0) - Number(previous?.impactRunCount || 0),
    noOpRunCountDelta: Number(current.noOpRunCount || 0) - Number(previous?.noOpRunCount || 0),
    previousMonthEndDate: previous?.monthEndDate || null,
    previousMonthKey: previous?.monthKey || null,
    previousMonthStartDate: previous?.monthStartDate || null,
    runCountDelta: Number(current.runCount || 0) - Number(previous?.runCount || 0),
    specialistFollowUpRemediationRouteCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRemediationRouteCounts || {},
      previous?.specialistFollowUpRemediationRouteCounts || {},
    ),
    specialistFollowUpRetryPolicyCountsDelta: buildCountMapDelta(
      current.specialistFollowUpRetryPolicyCounts || {},
      previous?.specialistFollowUpRetryPolicyCounts || {},
    ),
    totalRemindedCountDelta: Number(current.totalRemindedCount || 0) - Number(previous?.totalRemindedCount || 0),
  };
}

export function summarizeMaintenanceImpact(items, scopeMissionIds = null) {
  const affectedMissionIds = new Set();
  let latestImpactRun = null;
  let latestImpactRunAt = null;
  let latestImpactAffectedMissionIds = [];
  const allowedMissionIds = scopeMissionIds ? new Set(scopeMissionIds) : null;

  for (const item of items) {
    const runAffectedMissionIds = [...new Set([item.missionId, ...ensureArray(item.affectedMissionIds)].filter(Boolean))].filter(
      (missionId) => !allowedMissionIds || allowedMissionIds.has(missionId),
    );
    for (const missionId of runAffectedMissionIds) {
      affectedMissionIds.add(missionId);
    }

    if (
      runAffectedMissionIds.length > 0 &&
      (!latestImpactRunAt || String(latestImpactRunAt) < String(item.createdAt || ''))
    ) {
      latestImpactRunAt = item.createdAt || null;
      latestImpactRun = item;
      latestImpactAffectedMissionIds = [...runAffectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
    }
  }

  return {
    affectedMissionCount: affectedMissionIds.size,
    affectedMissionIds: [...affectedMissionIds].sort((left, right) => String(left).localeCompare(String(right))),
    latestImpactAffectedMissionIds,
    latestImpactRun,
    latestImpactRunAt,
  };
}
