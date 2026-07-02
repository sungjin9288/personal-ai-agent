import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { fetchServedFrontendBundle } from './ui-smoke-helpers.mjs';

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
  const appJs = await fetchServedFrontendBundle(baseUrl);
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
  assert.equal(appJs.includes('Loop Engineering'), true);
  assert.equal(appJs.includes('프롬프트가 아니라 검증 루프를 설계합니다'), true);
  assert.equal(appJs.includes('closed-loop default'), true);
  assert.equal(appJs.includes('OpenClaw식 backbone이 session, workspace, permission, sandbox, provider routing을 고정'), true);
  assert.equal(appJs.includes('Hermes식 engine이 memory, skill, template, provider lesson 후보를 승인/검증 뒤에만 반영'), true);
  assert.equal(appJs.includes('Harness Engineering guardrails'), true);
  assert.equal(appJs.includes('HARNESS_ENGINEERING_GUARDRAILS'), true);
  assert.equal(appJs.includes('renderHarnessEngineeringGuardrails'), true);
  assert.equal(appJs.includes('Control plane'), true);
  assert.equal(appJs.includes('Query heartbeat'), true);
  assert.equal(appJs.includes('Context budget'), true);
  assert.equal(appJs.includes('Recovery branch'), true);
  assert.equal(appJs.includes('Independent verify'), true);
  assert.equal(appJs.includes('Local governance'), true);
  assert.equal(appJs.includes('completion이 problem solved로 위장하지 못하게 합니다.'), true);
  assert.equal(appJs.includes('LOOP_ENGINEERING_CYCLE'), true);
  assert.equal(appJs.includes('LOOP_ENGINEERING_FOUNDATIONS'), true);
  assert.equal(appJs.includes('Discover'), true);
  assert.equal(appJs.includes('Plan'), true);
  assert.equal(appJs.includes('Execute'), true);
  assert.equal(appJs.includes('Verify'), true);
  assert.equal(appJs.includes('Iterate'), true);
  assert.equal(appJs.includes('Automations'), true);
  assert.equal(appJs.includes('Worktrees'), true);
  assert.equal(appJs.includes('Skills'), true);
  assert.equal(appJs.includes('Connectors'), true);
  assert.equal(appJs.includes('Subagents'), true);
  assert.equal(appJs.includes('Memory'), true);
  assert.equal(appJs.includes('renderLoopEngineeringCycleList'), true);
  assert.equal(appJs.includes('renderLoopEngineeringFoundationTags'), true);
  assert.equal(appJs.includes('data-loop-engineering-panel="true"'), true);
  assert.equal(appJs.includes('data-loop-engineering-step="${escapeHtml(step.id)}"'), true);
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
  assert.equal(appJs.includes('getRetrievalSourceActionLabel'), true);
  assert.equal(appJs.includes('getRetrievalArtifactOpenLabel'), true);
  assert.equal(appJs.includes('retrieval source 보기'), true);
  assert.equal(appJs.includes('현재 retrieval source 보기'), true);
  assert.equal(appJs.includes('retrieval source 링크 복사'), true);
  assert.equal(appJs.includes('copied ? `${actionLabel}됨` : actionLabel'), true);
  assert.equal(appJs.includes('retrieval source focus 해제'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(sourceFocusLabel)}"'), true);
  assert.equal(appJs.includes('aria-pressed="${active ? \'true\' : \'false\'}"'), true);
  assert.equal(appJs.includes('title="${escapeHtml(sourceFocusLabel)}"'), true);
  assert.equal(appJs.includes('aria-pressed="${copied ? \'true\' : \'false\'}"'), true);
  assert.equal(appJs.includes('aria-label="${escapeHtml(nextActionLabel)}"'), true);
  assert.equal(appJs.includes('title="${escapeHtml(nextActionLabel)}"'), true);
  assert.equal(appJs.includes('sourceLabel: activeFocus.label'), true);
  assert.equal(appJs.includes('sourceType: activeFocus.type'), true);
  assert.equal(appJs.includes('actionLabel: activeFocusClearLabel'), true);
  assert.equal(appJs.includes('sourceLabel: activeRetrievalSourceFocus.label'), true);
  assert.equal(appJs.includes('sourceType: activeRetrievalSourceFocus.type'), true);
  assert.equal(appJs.includes('openLabel: latestRetrievalArtifactOpenLabel'), true);
  assert.equal(appJs.includes('is-active-focus'), true);
  assert.equal(appJs.includes('hstype'), true);
  assert.equal(appJs.includes('hsource'), true);
  assert.equal(appJs.includes('applyRetrievalSourceUrlState'), true);
  assert.equal(appJs.includes('retrieval 근거 열기'), true);
  assert.equal(appJs.includes('retrieval preview 비어 있음'), true);
  assert.equal(appJs.includes('Core 4 only'), true);
  assert.equal(appJs.includes('engineering-full-spectrum'), true);
  assert.equal(appJs.includes('const actionLabel = `템플릿 적용: ${templateTitle}`'), true);
  assert.equal(appJs.includes('현재 플레이북 선택됨: ${playbookTitle}'), true);
  assert.equal(appJs.includes('플레이북 선택: ${playbookTitle}'), true);
  assert.equal(appJs.includes('renderPlaybookCardButton({ playbook, active: playbook.id === state.selectedPlaybookId })'), true);
  assert.equal(appJs.includes('현재 AI 구성 의도: ${intentLabel}'), true);
  assert.equal(appJs.includes('AI 구성 의도 선택: ${intentLabel}'), true);
  assert.equal(appJs.includes('aria-pressed="${active ? \'true\' : \'false\'}"'), true);
  assert.equal(appJs.includes('현재 AI 구성 카드: ${blueprintTitle}'), true);
  assert.equal(appJs.includes('AI 구성 카드 선택: ${blueprintTitle}'), true);
  assert.equal(appJs.includes('renderAgentBlueprintCardButton({ blueprint, active: blueprint.id === selectedBlueprint?.id })'), true);

  assert.equal(stylesCss.includes('.surface-ai-compose'), true);
  assert.equal(stylesCss.includes('.agent-blueprint-grid'), true);
  assert.equal(stylesCss.includes('.agent-blueprint-step'), true);
  assert.equal(stylesCss.includes('.agent-intent-strip'), true);
  assert.equal(stylesCss.includes('.loop-engineering-panel'), true);
  assert.equal(stylesCss.includes('.loop-engineering-cycle'), true);
  assert.equal(stylesCss.includes('.loop-engineering-step'), true);
  assert.equal(stylesCss.includes('.harness-guardrail-grid'), true);
  assert.equal(stylesCss.includes('.harness-guardrail'), true);
  assert.equal(stylesCss.includes('.loop-engineering-foundations'), true);
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
