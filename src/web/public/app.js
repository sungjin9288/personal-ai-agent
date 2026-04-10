const state = {
  activeStep: 'step-setup',
  activeDetailTab: 'artifacts',
  approvals: [],
  artifactsById: new Map(),
  currentSessionPayload: null,
  missionActions: null,
  missionDetail: null,
  missionTimeline: null,
  missions: [],
  providers: [],
  selectedPlaybookId: 'team-pipeline',
  selectedArtifactId: null,
  selectedMissionId: null,
  selectedSessionId: null,
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
  flowStatus: document.getElementById('flow-status'),
  heroMetrics: document.getElementById('hero-metrics'),
  heroSignals: document.getElementById('hero-signals'),
  missionFilter: document.getElementById('mission-filter'),
  missionForm: document.getElementById('mission-form'),
  missionList: document.getElementById('mission-list'),
  missionSubtitle: document.getElementById('mission-subtitle'),
  playbookList: document.getElementById('playbook-list'),
  missionSummary: document.getElementById('mission-summary'),
  missionTitle: document.getElementById('mission-title'),
  providerList: document.getElementById('provider-list'),
  reviewReadiness: document.getElementById('review-readiness'),
  reviewReadinessDetail: document.getElementById('review-readiness-detail'),
  runMissionButton: document.getElementById('run-mission-button'),
  runProviderSelect: document.getElementById('run-provider-select'),
  reviewStageSummary: document.getElementById('review-stage-summary'),
  runStageSummary: document.getElementById('run-stage-summary'),
  sessionDetail: document.getElementById('session-detail'),
  sessionList: document.getElementById('session-list'),
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

function getSelectedWorkspaceId() {
  return String(elements.workspaceSelect.value || state.workspaces[0]?.id || '').trim();
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

const DISPLAY_LABELS = {
  'approval-resolution': '승인 처리 결과',
  approved: '승인됨',
  artifact: '산출물',
  'awaiting-approval': '승인 대기',
  awaiting_approval: '승인 대기',
  blocked: '막힘',
  completed: '완료',
  'decision-memo': '의사결정 메모',
  deliverable: '최종 산출물',
  engineering: '엔지니어링 작업',
  'env-missing': '환경 변수 누락',
  'execution-handoff': '실행 인계',
  failed: '실패',
  high: '높음',
  'implementation-proposal': '구현 제안서',
  knowledge: '지식 작업',
  low: '낮음',
  manager: '매니저',
  medium: '보통',
  normal: '보통',
  open: '열림',
  pending: '대기',
  planner: '플래너',
  prd: 'PRD',
  queued: '대기열',
  ready: '준비됨',
  rejected: '반려됨',
  retryReady: '재실행 권장',
  reviewer: '리뷰어',
  running: '실행 중',
  stable: '안정',
  stub: '스텁',
  verification: '검증',
};

function getDisplayLabel(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  return DISPLAY_LABELS[raw] || DISPLAY_LABELS[raw.toLowerCase()] || raw;
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
        setActiveStep(value || 'step-setup');
        return;
      }

      if (action === 'switch-tab') {
        setActiveDetailTab(value || 'artifacts');
      }
    });
  });
}

function setActiveStep(stepId, { syncDetailTab = true } = {}) {
  state.activeStep = stepId;
  elements.stepButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.stepTarget === stepId);
  });
  elements.stepPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === stepId);
  });

  if (syncDetailTab) {
    setActiveDetailTab(STEP_TO_DETAIL_TAB[stepId] || 'artifacts');
  }
}

function setActiveDetailTab(tabId) {
  state.activeDetailTab = tabId;
  elements.detailTabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.detailTab === tabId);
  });
  elements.detailPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === `detail-${tabId}`);
  });
  renderDetailTabLabels();
  renderDetailContextbar();
}

function openComposer() {
  setActiveStep('step-setup');
  elements.missionForm.elements.title?.focus();
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
      </div>
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

function renderMissionList() {
  const missions = filteredMissions();
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
              <span class="mission-row-stage">${escapeHtml(snapshot.stage)}</span>
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
    button.addEventListener('click', () => selectMission(button.dataset.missionId));
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
  const counts = {
    artifacts: artifactsCount,
    runs: runsCount,
    reviews: reviewsCount,
    config: 0,
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
      </div>
      <div class="action-row">
        <button class="ghost-button" type="button" data-ui-action="switch-tab" data-ui-value="runs">실행 기록 보기</button>
      </div>
    </div>
  `;
  wireQuickActions(elements.runStageSummary);
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
      </div>
      <h4 class="summary-statement">${escapeHtml(primaryDecision)}</h4>
      <p class="summary-note review-priority-copy">${escapeHtml(decisionCopy)}</p>
      <p class="summary-note">${escapeHtml(latestSession?.reviewerSummary || flow.copy)}</p>
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
    </div>
  `;
}

function renderStageSummaries() {
  renderRunStageSummary();
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
      await selectMission(button.dataset.actionOpen);
      setActiveStep('step-review');
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
        await selectMission(item.missionId);
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
        await selectMission(state.selectedMissionId);
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
        await selectMission(button.dataset.approvalOpen);
        setActiveStep('step-review');
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
    button.addEventListener('click', () => selectSession(button.dataset.sessionId));
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
    button.addEventListener('click', () => loadArtifact(button.dataset.artifactId));
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

async function loadArtifact(artifactId, { activateTab = true } = {}) {
  if (!artifactId) {
    return;
  }

  if (state.artifactsById.has(artifactId)) {
    state.selectedArtifactId = artifactId;
    renderArtifact(state.artifactsById.get(artifactId));
    renderSessionDetail(state.currentSessionPayload);
    if (activateTab) {
      setActiveStep('step-output');
      setActiveDetailTab('artifacts');
    }
    return;
  }

  const payload = await api(`/api/artifacts/${encodeURIComponent(artifactId)}`);
  state.artifactsById.set(artifactId, payload);
  state.selectedArtifactId = artifactId;
  renderArtifact(payload);
  renderSessionDetail(state.currentSessionPayload);
  if (activateTab) {
    setActiveStep('step-output');
    setActiveDetailTab('artifacts');
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
      await selectSession(button.dataset.sessionId);
      setActiveStep('step-output', { syncDetailTab: false });
      setActiveDetailTab('artifacts');
    });
  });
}

