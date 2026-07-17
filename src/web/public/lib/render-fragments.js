// Extracted pure UI helpers (round 2). Byte-identical function/const bodies moved
// from app.js; served as an ES module under /lib/.
import {
  canRunActionInboxRerun,
  canRunProviderAttentionRemediation,
  renderActionInboxGuidance,
} from './action-inbox-guidance.js';
import {
  escapeHtml,
  formatDate,
  getDisplayLabel,
  getStatusClass,
} from './html-format.js';
import {
  formatLearningPromotionDetails,
  formatSpecialistFollowUpRoute,
  formatSpecialistShortLabel,
  getRetrievalArtifactOpenLabel,
  getRetrievalSourceActionLabel,
} from './status-labels.js';
import {
  getLearningPromotionCandidateId,
} from './text-format.js';

export const LOOP_ENGINEERING_CYCLE = [
  { id: 'discover', label: 'Discover', detail: '목표, 자료, 제약, 이전 실행 흔적을 먼저 수집합니다.' },
  { id: 'plan', label: 'Plan', detail: '작업 단위, 담당 agent, 검증 기준을 실행 전에 고정합니다.' },
  { id: 'execute', label: 'Execute', detail: '선택한 orchestration profile 안에서 specialist workstream을 실행합니다.' },
  { id: 'verify', label: 'Verify', detail: 'reviewer, smoke, evidence gate로 결과를 확인합니다.' },
  { id: 'iterate', label: 'Iterate', detail: '검증 실패는 stop-condition이나 action inbox로 되돌립니다.' },
];

export const LOOP_ENGINEERING_FOUNDATIONS = [
  'Automations',
  'Worktrees',
  'Skills',
  'Connectors',
  'Subagents',
  'Memory',
];

export const HARNESS_ENGINEERING_GUARDRAILS = [
  { label: 'Control plane', detail: 'prompt, policy, tool schema, approval, sandbox를 한 경계로 다룹니다.' },
  { label: 'Query heartbeat', detail: 'model call은 loop의 한 단계이고 state, interrupts, recovery가 heartbeat를 유지합니다.' },
  { label: 'Context budget', detail: 'memory와 compact는 더 많은 텍스트가 아니라 작업 의미를 보존하는 예산 장치입니다.' },
  { label: 'Recovery branch', detail: '오류는 예외가 아니라 main path이며 loop-safe counter와 stop-condition이 필요합니다.' },
  { label: 'Independent verify', detail: '구현과 검증을 분리해 completion이 problem solved로 위장하지 못하게 합니다.' },
  { label: 'Local governance', detail: 'AGENTS, skills, hooks, team rules는 재사용 가능한 운영 제도로 유지합니다.' },
];

export function renderSpecialistTagList(kinds = [], { emptyLabel = '추가 specialist AI 없음' } = {}) {
  const normalizedKinds = Array.isArray(kinds) ? kinds.filter(Boolean) : [];
  if (!normalizedKinds.length) {
    return `<span class="tag tag-muted">${escapeHtml(emptyLabel)}</span>`;
  }

  return normalizedKinds
    .map((kind) => `<span class="tag">${escapeHtml(formatSpecialistShortLabel(kind))}</span>`)
    .join('');
}

export function renderRetrievalSourceFocusButton({
  active = false,
  buttonText = '',
  className = 'tag tag-muted',
  prefixLabel = '',
  sourceLabel = '',
  sourceType = '',
} = {}) {
  const sourceFocusLabel = getRetrievalSourceActionLabel(
    active ? '현재 retrieval source 보기' : 'retrieval source 보기',
    sourceType,
    sourceLabel,
  );
  const nextClassName = `${className}${active ? ' is-active-focus' : ''}`;
  const nextButtonText = `${active ? '현재 · ' : prefixLabel}${buttonText}`;
  return `<button class="${escapeHtml(nextClassName)}" type="button" data-retrieval-source-type="${escapeHtml(sourceType)}" data-retrieval-source-label="${escapeHtml(sourceLabel)}" aria-pressed="${active ? 'true' : 'false'}" aria-label="${escapeHtml(sourceFocusLabel)}" title="${escapeHtml(sourceFocusLabel)}">${escapeHtml(nextButtonText)}</button>`;
}

