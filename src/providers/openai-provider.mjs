import { createStubProvider } from './stub-provider.mjs';
import {
  createProviderFailure,
  extractProviderFailure,
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

  return {
    apiKey,
    baseUrl: normalizeText(env.OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: normalizeText(env.OPENAI_MODEL, 'gpt-5.2'),
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
      const { payload, attemptCount } = await requestJsonWithPolicy({
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
        checkedAt: new Date().toISOString(),
        endpoint: `${config.baseUrl}/models`,
        model: config.model,
        modelAvailable: models.includes(config.model),
        modelCount: models.length,
        ok: true,
        sampleModels: models.slice(0, 5),
        transport: 'responses-api',
      };
    },
    async run(input) {
      const config = resolveOpenAIConfig(env);
      const delegatedPrompt = delegatedProvider.preparePrompt(input);
      const { payload, attemptCount } = await requestJsonWithPolicy({
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
      let output;
      try {
        const outputText = extractOpenAIOutputText(payload);
        output = parseJsonText(outputText, 'OpenAI');
      } catch (error) {
        withProviderMetadata(error, {
          attemptCount,
          providerResponseId,
        });
      }

      return {
        attemptCount,
        output,
        providerResponseId,
        role: input.providerRole || input.role,
      };
    },
    normalizeOutput(result, input) {
      return normalizeStructuredOutput(result, input, 'OpenAI');
    },
  };
}
