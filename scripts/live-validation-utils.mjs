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
      lines.push(`  - ${label}: ${parsedReason.details[key]}`);
    }
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
