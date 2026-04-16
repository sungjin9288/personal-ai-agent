const state = {
  activeStep: 'step-setup',
  activeDetailTab: 'artifacts',
  approvals: [],
  artifactsById: new Map(),
  currentSessionPayload: null,
  executionLogs: null,
  executionPollTimer: null,
  executionStatus: null,
  harnessDocumentOffset: 0,
  harnessDocumentResult: null,
  harnessDocumentFilter: 'all',
  harnessDocumentQuery: '',
  harnessDocumentSort: 'latest',
  harnessDocumentVisibleCount: 12,
  harnessMemoryOffset: 0,
  harnessMemoryResult: null,
  harnessMemoryFilterKind: 'all',
  harnessMemoryFilterScope: 'all',
  harnessMemoryQuery: '',
  harnessMemorySort: 'latest',
  harnessMemoryVisibleCount: 12,
  missionActions: null,
  missionDetail: null,
  missionTimeline: null,
  missions: [],
  providers: [],
  releaseLiveConfirmProvider: '',
  releaseExpandedHistoryId: '',
  releaseFocusedProvider: '',
  releaseHistoryFilterOutcome: '',
  releaseHistoryFilterProvider: '',
  releaseHistoryFilterScope: '',
  releaseLiveRefreshPreflight: null,
  releaseFocusedHistoryId: '',
  releaseRegenerationConfirmArmed: false,
  releaseRefreshPreflight: null,
  releasePreflightResults: {},
  releaseSnapshotConfirmArmed: false,
  releaseSnapshotPreflight: null,
  releaseStatus: null,
  selectedPlaybookId: 'team-pipeline',
  selectedArtifactId: null,
  selectedMissionId: null,
  selectedSessionId: null,
  uiNotice: '',
  uiNoticeTimer: null,
  workspaces: [],
};

const missionTemplates = [
  {
    title: 'PRD 초안',
    subtitle: '문제, 목표, 요구사항, 성공 신호, 다음 액션까지 구조화',
    values: {
      constraints: '핵심 사용자 문제를 명시\n성공 기준을 테스트 가능하게 작성\n다음 액션의 담당자와 기한 포함',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '문제 정의부터 실행 가능한 PRD 초안까지 구조화',
      title: '신규 기능 PRD 초안',
    },
  },
  {
    title: '운영 방향 정리',
    subtitle: '운영 원칙, 의사결정 주기, 역할 분담을 빠르게 정리',
    values: {
      constraints: '운영 원칙 포함\n의사결정 cadence 정의\n담당자와 검토 주기 명시',
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: '프로젝트 운영 방식과 의사결정 구조를 정리',
      title: '운영 방향 정리',
    },
  },
  {
    title: '프롬프트 설계',
    subtitle: '에이전트 역할별 프롬프트 뼈대와 품질 기준 정의',
    values: {
      constraints: '역할별 프롬프트 뼈대 포함\n입력/출력 형식 정의\n품질 기준 명시',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '에이전트가 재사용할 프롬프트 구조와 운영 규칙 정의',
      title: '프롬프트 설계 문서',
    },
  },
];

const missionPlaybooks = [
  {
    id: 'team-pipeline',
    origin: 'oh-my-claudecode',
    title: '팀 파이프라인',
    subtitle: '단계형 멀티 에이전트 핸드오프',
    description: '매니저가 방향을 잡고 플래너, 실행, 리뷰어 순으로 넘기는 기본 운영 흐름입니다.',
    values: {
      constraints:
        '단계형 매니저→플래너→실행→리뷰어 핸드오프를 유지\n각 단계 산출물과 담당자를 명시\n최종 리뷰어 승인 필요',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '단계형 멀티 에이전트 운영 흐름으로 결과물을 구조화',
      title: '팀 파이프라인 미션',
    },
  },
  {
    id: 'research-first',
    origin: 'everything-claude-code',
    title: '리서치 우선',
    subtitle: '실행 전 근거와 리스크 정리',
    description: '실행 전에 옵션, 가정, 리스크를 먼저 정리하는 조사 중심 플레이북입니다.',
    values: {
      constraints:
        '근거 기반 옵션 비교 포함\n핵심 가정과 미확인 항목 명시\n실행 전 조사 요약을 먼저 정리',
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: '근거와 리스크를 먼저 정리한 뒤 실행 방향을 결정',
      title: '리서치 우선 의사결정 메모',
    },
  },
  {
    id: 'review-stack',
    origin: 'gstack',
    title: '리뷰 스택',
    subtitle: '제품 / 디자인 / 엔지니어링 준비 상태 점검',
    description: '실행 전후로 제품, 디자인, 엔지니어링 관점의 준비 상태를 함께 점검하는 리뷰 중심 플레이북입니다.',
    values: {
      constraints: '제품/디자인/엔지니어링 검토 기준 포함\n승인 전 준비 체크리스트 작성\n최종 산출물 담당자 지정',
      deliverableType: 'prd',
      mode: 'knowledge',
      objective: '리뷰 관점별 준비 상태를 명확히 한 결과물 작성',
      title: '리뷰 준비형 미션 브리프',
    },
  },
  {
    id: 'verify-before-close',
    origin: 'superpowers',
    title: '닫기 전 검증',
    subtitle: '증거와 완료 기준 먼저 확인',
    description: '완료 선언 전에 검증 근거와 다음 액션을 먼저 고정하는 검증 중심 플레이북입니다.',
    values: {
      constraints:
        '검증 근거 포함\n완료 기준을 명시\n다음 액션의 담당자와 기한 포함',
      deliverableType: 'implementation-proposal',
      mode: 'engineering',
      objective: '검증 가능한 근거를 남기고 닫는 운영 흐름으로 정리',
      title: '검증 중심 실행 제안서',
    },
  },
];

const elements = {
  actionList: document.getElementById('action-list'),
  agentLane: document.getElementById('agent-lane'),
  actionSummary: document.getElementById('action-summary'),
  approvalList: document.getElementById('approval-list'),
  artifactMeta: document.getElementById('artifact-meta'),
  artifactViewer: document.getElementById('artifact-viewer'),
  detailContextbar: document.getElementById('detail-contextbar'),
  detailPanels: Array.from(document.querySelectorAll('.detail-panel')),
  detailTabButtons: Array.from(document.querySelectorAll('[data-detail-tab]')),
  documentLogFile: document.getElementById('document-log-file'),
  documentLogFilter: document.getElementById('document-log-filter'),
  documentLogForm: document.getElementById('document-log-form'),
  documentLogFormStatus: document.getElementById('document-log-form-status'),
  documentLogSearch: document.getElementById('document-log-search'),
  documentLogCancelButton: document.getElementById('document-log-cancel-button'),
  documentLogSubmitButton: document.getElementById('document-log-submit-button'),
  executionConsole: document.getElementById('execution-console'),
  flowStatus: document.getElementById('flow-status'),
  harnessLoops: document.getElementById('harness-loops'),
  harnessMemory: document.getElementById('harness-memory'),
  harnessSource: document.getElementById('harness-source'),
  heroMetrics: document.getElementById('hero-metrics'),
  heroSignals: document.getElementById('hero-signals'),
  missionFilter: document.getElementById('mission-filter'),
  missionForm: document.getElementById('mission-form'),
  missionList: document.getElementById('mission-list'),
  memoryForm: document.getElementById('memory-form'),
  memoryFormStatus: document.getElementById('memory-form-status'),
  memoryCancelButton: document.getElementById('memory-cancel-button'),
  memorySubmitButton: document.getElementById('memory-submit-button'),
  workspaceMemoryForm: document.getElementById('workspace-memory-form'),
  workspaceMemoryFormStatus: document.getElementById('workspace-memory-form-status'),
  workspaceMemoryCancelButton: document.getElementById('workspace-memory-cancel-button'),
  workspaceMemorySubmitButton: document.getElementById('workspace-memory-submit-button'),
  missionSubtitle: document.getElementById('mission-subtitle'),
  playbookList: document.getElementById('playbook-list'),
  missionSummary: document.getElementById('mission-summary'),
  missionTitle: document.getElementById('mission-title'),
  providerList: document.getElementById('provider-list'),
  releaseStatus: document.getElementById('release-status'),
  reviewReadiness: document.getElementById('review-readiness'),
  reviewReadinessDetail: document.getElementById('review-readiness-detail'),
  runMissionButton: document.getElementById('run-mission-button'),
  runProviderSelect: document.getElementById('run-provider-select'),
  reviewStageSummary: document.getElementById('review-stage-summary'),
  runStageSummary: document.getElementById('run-stage-summary'),
  setupHarnessSummary: document.getElementById('setup-harness-summary'),
  sessionDetail: document.getElementById('session-detail'),
  sessionList: document.getElementById('session-list'),
  selectionBridge: document.getElementById('selection-bridge'),
  stepButtons: Array.from(document.querySelectorAll('[data-step-target]')),
  stepPanels: Array.from(document.querySelectorAll('.step-panel')),
  templateList: document.getElementById('template-list'),
  timelineList: document.getElementById('timeline-list'),
  toggleCreateButton: document.getElementById('toggle-create-button'),
  outputStageSummary: document.getElementById('output-stage-summary'),
  outputCloseout: document.getElementById('output-closeout'),
  missionQueueSummary: document.getElementById('mission-queue-summary'),
  workspaceSelect: document.getElementById('workspace-select'),
};

const STEP_TO_DETAIL_TAB = {
  'step-setup': 'config',
  'step-run': 'runs',
  'step-review': 'reviews',
  'step-output': 'artifacts',
};

const STEP_META = {
  'step-output': { label: '4단계 · 결과 보기', shortLabel: '결과 보기' },
  'step-review': { label: '3단계 · 검토하기', shortLabel: '검토하기' },
  'step-run': { label: '2단계 · 실행하기', shortLabel: '실행하기' },
  'step-setup': { label: '1단계 · 미션 정하기', shortLabel: '미션 정하기' },
};

const DETAIL_TAB_IDS = new Set(['artifacts', 'runs', 'reviews', 'config', 'harness', 'release']);
const STEP_IDS = new Set(Object.keys(STEP_META));

function getSelectedWorkspaceId() {
  return String(elements.workspaceSelect.value || state.workspaces[0]?.id || '').trim();
}

function normalizeUiParam(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function getSanitizedStepId(stepId) {
  const normalized = normalizeUiParam(stepId);
  return normalized && STEP_IDS.has(normalized) ? normalized : null;
}

function getSanitizedDetailTab(tabId) {
  const normalized = normalizeUiParam(tabId);
  return normalized && DETAIL_TAB_IDS.has(normalized) ? normalized : null;
}

function getSanitizedReleaseHistoryOutcome(outcome) {
  const normalized = normalizeUiParam(outcome);
  return normalized === 'attention' ? normalized : null;
}

function parseUiStateFromUrl() {
  const params = new URL(window.location.href).searchParams;
  return {
    artifactId: normalizeUiParam(params.get('artifact')),
    detailTab: getSanitizedDetailTab(params.get('tab')),
    missionId: normalizeUiParam(params.get('mission')),
    releaseFocusedProvider: normalizeUiParam(params.get('rcard')),
    releaseFocusedHistoryId: normalizeUiParam(params.get('rhistory')),
    releaseHistoryOutcome: getSanitizedReleaseHistoryOutcome(params.get('routcome')),
    releaseHistoryProvider: normalizeUiParam(params.get('rprovider')),
    releaseHistoryScope: normalizeUiParam(params.get('rscope')),
    sessionId: normalizeUiParam(params.get('session')),
    stepId: getSanitizedStepId(params.get('step')),
    workspaceId: normalizeUiParam(params.get('workspace')),
  };
}

function buildUiStateUrl(overrides = {}) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const workspaceId =
    overrides.workspaceId !== undefined
      ? normalizeUiParam(overrides.workspaceId)
      : getSelectedWorkspaceId();
  const missionId =
    overrides.missionId !== undefined
      ? normalizeUiParam(overrides.missionId)
      : normalizeUiParam(state.selectedMissionId);
  const stepId =
    overrides.stepId !== undefined
      ? getSanitizedStepId(overrides.stepId)
      : getSanitizedStepId(state.activeStep);
  const detailTab =
    overrides.detailTab !== undefined
      ? getSanitizedDetailTab(overrides.detailTab)
      : getSanitizedDetailTab(state.activeDetailTab);
  const sessionId =
    overrides.sessionId !== undefined
      ? normalizeUiParam(overrides.sessionId)
      : normalizeUiParam(state.selectedSessionId);
  const artifactId =
    overrides.artifactId !== undefined
      ? normalizeUiParam(overrides.artifactId)
      : normalizeUiParam(state.selectedArtifactId);
  const releaseFocusedProvider =
    overrides.releaseFocusedProvider !== undefined
      ? normalizeUiParam(overrides.releaseFocusedProvider)
      : normalizeUiParam(state.releaseFocusedProvider);
  const releaseFocusedHistoryId =
    overrides.releaseFocusedHistoryId !== undefined
      ? normalizeUiParam(overrides.releaseFocusedHistoryId)
      : normalizeUiParam(state.releaseFocusedHistoryId);
  const releaseHistoryOutcome =
    overrides.releaseHistoryOutcome !== undefined
      ? getSanitizedReleaseHistoryOutcome(overrides.releaseHistoryOutcome)
      : getSanitizedReleaseHistoryOutcome(state.releaseHistoryFilterOutcome);
  const releaseHistoryProvider =
    overrides.releaseHistoryProvider !== undefined
      ? normalizeUiParam(overrides.releaseHistoryProvider)
      : normalizeUiParam(state.releaseHistoryFilterProvider);
  const releaseHistoryScope =
    overrides.releaseHistoryScope !== undefined
      ? normalizeUiParam(overrides.releaseHistoryScope)
      : normalizeUiParam(state.releaseHistoryFilterScope);

  if (workspaceId) {
    params.set('workspace', workspaceId);
  } else {
    params.delete('workspace');
  }

  if (missionId) {
    params.set('mission', missionId);
    if (stepId) {
      params.set('step', stepId);
    } else {
      params.delete('step');
    }
    if (detailTab) {
      params.set('tab', detailTab);
    } else {
      params.delete('tab');
    }
    if (sessionId) {
      params.set('session', sessionId);
    } else {
      params.delete('session');
    }
    if (artifactId) {
      params.set('artifact', artifactId);
    } else {
      params.delete('artifact');
    }
  } else {
    params.delete('mission');
    params.delete('session');
    params.delete('artifact');

    if (stepId && stepId !== 'step-setup') {
      params.set('step', stepId);
    } else {
      params.delete('step');
    }

    if (detailTab && detailTab !== 'config') {
      params.set('tab', detailTab);
    } else {
      params.delete('tab');
    }
  }

  if (detailTab === 'release') {
    if (releaseFocusedProvider) {
      params.set('rcard', releaseFocusedProvider);
    } else {
      params.delete('rcard');
    }
    if (releaseFocusedHistoryId) {
      params.set('rhistory', releaseFocusedHistoryId);
    } else {
      params.delete('rhistory');
    }
    if (releaseHistoryOutcome) {
      params.set('routcome', releaseHistoryOutcome);
    } else {
      params.delete('routcome');
    }
    if (releaseHistoryProvider) {
      params.set('rprovider', releaseHistoryProvider);
    } else {
      params.delete('rprovider');
    }
    if (releaseHistoryScope) {
      params.set('rscope', releaseHistoryScope);
    } else {
      params.delete('rscope');
    }
  } else {
    params.delete('rcard');
    params.delete('rhistory');
    params.delete('routcome');
    params.delete('rprovider');
    params.delete('rscope');
  }

  return `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
}

function writeUiStateToUrl({ historyMode = 'replace' } = {}) {
  const nextUrl = buildUiStateUrl();
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    const method = historyMode === 'push' ? 'pushState' : 'replaceState';
    window.history[method](null, '', nextUrl);
  }
}

function stripFileExtension(fileName = '') {
  return String(fileName).replace(/\.[^.]+$/, '');
}

function setUiNotice(message = '') {
  state.uiNotice = String(message || '').trim();
  if (state.uiNoticeTimer) {
    window.clearTimeout(state.uiNoticeTimer);
    state.uiNoticeTimer = null;
  }
  renderFlowState();

  if (state.uiNotice) {
    state.uiNoticeTimer = window.setTimeout(() => {
      state.uiNotice = '';
      state.uiNoticeTimer = null;
      renderFlowState();
    }, 2400);
  }
}

function getFormEditingId(form) {
  return String(form?.dataset?.editingId || '').trim();
}

function getMemoryFormConfig(scope) {
  if (scope === 'workspace') {
    return {
      cancelButton: elements.workspaceMemoryCancelButton,
      defaultStatus: '장기 운영 규칙과 팀 공통 선호를 저장합니다.',
      form: elements.workspaceMemoryForm,
      status: elements.workspaceMemoryFormStatus,
      submitButton: elements.workspaceMemorySubmitButton,
      submitText: '워크스페이스 메모 저장',
      updatingText: '워크스페이스 메모 수정',
    };
  }

  return {
    cancelButton: elements.memoryCancelButton,
    defaultStatus: '현재 실행 문맥에 필요한 사실, 결정, 선호를 저장합니다.',
    form: elements.memoryForm,
    status: elements.memoryFormStatus,
    submitButton: elements.memorySubmitButton,
    submitText: '미션 메모 저장',
    updatingText: '미션 메모 수정',
  };
}

function getHarnessMemoryEntry(scope, memoryId) {
  const result = state.harnessMemoryResult;
  const recentMemory = state.missionDetail?.harness?.memory;
  const entries = result
    ? scope === 'workspace'
      ? result.workspaceEntries || []
      : result.missionEntries || []
    : scope === 'workspace'
      ? recentMemory?.recentWorkspaceEntries || []
      : recentMemory?.recentMissionEntries || [];
  return entries.find((entry) => entry.id === memoryId) || null;
}

function getHarnessDocumentEntry(entryId) {
  const entries = state.harnessDocumentResult?.entries || state.missionDetail?.harness?.documents?.recentEntries || [];
  return entries.find((entry) => entry.id === entryId) || null;
}

function resetMemoryForm(scope) {
  const config = getMemoryFormConfig(scope);
  if (!config.form) {
    return;
  }

  config.form.reset();
  delete config.form.dataset.editingId;
  if (config.status) {
    config.status.textContent = config.defaultStatus;
  }
  if (config.submitButton) {
    config.submitButton.textContent = config.submitText;
  }
  if (config.cancelButton) {
    config.cancelButton.hidden = true;
  }
}

function populateMemoryForm(scope, entry) {
  const config = getMemoryFormConfig(scope);
  if (!config.form || !entry) {
    return;
  }

  config.form.dataset.editingId = entry.id;
  const kindField = config.form.querySelector('select[name="kind"]');
  const contentField = config.form.querySelector('textarea[name="content"]');
  if (kindField) {
    kindField.value = entry.kind;
  }
  if (contentField) {
    contentField.value = entry.content;
    contentField.focus();
  }
  if (config.status) {
    config.status.textContent = `${scope === 'workspace' ? '워크스페이스' : '미션'} 메모 수정 중 · ${getDisplayLabel(entry.kind, entry.kind)} · ${formatDate(entry.updatedAt || entry.createdAt)}`;
  }
  if (config.submitButton) {
    config.submitButton.textContent = config.updatingText;
  }
  if (config.cancelButton) {
    config.cancelButton.hidden = false;
  }
}

function resetDocumentLogForm() {
  if (!elements.documentLogForm) {
    return;
  }

  elements.documentLogForm.reset();
  delete elements.documentLogForm.dataset.editingId;
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = 'Markdown, txt, json 파일은 브라우저에서 읽어 본문으로 채운 뒤 같은 route로 저장합니다.';
  }
  if (elements.documentLogSubmitButton) {
    elements.documentLogSubmitButton.textContent = '문서 기록 저장';
  }
  if (elements.documentLogCancelButton) {
    elements.documentLogCancelButton.hidden = true;
  }
  if (elements.documentLogFile) {
    elements.documentLogFile.value = '';
  }
}

function getHarnessMemoryFilterLabel({ scopeFilter, kindFilter, query }) {
  const scopeLabel = scopeFilter === 'all' ? '전체 범위' : scopeFilter === 'mission' ? '미션 메모' : '워크스페이스 메모';
  const kindLabel = kindFilter === 'all' ? '전체 종류' : getDisplayLabel(kindFilter, kindFilter);
  const queryLabel = query || '검색 조건';
  return `${scopeLabel} · ${kindLabel} · ${queryLabel}`;
}

function getHarnessDocumentSortLabel() {
  const sort = String(state.harnessDocumentSort || 'latest').trim();
  if (sort === 'oldest') {
    return '오래된 순';
  }
  if (sort === 'title') {
    return '제목순';
  }
  if (sort === 'type') {
    return '유형순';
  }
  return '최신순';
}

function getHarnessPageSizeLabel(limit) {
  const normalized = Number(limit || 12) || 12;
  return `${normalized}건씩`;
}

function getHarnessMemorySortLabel() {
  const sort = String(state.harnessMemorySort || 'latest').trim();
  if (sort === 'oldest') {
    return '오래된 순';
  }
  if (sort === 'kind') {
    return '종류순';
  }
  return '최신순';
}

function getHarnessPageLabel(summary = {}) {
  const currentPage = Number(summary.currentPage || 0);
  const totalPages = Number(summary.totalPages || 0);
  if (!currentPage || !totalPages) {
    return '0 / 0 페이지';
  }
  return `${currentPage} / ${totalPages} 페이지`;
}

function getHarnessRangeLabel(summary = {}, totalCount = 0) {
  const pageStart = Number(summary.pageStart || 0);
  const pageEnd = Number(summary.pageEnd || 0);
  if (!pageStart || !pageEnd || !totalCount) {
    return '표시할 항목이 없습니다';
  }
  return `${pageStart}-${pageEnd} / ${totalCount}건`;
}

function renderHarnessFilterChips(items = []) {
  if (!items.length) {
    return '';
  }

  return `
    <div class="harness-active-filters">
      ${items
        .map(
          (item) => `
            <span class="filter-chip">
              <em>${escapeHtml(item.label)}</em>
              <strong>${escapeHtml(item.value)}</strong>
            </span>
          `,
        )
        .join('')}
    </div>
  `;
}

function populateDocumentLogForm(entry) {
  if (!elements.documentLogForm || !entry) {
    return;
  }

  elements.documentLogForm.dataset.editingId = entry.id;
  const missionTitlePrefix = state.missionDetail?.mission?.title ? `${state.missionDetail.mission.title} · ` : '';
  const typeField = elements.documentLogForm.querySelector('select[name="type"]');
  const titleField = elements.documentLogForm.querySelector('input[name="title"]');
  const contentField = elements.documentLogForm.querySelector('textarea[name="content"]');

  if (typeField) {
    typeField.value = entry.type;
  }
  if (titleField) {
    titleField.value = missionTitlePrefix && String(entry.title || '').startsWith(missionTitlePrefix)
      ? String(entry.title || '').slice(missionTitlePrefix.length)
      : entry.title;
  }
  if (contentField) {
    contentField.value = entry.content;
    contentField.focus();
  }
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `문서 기록 수정 중 · ${getDisplayLabel(entry.type, entry.type)} · ${formatDate(entry.updatedAt || entry.createdAt)}`;
  }
  if (elements.documentLogSubmitButton) {
    elements.documentLogSubmitButton.textContent = '문서 기록 수정';
  }
  if (elements.documentLogCancelButton) {
    elements.documentLogCancelButton.hidden = false;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusClass(status = '') {
  return `status-${String(status).trim().replaceAll(' ', '-').replaceAll('/', '-').toLowerCase()}`;
}

function stopExecutionPolling() {
  if (state.executionPollTimer) {
    clearInterval(state.executionPollTimer);
    state.executionPollTimer = null;
  }
}

function getExecutionStatusPayload() {
  return state.executionStatus?.execution || state.missionDetail?.execution || null;
}

function isExecutionMissionSelected() {
  return state.missionDetail?.mission?.mode === 'engineering';
}

const DISPLAY_LABELS = {
  'approval-resolution': '승인 처리 결과',
  approved: '승인됨',
  artifact: '산출물',
  'awaiting-approval': '승인 대기',
  awaiting_approval: '승인 대기',
  blocked: '막힘',
  completed: '완료',
  'decision-memo': '의사결정 메모',
  decision: '결정',
  deliverable: '최종 산출물',
  devlog: '개발 로그',
  engineering: '엔지니어링 작업',
  'env-missing': '환경 변수 누락',
  'execution-handoff': '실행 인계',
  execution_lease: '실행 lease',
  'execution-manifest': '실행 manifest',
  execution_ready: '실행 준비',
  execution_running: '실행 중',
  failed: '실패',
  fact: '사실',
  high: '높음',
  'implementation-proposal': '구현 제안서',
  incident: '인시던트 기록',
  knowledge: '지식 작업',
  low: '낮음',
  manager: '매니저',
  medium: '보통',
  normal: '보통',
  open: '열림',
  pending: '대기',
  'pending-approval': '승인 대기',
  planner: '플래너',
  prd: 'PRD',
  queued: '대기열',
  ready: '준비됨',
  'approval-required': '승인 필요',
  required: '필요',
  reference: '참고 레포 기록',
  rejected: '반려됨',
  retryReady: '재실행 권장',
  reviewer: '리뷰어',
  running: '실행 중',
  stopped: '중단됨',
  stable: '안정',
  stub: '스텁',
  supported: '지원됨',
  preference: '선호',
  verification: '검증',
};

function getHarnessRecommendationAction(recommendation) {
  const code = String(recommendation?.code || '').trim();
  switch (code) {
    case 'pending-approvals':
      return {
        action: 'jump-step',
        label: '검토 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '승인 항목 보기',
        secondaryValue: 'reviews',
        value: 'step-review',
      };
    case 'pending-actions':
      return {
        action: 'jump-step',
        label: '검토 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '후속 작업 보기',
        secondaryValue: 'reviews',
        value: 'step-review',
      };
    case 'missing-artifact':
      return {
        action: 'jump-step',
        label: '실행 단계 열기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '실행 기록 보기',
        secondaryValue: 'runs',
        value: 'step-run',
      };
    case 'empty-memory':
      return {
        action: 'jump-step',
        label: '1단계 입력 점검',
        secondaryAction: 'switch-tab',
        secondaryLabel: '하네스 보기',
        secondaryValue: 'harness',
        value: 'step-setup',
      };
    case 'maintenance-required':
    case 'provider-health-drift':
    default:
      return {
        action: 'switch-tab',
        label: '하네스 보기',
        secondaryAction: 'switch-tab',
        secondaryLabel: '실행 기록 보기',
        secondaryValue: 'runs',
        value: 'harness',
      };
  }
}

function getHarnessSummaryState() {
  const harness = state.missionDetail?.harness || null;
  const topRecommendation = harness?.recommendations?.[0] || null;
  const recommendationAction = getHarnessRecommendationAction(topRecommendation);
  return {
    docsAvailableCount: harness?.documents?.summary?.availableCount || 0,
    docsTotalCount: harness?.documents?.summary?.totalCount || 0,
    memoryTotalCount: harness?.memory?.missionCounts?.total || 0,
    pendingActionCount: harness?.loops?.review?.pendingActions || 0,
    pendingApprovalCount: harness?.loops?.review?.pendingApprovals || 0,
    providerHealthStatus: harness?.loops?.provider?.healthDriftStatus || 'stable',
    recommendationAction,
    recommendationCount: harness?.recommendations?.length || 0,
    topRecommendation,
  };
}

function getReleaseStatusSummary() {
  const release = state.releaseStatus || null;
  if (!release) {
    return {
      blockedItems: 0,
      checklistOpen: 0,
      deterministicLabel: '데이터 없음',
      generatedAt: '',
      ready: false,
    };
  }

  const deterministicPassed = Number(release.summary?.deterministicPassed || 0);
  const deterministicTotal = Number(release.summary?.deterministicTotal || 0);
  return {
    blockedItems: Number(release.summary?.blockedItems || 0),
    checklistOpen: Number(release.summary?.checklistOpen || 0),
    deterministicLabel:
      deterministicTotal > 0
        ? `${deterministicPassed}/${deterministicTotal} passed`
        : '데이터 없음',
    generatedAt: release.updatedAt || release.closeout?.generatedAt || release.evidence?.generatedAt || '',
    ready: Boolean(release.summary?.ready),
  };
}

function getDisplayLabel(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  return DISPLAY_LABELS[raw] || DISPLAY_LABELS[raw.toLowerCase()] || raw;
}

function getReleaseStatusBadge(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return 'status-pending';
  }
  if (normalized.includes('passed') || normalized.includes('ready')) {
    return 'status-completed';
  }
  if (normalized.includes('blocked') || normalized.includes('missing-env') || normalized.includes('failed')) {
    return 'status-failed';
  }
  return 'status-pending';
}

function getReleaseActionLabel(action = '') {
  const normalized = String(action || '').trim().toLowerCase();
  return (
    {
      'provider-preflight': 'provider preflight',
      refresh: 'current surface / live refresh',
      'refresh-preflight': 'refresh preflight',
      snapshot: 'release snapshot',
      'snapshot-preflight': 'snapshot preflight',
    }[normalized] || 'release action'
  );
}

function getReleaseActionScopeLabel(scope = '') {
  const normalized = String(scope || '').trim().toLowerCase();
  return (
    {
      'current-surface': 'current surface',
      'live-validation': 'live validation',
      'provider-readiness': 'provider readiness',
      snapshot: 'snapshot freeze',
    }[normalized] || 'release flow'
  );
}

function isReleaseAttentionOutcome(outcome = '') {
  const normalized = String(outcome || '').trim().toLowerCase();
  return normalized === 'blocked' || normalized === 'failed' || normalized === 'confirmation-required';
}

function matchesReleaseActionRecommendation(item, historyItem, providerReadiness = []) {
  const action = String(item?.action || '').trim();
  const actionProvider = String(item?.actionProvider || '').trim();
  const providerFromEnv = String(
    providerReadiness.find((entry) => String(entry.envKey || '').trim() === String(item?.envKey || '').trim())?.provider || '',
  ).trim();
  const provider = actionProvider || providerFromEnv;
  const historyAction = String(historyItem?.action || '').trim();
  const historyScope = String(historyItem?.scope || '').trim();
  const historyProvider = String(historyItem?.provider || '').trim();

  if (action === 'regenerate-release-surface') {
    return historyScope === 'current-surface' && (historyAction === 'refresh' || historyAction === 'refresh-preflight');
  }

  if (action === 'archive-release-snapshot') {
    return historyScope === 'snapshot' && (historyAction === 'snapshot' || historyAction === 'snapshot-preflight');
  }

  if (action === 'run-release-preflight' && provider) {
    return historyAction === 'provider-preflight' && historyProvider === provider;
  }

  if (!action && provider) {
    return historyProvider === provider;
  }

  return false;
}

function getRecommendationHistoryContext(item, releaseActionHistory = [], providerReadiness = []) {
  if (!Array.isArray(releaseActionHistory) || !releaseActionHistory.length) {
    return {
      attentionCount: 0,
      latestAction: null,
      latestAttentionAction: null,
      matchCount: 0,
    };
  }

  const matches = releaseActionHistory.filter((historyItem) => matchesReleaseActionRecommendation(item, historyItem, providerReadiness));
  const attentionMatches = matches.filter((historyItem) => isReleaseAttentionOutcome(historyItem?.outcome));
  return {
    attentionCount: attentionMatches.length,
    latestAction: matches[0] || null,
    latestAttentionAction: attentionMatches[0] || null,
    matchCount: matches.length,
  };
}

function getRecommendationProviderEntry(item, providerReadiness = []) {
  const actionProvider = String(item?.actionProvider || '').trim();
  const envKey = String(item?.envKey || '').trim();
  return providerReadiness.find((entry) => {
    const entryProvider = String(entry?.provider || '').trim();
    const entryEnvKey = String(entry?.envKey || '').trim();
    return (actionProvider && entryProvider === actionProvider) || (envKey && entryEnvKey === envKey);
  });
}

function getRecommendationCommandContext(item, providerReadiness = []) {
  const action = String(item?.action || '').trim();
  const envKey = String(item?.envKey || '').trim();
  const providerEntry = getRecommendationProviderEntry(item, providerReadiness);

  if (!providerEntry) {
    return null;
  }

  if (action === 'run-release-preflight') {
    return {
      command: String(providerEntry.preflightCommand || '').trim(),
      label: `${providerEntry.label} preflight 명령`,
      buttonLabel: 'preflight 명령 복사',
    };
  }

  if (envKey) {
    return {
      command: providerEntry.ready
        ? String(providerEntry.command || '').trim()
        : `export ${providerEntry.envKey}="..." && ${providerEntry.command}`,
      label: `${providerEntry.label} live 명령`,
      buttonLabel: 'live 명령 복사',
    };
  }

  return null;
}

function isRecommendationFlowActive({ attentionAction = null, latestAction = null }, {
  focusedHistoryId = '',
  historyFilterOutcome = '',
  historyFilterProvider = '',
  historyFilterScope = '',
} = {}) {
  const historyId = String(latestAction?.id || '').trim();
  const scope = String(latestAction?.scope || '').trim();
  const provider = String(latestAction?.provider || '').trim();
  const attentionHistoryId = String(attentionAction?.id || '').trim();
  const attentionScope = String(attentionAction?.scope || '').trim() || scope;
  const attentionProvider = String(attentionAction?.provider || '').trim() || provider;

  return {
    attentionFlowActive:
      Boolean(attentionHistoryId)
      && focusedHistoryId === attentionHistoryId
      && historyFilterOutcome === 'attention'
      && historyFilterScope === attentionScope
      && historyFilterProvider === attentionProvider,
    sameFlowActive:
      Boolean(historyId)
      && focusedHistoryId === historyId
      && historyFilterOutcome === ''
      && historyFilterScope === scope
      && historyFilterProvider === provider,
  };
}

function focusReleaseHistoryEntry(historyId = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedHistoryId = String(historyId || '').trim();
  if (!normalizedHistoryId) {
    return;
  }
  state.releaseFocusedHistoryId = normalizedHistoryId;
  state.releaseExpandedHistoryId = normalizedHistoryId;
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(`[data-release-history-id="${CSS.escape(normalizedHistoryId)}"]`);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

function focusReleaseProvider(provider = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return;
  }
  state.releaseFocusedProvider = normalizedProvider;
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(`[data-release-provider="${CSS.escape(normalizedProvider)}"]`);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

function toggleReleaseHistoryEntry(historyId = '') {
  const normalizedHistoryId = String(historyId || '').trim();
  if (!normalizedHistoryId) {
    return;
  }
  const nextExpandedId =
    state.releaseExpandedHistoryId === normalizedHistoryId ? '' : normalizedHistoryId;
  state.releaseExpandedHistoryId = nextExpandedId;
  if (nextExpandedId) {
    state.releaseFocusedHistoryId = normalizedHistoryId;
  }
  renderReleaseStatus();
}

function clearReleaseHistoryFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedHistoryId = '';
  state.releaseExpandedHistoryId = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

function clearReleaseProviderFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedProvider = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

function setReleaseHistoryFilter({
  outcome = state.releaseHistoryFilterOutcome,
  scope = state.releaseHistoryFilterScope,
  provider = state.releaseHistoryFilterProvider,
  historyMode = 'replace',
} = {}) {
  state.releaseHistoryFilterOutcome = String(outcome || '').trim();
  state.releaseHistoryFilterScope = String(scope || '').trim();
  state.releaseHistoryFilterProvider = String(provider || '').trim();
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

function clearReleaseHistoryFilter({ historyMode = 'replace' } = {}) {
  state.releaseHistoryFilterOutcome = '';
  state.releaseHistoryFilterScope = '';
  state.releaseHistoryFilterProvider = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

function applyReleaseHistoryUrlState({
  focusedHistoryId = '',
  outcome = '',
  provider = '',
  scope = '',
} = {}) {
  const history = state.releaseStatus?.releaseActionHistory || [];
  const normalizedFocusedHistoryId = String(focusedHistoryId || '').trim();
  const normalizedOutcome = String(outcome || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const normalizedScope = String(scope || '').trim();

  state.releaseFocusedHistoryId = history.some((item) => item.id === normalizedFocusedHistoryId)
    ? normalizedFocusedHistoryId
    : '';
  state.releaseExpandedHistoryId = state.releaseFocusedHistoryId;
  state.releaseHistoryFilterOutcome =
    normalizedOutcome === 'attention' && history.some((item) => isReleaseAttentionOutcome(item.outcome))
      ? 'attention'
      : '';
  state.releaseHistoryFilterScope = history.some((item) => String(item.scope || '').trim() === normalizedScope)
    ? normalizedScope
    : '';
  state.releaseHistoryFilterProvider = history.some((item) => String(item.provider || '').trim() === normalizedProvider)
    ? normalizedProvider
    : '';
  renderReleaseStatus();
}

function applyReleaseProviderUrlState(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerReadiness = state.releaseStatus?.providerReadiness || [];
  state.releaseFocusedProvider = providerReadiness.some((item) => String(item.provider || '').trim() === normalizedProvider)
    ? normalizedProvider
    : '';
  renderReleaseStatus();
}

function focusReleaseHistoryFlow({
  historyId = '',
  outcome = '',
  provider = '',
  scope = '',
  historyMode = 'replace',
} = {}) {
  const normalizedHistoryId = String(historyId || '').trim();
  const normalizedOutcome = String(outcome || '').trim();
  const normalizedScope = String(scope || '').trim();
  const normalizedProvider = String(provider || '').trim();

  if (!normalizedHistoryId && !normalizedOutcome && !normalizedScope && !normalizedProvider) {
    return;
  }

  state.releaseHistoryFilterOutcome = normalizedOutcome;
  state.releaseHistoryFilterScope = normalizedScope;
  state.releaseHistoryFilterProvider = normalizedProvider;
  if (normalizedHistoryId) {
    focusReleaseHistoryEntry(normalizedHistoryId, { historyMode });
    return;
  }
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

function getStepLabel(stepId, { short = false } = {}) {
  const meta = STEP_META[stepId];
  if (!meta) {
    return short ? '단계 없음' : '단계 없음';
  }

  return short ? meta.shortLabel : meta.label;
}

function getDetailTabLabel(tabId) {
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

function summarizeText(value, fallback = '') {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.length > 92 ? `${normalized.slice(0, 92).trim()}…` : normalized;
}

function getTimelineKindLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '이벤트';
  }

  if (raw === 'session-ended') {
    return '세션 종료';
  }

  if (raw === 'session-started') {
    return '세션 시작';
  }

  if (raw.startsWith('provider-execution-')) {
    if (raw.endsWith('succeeded')) {
      return '제공자 실행 성공';
    }
    if (raw.endsWith('failed')) {
      return '제공자 실행 실패';
    }
  }

  if (raw.startsWith('provider-attention')) {
    return '제공자 주의';
  }

  if (raw.includes('approval')) {
    return '승인 이벤트';
  }

  if (raw.includes('maintenance')) {
    return '유지보수 이벤트';
  }

  return getDisplayLabel(raw, '이벤트');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || '요청 처리에 실패했습니다.');
  }
  return payload;
}

function markdownToHtml(markdown = '') {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const html = [];
  let inList = false;
  let inCode = false;
  let paragraph = [];
  let code = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${paragraph.join('<br />')}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  function flushCode() {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
    inCode = false;
    code = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(list[1])}</li>`);
      continue;
    }

    flushList();
    paragraph.push(escapeHtml(line));
  }

  flushParagraph();
  flushList();
  flushCode();
  return html.join('');
}

