import { spawn as nodeSpawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const EMBEDDING_PROTOCOL_VERSION = 'personal-ai-agent-embedding/v1';

const DEFAULT_MAX_DIMENSIONS = 8_192;
const DEFAULT_MAX_INPUT_CHARS = 200_000;
const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TEXTS = 256;
const DEFAULT_TIMEOUT_MS = 30_000;
const SAFE_ENV_KEYS = Object.freeze([
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PATH',
  'TMPDIR',
]);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function buildLocalCommandEnvironment(source = process.env) {
  return Object.fromEntries(
    SAFE_ENV_KEYS
      .map((key) => [key, normalizeText(source[key])])
      .filter(([, value]) => value),
  );
}

function normalizeEmbeddingTexts(texts, { maxInputChars, maxTexts }) {
  const normalized = ensureArray(texts).map((text) => normalizeText(text));
  if (!normalized.length) {
    throw new Error('At least one embedding text is required.');
  }
  if (normalized.some((text) => !text)) {
    throw new Error('Embedding texts must not be empty.');
  }
  if (normalized.length > maxTexts) {
    throw new Error(`Embedding text count exceeds the limit of ${maxTexts}.`);
  }

  const inputChars = normalized.reduce((sum, text) => sum + text.length, 0);
  if (inputChars > maxInputChars) {
    throw new Error(`Embedding input exceeds the limit of ${maxInputChars} characters.`);
  }
  return normalized;
}

function normalizeVector(vector, index, maxDimensions) {
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error(`Embedding vector ${index} must be a non-empty array.`);
  }
  if (vector.length > maxDimensions) {
    throw new Error(`Embedding vector dimensions exceed the limit of ${maxDimensions}.`);
  }

  return vector.map((value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(`Embedding vector ${index} contains a non-finite value.`);
    }
    return number;
  });
}

export function validateEmbeddingBatchResult(result, {
  expectedCount,
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
} = {}) {
  if (result?.schemaVersion !== EMBEDDING_PROTOCOL_VERSION) {
    throw new Error(`Unsupported embedding schema: ${normalizeText(result?.schemaVersion, '<empty>')}`);
  }

  const modelId = normalizeText(result?.modelId);
  if (!modelId) {
    throw new Error('Local embedding result modelId is required.');
  }
  const vectors = ensureArray(result?.vectors).map((vector, index) =>
    normalizeVector(vector, index, maxDimensions),
  );
  if (Number.isInteger(expectedCount) && vectors.length !== expectedCount) {
    throw new Error(`Local embedding result expected ${expectedCount} vectors but received ${vectors.length}.`);
  }
  if (!vectors.length) {
    throw new Error('Local embedding result vectors are required.');
  }

  const dimensions = vectors[0].length;
  if (vectors.some((vector) => vector.length !== dimensions)) {
    throw new Error('Local embedding vectors must use one dimension size.');
  }
  if (result.dimensions !== undefined && Number(result.dimensions) !== dimensions) {
    throw new Error(`Local embedding dimensions expected ${result.dimensions} but received ${dimensions}.`);
  }

  return {
    dimensions,
    modelId,
    schemaVersion: EMBEDDING_PROTOCOL_VERSION,
    vectors,
  };
}

function runLocalEmbeddingCommand({
  args,
  command,
  cwd,
  environment,
  maxOutputBytes,
  payload,
  spawnProcess,
  timeoutMs,
}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, {
      cwd,
      env: environment,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let settled = false;
    let stderr = '';
    let stdout = '';

    function finish(error, result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }

    function appendOutput(current, chunk, streamName) {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(new Error(`Local embedding ${streamName} exceeds ${maxOutputBytes} bytes.`));
        return current;
      }
      return next;
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`Local embedding command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.on('error', (error) => {
      const message = error?.code === 'ENOENT'
        ? `Local embedding command not found: ${command}.`
        : `Local embedding command failed to start: ${normalizeText(error?.message, 'unknown error')}`;
      finish(new Error(message));
    });
    child.stdout.on('data', (chunk) => {
      stdout = appendOutput(stdout, chunk, 'stdout');
    });
    child.stderr.on('data', (chunk) => {
      stderr = appendOutput(stderr, chunk, 'stderr');
    });
    child.on('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      if (exitCode !== 0) {
        const detail = normalizeText(stderr).slice(0, 500) || `signal=${normalizeText(signal, 'none')}`;
        finish(new Error(`Local embedding command exited with code ${exitCode}: ${detail}`));
        return;
      }
      try {
        finish(null, JSON.parse(stdout));
      } catch (error) {
        finish(new Error(`Local embedding command returned invalid JSON: ${error.message}`));
      }
    });

    child.stdin.on('error', (error) => {
      finish(new Error(`Local embedding command stdin failed: ${error.message}`));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

export function createLocalCommandEmbeddingAdapter({
  args = [],
  command,
  cwd = process.cwd(),
  env = process.env,
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
  maxInputChars = DEFAULT_MAX_INPUT_CHARS,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  maxTexts = DEFAULT_MAX_TEXTS,
  spawnProcess = nodeSpawn,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const normalizedCommand = normalizeText(command);
  if (!normalizedCommand) {
    throw new Error('Local embedding command is required.');
  }
  const normalizedArgs = ensureArray(args).map((arg) => String(arg));
  const normalizedTimeoutMs = normalizePositiveInteger(timeoutMs, DEFAULT_TIMEOUT_MS, 'timeoutMs');
  const normalizedMaxDimensions = normalizePositiveInteger(
    maxDimensions,
    DEFAULT_MAX_DIMENSIONS,
    'maxDimensions',
  );
  const normalizedMaxInputChars = normalizePositiveInteger(
    maxInputChars,
    DEFAULT_MAX_INPUT_CHARS,
    'maxInputChars',
  );
  const normalizedMaxOutputBytes = normalizePositiveInteger(
    maxOutputBytes,
    DEFAULT_MAX_OUTPUT_BYTES,
    'maxOutputBytes',
  );
  const normalizedMaxTexts = normalizePositiveInteger(maxTexts, DEFAULT_MAX_TEXTS, 'maxTexts');
  const environment = buildLocalCommandEnvironment(env);

  return {
    id: `local-command:${path.basename(normalizedCommand)}`,
    kind: 'local-command',
    protocolVersion: EMBEDDING_PROTOCOL_VERSION,
    security: {
      environmentPolicy: 'allowlist',
      environmentKeys: Object.keys(environment).sort(),
      networkIsolation: 'caller-owned',
      shell: false,
      transport: 'local-process-stdio',
    },
    async embedTexts({ purpose = 'retrieval-experiment', texts } = {}) {
      const normalizedTexts = normalizeEmbeddingTexts(texts, {
        maxInputChars: normalizedMaxInputChars,
        maxTexts: normalizedMaxTexts,
      });
      const response = await runLocalEmbeddingCommand({
        args: normalizedArgs,
        command: normalizedCommand,
        cwd,
        environment,
        maxOutputBytes: normalizedMaxOutputBytes,
        payload: {
          purpose: normalizeText(purpose, 'retrieval-experiment'),
          schemaVersion: EMBEDDING_PROTOCOL_VERSION,
          texts: normalizedTexts,
        },
        spawnProcess,
        timeoutMs: normalizedTimeoutMs,
      });

      return validateEmbeddingBatchResult(response, {
        expectedCount: normalizedTexts.length,
        maxDimensions: normalizedMaxDimensions,
      });
    },
  };
}
