import crypto from 'node:crypto';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function hashTextContent(content) {
  return crypto.createHash('sha256').update(String(content || '')).digest('hex');
}

export function countTextLines(content) {
  const value = String(content || '');
  if (!value) {
    return 0;
  }
  return value.endsWith('\n') ? value.split('\n').length - 1 : value.split('\n').length;
}

export function buildNextEditContent(step, existingContent, existedBefore) {
  if (step.operation === 'append') {
    return existingContent ? `${existingContent.replace(/\s*$/, '')}\n${step.content}\n` : `${step.content}\n`;
  }

  if (step.operation === 'move') {
    if (!existedBefore) {
      throw new Error(`file-move requires an existing source file ${step.filePath}`);
    }
    return existingContent;
  }

  if (step.operation === 'delete') {
    if (!existedBefore) {
      throw new Error(`text-delete-file requires an existing file ${step.filePath}`);
    }
    return '';
  }

  if (step.operation === 'write') {
    if (existedBefore && step.mutationTemplate === 'text-write-new') {
      throw new Error(`text-write-new refuses to overwrite existing file ${step.filePath}`);
    }
    return `${step.content}`;
  }

  if (!step.findText) {
    throw new Error(`Replace operation requires findText for ${step.title}`);
  }

  if (!existingContent.includes(step.findText)) {
    throw new Error(`Replace target not found in ${step.filePath}`);
  }

  return existingContent.replace(step.findText, step.replaceText);
}

export function buildRollbackPreview({ afterContent, beforeContent, existedBefore, step }) {
  if (step.mutationTemplate === 'file-move' && existedBefore) {
    return {
      action: 'restore-moved-file',
      expectedCurrentFilePath: step.targetPath || '',
      expectedCurrentSha256: hashTextContent(afterContent),
      ready: true,
      restoreFilePath: step.filePath || '',
      restoreSha256: hashTextContent(beforeContent),
    };
  }

  if (step.mutationTemplate === 'text-delete-file' && existedBefore) {
    return {
      action: 'restore-deleted-file',
      expectedCurrentExists: false,
      ready: true,
      restoreSha256: hashTextContent(beforeContent),
    };
  }

  if (step.mutationTemplate === 'text-write-new' && !existedBefore) {
    return {
      action: 'delete-created-file',
      ready: true,
      reason: 'new file can be removed to restore the pre-execution state',
    };
  }

  if (step.mutationTemplate === 'text-replace') {
    return {
      action: 'reverse-text-replace',
      expectedCurrentSha256: hashTextContent(afterContent),
      ready: true,
      restoreSha256: hashTextContent(beforeContent),
      reverseFindTextSha256: hashTextContent(step.replaceText),
      reverseReplaceTextSha256: hashTextContent(step.findText),
    };
  }

  if (step.mutationTemplate === 'text-append') {
    return {
      action: 'restore-previous-content',
      expectedCurrentSha256: hashTextContent(afterContent),
      ready: true,
      restoreSha256: hashTextContent(beforeContent),
      restoreStrategy: existedBefore ? 'rewrite-existing-file' : 'remove-created-file',
    };
  }

  return {
    action: 'manual-review-required',
    ready: false,
    reason: 'unsupported mutation template',
  };
}

export function buildMutationBatchSummary({ filePaths, items, rollbackReadyCount, templateCounts }) {
  const rollbackActionCounts = items.reduce((counts, item) => {
    const action = normalizeText(item.rollbackPreview?.action, 'manual-review-required');
    counts[action] = (counts[action] || 0) + 1;
    return counts;
  }, {});
  const mutationSetFingerprint = items.map((item) => ({
    afterSha256: normalizeText(item.afterSha256),
    beforeSha256: normalizeText(item.beforeSha256),
    filePath: normalizeText(item.filePath),
    id: normalizeText(item.id),
    mutationTemplate: normalizeText(item.mutationTemplate),
    rollbackAction: normalizeText(item.rollbackPreview?.action),
    rollbackReady: item.rollbackPreview?.ready === true,
    targetFilePath: normalizeText(item.targetFilePath),
  }));
  const mutationSetSha256 = hashTextContent(JSON.stringify(mutationSetFingerprint));
  const riskRank = new Map([
    ['low', 1],
    ['medium', 2],
    ['high', 3],
    ['critical', 4],
  ]);
  const maxRiskClassification = items.reduce((current, item) => {
    const nextRisk = normalizeText(item.riskClassification, 'medium');
    return (riskRank.get(nextRisk) || 0) > (riskRank.get(current) || 0) ? nextRisk : current;
  }, 'low');

  return {
    executionOrder: items.map((item) => item.id).filter(Boolean),
    fileCount: filePaths.length,
    id: `mutation-batch-${mutationSetSha256.slice(0, 16)}`,
    itemCount: items.length,
    maxRiskClassification,
    mutationSetSha256,
    pathCount: filePaths.length,
    ready: items.length > 0 && rollbackReadyCount === items.length,
    rollbackActionCounts,
    rollbackOrder: [...items].reverse().map((item) => item.id).filter(Boolean),
    rollbackPreviewReady: rollbackReadyCount === items.length,
    rollbackReadyCount,
    template: 'ordered-mutation-batch-v1',
    templateCounts,
    totalByteDelta: items.reduce((total, item) => total + item.byteDelta, 0),
    totalLineDelta: items.reduce((total, item) => total + item.lineDelta, 0),
  };
}