function emptyStateCard({ icon = '01', title, message, actionLabel = '', action = '', actionValue = '' }) {
  return `
    <div class="empty-card">
      <div class="empty-icon">${escapeHtml(icon)}</div>
      <div class="empty-body">
        <h3 class="empty-title">${escapeHtml(title)}</h3>
        <p class="empty-copy">${escapeHtml(message)}</p>
      </div>
      ${
        actionLabel
          ? `<div class="empty-actions">
              <button class="ghost-button" type="button" data-ui-action="${escapeHtml(action)}" data-ui-value="${escapeHtml(actionValue)}">
                ${escapeHtml(actionLabel)}
              </button>
            </div>`
          : ''
      }
    </div>
  `;
}

function wireQuickActions(scope = document) {
  scope.querySelectorAll('[data-ui-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.uiAction;
      const value = button.dataset.uiValue || '';

      if (action === 'open-create') {
        openComposer();
        return;
      }

      if (action === 'clear-filter') {
        elements.missionFilter.value = '';
        renderMissionList();
        return;
      }

      if (action === 'jump-step' || action === 'jump-section') {
        setActiveStep(value || 'step-setup', { urlMode: 'push' });
        return;
      }

      if (action === 'switch-tab') {
        setActiveDetailTab(value || 'artifacts', { urlMode: 'push' });
        return;
      }

      if (action === 'copy-view-link') {
        void copyCurrentViewLink();
        return;
      }

      if (action === 'reset-view') {
        void resetCurrentView();
        return;
      }

      if (action === 'refresh-release-status') {
        void reloadReleaseStatus();
        return;
      }

      if (action === 'regenerate-release-surface') {
        if (!state.releaseRegenerationConfirmArmed) {
          void armReleaseRegenerationConfirm();
          return;
        }
        void refreshReleaseStatus('', { confirmCurrentSurfaceRewrite: true });
        return;
      }

      if (action === 'cancel-regenerate-release-surface') {
        state.releaseRegenerationConfirmArmed = false;
        state.releaseRefreshPreflight = null;
        renderReleaseStatus();
        setUiNotice('current surface 재생성 확인을 취소했습니다.');
        return;
      }

      if (action === 'archive-release-snapshot') {
        if (!state.releaseSnapshotConfirmArmed) {
          void armReleaseSnapshotConfirm();
          return;
        }
        void archiveReleaseSnapshot({ confirmSnapshotFreeze: true });
        return;
      }

      if (action === 'cancel-archive-release-snapshot') {
        state.releaseSnapshotConfirmArmed = false;
        state.releaseSnapshotPreflight = null;
        renderReleaseStatus();
        setUiNotice('release snapshot 고정 확인을 취소했습니다.');
        return;
      }

      if (action === 'cancel-refresh-release-status-live') {
        state.releaseLiveConfirmProvider = '';
        state.releaseLiveRefreshPreflight = null;
        renderReleaseStatus();
        setUiNotice('provider live validation 확인을 취소했습니다.');
        return;
      }

      if (action === 'focus-release-history') {
        focusReleaseHistoryEntry(value || '', { historyMode: 'push' });
        setUiNotice('최근 release action 기록으로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-provider') {
        focusReleaseProvider(button.dataset.uiProvider || value || '', { historyMode: 'push' });
        setUiNotice('연결된 provider readiness 카드로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-flow') {
        focusReleaseHistoryFlow({
          historyId: value || '',
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || '',
          provider: button.dataset.uiProvider || '',
          scope: button.dataset.uiScope || '',
        });
        setUiNotice('같은 release flow 기준으로 history를 좁혀 봅니다.');
        return;
      }

      if (action === 'toggle-release-history') {
        toggleReleaseHistoryEntry(value || '');
        return;
      }

      if (action === 'clear-release-history-focus') {
        clearReleaseHistoryFocus({ historyMode: 'push' });
        setUiNotice('release action history 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-provider-focus') {
        clearReleaseProviderFocus({ historyMode: 'push' });
        setUiNotice('provider readiness 카드 포커스를 해제했습니다.');
        return;
      }

      if (action === 'copy-release-triage-link') {
        void copyReleaseTriageLink();
        return;
      }

      if (action === 'copy-release-history-link') {
        void copyReleaseTriageLink({
          focusedHistoryId: value || '',
          historyOutcome: '',
          historyProvider: '',
          historyScope: '',
          successNotice: '선택한 release 기록 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-command') {
        void copyPlainTextValue(value || '', {
          promptMessage: `${button.dataset.uiLabel || 'release command'}를 복사하세요.`,
          shownNotice: `${button.dataset.uiLabel || 'release command'}를 표시했습니다.`,
          successNotice: `${button.dataset.uiLabel || 'release command'}를 복사했습니다.`,
        });
        return;
      }

      if (action === 'copy-release-flow-link') {
        void copyReleaseTriageLink({
          focusedHistoryId: value || '',
          historyOutcome: button.dataset.uiOutcome || '',
          historyProvider: button.dataset.uiProvider || '',
          historyScope: button.dataset.uiScope || '',
          successNotice: '선택한 release flow 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'filter-release-history-scope') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          scope: button.dataset.uiScope || '',
          provider: state.releaseHistoryFilterProvider,
        });
        setUiNotice('같은 scope 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-provider') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          scope: state.releaseHistoryFilterScope,
          provider: button.dataset.uiProvider || '',
        });
        setUiNotice('같은 provider 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-attention') {
        setReleaseHistoryFilter({
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || 'attention',
          scope: state.releaseHistoryFilterScope,
          provider: state.releaseHistoryFilterProvider,
        });
        setUiNotice('주의 상태만 남기도록 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'clear-release-history-filter') {
        clearReleaseHistoryFilter({ historyMode: 'push' });
        setUiNotice('release action history 필터를 해제했습니다.');
        return;
      }

      if (action === 'execution-preflight') {
        void handleExecutionPreflight(value === 'request-approval');
        return;
      }

      if (action === 'execution-start') {
        void handleExecutionStart();
        return;
      }

      if (action === 'execution-stop') {
        void handleExecutionStop();
      }
    });
  });
}

function setActiveStep(stepId, { syncDetailTab = true, syncUrl = true, urlMode = 'replace' } = {}) {
  state.activeStep = stepId;
  elements.stepButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.stepTarget === stepId);
  });
  elements.stepPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === stepId);
  });

  if (syncDetailTab) {
    setActiveDetailTab(STEP_TO_DETAIL_TAB[stepId] || 'artifacts', { syncUrl: false });
  }

  renderSelectionBridge();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function setActiveDetailTab(tabId, { syncUrl = true, urlMode = 'replace' } = {}) {
  state.activeDetailTab = tabId;
  elements.detailTabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.detailTab === tabId);
  });
  elements.detailPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === `detail-${tabId}`);
  });
  renderDetailTabLabels();
  renderDetailContextbar();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function openComposer() {
  setActiveStep('step-setup', { urlMode: 'push' });
  elements.missionForm.elements.title?.focus();
}

async function copyCurrentViewLink() {
  const currentUrl = `${window.location.origin}${buildUiStateUrl()}`;
  await copyUiLink(currentUrl, {
    promptMessage: '현재 작업면 링크를 복사하세요.',
    shownNotice: '현재 작업면 링크를 표시했습니다.',
    successNotice: '현재 작업면 링크를 복사했습니다.',
  });
}

async function copyUiLink(url, {
  promptMessage = '링크를 복사하세요.',
  shownNotice = '링크를 표시했습니다.',
  successNotice = '링크를 복사했습니다.',
} = {}) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard-unavailable');
    }
    await navigator.clipboard.writeText(url);
    setUiNotice(successNotice);
  } catch {
    window.prompt(promptMessage, url);
    setUiNotice(shownNotice);
  }
}

async function copyPlainTextValue(value, {
  promptMessage = '값을 복사하세요.',
  shownNotice = '값을 표시했습니다.',
  successNotice = '값을 복사했습니다.',
} = {}) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    setUiNotice('복사할 값이 없습니다.');
    return;
  }
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard-unavailable');
    }
    await navigator.clipboard.writeText(normalizedValue);
    setUiNotice(successNotice);
  } catch {
    window.prompt(promptMessage, normalizedValue);
    setUiNotice(shownNotice);
  }
}

async function resetCurrentView() {
  const visibleMission = filteredMissions();
  const targetMissionId =
    state.selectedMissionId && visibleMission.some(({ mission }) => mission.id === state.selectedMissionId)
      ? state.selectedMissionId
      : visibleMission[0]?.mission?.id || null;

  if (targetMissionId) {
    await selectMission(targetMissionId, { urlMode: 'push' });
    setUiNotice('현재 보기를 기본 단계 기준으로 정리했습니다.');
    return;
  }

  clearMissionSelection({ urlMode: 'push' });
  setUiNotice('현재 보기를 초기 상태로 정리했습니다.');
}

