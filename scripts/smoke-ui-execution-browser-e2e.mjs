import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const playwrightArgsBase = ['--yes', '--package', '@playwright/cli', 'playwright-cli'];
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-browser-e2e-'));
const tempScreenshotDir = path.join(tempRoot, 'output', 'playwright');
const screenshotDir = path.join(repoDir, 'output', 'playwright');
const releaseHandoffDigestArtifactPath = path.join(screenshotDir, 'execution-v1-release-handoff-digest.json');
const releaseHandoffDigestTextArtifactPath = path.join(screenshotDir, 'execution-v1-release-handoff-digest.txt');
const releaseHandoffDigestMarkdownArtifactPath = path.join(screenshotDir, 'execution-v1-release-handoff-digest.md');
const releaseHandoffManifestPath = path.join(screenshotDir, 'execution-v1-release-handoff-manifest.json');
const releaseHandoffManifestTextPath = path.join(screenshotDir, 'execution-v1-release-handoff-manifest.txt');
const releaseHandoffManifestMarkdownPath = path.join(screenshotDir, 'execution-v1-release-handoff-manifest.md');
const releaseHandoffIndexPath = path.join(screenshotDir, 'execution-v1-release-handoff-index.json');
const releaseHandoffIndexTextPath = path.join(screenshotDir, 'execution-v1-release-handoff-index.txt');
const releaseHandoffIndexMarkdownPath = path.join(screenshotDir, 'execution-v1-release-handoff-index.md');
const releaseDocDigestArtifactPath = path.join(screenshotDir, 'execution-v1-release-doc-digest.json');
const releaseDocIndexPath = path.join(screenshotDir, 'execution-v1-release-doc-index.json');
const releaseDocIndexMarkdownPath = path.join(screenshotDir, 'execution-v1-release-doc-index.md');
const releaseDocIndexTextPath = path.join(screenshotDir, 'execution-v1-release-doc-index.txt');
const releaseDocDigestManifestPath = path.join(screenshotDir, 'execution-v1-release-doc-manifest.json');
const releaseDocDigestManifestMarkdownPath = path.join(screenshotDir, 'execution-v1-release-doc-manifest.md');
const releaseDocDigestManifestTextPath = path.join(screenshotDir, 'execution-v1-release-doc-manifest.txt');
const releaseDocDigestTextArtifactPath = path.join(screenshotDir, 'execution-v1-release-doc-digest.txt');
const releaseDocDigestMarkdownArtifactPath = path.join(screenshotDir, 'execution-v1-release-doc-digest.md');
const reportPath = path.join(screenshotDir, 'execution-v1-browser-e2e.json');
const screenshotPath = path.join(screenshotDir, 'execution-v1-browser-e2e.png');
const transparentPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxX8AAAAASUVORK5CYII=',
  'base64',
);

fs.mkdirSync(screenshotDir, { recursive: true });
fs.rmSync(releaseHandoffDigestArtifactPath, { force: true });
fs.rmSync(releaseHandoffDigestTextArtifactPath, { force: true });
fs.rmSync(releaseHandoffDigestMarkdownArtifactPath, { force: true });
fs.rmSync(releaseHandoffManifestPath, { force: true });
fs.rmSync(releaseHandoffManifestTextPath, { force: true });
fs.rmSync(releaseHandoffManifestMarkdownPath, { force: true });
fs.rmSync(releaseHandoffIndexPath, { force: true });
fs.rmSync(releaseHandoffIndexTextPath, { force: true });
fs.rmSync(releaseHandoffIndexMarkdownPath, { force: true });
fs.rmSync(releaseDocDigestArtifactPath, { force: true });
fs.rmSync(releaseDocIndexPath, { force: true });
fs.rmSync(releaseDocIndexMarkdownPath, { force: true });
fs.rmSync(releaseDocIndexTextPath, { force: true });
fs.rmSync(releaseDocDigestManifestPath, { force: true });
fs.rmSync(releaseDocDigestManifestMarkdownPath, { force: true });
fs.rmSync(releaseDocDigestManifestTextPath, { force: true });
fs.rmSync(releaseDocDigestTextArtifactPath, { force: true });
fs.rmSync(releaseDocDigestMarkdownArtifactPath, { force: true });
fs.rmSync(reportPath, { force: true });
fs.rmSync(screenshotPath, { force: true });

seedReleaseHandoffFixtures();

const sessionId = `e${Date.now().toString(36).slice(-5)}`;
const handoffSessionIds = [];
const handoffSessionResults = [];
const releaseHandoffSessionResults = [];
const releaseHandoffOpenSessionResults = [];
const serverOutput = { stderr: '', stdout: '' };
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const browserGuardScript = `async (page) => {
  page.__codexConsoleErrors = page.__codexConsoleErrors || [];
  page.__codexPageErrors = page.__codexPageErrors || [];
  if (!page.__codexErrorGuardInstalled) {
    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return;
      }
      page.__codexConsoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      page.__codexPageErrors.push(String(error?.message || error || ''));
    });
    page.__codexErrorGuardInstalled = true;
  }
  const installGuards = () => {
    window.__lastAlert = '';
    window.__lastClipboardText = '';
    window.__lastConfirm = '';
    window.__lastPrompt = '';
    window.alert = (message) => {
      window.__lastAlert = String(message || '');
    };
    window.confirm = (message) => {
      window.__lastConfirm = String(message || '');
      return true;
    };
    window.prompt = (message, defaultValue = '') => {
      window.__lastPrompt = JSON.stringify({
        defaultValue: String(defaultValue ?? ''),
        message: String(message || ''),
      });
      return typeof defaultValue === 'string' ? defaultValue : '';
    };
    const clipboard = {
      writeText: async (value) => {
        window.__lastClipboardText = String(value || '');
      },
    };
    try {
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: clipboard,
      });
    } catch {
      window.navigator.clipboard = clipboard;
    }
  };
  await page.addInitScript(installGuards);
  await page.evaluate(installGuards);
  return {
    ok: true,
  };
}`;

function parsePngDimensions(buffer) {
  assert.equal(buffer.length >= 24, true, `expected PNG buffer length >= 24, received ${buffer.length}`);
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, 'expected PNG signature');
  assert.equal(buffer.readUInt32BE(8), 13, 'expected IHDR chunk length 13');
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', 'expected PNG IHDR chunk');
  const height = buffer.readUInt32BE(20);
  const width = buffer.readUInt32BE(16);
  assert.equal(width > 0, true, `expected PNG width > 0, received ${width}`);
  assert.equal(height > 0, true, `expected PNG height > 0, received ${height}`);
  return { height, width };
}

function decodeBase64Text(value) {
  if (!value) {
    return '';
  }
  return Buffer.from(String(value), 'base64').toString('utf8');
}

