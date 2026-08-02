const REUSED_STATUS = 'reused-existing-not-rerun';
const REUSE_REASON = 'execution-v1-ui-http-unchanged-browser-excluded';

export function readReusedDeterministicProvenance(markdown) {
  const sourceGeneratedAt = extractBulletValue(markdown, 'deterministicEvidenceSourceGeneratedAt')
    || extractBulletValue(markdown, 'generatedAt');
  const sourceCommit = extractBulletValue(markdown, 'deterministicEvidenceSourceCommit')
    || extractBulletValue(markdown, 'commit');

  if (!isIsoTimestamp(sourceGeneratedAt) || !/^[a-f0-9]{40}$/.test(sourceCommit || '')) {
    throw new Error('Cannot reuse deterministic execution-v1 evidence without source commit and generatedAt metadata.');
  }

  return {
    deterministicEvidenceReuseReason: REUSE_REASON,
    deterministicEvidenceSourceCommit: sourceCommit,
    deterministicEvidenceSourceGeneratedAt: sourceGeneratedAt,
    deterministicEvidenceStatus: REUSED_STATUS,
  };
}

export function currentDeterministicProvenance() {
  return {
    deterministicEvidenceStatus: 'current-run',
  };
}

export function extractBulletValue(markdown, label) {
  const escapedLabel = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(markdown || '').match(new RegExp(`^- ${escapedLabel}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function isIsoTimestamp(value) {
  return Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
