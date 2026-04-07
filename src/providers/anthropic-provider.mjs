import { createStubProvider } from './stub-provider.mjs';
import {
  createProviderFailure,
  extractProviderFailure,
  normalizeUsageMetrics,
  requestJsonWithPolicy,
} from './provider-runtime-utils.mjs';
import {
  buildRequestPrompt,
  extractAnthropicContentText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';

const ANTHROPIC_PROBE_TIMEOUT_MS = 8000;
const ANTHROPIC_RUN_TIMEOUT_MS = 20000;
const ANTHROPIC_MAX_ATTEMPTS = 2;

function resolveAnthropicConfig(env) {
  const apiKey = normalizeText(env.ANTHROPIC_API_KEY);
  if (!apiKey) {
    throw createProviderFailure('ANTHROPIC_API_KEY is required to use --provider anthropic.', {
      failureKind: 'config',
      rawMessage: 'ANTHROPIC_API_KEY is required.',
      recoverable: false,
      timedOut: false,
    });
  }

  const version = normalizeText(env.ANTHROPIC_VERSION, '2023-06-01');
  if (!version) {
    throw createProviderFailure('ANTHROPIC_VERSION must not be empty when --provider anthropic is used.', {
      failureKind: 'config',
      rawMessage: 'ANTHROPIC_VERSION must not be empty.',
      recoverable: false,
      timedOut: false,
    });
  }

  let maxTokens;
  try {
    maxTokens = parsePositiveInteger(env.ANTHROPIC_MAX_TOKENS, 2048, 'ANTHROPIC_MAX_TOKENS');
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
    baseUrl: normalizeText(env.ANTHROPIC_BASE_URL, 'https://api.anthropic.com/v1').replace(/\/$/, ''),
    maxTokens,
    model: normalizeText(env.ANTHROPIC_MODEL, 'claude-sonnet-4-6'),
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
      const { payload, attemptCount, durationMs } = await requestJsonWithPolicy({
        fetchImpl,
        headers: {
          'anthropic-version': config.version,
          'x-api-key': config.apiKey,
        },
        maxAttempts: ANTHROPIC_MAX_ATTEMPTS,
        method: 'GET',
        providerLabel: 'Anthropic',
        timeoutMs: ANTHROPIC_PROBE_TIMEOUT_MS,
        url: `${config.baseUrl}/models`,
      });
      const models = Array.isArray(payload?.data)
        ? payload.data.map((item) => normalizeText(item?.id)).filter(Boolean)
        : [];

      return {
        attemptCount,
        checkedAt: new Date().toISOString(),
        durationMs,
        endpoint: `${config.baseUrl}/models`,
        model: config.model,
        modelAvailable: models.includes(config.model),
        modelCount: models.length,
        ok: true,
        sampleModels: models.slice(0, 5),
        transport: 'messages-api',
      };
    },
    async run(input) {
      const config = resolveAnthropicConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const { payload, attemptCount, durationMs } = await requestJsonWithPolicy({
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
        maxAttempts: ANTHROPIC_MAX_ATTEMPTS,
        method: 'POST',
        providerLabel: 'Anthropic',
        timeoutMs: ANTHROPIC_RUN_TIMEOUT_MS,
        url: `${config.baseUrl}/messages`,
      });
      const providerResponseId = normalizeText(payload.id);
      const usage = normalizeUsageMetrics({
        inputTokens: payload?.usage?.input_tokens,
        outputTokens: payload?.usage?.output_tokens,
      });
      let output;
      try {
        const outputText = extractAnthropicContentText(payload);
        output = parseJsonText(outputText, 'Anthropic');
      } catch (error) {
        withProviderMetadata(error, {
          attemptCount,
          durationMs,
          providerResponseId,
        });
      }

      return {
        attemptCount,
        durationMs,
        output,
        providerResponseId,
        role: input.providerRole || input.role,
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
