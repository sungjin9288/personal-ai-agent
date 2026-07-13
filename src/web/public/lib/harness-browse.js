export function buildHarnessDocumentsQueryParams(state) {
  return new URLSearchParams({
    limit: String(state.harnessDocumentVisibleCount || 12),
    offset: String(state.harnessDocumentOffset || 0),
    query: String(state.harnessDocumentQuery || ''),
    sort: String(state.harnessDocumentSort || 'latest'),
    type: String(state.harnessDocumentFilter || 'all'),
  });
}

export async function loadHarnessDocuments({ api, missionId, state }) {
  const selectedMissionId = missionId === undefined ? state.selectedMissionId : missionId;
  if (!selectedMissionId) {
    state.harnessDocumentResult = null;
    return null;
  }

  const params = buildHarnessDocumentsQueryParams(state);
  const payload = await api(
    `/api/missions/${encodeURIComponent(selectedMissionId)}/harness/documents?${params.toString()}`,
  );
  state.harnessDocumentOffset = Number(payload.filters?.offset || 0);
  state.harnessDocumentResult = payload;
  return payload;
}

export function buildHarnessMemoryQueryParams(state) {
  return new URLSearchParams({
    kind: String(state.harnessMemoryFilterKind || 'all'),
    limit: String(state.harnessMemoryVisibleCount || 12),
    offset: String(state.harnessMemoryOffset || 0),
    query: String(state.harnessMemoryQuery || ''),
    scope: String(state.harnessMemoryFilterScope || 'all'),
    sort: String(state.harnessMemorySort || 'latest'),
  });
}

export async function loadHarnessMemory({ api, missionId, state }) {
  const selectedMissionId = missionId === undefined ? state.selectedMissionId : missionId;
  if (!selectedMissionId) {
    state.harnessMemoryResult = null;
    return null;
  }

  const params = buildHarnessMemoryQueryParams(state);
  const payload = await api(
    `/api/missions/${encodeURIComponent(selectedMissionId)}/harness/memory?${params.toString()}`,
  );
  state.harnessMemoryOffset = Number(payload.filters?.offset || 0);
  state.harnessMemoryResult = payload;
  return payload;
}

export function resetHarnessDocumentBrowseState(state) {
  state.harnessDocumentFilter = 'all';
  state.harnessDocumentOffset = 0;
  state.harnessDocumentQuery = '';
  state.harnessDocumentSort = 'latest';
  state.harnessDocumentVisibleCount = 12;
}

export function resetHarnessMemoryBrowseState(state) {
  state.harnessAttachmentFocus = '';
  state.retrievalSourceFocusLabel = '';
  state.retrievalSourceFocusType = '';
  state.harnessMemoryFilterKind = 'all';
  state.harnessMemoryFilterScope = 'all';
  state.harnessMemoryOffset = 0;
  state.harnessMemoryQuery = '';
  state.harnessMemorySort = 'latest';
  state.harnessMemoryVisibleCount = 12;
}

export function wireHarnessDocumentBrowseActions({
  container,
  loadDocuments,
  onDelete,
  onEdit,
  onError,
  onMigrate,
  renderPanel,
  resetBrowse,
  state,
}) {
  if (!container) {
    return;
  }

  container.querySelector('#document-log-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentSort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessDocumentOffset = 0;
      await loadDocuments();
      renderPanel();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelector('#document-log-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessDocumentVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessDocumentOffset = 0;
      await loadDocuments();
      renderPanel();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelectorAll('[data-document-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetBrowse();
        await loadDocuments();
        renderPanel();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-document-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset = Math.max(
          Number(state.harnessDocumentOffset || 0) - Number(state.harnessDocumentVisibleCount || 12),
          0,
        );
        await loadDocuments();
        renderPanel();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-document-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessDocumentOffset += Number(state.harnessDocumentVisibleCount || 12);
        await loadDocuments();
        renderPanel();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-document-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => onEdit(String(button.dataset.documentId || '').trim()));
  });

  container.querySelectorAll('[data-document-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await onDelete(String(button.dataset.documentId || '').trim());
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-document-action="migrate-legacy"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await onMigrate();
      } catch (error) {
        onError(error);
      }
    });
  });
}

export function wireHarnessMemoryBrowseActions({
  container,
  loadMemory,
  onDelete,
  onEdit,
  onError,
  renderPanel,
  resetBrowse,
  state,
  syncUrl,
}) {
  if (!container) {
    return;
  }

  container.querySelector('#harness-memory-search')?.addEventListener('input', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryQuery = String(event.target.value || '');
      state.harnessMemoryOffset = 0;
      await loadMemory();
      renderPanel();
      syncUrl();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelector('#harness-memory-scope-filter')?.addEventListener('change', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryFilterScope = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadMemory();
      renderPanel();
      syncUrl();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelector('#harness-memory-kind-filter')?.addEventListener('change', async (event) => {
    try {
      state.retrievalSourceFocusType = '';
      state.retrievalSourceFocusLabel = '';
      state.harnessMemoryFilterKind = String(event.target.value || 'all');
      state.harnessMemoryOffset = 0;
      await loadMemory();
      renderPanel();
      syncUrl();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelector('#harness-memory-limit')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemoryVisibleCount = Number(event.target.value || 12) || 12;
      state.harnessMemoryOffset = 0;
      await loadMemory();
      renderPanel();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelector('#harness-memory-sort')?.addEventListener('change', async (event) => {
    try {
      state.harnessMemorySort = String(event.target.value || 'latest').trim() || 'latest';
      state.harnessMemoryOffset = 0;
      await loadMemory();
      renderPanel();
    } catch (error) {
      onError(error);
    }
  });

  container.querySelectorAll('[data-memory-action="reset-browse"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        resetBrowse();
        await loadMemory();
        renderPanel();
        syncUrl();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-memory-action="prev-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset = Math.max(
          Number(state.harnessMemoryOffset || 0) - Number(state.harnessMemoryVisibleCount || 12),
          0,
        );
        await loadMemory();
        renderPanel();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-memory-action="next-page"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.harnessMemoryOffset += Number(state.harnessMemoryVisibleCount || 12);
        await loadMemory();
        renderPanel();
      } catch (error) {
        onError(error);
      }
    });
  });

  container.querySelectorAll('[data-memory-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      onEdit({
        memoryId: String(button.dataset.memoryId || '').trim(),
        scope: String(button.dataset.memoryScope || 'mission').trim(),
      });
    });
  });

  container.querySelectorAll('[data-memory-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await onDelete({
          memoryId: String(button.dataset.memoryId || '').trim(),
          scope: String(button.dataset.memoryScope || 'mission').trim(),
        });
      } catch (error) {
        onError(error);
      }
    });
  });
}
