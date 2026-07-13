function listen(target, eventName, listener) {
  target?.addEventListener(eventName, listener);
}

function listenSafely(target, eventName, action, onError) {
  listen(target, eventName, async (event) => {
    try {
      await action(event);
    } catch (error) {
      onError(error);
    }
  });
}

export function wireDocumentLogFormActions({ actions, elements, errors }) {
  listenSafely(elements.documentLogForm, 'submit', actions.createDocument, errors.createDocument);
  listenSafely(elements.documentLogSearch, 'input', actions.searchDocuments, errors.default);
  listenSafely(elements.documentLogFilter, 'change', actions.filterDocuments, errors.default);
  listen(elements.documentLogCancelButton, 'click', actions.cancelDocument);
  listenSafely(elements.documentLogFile, 'change', actions.selectDocumentFile, errors.selectDocumentFile);
}

export function wireMemoryFormActions({ actions, elements, errors }) {
  listenSafely(elements.memoryForm, 'submit', actions.createMissionMemory, errors.createMissionMemory);
  listen(elements.memoryCancelButton, 'click', actions.cancelMissionMemory);
  listenSafely(
    elements.workspaceMemoryForm,
    'submit',
    actions.createWorkspaceMemory,
    errors.createWorkspaceMemory,
  );
  listen(elements.workspaceMemoryCancelButton, 'click', actions.cancelWorkspaceMemory);
}

export function wireMissionFormActions({ actions, elements, errors }) {
  listenSafely(elements.missionForm, 'submit', actions.createMission, errors.default);
  listen(elements.missionForm?.elements?.mode, 'change', actions.renderBlueprint);
  listen(elements.missionAttachmentInput, 'change', actions.renderBlueprint);
}

export function wireMissionRunActions({ actions, elements, errors }) {
  listenSafely(elements.runMissionButton, 'click', actions.runMission, errors.runMission);
  listen(elements.runFallbackProviderSelect, 'change', actions.updateFallbackControls);
}

export function wireWorkspaceComposerActions({ actions, elements, errors }) {
  listen(elements.toggleCreateButton, 'click', actions.openMissionComposer);
  listen(elements.toggleWorkspaceFormButton, 'click', actions.toggleWorkspaceForm);
  listen(elements.cancelWorkspaceFormButton, 'click', actions.closeWorkspaceForm);
  listenSafely(elements.workspaceForm, 'submit', actions.createWorkspace, errors.createWorkspace);
}

export function wireMissionBrowseControls({ actions, elements }) {
  listen(elements.missionFilter, 'input', actions.filterMissions);
  listen(elements.workspaceSelect, 'change', actions.selectWorkspace);
}

export function wireNavigationTabControls({ actions, elements }) {
  elements.stepButtons.forEach((button) => {
    listen(button, 'click', () => actions.selectStep(button.dataset.stepTarget));
  });
  elements.detailTabButtons.forEach((button) => {
    listen(button, 'click', () => actions.selectDetailTab(button.dataset.detailTab));
  });
}

export function wireBrowserHistoryControls({ actions, errors, historyTarget }) {
  listenSafely(historyTarget, 'popstate', actions.restoreHistory, errors.default);
}

export function wireThemeToggleControls({ actions, elements }) {
  listen(elements.themeToggleButton, 'click', actions.toggleTheme);
}

export function wireApplicationEvents({ actions, elements, errors, historyTarget }) {
  wireWorkspaceComposerActions({ actions, elements, errors });
  wireMissionBrowseControls({ actions, elements });
  wireMissionFormActions({ actions, elements, errors });
  wireMemoryFormActions({ actions, elements, errors });
  wireDocumentLogFormActions({ actions, elements, errors });
  wireMissionRunActions({ actions, elements, errors });
  wireNavigationTabControls({ actions, elements });
  wireBrowserHistoryControls({ actions, errors, historyTarget });
  wireThemeToggleControls({ actions, elements });
}
