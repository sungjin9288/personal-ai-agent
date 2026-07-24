import { createHash } from 'node:crypto';
import path from 'node:path';

import { assertFineTuningPrivateAnswerQualityCaseRecord } from '../../src/core/fine-tuning-private-answer-quality-case.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertCanonicalPrivateJsonState,
  readPrivateDirectory,
  readPrivateJsonState,
} from './private-json-state.mjs';

const F1_17_HISTORY_NAME =
  'private-answer-quality-enrichment-candidate-review-resolutions';
const F1_17_PENDING_PREFIX =
  '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-';
const F1_18_HISTORY_NAME = 'private-answer-quality-cases';
const F1_18_PENDING_PREFIX = '.fine-tuning-private-answer-quality-case-pending-';

export function assertCanonicalPrivateAnswerQualityCaseChain({
  current,
  repoDir,
}) {
  assertCanonicalF1_17Resolution({ current, repoDir });
  assertCanonicalF1_18Case({ current, repoDir });
  assertNoForeignCopies({ current, repoDir });
}

export function assertCanonicalPrivateAnswerQualityPayloadEntry({
  current,
  decision,
  payload,
  repoDir,
}) {
  const item =
    decision.item.itemHash === current.item.itemHash
      ? current.item
      : readLiveAnswerQualityItem({
          current,
          itemHash: decision.item.itemHash,
          repoDir,
        });
  const answerQualityCase =
    decision.item.itemHash === current.item.itemHash
      ? current.answerQualityCase
      : readCanonicalAnswerQualityCase({
          current,
          itemHash: decision.item.itemHash,
          repoDir,
        });

  assertPayloadDecisionLineage({
    answerQualityCase,
    current,
    decision,
    item,
  });
  if (payload) {
    assertPayloadLineage({
      answerQualityCase,
      current,
      decision,
      item,
      payload,
    });
  }
}

function readLiveAnswerQualityItem({ current, itemHash, repoDir }) {
  const workspaceDirectory = path.dirname(
    current.states.workspace.canonicalFilename,
  );
  const laneDirectory = path.join(workspaceDirectory, 'answer-quality-cases');
  let matched = null;

  for (const name of readPrivateDirectory(
    laneDirectory,
    'F1.19 answer quality workspace items',
    { repoDir },
  )) {
    if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('F1.19 answer quality workspace item history is invalid.');
    }
    const directory = path.join(laneDirectory, name);
    if (
      !sameNames(
        readPrivateDirectory(directory, 'F1.19 answer quality workspace item', {
          repoDir,
        }),
        ['item.json'],
      )
    ) {
      throw new Error('F1.19 answer quality workspace item history is invalid.');
    }
    const item = readPrivateJsonState(
      path.join(directory, 'item.json'),
      'F1.19 answer quality workspace item',
      { repoDir },
    ).value;
    assertFineTuningPrivateCollectionItemRecord(item);
    if (
      item.lane !== 'answer-quality-cases' ||
      item.workspace.workspaceHash !== current.workspace.workspaceHash ||
      name !==
        `fine-tuning-private-collection-item-${item.admission.admissionHash}`
    ) {
      throw new Error('F1.19 answer quality workspace item history is invalid.');
    }
    if (item.itemHash === itemHash) {
      if (matched) {
        throw new Error('F1.19 answer quality workspace item is ambiguous.');
      }
      matched = item;
    }
  }

  if (!matched) {
    throw new Error('F1.19 payload history has no canonical live item.');
  }
  return matched;
}