async function selectSession(sessionId) {
  if (!state.selectedMissionId || !sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
  setActiveDetailTab('runs');
  renderSessionList();

  const payload = await api(
    `/api/missions/${encodeURIComponent(state.selectedMissionId)}/session?sessionId=${encodeURIComponent(sessionId)}`,
  );
  state.currentSessionPayload = payload;
  renderSessionDetail(payload);

  const latestDeliverable = (payload.artifacts || [])
    .slice()
    .reverse()
    .find((artifact) =>
      ['deliverable', 'execution-handoff', 'approval-resolution'].includes(artifact.kind),
    );

  if (latestDeliverable) {
    await loadArtifact(latestDeliverable.id, { activateTab: false });
  } else {
    state.selectedArtifactId = null;
    renderArtifact(null);
  }

  renderStageSummaries();
}

function clearMissionSelection() {
  state.currentSessionPayload = null;
  state.missionActions = null;
  state.missionDetail = null;
  state.missionTimeline = null;
  state.selectedArtifactId = null;
  state.selectedMissionId = null;
  state.selectedSessionId = null;

  renderMissionList();
  renderMissionSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderTimeline();
  renderSessionList();
  renderSessionDetail(null);
  renderArtifact(null);
  renderFlowState();
  renderDetailTabLabels();
  renderDetailContextbar();
  setActiveStep('step-setup');
  setActiveDetailTab('config');
}

async function selectMission(missionId) {
  if (!missionId) {
    return;
  }

  state.selectedMissionId = missionId;
  state.selectedArtifactId = null;
  renderMissionList();

  const [detail, timelinePayload, actionPayload] = await Promise.all([
    api(`/api/missions/${encodeURIComponent(missionId)}`),
    api(`/api/missions/${encodeURIComponent(missionId)}/timeline`),
    api(`/api/actions?missionId=${encodeURIComponent(missionId)}`),
  ]);

  state.missionDetail = detail;
  state.missionTimeline = timelinePayload;
  state.missionActions = actionPayload;
  setActiveStep(getFlowState().recommendedStep);

  renderMissionSummary();
  renderStageSummaries();
  renderMissionActions();
  renderReviewReadiness();
  renderTimeline();
  renderSessionList();

  const latestSession = (detail.sessions || []).at(-1) || null;
  if (latestSession) {
    await selectSession(latestSession.id);
  } else {
    state.selectedSessionId = null;
    state.currentSessionPayload = null;
    renderSessionDetail(null);
    renderArtifact(null);
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
  await selectMission(result.mission.id);
  setActiveStep('step-run');
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
    await selectMission(state.selectedMissionId);
    const pendingApproval = state.approvals.some((item) => item.missionId === state.selectedMissionId);
    const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
    setActiveStep(pendingApproval || pendingActionCount ? 'step-review' : 'step-output');
  } finally {
    elements.runMissionButton.disabled = false;
    elements.runMissionButton.textContent = '이 미션 실행';
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
      await selectMission(visibleMission[0].mission.id);
    }
  });
  elements.missionForm.addEventListener('submit', async (event) => {
    try {
      await handleMissionCreate(event);
    } catch (error) {
      window.alert(error.message);
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
    button.addEventListener('click', () => setActiveStep(button.dataset.stepTarget));
  });
  elements.detailTabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveDetailTab(button.dataset.detailTab));
  });
}

async function bootstrap() {
  attachEvents();
  renderPlaybooks();
  renderTemplates();
  setActiveStep('step-setup');

  try {
    await Promise.all([loadWorkspaces(), loadProviders(), loadApprovals(), loadMissions()]);
    const visibleMission = filteredMissions();
    if (visibleMission[0]?.mission?.id) {
      await selectMission(visibleMission[0].mission.id);
    } else {
      clearMissionSelection();
    }
  } catch (error) {
    window.alert(error.message);
  }
}

bootstrap();
