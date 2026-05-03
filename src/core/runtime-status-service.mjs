import fs from 'node:fs';
import path from 'node:path';

function now() {
  return new Date().toISOString();
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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function isProcessAlive(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }

  try {
    process.kill(numericPid, 0);
    return true;
  } catch {
    return false;
  }
}

export function createRuntimeStatusService({ rootDir, fileName = 'runtime-status.json' }) {
  const statusPath = path.join(rootDir, 'var', fileName);

  function readStatus() {
    return readJson(statusPath);
  }

  function writeStatus(patch = {}) {
    const previous = readStatus() || {};
    const status = {
      ...previous,
      ...patch,
      path: statusPath,
      updatedAt: now(),
    };
    writeJsonAtomic(statusPath, status);
    return status;
  }

  function classifyPreviousRuntime() {
    const previous = readStatus();
    if (!previous) {
      return null;
    }

    const previousPid = Number(previous.pid);
    const active = isProcessAlive(previousPid);
    if (active) {
      return {
        ...previous,
        active: true,
        stale: false,
      };
    }

    return {
      ...previous,
      active: false,
      stale: ['starting', 'listening'].includes(String(previous.state || previous.status || '')),
      staleDetectedAt: now(),
    };
  }

  function startRuntime({ discoveryPath = '', host = '', kind = 'web-ui', port = null, requestedPort = null, rootPath = rootDir, url = '' } = {}) {
    const previousRuntime = classifyPreviousRuntime();
    const status = {
      discoveryPath,
      host,
      kind,
      pid: process.pid,
      port,
      previousRuntime: previousRuntime?.stale ? previousRuntime : null,
      requestedPort,
      rootDir: rootPath,
      startedAt: now(),
      state: 'starting',
      status: 'starting',
      url,
    };

    writeJsonAtomic(statusPath, {
      ...status,
      path: statusPath,
      updatedAt: now(),
    });
    return readStatus();
  }

  function markListening({ discoveryPath = '', host = '', port, requestedPort, rootPath = rootDir, url = '' } = {}) {
    return writeStatus({
      discoveryPath,
      host,
      pid: process.pid,
      port,
      requestedPort,
      rootDir: rootPath,
      state: 'listening',
      status: 'listening',
      url,
    });
  }

  function markStopped(reason = 'shutdown') {
    return writeStatus({
      endedAt: now(),
      exitReason: reason,
      pid: process.pid,
      state: 'stopped',
      status: 'stopped',
    });
  }

  return {
    classifyPreviousRuntime,
    markListening,
    markStopped,
    readStatus,
    startRuntime,
    statusPath,
    writeStatus,
  };
}
