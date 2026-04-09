const state = {
  activeStep: 'step-setup',
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
  runMissionButton: document.getElementById('run-mission-button'),
  runProviderSelect: document.getElementById('run-provider-select'),
  sessionDetail: document.getElementById('session-detail'),
  sessionList: document.getElementById('session-list'),
  stepButtons: Array.from(document.querySelectorAll('[data-step-target]')),
  stepPanels: Array.from(document.querySelectorAll('.step-panel')),
  templateList: document.getElementById('template-list'),
  timelineList: document.getElementById('timeline-list'),
  toggleCreateButton: document.getElementById('toggle-create-button'),
  workspaceSelect: document.getElementById('workspace-select'),
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
  'env-missing': '환경 변수 누락',
  'execution-handoff': '실행 인계',
  failed: '실패',
  high: '높음',
  'implementation-proposal': '구현 제안서',
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

      if (action === 'open-create') {
        openComposer();
        return;
      }

      if (action === 'jump-step' || action === 'jump-section' || action === 'switch-tab') {
        setActiveStep(value || 'step-setup');
        return;
      }
    });
  });
}

function setActiveStep(stepId) {
  state.activeStep = stepId;
  elements.stepButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.stepTarget === stepId);
  });
  elements.stepPanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === stepId);
  });
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
      copy: '왼쪽 미션 큐에서 고르거나 템플릿으로 새 미션을 만드세요.',
      label: '미션 선택 또는 작성',
      pendingActionCount: 0,
      pendingApprovalCount: 0,
      recommendedStep: 'step-setup',
    };
  }

  const latestSession = state.missionDetail.summary?.latestSession || null;
  const pendingApprovalCount = state.approvals.filter((item) => item.missionId === state.selectedMissionId).length;
  const pendingActionCount = Number(state.missionActions?.summary?.pendingActionCount || 0);
  const completedSteps = ['step-setup'];

  if (!latestSession) {
    return {
      buttonLabel: '2단계 실행으로 이동',
      completedSteps,
      copy: '제공자를 선택하고 첫 실행을 시작해야 리뷰어 검토와 산출물이 생성됩니다.',
      label: '실행 준비',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-run',
    };
  }

  completedSteps.push('step-run');

  if (pendingApprovalCount > 0 || pendingActionCount > 0) {
    return {
      buttonLabel: '3단계 리뷰로 이동',
      completedSteps,
      copy: `승인 ${pendingApprovalCount}건, 후속 액션 ${pendingActionCount}건을 먼저 처리해야 최종 결과가 정리됩니다.`,
      label: '리뷰 필요',
      pendingActionCount,
      pendingApprovalCount,
      recommendedStep: 'step-review',
    };
  }

  completedSteps.push('step-review');

  return {
    buttonLabel: '4단계 결과 확인',
    completedSteps,
    copy: '산출물, 타임라인, 세션 결과를 검토하고 최종 아웃풋을 확정하세요.',
    label: '최종 결과 확인',
    pendingActionCount,
    pendingApprovalCount,
    recommendedStep: 'step-output',
  };
}

