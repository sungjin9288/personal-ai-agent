import { createStubProvider } from './stub-provider.mjs';
import {
  createProviderFailure,
  estimateUsageCostUsd,
  extractProviderFailure,
  normalizeUsageMetrics,
  parseOptionalUsdRate,
  requestJsonWithPolicy,
} from './provider-runtime-utils.mjs';
import {
  buildRequestPrompt,
  extractAnthropicContentText,
  normalizeText,
  normalizeStructuredOutput,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';
import { getProviderSpec } from './provider-catalog.mjs';

const ANTHROPIC_SPEC = getProviderSpec('anthropic');

function resolveAnthropicConfig(env) {
  const apiKey = normalizeText(env[ANTHROPIC_SPEC.envKeys.apiKey]);
  if (!apiKey) {
    throw createProviderFailure('ANTHROPIC_API_KEY is required to use --provider anthropic.', {
      failureKind: 'config',
      rawMessage: 'ANTHROPIC_API_KEY is required.',
      recoverable: false,
      timedOut: false,
    });
  }

  const version = normalizeText(env[ANTHROPIC_SPEC.envKeys.version], ANTHROPIC_SPEC.defaults.version);
  if (!version) {
    throw createProviderFailure('ANTHROPIC_VERSION must not be empty when --provider anthropic is used.', {
      failureKind: 'config',
      rawMessage: 'ANTHROPIC_VERSION must not be empty.',
      recoverable: false,
      timedOut: false,
    });
  }

  let maxTokens;
  let inputCostPer1MUsd;
  let outputCostPer1MUsd;
  try {
    maxTokens = parsePositiveInteger(
      env[ANTHROPIC_SPEC.envKeys.maxTokens],
      ANTHROPIC_SPEC.defaults.maxTokens,
      ANTHROPIC_SPEC.envKeys.maxTokens,
    );
    inputCostPer1MUsd = parseOptionalUsdRate(
      env[ANTHROPIC_SPEC.envKeys.inputCostPer1MUsd],
      ANTHROPIC_SPEC.envKeys.inputCostPer1MUsd,
    );
    outputCostPer1MUsd = parseOptionalUsdRate(
      env[ANTHROPIC_SPEC.envKeys.outputCostPer1MUsd],
      ANTHROPIC_SPEC.envKeys.outputCostPer1MUsd,
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
    baseUrl: normalizeText(env[ANTHROPIC_SPEC.envKeys.baseUrl], ANTHROPIC_SPEC.defaults.baseUrl).replace(/\/$/, ''),
    maxTokens,
    model: normalizeText(env[ANTHROPIC_SPEC.envKeys.model], ANTHROPIC_SPEC.defaults.model),
    pricing: {
      inputCostPer1MUsd,
      outputCostPer1MUsd,
    },
    version,
  };
}

export function createAnthropicProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  function withProviderMetadata(error, metadata = {}) {
    const failure = extractProviderFailure(error);
    throw createProviderFailure(error instanceof Error ? error.message : String(error), {
      ...failure,
      ...metadata,
    });
  }

  return {
    id: 'anthropic',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async probe() {
      const config = resolveAnthropicConfig(env);
      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers: {
          'anthropic-version': config.version,
          'x-api-key': config.apiKey,
        },
        maxAttempts: ANTHROPIC_SPEC.runtime.maxAttempts,
        method: 'GET',
        providerLabel: 'Anthropic',
        timeoutMs: ANTHROPIC_SPEC.runtime.probeTimeoutMs,
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
        transport: ANTHROPIC_SPEC.transport,
      };
    },
    async run(input) {
      const config = resolveAnthropicConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const { payload, attemptCount, attemptHistory, durationMs, retryCount } = await requestJsonWithPolicy({
        fetchImpl,
        headers: {
          'anthropic-version': config.version,
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
        },
        init: {
          body: JSON.stringify({
            max_tokens: config.maxTokens,
            messages: [
              {
                content: buildRequestPrompt(input, delegatedPrompt),
                role: 'user',
              },
            ],
            model: config.model,
            system:
              'Return only valid JSON that matches the requested contract. Do not add code fences or explanatory prose.',
          }),
        },
        maxAttempts: ANTHROPIC_SPEC.runtime.maxAttempts,
        method: 'POST',
        providerLabel: 'Anthropic',
        timeoutMs: ANTHROPIC_SPEC.runtime.runTimeoutMs,
        url: `${config.baseUrl}/messages`,
      });
      const providerResponseId = normalizeText(payload.id);
      const usage = normalizeUsageMetrics({
        inputTokens: payload?.usage?.input_tokens,
        outputTokens: payload?.usage?.output_tokens,
      });
      const estimatedCostUsd = estimateUsageCostUsd({
        pricing: config.pricing,
        usage,
      });
      let output;
      try {
        const outputText = extractAnthropicContentText(payload);
        output = parseJsonText(outputText, 'Anthropic');
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
      return normalizeStructuredOutput(result, input, 'Anthropic');
    },
  };
}
