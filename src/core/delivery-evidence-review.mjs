import { createHash } from 'node:crypto';

import { evaluateDeliveryEvidence, renderDeliveryEvidenceMarkdown } from './delivery-evidence-gate.mjs';

function requireValue(condition, field) {
  if (!condition) throw new Error(`Invalid delivery review: ${field}.`);
}

function exactKeys(value, keys, field) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
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

function escapeMarkdown(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&');
}

export function buildDeliveryEvidenceReview({ workspaceId, packet, review } = {}) {
  requireText(workspaceId, 200, 'workspaceId');
  // Never accept an uploaded report or let review notes mutate the D1 judgment.
  const report = evaluateDeliveryEvidence(packet);
  const bindingDigest = createHash('sha256').update(canonicalJson({ workspaceId, packet }), 'utf8').digest('hex');
  let record = null;
  if (review !== undefined) {
    exactKeys(review, ['bindingDigest', 'reviewerName', 'entries'], 'review');
    if (review.bindingDigest !== bindingDigest) {
      const error = new Error('Invalid delivery review: binding.');
      error.status = 409;
      error.code = 'delivery-evidence-review-binding-mismatch';
      throw error;
    }
    requireText(review.reviewerName, 100, 'reviewerName');
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
    }).sort((left, right) => left.requirementId.localeCompare(right.requirementId));
    record = {
      schemaVersion: 'delivery-review/v1', workspaceId, bindingDigest,
      sourceRevision: packet.target.sourceRevision,
      reviewer: { name: review.reviewerName, identityAssurance: 'self-declared' },
      entries, reviewedAt: new Date().toISOString(),
    };
  }
  const lines = [renderDeliveryEvidenceMarkdown(report), '', '## 검토 기록', '',
    `- workspaceId: ${escapeMarkdown(workspaceId)}`, `- bindingDigest: ${bindingDigest}`,
    '- 서버에 검토 기록을 저장하지 않습니다. 현재 요청의 결과이며 다운로드한 파일만 보존됩니다.',
    '- 검토자 이름은 self-declared입니다. 서명, 개인 인증 또는 승인 증명이 아닙니다.',
    '- 예외 기록과 mapping 검토는 판정을 PASS로 변경하지 않으며 실행·배포·인수 권한을 부여하지 않습니다.',
    '- source의 전후 관찰은 atomic snapshot이나 실행 진위 인증이 아닙니다.',
  ];
  if (record) {
    lines.push(`- 검토자: ${escapeMarkdown(record.reviewer.name)}`, `- 검토 시각: ${record.reviewedAt}`);
    for (const entry of record.entries) {
      lines.push('', `### ${escapeMarkdown(entry.requirementId)} — ${entry.kind}`, '', escapeMarkdown(entry.reason));
    }
  } else lines.push('- 검토 기록 없음');
  return { workspaceId, packet: structuredClone(packet), bindingDigest, report, review: record, markdown: `${lines.join('\n')}\n` };
}
