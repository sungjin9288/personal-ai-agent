export const CHANNEL_ADAPTER_SCHEMA_VERSION = 'personal-ai-agent-channel-adapter/v1';
export const CHANNEL_ADAPTER_REGISTRY_SCHEMA_VERSION = 'personal-ai-agent-channel-adapter-registry/v1';
export const CHANNEL_ADAPTER_POLICY_ID = 'local-channel-adapter-policy/v1';
export const CHANNEL_ADAPTER_DISABLED_STOP_REASON = 'channel-adapter-disabled-by-default';

const EXTERNAL_MESSAGING_DENIED_CAPABILITIES = Object.freeze([
  'message-ingress',
  'message-egress',
  'webhook-receive',
  'external-dispatch',
]);

const REQUIRED_EXTERNAL_ENABLEMENT_GATES = Object.freeze([
  'pairing-boundary',
  'identity-binding',
  'workspace-routing',
  'retention-boundary',
  'permission-policy',
  'sandbox-policy',
  'support-boundary',
  'operator-approval',
]);

const LOCAL_ENABLEMENT_GATES = Object.freeze([
  {
    id: 'local-operator-context',
    required: true,
    satisfied: true,
    reason: 'Local operator context is already bound before gateway event creation.',
  },
  {
    id: 'workspace-routing',
    required: true,
    satisfied: true,
    reason: 'Mission create/run require an explicit workspace route.',
  },
]);

