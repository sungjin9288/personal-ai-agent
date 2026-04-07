import { PROVIDER_IDS } from '../core/constants.mjs';
import { createAnthropicProvider } from './anthropic-provider.mjs';
import { createLocalProvider } from './local-provider.mjs';
import { createOpenAIProvider } from './openai-provider.mjs';
import { extractProviderFailure } from './provider-runtime-utils.mjs';
import { createStubProvider } from './stub-provider.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function buildProviderSpecMap() {
  return {
    stub: {
      id: 'stub',
      defaultProvider: true,
      displayName: 'Stub',
      optionalEnv: [],
      requiredEnv: [],
      transport: 'deterministic-local',
    },
    openai: {
      id: 'openai',
      defaultProvider: false,
      displayName: 'OpenAI',
      optionalEnv: ['OPENAI_MODEL', 'OPENAI_BASE_URL'],
      requiredEnv: ['OPENAI_API_KEY'],
      transport: 'responses-api',
    },
    anthropic: {
      id: 'anthropic',
      defaultProvider: false,
      displayName: 'Anthropic',
      optionalEnv: ['ANTHROPIC_MODEL', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_VERSION', 'ANTHROPIC_MAX_TOKENS'],
      requiredEnv: ['ANTHROPIC_API_KEY'],
      transport: 'messages-api',
    },
    local: {
      id: 'local',
      defaultProvider: false,
      displayName: 'Local',
      optionalEnv: ['LOCAL_PROVIDER_BASE_URL', 'LOCAL_PROVIDER_API_KEY', 'LOCAL_PROVIDER_MAX_TOKENS'],
      requiredEnv: ['LOCAL_PROVIDER_MODEL'],
      transport: 'openai-compatible-chat-completions',
    },
  };
}

function buildProviderStatus(spec, env, provider) {
  const missingEnv = spec.requiredEnv.filter((key) => !normalizeText(env[key]));
  const configured = missingEnv.length === 0;
  const status = {
    configured,
    defaultProvider: spec.defaultProvider,
    displayName: spec.displayName,
    id: spec.id,
    implemented: Boolean(provider?.implemented),
    missingEnv,
    optionalEnv: [...spec.optionalEnv],
    requiredEnv: [...spec.requiredEnv],
    transport: spec.transport,
  };

  if (spec.id === 'openai') {
    status.configuration = {
      apiKeyPresent: Boolean(normalizeText(env.OPENAI_API_KEY)),
      baseUrl: normalizeText(env.OPENAI_BASE_URL, 'https://api.openai.com/v1'),
      model: normalizeText(env.OPENAI_MODEL, 'gpt-5.2'),
    };
  } else if (spec.id === 'anthropic') {
    status.configuration = {
      apiKeyPresent: Boolean(normalizeText(env.ANTHROPIC_API_KEY)),
      baseUrl: normalizeText(env.ANTHROPIC_BASE_URL, 'https://api.anthropic.com/v1'),
      maxTokens: normalizeText(env.ANTHROPIC_MAX_TOKENS, '2048'),
      model: normalizeText(env.ANTHROPIC_MODEL, 'claude-sonnet-4-6'),
      version: normalizeText(env.ANTHROPIC_VERSION, '2023-06-01'),
    };
  } else if (spec.id === 'local') {
    status.configuration = {
      apiKeyPresent: Boolean(normalizeText(env.LOCAL_PROVIDER_API_KEY)),
      baseUrl: normalizeText(env.LOCAL_PROVIDER_BASE_URL, 'http://127.0.0.1:11434/v1'),
      maxTokens: normalizeText(env.LOCAL_PROVIDER_MAX_TOKENS, '2048'),
      model: normalizeText(env.LOCAL_PROVIDER_MODEL),
    };
  } else {
    status.configuration = {};
  }

  return status;
}

export function createProviderRegistry({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const providers = {
    stub: createStubProvider({ rootDir }),
    openai: createOpenAIProvider({ rootDir, env, fetchImpl }),
    anthropic: createAnthropicProvider({ rootDir, env, fetchImpl }),
    local: createLocalProvider({ rootDir, env, fetchImpl }),
  };
  const providerSpecs = buildProviderSpecMap();

  return {
    getProvider(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      return providers[normalizedProviderId];
    },
    listProviders() {
      return PROVIDER_IDS.map((providerId) => buildProviderStatus(providerSpecs[providerId], env, providers[providerId]));
    },
    getProviderStatus(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      return buildProviderStatus(providerSpecs[normalizedProviderId], env, providers[normalizedProviderId]);
    },
    async probeProvider(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      const status = buildProviderStatus(providerSpecs[normalizedProviderId], env, providers[normalizedProviderId]);
      if (!status.implemented) {
        return {
          ...status,
          attemptCount: 0,
          attempted: false,
          checkedAt: new Date().toISOString(),
          durationMs: 0,
          failureKind: 'unknown',
          httpStatus: null,
          ok: false,
          providerResponseId: null,
          rawMessage: `Provider not implemented yet: ${normalizedProviderId}`,
          recoverable: false,
          reason: `Provider not implemented yet: ${normalizedProviderId}`,
          timedOut: false,
        };
      }

      if (!status.configured) {
        return {
          ...status,
          attemptCount: 0,
          attempted: false,
          checkedAt: new Date().toISOString(),
          durationMs: 0,
          failureKind: 'config',
          httpStatus: null,
          ok: false,
          providerResponseId: null,
          rawMessage: `Missing required env: ${status.missingEnv.join(', ')}`,
          recoverable: false,
          reason: `Missing required env: ${status.missingEnv.join(', ')}`,
          timedOut: false,
        };
      }

      try {
        const probeResult = await providers[normalizedProviderId].probe();
        return {
          ...status,
          attempted: true,
          ...probeResult,
        };
      } catch (error) {
        const failure = extractProviderFailure(error);
        return {
          ...status,
          attempted: true,
          checkedAt: new Date().toISOString(),
          ...failure,
          ok: false,
          reason: failure.message,
        };
      }
    },
  };
}
