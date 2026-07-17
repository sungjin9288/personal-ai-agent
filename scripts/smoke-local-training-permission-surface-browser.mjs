import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import {
  buildLocalTrainingPermissionCliArgs,
  buildLocalTrainingReadinessFixture,
} from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-training-permission-browser-'),
);
const outputDir = path.join(repoDir, 'output', 'playwright');
const reportPath = path.join(outputDir, 'local-training-permission-surface-browser.json');
const screenshotPath = path.join(outputDir, 'local-training-permission-surface-browser.png');
const sessionId = `local-training-permission-${Date.now().toString(36)}`;
const playwrightArgsBase = ['--yes', '--package', '@playwright/cli', 'playwright-cli'];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const npxCheck = spawnSync('sh', ['-lc', 'command -v npx']);
assert.equal(npxCheck.status, 0, 'npx is required to run playwright-cli');

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(reportPath, { force: true });
fs.rmSync(screenshotPath, { force: true });

const workspacePath = path.join(tempRoot, 'workspace');
const readinessPath = path.join(tempRoot, 'readiness.json');
fs.mkdirSync(workspacePath, { recursive: true });
fs.writeFileSync(
  readinessPath,
  `${JSON.stringify(buildLocalTrainingReadinessFixture({ repoDir }), null, 2)}\n`,
  'utf8',
);
const workspace = runCli({
  args: ['workspace', 'add', workspacePath, '--name', 'local-training-permission-browser'],
  rootDir: tempRoot,
});
const mission = runCli({
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
    'Local training permission browser review',
    '--objective',
    'Approve bounded local model training permission without executing training.',
  ],
  rootDir: tempRoot,
});
const request = runCli({
  args: buildLocalTrainingPermissionCliArgs({
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    missionId: mission.id,
    readinessPath,
  }),
  rootDir: tempRoot,
});

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
      const approvalId = ${JSON.stringify(request.approval.id)};
      const selector = '[data-approval-approve="' + approvalId + '"]';
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(String(error?.message || error)));

      await page.locator(selector).waitFor({ state: 'visible', timeout: 15000 });
      const pendingText = await page.locator('#approval-list').innerText();
      await page.screenshot({ fullPage: true, path: ${JSON.stringify(screenshotPath)} });
      await page.evaluate(() => {
        window.prompt = () => 'Reviewed bounded local execution evidence in the browser.';
      });
      await page.locator(selector).click();
      await page.waitForFunction(
        () => document.querySelector('#approval-list')?.textContent?.includes('승인 대기 항목이 없습니다'),
        null,
        { timeout: 15000 },
      );
      const permission = await page.evaluate(async (id) => {
        const response = await fetch('/api/approvals/' + encodeURIComponent(id) + '/local-training');
        return response.json();
      }, approvalId);
      return {
        approvalButtonCount: await page.locator(selector).count(),
        approved: permission?.permission?.status === 'approved',
        actualModelTrainingExecuted: permission?.actualModelTrainingExecuted,
        evidenceVisible:
          pendingText.includes('license') &&
          pendingText.includes('OS egress isolation') &&
          pendingText.includes('resource envelope') &&
          pendingText.includes('rollback ownership'),
        errors,
        localExecutionAuthorized: permission?.localExecutionAuthorized,
        productionReadyClaim: permission?.productionReadyClaim,
      };
    }`,
  ], { timeoutMs: 90_000 });

  assert.equal(browserResult.approvalButtonCount, 0);
  assert.equal(browserResult.approved, true);
  assert.equal(browserResult.actualModelTrainingExecuted, false);
  assert.equal(browserResult.evidenceVisible, true);
  assert.equal(browserResult.localExecutionAuthorized, true);
  assert.equal(browserResult.productionReadyClaim, false);
  assert.deepEqual(browserResult.errors, []);
  const screenshot = fs.readFileSync(screenshotPath);
  assert.equal(screenshot.subarray(0, 8).equals(pngSignature), true);

  const report = {
    actualBrowserInteractionValidated: true,
    actualModelTrainingExecuted: false,
    approvalId: request.approval.id,
    costFree: true,
    externalProviderCalls: 'none',
    missionId: mission.id,
    mode: 'local-training-permission-surface-browser',
    ok: true,
    productionReadyClaim: false,
    results: {
      approved: browserResult.approved,
      consoleErrorCount: browserResult.errors.length,
      evidenceVisible: browserResult.evidenceVisible,
      localExecutionAuthorized: browserResult.localExecutionAuthorized,
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
    throw new Error(`playwright-cli returned invalid JSON: ${stdout}`);
  }
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const freePort = typeof address === 'object' && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(freePort);
      });
    });
  });
}

async function waitForServer(baseUrl, processHandle, output) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Server exited early. stdout=${output.stdout} stderr=${output.stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The local listener may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for server. stdout=${output.stdout} stderr=${output.stderr}`);
}

async function waitForExit(processHandle) {
  if (processHandle.exitCode !== null) {
    return;
  }
  await new Promise((resolve) => {
    const timeout = setTimeout(() => processHandle.kill('SIGKILL'), 2_000);
    processHandle.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