async function copyReleaseTriageLink({
  focusedHistoryId = state.releaseFocusedHistoryId,
  historyOutcome = state.releaseHistoryFilterOutcome,
  historyProvider = state.releaseHistoryFilterProvider,
  historyScope = state.releaseHistoryFilterScope,
  successNotice = '현재 release triage 링크를 복사했습니다.',
} = {}) {
  const triageUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseFocusedHistoryId: focusedHistoryId,
    releaseHistoryOutcome: historyOutcome,
    releaseHistoryProvider: historyProvider,
    releaseHistoryScope: historyScope,
  })}`;
  await copyUiLink(triageUrl, {
    promptMessage: '현재 release triage 링크를 복사하세요.',
    shownNotice: '현재 release triage 링크를 표시했습니다.',
    successNotice,
  });
}

function getFlowState() {
  if (!state.selectedMissionId || !state.missionDetail) {
    return {
      buttonLabel: '1단계에서 시작',
      completedSteps: [],
      copy: '왼쪽 미션 큐에서 고르거나 템플릿으로 새 미션을 만들면 실행 준비를 시작할 수 있습니다.',
      currentStepLabel: '1단계 · 미션 정하기',
      blocker: '아직 선택된 미션이 없습니다.',
      label: '실행할 미션을 먼저 정하세요',
      pendingActionCount: 0,
      pendingApprovalCount: 0,
      recommendedStep: 'step-setup',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const completedSteps = ['step-setup'];

  if (latestSession?.status === 'failed') {
    return {
      buttonLabel: '실행 단계 다시 보기',
      completedSteps,
      copy: latestSession.reviewerSummary || latestSession.outputSummary || '최근 실행이 중간에 멈췄습니다. 오류 원인을 확인한 뒤 다시 실행해야 합니다.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: '최근 실행이 실패했습니다.',
      label: '실행 오류를 확인하고 다시 시작하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '실행 기록 보기',
      secondaryActionTab: 'runs',
    };
  }

  if (!latestSession) {
    return {
      buttonLabel: '2단계 실행으로 이동',
      completedSteps,
      copy: '입력값은 준비됐습니다. 제공자를 선택하고 첫 실행을 시작하면 검토와 결과가 생성됩니다.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: '아직 첫 실행 세션이 없습니다.',
      label: '제공자를 고르고 실행을 시작하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  completedSteps.push('step-run');

  if (pendingApprovalCount > 0 || pendingActionCount > 0) {
    return {
      buttonLabel: '3단계 검토 열기',
      completedSteps,
      copy: `승인 ${pendingApprovalCount}건, 후속 작업 ${pendingActionCount}건이 남아 있습니다. 이 항목을 정리해야 결과를 확정할 수 있습니다.`,
      currentStepLabel: '3단계 · 검토하기',
      blocker:
        pendingApprovalCount > 0
          ? `사람의 승인 ${pendingApprovalCount}건이 남아 있습니다.`
          : `후속 작업 ${pendingActionCount}건을 먼저 처리해야 합니다.`,
      label: '검토와 승인 처리가 필요합니다',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-review',
      secondaryActionLabel: '검토 이력 보기',
      secondaryActionTab: 'reviews',
    };
  }

  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  if (state.missionDetail?.mission?.mode === 'engineering' && execution?.supported) {
    if (latestExecutionSession?.status === 'running') {
      return {
        buttonLabel: '실행 콘솔 열기',
        completedSteps,
        copy: '현재 리포에서 실행 세션이 돌고 있습니다. 라이브 로그와 step 상태를 확인하세요.',
        currentStepLabel: '2단계 · 실행하기',
        blocker: '실행 세션이 진행 중입니다.',
        label: '실행 로그와 step 상태를 모니터링하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-run',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    if (latestExecutionSession && ['failed', 'stopped', 'blocked'].includes(latestExecutionSession.status)) {
      completedSteps.push('step-run');
      return {
        buttonLabel: '3단계 검토 열기',
        completedSteps,
        copy: latestExecutionSession.verification?.summary || '실행 세션이 멈췄습니다. 실패 원인과 변경 파일을 검토하세요.',
        currentStepLabel: '3단계 · 검토하기',
        blocker: '실행 실패 또는 중단 상태입니다.',
        label: '실행 결과를 검토하고 다음 조치를 정하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-review',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    if (latestExecutionSession?.status === 'completed') {
      completedSteps.push('step-run', 'step-review');
      return {
        buttonLabel: '4단계 결과 열기',
        completedSteps,
        copy: latestExecutionSession.verification?.summary || '실행 세션이 완료됐습니다. 결과와 검증 흔적을 확인하세요.',
        currentStepLabel: '4단계 · 결과 보기',
        blocker: '실행과 검증이 끝났습니다.',
        label: '최종 결과와 변경 파일을 확인하세요',
        pendingActionCount,
        pendingApprovalCount,
        recommendedStep: 'step-output',
        secondaryActionLabel: '실행 기록 보기',
        secondaryActionTab: 'runs',
      };
    }

    return {
      buttonLabel: execution?.currentLease ? '실행 시작' : '실행 준비 확인',
      completedSteps,
      copy: execution?.currentLease
        ? '승인 lease가 준비됐습니다. 현재 리포에서 한 번의 실행 세션을 시작할 수 있습니다.'
        : execution?.blockedReasons?.length
          ? execution.blockedReasons[0]
          : '검토를 통과한 제안서를 기준으로 preflight, 승인, 실행 시작을 진행하세요.',
      currentStepLabel: '2단계 · 실행하기',
      blocker: execution?.currentLease
        ? 'one-time execution lease가 활성 상태입니다.'
        : execution?.latestApproval?.status === 'pending'
          ? '실행 승인 대기 중입니다.'
          : execution?.blockedReasons?.length
            ? '정책 또는 범위 문제로 실행이 막혔습니다.'
            : '실행 preflight가 아직 시작되지 않았습니다.',
      label: execution?.currentLease ? '현재 리포 실행을 시작할 수 있습니다' : '실행 preflight와 승인 상태를 먼저 확인하세요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
      secondaryActionLabel: '입력값과 설정 보기',
      secondaryActionTab: 'config',
    };
  }

  completedSteps.push('step-review');

  return {
    buttonLabel: '4단계 결과 열기',
    completedSteps,
    copy: '막힌 항목이 없습니다. 최종 산출물, 실행 흐름, 세션 기록을 확인하고 이번 미션을 마무리하세요.',
    currentStepLabel: '4단계 · 결과 보기',
    blocker: '승인 대기와 후속 작업이 모두 정리되었습니다.',
    label: '최종 결과를 확인하고 확정하세요',
    pendingActionCount,
    pendingApprovalCount,
    recommendedStep: 'step-output',
    secondaryActionLabel: '실행 기록 보기',
    secondaryActionTab: 'runs',
  };
}

function renderFlowState() {
  const flow = getFlowState();
  const harnessState = getHarnessSummaryState();
  const hasHarnessRecommendation = Boolean(harnessState.topRecommendation);
  const topHarnessAction = harnessState.recommendationAction;
  const hasMissionSelection = Boolean(state.selectedMissionId);

  if (elements.flowStatus) {
    elements.flowStatus.innerHTML = `
      <p class="flow-status-label">지금 해야 할 일</p>
      <div class="flow-status-main">
        <div class="flow-status-copyblock">
          <strong class="flow-status-value">${escapeHtml(flow.label)}</strong>
          <p class="flow-status-copy">${escapeHtml(flow.copy)}</p>
        </div>
        <div class="flow-status-actions">
          <button class="primary-button" type="button" data-ui-action="jump-step" data-ui-value="${escapeHtml(flow.recommendedStep)}">
            ${escapeHtml(flow.buttonLabel)}
          </button>
          <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="${escapeHtml(flow.secondaryActionTab)}">
            ${escapeHtml(flow.secondaryActionLabel)}
          </button>
          ${
            hasHarnessRecommendation
              ? `
                <button class="ghost-button" type="button" data-ui-action="${escapeHtml(topHarnessAction.action)}" data-ui-value="${escapeHtml(topHarnessAction.value)}">
                  ${escapeHtml(topHarnessAction.label)}
                </button>
              `
              : ''
          }
          <button class="ghost-button" type="button" data-ui-action="copy-view-link">
            현재 링크 복사
          </button>
          <button class="ghost-button" type="button" data-ui-action="reset-view">
            ${hasMissionSelection ? '보기 초기화' : '초기 상태로'}
          </button>
        </div>
      </div>
      <div class="flow-status-inline">
        <span class="flow-inline-item">
          <em>현재 단계</em>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </span>
        <span class="flow-inline-item">
          <em>진행 상태</em>
          <strong>${escapeHtml(flow.blocker)}</strong>
        </span>
        <span class="flow-inline-item ${hasHarnessRecommendation ? 'is-warning' : ''}">
          <em>하네스</em>
          <strong>${escapeHtml(hasHarnessRecommendation ? harnessState.topRecommendation.title : `권장 조치 없음 · 문서 ${harnessState.docsAvailableCount}/${harnessState.docsTotalCount}`)}</strong>
        </span>
      </div>
      ${
        state.uiNotice
          ? `<p class="flow-status-note">${escapeHtml(state.uiNotice)}</p>`
          : ''
      }
    `;
    wireQuickActions(elements.flowStatus);
  }

  elements.stepButtons.forEach((button) => {
    const stepId = button.dataset.stepTarget;
    button.classList.toggle('is-done', flow.completedSteps.includes(stepId));
    button.classList.toggle('is-ready', flow.recommendedStep === stepId);
  });
}

function renderWorkspaceOptions() {
  const previousValue = getSelectedWorkspaceId();
  elements.workspaceSelect.innerHTML = state.workspaces
    .map(
      (workspace) =>
        `<option value="${escapeHtml(workspace.id)}">${escapeHtml(workspace.name || workspace.id)}</option>`,
    )
    .join('');

  const nextValue = state.workspaces.some((workspace) => workspace.id === previousValue)
    ? previousValue
    : state.workspaces[0]?.id || '';
  elements.workspaceSelect.value = nextValue;
}

function renderTemplates() {
  elements.templateList.innerHTML = missionTemplates
    .map(
      (template, index) => `
        <button type="button" class="template-chip" data-template-index="${index}">
          <strong>${escapeHtml(template.title)}</strong>
          <span>${escapeHtml(template.subtitle)}</span>
        </button>
      `,
    )
    .join('');

  elements.templateList.querySelectorAll('[data-template-index]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTemplate(Number(button.dataset.templateIndex));
    });
  });
}

function inferPlaybook(mission) {
  const haystack = [mission?.title, mission?.objective, ...(mission?.constraints || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('manager->planner->executor->reviewer') || haystack.includes('staged manager')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'team-pipeline') || null;
  }

  if (haystack.includes('근거 기반') || haystack.includes('research summary') || haystack.includes('unknown')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'research-first') || null;
  }

  if (haystack.includes('product/design/engineering') || haystack.includes('readiness checklist')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'review-stack') || null;
  }

  if (haystack.includes('verification evidence') || haystack.includes('completion gate')) {
    return missionPlaybooks.find((playbook) => playbook.id === 'verify-before-close') || null;
  }

  return missionPlaybooks.find((playbook) => playbook.id === state.selectedPlaybookId) || null;
}

function renderPlaybooks() {
  elements.playbookList.innerHTML = missionPlaybooks
    .map(
      (playbook) => `
        <button type="button" class="playbook-card ${playbook.id === state.selectedPlaybookId ? 'is-active' : ''}" data-playbook-id="${escapeHtml(playbook.id)}">
          <div class="status-row">
            <span class="mini-badge">${escapeHtml(playbook.origin)}</span>
          </div>
          <div class="item-title">${escapeHtml(playbook.title)}</div>
          <div class="item-subtitle">${escapeHtml(playbook.subtitle)}</div>
          <div class="item-meta">${escapeHtml(playbook.description)}</div>
        </button>
      `,
    )
    .join('');

  elements.playbookList.querySelectorAll('[data-playbook-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const playbook = missionPlaybooks.find((entry) => entry.id === button.dataset.playbookId);
      if (!playbook) {
        return;
      }
      state.selectedPlaybookId = playbook.id;
      renderPlaybooks();
      elements.missionForm.elements.mode.value = playbook.values.mode;
      elements.missionForm.elements.deliverableType.value = playbook.values.deliverableType;
      elements.missionForm.elements.title.value = playbook.values.title;
      elements.missionForm.elements.objective.value = playbook.values.objective;
      elements.missionForm.elements.constraints.value = playbook.values.constraints;
      openComposer();
    });
  });
}

function applyTemplate(index) {
  const template = missionTemplates[index];
  if (!template) {
    return;
  }

  const fields = template.values;
  elements.missionForm.elements.mode.value = fields.mode;
  elements.missionForm.elements.deliverableType.value = fields.deliverableType;
  elements.missionForm.elements.title.value = fields.title;
  elements.missionForm.elements.objective.value = fields.objective;
  elements.missionForm.elements.constraints.value = fields.constraints;
  openComposer();
}

function renderProviders() {
  const html = state.providers
    .map((provider) => {
      const configured = Boolean(provider.configured);
      return `
        <div class="provider-item">
          <div class="status-row">
            <span class="status-badge ${configured ? 'status-configured' : 'status-env-missing'}">${escapeHtml(
              configured ? '설정 완료' : '환경 변수 누락',
            )}</span>
            ${provider.defaultProvider ? '<span class="mini-badge status-awaiting-approval">기본값</span>' : ''}
          </div>
          <div class="item-title">${escapeHtml(provider.displayName || provider.id)}</div>
          <div class="item-meta mono">${escapeHtml(provider.id)}</div>
          <div class="item-meta">${escapeHtml(provider.transport || '')}</div>
          ${
            provider.missingEnv?.length
              ? `<div class="item-meta">누락 환경 변수: ${escapeHtml(provider.missingEnv.join(', '))}</div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  elements.providerList.innerHTML =
    html ||
    emptyStateCard({
      action: 'open-create',
      actionLabel: '미션부터 시작',
      icon: 'API',
      message: '제공자 목록이 비어 있으면 먼저 로컬 워크스페이스와 미션 흐름부터 확인하세요.',
      title: '표시할 제공자 정보가 없습니다',
    });
  wireQuickActions(elements.providerList);
}

function filteredMissions() {
  const workspaceId = getSelectedWorkspaceId();
  const keyword = String(elements.missionFilter.value || '').trim().toLowerCase();
  return state.missions.filter(({ mission, latestSession, workspace }) => {
    if (workspaceId && mission.workspaceId !== workspaceId) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const haystack = [
      mission.title,
      mission.objective,
      mission.status,
      mission.mode,
      latestSession?.status,
      latestSession?.provider,
      workspace?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

function getMissionQueueSnapshot(mission, latestSession) {
  if (!latestSession) {
    return {
      nextAction: '다음: 제공자를 고르고 첫 실행 시작',
      stage: '1단계 · 실행 준비',
      status: getDisplayLabel(mission.status, mission.status),
    };
  }

  if (latestSession.status === 'failed') {
    return {
      nextAction: '다음: 실행 오류 확인 후 다시 실행',
      stage: '2단계 · 실행 점검',
      status: '실행 실패',
    };
  }

  if (mission.status === 'awaiting_approval' || latestSession.currentStage === 'reviewer') {
    return {
      nextAction: '다음: 승인 또는 후속 작업 처리',
      stage: '3단계 · 검토',
      status: getDisplayLabel(mission.status, mission.status),
    };
  }

  if (mission.status === 'completed' || latestSession.status === 'completed') {
    return {
      nextAction: '다음: 결과물과 실행 기록 확인',
      stage: '4단계 · 결과 확인',
      status: '완료',
    };
  }

  return {
    nextAction: '다음: 진행 상태 확인',
    stage: '2단계 · 실행 중',
    status: getDisplayLabel(latestSession.status, latestSession.status),
  };
}

function getSelectedMissionRecord() {
  if (!state.selectedMissionId) {
    return null;
  }

  return state.missions.find(({ mission }) => mission.id === state.selectedMissionId) || null;
}

function renderMissionList() {
  const missions = filteredMissions();
  const selectedFlow =
    state.selectedMissionId && state.missionDetail?.mission?.id === state.selectedMissionId ? getFlowState() : null;
  renderMissionQueueSummary(missions);
  if (!missions.length) {
    elements.missionList.innerHTML = state.missions.length
      ? emptyStateCard({
          action: 'clear-filter',
          actionLabel: '필터 초기화',
          icon: 'FL',
          message: '현재 필터나 워크스페이스 범위에서 보이는 미션이 없습니다.',
          title: '조건에 맞는 미션이 없습니다',
        })
      : emptyStateCard({
          action: 'open-create',
          actionLabel: '첫 미션 만들기',
          icon: 'GO',
          message: '템플릿을 선택하거나 목표와 제약 조건을 직접 적어서 첫 실행 흐름을 만들어보세요.',
          title: '아직 생성된 미션이 없습니다',
        });
    wireQuickActions(elements.missionList);
    return;
  }

  elements.missionList.innerHTML = missions
    .map(({ mission, latestSession, workspace }) => {
      const active = mission.id === state.selectedMissionId ? 'is-active' : '';
      const snapshot = getMissionQueueSnapshot(mission, latestSession);
      const activeStageLabel = active && selectedFlow ? getStepLabel(state.activeStep) : snapshot.stage;
      const providerLabel = latestSession?.provider || '미정';
      const providerUiLabel = getDisplayLabel(providerLabel, providerLabel);
      const updatedLabel = formatDate(mission.updatedAt);
      const workspaceLabel = workspace?.name || mission.workspaceId;
      const contextLabel = `${getDisplayLabel(mission.mode, mission.mode)} · ${providerUiLabel}`;
      const summary = summarizeText(
        mission.objective,
        latestSession?.reviewerSummary || snapshot.nextAction.replace(/^다음:\s*/, ''),
      );
      return `
        <div class="mission-row ${active}">
          <button type="button" data-mission-id="${escapeHtml(mission.id)}">
            <div class="mission-row-topline">
              <div class="mission-row-topline-main">
                <span class="mission-row-stage">${escapeHtml(snapshot.stage)}</span>
                ${active ? '<span class="mission-row-focus">현재 작업 중</span>' : ''}
              </div>
              <span class="mission-row-updated">${escapeHtml(updatedLabel)}</span>
            </div>
            <div class="mission-row-head">
              <div class="mission-row-main">
                <div class="item-title">${escapeHtml(mission.title)}</div>
                <div class="mission-row-summary">${escapeHtml(summary)}</div>
              </div>
              <div class="mission-row-state">
                <span class="status-badge ${getStatusClass(mission.status)}">${escapeHtml(snapshot.status)}</span>
                ${
                  latestSession
                    ? `<span class="mini-badge ${getStatusClass(providerLabel)}">${escapeHtml(providerUiLabel)}</span>`
                    : ''
                }
              </div>
            </div>
            <div class="mission-next-action">
              <span class="mission-next-label">다음 액션</span>
              <strong>${escapeHtml(snapshot.nextAction.replace(/^다음:\s*/, ''))}</strong>
            </div>
            ${
              active
                ? `
                  <div class="mission-row-focusline">
                    <span>현재 작업판</span>
                    <strong>${escapeHtml(activeStageLabel)}</strong>
                  </div>
                `
                : ''
            }
            <div class="mission-row-foot">
              <span>${escapeHtml(workspaceLabel)}</span>
              <span>${escapeHtml(contextLabel)}</span>
            </div>
          </button>
        </div>
      `;
    })
    .join('');

  elements.missionList.querySelectorAll('[data-mission-id]').forEach((button) => {
    button.addEventListener('click', () => selectMission(button.dataset.missionId, { urlMode: 'push' }));
  });
}

function renderMissionQueueSummary(missions = filteredMissions()) {
  if (!elements.missionQueueSummary) {
    return;
  }

  if (!missions.length) {
    elements.missionQueueSummary.innerHTML = `
      <div class="queue-pill"><span>표시 중</span><strong>0개</strong></div>
      <div class="queue-pill"><span>검토 필요</span><strong>0개</strong></div>
      <div class="queue-pill"><span>완료</span><strong>0개</strong></div>
    `;
    return;
  }

  const reviewNeeded = missions.filter(({ mission, latestSession }) => {
    return mission.status === 'awaiting_approval' || latestSession?.currentStage === 'reviewer';
  }).length;
  const completed = missions.filter(({ mission, latestSession }) => {
    return mission.status === 'completed' || latestSession?.status === 'completed';
  }).length;

  elements.missionQueueSummary.innerHTML = `
    <div class="queue-pill"><span>표시 중</span><strong>${escapeHtml(String(missions.length))}개</strong></div>
    <div class="queue-pill"><span>검토 필요</span><strong>${escapeHtml(String(reviewNeeded))}개</strong></div>
    <div class="queue-pill"><span>완료</span><strong>${escapeHtml(String(completed))}개</strong></div>
  `;
}

function renderDetailTabLabels() {
  const artifactsCount = state.currentSessionPayload?.artifacts?.length || 0;
  const runsCount = state.missionDetail?.sessions?.length || 0;
  const reviewsCount =
    (state.currentSessionPayload?.approvals?.length || 0) + Number(state.missionActions?.summary?.pendingActionCount || 0);
  const harnessCount = state.missionDetail?.harness?.recommendations?.length || 0;
  const counts = {
    artifacts: artifactsCount,
    runs: runsCount,
    reviews: reviewsCount,
    config: 0,
    harness: harnessCount,
    release: state.releaseStatus?.summary?.checklistOpen || 0,
  };

  elements.detailTabButtons.forEach((button) => {
    if (!button.dataset.baseLabel) {
      button.dataset.baseLabel = button.textContent?.trim() || '';
    }
    const baseLabel = button.dataset.baseLabel || '';
    const count = counts[button.dataset.detailTab] || 0;
    button.textContent = count > 0 ? `${baseLabel} ${count}` : baseLabel;
  });
}

function renderHeroMetrics() {
  if (!state.missionDetail) {
    elements.heroMetrics.innerHTML = `
      <div class="metric-card">
        <span>현재 단계</span>
        <strong>1단계 · 미션 정하기</strong>
      </div>
      <div class="metric-card">
        <span>검토와 후속</span>
        <strong>승인 0건 · 후속 0건</strong>
      </div>
      <div class="metric-card">
        <span>최근 실행</span>
        <strong>아직 실행 전</strong>
      </div>
    `;
    return;
  }

  const summary = state.missionDetail.summary || {};
  const latestSession = summary.latestSession || {};
  const flow = getFlowState();
  const actionSummary = state.missionActions?.summary || {};
  const metrics = [
    ['현재 단계', flow.currentStepLabel],
    ['검토와 후속', `승인 ${summary.approvalCounts?.pending ?? 0}건 · 후속 ${actionSummary.pendingActionCount ?? 0}건`],
    ['최근 실행', latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '아직 실행 전'],
  ];

  elements.heroMetrics.innerHTML = metrics
    .map(
      ([label, value]) => `
        <div class="metric-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join('');
}

function renderHeroSignals() {
  if (!state.missionDetail) {
    elements.heroSignals.innerHTML = `
      <span class="hero-signal">상태 없음</span>
      <span class="hero-signal">실행 전</span>
      <span class="hero-signal">결과 없음</span>
    `;
    return;
  }

  const mission = state.missionDetail.mission;
  const playbook = inferPlaybook(mission);
  const latestSession = state.missionDetail.summary?.latestSession || {};
  const signals = [
    `상태 · ${getDisplayLabel(mission.status, mission.status)}`,
    mission.deliverableType ? `산출물 · ${getDisplayLabel(mission.deliverableType, mission.deliverableType)}` : '산출물 유형 미정',
    latestSession.provider ? `제공자 · ${latestSession.provider}` : '제공자 선택 전',
    state.missionDetail.harness
      ? `하네스 · 문서 ${state.missionDetail.harness.documents?.summary?.availableCount || 0} / 메모 ${state.missionDetail.harness.memory?.missionCounts?.total || 0}`
      : '하네스 정보 없음',
    playbook ? `플레이북 · ${playbook.title}` : '사용자 정의 미션',
  ];

  elements.heroSignals.innerHTML = signals
    .map((signal) => `<span class="hero-signal">${escapeHtml(signal)}</span>`)
    .join('');
}

