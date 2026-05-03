import fs from 'node:fs';
import path from 'node:path';

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
      lines.push(`  - ${label}: ${sanitizePortableMarkdown(parsedReason.details[key])}`);
    }
  }
  return lines;
}

export function formatLiveValidationProviderFailureLines(providerFailure) {
  if (!providerFailure) {
    return [];
  }

  const lines = [];
  if (providerFailure.providerId) {
    lines.push(`  - providerId: ${providerFailure.providerId}`);
  }
  if (providerFailure.role) {
    lines.push(`  - failedRole: ${providerFailure.role}`);
  }
  if (providerFailure.failureKind) {
    lines.push(`  - failureKind: ${providerFailure.failureKind}`);
  }
  if (providerFailure.httpStatus) {
    lines.push(`  - httpStatus: ${providerFailure.httpStatus}`);
  }
  if (providerFailure.rawMessage) {
    lines.push(`  - providerMessage: ${providerFailure.rawMessage}`);
  }
  if (providerFailure.recoverable !== null && providerFailure.recoverable !== undefined) {
    lines.push(`  - recoverable: ${providerFailure.recoverable}`);
  }
  if (providerFailure.timedOut !== null && providerFailure.timedOut !== undefined) {
    lines.push(`  - timedOut: ${providerFailure.timedOut}`);
  }
  return lines;
}

export function readLiveValidationTriage(parsedReason) {
  if (!parsedReason?.details?.rootDir || !parsedReason?.details?.missionId || !parsedReason?.details?.sessionId) {
    return null;
  }

  const sessionDir = path.join(
    parsedReason.details.rootDir,
    'var',
    'missions',
    parsedReason.details.missionId,
    'sessions',
    parsedReason.details.sessionId,
  );

  const reviewerReportPath = path.join(sessionDir, 'reviewer-report.md');
  const implementationProposalPath = path.join(sessionDir, 'implementation-proposal.md');
  const triage = {
    implementationProposalPath: fs.existsSync(implementationProposalPath) ? implementationProposalPath : null,
    reviewerReportPath: fs.existsSync(reviewerReportPath) ? reviewerReportPath : null,
  };

  if (triage.reviewerReportPath) {
    const reportBody = fs.readFileSync(triage.reviewerReportPath, 'utf8');
    triage.failedChecks = extractReviewerFailedChecks(reportBody);
    triage.findings = extractReviewerFindings(reportBody);
  }

  if (triage.implementationProposalPath) {
    const proposalBody = fs.readFileSync(triage.implementationProposalPath, 'utf8');
    triage.nextActionSnippet = extractMarkdownSection(proposalBody, 'Next Action');
  }

  return triage;
}

export function readLiveValidationProviderFailure(parsedReason) {
  if (!parsedReason?.details?.rootDir || !parsedReason?.details?.sessionId) {
    return null;
  }

  const statePath = path.join(parsedReason.details.rootDir, 'var', 'state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }

  const run = Array.isArray(state.agentRuns)
    ? state.agentRuns.find((item) => item?.sessionId === parsedReason.details.sessionId && item?.status === 'failed')
    : null;
  if (!run) {
    return null;
  }

  return {
    failureKind: run.failureKind || '',
    httpStatus: run.httpStatus || '',
    outputSummary: compactSingleLine(run.outputSummary || ''),
    providerId: run.providerId || '',
    rawMessage: compactSingleLine(extractProviderMessage(run.rawMessage || '')),
    recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
    role: run.role || run.workflowRole || '',
    timedOut: typeof run.timedOut === 'boolean' ? run.timedOut : null,
  };
}

export function sanitizePortableMarkdown(markdown) {
  return String(markdown || '').replace(
    /\/(?:private\/)?var\/folders\/[^"'\s)]+\/T\/(personal-ai-agent-[^"'\s,)]+)/g,
    '<temp>/$1',
  );
}

function extractReviewerFailedChecks(markdown) {
  const lines = String(markdown || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- fail:'));
  return lines.map((line) => line.replace(/^- fail:\s*/, ''));
}

function extractReviewerFindings(markdown) {
  const findingsSection = extractMarkdownSection(markdown, 'Findings');
  if (!findingsSection) {
    return [];
  }
  return findingsSection
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, ''));
}

function extractMarkdownSection(markdown, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?:\\n## |$)`);
  const match = String(markdown || '').match(pattern);
  return match?.[1]?.trim() || '';
}

function extractProviderMessage(rawMessage) {
  if (!rawMessage) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawMessage);
    return parsed?.error?.message || parsed?.message || rawMessage;
  } catch {
    return rawMessage;
  }
}

function compactSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
