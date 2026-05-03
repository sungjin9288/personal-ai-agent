import { createStubProvider } from './stub-provider.mjs';
import {
  createProviderFailure,
  estimateUsageCostUsd,
  extractProviderFailure,
  normalizeUsageMetrics,
  parseOptionalTimeoutMs,
  parseOptionalUsdRate,
  requestJsonWithPolicy,
} from './provider-runtime-utils.mjs';
import {
  buildRequestPrompt,
  extractOpenAIOutputText,
  normalizeText,
  normalizeStructuredOutput,
  parseJsonText,
} from './structured-provider-utils.mjs';
import { getProviderSpec } from './provider-catalog.mjs';

const OPENAI_SPEC = getProviderSpec('openai');

function resolveOpenAIConfig(env) {
  const apiKey = normalizeText(env[OPENAI_SPEC.envKeys.apiKey]);
  if (!apiKey) {
    throw createProviderFailure('OPENAI_API_KEY is required to use --provider openai.', {
      failureKind: 'config',
      rawMessage: 'OPENAI_API_KEY is required.',
      recoverable: false,
      timedOut: false,
    });
  }

  let inputCostPer1MUsd;
  let outputCostPer1MUsd;
  let probeTimeoutMs;
  let runTimeoutMs;
  try {
    inputCostPer1MUsd = parseOptionalUsdRate(
      env[OPENAI_SPEC.envKeys.inputCostPer1MUsd],
      OPENAI_SPEC.envKeys.inputCostPer1MUsd,
    );
    outputCostPer1MUsd = parseOptionalUsdRate(
      env[OPENAI_SPEC.envKeys.outputCostPer1MUsd],
      OPENAI_SPEC.envKeys.outputCostPer1MUsd,
    );
    probeTimeoutMs = parseOptionalTimeoutMs(
      env.OPENAI_PROBE_TIMEOUT_MS,
      OPENAI_SPEC.runtime.probeTimeoutMs,
      'OPENAI_PROBE_TIMEOUT_MS',
    );
    runTimeoutMs = parseOptionalTimeoutMs(
      env.OPENAI_RUN_TIMEOUT_MS,
      OPENAI_SPEC.runtime.runTimeoutMs,
      'OPENAI_RUN_TIMEOUT_MS',
    );
  } catch (error) {
    throw createProviderFailure(error instanceof Error ? error.message : String(error), {
      failureKind: 'config',
      rawMessage: error instanceof Error ? error.message : String(error),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    apiKey,
    baseUrl: normalizeText(env[OPENAI_SPEC.envKeys.baseUrl], OPENAI_SPEC.defaults.baseUrl).replace(/\/$/, ''),
    model: normalizeText(env[OPENAI_SPEC.envKeys.model], OPENAI_SPEC.defaults.model),
    pricing: {
      inputCostPer1MUsd,
      outputCostPer1MUsd,
    },
    runtime: {
      maxAttempts: OPENAI_SPEC.runtime.maxAttempts,
      probeTimeoutMs,
      runTimeoutMs,
    },
  };
}

export function createOpenAIProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  function withProviderMetadata(error, metadata = {}) {
    const failure = extractProviderFailure(error);
    throw createProviderFailure(error instanceof Error ? error.message : String(error), {
      ...failure,
      ...metadata,
    });
  }

  return {
    id: 'openai',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async probe() {
      const config = resolveOpenAIConfig(env);
      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        maxAttempts: config.runtime.maxAttempts,
        method: 'GET',
        providerLabel: 'OpenAI',
        rateLimit: {
          ...OPENAI_SPEC.runtime.rateLimit,
          scope: OPENAI_SPEC.id,
        },
        timeoutMs: config.runtime.probeTimeoutMs,
        url: `${config.baseUrl}/models`,
      });
      const models = Array.isArray(payload?.data)
        ? payload.data.map((item) => normalizeText(item?.id)).filter(Boolean)
        : [];

      return {
        attemptCount,
        attemptHistory,
        checkedAt: new Date().toISOString(),
        durationMs,
        endpoint: `${config.baseUrl}/models`,
        model: config.model,
        modelAvailable: models.includes(config.model),
        modelCount: models.length,
        ok: true,
        retryCount,
        sampleModels: models.slice(0, 5),
        transport: OPENAI_SPEC.transport,
      };
    },
    async run(input) {
      const config = resolveOpenAIConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        init: {
          body: JSON.stringify({
            input: buildRequestPrompt(input, delegatedPrompt),
            model: config.model,
          }),
        },
        maxAttempts: config.runtime.maxAttempts,
        method: 'POST',
        providerLabel: 'OpenAI',
        rateLimit: {
          ...OPENAI_SPEC.runtime.rateLimit,
          scope: OPENAI_SPEC.id,
        },
        timeoutMs: config.runtime.runTimeoutMs,
        url: `${config.baseUrl}/responses`,
      });
      const providerResponseId = normalizeText(payload.id);
      const usage = normalizeUsageMetrics({
        inputTokens: payload?.usage?.input_tokens,
        outputTokens: payload?.usage?.output_tokens,
        totalTokens: payload?.usage?.total_tokens,
      });
      const estimatedCostUsd = estimateUsageCostUsd({
        pricing: config.pricing,
        usage,
      });
      let output;
      try {
        const outputText = extractOpenAIOutputText(payload);
        output = parseJsonText(outputText, 'OpenAI');
      } catch (error) {
        withProviderMetadata(error, {
          attemptCount,
          attemptHistory,
          durationMs,
          providerResponseId,
          retryCount,
          estimatedCostUsd,
          usageInputTokens: usage.inputTokens,
          usageOutputTokens: usage.outputTokens,
          usageTotalTokens: usage.totalTokens,
        });
      }

      return {
        attemptCount,
        attemptHistory,
        durationMs,
        output,
        providerResponseId,
        role: input.providerRole || input.role,
        retryCount,
        estimatedCostUsd,
        usageInputTokens: usage.inputTokens,
        usageOutputTokens: usage.outputTokens,
        usageTotalTokens: usage.totalTokens,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'OpenAI');
    },
  };
}
