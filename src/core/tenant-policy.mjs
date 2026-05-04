export function normalizeTenantMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['enforce', 'required', 'strict'].includes(normalized) ? 'enforce' : 'off';
}

export function extractTenantClaim(claims, tenantClaim = 'tenant_id') {
  const value = readClaimPath(claims, tenantClaim);
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }
  return String(value || '').trim();
}

export function evaluateTenantAccess({
  auth = {},
  mode = 'off',
  resourceTenantId = '',
  tenantClaim = 'tenant_id',
} = {}) {
  const normalizedMode = normalizeTenantMode(mode);
  if (normalizedMode !== 'enforce') {
    return {
      allowed: true,
      mode: normalizedMode,
      reason: 'tenant isolation is off.',
      required: false,
      tenantId: '',
    };
  }

  if (auth.mode !== 'oidc' || !auth.authenticated) {
    return {
      allowed: false,
      error: 'tenant-identity-required',
      mode: normalizedMode,
      reason: 'OIDC authentication is required when tenant isolation is enforced.',
      required: true,
      tenantId: '',
    };
  }

  const tenantId = extractTenantClaim(auth.claims || {}, tenantClaim);
  if (!tenantId) {
    return {
      allowed: false,
      error: 'tenant-claim-required',
      mode: normalizedMode,
      reason: `OIDC tenant claim ${tenantClaim} is required when tenant isolation is enforced.`,
      required: true,
      tenantId: '',
    };
  }

  const normalizedResourceTenantId = String(resourceTenantId || '').trim();
  if (normalizedResourceTenantId && normalizedResourceTenantId !== tenantId) {
    return {
      allowed: false,
      error: 'tenant-forbidden',
      mode: normalizedMode,
      reason: 'The requested resource belongs to a different tenant.',
      required: true,
      tenantId,
    };
  }

  return {
    allowed: true,
    mode: normalizedMode,
    reason: 'tenant access allowed.',
    required: true,
    tenantId,
  };
}

function readClaimPath(claims, claimPath) {
  const path = String(claimPath || 'tenant_id')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  return path.reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), claims);
}
