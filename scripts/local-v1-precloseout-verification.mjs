import { spawnSync } from 'node:child_process';

import {
  LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS,
  LOCAL_V1_VERIFICATION_SCHEMA_VERSION,
  sha256Text,
} from '../src/core/local-v1-completion-closeout.mjs';
import { runCommandWithHardTimeout } from './process-timeout-utils.mjs';

const FAILURE_OUTPUT_TAIL_CHARACTERS = 4_000;

export function assertLocalV1BuilderState({
  implementationCommit,
  runGit = defaultRunGit,
} = {}) {
  const head = runGit(['rev-parse', 'HEAD']);
  if (head.status !== 0 || head.error || String(head.stdout).trim() !== implementationCommit) {
    throw new Error('--implementation-commit must match the current HEAD.');
  }

  for (const args of [['diff', '--quiet'], ['diff', '--cached', '--quiet']]) {
    const result = runGit(args);
    if (result.status !== 0 || result.error) {
      throw new Error('Tracked worktree must be clean before Local v1 closeout evidence is built.');
    }
  }
}

export function runLocalV1PrecloseoutVerification({
  implementationCommit,
  packageJson,
  repoDir = process.cwd(),
  runCommand = runCommandWithHardTimeout,
  now = Date.now,
} = {}) {
  assertPackageScripts(packageJson);
  const checks = LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS.map((definition) => {
    const startedAt = now();
    const [command, ...args] = definition.command;
    const result = runCommand(command, args, {
      cwd: repoDir,
      env: process.env,
      timeoutMs: definition.timeoutMs,
    });
    const durationMs = Math.max(0, now() - startedAt);
    if (result.timedOut || result.error || result.status !== 0) {
      throw new Error(formatVerificationFailure({ definition, durationMs, result }));
    }
    return {
      command: definition.command.join(' '),
      commandSha256: sha256Text(definition.command.join(' ')),
      durationMs,
      exitCode: 0,
      id: definition.id,
      packageScript: definition.packageScript,
      packageScriptSha256: definition.packageScript === null
        ? null
        : sha256Text(packageJson.scripts[definition.packageScript]),
      stderrSha256: sha256Text(result.stderr || ''),
      stdoutSha256: sha256Text(result.stdout || ''),
      timedOut: false,
      timeoutMs: definition.timeoutMs,
    };
  });

  return {
    checks,
    implementationCommit,
    packageJsonSha256: sha256Text(JSON.stringify(packageJson)),
    schemaVersion: LOCAL_V1_VERIFICATION_SCHEMA_VERSION,
    status: 'passed',
  };
}

function formatVerificationFailure({ definition, durationMs, result }) {
  const stderr = String(result.stderr || '');
  const stdout = String(result.stdout || '');
  return [
    `Local v1 pre-closeout verification failed: ${definition.id}.`,
    `command=${definition.command.join(' ')}`,
    result.error ? `error=${result.error}` : null,
    result.signal ? `signal=${result.signal}` : null,
    `status=${result.status ?? ''}`,
    `timedOut=${Boolean(result.timedOut)}`,
    `durationMs=${durationMs}`,
    `timeoutMs=${definition.timeoutMs}`,
    `stdoutBytes=${Buffer.byteLength(stdout, 'utf8')}`,
    `stderrBytes=${Buffer.byteLength(stderr, 'utf8')}`,
    stdout ? `stdoutTail:\n${stdout.slice(-FAILURE_OUTPUT_TAIL_CHARACTERS)}` : null,
    stderr ? `stderrTail:\n${stderr.slice(-FAILURE_OUTPUT_TAIL_CHARACTERS)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function assertPackageScripts(packageJson) {
  if (!packageJson || typeof packageJson !== 'object' || !packageJson.scripts) {
    throw new Error('package.json scripts are required for Local v1 verification.');
  }
  for (const definition of LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS) {
    if (definition.packageScript === null) continue;
    if (packageJson.scripts[definition.packageScript] !== definition.packageScriptCommand) {
      throw new Error(`Local v1 verification package script drifted: ${definition.packageScript}.`);
    }
  }
}

function defaultRunGit(args) {
  return spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