function renderAgentLane() {
  if (!state.missionDetail) {
    elements.agentLane.innerHTML = emptyStateCard({
      action: 'open-create',
      actionLabel: '미션 작성 열기',
      icon: 'AG',
      message: '미션이 선택되면 매니저, 플래너, 실행 담당, 리뷰어 흐름을 여기서 바로 볼 수 있습니다.',
      title: '에이전트 진행 흐름이 아직 없습니다',
    });
    wireQuickActions(elements.agentLane);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || {};
  const currentStage = String(latestSession.currentStage || '').toLowerCase();
  const sessionCompleted = latestSession.status === 'completed';
  const stageOrder = ['manager', 'planner', 'executor', 'reviewer'];
  const stageLabels = {
    manager: '방향 설정',
    planner: '계획 수립',
    executor: '산출물 생성',
    reviewer: '검토',
  };
  const stageDescriptions = {
    manager: '목표와 맥락을 정리합니다.',
    planner: '실행 가능한 산출물 구조를 만듭니다.',
    executor: '문서 또는 구현 산출물을 생성합니다.',
    reviewer: '규칙과 품질 기준을 검증합니다.',
  };
  const stageTitles = {
    manager: '매니저',
    planner: '플래너',
    executor: '실행 담당',
    reviewer: '리뷰어',
  };
  const stageStateLabels = {
    pending: '대기',
    done: '완료',
    active: '진행 중',
    failed: '실패',
  };

  elements.agentLane.innerHTML = stageOrder
    .map((stage, index) => {
      const currentIndex = stageOrder.indexOf(currentStage);
      let visualState = 'pending';
      if (sessionCompleted || (currentIndex !== -1 && index < currentIndex)) {
        visualState = 'done';
      }
      if (!sessionCompleted && stage === currentStage) {
        visualState = latestSession.status === 'failed' ? 'failed' : 'active';
      }
      if (sessionCompleted && stage === 'reviewer') {
        visualState = 'done';
      }

      return `
        <article class="agent-stage stage-${visualState}">
          <div class="agent-stage-head">
            <span class="agent-stage-index">0${index + 1}</span>
            <span class="mini-badge">${escapeHtml(stageLabels[stage])}</span>
          </div>
          <h3>${escapeHtml(stageTitles[stage])}</h3>
          <p>${escapeHtml(stageDescriptions[stage])}</p>
          <div class="agent-stage-foot">
            <span class="stage-state">${escapeHtml(stageStateLabels[visualState] || visualState)}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderMissionSummary() {
  if (!state.missionDetail) {
    elements.missionTitle.textContent = '미션을 선택하세요';
    elements.missionSubtitle.textContent = '왼쪽 목록에서 미션을 선택하면 개요, 산출물, 타임라인을 바로 확인할 수 있습니다.';
    elements.missionSummary.innerHTML = emptyStateCard({
      action: 'open-create',
      actionLabel: '새 미션 작성',
      icon: '01',
      message: '원하는 결과를 짧게 적고 실행하면, 이 영역에 목표, 제약 조건, 리뷰어 신호가 정리됩니다.',
      title: '아직 선택된 미션이 없습니다',
    });
    elements.runMissionButton.disabled = true;
    renderSelectionBridge();
    renderHeroMetrics();
    renderHeroSignals();
    renderAgentLane();
    renderFlowState();
    wireQuickActions(elements.missionSummary);
    return;
  }

  const { mission, summary } = state.missionDetail;
  const playbook = inferPlaybook(mission);
  if (playbook) {
    state.selectedPlaybookId = playbook.id;
    renderPlaybooks();
  }
  const latestSession = summary?.latestSession || null;
  const constraints = mission.constraints || [];
  const flow = getFlowState();
  elements.missionTitle.textContent = mission.title;
  elements.missionSubtitle.textContent = summarizeText(
    mission.objective,
    latestSession?.reviewerSummary || '목표가 없습니다.',
  );
  elements.runMissionButton.disabled = false;
  renderSelectionBridge();

  elements.missionSummary.innerHTML = `
    <section class="summary-section summary-emphasis">
      <p class="summary-label">미션 목표</p>
      <h3 class="summary-statement">${escapeHtml(mission.objective || '아직 목표가 정의되지 않았습니다.')}</h3>
      <div class="summary-meta-row">
        <span class="mini-badge ${getStatusClass(mission.status)}">${escapeHtml(getDisplayLabel(mission.status))}</span>
        <span class="mini-badge">${escapeHtml(mission.mode)}</span>
        <span class="mini-badge">${escapeHtml(getDisplayLabel(mission.deliverableType, mission.deliverableType))}</span>
      </div>
    </section>
    <div class="summary-grid">
      <section class="summary-section">
        <p class="summary-label">제약 조건</p>
        ${
          constraints.length
            ? `<div class="tag-list">${constraints
                .map((constraint) => `<span class="tag">${escapeHtml(constraint)}</span>`)
                .join('')}</div>`
            : '<p class="empty-state">제약 조건이 없습니다.</p>'
        }
      </section>
      <section class="summary-section">
        <p class="summary-label">운영 플레이북</p>
        ${
          playbook
            ? `
              <div class="definition-item">
                <span>참고 흐름</span>
                <strong>${escapeHtml(playbook.title)} · ${escapeHtml(playbook.origin)}</strong>
              </div>
              <p class="summary-note">${escapeHtml(playbook.description)}</p>
            `
            : '<p class="summary-note">선택된 플레이북 없이 사용자 정의 미션으로 실행 중입니다.</p>'
        }
      </section>
      <section class="summary-section">
        <p class="summary-label">최근 세션</p>
        <div class="definition-list">
          <div class="definition-item"><span>상태</span><strong>${escapeHtml(getDisplayLabel(latestSession?.status))}</strong></div>
          <div class="definition-item"><span>제공자</span><strong>${escapeHtml(latestSession?.provider || '-')}</strong></div>
          <div class="definition-item"><span>현재 단계</span><strong>${escapeHtml(getDisplayLabel(latestSession?.currentStage))}</strong></div>
          <div class="definition-item"><span>최근 갱신</span><strong>${escapeHtml(formatDate(mission.updatedAt))}</strong></div>
        </div>
      </section>
      <section class="summary-section">
        <p class="summary-label">승인과 기억 상태</p>
        <div class="definition-list">
          <div class="definition-item"><span>승인 합계</span><strong>${escapeHtml(String(summary?.approvalCounts?.total ?? 0))}</strong></div>
          <div class="definition-item"><span>승인 대기</span><strong>${escapeHtml(String(summary?.approvalCounts?.pending ?? 0))}</strong></div>
          <div class="definition-item"><span>기억 항목</span><strong>${escapeHtml(String(summary?.memoryCounts?.total ?? 0))}</strong></div>
          <div class="definition-item"><span>제공자 상태</span><strong>${escapeHtml(getDisplayLabel(summary?.providerHealthDriftStatus, '안정'))}</strong></div>
        </div>
      </section>
      <section class="summary-section">
        <p class="summary-label">리뷰어 신호</p>
        <p class="summary-note">${escapeHtml(latestSession?.reviewerSummary || '아직 리뷰어 요약이 없습니다.')}</p>
      </section>
      <section class="summary-section">
        <p class="summary-label">다음 권장 단계</p>
        <div class="definition-item">
          <span>현재 안내</span>
          <strong>${escapeHtml(flow.label)}</strong>
        </div>
        <p class="summary-note">${escapeHtml(flow.copy)}</p>
        <div class="action-row">
          <button class="primary-button" type="button" data-ui-action="jump-step" data-ui-value="${escapeHtml(flow.recommendedStep)}">
            ${escapeHtml(flow.buttonLabel)}
          </button>
        </div>
      </section>
    </div>
  `;

  renderHeroMetrics();
  renderHeroSignals();
  renderAgentLane();
  renderFlowState();
  wireQuickActions(elements.missionSummary);
}

function renderSelectionBridge() {
  if (!elements.selectionBridge) {
    return;
  }

  const selectedRecord = getSelectedMissionRecord();
  if (!selectedRecord) {
    elements.selectionBridge.innerHTML = `
      <div class="selection-bridge-empty">왼쪽 작업 대기열에서 미션을 고르면 현재 작업면, 결과물, 실행 기록이 같은 기준으로 묶여 보여집니다.</div>
    `;
    return;
  }

  const mission = state.missionDetail?.mission?.id === selectedRecord.mission.id ? state.missionDetail.mission : selectedRecord.mission;
  const latestSession =
    state.currentSessionPayload?.session ||
    state.missionDetail?.summary?.latestSession ||
    selectedRecord.latestSession ||
    null;
  const workspaceLabel = selectedRecord.workspace?.name || mission.workspaceId;
  const snapshot = getMissionQueueSnapshot(mission, latestSession);
  const flow =
    state.missionDetail?.mission?.id === selectedRecord.mission.id
      ? getFlowState()
      : {
          buttonLabel: '미션 불러오는 중',
          copy: '세부 정보를 가져오는 동안 현재 단계와 다음 액션을 동기화하고 있습니다.',
          currentStepLabel: getStepLabel(state.activeStep),
          label: '선택한 미션을 불러오는 중입니다',
          recommendedStep: state.activeStep,
        };
  const latestExecutionLabel = latestSession
    ? `${getDisplayLabel(latestSession.provider, latestSession.provider)} · ${getDisplayLabel(latestSession.status)}`
    : '아직 실행 전';
  const harnessState = getHarnessSummaryState();
  const harnessLabel = harnessState.topRecommendation
    ? harnessState.topRecommendation.title
    : `권장 조치 없음 · 메모 ${harnessState.memoryTotalCount}개`;
  const currentViewArtifacts = state.currentSessionPayload?.artifacts || [];
  const selectedArtifactLabel =
    state.selectedArtifactId && state.artifactsById.has(state.selectedArtifactId)
      ? state.artifactsById.get(state.selectedArtifactId)?.artifact?.title ||
        state.artifactsById.get(state.selectedArtifactId)?.artifact?.fileName ||
        state.selectedArtifactId
      : null;
  const selectedSessionLabel = latestSession
    ? `${formatDate(latestSession.startedAt)} · ${getDisplayLabel(latestSession.provider || latestSession.id, latestSession.provider || latestSession.id)}`
    : '세션 없음';
  const selectedArtifactFallback = getArtifactLabel(getPrimaryArtifact(currentViewArtifacts)) || '결과물 없음';

  elements.selectionBridge.innerHTML = `
    <div class="selection-bridge-main">
      <div class="selection-bridge-copy">
        <span class="selection-bridge-kicker">선택한 미션</span>
        <strong>${escapeHtml(mission.title)}</strong>
        <p>${escapeHtml(summarizeText(mission.objective, '왼쪽 작업 대기열에서 선택한 미션을 현재 작업면 기준으로 동기화했습니다.'))}</p>
      </div>
      <div class="selection-bridge-actions">
        <span class="status-badge ${getStatusClass(mission.status)}">${escapeHtml(snapshot.status)}</span>
        <span class="mini-badge">${escapeHtml(workspaceLabel)}</span>
        <button class="ghost-button" type="button" data-ui-action="jump-step" data-ui-value="${escapeHtml(flow.recommendedStep)}">
          ${escapeHtml(getStepLabel(flow.recommendedStep, { short: true }))}
        </button>
      </div>
    </div>
    <div class="selection-bridge-track">
      <div class="selection-bridge-pill is-active">
        <span>현재 열어둔 단계</span>
        <strong>${escapeHtml(getStepLabel(state.activeStep))}</strong>
      </div>
      <div class="selection-bridge-pill">
        <span>다음 액션</span>
        <strong>${escapeHtml(snapshot.nextAction.replace(/^다음:\s*/, ''))}</strong>
      </div>
      <div class="selection-bridge-pill">
        <span>최근 실행</span>
        <strong>${escapeHtml(latestExecutionLabel)}</strong>
      </div>
      <div class="selection-bridge-pill ${harnessState.topRecommendation ? 'is-active' : ''}">
        <span>하네스 상태</span>
        <strong>${escapeHtml(harnessLabel)}</strong>
      </div>
    </div>
    <div class="selection-bridge-view">
      <div class="selection-bridge-crumb">
        <span>현재 보기</span>
        <strong>${escapeHtml(getStepLabel(state.activeStep, { short: true }))} · ${escapeHtml(getDetailTabLabel(state.activeDetailTab))}</strong>
      </div>
      <div class="selection-bridge-crumb">
        <span>세션 포커스</span>
        <strong>${escapeHtml(selectedSessionLabel)}</strong>
      </div>
      <div class="selection-bridge-crumb">
        <span>결과물 포커스</span>
        <strong>${escapeHtml(selectedArtifactLabel || selectedArtifactFallback)}</strong>
      </div>
    </div>
  `;
  wireQuickActions(elements.selectionBridge);
}

function renderSetupHarnessSummary() {
  if (!elements.setupHarnessSummary) {
    return;
  }

  if (!state.missionDetail?.harness) {
    elements.setupHarnessSummary.innerHTML = emptyStateCard({
      action: 'open-create',
      actionLabel: '새 미션 작성',
      icon: 'HS',
      message: '미션을 고르면 문서 기준점, 기억, 운영 루프 기준으로 지금 먼저 정리할 항목을 여기에서 보여줍니다.',
      title: '하네스 준비 상태를 계산할 미션이 없습니다',
    });
    wireQuickActions(elements.setupHarnessSummary);
    return;
  }

  const harnessState = getHarnessSummaryState();
  const topRecommendation = harnessState.topRecommendation;
  const topHarnessAction = topRecommendation
    ? harnessState.recommendationAction
    : {
        action: 'jump-step',
        label: '2단계 실행 열기',
        value: 'step-run',
      };
  const secondaryButton = topRecommendation?.code
    ? `
      <button class="ghost-button" type="button" data-ui-action="${escapeHtml(topHarnessAction.secondaryAction)}" data-ui-value="${escapeHtml(topHarnessAction.secondaryValue)}">
        ${escapeHtml(topHarnessAction.secondaryLabel)}
      </button>
    `
    : `
      <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="harness">
        하네스 탭 열기
      </button>
    `;

  elements.setupHarnessSummary.innerHTML = `
    <div class="stage-summary-card harness-prep-card">
      <div class="harness-overview-grid">
        <div class="summary-chip">
          <span>문서 기준점</span>
          <strong>${escapeHtml(String(harnessState.docsAvailableCount))}/${escapeHtml(String(harnessState.docsTotalCount))}</strong>
        </div>
        <div class="summary-chip">
          <span>미션 메모리</span>
          <strong>${escapeHtml(String(harnessState.memoryTotalCount))}개</strong>
        </div>
        <div class="summary-chip">
          <span>운영 루프</span>
          <strong>${escapeHtml(`승인 ${harnessState.pendingApprovalCount} · 후속 ${harnessState.pendingActionCount}`)}</strong>
        </div>
      </div>
      <div class="harness-callout">
        <strong>${escapeHtml(topRecommendation ? '지금 먼저 정리할 하네스 항목' : '하네스 기준점이 준비되어 있습니다')}</strong>
        <p>${escapeHtml(topRecommendation?.title || '문서 source-of-record, memory, 운영 루프가 현재 안정 상태입니다. 실행 전 세부 기준만 마지막으로 확인하면 됩니다.')}</p>
      </div>
      <div class="action-row">
        <button class="primary-button" type="button" data-ui-action="${escapeHtml(topHarnessAction.action)}" data-ui-value="${escapeHtml(topHarnessAction.value)}">
          ${escapeHtml(topRecommendation ? topHarnessAction.label : '2단계 실행 열기')}
        </button>
        ${secondaryButton}
      </div>
    </div>
  `;
  wireQuickActions(elements.setupHarnessSummary);
}

function renderRunStageSummary() {
  if (!elements.runStageSummary) {
    return;
  }

  if (!state.missionDetail) {
    elements.runStageSummary.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계 열기',
      actionValue: 'step-setup',
      icon: 'RN',
      message: '미션을 먼저 선택하면 어떤 제공자로 언제 실행할지 여기에서 정리됩니다.',
      title: '실행할 미션이 없습니다',
    });
    wireQuickActions(elements.runStageSummary);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const execution = getExecutionStatusPayload();
  const flow = getFlowState();
  elements.runStageSummary.innerHTML = `
    <div class="stage-summary-card">
      <p class="summary-label">현재 안내</p>
      <h4 class="summary-statement">${escapeHtml(flow.label)}</h4>
      <p class="summary-note">${escapeHtml(latestSession?.reviewerSummary || latestSession?.outputSummary || flow.copy)}</p>
      <div class="definition-list">
        <div class="definition-item">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? getDisplayLabel(latestSession.status) : '아직 실행 전')}</strong>
        </div>
        <div class="definition-item">
          <span>제공자</span>
          <strong>${escapeHtml(latestSession?.provider || '선택 전')}</strong>
        </div>
        <div class="definition-item">
          <span>현재 단계</span>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </div>
        <div class="definition-item">
          <span>최근 업데이트</span>
          <strong>${escapeHtml(formatDate(state.missionDetail.mission.updatedAt))}</strong>
        </div>
        ${
          isExecutionMissionSelected()
            ? `
              <div class="definition-item">
                <span>실행 자격</span>
                <strong>${escapeHtml(execution?.supported ? (execution.currentLease ? '실행 가능' : getDisplayLabel(execution.eligibility || 'required', execution.eligibility || 'required')) : '미지원')}</strong>
              </div>
            `
            : ''
        }
      </div>
      <div class="action-row">
        <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="runs">실행 기록 보기</button>
      </div>
    </div>
  `;
  wireQuickActions(elements.runStageSummary);
}

function renderExecutionConsole() {
  if (!elements.executionConsole) {
    return;
  }

  if (!state.missionDetail) {
    elements.executionConsole.innerHTML = '<p class="empty-state">미션을 선택하면 실행 preflight와 live log를 여기에 표시합니다.</p>';
    return;
  }

  if (!isExecutionMissionSelected()) {
    elements.executionConsole.innerHTML = '<p class="empty-state">지식 작업 모드는 직접 shell 실행을 지원하지 않습니다.</p>';
    return;
  }

  const execution = getExecutionStatusPayload();
  const executionSession = execution?.latestExecutionSession || null;
  const latestLease = execution?.currentLease || execution?.latestLease || null;
  const logs = state.executionLogs?.lines || [];
  const reviewSessionId = execution?.reviewSessionId || '-';
  const policy = execution?.policy || { allowedCount: 0, warningCount: 0, blockedCount: 0 };
  const verification = executionSession?.verification || null;
  const primaryAction = execution?.currentLease
    ? '<button class="primary-button" type="button" data-ui-action="execution-start">실행 시작</button>'
    : execution?.latestApproval?.status === 'pending'
      ? '<button class="secondary-button" type="button" disabled>승인 대기 중</button>'
      : '<button class="primary-button" type="button" data-ui-action="execution-preflight" data-ui-value="request-approval">실행 승인 요청</button>';
  const secondaryAction = executionSession?.status === 'running'
    ? '<button class="ghost-button" type="button" data-ui-action="execution-stop">실행 중단</button>'
    : '<button class="ghost-button" type="button" data-ui-action="execution-preflight">preflight 새로고침</button>';
  const manifestSteps = Array.isArray(execution?.manifest?.steps) ? execution.manifest.steps : [];
  const blockedList = (execution?.blockedReasons || []).slice(0, 3);
  const changedFiles = (executionSession?.changedFiles || []).slice(0, 5);
  const stepRows = (executionSession?.steps || manifestSteps || [])
    .map(
      (step, index) => `
        <li class="execution-step-row">
          <span class="execution-step-index">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
          <div class="execution-step-copy">
            <strong>${escapeHtml(step.title || `${getDisplayLabel(step.kind || 'command', step.kind || 'command')} step`)}</strong>
            <p>${escapeHtml(step.reason || getDisplayLabel(step.kind || 'command', step.kind || 'command'))}</p>
          </div>
          <span class="status-badge ${getStatusClass(step.status || 'pending')}">${escapeHtml(getDisplayLabel(step.status || 'pending', step.status || 'pending'))}</span>
        </li>
      `,
    )
    .join('');

  elements.executionConsole.innerHTML = `
    <div class="execution-console-grid">
      <section class="execution-card">
        <p class="summary-label">preflight</p>
        <h4 class="summary-statement">${escapeHtml(execution?.supported ? '현재 리포 실행 가능 여부를 확인했습니다.' : '이 미션은 실행 대상이 아닙니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>실행 자격</span><strong>${escapeHtml(getDisplayLabel(execution?.eligibility || 'required', execution?.eligibility || 'required'))}</strong></div>
          <div class="definition-item"><span>검토 세션</span><strong>${escapeHtml(reviewSessionId)}</strong></div>
          <div class="definition-item"><span>manifest step</span><strong>${escapeHtml(String(manifestSteps.length))}건</strong></div>
          <div class="definition-item"><span>정책 상태</span><strong>${escapeHtml(`허용 ${policy.allowedCount} · 경고 ${policy.warningCount} · 차단 ${policy.blockedCount}`)}</strong></div>
        </div>
        ${
          blockedList.length
            ? `<div class="execution-inline-list">${blockedList.map((item) => `<span class="tag tag-warning">${escapeHtml(item)}</span>`).join('')}</div>`
            : '<p class="summary-note">차단 사유가 없으면 approval lease 발급 후 한 번의 실행 세션을 시작할 수 있습니다.</p>'
        }
        <div class="action-row">
          ${primaryAction}
          ${secondaryAction}
        </div>
      </section>
      <section class="execution-card">
        <p class="summary-label">승인 lease</p>
        <h4 class="summary-statement">${escapeHtml(execution?.currentLease ? '승인 lease 활성 상태' : execution?.latestApproval?.status === 'pending' ? '사람의 승인을 기다리는 중' : latestLease ? `최근 lease 상태 · ${getDisplayLabel(latestLease.status, latestLease.status)}` : '아직 발급된 lease가 없습니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>최근 승인</span><strong>${escapeHtml(execution?.latestApproval ? `${getDisplayLabel(execution.latestApproval.status)} · ${formatDate(execution.latestApproval.createdAt)}` : '없음')}</strong></div>
          <div class="definition-item"><span>manifest hash</span><strong class="mono">${escapeHtml(execution?.manifestHash ? execution.manifestHash.slice(0, 12) : '-')}</strong></div>
          <div class="definition-item"><span>브랜치</span><strong>${escapeHtml(latestLease?.gitBranch || execution?.latestApproval?.metadata?.gitBranch || '-')}</strong></div>
          <div class="definition-item"><span>워크스페이스</span><strong class="mono">${escapeHtml(execution?.workspacePath || '-')}</strong></div>
        </div>
        <p class="summary-note">${escapeHtml(execution?.currentLease ? '현재 manifest hash와 브랜치에 묶인 one-time lease입니다. 실행 1회 후 자동 소진됩니다.' : latestLease?.status === 'used' ? '가장 최근 lease는 이미 사용 완료되었습니다. 다시 실행하려면 새 승인이 필요합니다.' : '승인 후 manifest가 바뀌면 기존 lease는 자동 무효화됩니다.')}</p>
      </section>
      <section class="execution-card execution-card-log">
        <p class="summary-label">execution session</p>
        <h4 class="summary-statement">${escapeHtml(executionSession ? `${getDisplayLabel(executionSession.status)} · ${executionSession.id}` : '아직 실행 세션이 없습니다.')}</h4>
        <div class="definition-list">
          <div class="definition-item"><span>현재 step</span><strong>${escapeHtml(executionSession?.steps?.[executionSession?.currentStepIndex]?.title || '-')}</strong></div>
          <div class="definition-item"><span>검증</span><strong>${escapeHtml(getDisplayLabel(verification?.status, verification?.status || 'pending'))}</strong></div>
          <div class="definition-item"><span>변경 파일</span><strong>${escapeHtml(String(executionSession?.changedFiles?.length || 0))}건</strong></div>
          <div class="definition-item"><span>종료 코드</span><strong>${escapeHtml(executionSession?.exitCode === null || executionSession?.exitCode === undefined ? '-' : String(executionSession.exitCode))}</strong></div>
        </div>
        ${
          verification?.summary
            ? `<p class="summary-note">${escapeHtml(verification.summary)}</p>`
            : ''
        }
        ${
          stepRows
            ? `<ul class="execution-step-list">${stepRows}</ul>`
            : '<p class="summary-note">실행 step 목록이 아직 없습니다.</p>'
        }
        ${
          changedFiles.length
            ? `<div class="execution-inline-list">${changedFiles.map((file) => `<span class="tag">${escapeHtml(file)}</span>`).join('')}</div>`
            : ''
        }
        <pre class="execution-log-surface">${escapeHtml(logs.slice(-24).join('\n') || '실행 로그가 아직 없습니다.')}</pre>
      </section>
    </div>
  `;
  wireQuickActions(elements.executionConsole);
}

function renderReviewStageSummary() {
  if (!elements.reviewStageSummary) {
    return;
  }

  if (!state.missionDetail) {
    elements.reviewStageSummary.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '미션 선택하기',
      actionValue: 'step-setup',
      icon: 'RV',
      message: '미션을 고르면 승인 대기와 후속 작업 상태를 이 단계에서 바로 판단할 수 있습니다.',
      title: '검토할 미션이 없습니다',
    });
    wireQuickActions(elements.reviewStageSummary);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const flow = getFlowState();
  const primaryDecision =
    pendingApprovalCount > 0
      ? `승인 ${pendingApprovalCount}건부터 처리하세요`
      : pendingActionCount > 0
        ? `후속 작업 ${pendingActionCount}건을 먼저 정리하세요`
        : '검토 단계 정리가 끝났습니다';
  const decisionCopy =
    pendingApprovalCount > 0
      ? '사람의 승인 항목이 남아 있어 결과를 확정할 수 없습니다.'
      : pendingActionCount > 0
        ? '후속 작업을 닫아야 승인과 결과 확정이 깔끔하게 이어집니다.'
        : '승인 대기와 후속 작업이 모두 정리되어 결과 확인 단계로 넘어갈 수 있습니다.';

  elements.reviewStageSummary.innerHTML = `
    <div class="stage-summary-card review-spotlight">
      <p class="summary-label">지금 판단할 내용</p>
      <div class="review-decision-strip">
        <div class="decision-chip ${pendingApprovalCount > 0 ? 'is-active' : 'is-clear'}">
          <span>승인 대기</span>
          <strong>${escapeHtml(String(pendingApprovalCount))}건</strong>
        </div>
        <div class="decision-chip ${pendingActionCount > 0 ? 'is-active' : 'is-clear'}">
          <span>후속 작업</span>
          <strong>${escapeHtml(String(pendingActionCount))}건</strong>
        </div>
        <div class="decision-chip is-neutral">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? `${getDisplayLabel(latestSession.currentStage)} · ${getDisplayLabel(latestSession.status)}` : '세션 없음')}</strong>
        </div>
        ${
          latestExecutionSession
            ? `
              <div class="decision-chip is-neutral">
                <span>실행 세션</span>
                <strong>${escapeHtml(`${getDisplayLabel(latestExecutionSession.status)} · 검증 ${getDisplayLabel(latestExecutionSession.verification?.status, latestExecutionSession.verification?.status || 'pending')}`)}</strong>
              </div>
            `
            : ''
        }
      </div>
      <h4 class="summary-statement">${escapeHtml(primaryDecision)}</h4>
      <p class="summary-note review-priority-copy">${escapeHtml(decisionCopy)}</p>
      <p class="summary-note">${escapeHtml(latestExecutionSession?.verification?.summary || latestSession?.reviewerSummary || flow.copy)}</p>
      <div class="action-row">
        <button class="primary-button" type="button" data-ui-action="switch-tab" data-ui-value="reviews">승인 항목 보기</button>
        <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="reviews">후속 작업 보기</button>
        <button class="secondary-button" type="button" data-ui-action="switch-tab" data-ui-value="runs">실행 기록 보기</button>
      </div>
    </div>
  `;
  wireQuickActions(elements.reviewStageSummary);
}

function renderOutputStageSummary() {
  if (!elements.outputStageSummary) {
    return;
  }

  const latestArtifact = getPrimaryArtifact(state.currentSessionPayload?.artifacts || []);
  const latestSession = state.missionDetail?.summary?.latestSession || null;
  const execution = getExecutionStatusPayload();
  const latestExecutionSession = execution?.latestExecutionSession || null;
  const flow = getFlowState();

  if (!state.missionDetail) {
    elements.outputStageSummary.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계 열기',
      actionValue: 'step-setup',
      icon: 'OT',
      message: '미션을 선택하고 실행이 끝나면 결과 요약이 이 단계에 표시됩니다.',
      title: '확인할 결과가 없습니다',
    });
    wireQuickActions(elements.outputStageSummary);
    return;
  }

  const artifactLabel = getArtifactLabel(latestArtifact);
  const artifactPath = latestArtifact?.path || latestArtifact?.fileName || '결과 파일 경로가 아직 없습니다.';
  const resultStateLabel = latestArtifact ? '결과 확정 가능' : '결과 준비 중';

  elements.outputStageSummary.innerHTML = `
    <div class="stage-summary-card result-spotlight">
      <div class="result-spotlight-head">
        <div class="definition-item">
          <span>대표 결과물</span>
          <strong>${escapeHtml(artifactLabel || flow.label)}</strong>
        </div>
        <span class="status-badge ${latestArtifact ? 'status-completed' : 'status-pending'}">${escapeHtml(resultStateLabel)}</span>
      </div>
      <p class="summary-note result-spotlight-note">${escapeHtml(latestSession?.reviewerSummary || flow.copy)}</p>
      <div class="summary-inline">
        <div class="summary-chip">
          <span>최근 세션</span>
          <strong>${escapeHtml(latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '아직 실행 전')}</strong>
        </div>
        <div class="summary-chip">
          <span>현재 단계</span>
          <strong>${escapeHtml(flow.currentStepLabel)}</strong>
        </div>
        ${
          latestExecutionSession
            ? `
              <div class="summary-chip">
                <span>검증 결과</span>
                <strong>${escapeHtml(getDisplayLabel(latestExecutionSession.verification?.status, latestExecutionSession.verification?.status || 'pending'))}</strong>
              </div>
            `
            : ''
        }
        <div class="definition-item">
          <span>결과 유형</span>
          <strong>${escapeHtml(latestArtifact ? getDisplayLabel(latestArtifact.kind, latestArtifact.kind) : '준비 중')}</strong>
        </div>
      </div>
      <div class="definition-list result-definition-list">
        <div class="definition-item">
          <span>결과 파일</span>
          <strong class="mono">${escapeHtml(artifactPath)}</strong>
        </div>
        <div class="definition-item">
          <span>검토 상태</span>
          <strong>${escapeHtml(flow.blocker)}</strong>
        </div>
        ${
          latestExecutionSession
            ? `
              <div class="definition-item">
                <span>변경 파일</span>
                <strong>${escapeHtml(String(latestExecutionSession.changedFiles?.length || 0))}건</strong>
              </div>
            `
            : ''
        }
      </div>
      <div class="action-row">
        <button class="primary-button" type="button" data-ui-action="switch-tab" data-ui-value="artifacts">결과물 열기</button>
        <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="runs">실행 기록 보기</button>
        <button class="secondary-button" type="button" data-ui-action="switch-tab" data-ui-value="reviews">검토 상태 보기</button>
      </div>
    </div>
  `;
  wireQuickActions(elements.outputStageSummary);
}

function renderOutputCloseout() {
  if (!elements.outputCloseout) {
    return;
  }

  if (!state.missionDetail) {
    elements.outputCloseout.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계 열기',
      actionValue: 'step-setup',
      icon: 'CK',
      message: '미션을 선택하면 최종 결과를 닫기 전 확인할 체크리스트를 보여줍니다.',
      title: '확인할 마무리 항목이 없습니다',
    });
    wireQuickActions(elements.outputCloseout);
    return;
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const latestArtifact = getPrimaryArtifact(state.currentSessionPayload?.artifacts || []);
  const closeoutItems = [
    {
      actionLabel: '결과물 열기',
      actionValue: 'artifacts',
      detail: latestArtifact ? getArtifactLabel(latestArtifact) : '대표 결과물이 아직 준비되지 않았습니다.',
      label: '대표 결과물 확인',
      ready: Boolean(latestArtifact),
    },
    {
      actionLabel: '실행 기록 보기',
      actionValue: 'runs',
      detail: latestSession
        ? `${latestSession.provider || '-'} 제공자 기준 ${getDisplayLabel(latestSession.status)}`
        : '최근 세션이 아직 없습니다.',
      label: '최근 실행 상태 확인',
      ready: Boolean(latestSession && latestSession.status === 'completed'),
    },
    {
      actionLabel: '검토 상태 보기',
      actionValue: 'reviews',
      detail:
        pendingApprovalCount > 0
          ? `승인 ${pendingApprovalCount}건이 남아 있습니다.`
          : pendingActionCount > 0
            ? `후속 작업 ${pendingActionCount}건을 먼저 처리해야 합니다.`
            : '승인 대기와 후속 작업이 모두 정리되었습니다.',
      label: '검토와 승인 상태 정리',
      ready: pendingApprovalCount === 0 && pendingActionCount === 0,
    },
    {
      actionLabel: '입력값 확인',
      actionValue: 'config',
      detail: '최종 결과를 공유하거나 넘기기 전, 목표와 제약 조건이 결과와 맞는지 마지막으로 점검합니다.',
      label: '입력값과 설정 재확인',
      ready: true,
    },
  ];

  if (isExecutionMissionSelected() && state.releaseStatus) {
    const releaseSummary = state.releaseStatus.summary || {};
    closeoutItems.push({
      actionLabel: 'v1 마감 상태 보기',
      actionValue: 'release',
      detail: releaseSummary.ready
        ? 'execution v1 closeout checklist가 현재 HEAD 기준으로 닫혀 있습니다.'
        : releaseSummary.baselineReady
          ? 'verified snapshot 기준 필수 closeout은 닫혀 있고, current surface evidence만 새 HEAD 기준으로 다시 맞추면 됩니다.'
          : releaseSummary.checklistOpen
            ? `열린 체크리스트 ${releaseSummary.checklistOpen}건 · 환경 gap ${releaseSummary.blockedItems || 0}건`
            : 'execution v1 closeout 상태를 다시 확인해야 합니다.',
      label: '실행형 에이전트 v1 준비 상태',
      ready: Boolean(releaseSummary.ready || releaseSummary.baselineReady),
    });
  }

  elements.outputCloseout.innerHTML = closeoutItems
    .map(
      (item, index) => `
        <div class="closeout-item ${item.ready ? 'is-ready' : 'is-blocked'}">
          <div class="closeout-item-head">
            <span class="closeout-index">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
            <div class="closeout-item-body">
              <span class="closeout-label">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.ready ? '확인 완료 또는 바로 확인 가능' : '아직 확인 필요')}</strong>
              <p class="closeout-copy">${escapeHtml(item.detail)}</p>
            </div>
            <span class="status-badge ${item.ready ? 'status-completed' : 'status-pending'}">${escapeHtml(item.ready ? '준비됨' : '확인 필요')}</span>
          </div>
          <div class="closeout-actions">
            <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="${escapeHtml(item.actionValue)}">
              ${escapeHtml(item.actionLabel)}
            </button>
          </div>
        </div>
      `,
    )
    .join('');
  wireQuickActions(elements.outputCloseout);
}

function renderDetailContextbar() {
  if (!elements.detailContextbar) {
    return;
  }

  if (state.activeDetailTab === 'release' && state.releaseStatus) {
    const summary = getReleaseStatusSummary();
    elements.detailContextbar.innerHTML = `
      <div class="detail-context-main">
        <span class="detail-context-label">현재 세부 보기</span>
        <strong>execution v1 마감 상태 확인 중</strong>
        <p>검증 근거, closeout checklist, provider readiness를 같은 작업면에서 확인합니다.</p>
      </div>
      <div class="detail-context-stats">
        <div class="detail-context-pill">
          <span>deterministic</span>
          <strong>${escapeHtml(summary.deterministicLabel)}</strong>
        </div>
        <div class="detail-context-pill">
          <span>열린 체크리스트</span>
          <strong>${escapeHtml(String(summary.checklistOpen))}건</strong>
        </div>
        <div class="detail-context-pill">
          <span>환경 gap</span>
          <strong>${escapeHtml(String(summary.blockedItems))}건</strong>
        </div>
        <div class="detail-context-pill">
          <span>갱신 시각</span>
          <strong>${escapeHtml(formatDate(summary.generatedAt))}</strong>
        </div>
      </div>
    `;
    return;
  }

  if (!state.missionDetail) {
    elements.detailContextbar.innerHTML = `
      <div class="detail-context-empty">미션을 선택하면 결과물, 실행 기록, 검토 이력의 기준 맥락이 여기에 표시됩니다.</div>
    `;
    return;
  }

  const mission = state.missionDetail.mission;
  const latestSession = state.currentSessionPayload?.session || state.missionDetail.summary?.latestSession || null;
  const artifacts = state.currentSessionPayload?.artifacts || [];
  const approvals = state.currentSessionPayload?.approvals || [];
  const primaryArtifact = getPrimaryArtifact(artifacts);
  const currentTabLabel = {
    artifacts: '결과물 확인 중',
    runs: '실행 기록 확인 중',
    reviews: '검토 이력 확인 중',
    config: '입력값과 설정 확인 중',
    harness: '하네스 상태 확인 중',
  }[state.activeDetailTab];

  const highlightedArtifact =
    state.selectedArtifactId && state.artifactsById.has(state.selectedArtifactId)
      ? state.artifactsById.get(state.selectedArtifactId)?.artifact?.title ||
        state.artifactsById.get(state.selectedArtifactId)?.artifact?.fileName
      : getArtifactLabel(primaryArtifact) ||
        '선택된 결과물 없음';

  elements.detailContextbar.innerHTML = `
    <div class="detail-context-main">
      <span class="detail-context-label">현재 세부 보기</span>
      <strong>${escapeHtml(currentTabLabel || '세부 보기')}</strong>
      <p>${escapeHtml(mission.title)} 기준으로 결과와 기록을 한곳에서 확인합니다.</p>
    </div>
    <div class="detail-context-stats">
      <div class="detail-context-pill">
        <span>최근 세션</span>
        <strong>${escapeHtml(latestSession ? `${latestSession.provider || '-'} · ${getDisplayLabel(latestSession.status)}` : '없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>결과물</span>
        <strong>${escapeHtml(String(artifacts.length))}개 · ${escapeHtml(highlightedArtifact || '없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>검토 상태</span>
        <strong>${escapeHtml(approvals.length ? `승인 ${approvals.length}건 기록` : '승인 기록 없음')}</strong>
      </div>
      <div class="detail-context-pill">
        <span>하네스</span>
        <strong>${escapeHtml(`${state.missionDetail?.harness?.recommendations?.length || 0}건 권장 · 메모 ${state.missionDetail?.harness?.memory?.missionCounts?.total || 0}개`)}</strong>
      </div>
    </div>
  `;
}

function renderHarnessPanel() {
  if (elements.documentLogSearch) {
    elements.documentLogSearch.value = state.harnessDocumentQuery;
  }
  if (elements.documentLogFilter) {
    elements.documentLogFilter.value = state.harnessDocumentFilter;
  }

  if (!state.missionDetail?.harness) {
    const empty = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계로 이동',
      actionValue: 'step-setup',
      icon: 'HS',
      message: '미션을 선택하면 문서 기준점, 메모리, 운영 루프를 묶은 하네스 뷰를 보여줍니다.',
      title: '하네스 정보를 계산할 미션이 없습니다',
    });
    elements.harnessSource.innerHTML = empty;
    elements.harnessMemory.innerHTML = empty;
    elements.harnessLoops.innerHTML = empty;
    wireQuickActions(elements.harnessSource);
    wireQuickActions(elements.harnessMemory);
    wireQuickActions(elements.harnessLoops);
    return;
  }

  const harnessSummary = state.missionDetail.harness;
  const documentSummary = harnessSummary.documents?.summary || {};
  const documentItems = harnessSummary.documents?.items || [];
  const documentBrowse = state.harnessDocumentResult || {
    entries: harnessSummary.documents?.recentEntries || [],
    filters: {
      limit: Number(state.harnessDocumentVisibleCount || 12),
      offset: Number(state.harnessDocumentOffset || 0),
      query: String(state.harnessDocumentQuery || ''),
      sort: String(state.harnessDocumentSort || 'latest'),
      type: String(state.harnessDocumentFilter || 'all'),
    },
    hasMore: false,
    summary: {
      currentPage: (harnessSummary.documents?.recentEntries?.length || 0) ? 1 : 0,
      filteredCount: harnessSummary.documents?.recentEntries?.length || 0,
      hasNext: false,
      hasPrev: false,
      offset: Number(state.harnessDocumentOffset || 0),
      pageCount: harnessSummary.documents?.recentEntries?.length || 0,
      pageEnd: harnessSummary.documents?.recentEntries?.length || 0,
      pageStart: (harnessSummary.documents?.recentEntries?.length || 0) ? 1 : 0,
      remainingCount: 0,
      trackedEntryCount: documentSummary.trackedEntryCount || 0,
      totalPages: (harnessSummary.documents?.recentEntries?.length || 0) ? 1 : 0,
      visibleCount: harnessSummary.documents?.recentEntries?.length || 0,
    },
  };
  const memoryBrowse = state.harnessMemoryResult || {
    entries: [],
    filters: {
      kind: String(state.harnessMemoryFilterKind || 'all'),
      limit: Number(state.harnessMemoryVisibleCount || 12),
      offset: Number(state.harnessMemoryOffset || 0),
      query: String(state.harnessMemoryQuery || ''),
      scope: String(state.harnessMemoryFilterScope || 'all'),
      sort: String(state.harnessMemorySort || 'latest'),
    },
    hasMore: false,
    missionEntries: harnessSummary.memory?.recentMissionEntries || [],
    summary: {
      currentPage:
        ((harnessSummary.memory?.recentMissionEntries?.length || 0) +
          (harnessSummary.memory?.recentWorkspaceEntries?.length || 0))
          ? 1
          : 0,
      filteredMissionCount: harnessSummary.memory?.recentMissionEntries?.length || 0,
      filteredTotal:
        (harnessSummary.memory?.recentMissionEntries?.length || 0) +
        (harnessSummary.memory?.recentWorkspaceEntries?.length || 0),
      filteredWorkspaceCount: harnessSummary.memory?.recentWorkspaceEntries?.length || 0,
      hasNext: false,
      hasPrev: false,
      missionTotal: harnessSummary.memory?.missionCounts?.total || 0,
      offset: Number(state.harnessMemoryOffset || 0),
      pageCount:
        (harnessSummary.memory?.recentMissionEntries?.length || 0) +
        (harnessSummary.memory?.recentWorkspaceEntries?.length || 0),
      pageEnd:
        (harnessSummary.memory?.recentMissionEntries?.length || 0) +
        (harnessSummary.memory?.recentWorkspaceEntries?.length || 0),
      pageStart:
        ((harnessSummary.memory?.recentMissionEntries?.length || 0) +
          (harnessSummary.memory?.recentWorkspaceEntries?.length || 0))
          ? 1
          : 0,
      remainingCount: 0,
      total: (harnessSummary.memory?.missionCounts?.total || 0) + (harnessSummary.memory?.workspaceCount || 0),
      totalPages:
        ((harnessSummary.memory?.recentMissionEntries?.length || 0) +
          (harnessSummary.memory?.recentWorkspaceEntries?.length || 0))
          ? 1
          : 0,
      visibleCount:
        (harnessSummary.memory?.recentMissionEntries?.length || 0) +
        (harnessSummary.memory?.recentWorkspaceEntries?.length || 0),
      workspaceTotal: harnessSummary.memory?.workspaceCount || 0,
    },
    workspaceEntries: harnessSummary.memory?.recentWorkspaceEntries || [],
  };
  const memory = harnessSummary.memory || {};
  const loops = harnessSummary.loops || {};
  const recommendations = harnessSummary.recommendations || [];
  const latestArtifact = harnessSummary.documents?.latestArtifact || null;
  const visibleDocumentEntries = documentBrowse.entries || [];
  const visibleMissionMemoryEntries = memoryBrowse.missionEntries || [];
  const visibleWorkspaceMemoryEntries = memoryBrowse.workspaceEntries || [];
  const documentQuery = String(documentBrowse.filters?.query || '').trim();
  const documentTypeFilter = String(documentBrowse.filters?.type || state.harnessDocumentFilter || 'all').trim();
  const documentFilterLabel = documentTypeFilter === 'all'
    ? '전체'
    : getDisplayLabel(documentTypeFilter, documentTypeFilter);
  const documentPageLabel = getHarnessPageLabel(documentBrowse.summary);
  const memoryFilterLabel = getHarnessMemoryFilterLabel({
    kindFilter: String(memoryBrowse.filters?.kind || state.harnessMemoryFilterKind || 'all').trim(),
    query: String(memoryBrowse.filters?.query || state.harnessMemoryQuery || '').trim(),
    scopeFilter: String(memoryBrowse.filters?.scope || state.harnessMemoryFilterScope || 'all').trim(),
  });
  const memoryPageLabel = getHarnessPageLabel(memoryBrowse.summary);
  const documentRangeLabel = getHarnessRangeLabel(
    documentBrowse.summary,
    Number(documentBrowse.summary?.filteredCount || 0),
  );
  const memoryRangeLabel = getHarnessRangeLabel(
    memoryBrowse.summary,
    Number(memoryBrowse.summary?.filteredTotal || 0),
  );
  const documentPageSize = Number(documentBrowse.filters?.limit || state.harnessDocumentVisibleCount || 12) || 12;
  const memoryPageSize = Number(memoryBrowse.filters?.limit || state.harnessMemoryVisibleCount || 12) || 12;
  const memoryScopeFilter = String(memoryBrowse.filters?.scope || state.harnessMemoryFilterScope || 'all').trim();
  const memoryKindFilter = String(memoryBrowse.filters?.kind || state.harnessMemoryFilterKind || 'all').trim();
  const memoryQuery = String(memoryBrowse.filters?.query || state.harnessMemoryQuery || '').trim();
  const isDocumentBrowseDirty = Boolean(
    documentQuery ||
      documentTypeFilter !== 'all' ||
      String(state.harnessDocumentSort || 'latest').trim() !== 'latest' ||
      documentPageSize !== 12 ||
      Number(documentBrowse.summary?.currentPage || 0) > 1,
  );
  const isMemoryBrowseDirty = Boolean(
    memoryQuery ||
      memoryScopeFilter !== 'all' ||
      memoryKindFilter !== 'all' ||
      String(state.harnessMemorySort || 'latest').trim() !== 'latest' ||
      memoryPageSize !== 12 ||
      Number(memoryBrowse.summary?.currentPage || 0) > 1,
  );
  const documentFilterChips = [
    { label: '정렬', value: getHarnessDocumentSortLabel() },
    { label: '페이지', value: getHarnessPageSizeLabel(documentPageSize) },
  ];
  if (documentTypeFilter !== 'all') {
    documentFilterChips.unshift({ label: '유형', value: documentFilterLabel });
  }
  if (documentQuery) {
    documentFilterChips.unshift({ label: '검색', value: documentQuery });
  }
  const memoryFilterChips = [
    { label: '정렬', value: getHarnessMemorySortLabel() },
    { label: '페이지', value: getHarnessPageSizeLabel(memoryPageSize) },
  ];
  if (memoryScopeFilter !== 'all') {
    memoryFilterChips.unshift({
      label: '범위',
      value: memoryScopeFilter === 'mission' ? '미션 메모' : '워크스페이스 메모',
    });
  }
  if (memoryKindFilter !== 'all') {
    memoryFilterChips.unshift({ label: '종류', value: getDisplayLabel(memoryKindFilter, memoryKindFilter) });
  }
  if (memoryQuery) {
    memoryFilterChips.unshift({ label: '검색', value: memoryQuery });
  }

  elements.harnessSource.innerHTML = `
    <div class="harness-overview-grid">
      <div class="summary-chip"><span>문서</span><strong>${escapeHtml(String(documentSummary.availableCount || 0))}/${escapeHtml(String(documentSummary.totalCount || 0))}</strong></div>
      <div class="summary-chip"><span>ADR</span><strong>${escapeHtml(String(documentSummary.adrCount || 0))}개</strong></div>
      <div class="summary-chip"><span>최근 갱신</span><strong>${escapeHtml(formatDate(documentSummary.latestUpdatedAt))}</strong></div>
    </div>
    ${
      Number(documentSummary.legacyDevlogCount || 0) > 0
        ? `<div class="harness-callout">
            <strong>기존 개발 로그 ${escapeHtml(String(documentSummary.legacyDevlogCount || 0))}건이 아직 tracked entry가 아닙니다.</strong>
            <p>예전 append-only 섹션을 편집 가능한 문서 기록으로 한 번에 전환합니다. 전환 후에는 하네스에서 바로 수정/삭제할 수 있습니다.</p>
            <div class="inline-actions">
              <button class="ghost-button" type="button" data-document-action="migrate-legacy">기존 개발 로그 전환</button>
            </div>
          </div>`
        : ''
    }
    ${
      latestArtifact
        ? `<div class="harness-callout">
            <strong>대표 산출물</strong>
            <p>${escapeHtml(latestArtifact.title)}</p>
            <div class="item-meta mono">${escapeHtml(latestArtifact.path || '-')}</div>
          </div>`
        : ''
    }
    <div class="harness-list">
      ${documentItems
        .map(
          (item) => `
            <div class="harness-row">
              <div>
                <div class="item-title">${escapeHtml(item.label)}</div>
                <div class="item-meta mono">${escapeHtml(item.path || '-')}</div>
              </div>
              <div class="harness-row-meta">
                <span class="mini-badge ${item.exists ? 'status-completed' : 'status-failed'}">${escapeHtml(item.exists ? '기록됨' : '누락')}</span>
                <span class="item-meta">${escapeHtml(formatDate(item.updatedAt))}</span>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
    <div class="harness-subsection">
      <div class="harness-filter-row">
        <p class="summary-label">문서 기록 탐색</p>
        <div class="item-meta">총 ${escapeHtml(String(documentBrowse.summary?.trackedEntryCount || documentSummary.trackedEntryCount || 0))}건 · 검색 결과 ${escapeHtml(String(documentBrowse.summary?.filteredCount || 0))}건 · ${escapeHtml(documentPageLabel)} · ${escapeHtml(getHarnessDocumentSortLabel())}</div>
      </div>
      ${renderHarnessFilterChips(documentFilterChips)}
      <div class="harness-filter-row">
        <p class="summary-label">정렬</p>
        <div class="inline-actions">
          <label class="compact-label">
            문서 정렬
            <select id="document-log-sort">
              <option value="latest" ${state.harnessDocumentSort === 'latest' ? 'selected' : ''}>최신순</option>
              <option value="oldest" ${state.harnessDocumentSort === 'oldest' ? 'selected' : ''}>오래된 순</option>
              <option value="title" ${state.harnessDocumentSort === 'title' ? 'selected' : ''}>제목순</option>
              <option value="type" ${state.harnessDocumentSort === 'type' ? 'selected' : ''}>유형순</option>
            </select>
          </label>
          <label class="compact-label">
            페이지 크기
            <select id="document-log-limit">
              <option value="12" ${Number(state.harnessDocumentVisibleCount || 12) === 12 ? 'selected' : ''}>12건</option>
              <option value="24" ${Number(state.harnessDocumentVisibleCount || 12) === 24 ? 'selected' : ''}>24건</option>
              <option value="48" ${Number(state.harnessDocumentVisibleCount || 12) === 48 ? 'selected' : ''}>48건</option>
            </select>
          </label>
          <button class="ghost-button" type="button" data-document-action="reset-browse" ${isDocumentBrowseDirty ? '' : 'disabled'}>필터 초기화</button>
        </div>
      </div>
      ${
        Number(documentBrowse.summary?.filteredCount || 0) || documentQuery || documentTypeFilter !== 'all'
          ? `<div class="harness-list">
              ${Number(documentBrowse.summary?.filteredCount || 0)
                ? visibleDocumentEntries
                    .map(
                      (entry) => `
                        <div class="harness-row">
                          <div>
                            <div class="item-title">${escapeHtml(entry.title)}</div>
                            <div class="item-meta">${escapeHtml(getDisplayLabel(entry.type, entry.type))} · ${escapeHtml(summarizeText(entry.content, '-'))}</div>
                            <div class="item-meta mono">${escapeHtml(entry.path || '-')}</div>
                          </div>
                          <div class="harness-row-meta">
                            <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                            <div class="inline-actions">
                              <button class="ghost-button" type="button" data-document-action="edit" data-document-id="${escapeHtml(entry.id)}">불러오기</button>
                              <button class="danger-button" type="button" data-document-action="delete" data-document-id="${escapeHtml(entry.id)}">삭제</button>
                            </div>
                          </div>
                        </div>
                      `,
                    )
                    .join('')
                : `<div class="harness-empty-inline">
                    <strong>일치하는 문서 기록이 없습니다.</strong>
                    <p>${escapeHtml(documentFilterLabel)} 범위에서 ${escapeHtml(documentQuery || '검색 조건')}와 맞는 항목을 찾지 못했습니다.</p>
                  </div>`}
              ${
                Number(documentBrowse.summary?.filteredCount || 0)
                  ? `<div class="harness-empty-inline">
                      <strong>${escapeHtml(documentPageLabel)} · ${escapeHtml(documentRangeLabel)}</strong>
                      <p>남은 문서 기록 ${escapeHtml(String(documentBrowse.summary?.remainingCount || 0))}건 · 검색 결과 ${escapeHtml(String(documentBrowse.summary?.filteredCount || 0))}건</p>
                      <div class="inline-actions">
                        <button class="ghost-button" type="button" data-document-action="prev-page" ${documentBrowse.summary?.hasPrev ? '' : 'disabled'}>이전 ${escapeHtml(String(documentPageSize))}건</button>
                        <button class="ghost-button" type="button" data-document-action="next-page" ${documentBrowse.summary?.hasNext ? '' : 'disabled'}>다음 ${escapeHtml(String(documentPageSize))}건</button>
                      </div>
                    </div>`
                  : ''
              }
            </div>`
          : ''
      }
    </div>
    <div class="harness-note">문서 intake는 원본 형식과 별개로 Markdown 작업본을 source-of-record로 유지하는 방향을 기본값으로 둡니다.</div>
  `;

  elements.harnessMemory.innerHTML = `
    <div class="harness-overview-grid">
      <div class="summary-chip"><span>미션 메모</span><strong>${escapeHtml(String(memory.missionCounts?.total || 0))}개</strong></div>
      <div class="summary-chip"><span>결정</span><strong>${escapeHtml(String(memory.missionCounts?.decision || 0))}개</strong></div>
      <div class="summary-chip"><span>워크스페이스</span><strong>${escapeHtml(String(memory.workspaceCount || 0))}개</strong></div>
    </div>
    <div class="harness-callout">
      <strong>레이어드 메모리</strong>
      <p>미션 메모리는 현재 실행 품질을, 워크스페이스 메모리는 장기 운영 문맥을 받쳐줍니다.</p>
    </div>
    <div class="harness-searchbar">
      <label class="compact-label">
        메모 검색
        <input id="harness-memory-search" type="search" value="${escapeHtml(String(memoryBrowse.filters?.query || ''))}" placeholder="내용 또는 kind 검색" />
      </label>
      <div class="harness-filter-row">
        <label class="compact-label">
          범위
          <select id="harness-memory-scope-filter">
            <option value="all" ${String(memoryBrowse.filters?.scope || 'all') === 'all' ? 'selected' : ''}>전체</option>
            <option value="mission" ${String(memoryBrowse.filters?.scope || 'all') === 'mission' ? 'selected' : ''}>미션 메모</option>
            <option value="workspace" ${String(memoryBrowse.filters?.scope || 'all') === 'workspace' ? 'selected' : ''}>워크스페이스 메모</option>
          </select>
        </label>
        <label class="compact-label">
          종류
          <select id="harness-memory-kind-filter">
            <option value="all" ${String(memoryBrowse.filters?.kind || 'all') === 'all' ? 'selected' : ''}>전체</option>
            <option value="fact" ${String(memoryBrowse.filters?.kind || 'all') === 'fact' ? 'selected' : ''}>사실</option>
            <option value="decision" ${String(memoryBrowse.filters?.kind || 'all') === 'decision' ? 'selected' : ''}>결정</option>
            <option value="preference" ${String(memoryBrowse.filters?.kind || 'all') === 'preference' ? 'selected' : ''}>선호</option>
          </select>
        </label>
      </div>
    </div>
    <div class="harness-subsection">
      <div class="harness-filter-row">
        <p class="summary-label">메모 탐색</p>
        <span class="item-meta">총 ${escapeHtml(String(memoryBrowse.summary?.total || 0))}건 · 검색 결과 ${escapeHtml(String(memoryBrowse.summary?.filteredTotal || 0))}건 · ${escapeHtml(memoryPageLabel)} · ${escapeHtml(getHarnessMemorySortLabel())}</span>
      </div>
      ${renderHarnessFilterChips(memoryFilterChips)}
      <div class="harness-filter-row">
        <p class="summary-label">정렬</p>
        <div class="inline-actions">
          <label class="compact-label">
            메모 정렬
            <select id="harness-memory-sort">
              <option value="latest" ${state.harnessMemorySort === 'latest' ? 'selected' : ''}>최신순</option>
              <option value="oldest" ${state.harnessMemorySort === 'oldest' ? 'selected' : ''}>오래된 순</option>
              <option value="kind" ${state.harnessMemorySort === 'kind' ? 'selected' : ''}>종류순</option>
            </select>
          </label>
          <label class="compact-label">
            페이지 크기
            <select id="harness-memory-limit">
              <option value="12" ${Number(state.harnessMemoryVisibleCount || 12) === 12 ? 'selected' : ''}>12건</option>
              <option value="24" ${Number(state.harnessMemoryVisibleCount || 12) === 24 ? 'selected' : ''}>24건</option>
              <option value="48" ${Number(state.harnessMemoryVisibleCount || 12) === 48 ? 'selected' : ''}>48건</option>
            </select>
          </label>
          <button class="ghost-button" type="button" data-memory-action="reset-browse" ${isMemoryBrowseDirty ? '' : 'disabled'}>필터 초기화</button>
        </div>
      </div>
      <div class="harness-list">
      ${(visibleMissionMemoryEntries || [])
        .map(
          (entry) => `
            <div class="harness-row">
              <div>
                <div class="item-title">${escapeHtml(getDisplayLabel(entry.kind, entry.kind))}</div>
                <div class="item-meta">${escapeHtml(summarizeText(entry.content, '-'))}</div>
              </div>
              <div class="harness-row-meta">
                <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                <div class="inline-actions">
                  <button class="ghost-button" type="button" data-memory-action="edit" data-memory-id="${escapeHtml(entry.id)}" data-memory-scope="mission">불러오기</button>
                  <button class="danger-button" type="button" data-memory-action="delete" data-memory-id="${escapeHtml(entry.id)}" data-memory-scope="mission">삭제</button>
                </div>
              </div>
            </div>
          `,
        )
        .join('')}
      </div>
    </div>
    ${
      (visibleWorkspaceMemoryEntries || []).length
        ? `<div class="harness-subsection">
            <p class="summary-label">워크스페이스 기억</p>
            <div class="harness-list">
              ${visibleWorkspaceMemoryEntries
                .map(
                  (entry) => `
                    <div class="harness-row">
                      <div>
                        <div class="item-title">${escapeHtml(getDisplayLabel(entry.kind, entry.kind))}</div>
                        <div class="item-meta">${escapeHtml(summarizeText(entry.content, '-'))}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="item-meta">${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                        <div class="inline-actions">
                          <button class="ghost-button" type="button" data-memory-action="edit" data-memory-id="${escapeHtml(entry.id)}" data-memory-scope="workspace">불러오기</button>
                          <button class="danger-button" type="button" data-memory-action="delete" data-memory-id="${escapeHtml(entry.id)}" data-memory-scope="workspace">삭제</button>
                        </div>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>`
        : ''
    }
    ${
      Number(memoryBrowse.summary?.filteredTotal || 0)
        ? `<div class="harness-empty-inline">
            <strong>${escapeHtml(memoryPageLabel)} · ${escapeHtml(memoryRangeLabel)}</strong>
            <p>남은 메모 ${escapeHtml(String(memoryBrowse.summary?.remainingCount || 0))}건 · 검색 결과 ${escapeHtml(String(memoryBrowse.summary?.filteredTotal || 0))}건</p>
            <div class="inline-actions">
              <button class="ghost-button" type="button" data-memory-action="prev-page" ${memoryBrowse.summary?.hasPrev ? '' : 'disabled'}>이전 ${escapeHtml(String(memoryPageSize))}건</button>
              <button class="ghost-button" type="button" data-memory-action="next-page" ${memoryBrowse.summary?.hasNext ? '' : 'disabled'}>다음 ${escapeHtml(String(memoryPageSize))}건</button>
            </div>
          </div>`
        : ''
    }
    ${
      Number(memoryBrowse.summary?.filteredTotal || 0) === 0
        ? `<div class="harness-empty-inline">
            <strong>일치하는 메모리가 없습니다.</strong>
            <p>${escapeHtml(memoryFilterLabel)} 기준으로 일치하는 메모를 찾지 못했습니다.</p>
          </div>`
        : ''
    }
  `;

  elements.harnessLoops.innerHTML = `
    <div class="harness-callout">
      <strong>현재 권장 조치</strong>
      <p>${escapeHtml(recommendations[0]?.title || '열린 하네스 경고가 없습니다. 문서, 메모리, 운영 루프가 안정 상태입니다.')}</p>
    </div>
    <div class="harness-overview-grid">
      <div class="summary-chip"><span>검토</span><strong>승인 ${escapeHtml(String(loops.review?.pendingApprovals || 0))} · 후속 ${escapeHtml(String(loops.review?.pendingActions || 0))}</strong></div>
      <div class="summary-chip"><span>유지보수</span><strong>${escapeHtml(String(loops.maintenance?.requiredCount || 0))}건</strong></div>
      <div class="summary-chip"><span>제공자</span><strong>${escapeHtml(getDisplayLabel(loops.provider?.healthDriftStatus || 'stable'))}</strong></div>
    </div>
    <div class="harness-list">
      <div class="harness-row">
        <div>
          <div class="item-title">검토 루프</div>
          <div class="item-meta">${escapeHtml(loops.review?.latestReviewerSummary || '최근 reviewer summary가 없습니다.')}</div>
        </div>
        <div class="harness-row-meta"><span class="mini-badge ${getStatusClass(loops.review?.latestReviewerStatus || 'pending')}">${escapeHtml(getDisplayLabel(loops.review?.latestReviewerStatus || 'pending'))}</span></div>
      </div>
      <div class="harness-row">
        <div>
          <div class="item-title">유지보수 루프</div>
          <div class="item-meta">최근 sweep ${escapeHtml(formatDate(loops.maintenance?.latestRunAt))} · 다음 due ${escapeHtml(formatDate(loops.maintenance?.nextDueAt))}</div>
        </div>
        <div class="harness-row-meta"><span class="mini-badge ${getStatusClass((loops.maintenance?.requiredCount || 0) > 0 ? 'failed' : 'completed')}">${escapeHtml((loops.maintenance?.requiredCount || 0) > 0 ? '점검 필요' : '안정')}</span></div>
      </div>
      <div class="harness-row">
        <div>
          <div class="item-title">품질 게이트</div>
          <div class="item-meta">blocked ${escapeHtml(String(loops.quality?.blockedCount || 0))}건 · 상태 ${escapeHtml(getDisplayLabel(loops.quality?.status || 'none'))}</div>
        </div>
        <div class="harness-row-meta"><span class="item-meta">${escapeHtml(formatDate(loops.provider?.latestSuccessAt || loops.provider?.latestFailureAt))}</span></div>
      </div>
    </div>
    ${
      recommendations.length > 1
        ? `<div class="harness-subsection">
            <p class="summary-label">추가 권장 항목</p>
            <div class="harness-list">
              ${recommendations
                .slice(1, 4)
                .map(
                  (item) => `
                    <div class="harness-row">
                      <div class="item-meta">${escapeHtml(item.title)}</div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>`
        : ''
    }
    <div class="harness-subsection">
      <p class="summary-label">이번에 적용한 하네스 원칙</p>
      <div class="harness-list">
        ${(harnessSummary.adoptedPatterns || [])
          .map(
            (pattern) => `
              <div class="harness-row">
                <div>
                  <div class="item-title">${escapeHtml(pattern.label)}</div>
                  <div class="item-meta">${escapeHtml(pattern.detail)}</div>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
  wireDocumentRowActions();
  wireMemoryRowActions();
}

function renderReleaseStatus() {
  if (!elements.releaseStatus) {
    return;
  }

  if (!state.releaseStatus) {
    elements.releaseStatus.innerHTML = emptyStateCard({
      action: 'refresh-release-status',
      actionLabel: '마감 상태 불러오기',
      icon: 'V1',
      message: 'execution v1 검증 요약, evidence, closeout checklist를 같은 화면에서 확인할 수 있습니다.',
      title: 'v1 마감 상태가 아직 로드되지 않았습니다',
    });
    wireQuickActions(elements.releaseStatus);
    return;
  }

  const release = state.releaseStatus;
  const summary = release.summary || {};
  const closeout = release.closeout || {};
  const evidence = release.evidence || {};
  const values = release.values || {};
  const checklist = release.checklist || [];
  const gaps = release.gaps || [];
  const liveValidation = release.liveValidation || [];
  const providerReadiness = release.providerReadiness || [];
  const releaseActionHistory = release.releaseActionHistory || [];
  const recommendedActions = release.recommendedActions || [];
  const refreshPlan = release.refreshPlan || null;
  const liveRefreshPreflight = state.releaseLiveRefreshPreflight || null;
  const releaseRefreshPreflight = state.releaseRefreshPreflight || null;
  const releaseSnapshotPreflight = state.releaseSnapshotPreflight || null;
  const staleReasons = release.staleReasons || [];
  const localArtifactNotes = release.localArtifactNotes || [];
  const liveConfirmProvider = String(state.releaseLiveConfirmProvider || '').trim();
  const focusedProvider = String(state.releaseFocusedProvider || '').trim();
  const focusedHistoryId = String(state.releaseFocusedHistoryId || '').trim();
  const expandedHistoryId = String(state.releaseExpandedHistoryId || '').trim();
  const historyFilterOutcome = String(state.releaseHistoryFilterOutcome || '').trim();
  const historyFilterScope = String(state.releaseHistoryFilterScope || '').trim();
  const historyFilterProvider = String(state.releaseHistoryFilterProvider || '').trim();
  const regenerationConfirmArmed = Boolean(state.releaseRegenerationConfirmArmed);
  const snapshotConfirmArmed = Boolean(state.releaseSnapshotConfirmArmed);
  const snapshot = release.snapshot || null;
  const snapshotEligibility = release.snapshotEligibility || { allowed: false, reason: 'snapshot 상태를 확인할 수 없습니다.' };
  const baseline = release.baseline || null;
  const docStatuses = release.docStatuses || [];
  const artifactStateLabel =
    release.artifactState === 'local-current'
      ? '로컬 갱신됨'
      : release.stale
        ? '갱신 필요'
        : '최신';
  const baselineStateLabel = baseline?.ready
    ? 'verified snapshot ready'
    : snapshot
      ? 'snapshot archived'
      : 'snapshot 없음';
  const filteredReleaseActionHistory = releaseActionHistory.filter((item) => {
    const itemOutcome = String(item?.outcome || '').trim().toLowerCase();
    const itemScope = String(item?.scope || '').trim();
    const itemProvider = String(item?.provider || '').trim();
    if (historyFilterOutcome === 'attention' && !isReleaseAttentionOutcome(itemOutcome)) {
      return false;
    }
    if (historyFilterScope && itemScope !== historyFilterScope) {
      return false;
    }
    if (historyFilterProvider && itemProvider !== historyFilterProvider) {
      return false;
    }
    return true;
  });
  const orderedReleaseActionHistory = focusedHistoryId
    ? [
        ...filteredReleaseActionHistory.filter((item) => String(item?.id || '').trim() === focusedHistoryId),
        ...filteredReleaseActionHistory.filter((item) => String(item?.id || '').trim() !== focusedHistoryId),
      ]
    : filteredReleaseActionHistory;
  const releaseHeadline = summary.ready
    ? (release.artifactState === 'local-current'
      ? 'execution v1 closeout ready (local evidence)'
      : 'execution v1 closeout ready')
    : baseline?.ready && release.stale
      ? 'execution v1 baseline ready · current surface refresh needed'
      : baseline?.ready
        ? 'execution v1 baseline ready'
        : release.stale
          ? 'execution v1 evidence 갱신 필요'
          : 'execution v1 closeout 미완료';
  const releaseCopy = summary.ready
    ? (release.artifactState === 'local-current'
      ? '현재 HEAD 기준 evidence/closeout가 로컬에서 갱신되었습니다. 커밋되지 않았지만 근거 문서는 최신입니다.'
      : 'deterministic 검증과 closeout checklist가 모두 닫혔습니다.')
    : baseline?.ready && release.stale
      ? '마지막 verified snapshot 기준 필수 closeout은 이미 닫혔습니다. 현재 화면의 evidence/closeout는 최신 HEAD와 어긋나 있어 current surface만 다시 생성하면 됩니다.'
      : baseline?.ready
        ? 'verified snapshot 기준 release baseline은 준비되어 있습니다. current surface evidence를 다시 만들면 현재 HEAD 기준 closeout 상태도 맞출 수 있습니다.'
        : release.stale
          ? '현재 HEAD와 evidence/closeout 문서 상태가 어긋나 있습니다. rerun 또는 refresh로 근거 문서를 다시 맞춰야 합니다.'
          : '남은 gap과 환경 block을 먼저 정리해야 closeout을 닫을 수 있습니다.';

  elements.releaseStatus.innerHTML = `
    <div class="release-status-shell">
      <section class="release-summary-grid">
        <div class="summary-chip">
          <span>deterministic smoke</span>
          <strong>${escapeHtml(`${summary.deterministicPassed || 0}/${summary.deterministicTotal || 0} passed`)}</strong>
        </div>
        <div class="summary-chip">
          <span>열린 체크리스트</span>
          <strong>${escapeHtml(String(summary.checklistOpen || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>필수 gap</span>
          <strong>${escapeHtml(String(summary.blockedItems || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>verified baseline</span>
          <strong>${escapeHtml(baselineStateLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>optional provider gap</span>
          <strong>${escapeHtml(String(summary.optionalBlockedItems || 0))}건</strong>
        </div>
        <div class="summary-chip">
          <span>evidence 상태</span>
          <strong>${escapeHtml(artifactStateLabel)}</strong>
        </div>
        <div class="summary-chip">
          <span>최종 갱신</span>
          <strong>${escapeHtml(formatDate(release.updatedAt))}</strong>
        </div>
      </section>

      <section class="release-callout">
        <div>
          <p class="section-kicker">릴리스 상태</p>
          <h4>${escapeHtml(releaseHeadline)}</h4>
          <p>${escapeHtml(releaseCopy)}</p>
          ${release.stale
            ? `
                <div class="release-stale-note">
                  ${staleReasons
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${!release.stale && localArtifactNotes.length
            ? `
                <div class="release-stale-note">
                  ${localArtifactNotes
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${baseline?.ready
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">verified snapshot 기준 필수 closeout ${escapeHtml(String(baseline.checklistOpen || 0))}건 · 필수 gap ${escapeHtml(String(baseline.blockedItems || 0))}건입니다.</div>
                  <div class="release-stale-line">snapshot commit ${escapeHtml(baseline.commit || '-')} · archived ${escapeHtml(formatDate(baseline.archivedAt || baseline.generatedAt || ''))}</div>
                </div>
              `
            : ''}
          ${refreshPlan
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(refreshPlan.summary || 'current surface regeneration preview를 확인할 수 없습니다.')}</div>
                  ${(refreshPlan.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${regenerationConfirmArmed
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(releaseRefreshPreflight?.summary || '재생성 확인이 활성화되었습니다. 이 작업은 current surface evidence와 closeout를 다시 쓰고, deterministic verification을 다시 실행합니다.')}</div>
                  <div class="release-stale-line">실행하려면 아래의 재생성 확인을 누르고, 취소하려면 현재 재생성 취소를 선택하세요.</div>
                  ${(releaseRefreshPreflight?.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
          ${snapshotConfirmArmed
            ? `
                <div class="release-stale-note">
                  <div class="release-stale-line">${escapeHtml(releaseSnapshotPreflight?.summary || 'release snapshot 고정 확인이 활성화되었습니다.')}</div>
                  <div class="release-stale-line">실행하려면 아래의 snapshot 고정 확인을 누르고, 취소하려면 현재 snapshot 고정 취소를 선택하세요.</div>
                  ${(releaseSnapshotPreflight?.notes || [])
                    .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                    .join('')}
                </div>
              `
            : ''}
        </div>
        <div class="action-row">
          <button class="primary-button" type="button" data-ui-action="refresh-release-status">상태 다시 읽기</button>
          <button class="${regenerationConfirmArmed ? 'primary-button' : 'ghost-button'}" type="button" data-ui-action="regenerate-release-surface">${regenerationConfirmArmed ? '재생성 확인' : 'current surface 재생성'}</button>
          ${regenerationConfirmArmed
            ? '<button class="ghost-button" type="button" data-ui-action="cancel-regenerate-release-surface">현재 재생성 취소</button>'
            : ''}
          <button class="${snapshotConfirmArmed ? 'primary-button' : 'ghost-button'}" type="button" data-ui-action="archive-release-snapshot" ${!snapshotConfirmArmed && !snapshotEligibility.allowed ? 'disabled' : ''}>${snapshotConfirmArmed ? 'snapshot 고정 확인' : 'release snapshot 고정'}</button>
          ${snapshotConfirmArmed
            ? '<button class="ghost-button" type="button" data-ui-action="cancel-archive-release-snapshot">현재 snapshot 고정 취소</button>'
            : ''}
          <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="runs">실행 기록 보기</button>
          <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="harness">하네스 보기</button>
        </div>
      </section>

      <div class="detail-grid detail-grid-two release-detail-grid">
        <section class="surface">
          <div class="mini-head">
            <div>
              <p class="section-kicker">Closeout Checklist</p>
              <h4>마감 체크리스트와 현재 상태</h4>
            </div>
          </div>
          <div class="release-meta">
            <span class="item-meta">branch ${escapeHtml(release.branch || '-')}</span>
            <span class="item-meta mono">${escapeHtml(release.commit || '-')}</span>
          </div>
          ${(release.currentCommit || release.currentBranch)
            ? `
                <div class="release-meta release-meta-secondary">
                  <span class="item-meta">current ${escapeHtml(release.currentBranch || '-')}</span>
                  <span class="item-meta mono">${escapeHtml(release.currentCommit || '-')}</span>
                </div>
              `
            : ''}
          <div class="release-checklist">
            ${checklist
              .map(
                (item) => `
                  <div class="release-checklist-item ${item.done ? 'is-ready' : 'is-blocked'}">
                    <span class="status-badge ${item.done ? 'status-completed' : 'status-failed'}">${escapeHtml(item.done ? '완료' : '남음')}</span>
                    <div>
                      <strong>${escapeHtml(item.label)}</strong>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="release-current-status">
            ${Object.entries(values)
              .map(
                ([label, value]) => `
                  <div class="harness-row">
                    <div>
                      <div class="item-title">${escapeHtml(label)}</div>
                    </div>
                    <div class="harness-row-meta">
                      <span class="mini-badge ${getReleaseStatusBadge(value)}">${escapeHtml(value)}</span>
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
          ${docStatuses.length
            ? `
                <div class="release-doc-status-list">
                  ${docStatuses
                    .map(
                      (item) => `
                        <div class="harness-row">
                          <div>
                            <div class="item-title">${escapeHtml(item.path)}</div>
                          </div>
                          <div class="harness-row-meta">
                            <span class="mini-badge status-failed">${escapeHtml(item.status)}</span>
                          </div>
                        </div>
                      `,
                    )
                    .join('')}
                </div>
              `
            : ''}
        </section>

        <section class="surface">
          <div class="mini-head">
            <div>
              <p class="section-kicker">Release Evidence</p>
              <h4>남은 gap, provider readiness, 증거 문서</h4>
            </div>
          </div>
          <div class="release-list">
            <div class="release-recommendation-list">
              ${(recommendedActions.length
                ? recommendedActions
                  .map(
                    (item) => {
                      const historyContext = getRecommendationHistoryContext(item, releaseActionHistory, providerReadiness);
                      const recommendationCommand = getRecommendationCommandContext(item, providerReadiness);
                      const recommendationProvider = getRecommendationProviderEntry(item, providerReadiness);
                      const latestAction = historyContext.latestAction;
                      const latestAttentionAction = historyContext.latestAttentionAction;
                      const recommendationProviderId = String(recommendationProvider?.provider || '').trim();
                      const sameProviderFocused = Boolean(recommendationProviderId && recommendationProviderId === focusedProvider);
                      const { sameFlowActive, attentionFlowActive } = latestAction
                        ? isRecommendationFlowActive({
                          attentionAction: latestAttentionAction,
                          latestAction,
                        }, {
                          focusedHistoryId,
                          historyFilterOutcome,
                          historyFilterProvider,
                          historyFilterScope,
                        })
                        : { attentionFlowActive: false, sameFlowActive: false };
                      return `
                      <article class="release-recommendation-card release-recommendation-${escapeHtml(item.category || 'info')} ${sameFlowActive || attentionFlowActive ? 'is-active-flow' : ''} ${historyContext.attentionCount ? 'has-attention-flow' : ''}">
                        <div>
                          <div class="item-title">${escapeHtml(item.label || '권장 액션')}</div>
                          <div class="item-meta">${escapeHtml(item.description || '')}</div>
                          ${latestAction
                            ? `
                                <div class="item-meta">
                                  최근 시도 · ${escapeHtml(getReleaseActionLabel(latestAction.action))} · ${escapeHtml(latestAction.outcome || 'unknown')} · ${escapeHtml(formatDate(latestAction.createdAt))}
                                </div>
                                <div class="item-meta">${escapeHtml(latestAction.summary || '최근 action summary가 없습니다.')}</div>
                                <div class="release-history-filter-chips">
                                  <span class="mini-badge status-running">같은 flow ${escapeHtml(String(historyContext.matchCount || 0))}건</span>
                                  ${historyContext.attentionCount
                                    ? `<span class="mini-badge status-failed">문제 흐름 ${escapeHtml(String(historyContext.attentionCount))}건</span>`
                                    : ''}
                                </div>
                                ${latestAttentionAction
                                  ? `
                                      <div class="item-meta">
                                        최근 문제 · ${escapeHtml(getReleaseActionLabel(latestAttentionAction.action))} · ${escapeHtml(formatDate(latestAttentionAction.createdAt))}
                                      </div>
                                      <div class="item-meta">${escapeHtml(latestAttentionAction.summary || '최근 문제 summary가 없습니다.')}</div>
                                    `
                                  : ''}
                                ${(sameFlowActive || attentionFlowActive)
                                  ? `
                                      <div class="release-history-filter-chips">
                                        ${sameFlowActive ? '<span class="mini-badge status-running">현재 flow 적용 중</span>' : ''}
                                        ${attentionFlowActive ? '<span class="mini-badge status-failed">현재 문제 흐름 적용 중</span>' : ''}
                                      </div>
                                    `
                                  : ''}
                              `
                            : ''}
                        </div>
                        <div class="release-provider-meta">
                          <span class="mini-badge ${getReleaseStatusBadge(item.category === 'required' ? 'blocked' : item.category === 'release' ? 'ready' : 'not-run')}">${escapeHtml(item.category || 'info')}</span>
                          ${latestAction
                            ? `
                                <div class="release-recommendation-actions">
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="focus-release-history"
                                    data-ui-value="${escapeHtml(latestAction.id || '')}"
                                  >최근 기록 보기</button>
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="copy-release-history-link"
                                    data-ui-value="${escapeHtml(latestAction.id || '')}"
                                  >기록 링크 복사</button>
                                  ${latestAttentionAction && latestAttentionAction.id !== latestAction.id
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="focus-release-history"
                                          data-ui-value="${escapeHtml(latestAttentionAction.id || '')}"
                                        >최근 문제 보기</button>
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="copy-release-history-link"
                                          data-ui-value="${escapeHtml(latestAttentionAction.id || '')}"
                                        >문제 기록 링크 복사</button>
                                      `
                                    : ''}
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="focus-release-flow"
                                    data-ui-value="${escapeHtml(latestAction.id || '')}"
                                    data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(latestAction.outcome) ? 'attention' : '')}"
                                    data-ui-scope="${escapeHtml(String(latestAction.scope || '').trim())}"
                                    data-ui-provider="${escapeHtml(String(latestAction.provider || '').trim())}"
                                    ${sameFlowActive ? 'disabled' : ''}
                                  >${sameFlowActive ? '현재 flow' : '같은 flow 보기'}</button>
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="copy-release-flow-link"
                                    data-ui-value="${escapeHtml(latestAction.id || '')}"
                                    data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(latestAction.outcome) ? 'attention' : '')}"
                                    data-ui-scope="${escapeHtml(String(latestAction.scope || '').trim())}"
                                    data-ui-provider="${escapeHtml(String(latestAction.provider || '').trim())}"
                                  >flow 링크 복사</button>
                                  ${latestAttentionAction
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="focus-release-flow"
                                          data-ui-value="${escapeHtml(latestAttentionAction.id || '')}"
                                          data-ui-outcome="attention"
                                          data-ui-scope="${escapeHtml(String(latestAttentionAction.scope || latestAction.scope || '').trim())}"
                                          data-ui-provider="${escapeHtml(String(latestAttentionAction.provider || latestAction.provider || '').trim())}"
                                          ${attentionFlowActive ? 'disabled' : ''}
                                        >${attentionFlowActive ? '현재 문제 흐름' : '같은 문제 흐름 보기'}</button>
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="copy-release-flow-link"
                                          data-ui-value="${escapeHtml(latestAttentionAction.id || '')}"
                                          data-ui-outcome="attention"
                                          data-ui-scope="${escapeHtml(String(latestAttentionAction.scope || latestAction.scope || '').trim())}"
                                          data-ui-provider="${escapeHtml(String(latestAttentionAction.provider || latestAction.provider || '').trim())}"
                                        >문제 흐름 링크 복사</button>
                                      `
                                    : ''}
                                  ${recommendationCommand
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="copy-release-command"
                                          data-ui-label="${escapeHtml(recommendationCommand.label)}"
                                          data-ui-value="${escapeHtml(recommendationCommand.command)}"
                                        >${escapeHtml(recommendationCommand.buttonLabel)}</button>
                                      `
                                    : ''}
                                  ${recommendationProviderId
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="focus-release-provider"
                                          data-ui-provider="${escapeHtml(recommendationProviderId)}"
                                          ${sameProviderFocused ? 'disabled' : ''}
                                        >${sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기'}</button>
                                      `
                                    : ''}
                                </div>
                              `
                            : item.action
                              ? `
                                <div class="release-recommendation-actions">
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="${escapeHtml(item.action)}"
                                    ${item.actionProvider ? `data-ui-provider="${escapeHtml(item.actionProvider)}"` : ''}
                                  >실행</button>
                                  ${recommendationCommand
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="copy-release-command"
                                          data-ui-label="${escapeHtml(recommendationCommand.label)}"
                                          data-ui-value="${escapeHtml(recommendationCommand.command)}"
                                        >${escapeHtml(recommendationCommand.buttonLabel)}</button>
                                      `
                                    : ''}
                                  ${recommendationProviderId
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="focus-release-provider"
                                          data-ui-provider="${escapeHtml(recommendationProviderId)}"
                                          ${sameProviderFocused ? 'disabled' : ''}
                                        >${sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기'}</button>
                                      `
                                    : ''}
                                </div>
                              `
                              : item.envKey
                                ? `
                                    <div class="release-recommendation-actions">
                                      <span class="item-meta mono">${escapeHtml(item.envKey)}</span>
                                      ${recommendationCommand
                                        ? `
                                            <button
                                              class="ghost-button"
                                              type="button"
                                              data-ui-action="copy-release-command"
                                              data-ui-label="${escapeHtml(recommendationCommand.label)}"
                                              data-ui-value="${escapeHtml(recommendationCommand.command)}"
                                            >${escapeHtml(recommendationCommand.buttonLabel)}</button>
                                      `
                                        : ''}
                                      ${recommendationProviderId
                                        ? `
                                            <button
                                              class="ghost-button"
                                              type="button"
                                              data-ui-action="focus-release-provider"
                                              data-ui-provider="${escapeHtml(recommendationProviderId)}"
                                              ${sameProviderFocused ? 'disabled' : ''}
                                            >${sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기'}</button>
                                          `
                                        : ''}
                                    </div>
                                  `
                                : ''}
                        </div>
                      </article>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-recommendation-card release-recommendation-release">
                      <div>
                        <div class="item-title">필수 다음 액션 없음</div>
                        <div class="item-meta">verified baseline 기준 필수 closeout은 닫혀 있고, 남은 것은 optional provider expansion 또는 mutable current surface 운영뿐입니다.</div>
                      </div>
                    </article>
                  `)}
            </div>
            <div class="harness-callout">
              <strong>남은 gap ${escapeHtml(String(gaps.length))}건</strong>
              <p>${escapeHtml(gaps[0] || '남은 gap이 없습니다.')}</p>
            </div>
            <div class="mini-head">
              <div>
                <p class="section-kicker">Release Action History</p>
                <h4>최근 preflight, refresh, snapshot, live action</h4>
              </div>
            </div>
            ${focusedHistoryId
              ? `
                  <div class="harness-callout release-history-focus-callout">
                    <strong>현재 포커스된 release action</strong>
                    <p>선택한 기록을 리스트 상단에 유지하고 있습니다. 상세를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
                    <div class="release-history-focus-actions">
                      <button class="ghost-button" type="button" data-ui-action="clear-release-history-focus">포커스 해제</button>
                      <button class="ghost-button" type="button" data-ui-action="copy-release-triage-link">현재 triage 링크 복사</button>
                      ${historyFilterOutcome || historyFilterScope || historyFilterProvider
                        ? '<button class="ghost-button" type="button" data-ui-action="clear-release-history-filter">필터 해제</button>'
                        : ''}
                    </div>
                    ${(historyFilterOutcome || historyFilterScope || historyFilterProvider)
                      ? `
                          <div class="release-history-filter-chips">
                            ${historyFilterOutcome === 'attention' ? '<span class="mini-badge status-failed">outcome · 주의 상태만</span>' : ''}
                            ${historyFilterScope ? `<span class="mini-badge status-running">scope · ${escapeHtml(getReleaseActionScopeLabel(historyFilterScope))}</span>` : ''}
                            ${historyFilterProvider ? `<span class="mini-badge status-running">provider · ${escapeHtml(historyFilterProvider)}</span>` : ''}
                          </div>
                        `
                      : ''}
                  </div>
                `
              : ''}
            <div class="release-history-list">
              ${orderedReleaseActionHistory.length
                ? orderedReleaseActionHistory
                  .map(
                    (item) => {
                      const itemId = String(item.id || '').trim();
                      const isFocused = Boolean(focusedHistoryId && itemId === focusedHistoryId);
                      const isExpanded = Boolean(expandedHistoryId && itemId === expandedHistoryId);
                      return `
                      <article class="release-snapshot-card ${isFocused ? 'is-highlighted' : ''} ${isExpanded ? 'is-expanded' : ''}" data-release-history-id="${escapeHtml(itemId)}">
                        <div class="release-provider-meta">
                          <div>
                            <div class="item-title">${escapeHtml(getReleaseActionLabel(item.action))}</div>
                            <div class="item-meta">${escapeHtml(getReleaseActionScopeLabel(item.scope))}${item.provider ? ` · ${escapeHtml(item.provider)}` : ''}</div>
                          </div>
                          <div class="release-history-actions">
                            <span class="mini-badge ${getReleaseStatusBadge(item.outcome)}">${escapeHtml(item.outcome || 'unknown')}</span>
                            ${isFocused
                              ? `
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="clear-release-history-focus"
                                  >포커스 해제</button>
                                `
                              : `
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="focus-release-history"
                                    data-ui-value="${escapeHtml(itemId)}"
                                  >이 기록 고정</button>
                                `}
                            <button
                              class="ghost-button"
                              type="button"
                              data-ui-action="toggle-release-history"
                              data-ui-value="${escapeHtml(itemId)}"
                            >${isExpanded ? '상세 닫기' : '상세 보기'}</button>
                          </div>
                        </div>
                        <div class="item-meta">${escapeHtml(item.summary || 'release action summary가 없습니다.')}</div>
                        <div class="release-meta release-meta-secondary">
                          <span class="item-meta">${escapeHtml(formatDate(item.createdAt))}</span>
                          ${item.branch ? `<span class="item-meta">${escapeHtml(item.branch)}</span>` : ''}
                          ${item.commit ? `<span class="item-meta mono">${escapeHtml(String(item.commit).slice(0, 12))}</span>` : ''}
                        </div>
                        ${isExpanded
                          ? `
                              <div class="release-history-detail">
                                <div class="release-history-filter-actions">
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="copy-release-history-link"
                                    data-ui-value="${escapeHtml(itemId)}"
                                  >이 기록 링크 복사</button>
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="copy-release-flow-link"
                                    data-ui-value="${escapeHtml(itemId)}"
                                    data-ui-outcome="${escapeHtml(isReleaseAttentionOutcome(item.outcome) ? 'attention' : '')}"
                                    data-ui-scope="${escapeHtml(String(item.scope || '').trim())}"
                                    data-ui-provider="${escapeHtml(String(item.provider || '').trim())}"
                                  >이 flow 링크 복사</button>
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="filter-release-history-attention"
                                    data-ui-outcome="attention"
                                  >주의 상태만</button>
                                  <button
                                    class="ghost-button"
                                    type="button"
                                    data-ui-action="filter-release-history-scope"
                                    data-ui-scope="${escapeHtml(String(item.scope || '').trim())}"
                                  >같은 scope 보기</button>
                                  ${item.provider
                                    ? `
                                        <button
                                          class="ghost-button"
                                          type="button"
                                          data-ui-action="filter-release-history-provider"
                                          data-ui-provider="${escapeHtml(String(item.provider || '').trim())}"
                                        >같은 provider 보기</button>
                                      `
                                    : ''}
                                  ${(historyFilterOutcome || historyFilterScope || historyFilterProvider)
                                    ? '<button class="ghost-button" type="button" data-ui-action="clear-release-history-filter">필터 해제</button>'
                                    : ''}
                                </div>
                                <div class="release-history-detail-grid">
                                  <div>
                                    <span class="section-kicker">Action Id</span>
                                    <div class="item-meta mono">${escapeHtml(itemId || 'id 없음')}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Outcome</span>
                                    <div class="item-meta">${escapeHtml(item.outcome || 'unknown')}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Scope</span>
                                    <div class="item-meta">${escapeHtml(getReleaseActionScopeLabel(item.scope))}</div>
                                  </div>
                                  <div>
                                    <span class="section-kicker">Provider</span>
                                    <div class="item-meta">${escapeHtml(item.provider || '없음')}</div>
                                  </div>
                                </div>
                              </div>
                            `
                          : ''}
                      </article>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-snapshot-card is-empty">
                      <div class="item-title">${historyFilterOutcome || historyFilterScope || historyFilterProvider ? '현재 필터와 맞는 release action 기록이 없습니다.' : '최근 release action 기록이 없습니다.'}</div>
                      <p class="item-meta">${historyFilterOutcome || historyFilterScope || historyFilterProvider ? '필터를 해제하면 전체 history를 다시 볼 수 있습니다.' : 'preflight, current surface 재생성, snapshot 고정, provider live validation을 실행하면 이 영역에 최근 action history가 쌓입니다.'}</p>
                    </article>
                  `}
            </div>
            ${focusedProvider
              ? `
                  <div class="harness-callout release-provider-focus-callout">
                    <strong>현재 포커스된 provider readiness 카드</strong>
                    <p>${escapeHtml(focusedProvider)} provider card를 강조하고 있습니다. preflight/live action이나 command handoff를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
                    <div class="release-history-focus-actions">
                      <button class="ghost-button" type="button" data-ui-action="clear-release-provider-focus">provider 포커스 해제</button>
                      <button class="ghost-button" type="button" data-ui-action="copy-release-triage-link">현재 triage 링크 복사</button>
                    </div>
                  </div>
                `
              : ''}
            <div class="release-provider-grid">
              ${providerReadiness
                .map(
                  (item) => `
                    ${(() => {
                      const preflight = state.releasePreflightResults?.[item.provider] || null;
                      const liveConfirmArmed = liveConfirmProvider === item.provider;
                      const isFocusedProvider = focusedProvider === item.provider;
                      const preflightStatus = preflight?.status || 'not-run';
                      const preflightSummary = preflight
                        ? preflight.status === 'ready-for-live-validation'
                          ? `preflight 통과 · ${preflight.checks?.length || 0}개 smoke passed`
                          : preflight.status === 'ready-but-missing-env'
                            ? `preflight 통과 · ${preflight.envKey} 필요`
                            : preflight.status === 'blocked'
                              ? `preflight blocked · ${(preflight.checks || []).filter((check) => check.status !== 'passed').length}개 실패`
                              : `preflight ${preflight.status}`
                        : 'preflight를 아직 실행하지 않았습니다.';
                      return `
                    <article class="release-provider-card ${item.ready ? 'is-ready' : 'is-blocked'} ${isFocusedProvider ? 'is-highlighted' : ''}" data-release-provider="${escapeHtml(item.provider)}">
                      <div>
                        <div class="item-title">${escapeHtml(item.label)}</div>
                        <div class="item-meta mono">${escapeHtml(item.envKey)}</div>
                      </div>
                      <div class="release-provider-meta">
                        <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
                        <span class="mini-badge ${getReleaseStatusBadge(preflightStatus)}">${escapeHtml(preflightStatus)}</span>
                      </div>
                      <div class="release-provider-meta">
                        <button
                          class="ghost-button"
                          type="button"
                          data-ui-action="run-release-preflight"
                          data-ui-provider="${escapeHtml(item.provider)}"
                        >preflight 실행</button>
                        <button
                          class="ghost-button"
                          type="button"
                          data-ui-action="copy-release-command"
                          data-ui-label="${escapeHtml(`${item.label} preflight 명령`)}"
                          data-ui-value="${escapeHtml(item.preflightCommand || `npm run preflight:execution-v1:${item.provider}`)}"
                        >preflight 명령 복사</button>
                        <button
                          class="${liveConfirmArmed ? 'primary-button' : 'ghost-button'}"
                          type="button"
                          data-ui-action="refresh-release-status-live"
                          data-ui-provider="${escapeHtml(item.provider)}"
                          ${item.ready ? '' : 'disabled'}
                        >${escapeHtml(item.ready ? (liveConfirmArmed ? 'live 검증 확인' : 'live 검증 실행') : 'env 필요')}</button>
                        <button
                          class="ghost-button"
                          type="button"
                          data-ui-action="copy-release-command"
                          data-ui-label="${escapeHtml(`${item.label} live 명령`)}"
                          data-ui-value="${escapeHtml(item.ready ? item.command : `export ${item.envKey}=\"...\" && ${item.command}`)}"
                        >live 명령 복사</button>
                        <button
                          class="ghost-button"
                          type="button"
                          data-ui-action="${escapeHtml(isFocusedProvider ? 'clear-release-provider-focus' : 'focus-release-provider')}"
                          data-ui-provider="${escapeHtml(item.provider)}"
                        >${escapeHtml(isFocusedProvider ? 'provider 포커스 해제' : '이 provider 카드 보기')}</button>
                        ${liveConfirmArmed
                          ? `
                              <button
                                class="ghost-button"
                                type="button"
                                data-ui-action="cancel-refresh-release-status-live"
                              >현재 live 검증 취소</button>
                            `
                          : ''}
                      </div>
                      <p class="item-meta">${escapeHtml(item.ready ? `준비됨 · ${item.command}` : `실행 전 ${item.envKey}가 필요합니다.`)}</p>
                      <p class="item-meta">${escapeHtml(preflightSummary)}</p>
                      ${liveConfirmArmed && liveRefreshPreflight
                        ? `
                            <div class="release-stale-note">
                              <div class="release-stale-line">${escapeHtml(liveRefreshPreflight.summary || 'live validation 확인이 준비되었습니다.')}</div>
                              ${(liveRefreshPreflight.notes || [])
                                .map((note) => `<div class="release-stale-line">${escapeHtml(note)}</div>`)
                                .join('')}
                            </div>
                          `
                        : ''}
                    </article>
                  `;
                    })()}
                  `,
                )
                .join('')}
            </div>
            ${refreshPlan
              ? `
                  <article class="release-snapshot-card">
                    <div class="item-title">Current Surface 재생성 영향</div>
                    <div class="release-doc-status-list">
                      ${(refreshPlan.affectsPaths || [])
                        .map(
                          (item) => `
                            <div class="harness-row">
                              <div>
                                <div class="item-title">rewrite target</div>
                                <div class="item-meta mono">${escapeHtml(item)}</div>
                              </div>
                            </div>
                          `,
                        )
                        .join('')}
                      <div class="harness-row">
                        <div>
                          <div class="item-title">deterministic verification</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.rerunsDeterministicVerification ? '다시 실행됨' : '다시 실행되지 않음')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">provider live validation</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.rerunsLiveValidation ? '재실행됨' : '기본 regenerate에서는 재실행되지 않음')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">release snapshot</div>
                          <div class="item-meta">${escapeHtml(refreshPlan.snapshotChanges ? '같이 갱신됨' : '자동으로 변경되지 않음')}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                `
              : ''}
            <div class="release-stale-note">
              <div class="release-stale-line">${escapeHtml(snapshotEligibility.allowed ? 'current HEAD 기준 evidence/closeout가 fresh해서 snapshot을 바로 고정할 수 있습니다.' : snapshotEligibility.reason || '현재 상태에서는 snapshot을 고정할 수 없습니다.')}</div>
            </div>
            ${snapshot
              ? `
                  <article class="release-snapshot-card">
                    <div class="mini-head">
                      <div>
                        <p class="section-kicker">Release Snapshot</p>
                        <h4>마지막으로 고정한 verified artifact</h4>
                      </div>
                    </div>
                    <div class="release-meta">
                      <span class="item-meta">verified ${escapeHtml(snapshot.verifiedCommit || '-')}</span>
                      <span class="item-meta">${escapeHtml(formatDate(snapshot.archivedAt))}</span>
                    </div>
                    <div class="release-meta release-meta-secondary">
                      <span class="mini-badge ${baseline?.ready ? 'status-completed' : 'status-pending'}">${escapeHtml(
                        baseline?.ready ? 'baseline ready' : 'baseline 검토 필요',
                      )}</span>
                      <span class="mini-badge ${snapshot.matchesCurrentHead ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesCurrentHead ? 'current head와 일치' : '이전 verified snapshot')}</span>
                      <span class="mini-badge ${snapshot.matchesGeneratedCommit ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesGeneratedCommit ? '현재 evidence와 연결됨' : '현재 evidence와 분리됨')}</span>
                    </div>
                    <div class="release-doc-status-list">
                      <div class="harness-row">
                        <div>
                          <div class="item-title">snapshot evidence</div>
                          <div class="item-meta mono">${escapeHtml(snapshot.evidencePath || '-')}</div>
                        </div>
                      </div>
                      <div class="harness-row">
                        <div>
                          <div class="item-title">snapshot closeout</div>
                          <div class="item-meta mono">${escapeHtml(snapshot.closeoutPath || '-')}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                `
              : `
                  <article class="release-snapshot-card is-empty">
                    <div class="item-title">Release snapshot이 아직 없습니다.</div>
                    <p class="item-meta">상태 다시 읽기는 read-only reload이고, current surface evidence를 다시 만들려면 위의 current surface 재생성 또는 provider별 live validation을 실행하면 됩니다.</p>
                  </article>
                `}
            <div class="release-live-list">
              ${(liveValidation.length ? liveValidation : [{ provider: 'live validation', status: 'not requested' }])
                .map(
                  (item) => `
                    <div class="harness-row">
                      <div>
                        <div class="item-title">${escapeHtml(item.provider)}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
            <div class="release-doc-grid">
              <article class="release-doc-surface markdown-surface">
                <div class="release-doc-head">
                  <strong>closeout</strong>
                  <span class="item-meta mono">${escapeHtml(closeout.path || '-')}</span>
                </div>
                ${markdownToHtml(closeout.markdown || '문서가 없습니다.')}
              </article>
              <article class="release-doc-surface markdown-surface">
                <div class="release-doc-head">
                  <strong>evidence</strong>
                  <span class="item-meta mono">${escapeHtml(evidence.path || '-')}</span>
                </div>
                ${markdownToHtml(evidence.markdown || '문서가 없습니다.')}
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
  wireQuickActions(elements.releaseStatus);
  elements.releaseStatus.querySelectorAll('[data-ui-action="run-release-preflight"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = String(button.dataset.uiProvider || '').trim();
      if (!provider) {
        return;
      }
      await runReleasePreflight(provider);
    });
  });
  elements.releaseStatus.querySelectorAll('[data-ui-action="refresh-release-status-live"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const provider = String(button.dataset.uiProvider || '').trim();
      if (!provider) {
        return;
      }
      if (state.releaseLiveConfirmProvider === provider) {
        await refreshReleaseStatusWithOptions(provider, { confirmLiveValidation: true });
        return;
      }
      await armReleaseLiveConfirm(provider);
    });
  });
}

function wireDocumentRowActions() {
  if (!elements.harnessSource) {
    return;
  }

  elements.harnessSource.querySelectorAll('[data-document-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = String(button.dataset.documentId || '').trim();
      const entry = getHarnessDocumentEntry(entryId);
      if (!entry) {
        window.alert('문서 기록을 다시 불러오지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }
      populateDocumentLogForm(entry);
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entryId = String(button.dataset.documentId || '').trim();
      try {
        await handleDocumentLogDelete(entryId);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="migrate-legacy"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await handleLegacyDocumentMigration();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelector('#document-log-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentSort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessDocumentOffset = 0;
      await loadHarnessDocuments();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessSource.querySelector('#document-log-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessDocumentOffset = 0;
      await loadHarnessDocuments();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessSource.querySelectorAll('[data-document-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetHarnessDocumentBrowseState();
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset = Math.max(
          Number(state.harnessDocumentOffset || 0) - Number(state.harnessDocumentVisibleCount || 12),
          0,
        );
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessSource.querySelectorAll('[data-document-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset += Number(state.harnessDocumentVisibleCount || 12);
        await loadHarnessDocuments();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function wireMemoryRowActions() {
  if (!elements.harnessMemory) {
    return;
  }

  elements.harnessMemory.querySelectorAll('[data-memory-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const scope = String(button.dataset.memoryScope || 'mission').trim();
      const memoryId = String(button.dataset.memoryId || '').trim();
      const entry = getHarnessMemoryEntry(scope, memoryId);
      if (!entry) {
        window.alert('메모 항목을 다시 불러오지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }
      populateMemoryForm(scope, entry);
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const scope = String(button.dataset.memoryScope || 'mission').trim();
      const memoryId = String(button.dataset.memoryId || '').trim();
      try {
        await handleMemoryDelete(scope, memoryId);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessMemory.querySelector('#harness-memory-search')?.addEventListener('input', async (event) => {
    try {
      state.harnessMemoryQuery = String(event.target.value || '');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-scope-filter')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemoryFilterScope = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-kind-filter')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemoryFilterKind = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemoryVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelector('#harness-memory-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemorySort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessMemoryOffset = 0;
      await loadHarnessMemory();
      renderHarnessPanel();
    } catch (error) {
      window.alert(error.message);
    }
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetHarnessMemoryBrowseState();
        await loadHarnessMemory();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset = Math.max(
          Number(state.harnessMemoryOffset || 0) - Number(state.harnessMemoryVisibleCount || 12),
          0,
        );
        await loadHarnessMemory();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  elements.harnessMemory.querySelectorAll('[data-memory-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset += Number(state.harnessMemoryVisibleCount || 12);
        await loadHarnessMemory();
        renderHarnessPanel();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function resetHarnessFilterState() {
  state.harnessDocumentFilter = 'all';
  state.harnessDocumentOffset = 0;
  state.harnessDocumentQuery = '';
  state.harnessDocumentSort = 'latest';
  state.harnessDocumentVisibleCount = 12;
  state.harnessMemoryFilterKind = 'all';
  state.harnessMemoryFilterScope = 'all';
  state.harnessMemoryOffset = 0;
  state.harnessMemoryQuery = '';
  state.harnessMemorySort = 'latest';
  state.harnessMemoryVisibleCount = 12;
}

function resetHarnessDocumentBrowseState() {
  state.harnessDocumentFilter = 'all';
  state.harnessDocumentOffset = 0;
  state.harnessDocumentQuery = '';
  state.harnessDocumentSort = 'latest';
  state.harnessDocumentVisibleCount = 12;
}

function resetHarnessMemoryBrowseState() {
  state.harnessMemoryFilterKind = 'all';
  state.harnessMemoryFilterScope = 'all';
  state.harnessMemoryOffset = 0;
  state.harnessMemoryQuery = '';
  state.harnessMemorySort = 'latest';
  state.harnessMemoryVisibleCount = 12;
}

function resetHarnessFilterInputs() {
  if (elements.documentLogSearch) {
    elements.documentLogSearch.value = '';
  }
  if (elements.documentLogFilter) {
    elements.documentLogFilter.value = 'all';
  }
}

function renderStageSummaries() {
  renderRunStageSummary();
  renderExecutionConsole();
  renderReviewStageSummary();
  renderOutputStageSummary();
  renderOutputCloseout();
}

function getPrimaryArtifact(artifacts = []) {
  return (
    artifacts
      .slice()
      .reverse()
      .find((artifact) => ['deliverable', 'execution-handoff', 'approval-resolution'].includes(artifact.kind)) ||
    artifacts[artifacts.length - 1] ||
    null
  );
}

function getArtifactLabel(artifact) {
  if (!artifact) {
    return '';
  }

  return artifact.title || artifact.fileName || getDisplayLabel(artifact.kind, artifact.kind);
}

function getReadinessItems() {
  if (!state.missionDetail) {
    return [];
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const hasArtifact =
    Boolean(state.selectedArtifactId) ||
    Boolean(latestSession?.latestArtifactFileName) ||
    Boolean(state.currentSessionPayload?.artifacts?.length);

  return [
    {
      detail: '미션 프레임과 목표가 정해져 있습니다.',
      label: '미션 선택 완료',
      state: state.selectedMissionId ? 'ready' : 'blocked',
    },
    {
      detail: latestSession ? `${latestSession.provider || '제공자 미정'} · ${latestSession.status || '-'}` : '아직 실행된 세션이 없습니다.',
      label: '최근 세션 존재',
      state: latestSession ? 'ready' : 'blocked',
    },
    {
      detail: latestSession?.reviewerSummary || '리뷰어 요약이 아직 없습니다.',
      label: '리뷰어 신호 확보',
      state: latestSession?.reviewerSummary ? 'ready' : 'blocked',
    },
    {
      detail: pendingApprovalCount > 0 ? `승인 ${pendingApprovalCount}건 대기` : '승인 대기 없음',
      label: '승인 대기 정리',
      state: pendingApprovalCount === 0 ? 'ready' : 'blocked',
    },
    {
      detail: pendingActionCount > 0 ? `후속 액션 ${pendingActionCount}건 열림` : '후속 액션 없음',
      label: '후속 작업 정리',
      state: pendingActionCount === 0 ? 'ready' : 'blocked',
    },
    {
      detail: hasArtifact ? '확인 가능한 산출물이 준비되었습니다.' : '아직 확인 가능한 산출물이 없습니다.',
      label: '산출물 확인 가능',
      state: hasArtifact ? 'ready' : 'blocked',
    },
  ];
}

function renderReviewReadiness() {
  if (!state.missionDetail) {
    const empty = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계로 이동',
      actionValue: 'step-setup',
      icon: 'RV',
      message: '미션을 고르면 승인, 후속 요청, 산출물 기준으로 준비 상태를 자동 계산합니다.',
      title: '리뷰 준비 상태를 계산할 미션이 없습니다',
    });
    elements.reviewReadiness.innerHTML = empty;
    if (elements.reviewReadinessDetail) {
      elements.reviewReadinessDetail.innerHTML = empty;
    }
    wireQuickActions(elements.reviewReadiness);
    if (elements.reviewReadinessDetail) {
      wireQuickActions(elements.reviewReadinessDetail);
    }
    return;
  }

  const readinessItems = getReadinessItems();
  const content = readinessItems
    .map(
      (item) => `
        <article class="readiness-item readiness-${escapeHtml(item.state)}">
          <div class="status-row">
            <span class="status-badge ${item.state === 'ready' ? 'status-completed' : 'status-failed'}">${escapeHtml(
              item.state === 'ready' ? '준비됨' : '막힘',
            )}</span>
          </div>
          <div class="item-title">${escapeHtml(item.label)}</div>
          <div class="item-meta">${escapeHtml(item.detail)}</div>
        </article>
      `,
    )
    .join('');
  elements.reviewReadiness.innerHTML = content;
  if (elements.reviewReadinessDetail) {
    elements.reviewReadinessDetail.innerHTML = content;
  }
}

function inferProviderFromCommand(command = '') {
  const match = String(command).match(/--provider\s+([a-z0-9-_]+)/i);
  return match ? match[1] : '';
}

function renderMissionActions() {
  if (!state.missionActions) {
    elements.actionSummary.innerHTML = emptyStateCard({
      icon: 'Q',
      message: '미션을 선택하면 열린 작업, 재실행 권장, 기한 초과 현황이 이곳에 표시됩니다.',
      title: '후속 작업 큐가 준비되지 않았습니다',
    });
    elements.actionList.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '개요 보기',
      actionValue: 'step-setup',
      icon: 'Q',
      message: '먼저 미션을 선택하면 현재 후속 작업과 권장 재실행 지점을 볼 수 있습니다.',
      title: '표시할 액션이 없습니다',
    });
    wireQuickActions(elements.actionList);
    return;
  }

  const summary = state.missionActions.summary || {};
  elements.actionSummary.innerHTML = `
    <div class="summary-chip"><span>열린 작업</span><strong>${escapeHtml(String(summary.pendingActionCount ?? 0))}</strong></div>
    <div class="summary-chip"><span>재실행 권장</span><strong>${escapeHtml(String(summary.actionClassCounts?.retryReady ?? 0))}</strong></div>
    <div class="summary-chip"><span>기한 초과</span><strong>${escapeHtml(String(summary.overdueCounts?.overdue ?? 0))}</strong></div>
  `;

  const items = state.missionActions.items || [];
  if (!items.length) {
    elements.actionList.innerHTML = emptyStateCard({
      icon: 'OK',
      message: '현재 이 미션에는 열린 후속 작업이 없습니다. 리뷰어 후속 요청과 승인 대기 항목이 모두 정리된 상태입니다.',
      title: '후속 작업 큐가 비어 있습니다',
    });
    return;
  }

  const callout = `
    <div class="review-callout review-callout-action">
      <strong>후속 작업 ${escapeHtml(String(items.length))}건</strong>
      <p>재실행 권장이나 reviewer follow-up 같은 열린 작업을 정리하면 검토 단계가 더 깔끔하게 닫힙니다.</p>
    </div>
  `;

  elements.actionList.innerHTML = `${callout}${items
    .map(
      (item) => `
        <div class="action-item">
          <div class="status-row">
            <span class="status-badge ${getStatusClass(item.actionClass || 'open')}">${escapeHtml(getDisplayLabel(item.actionClass, item.actionClass || 'open'))}</span>
            <span class="mini-badge ${getStatusClass(item.priority || 'medium')}">${escapeHtml(getDisplayLabel(item.priority, item.priority || 'medium'))}</span>
          </div>
          <div class="item-title">${escapeHtml(item.title || item.actionId || item.id)}</div>
          <div class="item-subtitle">${escapeHtml(item.reason || '')}</div>
          <div class="item-meta">담당 ${escapeHtml(item.recommendedOwner || '-')} · 기한 ${escapeHtml(formatDate(item.dueAt))}</div>
          ${
            item.recommendedCommand
              ? `<div class="item-meta mono">${escapeHtml(item.recommendedCommand)}</div>`
              : ''
          }
          <div class="action-row">
            ${
              item.missionId
                ? `<button class="secondary-button" type="button" data-action-open="${escapeHtml(item.missionId)}">미션 열기</button>`
                : ''
            }
            ${
              item.missionId
                ? `<button class="primary-button" type="button" data-action-rerun="${escapeHtml(item.actionId)}">권장 재실행</button>`
                : ''
            }
            ${
              item.actionType === 'reviewer-follow-up'
                ? `<button class="ghost-button" type="button" data-action-resolve="${escapeHtml(item.actionId)}">후속 요청 해소</button>`
                : ''
            }
          </div>
        </div>
      `,
    )
    .join('')}`;

  elements.actionList.querySelectorAll('[data-action-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectMission(button.dataset.actionOpen, {
        preferredDetailTab: 'reviews',
        preferredStep: 'step-review',
        urlMode: 'push',
      });
    });
  });

  elements.actionList.querySelectorAll('[data-action-rerun]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = items.find((entry) => entry.actionId === button.dataset.actionRerun);
      if (!item?.missionId) {
        return;
      }
      const provider = inferProviderFromCommand(item.recommendedCommand || item.commandHint || '');
      const confirmed = window.confirm(
        provider
          ? `이 미션을 ${provider} 제공자로 다시 실행할까요?`
          : '이 미션을 현재 기본 제공자 정책으로 다시 실행할까요?',
      );
      if (!confirmed) {
        return;
      }

      await api(`/api/missions/${encodeURIComponent(item.missionId)}/run`, {
        body: JSON.stringify({ provider }),
        method: 'POST',
      });

      await Promise.all([loadMissions(), loadApprovals()]);
      if (state.selectedMissionId === item.missionId) {
        await selectMission(item.missionId, { urlMode: 'replace' });
      }
    });
  });

  elements.actionList.querySelectorAll('[data-action-resolve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionId = button.dataset.actionResolve;
      const kind = window.prompt(
        'resolution kind를 입력하세요. (rerun-fixed | superseded | scope-reduced | accepted-risk)',
        'rerun-fixed',
      );
      if (!kind) {
        return;
      }
      const note = window.prompt('해소 메모를 입력하세요.', 'UI에서 처리 완료');
      if (!note) {
        return;
      }
      await api(`/api/actions/reviewer-follow-ups/${encodeURIComponent(actionId)}/resolve`, {
        body: JSON.stringify({ kind, note }),
        method: 'POST',
      });
      if (state.selectedMissionId) {
        await selectMission(state.selectedMissionId, { urlMode: 'replace' });
      }
    });
  });
}

function renderApprovals() {
  const items = state.approvals || [];
  if (!items.length) {
    elements.approvalList.innerHTML = emptyStateCard({
      icon: 'AP',
      message: '지금은 사람이 결정해야 할 승인 항목이 없습니다. 새로운 실행이 생기면 이 패널에 바로 나타납니다.',
      title: '승인 대기 항목이 없습니다',
    });
    return;
  }

  const callout = `
    <div class="review-callout review-callout-approval">
      <strong>사람의 승인 ${escapeHtml(String(items.length))}건이 남아 있습니다</strong>
      <p>이 항목을 먼저 처리해야 현재 미션을 결과 확정 단계로 넘길 수 있습니다.</p>
    </div>
  `;

  elements.approvalList.innerHTML = `${callout}${items
    .map(
      (item) => `
        <div class="approval-item">
          <div class="status-row">
            <span class="status-badge ${getStatusClass(item.missionStatus || 'pending')}">${escapeHtml(getDisplayLabel(item.missionStatus, item.missionStatus || 'pending'))}</span>
            <span class="mini-badge ${getStatusClass(item.priority || 'medium')}">${escapeHtml(getDisplayLabel(item.priority, item.priority || 'medium'))}</span>
          </div>
          <div class="item-title">${escapeHtml(item.title || item.approvalId)}</div>
          <div class="item-subtitle">${escapeHtml(item.missionTitle || item.missionId || '')}</div>
          <div class="item-meta">${escapeHtml(item.reason || '')}</div>
          <div class="action-row">
            <button class="secondary-button" type="button" data-approval-open="${escapeHtml(item.missionId || '')}">미션 열기</button>
            <button class="primary-button" type="button" data-approval-approve="${escapeHtml(item.approvalId)}">승인</button>
            <button class="ghost-button" type="button" data-approval-reject="${escapeHtml(item.approvalId)}">반려</button>
          </div>
        </div>
      `,
    )
    .join('')}`;

  elements.approvalList.querySelectorAll('[data-approval-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.dataset.approvalOpen) {
        await selectMission(button.dataset.approvalOpen, {
          preferredDetailTab: 'reviews',
          preferredStep: 'step-review',
          urlMode: 'push',
        });
      }
    });
  });

  elements.approvalList.querySelectorAll('[data-approval-approve]').forEach((button) => {
    button.addEventListener('click', async () => {
      const reason = window.prompt('승인 사유를 입력하세요.', 'UI에서 확인 후 승인');
      if (!reason) {
        return;
      }
      await resolveApproval(button.dataset.approvalApprove, 'approve', reason);
    });
  });

  elements.approvalList.querySelectorAll('[data-approval-reject]').forEach((button) => {
    button.addEventListener('click', async () => {
      const reason = window.prompt('반려 사유를 입력하세요.', '추가 수정 필요');
      if (!reason) {
        return;
      }
      await resolveApproval(button.dataset.approvalReject, 'reject', reason);
    });
  });
}

function renderSessionList() {
  const sessions = state.missionDetail?.sessions || [];
  if (!sessions.length) {
    elements.sessionList.innerHTML = emptyStateCard({
      action: 'open-create',
      actionLabel: '미션 작성 열기',
      icon: 'SE',
      message: '실행을 시작하면 세션 이력이 시간순으로 쌓이고, 여기서 각 세션으로 바로 들어갈 수 있습니다.',
      title: '아직 세션이 없습니다',
    });
    wireQuickActions(elements.sessionList);
    return;
  }

  elements.sessionList.innerHTML = sessions
    .slice()
    .reverse()
    .map((session) => {
      const active = session.id === state.selectedSessionId ? 'is-active' : '';
      const providerUiLabel = getDisplayLabel(session.provider || '미정', session.provider || '미정');
      return `
        <div class="session-row ${active}">
          <button type="button" data-session-id="${escapeHtml(session.id)}">
            <div class="status-row">
              <span class="status-badge ${getStatusClass(session.status)}">${escapeHtml(getDisplayLabel(session.status))}</span>
              <span class="mini-badge ${getStatusClass(session.provider || '')}">${escapeHtml(providerUiLabel)}</span>
            </div>
            <div class="item-title">${escapeHtml(formatDate(session.startedAt))} 실행</div>
            <div class="item-meta">
              단계 ${escapeHtml(getDisplayLabel(session.currentStage))} · 실행 ${escapeHtml(
                String(session.agentRunCount || 0),
              )}회
            </div>
            <div class="item-meta mono">${escapeHtml(session.id)}</div>
          </button>
        </div>
      `;
    })
    .join('');

  elements.sessionList.querySelectorAll('[data-session-id]').forEach((button) => {
    button.addEventListener('click', () => selectSession(button.dataset.sessionId, { urlMode: 'push' }));
  });
}

function renderSessionDetail(sessionPayload) {
  if (!sessionPayload) {
    elements.sessionDetail.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '세션 섹션 보기',
      actionValue: 'step-output',
      icon: 'IN',
      message: '세션을 선택하면 실행 이력, 승인 이력, 산출물이 이 상세 영역에 정리됩니다.',
      title: '현재 선택된 세션이 없습니다',
    });
    wireQuickActions(elements.sessionDetail);
    renderDetailTabLabels();
    renderDetailContextbar();
    return;
  }

  const runCount = (sessionPayload.agentRuns || []).length;
  const approvalCount = (sessionPayload.approvals || []).length;
  const artifactCount = (sessionPayload.artifacts || []).length;

  const runs = (sessionPayload.agentRuns || [])
    .slice()
    .reverse()
    .map(
      (run) => `
        <div class="inspector-block">
          <h3>${escapeHtml(getDisplayLabel(run.role || run.workflowRole || run.id, run.role || run.workflowRole || run.id))}</h3>
          <div class="item-meta">
            ${escapeHtml(getDisplayLabel(run.status))} · ${escapeHtml(run.providerId || sessionPayload.session?.provider || '-')} · ${formatDate(run.startedAt)}
          </div>
          <div class="item-meta">${escapeHtml(run.outputSummary || run.inputSummary || '')}</div>
        </div>
      `,
    )
    .join('');

  const approvals = (sessionPayload.approvals || [])
    .slice()
    .reverse()
    .map(
      (approval) => `
        <div class="inspector-block">
          <h3>${escapeHtml(approval.title || approval.id)}</h3>
          <div class="item-meta">${escapeHtml(getDisplayLabel(approval.status))} · ${formatDate(approval.createdAt)}</div>
          <div class="item-meta">${escapeHtml(approval.reason || '')}</div>
        </div>
      `,
    )
    .join('');

  const artifacts = (sessionPayload.artifacts || [])
    .slice()
    .reverse()
    .map((artifact) => {
      const active = artifact.id === state.selectedArtifactId ? 'is-active' : '';
      return `
        <div class="artifact-link ${active}">
          <button type="button" data-artifact-id="${escapeHtml(artifact.id)}">
            <div class="status-row">
              <span class="mini-badge ${getStatusClass(artifact.kind || 'artifact')}">${escapeHtml(getDisplayLabel(artifact.kind, artifact.kind || 'artifact'))}</span>
            </div>
            <div class="item-title">${escapeHtml(artifact.title || artifact.fileName || artifact.id)}</div>
            <div class="item-meta">${escapeHtml(artifact.fileName || '')}</div>
          </button>
        </div>
      `;
    })
    .join('');

  elements.sessionDetail.innerHTML = `
    <div class="inspector-stack">
      <div class="inspector-group">
        <h4>실행 이력 <span class="section-count">${escapeHtml(String(runCount))}</span></h4>
        ${runs || '<p class="empty-state">실행 정보가 없습니다.</p>'}
      </div>
      <div class="inspector-group">
        <h4>승인 이력 <span class="section-count">${escapeHtml(String(approvalCount))}</span></h4>
        ${approvals || '<p class="empty-state">승인 이력이 없습니다.</p>'}
      </div>
      <div class="inspector-group">
        <h4>산출물 목록 <span class="section-count">${escapeHtml(String(artifactCount))}</span></h4>
        ${artifacts || '<p class="empty-state">산출물이 없습니다.</p>'}
      </div>
    </div>
  `;

  elements.sessionDetail.querySelectorAll('[data-artifact-id]').forEach((button) => {
    button.addEventListener('click', () => loadArtifact(button.dataset.artifactId, { urlMode: 'push' }));
  });
  renderDetailTabLabels();
  renderDetailContextbar();
}

function renderArtifact(payload) {
  if (!payload) {
    elements.artifactMeta.textContent = '아직 선택된 산출물이 없습니다.';
    elements.artifactViewer.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '세션 섹션으로 이동',
      actionValue: 'step-output',
      icon: 'AR',
      message: '세션 상세에서 산출물을 선택하면 이 영역에서 문서를 바로 읽을 수 있습니다.',
      title: '선택된 산출물이 없습니다',
    });
    wireQuickActions(elements.artifactViewer);
    renderDetailContextbar();
    return;
  }

  elements.artifactMeta.innerHTML = `
    <span class="detail-context-label">선택된 결과물</span>
    <strong>${escapeHtml(payload.artifact.title || payload.artifact.fileName || payload.artifact.id)}</strong>
    <div class="artifact-meta-row">
      <span class="mini-badge ${getStatusClass(payload.artifact.kind || 'artifact')}">${escapeHtml(getDisplayLabel(payload.artifact.kind, payload.artifact.kind || 'artifact'))}</span>
      <div class="item-meta mono">${escapeHtml(payload.path)}</div>
    </div>
  `;
  elements.artifactViewer.innerHTML = markdownToHtml(payload.content || '');
  renderDetailContextbar();
}

async function loadArtifact(artifactId, { activateTab = true, syncUrl = true, urlMode = 'replace' } = {}) {
  if (!artifactId) {
    return;
  }

  if (state.artifactsById.has(artifactId)) {
    state.selectedArtifactId = artifactId;
    renderArtifact(state.artifactsById.get(artifactId));
    renderSessionDetail(state.currentSessionPayload);
    if (activateTab) {
      setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
      setActiveDetailTab('artifacts', { syncUrl: false });
    }
    if (syncUrl) {
      writeUiStateToUrl({ historyMode: urlMode });
    }
    return;
  }

  const payload = await api(`/api/artifacts/${encodeURIComponent(artifactId)}`);
  state.artifactsById.set(artifactId, payload);
  state.selectedArtifactId = artifactId;
  renderArtifact(payload);
  renderSessionDetail(state.currentSessionPayload);
  if (activateTab) {
    setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
    setActiveDetailTab('artifacts', { syncUrl: false });
  }
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function renderTimeline() {
  const timeline = state.missionTimeline?.timeline || [];
  if (!timeline.length) {
    elements.timelineList.innerHTML = emptyStateCard({
      action: 'open-create',
      actionLabel: '새 미션 시작',
      icon: 'TL',
      message: '미션을 실행하면 제공자 실행, 리뷰어 판정, 승인, 유지보수 이벤트가 시간순으로 정리됩니다.',
      title: '표시할 타임라인이 없습니다',
    });
    wireQuickActions(elements.timelineList);
    return;
  }

  elements.timelineList.innerHTML = timeline
    .slice()
    .reverse()
    .slice(0, 32)
    .map(
      (item) => `
        <button type="button" class="timeline-event" ${item.sessionId ? `data-session-id="${escapeHtml(item.sessionId)}"` : ''}>
          <div class="timeline-time">${escapeHtml(formatDate(item.at))}</div>
          <div class="timeline-kind">${escapeHtml(getTimelineKindLabel(item.kind))}</div>
          <div class="item-title">${escapeHtml(item.detail || '')}</div>
          <div class="item-meta">${escapeHtml(
            getDisplayLabel(
              item.providerId || item.providerDisplayName || item.status || item.role || '',
              item.providerId || item.providerDisplayName || item.status || item.role || '',
            ),
          )}</div>
        </button>
      `,
    )
    .join('');

  elements.timelineList.querySelectorAll('[data-session-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectSession(button.dataset.sessionId, { urlMode: 'push' });
      setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
      setActiveDetailTab('artifacts', { urlMode: 'push' });
    });
  });
}

async function selectSession(
  sessionId,
  { focusRuns = true, preferredArtifactId = null, syncUrl = true, urlMode = 'replace' } = {},
) {
  if (!state.selectedMissionId || !sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
  if (focusRuns) {
    setActiveDetailTab('runs', { syncUrl: false });
  }
  renderSessionList();

  const payload = await api(
    `/api/missions/${encodeURIComponent(state.selectedMissionId)}/session?sessionId=${encodeURIComponent(sessionId)}`,
  );
  state.currentSessionPayload = payload;
  renderSelectionBridge();
  renderSessionDetail(payload);

  const latestDeliverable = (payload.artifacts || [])
    .slice()
    .reverse()
    .find((artifact) =>
      ['deliverable', 'execution-handoff', 'approval-resolution'].includes(artifact.kind),
    );

  const sessionArtifacts = payload.artifacts || [];
  const targetArtifactId =
    preferredArtifactId && sessionArtifacts.some((artifact) => artifact.id === preferredArtifactId)
      ? preferredArtifactId
      : latestDeliverable?.id || null;

  if (targetArtifactId) {
    await loadArtifact(targetArtifactId, { activateTab: false, syncUrl: false });
  } else {
    state.selectedArtifactId = null;
    renderArtifact(null);
  }

  renderStageSummaries();
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

function clearMissionSelection({ syncUrl = true, urlMode = 'replace' } = {}) {
  stopExecutionPolling();
  state.currentSessionPayload = null;
  state.executionLogs = null;
  state.executionStatus = null;
  state.harnessDocumentResult = null;
  state.harnessMemoryResult = null;
  resetHarnessFilterState();
  state.missionActions = null;
  state.missionDetail = null;
  state.missionTimeline = null;
  state.selectedArtifactId = null;
  state.selectedMissionId = null;
  state.selectedSessionId = null;

  resetHarnessFilterInputs();
  resetDocumentLogForm();
  resetMemoryForm('mission');
  resetMemoryForm('workspace');
  renderMissionList();
  renderSelectionBridge();
  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();
  renderSessionDetail(null);
  renderArtifact(null);
  renderFlowState();
  renderDetailTabLabels();
  renderDetailContextbar();
  setActiveStep('step-setup', { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab('config', { syncUrl: false });
  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

async function selectMission(
  missionId,
  {
    preferredArtifactId = null,
    preferredDetailTab = null,
    preferredSessionId = null,
    preferredStep = null,
    syncUrl = true,
    urlMode = 'replace',
  } = {},
) {
  if (!missionId) {
    return;
  }

  resetHarnessFilterState();
  state.selectedMissionId = missionId;
  state.selectedArtifactId = null;
  state.harnessDocumentResult = null;
  state.harnessMemoryResult = null;
  resetHarnessFilterInputs();
  resetDocumentLogForm();
  resetMemoryForm('mission');
  resetMemoryForm('workspace');
  renderMissionList();
  renderSelectionBridge();

  const [detail, timelinePayload, actionPayload] = await Promise.all([
    api(`/api/missions/${encodeURIComponent(missionId)}`),
    api(`/api/missions/${encodeURIComponent(missionId)}/timeline`),
    api(`/api/actions?missionId=${encodeURIComponent(missionId)}`),
  ]);

  state.missionDetail = detail;
  state.missionTimeline = timelinePayload;
  state.missionActions = actionPayload;
  await loadHarnessBrowsers(missionId);
  await loadExecutionStatus(missionId);
  ensureExecutionPolling();

  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();

  const latestSession = (detail.sessions || []).at(-1) || null;
  const targetSessionId =
    preferredSessionId && (detail.sessions || []).some((session) => session.id === preferredSessionId)
      ? preferredSessionId
      : latestSession?.id || null;

  if (targetSessionId) {
    await selectSession(targetSessionId, {
      focusRuns: false,
      preferredArtifactId,
      syncUrl: false,
    });
  } else {
    state.selectedSessionId = null;
    state.currentSessionPayload = null;
    renderSessionDetail(null);
    renderArtifact(null);
  }

  const flow = getFlowState();
  const resolvedStep =
    getSanitizedStepId(preferredStep) ||
    (preferredArtifactId ? 'step-output' : null) ||
    flow.recommendedStep;
  const resolvedDetailTab =
    getSanitizedDetailTab(preferredDetailTab) ||
    (preferredArtifactId ? 'artifacts' : null) ||
    STEP_TO_DETAIL_TAB[resolvedStep] ||
    'artifacts';

  setActiveStep(resolvedStep, { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab(resolvedDetailTab, { syncUrl: false });
  renderFlowState();

  if (syncUrl) {
    writeUiStateToUrl({ historyMode: urlMode });
  }
}

async function resolveApproval(approvalId, decision, reason) {
  await api(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, {
    body: JSON.stringify({ decision, reason }),
    method: 'POST',
  });

  await Promise.all([loadApprovals(), loadMissions()]);
  if (state.selectedMissionId) {
    await selectMission(state.selectedMissionId);
  }
}

async function loadWorkspaces() {
  const payload = await api('/api/workspaces');
  state.workspaces = payload.workspaces || [];
  renderWorkspaceOptions();
}

async function loadProviders() {
  const payload = await api('/api/providers');
  state.providers = payload.providers || payload;
  renderProviders();
}

async function loadApprovals() {
  const payload = await api('/api/approvals');
  state.approvals = payload.items || [];
  renderApprovals();
  renderReviewReadiness();
  renderStageSummaries();
  renderFlowState();
  renderHeroMetrics();
}

async function loadMissions() {
  const payload = await api('/api/missions');
  state.missions = payload.missions || [];
  renderMissionList();
}

async function loadExecutionStatus(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.executionStatus = null;
    state.executionLogs = null;
    stopExecutionPolling();
    renderExecutionConsole();
    return null;
  }

  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/execution`);
  state.executionStatus = payload;
  if (state.missionDetail?.mission?.id === missionId) {
    state.missionDetail.execution = payload.execution;
  }
  const executionId = payload.execution?.latestExecutionSession?.id || '';
  if (executionId) {
    state.executionLogs = await api(
      `/api/missions/${encodeURIComponent(missionId)}/execution/logs?executionId=${encodeURIComponent(executionId)}`,
    );
  } else {
    state.executionLogs = {
      execution: null,
      lines: [],
      logFilePath: null,
    };
  }
  renderExecutionConsole();
  return payload;
}

async function loadReleaseStatus() {
  const previousReleaseState = {
    focusedProvider: state.releaseFocusedProvider,
    focusedHistoryId: state.releaseFocusedHistoryId,
    historyFilterOutcome: state.releaseHistoryFilterOutcome,
    historyFilterProvider: state.releaseHistoryFilterProvider,
    historyFilterScope: state.releaseHistoryFilterScope,
  };
  const payload = await api('/api/execution-v1/status');
  state.releaseStatus = payload;
  if (!payload.providerReadiness?.some((item) => String(item.provider || '').trim() === state.releaseFocusedProvider)) {
    state.releaseFocusedProvider = '';
  }
  if (!payload.releaseActionHistory?.some((item) => item.id === state.releaseFocusedHistoryId)) {
    state.releaseFocusedHistoryId = '';
  }
  if (!payload.releaseActionHistory?.some((item) => item.id === state.releaseExpandedHistoryId)) {
    state.releaseExpandedHistoryId = '';
  }
  if (
    state.releaseHistoryFilterOutcome &&
    state.releaseHistoryFilterOutcome === 'attention' &&
    !payload.releaseActionHistory?.some((item) => isReleaseAttentionOutcome(item.outcome))
  ) {
    state.releaseHistoryFilterOutcome = '';
  }
  if (
    state.releaseHistoryFilterScope &&
    !payload.releaseActionHistory?.some((item) => String(item.scope || '').trim() === state.releaseHistoryFilterScope)
  ) {
    state.releaseHistoryFilterScope = '';
  }
  if (
    state.releaseHistoryFilterProvider &&
    !payload.releaseActionHistory?.some((item) => String(item.provider || '').trim() === state.releaseHistoryFilterProvider)
  ) {
    state.releaseHistoryFilterProvider = '';
  }
  state.releaseLiveConfirmProvider = '';
  state.releaseLiveRefreshPreflight = null;
  state.releaseRegenerationConfirmArmed = false;
  state.releaseRefreshPreflight = null;
  state.releaseSnapshotConfirmArmed = false;
  state.releaseSnapshotPreflight = null;
  renderReleaseStatus();
  renderDetailTabLabels();
  renderDetailContextbar();
  if (
    previousReleaseState.focusedProvider !== state.releaseFocusedProvider
    || previousReleaseState.focusedHistoryId !== state.releaseFocusedHistoryId
    || previousReleaseState.historyFilterOutcome !== state.releaseHistoryFilterOutcome
    || previousReleaseState.historyFilterProvider !== state.releaseHistoryFilterProvider
    || previousReleaseState.historyFilterScope !== state.releaseHistoryFilterScope
  ) {
    writeUiStateToUrl();
  }
  return payload;
}

async function reloadReleaseStatus() {
  try {
    setUiNotice('v1 마감 상태를 다시 읽는 중입니다.');
    await loadReleaseStatus();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice('v1 마감 상태를 다시 읽었습니다.');
  } catch (error) {
    window.alert(error.message || 'v1 마감 상태를 다시 읽지 못했습니다.');
  }
}

async function refreshReleaseStatus(liveMode = '') {
  return refreshReleaseStatusWithOptions(liveMode, {});
}

async function armReleaseRegenerationConfirm() {
  try {
    setUiNotice('current surface 재생성 preflight를 확인 중입니다.');
    const payload = await api('/api/execution-v1/refresh/preflight', {
      body: JSON.stringify({
        liveAnthropic: false,
        liveLocal: false,
        liveOpenAI: false,
      }),
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || 'current surface 재생성 preflight가 차단되었습니다.');
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseRefreshPreflight = payload.preflight;
    state.releaseRegenerationConfirmArmed = true;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice('current surface 재생성 확인이 준비되었습니다. 영향 요약을 확인한 뒤 재생성 확인을 눌러 주세요.');
  } catch (error) {
    window.alert(error.message || 'current surface 재생성 preflight 확인에 실패했습니다.');
  }
}

async function refreshReleaseStatusWithOptions(
  liveMode = '',
  {
    confirmCurrentSurfaceRewrite = false,
    confirmLiveValidation = false,
  } = {},
) {
  try {
    const normalizedLiveMode = String(liveMode || '').trim();
    const isLiveRun = Boolean(normalizedLiveMode);
    state.releaseLiveConfirmProvider = '';
    state.releaseLiveRefreshPreflight = null;
    state.releaseRegenerationConfirmArmed = false;
    state.releaseRefreshPreflight = null;
    state.releaseSnapshotConfirmArmed = false;
    state.releaseSnapshotPreflight = null;
    setUiNotice(
      isLiveRun
        ? `${normalizedLiveMode} live validation과 current surface를 갱신 중입니다.`
        : 'current surface evidence/closeout를 재생성 중입니다.',
    );
    const payload = await api('/api/execution-v1/refresh', {
      body: JSON.stringify({
        confirmCurrentSurfaceRewrite,
        confirmLiveValidation,
        liveAnthropic: normalizedLiveMode === 'anthropic',
        liveLocal: normalizedLiveMode === 'local',
        liveOpenAI: normalizedLiveMode === 'openai',
      }),
      method: 'POST',
    });
    state.releaseStatus = payload;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice(
      isLiveRun
        ? `${normalizedLiveMode} live validation 결과로 current surface를 갱신했습니다.`
        : 'current surface evidence/closeout를 재생성했습니다.',
    );
  } catch (error) {
    window.alert(
      error.message
      || (isLiveRun
        ? 'provider live validation 기반 current surface 갱신에 실패했습니다.'
        : 'current surface 재생성에 실패했습니다.'),
    );
  }
}

async function runReleasePreflight(provider = '') {
  try {
    const normalizedProvider = String(provider || '').trim();
    if (!normalizedProvider) {
      return;
    }
    setUiNotice(`${normalizedProvider} preflight를 실행 중입니다.`);
    const payload = await api('/api/execution-v1/preflight', {
      body: JSON.stringify({
        provider: normalizedProvider,
      }),
      method: 'POST',
    });
    state.releasePreflightResults = {
      ...state.releasePreflightResults,
      [normalizedProvider]: payload.preflight,
    };
    renderReleaseStatus();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    setUiNotice(`${normalizedProvider} preflight를 완료했습니다. (${payload.preflight.status})`);
  } catch (error) {
    window.alert(error.message || 'release preflight 실행에 실패했습니다.');
  }
}

async function armReleaseLiveConfirm(provider = '') {
  try {
    const normalizedProvider = String(provider || '').trim();
    if (!normalizedProvider) {
      return;
    }
    setUiNotice(`${normalizedProvider} live validation preflight를 확인 중입니다.`);
    const payload = await api('/api/execution-v1/refresh/preflight', {
      body: JSON.stringify({
        liveAnthropic: normalizedProvider === 'anthropic',
        liveLocal: normalizedProvider === 'local',
        liveOpenAI: normalizedProvider === 'openai',
      }),
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || `${normalizedProvider} live validation preflight가 차단되었습니다.`);
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseLiveConfirmProvider = normalizedProvider;
    state.releaseLiveRefreshPreflight = payload.preflight;
    state.releasePreflightResults = {
      ...state.releasePreflightResults,
      [normalizedProvider]: payload.preflight.providerPreflight || state.releasePreflightResults?.[normalizedProvider] || null,
    };
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice(`${normalizedProvider} live validation 확인이 준비되었습니다. impact를 확인한 뒤 live 검증 확인을 눌러 주세요.`);
  } catch (error) {
    window.alert(error.message || 'provider live validation preflight 확인에 실패했습니다.');
  }
}

async function armReleaseSnapshotConfirm() {
  try {
    setUiNotice('release snapshot 고정 preflight를 확인 중입니다.');
    const payload = await api('/api/execution-v1/snapshot/preflight', {
      method: 'POST',
    });
    if (!payload.preflight?.allowed) {
      window.alert(payload.preflight?.summary || 'release snapshot 고정 preflight가 차단되었습니다.');
      return;
    }
    state.releaseStatus = payload.status || state.releaseStatus;
    state.releaseSnapshotPreflight = payload.preflight;
    state.releaseSnapshotConfirmArmed = true;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setUiNotice('release snapshot 고정 확인이 준비되었습니다. impact를 확인한 뒤 snapshot 고정 확인을 눌러 주세요.');
  } catch (error) {
    window.alert(error.message || 'release snapshot 고정 preflight 확인에 실패했습니다.');
  }
}

async function archiveReleaseSnapshot({ confirmSnapshotFreeze = false } = {}) {
  try {
    state.releaseRegenerationConfirmArmed = false;
    state.releaseRefreshPreflight = null;
    state.releaseSnapshotConfirmArmed = false;
    state.releaseSnapshotPreflight = null;
    setUiNotice('release snapshot을 고정 중입니다.');
    const payload = await api('/api/execution-v1/snapshot', {
      body: JSON.stringify({
        confirmSnapshotFreeze,
      }),
      method: 'POST',
    });
    state.releaseStatus = payload.status;
    renderReleaseStatus();
    renderDetailTabLabels();
    renderDetailContextbar();
    setActiveDetailTab('release', { urlMode: 'push' });
    const verifiedCommit = payload.archiveResult?.verifiedCommit || state.releaseStatus?.snapshot?.verifiedCommit || '';
    setUiNotice(verifiedCommit ? `release snapshot을 고정했습니다. (${verifiedCommit.slice(0, 7)})` : 'release snapshot을 고정했습니다.');
  } catch (error) {
    window.alert(error.message || 'release snapshot 고정에 실패했습니다.');
  }
}

function ensureExecutionPolling() {
  stopExecutionPolling();
  const execution = getExecutionStatusPayload()?.latestExecutionSession;
  if (!execution || execution.status !== 'running' || !state.selectedMissionId) {
    return;
  }

  state.executionPollTimer = setInterval(async () => {
    if (!state.selectedMissionId) {
      stopExecutionPolling();
      return;
    }
    try {
      await Promise.all([loadExecutionStatus(state.selectedMissionId), loadApprovals()]);
      await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    } catch {
      stopExecutionPolling();
    }
  }, 2000);
}

async function restoreUiStateFromUrl({ syncUrl = true } = {}) {
  const urlState = parseUiStateFromUrl();

  if (urlState.workspaceId && state.workspaces.some((workspace) => workspace.id === urlState.workspaceId)) {
    elements.workspaceSelect.value = urlState.workspaceId;
  }

  renderMissionList();

  const visibleMission = filteredMissions();
  const targetMissionId =
    urlState.missionId && visibleMission.some(({ mission }) => mission.id === urlState.missionId)
      ? urlState.missionId
      : visibleMission[0]?.mission?.id || null;

  if (targetMissionId) {
    await selectMission(targetMissionId, {
      preferredArtifactId: urlState.artifactId,
      preferredDetailTab: urlState.detailTab,
      preferredSessionId: urlState.sessionId,
      preferredStep: urlState.stepId,
      syncUrl: false,
    });
  } else {
    clearMissionSelection({ syncUrl: false });
    if (urlState.stepId) {
      setActiveStep(urlState.stepId, { syncDetailTab: false, syncUrl: false });
    }
    if (urlState.detailTab) {
      setActiveDetailTab(urlState.detailTab, { syncUrl: false });
    }
  }

  if (urlState.detailTab === 'release') {
    applyReleaseHistoryUrlState({
      focusedHistoryId: urlState.releaseFocusedHistoryId,
      outcome: urlState.releaseHistoryOutcome,
      provider: urlState.releaseHistoryProvider,
      scope: urlState.releaseHistoryScope,
    });
    applyReleaseProviderUrlState(urlState.releaseFocusedProvider);
  } else {
    applyReleaseHistoryUrlState();
    applyReleaseProviderUrlState();
  }

  if (syncUrl) {
    writeUiStateToUrl();
  }
}

async function loadHarnessDocuments(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.harnessDocumentResult = null;
    return null;
  }

  const params = new URLSearchParams({
    limit: String(state.harnessDocumentVisibleCount || 12),
    offset: String(state.harnessDocumentOffset || 0),
    query: String(state.harnessDocumentQuery || ''),
    sort: String(state.harnessDocumentSort || 'latest'),
    type: String(state.harnessDocumentFilter || 'all'),
  });
  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/harness/documents?${params.toString()}`);
  state.harnessDocumentOffset = Number(payload.filters?.offset || 0);
  state.harnessDocumentResult = payload;
  return payload;
}

async function loadHarnessMemory(missionId = state.selectedMissionId) {
  if (!missionId) {
    state.harnessMemoryResult = null;
    return null;
  }

  const params = new URLSearchParams({
    kind: String(state.harnessMemoryFilterKind || 'all'),
    limit: String(state.harnessMemoryVisibleCount || 12),
    offset: String(state.harnessMemoryOffset || 0),
    query: String(state.harnessMemoryQuery || ''),
    scope: String(state.harnessMemoryFilterScope || 'all'),
    sort: String(state.harnessMemorySort || 'latest'),
  });
  const payload = await api(`/api/missions/${encodeURIComponent(missionId)}/harness/memory?${params.toString()}`);
  state.harnessMemoryOffset = Number(payload.filters?.offset || 0);
  state.harnessMemoryResult = payload;
  return payload;
}

async function loadHarnessBrowsers(missionId = state.selectedMissionId) {
  const [documents, memory] = await Promise.all([loadHarnessDocuments(missionId), loadHarnessMemory(missionId)]);
  return { documents, memory };
}

async function refreshSelectedMissionContext({ preserveHarnessBrowse = false } = {}) {
  if (!state.selectedMissionId) {
    return;
  }

  const missionId = state.selectedMissionId;
  const [detail, timelinePayload, actionPayload] = await Promise.all([
    api(`/api/missions/${encodeURIComponent(missionId)}`),
    api(`/api/missions/${encodeURIComponent(missionId)}/timeline`),
    api(`/api/actions?missionId=${encodeURIComponent(missionId)}`),
  ]);

  state.missionDetail = detail;
  state.missionTimeline = timelinePayload;
  state.missionActions = actionPayload;
  await loadExecutionStatus(missionId);
  ensureExecutionPolling();

  if (preserveHarnessBrowse) {
    await loadHarnessBrowsers(missionId);
  }

  renderSelectionBridge();
  renderMissionSummary();
  renderSetupHarnessSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderHarnessPanel();
  renderTimeline();
  renderSessionList();
  renderFlowState();
  renderHeroMetrics();
  renderDetailTabLabels();
  renderDetailContextbar();
}

async function handleMissionCreate(event) {
  event.preventDefault();
  const formData = new FormData(elements.missionForm);
  const payload = {
    constraints: String(formData.get('constraints') || ''),
    deliverableType: String(formData.get('deliverableType') || ''),
    mode: String(formData.get('mode') || ''),
    objective: String(formData.get('objective') || ''),
    title: String(formData.get('title') || ''),
    workspaceId: getSelectedWorkspaceId(),
  };

  const result = await api('/api/missions', {
    body: JSON.stringify(payload),
    method: 'POST',
  });

  elements.missionForm.reset();
  await loadMissions();
  await selectMission(result.mission.id, {
    preferredDetailTab: 'runs',
    preferredStep: 'step-run',
    urlMode: 'push',
  });
}

async function handleMissionRun() {
  if (!state.selectedMissionId) {
    return;
  }

  const provider = String(elements.runProviderSelect.value || '').trim();
  elements.runMissionButton.disabled = true;
  elements.runMissionButton.textContent = '실행 중...';

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/run`, {
      body: JSON.stringify({ provider }),
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await selectMission(state.selectedMissionId, { urlMode: 'replace' });
    const pendingApproval = state.approvals.some((item) => item.missionId === state.selectedMissionId);
    const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
    setActiveStep(pendingApproval || pendingActionCount ? 'step-review' : 'step-output', { urlMode: 'push' });
  } finally {
    elements.runMissionButton.disabled = false;
    elements.runMissionButton.textContent = '이 미션 실행';
  }
}

async function handleExecutionPreflight(requestApproval = false) {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  try {
    const result = await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/preflight`, {
      body: JSON.stringify({ requestApproval }),
      method: 'POST',
    });

    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');

    if (requestApproval && result.approval?.status === 'pending') {
      setUiNotice('실행 승인 요청을 생성했습니다.');
      return;
    }

    if (result.execution?.currentLease) {
      setUiNotice('실행 lease가 준비됐습니다. 실행을 시작할 수 있습니다.');
      return;
    }

    if (result.execution?.blockedReasons?.length) {
      setUiNotice(`실행 preflight가 막혔습니다: ${result.execution.blockedReasons[0]}`);
      return;
    }

    setUiNotice('실행 preflight를 새로고침했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 preflight 처리에 실패했습니다.');
  }
}

async function handleExecutionStart() {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/start`, {
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');
    setUiNotice('실행 세션을 시작했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 시작에 실패했습니다.');
  }
}

async function handleExecutionStop() {
  if (!state.selectedMissionId || !isExecutionMissionSelected()) {
    return;
  }

  const executionSession = getExecutionStatusPayload()?.latestExecutionSession || null;
  if (executionSession?.status === 'running' && !window.confirm('현재 실행 세션을 중단할까요?')) {
    return;
  }

  try {
    await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/execution/stop`, {
      method: 'POST',
    });
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep('step-run', { syncDetailTab: false });
    setActiveDetailTab('runs');
    setUiNotice('실행 세션 중단을 요청했습니다.');
  } catch (error) {
    window.alert(error.message || '실행 중단에 실패했습니다.');
  }
}

async function handleMemoryCreate(event) {
  event.preventDefault();
  if (!state.selectedMissionId || !elements.memoryForm) {
    return;
  }

  const currentStep = state.activeStep;
  const formData = new FormData(elements.memoryForm);
  const editingId = getFormEditingId(elements.memoryForm);
  const payload = {
    content: String(formData.get('content') || '').trim(),
    kind: String(formData.get('kind') || '').trim(),
  };

  if (!payload.content) {
    window.alert('저장할 메모 내용을 입력해 주세요.');
    return;
  }

  elements.memorySubmitButton.disabled = true;
  elements.memorySubmitButton.textContent = '저장 중...';

  try {
    await api(
      editingId
        ? `/api/missions/${encodeURIComponent(state.selectedMissionId)}/memory/${encodeURIComponent(editingId)}`
        : `/api/missions/${encodeURIComponent(state.selectedMissionId)}/memory`,
      {
      body: JSON.stringify(payload),
      method: editingId ? 'PATCH' : 'POST',
    },
    );
    resetMemoryForm('mission');
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  } finally {
    elements.memorySubmitButton.disabled = false;
    elements.memorySubmitButton.textContent = getMemoryFormConfig('mission').submitText;
  }
}

async function handleWorkspaceMemoryCreate(event) {
  event.preventDefault();
  const workspaceId = state.missionDetail?.mission?.workspaceId || getSelectedWorkspaceId();
  if (!workspaceId || !elements.workspaceMemoryForm) {
    return;
  }

  const currentStep = state.activeStep;
  const formData = new FormData(elements.workspaceMemoryForm);
  const editingId = getFormEditingId(elements.workspaceMemoryForm);
  const payload = {
    content: String(formData.get('content') || '').trim(),
    kind: String(formData.get('kind') || '').trim(),
  };

  if (!payload.content) {
    window.alert('저장할 워크스페이스 메모 내용을 입력해 주세요.');
    return;
  }

  elements.workspaceMemorySubmitButton.disabled = true;
  elements.workspaceMemorySubmitButton.textContent = '저장 중...';

  try {
    await api(
      editingId
        ? `/api/workspaces/${encodeURIComponent(workspaceId)}/memory/${encodeURIComponent(editingId)}`
        : `/api/workspaces/${encodeURIComponent(workspaceId)}/memory`,
      {
      body: JSON.stringify(payload),
      method: editingId ? 'PATCH' : 'POST',
    },
    );
    resetMemoryForm('workspace');
    await Promise.all([loadMissions(), loadApprovals()]);
    if (state.selectedMissionId) {
      await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
      setActiveStep(currentStep, { syncDetailTab: false });
      setActiveDetailTab('harness');
    }
  } finally {
    elements.workspaceMemorySubmitButton.disabled = false;
    elements.workspaceMemorySubmitButton.textContent = getMemoryFormConfig('workspace').submitText;
  }
}

async function handleMemoryDelete(scope, memoryId) {
  if (!memoryId) {
    return;
  }

  const currentStep = state.activeStep;
  const scopeId =
    scope === 'workspace'
      ? state.missionDetail?.mission?.workspaceId || getSelectedWorkspaceId()
      : state.selectedMissionId;

  if (!scopeId) {
    return;
  }

  const entry = getHarnessMemoryEntry(scope, memoryId);
  const confirmMessage = `이 ${scope === 'workspace' ? '워크스페이스' : '미션'} 메모를 삭제할까요?\n\n${summarizeText(entry?.content || '', '메모 내용 없음')}`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  await api(`/${['api', scope === 'workspace' ? 'workspaces' : 'missions', encodeURIComponent(scopeId), 'memory', encodeURIComponent(memoryId)].join('/')}`, {
    method: 'DELETE',
  });

  if (scope === 'workspace') {
    resetMemoryForm('workspace');
  } else {
    resetMemoryForm('mission');
  }

  await Promise.all([loadMissions(), loadApprovals()]);
  if (state.selectedMissionId) {
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  }
}

async function handleDocumentLogCreate(event) {
  event.preventDefault();
  if (!state.selectedMissionId || !elements.documentLogForm) {
    return;
  }

  const currentStep = state.activeStep;
  const formData = new FormData(elements.documentLogForm);
  const editingId = getFormEditingId(elements.documentLogForm);
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const type = String(formData.get('type') || '').trim();

  if (!title) {
    window.alert('기록할 문서 제목을 입력해 주세요.');
    return;
  }
  if (!content) {
    window.alert('기록할 Markdown 본문을 입력해 주세요.');
    return;
  }

  elements.documentLogSubmitButton.disabled = true;
  elements.documentLogSubmitButton.textContent = '저장 중...';

  try {
    await api(
      editingId
        ? `/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/${encodeURIComponent(editingId)}`
        : `/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log`,
      {
      body: JSON.stringify({ content, title, type }),
      method: editingId ? 'PATCH' : 'POST',
    },
    );
    resetDocumentLogForm();
    await Promise.all([loadMissions(), loadApprovals()]);
    await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
    setActiveStep(currentStep, { syncDetailTab: false });
    setActiveDetailTab('harness');
  } finally {
    elements.documentLogSubmitButton.disabled = false;
    elements.documentLogSubmitButton.textContent = '문서 기록 저장';
  }
}

async function handleDocumentLogDelete(entryId) {
  if (!entryId || !state.selectedMissionId) {
    return;
  }

  const currentStep = state.activeStep;
  const entry = getHarnessDocumentEntry(entryId);
  const confirmMessage = `이 문서 기록을 삭제할까요?\n\n${entry?.title || '제목 없음'}`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  });

  resetDocumentLogForm();
  await Promise.all([loadMissions(), loadApprovals()]);
  await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
  setActiveStep(currentStep, { syncDetailTab: false });
  setActiveDetailTab('harness');
}

async function handleLegacyDocumentMigration() {
  if (!state.selectedMissionId) {
    return;
  }

  const legacyCount = Number(state.missionDetail?.harness?.documents?.summary?.legacyDevlogCount || 0);
  if (!legacyCount) {
    window.alert('전환할 기존 개발 로그가 없습니다.');
    return;
  }

  const confirmMessage = `기존 개발 로그 ${legacyCount}건을 tracked entry로 전환할까요?\n\n전환 후에는 하네스에서 바로 수정하거나 삭제할 수 있습니다.`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  const currentStep = state.activeStep;
  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `기존 개발 로그 ${legacyCount}건을 tracked entry로 전환하는 중입니다.`;
  }

  const result = await api(`/api/missions/${encodeURIComponent(state.selectedMissionId)}/document-log/migrate-legacy`, {
    method: 'POST',
  });

  resetDocumentLogForm();
  await Promise.all([loadMissions(), loadApprovals()]);
  await refreshSelectedMissionContext({ preserveHarnessBrowse: true });
  setActiveStep(currentStep, { syncDetailTab: false });
  setActiveDetailTab('harness');

  if (elements.documentLogFormStatus) {
    elements.documentLogFormStatus.textContent = `기존 개발 로그 ${result.migratedCount || 0}건을 tracked entry로 전환했습니다.`;
  }
}

async function handleHarnessDocumentSearch(event) {
  state.harnessDocumentQuery = String(event.target?.value || '');
  state.harnessDocumentOffset = 0;
  await loadHarnessDocuments();
  renderHarnessPanel();
}

async function handleHarnessDocumentFilter(event) {
  state.harnessDocumentFilter = String(event.target?.value || 'all').trim() || 'all';
  state.harnessDocumentOffset = 0;
  await loadHarnessDocuments();
  renderHarnessPanel();
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('선택한 파일을 읽을 수 없습니다.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

async function handleDocumentLogFilePick(event) {
  const file = event.target?.files?.[0];
  if (!file || !elements.documentLogForm) {
    return;
  }

  const content = await readTextFile(file);
  const titleField = elements.documentLogForm.querySelector('input[name="title"]');
  const contentField = elements.documentLogForm.querySelector('textarea[name="content"]');

  if (titleField && !String(titleField.value || '').trim()) {
    titleField.value = stripFileExtension(file.name);
  }

  if (contentField) {
    contentField.value = content;
  }
}

function attachEvents() {
  elements.toggleCreateButton.addEventListener('click', () => openComposer());
  elements.missionFilter.addEventListener('input', renderMissionList);
  elements.workspaceSelect.addEventListener('change', async () => {
    renderMissionList();
    const visibleMission = filteredMissions();
    if (!visibleMission.length) {
      clearMissionSelection();
      return;
    }
    if (!visibleMission.some(({ mission }) => mission.id === state.selectedMissionId)) {
      await selectMission(visibleMission[0].mission.id, { urlMode: 'push' });
      return;
    }
    writeUiStateToUrl({ historyMode: 'push' });
  });
  elements.missionForm.addEventListener('submit', async (event) => {
    try {
      await handleMissionCreate(event);
    } catch (error) {
      window.alert(error.message);
    }
  });
  elements.memoryForm?.addEventListener('submit', async (event) => {
    try {
      await handleMemoryCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.memorySubmitButton.disabled = false;
      elements.memorySubmitButton.textContent = getMemoryFormConfig('mission').submitText;
    }
  });
  elements.memoryCancelButton?.addEventListener('click', () => resetMemoryForm('mission'));
  elements.workspaceMemoryForm?.addEventListener('submit', async (event) => {
    try {
      await handleWorkspaceMemoryCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.workspaceMemorySubmitButton.disabled = false;
      elements.workspaceMemorySubmitButton.textContent = getMemoryFormConfig('workspace').submitText;
    }
  });
  elements.workspaceMemoryCancelButton?.addEventListener('click', () => resetMemoryForm('workspace'));
  elements.documentLogForm?.addEventListener('submit', async (event) => {
    try {
      await handleDocumentLogCreate(event);
    } catch (error) {
      window.alert(error.message);
      elements.documentLogSubmitButton.disabled = false;
      elements.documentLogSubmitButton.textContent = '문서 기록 저장';
    }
  });
  elements.documentLogSearch?.addEventListener('input', async (event) => {
    try {
      await handleHarnessDocumentSearch(event);
    } catch (error) {
      window.alert(error.message);
    }
  });
  elements.documentLogFilter?.addEventListener('change', async (event) => {
    try {
      await handleHarnessDocumentFilter(event);
    } catch (error) {
      window.alert(error.message);
    }
  });
  elements.documentLogCancelButton?.addEventListener('click', () => resetDocumentLogForm());
  elements.documentLogFile?.addEventListener('change', async (event) => {
    try {
      await handleDocumentLogFilePick(event);
    } catch (error) {
      window.alert(error.message);
      if (elements.documentLogFile) {
        elements.documentLogFile.value = '';
      }
    }
  });
  elements.runMissionButton.addEventListener('click', async () => {
    try {
      await handleMissionRun();
    } catch (error) {
      window.alert(error.message);
      elements.runMissionButton.disabled = false;
      elements.runMissionButton.textContent = '이 미션 실행';
    }
  });
  elements.stepButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveStep(button.dataset.stepTarget, { urlMode: 'push' }));
  });
  elements.detailTabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveDetailTab(button.dataset.detailTab, { urlMode: 'push' }));
  });
  window.addEventListener('popstate', async () => {
    try {
      await restoreUiStateFromUrl({ syncUrl: false });
    } catch (error) {
      window.alert(error.message);
    }
  });
}

async function bootstrap() {
  attachEvents();
  renderPlaybooks();
  renderTemplates();
  setActiveStep('step-setup', { syncUrl: false });

  try {
    await Promise.all([loadWorkspaces(), loadProviders(), loadApprovals(), loadMissions(), loadReleaseStatus()]);
    await restoreUiStateFromUrl();
  } catch (error) {
    window.alert(error.message);
  }
}

bootstrap();