function renderFlowState() {
  const flow = getFlowState();

  if (elements.flowStatus) {
    elements.flowStatus.innerHTML = `
      <p class="flow-status-label">지금 해야 할 일</p>
      <strong class="flow-status-value">${escapeHtml(flow.label)}</strong>
      <p class="flow-status-copy">${escapeHtml(flow.copy)}</p>
      <div class="flow-status-actions">
        <button class="primary-button" type="button" data-ui-action="jump-step" data-ui-value="${escapeHtml(flow.recommendedStep)}">
          ${escapeHtml(flow.buttonLabel)}
        </button>
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

function renderMissionList() {
  const missions = filteredMissions();
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
      return `
        <div class="mission-row ${active}">
          <button type="button" data-mission-id="${escapeHtml(mission.id)}">
            <div class="status-row">
              <span class="status-badge ${getStatusClass(mission.status)}">${escapeHtml(getDisplayLabel(mission.status))}</span>
              ${
                latestSession
                  ? `<span class="mini-badge ${getStatusClass(latestSession.provider || '')}">${escapeHtml(
                      latestSession.provider || '미정',
                    )}</span>`
                  : ''
              }
            </div>
            <div class="item-title">${escapeHtml(mission.title)}</div>
            <div class="item-subtitle">${escapeHtml(mission.objective || workspace?.name || mission.workspaceId)}</div>
            <div class="item-meta">
              ${escapeHtml(workspace?.name || mission.workspaceId)} · ${escapeHtml(mission.mode)} · 생성 ${formatDate(mission.createdAt)}
              ${latestSession ? ` · 최근 ${escapeHtml(getDisplayLabel(latestSession.status))}` : ''}
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

function renderHeroMetrics() {
  if (!state.missionDetail) {
    elements.heroMetrics.innerHTML = '';
    return;
  }

  const summary = state.missionDetail.summary || {};
  const latestSession = summary.latestSession || {};
  const actionSummary = state.missionActions?.summary || {};
  const metrics = [
    ['미션 상태', getDisplayLabel(state.missionDetail.mission.status)],
    ['최근 제공자', latestSession.provider || '-'],
    ['최근 세션', getDisplayLabel(latestSession.status)],
    ['남은 후속 작업', String(actionSummary.pendingActionCount ?? 0)],
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
      <span class="hero-signal">미션 중심</span>
      <span class="hero-signal">승인 인지</span>
      <span class="hero-signal">산출물 중심</span>
    `;
    return;
  }

  const mission = state.missionDetail.mission;
  const playbook = inferPlaybook(mission);
  const latestSession = state.missionDetail.summary?.latestSession || {};
  const signals = [
    playbook ? `플레이북 ${playbook.title}` : '사용자 정의 플레이북',
    latestSession.provider ? `제공자 ${latestSession.provider}` : '제공자 선택 대기',
    mission.deliverableType ? `산출물 ${mission.deliverableType}` : '산출물 유형 미정',
    state.missionActions?.summary?.pendingActionCount
      ? `후속 작업 ${state.missionActions.summary.pendingActionCount}건`
      : '처리할 후속 작업 없음',
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
  elements.missionSubtitle.textContent = mission.objective || '목표가 없습니다.';
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
    elements.reviewReadiness.innerHTML = emptyStateCard({
      action: 'jump-step',
      actionLabel: '1단계로 이동',
      actionValue: 'step-setup',
      icon: 'RV',
      message: '미션을 고르면 승인, 후속 요청, 산출물 기준으로 준비 상태를 자동 계산합니다.',
      title: '리뷰 준비 상태를 계산할 미션이 없습니다',
    });
    wireQuickActions(elements.reviewReadiness);
    return;
  }

  const readinessItems = getReadinessItems();
  elements.reviewReadiness.innerHTML = readinessItems
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

  elements.actionList.innerHTML = items
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
    .join('');

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

  elements.approvalList.innerHTML = items
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
    .join('');

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
      return `
        <div class="session-row ${active}">
          <button type="button" data-session-id="${escapeHtml(session.id)}">
            <div class="status-row">
              <span class="status-badge ${getStatusClass(session.status)}">${escapeHtml(getDisplayLabel(session.status))}</span>
              <span class="mini-badge ${getStatusClass(session.provider || '')}">${escapeHtml(session.provider || '미정')}</span>
            </div>
            <div class="item-title">${escapeHtml(session.id)}</div>
            <div class="item-meta">
              ${formatDate(session.startedAt)} · 단계 ${escapeHtml(getDisplayLabel(session.currentStage))} · 실행 ${escapeHtml(
                String(session.agentRunCount || 0),
              )}
            </div>
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
    return;
  }

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
        <h4>실행 이력</h4>
        ${runs || '<p class="empty-state">실행 정보가 없습니다.</p>'}
      </div>
      <div class="inspector-group">
        <h4>승인 이력</h4>
        ${approvals || '<p class="empty-state">승인 이력이 없습니다.</p>'}
      </div>
      <div class="inspector-group">
        <h4>산출물 목록</h4>
        ${artifacts || '<p class="empty-state">산출물이 없습니다.</p>'}
      </div>
    </div>
  `;

  elements.sessionDetail.querySelectorAll('[data-artifact-id]').forEach((button) => {
    button.addEventListener('click', () => loadArtifact(button.dataset.artifactId));
  });
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
    return;
  }

  elements.artifactMeta.innerHTML = `
    <strong>${escapeHtml(payload.artifact.title || payload.artifact.fileName || payload.artifact.id)}</strong>
    <div class="item-meta mono">${escapeHtml(payload.path)}</div>
  `;
  elements.artifactViewer.innerHTML = markdownToHtml(payload.content || '');
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
      setActiveStep('step-output');
    });
  });
}

async function selectSession(sessionId) {
  if (!state.selectedMissionId || !sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
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
  renderMissionActions();
  renderReviewReadiness();
  renderTimeline();
  renderSessionList();
  renderSessionDetail(null);
  renderArtifact(null);
  renderFlowState();
  setActiveStep('step-setup');
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
