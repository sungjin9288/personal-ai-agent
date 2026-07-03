export function formatDateUtc(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function getUtcWeekRange(isoTimestamp) {
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

export function getUtcMonthRange(isoTimestamp) {
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

export function accumulateCountMap(target, source = {}) {
  for (const [key, value] of Object.entries(source || {})) {
    const normalizedValue = Number(value || 0);
    if (!normalizedValue) {
      continue;
    }
    target[key] = (target[key] || 0) + normalizedValue;
  }

  return target;
}

export function buildCountMapDelta(currentCounts = {}, previousCounts = {}) {
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
