import os from 'node:os';

export const MAX_CAPTURE_BYTES = 1024 * 1024;
export const MAX_PREVIEW_BYTES = 4 * 1024;

const SENSITIVE_ENV_NAME = /key|token|secret|password|auth|cookie|credential/i;
const MIN_SENSITIVE_ENV_VALUE_LENGTH = 8;

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /xox[baprs]-[0-9A-Za-z-]{20,}/g,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/gi,
];

const SECRET_ASSIGNMENT = /\b([A-Za-z0-9_.-]*(?:key|token|secret|password|auth|cookie|credential)[A-Za-z0-9_.-]*)\s*([:=])\s*("[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi;
const ANSI_ESCAPE = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const UNSAFE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const MACHINE_LOCAL_PATHS = [
  /\/(?:private\/)?var\/folders\/[^\s`"')]+/g,
  /\/Users\/[^/\s`"')]+(?:\/[^\s`"')]+)*/g,
  /\/home\/[^/\s`"')]+(?:\/[^\s`"')]+)*/g,
  /\/tmp\/[^\s`"')]+/g,
];

export function buildSmokeFailureDiagnostics(outcome, {
  env = process.env,
  repoDir = process.cwd(),
  homeDir = os.homedir(),
  tempDir = os.tmpdir(),
} = {}) {
  return {
    status: Number.isInteger(outcome.status) ? outcome.status : null,
    signal: outcome.signal || null,
    error: outcome.error
      ? {
          code: outcome.error.code || null,
        }
      : null,
    stderr: buildStreamPreview(outcome.stderr, { env, repoDir, homeDir, tempDir }),
    stdout: buildStreamPreview(outcome.stdout, { env, repoDir, homeDir, tempDir }),
  };
}

export function buildStreamPreview(value, locations = {}) {
  const raw = value == null ? '' : String(value);
  const sanitized = sanitizeDiagnosticText(raw, locations);
  const originalBytes = Buffer.byteLength(raw);

  if (Buffer.byteLength(sanitized) <= MAX_PREVIEW_BYTES) {
    return {
      originalBytes,
      truncated: false,
      head: sanitized,
      tail: '',
    };
  }

  const headBudget = Math.floor(MAX_PREVIEW_BYTES / 2);
  const tailBudget = MAX_PREVIEW_BYTES - headBudget;
  return {
    originalBytes,
    truncated: true,
    head: takeUtf8Prefix(sanitized, headBudget),
    tail: takeUtf8Suffix(sanitized, tailBudget),
  };
}

export function sanitizeDiagnosticText(value, {
  env = process.env,
  repoDir = process.cwd(),
  homeDir = os.homedir(),
  tempDir = os.tmpdir(),
} = {}) {
  let sanitized = String(value);

  const sensitiveValues = Object.entries(env)
    .filter(([name, envValue]) => (
      SENSITIVE_ENV_NAME.test(name)
      && typeof envValue === 'string'
      && envValue.length >= MIN_SENSITIVE_ENV_VALUE_LENGTH
    ))
    .map(([, envValue]) => envValue)
    .sort((left, right) => right.length - left.length);

  for (const sensitiveValue of sensitiveValues) {
    sanitized = replaceAllLiteral(sanitized, sensitiveValue, '<redacted>');
  }

  sanitized = sanitized
    .replace(ANSI_ESCAPE, '')
    .replace(UNSAFE_CONTROL, '');

  const localLocations = [repoDir, homeDir, tempDir]
    .filter((location) => typeof location === 'string' && location.length > 1)
    .sort((left, right) => right.length - left.length);

  for (const location of localLocations) {
    sanitized = replaceAllLiteral(sanitized, location, '<local-path>');
  }

  sanitized = sanitized.replace(
    SECRET_ASSIGNMENT,
    (_match, name, separator) => `${name}${separator}<redacted>`,
  );
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '<redacted>');
  }
  for (const pattern of MACHINE_LOCAL_PATHS) {
    sanitized = sanitized.replace(pattern, '<local-path>');
  }
  return sanitized;
}

function replaceAllLiteral(value, target, replacement) {
  return value.includes(target) ? value.split(target).join(replacement) : value;
}

function takeUtf8Prefix(value, maxBytes) {
  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(value.slice(0, middle)) <= maxBytes) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  const prefix = value.slice(0, low);
  return /[\uD800-\uDBFF]$/.test(prefix) ? prefix.slice(0, -1) : prefix;
}

function takeUtf8Suffix(value, maxBytes) {
  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(value.slice(value.length - middle)) <= maxBytes) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  const suffix = value.slice(value.length - low);
  return /^[\uDC00-\uDFFF]/.test(suffix) ? suffix.slice(1) : suffix;
}
