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
  extractChatCompletionText,
  normalizeText,
  normalizeStructuredOutput,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';
import { getProviderSpec } from './provider-catalog.mjs';

const LOCAL_SPEC = getProviderSpec('local');

function resolveLocalConfig(env) {
  const model = normalizeText(env[LOCAL_SPEC.envKeys.model]);
  if (!model) {
    throw createProviderFailure('LOCAL_PROVIDER_MODEL is required to use --provider local.', {
      failureKind: 'config',
      rawMessage: 'LOCAL_PROVIDER_MODEL is required.',
      recoverable: false,
      timedOut: false,
    });
  }

  let maxTokens;
  let inputCostPer1MUsd;
  let outputCostPer1MUsd;
  let probeTimeoutMs;
  let runTimeoutMs;
  try {
    maxTokens = parsePositiveInteger(
      env[LOCAL_SPEC.envKeys.maxTokens],
      LOCAL_SPEC.defaults.maxTokens,
      LOCAL_SPEC.envKeys.maxTokens,
    );
    inputCostPer1MUsd = parseOptionalUsdRate(
      env[LOCAL_SPEC.envKeys.inputCostPer1MUsd],
      LOCAL_SPEC.envKeys.inputCostPer1MUsd,
    );
    outputCostPer1MUsd = parseOptionalUsdRate(
      env[LOCAL_SPEC.envKeys.outputCostPer1MUsd],
      LOCAL_SPEC.envKeys.outputCostPer1MUsd,
    );
    probeTimeoutMs = parseOptionalTimeoutMs(
      env[LOCAL_SPEC.envKeys.probeTimeoutMs],
      LOCAL_SPEC.runtime.probeTimeoutMs,
      LOCAL_SPEC.envKeys.probeTimeoutMs,
    );
    runTimeoutMs = parseOptionalTimeoutMs(
      env[LOCAL_SPEC.envKeys.runTimeoutMs],
      LOCAL_SPEC.runtime.runTimeoutMs,
      LOCAL_SPEC.envKeys.runTimeoutMs,
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
    apiKey: normalizeText(env[LOCAL_SPEC.envKeys.apiKey]),
    baseUrl: normalizeText(env[LOCAL_SPEC.envKeys.baseUrl], LOCAL_SPEC.defaults.baseUrl).replace(/\/$/, ''),
    maxTokens,
    model,
    pricing: {
      inputCostPer1MUsd,
      outputCostPer1MUsd,
    },
    probeTimeoutMs,
    runTimeoutMs,
  };
}

export function createLocalProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  function withProviderMetadata(error, metadata = {}) {
    const failure = extractProviderFailure(error);
    throw createProviderFailure(error instanceof Error ? error.message : String(error), {
      ...failure,
      ...metadata,
    });
  }

  return {
    id: 'local',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async probe() {
      const config = resolveLocalConfig(env);
      const headers = {};

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers,
        maxAttempts: LOCAL_SPEC.runtime.maxAttempts,
        method: 'GET',
        providerLabel: 'Local',
        rateLimit: {
          ...LOCAL_SPEC.runtime.rateLimit,
          scope: LOCAL_SPEC.id,
        },
        timeoutMs: config.probeTimeoutMs,
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
        transport: LOCAL_SPEC.transport,
      };
    },
    async run(input) {
      const config = resolveLocalConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const headers = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers,
        init: {
          body: JSON.stringify({
            max_tokens: config.maxTokens,
            messages: [
              {
                content:
                  'Return only valid JSON that matches the requested contract. Do not add code fences or explanatory prose.',
                role: 'system',
              },
              {
                content: buildRequestPrompt(input, delegatedPrompt),
                role: 'user',
              },
            ],
            model: config.model,
            temperature: 0,
          }),
        },
        maxAttempts: LOCAL_SPEC.runtime.maxAttempts,
        method: 'POST',
        providerLabel: 'Local',
        rateLimit: {
          ...LOCAL_SPEC.runtime.rateLimit,
          scope: LOCAL_SPEC.id,
        },
        timeoutMs: config.runTimeoutMs,
        url: `${config.baseUrl}/chat/completions`,
      });
      const providerResponseId = normalizeText(payload.id);
      const usage = normalizeUsageMetrics({
        inputTokens: payload?.usage?.prompt_tokens,
        outputTokens: payload?.usage?.completion_tokens,
        totalTokens: payload?.usage?.total_tokens,
      });
      const estimatedCostUsd = estimateUsageCostUsd({
        pricing: config.pricing,
        usage,
      });
      let output;
      try {
        const outputText = extractChatCompletionText(payload);
        output = parseJsonText(outputText, 'Local');
      } catch (error) {
        withProviderMetadata(error, {
          attemptCount,
          attemptHistory,
          durationMs,
          estimatedCostUsd,
          providerResponseId,
          retryCount,
          usageInputTokens: usage.inputTokens,
          usageOutputTokens: usage.outputTokens,
          usageTotalTokens: usage.totalTokens,
        });
      }

      return {
        attemptCount,
        attemptHistory,
        durationMs,
        estimatedCostUsd,
        output,
        providerResponseId,
        role: input.providerRole || input.role,
        retryCount,
        usageInputTokens: usage.inputTokens,
        usageOutputTokens: usage.outputTokens,
        usageTotalTokens: usage.totalTokens,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'Local');
    },
  };
}
