import { readFileSync } from 'node:fs';
import { deliveryEvaluationCases } from '../examples/delivery-evidence/cases.mjs';
import { evaluateDeliveryEvidence } from '../src/core/delivery-evidence-gate.mjs';
import { evaluateDeliveryImpact } from '../src/core/delivery-evidence-impact.mjs';
import { evaluateDeliveryEvidenceCases, renderDeliveryEvaluationMarkdown } from '../src/core/delivery-evidence-evaluation.mjs';

function readFixture(name) {
  return JSON.parse(readFileSync(new URL(`../examples/delivery-evidence/${name}`, import.meta.url), 'utf8'));
}

function buildDemo() {
  const cases = deliveryEvaluationCases();
  const current = cases.find(row => row.id === 'current-single').packet;
  const stale = cases.find(row => row.id === 'stale-revision').packet;
  const impact = readFixture('impact.json');
  const steps = [{ id: 'reported-current', evidence: evaluateDeliveryEvidence(current) }];
  for (const [id, path] of [
    ['unrelated-declared-change', 'README.md'],
    ['declared-config-change', 'config/approval.json'],
    ['unmodeled-change', 'src/new-policy.mjs'],
  ]) {
    steps.push({
      id,
      evidence: evaluateDeliveryEvidence(stale),
      impact: evaluateDeliveryImpact({ ...impact, changedPaths: [path] }),
    });
  }
  return {
    schemaVersion: 'delivery-evidence-demo/v1', fixtureTrust: 'synthetic',
    executionAuthorized: false, productionReadyClaim: false,
    steps, evaluation: evaluateDeliveryEvidenceCases(cases, readFixture('expected.json')),
  };
}

function markdown(report) {
  const lines = [
    '# 변경 인계 검증 — local synthetic demo', '',
    '이 입력은 실제 repository·test run·고객 승인 증거가 아닌 synthetic fixture입니다.', '',
    '| 단계 | evidence | 선언된 영향 |', '|---|---|---|',
    ...report.steps.map(step => `| ${step.id} | ${step.evidence.status} | ${step.impact?.status ?? 'not-assessed'} |`),
    '', 'no-declared-impact라도 과거 sourceRevision의 PASS를 current로 승격하지 않습니다.',
    'unknown은 선언되지 않은 변경의 영향을 모른다는 뜻이며 통과·무관 판정이 아닙니다.',
    'evidenceReuseAuthorized:false / ciSkipAuthorized:false / executionAuthorized:false / productionReadyClaim:false.',
    '', renderDeliveryEvaluationMarkdown(report.evaluation).trimEnd(),
  ];
  return `${lines.join('\n')}\n`;
}

try {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--format' && ['json', 'markdown'].includes(args[1]))) {
    throw new Error('Invalid options.');
  }
  const report = buildDemo();
  process.stdout.write(args[1] === 'markdown' ? markdown(report) : `${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.evaluation.passed ? 0 : 2;
} catch {
  process.stderr.write('Delivery demo failed. Use no options or --format json|markdown.\n');
  process.exitCode = 1;
}
