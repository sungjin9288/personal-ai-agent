import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  referenceAdoptionSmokeScriptCount,
  requiredReferenceAdoptionSmokeScripts,
} from './reference-adoption-scripts.mjs';

export function seedExecutionV1Docs({ rootDir, repoDir = process.cwd(), evidenceHref = '' }) {
  const docsDir = path.join(rootDir, 'docs');
  const generatedAt = new Date().toISOString();
  const branch = runGit(repoDir, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
  const commit = runGit(repoDir, ['rev-parse', 'HEAD']) || 'unknown';
  const resolvedEvidenceHref = evidenceHref || path.join(docsDir, 'execution-v1-evidence.md');

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'execution-v1-evidence.md'), [
    '# Execution v1 Evidence',
    '',
    `- generatedAt: ${generatedAt}`,
    `- branch: ${branch}`,
    `- commit: ${commit}`,
    '- mode: execution-v1-verification',
    '- liveFlags: none',
    '',
    '## Deterministic Verification',
    '',
    '- smoke:execution-flow: passed',
    '- smoke:execution-cli: passed',
    '- smoke:ui-execution-console: passed',
    '- smoke:ui-execution-browser-e2e: passed',
    '- smoke:reference-adoptions: passed',
    '- smoke:execution-v1-live-helpers: passed',
    '- smoke:execution-v1-handoff: passed',
    '- smoke:production-readiness-gate: passed',
    '',
    '## Deterministic Runtime Summary',
    '',
    '- smoke:execution-flow: 1.2s elapsed, stdout 421B, stderr 0B, timeout 20.0m',
    '- smoke:execution-cli: 1.1s elapsed, stdout 324B, stderr 0B, timeout 20.0m',
    '- smoke:ui-execution-console: 1.3s elapsed, stdout 343B, stderr 0B, timeout 20.0m',
    '- smoke:ui-execution-browser-e2e: 8.0m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 20.0m',
    '- smoke:reference-adoptions: 4.8s elapsed, stdout 1.5KiB, stderr 0B, timeout 20.0m',
    '- smoke:execution-v1-live-helpers: 2.7s elapsed, stdout 180B, stderr 0B, timeout 20.0m',
    '- smoke:execution-v1-handoff: 80ms elapsed, stdout 128B, stderr 0B, timeout 20.0m',
    '- smoke:production-readiness-gate: 40ms elapsed, stdout 128B, stderr 0B, timeout 20.0m',
    '',
    '## Live Validation',
    '',
    '- not requested',
    '',
    '## Coverage and Remaining Gaps',
    '',
    '- browser interaction E2E: ready (Playwright CLI flow passed)',
    '- reference adoption gate: ready (aggregate smoke passed)',
    '- live provider validation은 해당 provider env가 있을 때만 수행되며, 요청되지 않았거나 env가 없으면 skipped 상태로 남음',
    '## Reference Adoption Aggregate',
    `- scriptCount: ${referenceAdoptionSmokeScriptCount}`,
    ...requiredReferenceAdoptionSmokeScripts.map((scriptPath) => `- ${scriptPath}: passed (10ms, timeout 5.0m, timedOut false)`),
    '',
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'execution-v1-closeout.md'), [
    '# Execution v1 Closeout',
    '',
    `- generatedAt: ${generatedAt}`,
    `- branch: ${branch}`,
    `- commit: ${commit}`,
    `- evidence: [execution-v1-evidence.md](${resolvedEvidenceHref})`,
    '',
    '## Closeout Checklist',
    '',
    '- [x] deterministic execution smoke 4종 통과',
    '- [x] reference adoption aggregate smoke gate 통과',
    '- [x] deterministic runtime summary evidence 기록',
    '- [x] engineering reviewer → execution manifest 생성 경로 연결',
    '- [x] execution lease approval → foreground execution session 연결',
    '- [x] operator console preflight/start/stop/log surface 반영',
    '- [x] CLI execution preflight/start/stop/status/logs 계약 반영',
    '- [x] OpenAI live validation',
    '- [ ] Anthropic live validation',
    '- [ ] Local provider live validation',
    '- [ ] Hermes live validation',
    '- [x] browser interaction E2E 자동화',
    '',
    '## Current Status',
    '',
    '- deterministic smoke: ready',
    '- reference adoption gate: ready',
    '- deterministic runtime summary: ready',
    '- handoff generator: ready',
    '- openai live validation: passed',
    '- anthropic live validation: skipped',
    '- local live validation: skipped',
    '- hermes live validation: skipped',
    '- browser interaction e2e: ready',
    '',
    '## Notes',
    '',
    '- deterministic smoke는 repo-local execution, CLI contract, operator console, browser interaction까지 포함한 local-first 경로를 닫는다.',
    '- reference adoption gate는 외부 reference 기반으로 이식한 compaction, provider guard, Hermes provider/profile, conversion, retrieval, fact graph, instruction-boundary, orchestration profile, UI blueprint, parallel specialist 흐름의 aggregate regression을 닫는다.',
    '',
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'execution-v1-handoff.md'), [
    '# Execution v1 Handoff',
    '',
    `- generatedAt: ${generatedAt}`,
    '- localDate: 2026-05-02',
    `- branch: ${branch}`,
    `- commit: ${commit}`,
    `- evidence: [execution-v1-evidence.md](${resolvedEvidenceHref})`,
    `- closeout: [execution-v1-closeout.md](${path.join(docsDir, 'execution-v1-closeout.md')})`,
    `- immutableSnapshot: [docs/releases/execution-v1/${commit}](docs/releases/execution-v1/${commit})`,
    '- visualArtifactSetSha256: fixture-visual-artifact-set',
    '- commitPushStatus: deferred by operator request',
    '',
    '## Operational State',
    '',
    '- deterministic execution flow: ready',
    '- CLI execution contract: ready',
    '- operator console execution contract: ready',
    '- browser interaction E2E: ready',
    `- reference adoption aggregate: ready, ${referenceAdoptionSmokeScriptCount} scripts, ok=true, totalDuration=4.8s`,
    '- deterministic runtime summary: ready',
    '- snapshot portability: not archived',
    '- OpenAI live validation: passed',
    '- Anthropic live validation: skipped',
    '- local provider live validation: skipped',
    '- Hermes live validation: skipped',
    '',
    '## Completion Boundary',
    '',
    'Execution v1 fixture is deterministic-ready for UI harness validation.',
    '',
  ].join('\n'), 'utf8');

  return {
    closeoutPath: path.join(docsDir, 'execution-v1-closeout.md'),
    evidencePath: path.join(docsDir, 'execution-v1-evidence.md'),
    handoffPath: path.join(docsDir, 'execution-v1-handoff.md'),
    generatedAt,
  };
}

function runGit(repoDir, args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return '';
  }

  return String(result.stdout || '').trim();
}
