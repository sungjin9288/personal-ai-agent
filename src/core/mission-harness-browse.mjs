function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeLimit(value, fallback = 12) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numericValue), 1), 200);
}

function normalizeOffset(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.max(Math.trunc(numericValue), 0);
}

function paginateEntries(entries, filter) {
  const limit = normalizeLimit(filter.limit, 12);
  const requestedOffset = normalizeOffset(filter.offset, 0);
  const lastPageOffset = entries.length ? Math.floor((entries.length - 1) / limit) * limit : 0;
  const offset = Math.min(requestedOffset, lastPageOffset);
  const pageEntries = entries.slice(offset, offset + limit);
  const pageCount = pageEntries.length;
  const visibleEnd = offset + pageCount;
  const totalPages = pageCount ? Math.ceil(entries.length / limit) : 0;

  return {
    entries: pageEntries,
    hasNext: visibleEnd < entries.length,
    hasPrev: offset > 0,
    limit,
    offset,
    pageCount,
    pageEnd: pageCount ? visibleEnd : 0,
    pageStart: pageCount ? offset + 1 : 0,
    remainingCount: Math.max(entries.length - visibleEnd, 0),
    totalPages,
  };
}

export function buildHarnessDocumentBrowseResult({ entries = [], filter = {}, registrySummary = {} }) {
  const query = normalizeText(filter.query).toLowerCase();
  const type = normalizeText(filter.type, 'all').toLowerCase() || 'all';
  const sort = normalizeText(filter.sort, 'latest').toLowerCase() || 'latest';
  const filteredEntries = entries.filter((entry) => {
    if (type !== 'all' && normalizeText(entry.type).toLowerCase() !== type) {
      return false;
    }
    if (!query) {
      return true;
    }

    return [entry.title, entry.type, entry.path, entry.content]
      .map((value) => normalizeText(value).toLowerCase())
      .join('\n')
      .includes(query);
  });

  filteredEntries.sort((left, right) => {
    const leftTimestamp = Date.parse(String(left.updatedAt || left.createdAt || '')) || 0;
    const rightTimestamp = Date.parse(String(right.updatedAt || right.createdAt || '')) || 0;

    if (sort === 'oldest') {
      return leftTimestamp - rightTimestamp;
    }
    if (sort === 'title') {
      return normalizeText(left.title).localeCompare(normalizeText(right.title), 'ko');
    }
    if (sort === 'type') {
      const typeOrder = normalizeText(left.type).localeCompare(normalizeText(right.type), 'ko');
      return typeOrder || normalizeText(left.title).localeCompare(normalizeText(right.title), 'ko');
    }

    return rightTimestamp - leftTimestamp;
  });

  const page = paginateEntries(filteredEntries, filter);

  return {
    entries: page.entries,
    filters: {
      limit: page.limit,
      offset: page.offset,
      query: normalizeText(filter.query),
      sort,
      type,
    },
    hasMore: page.hasNext,
    summary: {
      ...registrySummary,
      currentPage: page.totalPages ? Math.floor(page.offset / page.limit) + 1 : 0,
      filteredCount: filteredEntries.length,
      hasNext: page.hasNext,
      hasPrev: page.hasPrev,
      offset: page.offset,
      pageCount: page.pageCount,
      pageEnd: page.pageEnd,
      pageStart: page.pageStart,
      remainingCount: page.remainingCount,
      totalPages: page.totalPages,
      visibleCount: page.pageCount,
    },
  };
}

function toMemoryEntry(entry, scope) {
  return {
    content: entry.content,
    createdAt: entry.createdAt,
    id: entry.id,
    kind: entry.kind,
    scope,
    updatedAt: entry.updatedAt || null,
  };
}

export function buildHarnessMemoryBrowseResult({ filter = {}, missionEntries = [], workspaceEntries = [] }) {
  const query = normalizeText(filter.query).toLowerCase();
  const scope = normalizeText(filter.scope, 'all').toLowerCase() || 'all';
  const kind = normalizeText(filter.kind, 'all').toLowerCase() || 'all';
  const sort = normalizeText(filter.sort, 'latest').toLowerCase() || 'latest';
  const allEntries = [
    ...missionEntries.map((entry) => toMemoryEntry(entry, 'mission')),
    ...workspaceEntries.map((entry) => toMemoryEntry(entry, 'workspace')),
  ];
  const filteredEntries = allEntries.filter((entry) => {
    if (scope !== 'all' && entry.scope !== scope) {
      return false;
    }
    if (kind !== 'all' && normalizeText(entry.kind).toLowerCase() !== kind) {
      return false;
    }
    if (!query) {
      return true;
    }

    return [entry.kind, entry.content]
      .map((value) => normalizeText(value).toLowerCase())
      .join('\n')
      .includes(query);
  });

  filteredEntries.sort((left, right) => {
    const leftTimestamp = Date.parse(String(left.updatedAt || left.createdAt || '')) || 0;
    const rightTimestamp = Date.parse(String(right.updatedAt || right.createdAt || '')) || 0;

    if (sort === 'oldest') {
      return leftTimestamp - rightTimestamp;
    }
    if (sort === 'kind') {
      const kindOrder = normalizeText(left.kind).localeCompare(normalizeText(right.kind), 'ko');
      return kindOrder || rightTimestamp - leftTimestamp;
    }

    return rightTimestamp - leftTimestamp;
  });

  const page = paginateEntries(filteredEntries, filter);
  const filteredMissionCount = filteredEntries.filter((entry) => entry.scope === 'mission').length;
  const filteredWorkspaceCount = filteredEntries.filter((entry) => entry.scope === 'workspace').length;

  return {
    entries: page.entries,
    filters: {
      kind,
      limit: page.limit,
      offset: page.offset,
      query: normalizeText(filter.query),
      scope,
      sort,
    },
    hasMore: page.hasNext,
    missionEntries: page.entries.filter((entry) => entry.scope === 'mission'),
    summary: {
      currentPage: page.totalPages ? Math.floor(page.offset / page.limit) + 1 : 0,
      filteredMissionCount,
      filteredTotal: filteredEntries.length,
      filteredWorkspaceCount,
      hasNext: page.hasNext,
      hasPrev: page.hasPrev,
      missionTotal: missionEntries.length,
      offset: page.offset,
      pageCount: page.pageCount,
      pageEnd: page.pageEnd,
      pageStart: page.pageStart,
      remainingCount: page.remainingCount,
      total: allEntries.length,
      totalPages: page.totalPages,
      visibleCount: page.pageCount,
      workspaceTotal: workspaceEntries.length,
    },
    workspaceEntries: page.entries.filter((entry) => entry.scope === 'workspace'),
  };
}
