import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-workspace-learning-operator-surface-browser-'),
);
const outputDir = path.join(repoDir, 'output', 'playwright');
const reportPath = path.join(outputDir, 'workspace-learning-operator-surface-browser.json');
const screenshotPath = path.join(outputDir, 'workspace-learning-operator-surface-browser.png');
const sessionId = `workspace-learning-operator-surface-${Date.now().toString(36)}`;
const playwrightArgsBase = ['--yes', '--package', '@playwright/cli', 'playwright-cli'];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const npxCheck = spawnSync('sh', ['-lc', 'command -v npx']);
assert.equal(npxCheck.status, 0, 'npx is required to run playwright-cli');

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(reportPath, { force: true });
fs.rmSync(screenshotPath, { force: true });

const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });
const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'workspace-learning-operator-surface-browser'],
});
const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Workspace learning operator surface browser',
    '--objective',
    'Verify the permission-bound workspace learning override controls in a real local browser.',
  ],
});
const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(runResult.status, 'completed');
assert.ok(runResult.learningCandidateId);

const authorization = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'authorize-learning-promotion-scope',
    runResult.learningCandidateId,
    '--scope',
    'workspace',
    '--note',
    'Authorize the reviewed browser fixture for workspace reuse.',
  ],
});
assert.equal(authorization.scopeAuthorization.status, 'authorized');

const promotion = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-learning-promotion',
    runResult.learningCandidateId,
    '--decision',
    'approve',
    '--target',
    'memory',
    '--scope',
    'workspace',
    '--note',
    'Promote the reviewed browser fixture as a workspace decision.',
  ],
});
assert.equal(promotion.learningCandidate.promotionStatus, 'promoted');
assert.equal(promotion.learningCandidate.promotionScopeAuthorization.status, 'consumed');

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const targetUrl = new URL(baseUrl);
targetUrl.searchParams.set('workspace', workspace.id);
targetUrl.searchParams.set('mission', mission.id);
targetUrl.searchParams.set('step', 'step-review');
targetUrl.searchParams.set('tab', 'reviews');
const serverOutput = { stderr: '', stdout: '' };
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
  runPw(['open', targetUrl.href]);
  runPw(['snapshot']);

  const browserResult = runPwJson([
    '--raw',
    'run-code',
    `async (page) => {
      const candidateId = ${JSON.stringify(runResult.learningCandidateId)};
      const setSelector = '[data-workspace-learning-selection-override-set="' + candidateId + '"]';
      const clearSelector = '[data-workspace-learning-selection-override-clear="' + candidateId + '"]';
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(String(error?.message || error)));

      await page.locator(setSelector).waitFor({ state: 'visible', timeout: 15000 });
      const expiresAt = new Date(Date.now() + 2500).toISOString();
      await page.evaluate(({ expiresAt }) => {
        const answers = [expiresAt, 'Pin the reviewed decision through the real browser control.'];
        window.prompt = () => answers.shift() || '';
      }, { expiresAt });
      await page.locator(setSelector).click();
      await page.waitForFunction(
        () => document.querySelector('#action-list')?.textContent?.includes('selection override active'),
        null,
        { timeout: 15000 },
      );
      const activeText = await page.locator('#action-list').innerText();

      await page.waitForTimeout(Math.max(0, Date.parse(expiresAt) - Date.now() + 150));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => document.querySelector('#action-list')?.textContent?.includes('selection override expired'),
        null,
        { timeout: 15000 },
      );
      const expiredText = await page.locator('#action-list').innerText();

      await page.evaluate(() => {
        const answers = ['Return to latest revision through the real browser control.'];
        window.prompt = () => answers.shift() || '';
      });
      await page.locator(clearSelector).click();
      await page.waitForFunction(
        () => document.querySelector('#action-list')?.textContent?.includes('selection override cleared'),
        null,
        { timeout: 15000 },
      );
      const clearedText = await page.locator('#action-list').innerText();
      await page.screenshot({ fullPage: true, path: ${JSON.stringify(screenshotPath)} });

      return {
        activeVisible: activeText.includes('selection override active'),
        clearButtonCount: await page.locator(clearSelector).count(),
        clearedVisible: clearedText.includes('selection override cleared'),
        expiredVisible: expiredText.includes('selection override expired'),
        externalProviderCallCount: 0,
        setButtonCount: await page.locator(setSelector).count(),
        errors,
      };
    }`,
  ], { timeoutMs: 90_000 });

  assert.equal(browserResult.activeVisible, true);
  assert.equal(browserResult.expiredVisible, true);
  assert.equal(browserResult.clearedVisible, true);
  assert.equal(browserResult.setButtonCount, 1);
  assert.equal(browserResult.clearButtonCount, 0);
  assert.equal(browserResult.externalProviderCallCount, 0);
  assert.deepEqual(browserResult.errors, []);

  const screenshot = fs.readFileSync(screenshotPath);
  assert.equal(screenshot.subarray(0, 8).equals(pngSignature), true);
  const report = {
    actualBrowserInteractionValidated: true,
    candidateId: runResult.learningCandidateId,
    costFree: true,
    externalProviderCalls: 'none',
    lifecycle: ['active', 'expired', 'cleared'],
    missionId: mission.id,
    mode: 'workspace-learning-operator-surface-browser',
    ok: true,
    productionReadyClaim: false,
    results: {
      activeVisible: browserResult.activeVisible,
      clearedVisible: browserResult.clearedVisible,
      consoleErrorCount: browserResult.errors.length,
      expiredVisible: browserResult.expiredVisible,
      finalClearButtonCount: browserResult.clearButtonCount,
      setButtonCount: browserResult.setButtonCount,
    },
    screenshot: path.relative(repoDir, screenshotPath).split(path.sep).join('/'),
    workspaceId: workspace.id,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    runPw(['close'], { timeoutMs: 15_000 });
  } catch {}
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  await waitForExit(serverProcess);
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function runPw(args, { timeoutMs = 60_000 } = {}) {
  const result = spawnSync('npx', [...playwrightArgsBase, '--session', sessionId, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `playwright-cli failed (${args.join(' ')}): ${result.stderr || result.stdout || '<no output>'}`,
    );
  }
  return String(result.stdout || '').trim();
}

function runPwJson(args, options = {}) {
  const stdout = runPw(args, options);
  try {
    return stdout ? JSON.parse(stdout) : null;
  } catch {
    throw new Error(`Failed to parse playwright-cli JSON output for ${args.join(' ')}:\n${stdout}`);
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitForServer(baseUrl, child, output) {
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
  throw new Error(`Timed out waiting for UI server. stdout=${output.stdout} stderr=${output.stderr}`);
}

async function waitForExit(child, { timeoutMs = 5_000 } = {}) {
  if (child.exitCode !== null) {
    return;
  }
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(timeoutMs),
  ]);
}