function readCanonicalAnswerQualityCase({ current, itemHash, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    F1_18_HISTORY_NAME,
    current.workspace.workspaceHash,
  );
  let final = null;
  let hasPending = false;

  for (const name of readPrivateDirectory(
    root,
    'F1.19 payload F1.18 case history',
    { repoDir },
  )) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(
      `^\\${F1_18_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!isFinal && !isPending) {
      throw new Error('F1.19 payload F1.18 case history is invalid.');
    }
    const directory = path.join(root, name);
    if (
      !sameNames(
        readPrivateDirectory(directory, 'F1.19 payload F1.18 case entry', {
          repoDir,
        }),
        ['case.json'],
      )
    ) {
      throw new Error('F1.19 payload F1.18 case history is invalid.');
    }
    const record = readPrivateJsonState(
      path.join(directory, 'case.json'),
      'F1.19 payload F1.18 case',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityCaseRecord(record);
    const expectedName = isFinal
      ? record.item.itemHash
      : `${F1_18_PENDING_PREFIX}${record.item.itemHash}-` +
        record.candidateReviewResolution.candidateReviewResolutionHash;
    if (
      name !== expectedName ||
      record.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('F1.19 payload F1.18 case history is invalid.');
    }
    if (record.item.itemHash !== itemHash) {
      continue;
    }
    if (isPending) {
      hasPending = true;
      continue;
    }
    if (final) {
      throw new Error('F1.19 payload F1.18 final case is ambiguous.');
    }
    final = record;
  }

  if (hasPending || !final) {
    throw new Error(
      'F1.19 payload history requires one canonical final F1.18 case.',
    );
  }
  return final;
}

function assertPayloadDecisionLineage({
  answerQualityCase,
  current,
  decision,
  item,
}) {
  const expectedToken =
    `materialize-private-answer-quality-case-payload:${item.itemHash}:` +
    answerQualityCase.answerQualityCaseHash;
  const exact =
    item.lane === 'answer-quality-cases' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(item.workspace, current.workspace, 'workspaceHash') &&
    sameReference(
      answerQualityCase.admission,
      item.admission,
      'admissionHash',
    ) &&
    sameReference(answerQualityCase.item, item, 'itemHash') &&
    sameReference(
      answerQualityCase.workspace,
      current.workspace,
      'workspaceHash',
    ) &&
    answerQualityCase.bindings.admissionHash === item.admission.admissionHash &&
    answerQualityCase.bindings.contentHash === item.bindings.contentHash &&
    answerQualityCase.bindings.itemHash === item.itemHash &&
    answerQualityCase.bindings.workspaceHash ===
      current.workspace.workspaceHash &&
    answerQualityCase.sourceObservation.itemStoredAt === item.storedAt &&
    answerQualityCase.sourceObservation.expiresAt === item.expiresAt &&
    answerQualityCase.sourceObservation.deleteBy === item.retention.deleteBy &&
    sameReference(
      decision.answerQualityCase,
      answerQualityCase,
      'answerQualityCaseHash',
    ) &&
    sameReference(decision.item, item, 'itemHash') &&
    sameReference(decision.workspace, current.workspace, 'workspaceHash') &&
    decision.decisionRecord.confirmationTokenSha256 === hashText(expectedToken) &&
    Date.parse(decision.decisionRecord.decidedAt) >=
      Date.parse(answerQualityCase.materializedAt) &&
    Date.parse(decision.decisionRecord.decidedAt) <
      Date.parse(item.expiresAt) &&
    Date.parse(decision.decisionRecord.decidedAt) <
      Date.parse(item.retention.deleteBy);
  if (!exact) {
    throw new Error('F1.19 payload decision has no canonical live lineage.');
  }
}

function assertPayloadLineage({
  answerQualityCase,
  current,
  decision,
  item,
  payload,
}) {
  const inheritedBindingsMatch = Object.entries(answerQualityCase.bindings).every(
    ([key, value]) => payload.bindings[key] === value,
  );
  const exact =
    decision.decisionRecord.decision === 'approve' &&
    sameReference(payload.admission, item.admission, 'admissionHash') &&
    sameReference(
      payload.answerQualityCase,
      answerQualityCase,
      'answerQualityCaseHash',
    ) &&
    sameReference(
      payload.candidate,
      answerQualityCase.candidate,
      'candidateHash',
    ) &&
    sameReference(
      payload.candidateReviewResolution,
      answerQualityCase.candidateReviewResolution,
      'candidateReviewResolutionHash',
    ) &&
    sameReference(payload.item, item, 'itemHash') &&
    sameReference(payload.workspace, current.workspace, 'workspaceHash') &&
    inheritedBindingsMatch &&
    payload.bindings.answerQualityCaseHash ===
      answerQualityCase.answerQualityCaseHash &&
    payload.bindings.payloadDecisionHash === decision.decisionHash &&
    payload.payloadDecision.payloadDecisionHash === decision.decisionHash &&
    payload.payload.objective === item.example.instruction &&
    payload.payload.caseDefinition.answer.text === item.example.response &&
    payload.payload.caseDefinition.id ===
      `private-answer-quality-case-${item.itemHash}` &&
    payload.sourceObservation.answerQualityCaseMaterializedAt ===
      answerQualityCase.materializedAt &&
    payload.sourceObservation.payloadDecisionDecidedAt ===
      decision.decisionRecord.decidedAt &&
    payload.sourceObservation.expiresAt === item.expiresAt &&
    payload.sourceObservation.deleteBy === item.retention.deleteBy;
  if (!exact) {
    throw new Error('F1.19 payload has no canonical live lineage.');
  }
}

function assertCanonicalF1_17Resolution({ current, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    F1_17_HISTORY_NAME,
    current.workspace.workspaceHash,
  );
  const canonicalFilename = path.join(
    root,
    current.item.itemHash,
    'resolution.json',
  );
  assertCanonicalPrivateJsonState(
    current.states.candidateReviewResolution,
    canonicalFilename,
    'F1.19 candidate review resolution',
  );

  let currentFinal = null;
  for (const name of readPrivateDirectory(root, 'F1.19 F1.17 resolution history', {
    repoDir,
  })) {
    const final = /^[a-f0-9]{64}$/u.test(name);
    const pending = new RegExp(
      `^\\${F1_17_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!final && !pending) {
      throw new Error('F1.19 F1.17 resolution history is invalid.');
    }
    const directory = path.join(root, name);
    const names = readPrivateDirectory(
      directory,
      'F1.19 F1.17 resolution history entry',
      { repoDir },
    );
    if (!sameNames(names, ['decision.json', 'resolution.json'])) {
      throw new Error('F1.19 F1.17 resolution history bundle is invalid.');
    }
    const decision = assertStoredF1_17Decision(
      readPrivateJsonState(
        path.join(directory, 'decision.json'),
        'F1.19 F1.17 decision',
        { repoDir },
      ).value,
    );
    const resolution = readPrivateJsonState(
      path.join(directory, 'resolution.json'),
      'F1.19 F1.17 resolution',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
      resolution,
    );
    const expectedName = final
      ? resolution.item.itemHash
      : `${F1_17_PENDING_PREFIX}${resolution.item.itemHash}-${resolution.decisionHash}`;
    const exact =
      name === expectedName &&
      decision.decisionHash === resolution.decisionHash &&
      JSON.stringify(decision.decisionRecord) ===
        JSON.stringify(resolution.decisionRecord) &&
      JSON.stringify(decision.admission) === JSON.stringify(resolution.admission) &&
      JSON.stringify(decision.candidate) === JSON.stringify(resolution.candidate) &&
      JSON.stringify(decision.item) === JSON.stringify(resolution.item) &&
      JSON.stringify(decision.workspace) === JSON.stringify(resolution.workspace) &&
      resolution.workspace.workspaceHash === current.workspace.workspaceHash;
    if (!exact) {
      throw new Error('F1.19 F1.17 resolution history lineage is invalid.');
    }
    if (resolution.item.itemHash !== current.item.itemHash) {
      continue;
    }
    if (pending) {
      throw new Error('F1.19 requires F1.17 history without current pending state.');
    }
    if (currentFinal) {
      throw new Error('F1.19 F1.17 final resolution history is ambiguous.');
    }
    currentFinal = resolution;
  }
  if (
    !currentFinal ||
    JSON.stringify(currentFinal) !==
      JSON.stringify(current.candidateReviewResolution) ||
    currentFinal.decision !== 'approve' ||
    currentFinal.answerQualityCaseMaterializationAllowed !== true
  ) {
    throw new Error('F1.19 requires one approved canonical F1.17 resolution.');
  }
}

