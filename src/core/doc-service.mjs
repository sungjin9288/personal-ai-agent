import fs from 'node:fs';
import path from 'node:path';

import { DOCUMENT_LOG_TYPES } from './constants.mjs';

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

function appendMarkdownEntry(filePath, title, content) {
  const entry = `\n## ${title}\n\n- date: ${new Date().toISOString()}\n${content
    .split('\n')
    .map((line) => `- ${line}`)
    .join('\n')}\n`;
  fs.appendFileSync(filePath, entry, 'utf8');
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
    appendMarkdownEntry(targetPath, title, content);
    return targetPath;
  }

  return {
    docsDir,
    ensureDocs,
    logDocument,
  };
}
