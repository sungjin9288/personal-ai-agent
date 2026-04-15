import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { formatLiveValidationFailureLines, parseLiveValidationReason } from './live-validation-utils.mjs';

const repoDir = process.cwd();
const verifyScriptPath = path.join(repoDir, 'scripts', 'verify-execution-v1.mjs');
const outputPath = path.join(repoDir, 'docs', 'execution-v1-evidence.md');
const forwardedArgs = process.argv.slice(2);

const verifyResult = spawnSync(process.execPath, [verifyScriptPath, '--capture-live-failures', ...forwardedArgs], {
  cwd: repoDir,
  encoding: 'utf8',
  env: process.env,
});

if (verifyResult.status !== 0) {
  throw new Error(`verify-execution-v1 failed\n${verifyResult.stderr || verifyResult.stdout}`);
}

const verification = JSON.parse(String(verifyResult.stdout || '{}'));
const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const commit = runGit(['rev-parse', 'HEAD']);
const generatedAt = new Date().toISOString();
const liveFlags = forwardedArgs.filter((item) => item.startsWith('--live-'));
const browserE2EPassed = (verification.deterministic || []).some(
  (item) => item.script === 'smoke:ui-execution-browser-e2e' && item.status === 'passed',
);

const lines = [
  '# Execution v1 Evidence',
  '',
  `- generatedAt: ${generatedAt}`,
  `- branch: ${branch}`,
  `- commit: ${commit}`,
  `- mode: ${verification.mode}`,
  `- liveFlags: ${liveFlags.length ? liveFlags.join(', ') : 'none'}`,
  '',
  '## Deterministic Verification',
  '',
];

for (const item of verification.deterministic || []) {
  lines.push(`- ${item.script}: ${item.status}`);
}

lines.push('', '## Live Validation', '');

if (!verification.liveValidation || verification.liveValidation.length === 0) {
  lines.push('- not requested');
} else {
  for (const item of verification.liveValidation) {
    if (item.status === 'passed') {
      lines.push(`- ${item.provider}: passed (missionId=${item.missionId}, executionSessionId=${item.executionSessionId}, verification=${item.verificationStatus})`);
      continue;
    }

    if (item.status === 'failed') {
      lines.push(`- ${item.provider}: failed (${item.reason || 'unknown'})`);
      const parsedReason = parseLiveValidationReason(item.reason);
      lines.push(...formatLiveValidationFailureLines(parsedReason));
      continue;
    }

    lines.push(`- ${item.provider}: ${item.status}${item.reason ? ` (${item.reason})` : ''}`);
  }
}

lines.push(
  '',
  '## What This Proves',
  '',
  '- engineering mission이 reviewer 통과 후 execution-capable 상태로 전환되는지',
  '- execution lease approval이 1회 실행 세션에 바인딩되는지',
  '- foreground execution session이 완료되고 verification 결과가 남는지',
  '- CLI, service, UI contract가 같은 execution 상태를 읽는지',
  '- 실제 browser interaction이 미션 생성 → 실행 승인 요청 → 승인 → 실행 시작 → 결과 확인 → history restore까지 이어지는지',
  '',
  '## Coverage and Remaining Gaps',
  '',
  `- browser interaction E2E: ${browserE2EPassed ? 'ready (Playwright CLI flow passed)' : 'not verified'}`,
  '- live provider validation은 해당 provider env가 있을 때만 수행되며, 요청되지 않았거나 env가 없으면 skipped 상태로 남음',
  '',
  '## Raw Summary',
  '',
  '```json',
  JSON.stringify(verification, null, 2),
  '```',
  '',
);

fs.writeFileSync(outputPath, lines.join('\n'));

console.log(
  JSON.stringify(
    {
      ok: true,
      liveValidation: verification.liveValidation || [],
      outputPath,
      commit,
      branch,
      generatedAt,
    },
    null,
    2,
  ),
);

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
