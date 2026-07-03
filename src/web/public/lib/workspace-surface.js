import { state, elements } from './app-state.js';
import { escapeHtml } from './html-format.js';
import { getFormEditingId } from './text-format.js';
import { writeUiStateToUrl } from './url-state.js';
import {
  getSelectedWorkspaceId,
  api,
  clearMissionSelection,
  filteredMissions,
  getMemoryFormConfig,
  getSelectedMissionRecord,
  loadApprovals,
  loadMissions,
  openComposer,
  refreshSelectedMissionContext,
  renderMissionList,
  resetMemoryForm,
  setActiveDetailTab,
  setActiveStep,
  setUiNotice,
} from '../app.js';

const WORKSPACE_FORM_DEFAULT_STATUS = '새 repo 경로를 추가하면 바로 이 화면에서 선택할 수 있습니다.';

export function getSelectedWorkspaceRecord() {
  const workspaceId = getSelectedWorkspaceId();
  if (!workspaceId) {
    return state.workspaces[0] || null;
  }
  return state.workspaces.find((workspace) => workspace.id === workspaceId) || null;
}

export function setWorkspaceFormStatus(message = '') {
  if (!elements.workspaceFormStatus) {
    return;
  }

  elements.workspaceFormStatus.textContent = String(message || '').trim() || WORKSPACE_FORM_DEFAULT_STATUS;
}

export function setWorkspaceFormOpen(isOpen, { focus = false } = {}) {
  if (!elements.workspaceForm || !elements.toggleWorkspaceFormButton) {
    return;
  }

  const open = Boolean(isOpen);
  elements.workspaceForm.hidden = !open;
  elements.toggleWorkspaceFormButton.textContent = open ? '추가 닫기' : '워크스페이스 추가';
  elements.toggleWorkspaceFormButton.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (!open) {
    elements.workspaceForm.reset();
    setWorkspaceFormStatus();
    return;
  }

  if (focus) {
    window.requestAnimationFrame(() => {
      elements.workspacePathInput?.focus();
    });
  }
}

export async function handleWorkspaceCreate(event) {
  event.preventDefault();

  if (!elements.workspaceForm) {
    return;
  }

  const formData = new FormData(elements.workspaceForm);
  const workspacePath = String(formData.get('workspacePath') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const submitButton = elements.workspaceForm.querySelector('button[type="submit"]');
  const originalLabel = submitButton?.textContent || '추가';

  if (!workspacePath) {
    throw new Error('워크스페이스 경로를 입력하세요.');
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = '추가 중...';
  }
  setWorkspaceFormStatus('워크스페이스를 추가하고 있습니다.');

  try {
    const payload = await api('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name,
        workspacePath,
      }),
    });

    await loadWorkspaces();
    const workspace = payload.workspace || null;
    if (workspace?.id) {
      elements.workspaceSelect.value = workspace.id;
    }

    clearMissionSelection({ syncUrl: false });
    renderMissionList();
    openComposer();
    writeUiStateToUrl({ historyMode: 'push' });
    setWorkspaceFormOpen(false);
    setUiNotice(payload.created ? '새 워크스페이스를 추가했습니다.' : '기존 워크스페이스를 선택했습니다.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

export function renderWorkspaceOptions() {
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
  renderWorkspaceCurrent();
}

export function renderWorkspaceCurrent() {
  if (!elements.workspaceCurrent) {
    return;
  }

  const workspace = getSelectedWorkspaceRecord();
  if (!workspace) {
    elements.workspaceCurrent.innerHTML = `
      <div class="workspace-current-empty">등록된 워크스페이스가 없으면 여기에서 현재 경로를 안내합니다.</div>
    `;
    return;
  }

  const workspaceMissions = state.missions.filter(({ mission }) => mission.workspaceId === workspace.id);
  const visibleMissions = filteredMissions();
  const selectedMission = getSelectedMissionRecord();
  const selectedInWorkspace = selectedMission?.mission?.workspaceId === workspace.id;

  elements.workspaceCurrent.innerHTML = `
    <div class="workspace-current-head">
      <span class="section-kicker">현재 workspace</span>
      <span class="mini-badge">${escapeHtml(String(workspaceMissions.length))}개 미션</span>
    </div>
    <strong class="workspace-current-title">${escapeHtml(workspace.name || workspace.id)}</strong>
    <div class="workspace-current-path mono">${escapeHtml(workspace.path || '-')}</div>
    <div class="workspace-current-meta">
      <span>현재 필터 ${escapeHtml(String(visibleMissions.length))}개</span>
      <span>${selectedInWorkspace ? '선택된 미션 있음' : '선택된 미션 없음'}</span>
    </div>
  `;
}

export async function loadWorkspaces() {
  const payload = await api('/api/workspaces');
  state.workspaces = payload.workspaces || [];
  renderWorkspaceOptions();
  setWorkspaceFormStatus();
}

export function restoreWorkspaceSelectionUrlState(urlState) {
  if (urlState.workspaceId && state.workspaces.some((workspace) => workspace.id === urlState.workspaceId)) {
    elements.workspaceSelect.value = urlState.workspaceId;
  }
}

export async function handleWorkspaceMemoryCreate(event) {
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
