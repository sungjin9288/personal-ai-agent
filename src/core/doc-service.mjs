import fs from 'node:fs';
import path from 'node:path';

import { DOCUMENT_LOG_TYPES } from './constants.mjs';
import { createId } from './id.mjs';

const DOC_TEMPLATES = {
  roadmap: `# Roadmap

## Current Milestone

- milestone: v1 managed multi-agent foundation
- status: in progress

## Next Milestone Scope

- provider abstraction hardening
- managed multi-agent execution loop
- approval and memory hooks
- deterministic smoke coverage

## Deferred

- swarm autonomy
- background queue workers
- chat surface integrations
`,
  reference: `# Reference Repositories

## References

### fireauto
- borrowed: commandized workflow boundaries
- rejected for now: tightly coupled command surface before core runtime stabilizes

### oh-my-codex
- borrowed: thin workflow layer over an existing coding agent
- rejected for now: codex-specific shell assumptions as the only runtime model

### everything-claude-code
- borrowed: agents / skills / hooks / rules separation
- rejected for now: provider-specific conventions as hard runtime dependencies

### mrstack
- borrowed: persistent memory mindset and always-on assistant framing
- rejected for now: messaging channel integrations in v1

### multi-agent-workflow
- borrowed: planner / executor / reviewer sequencing
- rejected for now: broader debate tree before the managed path is stable

### OpenHarness
- borrowed: harness boundary, governance hooks, session-first orchestration
- rejected for now: Python-first rewrite and direct code vendoring

## Working Notes

`,
  devlog: `# Devlog

## Initial Entry

- date: ${new Date().toISOString().slice(0, 10)}
- note: initialized the local-first personal AI agent scaffold and selected a Node-first managed multi-agent direction
`,
  incidents: `# Incidents

No incidents logged yet.
`,
  adr: `# ADR-001: Runtime And Agent Shape

## Status

Accepted

## Decision

- runtime stays Node.js ESM
- the project remains CLI-first for v1
- agent shape starts as managed multi-agent: manager -> planner -> executor -> reviewer
- risky actions require approval before they can proceed beyond planning/proposal output

## Context

The project needs to support coding, decisions, planning, and documentation without forcing an OpenHarness-style rewrite at the start.

## Consequences

- faster local iteration and lower bootstrap complexity
- explicit room for provider adapters later
- deterministic execution path before autonomous swarm expansion
`,
};

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function serializeDocumentLogEntry({ content, createdAt, id, title, type, updatedAt = createdAt }) {
  const metadata = JSON.stringify({ createdAt, id, type, updatedAt });
  const bulletLines = String(content)
    .split('\n')
    .map((line) => `- ${line}`)
    .join('\n');

  return [
    '',
    `<!-- document-log:start ${metadata} -->`,
    `## ${title}`,
    '',
    `- date: ${updatedAt}`,
    bulletLines,
    '<!-- document-log:end -->',
    '',
  ].join('\n');
}

function readDocumentFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function parseTrackedDocumentLogEntries(fileContent) {
  const entries = [];
  const entryPattern = /<!-- document-log:start (?<meta>\{.*?\}) -->\n(?<body>[\s\S]*?)\n<!-- document-log:end -->/g;

  for (const match of fileContent.matchAll(entryPattern)) {
    try {
      const metadata = JSON.parse(match.groups?.meta || '{}');
      const body = String(match.groups?.body || '');
      const titleMatch = body.match(/^## (?<title>.+)$/m);
      const bulletLines = body
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2))
        .filter((line) => !line.startsWith('date: '));

      entries.push({
        content: bulletLines.join('\n').trim(),
        createdAt: metadata.createdAt || null,
        end: (match.index || 0) + match[0].length,
        id: metadata.id || null,
        start: match.index || 0,
        title: titleMatch?.groups?.title?.trim() || '',
        type: metadata.type || null,
        updatedAt: metadata.updatedAt || metadata.createdAt || null,
      });
    } catch {
      // Ignore malformed blocks and continue parsing the rest of the file.
    }
  }

  return entries;
}

