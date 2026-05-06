import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatLiveValidationFailureLines,
  formatLiveValidationProviderFailureLines,
  parseLiveValidationReason,
  readLiveValidationProviderFailure,
  readLiveValidationTriage,
  sanitizePortableMarkdown,
} from './live-validation-utils.mjs';

const repoDir = process.cwd();
const verifyScriptPath = path.join(repoDir, 'scripts', 'verify-execution-v1.mjs');
const visualManifestScriptPath = path.join(repoDir, 'scripts', 'build-visual-evidence-manifest.mjs');
const outputPath = path.join(repoDir, 'docs', 'execution-v1-evidence.md');
const preserveArchivedLiveValidation = process.argv.includes('--preserve-archived-live-validation');
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--preserve-archived-live-validation');
const archivedEvidenceMarkdowns = preserveArchivedLiveValidation
  ? [readOptionalFile(outputPath), readGitFileAtHead('docs/execution-v1-evidence.md')].filter(Boolean)
  : [];

const verifyResult = spawnSync(process.execPath, [verifyScriptPath, '--capture-live-failures', ...forwardedArgs], {
  cwd: repoDir,
  encoding: 'utf8',
  env: process.env,
});

if (verifyResult.status !== 0) {
  throw new Error(`verify-execution-v1 failed\n${verifyResult.stderr || verifyResult.stdout}`);
}

const verification = JSON.parse(String(verifyResult.stdout || '{}'));
const visualManifestResult = buildVisualEvidenceManifest();
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const commit = runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();
const liveFlags = forwardedArgs.filter((item) => item.startsWith('--live-'));
const browserE2EPassed = (verification.deterministic || []).some(
  (item) => item.script === 'smoke:ui-execution-browser-e2e' && item.status === 'passed',
);
const referenceAdoptionsPassed = (verification.deterministic || []).some(
  (item) => item.script === 'smoke:reference-adoptions' && item.status === 'passed',
);
const referenceAdoptionSummary = (verification.deterministic || []).find(
  (item) => item.script === 'smoke:reference-adoptions',
)?.referenceAdoptionSummary || null;
const liveValidationEntries = buildLiveValidationEntries(verification.liveValidation || [], archivedEvidenceMarkdowns);

const lines = [
  '# Execution v1 Evidence',
  '',
  `- generatedAt: ${generatedAt}`,
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  `- mode: ${verification.mode}`,
  `- liveFlags: ${liveFlags.length ? liveFlags.join(', ') : 'none'}`,
  '',
  '## Deterministic Verification',
  '',
];

for (const item of verification.deterministic || []) {
  lines.push(`- ${item.script}: ${item.status}`);
}

lines.push('', '## Deterministic Runtime Summary', '');

for (const item of verification.deterministic || []) {
  lines.push(
    `- ${item.script}: ${formatDurationMs(item.durationMs)} elapsed, stdout ${formatBytes(item.stdoutBytes)}, stderr ${formatBytes(item.stderrBytes)}, timeout ${formatDurationMs(item.timeoutMs)}`,
  );
}

lines.push(
  '',
  '## Reference Adoption Aggregate',
  '',
);

if (referenceAdoptionSummary?.scripts?.length) {
  lines.push(
    `- scriptCount: ${referenceAdoptionSummary.scriptCount}`,
    `- totalDuration: ${formatDurationMs(referenceAdoptionSummary.totalDurationMs)}`,
    `- ok: ${referenceAdoptionSummary.ok ? 'true' : 'false'}`,
    '',
  );

  for (const item of referenceAdoptionSummary.scripts) {
    const timeoutSuffix = item.timeoutMs
      ? `, timeout ${formatDurationMs(item.timeoutMs)}, timedOut ${item.timedOut ? 'true' : 'false'}`
      : '';
    lines.push(`- ${formatDisplayPath(item.script)}: ${item.ok ? 'passed' : 'failed'} (${formatDurationMs(item.durationMs)}${timeoutSuffix})`);
  }
} else {
  lines.push('- not captured');
}

