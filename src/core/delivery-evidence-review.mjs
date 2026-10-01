import { createHash } from 'node:crypto';

import { evaluateDeliveryEvidence, renderDeliveryEvidenceMarkdown } from './delivery-evidence-gate.mjs';
import { evaluateDeliveryImpact } from './delivery-evidence-impact.mjs';

// Leave room for the compact POST {bundle} envelope and file newline.
const MAX_BUNDLE_BYTES = 1024 * 1024 - 32;

function requireValue(condition, field) {
  if (!condition) throw new Error(`Invalid delivery review: ${field}.`);
}

function exactKeys(value, keys, field) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
}

function requireText(value, maxLength, field) {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= maxLength &&
    value.trim() === value && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(value), field);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function conflict(code) {
  const error = new Error(`Invalid delivery review: ${code}.`);
  error.status = 409;
  error.code = `delivery-evidence-${code}-mismatch`;
  throw error;
}

function checkBundleSize(bundle) {
  if (Buffer.byteLength(JSON.stringify(bundle), 'utf8') > MAX_BUNDLE_BYTES) {
    const error = new Error('Invalid delivery review: bundle size.');
    error.status = 400;
    error.code = 'delivery-evidence-bundle-limit';
    throw error;
  }
}

function escapeMarkdown(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&');
}

