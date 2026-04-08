import { PROVIDER_IDS } from '../core/constants.mjs';
import { createAnthropicProvider } from './anthropic-provider.mjs';
import { createLocalProvider } from './local-provider.mjs';
import { createOpenAIProvider } from './openai-provider.mjs';
import { getProviderSpec, listProviderSpecs } from './provider-catalog.mjs';
import { extractProviderFailure } from './provider-runtime-utils.mjs';
import { createStubProvider } from './stub-provider.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function buildProviderConfiguration(spec, env) {
  return Object.fromEntries(
    (spec.configurationFields || []).map((field) => {
      const value = field.type === 'presence'
        ? Boolean(normalizeText(env[field.envKey]))
        : (() => {
            const normalized = normalizeText(env[field.envKey], field.defaultValue ?? '');
            if (!normalized && field.emptyAsNull) {
              return null;
            }
            return normalized;
          })();
      return [field.key, value];
    }),
  );
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

  status.configuration = buildProviderConfiguration(spec, env);

  return status;
}

export function createProviderRegistry({ rootDir, env = process.env, fetchImpl = globalThis.fetch }) {
  const providers = {
    stub: createStubProvider({ rootDir }),
    openai: createOpenAIProvider({ rootDir, env, fetchImpl }),
    anthropic: createAnthropicProvider({ rootDir, env, fetchImpl }),
    local: createLocalProvider({ rootDir, env, fetchImpl }),
  };

  return {
    getProvider(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      return providers[normalizedProviderId];
    },
    listProviders() {
      return listProviderSpecs().map((spec) => buildProviderStatus(spec, env, providers[spec.id]));
    },
    getProviderStatus(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      return buildProviderStatus(getProviderSpec(normalizedProviderId), env, providers[normalizedProviderId]);
    },
    async probeProvider(providerId) {
      const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
      if (!PROVIDER_IDS.includes(normalizedProviderId) || !providers[normalizedProviderId]) {
        throw new Error(`Unsupported provider: ${normalizedProviderId}`);
      }

      const status = buildProviderStatus(getProviderSpec(normalizedProviderId), env, providers[normalizedProviderId]);
      if (!status.implemented) {
        return {
          ...status,
          attemptCount: 0,
          attemptHistory: [],
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
          retryCount: 0,
          timedOut: false,
        };
      }

      if (!status.configured) {
        return {
          ...status,
          attemptCount: 0,
          attemptHistory: [],
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
          retryCount: 0,
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