function assertCanonicalF1_18Case({ current, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    F1_18_HISTORY_NAME,
    current.workspace.workspaceHash,
  );
  const canonicalFilename = path.join(root, current.item.itemHash, 'case.json');
  assertCanonicalPrivateJsonState(
    current.states.answerQualityCase,
    canonicalFilename,
    'F1.19 answer quality case',
  );

  let currentFinal = null;
  for (const name of readPrivateDirectory(root, 'F1.19 F1.18 case history', {
    repoDir,
  })) {
    const final = /^[a-f0-9]{64}$/u.test(name);
    const pending = new RegExp(
      `^\\${F1_18_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!final && !pending) {
      throw new Error('F1.19 F1.18 case history is invalid.');
    }
    const directory = path.join(root, name);
    const names = readPrivateDirectory(
      directory,
      'F1.19 F1.18 case history entry',
      { repoDir },
    );
    if (!sameNames(names, ['case.json'])) {
      throw new Error('F1.19 F1.18 case history bundle is invalid.');
    }
    const record = readPrivateJsonState(
      path.join(directory, 'case.json'),
      'F1.19 F1.18 stored case',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityCaseRecord(record);
    const expectedName = final
      ? record.item.itemHash
      : `${F1_18_PENDING_PREFIX}${record.item.itemHash}-` +
        record.candidateReviewResolution.candidateReviewResolutionHash;
    if (
      name !== expectedName ||
      record.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('F1.19 F1.18 case history lineage is invalid.');
    }
    if (record.item.itemHash !== current.item.itemHash) {
      continue;
    }
    if (pending) {
      throw new Error('F1.19 requires F1.18 history without current pending state.');
    }
    if (currentFinal) {
      throw new Error('F1.19 F1.18 final case history is ambiguous.');
    }
    currentFinal = record;
  }
  if (
    !currentFinal ||
    JSON.stringify(currentFinal) !== JSON.stringify(current.answerQualityCase)
  ) {
    throw new Error('F1.19 requires one canonical F1.18 final case.');
  }
}

export function assertStoredF1_17Decision(value) {
  const record = value?.decisionRecord;
  const decidedAt = normalizeTimestamp(record?.decidedAt);
  const valid =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), [
      'admission',
      'candidate',
      'decisionHash',
      'decisionRecord',
      'id',
      'item',
      'workspace',
    ]) &&
    record &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    sameNames(Object.keys(record), [
      'confirmationTokenSha256',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'schemaVersion',
      'target',
    ]) &&
    isReference(
      value.admission,
      'fine-tuning-private-collection-item-admission-',
      'admissionHash',
    ) &&
    isCandidateReference(value.candidate) &&
    isReference(
      value.item,
      'fine-tuning-private-collection-item-',
      'itemHash',
    ) &&
    isReference(
      value.workspace,
      'fine-tuning-private-collection-workspace-',
      'workspaceHash',
    ) &&
    isHash(record.confirmationTokenSha256) &&
    isHash(record.evidenceSha256) &&
    decidedAt === record.decidedAt &&
    record.decidedByRole === 'quality-reviewer' &&
    ['approve', 'reject'].includes(record.decision) &&
    record.schemaVersion ===
      'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-decision-input/v1' &&
    record.target === 'answer-quality-case-q1-review' &&
    value.candidate.id === `private-answer-quality-case-${value.item.itemHash}` &&
    value.decisionHash === hash(record) &&
    value.id ===
      'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
        value.decisionHash;
  if (!valid) {
    throw new Error('F1.19 F1.17 decision is invalid.');
  }
  return value;
}

function assertNoForeignCopies({ current, repoDir }) {
  const histories = [
    {
      kind: 'candidate',
      name: 'private-answer-quality-enrichment-candidates',
      pending:
        /^\.private-answer-quality-case-pending-([a-f0-9]{64})-[a-f0-9]{64}$/u,
    },
    {
      kind: 'resolution',
      name: F1_17_HISTORY_NAME,
      pending:
        /^\.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-([a-f0-9]{64})-[a-f0-9]{64}$/u,
    },
    {
      kind: 'case',
      name: F1_18_HISTORY_NAME,
      pending:
        /^\.fine-tuning-private-answer-quality-case-pending-([a-f0-9]{64})-[a-f0-9]{64}$/u,
    },
  ];
  for (const history of histories) {
    const root = path.join(repoDir, 'var', 'fine-tuning', history.name);
    for (const workspaceName of readPrivateDirectory(
      root,
      'F1.19 answer quality history workspaces',
      { repoDir },
    )) {
      if (!/^[a-f0-9]{64}$/u.test(workspaceName)) {
        throw new Error('F1.19 answer quality history workspace is invalid.');
      }
      const workspaceRoot = path.join(root, workspaceName);
      for (const name of readPrivateDirectory(
        workspaceRoot,
        'F1.19 answer quality workspace history',
        { repoDir },
      )) {
        if (workspaceName === current.workspace.workspaceHash) {
          continue;
        }
        const entry = readForeignHistoryEntry({
          directory: path.join(workspaceRoot, name),
          history,
          name,
          repoDir,
          workspaceHash: workspaceName,
        });
        if (!entry) {
          throw new Error('F1.19 answer quality workspace history is invalid.');
        }
        if (entry.itemHash === current.item.itemHash) {
          throw new Error(
            'F1.19 answer quality history contains a foreign workspace copy.',
          );
        }
        if (!entry.valid) {
          throw new Error('F1.19 answer quality workspace history is invalid.');
        }
      }
    }
  }
}

function readForeignHistoryEntry({
  directory,
  history,
  name,
  repoDir,
  workspaceHash,
}) {
  const pending = name.match(history.pending);
  const final = /^[a-f0-9]{64}$/u.test(name);
  if (!final && !pending) {
    return null;
  }
  const names = readPrivateDirectory(
    directory,
    'F1.19 foreign answer quality history entry',
    { repoDir },
  );
  if (history.kind === 'candidate') {
    if (names.length === 0 && pending) {
      return { itemHash: pending[1], valid: true, workspaceHash };
    }
    if (!sameNames(names, ['candidate.json'])) {
      return null;
    }
    const record = assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(
      readPrivateJsonState(
        path.join(directory, 'candidate.json'),
        'F1.19 foreign F1.16 candidate',
        { repoDir },
      ).value,
    );
    const expected = final
      ? record.item.itemHash
      : `.private-answer-quality-case-pending-${record.item.itemHash}-` +
        record.bindings.answerQualityCaseEnrichmentInputHash;
    return exactForeignEntry({
      expected,
      itemHash: record.item.itemHash,
      name,
      recordWorkspaceHash: record.workspace.workspaceHash,
      workspaceHash,
    });
  }
  if (history.kind === 'case') {
    if (names.length === 0 && pending) {
      return { itemHash: pending[1], valid: true, workspaceHash };
    }
    if (!sameNames(names, ['case.json'])) {
      return null;
    }
    const record = assertFineTuningPrivateAnswerQualityCaseRecord(
      readPrivateJsonState(
        path.join(directory, 'case.json'),
        'F1.19 foreign F1.18 case',
        { repoDir },
      ).value,
    );
    const expected = final
      ? record.item.itemHash
      : `${F1_18_PENDING_PREFIX}${record.item.itemHash}-` +
        record.candidateReviewResolution.candidateReviewResolutionHash;
    return exactForeignEntry({
      expected,
      itemHash: record.item.itemHash,
      name,
      recordWorkspaceHash: record.workspace.workspaceHash,
      workspaceHash,
    });
  }
  if (
    names.length === 0 &&
    pending
  ) {
    return { itemHash: pending[1], valid: true, workspaceHash };
  }
  if (
    !sameNames(names, ['decision.json']) &&
    !sameNames(names, ['decision.json', 'resolution.json'])
  ) {
    return null;
  }
  const decision = assertStoredF1_17Decision(
    readPrivateJsonState(
      path.join(directory, 'decision.json'),
      'F1.19 foreign F1.17 decision',
      { repoDir },
    ).value,
  );
  const resolution = names.includes('resolution.json')
    ? assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
        readPrivateJsonState(
          path.join(directory, 'resolution.json'),
          'F1.19 foreign F1.17 resolution',
          { repoDir },
        ).value,
      )
    : null;
  if (final && !resolution) {
    return null;
  }
  if (resolution && !sameStoredF1_17Lineage(decision, resolution)) {
    return null;
  }
  const expected = final
    ? decision.item.itemHash
    : `${F1_17_PENDING_PREFIX}${decision.item.itemHash}-${decision.decisionHash}`;
  return exactForeignEntry({
    expected,
    itemHash: decision.item.itemHash,
    name,
    recordWorkspaceHash: decision.workspace.workspaceHash,
    workspaceHash,
  });
}

function exactForeignEntry({
  expected,
  itemHash,
  name,
  recordWorkspaceHash,
  workspaceHash,
}) {
  if (name !== expected || recordWorkspaceHash !== workspaceHash) {
    return { itemHash, valid: false, workspaceHash };
  }
  return { itemHash, valid: true, workspaceHash };
}

function sameStoredF1_17Lineage(decision, resolution) {
  return (
    decision.decisionHash === resolution.decisionHash &&
    JSON.stringify(decision.decisionRecord) ===
      JSON.stringify(resolution.decisionRecord) &&
    JSON.stringify(decision.admission) === JSON.stringify(resolution.admission) &&
    JSON.stringify(decision.candidate) === JSON.stringify(resolution.candidate) &&
    JSON.stringify(decision.item) === JSON.stringify(resolution.item) &&
    JSON.stringify(decision.workspace) === JSON.stringify(resolution.workspace)
  );
}

function isReference(value, prefix, hashField) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), ['id', hashField]) &&
    isHash(value[hashField]) &&
    value.id === `${prefix}${value[hashField]}`
  );
}

function isCandidateReference(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), ['candidateHash', 'id']) &&
    isHash(value.candidateHash) &&
    /^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id)
  );
}

function normalizeTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sameReference(left, right, hashField) {
  return left?.id === right?.id && left?.[hashField] === right?.[hashField];
}

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}
