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
              meta: Array.from(node.querySelectorAll('.release-handoff-meta .item-meta')).map((item) => item.textContent || ''),
              path: node.querySelector('.release-handoff-path')?.textContent || '',
            })),
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
  assert.equal(screenshotCaptureTarget.href, reloadState.href, JSON.stringify(screenshotCaptureTarget));
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
  }
  for (const [artifactId, artifactLabel, artifactSuffix] of [
    ['index-markdown', 'index.md', 'output/playwright/execution-v1-release-doc-index.md'],
    ['index-text', 'index.txt', 'output/playwright/execution-v1-release-doc-index.txt'],
    ['index-json', 'index.json', 'output/playwright/execution-v1-release-doc-index.json'],
  ]) {
    const handoffArtifact = screenshotSurfaceSummary.handoffArtifacts.find((item) => item.id === artifactId);
    assert.equal(Boolean(handoffArtifact), true, JSON.stringify({ artifactId, screenshotSurfaceSummary }));
    assert.equal(handoffArtifact.label, artifactLabel, JSON.stringify(handoffArtifact));
    assert.equal(handoffArtifact.badges.includes('ready'), true, JSON.stringify(handoffArtifact));
    assert.equal(String(handoffArtifact.path || '').endsWith(artifactSuffix), true, JSON.stringify(handoffArtifact));
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
    repoDir,
    artifactPair: {
      captureTargetVerified: true,
      fullPageDimensionsVerified: true,
      pairVerified: true,
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