export function renderRetrievalArtifactOpenButton({
  artifact = {},
  buttonText = 'retrieval 근거 열기',
  className = 'ghost-button',
  openLabel = '',
} = {}) {
  const artifactId = String(artifact?.id || '').trim();
  const sessionId = String(artifact?.sessionId || '').trim();
  if (!artifactId || !sessionId) {
    return '';
  }
  const actionLabel = openLabel || getRetrievalArtifactOpenLabel(artifact);
  return `<button class="${escapeHtml(className)}" type="button" data-retrieval-artifact-open="${escapeHtml(artifactId)}" data-retrieval-session-id="${escapeHtml(sessionId)}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderRetrievalSourceFocusClearButton({
  actionLabel = '',
  buttonText = 'focus 해제',
  className = 'ghost-button',
} = {}) {
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="clear-retrieval-source-focus" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleasePreflightAllButton({
  actionLabel = '전체 preflight 실행',
  buttonText = '전체 preflight 실행',
  className = 'ghost-button',
} = {}) {
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="run-release-preflight-all" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseStatusRefreshButton({
  actionLabel = '상태 다시 읽기',
  buttonText = '상태 다시 읽기',
  className = 'primary-button',
} = {}) {
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="refresh-release-status" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseSimpleActionButton({
  action = '',
  actionLabel = '',
  attributes = '',
  buttonText = '',
  className = 'ghost-button',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  const attributeMarkup = attributes ? ` ${attributes}` : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseConfirmActionButton({
  action = '',
  actionLabel = '',
  attributes = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = null,
  pressed = false,
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  const attributeMarkup = attributes ? ` ${attributes}` : '';
  const hasDisabledState = disabled === true || disabled === false;
  const disabledMarkup = hasDisabledState
    ? ` aria-disabled="${disabled ? 'true' : 'false'}"${disabled ? ' disabled' : ''}`
    : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}" aria-pressed="${pressed ? 'true' : 'false'}"${disabledMarkup} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseTabActionButton({
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  value = '',
} = {}) {
  const tabValue = String(value || '').trim();
  if (!/^[a-z0-9-]+$/.test(tabValue)) {
    return '';
  }
  return renderReleaseSimpleActionButton({
    action: 'switch-tab',
    actionLabel,
    attributes: `data-ui-value="${escapeHtml(tabValue)}"`,
    buttonText,
    className,
  });
}

export function renderReleaseClearActionButton({
  action = '',
  actionLabel = '',
  attributes = '',
  buttonText = '',
  className = 'ghost-button',
  pressed = null,
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^clear-release-[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  const attributeMarkup = attributes ? ` ${attributes}` : '';
  const pressedMarkup = pressed === true || pressed === false ? ` aria-pressed="${pressed ? 'true' : 'false'}"` : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}"${pressedMarkup} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseBlockerFilterButton({
  actionLabel = '',
  buttonText = '',
  category = null,
  className = 'ghost-button',
  countAttributeName = '',
  countAttributeValue = null,
  disabled = false,
  includeShared = null,
  owner = null,
  pressed = false,
  provider = null,
} = {}) {
  const attributeList = [];
  const countName = String(countAttributeName || '').trim();
  if (/^data-release-current-open-blocker-[a-z-]+$/.test(countName) && countAttributeValue !== null) {
    attributeList.push(`${countName}="${escapeHtml(String(countAttributeValue))}"`);
  }
  attributeList.push('data-ui-action="filter-release-blockers"');
  if (category !== null) {
    attributeList.push(`data-ui-category="${escapeHtml(String(category))}"`);
  }
  if (includeShared !== null) {
    attributeList.push(`data-ui-include-shared="${includeShared ? 'true' : 'false'}"`);
  }
  if (owner !== null) {
    attributeList.push(`data-ui-owner="${escapeHtml(String(owner))}"`);
  }
  if (provider !== null) {
    attributeList.push(`data-ui-provider="${escapeHtml(String(provider))}"`);
  }
  return `<button class="${escapeHtml(className)}" type="button" ${attributeList.join(' ')} aria-pressed="${pressed ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled' : ''}>${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseBlockerFocusButton({
  action = 'focus-release-blocker',
  actionLabel = '',
  blocker = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = false,
  index = null,
  pressed = false,
  provider = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(focus-release-blocker|focus-release-production-blocker)$/.test(actionName)) {
    return '';
  }
  const attributeList = [`data-ui-action="${escapeHtml(actionName)}"`];
  const blockerId = String(blocker || '').trim();
  if (blockerId) {
    attributeList.push(`data-ui-blocker="${escapeHtml(blockerId)}"`);
  }
  if (index !== null) {
    attributeList.push(`data-ui-index="${escapeHtml(String(index))}"`);
  }
  const providerName = String(provider || '').trim();
  if (providerName) {
    attributeList.push(`data-ui-provider="${escapeHtml(providerName)}"`);
  }
  return `<button class="${escapeHtml(className)}" type="button" ${attributeList.join(' ')} aria-pressed="${pressed ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled' : ''}>${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseProviderActionButton({
  action = '',
  actionLabel = '',
  attributes = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = null,
  pressed = null,
  provider = '',
} = {}) {
  const actionName = String(action || '').trim();
  const providerName = String(provider || '').trim();
  if (!/^(run-release-preflight|refresh-release-status-live)$/.test(actionName) || !providerName) {
    return '';
  }
  const attributeMarkup = attributes ? ` ${attributes}` : '';
  const pressedMarkup = pressed === true || pressed === false ? ` aria-pressed="${pressed ? 'true' : 'false'}"` : '';
  const disabledMarkup = disabled === true || disabled === false
    ? ` aria-disabled="${disabled ? 'true' : 'false'}"${disabled ? ' disabled' : ''}`
    : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}" data-ui-provider="${escapeHtml(providerName)}"${pressedMarkup}${disabledMarkup} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseProviderFocusActionButton({
  action = 'focus-release-provider',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = false,
  pressed = false,
  provider = '',
} = {}) {
  const actionName = String(action || '').trim();
  const providerName = String(provider || '').trim();
  if (!/^(focus-release-provider|clear-release-provider-focus)$/.test(actionName) || !providerName) {
    return '';
  }
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="${escapeHtml(actionName)}" data-ui-provider="${escapeHtml(providerName)}" aria-pressed="${pressed ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled' : ''}>${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseRecommendationActionButton({
  action = '',
  actionLabel = '',
  buttonText = '실행',
  className = 'ghost-button',
  provider = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  const providerName = String(provider || '').trim();
  const providerAttribute = providerName ? ` data-ui-provider="${escapeHtml(providerName)}"` : '';
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="${escapeHtml(actionName)}"${providerAttribute} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderHarnessFilterChips(items = []) {
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

export function renderMemoryBrowseActionButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = null,
  memoryId = '',
  scope = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(reset-browse|edit|delete|prev-page|next-page)$/.test(actionName)) {
    return '';
  }
  const memoryIdValue = String(memoryId || '').trim();
  const scopeValue = String(scope || '').trim();
  const memoryIdAttribute = memoryIdValue ? ` data-memory-id="${escapeHtml(memoryIdValue)}"` : '';
  const scopeAttribute = scopeValue ? ` data-memory-scope="${escapeHtml(scopeValue)}"` : '';
  const disabledState = disabled === null ? null : Boolean(disabled);
  const disabledAttributes = disabledState === null ? '' : ` aria-disabled="${disabledState ? 'true' : 'false'}"${disabledState ? ' disabled' : ''}`;
  return `<button class="${escapeHtml(className)}" type="button" data-memory-action="${escapeHtml(actionName)}"${memoryIdAttribute}${scopeAttribute}${disabledAttributes} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderMissionAttachmentUploadButton({
  actionLabel = '',
  buttonText = '첨부 업로드',
  className = 'ghost-button',
} = {}) {
  return `<button class="${escapeHtml(className)}" type="submit" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderEmptyStateActionButton({ action = '', actionLabel = '', actionValue = '' } = {}) {
  if (!actionLabel) {
    return '';
  }
  const emptyActionLabel = actionValue ? `${actionLabel}: ${actionValue}` : actionLabel;
  return `<button class="ghost-button" type="button" data-ui-action="${escapeHtml(action)}" data-ui-value="${escapeHtml(actionValue)}" aria-label="${escapeHtml(emptyActionLabel)}" title="${escapeHtml(emptyActionLabel)}">${escapeHtml(actionLabel)}</button>`;
}

export function emptyStateCard({ icon = '01', title, message, actionLabel = '', action = '', actionValue = '' }) {
  const emptyActionButton = renderEmptyStateActionButton({ action, actionLabel, actionValue });
  return `
    <div class="empty-card">
      <div class="empty-icon">${escapeHtml(icon)}</div>
      <div class="empty-body">
        <h3 class="empty-title">${escapeHtml(title)}</h3>
        <p class="empty-copy">${escapeHtml(message)}</p>
      </div>
      ${
        emptyActionButton
          ? `<div class="empty-actions">
              ${emptyActionButton}
            </div>`
          : ''
      }
    </div>
  `;
}

export function renderDoctorDetailPanel({ attentionChecks = [], providers = [] } = {}) {
  const visibleChecks = attentionChecks.slice(0, 6);
  const hiddenCheckCount = Math.max(0, attentionChecks.length - visibleChecks.length);
  const providerRows = providers
    .filter((provider) => provider.id !== 'stub' || provider.configured)
    .map((provider) => {
      const configured = Boolean(provider.configured);
      return `
        <li class="doctor-detail-row">
          <span class="mini-badge ${configured ? 'status-configured' : 'status-env-missing'}">${escapeHtml(configured ? 'configured' : 'env missing')}</span>
          <strong>${escapeHtml(provider.displayName || provider.id)}</strong>
          <span>${escapeHtml(provider.missingEnv?.length ? provider.missingEnv.join(', ') : provider.transport || '-')}</span>
        </li>
      `;
    })
    .join('');
  const checkRows = visibleChecks
    .map(
      (check) => `
        <li class="doctor-detail-row">
          <span class="mini-badge ${check.status === 'fail' ? 'status-failed' : 'status-pending'}">${escapeHtml(check.status)}</span>
          <strong>${escapeHtml(check.id || check.path || check.script || 'check')}</strong>
          <span>${escapeHtml(check.message || check.path || check.script || '-')}</span>
        </li>
      `,
    )
    .join('');

  return `
    <div id="doctor-detail-panel" class="doctor-detail-panel">
      <div class="doctor-detail-group">
        <span class="flow-status-label">주의 항목</span>
        <ul class="doctor-detail-list">
          ${
            checkRows
              || '<li class="doctor-detail-row"><span class="mini-badge status-completed">clear</span><strong>추가 조치 없음</strong><span>fail 또는 warn check가 없습니다.</span></li>'
          }
        </ul>
        ${hiddenCheckCount ? `<p class="doctor-detail-note">추가 check ${escapeHtml(hiddenCheckCount)}건은 API 응답에 포함됩니다.</p>` : ''}
      </div>
      <div class="doctor-detail-group">
        <span class="flow-status-label">Provider env</span>
        <ul class="doctor-detail-list">
          ${providerRows}
        </ul>
      </div>
    </div>
  `;
}

export function renderTemplateChipButton({ index = 0, template = {} } = {}) {
  const templateTitle = String(template.title || '');
  const templateSubtitle = String(template.subtitle || '');
  const actionLabel = `템플릿 적용: ${templateTitle}`;

  return `
    <button type="button" class="template-chip" data-template-index="${escapeHtml(String(index))}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">
      <strong>${escapeHtml(templateTitle)}</strong>
      <span>${escapeHtml(templateSubtitle)}</span>
    </button>
  `;
}

export function renderPlaybookCardButton({ playbook = {}, active = false } = {}) {
  const playbookId = String(playbook.id || '');
  const playbookTitle = String(playbook.title || '');
  const playbookSubtitle = String(playbook.subtitle || '');
  const playbookDescription = String(playbook.description || '');
  const playbookOrigin = String(playbook.origin || '');
  const selectionLabel = active ? `현재 플레이북 선택됨: ${playbookTitle}` : `플레이북 선택: ${playbookTitle}`;

  return `
    <button type="button" class="playbook-card ${active ? 'is-active' : ''}" data-playbook-id="${escapeHtml(playbookId)}" aria-pressed="${active ? 'true' : 'false'}" aria-label="${escapeHtml(selectionLabel)}" title="${escapeHtml(selectionLabel)}">
      <div class="status-row">
        <span class="mini-badge">${escapeHtml(playbookOrigin)}</span>
      </div>
      <div class="item-title">${escapeHtml(playbookTitle)}</div>
      <div class="item-subtitle">${escapeHtml(playbookSubtitle)}</div>
      <div class="item-meta">${escapeHtml(playbookDescription)}</div>
    </button>
  `;
}

export function renderAgentIntentPillButton({ intent = {}, active = false } = {}) {
  const blueprintId = String(intent.blueprintId || '');
  const intentLabel = String(intent.label || '');
  const intentDescription = String(intent.description || '');
  const selectionLabel = active ? `현재 AI 구성 의도: ${intentLabel}` : `AI 구성 의도 선택: ${intentLabel}`;

  return `
    <button
      type="button"
      class="agent-intent-pill ${active ? 'is-active' : ''}"
      data-agent-blueprint-id="${escapeHtml(blueprintId)}"
      aria-pressed="${active ? 'true' : 'false'}"
      aria-label="${escapeHtml(selectionLabel)}"
      title="${escapeHtml(selectionLabel)}"
    >
      <strong>${escapeHtml(intentLabel)}</strong>
      <span>${escapeHtml(intentDescription)}</span>
    </button>
  `;
}

export function renderAgentBlueprintCardButton({ blueprint = {}, active = false } = {}) {
  const blueprintId = String(blueprint.id || '');
  const blueprintTitle = String(blueprint.title || '');
  const blueprintDescription = String(blueprint.description || '');
  const blueprintEmphasis = String(blueprint.emphasis || '');
  const specialistKinds = Array.isArray(blueprint.specialistKinds) ? blueprint.specialistKinds : [];
  const blueprintBestFor = String(blueprint.bestFor || '가볍게 시작할 때');
  const blueprintOutcome = String(blueprint.outcome || '기본 실행 제안');
  const recommendedProvider = String(blueprint.recommendedProvider || '');
  const selectionLabel = active ? `현재 AI 구성 카드: ${blueprintTitle}` : `AI 구성 카드 선택: ${blueprintTitle}`;

  return `
    <button
      type="button"
      class="agent-blueprint-card ${active ? 'is-active' : ''}"
      data-agent-blueprint-id="${escapeHtml(blueprintId)}"
      aria-pressed="${active ? 'true' : 'false'}"
      aria-label="${escapeHtml(selectionLabel)}"
      title="${escapeHtml(selectionLabel)}"
    >
      <div class="agent-blueprint-card-top">
        <span class="mini-badge">${escapeHtml(blueprintEmphasis)}</span>
        <span class="agent-blueprint-card-count">${escapeHtml(`+${specialistKinds.length}`)}</span>
      </div>
      <strong>${escapeHtml(blueprintTitle)}</strong>
      <p>${escapeHtml(blueprintDescription)}</p>
      <div class="agent-blueprint-card-detail">
        <span>추천 상황</span>
        <strong>${escapeHtml(blueprintBestFor)}</strong>
      </div>
      <div class="agent-blueprint-card-detail">
        <span>결과</span>
        <strong>${escapeHtml(blueprintOutcome)}</strong>
      </div>
      ${
        recommendedProvider
          ? `<div class="agent-blueprint-card-detail">
              <span>권장 provider</span>
              <strong>${escapeHtml(recommendedProvider)}</strong>
            </div>`
          : ''
      }
      <div class="tag-list">
        ${renderSpecialistTagList(specialistKinds)}
      </div>
    </button>
  `;
}

export function renderLoopEngineeringCycleList() {
  return LOOP_ENGINEERING_CYCLE.map(
    (step, index) => `
      <div class="loop-engineering-step" data-loop-engineering-step="${escapeHtml(step.id)}">
        <span class="loop-engineering-index">${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
        <div>
          <strong>${escapeHtml(step.label)}</strong>
          <p>${escapeHtml(step.detail)}</p>
        </div>
      </div>
    `,
  ).join('');
}

export function renderLoopEngineeringFoundationTags() {
  return LOOP_ENGINEERING_FOUNDATIONS.map(
    (foundation) => `<span class="tag tag-muted">${escapeHtml(foundation)}</span>`,
  ).join('');
}

export function renderHarnessEngineeringGuardrails() {
  return HARNESS_ENGINEERING_GUARDRAILS.map(
    (guardrail) => `
      <div class="harness-guardrail">
        <strong>${escapeHtml(guardrail.label)}</strong>
        <p>${escapeHtml(guardrail.detail)}</p>
      </div>
    `,
  ).join('');
}

export function renderProviderFallbackEventActionButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(reset|package)$/.test(actionName)) {
    return '';
  }
  const actionAttribute = `data-provider-fallback-event-${actionName}`;
  return `<button class="${escapeHtml(className)}" type="button" ${actionAttribute}="true" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderMissionSelectionButton({
  active = false,
  content = '',
  mission = {},
  missionSelectionLabel = '',
} = {}) {
  return renderSelectableDetailButton({
    active: Boolean(active),
    content,
    dataAttribute: 'data-mission-id',
    dataValue: mission.id,
    selectionLabel: missionSelectionLabel,
  });
}

export function renderExecutionControlActionButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  value = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(execution-rollback-preview|execution-rollback|execution-start|execution-preflight|execution-stop)$/.test(actionName)) {
    return '';
  }
  const actionValue = String(value || '').trim();
  const valueAttribute = actionValue ? ` data-ui-value="${escapeHtml(actionValue)}"` : '';
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="${escapeHtml(actionName)}"${valueAttribute} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderExecutionApprovalPendingButton({
  actionLabel = '',
  buttonText = '승인 대기 중',
  className = 'secondary-button',
} = {}) {
  return `<button class="${escapeHtml(className)}" type="button" aria-disabled="true" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}" disabled>${escapeHtml(buttonText)}</button>`;
}

export function renderLearningPromotionCommandMeta(item) {
  if (item?.actionType !== 'learning-promotion') {
    return '';
  }

  return [
    ['resolve', item.resolveCommand],
    ['expire', item.expireCommand],
    ['rollback', item.rollbackCommand],
    ['stop-condition', item.stopConditionRejectCommand],
    ['reminder', item.remindCommand],
    ['user-override-set', item.userLearningSelectionOverrideSetCommand],
    ['user-override-clear', item.userLearningSelectionOverrideClearCommand],
    ['override-set', item.workspaceLearningSelectionOverrideSetCommand],
    ['override-clear', item.workspaceLearningSelectionOverrideClearCommand],
  ]
    .filter(([, command]) => command)
    .map(([label, command]) => `<div class="item-meta mono">${escapeHtml(label)}: ${escapeHtml(command)}</div>`)
    .join('');
}

export function renderLearningPromotionActionButton({ attributes = '', buttonClass = 'ghost-button', candidateId = '', label = '' } = {}) {
  const actionLabel = `${label}: learning candidate ${candidateId}`;
  return `<button class="${escapeHtml(buttonClass)}" type="button" ${attributes} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(label)}</button>`;
}

export function renderLearningPromotionAuditCopyButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-learning-promotion-audit-copy="${escapeHtml(candidateId)}"`,
    candidateId,
    label: 'audit package 복사',
  });
}

export function renderLearningPromotionResolveButton({
  buttonClass = 'ghost-button',
  candidateId = '',
  decision = '',
  label = '',
} = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-learning-promotion-resolve="${escapeHtml(candidateId)}" data-learning-promotion-decision="${escapeHtml(decision)}"`,
    buttonClass,
    candidateId,
    label,
  });
}

export function renderLearningPromotionExpireButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-learning-promotion-expire="${escapeHtml(candidateId)}"`,
    buttonClass: 'danger-button',
    candidateId,
    label: '대기 만료',
  });
}

export function renderLearningPromotionRemindButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-learning-promotion-remind="${escapeHtml(candidateId)}"`,
    buttonClass: 'secondary-button',
    candidateId,
    label: 'stop-condition 재알림',
  });
}

export function renderLearningPromotionRollbackButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-learning-promotion-rollback="${escapeHtml(candidateId)}"`,
    buttonClass: 'danger-button',
    candidateId,
    label: '학습 rollback',
  });
}

export function renderWorkspaceLearningSelectionOverrideSetButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-workspace-learning-selection-override-set="${escapeHtml(candidateId)}"`,
    buttonClass: 'secondary-button',
    candidateId,
    label: '선택 고정',
  });
}

export function renderUserLearningSelectionOverrideSetButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-user-learning-selection-override-set="${escapeHtml(candidateId)}"`,
    buttonClass: 'secondary-button',
    candidateId,
    label: '사용자 선택 고정',
  });
}

export function renderUserLearningSelectionOverrideClearButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-user-learning-selection-override-clear="${escapeHtml(candidateId)}"`,
    buttonClass: 'danger-button',
    candidateId,
    label: '사용자 고정 해제',
  });
}

