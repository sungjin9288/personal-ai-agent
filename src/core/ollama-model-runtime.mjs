import { performance } from 'node:perf_hooks';

import { requestLoopbackJson } from './loopback-json-client.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeModelId(value) {
  const modelId = normalizeText(value);
  if (!modelId || modelId.length > 200 || /[\r\n]/.test(modelId)) {
    throw new Error('Ollama runtime model is required and bounded.');
  }
  return modelId;
}

function normalizePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

export async function readLoadedOllamaModel({ endpoint, model, timeoutMs } = {}) {
  const modelId = normalizeModelId(model);
  const response = await requestLoopbackJson({
    endpoint,
    pathname: '/api/ps',
    timeoutMs,
  });
  const loaded = response.models?.find(
    (item) => normalizeText(item.name || item.model) === modelId,
  );
  if (!loaded) {
    return null;
  }
  return {
    contextLength: Number(loaded.context_length),
    loadedModelBytes: Number(loaded.size),
    loadedModelVramBytes: Number(loaded.size_vram),
    modelDigest: normalizeText(loaded.digest),
    modelId,
    source: 'ollama-api-ps',
  };
}

export async function ensureOllamaModelUnloaded({
  endpoint,
  model,
  pollIntervalMs = 100,
  timeoutMs = 10_000,
} = {}) {
  const modelId = normalizeModelId(model);
  const normalizedPollIntervalMs = normalizePositiveInteger(
    pollIntervalMs,
    100,
    'pollIntervalMs',
  );
  const normalizedTimeoutMs = normalizePositiveInteger(timeoutMs, 10_000, 'timeoutMs');
  const startedAt = performance.now();
  const initiallyLoaded = Boolean(
    await readLoadedOllamaModel({ endpoint, model: modelId, timeoutMs: normalizedTimeoutMs }),
  );
  if (initiallyLoaded) {
    const response = await requestLoopbackJson({
      body: { keep_alive: 0, model: modelId },
      endpoint,
      pathname: '/api/generate',
      timeoutMs: normalizedTimeoutMs,
    });
    if (normalizeText(response.done_reason) !== 'unload') {
      throw new Error('Ollama runtime did not confirm the model unload request.');
    }
  }

  let pollCount = 0;
  while (performance.now() - startedAt <= normalizedTimeoutMs) {
    pollCount += 1;
    const loaded = await readLoadedOllamaModel({
      endpoint,
      model: modelId,
      timeoutMs: normalizedTimeoutMs,
    });
    if (!loaded) {
      return {
        elapsedMs: Math.max(Number((performance.now() - startedAt).toFixed(3)), 0.001),
        initiallyLoaded,
        modelAbsentBeforeCold: true,
        modelId,
        pollCount,
        source: 'ollama-api-ps-and-conditional-generate-unload',
        unloadRequested: initiallyLoaded,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, normalizedPollIntervalMs));
  }
  throw new Error(`Ollama runtime did not unload model within ${normalizedTimeoutMs}ms.`);
}
