import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDocumentLog } from '../src/core/document-log.mjs';

const FIXED_CREATED_AT = '2026-01-01T00:00:00.000Z';
const FIXED_UPDATED_AT = '2026-01-02T00:00:00.000Z';
const SUPPORTED_TYPES = ['devlog', 'incident', 'reference'];

/**
 * Map-backed fake docService.
 *
 * Fakes ONLY the four methods the document-log write domain actually calls:
 * createDocumentLogEntry, updateDocumentLogEntry, deleteDocumentLogEntry,
 * migrateLegacyDocumentLogEntries. Behaviour mirrors the real doc-service
 * contract: unsupported types throw, missing entries throw, writes are
 * recorded, and migrate reports empty vs present legacy sections.
 */
function createFakeDocService({ legacySections = [] } = {}) {
  const entries = new Map();
  const calls = { create: [], update: [], delete: [], migrate: [] };
  let idCounter = 0;

  function createDocumentLogEntry({ content, title, type }) {
    calls.create.push({ content, title, type });
    if (!SUPPORTED_TYPES.includes(type)) {
      throw new Error(`Unsupported log type: ${type}`);
    }
    idCounter += 1;
    const id = `doclog-${idCounter}`;
    const entry = {
      content,
      createdAt: FIXED_CREATED_AT,
      id,
      title,
      type,
      updatedAt: FIXED_CREATED_AT,
    };
    entries.set(id, entry);
    return { ...entry, path: `docs/${type}.md` };
  }

  function updateDocumentLogEntry({ content, entryId, title, type }) {
    calls.update.push({ content, entryId, title, type });
    if (!SUPPORTED_TYPES.includes(type)) {
      throw new Error(`Unsupported log type: ${type}`);
    }
    const current = entries.get(entryId);
    if (!current) {
      throw new Error(`Document log entry not found: ${entryId}`);
    }
    const updatedEntry = {
      content,
      createdAt: current.createdAt,
      id: current.id,
      title,
      type,
      updatedAt: FIXED_UPDATED_AT,
    };
    entries.set(entryId, updatedEntry);
    return { ...updatedEntry, path: `docs/${type}.md` };
  }

  function deleteDocumentLogEntry(entryId) {
    calls.delete.push({ entryId });
    const current = entries.get(entryId);
    if (!current) {
      throw new Error(`Document log entry not found: ${entryId}`);
    }
    entries.delete(entryId);
    return {
      content: current.content,
      id: current.id,
      path: `docs/${current.type}.md`,
      title: current.title,
      type: current.type,
    };
  }

  function migrateLegacyDocumentLogEntries() {
    calls.migrate.push({});
    if (!legacySections.length) {
      return { entries: [], migratedCount: 0, path: 'docs/devlog.md' };
    }
    const migrated = legacySections.map((section, index) => {
      idCounter += 1;
      const id = `doclog-migrated-${index + 1}`;
      const entry = {
        content: section.content,
        createdAt: FIXED_CREATED_AT,
        id,
        title: section.title,
        type: 'devlog',
        updatedAt: FIXED_CREATED_AT,
        path: 'docs/devlog.md',
      };
      entries.set(id, entry);
      return entry;
    });
    return { entries: migrated, migratedCount: migrated.length, path: 'docs/devlog.md' };
  }

  return {
    calls,
    entries,
    docService: {
      createDocumentLogEntry,
      updateDocumentLogEntry,
      deleteDocumentLogEntry,
      migrateLegacyDocumentLogEntries,
    },
  };
}

test('logDocument creates a new entry and returns normalized title/type', () => {
  const fake = createFakeDocService();
  const { logDocument } = createDocumentLog({ docService: fake.docService });

  const result = logDocument({ type: 'devlog', title: '  Kickoff  ', content: '  body text  ' });

  assert.equal(result.id, 'doclog-1');
  assert.equal(result.title, 'Kickoff');
  assert.equal(result.content, 'body text');
  assert.equal(result.type, 'devlog');
  assert.equal(result.path, 'docs/devlog.md');
  assert.equal(fake.calls.create.length, 1);
  assert.deepEqual(fake.calls.create[0], { content: 'body text', title: 'Kickoff', type: 'devlog' });
  assert.equal(fake.entries.size, 1);
});

