import { isDeepStrictEqual } from 'node:util';

import { captureDeliverySource } from '../core/delivery-evidence-import.mjs';
import { buildDeliveryEvidenceReview, restoreDeliveryEvidenceBundle } from '../core/delivery-evidence-review.mjs';

const MAX_BODY_BYTES = 1024 * 1024;

function reject(status, code) {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  throw error;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  // Keep the socket writable so a rejected upload receives its 413 response.
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) {
      request.resume();
      reject(413, 'delivery-evidence-body-limit');
    }
    chunks.push(bytes);
  }
  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { reject(400, 'delivery-evidence-invalid-input'); }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    reject(400, 'delivery-evidence-invalid-input');
  }
  const keys = Object.hasOwn(body, 'bundle') ? ['bundle', 'impactInput'] : ['packet', 'review', 'impactInput'];
  if ((!Object.hasOwn(body, 'bundle') && !Object.hasOwn(body, 'packet')) ||
    Object.keys(body).some(key => !keys.includes(key))) reject(400, 'delivery-evidence-invalid-input');
  return body;
}

export function createDeliveryEvidenceHandlers({
  request, response, auth, evaluateWorkspaceTenantAccess, sendTenantDenied, sendJson,
  captureSource = captureDeliverySource,
}) {
  function capture(workspacePath) {
    try { return captureSource(workspacePath); }
    catch { reject(409, 'delivery-evidence-source-unavailable'); }
  }

  async function handle(params, currentOnly) {
    try {
      let workspaceId;
      try { workspaceId = decodeURIComponent(params.workspaceId); }
      catch { reject(400, 'delivery-evidence-invalid-input'); }
      const tenant = evaluateWorkspaceTenantAccess(workspaceId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return;
      }
      const body = currentOnly ? null : await readBody(request);
      // Validate untrusted packet/review before reading the registered source.
      const submitted = body ? (Object.hasOwn(body, 'bundle')
        ? restoreDeliveryEvidenceBundle({ workspaceId, ...body })
        : buildDeliveryEvidenceReview({ workspaceId, ...body })) : null;
      const source = capture(tenant.workspace.path);
      const packet = currentOnly ? {
        schemaVersion: 'delivery-evidence-input/v1', target: source.target,
        requirements: source.requirements, evidence: [],
      } : submitted.packet;
      if (!isDeepStrictEqual(packet.target, source.target) || !isDeepStrictEqual(packet.requirements, source.requirements)) {
        reject(409, 'delivery-evidence-source-mismatch');
      }
      const result = submitted || buildDeliveryEvidenceReview({ workspaceId, packet });
      if (!isDeepStrictEqual(source, capture(tenant.workspace.path))) reject(409, 'delivery-evidence-source-drift');
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error.status || 400, {
        error: error.code || 'delivery-evidence-invalid-input',
        message: '변경 인계 요청을 확인할 수 없습니다. 현재 workspace와 packet을 다시 확인하세요.',
      });
    }
  }

  return {
    getCurrent: params => handle(params, true),
    review: params => handle(params, false),
  };
}
