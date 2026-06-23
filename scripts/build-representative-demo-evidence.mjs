import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const evidenceDir = path.join(repoDir, 'evidence');
const cliLogDir = path.join(evidenceDir, 'cli-logs');
const outputArtifactDir = path.join(evidenceDir, 'output-artifacts');
const screenshotDir = path.join(evidenceDir, 'screenshots');
const replayLogPath = path.join(cliLogDir, 'representative-release-demo-replay.log');
const summaryPath = path.join(outputArtifactDir, 'representative-release-demo-summary.json');
const browserReportEvidencePath = path.join(outputArtifactDir, 'representative-release-demo-browser-e2e.json');
const screenshotEvidencePath = path.join(screenshotDir, 'representative-release-demo-release-status.png');
const browserReportSourcePath = path.join(repoDir, 'output', 'playwright', 'execution-v1-browser-e2e.json');
const screenshotSourcePath = path.join(repoDir, 'output', 'playwright', 'execution-v1-browser-e2e.png');

const commands = [
  ['npm', ['run', 'smoke:representative-demo']],
  ['npm', ['run', 'smoke:execution-v1-status']],
  ['npm', ['run', 'smoke:execution-v1-snapshot']],
  ['npm', ['run', 'smoke:execution-v1-handoff']],
  ['npm', ['run', 'smoke:release-artifact-hygiene']],
  ['npm', ['run', 'smoke:portfolio-zip']],
  ['npm', ['run', 'smoke:pilot-export-package']],
];

fs.mkdirSync(cliLogDir, { recursive: true });
fs.mkdirSync(outputArtifactDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const branch = runGit(['branch', '--show-current']);
const commit = runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();
const results = [];
const logSections = [
  '# Representative Release Demo Replay',
  '',
  `generatedAt=${generatedAt}`,
  `branch=${branch}`,
  `commit=${commit}`,
  '',
];

for (const [command, args] of commands) {
  const label = [command, ...args].join(' ');
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });
  const completedAt = new Date().toISOString();
  const stdout = sanitize(String(result.stdout || ''));
  const stderr = sanitize(String(result.stderr || ''));
  const status = Number(result.status ?? 1);

  results.push({
    command: label,
    completedAt,
    startedAt,
    status,
  });

  logSections.push(`## ${label}`);
  logSections.push(`status=${status}`);
  logSections.push(`startedAt=${startedAt}`);
  logSections.push(`completedAt=${completedAt}`);
  logSections.push('');
  if (stdout) {
    logSections.push('stdout:');
    logSections.push(stdout.trimEnd());
    logSections.push('');
  }
  if (stderr) {
    logSections.push('stderr:');
    logSections.push(stderr.trimEnd());
    logSections.push('');
  }

  if (status !== 0) {
    writeReplayArtifacts({
      browserReportCopied: false,
      commit,
      generatedAt,
      results,
      screenshotCopied: false,
    });
    throw new Error(`${label} failed with status ${status}`);
  }
}

const screenshotCopied = copyIfExists(screenshotSourcePath, screenshotEvidencePath);
const browserReportCopied = copySanitizedTextIfExists(browserReportSourcePath, browserReportEvidencePath);
const screenshotSha256 = screenshotCopied ? sha256File(screenshotEvidencePath) : '';
const browserReportSha256 = browserReportCopied ? sha256File(browserReportEvidencePath) : '';

writeReplayArtifacts({
  browserReportCopied,
  browserReportSha256,
  commit,
  generatedAt,
  results,
  screenshotCopied,
  screenshotSha256,
});

console.log(
  JSON.stringify(
    {
      browserReportCopied,
      commit,
      mode: 'representative-demo-evidence',
      ok: true,
      replayLogPath: formatDisplayPath(replayLogPath),
      screenshotCopied,
      summaryPath: formatDisplayPath(summaryPath),
    },
    null,
    2,
  ),
);

function writeReplayArtifacts({
  browserReportCopied,
  browserReportSha256 = '',
  commit,
  generatedAt,
  results,
  screenshotCopied,
  screenshotSha256 = '',
}) {
  fs.writeFileSync(replayLogPath, `${logSections.join('\n').trimEnd()}\n`, 'utf8');
  fs.writeFileSync(
    summaryPath,
    `${JSON.stringify(
      {
        browserReport: {
          copied: browserReportCopied,
          path: browserReportCopied ? formatDisplayPath(browserReportEvidencePath) : '',
          sha256: browserReportSha256,
        },
        branch,
        commandCount: results.length,
        commands: results,
        commit,
        credentialFree: true,
        demo: 'Representative Demo: Release Readiness Evidence Walkthrough',
        generatedAt,
        note: 'Browser report and screenshot are copied from the latest output/playwright browser E2E artifacts. Refresh them with npm run smoke:ui-execution-browser-e2e when a new screenshot is required.',
        productionReadyClaim: false,
        replayLogPath: formatDisplayPath(replayLogPath),
        screenshot: {
          copied: screenshotCopied,
          path: screenshotCopied ? formatDisplayPath(screenshotEvidencePath) : '',
          sha256: screenshotSha256,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
  return String(result.stdout || '').trim();
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function copySanitizedTextIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  fs.writeFileSync(targetPath, sanitize(fs.readFileSync(sourcePath, 'utf8')), 'utf8');
  return true;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sanitize(value) {
  return String(value || '')
    .replaceAll(repoDir, '<repo>')
    .replaceAll(os.homedir(), '<home>')
    .replace(/\/private\/var\/folders\/[^\s"')]+/g, '<temp>')
    .replace(/\/var\/folders\/[^\s"')]+/g, '<temp>');
}

function formatDisplayPath(filePath) {
  return path.relative(repoDir, filePath).split(path.sep).join('/');
}
