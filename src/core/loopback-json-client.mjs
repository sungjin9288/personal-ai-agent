const ALLOWED_PATHS = new Set([
  '/api/embed',
  '/api/generate',
  '/api/ps',
  '/api/show',
  '/api/tags',
  '/api/version',
]);
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

function normalizePositiveInteger(value, fallback, fieldName) {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return normalized;
}

export function normalizeLoopbackEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(String(value || '').trim());
  } catch {
    throw new Error('Local model endpoint must be a valid URL.');
  }

  const hostname = endpoint.hostname.toLowerCase();
  if (
    endpoint.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '::1'].includes(hostname) ||
    endpoint.username ||
    endpoint.password ||
    (endpoint.pathname && endpoint.pathname !== '/') ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error('Local model endpoint must be an unauthenticated loopback HTTP origin.');
  }
  return endpoint.origin;
}

export async function requestLoopbackJson({
  body,
  endpoint,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  pathname,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const origin = normalizeLoopbackEndpoint(endpoint);
  if (!ALLOWED_PATHS.has(pathname)) {
    throw new Error(`Unsupported local model API path: ${pathname}.`);
  }
  const normalizedTimeoutMs = normalizePositiveInteger(
    timeoutMs,
    DEFAULT_TIMEOUT_MS,
    'timeoutMs',
  );
  const normalizedMaxResponseBytes = normalizePositiveInteger(
    maxResponseBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    'maxResponseBytes',
  );
  const response = await fetch(`${origin}${pathname}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(normalizedTimeoutMs),
  });
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > normalizedMaxResponseBytes) {
    throw new Error(`Local model response exceeds ${normalizedMaxResponseBytes} bytes.`);
  }
  const responseText = await readBoundedResponseText(response, normalizedMaxResponseBytes);

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Local model API ${pathname} returned invalid JSON.`);
  }
  if (!response.ok || result?.error) {
    const detail = String(result?.error || response.statusText || 'request failed').slice(0, 500);
    throw new Error(`Local model API ${pathname} failed with status ${response.status}: ${detail}`);
  }
  return result;
}

async function readBoundedResponseText(response, maxResponseBytes) {
  if (!response.body) {
    return '';
  }

  const chunks = [];
  const reader = response.body.getReader();
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      receivedBytes += value.byteLength;
      if (receivedBytes > maxResponseBytes) {
        await reader.cancel();
        throw new Error(`Local model response exceeds ${maxResponseBytes} bytes.`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, receivedBytes).toString('utf8');
}
