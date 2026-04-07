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
  extractOpenAIOutputText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
} from './structured-provider-utils.mjs';

const OPENAI_PROBE_TIMEOUT_MS = 8000;
const OPENAI_RUN_TIMEOUT_MS = 20000;
const OPENAI_MAX_ATTEMPTS = 2;

function resolveOpenAIConfig(env) {
  const apiKey = normalizeText(env.OPENAI_API_KEY);
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
  try {
    inputCostPer1MUsd = parseOptionalUsdRate(env.OPENAI_INPUT_COST_PER_1M_USD, 'OPENAI_INPUT_COST_PER_1M_USD');
    outputCostPer1MUsd = parseOptionalUsdRate(env.OPENAI_OUTPUT_COST_PER_1M_USD, 'OPENAI_OUTPUT_COST_PER_1M_USD');
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
    baseUrl: normalizeText(env.OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: normalizeText(env.OPENAI_MODEL, 'gpt-5.2'),
    pricing: {
      inputCostPer1MUsd,
      outputCostPer1MUsd,
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
        maxAttempts: OPENAI_MAX_ATTEMPTS,
        method: 'GET',
        providerLabel: 'OpenAI',
        timeoutMs: OPENAI_PROBE_TIMEOUT_MS,
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
        transport: 'responses-api',
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
        maxAttempts: OPENAI_MAX_ATTEMPTS,
        method: 'POST',
        providerLabel: 'OpenAI',
        timeoutMs: OPENAI_RUN_TIMEOUT_MS,
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
