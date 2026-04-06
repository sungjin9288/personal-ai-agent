import { createStubProvider } from './stub-provider.mjs';
import {
  buildRequestPrompt,
  extractOpenAIOutputText,
  normalizeStructuredOutput,
  normalizeText,
  parseJsonText,
} from './structured-provider-utils.mjs';

function resolveOpenAIConfig(env) {
  const apiKey = normalizeText(env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to use --provider openai.');
  }

  return {
    apiKey,
    baseUrl: normalizeText(env.OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: normalizeText(env.OPENAI_MODEL, 'gpt-5.2'),
  };
}

export function createOpenAIProvider({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const delegatedProvider = createStubProvider({ rootDir });

  return {
    id: 'openai',
    implemented: true,
    preparePrompt(input) {
      return delegatedProvider.preparePrompt(input);
    },
    async run(input) {
      if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is not available for the OpenAI provider.');
      }

      const config = resolveOpenAIConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const response = await fetchImpl(`${config.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: buildRequestPrompt(input, delegatedPrompt),
          model: config.model,
        }),
      });

      if (!response.ok) {
        const errorText = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(
          `OpenAI provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
        );
      }

      const payload = await response.json();
      const outputText = extractOpenAIOutputText(payload);

      return {
        output: parseJsonText(outputText, 'OpenAI'),
        providerResponseId: normalizeText(payload.id),
        role: input.role,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'OpenAI');
    },
  };
}