test('logDocument throws when title is empty/whitespace and does not call docService', () => {
  const fake = createFakeDocService();
  const { logDocument } = createDocumentLog({ docService: fake.docService });

  assert.throws(
    () => logDocument({ type: 'devlog', title: '   ', content: 'body' }),
    /Document log title is required\./,
  );
  assert.equal(fake.calls.create.length, 0);
});

test('logDocument throws when content is empty and does not call docService', () => {
  const fake = createFakeDocService();
  const { logDocument } = createDocumentLog({ docService: fake.docService });

  assert.throws(
    () => logDocument({ type: 'devlog', title: 'title', content: '' }),
    /Document log content is required\./,
  );
  assert.equal(fake.calls.create.length, 0);
});

test('updateDocumentLog updates an existing entry with normalized values', () => {
  const fake = createFakeDocService();
  const { logDocument, updateDocumentLog } = createDocumentLog({ docService: fake.docService });
  const created = logDocument({ type: 'devlog', title: 'Original', content: 'first' });

  const result = updateDocumentLog({
    entryId: created.id,
    type: 'incident',
    title: '  Revised  ',
    content: '  second  ',
  });

  assert.equal(result.id, created.id);
  assert.equal(result.title, 'Revised');
  assert.equal(result.content, 'second');
  assert.equal(result.type, 'incident');
  assert.equal(result.updatedAt, FIXED_UPDATED_AT);
  assert.equal(fake.calls.update.length, 1);
  assert.equal(fake.entries.get(created.id).content, 'second');
});

test('updateDocumentLog throws when the target entry is missing', () => {
  const fake = createFakeDocService();
  const { updateDocumentLog } = createDocumentLog({ docService: fake.docService });

  assert.throws(
    () => updateDocumentLog({ entryId: 'nope', type: 'devlog', title: 'title', content: 'body' }),
    /Document log entry not found: nope/,
  );
});

test('updateDocumentLog throws on empty title before touching docService', () => {
  const fake = createFakeDocService();
  const { updateDocumentLog } = createDocumentLog({ docService: fake.docService });

  assert.throws(
    () => updateDocumentLog({ entryId: 'doclog-1', type: 'devlog', title: '', content: 'body' }),
    /Document log title is required\./,
  );
  assert.equal(fake.calls.update.length, 0);
});

test('deleteDocumentLog removes an existing entry and returns it', () => {
  const fake = createFakeDocService();
  const { logDocument, deleteDocumentLog } = createDocumentLog({ docService: fake.docService });
  const created = logDocument({ type: 'reference', title: 'Doomed', content: 'gone soon' });

  const result = deleteDocumentLog(created.id);

  assert.equal(result.id, created.id);
  assert.equal(result.title, 'Doomed');
  assert.equal(result.type, 'reference');
  assert.equal(fake.entries.size, 0);
  assert.equal(fake.calls.delete.length, 1);
});

test('deleteDocumentLog throws when the entry does not exist', () => {
  const fake = createFakeDocService();
  const { deleteDocumentLog } = createDocumentLog({ docService: fake.docService });

  assert.throws(() => deleteDocumentLog('missing'), /Document log entry not found: missing/);
  assert.equal(fake.calls.delete.length, 1);
});

test('migrateLegacyDocumentLogs returns an empty result when there are no legacy sections', () => {
  const fake = createFakeDocService({ legacySections: [] });
  const { migrateLegacyDocumentLogs } = createDocumentLog({ docService: fake.docService });

  const result = migrateLegacyDocumentLogs();

  assert.deepEqual(result, { entries: [], migratedCount: 0, path: 'docs/devlog.md' });
  assert.equal(fake.calls.migrate.length, 1);
});

test('migrateLegacyDocumentLogs migrates present legacy sections', () => {
  const fake = createFakeDocService({
    legacySections: [
      { title: 'Legacy One', content: 'one' },
      { title: 'Legacy Two', content: 'two' },
    ],
  });
  const { migrateLegacyDocumentLogs } = createDocumentLog({ docService: fake.docService });

  const result = migrateLegacyDocumentLogs();

  assert.equal(result.migratedCount, 2);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].title, 'Legacy One');
  assert.equal(result.entries[1].type, 'devlog');
  assert.equal(result.path, 'docs/devlog.md');
  assert.equal(fake.entries.size, 2);
});
