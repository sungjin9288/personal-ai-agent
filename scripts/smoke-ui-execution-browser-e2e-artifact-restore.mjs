import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const artifactRoot = path.join(repoDir, 'output', 'playwright');
const reportPath = path.join(artifactRoot, 'execution-v1-browser-e2e.json');
const screenshotPath = path.join(artifactRoot, 'execution-v1-browser-e2e.png');
const sentinelReport = `${JSON.stringify(
  {
    artifactVersion: 'execution-v1-browser-e2e-artifact-restore/sentinel',
    mode: 'ui-execution-browser-e2e-artifact-restore',
    ok: true,
  },
  null,
  2,
)}\n`;
const sentinelScreenshot = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxX8AAAAASUVORK5CYII=',
  'base64',
);
const originalReport = readOptionalBuffer(reportPath);
const originalScreenshot = readOptionalBuffer(screenshotPath);

try {
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(reportPath, sentinelReport, 'utf8');
  fs.writeFileSync(screenshotPath, sentinelScreenshot);

  const result = spawnSync('npm', ['run', 'smoke:ui-execution-browser-e2e'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_BROWSER_GUARD_TIMEOUT_MS: '1',
    },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 45_000,
  });

  assert.notEqual(result.status, 0, 'expected forced browser E2E timeout failure');
  assert.equal(result.error?.code === 'ETIMEDOUT', false, result.error?.message || '');
  assert.equal(fs.readFileSync(reportPath, 'utf8'), sentinelReport);
  assert.deepEqual(fs.readFileSync(screenshotPath), sentinelScreenshot);

  console.log(
    JSON.stringify(
      {
        mode: 'ui-execution-browser-e2e-artifact-restore',
        ok: true,
        restoredArtifacts: [
          path.relative(repoDir, reportPath),
          path.relative(repoDir, screenshotPath),
        ],
      },
      null,
      2,
    ),
  );
} finally {
  restoreOptionalBuffer(reportPath, originalReport);
  restoreOptionalBuffer(screenshotPath, originalScreenshot);
}

function readOptionalBuffer(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return null;
  }
  return fs.readFileSync(filePath);
}

function restoreOptionalBuffer(filePath, value) {
  if (value === null) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}
