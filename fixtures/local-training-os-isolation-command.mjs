import fs from 'node:fs';
import net from 'node:net';

const mode = process.argv[2] || '';

if (mode === 'network') {
  const port = Number(process.argv[3]);
  const [connectResult, listenResult] = await Promise.all([
    tryConnect(port),
    tryListen(),
  ]);
  process.stdout.write(JSON.stringify({
    connectDenied: connectResult === 'EPERM',
    listenDenied: listenResult === 'EPERM',
  }));
} else if (mode === 'cpu') {
  while (true) {
    // The OS CPU limit must terminate this fixture.
  }
} else if (mode === 'file-size') {
  const outputPath = process.argv[3];
  try {
    fs.writeFileSync(outputPath, Buffer.alloc(131_072, 1));
    process.stdout.write('{"errorCode":"none"}');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      errorCode: error?.code || 'unknown',
    }));
  }
} else if (mode === 'open-files') {
  const descriptors = [];
  let errorCode = 'none';
  try {
    while (descriptors.length < 128) {
      descriptors.push(fs.openSync('/dev/null', 'r'));
    }
  } catch (error) {
    errorCode = error?.code || 'unknown';
  } finally {
    for (const descriptor of descriptors) {
      fs.closeSync(descriptor);
    }
  }
  process.stdout.write(JSON.stringify({
    errorCode,
    openedBelowLimit: descriptors.length < 32,
  }));
} else {
  process.stderr.write('{"status":"unsupported-mode"}');
  process.exitCode = 64;
}

function tryConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: '127.0.0.1',
      port,
    });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve('timeout');
    }, 1_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve('allowed');
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      resolve(error?.code || 'unknown');
    });
  });
}

function tryListen() {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timer = setTimeout(() => {
      server.close();
      resolve('timeout');
    }, 1_000);
    server.once('error', (error) => {
      clearTimeout(timer);
      resolve(error?.code || 'unknown');
    });
    server.listen(0, '127.0.0.1', () => {
      clearTimeout(timer);
      server.close(() => resolve('allowed'));
    });
  });
}