function buildReview({ workspaceId, packet, review, impactInput }, archived = false) {
  requireText(workspaceId, 200, 'workspaceId');
  // Never accept an uploaded report or let review notes mutate the D1 judgment.
  const report = evaluateDeliveryEvidence(packet);
  const bindingDigest = digest({ workspaceId, packet });
  let record = null;
  if (archived ? review !== null : review !== undefined) {
    if (archived) {
      exactKeys(review, ['schemaVersion', 'workspaceId', 'bindingDigest', 'sourceRevision', 'reviewer', 'entries', 'reviewedAt'], 'review');
      requireValue(review.schemaVersion === 'delivery-review/v1', 'review.schemaVersion');
      exactKeys(review.reviewer, ['name', 'identityAssurance'], 'review.reviewer');
      requireValue(review.reviewer.identityAssurance === 'self-declared', 'review.identityAssurance');
      requireValue(typeof review.reviewedAt === 'string' && Number.isFinite(Date.parse(review.reviewedAt)) &&
        new Date(review.reviewedAt).toISOString() === review.reviewedAt, 'review.reviewedAt');
      if (review.workspaceId !== workspaceId || review.sourceRevision !== packet.target.sourceRevision) conflict('review-binding');
    } else {
      exactKeys(review, ['bindingDigest', 'reviewerName', 'entries'], 'review');
    }
    if (review.bindingDigest !== bindingDigest) conflict('review-binding');
    const reviewerName = archived ? review.reviewer.name : review.reviewerName;
    requireText(reviewerName, 100, 'reviewerName');
    requireValue(Array.isArray(review.entries) && review.entries.length > 0 && review.entries.length <= 100, 'entries');
    const requirementIds = new Set(packet.requirements.map(row => row.id));
    const reviewedIds = new Set();
    const entries = review.entries.map(entry => {
      exactKeys(entry, ['requirementId', 'kind', 'reason'], 'entry');
      requireValue(requirementIds.has(entry.requirementId) && !reviewedIds.has(entry.requirementId), 'requirementId');
      reviewedIds.add(entry.requirementId);
      requireValue(['mapping-review', 'exception-recorded'].includes(entry.kind), 'kind');
      requireText(entry.reason, 1000, 'reason');
      return { ...entry };
    });
    if (!archived) entries.sort((left, right) => left.requirementId.localeCompare(right.requirementId));
    record = {
      schemaVersion: 'delivery-review/v1', workspaceId, bindingDigest,
      sourceRevision: packet.target.sourceRevision,
      reviewer: { name: reviewerName, identityAssurance: 'self-declared' },
      entries, reviewedAt: archived ? review.reviewedAt : new Date().toISOString(),
    };
  }

  const impact = impactInput ?? null;
  const impactReport = impact === null ? null : evaluateDeliveryImpact(impact);
  if (impactReport) {
    const criteria = new Map(report.requirements.map(row => [row.id, row.criterionDigest]));
    if (impact.target.projectId !== packet.target.projectId || impact.target.sourceRevision !== packet.target.sourceRevision ||
      impact.requirements.length !== criteria.size || impact.requirements.some(row => criteria.get(row.id) !== row.criterionDigest)) {
      conflict('impact-binding');
    }
  }
  const bundleInput = { schemaVersion: 'delivery-review-bundle/v1', workspaceId, packet, review: record, impactInput: impact };
  const bundle = structuredClone({ ...bundleInput, bundleDigest: digest(bundleInput) });
  checkBundleSize(bundle);
  const lines = [renderDeliveryEvidenceMarkdown(report), '', '## 검토 기록', '',
    `- workspaceId: ${escapeMarkdown(workspaceId)}`, `- bindingDigest: ${bindingDigest}`,
    `- bundleDigest: ${bundle.bundleDigest}`,
    '- 서버에 검토 기록을 저장하지 않습니다. 현재 요청의 결과이며 다운로드한 파일만 보존됩니다.',
    '- 검토자 이름은 self-declared입니다. 서명, 개인 인증 또는 승인 증명이 아닙니다.',
    '- 보존된 검토 시각도 self-declared이며 검토 수행 시점의 독립적인 인증이 아닙니다.',
    '- bundleDigest는 입력 일치 확인용이며 서명, 증거 진위 또는 승인 증명이 아닙니다.',
    '- 예외 기록과 mapping 검토는 판정을 PASS로 변경하지 않으며 실행·배포·인수 권한을 부여하지 않습니다.',
    '- source의 전후 관찰은 atomic snapshot이나 실행 진위 인증이 아닙니다.',
  ];
  if (record) {
    lines.push(`- 검토자: ${escapeMarkdown(record.reviewer.name)}`, `- 검토 시각: ${record.reviewedAt}`);
    for (const entry of record.entries) {
      lines.push('', `### ${escapeMarkdown(entry.requirementId)} — ${entry.kind}`, '', escapeMarkdown(entry.reason));
    }
  } else lines.push('- 검토 기록 없음');
  lines.push('', '## 변경 영향', '');
  if (impactReport) {
    lines.push(`- 상태: ${impactReport.status}`, `- baseRevision: ${impactReport.target.baseRevision}`,
      `- sourceRevision: ${impactReport.target.sourceRevision}`, `- 검증 범위: ${impactReport.verificationScope}`,
      `- mappingTrust: ${impactReport.mappingTrust}`,
      '- evidenceReuseAuthorized: false / ciSkipAuthorized: false / executionAuthorized: false / productionReadyClaim: false',
      '- 선언된 graph의 결과이며 실제 변경 분석·완전성 인증이 아닙니다. D1 판정은 변경하지 않습니다.');
    for (const row of impactReport.requirements) {
      lines.push('', `### ${escapeMarkdown(row.id)} — ${row.status}`, '', `- 사유: ${row.reasons.join(', ')}`);
      for (const changedPath of row.changedPaths) lines.push(`- 변경 경로: ${escapeMarkdown(changedPath)}`);
      for (const unknownPath of row.unknownPaths) lines.push(`- 불확실 경로: ${escapeMarkdown(unknownPath)}`);
    }
  } else lines.push('- 변경 영향 입력 없음');
  return { workspaceId, packet: structuredClone(packet), bindingDigest, report, review: record,
    impactInput: structuredClone(impact), impactReport, bundle, markdown: `${lines.join('\n')}\n` };
}

export function buildDeliveryEvidenceReview(input = {}) {
  return buildReview(input);
}

export function restoreDeliveryEvidenceBundle({ workspaceId, bundle, impactInput } = {}) {
  requireText(workspaceId, 200, 'workspaceId');
  exactKeys(bundle, ['schemaVersion', 'workspaceId', 'packet', 'review', 'impactInput', 'bundleDigest'], 'bundle');
  requireValue(bundle.schemaVersion === 'delivery-review-bundle/v1', 'bundle.schemaVersion');
  requireValue(bundle.impactInput !== undefined, 'bundle.impactInput');
  if (bundle.workspaceId !== workspaceId) conflict('bundle-workspace');
  checkBundleSize(bundle);
  const { bundleDigest, ...input } = bundle;
  if (typeof bundleDigest !== 'string' || !/^[a-f0-9]{64}$/.test(bundleDigest) || bundleDigest !== digest(input)) {
    conflict('bundle-digest');
  }
  // Validate the original archive before an override can replace any input.
  const restored = buildReview(input, true);
  return impactInput === undefined ? restored : buildReview({ ...input, impactInput }, true);
}
