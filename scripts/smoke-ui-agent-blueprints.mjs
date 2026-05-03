import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-agent-blueprints-'));
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
  await waitForServer(baseUrl, serverProcess);

  const rootHtml = await fetchText(baseUrl);
  const appJs = await fetchText(`${baseUrl}/app.js`);
  const stylesCss = await fetchText(`${baseUrl}/styles.css`);

  assert.equal(rootHtml.includes('id="agent-blueprint-builder"'), true);
  assert.equal(rootHtml.includes('추가할 AI와 역할을 먼저 고르기'), true);
  assert.equal(rootHtml.includes('AI 구성 카드를 고르면 orchestration directive는 자동으로 포함됩니다.'), true);

  assert.equal(appJs.includes('buildMissionConstraintPayload'), true);
  assert.equal(appJs.includes('AI가 지금 읽는 자료'), true);
  assert.equal(appJs.includes('추천 상황'), true);
  assert.equal(appJs.includes('선택 결과'), true);
  assert.equal(appJs.includes('빠르게 초안'), true);
  assert.equal(appJs.includes('끝까지 handoff'), true);
  assert.equal(appJs.includes('Hermes 에이전트'), true);
  assert.equal(appJs.includes('engineering-hermes-agent'), true);
  assert.equal(appJs.includes('hermes-agent-full-spectrum'), true);
  assert.equal(appJs.includes('recommendedProvider'), true);
  assert.equal(appJs.includes('현재는 지식 주입 + retrieval memory'), true);
  assert.equal(appJs.includes('prompt grounding + retrieval memory'), true);
  assert.equal(appJs.includes('retrieval-ready'), true);
  assert.equal(appJs.includes('text-first lexical memory'), true);
  assert.equal(appJs.includes('다음 실행 retrieval preview'), true);
  assert.equal(appJs.includes('최근 실행 retrieval evidence'), true);
  assert.equal(appJs.includes('preview vs 최근 retrieval evidence'), true);
  assert.equal(appJs.includes('preview only'), true);
  assert.equal(appJs.includes('evidence only'), true);
  assert.equal(appJs.includes('focusRetrievalSource'), true);
  assert.equal(appJs.includes('data-retrieval-source-type'), true);
  assert.equal(appJs.includes('현재 retrieval source focus'), true);
  assert.equal(appJs.includes('clear-retrieval-source-focus'), true);
  assert.equal(appJs.includes('focus 해제'), true);
  assert.equal(appJs.includes('copy-retrieval-source-link'), true);
  assert.equal(appJs.includes('현재 source 링크 복사'), true);
  assert.equal(appJs.includes('현재 source 링크 복사됨'), true);
  assert.equal(appJs.includes('retrievalCopiedSourceKey'), true);
  assert.equal(appJs.includes('data-retrieval-source-copy'), true);
  assert.equal(appJs.includes('현재 source 해제'), true);
  assert.equal(appJs.includes('is-active-focus'), true);
  assert.equal(appJs.includes('hstype'), true);
  assert.equal(appJs.includes('hsource'), true);
  assert.equal(appJs.includes('applyRetrievalSourceUrlState'), true);
  assert.equal(appJs.includes('retrieval 근거 열기'), true);
  assert.equal(appJs.includes('retrieval preview 비어 있음'), true);
  assert.equal(appJs.includes('Core 4 only'), true);
  assert.equal(appJs.includes('engineering-full-spectrum'), true);

  assert.equal(stylesCss.includes('.surface-ai-compose'), true);
  assert.equal(stylesCss.includes('.agent-blueprint-grid'), true);
  assert.equal(stylesCss.includes('.agent-blueprint-step'), true);
  assert.equal(stylesCss.includes('.agent-intent-strip'), true);
  assert.equal(stylesCss.includes('.agent-learning-panel'), true);
  assert.equal(stylesCss.includes('.agent-retrieval-list'), true);
  assert.equal(stylesCss.includes('.agent-retrieval-row'), true);
  assert.equal(stylesCss.includes('.harness-row.is-focused-source'), true);
  assert.equal(stylesCss.includes('.tag.is-active-focus'), true);
  assert.equal(stylesCss.includes('.retrieval-source-chip'), true);
  assert.equal(stylesCss.includes('.retrieval-source-copy-button'), true);
  assert.equal(stylesCss.includes('.ghost-button.is-copied'), true);
  assert.equal(stylesCss.includes('.specialist-lane-shell'), true);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'ui-agent-blueprints-contract-smoke',
        port,
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

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a local port.'));
        return;
      }
      const { port: resolvedPort } = address;
      server.close(() => resolve(resolvedPort));
    });
    server.on('error', reject);
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function waitForServer(baseUrl, childProcess, { timeoutMs = 20_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`UI server exited early: ${serverOutput.stdout}\n${serverOutput.stderr}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for UI server.\n${serverOutput.stdout}\n${serverOutput.stderr}`);
}

async function waitForExit(childProcess) {
  if (childProcess.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    childProcess.once('exit', () => resolve());
    setTimeout(() => {
      if (childProcess.exitCode === null) {
        childProcess.kill('SIGKILL');
      }
      resolve();
    }, 5_000);
  });
}
