function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeToolName(value) {
  return normalizeText(value).replace(/^functions?\./, '');
}

function parseToolCallPayload(rawPayload) {
  const payloadText = normalizeText(rawPayload);
  if (!payloadText) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadText);
    const name = normalizeToolName(payload?.name || payload?.function?.name);
    const args = payload?.arguments ?? payload?.function?.arguments ?? {};
    const normalizedArguments =
      args && typeof args === 'object' && !Array.isArray(args)
        ? args
        : typeof args === 'string' && args.trim()
          ? JSON.parse(args)
          : {};

    if (!name || !normalizedArguments || typeof normalizedArguments !== 'object' || Array.isArray(normalizedArguments)) {
      return null;
    }

    return {
      arguments: normalizedArguments,
      name,
      rawPayload: payloadText,
    };
  } catch {
    return null;
  }
}

export function parseHermesToolCalls(text) {
  const source = String(text || '');
  const openTag = '<tool_call>';
  const closeTag = '</tool_call>';
  const toolCalls = [];
  let contentWithoutToolCalls = '';
  let malformedToolCallCount = 0;
  let cursor = 0;

  while (cursor < source.length) {
    const openIndex = source.indexOf(openTag, cursor);
    if (openIndex === -1) {
      contentWithoutToolCalls += source.slice(cursor);
      break;
    }

    contentWithoutToolCalls += source.slice(cursor, openIndex);
    const payloadStart = openIndex + openTag.length;
    const closeIndex = source.indexOf(closeTag, payloadStart);
    const payloadEnd = closeIndex === -1 ? source.length : closeIndex;
    const payloadText = source.slice(payloadStart, payloadEnd);
    const parsedToolCall = parseToolCallPayload(payloadText);

    if (parsedToolCall) {
      toolCalls.push({
        ...parsedToolCall,
        closed: closeIndex !== -1,
      });
    } else {
      malformedToolCallCount += 1;
    }

    cursor = closeIndex === -1 ? source.length : closeIndex + closeTag.length;
  }

  return {
    contentWithoutToolCalls: contentWithoutToolCalls.trim(),
    malformedToolCallCount,
    toolCalls,
  };
}

export function formatHermesToolCall({ name, arguments: args = {} }) {
  const normalizedName = normalizeToolName(name);
  if (!normalizedName) {
    throw new Error('Hermes tool call name is required.');
  }

  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Hermes tool call arguments must be an object.');
  }

  return `<tool_call>${JSON.stringify({ name: normalizedName, arguments: args })}</tool_call>`;
}
