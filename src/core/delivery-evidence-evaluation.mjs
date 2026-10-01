import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { evaluateDeliveryEvidence } from './delivery-evidence-gate.mjs';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const STATUSES = ['evidence-current', 'needs-review', 'blocked'];
const CHECK_STATUSES = ['current', 'missing', 'stale', 'conflicting', 'failed', 'incomplete'];
const byId = rows => [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function requireValue(condition) {
  if (!condition) throw new Error('Invalid delivery evaluation.');
}

function exactKeys(value, keys) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value));
  requireValue(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)));
}

function rows(value, max = 100) {
  requireValue(Array.isArray(value) && value.length > 0 && value.length <= max);
  const ids = new Set();
  for (const row of value) {
    requireValue(typeof row?.id === 'string' && ID.test(row.id) && !ids.has(row.id));
    ids.add(row.id);
  }
}

function decisionProjection(value, packet) {
  requireValue(value && STATUSES.includes(value.status));
  rows(value.requirements);
  requireValue(value.requirements.length === packet.requirements.length);
  const requirements = byId(value.requirements).map(requirement => {
    const declared = packet.requirements.find(row => row.id === requirement.id);
    requireValue(declared && STATUSES.includes(requirement.status));
    rows(requirement.checks);
    requireValue(requirement.checks.length === declared.checks.length);
    const checks = byId(requirement.checks).map(check => {
      requireValue(declared.checks.some(row => row.id === check.id) && CHECK_STATUSES.includes(check.status));
      return { id: check.id, status: check.status };
    });
    return { id: requirement.id, status: requirement.status, checks };
  });
  return { status: value.status, requirements };
}

// Independent checklist algorithm for the bundled, valid synthetic packets.
// It does not call the candidate or receive expected decisions.
export function reviewEvidenceChecklist(packet) {
  const requirements = packet.requirements.map(requirement => {
    const digest = createHash('sha256').update(requirement.criterion, 'utf8').digest('hex');
    const checks = requirement.checks.map(check => {
      const related = packet.evidence.filter(row => row.projectId === packet.target.projectId &&
        row.requirementId === requirement.id && row.checkId === check.id);
      const matching = related.filter(row => row.sourceRevision === packet.target.sourceRevision &&
        row.criterionDigest === digest && row.definitionDigest === check.definitionDigest &&
        row.environmentId === check.environmentId);
      const outcomes = [...new Set(matching.map(row => row.result))];
      let status;
      if (!matching.length) status = related.length ? 'stale' : 'missing';
      else if (outcomes.length !== 1) status = 'conflicting';
      else status = { passed: 'current', failed: 'failed', skipped: 'incomplete', timeout: 'incomplete' }[outcomes[0]];
      return { id: check.id, status };
    });
    return {
      id: requirement.id,
      status: checks.every(check => check.status === 'current')
        ? requirement.mappingConfirmed ? 'evidence-current' : 'needs-review' : 'blocked',
      checks,
    };
  });
  const status = requirements.some(row => row.status === 'blocked') ? 'blocked'
    : requirements.some(row => row.status === 'needs-review') ? 'needs-review' : 'evidence-current';
  return { status, requirements };
}

function validateCorpus(cases, oracle) {
  rows(cases);
  exactKeys(oracle, ['schemaVersion', 'cases']);
  requireValue(oracle.schemaVersion === 'delivery-evaluation-oracle/v1');
  rows(oracle.cases);
  requireValue(cases.length === oracle.cases.length);
  for (const item of cases) {
    exactKeys(item, ['id', 'packet']);
    exactKeys(item.packet, ['schemaVersion', 'target', 'requirements', 'evidence']);
    rows(item.packet.requirements);
    for (const requirement of item.packet.requirements) rows(requirement.checks);
    const expected = oracle.cases.find(row => row.id === item.id);
    exactKeys(expected, ['id', 'kind', 'status', 'requirements']);
    requireValue(['normal', 'error'].includes(expected.kind));
    requireValue((expected.kind === 'normal') === (expected.status === 'evidence-current'));
    rows(expected.requirements);
    for (const requirement of expected.requirements) {
      exactKeys(requirement, ['id', 'status', 'checks']);
      rows(requirement.checks);
      for (const check of requirement.checks) exactKeys(check, ['id', 'status']);
    }
    decisionProjection(expected, item.packet);
  }
}

