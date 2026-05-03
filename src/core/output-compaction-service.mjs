import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_HEAD_LINES = 12;
const DEFAULT_TAIL_LINES = 12;
const DEFAULT_ISSUE_LINES = 40;
const DEFAULT_REPEAT_GROUPS = 12;

const ISSUE_PATTERNS = [
  {
    severity: 'error',
    pattern: /\b(error|assertionerror|exception|traceback|failed|failure|fatal|panic|timeout|eacces|enoent)\b/i,
  },
  {
    severity: 'warning',
    pattern: /\b(warn|warning|deprecated|deprecation)\b/i,
  },
];

function estimateTokenCount(text) {
  return Math.ceil(String(text || '').length / 4);
}

function normalizeLineEndings(content) {
  return String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function safePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sliceTail(lines, count) {
  return count >= lines.length ? [...lines] : lines.slice(lines.length - count);
}

function classifyLine(line) {
  for (const rule of ISSUE_PATTERNS) {
    if (rule.pattern.test(line)) {
      return rule.severity;
    }
  }
  return '';
}

function collectIssueLines(lines, maxIssueLines) {
  const issueLines = [];
  const counts = {
    error: 0,
    warning: 0,
  };

  lines.forEach((line, index) => {
    const severity = classifyLine(line);
    if (!severity) {
      return;
    }

    counts[severity] += 1;
    if (issueLines.length < maxIssueLines) {
      issueLines.push({
        lineNumber: index + 1,
        severity,
        text: line,
      });
    }
  });

  return {
    counts,
    issueLines,
    truncatedIssueCount: Math.max(0, counts.error + counts.warning - issueLines.length),
  };
}

function collectRepeatedLines(lines, maxRepeatGroups) {
  const groups = new Map();

  lines.forEach((line, index) => {
    const normalized = line.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return;
    }

    const group = groups.get(normalized) || {
      count: 0,
      firstLineNumber: index + 1,
      lineNumbers: [],
      text: normalized,
    };
    group.count += 1;
    if (group.lineNumbers.length < 5) {
      group.lineNumbers.push(index + 1);
    }
    groups.set(normalized, group);
  });

  return [...groups.values()]
    .filter((group) => group.count > 1)
    .sort((left, right) => right.count - left.count || left.firstLineNumber - right.firstLineNumber)
    .slice(0, maxRepeatGroups);
}

function indentLines(lines) {
  if (!lines.length) {
    return '    (none)';
  }
  return lines.map((line) => `    ${line}`).join('\n');
}

function renderIssueLines(issueLines) {
  if (!issueLines.length) {
    return '    (none)';
  }

  return issueLines
    .map((issue) => `    line ${issue.lineNumber} [${issue.severity}] ${issue.text}`)
    .join('\n');
}

function renderRepeatedLines(repeatedLines) {
  if (!repeatedLines.length) {
    return '    (none)';
  }

  return repeatedLines
    .map((group) => `    x${group.count} firstLine=${group.firstLineNumber} sampleLines=${group.lineNumbers.join(',')} ${group.text}`)
    .join('\n');
}

function buildMarkdown(summary) {
  const compact = summary.compact || {};
  const reductionRatio = typeof compact.reductionRatio === 'number' ? compact.reductionRatio.toFixed(2) : 'pending';

  return [
    '# Output Compaction Summary',
    '',
    '## Overview',
    '',
    `- status: ${summary.status}`,
    `- source: ${summary.sourceName}`,
    `- raw bytes: ${summary.raw.bytes}`,
    `- raw lines: ${summary.raw.lineCount}`,
    `- raw estimated tokens: ${summary.raw.estimatedTokens}`,
    `- compact estimated tokens: ${compact.estimatedTokens ?? 'pending'}`,
    `- estimated reduction ratio: ${reductionRatio}`,
    `- issue lines: ${summary.signals.issueLineCount}`,
    `- error lines: ${summary.signals.errorLineCount}`,
    `- warning lines: ${summary.signals.warningLineCount}`,
    `- repeated line groups: ${summary.signals.repeatedLineGroupCount}`,
    '',
    '## Issue Lines',
    '',
    renderIssueLines(summary.sections.issues),
    '',
    '## Repeated Lines',
    '',
    renderRepeatedLines(summary.sections.repeatedLines),
    '',
    '## Head',
    '',
    indentLines(summary.sections.head),
    '',
    '## Tail',
    '',
    indentLines(summary.sections.tail),
    '',
  ].join('\n');
}

