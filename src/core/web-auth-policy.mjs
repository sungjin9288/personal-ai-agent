import { timingSafeEqual } from 'node:crypto';

export function normalizeWebAuthMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['enforce', 'required', 'strict'].includes(normalized) ? 'enforce' : 'off';
}

export function evaluateWebAuth({
  authorizationHeader = '',
  configuredToken = '',
  mode = 'off',
  tokenHeader = '',
} = {}) {
  const normalizedMode = normalizeWebAuthMode(mode);
  if (normalizedMode !== 'enforce') {
    return {
      allowed: true,
      authenticated: false,
      mode: normalizedMode,
      reason: 'web auth is off.',
      required: false,
    };
  }

  const expectedToken = String(configuredToken || '').trim();
  if (!expectedToken) {
    return {
      allowed: false,
      authenticated: false,
      error: 'auth-not-configured',
      mode: normalizedMode,
      reason: 'PERSONAL_AI_AGENT_WEB_AUTH_TOKEN is required when web auth is enforced.',
      required: true,
    };
  }

  const suppliedToken = extractRequestToken({ authorizationHeader, tokenHeader });
  if (!suppliedToken) {
    return {
      allowed: false,
      authenticated: false,
      error: 'auth-token-required',
      mode: normalizedMode,
      reason: 'A bearer token or x-personal-ai-agent-auth-token header is required.',
      required: true,
    };
  }

  const authenticated = safeTokenEqual(suppliedToken, expectedToken);
  return {
    allowed: authenticated,
    authenticated,
    error: authenticated ? '' : 'auth-token-invalid',
    mode: normalizedMode,
    reason: authenticated ? 'authenticated.' : 'The supplied web auth token is invalid.',
    required: true,
  };
}

function extractRequestToken({ authorizationHeader = '', tokenHeader = '' } = {}) {
  const explicitHeader = normalizeHeaderValue(tokenHeader);
  if (explicitHeader) {
    return explicitHeader;
  }

  const authorization = normalizeHeaderValue(authorizationHeader);
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? String(match[1] || '').trim() : '';
}

function normalizeHeaderValue(value) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return String(firstValue || '').trim();
}

function safeTokenEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
