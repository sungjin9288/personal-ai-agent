import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  buildDarwinTrainingIsolationInvocation,
  buildDarwinTrainingMemoryProbeInvocation,
  buildDarwinTrainingResourceControlInvocation,
  LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
} from '../src/core/local-training-os-isolation.mjs';

const MAX_CAPTURE_BYTES = 4_096;
const PROBE_TIMEOUT_MS = 5_000;
const SYSTEM_TOOLS = Object.freeze({
  python: '/usr/bin/python3',
  sandbox: '/usr/bin/sandbox-exec',
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashFiles(filePaths) {
  const digests = filePaths.map((filePath) =>
    sha256(fs.readFileSync(filePath)),
  );
  return sha256(JSON.stringify(digests));
}

function assertSystemTool(filePath) {
  const stats = fs.lstatSync(filePath);
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.uid !== 0 ||
    (stats.mode & 0o022) !== 0
  ) {
    throw new Error(
      'Local training OS isolation system tool is unsafe.',
    );
  }
}

function assertRepoFixture(repoDir, filePath) {
  const relativePath = path.relative(repoDir, filePath);
  const stats = fs.lstatSync(filePath);
  if (
    !relativePath ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (stats.mode & 0o022) !== 0
  ) {
    throw new Error(
      'Local training OS isolation fixture is unsafe.',
    );
  }
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value || '').trim());
  } catch {
    throw new Error(
      `Local training OS isolation ${label} is invalid.`,
    );
  }
}

function hasExpectedLimitStatus(value) {
  const limits = value?.limits;
  return Boolean(
    value?.status === 'applied' &&
    limits &&
    Object.keys(limits).length === 4 &&
    Object.entries(LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS)
      .every(([key, expected]) => limits[key] === expected),
  );
}

function runCommand({
  args,
  command,
  cwd,
  environment,
  spawnProcess = nodeSpawn,
  timeoutMs = PROBE_TIMEOUT_MS,
}) {
  return new Promise((resolve) => {
    let child;
    let outputOverflow = false;
    let settled = false;
    let status = '';
    let stderr = '';
    let stdout = '';
    let timer;
    let timedOut = false;

    function append(current, chunk) {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > MAX_CAPTURE_BYTES) {
        outputOverflow = true;
        child?.kill('SIGKILL');
        return current;
      }
      return next;
    }

    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        outputOverflow,
        status,
        stderr,
        stdout,
        timedOut,
      });
    }

    try {
      child = spawnProcess(command, args, {
        cwd,
        detached: false,
        env: environment,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
      });
    } catch {
      resolve({
        exitCode: null,
        outputOverflow: false,
        signal: null,
        startFailed: true,
        status: '',
        stderr: '',
        stdout: '',
        timedOut: false,
      });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk);
    });
    child.stdio[3].on('data', (chunk) => {
      status = append(status, chunk);
    });
    child.once('error', () => {
      finish({
        exitCode: null,
        signal: null,
        startFailed: true,
      });
    });
    child.once('close', (exitCode, signal) => {
      finish({ exitCode, signal, startFailed: false });
    });
  });
}

