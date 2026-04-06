import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cliPath = path.join(process.cwd(), 'src', 'cli.mjs');

export function runCli({ rootDir, args }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : null;
}
