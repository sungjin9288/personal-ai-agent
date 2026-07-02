export function stripFileExtension(fileName = '') {
  return String(fileName).replace(/\.[^.]+$/, '');
}

export function getFileExtension(fileName = '') {
  const match = String(fileName || '').toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

export function formatByteCount(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function getHarnessPageSizeLabel(limit) {
  const normalized = Number(limit || 12) || 12;
  return `${normalized}건씩`;
}

export function getHarnessPageLabel(summary = {}) {
  const currentPage = Number(summary.currentPage || 0);
  const totalPages = Number(summary.totalPages || 0);
  if (!currentPage || !totalPages) {
    return '0 / 0 페이지';
  }
  return `${currentPage} / ${totalPages} 페이지`;
}

export function getHarnessRangeLabel(summary = {}, totalCount = 0) {
  const pageStart = Number(summary.pageStart || 0);
  const pageEnd = Number(summary.pageEnd || 0);
  if (!pageStart || !pageEnd || !totalCount) {
    return '표시할 항목이 없습니다';
  }
  return `${pageStart}-${pageEnd} / ${totalCount}건`;
}

export function getDetailTabLabel(tabId) {
  return (
    {
      artifacts: '결과물',
      config: '입력값과 설정',
      harness: '하네스',
      release: 'v1 마감 상태',
      reviews: '검토 이력',
      runs: '실행 기록',
    }[tabId] || '세부 보기'
  );
}

export function getRetrievalCompareStatusLabel(compare = {}) {
  const status = String(compare.status || '').trim();

  if (status === 'aligned') {
    return 'preview와 evidence 정렬됨';
  }
  if (status === 'partial') {
    return '일부 source만 유지됨';
  }
  if (status === 'shifted') {
    return 'source 흐름이 바뀜';
  }
  if (status === 'empty') {
    return '비교할 retrieval 없음';
  }
  if (status === 'no-evidence') {
    return '최근 evidence 없음';
  }

  return 'retrieval 비교';
}

export function getReleaseCountRecordEntries(record = {}) {
  if (!record || typeof record !== 'object') {
    return [];
  }
  return Object.entries(record)
    .map(([key, value]) => [String(key || '').trim(), Number(value || 0)])
    .filter(([key, value]) => Boolean(key) && value > 0)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => rightValue - leftValue || leftKey.localeCompare(rightKey));
}

export function formatProviderFallbackEventCountLines(counts = {}, emptyLabel = 'none') {
  const entries = getReleaseCountRecordEntries(counts);
  if (!entries.length) {
    return [`- ${emptyLabel}`];
  }
  return entries.map(([key, value]) => `- ${key}: ${value}`);
}

export function getPrimaryArtifact(artifacts = []) {
  return (
    artifacts
      .slice()
      .reverse()
      .find((artifact) => ['deliverable', 'execution-handoff', 'approval-resolution'].includes(artifact.kind)) ||
    artifacts[artifacts.length - 1] ||
    null
  );
}

export function inferCommandOption(command = '', optionName = '') {
  const escapedOption = String(optionName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escapedOption) {
    return '';
  }
  const match = String(command).match(new RegExp(`${escapedOption}\\s+([^\\s]+)`, 'i'));
  return match ? match[1] : '';
}

export function inferFallbackPolicyFromCommand(command = '') {
  return inferCommandOption(command, '--fallback-policy');
}

export function getLearningPromotionCandidateId(item) {
  if (!item) {
    return '';
  }
  if (item.learningCandidateId) {
    return String(item.learningCandidateId);
  }
  return String(item.actionId || '').replace(/^learning-promotion:/, '');
}

export function formatLearningPromotionAuditValue(value, fallback = '-') {
  if (value === true) {
    return 'true';
  }
  if (value === false) {
    return 'false';
  }
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : fallback;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
      .map(([key, entryValue]) => `${key}=${entryValue}`);
    return entries.length ? entries.join(', ') : fallback;
  }
  return String(value);
}

export function getFormEditingId(form) {
  return String(form?.dataset?.editingId || '').trim();
}

export function getReleaseProductionBlockerVerificationCommands() {
  return [
    {
      command: 'npm run smoke:production-readiness-gate',
      label: 'Production readiness gate',
    },
    {
      command: 'npm run smoke:release-artifact-hygiene',
      label: 'Release artifact hygiene',
    },
    {
      command: 'npm run smoke:execution-v1-status',
      label: 'Execution v1 status',
    },
  ];
}