function writeDocumentFile(filePath, content) {
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function getDocumentPath(rootDir, type) {
  if (type === 'devlog') {
    return path.join(rootDir, 'docs', 'devlog.md');
  }

  if (type === 'incident') {
    return path.join(rootDir, 'docs', 'incidents.md');
  }

  return path.join(rootDir, 'docs', 'reference-repos.md');
}

export function createDocService({ rootDir }) {
  const docsDir = path.join(rootDir, 'docs');
  const adrDir = path.join(docsDir, 'adr');

  function ensureDocs() {
    ensureDirectory(docsDir);
    ensureDirectory(adrDir);

    const files = [
      [path.join(docsDir, 'roadmap.md'), DOC_TEMPLATES.roadmap],
      [path.join(docsDir, 'reference-repos.md'), DOC_TEMPLATES.reference],
      [path.join(docsDir, 'devlog.md'), DOC_TEMPLATES.devlog],
      [path.join(docsDir, 'incidents.md'), DOC_TEMPLATES.incidents],
      [path.join(adrDir, 'ADR-001-runtime-and-agent-shape.md'), DOC_TEMPLATES.adr],
    ];

    for (const [filePath, content] of files) {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }

  function logDocument({ type, title, content }) {
    if (!DOCUMENT_LOG_TYPES.includes(type)) {
      throw new Error(`Unsupported log type: ${type}`);
    }

    ensureDocs();
    const targetPath = getDocumentPath(rootDir, type);
    fs.appendFileSync(targetPath, `\n## ${title}\n\n- date: ${new Date().toISOString()}\n${content
      .split('\n')
      .map((line) => `- ${line}`)
      .join('\n')}\n`, 'utf8');
    return targetPath;
  }

  function listDocumentLogEntries({ limit = 6 } = {}) {
    ensureDocs();
    const entries = DOCUMENT_LOG_TYPES.flatMap((type) => {
      const targetPath = getDocumentPath(rootDir, type);
      const fileContent = readDocumentFile(targetPath);
      return parseTrackedDocumentLogEntries(fileContent).map((entry) => ({
        ...entry,
        path: path.relative(rootDir, targetPath),
      }));
    }).sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')));

    return entries.slice(-limit).reverse();
  }

  function createDocumentLogEntry({ content, title, type }) {
    if (!DOCUMENT_LOG_TYPES.includes(type)) {
      throw new Error(`Unsupported log type: ${type}`);
    }

    ensureDocs();
    const targetPath = getDocumentPath(rootDir, type);
    const createdAt = new Date().toISOString();
    const entry = {
      content,
      createdAt,
      id: createId('doclog'),
      title,
      type,
      updatedAt: createdAt,
    };
    fs.appendFileSync(targetPath, serializeDocumentLogEntry(entry), 'utf8');
    return {
      ...entry,
      path: path.relative(rootDir, targetPath),
    };
  }

  function findDocumentLogEntry(entryId) {
    ensureDocs();

    for (const type of DOCUMENT_LOG_TYPES) {
      const targetPath = getDocumentPath(rootDir, type);
      const fileContent = readDocumentFile(targetPath);
      const entry = parseTrackedDocumentLogEntries(fileContent).find((item) => item.id === entryId);
      if (entry) {
        return {
          ...entry,
          fileContent,
          filePath: targetPath,
        };
      }
    }

    return null;
  }

  function updateDocumentLogEntry({ content, entryId, title, type }) {
    if (!DOCUMENT_LOG_TYPES.includes(type)) {
      throw new Error(`Unsupported log type: ${type}`);
    }

    const currentEntry = findDocumentLogEntry(entryId);
    if (!currentEntry) {
      throw new Error(`Document log entry not found: ${entryId}`);
    }

    const updatedEntry = {
      content,
      createdAt: currentEntry.createdAt || new Date().toISOString(),
      id: currentEntry.id,
      title,
      type,
      updatedAt: new Date().toISOString(),
    };

    if (currentEntry.type === type) {
      const nextContent =
        currentEntry.fileContent.slice(0, currentEntry.start) +
        serializeDocumentLogEntry(updatedEntry) +
        currentEntry.fileContent.slice(currentEntry.end);
      writeDocumentFile(currentEntry.filePath, nextContent);
    } else {
      const prunedContent =
        currentEntry.fileContent.slice(0, currentEntry.start) +
        currentEntry.fileContent.slice(currentEntry.end);
      writeDocumentFile(currentEntry.filePath, prunedContent);
      const nextTargetPath = getDocumentPath(rootDir, type);
      fs.appendFileSync(nextTargetPath, serializeDocumentLogEntry(updatedEntry), 'utf8');
    }

    return {
      ...updatedEntry,
      path: path.relative(rootDir, getDocumentPath(rootDir, type)),
    };
  }

  function deleteDocumentLogEntry(entryId) {
    const currentEntry = findDocumentLogEntry(entryId);
    if (!currentEntry) {
      throw new Error(`Document log entry not found: ${entryId}`);
    }

    const nextContent =
      currentEntry.fileContent.slice(0, currentEntry.start) +
      currentEntry.fileContent.slice(currentEntry.end);
    writeDocumentFile(currentEntry.filePath, nextContent);

    return {
      content: currentEntry.content,
      createdAt: currentEntry.createdAt,
      id: currentEntry.id,
      path: path.relative(rootDir, currentEntry.filePath),
      title: currentEntry.title,
      type: currentEntry.type,
      updatedAt: currentEntry.updatedAt,
    };
  }

  return {
    createDocumentLogEntry,
    deleteDocumentLogEntry,
    docsDir,
    ensureDocs,
    listDocumentLogEntries,
    logDocument,
    updateDocumentLogEntry,
  };
}
