import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createServerBootstrap, listenWithPortFallback } from '../src/web/server-bootstrap.mjs';

class PortSequenceServer extends EventEmitter {
  constructor(occupiedPorts = []) {
    super();
    this.occupiedPorts = new Set(occupiedPorts);
    this.ports = [];
  }

  listen(port) {
    this.ports.push(port);
    queueMicrotask(() => {
      if (this.occupiedPorts.has(port)) {
        const error = new Error('address in use');
        error.code = 'EADDRINUSE';
        this.emit('error', error);
        return;
      }
      this.emit('listening');
    });
  }
}

test('port fallback tries consecutive ports and reports the selected port', async () => {
  const server = new PortSequenceServer([4317, 4318]);

  const result = await listenWithPortFallback(server, {
    host: '127.0.0.1',
    requestedPort: 4317,
  });

  assert.deepEqual(server.ports, [4317, 4318, 4319]);
  assert.deepEqual(result, { fallback: true, port: 4319 });
});

test('non-address errors stop fallback immediately', async () => {
  const server = new PortSequenceServer();
  server.listen = function listen(port) {
    this.ports.push(port);
    queueMicrotask(() => {
      const error = new Error('permission denied');
      error.code = 'EACCES';
      this.emit('error', error);
    });
  };

  await assert.rejects(
    listenWithPortFallback(server, { host: '127.0.0.1', requestedPort: 80 }),
    /permission denied/,
  );
  assert.deepEqual(server.ports, [80]);
});

test('bootstrap writes discovery after listening and marks runtime state in order', async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-bootstrap-'));
  const discoveryPath = path.join(rootDir, 'var', 'server.json');
  const calls = [];
  const runtimeStatus = {
    markListening(payload) {
      calls.push(['listening', payload]);
    },
    markStopped(reason) {
      calls.push(['stopped', reason]);
    },
    startRuntime(payload) {
      calls.push(['starting', payload]);
    },
  };
  const processHandle = new EventEmitter();
  processHandle.pid = 321;
  processHandle.exit = (code) => calls.push(['exit', code]);
  t.after(() => fs.rmSync(rootDir, { force: true, recursive: true }));

  const bootstrap = createServerBootstrap({
    discoveryDetails: {
      runtimeStatusPath: path.join(rootDir, 'var', 'runtime-status.json'),
      staleRuntimeJobCount: 2,
    },
    discoveryPath,
    host: '127.0.0.1',
    now: () => '2026-07-14T00:00:00.000Z',
    processHandle,
    requestedPort: 4317,
    rootDir,
    runtimeStatus,
  });
  const server = new PortSequenceServer([4317]);

  const result = await bootstrap.start(server);

  assert.equal(bootstrap.getActivePort(), 4318);
  assert.deepEqual(result, {
    discoveryPath,
    fallback: true,
    port: 4318,
    requestedPort: 4317,
    rootDir,
    url: 'http://127.0.0.1:4318',
  });
  assert.deepEqual(calls.map(([name]) => name), ['starting', 'listening']);
  assert.deepEqual(JSON.parse(fs.readFileSync(discoveryPath, 'utf8')), {
    actualPort: 4318,
    fallback: true,
    host: '127.0.0.1',
    pid: 321,
    requestedPort: 4317,
    rootDir,
    runtimeStatusPath: path.join(rootDir, 'var', 'runtime-status.json'),
    staleRuntimeJobCount: 2,
    startedAt: '2026-07-14T00:00:00.000Z',
    status: 'listening',
    url: 'http://127.0.0.1:4318',
  });

  bootstrap.installShutdownHandlers();
  processHandle.emit('SIGTERM');
  assert.deepEqual(calls.slice(-2), [['stopped', 'SIGTERM'], ['exit', 143]]);
});

test('shutdown still exits when runtime status persistence fails', () => {
  const processHandle = new EventEmitter();
  const exitCodes = [];
  processHandle.pid = 654;
  processHandle.exit = (code) => exitCodes.push(code);
  const bootstrap = createServerBootstrap({
    discoveryPath: '/tmp/server-bootstrap-unused/server.json',
    host: '127.0.0.1',
    processHandle,
    requestedPort: 4317,
    rootDir: '/tmp/server-bootstrap-unused',
    runtimeStatus: {
      markStopped() {
        throw new Error('disk unavailable');
      },
    },
  });

  bootstrap.installShutdownHandlers();
  processHandle.emit('SIGINT');

  assert.deepEqual(exitCodes, [130]);
});
