import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const evidenceScriptPath = path.join(repoDir, 'scripts', 'build-execution-v1-evidence.mjs');
const checklistPath = path.join(repoDir, 'docs', 'execution-v1-closeout.md');

const evidenceRun = spawnSync(process.execPath, [evidenceScriptPath, ...process.argv.slice(2)], {
  cwd: repoDir,
  encoding: 'utf8',
  env: process.env,
});

if (evidenceRun.status !== 0) {
  throw new Error(`build-execution-v1-evidence failed\n${evidenceRun.stderr || evidenceRun.stdout}`);
}

const evidenceResult = JSON.parse(String(evidenceRun.stdout || '{}'));
const evidencePath = evidenceResult.outputPath;
const evidenceBody = fs.readFileSync(evidencePath, 'utf8');
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const commit = runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();

const deterministicPassed = /smoke:execution-flow: passed/.test(evidenceBody)
  && /smoke:execution-cli: passed/.test(evidenceBody)
  && /smoke:ui-execution-console: passed/.test(evidenceBody)
  && /smoke:ui-execution-browser-e2e: passed/.test(evidenceBody);
const browserE2EPassed = /smoke:ui-execution-browser-e2e: passed/.test(evidenceBody);

const liveOpenAIRequested = process.argv.includes('--live-openai');
const liveAnthropicRequested = process.argv.includes('--live-anthropic');
const liveLocalRequested = process.argv.includes('--live-local');

const liveOpenAIStatus = getLiveStatus(evidenceBody, 'openai', liveOpenAIRequested, process.env.OPENAI_API_KEY);
const liveAnthropicStatus = getLiveStatus(evidenceBody, 'anthropic', liveAnthropicRequested, process.env.ANTHROPIC_API_KEY);
const liveLocalStatus = getLiveStatus(evidenceBody, 'local', liveLocalRequested, process.env.LOCAL_PROVIDER_BASE_URL);

const lines = [
  '# Execution v1 Closeout',
  '',
  `- generatedAt: ${generatedAt}`,
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  `- evidence: [execution-v1-evidence.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-evidence.md)`,
  '',
  '## Closeout Checklist',
  '',
  `- [${deterministicPassed ? 'x' : ' '}] deterministic execution smoke 4종 통과`,
  '- [x] engineering reviewer → execution manifest 생성 경로 연결',
  '- [x] execution lease approval → foreground execution session 연결',
  '- [x] operator console preflight/start/stop/log surface 반영',
  '- [x] CLI execution preflight/start/stop/status/logs 계약 반영',
  `- [${liveOpenAIStatus.checked ? 'x' : ' '}] OpenAI live validation`,
  `- [${liveAnthropicStatus.checked ? 'x' : ' '}] Anthropic live validation`,
  `- [${liveLocalStatus.checked ? 'x' : ' '}] Local provider live validation`,
  `- [${browserE2EPassed ? 'x' : ' '}] browser interaction E2E 자동화`,
  '',
  '## Current Status',
  '',
  `- deterministic smoke: ${deterministicPassed ? 'ready' : 'blocked'}`,
  `- openai live validation: ${liveOpenAIStatus.label}`,
  `- anthropic live validation: ${liveAnthropicStatus.label}`,
  `- local live validation: ${liveLocalStatus.label}`,
  `- browser interaction e2e: ${browserE2EPassed ? 'ready' : 'not verified'}`,
  '',
  '## Recommended Next Action',
  '',
];

if (!browserE2EPassed) {
  lines.push('- `npm run smoke:ui-execution-browser-e2e`를 먼저 통과시켜 browser interaction evidence를 생성할 것');
} else if (!liveOpenAIStatus.checked && process.env.OPENAI_API_KEY) {
  lines.push('- `npm run evidence:execution-v1 -- --live-openai`로 OpenAI live validation evidence를 갱신할 것');
} else if (!liveOpenAIStatus.checked) {
  lines.push('- `OPENAI_API_KEY`를 주입한 뒤 OpenAI live validation을 한 번 수행할 것');
} else {
  lines.push('- execution v1 deterministic closeout은 완료 상태이며, 남은 작업은 optional provider expansion 수준입니다.');
}

lines.push(
  '',
  '## Notes',
  '',
  '- 이 문서는 `build-execution-v1-evidence.mjs` 결과를 기반으로 다시 생성된다.',
  '- deterministic smoke는 repo-local execution, CLI contract, operator console, browser interaction까지 포함한 local-first 경로를 닫는다.',
  '- live validation은 provider credential과 runtime adapter가 준비된 환경에서만 추가 확인 대상으로 남는다.',
  '',
);

fs.writeFileSync(checklistPath, lines.join('\n'));

console.log(
  JSON.stringify(
    {
      ok: true,
      checklistPath,
      evidencePath,
      generatedAt,
    },
    null,
    2,
  ),
);

function getLiveStatus(evidenceMarkdown, provider, requested, envValue) {
  const passedPattern = new RegExp(`- ${provider}: passed`);
  const failedPattern = new RegExp(`- ${provider}: failed(?: \\((.+)\\))?`);
  const skippedPattern = new RegExp(`- ${provider}: skipped`);

  if (passedPattern.test(evidenceMarkdown)) {
    return { checked: true, label: 'passed' };
  }

  const failedMatch = evidenceMarkdown.match(failedPattern);
  if (failedMatch) {
    return {
      checked: false,
      label: failedMatch[1] ? `failed (${failedMatch[1]})` : 'failed',
    };
  }

  if (skippedPattern.test(evidenceMarkdown)) {
    return { checked: false, label: 'skipped' };
  }

  if (!requested) {
    return { checked: false, label: envValue ? 'not-requested' : 'missing-env' };
  }

  return { checked: false, label: 'requested-but-not-passed' };
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
