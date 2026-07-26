import process from 'node:process';

import {
  EMBEDDING_PROTOCOL_VERSION,
  validateEmbeddingBatchResult,
} from '../src/core/embedding-adapter.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';

const MAX_INPUT_BYTES = 1024 * 1024;
const ALLOWED_OPTIONS = new Set(['--endpoint', '--model', '--timeout-ms']);

try {
  const options = parseOptions(process.argv.slice(2));
  const request = await readRequest();
  const result = await requestLoopbackJson({
    body: {
      input: request.texts,
      model: options.model,
      truncate: false,
    },
    endpoint: options.endpoint,
    pathname: '/api/embed',
    timeoutMs: options.timeoutMs,
  });
  const embedding = validateEmbeddingBatchResult(
    {
      dimensions: result.embeddings?.[0]?.length,
      modelId: options.model,
      schemaVersion: EMBEDDING_PROTOCOL_VERSION,
      vectors: result.embeddings,
    },
    { expectedCount: request.texts.length },
  );
  process.stdout.write(JSON.stringify(embedding));
} catch (error) {
  process.stderr.write(`Ollama embedding command failed: ${error.message}\n`);
  process.exitCode = 1;
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique --endpoint, --model, and optional --timeout-ms arguments.');
    }
    values.set(key, value);
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 30_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Ollama endpoint and model are required.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Ollama timeout must be a positive integer.');
  }
  return { endpoint, model, timeoutMs };
}

async function readRequest() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES) {
      throw new Error(`Embedding request exceeds ${MAX_INPUT_BYTES} bytes.`);
    }
  }
  let request;
  try {
    request = JSON.parse(input);
  } catch {
    throw new Error('Embedding request must be valid JSON.');
  }
  if (
    request?.schemaVersion !== EMBEDDING_PROTOCOL_VERSION ||
    !Array.isArray(request?.texts) ||
    request.texts.length === 0
  ) {
    throw new Error('Embedding request must use the supported schema with non-empty texts.');
  }
  return request;
}