const DEFAULT_CHANNEL_ADAPTERS = Object.freeze([
  buildAdapter({
    id: 'cli',
    displayName: 'CLI operator adapter',
    channel: 'cli',
    category: 'local-control-plane',
    sourceType: 'cli',
    surface: 'cli',
    status: 'enabled',
    routeName: 'mission.cli',
    transport: 'local-process',
    capabilities: {
      commandIngress: true,
      messageEgress: false,
      messageIngress: false,
      webhookIngress: false,
    },
    enablementGates: LOCAL_ENABLEMENT_GATES,
  }),
  buildAdapter({
    id: 'web',
    displayName: 'Local web console adapter',
    channel: 'web',
    category: 'local-control-plane',
    sourceType: 'web',
    surface: 'web-console',
    status: 'enabled',
    routeName: 'web.gateway',
    transport: 'local-http',
    capabilities: {
      commandIngress: true,
      messageEgress: false,
      messageIngress: false,
      webhookIngress: false,
    },
    enablementGates: LOCAL_ENABLEMENT_GATES,
  }),
  buildFutureAdapter({
    id: 'schedule',
    displayName: 'Scheduled job adapter',
    channel: 'schedule',
    category: 'local-automation',
    sourceType: 'schedule',
    surface: 'scheduler',
    routeName: 'channel.schedule',
    transport: 'local-timer',
    externalMessaging: false,
  }),
  buildFutureAdapter({
    id: 'slack',
    displayName: 'Slack message adapter',
    channel: 'slack',
    category: 'external-messaging',
    sourceType: 'message-channel',
    surface: 'slack',
    routeName: 'channel.slack',
    transport: 'external-webhook',
    externalMessaging: true,
  }),
  buildFutureAdapter({
    id: 'telegram',
    displayName: 'Telegram message adapter',
    channel: 'telegram',
    category: 'external-messaging',
    sourceType: 'message-channel',
    surface: 'telegram',
    routeName: 'channel.telegram',
    transport: 'external-webhook',
    externalMessaging: true,
  }),
  buildFutureAdapter({
    id: 'whatsapp',
    displayName: 'WhatsApp message adapter',
    channel: 'whatsapp',
    category: 'external-messaging',
    sourceType: 'message-channel',
    surface: 'whatsapp',
    routeName: 'channel.whatsapp',
    transport: 'external-webhook',
    externalMessaging: true,
  }),
  buildFutureAdapter({
    id: 'discord',
    displayName: 'Discord message adapter',
    channel: 'discord',
    category: 'external-messaging',
    sourceType: 'message-channel',
    surface: 'discord',
    routeName: 'channel.discord',
    transport: 'external-webhook',
    externalMessaging: true,
  }),
  buildFutureAdapter({
    id: 'email',
    displayName: 'Email message adapter',
    channel: 'email',
    category: 'external-messaging',
    sourceType: 'message-channel',
    surface: 'email',
    routeName: 'channel.email',
    transport: 'external-smtp-or-imap',
    externalMessaging: true,
  }),
]);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAdapter({
  capabilities = {},
  category,
  channel,
  displayName,
  enablementGates = [],
  externalMessaging = false,
  id,
  routeName,
  sourceType,
  status = 'disabled',
  surface,
  transport,
}) {
  const enabled = status === 'enabled';
  const externalMessagingEnabled = false;
  const deniedCapabilities = enabled ? [] : EXTERNAL_MESSAGING_DENIED_CAPABILITIES;

  return {
    capabilities: {
      commandIngress: Boolean(capabilities.commandIngress),
      deniedCapabilities,
      messageEgress: Boolean(capabilities.messageEgress) && externalMessagingEnabled,
      messageIngress: Boolean(capabilities.messageIngress) && externalMessagingEnabled,
      webhookIngress: Boolean(capabilities.webhookIngress) && externalMessagingEnabled,
    },
    category: normalizeText(category),
    channel: normalizeText(channel),
    defaultEnabled: enabled,
    displayName: normalizeText(displayName),
    enablementGates: ensureArray(enablementGates).map((gate) => ({
      id: normalizeText(gate.id),
      reason: normalizeText(gate.reason),
      required: Boolean(gate.required),
      satisfied: Boolean(gate.satisfied),
    })),
    enabled,
    evidencePolicy: {
      disabledStateRecorded: true,
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    externalMessaging: Boolean(externalMessaging),
    externalMessagingEnabled,
    id: normalizeText(id),
    pairingRequired: !enabled,
    policyId: CHANNEL_ADAPTER_POLICY_ID,
    routeName: normalizeText(routeName),
    schemaVersion: CHANNEL_ADAPTER_SCHEMA_VERSION,
    sourceType: normalizeText(sourceType),
    status: enabled ? 'enabled' : 'disabled',
    stopReason: enabled ? null : CHANNEL_ADAPTER_DISABLED_STOP_REASON,
    surface: normalizeText(surface),
    transport: normalizeText(transport),
  };
}

function buildFutureAdapter(input) {
  const externalMessaging = Boolean(input.externalMessaging);
  return buildAdapter({
    ...input,
    capabilities: {
      commandIngress: false,
      messageEgress: externalMessaging,
      messageIngress: true,
      webhookIngress: true,
    },
    enablementGates: REQUIRED_EXTERNAL_ENABLEMENT_GATES.map((gateId) => ({
      id: gateId,
      required: true,
      satisfied: false,
      reason: `${gateId} must be documented before this adapter can be enabled.`,
    })),
    externalMessaging,
    status: 'disabled',
  });
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = normalizeText(selector(item), 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function listChannelAdapters({ channel = '', includeDisabled = true, status = '' } = {}) {
  const normalizedChannel = normalizeText(channel);
  const normalizedStatus = normalizeText(status);

  return DEFAULT_CHANNEL_ADAPTERS
    .filter((adapter) => includeDisabled || adapter.enabled)
    .filter((adapter) => !normalizedChannel || adapter.channel === normalizedChannel || adapter.id === normalizedChannel)
    .filter((adapter) => !normalizedStatus || adapter.status === normalizedStatus)
    .map((adapter) => clone(adapter));
}

export function getChannelAdapter(adapterId) {
  const normalizedId = normalizeText(adapterId);
  const adapter = DEFAULT_CHANNEL_ADAPTERS.find((item) => item.id === normalizedId || item.channel === normalizedId);
  return adapter ? clone(adapter) : null;
}

export function summarizeChannelAdapters(adapters = []) {
  const normalizedAdapters = ensureArray(adapters);
  const externalAdapters = normalizedAdapters.filter((adapter) => adapter.externalMessaging);
  const enabledAdapters = normalizedAdapters.filter((adapter) => adapter.enabled);
  const disabledAdapters = normalizedAdapters.filter((adapter) => !adapter.enabled);
  const externalMessagingEnabledAdapters = externalAdapters.filter((adapter) => adapter.externalMessagingEnabled);

  return {
    adapterCount: normalizedAdapters.length,
    disabledCount: disabledAdapters.length,
    enabledCount: enabledAdapters.length,
    externalMessagingAdapterCount: externalAdapters.length,
    externalMessagingEnabledCount: externalMessagingEnabledAdapters.length,
    policyId: CHANNEL_ADAPTER_POLICY_ID,
    schemaVersion: CHANNEL_ADAPTER_REGISTRY_SCHEMA_VERSION,
    statusCounts: countBy(normalizedAdapters, (adapter) => adapter.status),
    stopReasonCounts: countBy(disabledAdapters, (adapter) => adapter.stopReason),
  };
}

export function buildChannelAdapterRegistry(filter = {}) {
  const adapters = listChannelAdapters(filter);

  return {
    adapters,
    policy: {
      defaultExternalMessagingEnabled: false,
      externalAdaptersDisabledByDefault: true,
      id: CHANNEL_ADAPTER_POLICY_ID,
      stopReason: CHANNEL_ADAPTER_DISABLED_STOP_REASON,
    },
    schemaVersion: CHANNEL_ADAPTER_REGISTRY_SCHEMA_VERSION,
    summary: summarizeChannelAdapters(adapters),
  };
}

export function buildChannelAdapterSourceContext(adapterId, overrides = {}) {
  const adapter = getChannelAdapter(adapterId);
  if (!adapter) {
    throw new Error(`Unknown channel adapter: ${adapterId}`);
  }

  return {
    channel: adapter.channel,
    channelAdapterId: adapter.id,
    channelAdapterPolicyId: adapter.policyId,
    channelAdapterStatus: adapter.status,
    channelAdapterStopReason: adapter.stopReason,
    externalMessagingEnabled: adapter.externalMessagingEnabled,
    route: adapter.routeName,
    sourceType: adapter.sourceType,
    surface: adapter.surface,
    ...overrides,
  };
}