export function compactOutput({
  content,
  sourceName = 'output',
  maxHeadLines = DEFAULT_HEAD_LINES,
  maxTailLines = DEFAULT_TAIL_LINES,
  maxIssueLines = DEFAULT_ISSUE_LINES,
  maxRepeatGroups = DEFAULT_REPEAT_GROUPS,
} = {}) {
  const normalizedContent = normalizeLineEndings(content);
  const lines = normalizedContent.length ? normalizedContent.split('\n') : [];
  const raw = {
    bytes: Buffer.byteLength(normalizedContent, 'utf8'),
    charCount: normalizedContent.length,
    estimatedTokens: estimateTokenCount(normalizedContent),
    lineCount: lines.length,
  };

  const safeMaxHeadLines = safePositiveInteger(maxHeadLines, DEFAULT_HEAD_LINES);
  const safeMaxTailLines = safePositiveInteger(maxTailLines, DEFAULT_TAIL_LINES);
  const safeMaxIssueLines = safePositiveInteger(maxIssueLines, DEFAULT_ISSUE_LINES);
  const safeMaxRepeatGroups = safePositiveInteger(maxRepeatGroups, DEFAULT_REPEAT_GROUPS);
  const { counts, issueLines, truncatedIssueCount } = collectIssueLines(lines, safeMaxIssueLines);
  const repeatedLines = collectRepeatedLines(lines, safeMaxRepeatGroups);
  const status = counts.error > 0 ? 'attention-required' : counts.warning > 0 ? 'warning' : 'ok';
  const summary = {
    sourceName,
    status,
    raw,
    compact: null,
    options: {
      maxHeadLines: safeMaxHeadLines,
      maxIssueLines: safeMaxIssueLines,
      maxRepeatGroups: safeMaxRepeatGroups,
      maxTailLines: safeMaxTailLines,
    },
    signals: {
      errorLineCount: counts.error,
      issueLineCount: counts.error + counts.warning,
      repeatedLineGroupCount: repeatedLines.length,
      truncatedIssueCount,
      warningLineCount: counts.warning,
    },
    sections: {
      head: lines.slice(0, safeMaxHeadLines),
      issues: issueLines,
      repeatedLines,
      tail: sliceTail(lines, safeMaxTailLines),
    },
  };

  const preliminaryMarkdown = buildMarkdown(summary);
  const compact = {
    bytes: Buffer.byteLength(preliminaryMarkdown, 'utf8'),
    charCount: preliminaryMarkdown.length,
    estimatedTokens: estimateTokenCount(preliminaryMarkdown),
    lineCount: preliminaryMarkdown.split('\n').length,
    reductionRatio: raw.estimatedTokens > 0
      ? 1 - estimateTokenCount(preliminaryMarkdown) / raw.estimatedTokens
      : 0,
  };

  summary.compact = compact;
  const markdown = buildMarkdown(summary);
  summary.compact = {
    bytes: Buffer.byteLength(markdown, 'utf8'),
    charCount: markdown.length,
    estimatedTokens: estimateTokenCount(markdown),
    lineCount: markdown.split('\n').length,
    reductionRatio: raw.estimatedTokens > 0 ? 1 - estimateTokenCount(markdown) / raw.estimatedTokens : 0,
  };

  return {
    markdown: buildMarkdown(summary),
    summary,
  };
}

export function compactOutputFile({
  inputPath,
  sourceName = '',
  maxHeadLines,
  maxTailLines,
  maxIssueLines,
  maxRepeatGroups,
} = {}) {
  if (!inputPath) {
    throw new Error('inputPath is required.');
  }

  const resolvedInputPath = path.resolve(inputPath);
  const content = fs.readFileSync(resolvedInputPath, 'utf8');
  const result = compactOutput({
    content,
    maxHeadLines,
    maxIssueLines,
    maxRepeatGroups,
    maxTailLines,
    sourceName: sourceName || path.basename(resolvedInputPath),
  });

  return {
    ...result,
    inputPath: resolvedInputPath,
  };
}
