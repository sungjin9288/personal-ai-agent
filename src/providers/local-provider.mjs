import { createStubProvider } from './stub-provider.mjs';
import {
  buildRequestPrompt,
  extractChatCompletionText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
  parsePositiveInteger,
} from './structured-provider-utils.mjs';

function resolveLocalConfig(env) {
  const model = normalizeText(env.LOCAL_PROVIDER_MODEL);
  if (!model) {
    throw new Error('LOCAL_PROVIDER_MODEL is required to use --provider local.');
  }

  return {
    apiKey: normalizeText(env.LOCAL_PROVIDER_API_KEY),
    baseUrl: normalizeText(env.LOCAL_PROVIDER_BASE_URL, 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
    maxTokens: parsePositiveInteger(env.LOCAL_PROVIDER_MAX_TOKENS, 2048, 'LOCAL_PROVIDER_MAX_TOKENS'),
    model,
  };
}

export function createLocalProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  return {
    id: 'local',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async run(input) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the local provider.');
      }

      const config = resolveLocalConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const headers = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
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
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `Local provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const outputText = extractChatCompletionText(payload);

      return {
        output: parseJsonText(outputText, 'Local'),
        providerResponseId: normalizeText(payload.id),
        role: input.role,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'Local');
    },
  };
}
