export const RBAC_ROLES = ['viewer', 'operator', 'approver', 'admin'];

const ROLE_RANK = new Map([
  ['viewer', 0],
  ['operator', 1],
  ['approver', 2],
  ['admin', 3],
]);

export function normalizeRbacMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['enforce', 'required', 'strict'].includes(normalized) ? 'enforce' : 'off';
}

export function normalizeRbacRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return RBAC_ROLES.includes(normalized) ? normalized : 'viewer';
}

export function evaluateApiRbac({ method = 'GET', mode = 'off', pathname = '/', role = 'viewer' } = {}) {
  const normalizedMode = normalizeRbacMode(mode);
  const normalizedRole = normalizeRbacRole(role);
  const route = classifyApiRoute({ method, pathname });
  const allowed = normalizedMode !== 'enforce' || roleSatisfies(normalizedRole, route.requiredRole);

  return {
    action: route.action,
    allowed,
    mode: normalizedMode,
    reason: allowed
      ? 'allowed'
      : `${route.requiredRole} role is required for ${route.action}. Current role is ${normalizedRole}.`,
    requiredRole: route.requiredRole,
    role: normalizedRole,
  };
}

function classifyApiRoute({ method, pathname }) {
  const normalizedMethod = String(method || 'GET').trim().toUpperCase();
  const normalizedPathname = String(pathname || '/').trim() || '/';

  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS') {
    return {
      action: 'read-api',
      requiredRole: 'viewer',
    };
  }

  if (normalizedMethod === 'DELETE') {
    return {
      action: 'delete-local-record',
      requiredRole: 'admin',
    };
  }

  if (normalizedPathname === '/api/workspaces') {
    return {
      action: 'register-workspace',
      requiredRole: 'admin',
    };
  }

  if (normalizedPathname === '/api/execution-v1/refresh' || normalizedPathname === '/api/execution-v1/snapshot') {
    return {
      action: normalizedPathname.endsWith('/snapshot') ? 'archive-release-snapshot' : 'refresh-release-artifacts',
      requiredRole: 'admin',
    };
  }

  if (
    normalizedPathname === '/api/execution-v1/refresh/preflight' ||
    normalizedPathname === '/api/execution-v1/snapshot/preflight' ||
    normalizedPathname === '/api/execution-v1/preflight'
  ) {
    return {
      action: 'release-preflight-record',
      requiredRole: 'operator',
    };
  }

  if (/^\/api\/approvals\/[^/]+\/resolve$/.test(normalizedPathname)) {
    return {
      action: 'resolve-approval',
      requiredRole: 'approver',
    };
  }

  if (/^\/api\/missions\/[^/]+\/execution\/(?:preflight|start|stop)$/.test(normalizedPathname)) {
    return {
      action: 'mission-execution-control',
      requiredRole: 'operator',
    };
  }

  return {
    action: 'mutate-local-runtime',
    requiredRole: 'operator',
  };
}

function roleSatisfies(role, requiredRole) {
  return (ROLE_RANK.get(role) ?? 0) >= (ROLE_RANK.get(requiredRole) ?? 0);
}
