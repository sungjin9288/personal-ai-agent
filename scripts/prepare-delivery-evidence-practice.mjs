import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { importDeliveryEvidence } from '../src/core/delivery-evidence-import.mjs';

const toolRoot = fileURLToPath(new URL('..', import.meta.url));
const cleanEnv = { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C' };
let rootDir;
let stage = 'options';

function run(command, args, cwd, env = cleanEnv) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Practice preparation failed.');
  return result.stdout;
}

function write(name, value) {
  const text = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(path.join(rootDir, name), text, { flag: 'wx', mode: 0o600 });
}

function prepare() {
  stage = 'node-version';
  if (process.versions.node.split('.')[0] !== '24') throw new Error('Node 24 required.');
  stage = 'temporary-workspace';
  rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'paa-delivery-practice-')));
  const repo = path.join(rootDir, 'workspace');
  const runtime = path.join(rootDir, 'runtime');
  fs.mkdirSync(repo);
  fs.mkdirSync(runtime);
  write('workspace/package.json', { type: 'module', private: true });
  write('workspace/approval.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';

const mayApprove = names => new Set(names).size >= 2;
test('two distinct approvers', () => assert.equal(mayApprove(['a', 'b']), true));
test('one approver is insufficient', () => assert.equal(mayApprove(['a']), false));
test('duplicate approval counts once', () => assert.equal(mayApprove(['a', 'a']), false));
`);
  write('workspace/delivery-evidence.json', {
    schemaVersion: 'delivery-evidence-manifest/v1', projectId: 'delivery-practice',
    testFiles: ['approval.test.mjs'], configFiles: ['package.json'],
    requirements: [{ id: 'REQ-1', criterion: '서로 다른 승인자 두 명이 필요하며 동일인의 중복 승인은 하나로 센다.', mappingConfirmed: true }],
  });
  stage = 'fixture-git';
  const gitEnv = { ...cleanEnv, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Synthetic practice', GIT_AUTHOR_EMAIL: 'practice@example.invalid',
    GIT_COMMITTER_NAME: 'Synthetic practice', GIT_COMMITTER_EMAIL: 'practice@example.invalid' };
  run('git', ['init', '--quiet', '--template=', '--initial-branch=main'], repo, gitEnv);
  run('git', ['add', 'package.json', 'approval.test.mjs', 'delivery-evidence.json'], repo, gitEnv);
  run('git', ['commit', '--quiet', '-m', 'test: synthetic 검토 연습 fixture 구성'], repo, gitEnv);
  stage = 'native-receipt';
  write('receipt.json', run(process.execPath, ['--test', '--test-concurrency=4',
    `--test-reporter=${path.join(toolRoot, 'scripts/delivery-node-test-reporter.mjs')}`, 'approval.test.mjs'], repo));
  stage = 'import';
  const imported = importDeliveryEvidence({ repoDir: repo, receiptPath: path.join(rootDir, 'receipt.json') });
  if (imported.report.status !== 'evidence-current') throw new Error('Practice evidence unavailable.');
  write('imported.json', imported);
  const current = imported.packet;
  const missing = structuredClone(current);
  missing.evidence = [];
  const stale = structuredClone(current);
  for (const evidence of stale.evidence) evidence.sourceRevision = '0'.repeat(40);
  write('case-01.json', current);
  write('case-02.json', missing);
  write('case-03.json', stale);
  const criterionDigest = createHash('sha256').update(current.requirements[0].criterion).digest('hex');
  write('impact.json', {
    schemaVersion: 'delivery-impact-input/v1', target: { ...current.target, baseRevision: '0'.repeat(40) },
    changedPaths: ['package.json'],
    graph: [{ path: 'approval.test.mjs', dependencies: ['package.json'], complete: true },
      { path: 'package.json', dependencies: [], complete: true }],
    requirements: [{ id: 'REQ-1', criterionDigest, roots: ['approval.test.mjs'], mapping: {
      projectId: current.target.projectId, sourceRevision: '0'.repeat(40), criterionDigest, confirmed: true,
    } }],
  });
  stage = 'workspace-registration';
  const workspace = JSON.parse(run(process.execPath,
    [path.join(toolRoot, 'src/cli.mjs'), 'workspace', 'add', repo, '--name', '변경 인계 연습 (synthetic)'],
    toolRoot, { ...cleanEnv, PERSONAL_AI_AGENT_ROOT: runtime }));
  stage = 'practice-files';
  write('start.mjs', `import { spawn } from 'node:child_process';

const server = spawn(process.execPath, [${JSON.stringify(path.join(toolRoot, 'src/web/server.mjs'))}], {
  cwd: ${JSON.stringify(toolRoot)}, stdio: 'inherit',
  env: { PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C',
    PERSONAL_AI_AGENT_ROOT: ${JSON.stringify(runtime)},
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1', PERSONAL_AI_AGENT_UI_PORT: '0' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', () => { console.error('Practice server could not start.'); process.exitCode = 1; });
server.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143); });
`);
  write('answers.json', {
    fixtureTrust: 'synthetic', humanEvaluationStatus: 'not-performed',
    cases: [
      { file: 'case-01.json', status: 'evidence-current', checkStatus: 'current', reason: '현재 fixture의 실제 native test receipt에서 가져온 보고된 PASS다.' },
      { file: 'case-02.json', status: 'blocked', checkStatus: 'missing', reason: '연습을 위해 근거를 제거했다.' },
      { file: 'case-03.json', status: 'blocked', checkStatus: 'stale', reason: '연습을 위해 근거의 revision을 가상 값으로 바꿨다.' },
    ],
    impactStatus: 'recheck-required', executionAuthorized: false, productionReadyClaim: false,
  });
  write('assessment.md', `# 변경 인계 자가 점검 기록

