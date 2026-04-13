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

function trimEdgeBlankLines(lines) {
  const nextLines = [...lines];
  while (nextLines.length && !String(nextLines[0] || '').trim()) {
    nextLines.shift();
  }
  while (nextLines.length && !String(nextLines[nextLines.length - 1] || '').trim()) {
    nextLines.pop();
  }
  return nextLines;
}

function normalizeLegacyEntryContent(lines) {
  return trimEdgeBlankLines(lines)
    .map((line) => (line.startsWith('- ') ? line.slice(2) : line))
    .join('\n')
    .trim();
}

function inferLegacyEntryTimestamp(title, fallbackTimestamp) {
  const titleMatch = String(title || '').match(/(?<date>\d{4}-\d{2}-\d{2})/);
  if (!titleMatch?.groups?.date) {
    return fallbackTimestamp;
  }

  const parsed = new Date(`${titleMatch.groups.date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallbackTimestamp : parsed.toISOString();
}

function parseLegacyDevlogStructure(fileContent) {
  const lines = String(fileContent || '').split('\n');
  const segments = [];
  let buffer = [];
  let currentLegacyTitle = null;
  let inTrackedBlock = false;
  let trackedLines = [];

  function flushRawBuffer() {
    if (!buffer.length) {
      return;
    }
    segments.push({
      kind: 'raw',
      text: buffer.join('\n'),
    });
    buffer = [];
  }

  function flushLegacyBuffer() {
    if (!currentLegacyTitle) {
      return;
    }
    segments.push({
      bodyLines: trimEdgeBlankLines(buffer),
      kind: 'legacy',
      title: currentLegacyTitle,
    });
    currentLegacyTitle = null;
    buffer = [];
  }

  for (const line of lines) {
    if (line.startsWith('<!-- document-log:start ')) {
      flushLegacyBuffer();
      flushRawBuffer();
      inTrackedBlock = true;
      trackedLines = [line];
      continue;
    }

    if (inTrackedBlock) {
      trackedLines.push(line);
      if (line === '<!-- document-log:end -->') {
        segments.push({
          kind: 'tracked',
          text: trackedLines.join('\n'),
        });
        trackedLines = [];
        inTrackedBlock = false;
      }
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentLegacyTitle) {
        flushLegacyBuffer();
      } else {
        flushRawBuffer();
      }
      currentLegacyTitle = line.slice(3).trim();
      continue;
    }

    buffer.push(line);
  }

  if (inTrackedBlock && trackedLines.length) {
    segments.push({
      kind: 'tracked',
      text: trackedLines.join('\n'),
    });
  }

  if (currentLegacyTitle) {
    flushLegacyBuffer();
  } else {
    flushRawBuffer();
  }

  const [headerSegment, ...bodySegments] = segments;
  const header = headerSegment?.kind === 'raw' ? headerSegment.text.trim() : '# Devlog';

  return {
    bodySegments: headerSegment?.kind === 'raw' ? bodySegments : segments,
    header: header || '# Devlog',
    legacySections: segments.filter((segment) => segment.kind === 'legacy'),
    trackedSections: segments.filter((segment) => segment.kind === 'tracked'),
  };
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

  function getLegacyDocumentLogStatus() {
    ensureDocs();
    const devlogPath = getDocumentPath(rootDir, 'devlog');
    const fileContent = readDocumentFile(devlogPath);
    const structure = parseLegacyDevlogStructure(fileContent);

    return {
      devlogPath: path.relative(rootDir, devlogPath),
      hasLegacySections: structure.legacySections.length > 0,
      legacyDevlogCount: structure.legacySections.length,
      trackedDevlogCount: structure.trackedSections.length,
    };
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

  function migrateLegacyDocumentLogEntries() {
    ensureDocs();

    const targetPath = getDocumentPath(rootDir, 'devlog');
    const fileContent = readDocumentFile(targetPath);
    const structure = parseLegacyDevlogStructure(fileContent);
    const fallbackTimestamp = fs.existsSync(targetPath)
      ? fs.statSync(targetPath).mtime.toISOString()
      : new Date().toISOString();

    if (!structure.legacySections.length) {
      return {
        entries: [],
        migratedCount: 0,
        path: path.relative(rootDir, targetPath),
      };
    }

    const migratedEntries = [];
    const nextBodyBlocks = structure.bodySegments.map((segment) => {
      if (segment.kind !== 'legacy') {
        return segment.text.trim();
      }

      const timestamp = inferLegacyEntryTimestamp(segment.title, fallbackTimestamp);
      const entry = {
        content: normalizeLegacyEntryContent(segment.bodyLines),
        createdAt: timestamp,
        id: createId('doclog'),
        title: segment.title,
        type: 'devlog',
        updatedAt: timestamp,
      };
      migratedEntries.push({
        ...entry,
        path: path.relative(rootDir, targetPath),
      });
      return serializeDocumentLogEntry(entry).trim();
    });

    const nextContent = [structure.header, ...nextBodyBlocks.filter(Boolean)].join('\n\n');
    writeDocumentFile(targetPath, `${nextContent}\n`);

    return {
      entries: migratedEntries,
      migratedCount: migratedEntries.length,
      path: path.relative(rootDir, targetPath),
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
    getLegacyDocumentLogStatus,
    listDocumentLogEntries,
    logDocument,
    migrateLegacyDocumentLogEntries,
    updateDocumentLogEntry,
  };
}
