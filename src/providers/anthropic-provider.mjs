import { createStubProvider } from './stub-provider.mjs';
import {
  buildRequestPrompt,
  extractAnthropicContentText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';

function resolveAnthropicConfig(env) {
  const apiKey = normalizeText(env.ANTHROPIC_API_KEY);
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required to use --provider anthropic.');
  }

  const version = normalizeText(env.ANTHROPIC_VERSION, '2023-06-01');
  if (!version) {
    throw new Error('ANTHROPIC_VERSION must not be empty when --provider anthropic is used.');
  }

  return {
    apiKey,
    baseUrl: normalizeText(env.ANTHROPIC_BASE_URL, 'https://api.anthropic.com/v1').replace(/\/$/, ''),
    maxTokens: parsePositiveInteger(env.ANTHROPIC_MAX_TOKENS, 2048, 'ANTHROPIC_MAX_TOKENS'),
    model: normalizeText(env.ANTHROPIC_MODEL, 'claude-sonnet-4-6'),
    version,
  };
}

export function createAnthropicProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  return {
    id: 'anthropic',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async probe() {
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the Anthropic provider.');
      }

      const config = resolveAnthropicConfig(env);
      const response = await fetchImpl(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'anthropic-version': config.version,
          'x-api-key': config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `Anthropic provider probe failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const models = Array.isArray(payload?.data)
        ? payload.data.map((item) => normalizeText(item?.id)).filter(Boolean)
        : [];

      return {
        checkedAt: new Date().toISOString(),
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
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the Anthropic provider.');
      }

      const config = resolveAnthropicConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const response = await fetchImpl(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'anthropic-version': config.version,
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
        },
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
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `Anthropic provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const outputText = extractAnthropicContentText(payload);

      return {
        output: parseJsonText(outputText, 'Anthropic'),
        providerResponseId: normalizeText(payload.id),
        role: input.role,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'Anthropic');
    },
  };
}