function buildTextArtifactDescriptor(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    bytes: Buffer.byteLength(content, 'utf8'),
    lineCount: content.trimEnd().split('\n').length,
    path: filePath,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

function buildBinaryArtifactDescriptor(filePath, extra = {}) {
  const content = fs.readFileSync(filePath);
  return {
    bytes: content.length,
    path: filePath,
    sha256: createHash('sha256').update(content).digest('hex'),
    ...extra,
  };
}

function buildArtifactBundleLine(name, descriptor) {
  return `${name}|bytes=${descriptor.bytes}|lines=${descriptor.lineCount}|sha256=${descriptor.sha256}`;
}

function buildReleaseDocIndexBundleLine(name, descriptor) {
  const lineSegments = [
    `${name}`,
    `kind=${descriptor.descriptorKind}`,
    `bytes=${descriptor.bytes}`,
  ];
  if (typeof descriptor.lineCount === 'number') {
    lineSegments.push(`lines=${descriptor.lineCount}`);
  }
  if (typeof descriptor.width === 'number' && typeof descriptor.height === 'number') {
    lineSegments.push(`dimensions=${descriptor.width}x${descriptor.height}`);
  }
  lineSegments.push(`sha256=${descriptor.sha256}`);
  return lineSegments.join('|');
}

function seedReleaseHandoffFixtures() {
  const generatedAt = new Date().toISOString();
  const seededReleaseHandoffStructuredSummary = {
    open: {
      errorFreeSessions: 2,
      overviewLine: 'totalSessions=2|errorFreeSessions=2|artifacts=browser-screenshot|sha256=seed-open-summary-sha',
      stableDigestSha256: 'seed-open-summary-sha',
      totalSessions: 2,
    },
    preview: {
      errorFreeSessions: 6,
      overviewLine: 'totalSessions=6|errorFreeSessions=6|artifacts=handoff-digest-json,handoff-digest-text,handoff-digest-markdown,handoff-manifest-json,handoff-manifest-text,handoff-manifest-markdown|sha256=seed-preview-summary-sha',
      stableDigestSha256: 'seed-preview-summary-sha',
      totalSessions: 6,
    },
    summaryCopy: {
      errorFreeSessions: 2,
      exactMatchCount: 2,
      overviewLine: 'totalChecks=2|exactMatchCount=2|surfaces=card,current-preview|sha256=seed-summary-copy-sha',
      stableDigestSha256: 'seed-summary-copy-sha',
      totalSessions: 2,
    },
    summaryCopyPreview: {
      errorFreeSessions: 6,
      exactMatchCount: 6,
      overviewLine:
        'totalArtifacts=6|exactMatchCount=6|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown|sha256=seed-summary-copy-preview-sha',
      stableLines: [
        'handoff-digest-markdown|format=markdown|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-digest-markdown-summary-copy-preview-sha',
        'handoff-digest-text|format=text|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-digest-text-summary-copy-preview-sha',
        'handoff-index-markdown|format=markdown|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-index-markdown-summary-copy-preview-sha',
        'handoff-index-text|format=text|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-index-text-summary-copy-preview-sha',
        'handoff-manifest-markdown|format=markdown|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-copy-preview-sha',
        'handoff-manifest-text|format=text|exact=true|counter=present|marker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-manifest-text-summary-copy-preview-sha',
      ],
      stableDigestSha256: 'seed-summary-copy-preview-sha',
      totalSessions: 6,
    },
  };
  const seededReleaseHandoffSummaryCopyVerificationSummary = {
    exactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopy.exactMatchCount,
    overviewLine: [
      `totalChecks=${seededReleaseHandoffStructuredSummary.summaryCopy.totalSessions}`,
      `exactMatchCount=${seededReleaseHandoffStructuredSummary.summaryCopy.exactMatchCount}`,
      'surfaces=card,current-preview',
      `sha256=${seededReleaseHandoffStructuredSummary.summaryCopy.stableDigestSha256}`,
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=overview copied|fallbackLabel=overview copy|artifactId=handoff-digest-json|surface=card|textSha256=seed-card-summary-sha|postCopyLabel=overview copy',
      'current-preview|exact=true|copyLabel=current overview copied|fallbackLabel=current overview copy|artifactId=handoff-index-markdown|surface=current-preview|textSha256=seed-current-preview-summary-sha|postCopyLabel=current overview copy',
    ],
    stableSha256: seededReleaseHandoffStructuredSummary.summaryCopy.stableDigestSha256,
    totalChecks: seededReleaseHandoffStructuredSummary.summaryCopy.totalSessions,
  };
  const seededReleaseHandoffSummaryDetailCopyVerificationSummary = {
    exactMatchCount: 4,
    overviewLine: [
      'totalChecks=4',
      'exactMatchCount=4',
      'surfaces=handoff-digest-json:summaryCopyPreview/card,handoff-index-markdown:summaryCopyPreview/current-preview,handoff-digest-json:summaryDetailCopyPreviewLineCopy/card,handoff-index-markdown:summaryDetailCopyPreviewLineCopyBody/current-preview',
      'sha256=seed-summary-detail-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryCopyPreview|surface=card|textSha256=seed-card-summary-detail-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryCopyPreview|surface=current-preview|textSha256=seed-current-preview-summary-detail-sha|postCopyLabel=current copy complete',
      'detail-line-copy-card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryDetailCopyPreviewLineCopy|surface=card|textSha256=seed-card-summary-detail-line-copy-sha|postCopyLabel=line copy',
      'detail-line-copy-body-current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryDetailCopyPreviewLineCopyBody|surface=current-preview|textSha256=seed-current-preview-summary-detail-line-copy-body-sha|postCopyLabel=current copy complete',
    ],
    stableSha256: 'seed-summary-detail-copy-sha',
    totalChecks: 4,
  };
  seededReleaseHandoffStructuredSummary.summaryDetailCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryDetailCopy:0/card,handoff-index-markdown:summaryDetailCopy:3/current-preview',
      'sha256=seed-summary-stable-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=stable line copy|artifactId=handoff-digest-json|detailKey=summaryDetailCopy|lineIndex=0|surface=card|textSha256=seed-card-summary-stable-line-copy-sha|postCopyLabel=stable line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current stable line copy|artifactId=handoff-index-markdown|detailKey=summaryDetailCopy|lineIndex=3|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-sha|postCopyLabel=current stable line copy complete',
    ],
    stableSha256: 'seed-summary-stable-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-stable-line-copy-preview-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-digest-markdown-summary-stable-line-copy-preview-sha',
      'handoff-digest-text|format=text|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-digest-text-summary-stable-line-copy-preview-sha',
      'handoff-index-markdown|format=markdown|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-index-markdown-summary-stable-line-copy-preview-sha',
      'handoff-index-text|format=text|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-index-text-summary-stable-line-copy-preview-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-stable-line-copy-preview-sha',
      'handoff-manifest-text|format=text|exact=true|stableLineCounter=present|stableLineMarker=present|bodySha256=seed-handoff-manifest-text-summary-stable-line-copy-preview-sha',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreview = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBody = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBody:0/card,handoff-index-markdown:summaryStableLineCopyPreviewBody:2/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=stable line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBody|lineIndex=0|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-sha|postCopyLabel=stable line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current stable line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBody|lineIndex=2|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-sha|postCopyLabel=current stable line copy complete',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-markdown-summary-stable-line-copy-preview-body-line-copy-body-sha',
      'handoff-digest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-text-summary-stable-line-copy-preview-body-line-copy-body-sha',
      'handoff-index-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-markdown-summary-stable-line-copy-preview-body-line-copy-body-sha',
      'handoff-index-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-text-summary-stable-line-copy-preview-body-line-copy-body-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-stable-line-copy-preview-body-line-copy-body-sha',
      'handoff-manifest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-text-summary-stable-line-copy-preview-body-line-copy-body-sha',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBody = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBody:0/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBody:2/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=stable line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBody|lineIndex=0|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-sha|postCopyLabel=stable line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current stable line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBody|lineIndex=2|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-sha|postCopyLabel=current stable line copy complete',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
      'handoff-digest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
      'handoff-index-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
      'handoff-index-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
      'handoff-manifest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
      'handoff-digest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
      'handoff-index-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
      'handoff-index-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
      'handoff-manifest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-text-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy/current-preview',
      'sha256=seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy|surface=card|textSha256=seed-card-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy|surface=current-preview|textSha256=seed-current-preview-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha|postCopyLabel=current line copy',
    ],
    stableSha256: 'seed-summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy-body-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    stableLineCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    stableLines: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
    totalSessions: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-detail-copy-preview-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-digest-markdown-summary-detail-copy-preview-sha',
      'handoff-digest-text|format=text|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-digest-text-summary-detail-copy-preview-sha',
      'handoff-index-markdown|format=markdown|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-index-markdown-summary-detail-copy-preview-sha',
      'handoff-index-text|format=text|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-index-text-summary-detail-copy-preview-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-detail-copy-preview-sha',
      'handoff-manifest-text|format=text|exact=true|detailCounter=present|detailMarker=present|previewCounter=present|previewMarker=present|bodySha256=seed-handoff-manifest-text-summary-detail-copy-preview-sha',
    ],
    stableSha256: 'seed-summary-detail-copy-preview-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryDetailCopyPreview = {
    errorFreeSessions: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary = {
    exactMatchCount: 2,
    overviewLine: [
      'totalChecks=2',
      'exactMatchCount=2',
      'surfaces=handoff-digest-json:summaryDetailCopyPreview/card,handoff-index-markdown:summaryDetailCopyPreview/current-preview',
      'sha256=seed-summary-detail-copy-preview-line-copy-sha',
    ].join('|'),
    stableLines: [
      'card|exact=true|copyLabel=copy-complete|fallbackLabel=line copy|artifactId=handoff-digest-json|detailKey=summaryDetailCopyPreview|surface=card|textSha256=seed-card-summary-detail-preview-line-copy-sha|postCopyLabel=line copy',
      'current-preview|exact=true|copyLabel=current-copy-complete|fallbackLabel=current line copy|artifactId=handoff-index-markdown|detailKey=summaryDetailCopyPreview|surface=current-preview|textSha256=seed-current-preview-summary-detail-preview-line-copy-sha|postCopyLabel=current copy complete',
    ],
    stableSha256: 'seed-summary-detail-copy-preview-line-copy-sha',
    totalChecks: 2,
  };
  seededReleaseHandoffStructuredSummary.summaryDetailCopyPreviewLineCopy = {
    errorFreeSessions: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
  };
  const seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary = {
    exactMatchCount: 6,
    overviewLine: [
      'totalArtifacts=6',
      'exactMatchCount=6',
      'artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown',
      'sha256=seed-summary-detail-copy-preview-line-copy-body-sha',
    ].join('|'),
    stableLines: [
      'handoff-digest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-markdown-summary-detail-copy-preview-line-copy-body-sha',
      'handoff-digest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-digest-text-summary-detail-copy-preview-line-copy-body-sha',
      'handoff-index-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-markdown-summary-detail-copy-preview-line-copy-body-sha',
      'handoff-index-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-index-text-summary-detail-copy-preview-line-copy-body-sha',
      'handoff-manifest-markdown|format=markdown|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-markdown-summary-detail-copy-preview-line-copy-body-sha',
      'handoff-manifest-text|format=text|exact=true|bodyCounter=present|bodyMarker=present|bodySha256=seed-handoff-manifest-text-summary-detail-copy-preview-line-copy-body-sha',
    ],
    stableSha256: 'seed-summary-detail-copy-preview-line-copy-body-sha',
    totalArtifacts: 6,
  };
  seededReleaseHandoffStructuredSummary.summaryDetailCopyPreviewLineCopyBody = {
    errorFreeSessions: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    exactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    overviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    stableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
    totalSessions: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
  };
  const seededReleaseHandoffStructuredSummaryLines = Object.entries(seededReleaseHandoffStructuredSummary)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => [
      key,
      `totalSessions=${Number(value?.totalSessions || 0)}`,
      `errorFreeSessions=${Number(value?.errorFreeSessions || 0)}`,
      `stableDigestSha256=${String(value?.stableDigestSha256 || '').trim()}`,
      `overview=${String(value?.overviewLine || '').trim()}`,
    ].join('|'));
  const seededReleaseHandoffStructuredSummarySha256 = createHash('sha256')
    .update(seededReleaseHandoffStructuredSummaryLines.join('\n'))
    .digest('hex');
  const seededReleaseHandoffStructuredSummaryOverviewLine = [
    `entries=${Object.keys(seededReleaseHandoffStructuredSummary).sort().join(',')}`,
    `sha256=${seededReleaseHandoffStructuredSummarySha256}`,
  ].join('|');
  const handoffFixtures = [
    {
      content: `${JSON.stringify({ artifactVersion: 'execution-v1-browser-e2e/seed', generatedAt, ok: true }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-browser-e2e.json'),
    },
    {
      content: transparentPngBuffer,
      path: path.join(tempScreenshotDir, 'execution-v1-browser-e2e.png'),
    },
    {
      content: `${JSON.stringify({
        artifactVersion: 'execution-v1-release-handoff-digest/seed',
        generatedAt,
        kind: 'handoff-digest',
        releaseHandoffOpenErrorFreeSessions: seededReleaseHandoffStructuredSummary.open.errorFreeSessions,
        releaseHandoffOpenStableDigestSha256: seededReleaseHandoffStructuredSummary.open.stableDigestSha256,
        releaseHandoffOpenTotalSessions: seededReleaseHandoffStructuredSummary.open.totalSessions,
        releaseHandoffPreviewErrorFreeSessions: seededReleaseHandoffStructuredSummary.preview.errorFreeSessions,
        releaseHandoffPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.preview.stableDigestSha256,
        releaseHandoffPreviewTotalSessions: seededReleaseHandoffStructuredSummary.preview.totalSessions,
        releaseHandoffSummaryCopyExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopy.exactMatchCount,
        releaseHandoffSummaryCopyOverviewLine: seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryCopyStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopy.stableDigestSha256,
        releaseHandoffSummaryCopyTotalChecks: seededReleaseHandoffStructuredSummary.summaryCopy.totalSessions,
        releaseHandoffSummaryCopyPreviewExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount,
        releaseHandoffSummaryCopyPreviewOverviewLine: seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        releaseHandoffSummaryCopyPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256,
        releaseHandoffSummaryCopyPreviewTotalArtifacts: seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions,
        releaseHandoffSummaryDetailCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffStructuredSummary: seededReleaseHandoffStructuredSummary,
        releaseHandoffStructuredSummaryLines: seededReleaseHandoffStructuredSummaryLines,
        releaseHandoffStructuredSummaryOverviewLine: seededReleaseHandoffStructuredSummaryOverviewLine,
        releaseHandoffStructuredSummarySha256: seededReleaseHandoffStructuredSummarySha256,
        releaseHandoffSummaryCopyVerificationSummary: seededReleaseHandoffSummaryCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
      }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-digest.json'),
    },
    {
      content: [
        'artifactVersion=execution-v1-release-handoff-digest-text/seed',
        `generatedAt=${generatedAt}`,
        'kind=handoff-digest',
        `summaryCopyTotalChecks=${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `summaryCopyExactMatchCount=${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `summaryCopyStableSha256=${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `summaryCopyPreviewTotalArtifacts=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `summaryCopyPreviewExactMatchCount=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `summaryCopyPreviewStableSha256=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `summaryDetailCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryStableLineCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyPreviewLineCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyBodyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        `structuredSummarySha256=${seededReleaseHandoffStructuredSummarySha256}`,
        '---summary-copy---',
        seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines,
        '---summary-copy-preview---',
        seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines,
        '---summary-detail-copy---',
        seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview---',
        seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview---',
        seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy-body---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
        '---structured-summary---',
        seededReleaseHandoffStructuredSummaryOverviewLine,
        ...seededReleaseHandoffStructuredSummaryLines,
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-digest.txt'),
    },
    {
      content: [
        '# Release Handoff Digest Seed',
        '',
        `- generatedAt: ${generatedAt}`,
        '- kind: handoff-digest',
        `- summaryCopyTotalChecks: ${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `- summaryCopyExactMatchCount: ${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `- summaryCopyStableSha256: ${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `- summaryCopyPreviewTotalArtifacts: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `- summaryCopyPreviewExactMatchCount: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `- summaryCopyPreviewStableSha256: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `- summaryDetailCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryStableLineCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        '',
        '## Summary-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine}`,
        '',
        '## Summary-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-digest.md'),
    },
    {
      content: `${JSON.stringify({
        artifactVersion: 'execution-v1-release-handoff-manifest/seed',
        generatedAt,
        kind: 'handoff-manifest',
        releaseHandoffOpenErrorFreeSessions: seededReleaseHandoffStructuredSummary.open.errorFreeSessions,
        releaseHandoffOpenStableDigestSha256: seededReleaseHandoffStructuredSummary.open.stableDigestSha256,
        releaseHandoffOpenTotalSessions: seededReleaseHandoffStructuredSummary.open.totalSessions,
        releaseHandoffPreviewErrorFreeSessions: seededReleaseHandoffStructuredSummary.preview.errorFreeSessions,
        releaseHandoffPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.preview.stableDigestSha256,
        releaseHandoffPreviewTotalSessions: seededReleaseHandoffStructuredSummary.preview.totalSessions,
        releaseHandoffSummaryCopyExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopy.exactMatchCount,
        releaseHandoffSummaryCopyOverviewLine: seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryCopyStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopy.stableDigestSha256,
        releaseHandoffSummaryCopyTotalChecks: seededReleaseHandoffStructuredSummary.summaryCopy.totalSessions,
        releaseHandoffSummaryCopyPreviewExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount,
        releaseHandoffSummaryCopyPreviewOverviewLine: seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        releaseHandoffSummaryCopyPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256,
        releaseHandoffSummaryCopyPreviewTotalArtifacts: seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions,
        releaseHandoffSummaryDetailCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffStructuredSummary: seededReleaseHandoffStructuredSummary,
        releaseHandoffStructuredSummaryLines: seededReleaseHandoffStructuredSummaryLines,
        releaseHandoffStructuredSummaryOverviewLine: seededReleaseHandoffStructuredSummaryOverviewLine,
        releaseHandoffStructuredSummarySha256: seededReleaseHandoffStructuredSummarySha256,
        releaseHandoffSummaryCopyVerificationSummary: seededReleaseHandoffSummaryCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
      }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-manifest.json'),
    },
    {
      content: [
        'artifactVersion=execution-v1-release-handoff-manifest-text/seed',
        `generatedAt=${generatedAt}`,
        'kind=handoff-manifest',
        `summaryCopyTotalChecks=${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `summaryCopyExactMatchCount=${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `summaryCopyStableSha256=${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `summaryCopyPreviewTotalArtifacts=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `summaryCopyPreviewExactMatchCount=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `summaryCopyPreviewStableSha256=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `summaryDetailCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryStableLineCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyPreviewLineCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyBodyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        `structuredSummarySha256=${seededReleaseHandoffStructuredSummarySha256}`,
        '---summary-copy---',
        seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines,
        '---summary-copy-preview---',
        seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines,
        '---summary-detail-copy---',
        seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview---',
        seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview---',
        seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy-body---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
        '---structured-summary---',
        seededReleaseHandoffStructuredSummaryOverviewLine,
        ...seededReleaseHandoffStructuredSummaryLines,
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-manifest.txt'),
    },
    {
      content: [
        '# Release Handoff Manifest Seed',
        '',
        `- generatedAt: ${generatedAt}`,
        '- kind: handoff-manifest',
        `- summaryCopyTotalChecks: ${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `- summaryCopyExactMatchCount: ${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `- summaryCopyStableSha256: ${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `- summaryCopyPreviewTotalArtifacts: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `- summaryCopyPreviewExactMatchCount: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `- summaryCopyPreviewStableSha256: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `- summaryDetailCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryStableLineCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        '',
        '## Summary-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine}`,
        '',
        '## Summary-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-manifest.md'),
    },
    {
      content: `${JSON.stringify({
        artifactVersion: 'execution-v1-release-handoff-index/seed',
        generatedAt,
        kind: 'handoff-index',
        releaseHandoffOpenErrorFreeSessions: seededReleaseHandoffStructuredSummary.open.errorFreeSessions,
        releaseHandoffOpenStableDigestSha256: seededReleaseHandoffStructuredSummary.open.stableDigestSha256,
        releaseHandoffOpenTotalSessions: seededReleaseHandoffStructuredSummary.open.totalSessions,
        releaseHandoffPreviewErrorFreeSessions: seededReleaseHandoffStructuredSummary.preview.errorFreeSessions,
        releaseHandoffPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.preview.stableDigestSha256,
        releaseHandoffPreviewTotalSessions: seededReleaseHandoffStructuredSummary.preview.totalSessions,
        releaseHandoffSummaryCopyExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopy.exactMatchCount,
        releaseHandoffSummaryCopyOverviewLine: seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryCopyStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopy.stableDigestSha256,
        releaseHandoffSummaryCopyTotalChecks: seededReleaseHandoffStructuredSummary.summaryCopy.totalSessions,
        releaseHandoffSummaryCopyPreviewExactMatchCount: seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount,
        releaseHandoffSummaryCopyPreviewOverviewLine: seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        releaseHandoffSummaryCopyPreviewStableDigestSha256: seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256,
        releaseHandoffSummaryCopyPreviewTotalArtifacts: seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions,
        releaseHandoffSummaryDetailCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
        releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
        releaseHandoffStructuredSummary: seededReleaseHandoffStructuredSummary,
        releaseHandoffStructuredSummaryLines: seededReleaseHandoffStructuredSummaryLines,
        releaseHandoffStructuredSummaryOverviewLine: seededReleaseHandoffStructuredSummaryOverviewLine,
        releaseHandoffStructuredSummarySha256: seededReleaseHandoffStructuredSummarySha256,
        releaseHandoffSummaryCopyVerificationSummary: seededReleaseHandoffSummaryCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
        releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
        releaseHandoffSummaryStableLineCopyVerificationSummary: seededReleaseHandoffSummaryStableLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
        releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary: seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
      }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-index.json'),
    },
    {
      content: [
        'artifactVersion=execution-v1-release-handoff-index-text/seed',
        `generatedAt=${generatedAt}`,
        'kind=handoff-index',
        `summaryCopyTotalChecks=${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `summaryCopyExactMatchCount=${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `summaryCopyStableSha256=${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `summaryCopyPreviewTotalArtifacts=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `summaryCopyPreviewExactMatchCount=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `summaryCopyPreviewStableSha256=${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `summaryDetailCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryStableLineCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyTotalChecks=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `summaryDetailCopyPreviewLineCopyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `summaryDetailCopyPreviewLineCopyBodyStableSha256=${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        `structuredSummarySha256=${seededReleaseHandoffStructuredSummarySha256}`,
        '---summary-copy---',
        seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines,
        '---summary-copy-preview---',
        seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine,
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines,
        '---summary-detail-copy---',
        seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview---',
        seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
        seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview---',
        seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
        '---summary-detail-copy-preview-line-copy-body---',
        seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
        '---structured-summary---',
        seededReleaseHandoffStructuredSummaryOverviewLine,
        ...seededReleaseHandoffStructuredSummaryLines,
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-index.txt'),
    },
    {
      content: [
        '# Release Handoff Index Seed',
        '',
        `- generatedAt: ${generatedAt}`,
        '- kind: handoff-index',
        `- summaryCopyTotalChecks: ${seededReleaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
        `- summaryCopyExactMatchCount: ${seededReleaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
        `- summaryCopyStableSha256: ${seededReleaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
        `- summaryCopyPreviewTotalArtifacts: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.totalSessions}`,
        `- summaryCopyPreviewExactMatchCount: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.exactMatchCount}`,
        `- summaryCopyPreviewStableSha256: ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableDigestSha256}`,
        `- summaryDetailCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryStableLineCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyTotalChecks: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
        `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
        `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
        `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
        `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
        '',
        '## Summary-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffStructuredSummary.summaryCopyPreview.overviewLine}`,
        '',
        '## Summary-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffStructuredSummary.summaryCopyPreview.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Overview',
        '',
        `- ${seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
        '',
        '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
        '',
        ...seededReleaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
      ].join('\n').concat('\n'),
      path: path.join(tempScreenshotDir, 'execution-v1-release-handoff-index.md'),
    },
    {
      content: `${JSON.stringify({ artifactVersion: 'execution-v1-release-doc-index/seed', generatedAt, kind: 'index' }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-index.json'),
    },
    {
      content: `artifactVersion=execution-v1-release-doc-index-text/seed\ngeneratedAt=${generatedAt}\nkind=index\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-index.txt'),
    },
    {
      content: `# Release Doc Index Seed\n\ngeneratedAt: ${generatedAt}\n\n- kind: index\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-index.md'),
    },
    {
      content: `${JSON.stringify({ artifactVersion: 'execution-v1-release-doc-manifest/seed', generatedAt, kind: 'manifest' }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-manifest.json'),
    },
    {
      content: `artifactVersion=execution-v1-release-doc-manifest-text/seed\ngeneratedAt=${generatedAt}\nkind=manifest\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-manifest.txt'),
    },
    {
      content: `# Release Doc Manifest Seed\n\ngeneratedAt: ${generatedAt}\n\n- kind: manifest\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-manifest.md'),
    },
    {
      content: `${JSON.stringify({ artifactVersion: 'execution-v1-release-doc-digest/seed', generatedAt, kind: 'digest' }, null, 2)}\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-digest.json'),
    },
    {
      content: `artifactVersion=execution-v1-release-doc-digest-text/seed\ngeneratedAt=${generatedAt}\nkind=digest\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-digest.txt'),
    },
    {
      content: `# Release Doc Digest Seed\n\ngeneratedAt: ${generatedAt}\n\n- kind: digest\n`,
      path: path.join(tempScreenshotDir, 'execution-v1-release-doc-digest.md'),
    },
  ];

  fs.mkdirSync(tempScreenshotDir, { recursive: true });
  for (const fixture of handoffFixtures) {
    fs.mkdirSync(path.dirname(fixture.path), { recursive: true });
    fs.writeFileSync(fixture.path, fixture.content);
  }
}

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'browser-e2e-workspace'],
});

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  await waitForServer(baseUrl, serverProcess, serverOutput);

  const servedAppJs = await fetch(`${baseUrl}/app.js`).then((response) => response.text());
  const releaseDocAssetSanity = {
    closeoutLabelPresent: servedAppJs.includes('>closeout</strong>'),
    closeoutMarkerPresent: servedAppJs.includes('data-release-doc-kind="closeout"'),
    evidenceLabelPresent: servedAppJs.includes('>evidence</strong>'),
    evidenceMarkerPresent: servedAppJs.includes('data-release-doc-kind="evidence"'),
  };
  assert.deepEqual(
    releaseDocAssetSanity,
    {
      closeoutLabelPresent: true,
      closeoutMarkerPresent: true,
      evidenceLabelPresent: true,
      evidenceMarkerPresent: true,
    },
    JSON.stringify(releaseDocAssetSanity),
  );

  console.error('[smoke-ui-execution-browser-e2e] open browser');
  runPw(['open', baseUrl]);

  console.error('[smoke-ui-execution-browser-e2e] install dialog guards');
  installBrowserGuards();

  const missionTitle = `Browser Execution E2E ${Date.now().toString(36)}`;

  console.error('[smoke-ui-execution-browser-e2e] create mission');
  runPw([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => {
        const select = document.querySelector('#workspace-select');
        return Boolean(select && select.value && select.options.length > 0);
      });
      await page.getByRole('button', { name: '새 미션 시작' }).click();
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('step') === 'step-setup');
      await page.locator('#step-setup').waitFor({ state: 'visible' });
      await page.locator('#mission-form input[name="title"]').waitFor({ state: 'visible' });
      return page.url();
    }`,
  ]);

  runPw([
    '--raw',
    'run-code',
    `async (page) => {
      await page.locator('#mission-form select[name="mode"]').selectOption('engineering');
      await page.locator('#mission-form select[name="deliverableType"]').selectOption('implementation-proposal');
      await page.locator('#mission-form input[name="title"]').fill(${JSON.stringify(missionTitle)});
      await page.locator('#mission-form textarea[name="objective"]').fill('Verify browser interaction E2E for the execution v1 operator console.');
      await page.locator('#mission-form textarea[name="constraints"]').fill('Keep blast radius small');
      await page.locator('#mission-form button[type="submit"]').click();
      return { submitted: true, title: ${JSON.stringify(missionTitle)} };
    }`,
  ]);

  const creationState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      try {
        await page.waitForFunction((expectedTitle) => {
          const heading = document.querySelector('#mission-title');
          const step = new URL(window.location.href).searchParams.get('step');
          return heading?.textContent?.includes(expectedTitle) && step === 'step-run';
        }, ${JSON.stringify(missionTitle)}, { timeout: 15000 });
      } catch (error) {
        return {
          alert: await page.evaluate(() => window.__lastAlert || ''),
          error: String(error?.message || error),
          href: page.url(),
          ok: false,
          step: await page.evaluate(() => new URL(window.location.href).searchParams.get('step')),
          title: await page.evaluate(() => document.querySelector('#mission-title')?.textContent || ''),
        };
      }
      return {
        alert: await page.evaluate(() => window.__lastAlert || ''),
        href: page.url(),
        ok: true,
        step: await page.evaluate(() => new URL(window.location.href).searchParams.get('step')),
        title: await page.evaluate(() => document.querySelector('#mission-title')?.textContent || ''),
      };
    }`,
  ]);

  assert.equal(creationState.ok, true, JSON.stringify(creationState));
  assert.match(creationState.title, new RegExp(missionTitle));
  assert.match(creationState.href, /step=step-run/);
  const missionId = new URL(creationState.href).searchParams.get('mission');
  assert.ok(missionId);

  console.error('[smoke-ui-execution-browser-e2e] seed retrieval inputs');
  const retrievalSeedState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const missionId = ${JSON.stringify(missionId)};
      return await page.evaluate(async (currentMissionId) => {
        const memoryResponse = await window.fetch('/api/missions/' + encodeURIComponent(currentMissionId) + '/memory', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content: 'Execution validation rehearsal relies on prompt normalization and provider drift notes.',
            kind: 'fact',
          }),
        });
        const attachmentResponse = await window.fetch('/api/missions/' + encodeURIComponent(currentMissionId) + '/attachments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            attachments: [
              {
                content: '# Retrieval Seed\\nPrompt normalization resolved provider drift during execution validation rehearsal.',
                fileName: 'retrieval-seed.md',
                mimeType: 'text/markdown',
                source: 'browser-e2e',
              },
            ],
          }),
        });
        return {
          attachmentOk: attachmentResponse.ok,
          memoryOk: memoryResponse.ok,
        };
      }, missionId);
    }`,
  ]);
  assert.equal(retrievalSeedState.memoryOk, true, JSON.stringify(retrievalSeedState));
  assert.equal(retrievalSeedState.attachmentOk, true, JSON.stringify(retrievalSeedState));

  console.error('[smoke-ui-execution-browser-e2e] run mission');
  const missionRunState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => {
        const button = document.querySelector('#run-mission-button');
        return Boolean(button && !button.disabled);
      });
      await page.locator('#run-provider-select').selectOption('stub');
      await page.evaluate(() => {
        document.querySelector('#run-mission-button')?.click();
      });
      try {
        await page.waitForFunction((expectedTitle) => {
          const consoleText = document.querySelector('#execution-console')?.innerText || '';
          const missionTitleNode = document.querySelector('#mission-title');
          const step = new URL(window.location.href).searchParams.get('step');
          return (
            missionTitleNode?.textContent?.includes(expectedTitle) &&
            !consoleText.includes('검토 세션\\n-') &&
            (step === 'step-review' || step === 'step-output' || step === 'step-run')
          );
        }, ${JSON.stringify(missionTitle)}, { timeout: 20000 });
      } catch (error) {
        return {
          alert: await page.evaluate(() => window.__lastAlert || ''),
          buttonText: await page.evaluate(() => document.querySelector('#run-mission-button')?.textContent || ''),
          error: String(error?.message || error),
          executionConsole: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
          href: page.url(),
          ok: false,
          step: await page.evaluate(() => new URL(window.location.href).searchParams.get('step')),
        };
      }
      return {
        alert: await page.evaluate(() => window.__lastAlert || ''),
        buttonText: await page.evaluate(() => document.querySelector('#run-mission-button')?.textContent || ''),
        executionConsole: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
        href: page.url(),
        ok: true,
        step: await page.evaluate(() => new URL(window.location.href).searchParams.get('step')),
      };
    }`,
  ]);

  assert.equal(missionRunState.ok, true, JSON.stringify(missionRunState));
  assert.match(missionRunState.href, new RegExp(`mission=`));

  console.error('[smoke-ui-execution-browser-e2e] request execution approval');
  runPw([
    '--raw',
    'run-code',
    `async (page) => {
      await page.evaluate(() => {
        document.querySelector('[data-step-target="step-run"]')?.click();
      });
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('step') === 'step-run');
      await page.waitForFunction(() => !!document.querySelector('[data-ui-action="execution-preflight"][data-ui-value="request-approval"]'));
      await page.evaluate(() => {
        document.querySelector('[data-ui-action="execution-preflight"][data-ui-value="request-approval"]')?.click();
      });
      await page.waitForFunction(() => {
        const text = document.querySelector('#execution-console')?.innerText || '';
        return text.includes('승인 대기') || text.includes('실행 승인 요청을 생성했습니다');
      });
      return document.querySelector('#execution-console')?.innerText || '';
    }`,
  ]);

  const approvalResolutionState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.evaluate(() => {
        document.querySelector('[data-step-target="step-review"]')?.click();
      });
      const approvalId = await page.evaluate(async (targetMissionId) => {
        const response = await fetch('/api/missions/' + encodeURIComponent(targetMissionId) + '/execution');
        const payload = await response.json();
        const approval = payload.execution?.latestApproval || null;
        if (approval?.kind === 'execution_lease' && approval?.status === 'pending') {
          return approval.id || '';
        }
        return '';
      }, ${JSON.stringify(missionId)});
      if (!approvalId) {
        return {
          error: 'execution lease approval not found',
          href: page.url(),
          ok: false,
          reviewState: await page.evaluate(() => document.querySelector('#review-stage-summary')?.innerText || ''),
        };
      }
      await page.evaluate(async (targetApprovalId) => {
        const response = await fetch('/api/approvals/' + encodeURIComponent(targetApprovalId) + '/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            decision: 'approve',
            reason: 'Browser interaction smoke approves one bounded execution session.',
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'approval resolve failed');
        }
      }, approvalId);
      for (let index = 0; index < 60; index += 1) {
        const payload = await page.evaluate(async (targetMissionId) => {
          const response = await fetch('/api/missions/' + encodeURIComponent(targetMissionId) + '/execution');
          return await response.json();
        }, ${JSON.stringify(missionId)});
        if (payload.execution?.currentLease?.status === 'active' || payload.execution?.latestLease?.status === 'active') {
          return {
            approvalId,
            href: page.url(),
            ok: true,
            reviewState: await page.evaluate(() => document.querySelector('#review-stage-summary')?.innerText || ''),
          };
        }
        await page.waitForTimeout(250);
      }
      return {
        approvalId,
        error: 'execution lease did not become active',
        href: page.url(),
        ok: false,
        reviewState: await page.evaluate(() => document.querySelector('#review-stage-summary')?.innerText || ''),
      };
    }`,
  ]);
  assert.equal(approvalResolutionState.ok, true, JSON.stringify(approvalResolutionState));

  console.error('[smoke-ui-execution-browser-e2e] reload after approval and start execution');
  const runStageState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const select = document.querySelector('#workspace-select');
        return Boolean(select && select.value);
      }, { timeout: 15000 });
      await page.evaluate(() => {
        document.querySelector('[data-step-target="step-run"]')?.click();
      });
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('step') === 'step-run', { timeout: 10000 });
      return {
        href: page.url(),
        ok: true,
      };
    }`,
  ]);
  assert.equal(runStageState.ok, true, JSON.stringify(runStageState));

  const startButtonState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      try {
        await page.waitForFunction(() => {
          const button = document.querySelector('[data-ui-action="execution-start"]');
          return Boolean(button && !button.disabled);
        }, { timeout: 15000 });
      } catch (error) {
        return {
          consoleText: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
          error: String(error?.message || error),
          href: page.url(),
          html: await page.evaluate(() => document.querySelector('#execution-console')?.innerHTML || ''),
          ok: false,
          runStageSummary: await page.evaluate(() => document.querySelector('#run-stage-summary')?.innerText || ''),
        };
      }
      return {
        buttonText: await page.evaluate(() => document.querySelector('[data-ui-action="execution-start"]')?.textContent || ''),
        href: page.url(),
        ok: true,
      };
    }`,
  ]);
  assert.equal(startButtonState.ok, true, JSON.stringify(startButtonState));

  const executionStartClickState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-ui-action="execution-start"]');
        return Boolean(button && !button.disabled);
      }, { timeout: 15000 });
      await page.evaluate(() => {
        document.querySelector('[data-ui-action="execution-start"]')?.click();
      });
      try {
        await page.waitForFunction(() => {
          const note = document.querySelector('.flow-status-note')?.textContent || '';
          const text = document.querySelector('#execution-console')?.innerText || '';
          return note.includes('실행 세션을 시작했습니다.') || text.includes('running') || text.includes('실행 중') || text.includes('completed') || text.includes('완료');
        }, { timeout: 15000 });
      } catch (error) {
        return {
          consoleText: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
          error: String(error?.message || error),
          href: page.url(),
          notice: await page.evaluate(() => document.querySelector('.flow-status-note')?.textContent || ''),
          ok: false,
        };
      }
      return {
        buttonText: await page.evaluate(() => document.querySelector('[data-ui-action="execution-start"]')?.textContent || ''),
        consoleText: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
        href: page.url(),
        notice: await page.evaluate(() => document.querySelector('.flow-status-note')?.textContent || ''),
        ok: true,
      };
    }`,
  ]);
  assert.equal(executionStartClickState.ok, true, JSON.stringify(executionStartClickState));

  console.error('[smoke-ui-execution-browser-e2e] poll execution status via CLI');
  let executionStatus = runCli({
    rootDir: tempRoot,
    args: ['mission', 'execution', 'status', missionId],
  });

  for (let index = 0; index < 120; index += 1) {
    if (executionStatus.execution?.latestExecutionSession?.status !== 'running') {
      break;
    }
    await delay(250);
    executionStatus = runCli({
      rootDir: tempRoot,
      args: ['mission', 'execution', 'status', missionId],
    });
  }

  assert.equal(executionStatus.execution?.latestExecutionSession?.status, 'completed');
  assert.equal(executionStatus.execution?.latestExecutionSession?.verification?.status, 'passed');

  console.error('[smoke-ui-execution-browser-e2e] verify execution console');
  const startState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      try {
        await page.waitForFunction(() => {
          const text = document.querySelector('#execution-console')?.innerText || '';
          return text.includes('완료') && text.includes('검증');
        }, { timeout: 10000 });
      } catch (error) {
        return {
          executionConsole: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
          error: String(error?.message || error),
          href: page.url(),
          ok: false,
        };
      }
      return {
        executionConsole: await page.evaluate(() => document.querySelector('#execution-console')?.innerText || ''),
        href: page.url(),
        ok: true,
      };
    }`,
  ]);

  assert.equal(startState.ok, true, JSON.stringify(startState));
  assert.match(startState.executionConsole, /완료/);
  assert.match(startState.executionConsole, /검증/);

  console.error('[smoke-ui-execution-browser-e2e] verify retrieval focus URL restore');
  const verifyRetrievalSourceFlow = ({ sourceType }) => {
    const retrievalFocusState = runPwJson([
      '--raw',
      'run-code',
      `async (page) => {
        await page.evaluate(() => {
          document.querySelector('[data-step-target="step-setup"]')?.click();
        });
        await page.waitForFunction(() => new URL(window.location.href).searchParams.get('step') === 'step-setup');
        await page.waitForFunction(() => document.querySelectorAll('[data-retrieval-source-type]').length > 0, null, {
          timeout: 15000,
        });
        const sourceMeta = await page.evaluate((targetSourceType) => {
          const targetButton = Array.from(document.querySelectorAll('[data-retrieval-source-type]')).find(
            (button) => button.getAttribute('data-retrieval-source-type') === targetSourceType,
          );
          return {
            sourceLabel: targetButton?.getAttribute('data-retrieval-source-label') || '',
            sourceType: targetButton?.getAttribute('data-retrieval-source-type') || '',
          };
        }, ${JSON.stringify(sourceType)});
        if (!sourceMeta.sourceType || !sourceMeta.sourceLabel) {
          return {
            missingSource: true,
            sourceLabel: sourceMeta.sourceLabel,
            sourceType: sourceMeta.sourceType,
          };
        }
        const fallbackState = await page.evaluate(async ({ targetSourceLabel, targetSourceType }) => {
          const setClipboard = (clipboardValue) => {
            try {
              Object.defineProperty(window.navigator, 'clipboard', {
                configurable: true,
                value: clipboardValue,
              });
            } catch {
              window.navigator.clipboard = clipboardValue;
            }
          };
          setClipboard({
            writeText: async () => {
              throw new Error('clipboard-blocked');
            },
          });
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          const targetCopyButton = Array.from(document.querySelectorAll('[data-retrieval-source-copy="true"]')).find(
            (button) =>
              button.getAttribute('data-ui-source-type') === targetSourceType &&
              button.getAttribute('data-ui-source-label') === targetSourceLabel,
          );
          targetCopyButton?.click();
          await new Promise((resolve) => setTimeout(resolve, 50));
          let fallbackPromptedLink = '';
          try {
            fallbackPromptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            fallbackPromptedLink = '';
          }
          const fallbackCopyLabel = targetCopyButton?.textContent || '';
          const fallbackClipboardText = window.__lastClipboardText || '';
          setClipboard({
            writeText: async (value) => {
              window.__lastClipboardText = String(value || '');
            },
          });
          return {
            fallbackClipboardText,
            fallbackCopyLabel,
            fallbackPromptedLink,
          };
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        await page.evaluate(({ targetSourceLabel, targetSourceType }) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          const targetCopyButton = Array.from(document.querySelectorAll('[data-retrieval-source-copy="true"]')).find(
            (button) =>
              button.getAttribute('data-ui-source-type') === targetSourceType &&
              button.getAttribute('data-ui-source-label') === targetSourceLabel,
          );
          targetCopyButton?.click();
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        const directCopiedLink = await page.evaluate(() => window.__lastClipboardText || '');
        const directPromptedLink = await page.evaluate(() => {
          try {
            return JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            return '';
          }
        });
        const directCopyLabel = await page.evaluate(({ targetSourceLabel, targetSourceType }) => {
          const targetCopyButton = Array.from(document.querySelectorAll('[data-retrieval-source-copy="true"]')).find(
            (button) =>
              button.getAttribute('data-ui-source-type') === targetSourceType &&
              button.getAttribute('data-ui-source-label') === targetSourceLabel,
          );
          return targetCopyButton?.textContent || '';
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        await page.evaluate(({ targetSourceLabel, targetSourceType }) => {
          const targetButton = Array.from(document.querySelectorAll('[data-retrieval-source-type]')).find(
            (button) =>
              button.getAttribute('data-retrieval-source-type') === targetSourceType &&
              button.getAttribute('data-retrieval-source-label') === targetSourceLabel,
          );
          targetButton?.click();
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        await page.waitForFunction(() => {
          const params = new URL(window.location.href).searchParams;
          return Boolean(params.get('hstype') && params.get('hsource') && params.get('tab') === 'harness');
        });
        const focusedHref = page.url();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
          const params = new URL(window.location.href).searchParams;
          return Boolean(params.get('hstype') && params.get('hsource') && document.querySelector('.tag.is-active-focus'));
        }, null, { timeout: 15000 });
        const reloadedState = {
          activeChip: await page.evaluate(() => document.querySelector('.tag.is-active-focus')?.textContent || ''),
          attachmentFocused: await page.evaluate((targetSourceLabel) => {
            return document.querySelector('[data-harness-attachment-file="' + CSS.escape(targetSourceLabel) + '"]')?.classList.contains('is-focused-source') || false;
          }, sourceMeta.sourceLabel),
          focusBanner: await page.evaluate(() => Array.from(document.querySelectorAll('.harness-callout strong')).map((node) => node.textContent || '').find((text) => text.includes('현재 retrieval source focus')) || ''),
          href: page.url(),
        };
        await page.goto(${JSON.stringify(baseUrl)}, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => Boolean(document.querySelector('#workspace-select')), null, { timeout: 15000 });
        await page.goto(focusedHref, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
          const params = new URL(window.location.href).searchParams;
          return Boolean(params.get('hstype') && params.get('hsource') && document.querySelector('.tag.is-active-focus'));
        }, null, { timeout: 15000 });
        const focusedFallbackState = await page.evaluate(async ({ targetSourceLabel, targetSourceType }) => {
          await new Promise((resolve) => setTimeout(resolve, 1900));
          const setClipboard = (clipboardValue) => {
            try {
              Object.defineProperty(window.navigator, 'clipboard', {
                configurable: true,
                value: clipboardValue,
              });
            } catch {
              window.navigator.clipboard = clipboardValue;
            }
          };
          const findFocusedCopyButton = () =>
            Array.from(document.querySelectorAll('[data-ui-action="copy-retrieval-source-link"]')).find(
              (button) =>
                button.getAttribute('data-ui-source-type') === targetSourceType &&
                button.getAttribute('data-ui-source-label') === targetSourceLabel &&
                (button.textContent || '').includes('현재 source 링크'),
            );
          setClipboard({
            writeText: async () => {
              throw new Error('clipboard-blocked');
            },
          });
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          const targetCopyButton = findFocusedCopyButton();
          targetCopyButton?.click();
          await new Promise((resolve) => setTimeout(resolve, 50));
          let fallbackPromptedLink = '';
          try {
            fallbackPromptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            fallbackPromptedLink = '';
          }
          const fallbackCopyLabel = targetCopyButton?.textContent || '';
          const fallbackClipboardText = window.__lastClipboardText || '';
          setClipboard({
            writeText: async (value) => {
              window.__lastClipboardText = String(value || '');
            },
          });
          return {
            fallbackClipboardText,
            fallbackCopyLabel,
            fallbackPromptedLink,
          };
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        await page.evaluate(({ targetSourceLabel, targetSourceType }) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          const targetCopyButton = Array.from(document.querySelectorAll('[data-ui-action="copy-retrieval-source-link"]')).find(
            (button) =>
              button.getAttribute('data-ui-source-type') === targetSourceType &&
              button.getAttribute('data-ui-source-label') === targetSourceLabel &&
              (button.textContent || '').includes('현재 source 링크'),
          );
          targetCopyButton?.click();
        }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType });
        return {
          activeChip: reloadedState.activeChip,
          attachmentFocused: reloadedState.attachmentFocused,
          copiedLink: await page.evaluate(() => window.__lastClipboardText || ''),
          directCopiedLink,
          directCopyLabel,
          fallbackClipboardText: fallbackState.fallbackClipboardText,
          fallbackCopyLabel: fallbackState.fallbackCopyLabel,
          fallbackPromptedLink: fallbackState.fallbackPromptedLink,
          focusBanner: reloadedState.focusBanner,
          focusedFallbackClipboardText: focusedFallbackState.fallbackClipboardText,
          focusedFallbackCopyLabel: focusedFallbackState.fallbackCopyLabel,
          focusedFallbackPromptedLink: focusedFallbackState.fallbackPromptedLink,
          href: reloadedState.href,
          initialHref: focusedHref,
          directPromptedLink,
          promptedLink: await page.evaluate(() => {
            try {
              return JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
            } catch {
              return '';
            }
          }),
          reopenedAttachmentFocused: await page.evaluate((targetSourceLabel) => {
            return document.querySelector('[data-harness-attachment-file="' + CSS.escape(targetSourceLabel) + '"]')?.classList.contains('is-focused-source') || false;
          }, sourceMeta.sourceLabel),
          reopenedChip: await page.evaluate(() => document.querySelector('.tag.is-active-focus')?.textContent || ''),
          reopenedCopyLabel: await page.evaluate(({ targetSourceLabel, targetSourceType }) => {
            const targetCopyButton = Array.from(document.querySelectorAll('[data-ui-action="copy-retrieval-source-link"]')).find(
              (button) =>
                button.getAttribute('data-ui-source-type') === targetSourceType &&
                button.getAttribute('data-ui-source-label') === targetSourceLabel &&
                (button.textContent || '').includes('현재 source 링크'),
            );
            return targetCopyButton?.textContent || '';
          }, { targetSourceLabel: sourceMeta.sourceLabel, targetSourceType: sourceMeta.sourceType }),
          reopenedFocusBanner: await page.evaluate(() => Array.from(document.querySelectorAll('.harness-callout strong')).map((node) => node.textContent || '').find((text) => text.includes('현재 retrieval source focus')) || ''),
          reopenedHref: page.url(),
          sourceLabel: sourceMeta.sourceLabel,
          sourceType: sourceMeta.sourceType,
        };
      }`,
    ]);

    assert.equal(retrievalFocusState.missingSource, undefined, JSON.stringify(retrievalFocusState));
    assert.equal(retrievalFocusState.sourceType, sourceType, JSON.stringify(retrievalFocusState));
    assert.ok(retrievalFocusState.sourceLabel);
    assert.equal(new URL(retrievalFocusState.href).searchParams.get('hstype'), retrievalFocusState.sourceType);
    assert.equal(new URL(retrievalFocusState.href).searchParams.get('hsource'), retrievalFocusState.sourceLabel);
    assert.match(retrievalFocusState.focusBanner, /현재 retrieval source focus/);
    assert.match(retrievalFocusState.activeChip, /현재 ·/);
    assert.equal(new URL(retrievalFocusState.reopenedHref).searchParams.get('hstype'), retrievalFocusState.sourceType);
    assert.equal(new URL(retrievalFocusState.reopenedHref).searchParams.get('hsource'), retrievalFocusState.sourceLabel);
    assert.match(retrievalFocusState.reopenedFocusBanner, /현재 retrieval source focus/);
    assert.match(retrievalFocusState.reopenedChip, /현재 ·/);
    assert.match(retrievalFocusState.directCopyLabel, /복사됨/);
    assert.equal(retrievalFocusState.directCopiedLink || retrievalFocusState.directPromptedLink, retrievalFocusState.reopenedHref);
    assert.match(retrievalFocusState.reopenedCopyLabel, /현재 source 링크 복사됨/);
    assert.equal(retrievalFocusState.fallbackClipboardText, '', JSON.stringify(retrievalFocusState));
    assert.equal(retrievalFocusState.fallbackPromptedLink, retrievalFocusState.reopenedHref);
    assert.equal(retrievalFocusState.fallbackCopyLabel.trim(), '링크');
    assert.equal(retrievalFocusState.focusedFallbackClipboardText, '', JSON.stringify(retrievalFocusState));
    assert.equal(retrievalFocusState.focusedFallbackPromptedLink, retrievalFocusState.reopenedHref);
    assert.equal(retrievalFocusState.focusedFallbackCopyLabel.trim(), '현재 source 링크 복사');
    if (sourceType === 'attachment') {
      assert.equal(retrievalFocusState.attachmentFocused, true, JSON.stringify(retrievalFocusState));
      assert.equal(retrievalFocusState.reopenedAttachmentFocused, true, JSON.stringify(retrievalFocusState));
    }

    return retrievalFocusState;
  };

  const memoryRetrievalFocusState = verifyRetrievalSourceFlow({ sourceType: 'memory' });
  const attachmentRetrievalFocusState = verifyRetrievalSourceFlow({ sourceType: 'attachment' });

  console.error('[smoke-ui-execution-browser-e2e] verify retrieval source handoff session');
  const verifyFreshHandoffSession = ({ retrievalFocusState, retrievalUrl, sessionLabel = 'copy' }) => {
    assert.equal(retrievalUrl, retrievalFocusState.reopenedHref);
    const handoffSessionId = `${retrievalFocusState.sourceType.slice(0, 1)}${sessionLabel.slice(0, 1)}${Date.now().toString(36).slice(-5)}`;
    handoffSessionIds.push(handoffSessionId);
    runPw(['open', baseUrl], { session: handoffSessionId });
    installBrowserGuards({ session: handoffSessionId });
    const handoffState = runPwJson([
      '--raw',
      'run-code',
      `async (page) => {
        const expectedSourceLabel = ${JSON.stringify(retrievalFocusState.sourceLabel)};
        const expectedSourceType = ${JSON.stringify(retrievalFocusState.sourceType)};
        await page.goto(${JSON.stringify(retrievalUrl)}, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(({ sourceLabel, sourceType }) => {
          const params = new URL(window.location.href).searchParams;
          return (
            params.get('hstype') === sourceType &&
            params.get('hsource') === sourceLabel &&
            Boolean(document.querySelector('.tag.is-active-focus'))
          );
        }, { sourceLabel: expectedSourceLabel, sourceType: expectedSourceType }, { timeout: 15000 });
        return {
          activeChip: await page.evaluate(() => document.querySelector('.tag.is-active-focus')?.textContent || ''),
          attachmentFocused: await page.evaluate((targetSourceLabel) => {
            return document.querySelector('[data-harness-attachment-file="' + CSS.escape(targetSourceLabel) + '"]')?.classList.contains('is-focused-source') || false;
          }, expectedSourceLabel),
          consoleErrors: page.__codexConsoleErrors || [],
          focusBanner: await page.evaluate(() => Array.from(document.querySelectorAll('.harness-callout strong')).map((node) => node.textContent || '').find((text) => text.includes('현재 retrieval source focus')) || ''),
          href: page.url(),
          pageErrors: page.__codexPageErrors || [],
        };
      }`,
    ], { session: handoffSessionId });
    assert.equal(new URL(handoffState.href).searchParams.get('hstype'), retrievalFocusState.sourceType);
    assert.equal(new URL(handoffState.href).searchParams.get('hsource'), retrievalFocusState.sourceLabel);
    assert.equal(handoffState.href, retrievalUrl);
    assert.deepEqual(handoffState.consoleErrors, [], JSON.stringify(handoffState));
    assert.match(handoffState.focusBanner, /현재 retrieval source focus/);
    assert.match(handoffState.activeChip, /현재 ·/);
    assert.deepEqual(handoffState.pageErrors, [], JSON.stringify(handoffState));
    if (retrievalFocusState.sourceType === 'attachment') {
      assert.equal(handoffState.attachmentFocused, true, JSON.stringify(handoffState));
    }

    const handoffSummary = {
      attachmentFocused: handoffState.attachmentFocused,
      consoleErrors: handoffState.consoleErrors.length,
      pageErrors: handoffState.pageErrors.length,
      sessionLabel,
      sourceLabel: retrievalFocusState.sourceLabel,
      sourceType: retrievalFocusState.sourceType,
    };
    handoffSessionResults.push(handoffSummary);
    return handoffSummary;
  };

  verifyFreshHandoffSession({
    retrievalFocusState: memoryRetrievalFocusState,
    retrievalUrl: memoryRetrievalFocusState.copiedLink || memoryRetrievalFocusState.promptedLink,
    sessionLabel: 'copy',
  });
  verifyFreshHandoffSession({
    retrievalFocusState: memoryRetrievalFocusState,
    retrievalUrl: memoryRetrievalFocusState.fallbackPromptedLink,
    sessionLabel: 'direct-fallback',
  });
  verifyFreshHandoffSession({
    retrievalFocusState: memoryRetrievalFocusState,
    retrievalUrl: memoryRetrievalFocusState.focusedFallbackPromptedLink,
    sessionLabel: 'focused-fallback',
  });
  verifyFreshHandoffSession({
    retrievalFocusState: attachmentRetrievalFocusState,
    retrievalUrl: attachmentRetrievalFocusState.copiedLink || attachmentRetrievalFocusState.promptedLink,
    sessionLabel: 'copy',
  });
  verifyFreshHandoffSession({
    retrievalFocusState: attachmentRetrievalFocusState,
    retrievalUrl: attachmentRetrievalFocusState.fallbackPromptedLink,
    sessionLabel: 'direct-fallback',
  });
  verifyFreshHandoffSession({
    retrievalFocusState: attachmentRetrievalFocusState,
    retrievalUrl: attachmentRetrievalFocusState.focusedFallbackPromptedLink,
    sessionLabel: 'focused-fallback',
  });

  console.error('[smoke-ui-execution-browser-e2e] verify release tab and browser history');
  const releaseState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.evaluate(() => {
        document.querySelector('[data-step-target="step-output"]')?.click();
      });
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('step') === 'step-output');
      await page.evaluate(() => {
        document.querySelector('[data-detail-tab="release"]')?.click();
      });
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('tab') === 'release');
      return {
        href: page.url(),
        releaseHeading: await page.evaluate(() => document.querySelector('#detail-release h4')?.textContent || ''),
      };
    }`,
  ]);

  assert.match(releaseState.href, /tab=release/);
  assert.match(releaseState.releaseHeading, /검증, evidence, closeout/);

  runPw(['go-back']);
  const backState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => !window.location.search.includes('tab=release'));
      return {
        href: page.url(),
      };
    }`,
  ]);
  assert.notEqual(new URL(backState.href).searchParams.get('tab'), 'release');

  runPw(['go-forward']);
  const forwardState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => window.location.search.includes('tab=release'));
      return {
        href: page.url(),
      };
    }`,
  ]);
  assert.equal(new URL(forwardState.href).searchParams.get('tab'), 'release');

  runPw(['reload']);
  const reloadState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => window.location.search.includes('tab=release'));
      return {
        href: page.url(),
      };
    }`,
  ]);
  assert.equal(new URL(reloadState.href).searchParams.get('tab'), 'release');
  assert.equal(new URL(reloadState.href).searchParams.get('step'), 'step-output');

  const handoffPreviewState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const previewTargets = [
        { artifactId: 'handoff-digest-json', expectedFormat: 'json', label: 'handoff-digest.json' },
        { artifactId: 'handoff-digest-text', expectedFormat: 'text', label: 'handoff-digest.txt' },
        { artifactId: 'handoff-digest-markdown', expectedFormat: 'markdown', label: 'handoff-digest.md' },
        { artifactId: 'handoff-manifest-json', expectedFormat: 'json', label: 'handoff-manifest.json' },
        { artifactId: 'handoff-manifest-text', expectedFormat: 'text', label: 'handoff-manifest.txt' },
        { artifactId: 'handoff-manifest-markdown', expectedFormat: 'markdown', label: 'handoff-manifest.md' },
        { artifactId: 'handoff-index-json', expectedFormat: 'json', label: 'handoff-index.json' },
        { artifactId: 'handoff-index-text', expectedFormat: 'text', label: 'handoff-index.txt' },
        { artifactId: 'handoff-index-markdown', expectedFormat: 'markdown', label: 'handoff-index.md' },
        { artifactId: 'index-markdown', expectedFormat: 'markdown', label: 'index.md' },
        { artifactId: 'index-text', expectedFormat: 'text', label: 'index.txt' },
        { artifactId: 'index-json', expectedFormat: 'json', label: 'index.json' },
      ];
      const results = [];
      for (const target of previewTargets) {
        await page.evaluate((currentTarget) => {
          document.querySelector('[data-release-handoff-preview-trigger="' + CSS.escape(currentTarget.artifactId) + '"]')?.click();
        }, target);
        await page.waitForFunction((currentTarget) => {
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          return panel
            && panel.getAttribute('data-release-handoff-preview-panel') === currentTarget.artifactId
            && panel.getAttribute('data-release-handoff-preview-state') === 'ready';
        }, target, { timeout: 15000 });
        results.push(await page.evaluate((currentTarget) => {
          const card = document.querySelector('[data-release-handoff-id="' + CSS.escape(currentTarget.artifactId) + '"]');
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          const previewBody = panel?.querySelector('[data-release-handoff-preview-body]')?.textContent || '';
          return {
            activeCard: card?.classList.contains('is-preview-active') || false,
            artifactId: currentTarget.artifactId,
            buttonLabel: card?.querySelector('[data-release-handoff-preview-trigger]')?.textContent || '',
            format: panel?.querySelector('[data-release-handoff-preview-format]')?.textContent || '',
            note: panel?.querySelector('[data-release-handoff-preview-note]')?.textContent || '',
            previewBody,
            previewBodySample: previewBody.replace(/\s+/g, ' ').trim().slice(0, 320),
            previewStructuredSummaryCopyLabel:
              panel?.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
            structuredSummaryCopyLabel:
              card?.querySelector('[data-release-handoff-structured-summary-copy]')?.textContent || '',
            structuredSummaryRows: Array.from(panel?.querySelectorAll('.release-handoff-summary .harness-row') || []).map((row) => ({
              label: row.querySelector('.item-title')?.textContent || '',
              value: row.querySelector('.item-meta')?.textContent || '',
            })),
            structuredSummaryDetails: Array.from(panel?.querySelectorAll('[data-release-handoff-preview-structured-summary-detail]') || []).map((row) => ({
              copyLabel: row.querySelector('button')?.textContent || '',
              detailKey: row.querySelector('button')?.getAttribute('data-ui-detail-key') || '',
              label: row.querySelector('.item-title')?.textContent || '',
              overview: row.querySelector('.item-meta')?.textContent || '',
              stableLineItems: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line-row')).map((item, lineIndex) => ({
                copyLabel: item.querySelector('button')?.textContent || '',
                lineIndex,
                text: item.querySelector('.release-handoff-summary-stable-line')?.textContent || '',
              })),
              stableLines: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line')).map((item) => item.textContent || ''),
            })),
            structuredSummaryOverview: panel?.querySelector('[data-release-handoff-preview-structured-summary-overview]')?.textContent || '',
            structuredSummarySha: panel?.querySelector('[data-release-handoff-preview-structured-summary-sha]')?.textContent || '',
            state: panel?.getAttribute('data-release-handoff-preview-state') || '',
            title: panel?.querySelector('.item-title')?.textContent || '',
          };
        }, target));
      }

      await page.evaluate(() => {
        document.querySelector('[data-release-handoff-preview-trigger="index-markdown"]')?.click();
      });
      await page.waitForFunction(() => {
        const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
        return panel
          && panel.getAttribute('data-release-handoff-preview-panel') === 'index-markdown'
          && panel.getAttribute('data-release-handoff-preview-state') === 'ready';
      }, { timeout: 15000 });

      return {
        activePreview: await page.evaluate(() => {
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          if (!panel) {
            return null;
          }
          return {
            artifactId: panel.getAttribute('data-release-handoff-preview-panel') || '',
            body: panel.querySelector('[data-release-handoff-preview-body]')?.textContent || '',
            format: panel.querySelector('[data-release-handoff-preview-format]')?.textContent || '',
            previewStructuredSummaryCopyLabel:
              panel.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
            structuredSummaryRows: Array.from(panel.querySelectorAll('.release-handoff-summary .harness-row')).map((row) => ({
              label: row.querySelector('.item-title')?.textContent || '',
              value: row.querySelector('.item-meta')?.textContent || '',
            })),
            structuredSummaryOverview: panel.querySelector('[data-release-handoff-preview-structured-summary-overview]')?.textContent || '',
            structuredSummarySha: panel.querySelector('[data-release-handoff-preview-structured-summary-sha]')?.textContent || '',
            state: panel.getAttribute('data-release-handoff-preview-state') || '',
            title: panel.querySelector('.item-title')?.textContent || '',
          };
        }),
        href: page.url(),
        results,
      };
    }`,
  ]);
  assert.equal(handoffPreviewState.results.length, 12, JSON.stringify(handoffPreviewState));
  for (const target of [
    { artifactId: 'handoff-digest-json', expectedFormat: 'json', label: 'handoff-digest.json' },
    { artifactId: 'handoff-digest-text', expectedFormat: 'text', label: 'handoff-digest.txt' },
    { artifactId: 'handoff-digest-markdown', expectedFormat: 'markdown', label: 'handoff-digest.md' },
    { artifactId: 'handoff-manifest-json', expectedFormat: 'json', label: 'handoff-manifest.json' },
    { artifactId: 'handoff-manifest-text', expectedFormat: 'text', label: 'handoff-manifest.txt' },
    { artifactId: 'handoff-manifest-markdown', expectedFormat: 'markdown', label: 'handoff-manifest.md' },
    { artifactId: 'handoff-index-json', expectedFormat: 'json', label: 'handoff-index.json' },
    { artifactId: 'handoff-index-text', expectedFormat: 'text', label: 'handoff-index.txt' },
    { artifactId: 'handoff-index-markdown', expectedFormat: 'markdown', label: 'handoff-index.md' },
    { artifactId: 'index-markdown', expectedFormat: 'markdown', label: 'index.md' },
    { artifactId: 'index-text', expectedFormat: 'text', label: 'index.txt' },
    { artifactId: 'index-json', expectedFormat: 'json', label: 'index.json' },
  ]) {
    const previewEntry = handoffPreviewState.results.find((item) => item.artifactId === target.artifactId);
    assert.equal(Boolean(previewEntry), true, JSON.stringify({ handoffPreviewState, target }));
    assert.equal(previewEntry.activeCard, true, JSON.stringify(previewEntry));
    assert.equal(previewEntry.state, 'ready', JSON.stringify(previewEntry));
    assert.equal(previewEntry.title, target.label, JSON.stringify(previewEntry));
    assert.equal(previewEntry.format, target.expectedFormat, JSON.stringify(previewEntry));
    assert.equal(String(previewEntry.previewBody || '').trim().length > 0, true, JSON.stringify(previewEntry));
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.length >= 16
        : previewEntry.structuredSummaryRows.length === 0,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'preview')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'open')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary copy preview')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview line copy')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview line copy body')
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.length >= 17
        : previewEntry.structuredSummaryDetails.length === 0,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? /sha\s+[a-f0-9]{12,}/i.test(String(previewEntry.structuredSummarySha || ''))
        : String(previewEntry.structuredSummarySha || '').trim().length === 0,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy'
          && /totalChecks=4\|exactMatchCount=4\|surfaces=handoff-digest-json:summaryCopyPreview\/card,handoff-index-markdown:summaryCopyPreview\/current-preview,handoff-digest-json:summaryDetailCopyPreviewLineCopy\/card,handoff-index-markdown:summaryDetailCopyPreviewLineCopyBody\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 4
          && Array.isArray(detail.stableLineItems)
          && detail.stableLineItems.length === 4
          && detail.stableLineItems.some((item) => /stable line 복사|복사됨/i.test(String(item.copyLabel || '')))
          && detail.stableLines.some((line) => /detail-line-copy-card\|exact=true\|copyLabel=/i.test(String(line || '')))
          && detail.stableLines.some((line) => /detail-line-copy-body-current-preview\|exact=true\|copyLabel=/i.test(String(line || '')))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryDetailCopy:0\/card,handoff-index-markdown:summaryDetailCopy:3\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryDetailCopyPreview\/card,handoff-index-markdown:summaryDetailCopyPreview\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBody:0\/card,handoff-index-markdown:summaryStableLineCopyPreviewBody:2\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBody:0\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBody:2\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? previewEntry.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? /entries=open,preview,summaryCopy,summaryCopyPreview,summaryDetailCopy,summaryDetailCopyPreview,summaryDetailCopyPreviewLineCopy,summaryDetailCopyPreviewLineCopyBody,summaryStableLineCopy,summaryStableLineCopyPreview,summaryStableLineCopyPreviewBody,summaryStableLineCopyPreviewBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy\|sha256=/i.test(String(previewEntry.structuredSummaryOverview || ''))
        : String(previewEntry.structuredSummaryOverview || '').trim().length === 0,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? String(previewEntry.structuredSummaryCopyLabel || '').trim().length > 0
        : String(previewEntry.structuredSummaryCopyLabel || '').trim().length === 0,
      true,
      JSON.stringify(previewEntry),
    );
    assert.equal(
      target.artifactId.startsWith('handoff-')
        ? String(previewEntry.previewStructuredSummaryCopyLabel || '').trim().length > 0
        : String(previewEntry.previewStructuredSummaryCopyLabel || '').trim().length === 0,
      true,
      JSON.stringify(previewEntry),
    );
  }
  assert.equal(Boolean(handoffPreviewState.activePreview), true, JSON.stringify(handoffPreviewState));
  assert.equal(handoffPreviewState.activePreview.artifactId, 'index-markdown', JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(handoffPreviewState.activePreview.format, 'markdown', JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(handoffPreviewState.activePreview.state, 'ready', JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(String(handoffPreviewState.activePreview.body || '').trim().length > 0, true, JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(String(handoffPreviewState.activePreview.previewStructuredSummaryCopyLabel || '').trim().length, 0, JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(handoffPreviewState.activePreview.structuredSummaryRows.length, 0, JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(String(handoffPreviewState.activePreview.structuredSummaryOverview || '').trim().length, 0, JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(String(handoffPreviewState.activePreview.structuredSummarySha || '').trim().length, 0, JSON.stringify(handoffPreviewState.activePreview));
  assert.equal(new URL(handoffPreviewState.href).searchParams.get('rartifact'), 'index-markdown', JSON.stringify(handoffPreviewState));
  const releaseHandoffSummaryCopyPreviewVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryStableLineCopyPreviewVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryDetailCopyPreviewVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary = {
    byArtifactId: {},
    exactMatchCount: 0,
    totalArtifacts: 0,
  };
  for (const target of [
    {
      artifactId: 'handoff-digest-text',
      expectedCounter: 'summaryCopyExactMatchCount=2',
      expectedMarker: '---summary-copy---',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount=6',
      expectedPreviewMarker: '---summary-copy-preview---',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount=4',
      expectedDetailMarker: '---summary-detail-copy---',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount=2',
      expectedStableLineMarker: '---summary-stable-line-copy---',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount=6',
      expectedStableLinePreviewMarker: '---summary-stable-line-copy-preview---',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount=6',
      expectedDetailPreviewMarker: '---summary-detail-copy-preview---',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount=2',
      expectedDetailPreviewLineCopyMarker: '---summary-detail-copy-preview-line-copy---',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount=6',
      expectedDetailPreviewLineCopyBodyMarker: '---summary-detail-copy-preview-line-copy-body---',
      format: 'text',
    },
    {
      artifactId: 'handoff-digest-markdown',
      expectedCounter: 'summaryCopyExactMatchCount: 2',
      expectedMarker: 'Summary-Copy Overview',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount: 6',
      expectedPreviewMarker: 'Summary-Copy Preview Overview',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount: 4',
      expectedDetailMarker: 'Summary-Detail-Copy Overview',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount: 2',
      expectedStableLineMarker: 'Summary-Stable-Line-Copy Overview',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount: 6',
      expectedStableLinePreviewMarker: 'Summary-Stable-Line-Copy Preview Overview',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount: 6',
      expectedDetailPreviewMarker: 'Summary-Detail-Copy Preview Overview',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount: 2',
      expectedDetailPreviewLineCopyMarker: 'Summary-Detail-Copy Preview Line Copy Overview',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount: 6',
      expectedDetailPreviewLineCopyBodyMarker: 'Summary-Detail-Copy Preview Line Copy Body Overview',
      format: 'markdown',
    },
    {
      artifactId: 'handoff-manifest-text',
      expectedCounter: 'summaryCopyExactMatchCount=2',
      expectedMarker: '---summary-copy---',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount=6',
      expectedPreviewMarker: '---summary-copy-preview---',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount=4',
      expectedDetailMarker: '---summary-detail-copy---',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount=2',
      expectedStableLineMarker: '---summary-stable-line-copy---',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount=6',
      expectedStableLinePreviewMarker: '---summary-stable-line-copy-preview---',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount=6',
      expectedDetailPreviewMarker: '---summary-detail-copy-preview---',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount=2',
      expectedDetailPreviewLineCopyMarker: '---summary-detail-copy-preview-line-copy---',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount=6',
      expectedDetailPreviewLineCopyBodyMarker: '---summary-detail-copy-preview-line-copy-body---',
      format: 'text',
    },
    {
      artifactId: 'handoff-manifest-markdown',
      expectedCounter: 'summaryCopyExactMatchCount: 2',
      expectedMarker: 'Summary-Copy Overview',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount: 6',
      expectedPreviewMarker: 'Summary-Copy Preview Overview',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount: 4',
      expectedDetailMarker: 'Summary-Detail-Copy Overview',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount: 2',
      expectedStableLineMarker: 'Summary-Stable-Line-Copy Overview',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount: 6',
      expectedStableLinePreviewMarker: 'Summary-Stable-Line-Copy Preview Overview',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount: 6',
      expectedDetailPreviewMarker: 'Summary-Detail-Copy Preview Overview',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount: 2',
      expectedDetailPreviewLineCopyMarker: 'Summary-Detail-Copy Preview Line Copy Overview',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount: 6',
      expectedDetailPreviewLineCopyBodyMarker: 'Summary-Detail-Copy Preview Line Copy Body Overview',
      format: 'markdown',
    },
    {
      artifactId: 'handoff-index-text',
      expectedCounter: 'summaryCopyExactMatchCount=2',
      expectedMarker: '---summary-copy---',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount=6',
      expectedPreviewMarker: '---summary-copy-preview---',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount=4',
      expectedDetailMarker: '---summary-detail-copy---',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount=2',
      expectedStableLineMarker: '---summary-stable-line-copy---',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount=6',
      expectedStableLinePreviewMarker: '---summary-stable-line-copy-preview---',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount=6',
      expectedDetailPreviewMarker: '---summary-detail-copy-preview---',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount=2',
      expectedDetailPreviewLineCopyMarker: '---summary-detail-copy-preview-line-copy---',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount=6',
      expectedDetailPreviewLineCopyBodyMarker: '---summary-detail-copy-preview-line-copy-body---',
      format: 'text',
    },
    {
      artifactId: 'handoff-index-markdown',
      expectedCounter: 'summaryCopyExactMatchCount: 2',
      expectedMarker: 'Summary-Copy Overview',
      expectedPreviewCounter: 'summaryCopyPreviewExactMatchCount: 6',
      expectedPreviewMarker: 'Summary-Copy Preview Overview',
      expectedDetailCounter: 'summaryDetailCopyExactMatchCount: 4',
      expectedDetailMarker: 'Summary-Detail-Copy Overview',
      expectedStableLineCounter: 'summaryStableLineCopyExactMatchCount: 2',
      expectedStableLineMarker: 'Summary-Stable-Line-Copy Overview',
      expectedStableLinePreviewCounter: 'summaryStableLineCopyPreviewExactMatchCount: 6',
      expectedStableLinePreviewMarker: 'Summary-Stable-Line-Copy Preview Overview',
      expectedStableLinePreviewBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: 2',
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker: 'Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
      expectedDetailPreviewCounter: 'summaryDetailCopyPreviewExactMatchCount: 6',
      expectedDetailPreviewMarker: 'Summary-Detail-Copy Preview Overview',
      expectedDetailPreviewLineCopyCounter: 'summaryDetailCopyPreviewLineCopyExactMatchCount: 2',
      expectedDetailPreviewLineCopyMarker: 'Summary-Detail-Copy Preview Line Copy Overview',
      expectedDetailPreviewLineCopyBodyCounter: 'summaryDetailCopyPreviewLineCopyBodyExactMatchCount: 6',
      expectedDetailPreviewLineCopyBodyMarker: 'Summary-Detail-Copy Preview Line Copy Body Overview',
      format: 'markdown',
    },
  ]) {
    const previewEntry = handoffPreviewState.results.find((item) => item.artifactId === target.artifactId);
    assert.equal(Boolean(previewEntry), true, JSON.stringify({ handoffPreviewState, target }));
    const normalizedBody = String(previewEntry?.previewBody || '').replace(/\s+/g, ' ').trim();
    const summaryEntry = {
      bodySample: String(previewEntry?.previewBodySample || '').trim(),
      expectedCounter: target.expectedCounter,
      expectedMarker: target.expectedMarker,
      expectedPreviewCounter: target.expectedPreviewCounter,
      expectedPreviewMarker: target.expectedPreviewMarker,
      format: target.format,
      hasExpectedCounter: normalizedBody.includes(target.expectedCounter),
      hasExpectedMarker: normalizedBody.includes(target.expectedMarker),
      hasExpectedDetailCounter: normalizedBody.includes(target.expectedDetailCounter),
      hasExpectedDetailMarker: normalizedBody.includes(target.expectedDetailMarker),
      hasExpectedDetailPreviewCounter: normalizedBody.includes(target.expectedDetailPreviewCounter),
      hasExpectedDetailPreviewMarker: normalizedBody.includes(target.expectedDetailPreviewMarker),
      hasExpectedDetailPreviewLineCopyCounter: normalizedBody.includes(target.expectedDetailPreviewLineCopyCounter),
      hasExpectedDetailPreviewLineCopyMarker: normalizedBody.includes(target.expectedDetailPreviewLineCopyMarker),
      hasExpectedPreviewCounter: normalizedBody.includes(target.expectedPreviewCounter),
      hasExpectedPreviewMarker: normalizedBody.includes(target.expectedPreviewMarker),
      title: String(previewEntry?.title || '').trim(),
    };
    summaryEntry.exactMatch =
      summaryEntry.hasExpectedCounter &&
      summaryEntry.hasExpectedMarker &&
      summaryEntry.hasExpectedPreviewCounter &&
      summaryEntry.hasExpectedPreviewMarker;
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ target, summaryEntry, previewEntry }));
    releaseHandoffSummaryCopyPreviewVerificationSummary.byArtifactId[target.artifactId] = summaryEntry;
    releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
    const detailSummaryEntry = {
      bodySample: summaryEntry.bodySample,
      expectedDetailCounter: target.expectedDetailCounter,
      expectedDetailMarker: target.expectedDetailMarker,
      expectedDetailPreviewCounter: target.expectedDetailPreviewCounter,
      expectedDetailPreviewMarker: target.expectedDetailPreviewMarker,
      format: target.format,
      hasExpectedDetailCounter: summaryEntry.hasExpectedDetailCounter,
      hasExpectedDetailMarker: summaryEntry.hasExpectedDetailMarker,
      hasExpectedDetailPreviewCounter: summaryEntry.hasExpectedDetailPreviewCounter,
      hasExpectedDetailPreviewMarker: summaryEntry.hasExpectedDetailPreviewMarker,
      title: summaryEntry.title,
    };
    detailSummaryEntry.exactMatch =
      detailSummaryEntry.hasExpectedDetailCounter &&
      detailSummaryEntry.hasExpectedDetailMarker &&
      detailSummaryEntry.hasExpectedDetailPreviewCounter &&
      detailSummaryEntry.hasExpectedDetailPreviewMarker;
    assert.equal(detailSummaryEntry.exactMatch, true, JSON.stringify({ target, detailSummaryEntry, previewEntry }));
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.byArtifactId[target.artifactId] = detailSummaryEntry;
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount += detailSummaryEntry.exactMatch ? 1 : 0;
    const stableLineSummaryEntry = {
      bodySample: summaryEntry.bodySample,
      expectedStableLineCounter: target.expectedStableLineCounter,
      expectedStableLineMarker: target.expectedStableLineMarker,
      expectedStableLinePreviewCounter: target.expectedStableLinePreviewCounter,
      expectedStableLinePreviewMarker: target.expectedStableLinePreviewMarker,
      format: target.format,
      hasExpectedStableLineCounter: normalizedBody.includes(target.expectedStableLineCounter),
      hasExpectedStableLineMarker: normalizedBody.includes(target.expectedStableLineMarker),
      hasExpectedStableLinePreviewCounter: normalizedBody.includes(target.expectedStableLinePreviewCounter),
      hasExpectedStableLinePreviewMarker: normalizedBody.includes(target.expectedStableLinePreviewMarker),
      title: summaryEntry.title,
    };
    stableLineSummaryEntry.exactMatch =
      stableLineSummaryEntry.hasExpectedStableLineCounter &&
      stableLineSummaryEntry.hasExpectedStableLineMarker &&
      stableLineSummaryEntry.hasExpectedStableLinePreviewCounter &&
      stableLineSummaryEntry.hasExpectedStableLinePreviewMarker;
    assert.equal(stableLineSummaryEntry.exactMatch, true, JSON.stringify({ target, stableLineSummaryEntry, previewEntry }));
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.byArtifactId[target.artifactId] = stableLineSummaryEntry;
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount += stableLineSummaryEntry.exactMatch ? 1 : 0;
    const detailLineCopyBodyEntry = {
      bodySample: summaryEntry.bodySample,
      expectedDetailPreviewLineCopyBodyCounter: target.expectedDetailPreviewLineCopyBodyCounter,
      expectedDetailPreviewLineCopyBodyMarker: target.expectedDetailPreviewLineCopyBodyMarker,
      format: target.format,
      hasExpectedDetailPreviewLineCopyBodyCounter: normalizedBody.includes(target.expectedDetailPreviewLineCopyBodyCounter),
      hasExpectedDetailPreviewLineCopyBodyMarker: normalizedBody.includes(target.expectedDetailPreviewLineCopyBodyMarker),
      title: summaryEntry.title,
    };
    detailLineCopyBodyEntry.exactMatch =
      detailLineCopyBodyEntry.hasExpectedDetailPreviewLineCopyBodyCounter &&
      detailLineCopyBodyEntry.hasExpectedDetailPreviewLineCopyBodyMarker;
    assert.equal(detailLineCopyBodyEntry.exactMatch, true, JSON.stringify({ target, detailLineCopyBodyEntry, previewEntry }));
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.byArtifactId[target.artifactId] = detailLineCopyBodyEntry;
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount += detailLineCopyBodyEntry.exactMatch ? 1 : 0;
    const stableLinePreviewBodyLineCopyBodyEntry = {
      bodySample: summaryEntry.bodySample,
      expectedStableLinePreviewBodyLineCopyCounter: target.expectedStableLinePreviewBodyLineCopyCounter,
      expectedStableLinePreviewBodyLineCopyMarker: target.expectedStableLinePreviewBodyLineCopyMarker,
      format: target.format,
      hasExpectedStableLinePreviewBodyLineCopyCounter: normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyCounter),
      hasExpectedStableLinePreviewBodyLineCopyMarker: normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyMarker),
      title: summaryEntry.title,
    };
    stableLinePreviewBodyLineCopyBodyEntry.exactMatch =
      stableLinePreviewBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyCounter &&
      stableLinePreviewBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyMarker;
    assert.equal(
      stableLinePreviewBodyLineCopyBodyEntry.exactMatch,
      true,
      JSON.stringify({ target, stableLinePreviewBodyLineCopyBodyEntry, previewEntry }),
    );
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.byArtifactId[target.artifactId] =
      stableLinePreviewBodyLineCopyBodyEntry;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount +=
      stableLinePreviewBodyLineCopyBodyEntry.exactMatch ? 1 : 0;
    const stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry = {
      bodySample: summaryEntry.bodySample,
      expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: target.expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter,
      expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: target.expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker,
      format: target.format,
      hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyCounter: normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyBodyLineCopyCounter),
      hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyMarker: normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyBodyLineCopyMarker),
      title: summaryEntry.title,
    };
    stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry.exactMatch =
      stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyCounter &&
      stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyMarker;
    assert.equal(
      stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry.exactMatch,
      true,
      JSON.stringify({ target, stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry, previewEntry }),
    );
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId[target.artifactId] =
      stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount +=
      stableLinePreviewBodyLineCopyBodyLineCopyBodyEntry.exactMatch ? 1 : 0;
    const stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry = {
      bodySample: summaryEntry.bodySample,
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter:
        target.expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter,
      expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker:
        target.expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker,
      format: target.format,
      hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter:
        normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter),
      hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker:
        normalizedBody.includes(target.expectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker),
      title: summaryEntry.title,
    };
    stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry.exactMatch =
      stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter &&
      stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker;
    assert.equal(
      stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry.exactMatch,
      true,
      JSON.stringify({ target, stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry, previewEntry }),
    );
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId[target.artifactId] =
      stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts += 1;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount +=
      stableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryCopyPreviewVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `counter=${summaryEntry.hasExpectedCounter ? 'present' : 'missing'}`,
      `marker=${summaryEntry.hasExpectedMarker ? 'present' : 'missing'}`,
      `previewCounter=${summaryEntry.hasExpectedPreviewCounter ? 'present' : 'missing'}`,
      `previewMarker=${summaryEntry.hasExpectedPreviewMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryCopyPreviewVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryCopyPreviewVerificationSummary),
  );
  releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `detailCounter=${summaryEntry.hasExpectedDetailCounter ? 'present' : 'missing'}`,
      `detailMarker=${summaryEntry.hasExpectedDetailMarker ? 'present' : 'missing'}`,
      `previewCounter=${summaryEntry.hasExpectedDetailPreviewCounter ? 'present' : 'missing'}`,
      `previewMarker=${summaryEntry.hasExpectedDetailPreviewMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryDetailCopyPreviewVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryDetailCopyPreviewVerificationSummary),
  );
  releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `stableLineCounter=${summaryEntry.hasExpectedStableLineCounter ? 'present' : 'missing'}`,
      `stableLineMarker=${summaryEntry.hasExpectedStableLineMarker ? 'present' : 'missing'}`,
      `previewCounter=${summaryEntry.hasExpectedStableLinePreviewCounter ? 'present' : 'missing'}`,
      `previewMarker=${summaryEntry.hasExpectedStableLinePreviewMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewVerificationSummary),
  );
  releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `bodyCounter=${summaryEntry.hasExpectedDetailPreviewLineCopyBodyCounter ? 'present' : 'missing'}`,
      `bodyMarker=${summaryEntry.hasExpectedDetailPreviewLineCopyBodyMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary),
  );
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `bodyCounter=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyCounter ? 'present' : 'missing'}`,
      `bodyMarker=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary),
  );
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `bodyCounter=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyCounter ? 'present' : 'missing'}`,
      `bodyMarker=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `format=${summaryEntry.format}`,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `bodyCounter=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyCounter ? 'present' : 'missing'}`,
      `bodyMarker=${summaryEntry.hasExpectedStableLinePreviewBodyLineCopyBodyLineCopyBodyLineCopyMarker ? 'present' : 'missing'}`,
      `bodySha256=${createHash('sha256').update(summaryEntry.bodySample).digest('hex')}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine = [
    `totalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount}`,
    `artifacts=${Object.keys(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  const handoffStructuredSummaryCopyState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const waitForPreview = async (artifactId) => {
        await page.waitForFunction((currentArtifactId) => {
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          return panel
            && panel.getAttribute('data-release-handoff-preview-panel') === currentArtifactId
            && panel.getAttribute('data-release-handoff-preview-state') === 'ready';
        }, artifactId, { timeout: 15000 });
      };
      const clickPreview = async (artifactId) => {
        await page.evaluate((currentArtifactId) => {
          document.querySelector('[data-release-handoff-preview-trigger="' + CSS.escape(currentArtifactId) + '"]')?.click();
        }, artifactId);
        await waitForPreview(artifactId);
      };
      const setClipboard = async (mode = 'success') => {
        await page.evaluate((currentMode) => {
          const clipboardValue = currentMode === 'failure'
            ? {
                writeText: async () => {
                  throw new Error('clipboard-blocked');
                },
              }
            : {
                writeText: async (value) => {
                  window.__lastClipboardText = String(value || '');
                },
              };
          try {
            Object.defineProperty(window.navigator, 'clipboard', {
              configurable: true,
              value: clipboardValue,
            });
          } catch {
            window.navigator.clipboard = clipboardValue;
          }
        }, mode);
      };
      const readPromptValue = async () => page.evaluate(() => {
        try {
          return JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
        } catch {
          return '';
        }
      });
      const runCardFallback = async (artifactId) => {
        await setClipboard('failure');
        await page.evaluate((currentArtifactId) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        }, artifactId);
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentArtifactId) => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-structured-summary-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '',
        }), artifactId);
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runCardCopy = async (artifactId) => {
        await setClipboard('success');
        await page.evaluate((currentArtifactId) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        }, artifactId);
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentArtifactId) => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-structured-summary-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-structured-summary-overview="' + CSS.escape(currentArtifactId) + '"]')?.textContent?.trim() || '',
        }), artifactId);
        result.promptedValue = await readPromptValue();
        return result;
      };
      const runPreviewFallback = async () => {
        await setClipboard('failure');
        await page.evaluate(() => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.click();
        });
        await page.waitForTimeout(50);
        const result = await page.evaluate(() => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-preview-structured-summary-overview]')?.textContent?.trim() || '',
        }));
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runPreviewCopy = async () => {
        await setClipboard('success');
        await page.evaluate(() => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.click();
        });
        await page.waitForTimeout(50);
        const result = await page.evaluate(() => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-preview-structured-summary-overview]')?.textContent?.trim() || '',
          previewArtifactId: document.querySelector('[data-release-handoff-preview-panel]')?.getAttribute('data-release-handoff-preview-panel') || '',
        }));
        result.promptedValue = await readPromptValue();
        return result;
      };
      const runDetailCardFallback = async (artifactId, detailKey) => {
        await setClipboard('failure');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.click();
        }, { artifactId, detailKey });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.closest('[data-release-handoff-structured-summary-detail]')?.querySelector('.item-meta')?.textContent?.trim() || '',
        }), { artifactId, detailKey });
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runDetailCardCopy = async (artifactId, detailKey) => {
        await setClipboard('success');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.click();
        }, { artifactId, detailKey });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-structured-summary-detail-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey) + '"]')?.closest('[data-release-handoff-structured-summary-detail]')?.querySelector('.item-meta')?.textContent?.trim() || '',
        }), { artifactId, detailKey });
        result.promptedValue = await readPromptValue();
        return result;
      };
      const runDetailPreviewFallback = async (detailKey) => {
        await setClipboard('failure');
        await page.evaluate((currentDetailKey) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.click();
        }, detailKey);
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentDetailKey) => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.closest('[data-release-handoff-preview-structured-summary-detail]')?.querySelector('.item-meta')?.textContent?.trim() || '',
        }), detailKey);
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runDetailPreviewCopy = async (detailKey) => {
        await setClipboard('success');
        await page.evaluate((currentDetailKey) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.click();
        }, detailKey);
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentDetailKey) => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.textContent || '',
          overviewLine: document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="' + CSS.escape(currentDetailKey) + '"]')?.closest('[data-release-handoff-preview-structured-summary-detail]')?.querySelector('.item-meta')?.textContent?.trim() || '',
          previewArtifactId: document.querySelector('[data-release-handoff-preview-panel]')?.getAttribute('data-release-handoff-preview-panel') || '',
        }), detailKey);
        result.promptedValue = await readPromptValue();
        return result;
      };
      const runStableLineCardFallback = async (artifactId, detailKey, lineIndex) => {
        await setClipboard('failure');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.click();
        }, { artifactId, detailKey, lineIndex });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.textContent || '',
          stableLine: document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.closest('.release-handoff-summary-stable-line-row')?.querySelector('.release-handoff-summary-stable-line')?.textContent?.trim() || '',
        }), { artifactId, detailKey, lineIndex });
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runStableLineCardCopy = async (artifactId, detailKey, lineIndex) => {
        await setClipboard('success');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.click();
        }, { artifactId, detailKey, lineIndex });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.textContent || '',
          stableLine: document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.artifactId + ':' + currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.closest('.release-handoff-summary-stable-line-row')?.querySelector('.release-handoff-summary-stable-line')?.textContent?.trim() || '',
        }), { artifactId, detailKey, lineIndex });
        result.promptedValue = await readPromptValue();
        return result;
      };
      const runStableLinePreviewFallback = async (detailKey, lineIndex) => {
        await setClipboard('failure');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.click();
        }, { detailKey, lineIndex });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          clipboardText: window.__lastClipboardText || '',
          copyLabel: document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.textContent || '',
          stableLine: document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.closest('.release-handoff-summary-stable-line-row')?.querySelector('.release-handoff-summary-stable-line')?.textContent?.trim() || '',
        }), { detailKey, lineIndex });
        result.promptedValue = await readPromptValue();
        await setClipboard('success');
        return result;
      };
      const runStableLinePreviewCopy = async (detailKey, lineIndex) => {
        await setClipboard('success');
        await page.evaluate((currentTarget) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.click();
        }, { detailKey, lineIndex });
        await page.waitForTimeout(50);
        const result = await page.evaluate((currentTarget) => ({
          copiedText: window.__lastClipboardText || '',
          copyLabelAfterCopy: document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.textContent || '',
          previewArtifactId: document.querySelector('[data-release-handoff-preview-panel]')?.getAttribute('data-release-handoff-preview-panel') || '',
          stableLine: document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="' + CSS.escape(currentTarget.detailKey + ':' + currentTarget.lineIndex) + '"]')?.closest('.release-handoff-summary-stable-line-row')?.querySelector('.release-handoff-summary-stable-line')?.textContent?.trim() || '',
        }), { detailKey, lineIndex });
        result.promptedValue = await readPromptValue();
        return result;
      };

      await clickPreview('handoff-digest-json');
      const directCardFallback = await runCardFallback('handoff-digest-json');
      const directCardCopy = await runCardCopy('handoff-digest-json');
      const detailCardFallback = await runDetailCardFallback('handoff-digest-json', 'summaryCopyPreview');
      const detailCardCopy = await runDetailCardCopy('handoff-digest-json', 'summaryCopyPreview');
      const detailPreviewCardFallback = await runDetailCardFallback('handoff-digest-json', 'summaryDetailCopyPreview');
      const detailPreviewCardCopy = await runDetailCardCopy('handoff-digest-json', 'summaryDetailCopyPreview');
      const detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback = await runDetailCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy = await runDetailCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const detailPreviewLineCopyCardFallback = await runDetailCardFallback('handoff-digest-json', 'summaryDetailCopyPreviewLineCopy');
      const detailPreviewLineCopyCardCopy = await runDetailCardCopy('handoff-digest-json', 'summaryDetailCopyPreviewLineCopy');
      const stableLineCardFallback = await runStableLineCardFallback('handoff-digest-json', 'summaryDetailCopy', 0);
      const stableLineCardCopy = await runStableLineCardCopy('handoff-digest-json', 'summaryDetailCopy', 0);
      const stableLinePreviewBodyCardFallback = await runStableLineCardFallback('handoff-digest-json', 'summaryStableLineCopyPreviewBody', 0);
      const stableLinePreviewBodyCardCopy = await runStableLineCardCopy('handoff-digest-json', 'summaryStableLineCopyPreviewBody', 0);
      const stableLinePreviewBodyLineCopyBodyCardFallback = await runStableLineCardFallback(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBody',
        0,
      );
      const stableLinePreviewBodyLineCopyBodyCardCopy = await runStableLineCardCopy(
        'handoff-digest-json',
        'summaryStableLineCopyPreviewBodyLineCopyBody',
        0,
      );

      await clickPreview('handoff-index-markdown');
      const currentPreviewFallback = await runPreviewFallback();
      const currentPreviewCopy = await runPreviewCopy();
      const currentPreviewDetailFallback = await runDetailPreviewFallback('summaryCopyPreview');
      const currentPreviewDetailCopy = await runDetailPreviewCopy('summaryCopyPreview');
      const currentPreviewDetailPreviewFallback = await runDetailPreviewFallback('summaryDetailCopyPreview');
      const currentPreviewDetailPreviewCopy = await runDetailPreviewCopy('summaryDetailCopyPreview');
      const currentPreviewStableLineFallback = await runStableLinePreviewFallback('summaryDetailCopy', 3);
      const currentPreviewStableLineCopy = await runStableLinePreviewCopy('summaryDetailCopy', 3);
      const currentPreviewStableLinePreviewBodyFallback = await runStableLinePreviewFallback('summaryStableLineCopyPreviewBody', 2);
      const currentPreviewStableLinePreviewBodyCopy = await runStableLinePreviewCopy('summaryStableLineCopyPreviewBody', 2);
      const currentPreviewStableLinePreviewBodyLineCopyBodyFallback = await runStableLinePreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBody',
        2,
      );
      const currentPreviewStableLinePreviewBodyLineCopyBodyCopy = await runStableLinePreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBody',
        2,
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback = await runDetailPreviewFallback(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy = await runDetailPreviewCopy(
        'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
      );
      const currentPreviewDetailPreviewLineCopyBodyFallback = await runDetailPreviewFallback('summaryDetailCopyPreviewLineCopyBody');
      const currentPreviewDetailPreviewLineCopyBodyCopy = await runDetailPreviewCopy('summaryDetailCopyPreviewLineCopyBody');
      await runPreviewCopy();

      const labelsAfterCurrentPreviewCopy = await page.evaluate(() => ({
        digestJsonCard: document.querySelector('[data-release-handoff-structured-summary-copy="handoff-digest-json"]')?.textContent || '',
        currentPreview: document.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
        digestJsonCardDetail:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryCopyPreview"]')?.textContent || '',
        digestJsonCardDetailPreview:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryDetailCopyPreview"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBody:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        digestJsonCardDetailPreviewLineCopy:
          document.querySelector('[data-release-handoff-structured-summary-detail-copy="handoff-digest-json:summaryDetailCopyPreviewLineCopy"]')?.textContent || '',
        digestJsonCardStableLine:
          document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="handoff-digest-json:summaryDetailCopy:0"]')?.textContent || '',
        digestJsonCardStableLinePreviewBody:
          document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="handoff-digest-json:summaryStableLineCopyPreviewBody:0"]')?.textContent || '',
        digestJsonCardStableLinePreviewBodyLineCopyBody:
          document.querySelector('[data-release-handoff-structured-summary-stable-line-copy="handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBody:0"]')?.textContent || '',
        currentPreviewDetail:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryCopyPreview"]')?.textContent || '',
        currentPreviewDetailPreview:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryDetailCopyPreview"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBody:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy"]')?.textContent || '',
        currentPreviewDetailPreviewLineCopyBody:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-detail-copy="summaryDetailCopyPreviewLineCopyBody"]')?.textContent || '',
        currentPreviewStableLine:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="summaryDetailCopy:3"]')?.textContent || '',
        currentPreviewStableLinePreviewBody:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="summaryStableLineCopyPreviewBody:2"]')?.textContent || '',
        currentPreviewStableLinePreviewBodyLineCopyBody:
          document.querySelector('[data-release-handoff-current-preview-structured-summary-stable-line-copy="summaryStableLineCopyPreviewBodyLineCopyBody:2"]')?.textContent || '',
      }));

      await page.waitForTimeout(1900);
      await clickPreview('index-markdown');

      return {
        activePreviewArtifactId: await page.evaluate(() => document.querySelector('[data-release-handoff-preview-panel]')?.getAttribute('data-release-handoff-preview-panel') || ''),
        currentPreviewDetailCopy,
        currentPreviewDetailPreviewCopy,
        currentPreviewDetailPreviewFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy,
        currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback,
        currentPreviewDetailPreviewLineCopyBodyCopy,
        currentPreviewDetailPreviewLineCopyBodyFallback,
        currentPreviewStableLineCopy,
        currentPreviewStableLineFallback,
        currentPreviewStableLinePreviewBodyCopy,
        currentPreviewStableLinePreviewBodyFallback,
        currentPreviewStableLinePreviewBodyLineCopyBodyCopy,
        currentPreviewStableLinePreviewBodyLineCopyBodyFallback,
        currentPreviewDetailFallback,
        currentPreviewCopy,
        currentPreviewFallback,
        detailCardCopy,
        detailPreviewCardCopy,
        detailPreviewCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy,
        detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback,
        detailPreviewLineCopyCardCopy,
        detailPreviewLineCopyCardFallback,
        stableLineCardCopy,
        stableLineCardFallback,
        stableLinePreviewBodyCardCopy,
        stableLinePreviewBodyCardFallback,
        stableLinePreviewBodyLineCopyBodyCardCopy,
        stableLinePreviewBodyLineCopyBodyCardFallback,
        detailCardFallback,
        directCardCopy,
        directCardFallback,
        href: page.url(),
        labelsAfterCurrentPreviewCopy,
      };
    }`,
  ]);
  assert.equal(
    handoffStructuredSummaryCopyState.directCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.directCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.directCardFallback.copyLabel,
    'overview 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.directCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.directCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.directCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.directCardCopy.copiedText,
    handoffStructuredSummaryCopyState.directCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.directCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.directCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.directCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.directCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.directCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback.copyLabel,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewFallback.copyLabel,
    '현재 요약 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewCopy.copyLabelAfterCopy,
    '현재 요약 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback.copyLabel,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.overviewLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.copyLabelAfterCopy,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLineCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardFallback.copyLabel,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLineCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.stableLineCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardCopy.copiedText,
    handoffStructuredSummaryCopyState.stableLineCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.stableLineCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLineCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLineCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLineCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineFallback.copyLabel,
    '현재 stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.copyLabelAfterCopy,
    '현재 stable line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLineCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback.copyLabel,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback.copyLabel,
    '현재 stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.copyLabelAfterCopy,
    '현재 stable line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback.copyLabel,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback.promptedValue,
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.copiedText,
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback.clipboardText,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback.copyLabel,
    '현재 stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback.promptedValue,
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.previewArtifactId,
    'handoff-index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.copiedText,
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.stableLine,
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.copyLabelAfterCopy,
    '현재 stable line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.promptedValue,
    '',
    JSON.stringify(handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCard,
    'overview 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreview,
    '현재 요약 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetail,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreview,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBody,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewLineCopy,
    'line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLine,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLinePreviewBody,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLinePreviewBodyLineCopyBody,
    'stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetail,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreview,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBody,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
    '현재 line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewLineCopyBody,
    '현재 line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLine,
    '현재 stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLinePreviewBody,
    '현재 stable line 복사',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLinePreviewBodyLineCopyBody,
    '현재 stable line 복사됨',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    handoffStructuredSummaryCopyState.activePreviewArtifactId,
    'index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );
  assert.equal(
    new URL(handoffStructuredSummaryCopyState.href).searchParams.get('rartifact'),
    'index-markdown',
    JSON.stringify(handoffStructuredSummaryCopyState),
  );

  const handoffPreviewLinkState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const runDirectCardFallback = async (artifactId) => await page.evaluate(async (currentArtifactId) => {
        const setClipboard = (clipboardValue) => {
          try {
            Object.defineProperty(window.navigator, 'clipboard', {
              configurable: true,
              value: clipboardValue,
            });
          } catch {
            window.navigator.clipboard = clipboardValue;
          }
        };
        setClipboard({
          writeText: async () => {
            throw new Error('clipboard-blocked');
          },
        });
        window.__lastClipboardText = '';
        window.__lastPrompt = '';
        document.querySelector('[data-release-handoff-preview-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
        let promptedLink = '';
        try {
          promptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
        } catch {
          promptedLink = '';
        }
        const copyLabel = document.querySelector('[data-release-handoff-preview-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '';
        const clipboardText = window.__lastClipboardText || '';
        setClipboard({
          writeText: async (value) => {
            window.__lastClipboardText = String(value || '');
          },
        });
        return {
          clipboardText,
          copyLabel,
          promptedLink,
        };
      }, artifactId);

      const runDirectOpenCardFallback = async (artifactId) => await page.evaluate(async (currentArtifactId) => {
        const setClipboard = (clipboardValue) => {
          try {
            Object.defineProperty(window.navigator, 'clipboard', {
              configurable: true,
              value: clipboardValue,
            });
          } catch {
            window.navigator.clipboard = clipboardValue;
          }
        };
        setClipboard({
          writeText: async () => {
            throw new Error('clipboard-blocked');
          },
        });
        window.__lastClipboardText = '';
        window.__lastPrompt = '';
        document.querySelector('[data-release-handoff-open-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
        let promptedLink = '';
        try {
          promptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
        } catch {
          promptedLink = '';
        }
        const copyLabel = document.querySelector('[data-release-handoff-open-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '';
        const clipboardText = window.__lastClipboardText || '';
        setClipboard({
          writeText: async (value) => {
            window.__lastClipboardText = String(value || '');
          },
        });
        return {
          clipboardText,
          copyLabel,
          promptedLink,
        };
      }, artifactId);

      const currentPreviewFallbackState = await page.evaluate(async () => {
        const setClipboard = (clipboardValue) => {
          try {
            Object.defineProperty(window.navigator, 'clipboard', {
              configurable: true,
              value: clipboardValue,
            });
          } catch {
            window.navigator.clipboard = clipboardValue;
          }
        };
        setClipboard({
          writeText: async () => {
            throw new Error('clipboard-blocked');
          },
        });
        window.__lastClipboardText = '';
        window.__lastPrompt = '';
        document.querySelector('[data-release-handoff-current-preview-link-copy]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
        let promptedLink = '';
        try {
          promptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
        } catch {
          promptedLink = '';
        }
        const copyLabel = document.querySelector('[data-release-handoff-current-preview-link-copy]')?.textContent || '';
        const clipboardText = window.__lastClipboardText || '';
        setClipboard({
          writeText: async (value) => {
            window.__lastClipboardText = String(value || '');
          },
        });
        return {
          clipboardText,
          copyLabel,
          promptedLink,
        };
      });

      const runDirectCardCopy = async (artifactId) => {
        await page.evaluate((currentArtifactId) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-preview-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        }, artifactId);
        await page.waitForTimeout(50);
        return page.evaluate((currentArtifactId) => {
          let promptedLink = '';
          try {
            promptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            promptedLink = '';
          }
          return {
            copiedLink: window.__lastClipboardText || '',
            copyLabelAfterCopy: document.querySelector('[data-release-handoff-preview-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '',
            promptedLink,
          };
        }, artifactId);
      };

      const runDirectOpenCardCopy = async (artifactId) => {
        await page.evaluate((currentArtifactId) => {
          window.__lastClipboardText = '';
          window.__lastPrompt = '';
          document.querySelector('[data-release-handoff-open-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.click();
        }, artifactId);
        await page.waitForTimeout(50);
        return page.evaluate((currentArtifactId) => {
          let promptedLink = '';
          try {
            promptedLink = JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            promptedLink = '';
          }
          return {
            copiedLink: window.__lastClipboardText || '',
            copyLabelAfterCopy: document.querySelector('[data-release-handoff-open-link-copy="' + CSS.escape(currentArtifactId) + '"]')?.textContent || '',
            promptedLink,
          };
        }, artifactId);
      };

      const directCardFallbackStates = {};
      for (const artifactId of [
        'browser-report',
        'handoff-digest-json',
        'handoff-digest-text',
        'handoff-digest-markdown',
        'handoff-manifest-json',
        'handoff-manifest-text',
        'handoff-manifest-markdown',
        'handoff-index-json',
        'handoff-index-text',
        'handoff-index-markdown',
        'manifest-json',
        'manifest-text',
        'manifest-markdown',
        'digest-json',
        'digest-text',
        'digest-markdown',
        'index-json',
        'index-text',
      ]) {
        directCardFallbackStates[artifactId] = await runDirectCardFallback(artifactId);
      }
      const directCardCopyStates = {};
      for (const artifactId of [
        'browser-report',
        'handoff-digest-json',
        'handoff-digest-text',
        'handoff-digest-markdown',
        'handoff-manifest-json',
        'handoff-manifest-text',
        'handoff-manifest-markdown',
        'handoff-index-json',
        'handoff-index-text',
        'handoff-index-markdown',
        'manifest-json',
        'manifest-text',
        'manifest-markdown',
        'digest-json',
        'digest-text',
        'digest-markdown',
        'index-json',
        'index-text',
      ]) {
        directCardCopyStates[artifactId] = await runDirectCardCopy(artifactId);
      }
      const directOpenCardFallbackStates = {
        'browser-screenshot': await runDirectOpenCardFallback('browser-screenshot'),
      };
      const directOpenCardCopyStates = {
        'browser-screenshot': await runDirectOpenCardCopy('browser-screenshot'),
      };

      await page.evaluate(() => {
        window.__lastClipboardText = '';
        window.__lastPrompt = '';
        document.querySelector('[data-release-handoff-current-preview-link-copy]')?.click();
      });
      await page.waitForTimeout(50);

      return {
        activePreviewArtifactId: await page.evaluate(() => document.querySelector('[data-release-handoff-preview-panel]')?.getAttribute('data-release-handoff-preview-panel') || ''),
        currentPreviewFallbackClipboardText: currentPreviewFallbackState.clipboardText,
        currentPreviewFallbackCopyLabel: currentPreviewFallbackState.copyLabel,
        currentPreviewFallbackPromptedLink: currentPreviewFallbackState.promptedLink,
        currentPreviewCopiedLink: await page.evaluate(() => window.__lastClipboardText || ''),
        currentPreviewCopyLabel: await page.evaluate(() => document.querySelector('[data-release-handoff-current-preview-link-copy]')?.textContent || ''),
        currentPreviewPromptedLink: await page.evaluate(() => {
          try {
            return JSON.parse(window.__lastPrompt || '{}')?.defaultValue || '';
          } catch {
            return '';
          }
        }),
        directCardCopyStates,
        directCardFallbackStates,
        directOpenCardCopyStates,
        directOpenCardFallbackStates,
        directCardLabelsAfterCurrentPreviewCopy: await page.evaluate(() => {
          return {
            'browser-report': document.querySelector('[data-release-handoff-preview-link-copy="browser-report"]')?.textContent || '',
            'handoff-digest-json': document.querySelector('[data-release-handoff-preview-link-copy="handoff-digest-json"]')?.textContent || '',
            'handoff-digest-text': document.querySelector('[data-release-handoff-preview-link-copy="handoff-digest-text"]')?.textContent || '',
            'handoff-digest-markdown': document.querySelector('[data-release-handoff-preview-link-copy="handoff-digest-markdown"]')?.textContent || '',
            'handoff-manifest-json': document.querySelector('[data-release-handoff-preview-link-copy="handoff-manifest-json"]')?.textContent || '',
            'handoff-manifest-text': document.querySelector('[data-release-handoff-preview-link-copy="handoff-manifest-text"]')?.textContent || '',
            'handoff-manifest-markdown': document.querySelector('[data-release-handoff-preview-link-copy="handoff-manifest-markdown"]')?.textContent || '',
            'handoff-index-json': document.querySelector('[data-release-handoff-preview-link-copy="handoff-index-json"]')?.textContent || '',
            'handoff-index-text': document.querySelector('[data-release-handoff-preview-link-copy="handoff-index-text"]')?.textContent || '',
            'handoff-index-markdown': document.querySelector('[data-release-handoff-preview-link-copy="handoff-index-markdown"]')?.textContent || '',
            'manifest-json': document.querySelector('[data-release-handoff-preview-link-copy="manifest-json"]')?.textContent || '',
            'manifest-text': document.querySelector('[data-release-handoff-preview-link-copy="manifest-text"]')?.textContent || '',
            'manifest-markdown': document.querySelector('[data-release-handoff-preview-link-copy="manifest-markdown"]')?.textContent || '',
            'digest-json': document.querySelector('[data-release-handoff-preview-link-copy="digest-json"]')?.textContent || '',
            'digest-text': document.querySelector('[data-release-handoff-preview-link-copy="digest-text"]')?.textContent || '',
            'digest-markdown': document.querySelector('[data-release-handoff-preview-link-copy="digest-markdown"]')?.textContent || '',
            'index-json': document.querySelector('[data-release-handoff-preview-link-copy="index-json"]')?.textContent || '',
            'index-text': document.querySelector('[data-release-handoff-preview-link-copy="index-text"]')?.textContent || '',
          };
        }),
        directOpenCardLabelsAfterCurrentPreviewCopy: await page.evaluate(() => {
          return {
            'browser-screenshot': document.querySelector('[data-release-handoff-open-link-copy="browser-screenshot"]')?.textContent || '',
          };
        }),
        href: page.url(),
      };
    }`,
  ]);
  assert.equal(handoffPreviewLinkState.activePreviewArtifactId, 'index-markdown', JSON.stringify(handoffPreviewLinkState));
  assert.equal(handoffPreviewLinkState.currentPreviewCopyLabel, '현재 링크 복사됨', JSON.stringify(handoffPreviewLinkState));
  assert.equal(handoffPreviewLinkState.currentPreviewFallbackClipboardText, '', JSON.stringify(handoffPreviewLinkState));
  assert.equal(handoffPreviewLinkState.currentPreviewFallbackCopyLabel, '현재 링크 복사', JSON.stringify(handoffPreviewLinkState));
  assert.equal(new URL(handoffPreviewLinkState.currentPreviewFallbackPromptedLink).searchParams.get('rartifact'), 'index-markdown', JSON.stringify(handoffPreviewLinkState));
  assert.equal(new URL(handoffPreviewLinkState.currentPreviewFallbackPromptedLink).searchParams.get('tab'), 'release', JSON.stringify(handoffPreviewLinkState));
  assert.equal(handoffPreviewLinkState.currentPreviewPromptedLink, '', JSON.stringify(handoffPreviewLinkState));
  assert.equal(new URL(handoffPreviewLinkState.currentPreviewCopiedLink).searchParams.get('rartifact'), 'index-markdown', JSON.stringify(handoffPreviewLinkState));
  assert.equal(new URL(handoffPreviewLinkState.currentPreviewCopiedLink).searchParams.get('tab'), 'release', JSON.stringify(handoffPreviewLinkState));
  assert.equal(Boolean(handoffPreviewLinkState.directOpenCardCopyStates?.['browser-screenshot']), true, JSON.stringify(handoffPreviewLinkState));
  assert.equal(Boolean(handoffPreviewLinkState.directOpenCardFallbackStates?.['browser-screenshot']), true, JSON.stringify(handoffPreviewLinkState));
  assert.equal(
    handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].copyLabelAfterCopy,
    '복사됨',
    JSON.stringify(handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot']),
  );
  assert.equal(
    handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].clipboardText,
    '',
    JSON.stringify(handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot']),
  );
  assert.equal(
    handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].copyLabel,
    '링크',
    JSON.stringify(handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot']),
  );
  assert.equal(
    handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].promptedLink,
    '',
    JSON.stringify(handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot']),
  );
  assert.equal(
    new URL(handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].copiedLink).pathname,
    '/api/execution-v1/handoff-artifacts/browser-screenshot',
    JSON.stringify(handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot']),
  );
  assert.equal(
    new URL(handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].promptedLink).pathname,
    '/api/execution-v1/handoff-artifacts/browser-screenshot',
    JSON.stringify(handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot']),
  );
  assert.equal(
    handoffPreviewLinkState.directOpenCardLabelsAfterCurrentPreviewCopy?.['browser-screenshot'],
    '링크',
    JSON.stringify(handoffPreviewLinkState),
  );
  for (const artifactId of [
    'browser-report',
    'handoff-digest-json',
    'handoff-digest-text',
    'handoff-digest-markdown',
    'handoff-manifest-json',
    'handoff-manifest-text',
    'handoff-manifest-markdown',
    'handoff-index-json',
    'handoff-index-text',
    'handoff-index-markdown',
    'manifest-json',
    'manifest-text',
    'manifest-markdown',
    'digest-json',
    'digest-text',
    'digest-markdown',
    'index-json',
    'index-text',
  ]) {
    const directCardCopyState = handoffPreviewLinkState.directCardCopyStates?.[artifactId];
    const directCardFallbackState = handoffPreviewLinkState.directCardFallbackStates?.[artifactId];
    assert.equal(Boolean(directCardCopyState), true, JSON.stringify({ artifactId, handoffPreviewLinkState }));
    assert.equal(Boolean(directCardFallbackState), true, JSON.stringify({ artifactId, handoffPreviewLinkState }));
    assert.equal(directCardCopyState.copyLabelAfterCopy, '복사됨', JSON.stringify({ artifactId, directCardCopyState }));
    assert.equal(directCardFallbackState.clipboardText, '', JSON.stringify({ artifactId, directCardFallbackState }));
    assert.equal(directCardFallbackState.copyLabel, '링크', JSON.stringify({ artifactId, directCardFallbackState }));
    assert.equal(directCardCopyState.promptedLink, '', JSON.stringify({ artifactId, directCardCopyState }));
    assert.equal(new URL(directCardCopyState.copiedLink).searchParams.get('rartifact'), artifactId, JSON.stringify({ artifactId, directCardCopyState }));
    assert.equal(new URL(directCardCopyState.copiedLink).searchParams.get('tab'), 'release', JSON.stringify({ artifactId, directCardCopyState }));
    assert.equal(new URL(directCardFallbackState.promptedLink).searchParams.get('rartifact'), artifactId, JSON.stringify({ artifactId, directCardFallbackState }));
    assert.equal(new URL(directCardFallbackState.promptedLink).searchParams.get('tab'), 'release', JSON.stringify({ artifactId, directCardFallbackState }));
    assert.equal(handoffPreviewLinkState.directCardLabelsAfterCurrentPreviewCopy?.[artifactId], '링크', JSON.stringify({ artifactId, handoffPreviewLinkState }));
  }

  runPw(['reload']);
  const reloadedHandoffPreviewState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      await page.waitForFunction(() => {
        const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
        return panel
          && panel.getAttribute('data-release-handoff-preview-panel') === 'index-markdown'
          && panel.getAttribute('data-release-handoff-preview-state') === 'ready';
      }, { timeout: 15000 });
      return {
        href: page.url(),
        preview: await page.evaluate(() => {
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          if (!panel) {
            return null;
          }
          return {
            artifactId: panel.getAttribute('data-release-handoff-preview-panel') || '',
            body: panel.querySelector('[data-release-handoff-preview-body]')?.textContent || '',
            format: panel.querySelector('[data-release-handoff-preview-format]')?.textContent || '',
            state: panel.getAttribute('data-release-handoff-preview-state') || '',
            title: panel.querySelector('.item-title')?.textContent || '',
          };
        }),
      };
    }`,
  ]);
  assert.equal(new URL(reloadedHandoffPreviewState.href).searchParams.get('rartifact'), 'index-markdown', JSON.stringify(reloadedHandoffPreviewState));
  assert.equal(Boolean(reloadedHandoffPreviewState.preview), true, JSON.stringify(reloadedHandoffPreviewState));
  assert.equal(reloadedHandoffPreviewState.preview.artifactId, 'index-markdown', JSON.stringify(reloadedHandoffPreviewState.preview));
  assert.equal(reloadedHandoffPreviewState.preview.format, 'markdown', JSON.stringify(reloadedHandoffPreviewState.preview));
  assert.equal(reloadedHandoffPreviewState.preview.state, 'ready', JSON.stringify(reloadedHandoffPreviewState.preview));
  assert.equal(String(reloadedHandoffPreviewState.preview.body || '').trim().length > 0, true, JSON.stringify(reloadedHandoffPreviewState.preview));

  console.error('[smoke-ui-execution-browser-e2e] verify release handoff preview deep-link session');
  const verifyFreshReleaseHandoffSession = ({
    expectedArtifactId,
    expectedFormat,
    expectedTitle,
    previewUrl,
    sessionLabel,
  }) => {
    console.error(`[smoke-ui-execution-browser-e2e] release handoff preview session ${expectedArtifactId} ${sessionLabel} start`);
    const releaseHandoffSessionId = `r${sessionLabel.slice(0, 1)}${Date.now().toString(36).slice(-5)}`;
    handoffSessionIds.push(releaseHandoffSessionId);
    runPw(['open', baseUrl], { session: releaseHandoffSessionId });
    installBrowserGuards({ session: releaseHandoffSessionId });
    const handoffState = runPwJson([
      '--raw',
      'run-code',
      `async (page) => {
        await page.goto(${JSON.stringify(previewUrl)}, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(({ artifactId }) => {
          const params = new URL(window.location.href).searchParams;
          const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
          return (
            params.get('tab') === 'release' &&
            params.get('rartifact') === artifactId &&
            panel &&
            panel.getAttribute('data-release-handoff-preview-panel') === artifactId &&
            panel.getAttribute('data-release-handoff-preview-state') === 'ready'
          );
        }, { artifactId: ${JSON.stringify(expectedArtifactId)} }, { timeout: 15000 });
        return {
          activeCard: await page.evaluate((artifactId) => {
            return document.querySelector('[data-release-handoff-id="' + CSS.escape(artifactId) + '"]')?.classList.contains('is-preview-active') || false;
          }, ${JSON.stringify(expectedArtifactId)}),
          consoleErrors: page.__codexConsoleErrors || [],
          href: page.url(),
          pageErrors: page.__codexPageErrors || [],
          preview: await page.evaluate(() => {
            const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
            if (!panel) {
              return null;
            }
            return {
              artifactId: panel.getAttribute('data-release-handoff-preview-panel') || '',
              body: panel.querySelector('[data-release-handoff-preview-body]')?.textContent || '',
              copyLinkLabel: panel.querySelector('[data-release-handoff-current-preview-link-copy]')?.textContent || '',
              format: panel.querySelector('[data-release-handoff-preview-format]')?.textContent || '',
              state: panel.getAttribute('data-release-handoff-preview-state') || '',
              title: panel.querySelector('.item-title')?.textContent || '',
            };
          }),
        };
      }`,
    ], { session: releaseHandoffSessionId });
    assert.equal(new URL(handoffState.href).searchParams.get('tab'), 'release', JSON.stringify(handoffState));
    assert.equal(new URL(handoffState.href).searchParams.get('rartifact'), expectedArtifactId, JSON.stringify(handoffState));
    assert.equal(handoffState.href, previewUrl, JSON.stringify(handoffState));
    assert.equal(handoffState.activeCard, true, JSON.stringify(handoffState));
    assert.deepEqual(handoffState.consoleErrors, [], JSON.stringify(handoffState));
    assert.deepEqual(handoffState.pageErrors, [], JSON.stringify(handoffState));
    assert.equal(Boolean(handoffState.preview), true, JSON.stringify(handoffState));
    assert.equal(handoffState.preview.artifactId, expectedArtifactId, JSON.stringify(handoffState));
    assert.equal(handoffState.preview.format, expectedFormat, JSON.stringify(handoffState));
    assert.equal(handoffState.preview.state, 'ready', JSON.stringify(handoffState));
    assert.equal(handoffState.preview.title, expectedTitle, JSON.stringify(handoffState));
    assert.equal(String(handoffState.preview.body || '').trim().length > 0, true, JSON.stringify(handoffState));

    const handoffSummary = {
      artifactId: expectedArtifactId,
      consoleErrors: handoffState.consoleErrors.length,
      pageErrors: handoffState.pageErrors.length,
      previewFormat: expectedFormat,
      previewTitle: expectedTitle,
      sessionLabel,
    };
    releaseHandoffSessionResults.push(handoffSummary);
    console.error(`[smoke-ui-execution-browser-e2e] release handoff preview session ${expectedArtifactId} ${sessionLabel} done`);
    return handoffSummary;
  };

  const verifyFreshReleaseHandoffOpenSession = ({
    expectedArtifactId,
    expectedContentType,
    expectedTitle,
    openUrl,
    sessionLabel,
  }) => {
    console.error(`[smoke-ui-execution-browser-e2e] release handoff open session ${expectedArtifactId} ${sessionLabel} start`);
    const releaseHandoffSessionId = `o${sessionLabel.slice(0, 1)}${Date.now().toString(36).slice(-5)}`;
    handoffSessionIds.push(releaseHandoffSessionId);
    runPw(['open', baseUrl], { session: releaseHandoffSessionId });
    installBrowserGuards({ session: releaseHandoffSessionId });
    const handoffState = runPwJson([
      '--raw',
      'run-code',
      `async (page) => {
        const response = await page.goto(${JSON.stringify(openUrl)}, { waitUntil: 'commit' });
        await page.waitForTimeout(250);
        return {
          consoleErrors: page.__codexConsoleErrors || [],
          contentType: response?.headers()?.['content-type'] || '',
          href: page.url(),
          pageErrors: page.__codexPageErrors || [],
          status: response?.status() || 0,
        };
      }`,
    ], { session: releaseHandoffSessionId });
    const relevantConsoleErrors = expectedContentType.startsWith('image/')
      ? handoffState.consoleErrors.filter((entry) => !String(entry || '').includes('status of 404'))
      : handoffState.consoleErrors;
    assert.equal(handoffState.href, openUrl, JSON.stringify(handoffState));
    assert.equal(handoffState.status, 200, JSON.stringify(handoffState));
    assert.equal(
      String(handoffState.contentType || '').includes(expectedContentType),
      true,
      JSON.stringify(handoffState),
    );
    assert.deepEqual(relevantConsoleErrors, [], JSON.stringify({ handoffState, relevantConsoleErrors }));
    assert.deepEqual(handoffState.pageErrors, [], JSON.stringify(handoffState));

    const handoffSummary = {
      artifactId: expectedArtifactId,
      contentType: expectedContentType,
      consoleErrors: relevantConsoleErrors.length,
      openTitle: expectedTitle,
      pageErrors: handoffState.pageErrors.length,
      sessionLabel,
      status: handoffState.status,
    };
    releaseHandoffOpenSessionResults.push(handoffSummary);
    console.error(`[smoke-ui-execution-browser-e2e] release handoff open session ${expectedArtifactId} ${sessionLabel} done`);
    return handoffSummary;
  };

  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'browser-report',
    expectedFormat: 'json',
    expectedTitle: 'browser-e2e.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['browser-report'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'browser-report',
    expectedFormat: 'json',
    expectedTitle: 'browser-e2e.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['browser-report'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-digest.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-digest-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-digest.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-digest.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-digest-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-digest.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-digest.md',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-digest-markdown'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-digest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-digest.md',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-markdown'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-manifest.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-manifest.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-manifest.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-manifest.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-manifest.md',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-markdown'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-manifest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-manifest.md',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-markdown'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-index.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-index-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-json',
    expectedFormat: 'json',
    expectedTitle: 'handoff-index.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-index-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-index.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-index-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-text',
    expectedFormat: 'text',
    expectedTitle: 'handoff-index.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-index-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-index.md',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['handoff-index-markdown'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'handoff-index-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'handoff-index.md',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['handoff-index-markdown'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-json',
    expectedFormat: 'json',
    expectedTitle: 'manifest.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['manifest-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-json',
    expectedFormat: 'json',
    expectedTitle: 'manifest.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['manifest-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-text',
    expectedFormat: 'text',
    expectedTitle: 'manifest.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['manifest-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-text',
    expectedFormat: 'text',
    expectedTitle: 'manifest.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['manifest-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'manifest.md',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['manifest-markdown'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'manifest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'manifest.md',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['manifest-markdown'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-json',
    expectedFormat: 'json',
    expectedTitle: 'digest.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['digest-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-json',
    expectedFormat: 'json',
    expectedTitle: 'digest.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['digest-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-text',
    expectedFormat: 'text',
    expectedTitle: 'digest.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['digest-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-text',
    expectedFormat: 'text',
    expectedTitle: 'digest.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['digest-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'digest.md',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['digest-markdown'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'digest-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'digest.md',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['digest-markdown'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-json',
    expectedFormat: 'json',
    expectedTitle: 'index.json',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['index-json'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-json',
    expectedFormat: 'json',
    expectedTitle: 'index.json',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['index-json'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-text',
    expectedFormat: 'text',
    expectedTitle: 'index.txt',
    previewUrl: handoffPreviewLinkState.directCardCopyStates['index-text'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-text',
    expectedFormat: 'text',
    expectedTitle: 'index.txt',
    previewUrl: handoffPreviewLinkState.directCardFallbackStates['index-text'].promptedLink,
    sessionLabel: 'card-fallback',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'index.md',
    previewUrl: handoffPreviewLinkState.currentPreviewCopiedLink,
    sessionLabel: 'current-preview-copy',
  });
  verifyFreshReleaseHandoffSession({
    expectedArtifactId: 'index-markdown',
    expectedFormat: 'markdown',
    expectedTitle: 'index.md',
    previewUrl: handoffPreviewLinkState.currentPreviewFallbackPromptedLink,
    sessionLabel: 'current-preview-fallback',
  });
  verifyFreshReleaseHandoffOpenSession({
    expectedArtifactId: 'browser-screenshot',
    expectedContentType: 'image/png',
    expectedTitle: 'browser-e2e.png',
    openUrl: handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].copiedLink,
    sessionLabel: 'card-copy',
  });
  verifyFreshReleaseHandoffOpenSession({
    expectedArtifactId: 'browser-screenshot',
    expectedContentType: 'image/png',
    expectedTitle: 'browser-e2e.png',
    openUrl: handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].promptedLink,
    sessionLabel: 'card-fallback',
  });

  const screenshotCaptureState = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const captureState = await page.evaluate(() => ({
        captureContext: {
          devicePixelRatio: window.devicePixelRatio || 1,
          pageScrollHeight: document.documentElement.scrollHeight,
          pageScrollWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        },
        captureSurfaceSummary: (() => {
          const compactInline = (value) => String(value || '').replace(/\\s+/g, '');
          const encodeText = (value) => {
            const bytes = new TextEncoder().encode(String(value || ''));
            let binary = '';
            for (const byte of bytes) {
              binary += String.fromCharCode(byte);
            }
            return btoa(binary);
          };
          const normalizeText = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
          return {
            checklistItems: Array.from(document.querySelectorAll('#release-status .release-checklist-item')).map((node) => ({
              label: node.querySelector('strong')?.textContent || '',
              status: node.querySelector('.status-badge')?.textContent || '',
            })),
            currentStatusRows: Array.from(document.querySelectorAll('#release-status .release-current-status .harness-row')).map((node) => ({
              label: node.querySelector('.item-title')?.textContent || '',
              value: node.querySelector('.mini-badge')?.textContent || node.querySelector('.item-meta')?.textContent || '',
            })),
            handoffArtifactCount: document.querySelectorAll('#release-status .release-handoff-card').length,
            readyHandoffArtifactCount: Array.from(document.querySelectorAll('#release-status .release-handoff-card'))
              .filter((node) => (node.querySelector('.mini-badge')?.textContent || '') === 'ready')
              .length,
            handoffArtifacts: Array.from(document.querySelectorAll('#release-status .release-handoff-card')).map((node) => ({
              badges: Array.from(node.querySelectorAll('.mini-badge')).map((badge) => badge.textContent || ''),
              id: node.getAttribute('data-release-handoff-id') || '',
              label: node.querySelector('.item-title')?.textContent || '',
              linkHref: node.querySelector('[data-release-handoff-open]')?.getAttribute('href') || '',
              meta: Array.from(node.querySelectorAll('.release-handoff-meta .item-meta')).map((item) => item.textContent || ''),
              openLinkCopyLabel: node.querySelector('[data-release-handoff-open-link-copy]')?.textContent || '',
              path: node.querySelector('.release-handoff-path')?.textContent || '',
              previewLinkLabel: node.querySelector('[data-release-handoff-preview-link-copy]')?.textContent || '',
              previewButtonLabel: node.querySelector('[data-release-handoff-preview-trigger]')?.textContent || '',
              structuredSummaryCopyLabel: node.querySelector('[data-release-handoff-structured-summary-copy]')?.textContent || '',
              structuredSummaryRows: Array.from(node.querySelectorAll('.release-handoff-summary .harness-row')).map((row) => ({
                label: row.querySelector('.item-title')?.textContent || '',
                value: row.querySelector('.item-meta')?.textContent || '',
              })),
              structuredSummaryDetails: Array.from(node.querySelectorAll('[data-release-handoff-structured-summary-detail]')).map((row) => ({
                copyLabel: row.querySelector('button')?.textContent || '',
                detailKey: row.querySelector('button')?.getAttribute('data-ui-detail-key') || '',
                label: row.querySelector('.item-title')?.textContent || '',
                overview: row.querySelector('.item-meta')?.textContent || '',
                stableLineItems: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line-row')).map((item, lineIndex) => ({
                  copyLabel: item.querySelector('button')?.textContent || '',
                  lineIndex,
                  text: item.querySelector('.release-handoff-summary-stable-line')?.textContent || '',
                })),
                stableLines: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line')).map((item) => item.textContent || ''),
              })),
              structuredSummaryOverview: node.querySelector('.release-handoff-summary-overview')?.textContent || '',
              structuredSummarySha: node.querySelector('.release-handoff-summary-sha')?.textContent || '',
            })),
            handoffPreview: (() => {
              const panel = document.querySelector('#release-status [data-release-handoff-preview-panel]');
              if (!panel) {
                return null;
              }
              return {
                artifactId: panel.getAttribute('data-release-handoff-preview-panel') || '',
                bodySample: normalizeText(panel.querySelector('[data-release-handoff-preview-body]')?.textContent || '').slice(0, 240),
                copyLinkLabel: panel.querySelector('[data-release-handoff-current-preview-link-copy]')?.textContent || '',
                format: panel.querySelector('[data-release-handoff-preview-format]')?.textContent || '',
                note: panel.querySelector('[data-release-handoff-preview-note]')?.textContent || '',
                state: panel.getAttribute('data-release-handoff-preview-state') || '',
                structuredSummaryCopyLabel:
                  panel.querySelector('[data-release-handoff-current-preview-structured-summary-copy]')?.textContent || '',
                structuredSummaryRows: Array.from(panel.querySelectorAll('.release-handoff-summary .harness-row')).map((row) => ({
                  label: row.querySelector('.item-title')?.textContent || '',
                  value: row.querySelector('.item-meta')?.textContent || '',
                })),
                structuredSummaryDetails: Array.from(panel.querySelectorAll('[data-release-handoff-preview-structured-summary-detail]')).map((row) => ({
                  copyLabel: row.querySelector('button')?.textContent || '',
                  detailKey: row.querySelector('button')?.getAttribute('data-ui-detail-key') || '',
                  label: row.querySelector('.item-title')?.textContent || '',
                  overview: row.querySelector('.item-meta')?.textContent || '',
                  stableLineItems: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line-row')).map((item, lineIndex) => ({
                    copyLabel: item.querySelector('button')?.textContent || '',
                    lineIndex,
                    text: item.querySelector('.release-handoff-summary-stable-line')?.textContent || '',
                  })),
                  stableLines: Array.from(row.querySelectorAll('.release-handoff-summary-stable-line')).map((item) => item.textContent || ''),
                })),
                structuredSummaryOverview: panel.querySelector('[data-release-handoff-preview-structured-summary-overview]')?.textContent || '',
                structuredSummarySha: panel.querySelector('[data-release-handoff-preview-structured-summary-sha]')?.textContent || '',
                title: panel.querySelector('.item-title')?.textContent || '',
              };
            })(),
            docSurfaceCount: document.querySelectorAll('#release-status .release-doc-surface').length,
            docSurfaces: Array.from(document.querySelectorAll('#release-status .release-doc-surface')).map((node, index) => {
              const bodyChildren = Array.from(node.children).filter((child) => !child.classList.contains('release-doc-head'));
              const headings = Array.from(node.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map((child) => normalizeText(child.textContent || ''))
                .filter(Boolean)
                .slice(0, 3);
              const rawDocKind = compactInline(node.getAttribute('data-release-doc-kind') || '');
              const fallbackDocKind = index === 0 ? 'closeout' : index === 1 ? 'evidence' : '';
              const docKind = ['closeout', 'evidence'].includes(rawDocKind) ? rawDocKind : fallbackDocKind;
              const previewItems = bodyChildren
                .flatMap((child) => {
                  if (child.matches('ul, ol')) {
                    return Array.from(child.querySelectorAll(':scope > li')).map((item) => item.textContent || '');
                  }
                  return [child.textContent || ''];
                })
                .map((value) => normalizeText(value))
                .filter(Boolean)
                .slice(0, 3);
              return {
                docKindEncoded: encodeText(docKind),
                fallbackDocKind,
                headHtmlEncoded: encodeText(node.querySelector('.release-doc-head')?.outerHTML || ''),
                headingsEncoded: headings.map((heading) => encodeText(heading)),
                labelEncoded: encodeText(compactInline(node.querySelector('.release-doc-head strong')?.textContent || '')),
                pathEncoded: encodeText(compactInline(node.querySelector('.release-doc-head .item-meta')?.textContent || '')),
                previewItemsEncoded: previewItems.map((item) => encodeText(item)),
                rawDocKindEncoded: encodeText(rawDocKind),
              };
            }),
            literalTransportSanity: {
              closeoutEncoded: encodeText('closeout'),
              docsPathEncoded: encodeText('/tmp/personal-ai-agent-browser-e2e/docs/execution-v1-closeout.md'),
              evidenceEncoded: encodeText('evidence'),
            },
            docStatusRows: Array.from(document.querySelectorAll('#release-status .release-doc-status-list .harness-row')).map((node) => ({
              label: node.querySelector('.item-title')?.textContent || '',
              value: node.querySelector('.mini-badge')?.textContent || node.querySelector('.item-meta')?.textContent || '',
            })),
            historyEmptyState: {
              detail: document.querySelector('#release-status .release-history-list .release-snapshot-card.is-empty .item-meta')?.textContent || '',
              title: document.querySelector('#release-status .release-history-list .release-snapshot-card.is-empty .item-title')?.textContent || '',
            },
            historyRowCount: document.querySelectorAll('#release-status .release-history-list .release-snapshot-card:not(.is-empty)').length,
            historyRows: Array.from(document.querySelectorAll('#release-status .release-history-list .release-snapshot-card:not(.is-empty)')).map((node) => ({
              action: node.querySelector('.item-title')?.textContent || '',
              outcome: node.querySelector('.release-history-actions .mini-badge')?.textContent || '',
              scopeMeta: node.querySelector('.release-provider-meta .item-meta')?.textContent || '',
              summary: node.querySelector(':scope > .item-meta')?.textContent || '',
            })),
            providerCardCount: document.querySelectorAll('#release-status .release-provider-card').length,
            providerCards: Array.from(document.querySelectorAll('#release-status .release-provider-card')).map((node) => ({
              envKey: node.querySelector('.item-meta.mono')?.textContent || '',
              label: node.querySelector('.item-title')?.textContent || '',
              statusBadges: Array.from(node.querySelectorAll('.release-provider-meta .mini-badge')).map((badge) => badge.textContent || ''),
            })),
            recommendationCardCount: document.querySelectorAll('#release-status .release-recommendation-card').length,
            recommendationCards: Array.from(document.querySelectorAll('#release-status .release-recommendation-card')).map((node) => ({
              badges: Array.from(node.querySelectorAll('.release-provider-meta .mini-badge')).map((badge) => badge.textContent || ''),
              label: node.querySelector('.item-title')?.textContent || '',
              meta: Array.from(node.querySelectorAll('.item-meta')).slice(0, 2).map((item) => item.textContent || ''),
            })),
            releaseHeadline: document.querySelector('#release-status .release-callout h4')?.textContent || '',
            releaseCopy: document.querySelector('#release-status .release-callout p:not(.section-kicker)')?.textContent || '',
            summaryChips: Array.from(document.querySelectorAll('#release-status .summary-chip')).map((node) => ({
              label: node.querySelector('span')?.textContent || '',
              value: node.querySelector('strong')?.textContent || '',
            })),
            summaryChipLabels: Array.from(document.querySelectorAll('#release-status .summary-chip span')).map((node) => node.textContent || ''),
            surfaceHeadings: Array.from(document.querySelectorAll('#release-status .surface h4')).map((node) => node.textContent || ''),
          };
        })(),
        captureTarget: {
          activeDetailTab: document.querySelector('.detail-tab.is-active')?.getAttribute('data-detail-tab') || '',
          activeStep: new URL(window.location.href).searchParams.get('step') || '',
          activeTab: new URL(window.location.href).searchParams.get('tab') || '',
          artifactId: new URL(window.location.href).searchParams.get('artifact') || '',
          href: window.location.href,
          missionId: new URL(window.location.href).searchParams.get('mission') || '',
          pageTitle: document.title,
          releaseHeading: document.querySelector('#detail-release h4')?.textContent || '',
          sessionId: new URL(window.location.href).searchParams.get('session') || '',
          workspaceId: new URL(window.location.href).searchParams.get('workspace') || '',
        },
      }));
      await page.screenshot({
        fullPage: true,
        path: ${JSON.stringify(screenshotPath)},
      });
      return captureState;
    }`,
  ]);
  const {
    captureContext: screenshotCaptureContext,
    captureSurfaceSummary: rawScreenshotSurfaceSummary,
    captureTarget: screenshotCaptureTarget,
  } = screenshotCaptureState;
  const screenshotSurfaceSummary = {
    ...rawScreenshotSurfaceSummary,
    docSurfaces: (rawScreenshotSurfaceSummary.docSurfaces || []).map((docSurface) => ({
      docKind: decodeBase64Text(docSurface.docKindEncoded),
      fallbackDocKind: docSurface.fallbackDocKind || '',
      headHtml: decodeBase64Text(docSurface.headHtmlEncoded),
      headings: Array.isArray(docSurface.headingsEncoded)
        ? docSurface.headingsEncoded.map((heading) => decodeBase64Text(heading))
        : [],
      label: decodeBase64Text(docSurface.labelEncoded),
      path: decodeBase64Text(docSurface.pathEncoded),
      previewItems: Array.isArray(docSurface.previewItemsEncoded)
        ? docSurface.previewItemsEncoded.map((item) => decodeBase64Text(item))
        : [],
      rawDocKind: decodeBase64Text(docSurface.rawDocKindEncoded),
    })),
    literalTransportSanity: {
      closeout: decodeBase64Text(rawScreenshotSurfaceSummary.literalTransportSanity?.closeoutEncoded),
      docsPath: decodeBase64Text(rawScreenshotSurfaceSummary.literalTransportSanity?.docsPathEncoded),
      evidence: decodeBase64Text(rawScreenshotSurfaceSummary.literalTransportSanity?.evidenceEncoded),
    },
  };
  screenshotSurfaceSummary.docSurfaceKindMismatches = screenshotSurfaceSummary.docSurfaces
    .filter((docSurface) => docSurface.rawDocKind && docSurface.rawDocKind !== docSurface.docKind)
    .map((docSurface) => ({
      canonicalDocKind: docSurface.docKind,
      rawDocKind: docSurface.rawDocKind,
    }));
  assert.deepEqual(
    screenshotSurfaceSummary.literalTransportSanity,
    {
      closeout: 'closeout',
      docsPath: '/tmp/personal-ai-agent-browser-e2e/docs/execution-v1-closeout.md',
      evidence: 'evidence',
    },
    JSON.stringify(screenshotSurfaceSummary.literalTransportSanity),
  );
  const screenshotCaptured = fs.existsSync(screenshotPath);
  assert.equal(screenshotCaptured, true, `expected screenshot at ${screenshotPath}`);
  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const screenshotDimensions = parsePngDimensions(screenshotBuffer);
  const screenshotSha256 = createHash('sha256').update(screenshotBuffer).digest('hex');
  const screenshotStat = fs.statSync(screenshotPath);
  const expectedRenderedWidth = Math.round(screenshotCaptureContext.viewportWidth * screenshotCaptureContext.devicePixelRatio);
  const minimumRenderedHeight = Math.round(screenshotCaptureContext.viewportHeight * screenshotCaptureContext.devicePixelRatio);
  const expectedFullPageDimensions = {
    height: Math.round(screenshotCaptureContext.pageScrollHeight * screenshotCaptureContext.devicePixelRatio),
    width: Math.round(screenshotCaptureContext.pageScrollWidth * screenshotCaptureContext.devicePixelRatio),
  };
  assert.equal(
    screenshotDimensions.width,
    expectedRenderedWidth,
    JSON.stringify({ screenshotCaptureContext, screenshotDimensions }),
  );
  assert.equal(
    screenshotDimensions.height >= minimumRenderedHeight,
    true,
    JSON.stringify({ screenshotCaptureContext, screenshotDimensions }),
  );
  assert.deepEqual(
    screenshotDimensions,
    expectedFullPageDimensions,
    JSON.stringify({ expectedFullPageDimensions, screenshotCaptureContext, screenshotDimensions }),
  );
  assert.equal(screenshotCaptureTarget.activeStep, 'step-output', JSON.stringify(screenshotCaptureTarget));
  assert.equal(screenshotCaptureTarget.activeTab, 'release', JSON.stringify(screenshotCaptureTarget));
  assert.equal(screenshotCaptureTarget.activeDetailTab, 'release', JSON.stringify(screenshotCaptureTarget));
  assert.equal(screenshotCaptureTarget.href, reloadedHandoffPreviewState.href, JSON.stringify(screenshotCaptureTarget));
  assert.equal(screenshotCaptureTarget.workspaceId, workspace.id, JSON.stringify(screenshotCaptureTarget));
  assert.equal(screenshotCaptureTarget.missionId, missionId, JSON.stringify(screenshotCaptureTarget));
  assert.match(screenshotCaptureTarget.releaseHeading, /검증, evidence, closeout/);
  assert.equal(screenshotSurfaceSummary.summaryChipLabels.length >= 6, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.summaryChips.length >= 6, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.recommendationCardCount >= 1, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.providerCardCount >= 1, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.handoffArtifactCount >= 3, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(
    screenshotSurfaceSummary.readyHandoffArtifactCount,
    screenshotSurfaceSummary.handoffArtifactCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(
    screenshotSurfaceSummary.recommendationCards.length,
    screenshotSurfaceSummary.recommendationCardCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(
    screenshotSurfaceSummary.providerCards.length,
    screenshotSurfaceSummary.providerCardCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(
    screenshotSurfaceSummary.handoffArtifacts.length,
    screenshotSurfaceSummary.handoffArtifactCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(
    screenshotSurfaceSummary.historyRows.length,
    screenshotSurfaceSummary.historyRowCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(screenshotSurfaceSummary.docSurfaceCount, 2, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(
    screenshotSurfaceSummary.docSurfaces.length,
    screenshotSurfaceSummary.docSurfaceCount,
    JSON.stringify(screenshotSurfaceSummary),
  );
  for (const docKind of ['closeout', 'evidence']) {
    assert.equal(
      screenshotSurfaceSummary.docSurfaces.some((docSurface) => docSurface.docKind === docKind),
      true,
      JSON.stringify({ docKind, screenshotSurfaceSummary }),
    );
  }
  assert.deepEqual(
    screenshotSurfaceSummary.docSurfaceKindMismatches,
    [],
    JSON.stringify(screenshotSurfaceSummary.docSurfaceKindMismatches),
  );
  const expectedDocSurfaceSuffixByKind = {
    closeout: 'docs/execution-v1-closeout.md',
    evidence: 'docs/execution-v1-evidence.md',
  };
  const expectedReleaseDocKinds = Object.keys(expectedDocSurfaceSuffixByKind);
  const toStableDocPathSuffix = (value) => {
    const normalized = String(value || '').replaceAll('\\', '/');
    const docsMarker = '/docs/';
    const docsIndex = normalized.lastIndexOf(docsMarker);
    if (docsIndex >= 0) {
      return normalized.slice(docsIndex + 1);
    }
    return normalized;
  };
  const extractHeadValue = (value, pattern) => {
    const match = String(value || '').match(pattern);
    return match ? String(match[1] || '').trim() : '';
  };
  const releaseDocVerificationSummary = {
    byDocKind: Object.fromEntries(
      expectedReleaseDocKinds.map((docKind) => {
        const docSurface = screenshotSurfaceSummary.docSurfaces.find((item) => item.docKind === docKind) || null;
        const actualPathSuffix = toStableDocPathSuffix(docSurface?.path || '');
        const actualHeadLabel = extractHeadValue(docSurface?.headHtml, /<strong>([\s\S]*?)<\/strong>/);
        const actualHeadPathSuffix = toStableDocPathSuffix(
          extractHeadValue(docSurface?.headHtml, /<span class="item-meta mono">([\s\S]*?)<\/span>/),
        );
        const summary = {
          actualHeadLabel,
          actualHeadPathSuffix,
          actualLabel: docSurface?.label || '',
          actualPath: docSurface?.path || '',
          actualPathSuffix,
          actualRawDocKind: docSurface?.rawDocKind || '',
          exactMatch: false,
          expectedKind: docKind,
          expectedPathSuffix: expectedDocSurfaceSuffixByKind[docKind],
          failureReasons: [],
          headHasExpectedPathSuffix: false,
          headHasKindMarker: false,
          headLabelMatchesKind: false,
          headPathMatchesExpectedSuffix: false,
          headingCount: 0,
          labelMatchesKind: false,
          pathMatchesExpectedSuffix: false,
          present: Boolean(docSurface),
          previewItemCount: 0,
          rawMatchesKind: false,
        };
        if (docSurface) {
          summary.headHasExpectedPathSuffix = docSurface.headHtml.includes(expectedDocSurfaceSuffixByKind[docKind]);
          summary.headHasKindMarker = docSurface.headHtml.includes(`<strong>${docKind}</strong>`);
          summary.headLabelMatchesKind = actualHeadLabel === docKind;
          summary.headPathMatchesExpectedSuffix = actualHeadPathSuffix === expectedDocSurfaceSuffixByKind[docKind];
          summary.headingCount = docSurface.headings.length;
          summary.labelMatchesKind = docSurface.label === docKind;
          summary.pathMatchesExpectedSuffix = actualPathSuffix === expectedDocSurfaceSuffixByKind[docKind];
          summary.previewItemCount = docSurface.previewItems.length;
          summary.rawMatchesKind = docSurface.rawDocKind === docKind;
          summary.exactMatch =
            summary.present &&
            summary.rawMatchesKind &&
            summary.labelMatchesKind &&
            summary.pathMatchesExpectedSuffix &&
            summary.headLabelMatchesKind &&
            summary.headPathMatchesExpectedSuffix &&
            summary.headHasKindMarker &&
            summary.headHasExpectedPathSuffix;
        }
        if (!summary.present) {
          summary.failureReasons.push('missing-surface');
        }
        if (!summary.rawMatchesKind) {
          summary.failureReasons.push('raw-kind-mismatch');
        }
        if (!summary.labelMatchesKind) {
          summary.failureReasons.push('label-mismatch');
        }
        if (!summary.pathMatchesExpectedSuffix) {
          summary.failureReasons.push('path-suffix-mismatch');
        }
        if (!summary.headLabelMatchesKind) {
          summary.failureReasons.push('head-label-mismatch');
        }
        if (!summary.headPathMatchesExpectedSuffix) {
          summary.failureReasons.push('head-path-suffix-mismatch');
        }
        if (!summary.headHasKindMarker) {
          summary.failureReasons.push('head-kind-marker-missing');
        }
        if (!summary.headHasExpectedPathSuffix) {
          summary.failureReasons.push('head-path-marker-missing');
        }
        return [docKind, summary];
      }),
    ),
    exactMatchCount: 0,
    exactMatchDocKinds: [],
    mismatchCount: screenshotSurfaceSummary.docSurfaceKindMismatches.length,
    missingDocKinds: [],
    overallExactMatch: false,
    stableDigest: [],
    stableDigestByDocKind: {},
    stableDigestLineCount: 0,
    stableDigestOverviewLine: '',
    totalExpectedDocKinds: expectedReleaseDocKinds.length,
  };
  releaseDocVerificationSummary.exactMatchDocKinds = expectedReleaseDocKinds.filter(
    (docKind) => releaseDocVerificationSummary.byDocKind[docKind].exactMatch,
  );
  releaseDocVerificationSummary.exactMatchCount = releaseDocVerificationSummary.exactMatchDocKinds.length;
  releaseDocVerificationSummary.missingDocKinds = expectedReleaseDocKinds.filter(
    (docKind) => !releaseDocVerificationSummary.byDocKind[docKind].present,
  );
  releaseDocVerificationSummary.overallExactMatch =
    releaseDocVerificationSummary.mismatchCount === 0 &&
    releaseDocVerificationSummary.missingDocKinds.length === 0 &&
    releaseDocVerificationSummary.exactMatchCount === releaseDocVerificationSummary.totalExpectedDocKinds;
  releaseDocVerificationSummary.stableDigest = expectedReleaseDocKinds.map((docKind) => ({
    actualHeadLabel: releaseDocVerificationSummary.byDocKind[docKind].actualHeadLabel,
    actualHeadPathSuffix: releaseDocVerificationSummary.byDocKind[docKind].actualHeadPathSuffix,
    actualLabel: releaseDocVerificationSummary.byDocKind[docKind].actualLabel,
    actualPathSuffix: releaseDocVerificationSummary.byDocKind[docKind].actualPathSuffix,
    docKind,
    exactMatch: releaseDocVerificationSummary.byDocKind[docKind].exactMatch,
    failureReasons: releaseDocVerificationSummary.byDocKind[docKind].failureReasons,
  })).map((entry) => {
    const signatureLine = [
      entry.docKind,
      `exact=${entry.exactMatch ? 'true' : 'false'}`,
      `label=${entry.actualLabel || '<empty>'}`,
      `path=${entry.actualPathSuffix || '<empty>'}`,
      `head=${entry.actualHeadLabel || '<empty>'}`,
      `headPath=${entry.actualHeadPathSuffix || '<empty>'}`,
      `failures=${entry.failureReasons.length ? entry.failureReasons.join(',') : 'none'}`,
    ].join('|');
    return {
      ...entry,
      signatureLine,
      signatureSha256: createHash('sha256').update(signatureLine).digest('hex'),
    };
  });
  releaseDocVerificationSummary.stableDigestLines = releaseDocVerificationSummary.stableDigest.map(
    (entry) => entry.signatureLine,
  );
  releaseDocVerificationSummary.stableDigestSha256 = createHash('sha256')
    .update(releaseDocVerificationSummary.stableDigestLines.join('\n'))
    .digest('hex');
  releaseDocVerificationSummary.stableDigestByDocKind = Object.fromEntries(
    releaseDocVerificationSummary.stableDigest.map((entry) => [
      entry.docKind,
      {
        actualHeadLabel: entry.actualHeadLabel,
        actualHeadPathSuffix: entry.actualHeadPathSuffix,
        actualLabel: entry.actualLabel,
        actualPathSuffix: entry.actualPathSuffix,
        exactMatch: entry.exactMatch,
        failureReasons: entry.failureReasons,
        signatureLine: entry.signatureLine,
        signatureSha256: entry.signatureSha256,
      },
    ]),
  );
  releaseDocVerificationSummary.stableDigestLineCount = releaseDocVerificationSummary.stableDigestLines.length;
  releaseDocVerificationSummary.stableDigestOverviewLine = [
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `exactMatchCount=${releaseDocVerificationSummary.exactMatchCount}/${releaseDocVerificationSummary.totalExpectedDocKinds}`,
    `mismatchCount=${releaseDocVerificationSummary.mismatchCount}`,
    `missing=${releaseDocVerificationSummary.missingDocKinds.length ? releaseDocVerificationSummary.missingDocKinds.join(',') : 'none'}`,
    `docKinds=${releaseDocVerificationSummary.stableDigest.map((entry) => entry.docKind).join(',')}`,
    `sha256=${releaseDocVerificationSummary.stableDigestSha256}`,
  ].join('|');
  assert.equal(
    screenshotSurfaceSummary.surfaceHeadings.includes('마감 체크리스트와 현재 상태'),
    true,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(
    screenshotSurfaceSummary.surfaceHeadings.includes('남은 gap, provider readiness, 증거 문서'),
    true,
    JSON.stringify(screenshotSurfaceSummary),
  );
  assert.equal(screenshotSurfaceSummary.releaseHeadline.length > 0, true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.releaseCopy.length > 0, true, JSON.stringify(screenshotSurfaceSummary));
  assert.deepEqual(
    releaseDocVerificationSummary.missingDocKinds,
    [],
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(releaseDocVerificationSummary.mismatchCount, 0, JSON.stringify(releaseDocVerificationSummary));
  assert.equal(
    releaseDocVerificationSummary.exactMatchCount,
    releaseDocVerificationSummary.totalExpectedDocKinds,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(releaseDocVerificationSummary.overallExactMatch, true, JSON.stringify(releaseDocVerificationSummary));
  assert.equal(
    releaseDocVerificationSummary.stableDigest.length,
    releaseDocVerificationSummary.totalExpectedDocKinds,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.deepEqual(
    Object.keys(releaseDocVerificationSummary.stableDigestByDocKind),
    expectedReleaseDocKinds,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestLines.length,
    releaseDocVerificationSummary.totalExpectedDocKinds,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestLineCount,
    releaseDocVerificationSummary.totalExpectedDocKinds,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestOverviewLine.includes('overallExactMatch=true'),
    true,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestOverviewLine.includes(`exactMatchCount=${releaseDocVerificationSummary.totalExpectedDocKinds}/${releaseDocVerificationSummary.totalExpectedDocKinds}`),
    true,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestOverviewLine.includes('missing=none'),
    true,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    releaseDocVerificationSummary.stableDigestOverviewLine.includes(`sha256=${releaseDocVerificationSummary.stableDigestSha256}`),
    true,
    JSON.stringify(releaseDocVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseDocVerificationSummary.stableDigestSha256),
    true,
    JSON.stringify(releaseDocVerificationSummary),
  );
  const requiredSummaryChipLabels = [
    'deterministic smoke',
    '열린 체크리스트',
    '필수 gap',
    'verified baseline',
    'optional provider gap',
    'evidence 상태',
    '최종 갱신',
  ];
  for (const label of requiredSummaryChipLabels) {
    const summaryChip = screenshotSurfaceSummary.summaryChips.find((item) => item.label === label);
    assert.equal(Boolean(summaryChip), true, JSON.stringify({ label, screenshotSurfaceSummary }));
    assert.equal(String(summaryChip?.value || '').trim().length > 0, true, JSON.stringify({ label, screenshotSurfaceSummary }));
  }
  for (const recommendationCard of screenshotSurfaceSummary.recommendationCards) {
    assert.equal(String(recommendationCard.label || '').trim().length > 0, true, JSON.stringify(recommendationCard));
    assert.equal(recommendationCard.badges.length >= 1, true, JSON.stringify(recommendationCard));
  }
  for (const providerCard of screenshotSurfaceSummary.providerCards) {
    assert.equal(String(providerCard.label || '').trim().length > 0, true, JSON.stringify(providerCard));
    assert.equal(String(providerCard.envKey || '').trim().length > 0, true, JSON.stringify(providerCard));
    assert.equal(providerCard.statusBadges.length >= 2, true, JSON.stringify(providerCard));
  }
  for (const handoffArtifact of screenshotSurfaceSummary.handoffArtifacts) {
    assert.equal(String(handoffArtifact.id || '').trim().length > 0, true, JSON.stringify(handoffArtifact));
    assert.equal(String(handoffArtifact.label || '').trim().length > 0, true, JSON.stringify(handoffArtifact));
    assert.equal(String(handoffArtifact.path || '').trim().length > 0, true, JSON.stringify(handoffArtifact));
    assert.equal(handoffArtifact.badges.length >= 3, true, JSON.stringify(handoffArtifact));
    assert.equal(handoffArtifact.meta.length >= 2, true, JSON.stringify(handoffArtifact));
    assert.equal(
      handoffArtifact.badges.includes('ready') ? String(handoffArtifact.linkHref || '').trim().length > 0 : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      /markdown|text|json/i.test(handoffArtifact.badges.join(' '))
        ? String(handoffArtifact.previewButtonLabel || '').trim().length > 0
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      /markdown|text|json/i.test(handoffArtifact.badges.join(' '))
        ? String(handoffArtifact.previewLinkLabel || '').trim().length > 0
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id === 'browser-screenshot'
        ? String(handoffArtifact.openLinkCopyLabel || '').trim().length > 0
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.length >= 6
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'preview')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'open')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary copy preview')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview line copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary detail copy preview line copy body')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryRows.some((row) => String(row.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body')
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.length >= 17
        : handoffArtifact.structuredSummaryDetails.length === 0,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? /sha\s+[a-f0-9]{12,}/i.test(String(handoffArtifact.structuredSummarySha || ''))
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy'
          && /totalChecks=4\|exactMatchCount=4\|surfaces=handoff-digest-json:summaryCopyPreview\/card,handoff-index-markdown:summaryCopyPreview\/current-preview,handoff-digest-json:summaryDetailCopyPreviewLineCopy\/card,handoff-index-markdown:summaryDetailCopyPreviewLineCopyBody\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 4
          && Array.isArray(detail.stableLineItems)
          && detail.stableLineItems.length === 4
          && detail.stableLineItems.some((item) => /stable line 복사|복사됨/i.test(String(item.copyLabel || '')))
          && detail.stableLines.some((line) => /detail-line-copy-card\|exact=true\|copyLabel=/i.test(String(line || '')))
          && detail.stableLines.some((line) => /detail-line-copy-body-current-preview\|exact=true\|copyLabel=/i.test(String(line || '')))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryDetailCopy:0\/card,handoff-index-markdown:summaryDetailCopy:3\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBody:0\/card,handoff-index-markdown:summaryStableLineCopyPreviewBody:2\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBody:0\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBody:2\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 6
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary stable line copy preview body line copy body line copy body line copy body line copy line copy line copy line copy line copy line copy line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy\/card,handoff-index-markdown:summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && Array.isArray(detail.stableLines)
          && detail.stableLines.length === 2
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview line copy'
          && /totalChecks=2\|exactMatchCount=2\|surfaces=handoff-digest-json:summaryDetailCopyPreview\/card,handoff-index-markdown:summaryDetailCopyPreview\/current-preview\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? handoffArtifact.structuredSummaryDetails.some((detail) =>
          String(detail.label || '').trim() === 'summary detail copy preview line copy body'
          && /totalArtifacts=6\|exactMatchCount=6\|artifacts=handoff-digest-text,handoff-digest-markdown,handoff-manifest-text,handoff-manifest-markdown,handoff-index-text,handoff-index-markdown\|sha256=/i.test(String(detail.overview || ''))
          && String(detail.copyLabel || '').trim().length > 0)
        : true,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? /entries=open,preview,summaryCopy,summaryCopyPreview,summaryDetailCopy,summaryDetailCopyPreview,summaryDetailCopyPreviewLineCopy,summaryDetailCopyPreviewLineCopyBody,summaryStableLineCopy,summaryStableLineCopyPreview,summaryStableLineCopyPreviewBody,summaryStableLineCopyPreviewBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy\|sha256=/i.test(String(handoffArtifact.structuredSummaryOverview || ''))
        : String(handoffArtifact.structuredSummaryOverview || '').trim().length === 0,
      true,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(
      handoffArtifact.id.startsWith('handoff-')
        ? String(handoffArtifact.structuredSummaryCopyLabel || '').trim().length > 0
        : String(handoffArtifact.structuredSummaryCopyLabel || '').trim().length === 0,
      true,
      JSON.stringify(handoffArtifact),
    );
  }
  assert.equal(Boolean(screenshotSurfaceSummary.handoffPreview), true, JSON.stringify(screenshotSurfaceSummary));
  assert.equal(screenshotSurfaceSummary.handoffPreview.artifactId, 'index-markdown', JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(screenshotSurfaceSummary.handoffPreview.state, 'ready', JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(screenshotSurfaceSummary.handoffPreview.format, 'markdown', JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(String(screenshotSurfaceSummary.handoffPreview.bodySample || '').trim().length > 0, true, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(String(screenshotSurfaceSummary.handoffPreview.copyLinkLabel || '').trim().length > 0, true, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(screenshotSurfaceSummary.handoffPreview.structuredSummaryRows.length, 0, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(String(screenshotSurfaceSummary.handoffPreview.structuredSummaryOverview || '').trim().length, 0, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(String(screenshotSurfaceSummary.handoffPreview.structuredSummarySha || '').trim().length, 0, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  assert.equal(String(screenshotSurfaceSummary.handoffPreview.structuredSummaryCopyLabel || '').trim().length, 0, JSON.stringify(screenshotSurfaceSummary.handoffPreview));
  const handoffOpenTargets = [];
  for (const [artifactId, artifactLabel, artifactSuffix, artifactContentType] of [
    ['handoff-digest-json', 'handoff-digest.json', 'output/playwright/execution-v1-release-handoff-digest.json', 'application/json'],
    ['handoff-digest-text', 'handoff-digest.txt', 'output/playwright/execution-v1-release-handoff-digest.txt', 'text/plain'],
    ['handoff-digest-markdown', 'handoff-digest.md', 'output/playwright/execution-v1-release-handoff-digest.md', 'text/markdown'],
    ['handoff-manifest-json', 'handoff-manifest.json', 'output/playwright/execution-v1-release-handoff-manifest.json', 'application/json'],
    ['handoff-manifest-text', 'handoff-manifest.txt', 'output/playwright/execution-v1-release-handoff-manifest.txt', 'text/plain'],
    ['handoff-manifest-markdown', 'handoff-manifest.md', 'output/playwright/execution-v1-release-handoff-manifest.md', 'text/markdown'],
    ['handoff-index-json', 'handoff-index.json', 'output/playwright/execution-v1-release-handoff-index.json', 'application/json'],
    ['handoff-index-text', 'handoff-index.txt', 'output/playwright/execution-v1-release-handoff-index.txt', 'text/plain'],
    ['handoff-index-markdown', 'handoff-index.md', 'output/playwright/execution-v1-release-handoff-index.md', 'text/markdown'],
    ['index-markdown', 'index.md', 'output/playwright/execution-v1-release-doc-index.md', 'text/markdown'],
    ['index-text', 'index.txt', 'output/playwright/execution-v1-release-doc-index.txt', 'text/plain'],
    ['index-json', 'index.json', 'output/playwright/execution-v1-release-doc-index.json', 'application/json'],
  ]) {
    const handoffArtifact = screenshotSurfaceSummary.handoffArtifacts.find((item) => item.id === artifactId);
    assert.equal(Boolean(handoffArtifact), true, JSON.stringify({ artifactId, screenshotSurfaceSummary }));
    assert.equal(handoffArtifact.label, artifactLabel, JSON.stringify(handoffArtifact));
    assert.equal(handoffArtifact.badges.includes('ready'), true, JSON.stringify(handoffArtifact));
    assert.equal(
      handoffArtifact.linkHref,
      `/api/execution-v1/handoff-artifacts/${artifactId}`,
      JSON.stringify(handoffArtifact),
    );
    assert.equal(String(handoffArtifact.path || '').endsWith(artifactSuffix), true, JSON.stringify(handoffArtifact));
    handoffOpenTargets.push({
      artifactContentType,
      artifactId,
      href: handoffArtifact.linkHref,
    });
  }
  const handoffOpenFetchResults = runPwJson([
    '--raw',
      'run-code',
      `async (page) => {
      const targets = ${JSON.stringify(handoffOpenTargets)};
      const results = [];
      for (const target of targets) {
        const response = await page.evaluate(async (currentTarget) => {
          const result = await fetch(currentTarget.href);
          return {
            artifactId: currentTarget.artifactId,
            body: await result.text(),
            contentType: result.headers.get('content-type') || '',
            href: currentTarget.href,
            status: result.status,
          };
        }, target);
        results.push(response);
      }
      return results;
    }`,
  ]);
  assert.equal(handoffOpenFetchResults.length, handoffOpenTargets.length, JSON.stringify({
    handoffOpenFetchResults,
    handoffOpenTargets,
  }));
  for (const target of handoffOpenTargets) {
    const handoffResponse = handoffOpenFetchResults.find((item) => item.artifactId === target.artifactId);
    assert.equal(Boolean(handoffResponse), true, JSON.stringify({ handoffOpenFetchResults, target }));
    assert.equal(handoffResponse.status, 200, JSON.stringify(handoffResponse));
    assert.equal(
      String(handoffResponse.contentType || '').includes(target.artifactContentType),
      true,
      JSON.stringify(handoffResponse),
    );
    assert.equal(String(handoffResponse.body || '').trim().length > 0, true, JSON.stringify(handoffResponse));
  }
  for (const docSurface of screenshotSurfaceSummary.docSurfaces) {
    assert.equal(String(docSurface.docKind || '').trim().length > 0, true, JSON.stringify(docSurface));
    assert.equal(String(docSurface.headHtml || '').trim().length > 0, true, JSON.stringify(docSurface));
    assert.equal(String(docSurface.label || '').trim().length > 0, true, JSON.stringify(docSurface));
    assert.equal(String(docSurface.path || '').trim().length > 0, true, JSON.stringify(docSurface));
    assert.equal(docSurface.previewItems.length >= 1, true, JSON.stringify(docSurface));
    assert.equal(String(docSurface.previewItems[0] || '').trim().length > 0, true, JSON.stringify(docSurface));
    assert.equal(docSurface.rawDocKind, docSurface.docKind, JSON.stringify(docSurface));
    assert.equal(docSurface.label, docSurface.docKind, JSON.stringify(docSurface));
    assert.equal(
      toStableDocPathSuffix(docSurface.path) === expectedDocSurfaceSuffixByKind[docSurface.docKind],
      true,
      JSON.stringify(docSurface),
    );
    assert.equal(
      docSurface.headHtml.includes(`<strong>${docSurface.docKind}</strong>`),
      true,
      JSON.stringify(docSurface),
    );
    assert.equal(
      docSurface.headHtml.includes(expectedDocSurfaceSuffixByKind[docSurface.docKind]),
      true,
      JSON.stringify(docSurface),
    );
    for (const heading of docSurface.headings) {
      assert.equal(String(heading || '').trim().length > 0, true, JSON.stringify(docSurface));
    }
  }
  for (const docKind of expectedReleaseDocKinds) {
    assert.equal(
      releaseDocVerificationSummary.byDocKind[docKind].exactMatch,
      true,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.deepEqual(
      releaseDocVerificationSummary.byDocKind[docKind].failureReasons,
      [],
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      releaseDocVerificationSummary.byDocKind[docKind].actualPathSuffix,
      releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      releaseDocVerificationSummary.byDocKind[docKind].actualHeadLabel,
      releaseDocVerificationSummary.byDocKind[docKind].expectedKind,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      releaseDocVerificationSummary.byDocKind[docKind].actualHeadPathSuffix,
      releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    const stableDigestEntry = releaseDocVerificationSummary.stableDigest.find((entry) => entry.docKind === docKind);
    assert.equal(Boolean(stableDigestEntry), true, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(stableDigestEntry.actualLabel, docKind, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(stableDigestEntry.actualHeadLabel, docKind, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(
      stableDigestEntry.actualPathSuffix,
      releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestEntry.actualHeadPathSuffix,
      releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      /^[a-f0-9]{64}$/.test(stableDigestEntry.signatureSha256),
      true,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    const stableDigestIndexEntry = releaseDocVerificationSummary.stableDigestByDocKind[docKind];
    assert.equal(Boolean(stableDigestIndexEntry), true, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(stableDigestIndexEntry.actualLabel, stableDigestEntry.actualLabel, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(
      stableDigestIndexEntry.actualPathSuffix,
      stableDigestEntry.actualPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestIndexEntry.actualHeadPathSuffix,
      stableDigestEntry.actualHeadPathSuffix,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestIndexEntry.signatureLine,
      stableDigestEntry.signatureLine,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestIndexEntry.signatureSha256,
      stableDigestEntry.signatureSha256,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    const stableDigestLine = releaseDocVerificationSummary.stableDigestLines.find((line) => line.startsWith(`${docKind}|`));
    assert.equal(Boolean(stableDigestLine), true, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(stableDigestEntry.signatureLine, stableDigestLine, JSON.stringify({ docKind, releaseDocVerificationSummary }));
    assert.equal(
      stableDigestLine.includes(`path=${releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix}`),
      true,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestLine.includes(`headPath=${releaseDocVerificationSummary.byDocKind[docKind].expectedPathSuffix}`),
      true,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
    assert.equal(
      stableDigestLine.includes('failures=none'),
      true,
      JSON.stringify({ docKind, releaseDocVerificationSummary }),
    );
  }
  for (const checklistItem of screenshotSurfaceSummary.checklistItems) {
    assert.equal(String(checklistItem.label || '').trim().length > 0, true, JSON.stringify(checklistItem));
    assert.equal(String(checklistItem.status || '').trim().length > 0, true, JSON.stringify(checklistItem));
  }
  for (const currentStatusRow of screenshotSurfaceSummary.currentStatusRows) {
    assert.equal(String(currentStatusRow.label || '').trim().length > 0, true, JSON.stringify(currentStatusRow));
    assert.equal(String(currentStatusRow.value || '').trim().length > 0, true, JSON.stringify(currentStatusRow));
  }
  for (const docStatusRow of screenshotSurfaceSummary.docStatusRows) {
    assert.equal(String(docStatusRow.label || '').trim().length > 0, true, JSON.stringify(docStatusRow));
    assert.equal(String(docStatusRow.value || '').trim().length > 0, true, JSON.stringify(docStatusRow));
  }
  if (screenshotSurfaceSummary.historyRows.length) {
    for (const historyRow of screenshotSurfaceSummary.historyRows) {
      assert.equal(String(historyRow.action || '').trim().length > 0, true, JSON.stringify(historyRow));
      assert.equal(String(historyRow.outcome || '').trim().length > 0, true, JSON.stringify(historyRow));
      assert.equal(String(historyRow.scopeMeta || '').trim().length > 0, true, JSON.stringify(historyRow));
      assert.equal(String(historyRow.summary || '').trim().length > 0, true, JSON.stringify(historyRow));
    }
  } else {
    assert.equal(
      String(screenshotSurfaceSummary.historyEmptyState.title || '').trim().length > 0,
      true,
      JSON.stringify(screenshotSurfaceSummary),
    );
    assert.equal(
      String(screenshotSurfaceSummary.historyEmptyState.detail || '').trim().length > 0,
      true,
      JSON.stringify(screenshotSurfaceSummary),
    );
  }

  const browserErrorState = getBrowserErrorState();
  assert.deepEqual(browserErrorState.consoleErrors, [], JSON.stringify(browserErrorState));
  assert.deepEqual(browserErrorState.pageErrors, [], JSON.stringify(browserErrorState));
  const normalizedHandoffSessionResults = [...handoffSessionResults].sort((left, right) => {
    const leftKey = `${left.sourceType}:${left.sessionLabel}`;
    const rightKey = `${right.sourceType}:${right.sessionLabel}`;
    return leftKey.localeCompare(rightKey);
  });
  const expectedSessionLabels = ['copy', 'direct-fallback', 'focused-fallback'];
  const expectedSourceTypes = ['attachment', 'memory'];
  for (const sourceType of expectedSourceTypes) {
    for (const sessionLabel of expectedSessionLabels) {
      assert.equal(
        normalizedHandoffSessionResults.some(
          (entry) => entry.sourceType === sourceType && entry.sessionLabel === sessionLabel,
        ),
        true,
        JSON.stringify({ normalizedHandoffSessionResults, sessionLabel, sourceType }),
      );
    }
  }
  const handoffCoverageSummary = normalizedHandoffSessionResults.reduce(
    (summary, entry) => {
      summary.errorFreeSessions += entry.consoleErrors === 0 && entry.pageErrors === 0 ? 1 : 0;
      summary.bySessionLabel[entry.sessionLabel] = (summary.bySessionLabel[entry.sessionLabel] || 0) + 1;
      if (!summary.bySourceType[entry.sourceType]) {
        summary.bySourceType[entry.sourceType] = {
          attachmentFocusedCount: 0,
          sessionLabels: [],
          totalSessions: 0,
        };
      }
      summary.bySourceType[entry.sourceType].attachmentFocusedCount += entry.attachmentFocused ? 1 : 0;
      summary.bySourceType[entry.sourceType].sessionLabels.push(entry.sessionLabel);
      summary.bySourceType[entry.sourceType].totalSessions += 1;
      summary.totalSessions += 1;
      return summary;
    },
    {
      bySessionLabel: {},
      bySourceType: {},
      errorFreeSessions: 0,
      totalSessions: 0,
    },
  );
  const normalizedReleaseHandoffSessionResults = [...releaseHandoffSessionResults].sort((left, right) => {
    const leftKey = `${left.sessionLabel}:${left.artifactId}`;
    const rightKey = `${right.sessionLabel}:${right.artifactId}`;
    return leftKey.localeCompare(rightKey);
  });
  const expectedReleaseHandoffSessions = [
    { artifactId: 'browser-report', sessionLabel: 'card-copy' },
    { artifactId: 'browser-report', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-digest-json', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-digest-json', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-digest-text', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-digest-text', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-digest-markdown', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-digest-markdown', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-manifest-json', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-manifest-json', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-manifest-text', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-manifest-text', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-manifest-markdown', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-manifest-markdown', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-index-json', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-index-json', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-index-text', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-index-text', sessionLabel: 'card-fallback' },
    { artifactId: 'handoff-index-markdown', sessionLabel: 'card-copy' },
    { artifactId: 'handoff-index-markdown', sessionLabel: 'card-fallback' },
    { artifactId: 'manifest-json', sessionLabel: 'card-copy' },
    { artifactId: 'manifest-json', sessionLabel: 'card-fallback' },
    { artifactId: 'manifest-text', sessionLabel: 'card-copy' },
    { artifactId: 'manifest-text', sessionLabel: 'card-fallback' },
    { artifactId: 'manifest-markdown', sessionLabel: 'card-copy' },
    { artifactId: 'manifest-markdown', sessionLabel: 'card-fallback' },
    { artifactId: 'digest-json', sessionLabel: 'card-copy' },
    { artifactId: 'digest-json', sessionLabel: 'card-fallback' },
    { artifactId: 'digest-text', sessionLabel: 'card-copy' },
    { artifactId: 'digest-text', sessionLabel: 'card-fallback' },
    { artifactId: 'digest-markdown', sessionLabel: 'card-copy' },
    { artifactId: 'digest-markdown', sessionLabel: 'card-fallback' },
    { artifactId: 'index-json', sessionLabel: 'card-copy' },
    { artifactId: 'index-json', sessionLabel: 'card-fallback' },
    { artifactId: 'index-text', sessionLabel: 'card-copy' },
    { artifactId: 'index-text', sessionLabel: 'card-fallback' },
    { artifactId: 'index-markdown', sessionLabel: 'current-preview-copy' },
    { artifactId: 'index-markdown', sessionLabel: 'current-preview-fallback' },
  ];
  for (const expectedEntry of expectedReleaseHandoffSessions) {
    assert.equal(
      normalizedReleaseHandoffSessionResults.some(
        (entry) =>
          entry.artifactId === expectedEntry.artifactId &&
          entry.sessionLabel === expectedEntry.sessionLabel,
      ),
      true,
      JSON.stringify({ expectedEntry, normalizedReleaseHandoffSessionResults }),
    );
  }
  const releaseHandoffCoverageSummary = normalizedReleaseHandoffSessionResults.reduce(
    (summary, entry) => {
      summary.bySessionLabel[entry.sessionLabel] = (summary.bySessionLabel[entry.sessionLabel] || 0) + 1;
      if (!summary.byArtifactId[entry.artifactId]) {
        summary.byArtifactId[entry.artifactId] = {
          previewFormat: entry.previewFormat,
          previewTitle: entry.previewTitle,
          sessionLabels: [],
          totalSessions: 0,
        };
      }
      summary.byArtifactId[entry.artifactId].sessionLabels.push(entry.sessionLabel);
      summary.byArtifactId[entry.artifactId].totalSessions += 1;
      summary.errorFreeSessions += entry.consoleErrors === 0 && entry.pageErrors === 0 ? 1 : 0;
      summary.totalSessions += 1;
      return summary;
    },
    {
      byArtifactId: {},
      bySessionLabel: {},
      errorFreeSessions: 0,
      totalSessions: 0,
    },
  );
  const releaseHandoffLinkVerificationSummary = {
    byArtifactId: {
      'browser-report': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['browser-report'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['browser-report'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['browser-report'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'browser-e2e.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['browser-report'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['browser-report'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['browser-report'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['browser-report']?.sessionLabels || [],
      },
      'handoff-digest-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-digest-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'handoff-digest.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-digest-json']?.sessionLabels || [],
      },
      'handoff-digest-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-digest-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'handoff-digest.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-digest-text']?.sessionLabels || [],
      },
      'handoff-digest-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-markdown'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-digest-markdown'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-digest-markdown'].copyLabelAfterCopy,
        expectedFormat: 'markdown',
        expectedTitle: 'handoff-digest.md',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-digest-markdown'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-markdown'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-digest-markdown'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-digest-markdown']?.sessionLabels || [],
      },
      'handoff-manifest-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'handoff-manifest.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-manifest-json']?.sessionLabels || [],
      },
      'handoff-manifest-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'handoff-manifest.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-manifest-text']?.sessionLabels || [],
      },
      'handoff-manifest-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-markdown'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-manifest-markdown'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-manifest-markdown'].copyLabelAfterCopy,
        expectedFormat: 'markdown',
        expectedTitle: 'handoff-manifest.md',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-markdown'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-markdown'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-manifest-markdown'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-manifest-markdown']?.sessionLabels || [],
      },
      'handoff-index-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-index-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'handoff-index.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-index-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-index-json']?.sessionLabels || [],
      },
      'handoff-index-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-index-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'handoff-index.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-index-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-index-text']?.sessionLabels || [],
      },
      'handoff-index-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-markdown'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['handoff-index-markdown'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['handoff-index-markdown'].copyLabelAfterCopy,
        expectedFormat: 'markdown',
        expectedTitle: 'handoff-index.md',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['handoff-index-markdown'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-markdown'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['handoff-index-markdown'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['handoff-index-markdown']?.sessionLabels || [],
      },
      'manifest-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['manifest-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'manifest.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['manifest-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['manifest-json']?.sessionLabels || [],
      },
      'manifest-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['manifest-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'manifest.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['manifest-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['manifest-text']?.sessionLabels || [],
      },
      'manifest-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-markdown'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['manifest-markdown'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['manifest-markdown'].copyLabelAfterCopy,
        expectedFormat: 'markdown',
        expectedTitle: 'manifest.md',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['manifest-markdown'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-markdown'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['manifest-markdown'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['manifest-markdown']?.sessionLabels || [],
      },
      'digest-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['digest-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['digest-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['digest-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'digest.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['digest-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['digest-json']?.sessionLabels || [],
      },
      'digest-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['digest-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['digest-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['digest-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'digest.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['digest-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['digest-text']?.sessionLabels || [],
      },
      'digest-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['digest-markdown'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['digest-markdown'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['digest-markdown'].copyLabelAfterCopy,
        expectedFormat: 'markdown',
        expectedTitle: 'digest.md',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['digest-markdown'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-markdown'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['digest-markdown'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['digest-markdown']?.sessionLabels || [],
      },
      'index-json': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['index-json'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['index-json'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['index-json'].copyLabelAfterCopy,
        expectedFormat: 'json',
        expectedTitle: 'index.json',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['index-json'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['index-json'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['index-json'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['index-json']?.sessionLabels || [],
      },
      'index-text': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.directCardCopyStates['index-text'].copiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.directCardCopyStates['index-text'].copiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directCardCopyStates['index-text'].copyLabelAfterCopy,
        expectedFormat: 'text',
        expectedTitle: 'index.txt',
        fallbackCopyLabel: handoffPreviewLinkState.directCardFallbackStates['index-text'].copyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.directCardFallbackStates['index-text'].promptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.directCardFallbackStates['index-text'].promptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['index-text']?.sessionLabels || [],
      },
      'index-markdown': {
        copiedLinkArtifactId: new URL(handoffPreviewLinkState.currentPreviewCopiedLink).searchParams.get('rartifact') || '',
        copiedLinkTab: new URL(handoffPreviewLinkState.currentPreviewCopiedLink).searchParams.get('tab') || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.currentPreviewCopyLabel,
        expectedFormat: 'markdown',
        expectedTitle: 'index.md',
        fallbackCopyLabel: handoffPreviewLinkState.currentPreviewFallbackCopyLabel,
        fallbackLinkArtifactId: new URL(handoffPreviewLinkState.currentPreviewFallbackPromptedLink).searchParams.get('rartifact') || '',
        fallbackLinkTab: new URL(handoffPreviewLinkState.currentPreviewFallbackPromptedLink).searchParams.get('tab') || '',
        sessionLabels: releaseHandoffCoverageSummary.byArtifactId['index-markdown']?.sessionLabels || [],
      },
    },
    errorFreeSessions: releaseHandoffCoverageSummary.errorFreeSessions,
    totalSessions: releaseHandoffCoverageSummary.totalSessions,
  };
  for (const [artifactId, summaryEntry] of Object.entries(releaseHandoffLinkVerificationSummary.byArtifactId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedLinkArtifactId === artifactId &&
      summaryEntry.fallbackLinkArtifactId === artifactId &&
      summaryEntry.copiedLinkTab === 'release' &&
      summaryEntry.fallbackLinkTab === 'release' &&
      releaseHandoffCoverageSummary.byArtifactId[artifactId]?.previewFormat === summaryEntry.expectedFormat &&
      releaseHandoffCoverageSummary.byArtifactId[artifactId]?.previewTitle === summaryEntry.expectedTitle &&
      summaryEntry.sessionLabels.length === 2;
  }
  releaseHandoffLinkVerificationSummary.stableLines = Object.entries(releaseHandoffLinkVerificationSummary.byArtifactId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `copyArtifact=${summaryEntry.copiedLinkArtifactId}`,
      `fallbackArtifact=${summaryEntry.fallbackLinkArtifactId}`,
      `copyTab=${summaryEntry.copiedLinkTab}`,
      `fallbackTab=${summaryEntry.fallbackLinkTab}`,
      `sessions=${summaryEntry.sessionLabels.join(',')}`,
    ].join('|'));
  releaseHandoffLinkVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffLinkVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffLinkVerificationSummary.overviewLine = [
    `totalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `errorFreeSessions=${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `artifacts=${Object.keys(releaseHandoffLinkVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
  ].join('|');
  for (const [artifactId, summaryEntry] of Object.entries(releaseHandoffLinkVerificationSummary.byArtifactId)) {
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ artifactId, releaseHandoffLinkVerificationSummary }));
    assert.equal(summaryEntry.sessionLabels.length, 2, JSON.stringify({ artifactId, releaseHandoffLinkVerificationSummary }));
  }
  assert.equal(
    releaseHandoffLinkVerificationSummary.errorFreeSessions,
    releaseHandoffLinkVerificationSummary.totalSessions,
    JSON.stringify(releaseHandoffLinkVerificationSummary),
  );
  assert.equal(releaseHandoffLinkVerificationSummary.stableLines.length, 19, JSON.stringify(releaseHandoffLinkVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffLinkVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffLinkVerificationSummary),
  );
  const normalizedReleaseHandoffOpenSessionResults = [...releaseHandoffOpenSessionResults].sort((left, right) => {
    const leftKey = `${left.sessionLabel}:${left.artifactId}`;
    const rightKey = `${right.sessionLabel}:${right.artifactId}`;
    return leftKey.localeCompare(rightKey);
  });
  const expectedReleaseHandoffOpenSessions = [
    { artifactId: 'browser-screenshot', sessionLabel: 'card-copy' },
    { artifactId: 'browser-screenshot', sessionLabel: 'card-fallback' },
  ];
  for (const expectedEntry of expectedReleaseHandoffOpenSessions) {
    assert.equal(
      normalizedReleaseHandoffOpenSessionResults.some(
        (entry) =>
          entry.artifactId === expectedEntry.artifactId &&
          entry.sessionLabel === expectedEntry.sessionLabel,
      ),
      true,
      JSON.stringify({ expectedEntry, normalizedReleaseHandoffOpenSessionResults }),
    );
  }
  const releaseHandoffOpenCoverageSummary = normalizedReleaseHandoffOpenSessionResults.reduce(
    (summary, entry) => {
      summary.bySessionLabel[entry.sessionLabel] = (summary.bySessionLabel[entry.sessionLabel] || 0) + 1;
      if (!summary.byArtifactId[entry.artifactId]) {
        summary.byArtifactId[entry.artifactId] = {
          contentType: entry.contentType,
          openTitle: entry.openTitle,
          sessionLabels: [],
          totalSessions: 0,
        };
      }
      summary.byArtifactId[entry.artifactId].sessionLabels.push(entry.sessionLabel);
      summary.byArtifactId[entry.artifactId].totalSessions += 1;
      summary.errorFreeSessions += entry.consoleErrors === 0 && entry.pageErrors === 0 && entry.status === 200 ? 1 : 0;
      summary.totalSessions += 1;
      return summary;
    },
    {
      byArtifactId: {},
      bySessionLabel: {},
      errorFreeSessions: 0,
      totalSessions: 0,
    },
  );
  const releaseHandoffOpenLinkVerificationSummary = {
    byArtifactId: {
      'browser-screenshot': {
        copiedLinkPathname: new URL(handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].copiedLink).pathname || '',
        copyLabelAfterSuccess: handoffPreviewLinkState.directOpenCardCopyStates['browser-screenshot'].copyLabelAfterCopy,
        expectedContentType: 'image/png',
        expectedPathname: '/api/execution-v1/handoff-artifacts/browser-screenshot',
        expectedTitle: 'browser-e2e.png',
        fallbackCopyLabel: handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].copyLabel,
        fallbackLinkPathname: new URL(handoffPreviewLinkState.directOpenCardFallbackStates['browser-screenshot'].promptedLink).pathname || '',
        sessionLabels: releaseHandoffOpenCoverageSummary.byArtifactId['browser-screenshot']?.sessionLabels || [],
      },
    },
    errorFreeSessions: releaseHandoffOpenCoverageSummary.errorFreeSessions,
    totalSessions: releaseHandoffOpenCoverageSummary.totalSessions,
  };
  for (const [artifactId, summaryEntry] of Object.entries(releaseHandoffOpenLinkVerificationSummary.byArtifactId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedLinkPathname === summaryEntry.expectedPathname &&
      summaryEntry.fallbackLinkPathname === summaryEntry.expectedPathname &&
      releaseHandoffOpenCoverageSummary.byArtifactId[artifactId]?.contentType === summaryEntry.expectedContentType &&
      releaseHandoffOpenCoverageSummary.byArtifactId[artifactId]?.openTitle === summaryEntry.expectedTitle &&
      summaryEntry.sessionLabels.length === 2;
  }
  releaseHandoffOpenLinkVerificationSummary.stableLines = Object.entries(releaseHandoffOpenLinkVerificationSummary.byArtifactId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([artifactId, summaryEntry]) => [
      artifactId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `copyPath=${summaryEntry.copiedLinkPathname}`,
      `fallbackPath=${summaryEntry.fallbackLinkPathname}`,
      `contentType=${summaryEntry.expectedContentType}`,
      `title=${summaryEntry.expectedTitle}`,
      `sessions=${summaryEntry.sessionLabels.join(',')}`,
    ].join('|'));
  releaseHandoffOpenLinkVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffOpenLinkVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffOpenLinkVerificationSummary.overviewLine = [
    `totalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `errorFreeSessions=${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `artifacts=${Object.keys(releaseHandoffOpenLinkVerificationSummary.byArtifactId).join(',')}`,
    `sha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
  ].join('|');
  for (const [artifactId, summaryEntry] of Object.entries(releaseHandoffOpenLinkVerificationSummary.byArtifactId)) {
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ artifactId, releaseHandoffOpenLinkVerificationSummary }));
    assert.equal(summaryEntry.sessionLabels.length, 2, JSON.stringify({ artifactId, releaseHandoffOpenLinkVerificationSummary }));
  }
  assert.equal(
    releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    releaseHandoffOpenLinkVerificationSummary.totalSessions,
    JSON.stringify(releaseHandoffOpenLinkVerificationSummary),
  );
  assert.equal(releaseHandoffOpenLinkVerificationSummary.stableLines.length, 1, JSON.stringify(releaseHandoffOpenLinkVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffOpenLinkVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffOpenLinkVerificationSummary),
  );
  const releaseHandoffSummaryCopyVerificationSummary = {
    bySurfaceId: {
      'handoff-digest-json/card': {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.directCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.directCardCopy.copyLabelAfterCopy,
        expectedLabelAfterOtherCopy: 'overview 복사',
        expectedSuccessLabel: '복사됨',
        expectedSurface: 'card',
        expectedText: handoffStructuredSummaryCopyState.directCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.directCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.directCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCard,
        surface: 'card',
      },
      'handoff-index-markdown/current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewCopy.copyLabelAfterCopy,
        expectedLabelAfterOtherCopy: '현재 요약 복사됨',
        expectedSuccessLabel: '현재 요약 복사됨',
        expectedSurface: 'current-preview',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreview,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryCopyVerificationSummary }));
    releaseHandoffSummaryCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryCopyVerificationSummary.stableLines = Object.entries(releaseHandoffSummaryCopyVerificationSummary.bySurfaceId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.keys(releaseHandoffSummaryCopyVerificationSummary.bySurfaceId).join(',')}`,
    `sha256=${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryCopyVerificationSummary),
  );
  assert.equal(releaseHandoffSummaryCopyVerificationSummary.stableLines.length, 2, JSON.stringify(releaseHandoffSummaryCopyVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryCopyVerificationSummary),
  );
  const releaseHandoffSummaryDetailCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryCopyPreview',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetail,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailCopy.copyLabelAfterCopy,
        detailKey: 'summaryCopyPreview',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetail,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailCopy.previewArtifactId,
        surface: 'current-preview',
      },
      'detail-line-copy-card': {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopyPreviewLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewLineCopy,
        surface: 'card',
      },
      'detail-line-copy-body-current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopyPreviewLineCopyBody',
        expectedLabelAfterOtherCopy: '현재 line 복사됨',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewLineCopyBody,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewLineCopyBodyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 4,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryDetailCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryDetailCopyVerificationSummary }));
    releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryDetailCopyVerificationSummary.stableLines = Object.entries(releaseHandoffSummaryDetailCopyVerificationSummary.bySurfaceId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryDetailCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryDetailCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryDetailCopyVerificationSummary),
  );
  assert.equal(releaseHandoffSummaryDetailCopyVerificationSummary.stableLines.length, 4, JSON.stringify(releaseHandoffSummaryDetailCopyVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryDetailCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.stableLineCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.stableLineCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopy',
        expectedLabelAfterOtherCopy: 'stable line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.stableLineCardCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.stableLineCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.stableLineCardFallback.promptedValue,
        lineIndex: 0,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLine,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopy',
        expectedLabelAfterOtherCopy: '현재 stable line 복사',
        expectedSuccessLabel: '현재 stable line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewStableLineFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewStableLineFallback.promptedValue,
        lineIndex: 3,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLine,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewStableLineCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryStableLineCopyVerificationSummary }));
    releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines = Object.entries(releaseHandoffSummaryStableLineCopyVerificationSummary.bySurfaceId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `lineIndex=${summaryEntry.lineIndex}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}:${entry.lineIndex}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyVerificationSummary),
  );
  assert.equal(releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.length, 2, JSON.stringify(releaseHandoffSummaryStableLineCopyVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBody',
        expectedLabelAfterOtherCopy: 'stable line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.stableLinePreviewBodyCardCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.stableLinePreviewBodyCardFallback.promptedValue,
        lineIndex: 0,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLinePreviewBody,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBody',
        expectedLabelAfterOtherCopy: '현재 stable line 복사',
        expectedSuccessLabel: '현재 stable line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyFallback.promptedValue,
        lineIndex: 2,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLinePreviewBody,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary }));
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `lineIndex=${summaryEntry.lineIndex}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}:${entry.lineIndex}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBody',
        expectedLabelAfterOtherCopy: 'stable line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.stableLinePreviewBodyLineCopyBodyCardFallback.promptedValue,
        lineIndex: 0,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardStableLinePreviewBodyLineCopyBody,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBody',
        expectedLabelAfterOtherCopy: '현재 stable line 복사됨',
        expectedSuccessLabel: '현재 stable line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.stableLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyFallback.promptedValue,
        lineIndex: 2,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewStableLinePreviewBodyLineCopyBody,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewStableLinePreviewBodyLineCopyBodyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary }));
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `lineIndex=${summaryEntry.lineIndex}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}:${entry.lineIndex}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBody,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBody,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary }));
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.copyLabelAfterCopy,
        detailKey: 'summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText
      && summaryEntry.fallbackPromptedValue === summaryEntry.expectedText
      && summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel
      && summaryEntry.fallbackCopyLabel === summaryEntry.expectedLabelAfterOtherCopy
      && summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy;
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount +=
      summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines = Object.entries(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId,
  )
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
    2,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  const releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary = {
    bySurfaceId: {
      card: {
        artifactId: 'handoff-digest-json',
        copiedText: handoffStructuredSummaryCopyState.detailPreviewCardCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.detailPreviewCardCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopyPreview',
        expectedLabelAfterOtherCopy: 'line 복사',
        expectedSuccessLabel: '복사됨',
        expectedText: handoffStructuredSummaryCopyState.detailPreviewCardCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.detailPreviewCardFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.detailPreviewCardFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.digestJsonCardDetailPreview,
        surface: 'card',
      },
      'current-preview': {
        artifactId: 'handoff-index-markdown',
        copiedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.copiedText,
        copyLabelAfterSuccess: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.copyLabelAfterCopy,
        detailKey: 'summaryDetailCopyPreview',
        expectedLabelAfterOtherCopy: '현재 line 복사',
        expectedSuccessLabel: '현재 line 복사됨',
        expectedText: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.overviewLine,
        fallbackCopyLabel: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback.copyLabel,
        fallbackPromptedValue: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewFallback.promptedValue,
        observedLabelAfterOtherCopy: handoffStructuredSummaryCopyState.labelsAfterCurrentPreviewCopy.currentPreviewDetailPreview,
        previewArtifactId: handoffStructuredSummaryCopyState.currentPreviewDetailPreviewCopy.previewArtifactId,
        surface: 'current-preview',
      },
    },
    exactMatchCount: 0,
    totalChecks: 2,
  };
  for (const [surfaceId, summaryEntry] of Object.entries(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.bySurfaceId)) {
    summaryEntry.exactMatch =
      summaryEntry.copiedText === summaryEntry.expectedText &&
      summaryEntry.fallbackPromptedValue === summaryEntry.expectedText &&
      summaryEntry.copyLabelAfterSuccess === summaryEntry.expectedSuccessLabel &&
      summaryEntry.observedLabelAfterOtherCopy === summaryEntry.expectedLabelAfterOtherCopy &&
      (summaryEntry.surface !== 'current-preview' || summaryEntry.previewArtifactId === summaryEntry.artifactId);
    assert.equal(summaryEntry.exactMatch, true, JSON.stringify({ surfaceId, releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary }));
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount += summaryEntry.exactMatch ? 1 : 0;
  }
  releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines = Object.entries(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.bySurfaceId)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([surfaceId, summaryEntry]) => [
      surfaceId,
      `exact=${summaryEntry.exactMatch ? 'true' : 'false'}`,
      `copyLabel=${summaryEntry.copyLabelAfterSuccess}`,
      `fallbackLabel=${summaryEntry.fallbackCopyLabel}`,
      `artifactId=${summaryEntry.artifactId}`,
      `detailKey=${summaryEntry.detailKey}`,
      `surface=${summaryEntry.surface}`,
      `textSha256=${createHash('sha256').update(summaryEntry.expectedText).digest('hex')}`,
      `postCopyLabel=${summaryEntry.observedLabelAfterOtherCopy}`,
    ].join('|'));
  releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256 = createHash('sha256')
    .update(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.join('\n'))
    .digest('hex');
  releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine = [
    `totalChecks=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `exactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `surfaces=${Object.values(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.bySurfaceId).map((entry) => `${entry.artifactId}:${entry.detailKey}/${entry.surface}`).join(',')}`,
    `sha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
  ].join('|');
  assert.equal(
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
    JSON.stringify(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary),
  );
  assert.equal(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.length, 2, JSON.stringify(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary));
  assert.equal(
    /^[a-f0-9]{64}$/.test(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256),
    true,
    JSON.stringify(releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary),
  );
  const releaseHandoffStructuredSummary = {
    open: {
      errorFreeSessions: releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
      overviewLine: releaseHandoffOpenLinkVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffOpenLinkVerificationSummary.stableSha256,
      totalSessions: releaseHandoffOpenLinkVerificationSummary.totalSessions,
    },
    preview: {
      errorFreeSessions: releaseHandoffLinkVerificationSummary.errorFreeSessions,
      overviewLine: releaseHandoffLinkVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffLinkVerificationSummary.stableSha256,
      totalSessions: releaseHandoffLinkVerificationSummary.totalSessions,
    },
    summaryCopy: {
      errorFreeSessions: releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryCopyVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryCopyVerificationSummary.totalChecks,
    },
    summaryCopyPreview: {
      errorFreeSessions: releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts,
    },
    summaryDetailCopy: {
      errorFreeSessions: releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreview: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    },
    summaryStableLineCopyPreviewBody: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    },
    summaryStableLineCopyPreviewBodyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBody: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBody: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBody: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopy: {
      errorFreeSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
      stableLineCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines.length,
      stableLines: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableLines,
      totalSessions: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    },
    summaryDetailCopyPreview: {
      errorFreeSessions: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
    },
    summaryDetailCopyPreviewLineCopy: {
      errorFreeSessions: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
    },
    summaryDetailCopyPreviewLineCopyBody: {
      errorFreeSessions: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
      exactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
      overviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
      stableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
      totalSessions: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
    },
  };
  const releaseHandoffStructuredSummaryLines = Object.entries(releaseHandoffStructuredSummary)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([summaryKey, summaryValue]) =>
        `${summaryKey}|totalSessions=${summaryValue.totalSessions}|errorFreeSessions=${summaryValue.errorFreeSessions}|stableDigestSha256=${summaryValue.stableDigestSha256}|overview=${summaryValue.overviewLine}`,
    );
  const releaseHandoffStructuredSummarySha256 = createHash('sha256')
    .update(releaseHandoffStructuredSummaryLines.join('\n'))
    .digest('hex');
  const releaseHandoffStructuredSummaryOverviewLine = [
    `entries=${Object.keys(releaseHandoffStructuredSummary).sort().join(',')}`,
    `sha256=${releaseHandoffStructuredSummarySha256}`,
  ].join('|');
  const smokeReport = {
    artifactVersion: 'execution-v1-browser-e2e/v1',
    browserConsoleErrors: browserErrorState.consoleErrors.length,
    browserPageErrors: browserErrorState.pageErrors.length,
    generatedAt: new Date().toISOString(),
    handoffCoverageSummary,
    handoffSessionResults: normalizedHandoffSessionResults,
    ok: true,
    mode: 'ui-execution-browser-e2e',
    port,
    reportPath,
    releaseDocAssetSanity,
    releaseHandoffCoverageSummary,
    releaseHandoffLinkVerificationSummary,
    releaseHandoffOpenCoverageSummary,
    releaseHandoffOpenLinkVerificationSummary,
    releaseHandoffOpenSessionResults: normalizedReleaseHandoffOpenSessionResults,
    releaseHandoffSummaryDetailCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary,
    releaseHandoffSummaryCopyPreviewVerificationSummary,
    releaseHandoffSummaryCopyVerificationSummary,
    releaseHandoffSessionResults: normalizedReleaseHandoffSessionResults,
    repoDir,
    artifactPair: {
      captureTargetVerified: true,
      fullPageDimensionsVerified: true,
      pairVerified: true,
      releaseHandoffDigestArtifactPath,
      releaseHandoffDigestArtifactVerified: true,
      releaseHandoffDigestTextArtifactPath,
      releaseHandoffDigestTextArtifactVerified: true,
      releaseHandoffDigestMarkdownArtifactPath,
      releaseHandoffDigestMarkdownArtifactVerified: true,
      releaseHandoffManifestPath,
      releaseHandoffManifestVerified: true,
      releaseHandoffManifestTextPath,
      releaseHandoffManifestTextVerified: true,
      releaseHandoffManifestMarkdownPath,
      releaseHandoffManifestMarkdownVerified: true,
      releaseHandoffIndexPath,
      releaseHandoffIndexVerified: true,
      releaseHandoffIndexTextPath,
      releaseHandoffIndexTextVerified: true,
      releaseHandoffOpenLinkSummaryVerified: true,
      releaseHandoffIndexMarkdownPath,
      releaseHandoffIndexMarkdownVerified: true,
      releaseHandoffLinkSummaryVerified: true,
      releaseHandoffSummaryDetailCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewStructuredVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewBodyStructuredVerified: true,
      releaseHandoffSummaryStableLineCopyPreviewVerified: true,
      releaseHandoffSummaryStableLineCopyVerified: true,
      releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerified: true,
      releaseHandoffSummaryDetailCopyPreviewLineCopyVerified: true,
      releaseHandoffSummaryDetailCopyPreviewBodyVerified: true,
      releaseHandoffSummaryDetailCopyPreviewVerified: true,
      releaseHandoffSummaryDetailCopyPreviewStructuredVerified: true,
      releaseHandoffSummaryCopyPreviewVerified: true,
      releaseHandoffSummaryCopySummaryVerified: true,
      releaseHandoffPreviewLinkSessionsVerified: true,
      releaseDocHeadVerified: true,
      reportReadBackVerified: true,
      releaseDocCaptureVerified: true,
      releaseDocDigestArtifactPath,
      releaseDocDigestArtifactVerified: true,
      releaseDocIndexPath,
      releaseDocIndexVerified: true,
      releaseDocIndexMarkdownPath,
      releaseDocIndexMarkdownVerified: true,
      releaseDocIndexTextPath,
      releaseDocIndexTextVerified: true,
      releaseDocDigestManifestPath,
      releaseDocDigestManifestVerified: true,
      releaseDocDigestManifestMarkdownPath,
      releaseDocDigestManifestMarkdownVerified: true,
      releaseDocDigestManifestTextPath,
      releaseDocDigestManifestTextVerified: true,
      releaseDocDigestBundleVerified: true,
      releaseDocDigestMarkdownArtifactPath,
      releaseDocDigestMarkdownArtifactVerified: true,
      releaseDocDigestTextArtifactPath,
      releaseDocDigestTextArtifactVerified: true,
      releaseDocStableDigestVerified: true,
      releaseDocStableEntrySignaturesVerified: true,
      releaseDocStableIndexVerified: true,
      releaseDocStableOverviewVerified: true,
      releaseDocStableSignatureVerified: true,
      releaseDocSummaryVerified: true,
      reportPath,
      screenshotPath,
    },
    expectedFullPageDimensions,
    releaseDocVerificationSummary,
    screenshotCaptureContext,
    screenshotSurfaceSummary,
    screenshotCaptureTarget,
    screenshotCaptured,
    screenshotBytes: screenshotStat.size,
    screenshotHeight: screenshotDimensions.height,
    screenshotModifiedAt: screenshotStat.mtime.toISOString(),
    screenshotSha256,
    screenshotWidth: screenshotDimensions.width,
    screenshotPath,
    sessionId,
    url: reloadState.href,
    workspaceId: workspace.id,
  };
  const releaseHandoffDigestArtifact = {
    artifactVersion: 'execution-v1-release-handoff-digest/v1',
    generatedAt: smokeReport.generatedAt,
    releaseHandoffCoverageSummary,
    releaseHandoffDigestArtifactPath,
    releaseHandoffLinkVerificationSummary,
    releaseHandoffOpenErrorFreeSessions: releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    releaseHandoffOpenCoverageSummary,
    releaseHandoffOpenLinkVerificationSummary,
    releaseHandoffOpenOverviewLine: releaseHandoffOpenLinkVerificationSummary.overviewLine,
    releaseHandoffOpenSessionResults: normalizedReleaseHandoffOpenSessionResults,
    releaseHandoffOpenStableDigestSha256: releaseHandoffOpenLinkVerificationSummary.stableSha256,
    releaseHandoffOpenTotalSessions: releaseHandoffOpenLinkVerificationSummary.totalSessions,
    releaseHandoffPreviewErrorFreeSessions: releaseHandoffLinkVerificationSummary.errorFreeSessions,
    releaseHandoffPreviewOverviewLine: releaseHandoffLinkVerificationSummary.overviewLine,
    releaseHandoffPreviewStableDigestSha256: releaseHandoffLinkVerificationSummary.stableSha256,
    releaseHandoffPreviewTotalSessions: releaseHandoffLinkVerificationSummary.totalSessions,
    releaseHandoffSummaryCopyExactMatchCount: releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyOverviewLine: releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyStableDigestSha256: releaseHandoffSummaryCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyTotalChecks: releaseHandoffSummaryCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryCopyPreviewExactMatchCount: releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyPreviewOverviewLine: releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyPreviewStableDigestSha256: releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyPreviewTotalArtifacts: releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyExactMatchCount: releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyOverviewLine: releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyStableDigestSha256: releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyTotalChecks: releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewExactMatchCount: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewOverviewLine: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummarySha256,
    releaseHandoffSummaryDetailCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary,
    releaseHandoffSummaryCopyVerificationSummary,
    releaseHandoffSessionResults: normalizedReleaseHandoffSessionResults,
    releaseHandoffSummaryReportPath: reportPath,
    repoDir,
  };
  fs.writeFileSync(releaseHandoffDigestArtifactPath, `${JSON.stringify(releaseHandoffDigestArtifact, null, 2)}\n`, 'utf8');
  const releaseHandoffDigestTextArtifact = [
    'artifactVersion=execution-v1-release-handoff-digest-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `jsonDigestPath=${releaseHandoffDigestArtifactPath}`,
    `previewTotalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `previewErrorFreeSessions=${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `previewStableSha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `openTotalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `openErrorFreeSessions=${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `openStableSha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `summaryCopyTotalChecks=${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `summaryCopyExactMatchCount=${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `summaryCopyStableSha256=${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `summaryCopyPreviewTotalArtifacts=${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryCopyPreviewExactMatchCount=${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryCopyPreviewStableSha256=${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyTotalChecks=${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyExactMatchCount=${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyStableSha256=${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewTotalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryStableLineCopyPreviewExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewStableSha256=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewStableSha256=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyTotalChecks=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyPreviewLineCopyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyBodyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `structuredSummarySha256=${releaseHandoffStructuredSummarySha256}`,
    '---open-link---',
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    ...releaseHandoffOpenLinkVerificationSummary.stableLines,
    '---preview-link---',
    releaseHandoffLinkVerificationSummary.overviewLine,
    ...releaseHandoffLinkVerificationSummary.stableLines,
    '---summary-copy---',
    releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines,
    '---summary-copy-preview---',
    releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy---',
    releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy---',
    releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview---',
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview---',
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy-body---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
    '---structured-summary---',
    releaseHandoffStructuredSummaryOverviewLine,
    ...releaseHandoffStructuredSummaryLines,
  ].join('\n').concat('\n');
  fs.writeFileSync(releaseHandoffDigestTextArtifactPath, releaseHandoffDigestTextArtifact, 'utf8');
  const releaseHandoffDigestMarkdownArtifact = [
    '# Execution V1 Release Handoff Digest',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- jsonDigestPath: ${releaseHandoffDigestArtifactPath}`,
    `- previewTotalSessions: ${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `- previewErrorFreeSessions: ${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `- previewStableSha256: ${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `- openTotalSessions: ${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `- openErrorFreeSessions: ${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `- openStableSha256: ${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `- summaryCopyTotalChecks: ${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `- summaryCopyExactMatchCount: ${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `- summaryCopyStableSha256: ${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `- summaryCopyPreviewTotalArtifacts: ${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryCopyPreviewExactMatchCount: ${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryCopyPreviewStableSha256: ${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyTotalChecks: ${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyStableSha256: ${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewTotalArtifacts: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryStableLineCopyPreviewExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewStableSha256: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyTotalChecks: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `- structuredSummarySha256: ${releaseHandoffStructuredSummarySha256}`,
    '',
    '## Open-Link Overview',
    '',
    `- ${releaseHandoffOpenLinkVerificationSummary.overviewLine}`,
    '',
    '## Open-Link Stable Signature Lines',
    '',
    ...releaseHandoffOpenLinkVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Preview-Link Overview',
    '',
    `- ${releaseHandoffLinkVerificationSummary.overviewLine}`,
    '',
    '## Preview-Link Stable Signature Lines',
    '',
    ...releaseHandoffLinkVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Copy Overview',
    '',
    `- ${releaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Structured Summary Signature',
    '',
    `- ${releaseHandoffStructuredSummaryOverviewLine}`,
    '',
    ...releaseHandoffStructuredSummaryLines.map((line) => `- \`${line}\``),
  ].join('\n').concat('\n');
  fs.writeFileSync(releaseHandoffDigestMarkdownArtifactPath, releaseHandoffDigestMarkdownArtifact, 'utf8');
  const releaseHandoffArtifactOrder = ['jsonDigest', 'markdownDigest', 'textDigest'];
  const releaseHandoffArtifacts = {
    jsonDigest: buildTextArtifactDescriptor(releaseHandoffDigestArtifactPath),
    markdownDigest: buildTextArtifactDescriptor(releaseHandoffDigestMarkdownArtifactPath),
    textDigest: buildTextArtifactDescriptor(releaseHandoffDigestTextArtifactPath),
  };
  const releaseHandoffBundleLines = releaseHandoffArtifactOrder.map((name) =>
    buildArtifactBundleLine(name, releaseHandoffArtifacts[name]),
  );
  const releaseHandoffBundleByArtifact = Object.fromEntries(
    releaseHandoffArtifactOrder.map((name, index) => {
      const signatureLine = releaseHandoffBundleLines[index];
      return [
        name,
        {
          bytes: releaseHandoffArtifacts[name].bytes,
          lineCount: releaseHandoffArtifacts[name].lineCount,
          path: releaseHandoffArtifacts[name].path,
          sha256: releaseHandoffArtifacts[name].sha256,
          signatureLine,
          signatureSha256: createHash('sha256').update(signatureLine).digest('hex'),
        },
      ];
    }),
  );
  const releaseHandoffBundleSha256 = createHash('sha256')
    .update(releaseHandoffBundleLines.join('\n'))
    .digest('hex');
  const releaseHandoffBundleOverviewLine = [
    `artifactCount=${releaseHandoffArtifactOrder.length}`,
    `artifacts=${releaseHandoffArtifactOrder.join(',')}`,
    `previewTotalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `previewStableDigestSha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `openTotalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `openStableDigestSha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `bundleSha256=${releaseHandoffBundleSha256}`,
  ].join('|');
  const releaseHandoffManifest = {
    artifactVersion: 'execution-v1-release-handoff-manifest/v1',
    artifactBundleLineCount: releaseHandoffBundleLines.length,
    artifactBundleByArtifactName: releaseHandoffBundleByArtifact,
    artifactBundleLines: releaseHandoffBundleLines,
    artifactBundleOverviewLine: releaseHandoffBundleOverviewLine,
    artifactBundleSha256: releaseHandoffBundleSha256,
    artifactOrder: releaseHandoffArtifactOrder,
    artifacts: releaseHandoffArtifacts,
    generatedAt: smokeReport.generatedAt,
    releaseHandoffDigestArtifactPath,
    releaseHandoffDigestMarkdownArtifactPath,
    releaseHandoffDigestTextArtifactPath,
    releaseHandoffOpenErrorFreeSessions: releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    releaseHandoffOpenOverviewLine: releaseHandoffOpenLinkVerificationSummary.overviewLine,
    releaseHandoffOpenStableDigestSha256: releaseHandoffOpenLinkVerificationSummary.stableSha256,
    releaseHandoffOpenTotalSessions: releaseHandoffOpenLinkVerificationSummary.totalSessions,
    releaseHandoffManifestPath,
    releaseHandoffManifestTextPath,
    releaseHandoffManifestMarkdownPath,
    releaseHandoffPreviewErrorFreeSessions: releaseHandoffLinkVerificationSummary.errorFreeSessions,
    releaseHandoffPreviewOverviewLine: releaseHandoffLinkVerificationSummary.overviewLine,
    releaseHandoffPreviewStableDigestSha256: releaseHandoffLinkVerificationSummary.stableSha256,
    releaseHandoffPreviewTotalSessions: releaseHandoffLinkVerificationSummary.totalSessions,
    releaseHandoffSummaryCopyExactMatchCount: releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyOverviewLine: releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyStableDigestSha256: releaseHandoffSummaryCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyTotalChecks: releaseHandoffSummaryCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryCopyPreviewExactMatchCount: releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyPreviewOverviewLine: releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyPreviewStableDigestSha256: releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyPreviewTotalArtifacts: releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyExactMatchCount: releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyOverviewLine: releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyStableDigestSha256: releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyTotalChecks: releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewExactMatchCount: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewOverviewLine: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummarySha256,
    releaseHandoffSummaryDetailCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary,
    releaseHandoffSummaryCopyVerificationSummary,
    releaseHandoffSummaryReportPath: reportPath,
    repoDir,
  };
  fs.writeFileSync(releaseHandoffManifestPath, `${JSON.stringify(releaseHandoffManifest, null, 2)}\n`, 'utf8');
  const releaseHandoffManifestTextLines = [
    'artifactVersion=execution-v1-release-handoff-manifest-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `manifestPath=${releaseHandoffManifestPath}`,
    `previewStableDigestSha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `openStableDigestSha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `previewTotalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `previewErrorFreeSessions=${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `openTotalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `openErrorFreeSessions=${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `summaryCopyTotalChecks=${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `summaryCopyExactMatchCount=${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `summaryCopyStableSha256=${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `summaryCopyPreviewTotalArtifacts=${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryCopyPreviewExactMatchCount=${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryCopyPreviewStableSha256=${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyTotalChecks=${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyExactMatchCount=${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyStableSha256=${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewTotalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryStableLineCopyPreviewExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewStableSha256=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewStableSha256=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyTotalChecks=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyPreviewLineCopyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyBodyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `structuredSummarySha256=${releaseHandoffStructuredSummarySha256}`,
    `bundleSha256=${releaseHandoffBundleSha256}`,
    '---',
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    releaseHandoffLinkVerificationSummary.overviewLine,
    '---summary-copy---',
    releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines,
    '---summary-copy-preview---',
    releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy---',
    releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy---',
    releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview---',
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview---',
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy-body---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
    '---structured-summary---',
    releaseHandoffStructuredSummaryOverviewLine,
    ...releaseHandoffStructuredSummaryLines,
    releaseHandoffBundleOverviewLine,
    ...releaseHandoffArtifactOrder.map(
      (artifactName) => releaseHandoffBundleByArtifact[artifactName].signatureLine,
    ),
  ];
  const releaseHandoffManifestTextArtifact = `${releaseHandoffManifestTextLines.join('\n')}\n`;
  fs.writeFileSync(releaseHandoffManifestTextPath, releaseHandoffManifestTextArtifact, 'utf8');
  const releaseHandoffManifestMarkdownLines = [
    '# Execution V1 Release Handoff Manifest',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- manifestPath: ${releaseHandoffManifestPath}`,
    `- textManifestPath: ${releaseHandoffManifestTextPath}`,
    `- previewStableDigestSha256: ${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `- openStableDigestSha256: ${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `- previewTotalSessions: ${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `- previewErrorFreeSessions: ${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `- openTotalSessions: ${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `- openErrorFreeSessions: ${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `- summaryCopyTotalChecks: ${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `- summaryCopyExactMatchCount: ${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `- summaryCopyStableSha256: ${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `- summaryCopyPreviewTotalArtifacts: ${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryCopyPreviewExactMatchCount: ${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryCopyPreviewStableSha256: ${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyTotalChecks: ${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyStableSha256: ${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewTotalArtifacts: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryStableLineCopyPreviewExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewStableSha256: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyTotalChecks: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `- structuredSummarySha256: ${releaseHandoffStructuredSummarySha256}`,
    `- bundleSha256: ${releaseHandoffBundleSha256}`,
    '',
    '## Link Verification Overview',
    '',
    `- ${releaseHandoffLinkVerificationSummary.overviewLine}`,
    '',
    '## Open-Link Verification Overview',
    '',
    `- ${releaseHandoffOpenLinkVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Verification Overview',
    '',
    `- ${releaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Structured Summary Signature',
    '',
    `- ${releaseHandoffStructuredSummaryOverviewLine}`,
    '',
    ...releaseHandoffStructuredSummaryLines.map((line) => `- \`${line}\``),
    '',
    '## Bundle Overview',
    '',
    `- ${releaseHandoffBundleOverviewLine}`,
    '',
    '## Artifact Signature Lines',
    '',
    ...releaseHandoffArtifactOrder.map(
      (artifactName) => `- \`${releaseHandoffBundleByArtifact[artifactName].signatureLine}\``,
    ),
  ];
  const releaseHandoffManifestMarkdownArtifact = `${releaseHandoffManifestMarkdownLines.join('\n')}\n`;
  fs.writeFileSync(releaseHandoffManifestMarkdownPath, releaseHandoffManifestMarkdownArtifact, 'utf8');
  const releaseDocDigestArtifact = {
    artifactVersion: 'execution-v1-release-doc-digest/v1',
    exactMatchCount: releaseDocVerificationSummary.exactMatchCount,
    expectedDocKinds: expectedReleaseDocKinds,
    generatedAt: smokeReport.generatedAt,
    missingDocKinds: releaseDocVerificationSummary.missingDocKinds,
    overallExactMatch: releaseDocVerificationSummary.overallExactMatch,
    releaseDocDigestArtifactPath,
    releaseDocIndexPath,
    releaseDocDigestManifestPath,
    releaseDocDigestManifestMarkdownPath,
    releaseDocDigestManifestTextPath,
    releaseDocDigestMarkdownArtifactPath,
    releaseDocDigestTextArtifactPath,
    releaseDocStableDigestByDocKind: releaseDocVerificationSummary.stableDigestByDocKind,
    releaseDocStableDigestLineCount: releaseDocVerificationSummary.stableDigestLineCount,
    releaseDocStableDigestLines: releaseDocVerificationSummary.stableDigestLines,
    releaseDocStableDigestOverviewLine: releaseDocVerificationSummary.stableDigestOverviewLine,
    releaseDocStableDigestSha256: releaseDocVerificationSummary.stableDigestSha256,
    releaseDocSummaryReportPath: reportPath,
    repoDir,
    totalExpectedDocKinds: releaseDocVerificationSummary.totalExpectedDocKinds,
  };
  const releaseDocDigestTextLines = [
    'artifactVersion=execution-v1-release-doc-digest-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `jsonDigestPath=${releaseDocDigestArtifactPath}`,
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `exactMatchCount=${releaseDocVerificationSummary.exactMatchCount}/${releaseDocVerificationSummary.totalExpectedDocKinds}`,
    `missing=${releaseDocVerificationSummary.missingDocKinds.length ? releaseDocVerificationSummary.missingDocKinds.join(',') : 'none'}`,
    `stableDigestSha256=${releaseDocVerificationSummary.stableDigestSha256}`,
    '---',
    releaseDocVerificationSummary.stableDigestOverviewLine,
    ...releaseDocVerificationSummary.stableDigestLines,
  ];
  const releaseDocDigestTextArtifact = `${releaseDocDigestTextLines.join('\n')}\n`;
  const releaseDocDigestMarkdownLines = [
    '# Execution V1 Release Doc Digest',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- jsonDigestPath: ${releaseDocDigestArtifactPath}`,
    `- textDigestPath: ${releaseDocDigestTextArtifactPath}`,
    `- overallExactMatch: ${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `- exactMatchCount: ${releaseDocVerificationSummary.exactMatchCount}/${releaseDocVerificationSummary.totalExpectedDocKinds}`,
    `- missingDocKinds: ${releaseDocVerificationSummary.missingDocKinds.length ? releaseDocVerificationSummary.missingDocKinds.join(', ') : 'none'}`,
    `- stableDigestSha256: ${releaseDocVerificationSummary.stableDigestSha256}`,
    '',
    '## Stable Overview',
    '',
    `- ${releaseDocVerificationSummary.stableDigestOverviewLine}`,
    '',
    '## Stable Signature Lines',
    '',
    ...releaseDocVerificationSummary.stableDigestLines.map((line) => `- \`${line}\``),
  ];
  const releaseDocDigestMarkdownArtifact = `${releaseDocDigestMarkdownLines.join('\n')}\n`;
  fs.writeFileSync(reportPath, `${JSON.stringify(smokeReport, null, 2)}\n`, 'utf8');
  const releaseHandoffIndexArtifactOrder = [
    'browserReport',
    'browserScreenshot',
    'digestJson',
    'digestText',
    'digestMarkdown',
    'manifestJson',
    'manifestText',
    'manifestMarkdown',
  ];
  const releaseHandoffIndexArtifactGroups = {
    browser: ['browserReport', 'browserScreenshot'],
    digest: ['digestJson', 'digestText', 'digestMarkdown'],
    manifest: ['manifestJson', 'manifestText', 'manifestMarkdown'],
  };
  const releaseHandoffIndexArtifacts = {
    browserReport: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(reportPath),
    },
    browserScreenshot: {
      descriptorKind: 'binary',
      ...buildBinaryArtifactDescriptor(screenshotPath, {
        height: screenshotDimensions.height,
        width: screenshotDimensions.width,
      }),
    },
    digestJson: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffDigestArtifactPath),
    },
    digestText: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffDigestTextArtifactPath),
    },
    digestMarkdown: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffDigestMarkdownArtifactPath),
    },
    manifestJson: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffManifestPath),
    },
    manifestText: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffManifestTextPath),
    },
    manifestMarkdown: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseHandoffManifestMarkdownPath),
    },
  };
  const releaseHandoffIndexBundleLines = releaseHandoffIndexArtifactOrder.map((name) =>
    buildReleaseDocIndexBundleLine(name, releaseHandoffIndexArtifacts[name]),
  );
  const releaseHandoffIndexBundleByArtifact = Object.fromEntries(
    releaseHandoffIndexArtifactOrder.map((name, index) => {
      const signatureLine = releaseHandoffIndexBundleLines[index];
      return [
        name,
        {
          ...releaseHandoffIndexArtifacts[name],
          signatureLine,
          signatureSha256: createHash('sha256').update(signatureLine).digest('hex'),
        },
      ];
    }),
  );
  const releaseHandoffIndexBundleSha256 = createHash('sha256')
    .update(releaseHandoffIndexBundleLines.join('\n'))
    .digest('hex');
  const releaseHandoffIndexBundleOverviewLine = [
    `artifactCount=${releaseHandoffIndexArtifactOrder.length}`,
    `groups=${Object.keys(releaseHandoffIndexArtifactGroups).join(',')}`,
    `previewTotalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `previewStableDigestSha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `openTotalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `openStableDigestSha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `bundleSha256=${releaseHandoffIndexBundleSha256}`,
  ].join('|');
  const releaseHandoffIndexArtifact = {
    artifactVersion: 'execution-v1-release-handoff-index/v1',
    artifactBundleByArtifactName: releaseHandoffIndexBundleByArtifact,
    artifactBundleLineCount: releaseHandoffIndexBundleLines.length,
    artifactBundleLines: releaseHandoffIndexBundleLines,
    artifactBundleOverviewLine: releaseHandoffIndexBundleOverviewLine,
    artifactBundleSha256: releaseHandoffIndexBundleSha256,
    artifactGroupOrder: Object.keys(releaseHandoffIndexArtifactGroups),
    artifactGroups: releaseHandoffIndexArtifactGroups,
    artifactOrder: releaseHandoffIndexArtifactOrder,
    artifacts: releaseHandoffIndexArtifacts,
    generatedAt: smokeReport.generatedAt,
    releaseHandoffDigestArtifactPath,
    releaseHandoffDigestTextArtifactPath,
    releaseHandoffDigestMarkdownArtifactPath,
    releaseHandoffManifestPath,
    releaseHandoffManifestTextPath,
    releaseHandoffManifestMarkdownPath,
    releaseHandoffIndexPath,
    releaseHandoffIndexTextPath,
    releaseHandoffIndexMarkdownPath,
    releaseHandoffOpenErrorFreeSessions: releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    releaseHandoffOpenOverviewLine: releaseHandoffOpenLinkVerificationSummary.overviewLine,
    releaseHandoffOpenStableDigestSha256: releaseHandoffOpenLinkVerificationSummary.stableSha256,
    releaseHandoffOpenTotalSessions: releaseHandoffOpenLinkVerificationSummary.totalSessions,
    releaseHandoffPreviewErrorFreeSessions: releaseHandoffLinkVerificationSummary.errorFreeSessions,
    releaseHandoffPreviewOverviewLine: releaseHandoffLinkVerificationSummary.overviewLine,
    releaseHandoffPreviewStableDigestSha256: releaseHandoffLinkVerificationSummary.stableSha256,
    releaseHandoffPreviewTotalSessions: releaseHandoffLinkVerificationSummary.totalSessions,
    releaseHandoffSummaryCopyExactMatchCount: releaseHandoffSummaryCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyOverviewLine: releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyStableDigestSha256: releaseHandoffSummaryCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyTotalChecks: releaseHandoffSummaryCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryCopyPreviewExactMatchCount: releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryCopyPreviewOverviewLine: releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryCopyPreviewStableDigestSha256: releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryCopyPreviewTotalArtifacts: releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyExactMatchCount: releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyOverviewLine: releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyStableDigestSha256: releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyTotalChecks: releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewOverviewLine: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewExactMatchCount: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewOverviewLine: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts,
    releaseHandoffSummaryDetailCopyPreviewLineCopyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyTotalChecks: releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyExactMatchCount: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyOverviewLine: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyStableDigestSha256: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyTotalArtifacts: releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyTotalArtifacts: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyOverviewLine: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyStableDigestSha256: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummarySha256,
    releaseHandoffSummaryDetailCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewBodyVerificationSummary: releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary,
    releaseHandoffSummaryStableLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary,
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary,
    releaseHandoffSummaryCopyVerificationSummary,
    releaseHandoffStableDigestSha256: releaseHandoffLinkVerificationSummary.stableSha256,
    releaseHandoffSummaryReportPath: reportPath,
    screenshotPath,
    screenshotSha256,
    repoDir,
  };
  fs.writeFileSync(releaseHandoffIndexPath, `${JSON.stringify(releaseHandoffIndexArtifact, null, 2)}\n`, 'utf8');
  const releaseHandoffIndexTextLines = [
    'artifactVersion=execution-v1-release-handoff-index-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `indexPath=${releaseHandoffIndexPath}`,
    `previewStableDigestSha256=${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `openStableDigestSha256=${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `previewTotalSessions=${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `previewErrorFreeSessions=${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `openTotalSessions=${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `openErrorFreeSessions=${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `summaryCopyTotalChecks=${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `summaryCopyExactMatchCount=${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `summaryCopyStableSha256=${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `summaryCopyPreviewTotalArtifacts=${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryCopyPreviewExactMatchCount=${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryCopyPreviewStableSha256=${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyTotalChecks=${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyExactMatchCount=${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyStableSha256=${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewTotalArtifacts=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryStableLineCopyPreviewExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewStableSha256=${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256=${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewStableSha256=${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyTotalChecks=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `summaryDetailCopyPreviewLineCopyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `summaryDetailCopyPreviewLineCopyBodyTotalArtifacts=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `summaryDetailCopyPreviewLineCopyBodyExactMatchCount=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `summaryDetailCopyPreviewLineCopyBodyStableSha256=${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `structuredSummarySha256=${releaseHandoffStructuredSummarySha256}`,
    `screenshotSha256=${screenshotSha256}`,
    `artifactGroups=${Object.keys(releaseHandoffIndexArtifactGroups).join(',')}`,
    '---',
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    releaseHandoffLinkVerificationSummary.overviewLine,
    '---summary-copy---',
    releaseHandoffSummaryCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines,
    '---summary-copy-preview---',
    releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy---',
    releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy---',
    releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview---',
    releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-stable-line-copy-preview-body-line-copy-body-line-copy-body-line-copy---',
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview---',
    releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines,
    '---summary-detail-copy-preview-line-copy-body---',
    releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine,
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines,
    '---structured-summary---',
    releaseHandoffStructuredSummaryOverviewLine,
    ...releaseHandoffStructuredSummaryLines,
    releaseHandoffIndexBundleOverviewLine,
    ...releaseHandoffIndexArtifactOrder.map(
      (artifactName) => releaseHandoffIndexBundleByArtifact[artifactName].signatureLine,
    ),
  ];
  const releaseHandoffIndexTextArtifact = `${releaseHandoffIndexTextLines.join('\n')}\n`;
  fs.writeFileSync(releaseHandoffIndexTextPath, releaseHandoffIndexTextArtifact, 'utf8');
  const releaseHandoffIndexMarkdownLines = [
    '# Execution V1 Release Handoff Index',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- indexPath: ${releaseHandoffIndexPath}`,
    `- previewStableDigestSha256: ${releaseHandoffLinkVerificationSummary.stableSha256}`,
    `- openStableDigestSha256: ${releaseHandoffOpenLinkVerificationSummary.stableSha256}`,
    `- previewTotalSessions: ${releaseHandoffLinkVerificationSummary.totalSessions}`,
    `- previewErrorFreeSessions: ${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    `- openTotalSessions: ${releaseHandoffOpenLinkVerificationSummary.totalSessions}`,
    `- openErrorFreeSessions: ${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    `- summaryCopyTotalChecks: ${releaseHandoffSummaryCopyVerificationSummary.totalChecks}`,
    `- summaryCopyExactMatchCount: ${releaseHandoffSummaryCopyVerificationSummary.exactMatchCount}`,
    `- summaryCopyStableSha256: ${releaseHandoffSummaryCopyVerificationSummary.stableSha256}`,
    `- summaryCopyPreviewTotalArtifacts: ${releaseHandoffSummaryCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryCopyPreviewExactMatchCount: ${releaseHandoffSummaryCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryCopyPreviewStableSha256: ${releaseHandoffSummaryCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyTotalChecks: ${releaseHandoffSummaryDetailCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyStableSha256: ${releaseHandoffSummaryDetailCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewTotalArtifacts: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryStableLineCopyPreviewExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyTotalChecks: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyExactMatchCount: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyStableSha256: ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewStableSha256: ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyTotalChecks: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.totalChecks}`,
    `- summaryDetailCopyPreviewLineCopyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableSha256}`,
    `- summaryDetailCopyPreviewLineCopyBodyTotalArtifacts: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.totalArtifacts}`,
    `- summaryDetailCopyPreviewLineCopyBodyExactMatchCount: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.exactMatchCount}`,
    `- summaryDetailCopyPreviewLineCopyBodyStableSha256: ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableSha256}`,
    `- structuredSummarySha256: ${releaseHandoffStructuredSummarySha256}`,
    `- screenshotSha256: ${screenshotSha256}`,
    `- artifactGroups: ${Object.keys(releaseHandoffIndexArtifactGroups).join(', ')}`,
    '',
    '## Link Verification Overview',
    '',
    `- ${releaseHandoffLinkVerificationSummary.overviewLine}`,
    '',
    '## Open-Link Verification Overview',
    '',
    `- ${releaseHandoffOpenLinkVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Verification Overview',
    '',
    `- ${releaseHandoffSummaryCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Stable-Line-Copy Preview Body Line Copy Body Line Copy Body Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Overview',
    '',
    `- ${releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.overviewLine}`,
    '',
    '## Summary-Detail-Copy Preview Line Copy Body Stable Signature Lines',
    '',
    ...releaseHandoffSummaryDetailCopyPreviewLineCopyBodyVerificationSummary.stableLines.map((line) => `- \`${line}\``),
    '',
    '## Structured Summary Signature',
    '',
    `- ${releaseHandoffStructuredSummaryOverviewLine}`,
    '',
    ...releaseHandoffStructuredSummaryLines.map((line) => `- \`${line}\``),
    '',
    '## Bundle Overview',
    '',
    `- ${releaseHandoffIndexBundleOverviewLine}`,
    '',
    '## Artifact Signature Lines',
    '',
    ...releaseHandoffIndexArtifactOrder.map(
      (artifactName) => `- \`${releaseHandoffIndexBundleByArtifact[artifactName].signatureLine}\``,
    ),
  ];
  const releaseHandoffIndexMarkdownArtifact = `${releaseHandoffIndexMarkdownLines.join('\n')}\n`;
  fs.writeFileSync(releaseHandoffIndexMarkdownPath, releaseHandoffIndexMarkdownArtifact, 'utf8');
  fs.writeFileSync(releaseDocDigestArtifactPath, `${JSON.stringify(releaseDocDigestArtifact, null, 2)}\n`, 'utf8');
  fs.writeFileSync(releaseDocDigestTextArtifactPath, releaseDocDigestTextArtifact, 'utf8');
  fs.writeFileSync(releaseDocDigestMarkdownArtifactPath, releaseDocDigestMarkdownArtifact, 'utf8');
  const releaseDocDigestArtifactOrder = ['jsonDigest', 'markdownDigest', 'textDigest'];
  const releaseDocDigestArtifacts = {
    jsonDigest: buildTextArtifactDescriptor(releaseDocDigestArtifactPath),
    markdownDigest: buildTextArtifactDescriptor(releaseDocDigestMarkdownArtifactPath),
    textDigest: buildTextArtifactDescriptor(releaseDocDigestTextArtifactPath),
  };
  const releaseDocDigestBundleLines = releaseDocDigestArtifactOrder.map((name) =>
    buildArtifactBundleLine(name, releaseDocDigestArtifacts[name]),
  );
  const releaseDocDigestBundleByArtifact = Object.fromEntries(
    releaseDocDigestArtifactOrder.map((name, index) => {
      const signatureLine = releaseDocDigestBundleLines[index];
      return [
        name,
        {
          bytes: releaseDocDigestArtifacts[name].bytes,
          lineCount: releaseDocDigestArtifacts[name].lineCount,
          path: releaseDocDigestArtifacts[name].path,
          sha256: releaseDocDigestArtifacts[name].sha256,
          signatureLine,
          signatureSha256: createHash('sha256').update(signatureLine).digest('hex'),
        },
      ];
    }),
  );
  const releaseDocDigestBundleSha256 = createHash('sha256')
    .update(releaseDocDigestBundleLines.join('\n'))
    .digest('hex');
  const releaseDocDigestBundleOverviewLine = [
    `artifactCount=${releaseDocDigestArtifactOrder.length}`,
    `artifacts=${releaseDocDigestArtifactOrder.join(',')}`,
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `stableDigestSha256=${releaseDocVerificationSummary.stableDigestSha256}`,
    `bundleSha256=${releaseDocDigestBundleSha256}`,
  ].join('|');
  const releaseDocDigestManifest = {
    artifactVersion: 'execution-v1-release-doc-manifest/v1',
    artifactBundleLineCount: releaseDocDigestBundleLines.length,
    artifactBundleByArtifactName: releaseDocDigestBundleByArtifact,
    artifactBundleLines: releaseDocDigestBundleLines,
    artifactBundleOverviewLine: releaseDocDigestBundleOverviewLine,
    artifactBundleSha256: releaseDocDigestBundleSha256,
    artifactOrder: releaseDocDigestArtifactOrder,
    artifacts: releaseDocDigestArtifacts,
    docKinds: expectedReleaseDocKinds,
    generatedAt: smokeReport.generatedAt,
    overallExactMatch: releaseDocVerificationSummary.overallExactMatch,
    releaseDocDigestArtifactPath,
    releaseDocIndexPath,
    releaseDocDigestManifestPath,
    releaseDocDigestManifestMarkdownPath,
    releaseDocDigestManifestTextPath,
    releaseDocDigestMarkdownArtifactPath,
    releaseDocDigestTextArtifactPath,
    releaseDocStableDigestSha256: releaseDocVerificationSummary.stableDigestSha256,
    releaseDocSummaryReportPath: reportPath,
    repoDir,
  };
  fs.writeFileSync(releaseDocDigestManifestPath, `${JSON.stringify(releaseDocDigestManifest, null, 2)}\n`, 'utf8');
  const releaseDocDigestManifestTextLines = [
    'artifactVersion=execution-v1-release-doc-manifest-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `manifestPath=${releaseDocDigestManifestPath}`,
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `stableDigestSha256=${releaseDocVerificationSummary.stableDigestSha256}`,
    `bundleSha256=${releaseDocDigestBundleSha256}`,
    '---',
    releaseDocDigestBundleOverviewLine,
    ...releaseDocDigestArtifactOrder.map(
      (artifactName) => releaseDocDigestBundleByArtifact[artifactName].signatureLine,
    ),
  ];
  const releaseDocDigestManifestTextArtifact = `${releaseDocDigestManifestTextLines.join('\n')}\n`;
  fs.writeFileSync(releaseDocDigestManifestTextPath, releaseDocDigestManifestTextArtifact, 'utf8');
  const releaseDocDigestManifestMarkdownLines = [
    '# Execution V1 Release Doc Manifest',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- manifestPath: ${releaseDocDigestManifestPath}`,
    `- overallExactMatch: ${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `- stableDigestSha256: ${releaseDocVerificationSummary.stableDigestSha256}`,
    `- bundleSha256: ${releaseDocDigestBundleSha256}`,
    '',
    '## Bundle Overview',
    '',
    `- ${releaseDocDigestBundleOverviewLine}`,
    '',
    '## Artifact Signature Lines',
    '',
    ...releaseDocDigestArtifactOrder.map(
      (artifactName) => `- \`${releaseDocDigestBundleByArtifact[artifactName].signatureLine}\``,
    ),
  ];
  const releaseDocDigestManifestMarkdownArtifact = `${releaseDocDigestManifestMarkdownLines.join('\n')}\n`;
  fs.writeFileSync(releaseDocDigestManifestMarkdownPath, releaseDocDigestManifestMarkdownArtifact, 'utf8');
  const releaseDocIndexArtifactOrder = [
    'browserReport',
    'browserScreenshot',
    'digestJson',
    'digestMarkdown',
    'digestText',
    'manifestJson',
    'manifestMarkdown',
    'manifestText',
  ];
  const releaseDocIndexArtifactGroups = {
    browser: ['browserReport', 'browserScreenshot'],
    digest: ['digestJson', 'digestMarkdown', 'digestText'],
    manifest: ['manifestJson', 'manifestMarkdown', 'manifestText'],
  };
  const releaseDocIndexArtifacts = {
    browserReport: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(reportPath),
    },
    browserScreenshot: {
      descriptorKind: 'binary',
      ...buildBinaryArtifactDescriptor(screenshotPath, {
        height: screenshotDimensions.height,
        width: screenshotDimensions.width,
      }),
    },
    digestJson: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestArtifactPath),
    },
    digestMarkdown: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestMarkdownArtifactPath),
    },
    digestText: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestTextArtifactPath),
    },
    manifestJson: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestManifestPath),
    },
    manifestMarkdown: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestManifestMarkdownPath),
    },
    manifestText: {
      descriptorKind: 'text',
      ...buildTextArtifactDescriptor(releaseDocDigestManifestTextPath),
    },
  };
  const releaseDocIndexBundleLines = releaseDocIndexArtifactOrder.map((name) =>
    buildReleaseDocIndexBundleLine(name, releaseDocIndexArtifacts[name]),
  );
  const releaseDocIndexBundleByArtifact = Object.fromEntries(
    releaseDocIndexArtifactOrder.map((name, index) => {
      const signatureLine = releaseDocIndexBundleLines[index];
      return [
        name,
        {
          ...releaseDocIndexArtifacts[name],
          signatureLine,
          signatureSha256: createHash('sha256').update(signatureLine).digest('hex'),
        },
      ];
    }),
  );
  const releaseDocIndexBundleSha256 = createHash('sha256')
    .update(releaseDocIndexBundleLines.join('\n'))
    .digest('hex');
  const releaseDocIndexBundleOverviewLine = [
    `artifactCount=${releaseDocIndexArtifactOrder.length}`,
    `groups=${Object.keys(releaseDocIndexArtifactGroups).join(',')}`,
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `stableDigestSha256=${releaseDocVerificationSummary.stableDigestSha256}`,
    `bundleSha256=${releaseDocIndexBundleSha256}`,
  ].join('|');
  const releaseDocIndexArtifact = {
    artifactVersion: 'execution-v1-release-doc-index/v1',
    artifactBundleByArtifactName: releaseDocIndexBundleByArtifact,
    artifactBundleLineCount: releaseDocIndexBundleLines.length,
    artifactBundleLines: releaseDocIndexBundleLines,
    artifactBundleOverviewLine: releaseDocIndexBundleOverviewLine,
    artifactBundleSha256: releaseDocIndexBundleSha256,
    artifactGroupOrder: Object.keys(releaseDocIndexArtifactGroups),
    artifactGroups: releaseDocIndexArtifactGroups,
    artifactOrder: releaseDocIndexArtifactOrder,
    artifacts: releaseDocIndexArtifacts,
    docKinds: expectedReleaseDocKinds,
    generatedAt: smokeReport.generatedAt,
    overallExactMatch: releaseDocVerificationSummary.overallExactMatch,
    releaseDocDigestArtifactPath,
    releaseDocDigestManifestPath,
    releaseDocDigestManifestMarkdownPath,
    releaseDocDigestManifestTextPath,
    releaseDocDigestMarkdownArtifactPath,
    releaseDocDigestTextArtifactPath,
    releaseDocIndexPath,
    releaseDocIndexMarkdownPath,
    releaseDocIndexTextPath,
    releaseDocStableDigestSha256: releaseDocVerificationSummary.stableDigestSha256,
    releaseDocSummaryReportPath: reportPath,
    screenshotPath,
    screenshotSha256,
    repoDir,
  };
  fs.writeFileSync(releaseDocIndexPath, `${JSON.stringify(releaseDocIndexArtifact, null, 2)}\n`, 'utf8');
  const releaseDocIndexTextLines = [
    'artifactVersion=execution-v1-release-doc-index-text/v1',
    `generatedAt=${smokeReport.generatedAt}`,
    `reportPath=${reportPath}`,
    `indexPath=${releaseDocIndexPath}`,
    `overallExactMatch=${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `stableDigestSha256=${releaseDocVerificationSummary.stableDigestSha256}`,
    `screenshotSha256=${screenshotSha256}`,
    `artifactGroups=${Object.keys(releaseDocIndexArtifactGroups).join(',')}`,
    '---',
    releaseDocIndexBundleOverviewLine,
    ...releaseDocIndexArtifactOrder.map(
      (artifactName) => releaseDocIndexBundleByArtifact[artifactName].signatureLine,
    ),
  ];
  const releaseDocIndexTextArtifact = `${releaseDocIndexTextLines.join('\n')}\n`;
  fs.writeFileSync(releaseDocIndexTextPath, releaseDocIndexTextArtifact, 'utf8');
  const releaseDocIndexMarkdownLines = [
    '# Execution V1 Release Doc Index',
    '',
    `- generatedAt: ${smokeReport.generatedAt}`,
    `- reportPath: ${reportPath}`,
    `- indexPath: ${releaseDocIndexPath}`,
    `- overallExactMatch: ${releaseDocVerificationSummary.overallExactMatch ? 'true' : 'false'}`,
    `- stableDigestSha256: ${releaseDocVerificationSummary.stableDigestSha256}`,
    `- screenshotSha256: ${screenshotSha256}`,
    `- artifactGroups: ${Object.keys(releaseDocIndexArtifactGroups).join(', ')}`,
    '',
    '## Bundle Overview',
    '',
    `- ${releaseDocIndexBundleOverviewLine}`,
    '',
    '## Artifact Signature Lines',
    '',
    ...releaseDocIndexArtifactOrder.map(
      (artifactName) => `- \`${releaseDocIndexBundleByArtifact[artifactName].signatureLine}\``,
    ),
  ];
  const releaseDocIndexMarkdownArtifact = `${releaseDocIndexMarkdownLines.join('\n')}\n`;
  fs.writeFileSync(releaseDocIndexMarkdownPath, releaseDocIndexMarkdownArtifact, 'utf8');
  assert.equal(fs.existsSync(reportPath), true, `expected report at ${reportPath}`);
  assert.equal(
    fs.existsSync(releaseHandoffDigestArtifactPath),
    true,
    `expected release handoff digest artifact at ${releaseHandoffDigestArtifactPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffDigestTextArtifactPath),
    true,
    `expected release handoff digest text artifact at ${releaseHandoffDigestTextArtifactPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffDigestMarkdownArtifactPath),
    true,
    `expected release handoff digest markdown artifact at ${releaseHandoffDigestMarkdownArtifactPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffManifestPath),
    true,
    `expected release handoff manifest artifact at ${releaseHandoffManifestPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffManifestTextPath),
    true,
    `expected release handoff manifest text artifact at ${releaseHandoffManifestTextPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffManifestMarkdownPath),
    true,
    `expected release handoff manifest markdown artifact at ${releaseHandoffManifestMarkdownPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffIndexPath),
    true,
    `expected release handoff index artifact at ${releaseHandoffIndexPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffIndexTextPath),
    true,
    `expected release handoff index text artifact at ${releaseHandoffIndexTextPath}`,
  );
  assert.equal(
    fs.existsSync(releaseHandoffIndexMarkdownPath),
    true,
    `expected release handoff index markdown artifact at ${releaseHandoffIndexMarkdownPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestArtifactPath),
    true,
    `expected release doc digest artifact at ${releaseDocDigestArtifactPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocIndexPath),
    true,
    `expected release doc index artifact at ${releaseDocIndexPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocIndexMarkdownPath),
    true,
    `expected release doc index markdown artifact at ${releaseDocIndexMarkdownPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocIndexTextPath),
    true,
    `expected release doc index text artifact at ${releaseDocIndexTextPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestManifestPath),
    true,
    `expected release doc digest manifest at ${releaseDocDigestManifestPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestManifestMarkdownPath),
    true,
    `expected release doc digest manifest markdown at ${releaseDocDigestManifestMarkdownPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestManifestTextPath),
    true,
    `expected release doc digest manifest text at ${releaseDocDigestManifestTextPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestTextArtifactPath),
    true,
    `expected release doc digest text artifact at ${releaseDocDigestTextArtifactPath}`,
  );
  assert.equal(
    fs.existsSync(releaseDocDigestMarkdownArtifactPath),
    true,
    `expected release doc digest markdown artifact at ${releaseDocDigestMarkdownArtifactPath}`,
  );
  const persistedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const persistedReleaseHandoffDigestArtifact = JSON.parse(fs.readFileSync(releaseHandoffDigestArtifactPath, 'utf8'));
  const persistedReleaseHandoffDigestTextArtifact = fs.readFileSync(releaseHandoffDigestTextArtifactPath, 'utf8');
  const persistedReleaseHandoffDigestMarkdownArtifact = fs.readFileSync(releaseHandoffDigestMarkdownArtifactPath, 'utf8');
  const persistedReleaseHandoffManifest = JSON.parse(fs.readFileSync(releaseHandoffManifestPath, 'utf8'));
  const persistedReleaseHandoffManifestTextArtifact = fs.readFileSync(releaseHandoffManifestTextPath, 'utf8');
  const persistedReleaseHandoffManifestMarkdownArtifact = fs.readFileSync(releaseHandoffManifestMarkdownPath, 'utf8');
  const persistedReleaseHandoffIndexArtifact = JSON.parse(fs.readFileSync(releaseHandoffIndexPath, 'utf8'));
  const persistedReleaseHandoffIndexTextArtifact = fs.readFileSync(releaseHandoffIndexTextPath, 'utf8');
  const persistedReleaseHandoffIndexMarkdownArtifact = fs.readFileSync(releaseHandoffIndexMarkdownPath, 'utf8');
  const persistedReleaseDocDigestArtifact = JSON.parse(fs.readFileSync(releaseDocDigestArtifactPath, 'utf8'));
  const persistedReleaseDocIndexArtifact = JSON.parse(fs.readFileSync(releaseDocIndexPath, 'utf8'));
  const persistedReleaseDocIndexMarkdownArtifact = fs.readFileSync(releaseDocIndexMarkdownPath, 'utf8');
  const persistedReleaseDocIndexTextArtifact = fs.readFileSync(releaseDocIndexTextPath, 'utf8');
  const persistedReleaseDocDigestManifest = JSON.parse(fs.readFileSync(releaseDocDigestManifestPath, 'utf8'));
  const persistedReleaseDocDigestManifestMarkdownArtifact = fs.readFileSync(releaseDocDigestManifestMarkdownPath, 'utf8');
  const persistedReleaseDocDigestManifestTextArtifact = fs.readFileSync(releaseDocDigestManifestTextPath, 'utf8');
  const persistedReleaseDocDigestTextArtifact = fs.readFileSync(releaseDocDigestTextArtifactPath, 'utf8');
  const persistedReleaseDocDigestMarkdownArtifact = fs.readFileSync(releaseDocDigestMarkdownArtifactPath, 'utf8');
  assert.deepEqual(persistedReport, smokeReport, JSON.stringify({ persistedReport, smokeReport }));
  assert.equal(
    persistedReport.releaseHandoffLinkVerificationSummary.overviewLine.includes(
      `errorFreeSessions=${releaseHandoffLinkVerificationSummary.errorFreeSessions}`,
    ),
    true,
    JSON.stringify(persistedReport.releaseHandoffLinkVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffOpenLinkVerificationSummary.overviewLine.includes(
      `errorFreeSessions=${releaseHandoffOpenLinkVerificationSummary.errorFreeSessions}`,
    ),
    true,
    JSON.stringify(persistedReport.releaseHandoffOpenLinkVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffLinkVerificationSummary.stableLines.length,
    19,
    JSON.stringify(persistedReport.releaseHandoffLinkVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffOpenLinkVerificationSummary.stableLines.length,
    1,
    JSON.stringify(persistedReport.releaseHandoffOpenLinkVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReport.releaseHandoffLinkVerificationSummary.stableSha256),
    true,
    JSON.stringify(persistedReport.releaseHandoffLinkVerificationSummary),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReport.releaseHandoffOpenLinkVerificationSummary.stableSha256),
    true,
    JSON.stringify(persistedReport.releaseHandoffOpenLinkVerificationSummary),
  );
  assert.deepEqual(
    persistedReleaseHandoffDigestArtifact,
    releaseHandoffDigestArtifact,
    JSON.stringify({ persistedReleaseHandoffDigestArtifact, releaseHandoffDigestArtifact }),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffPreviewStableDigestSha256,
    releaseHandoffLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffPreviewOverviewLine,
    releaseHandoffLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffPreviewTotalSessions,
    releaseHandoffLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffPreviewErrorFreeSessions,
    releaseHandoffLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffOpenStableDigestSha256,
    releaseHandoffOpenLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffOpenOverviewLine,
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffOpenTotalSessions,
    releaseHandoffOpenLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffOpenErrorFreeSessions,
    releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffDigestArtifact.releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummary,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffDigestArtifact.releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryLines,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummaryOverviewLine,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestArtifact.releaseHandoffStructuredSummarySha256,
    releaseHandoffStructuredSummarySha256,
    JSON.stringify(persistedReleaseHandoffDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffDigestTextArtifact,
    releaseHandoffDigestTextArtifact,
    JSON.stringify({ persistedReleaseHandoffDigestTextArtifact, releaseHandoffDigestTextArtifact }),
  );
  assert.equal(
    persistedReleaseHandoffDigestMarkdownArtifact,
    releaseHandoffDigestMarkdownArtifact,
    JSON.stringify({ persistedReleaseHandoffDigestMarkdownArtifact, releaseHandoffDigestMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseHandoffManifest,
    releaseHandoffManifest,
    JSON.stringify({ persistedReleaseHandoffManifest, releaseHandoffManifest }),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffPreviewStableDigestSha256,
    releaseHandoffLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffOpenStableDigestSha256,
    releaseHandoffOpenLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffPreviewOverviewLine,
    releaseHandoffLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffOpenOverviewLine,
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffPreviewTotalSessions,
    releaseHandoffLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffPreviewErrorFreeSessions,
    releaseHandoffLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffOpenTotalSessions,
    releaseHandoffOpenLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffOpenErrorFreeSessions,
    releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.deepEqual(
    persistedReleaseHandoffManifest.releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummary,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.deepEqual(
    persistedReleaseHandoffManifest.releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryLines,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummaryOverviewLine,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifest.releaseHandoffStructuredSummarySha256,
    releaseHandoffStructuredSummarySha256,
    JSON.stringify(persistedReleaseHandoffManifest),
  );
  assert.equal(
    persistedReleaseHandoffManifestTextArtifact,
    releaseHandoffManifestTextArtifact,
    JSON.stringify({ persistedReleaseHandoffManifestTextArtifact, releaseHandoffManifestTextArtifact }),
  );
  assert.equal(
    persistedReleaseHandoffManifestMarkdownArtifact,
    releaseHandoffManifestMarkdownArtifact,
    JSON.stringify({ persistedReleaseHandoffManifestMarkdownArtifact, releaseHandoffManifestMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact,
    releaseHandoffIndexArtifact,
    JSON.stringify({ persistedReleaseHandoffIndexArtifact, releaseHandoffIndexArtifact }),
  );
  assert.equal(
    persistedReleaseHandoffIndexTextArtifact,
    releaseHandoffIndexTextArtifact,
    JSON.stringify({ persistedReleaseHandoffIndexTextArtifact, releaseHandoffIndexTextArtifact }),
  );
  assert.equal(
    persistedReleaseHandoffIndexMarkdownArtifact,
    releaseHandoffIndexMarkdownArtifact,
    JSON.stringify({ persistedReleaseHandoffIndexMarkdownArtifact, releaseHandoffIndexMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexMarkdownArtifact.trimEnd().split('\n'),
    releaseHandoffIndexMarkdownLines,
    JSON.stringify({ persistedReleaseHandoffIndexMarkdownArtifact, releaseHandoffIndexMarkdownLines }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestArtifact,
    releaseDocDigestArtifact,
    JSON.stringify({ persistedReleaseDocDigestArtifact, releaseDocDigestArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact,
    releaseDocIndexArtifact,
    JSON.stringify({ persistedReleaseDocIndexArtifact, releaseDocIndexArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifest,
    releaseDocDigestManifest,
    JSON.stringify({ persistedReleaseDocDigestManifest, releaseDocDigestManifest }),
  );
  const persistedScreenshotBuffer = fs.readFileSync(persistedReport.screenshotPath);
  const persistedScreenshotDimensions = parsePngDimensions(persistedScreenshotBuffer);
  const persistedScreenshotStat = fs.statSync(persistedReport.screenshotPath);
  const persistedScreenshotSha256 = createHash('sha256').update(persistedScreenshotBuffer).digest('hex');
  assert.equal(fs.existsSync(persistedReport.artifactPair.reportPath), true, JSON.stringify(persistedReport.artifactPair));
  assert.equal(fs.existsSync(persistedReport.artifactPair.screenshotPath), true, JSON.stringify(persistedReport.artifactPair));
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffDigestArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffDigestTextArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffDigestMarkdownArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffManifestPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffManifestTextPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffManifestMarkdownPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffIndexPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffIndexTextPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseHandoffIndexMarkdownPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocIndexPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocIndexMarkdownPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocIndexTextPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestManifestPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestManifestMarkdownPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestManifestTextPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestTextArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    fs.existsSync(persistedReport.artifactPair.releaseDocDigestMarkdownArtifactPath),
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.deepEqual(
    persistedReport.expectedFullPageDimensions,
    expectedFullPageDimensions,
    JSON.stringify(persistedReport),
  );
  assert.deepEqual(
    persistedReport.screenshotCaptureTarget,
    screenshotCaptureTarget,
    JSON.stringify(persistedReport),
  );
  assert.deepEqual(
    persistedReport.screenshotSurfaceSummary,
    screenshotSurfaceSummary,
    JSON.stringify(persistedReport),
  );
  assert.equal(
    persistedReport.screenshotCaptureContext.viewportWidth,
    screenshotCaptureContext.viewportWidth,
    JSON.stringify(persistedReport),
  );
  assert.equal(
    persistedReport.screenshotCaptureContext.viewportHeight,
    screenshotCaptureContext.viewportHeight,
    JSON.stringify(persistedReport),
  );
  assert.equal(
    persistedReport.screenshotCaptureContext.devicePixelRatio,
    screenshotCaptureContext.devicePixelRatio,
    JSON.stringify(persistedReport),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyLineCopyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary.totalChecks,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyLineCopyBodyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary.totalArtifacts,
    JSON.stringify(persistedReport.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerificationSummary),
  );
  assert.equal(
    persistedReport.artifactPair.releaseHandoffSummaryStableLineCopyPreviewBodyLineCopyBodyLineCopyBodyVerified,
    true,
    JSON.stringify(persistedReport.artifactPair),
  );
  assert.equal(persistedReport.screenshotBytes, persistedScreenshotStat.size, JSON.stringify(persistedReport));
  assert.equal(persistedReport.screenshotWidth, persistedScreenshotDimensions.width, JSON.stringify(persistedReport));
  assert.equal(persistedReport.screenshotHeight, persistedScreenshotDimensions.height, JSON.stringify(persistedReport));
  assert.deepEqual(
    persistedScreenshotDimensions,
    persistedReport.expectedFullPageDimensions,
    JSON.stringify(persistedReport),
  );
  assert.equal(
    persistedReport.screenshotModifiedAt,
    persistedScreenshotStat.mtime.toISOString(),
    JSON.stringify(persistedReport),
  );
  assert.equal(persistedReport.screenshotSha256, persistedScreenshotSha256, JSON.stringify(persistedReport));
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocSummaryReportPath,
    reportPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocDigestArtifactPath,
    releaseDocDigestArtifactPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocDigestManifestPath,
    releaseDocDigestManifestPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocIndexPath,
    releaseDocIndexPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocDigestTextArtifactPath,
    releaseDocDigestTextArtifactPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocDigestMarkdownArtifactPath,
    releaseDocDigestMarkdownArtifactPath,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocDigestArtifact.expectedDocKinds,
    expectedReleaseDocKinds,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.totalExpectedDocKinds,
    releaseDocVerificationSummary.totalExpectedDocKinds,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.exactMatchCount,
    releaseDocVerificationSummary.exactMatchCount,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocDigestArtifact.missingDocKinds,
    releaseDocVerificationSummary.missingDocKinds,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocStableDigestLineCount,
    releaseDocVerificationSummary.stableDigestLineCount,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocStableDigestOverviewLine,
    releaseDocVerificationSummary.stableDigestOverviewLine,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocDigestArtifact.releaseDocStableDigestSha256,
    releaseDocVerificationSummary.stableDigestSha256,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffSummaryReportPath,
    reportPath,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffIndexPath,
    releaseHandoffIndexPath,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.screenshotPath,
    screenshotPath,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.screenshotSha256,
    screenshotSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.artifactGroupOrder,
    Object.keys(releaseHandoffIndexArtifactGroups),
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.artifactGroups,
    releaseHandoffIndexArtifactGroups,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.artifactOrder,
    releaseHandoffIndexArtifactOrder,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifactBundleLineCount,
    releaseHandoffIndexBundleLines.length,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.artifactBundleLines,
    releaseHandoffIndexBundleLines,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.artifactBundleByArtifactName,
    releaseHandoffIndexBundleByArtifact,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifactBundleOverviewLine,
    releaseHandoffIndexBundleOverviewLine,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifactBundleSha256,
    releaseHandoffIndexBundleSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifacts.browserReport.path,
    reportPath,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifacts.browserScreenshot.path,
    screenshotPath,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.artifacts.browserScreenshot.sha256,
    screenshotSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffStableDigestSha256,
    releaseHandoffLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffPreviewStableDigestSha256,
    releaseHandoffLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffPreviewOverviewLine,
    releaseHandoffLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffPreviewTotalSessions,
    releaseHandoffLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffPreviewErrorFreeSessions,
    releaseHandoffLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffOpenStableDigestSha256,
    releaseHandoffOpenLinkVerificationSummary.stableSha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffOpenOverviewLine,
    releaseHandoffOpenLinkVerificationSummary.overviewLine,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffOpenTotalSessions,
    releaseHandoffOpenLinkVerificationSummary.totalSessions,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffOpenErrorFreeSessions,
    releaseHandoffOpenLinkVerificationSummary.errorFreeSessions,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.releaseHandoffStructuredSummary,
    releaseHandoffStructuredSummary,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseHandoffIndexArtifact.releaseHandoffStructuredSummaryLines,
    releaseHandoffStructuredSummaryLines,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffStructuredSummaryOverviewLine,
    releaseHandoffStructuredSummaryOverviewLine,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.equal(
    persistedReleaseHandoffIndexArtifact.releaseHandoffStructuredSummarySha256,
    releaseHandoffStructuredSummarySha256,
    JSON.stringify(persistedReleaseHandoffIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocDigestArtifact.releaseDocStableDigestLines,
    releaseDocVerificationSummary.stableDigestLines,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocDigestArtifact.releaseDocStableDigestByDocKind,
    releaseDocVerificationSummary.stableDigestByDocKind,
    JSON.stringify(persistedReleaseDocDigestArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.releaseDocSummaryReportPath,
    reportPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.releaseDocIndexPath,
    releaseDocIndexPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.releaseDocIndexMarkdownPath,
    releaseDocIndexMarkdownPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.releaseDocIndexTextPath,
    releaseDocIndexTextPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.screenshotPath,
    screenshotPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.screenshotSha256,
    screenshotSha256,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.docKinds,
    expectedReleaseDocKinds,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.artifactGroupOrder,
    Object.keys(releaseDocIndexArtifactGroups),
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.artifactGroups,
    releaseDocIndexArtifactGroups,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.artifactOrder,
    releaseDocIndexArtifactOrder,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifactBundleLineCount,
    releaseDocIndexBundleLines.length,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.artifactBundleLines,
    releaseDocIndexBundleLines,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.deepEqual(
    persistedReleaseDocIndexArtifact.artifactBundleByArtifactName,
    releaseDocIndexBundleByArtifact,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifactBundleOverviewLine,
    releaseDocIndexBundleOverviewLine,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifactBundleSha256,
    releaseDocIndexBundleSha256,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifacts.browserReport.path,
    reportPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifacts.browserScreenshot.path,
    screenshotPath,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifacts.browserScreenshot.sha256,
    screenshotSha256,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifacts.browserScreenshot.width,
    screenshotDimensions.width,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexArtifact.artifacts.browserScreenshot.height,
    screenshotDimensions.height,
    JSON.stringify(persistedReleaseDocIndexArtifact),
  );
  assert.equal(
    persistedReleaseDocIndexMarkdownArtifact,
    releaseDocIndexMarkdownArtifact,
    JSON.stringify({ persistedReleaseDocIndexMarkdownArtifact, releaseDocIndexMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocIndexMarkdownArtifact.trimEnd().split('\n'),
    releaseDocIndexMarkdownLines,
    JSON.stringify({ persistedReleaseDocIndexMarkdownArtifact, releaseDocIndexMarkdownLines }),
  );
  assert.equal(
    persistedReleaseDocIndexTextArtifact,
    releaseDocIndexTextArtifact,
    JSON.stringify({ persistedReleaseDocIndexTextArtifact, releaseDocIndexTextArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocIndexTextArtifact.trimEnd().split('\n'),
    releaseDocIndexTextLines,
    JSON.stringify({ persistedReleaseDocIndexTextArtifact, releaseDocIndexTextLines }),
  );
  for (const artifactName of releaseDocIndexArtifactOrder) {
    const bundleEntry = persistedReleaseDocIndexArtifact.artifactBundleByArtifactName[artifactName];
    assert.equal(Boolean(bundleEntry), true, JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }));
    assert.equal(
      bundleEntry.signatureLine,
      buildReleaseDocIndexBundleLine(artifactName, persistedReleaseDocIndexArtifact.artifacts[artifactName]),
      JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
    );
    assert.equal(
      bundleEntry.signatureSha256,
      createHash('sha256').update(bundleEntry.signatureLine).digest('hex'),
      JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
    );
    assert.equal(
      bundleEntry.path,
      persistedReleaseDocIndexArtifact.artifacts[artifactName].path,
      JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
    );
    assert.equal(
      bundleEntry.bytes,
      persistedReleaseDocIndexArtifact.artifacts[artifactName].bytes,
      JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
    );
    if (typeof persistedReleaseDocIndexArtifact.artifacts[artifactName].lineCount === 'number') {
      assert.equal(
        bundleEntry.lineCount,
        persistedReleaseDocIndexArtifact.artifacts[artifactName].lineCount,
        JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
      );
    }
    assert.equal(
      bundleEntry.sha256,
      persistedReleaseDocIndexArtifact.artifacts[artifactName].sha256,
      JSON.stringify({ artifactName, persistedReleaseDocIndexArtifact }),
    );
  }
  assert.equal(
    persistedReleaseDocDigestManifest.releaseDocSummaryReportPath,
    reportPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifest.docKinds,
    expectedReleaseDocKinds,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.releaseDocStableDigestSha256,
    releaseDocVerificationSummary.stableDigestSha256,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.releaseDocIndexPath,
    releaseDocIndexPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.releaseDocDigestManifestTextPath,
    releaseDocDigestManifestTextPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.releaseDocDigestManifestMarkdownPath,
    releaseDocDigestManifestMarkdownPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifest.artifactOrder,
    releaseDocDigestArtifactOrder,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifactBundleLineCount,
    releaseDocDigestArtifactOrder.length,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifest.artifactBundleLines,
    releaseDocDigestBundleLines,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifest.artifactBundleByArtifactName,
    releaseDocDigestBundleByArtifact,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifactBundleOverviewLine,
    releaseDocDigestBundleOverviewLine,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifactBundleSha256,
    releaseDocDigestBundleSha256,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.jsonDigest.path,
    releaseDocDigestArtifactPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.textDigest.path,
    releaseDocDigestTextArtifactPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.markdownDigest.path,
    releaseDocDigestMarkdownArtifactPath,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  for (const artifactName of releaseDocDigestArtifactOrder) {
    const bundleEntry = persistedReleaseDocDigestManifest.artifactBundleByArtifactName[artifactName];
    assert.equal(Boolean(bundleEntry), true, JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }));
    assert.equal(
      bundleEntry.signatureLine,
      buildArtifactBundleLine(artifactName, persistedReleaseDocDigestManifest.artifacts[artifactName]),
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
    assert.equal(
      bundleEntry.signatureSha256,
      createHash('sha256').update(bundleEntry.signatureLine).digest('hex'),
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
    assert.equal(
      bundleEntry.path,
      persistedReleaseDocDigestManifest.artifacts[artifactName].path,
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
    assert.equal(
      bundleEntry.bytes,
      persistedReleaseDocDigestManifest.artifacts[artifactName].bytes,
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
    assert.equal(
      bundleEntry.lineCount,
      persistedReleaseDocDigestManifest.artifacts[artifactName].lineCount,
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
    assert.equal(
      bundleEntry.sha256,
      persistedReleaseDocDigestManifest.artifacts[artifactName].sha256,
      JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
    );
  assert.equal(
    /^[a-f0-9]{64}$/.test(bundleEntry.signatureSha256),
    true,
    JSON.stringify({ artifactName, persistedReleaseDocDigestManifest }),
  );
  }
  assert.equal(
    persistedReleaseDocDigestManifestTextArtifact,
    releaseDocDigestManifestTextArtifact,
    JSON.stringify({ persistedReleaseDocDigestManifestTextArtifact, releaseDocDigestManifestTextArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifestTextArtifact.trimEnd().split('\n'),
    releaseDocDigestManifestTextLines,
    JSON.stringify({ persistedReleaseDocDigestManifestTextArtifact, releaseDocDigestManifestTextLines }),
  );
  assert.equal(
    persistedReleaseDocDigestManifestMarkdownArtifact,
    releaseDocDigestManifestMarkdownArtifact,
    JSON.stringify({ persistedReleaseDocDigestManifestMarkdownArtifact, releaseDocDigestManifestMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestManifestMarkdownArtifact.trimEnd().split('\n'),
    releaseDocDigestManifestMarkdownLines,
    JSON.stringify({ persistedReleaseDocDigestManifestMarkdownArtifact, releaseDocDigestManifestMarkdownLines }),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.jsonDigest.lineCount > 1,
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.textDigest.lineCount,
    releaseDocDigestTextLines.length,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifacts.markdownDigest.lineCount,
    releaseDocDigestMarkdownLines.length,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReleaseDocDigestManifest.artifacts.jsonDigest.sha256),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReleaseDocDigestManifest.artifacts.textDigest.sha256),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReleaseDocDigestManifest.artifacts.markdownDigest.sha256),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    /^[a-f0-9]{64}$/.test(persistedReleaseDocDigestManifest.artifactBundleSha256),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifactBundleOverviewLine.includes(`artifacts=${releaseDocDigestArtifactOrder.join(',')}`),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestManifest.artifactBundleOverviewLine.includes(`bundleSha256=${releaseDocDigestBundleSha256}`),
    true,
    JSON.stringify(persistedReleaseDocDigestManifest),
  );
  assert.equal(
    persistedReleaseDocDigestTextArtifact,
    releaseDocDigestTextArtifact,
    JSON.stringify({ persistedReleaseDocDigestTextArtifact, releaseDocDigestTextArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestTextArtifact.trimEnd().split('\n'),
    releaseDocDigestTextLines,
    JSON.stringify({ persistedReleaseDocDigestTextArtifact, releaseDocDigestTextLines }),
  );
  assert.equal(
    persistedReleaseDocDigestMarkdownArtifact,
    releaseDocDigestMarkdownArtifact,
    JSON.stringify({ persistedReleaseDocDigestMarkdownArtifact, releaseDocDigestMarkdownArtifact }),
  );
  assert.deepEqual(
    persistedReleaseDocDigestMarkdownArtifact.trimEnd().split('\n'),
    releaseDocDigestMarkdownLines,
    JSON.stringify({ persistedReleaseDocDigestMarkdownArtifact, releaseDocDigestMarkdownLines }),
  );

  console.log(JSON.stringify(smokeReport, null, 2));
} finally {
  try {
    runPw(['close'], { timeoutMs: 5_000 });
  } catch {}
  for (const handoffSessionId of Object.values(handoffSessionIds)) {
    try {
      runPw(['close'], { session: handoffSessionId, timeoutMs: 5_000 });
    } catch {}
  }

  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  await waitForExit(serverProcess, { timeoutMs: 5_000 });
}

function runCli({ rootDir, args }) {
  const cliPath = path.join(repoDir, 'src', 'cli.mjs');
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : null;
}

function installBrowserGuards({ session = sessionId } = {}) {
  runPw(['--raw', 'run-code', browserGuardScript], { session });
}

function getBrowserErrorState({ session = sessionId } = {}) {
  return runPwJson(
    [
      '--raw',
      'run-code',
      `async (page) => ({
        consoleErrors: page.__codexConsoleErrors || [],
        pageErrors: page.__codexPageErrors || [],
      })`,
    ],
    { session },
  );
}

function runPw(args, { session = sessionId, timeoutMs = 60_000 } = {}) {
  const result = spawnSync('npx', [...playwrightArgsBase, '--session', session, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
    timeout: timeoutMs,
  });

  if (result.error?.code === 'ETIMEDOUT') {
    throw new Error(`playwright-cli timed out (${args.join(' ')}) after ${timeoutMs}ms`);
  }

  if (result.status !== 0) {
    throw new Error(`playwright-cli failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  return String(result.stdout || '').trim();
}

function runPwJson(args, { session = sessionId } = {}) {
  const stdout = runPw(args, { session });
  if (!stdout) {
    return null;
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse playwright-cli JSON output for ${args.join(' ')}\n${stdout}`);
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitForServer(baseUrl, child, serverOutput) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`UI server exited early: ${child.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(150);
  }

  throw new Error(`Timed out waiting for UI server. stdout=${serverOutput.stdout} stderr=${serverOutput.stderr}`);
}

async function waitForExit(child, { timeoutMs = 5_000 } = {}) {
  if (child.exitCode !== null) {
    return;
  }

  await Promise.race([
    new Promise((resolve) => {
      child.once('exit', resolve);
    }),
    delay(timeoutMs),
  ]);

  if (child.exitCode !== null) {
    return;
  }

  child.kill('SIGKILL');
  await Promise.race([
    new Promise((resolve) => {
      child.once('exit', resolve);
    }),
    delay(1_000),
  ]);
}
