import { normalizeUiParam } from './ui-params.js';

export function getReleaseHandoffStableLineCopyLabel(summaryKey) {
  return summaryKey
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();
}

export function getReleaseHandoffAdditionalSummaryKeys(summary = {}) {
  const stableKeys = Object.keys(summary)
    .filter((key) => key.startsWith('summaryStableLineCopy'))
    .sort((left, right) => left.length - right.length || left.localeCompare(right));
  return [...new Set([
      ...stableKeys,
      'summaryDetailCopyPreview',
      'summaryDetailCopyPreviewLineCopy',
      'summaryDetailCopyPreviewLineCopyBody',
    ])].filter((key) => summary[key] && typeof summary[key] === 'object');
}

export function appendReleaseHandoffSummaryRow(rows, key, entry = {}) {
  rows.push({
    label: getReleaseHandoffStableLineCopyLabel(key),
    value: `${Number((entry.exactMatchCount ?? entry.errorFreeSessions) || 0)}/${Number(entry.totalSessions || 0)} exact-match`,
  });
}

export function getReleaseHandoffStructuredSummaryRows(item = {}) {
  const summary = item?.structuredSummary;
  if (!summary || typeof summary !== 'object') {
    return [];
  }
  const rows = [
    {
      label: 'preview',
      value: `${Number(summary.preview?.errorFreeSessions || 0)}/${Number(summary.preview?.totalSessions || 0)} error-free`,
    },
    {
      label: 'open',
      value: `${Number(summary.open?.errorFreeSessions || 0)}/${Number(summary.open?.totalSessions || 0)} error-free`,
    },
  ];

  for (const key of ['summaryCopy', 'summaryCopyPreview', 'summaryDetailCopy']) {
    if (summary[key] && typeof summary[key] === 'object') {
      appendReleaseHandoffSummaryRow(rows, key, summary[key]);
    }
  }

  for (const summaryKey of getReleaseHandoffAdditionalSummaryKeys(summary)) {
    appendReleaseHandoffSummaryRow(rows, summaryKey, summary[summaryKey]);
  }

  return rows;
}

export function getReleaseHandoffStructuredSummaryDetails(item = {}) {
  const summary = item?.structuredSummary;
  if (!summary || typeof summary !== 'object') {
    return [];
  }
  const detailKeys = [
    'preview',
    'open',
    'summaryCopy',
    'summaryCopyPreview',
    'summaryDetailCopy',
    ...getReleaseHandoffAdditionalSummaryKeys(summary),
  ];

  return [...new Set(detailKeys)]
    .map((key) => {
      const overviewLine = String(summary?.[key]?.overviewLine || '').trim();
      if (!overviewLine) {
        return null;
      }
      const stableLines = Array.isArray(summary?.[key]?.stableLines)
        ? summary[key].stableLines.map((line) => String(line || '').trim()).filter(Boolean)
        : [];
      return {
        key,
        label: getReleaseHandoffStableLineCopyLabel(key),
        overviewLine,
        stableLineCount: Number(summary?.[key]?.stableLineCount ?? stableLines.length ?? 0),
        stableLines,
      };
    })
    .filter(Boolean);
}

export function getReleaseHandoffStructuredSummaryDetailOverviewLine(item = {}, detailKey = '') {
  const normalizedDetailKey = normalizeUiParam(detailKey);
  if (!normalizedDetailKey) {
    return '';
  }
  const detailEntry = getReleaseHandoffStructuredSummaryDetails(item).find(
    (detail) => normalizeUiParam(detail.key) === normalizedDetailKey,
  );
  return String(detailEntry?.overviewLine || '').trim();
}

export function getReleaseHandoffStructuredSummarySha(item = {}) {
  return String(item?.structuredSummary?.sha256 || '').trim();
}

export function getReleaseHandoffStructuredSummaryOverviewLine(item = {}) {
  return String(item?.structuredSummary?.overviewLine || '').trim();
}