export function renderWorkspaceLearningSelectionOverrideClearButton({ candidateId = '' } = {}) {
  return renderLearningPromotionActionButton({
    attributes: `data-workspace-learning-selection-override-clear="${escapeHtml(candidateId)}"`,
    buttonClass: 'danger-button',
    candidateId,
    label: '고정 해제',
  });
}

export function renderLearningPromotionActionButtons(item) {
  if (item?.actionType !== 'learning-promotion') {
    return '';
  }

  const candidateId = getLearningPromotionCandidateId(item);
  if (!candidateId) {
    return '';
  }

  const buttons = [];
  buttons.push(renderLearningPromotionAuditCopyButton({ candidateId }));

  if (item.promotionStatus === 'pending-review') {
    buttons.push(
      renderLearningPromotionResolveButton({
        buttonClass: 'primary-button',
        candidateId,
        decision: 'approve',
        label: '학습 승인',
      }),
    );
    buttons.push(
      renderLearningPromotionResolveButton({
        candidateId,
        decision: 'reject',
        label: '학습 반려',
      }),
    );
    buttons.push(
      renderLearningPromotionExpireButton({ candidateId }),
    );
  }

  if (item.promotionStatus === 'verification-blocked') {
    if (item.needsReminder) {
      buttons.push(
        renderLearningPromotionRemindButton({ candidateId }),
      );
    }
    buttons.push(
      renderLearningPromotionResolveButton({
        buttonClass: 'danger-button',
        candidateId,
        decision: 'reject',
        label: 'stop-condition 반려',
      }),
    );
  }

  if (item.rollbackEligible) {
    buttons.push(
      renderLearningPromotionRollbackButton({ candidateId }),
    );
  }

  if (item.userLearningSelectionOverride) {
    buttons.push(renderUserLearningSelectionOverrideSetButton({ candidateId }));
    if (item.userLearningSelectionOverrideClearCommand) {
      buttons.push(renderUserLearningSelectionOverrideClearButton({ candidateId }));
    }
  }

  if (item.workspaceLearningSelectionOverride) {
    buttons.push(renderWorkspaceLearningSelectionOverrideSetButton({ candidateId }));
    if (item.workspaceLearningSelectionOverrideClearCommand) {
      buttons.push(renderWorkspaceLearningSelectionOverrideClearButton({ candidateId }));
    }
  }

  return buttons.join('');
}