export function buildMutationAudit({
  afterContent,
  beforeContent,
  existedBefore,
  filePath,
  mutationTemplate,
  operation,
  existsAfter = true,
  rollbackAction = '',
  rollbackSnapshotPath = '',
  targetExistsAfter = false,
  targetFilePath = '',
}) {
  const beforeBytes = Buffer.byteLength(beforeContent, 'utf8');
  const afterBytes = Buffer.byteLength(afterContent, 'utf8');
  const beforeLineCount = countTextLines(beforeContent);
  const afterLineCount = countTextLines(afterContent);

  return {
    afterBytes,
    afterLineCount,
    afterSha256: hashTextContent(afterContent),
    beforeBytes,
    beforeLineCount,
    beforeSha256: hashTextContent(beforeContent),
    byteDelta: afterBytes - beforeBytes,
    changed: beforeContent !== afterContent || Boolean(targetFilePath) || Boolean(existedBefore) !== Boolean(existsAfter),
    existedBefore,
    existsAfter: Boolean(existsAfter),
    filePath,
    lineDelta: afterLineCount - beforeLineCount,
    mutationTemplate: mutationTemplate || '',
    operation,
    rollbackAction: rollbackAction || (existedBefore ? 'restore-snapshot' : 'delete-created-file'),
    rollbackReady: existedBefore ? Boolean(rollbackSnapshotPath) : true,
    rollbackSnapshotPath,
    targetExistsAfter: Boolean(targetExistsAfter),
    targetFilePath,
  };
}

export function collectExecutionMutationAudits(steps) {
  return ensureArray(steps)
    .map((step) => ensureObject(step.mutationAudit))
    .filter((audit) => normalizeText(audit.filePath));
}

export function buildExecutionMutationBatchAudit({ mutationAudits, mutationBundle }) {
  const audits = ensureArray(mutationAudits);
  const templateCounts = audits.reduce((counts, audit) => {
    const template = normalizeText(audit.mutationTemplate, 'unknown');
    counts[template] = (counts[template] || 0) + 1;
    return counts;
  }, {});
  const rollbackActionCounts = audits.reduce((counts, audit) => {
    const action = normalizeText(audit.rollbackAction, 'unknown');
    counts[action] = (counts[action] || 0) + 1;
    return counts;
  }, {});
  const filePaths = [
    ...new Set(
      audits
        .flatMap((audit) => [audit.filePath, audit.targetFilePath])
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  ];
  const mutationSetFingerprint = audits.map((audit) => ({
    afterSha256: normalizeText(audit.afterSha256),
    beforeSha256: normalizeText(audit.beforeSha256),
    filePath: normalizeText(audit.filePath),
    mutationTemplate: normalizeText(audit.mutationTemplate),
    rollbackAction: normalizeText(audit.rollbackAction),
    rollbackReady: audit.rollbackReady === true,
    targetFilePath: normalizeText(audit.targetFilePath),
  }));
  const mutationSetSha256 = hashTextContent(JSON.stringify(mutationSetFingerprint));

  return {
    batchId: normalizeText(mutationBundle?.batch?.id),
    completedItemCount: audits.length,
    expectedItemCount: Number(mutationBundle?.itemCount || 0),
    fileCount: filePaths.length,
    mutationSetSha256,
    rollbackActionCounts,
    rollbackOrder: [...audits].reverse().map((audit) => normalizeText(audit.filePath)).filter(Boolean),
    rollbackReady: audits.length > 0 && audits.every((audit) => audit.rollbackReady === true),
    sourceMutationSetSha256: normalizeText(mutationBundle?.batch?.mutationSetSha256),
    status: audits.length === Number(mutationBundle?.itemCount || 0) ? 'complete' : 'partial',
    template: 'ordered-mutation-batch-v1',
    templateCounts,
  };
}
