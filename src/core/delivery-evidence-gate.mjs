import { createHash } from 'node:crypto';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const REVISION = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const RESULTS = ['passed', 'failed', 'skipped', 'timeout'];
const BINDINGS = ['sourceRevision', 'criterionDigest', 'definitionDigest', 'environmentId'];

function requireValue(condition, field) {
  if (!condition) throw new Error(`Invalid delivery evidence: ${field}.`);
}

function exactKeys(value, keys, field) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), field);
  requireValue(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
}

function matches(value, pattern, field) {
  requireValue(typeof value === 'string' && pattern.test(value), field);
}

function records(value, min, max, field) {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, field);
  const ids = new Set();
  for (const record of value) {
    matches(record?.id, ID, `${field}.id`);
    requireValue(!ids.has(record.id), `${field}.duplicate-id`);
    ids.add(record.id);
  }
}

function validateInput(input) {
  exactKeys(input, ['schemaVersion', 'target', 'requirements', 'evidence'], 'input');
  requireValue(input.schemaVersion === 'delivery-evidence-input/v1', 'schemaVersion');
  exactKeys(input.target, ['projectId', 'sourceRevision'], 'target');
  matches(input.target.projectId, ID, 'target.projectId');
  matches(input.target.sourceRevision, REVISION, 'target.sourceRevision');
  records(input.requirements, 1, 100, 'requirements');
  const requirements = new Map();
  for (const requirement of input.requirements) {
    exactKeys(requirement, ['id', 'criterion', 'mappingConfirmed', 'checks'], 'requirement');
    requireValue(
      typeof requirement.criterion === 'string' && requirement.criterion.length > 0 &&
      requirement.criterion.length <= 1000 && requirement.criterion.trim() === requirement.criterion &&
      !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(requirement.criterion),
      'requirement.criterion',
    );
    requireValue(typeof requirement.mappingConfirmed === 'boolean', 'requirement.mappingConfirmed');
    records(requirement.checks, 1, 100, 'requirement.checks');
    for (const check of requirement.checks) {
      exactKeys(check, ['id', 'definitionDigest', 'environmentId'], 'check');
      matches(check.definitionDigest, DIGEST, 'check.definitionDigest');
      matches(check.environmentId, ID, 'check.environmentId');
    }
    requirements.set(requirement.id, new Set(requirement.checks.map(check => check.id)));
  }
  records(input.evidence, 0, 10_000, 'evidence');
  for (const evidence of input.evidence) {
    exactKeys(evidence, [
      'id', 'projectId', 'sourceRevision', 'requirementId', 'criterionDigest',
      'checkId', 'definitionDigest', 'environmentId', 'result',
    ], 'evidence-row');
    for (const key of ['projectId', 'requirementId', 'checkId', 'environmentId']) {
      matches(evidence[key], ID, `evidence.${key}`);
    }
    matches(evidence.sourceRevision, REVISION, 'evidence.sourceRevision');
    matches(evidence.criterionDigest, DIGEST, 'evidence.criterionDigest');
    matches(evidence.definitionDigest, DIGEST, 'evidence.definitionDigest');
    requireValue(RESULTS.includes(evidence.result), 'evidence.result');
    requireValue(requirements.get(evidence.requirementId)?.has(evidence.checkId), 'evidence.reference');
  }
}