async function createLoopbackControlServer() {
  let acceptedConnections = 0;
  const server = net.createServer((socket) => {
    acceptedConnections += 1;
    socket.end();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    acceptedConnections: () => acceptedConnections,
    close: () => new Promise((resolve) => server.close(resolve)),
    port: server.address().port,
  };
}

export async function probeLocalTrainingOsIsolation({
  platform = process.platform,
  repoDir = process.cwd(),
  spawnProcess = nodeSpawn,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training OS isolation actual probe requires Darwin.',
    );
  }
  const wrapperPath = path.join(
    repoDir,
    'fixtures',
    'local-training-posix-limits-wrapper.py',
  );
  const fixturePath = path.join(
    repoDir,
    'fixtures',
    'local-training-os-isolation-command.mjs',
  );
  for (const toolPath of Object.values(SYSTEM_TOOLS)) {
    assertSystemTool(toolPath);
  }
  assertRepoFixture(repoDir, wrapperPath);
  assertRepoFixture(repoDir, fixturePath);

  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'training-os-isolation-'),
  );
  fs.chmodSync(temporaryDirectory, 0o700);
  const outputPath = path.join(temporaryDirectory, 'bounded-output.bin');
  const controlServer = await createLoopbackControlServer();
  try {
    const networkArgs = [fixturePath, 'network', String(controlServer.port)];
    const controlInvocation =
      buildDarwinTrainingResourceControlInvocation({
        childArgs: networkArgs,
        childCommand: process.execPath,
        wrapperPath,
      });
    const control = await runCommand({
      args: controlInvocation.args,
      command: controlInvocation.command,
      cwd: repoDir,
      environment: controlInvocation.environment,
      spawnProcess,
    });
    const controlResult = parseJson(control.stdout, 'network control');
    const protectedInvocation = buildDarwinTrainingIsolationInvocation({
      childArgs: networkArgs,
      childCommand: process.execPath,
      wrapperPath,
    });
    const protectedNetwork = await runCommand({
      args: protectedInvocation.args,
      command: protectedInvocation.command,
      cwd: repoDir,
      environment: protectedInvocation.environment,
      spawnProcess,
    });
    const protectedResult = parseJson(
      protectedNetwork.stdout,
      'protected network result',
    );

    const cpuInvocation = buildDarwinTrainingIsolationInvocation({
      childArgs: [fixturePath, 'cpu'],
      childCommand: process.execPath,
      wrapperPath,
    });
    const cpu = await runCommand({
      args: cpuInvocation.args,
      command: cpuInvocation.command,
      cwd: repoDir,
      environment: cpuInvocation.environment,
      spawnProcess,
    });

    const fileInvocation = buildDarwinTrainingIsolationInvocation({
      childArgs: [fixturePath, 'file-size', outputPath],
      childCommand: process.execPath,
      wrapperPath,
    });
    const fileSize = await runCommand({
      args: fileInvocation.args,
      command: fileInvocation.command,
      cwd: repoDir,
      environment: fileInvocation.environment,
      spawnProcess,
    });
    const fileResult = fileSize.stdout.trim()
      ? parseJson(fileSize.stdout, 'file-size result')
      : null;
    const writtenBytes = fs.existsSync(outputPath)
      ? fs.statSync(outputPath).size
      : 0;

    const openFilesInvocation = buildDarwinTrainingIsolationInvocation({
      childArgs: [fixturePath, 'open-files'],
      childCommand: process.execPath,
      wrapperPath,
    });
    const openFiles = await runCommand({
      args: openFilesInvocation.args,
      command: openFilesInvocation.command,
      cwd: repoDir,
      environment: openFilesInvocation.environment,
      spawnProcess,
    });
    const openFilesResult = parseJson(
      openFiles.stdout,
      'open-files result',
    );

    const memoryInvocation = buildDarwinTrainingMemoryProbeInvocation({
      wrapperPath,
    });
    const memory = await runCommand({
      args: memoryInvocation.args,
      command: memoryInvocation.command,
      cwd: repoDir,
      environment: memoryInvocation.environment,
      spawnProcess,
    });
    const memoryResult = parseJson(memory.stdout, 'memory result');

    const statusRecords = [
      control,
      protectedNetwork,
      cpu,
      fileSize,
      openFiles,
    ].map((result) => parseJson(result.status, 'limit status'));
    const processRuns = [
      control,
      protectedNetwork,
      cpu,
      fileSize,
      openFiles,
      memory,
    ];

    return {
      addressSpaceProbe: memoryResult.addressSpaceProbe,
      actualMlxMemoryLimitEnforced: false,
      controlNetworkAllowed:
        control.exitCode === 0 &&
        controlResult.connectDenied === false &&
        controlResult.listenDenied === false &&
        controlServer.acceptedConnections() === 1,
      coreDumpLimitApplied: statusRecords.every(
        (status) => status.limits.coreDumpBytes === 0,
      ),
      cpuLimitEnforced:
        cpu.timedOut === false &&
        ['SIGKILL', 'SIGXCPU'].includes(cpu.signal),
      externalProviderCalls: 'none',
      fileSizeLimitEnforced:
        writtenBytes <=
          LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS
            .fileSizeBytes &&
        (fileResult?.errorCode === 'EFBIG' ||
          fileSize.signal === 'SIGXFSZ'),
      fixtureSetSha256: hashFiles([wrapperPath, fixturePath]),
      limitStatusValidated: statusRecords.every(
        hasExpectedLimitStatus,
      ),
      networkDenyEnforced:
        protectedNetwork.exitCode === 0 &&
        protectedResult.connectDenied === true &&
        protectedResult.listenDenied === true &&
        controlServer.acceptedConnections() === 1,
      openFilesLimitEnforced:
        openFiles.exitCode === 0 &&
        openFilesResult.errorCode === 'EMFILE' &&
        openFilesResult.openedBelowLimit === true,
      outputBoundsPreserved: processRuns.every(
        (result) => result.outputOverflow === false,
      ),
      platform: 'darwin',
      systemToolSetSha256: hashFiles(Object.values(SYSTEM_TOOLS)),
    };
  } finally {
    await controlServer.close();
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}
