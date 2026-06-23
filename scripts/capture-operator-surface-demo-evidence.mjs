import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-operator-surface-evidence-'));
const outputDir = path.join(repoDir, 'output', 'playwright');
const evidenceScreenshotDir = path.join(repoDir, 'evidence', 'screenshots');
const evidenceOutputDir = path.join(repoDir, 'evidence', 'output-artifacts');
const reportPath = path.join(outputDir, 'operator-surface-demo-browser-report.json');
const evidenceReportPath = path.join(evidenceOutputDir, 'operator-surface-demo-browser-report.json');
const sessionId = `operator-${Date.now().toString(36)}`;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const playwrightArgsBase = ['--yes', '--package', '@playwright/cli', 'playwright-cli'];

const captureTargets = [
  {
    detailTab: 'runs',
    evidencePath: path.join(evidenceScreenshotDir, 'operator-surface-mission-run.png'),
    id: 'mission-run',
    outputPath: path.join(outputDir, 'operator-surface-mission-run.png'),
    step: 'step-run',
    waitSelector: '#execution-console',
  },
  {
    detailTab: 'config',
    evidencePath: path.join(evidenceScreenshotDir, 'operator-surface-provider-readiness.png'),
    id: 'provider-readiness',
    outputPath: path.join(outputDir, 'operator-surface-provider-readiness.png'),
    step: 'step-run',
    waitSelector: '#provider-list .provider-item',
  },
  {
    detailTab: 'reviews',
    evidencePath: path.join(evidenceScreenshotDir, 'operator-surface-action-inbox.png'),
    id: 'action-inbox',
    outputPath: path.join(outputDir, 'operator-surface-action-inbox.png'),
    step: 'step-review',
    waitSelector: '#action-list',
  },
];

