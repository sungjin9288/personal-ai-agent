import { spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const cliPath = path.join(process.cwd(), 'src', 'cli.mjs');

export function runCli({ rootDir, args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : null;
}

export async function createClosedLocalhostBaseUrl() {
  const server = http.createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  if (!port) {
    throw new Error('Failed to reserve a closed localhost port for CLI smoke tests.');
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  return `http://127.0.0.1:${port}`;
}
