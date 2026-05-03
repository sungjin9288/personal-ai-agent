import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MAX_TERMINAL_REQUESTS = 200;

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

function normalizeRegistryState(value = {}) {
  return {
    active: Array.isArray(value.active) ? value.active : [],
    terminal: Array.isArray(value.terminal) ? value.terminal : [],
    updatedAt: normalizeText(value.updatedAt),
  };
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

function sortTerminalRequests(items) {
  return [...items].sort((left, right) => String(right.endedAt || '').localeCompare(String(left.endedAt || '')));
}

export function createRuntimeRequestRegistry({
  maxTerminalRequests = DEFAULT_MAX_TERMINAL_REQUESTS,
  rootDir,
} = {}) {
  const registryPath = path.join(rootDir, 'var', 'runtime-requests.json');

  function readState() {
    return normalizeRegistryState(readJson(registryPath, {}));
  }

  function saveState(state) {
    writeJsonAtomic(registryPath, {
      ...normalizeRegistryState(state),
      terminal: sortTerminalRequests(state.terminal || []).slice(0, maxTerminalRequests),
      updatedAt: new Date().toISOString(),
    });
  }

  function recoverStaleActiveRequests({ reason = 'runtime-restart' } = {}) {
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
      statusCode: 0,
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

  function startRequest({
    id,
    method = 'GET',
    path: requestPath = '/',
    startedAt = new Date().toISOString(),
    startedAtMs = Date.now(),
  } = {}) {
    const requestId = normalizeText(id);
    if (!requestId) {
      throw new Error('Runtime request id is required.');
    }

    const state = readState();
    const entry = {
      id: requestId,
      method: normalizeText(method, 'GET'),
      path: normalizeText(requestPath, '/'),
      pid: process.pid,
      startedAt,
      startedAtMs,
      status: 'active',
    };

    saveState({
      ...state,
      active: [...state.active.filter((item) => item.id !== requestId), entry],
    });

    return entry;
  }

  function finishRequest(id, { statusCode = 0 } = {}) {
    const requestId = normalizeText(id);
    const state = readState();
    const activeIndex = state.active.findIndex((entry) => entry.id === requestId);
    if (activeIndex === -1) {
      return null;
    }

    const [entry] = state.active.splice(activeIndex, 1);
    const finished = {
      ...entry,
      durationMs: typeof entry.startedAtMs === 'number' ? Math.max(0, Date.now() - entry.startedAtMs) : 0,
      endedAt: new Date().toISOString(),
      status: 'completed',
      statusCode,
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
    const terminal = sortTerminalRequests(state.terminal).map(({ startedAtMs, ...entry }) => entry);

    return {
      active,
      activeCount: active.length,
      recent: terminal.slice(0, recentLimit),
      recentCount: terminal.length,
      registryPath,
    };
  }

  return {
    finishRequest,
    readState,
    recoverStaleActiveRequests,
    registryPath,
    startRequest,
    summarize,
  };
}