function summarize(cases, implementation) {
  return {
    correctCount: cases.filter(row => row[`${implementation}Matches`]).length,
    mismatchCount: cases.filter(row => !row[`${implementation}Matches`]).length,
    normalHandledCount: cases.filter(row => row.kind === 'normal' && row[implementation].status === 'evidence-current').length,
    falseEvidenceCurrentCount: cases.filter(row => row.kind === 'error' && row[implementation].status === 'evidence-current').length,
    unnecessaryHoldCount: cases.filter(row => row.kind === 'normal' && row[implementation].status !== 'evidence-current').length,
  };
}

export function evaluateDeliveryEvidenceCases(cases, oracle, options = {}) {
  validateCorpus(cases, oracle);
  requireValue(options !== null && typeof options === 'object' && !Array.isArray(options));
  requireValue(Object.keys(options).every(key => ['candidate', 'reference'].includes(key)));
  const candidate = options.candidate ?? evaluateDeliveryEvidence;
  const reference = options.reference ?? reviewEvidenceChecklist;
  requireValue(typeof candidate === 'function' && typeof reference === 'function');
  const results = byId(cases).map(item => {
    const expectedRow = oracle.cases.find(row => row.id === item.id);
    const expected = decisionProjection(expectedRow, item.packet);
    const candidateResult = decisionProjection(candidate(structuredClone(item.packet)), item.packet);
    const referenceResult = decisionProjection(reference(structuredClone(item.packet)), item.packet);
    return {
      id: item.id, kind: expectedRow.kind, expected,
      candidate: candidateResult, reference: referenceResult,
      candidateMatches: isDeepStrictEqual(candidateResult, expected),
      referenceMatches: isDeepStrictEqual(referenceResult, expected),
    };
  });
  const summary = { candidate: summarize(results, 'candidate'), reference: summarize(results, 'reference') };
  return {
    schemaVersion: 'delivery-evaluation-report/v1',
    verificationScope: 'synthetic-status-classification-only',
    referenceType: 'deterministic-checklist-reference',
    corpus: {
      caseCount: results.length,
      normalCount: results.filter(row => row.kind === 'normal').length,
      errorCount: results.filter(row => row.kind === 'error').length,
    },
    passed: summary.candidate.mismatchCount === 0 && summary.reference.mismatchCount === 0,
    summary, cases: results,
    measurements: { humanFalseReadyCount: null, reviewTimeSeconds: null, productivityImprovement: null },
    evidenceAuthenticity: 'unverified', acceptance: 'not-assessed', deployment: 'not-assessed',
    executionAuthorized: false, productionReadyClaim: false,
  };
}

export function renderDeliveryEvaluationMarkdown(report) {
  const lines = [
    '# 변경 인계 판정 — synthetic 평가', '',
    `- 범위: ${report.verificationScope}`,
    `- 비교 기준: ${report.referenceType}`,
    `- 사례: ${report.corpus.caseCount} (normal ${report.corpus.normalCount}, error ${report.corpus.errorCount})`,
    `- 정답 일치: ${report.passed}`, '',
    '| 구현 | 정답 일치 | 불일치 | 정상 처리 | 거짓 current | 불필요한 보류 |',
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const name of ['candidate', 'reference']) {
    const row = report.summary[name];
    lines.push(`| ${name} | ${row.correctCount} | ${row.mismatchCount} | ${row.normalHandledCount} | ${row.falseEvidenceCurrentCount} | ${row.unnecessaryHoldCount} |`);
  }
  lines.push('', '정상 처리·불필요한 보류는 normal 사례, 거짓 current는 error 사례에서 집계합니다.',
    '사람의 false-ready·검토 시간·생산성: not-measured. 실제 도구나 사람보다 우수하다는 비교가 아닙니다.',
    '증거 진위: unverified. 인수·배포: not-assessed. executionAuthorized:false / productionReadyClaim:false.',
    '', '| 사례 | 정답 | candidate | reference |', '|---|---|---|---|');
  for (const row of report.cases) {
    lines.push(`| ${row.id.replace(/_/g, '\\_')} | ${row.expected.status} | ${row.candidate.status} | ${row.reference.status} |`);
  }
  return `${lines.join('\n')}\n`;
}
