export function parseLiveValidationReason(reason) {
  const rawReason = String(reason || '').trim();
  if (!rawReason) {
    return null;
  }

  const segments = rawReason.split(' | ').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) {
    return null;
  }

  const [message, ...rest] = segments;
  const details = {};
  for (const segment of rest) {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      continue;
    }
    details[key] = value;
  }

  return {
    details,
    message,
    rawReason,
  };
}

export function formatLiveValidationFailureLines(parsedReason) {
  if (!parsedReason) {
    return [];
  }

  const orderedFields = [
    ['rootDir', 'rootDir'],
    ['workspaceId', 'workspaceId'],
    ['missionId', 'missionId'],
    ['sessionId', 'sessionId'],
    ['artifact', 'artifact'],
    ['reviewerSummary', 'reviewerSummary'],
    ['missionStatus', 'missionStatus'],
  ];

  const lines = [`  - failure: ${parsedReason.message}`];
  for (const [key, label] of orderedFields) {
    if (parsedReason.details[key]) {
      lines.push(`  - ${label}: ${parsedReason.details[key]}`);
    }
  }
  return lines;
}