lines.push(
  '',
  '## Visual Evidence Manifest',
  '',
  `- outputPath: ${formatDisplayPath(visualManifestResult.outputPath)}`,
  `- available: ${visualManifestResult.availableCount}`,
  `- missing: ${visualManifestResult.missingCount}`,
  `- visualArtifactCount: ${visualManifestResult.visualArtifactCount}`,
  `- artifactSetSha256: ${visualManifestResult.artifactSetSha256}`,
);

lines.push('', '## Live Validation', '');

if (liveValidationEntries.length === 0) {
  lines.push('- not requested');
} else {
  for (const entry of liveValidationEntries) {
    lines.push(...entry.lines);
  }
}

lines.push(
  '',
  '## What This Proves',
  '',
  '- engineering mission이 reviewer 통과 후 execution-capable 상태로 전환되는지',
  '- execution lease approval이 1회 실행 세션에 바인딩되는지',
  '- foreground execution session이 완료되고 verification 결과가 남는지',
  '- CLI, service, UI contract가 같은 execution 상태를 읽는지',
  '- 실제 browser interaction이 미션 생성 → 실행 승인 요청 → 승인 → 실행 시작 → 결과 확인 → history restore까지 이어지는지',
  '- browser screenshot/report visual evidence가 safe local artifact root 안에서 manifest로 추적되는지',
  '- externally inspired reference adoption 기능들이 aggregate smoke gate로 회귀 검증되는지',
  '',
  '## Coverage and Remaining Gaps',
  '',
  `- browser interaction E2E: ${browserE2EPassed ? 'ready (Playwright CLI flow passed)' : 'not verified'}`,
  `- reference adoption gate: ${referenceAdoptionsPassed ? 'ready (aggregate smoke passed)' : 'not verified'}`,
  '- live provider validation은 해당 provider env가 있을 때만 수행되며, 요청되지 않았거나 env가 없으면 skipped 상태로 남음',
  '',
  '## Raw Summary',
  '',
  '```json',
  JSON.stringify(verification, null, 2),
  '```',
  '',
);

fs.writeFileSync(outputPath, sanitizePortableMarkdown(lines.join('\n')));

console.log(
  JSON.stringify(
    {
      ok: true,
      liveValidation: liveValidationEntries.map((entry) => entry.summary),
      outputPath,
      visualManifest: visualManifestResult,
      commit,
      branch,
      generatedAt,
    },
    null,
    2,
  ),
);

function buildLiveValidationEntries(items, archivedMarkdowns) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    const provider = String(item?.provider || '').trim();
    const archivedEntry = provider
      ? archivedMarkdowns
          .map((markdown) => extractArchivedLiveValidationEntry(markdown, provider))
          .find((entry) => entry && ['passed', 'failed'].includes(entry.status))
      : null;

    if (item?.status === 'skipped' && archivedEntry) {
      return archivedEntry;
    }

    return formatLiveValidationEntry(item);
  });
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
  const section = extractMarkdownSection(markdown, 'Live Validation');
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

function readOptionalFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readGitFileAtHead(relativePath) {
  const result = spawnSync('git', ['show', `HEAD:${relativePath}`], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });
  return result.status === 0 ? String(result.stdout || '') : '';
}

function buildVisualEvidenceManifest() {
  const result = spawnSync(process.execPath, [visualManifestScriptPath], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`build-visual-evidence-manifest failed\n${result.stderr || result.stdout}`);
  }

  return JSON.parse(String(result.stdout || '{}'));
}

function formatDisplayPath(filePath) {
  const relativePath = path.relative(repoDir, String(filePath || ''));
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return String(filePath || '');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }

  return String(result.stdout || '').trim();
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

function formatDurationMs(value) {
  const durationMs = Number(value);
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 'n/a';
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${(durationMs / 60_000).toFixed(1)}m`;
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'n/a';
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MiB`;
}
