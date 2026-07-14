import fs from 'node:fs';
import path from 'node:path';

function listenOnce(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

export async function listenWithPortFallback(server, {
  host,
  maxAttempts = 20,
  requestedPort,
}) {
  for (let offset = 0; offset <= maxAttempts; offset += 1) {
    const port = requestedPort + offset;
    try {
      await listenOnce(server, port, host);
      return {
        fallback: offset > 0,
        port,
      };
    } catch (error) {
      if (error?.code !== 'EADDRINUSE' || offset >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error(`No available UI port found from ${requestedPort}.`);
}

export function createServerBootstrap({
  discoveryDetails = {},
  discoveryPath,
  host,
  requestedPort,
  rootDir,
  runtimeStatus,
  fileSystem = fs,
  now = () => new Date().toISOString(),
  processHandle = process,
}) {
  let activePort = requestedPort;

  function writeDiscovery({ fallback, port }) {
    const url = `http://${host}:${port}`;
    fileSystem.mkdirSync(path.dirname(discoveryPath), { recursive: true });
    fileSystem.writeFileSync(
      discoveryPath,
      `${JSON.stringify(
        {
          ...discoveryDetails,
          actualPort: port,
          fallback,
          host,
          pid: processHandle.pid,
          requestedPort,
          rootDir,
          startedAt: now(),
          status: 'listening',
          url,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    return url;
  }

  async function start(server) {
    runtimeStatus.startRuntime({
      discoveryPath,
      host,
      kind: 'web-ui',
      requestedPort,
      rootPath: rootDir,
    });

    const listenResult = await listenWithPortFallback(server, {
      host,
      requestedPort,
    });
    activePort = listenResult.port;
    const url = writeDiscovery({
      fallback: listenResult.fallback,
      port: activePort,
    });

    runtimeStatus.markListening({
      discoveryPath,
      host,
      port: activePort,
      requestedPort,
      rootPath: rootDir,
      url,
    });

    return {
      ...listenResult,
      discoveryPath,
      requestedPort,
      rootDir,
      url,
    };
  }

  function stop(reason, exitCode) {
    try {
      runtimeStatus.markStopped(reason);
    } catch {
      // Status persistence is best effort during process shutdown.
    }
    processHandle.exit(exitCode);
  }

  function installShutdownHandlers() {
    processHandle.once('SIGINT', () => stop('SIGINT', 130));
    processHandle.once('SIGTERM', () => stop('SIGTERM', 143));
  }

  return {
    getActivePort: () => activePort,
    installShutdownHandlers,
    start,
  };
}
