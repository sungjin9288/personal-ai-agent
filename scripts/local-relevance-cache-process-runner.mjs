import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_STDOUT_BYTES = 256 * 1024;
const MAX_STDERR_BYTES = 16 * 1024;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(scriptDir, 'local-relevance-score-cache-worker.mjs');

export function runLocalRelevanceCacheWorkerProcess({ input, timeoutMs = 180_000 } = {}) {
  const payload = `${JSON.stringify(input)}\n`;
  if (Buffer.byteLength(payload) > MAX_INPUT_BYTES) {
    throw new Error(`Local relevance cache worker input exceeds ${MAX_INPUT_BYTES} bytes.`);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Local relevance cache worker timeout must be a positive integer.');
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath], {
      cwd: path.dirname(scriptDir),
      env: {},
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputLimitError = null;
    let spawnError = null;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      outputLimitError = new Error(`Local relevance cache worker timed out after ${timeoutMs}ms.`);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        outputLimitError = new Error('Local relevance cache worker stdout exceeded its limit.');
        child.kill('SIGKILL');
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_STDERR_BYTES) {
        outputLimitError = new Error('Local relevance cache worker stderr exceeded its limit.');
        child.kill('SIGKILL');
        return;
      }
      stderr.push(chunk);
    });
    child.on('error', (error) => {
      spawnError = error;
    });
    child.stdin.on('error', (error) => {
      spawnError ||= error;
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (outputLimitError) {
        reject(outputLimitError);
        return;
      }
      if (spawnError) {
        reject(spawnError);
        return;
      }
      const errorText = Buffer.concat(stderr, stderrBytes).toString('utf8').trim();
      if (code !== 0) {
        reject(new Error(
          `Local relevance cache worker failed (${code ?? signal}): ${errorText || 'no detail'}`,
        ));
        return;
      }
      try {
        const result = JSON.parse(Buffer.concat(stdout, stdoutBytes).toString('utf8'));
        if (result.workerId !== input?.workerId) {
          throw new Error('Local relevance cache worker returned another worker id.');
        }
        resolve(result);
      } catch (error) {
        reject(new Error(`Local relevance cache worker returned invalid JSON: ${error.message}`));
      }
    });
    child.stdin.end(payload);
  });
}
