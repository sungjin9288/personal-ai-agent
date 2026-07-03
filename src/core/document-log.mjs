function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

/**
 * Document-log write domain.
 *
 * Instantiated once inside createMissionService near the sibling store-factory
 * blocks. Owns the four pure document-log write operations (create/update/
 * delete/migrate), each of which is a thin, self-contained wrapper over the
 * corresponding docService method plus input normalization/validation.
 *
 * Only `docService` is injected — that is the sole closure capture these four
 * functions share. `normalizeText` is a module-scope pure helper in
 * mission-service, so it is re-declared locally here per convention rather than
 * injected.
 *
 * The harness-registry helpers (`buildHarnessDocumentRegistry`,
 * `browseMissionHarnessDocuments`) intentionally STAY in mission-service:
 * `buildHarnessDocumentRegistry` is also consumed by `summarizeMissionHarness`
 * (the mission-harness rollup used by `showMission`) and its browse micro-
 * helpers are shared verbatim with the non-document `browseMissionHarnessMemory`
 * sibling, so they are harness-shared rather than document-log-exclusive.
 */
export function createDocumentLog({ docService }) {
  function logDocument({ type, title, content }) {
    const normalizedTitle = normalizeText(title);
    const normalizedContent = normalizeText(content);

    if (!normalizedTitle) {
      throw new Error('Document log title is required.');
    }
    if (!normalizedContent) {
      throw new Error('Document log content is required.');
    }

    const entry = docService.createDocumentLogEntry({
      content: normalizedContent,
      title: normalizedTitle,
      type,
    });

    return {
      ...entry,
      title: normalizedTitle,
      type,
    };
  }

  function updateDocumentLog({ entryId, type, title, content }) {
    const normalizedTitle = normalizeText(title);
    const normalizedContent = normalizeText(content);

    if (!normalizedTitle) {
      throw new Error('Document log title is required.');
    }
    if (!normalizedContent) {
      throw new Error('Document log content is required.');
    }

    const entry = docService.updateDocumentLogEntry({
      content: normalizedContent,
      entryId,
      title: normalizedTitle,
      type,
    });

    return {
      ...entry,
      title: normalizedTitle,
      type,
    };
  }

  function deleteDocumentLog(entryId) {
    return docService.deleteDocumentLogEntry(entryId);
  }

  function migrateLegacyDocumentLogs() {
    return docService.migrateLegacyDocumentLogEntries();
  }

  return {
    logDocument,
    updateDocumentLog,
    deleteDocumentLog,
    migrateLegacyDocumentLogs,
  };
}
