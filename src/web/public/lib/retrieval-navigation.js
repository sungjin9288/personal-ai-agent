import { state, elements } from './app-state.js';
import { normalizeUiParam, getSanitizedRetrievalSourceType } from './ui-params.js';
import { formatRetrievalSourceLabel } from './status-labels.js';
import { writeUiStateToUrl } from './url-state.js';
import {
  setUiNotice,
  loadHarnessMemory,
  resetHarnessMemoryBrowseState,
  renderHarnessPanel,
  setActiveStep,
  setActiveDetailTab,
  selectSession,
  loadArtifact,
} from '../app.js';

export async function applyRetrievalSourceUrlState({
  sourceLabel = '',
  sourceType = '',
} = {}) {
  const normalizedType = getSanitizedRetrievalSourceType(sourceType);
  const normalizedLabel = normalizeUiParam(sourceLabel);

  if (!normalizedType || !normalizedLabel || !state.selectedMissionId) {
    state.retrievalSourceFocusType = '';
    state.retrievalSourceFocusLabel = '';
    state.harnessAttachmentFocus = '';
    return;
  }

  state.retrievalSourceFocusType = normalizedType;
  state.retrievalSourceFocusLabel = normalizedLabel;

  if (normalizedType === 'memory') {
    const [scope = 'all', kind = 'all'] = normalizedLabel.split('/');
    state.harnessAttachmentFocus = '';
    state.harnessMemoryFilterScope = ['mission', 'workspace'].includes(scope) ? scope : 'all';
    state.harnessMemoryFilterKind = ['fact', 'decision', 'preference'].includes(kind) ? kind : 'all';
    state.harnessMemoryOffset = 0;
    state.harnessMemoryQuery = '';
    await loadHarnessMemory();
    return;
  }

  state.harnessAttachmentFocus = normalizedLabel;
}

export function getActiveRetrievalSourceFocus() {
  const type = String(state.retrievalSourceFocusType || '').trim();
  const label = String(state.retrievalSourceFocusLabel || '').trim();

  if (!type || !label) {
    return null;
  }

  return {
    detail:
      type === 'memory'
        ? '하네스 메모리 필터가 이 source 기준으로 좁혀져 있습니다.'
        : '하네스 첨부 목록에서 이 source 파일을 강조하고 있습니다.',
    label,
    title: formatRetrievalSourceLabel({ sourceLabel: label, sourceType: type }),
    type,
  };
}

export function clearRetrievalSourceFocus({ historyMode = 'push' } = {}) {
  const activeFocus = getActiveRetrievalSourceFocus();
  if (!activeFocus) {
    return;
  }

  state.retrievalSourceFocusType = '';
  state.retrievalSourceFocusLabel = '';
  state.harnessAttachmentFocus = '';

  if (activeFocus.type === 'memory') {
    resetHarnessMemoryBrowseState();
  }

  renderHarnessPanel();
  writeUiStateToUrl({ historyMode });
  setUiNotice('retrieval source focus를 해제했습니다.');
}

export async function focusRetrievalSource(sourceType, sourceLabel, { historyMode = 'push' } = {}) {
  const normalizedType = String(sourceType || '').trim().toLowerCase();
  const normalizedLabel = String(sourceLabel || '').trim();

  if (!state.selectedMissionId || !normalizedType || !normalizedLabel) {
    return;
  }

  setActiveStep('step-setup', { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab('harness', { syncUrl: false });

  if (normalizedType === 'memory') {
    const [scope = 'all', kind = 'all'] = normalizedLabel.split('/');
    state.retrievalSourceFocusType = normalizedType;
    state.retrievalSourceFocusLabel = normalizedLabel;
    state.harnessAttachmentFocus = '';
    state.harnessMemoryFilterScope = ['mission', 'workspace'].includes(scope) ? scope : 'all';
    state.harnessMemoryFilterKind = ['fact', 'decision', 'preference'].includes(kind) ? kind : 'all';
    state.harnessMemoryOffset = 0;
    state.harnessMemoryQuery = '';
    await loadHarnessMemory();
    renderHarnessPanel();
    writeUiStateToUrl({ historyMode });
    window.requestAnimationFrame(() => {
      elements.harnessMemory?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
    setUiNotice(`메모 source ${formatRetrievalSourceLabel({ sourceLabel: normalizedLabel, sourceType: normalizedType })} 기준으로 하네스를 좁혀 봅니다.`);
    return;
  }

  state.retrievalSourceFocusType = normalizedType;
  state.retrievalSourceFocusLabel = normalizedLabel;
  state.harnessAttachmentFocus = normalizedLabel;
  renderHarnessPanel();
  writeUiStateToUrl({ historyMode });
  window.requestAnimationFrame(() => {
    const target = elements.harnessSource?.querySelector(
      `[data-harness-attachment-file="${CSS.escape(normalizedLabel)}"]`,
    );
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
  setUiNotice(`첨부 source ${normalizedLabel} 위치로 이동했습니다.`);
}

export function wireRetrievalSourceButtons(scope = document) {
  scope.querySelectorAll('[data-retrieval-source-type]').forEach((button) => {
    button.addEventListener('click', async () => {
      const sourceType = String(button.dataset.retrievalSourceType || '').trim();
      const sourceLabel = String(button.dataset.retrievalSourceLabel || '').trim();
      await focusRetrievalSource(sourceType, sourceLabel, { historyMode: 'push' });
    });
  });
}

export async function openRetrievalArtifact(artifactId, sessionId, { historyMode = 'push' } = {}) {
  const targetArtifactId = String(artifactId || '').trim();
  const targetSessionId = String(sessionId || '').trim();

  if (!state.selectedMissionId || !targetArtifactId || !targetSessionId) {
    return;
  }

  if (state.selectedSessionId !== targetSessionId) {
    await selectSession(targetSessionId, {
      focusRuns: false,
      preferredArtifactId: targetArtifactId,
      syncUrl: false,
    });
  } else {
    await loadArtifact(targetArtifactId, { activateTab: false, syncUrl: false });
  }

  setActiveStep('step-output', { syncDetailTab: false, syncUrl: false });
  setActiveDetailTab('artifacts', { syncUrl: false });
  writeUiStateToUrl({ historyMode });
}

export function wireRetrievalArtifactButtons(scope = document) {
  scope.querySelectorAll('[data-retrieval-artifact-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      const artifactId = String(button.dataset.retrievalArtifactOpen || '').trim();
      const sessionId = String(button.dataset.retrievalSessionId || '').trim();
      await openRetrievalArtifact(artifactId, sessionId, { historyMode: 'push' });
    });
  });
}
