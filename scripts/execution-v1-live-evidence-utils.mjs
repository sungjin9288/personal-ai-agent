import {
  formatLiveValidationFailureLines,
  formatLiveValidationProviderFailureLines,
  parseLiveValidationReason,
  readLiveValidationProviderFailure,
  readLiveValidationTriage,
  sanitizePortableMarkdown,
} from './live-validation-utils.mjs';

const liveProviderOrder = ['openai', 'anthropic', 'local', 'hermes'];

export function buildLiveValidationEntries(items, archivedMarkdowns = []) {
  if ((!Array.isArray(items) || items.length === 0) && archivedMarkdowns.length === 0) {
    return [];
  }

  const entriesByProvider = new Map();
  const requestedItems = Array.isArray(items) ? items : [];

  for (const item of requestedItems) {
    const provider = String(item?.provider || '').trim();
    const archivedEntry = provider
      ? archivedMarkdowns
          .map((markdown) => extractArchivedLiveValidationEntry(markdown, provider))
          .find((entry) => entry && ['passed', 'failed'].includes(entry.status))
      : null;

    if (item?.status === 'skipped' && archivedEntry) {
      entriesByProvider.set(provider, archivedEntry);
      continue;
    }

    entriesByProvider.set(provider, formatLiveValidationEntry(item));
  }

  for (const provider of liveProviderOrder) {
    if (entriesByProvider.has(provider)) {
      continue;
    }

    const archivedEntry = archivedMarkdowns
      .map((markdown) => extractArchivedLiveValidationEntry(markdown, provider))
      .find((entry) => entry && ['passed', 'failed'].includes(entry.status));
    if (archivedEntry) {
      entriesByProvider.set(provider, archivedEntry);
    }
  }

  const orderedProviders = [
    ...liveProviderOrder,
    ...[...entriesByProvider.keys()].filter((provider) => !liveProviderOrder.includes(provider)),
  ];
  return orderedProviders
    .filter((provider) => entriesByProvider.has(provider))
    .map((provider) => entriesByProvider.get(provider));
}

export function readArchivedLiveValidationProvenance(markdown) {
  const source = String(markdown || '');
  if (!extractMarkdownSection(source, 'Archived Live Validation (not rerun in this refresh)')
    && !extractMarkdownSection(source, 'Live Validation')) {
    return null;
  }

  return {
    sourceCommit: extractBulletValue(source, 'archivedLiveValidationSourceCommit')
      || extractBulletValue(source, 'commit'),
    sourceGeneratedAt: extractBulletValue(source, 'archivedLiveValidationSourceGeneratedAt')
      || extractBulletValue(source, 'generatedAt'),
  };
}

function formatLiveValidationEntry(item) {
  if (item.status === 'passed') {
    const line = `- ${item.provider}: passed (missionId=${item.missionId}, executionSessionId=${item.executionSessionId}, verification=${item.verificationStatus})`;
    return {
      lines: [line],
      status: 'passed',
      summary: {
        executionSessionId: item.executionSessionId,
        missionId: item.missionId,
        provider: item.provider,
        status: 'passed',
        verificationStatus: item.verificationStatus,
      },
    };
  }

  if (item.status === 'failed') {
    const lines = [`- ${item.provider}: failed (${sanitizePortableMarkdown(item.reason || 'unknown')})`];
    const parsedReason = parseLiveValidationReason(item.reason);
    lines.push(...formatLiveValidationFailureLines(parsedReason));
    lines.push(...formatLiveValidationProviderFailureLines(readLiveValidationProviderFailure(parsedReason)));
    const triage = readLiveValidationTriage(parsedReason);
    lines.push(...formatLiveValidationTriageLines(triage));
    return {
      lines,
      status: 'failed',
      summary: {
        provider: item.provider,
        reason: item.reason || 'unknown',
        status: 'failed',
      },
    };
  }

  return {
    lines: [`- ${item.provider}: ${item.status}${item.reason ? ` (${item.reason})` : ''}`],
    status: item.status || 'unknown',
    summary: {
      provider: item.provider,
      reason: item.reason || '',
      status: item.status || 'unknown',
    },
  };
}

function extractArchivedLiveValidationEntry(markdown, provider) {
  const section = extractMarkdownSection(markdown, 'Archived Live Validation (not rerun in this refresh)')
    || extractMarkdownSection(markdown, 'Live Validation');
  if (!section) {
    return null;
  }

  const lines = section.split('\n');
  const providerLinePattern = new RegExp(`^- ${escapeRegExp(provider)}: (passed|failed|skipped)(?: \\((.*)\\))?`);
  const startIndex = lines.findIndex((line) => providerLinePattern.test(line));
  if (startIndex === -1) {
    return null;
  }

  const providerLines = [lines[startIndex]];
  for (const line of lines.slice(startIndex + 1)) {
    if (/^- [a-z][a-z0-9_-]*: /.test(line)) {
      break;
    }
    if (line.trim() === '') {
      break;
    }
    providerLines.push(line);
  }

  const match = lines[startIndex].match(providerLinePattern);
  const status = match?.[1] || 'unknown';
  return {
    lines: providerLines,
    status,
    summary: {
      archived: true,
      provider,
      reason: match?.[2] || '',
      status,
    },
  };
}

function extractMarkdownSection(markdown, heading) {
  const match = String(markdown || '').match(new RegExp(`(?:^|\\n)## ${escapeRegExp(heading)}\\n\\n([\\s\\S]*?)(?:\\n## |$)`));
  return match?.[1]?.trim() || '';
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function formatLiveValidationTriageLines(triage) {
  if (!triage) {
    return [];
  }

  const lines = [];
  if (triage.reviewerReportPath) {
    lines.push(`  - reviewerReportPath: ${sanitizePortableMarkdown(triage.reviewerReportPath)}`);
  }
  if (triage.implementationProposalPath) {
    lines.push(`  - implementationProposalPath: ${sanitizePortableMarkdown(triage.implementationProposalPath)}`);
  }
  for (const check of triage.failedChecks || []) {
    lines.push(`  - failedCheck: ${check}`);
  }
  for (const finding of triage.findings || []) {
    lines.push(`  - finding: ${finding}`);
  }
  if (triage.nextActionSnippet) {
    lines.push(`  - nextActionSnippet: ${compactSingleLine(triage.nextActionSnippet)}`);
  }
  return lines;
}

function compactSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