function byId(rows) {
  return [...rows].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

function evaluateCheck(check, expected, evidence) {
  const currentEvidence = [];
  const excludedEvidence = [];
  for (const row of byId(evidence)) {
    const mismatches = BINDINGS.filter(key => row[key] !== expected[key]);
    if (mismatches.length) excludedEvidence.push({ id: row.id, mismatches });
    else currentEvidence.push({ id: row.id, result: row.result });
  }
  const results = new Set(currentEvidence.map(row => row.result));
  let status;
  if (!results.size) status = excludedEvidence.length ? 'stale' : 'missing';
  else if (results.size > 1) status = 'conflicting';
  else if (results.has('failed')) status = 'failed';
  else if (results.has('passed')) status = 'current';
  else status = 'incomplete';
  return { ...check, status, currentEvidence, excludedEvidence };
}

export function evaluateDeliveryEvidence(input) {
  validateInput(input);
  const evidenceByRequirement = new Map();
  const unmatchedEvidence = [];
  for (const row of byId(input.evidence)) {
    if (row.projectId !== input.target.projectId) {
      unmatchedEvidence.push({ id: row.id, reason: 'project-mismatch' });
      continue;
    }
    if (!evidenceByRequirement.has(row.requirementId)) evidenceByRequirement.set(row.requirementId, new Map());
    const checks = evidenceByRequirement.get(row.requirementId);
    if (!checks.has(row.checkId)) checks.set(row.checkId, []);
    checks.get(row.checkId).push(row);
  }
  const requirements = byId(input.requirements).map(requirement => {
    const criterionDigest = createHash('sha256').update(requirement.criterion, 'utf8').digest('hex');
    const checks = byId(requirement.checks).map(check => evaluateCheck(
      check,
      { ...check, criterionDigest, sourceRevision: input.target.sourceRevision },
      evidenceByRequirement.get(requirement.id)?.get(check.id) || [],
    ));
    const status = checks.some(check => check.status !== 'current')
      ? 'blocked' : requirement.mappingConfirmed ? 'evidence-current' : 'needs-review';
    return {
      id: requirement.id, criterion: requirement.criterion, criterionDigest,
      mappingConfirmed: requirement.mappingConfirmed, status, checks,
    };
  });
  const status = requirements.some(row => row.status === 'blocked') ? 'blocked'
    : requirements.some(row => row.status === 'needs-review') ? 'needs-review' : 'evidence-current';
  return {
    schemaVersion: 'delivery-evidence-report/v1',
    target: { ...input.target },
    status,
    verificationScope: 'declared-inputs-only',
    evidenceAuthenticity: 'unverified',
    acceptance: 'not-assessed',
    deployment: 'not-assessed',
    executionAuthorized: false,
    productionReadyClaim: false,
    requirements,
    unmatchedEvidence,
  };
}

function escapeMarkdown(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&');
}

// Render only reports produced by evaluateDeliveryEvidence, not arbitrary imported reports.
export function renderDeliveryEvidenceMarkdown(report) {
  const lines = [
    '# 변경 인계 근거 점검', '',
    `- 상태: ${report.status}`,
    `- 프로젝트: ${escapeMarkdown(report.target.projectId)}`,
    `- sourceRevision: ${report.target.sourceRevision}`,
    `- 검증 범위: ${report.verificationScope}`,
    `- 증거 진위: ${report.evidenceAuthenticity}`,
    `- 인수: ${report.acceptance} / 배포: ${report.deployment}`,
    `- executionAuthorized: ${report.executionAuthorized} / productionReadyClaim: ${report.productionReadyClaim}`,
    '',
    'evidence-current는 입력에 선언된 binding과 reported pass의 일치입니다. 실제 실행, 의미적 요구 충족, 배포 또는 인수 승인이 아닙니다.',
    'mappingConfirmed도 입력자의 선언이며 승인 증명이 아닙니다. 입력한 기준·식별자는 출력에 포함되므로 공유 전 민감정보를 확인하세요.',
  ];
  for (const requirement of report.requirements) {
    lines.push('', `## ${escapeMarkdown(requirement.id)} — ${requirement.status}`, '',
      escapeMarkdown(requirement.criterion), '',
      `- criterionDigest: ${requirement.criterionDigest}`,
      `- mappingConfirmed: ${requirement.mappingConfirmed}`);
    for (const check of requirement.checks) {
      lines.push('', `### ${escapeMarkdown(check.id)} — ${check.status}`, '',
        `- definitionDigest: ${check.definitionDigest}`,
        `- environmentId: ${escapeMarkdown(check.environmentId)}`);
      if (!check.currentEvidence.length) lines.push('- 현재 binding에 맞는 근거 없음');
      for (const row of check.currentEvidence) lines.push(`- 근거 ${escapeMarkdown(row.id)}: ${row.result}`);
      for (const row of check.excludedEvidence) {
        lines.push(`- 제외 근거 ${escapeMarkdown(row.id)}: ${row.mismatches.join(', ')} 불일치`);
      }
    }
  }
  if (report.unmatchedEvidence.length) {
    lines.push('', '## 범위 밖 근거', '');
    for (const row of report.unmatchedEvidence) lines.push(`- ${escapeMarkdown(row.id)}: ${row.reason}`);
  }
  return `${lines.join('\n')}\n`;
}
