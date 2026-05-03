import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_TERMINAL_JOBS = 200;

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeJsonAtomic(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return payload && typeof payload === 'object' ? payload : fallback;
  } catch {
    return fallback;
  }
}

function normalizeRegistryState(value = {}) {
  return {
    active: Array.isArray(value.active) ? value.active : [],
    terminal: Array.isArray(value.terminal) ? value.terminal : [],
    updatedAt: normalizeText(value.updatedAt),
  };
}

function sortTerminalJobs(items) {
  return [...items].sort((left, right) => String(right.endedAt || '').localeCompare(String(left.endedAt || '')));
}

function createJobId(kind) {
  const normalizedKind = normalizeText(kind, 'job').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `runtimejob_${normalizedKind || 'job'}_${randomUUID()}`;
}

export function createRuntimeJobRegistry({
  maxTerminalJobs = DEFAULT_MAX_TERMINAL_JOBS,
  rootDir,
} = {}) {
  const registryPath = path.join(rootDir, 'var', 'runtime-jobs.json');

  function readState() {
    return normalizeRegistryState(readJson(registryPath, {}));
  }

  function saveState(state) {
    writeJsonAtomic(registryPath, {
      ...normalizeRegistryState(state),
      terminal: sortTerminalJobs(state.terminal || []).slice(0, maxTerminalJobs),
      updatedAt: new Date().toISOString(),
    });
  }

  function recoverStaleActiveJobs({ reason = 'runtime-restart' } = {}) {
    const state = readState();
    if (!state.active.length) {
      return {
        recoveredCount: 0,
        registryPath,
      };
    }

    const endedAt = new Date().toISOString();
    const recovered = state.active.map((entry) => ({
      ...entry,
      durationMs: typeof entry.startedAtMs === 'number' ? Math.max(0, Date.now() - entry.startedAtMs) : 0,
      endedAt,
      stale: true,
      status: 'abandoned',
      terminalReason: reason,
    }));

    saveState({
      active: [],
      terminal: [...recovered, ...state.terminal],
    });

    return {
      recoveredCount: recovered.length,
      registryPath,
    };
  }

  function startJob({
    details = null,
    id = '',
    kind = 'job',
    requestId = '',
    scope = '',
    source = '',
    startedAt = new Date().toISOString(),
    startedAtMs = Date.now(),
    summary = '',
  } = {}) {
    const jobId = normalizeText(id, createJobId(kind));
    const state = readState();
    const entry = {
      details: details && typeof details === 'object' ? details : null,
      id: jobId,
      kind: normalizeText(kind, 'job'),
      pid: process.pid,
      requestId: normalizeText(requestId),
      scope: normalizeText(scope),
      source: normalizeText(source, 'web-ui'),
      startedAt,
      startedAtMs,
      status: 'active',
      summary: normalizeText(summary),
    };

    saveState({
      ...state,
      active: [...state.active.filter((item) => item.id !== jobId), entry],
    });

    return entry;
  }

  function finishJob(id, {
    details = null,
    error = '',
    status = 'completed',
    summary = '',
  } = {}) {
    const jobId = normalizeText(id);
    const state = readState();
    const activeIndex = state.active.findIndex((entry) => entry.id === jobId);
    if (activeIndex === -1) {
      return null;
    }

    const [entry] = state.active.splice(activeIndex, 1);
    const finished = {
      ...entry,
      details: details && typeof details === 'object' ? details : entry.details,
      durationMs: typeof entry.startedAtMs === 'number' ? Math.max(0, Date.now() - entry.startedAtMs) : 0,
      endedAt: new Date().toISOString(),
      error: normalizeText(error),
      status: normalizeText(status, 'completed'),
      summary: normalizeText(summary, entry.summary),
    };

    saveState({
      active: state.active,
      terminal: [finished, ...state.terminal],
    });

    return finished;
  }

  function summarize({ recentLimit = 20 } = {}) {
    const state = readState();
    const active = state.active.map(({ startedAtMs, ...entry }) => entry);
    const terminal = sortTerminalJobs(state.terminal).map(({ startedAtMs, ...entry }) => entry);

    return {
      active,
      activeCount: active.length,
      recent: terminal.slice(0, recentLimit),
      recentCount: terminal.length,
      registryPath,
    };
  }

  return {
    finishJob,
    readState,
    recoverStaleActiveJobs,
    registryPath,
    startJob,
    summarize,
  };
}
