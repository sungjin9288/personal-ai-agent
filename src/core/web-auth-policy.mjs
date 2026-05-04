import { createPublicKey, createVerify, timingSafeEqual } from 'node:crypto';

import { RBAC_ROLES, normalizeRbacRole } from './rbac-policy.mjs';

export function normalizeWebAuthMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['oidc', 'jwt', 'jwks'].includes(normalized)) {
    return 'oidc';
  }
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

export async function evaluateOidcWebAuth({
  audience = '',
  authorizationHeader = '',
  issuer = '',
  jwksUrl = '',
  now = new Date(),
  roleClaim = 'role',
} = {}) {
  const missingConfig = [
    ['PERSONAL_AI_AGENT_OIDC_ISSUER', issuer],
    ['PERSONAL_AI_AGENT_OIDC_AUDIENCE', audience],
    ['PERSONAL_AI_AGENT_OIDC_JWKS_URL', jwksUrl],
  ].filter(([, value]) => !String(value || '').trim());

  if (missingConfig.length > 0) {
    return {
      allowed: false,
      authenticated: false,
      error: 'auth-oidc-not-configured',
      mode: 'oidc',
      reason: `${missingConfig.map(([key]) => key).join(', ')} required when OIDC web auth is enabled.`,
      required: true,
    };
  }

  const suppliedToken = extractBearerToken({ authorizationHeader });
  if (!suppliedToken) {
    return {
      allowed: false,
      authenticated: false,
      error: 'auth-token-required',
      mode: 'oidc',
      reason: 'A bearer JWT is required when OIDC web auth is enabled.',
      required: true,
    };
  }

  try {
    const verified = await verifyOidcJwt({
      audience,
      issuer,
      jwksUrl,
      now,
      roleClaim,
      token: suppliedToken,
    });
    return {
      allowed: true,
      authenticated: true,
      claims: verified.claims,
      mode: 'oidc',
      reason: 'authenticated with OIDC bearer token.',
      required: true,
      role: verified.role,
      subject: verified.subject,
    };
  } catch (error) {
    return {
      allowed: false,
      authenticated: false,
      error: 'auth-token-invalid',
      mode: 'oidc',
      reason: error instanceof Error ? error.message : 'The supplied OIDC bearer token is invalid.',
      required: true,
    };
  }
}

async function verifyOidcJwt({ audience, issuer, jwksUrl, now, roleClaim, token }) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('The supplied OIDC bearer token is not a compact JWT.');
  }

  const header = parseBase64UrlJson(encodedHeader, 'JWT header');
  const claims = parseBase64UrlJson(encodedPayload, 'JWT payload');
  if (header.alg !== 'RS256') {
    throw new Error('Only RS256 OIDC bearer tokens are accepted.');
  }

  const jwks = await fetchJwks(jwksUrl);
  const key = selectJwksKey(jwks, header);
  const publicKey = createPublicKeyFromJwk(key);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(publicKey, Buffer.from(encodedSignature, 'base64url'))) {
    throw new Error('OIDC bearer token signature verification failed.');
  }

  validateOidcClaims({ audience, claims, issuer, now });

  return {
    claims,
    role: extractClaimRole(claims, roleClaim),
    subject: String(claims.sub || ''),
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

function extractBearerToken({ authorizationHeader = '' } = {}) {
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

function parseBase64UrlJson(value, label) {
  try {
    return JSON.parse(Buffer.from(String(value || ''), 'base64url').toString('utf8'));
  } catch {
    throw new Error(`OIDC bearer token ${label} is not valid JSON.`);
  }
}

async function fetchJwks(jwksUrl) {
  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`OIDC JWKS fetch failed with HTTP ${response.status}.`);
  }
  const jwks = await response.json();
  if (!Array.isArray(jwks.keys)) {
    throw new Error('OIDC JWKS response must include a keys array.');
  }
  return jwks;
}

function selectJwksKey(jwks, header) {
  const candidates = jwks.keys.filter((key) => {
    if (header.kid && key.kid !== header.kid) {
      return false;
    }
    if (key.kty !== 'RSA') {
      return false;
    }
    if (key.use && key.use !== 'sig') {
      return false;
    }
    return !key.alg || key.alg === 'RS256';
  });

  if (candidates.length !== 1) {
    throw new Error('OIDC JWKS did not contain exactly one matching RS256 signing key.');
  }
  return candidates[0];
}

function createPublicKeyFromJwk(jwk) {
  try {
    return createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    throw new Error('OIDC JWKS key could not be imported.');
  }
}

function validateOidcClaims({ audience, claims, issuer, now }) {
  if (claims.iss !== issuer) {
    throw new Error('OIDC bearer token issuer does not match the configured issuer.');
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud || '')];
  if (!audiences.includes(String(audience))) {
    throw new Error('OIDC bearer token audience does not match the configured audience.');
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) {
    throw new Error('OIDC bearer token is expired or missing exp.');
  }
  if (typeof claims.nbf === 'number' && claims.nbf > nowSeconds) {
    throw new Error('OIDC bearer token is not valid yet.');
  }
}

function extractClaimRole(claims, roleClaim) {
  const claimValue = readClaimPath(claims, roleClaim);
  const roleValues = Array.isArray(claimValue) ? claimValue : [claimValue];
  const roles = roleValues.map((value) => normalizeRbacRole(value));
  return RBAC_ROLES.slice().reverse().find((role) => roles.includes(role)) || 'viewer';
}

function readClaimPath(claims, roleClaim) {
  const path = String(roleClaim || 'role')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  return path.reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), claims);
}
