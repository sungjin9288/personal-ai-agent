function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function normalizeTrainingText(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

export function containsTrainingSecret(value) {
  const text = normalizeText(value);
  return [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\b(?:sk|sk-ant|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{16,}\b/i,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
    /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*\S+/i,
  ].some((pattern) => pattern.test(text));
}

export function containsRawCustomerPayload(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }

  if (/^[\[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return true;
      }
    } catch {
      // Non-JSON prose may begin with punctuation; continue with explicit markers.
    }
  }

  return [
    /\b(?:customer|tenant|user)(?:Id|Name|Email|Phone|Payload)\s*[:=]/i,
    /\b(?:rawCustomerPayload|requestBody|request\.body|tenantData)\s*[:=]/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  ].some((pattern) => pattern.test(text));
}

export function inspectSanitizedTrainingExample(example = {}) {
  const instruction = normalizeTrainingText(example.instruction);
  const response = normalizeTrainingText(example.response);
  return {
    instruction,
    noRawCustomerPayloads:
      !containsRawCustomerPayload(instruction) && !containsRawCustomerPayload(response),
    noRawSecrets: !containsTrainingSecret(instruction) && !containsTrainingSecret(response),
    response,
  };
}