상태: 미실시. 이 파일은 기록 양식이며 평가 결과가 아니다.
자료: synthetic 연습 / 실제 고객 사례 아님.
대상 revision: ${current.target.sourceRevision}
Node: ${process.version}

- tool revision과 dirty 상태 (도구 저장소의 git rev-parse HEAD / git status --short): 미기록
- 참가자 ID: 미기록
- 일시: 미기록
- 정답 사전 열람 여부와 기존 경험: 미기록
- 수동 / 도구 비교 순서: 미기록
- 설정·mapping 준비 시간 (조건별), 공통 준비 시간, 대기·중단: 미측정

| 사례 | 수동 최종 판단·이유 | 수동 검토·보고 시간(초) | 도구 최종 판단·이유 | 도구 검토·보고 시간(초) |
|---|---|---|---|---|
| case-01 | 미실시 | 미측정 | 미실시 | 미측정 |
| case-02 | 미실시 | 미측정 | 미실시 | 미측정 |
| case-03 | 미실시 | 미측정 | 미실시 | 미측정 |

판단은 인계 가능 / 보류 / 판단 불가와 이유를 기록한다. 도구 판정과 최종 사람 판단은 다를 수 있다.
공통 준비와 도구별 설정 비용도 함께 보고한다. 정답을 읽고 수행한 점검은 blind 평가가 아니다.

- 누락을 놓친 사례 / 근거 부족 사례 수: 미측정
- 정상 처리와 불필요한 보류 / 정상 사례 수: 미측정
- 판단 불가·중단: 미측정
- 가장 불편했던 동작과 재현 순서: 미기록
- 다시 사용할 의사와 이유: 미기록
- 후속 판단 (보완 / 축소 / 종료 / 판단 유보): 미기록
`);
  const quote = text => `'${text.replaceAll("'", "'\\''")}'`;
  const startCommand = `${quote(process.execPath)} ${quote(path.join(rootDir, 'start.mjs'))}`;
  write('GUIDE.md', `# 변경 인계 연습 시작하기

별도 repository 경로 없이 시작하는 synthetic 자가 점검이다. 파일은 이 임시 디렉터리에만 생성했다.
workspace에는 실제 Node 테스트와 테스트 준비용 Git commit이 있으며 remote는 없다.
case-02와 case-03은 현재 packet의 근거를 인위적으로 바꾼 사례다. 실제 과거 실행을 뜻하지 않는다.

1. 수동 비교를 원하면 먼저 case 파일을 읽고 assessment.md에 판단·이유·소요 시간을 기록한다. answers.json은 판단 후 연다.
2. 다음 명령으로 전용 local server를 시작한다. 출력된 http://127.0.0.1 주소를 연다.

\`\`\`sh
${startCommand}
\`\`\`

3. '변경 인계 연습 (synthetic)' workspace → 검토하기 → 변경 인계 근거로 이동한다.
기존 운영 콘솔 전체가 열리지만 이 연습에는 미션 실행이나 provider 설정이 필요 없다. launcher는 임의 코드 실행을 격리하는 sandbox가 아니다.
4. '저장한 검토 JSON 파일 열기'에서 case-01.json부터 하나씩 연다. 매번 최종 판단·이유·시간을 assessment.md에 기록한다.
5. 메모를 반영한 뒤 JSON과 Markdown을 내려받는다. 새로고침 후 저장한 JSON을 열어 메모가 복원되는지 확인한다. 다음 case를 열기 전에 저장한다.
6. 선택적으로 impact.json 내용을 영향 입력에 넣고 반영한다. 선언한 변경 영향이며 실제 Git diff를 수집한 결과는 아니다.
7. answers.json과 대조하고 불편한 점과 반복 사용 의사를 기록한다. 이미 정답을 아는 자가 점검은 독립 사람 효과 평가로 집계하지 않는다.

사용을 마치면 server를 실행한 터미널에서 Ctrl+C로 종료한다. 종료 후에도 연습 파일은 남는다.
다시 실행하면 새 임시 디렉터리가 만들어진다. 같은 연습을 이어가려면 이 start.mjs를 사용한다.
같은 연습의 server가 실행 중이면 출력된 주소를 재사용하고 launcher를 중복 실행하지 않는다.
준비 도중 오류가 나면 부분 디렉터리를 보존하고 실패 단계를 표시한다.
임시 디렉터리는 OS가 정리할 수 있으므로 작성한 기록과 다운로드는 필요하면 개인 보관 위치에 복사한다.
launcher는 현재 personal-ai-agent checkout과 Node/Git 설치를 사용한다. 독립 배포 bundle이 아니다.
실제 고객 인수·배포 승인·생산성 개선은 이 연습만으로 확인할 수 없다.
`);
  return { rootDir, workspace, startCommand, guide: path.join(rootDir, 'GUIDE.md'), assessment: path.join(rootDir, 'assessment.md') };
}

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write('Usage: node scripts/prepare-delivery-evidence-practice.mjs\nPrepare a fresh local synthetic practice workspace with Node 24 and Git.\n');
  } else {
    if (args.length) throw new Error('Invalid options.');
    process.stdout.write(`${JSON.stringify(prepare(), null, 2)}\n`);
  }
} catch {
  process.stderr.write(`Delivery practice preparation failed at ${stage}. Requires Node 24 and Git.\n`);
  if (rootDir) process.stderr.write(`Partial practice preserved: ${rootDir}\n`);
  process.exitCode = 1;
}