export function renderActionInboxSummaryChip(label, value) {
  return `<div class="summary-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? 0))}</strong></div>`;
}

export function renderProviderAttentionRemediationButton({
  item = {},
  mode = 'primary',
  buttonText = '제공자 복구',
  className = 'primary-button',
  actionLabelPrefix = '제공자 복구',
} = {}) {
  const actionLabel = `${actionLabelPrefix}: ${item.title || item.actionId || item.id || item.missionId}`;
  return `<button class="${escapeHtml(className)}" type="button" data-provider-attention-remediate="${escapeHtml(item.actionId)}" data-provider-attention-mode="${escapeHtml(mode)}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderMissionActionItemButton({
  item = {},
  dataAttribute = '',
  dataValue = '',
  actionLabelPrefix = '',
  buttonText = '',
  className = 'ghost-button',
} = {}) {
  const attributeName = String(dataAttribute || '').trim();
  if (!/^data-[a-z0-9-]+$/.test(attributeName)) {
    return '';
  }
  const actionLabel = `${actionLabelPrefix}: ${item.title || item.actionId || item.id || item.missionId}`;
  return `<button class="${escapeHtml(className)}" type="button" ${attributeName}="${escapeHtml(dataValue)}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderApprovalActionButton({
  dataAttribute = '',
  dataValue = '',
  actionLabelPrefix = '',
  actionLabelValue = '',
  buttonText = '',
  className = 'ghost-button',
} = {}) {
  const attributeName = String(dataAttribute || '').trim();
  if (!/^data-[a-z0-9-]+$/.test(attributeName)) {
    return '';
  }
  const actionLabel = `${actionLabelPrefix}: ${actionLabelValue}`;
  return `<button class="${escapeHtml(className)}" type="button" ${attributeName}="${escapeHtml(dataValue)}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderSelectableDetailButton({
  className = '',
  dataAttribute = '',
  dataValue = '',
  active = false,
  selectionLabel = '',
  content = '',
} = {}) {
  const attributeName = String(dataAttribute || '').trim();
  if (attributeName && !/^data-[a-z0-9-]+$/.test(attributeName)) {
    return '';
  }
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
  const dataAttributeMarkup = attributeName ? ` ${attributeName}="${escapeHtml(dataValue)}"` : '';
  return `<button type="button"${classAttribute}${dataAttributeMarkup} aria-pressed="${active ? 'true' : 'false'}" aria-label="${escapeHtml(selectionLabel)}" title="${escapeHtml(selectionLabel)}">${content}</button>`;
}

export function renderOutputToolbarToggleButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  expanded = false,
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="${escapeHtml(actionName)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderOutputTabButton({ outputToolbarTargetLabel = '', tab = {}, tabType = 'primary' } = {}) {
  const tabId = String(tab.id || '').trim();
  const tabLabel = String(tab.label || '').trim();
  const normalizedTabType = tabType === 'secondary' ? 'secondary' : 'primary';
  const tabTypeLabel = normalizedTabType === 'secondary' ? '보조' : '주';
  if (!tabId || !tabLabel) {
    return '';
  }
  return renderSelectableDetailButton({
    active: Boolean(tab.isActive),
    className: `detail-${normalizedTabType}-nav-button${tab.isActive ? ' is-active' : ''}`,
    content: escapeHtml(tabLabel),
    dataAttribute: `data-output-${normalizedTabType}-tab`,
    dataValue: tabId,
    selectionLabel: `결과 ${tabTypeLabel} 탭 열기: ${tabLabel} · ${outputToolbarTargetLabel}`,
  });
}

export function renderFlowQuickActionButton({
  action = '',
  actionLabel = '',
  buttonText = '',
  className = 'ghost-button',
  value = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^[a-z0-9-]+$/.test(actionName)) {
    return '';
  }
  const normalizedValue = String(value || '').trim();
  const valueAttribute = normalizedValue ? ` data-ui-value="${escapeHtml(normalizedValue)}"` : '';
  return `<button class="${escapeHtml(className)}" type="button" data-ui-action="${escapeHtml(actionName)}"${valueAttribute} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderActionInboxFallbackStopFilterSelect({
  hasFallbackStopReasonOptions = false,
  options = '',
  placeholder = 'fallback stop 없음',
} = {}) {
  const selectTitle = hasFallbackStopReasonOptions
    ? 'fallback stop reason 필터 선택'
    : '선택 가능한 fallback stop reason이 없습니다';
  return `
      <select data-action-inbox-fallback-stop-filter="true" aria-label="${escapeHtml(selectTitle)}" title="${escapeHtml(selectTitle)}" ${hasFallbackStopReasonOptions ? '' : 'disabled'}>
        <option value="">${escapeHtml(placeholder)}</option>
        ${options}
      </select>
    `;
}

export function renderActionInboxCallout({ count = 0, hasActiveFilter = false, visibleFilterLabel = '전체' } = {}) {
  const message = !hasActiveFilter
    ? '즉시 실행 가능한 복구는 기존 action 경계에서 처리하고, 외부 승인·인계는 담당자의 결정 기록을 먼저 남깁니다.'
    : `${visibleFilterLabel} 필터로 표시 중입니다. 전체 작업 수는 summary chip에서 유지됩니다.`;
  return `
    <div class="review-callout review-callout-action">
      <strong>후속 작업 ${escapeHtml(String(count))}건</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderActionInboxItemStatus(item = {}) {
  const actionClass = item.actionClass || 'open';
  const priority = item.priority || 'medium';
  return `
          <div class="status-row">
            <span class="status-badge ${getStatusClass(actionClass)}">${escapeHtml(getDisplayLabel(item.actionClass, actionClass))}</span>
            <span class="mini-badge ${getStatusClass(priority)}">${escapeHtml(getDisplayLabel(item.priority, priority))}</span>
          </div>`;
}

export function renderActionInboxItemHeader(item = {}) {
  return `
          <div class="item-title">${escapeHtml(item.title || item.actionId || item.id)}</div>
          <div class="item-subtitle">${escapeHtml(item.reason || '')}</div>
          <div class="item-meta">유형 ${escapeHtml(item.actionType || '-')} · 기한 ${escapeHtml(formatDate(item.dueAt))}</div>`;
}

export function renderActionInboxItemCommandMeta(item = {}) {
  const metaRows = [
    [item.fallbackRecommendedCommand ? `fallback: ${item.fallbackRecommendedCommand}` : '', 'item-meta mono'],
    [
      item.recoverableFallbackRecommendedCommand
        ? `recoverable-only: ${item.recoverableFallbackRecommendedCommand}`
        : '',
      'item-meta mono',
    ],
    [
      item.actionType === 'specialist-follow-up' ? formatSpecialistFollowUpRoute(item) : '',
      'item-meta mono',
    ],
    [
      item.actionType === 'learning-promotion' ? formatLearningPromotionDetails(item) : '',
      'item-meta',
    ],
  ];
  return metaRows
    .filter(([value]) => value)
    .map(([value, className]) => `<div class="${escapeHtml(className)}">${escapeHtml(value)}</div>`)
    .join('');
}

export function renderActionInboxItemActions(item = {}) {
  const actionButtons = [
    item.missionId
      ? renderMissionActionItemButton({
          actionLabelPrefix: '미션 열기',
          buttonText: '미션 열기',
          className: 'secondary-button',
          dataAttribute: 'data-action-open',
          dataValue: item.missionId,
          item,
        })
      : '',
    canRunProviderAttentionRemediation(item)
      ? renderProviderAttentionRemediationButton({ item })
      : '',
    canRunProviderAttentionRemediation(item) && item.fallbackRecommendedCommand
      ? renderProviderAttentionRemediationButton({
          actionLabelPrefix: 'fallback 복구',
          buttonText: 'fallback 복구',
          className: 'secondary-button',
          item,
          mode: 'fallback',
        })
      : '',
    canRunProviderAttentionRemediation(item) && item.recoverableFallbackRecommendedCommand
      ? renderProviderAttentionRemediationButton({
          actionLabelPrefix: '복구성 fallback',
          buttonText: '복구성 fallback',
          className: 'ghost-button',
          item,
          mode: 'recoverable-fallback',
        })
      : '',
    item.actionType === 'specialist-follow-up'
      ? renderMissionActionItemButton({
          actionLabelPrefix: '전문가 복구',
          buttonText: '전문가 복구',
          className: 'primary-button',
          dataAttribute: 'data-specialist-follow-up-remediate',
          dataValue: item.actionId,
          item,
        })
      : '',
    canRunActionInboxRerun(item)
      ? renderMissionActionItemButton({
          actionLabelPrefix: '권장 재실행',
          buttonText: '권장 재실행',
          className: 'primary-button',
          dataAttribute: 'data-action-rerun',
          dataValue: item.actionId,
          item,
        })
      : '',
    renderLearningPromotionActionButtons(item),
    item.actionType === 'reviewer-follow-up'
      ? renderMissionActionItemButton({
          actionLabelPrefix: '후속 요청 해소',
          buttonText: '후속 요청 해소',
          dataAttribute: 'data-action-resolve',
          dataValue: item.actionId,
          item,
        })
      : '',
  ];
  return `
          <div class="action-row">
            ${actionButtons.filter(Boolean).join('')}
          </div>`;
}

export function renderActionInboxItem(item = {}) {
  return `
        <div class="action-item">
          ${renderActionInboxItemStatus(item)}
          ${renderActionInboxItemHeader(item)}
          ${renderActionInboxGuidance(item)}
          ${renderActionInboxItemCommandMeta(item)}
          ${renderLearningPromotionCommandMeta(item)}
          ${renderActionInboxItemActions(item)}
        </div>
      `;
}

export function renderActionInboxList({
  hasActiveFilter = false,
  items = [],
  visibleFilterLabel = '전체',
} = {}) {
  const callout = renderActionInboxCallout({
    count: items.length,
    hasActiveFilter,
    visibleFilterLabel,
  });
  return `${callout}${items.map((item) => renderActionInboxItem(item)).join('')}`;
}

export function renderActionInboxOpenQueueEmptyState() {
  return emptyStateCard({
    icon: 'OK',
    message: '현재 이 미션에는 열린 후속 작업이 없습니다. 리뷰어 후속 요청과 승인 대기 항목이 모두 정리된 상태입니다.',
    title: '후속 작업 큐가 비어 있습니다',
  });
}

export function renderActionInboxFilteredEmptyState(visibleFilterLabel = '전체') {
  return emptyStateCard({
    icon: 'OK',
    message: `${visibleFilterLabel} 필터에 맞는 열린 후속 작업이 없습니다.`,
    title: `${visibleFilterLabel} 항목이 없습니다`,
  });
}

export function renderActionInboxEmptyList({
  hasActiveFilter = false,
  visibleFilterLabel = '전체',
} = {}) {
  return hasActiveFilter
    ? renderActionInboxFilteredEmptyState(visibleFilterLabel)
    : renderActionInboxOpenQueueEmptyState();
}

export function renderActionInboxUnavailableListEmptyState() {
  return emptyStateCard({
    action: 'jump-step',
    actionLabel: '개요 보기',
    actionValue: 'step-setup',
    icon: 'Q',
    message: '먼저 미션을 선택하면 현재 후속 작업과 권장 재실행 지점을 볼 수 있습니다.',
    title: '표시할 액션이 없습니다',
  });
}

export function renderActionInboxUnavailableSummaryEmptyState() {
  return emptyStateCard({
    icon: 'Q',
    message: '미션을 선택하면 열린 작업, 재실행 권장, 기한 초과 현황이 이곳에 표시됩니다.',
    title: '후속 작업 큐가 준비되지 않았습니다',
  });
}

export function renderActionInboxUnavailableState() {
  return {
    listHtml: renderActionInboxUnavailableListEmptyState(),
    summaryHtml: renderActionInboxUnavailableSummaryEmptyState(),
  };
}