const npxCheck = spawnSync('sh', ['-lc', 'command -v npx']);
assert.equal(npxCheck.status, 0, 'npx is required to run playwright-cli');

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(evidenceScreenshotDir, { recursive: true });
fs.mkdirSync(evidenceOutputDir, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'operator-surface-evidence-workspace'],
});
const missionTitle = `Operator Surface Evidence ${Date.now().toString(36)}`;
const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    missionTitle,
    '--objective',
    'Capture portfolio browser evidence for mission run, provider readiness, and action inbox operator surfaces.',
  ],
});
const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});
assert.equal(runResult.status, 'reviewed');

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
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
  runPw(['open', baseUrl]);

  const screenshots = [];
  for (const target of captureTargets) {
    const targetUrl = buildTargetUrl(baseUrl, {
      detailTab: target.detailTab,
      missionId: mission.id,
      step: target.step,
      workspaceId: workspace.id,
    });
    const captureState = runPwJson([
      '--raw',
      'run-code',
      `async (page) => {
        await page.goto(${JSON.stringify(targetUrl)}, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
          ({ detailTab, missionTitle, step }) => {
            const params = new URL(window.location.href).searchParams;
            const title = document.querySelector('#mission-title')?.textContent || '';
            const stepPanel = document.querySelector('#' + step);
            const detailPanel = document.querySelector('#detail-' + detailTab);
            return title.includes(missionTitle)
              && params.get('step') === step
              && params.get('tab') === detailTab
              && stepPanel?.getAttribute('aria-hidden') === 'false'
              && detailPanel?.getAttribute('aria-hidden') === 'false';
          },
          {
            detailTab: ${JSON.stringify(target.detailTab)},
            missionTitle: ${JSON.stringify(missionTitle)},
            step: ${JSON.stringify(target.step)},
          },
          { timeout: 15000 },
        );
        await page.locator(${JSON.stringify(target.waitSelector)}).first().waitFor({ state: 'visible', timeout: 15000 });
        await page.evaluate(({ replacements }) => {
          const replaceText = (value) => replacements.reduce(
            (current, replacement) => current.split(replacement.needle).join(replacement.value),
            String(value || ''),
          );
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
          }
          for (const node of textNodes) {
            const nextValue = replaceText(node.nodeValue);
            if (nextValue !== node.nodeValue) {
              node.nodeValue = nextValue;
            }
          }
          for (const element of document.querySelectorAll('input, textarea')) {
            if (typeof element.value === 'string') {
              element.value = replaceText(element.value);
            }
            for (const attribute of ['placeholder', 'title', 'aria-label']) {
              if (element.hasAttribute(attribute)) {
                element.setAttribute(attribute, replaceText(element.getAttribute(attribute)));
              }
            }
          }
        }, {
          replacements: [
            { needle: ${JSON.stringify(repoDir)}, value: '<local-workspace>/personal-ai-agent' },
            { needle: ${JSON.stringify(os.homedir())}, value: '<local-home>' },
            { needle: ${JSON.stringify(tempRoot)}, value: '<temp-runtime>' },
          ].filter((replacement) => replacement.needle),
        });
        await page.screenshot({ fullPage: true, path: ${JSON.stringify(target.outputPath)} });
        return await page.evaluate(() => ({
          actionItemCount: document.querySelectorAll('#action-list .action-item').length,
          activeDetailTab: new URL(window.location.href).searchParams.get('tab') || '',
          activeStep: new URL(window.location.href).searchParams.get('step') || '',
          flowStatus: document.querySelector('#flow-status')?.textContent?.trim() || '',
          heading: document.querySelector('#mission-title')?.textContent?.trim() || '',
          providerCardCount: document.querySelectorAll('#provider-list .provider-item').length,
          runSummary: document.querySelector('#run-stage-summary')?.textContent?.trim() || '',
          title: document.title,
          urlPath: window.location.pathname,
          urlSearch: window.location.search,
        }));
      }`,
    ]);
    assert.equal(captureState.activeStep, target.step);
    assert.equal(captureState.activeDetailTab, target.detailTab);

    fs.copyFileSync(target.outputPath, target.evidencePath);
    const dimensions = parsePngDimensions(fs.readFileSync(target.evidencePath));
    const stat = fs.statSync(target.evidencePath);
    screenshots.push({
      ...captureState,
      bytes: stat.size,
      evidencePath: formatDisplayPath(target.evidencePath),
      height: dimensions.height,
      id: target.id,
      outputPath: formatDisplayPath(target.outputPath),
      sha256: sha256File(target.evidencePath),
      width: dimensions.width,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'operator-surface-demo-browser-evidence',
    ok: true,
    productionReadyClaim: false,
    screenshots,
    source: {
      missionId: mission.id,
      missionStatus: runResult.status,
      workspaceId: workspace.id,
    },
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.copyFileSync(reportPath, evidenceReportPath);

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        ok: true,
        reportPath: formatDisplayPath(evidenceReportPath),
        screenshotCount: screenshots.length,
        screenshots: screenshots.map((screenshot) => ({
          bytes: screenshot.bytes,
          id: screenshot.id,
          path: screenshot.evidencePath,
          sha256: screenshot.sha256,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
  await waitForExit(serverProcess);
}

function buildTargetUrl(base, { detailTab, missionId, step, workspaceId }) {
  const url = new URL(base);
  url.searchParams.set('workspace', workspaceId);
  url.searchParams.set('mission', missionId);
  url.searchParams.set('step', step);
  url.searchParams.set('tab', detailTab);
  return url.href;
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
    throw new Error(`playwright-cli failed (${args.join(' ')}): ${result.stderr || result.stdout || '<no output>'}`);
  }
  return String(result.stdout || '').trim();
}

function runPwJson(args, options = {}) {
  const stdout = runPw(args, options);
  try {
    return stdout ? JSON.parse(stdout) : null;
  } catch (error) {
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

function parsePngDimensions(buffer) {
  assert.equal(buffer.subarray(0, 8).equals(pngSignature), true, 'expected PNG signature');
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', 'expected PNG IHDR chunk');
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function formatDisplayPath(filePath) {
  return path.relative(repoDir, filePath).split(path.sep).join('/');
}
