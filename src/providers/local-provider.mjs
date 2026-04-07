import { createStubProvider } from './stub-provider.mjs';
import {
  createProviderFailure,
  extractProviderFailure,
  normalizeUsageMetrics,
  requestJsonWithPolicy,
} from './provider-runtime-utils.mjs';
import {
  buildRequestPrompt,
  extractChatCompletionText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';

const LOCAL_PROBE_TIMEOUT_MS = 5000;
const LOCAL_RUN_TIMEOUT_MS = 15000;
const LOCAL_MAX_ATTEMPTS = 2;

function resolveLocalConfig(env) {
  const model = normalizeText(env.LOCAL_PROVIDER_MODEL);
  if (!model) {
    throw createProviderFailure('LOCAL_PROVIDER_MODEL is required to use --provider local.', {
      failureKind: 'config',
      rawMessage: 'LOCAL_PROVIDER_MODEL is required.',
      recoverable: false,
      timedOut: false,
    });
  }

  let maxTokens;
  try {
    maxTokens = parsePositiveInteger(env.LOCAL_PROVIDER_MAX_TOKENS, 2048, 'LOCAL_PROVIDER_MAX_TOKENS');
  } catch (error) {
    throw createProviderFailure(error instanceof Error ? error.message : String(error), {
      failureKind: 'config',
      rawMessage: error instanceof Error ? error.message : String(error),
      recoverable: false,
      timedOut: false,
    });
  }

  return {
    apiKey: normalizeText(env.LOCAL_PROVIDER_API_KEY),
    baseUrl: normalizeText(env.LOCAL_PROVIDER_BASE_URL, 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
    maxTokens,
    model,
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
        maxAttempts: LOCAL_MAX_ATTEMPTS,
        method: 'GET',
        providerLabel: 'Local',
        timeoutMs: LOCAL_PROBE_TIMEOUT_MS,
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
        transport: 'openai-compatible-chat-completions',
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
        maxAttempts: LOCAL_MAX_ATTEMPTS,
        method: 'POST',
        providerLabel: 'Local',
        timeoutMs: LOCAL_RUN_TIMEOUT_MS,
        url: `${config.baseUrl}/chat/completions`,
      });
      const providerResponseId = normalizeText(payload.id);
      const usage = normalizeUsageMetrics({
        inputTokens: payload?.usage?.prompt_tokens,
        outputTokens: payload?.usage?.completion_tokens,
        totalTokens: payload?.usage?.total_tokens,
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
