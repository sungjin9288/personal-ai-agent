import { PROVIDER_IDS } from '../core/constants.mjs';
import { createAnthropicProvider } from './anthropic-provider.mjs';
import { createOpenAIProvider } from './openai-provider.mjs';
import { createStubProvider } from './stub-provider.mjs';

function createPlannedProvider(id) {
  return {
    id,
    implemented: false,
    preparePrompt() {
      throw new Error(`Provider not implemented yet: ${id}`);
    },
    run() {
      throw new Error(`Provider not implemented yet: ${id}`);
    },
    normalizeOutput() {
      throw new Error(`Provider not implemented yet: ${id}`);
    },
  };
}

export function createProviderRegistry({ rootDir }) {
  const providers = {
    stub: createStubProvider({ rootDir }),
    openai: createOpenAIProvider({ rootDir }),
    anthropic: createAnthropicProvider({ rootDir }),
    local: createPlannedProvider('local'),
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
      return [...PROVIDER_IDS];
    },
  };
}
