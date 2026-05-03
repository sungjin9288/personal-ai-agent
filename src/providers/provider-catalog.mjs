import { PROVIDER_IDS } from '../core/constants.mjs';

const PROVIDER_CATALOG = Object.freeze({
  stub: Object.freeze({
    id: 'stub',
    defaultProvider: true,
    displayName: 'Stub',
    optionalEnv: [],
    requiredEnv: [],
    transport: 'deterministic-local',
    defaults: Object.freeze({}),
    envKeys: Object.freeze({}),
    capabilities: Object.freeze({
      costTelemetry: false,
      localOnly: true,
      modelDiscovery: false,
      roles: Object.freeze(['manager', 'planner', 'executor', 'reviewer', 'specialist']),
      structuredJson: true,
      toolCalls: false,
      usageMetrics: false,
    }),
    runtime: Object.freeze({
      maxAttempts: 1,
      probeTimeoutMs: 0,
      rateLimit: Object.freeze({
        maxConcurrency: 8,
        maxRequests: 0,
        reactiveBlockMs: 0,
        windowMs: 60_000,
      }),
      runTimeoutMs: 0,
    }),
    configurationFields: Object.freeze([]),
  }),
  openai: Object.freeze({
    id: 'openai',
    defaultProvider: false,
    displayName: 'OpenAI',
    optionalEnv: Object.freeze([
      'OPENAI_MODEL',
      'OPENAI_BASE_URL',
      'OPENAI_PROBE_TIMEOUT_MS',
      'OPENAI_RUN_TIMEOUT_MS',
      'OPENAI_INPUT_COST_PER_1M_USD',
      'OPENAI_OUTPUT_COST_PER_1M_USD',
    ]),
    requiredEnv: Object.freeze(['OPENAI_API_KEY']),
    transport: 'responses-api',
    defaults: Object.freeze({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.2',
    }),
    envKeys: Object.freeze({
      apiKey: 'OPENAI_API_KEY',
      baseUrl: 'OPENAI_BASE_URL',
      model: 'OPENAI_MODEL',
      inputCostPer1MUsd: 'OPENAI_INPUT_COST_PER_1M_USD',
      outputCostPer1MUsd: 'OPENAI_OUTPUT_COST_PER_1M_USD',
    }),
    capabilities: Object.freeze({
      costTelemetry: true,
      localOnly: false,
      modelDiscovery: true,
      roles: Object.freeze(['manager', 'planner', 'executor', 'reviewer', 'specialist']),
      structuredJson: true,
      toolCalls: false,
      usageMetrics: true,
    }),
    runtime: Object.freeze({
      maxAttempts: 2,
      probeTimeoutMs: 8000,
      rateLimit: Object.freeze({
        maxConcurrency: 4,
        maxRequests: 40,
        reactiveBlockMs: 1000,
        windowMs: 60_000,
      }),
      runTimeoutMs: 45000,
    }),
    configurationFields: Object.freeze([
      Object.freeze({
        key: 'apiKeyPresent',
        envKey: 'OPENAI_API_KEY',
        type: 'presence',
      }),
      Object.freeze({
        key: 'baseUrl',
        envKey: 'OPENAI_BASE_URL',
        defaultValue: 'https://api.openai.com/v1',
      }),
      Object.freeze({
        key: 'model',
        envKey: 'OPENAI_MODEL',
        defaultValue: 'gpt-5.2',
      }),
      Object.freeze({
        key: 'probeTimeoutMs',
        envKey: 'OPENAI_PROBE_TIMEOUT_MS',
        defaultValue: '8000',
      }),
      Object.freeze({
        key: 'runTimeoutMs',
        envKey: 'OPENAI_RUN_TIMEOUT_MS',
        defaultValue: '45000',
      }),
      Object.freeze({
        key: 'inputCostPer1MUsd',
        envKey: 'OPENAI_INPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
      Object.freeze({
        key: 'outputCostPer1MUsd',
        envKey: 'OPENAI_OUTPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
    ]),
  }),
  anthropic: Object.freeze({
    id: 'anthropic',
    defaultProvider: false,
    displayName: 'Anthropic',
    optionalEnv: Object.freeze([
      'ANTHROPIC_MODEL',
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_VERSION',
      'ANTHROPIC_MAX_TOKENS',
      'ANTHROPIC_INPUT_COST_PER_1M_USD',
      'ANTHROPIC_OUTPUT_COST_PER_1M_USD',
    ]),
    requiredEnv: Object.freeze(['ANTHROPIC_API_KEY']),
    transport: 'messages-api',
    defaults: Object.freeze({
      baseUrl: 'https://api.anthropic.com/v1',
      maxTokens: 2048,
      model: 'claude-sonnet-4-6',
      version: '2023-06-01',
    }),
    envKeys: Object.freeze({
      apiKey: 'ANTHROPIC_API_KEY',
      baseUrl: 'ANTHROPIC_BASE_URL',
      maxTokens: 'ANTHROPIC_MAX_TOKENS',
      model: 'ANTHROPIC_MODEL',
      inputCostPer1MUsd: 'ANTHROPIC_INPUT_COST_PER_1M_USD',
      outputCostPer1MUsd: 'ANTHROPIC_OUTPUT_COST_PER_1M_USD',
      version: 'ANTHROPIC_VERSION',
    }),
    capabilities: Object.freeze({
      costTelemetry: true,
      localOnly: false,
      modelDiscovery: true,
      roles: Object.freeze(['manager', 'planner', 'executor', 'reviewer', 'specialist']),
      structuredJson: true,
      thinking: false,
      toolCalls: false,
      usageMetrics: true,
    }),
    runtime: Object.freeze({
      maxAttempts: 2,
      probeTimeoutMs: 8000,
      rateLimit: Object.freeze({
        maxConcurrency: 4,
        maxRequests: 40,
        reactiveBlockMs: 1000,
        windowMs: 60_000,
      }),
      runTimeoutMs: 45000,
    }),
    configurationFields: Object.freeze([
      Object.freeze({
        key: 'apiKeyPresent',
        envKey: 'ANTHROPIC_API_KEY',
        type: 'presence',
      }),
      Object.freeze({
        key: 'baseUrl',
        envKey: 'ANTHROPIC_BASE_URL',
        defaultValue: 'https://api.anthropic.com/v1',
      }),
      Object.freeze({
        key: 'model',
        envKey: 'ANTHROPIC_MODEL',
        defaultValue: 'claude-sonnet-4-6',
      }),
      Object.freeze({
        key: 'version',
        envKey: 'ANTHROPIC_VERSION',
        defaultValue: '2023-06-01',
      }),
      Object.freeze({
        key: 'maxTokens',
        envKey: 'ANTHROPIC_MAX_TOKENS',
        defaultValue: '2048',
      }),
      Object.freeze({
        key: 'inputCostPer1MUsd',
        envKey: 'ANTHROPIC_INPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
      Object.freeze({
        key: 'outputCostPer1MUsd',
        envKey: 'ANTHROPIC_OUTPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
    ]),
  }),
  local: Object.freeze({
    id: 'local',
    defaultProvider: false,
    displayName: 'Local',
    optionalEnv: Object.freeze([
      'LOCAL_PROVIDER_BASE_URL',
      'LOCAL_PROVIDER_API_KEY',
      'LOCAL_PROVIDER_MAX_TOKENS',
      'LOCAL_INPUT_COST_PER_1M_USD',
      'LOCAL_OUTPUT_COST_PER_1M_USD',
    ]),
    requiredEnv: Object.freeze(['LOCAL_PROVIDER_MODEL']),
    transport: 'openai-compatible-chat-completions',
    defaults: Object.freeze({
      baseUrl: 'http://127.0.0.1:11434/v1',
      maxTokens: 2048,
    }),
    envKeys: Object.freeze({
      apiKey: 'LOCAL_PROVIDER_API_KEY',
      baseUrl: 'LOCAL_PROVIDER_BASE_URL',
      maxTokens: 'LOCAL_PROVIDER_MAX_TOKENS',
      model: 'LOCAL_PROVIDER_MODEL',
      inputCostPer1MUsd: 'LOCAL_INPUT_COST_PER_1M_USD',
      outputCostPer1MUsd: 'LOCAL_OUTPUT_COST_PER_1M_USD',
    }),
    capabilities: Object.freeze({
      costTelemetry: true,
      localOnly: true,
      modelDiscovery: true,
      roles: Object.freeze(['manager', 'planner', 'executor', 'reviewer', 'specialist']),
      structuredJson: true,
      toolCalls: false,
      usageMetrics: true,
    }),
    runtime: Object.freeze({
      maxAttempts: 2,
      probeTimeoutMs: 5000,
      rateLimit: Object.freeze({
        maxConcurrency: 2,
        maxRequests: 60,
        reactiveBlockMs: 500,
        windowMs: 60_000,
      }),
      runTimeoutMs: 15000,
    }),
    configurationFields: Object.freeze([
      Object.freeze({
        key: 'apiKeyPresent',
        envKey: 'LOCAL_PROVIDER_API_KEY',
        type: 'presence',
      }),
      Object.freeze({
        key: 'baseUrl',
        envKey: 'LOCAL_PROVIDER_BASE_URL',
        defaultValue: 'http://127.0.0.1:11434/v1',
      }),
      Object.freeze({
        key: 'model',
        envKey: 'LOCAL_PROVIDER_MODEL',
      }),
      Object.freeze({
        key: 'maxTokens',
        envKey: 'LOCAL_PROVIDER_MAX_TOKENS',
        defaultValue: '2048',
      }),
      Object.freeze({
        key: 'inputCostPer1MUsd',
        envKey: 'LOCAL_INPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
      Object.freeze({
        key: 'outputCostPer1MUsd',
        envKey: 'LOCAL_OUTPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
    ]),
  }),
  hermes: Object.freeze({
    id: 'hermes',
    defaultProvider: false,
    displayName: 'Hermes',
    optionalEnv: Object.freeze([
      'HERMES_PROVIDER_BASE_URL',
      'HERMES_PROVIDER_API_KEY',
      'HERMES_PROVIDER_MAX_TOKENS',
      'HERMES_PROVIDER_PROBE_TIMEOUT_MS',
      'HERMES_PROVIDER_RUN_TIMEOUT_MS',
      'HERMES_INPUT_COST_PER_1M_USD',
      'HERMES_OUTPUT_COST_PER_1M_USD',
    ]),
    requiredEnv: Object.freeze(['HERMES_PROVIDER_MODEL']),
    transport: 'openai-compatible-hermes-chat-completions',
    defaults: Object.freeze({
      baseUrl: 'http://127.0.0.1:8000/v1',
      maxTokens: 2048,
    }),
    envKeys: Object.freeze({
      apiKey: 'HERMES_PROVIDER_API_KEY',
      baseUrl: 'HERMES_PROVIDER_BASE_URL',
      maxTokens: 'HERMES_PROVIDER_MAX_TOKENS',
      model: 'HERMES_PROVIDER_MODEL',
      probeTimeoutMs: 'HERMES_PROVIDER_PROBE_TIMEOUT_MS',
      runTimeoutMs: 'HERMES_PROVIDER_RUN_TIMEOUT_MS',
      inputCostPer1MUsd: 'HERMES_INPUT_COST_PER_1M_USD',
      outputCostPer1MUsd: 'HERMES_OUTPUT_COST_PER_1M_USD',
    }),
    capabilities: Object.freeze({
      costTelemetry: true,
      localOnly: false,
      modelDiscovery: true,
      roles: Object.freeze(['manager', 'planner', 'executor', 'reviewer', 'specialist']),
      structuredJson: true,
      toolCalls: true,
      usageMetrics: true,
    }),
    runtime: Object.freeze({
      maxAttempts: 2,
      probeTimeoutMs: 5000,
      rateLimit: Object.freeze({
        maxConcurrency: 2,
        maxRequests: 60,
        reactiveBlockMs: 500,
        windowMs: 60_000,
      }),
      runTimeoutMs: 30000,
    }),
    configurationFields: Object.freeze([
      Object.freeze({
        key: 'apiKeyPresent',
        envKey: 'HERMES_PROVIDER_API_KEY',
        type: 'presence',
      }),
      Object.freeze({
        key: 'baseUrl',
        envKey: 'HERMES_PROVIDER_BASE_URL',
        defaultValue: 'http://127.0.0.1:8000/v1',
      }),
      Object.freeze({
        key: 'model',
        envKey: 'HERMES_PROVIDER_MODEL',
      }),
      Object.freeze({
        key: 'maxTokens',
        envKey: 'HERMES_PROVIDER_MAX_TOKENS',
        defaultValue: '2048',
      }),
      Object.freeze({
        key: 'probeTimeoutMs',
        envKey: 'HERMES_PROVIDER_PROBE_TIMEOUT_MS',
        defaultValue: '5000',
      }),
      Object.freeze({
        key: 'runTimeoutMs',
        envKey: 'HERMES_PROVIDER_RUN_TIMEOUT_MS',
        defaultValue: '30000',
      }),
      Object.freeze({
        key: 'inputCostPer1MUsd',
        envKey: 'HERMES_INPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
      Object.freeze({
        key: 'outputCostPer1MUsd',
        envKey: 'HERMES_OUTPUT_COST_PER_1M_USD',
        emptyAsNull: true,
      }),
    ]),
  }),
});

function cloneProviderSpec(spec) {
  return {
    ...spec,
    capabilities: {
      ...spec.capabilities,
      roles: [...(spec.capabilities?.roles || [])],
    },
    configurationFields: spec.configurationFields.map((field) => ({ ...field })),
    defaults: { ...spec.defaults },
    envKeys: { ...spec.envKeys },
    optionalEnv: [...spec.optionalEnv],
    requiredEnv: [...spec.requiredEnv],
    runtime: {
      ...spec.runtime,
      rateLimit: { ...(spec.runtime?.rateLimit || {}) },
    },
  };
}

export function getProviderSpec(providerId = 'stub') {
  const normalizedProviderId = String(providerId || 'stub').trim() || 'stub';
  if (!PROVIDER_IDS.includes(normalizedProviderId) || !PROVIDER_CATALOG[normalizedProviderId]) {
    throw new Error(`Unsupported provider: ${normalizedProviderId}`);
  }

  return cloneProviderSpec(PROVIDER_CATALOG[normalizedProviderId]);
}

export function listProviderSpecs() {
  return PROVIDER_IDS.map((providerId) => getProviderSpec(providerId));
}
