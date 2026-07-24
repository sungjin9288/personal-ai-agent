import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityCase,
  assertFineTuningPrivateAnswerQualityCaseRecord,
  buildFineTuningPrivateAnswerQualityCase,
} from '../src/core/fine-tuning-private-answer-quality-case.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../src/core/fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertSamePrivateJsonState,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';
import {
  assertFineTuningPrivateAnswerQualityReviewInputs,
  assertFineTuningPrivateAnswerQualityReviewState,
} from './helpers/fine-tuning-private-answer-quality-review-guard.mjs';

const HISTORY_NAME = 'private-answer-quality-cases';
const PENDING_PREFIX = '.fine-tuning-private-answer-quality-case-pending-';
const F1_17_PENDING_PREFIX =
  '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = load(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private answer quality case materialization lock',
});

let result;
try {
  const current = load(filenames);
  assertSame(initial, current);
  result = materialize(initial, current);
} finally {
  lock.release();
}

assertWindow(load(filenames));
console.log(JSON.stringify({
  status: result.status,
  reviewerVerdict: result.reviewerVerdict,
  q1ReviewerGateSatisfied: result.q1ReviewerGateSatisfied,
  q1ContractSatisfied: result.q1ContractSatisfied,
  answerQualityCaseCreated: result.answerQualityCaseCreated,
  answerQualityCaseEvaluationExecuted: result.answerQualityCaseEvaluationExecuted,
  trainingAuthorized: result.trainingAuthorized,
  externalProviderCalls: result.externalProviderCalls,
  productionReadyClaim: result.productionReadyClaim,
}, null, 2));

function materialize(initialInputs, current) {
  assertState(current);
  const root = historyRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(root, `${PENDING_PREFIX}${current.item.itemHash}-${current.candidateReviewResolution.candidateReviewResolutionHash}`);
  const history = inspectHistory({ current, pendingDirectory, root });
  if (history.final) {
    const stored = assertStoredCase(current, history.final);
    assertWindow(load(filenames));
    return stored;
  }
  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.18 case history', { repoDir });
  }
  let record = history.pending;
  if (record) {
    record = assertStoredCase(current, record);
  } else {
    record = build(current, new Date().toISOString());
    makePrivateDirectory(pendingDirectory, 'F1.18 pending case', { repoDir });
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'case.json'),
      record,
      'F1.18 pending case',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.18 pending case', { repoDir });
  }
  assertReady(initialInputs, pendingDirectory, record);
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error('F1.18 final case already exists.');
  }
  assertWindow(load(filenames));
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.18 case history', { repoDir });
  const names = readPrivateDirectory(finalDirectory, 'F1.18 published case', { repoDir });
  if (!sameNames(names, ['case.json'])) {
    throw new Error('F1.18 published case is incomplete.');
  }
  const published = readPrivateJsonState(
    path.join(finalDirectory, 'case.json'),
    'F1.18 published case',
    { repoDir },
  ).value;
  const stored = assertStoredCase(current, published);
  if (JSON.stringify(stored) !== JSON.stringify(record)) {
    throw new Error('F1.18 published case integrity failed.');
  }
  return record;
}

function load(names) {
  const states = Object.fromEntries(
    Object.entries(names).map(([key, filename]) => [
      key,
      readPrivateJsonState(filename, `F1.18 ${key}`, { repoDir }),
    ]),
  );
  const values = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state.value]),
  );
  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(values.candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(values.candidateReviewResolution);
  assertCanonicalPrivateJsonState(
    states.candidateReviewResolution,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-answer-quality-enrichment-candidate-review-resolutions',
      values.workspace.workspaceHash,
      values.item.itemHash,
      'resolution.json',
    ),
    'F1.18 candidate review resolution',
  );
  assertFineTuningPrivateAnswerQualityReviewInputs({
    repoDir,
    states,
    values: { ...values, decision: values.candidateReviewResolution },
  });
  assertF1_17Bundle(values);
  assertWindow(values);
  return { ...values, states };
}

function assertState(current) {
  assertFineTuningPrivateAnswerQualityReviewState({
    current: { ...current, decision: current.candidateReviewResolution },
    repoDir,
  });
  assertF1_17Bundle(current);
  assertWindow(current);
}

function assertF1_17Bundle(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidate-review-resolutions',
    current.workspace.workspaceHash,
  );
  let currentFinal;
  for (const name of readPrivateDirectory(root, 'F1.18 F1.17 resolution history', { repoDir })) {
    const final = /^[a-f0-9]{64}$/u.test(name);
    const pending = new RegExp(
      `^\\${F1_17_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!final && !pending) {
      throw new Error('F1.18 F1.17 resolution history is invalid.');
    }
    const directory = path.join(root, name);
    const names = readPrivateDirectory(
      directory,
      'F1.18 F1.17 resolution history entry',
      { repoDir },
    );
    if (!sameNames(names, ['decision.json', 'resolution.json'])) {
      throw new Error('F1.18 F1.17 resolution history bundle is invalid.');
    }
    const decision = assertStoredF1_17Decision(
      readPrivateJsonState(
        path.join(directory, 'decision.json'),
        'F1.18 F1.17 decision',
        { repoDir },
      ).value,
    );
    const resolution = readPrivateJsonState(
      path.join(directory, 'resolution.json'),
      'F1.18 F1.17 resolution',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(resolution);
    if (decision.decisionHash !== resolution.decisionHash ||
      JSON.stringify(decision.decisionRecord) !== JSON.stringify(resolution.decisionRecord) ||
      JSON.stringify(decision.admission) !== JSON.stringify(resolution.admission) ||
      JSON.stringify(decision.candidate) !== JSON.stringify(resolution.candidate) ||
      JSON.stringify(decision.item) !== JSON.stringify(resolution.item) ||
      JSON.stringify(decision.workspace) !== JSON.stringify(resolution.workspace) ||
      decision.workspace.workspaceHash !== current.workspace.workspaceHash || resolution.workspace.workspaceHash !== current.workspace.workspaceHash ||
      (final && name !== resolution.item.itemHash) ||
      (pending &&
        name !==
          `${F1_17_PENDING_PREFIX}${resolution.item.itemHash}-${resolution.decisionHash}`)
    ) {
      throw new Error('F1.18 F1.17 resolution history lineage is invalid.');
    }
    if (resolution.item.itemHash === current.item.itemHash) {
      if (pending) {
        throw new Error(
          'F1.18 requires F1.17 resolution history without current pending state.',
        );
      }
      if (currentFinal) {
        throw new Error('F1.18 F1.17 final resolution history is ambiguous.');
      }
      currentFinal = resolution;
    }
  }
  if (
    !currentFinal ||
    JSON.stringify(currentFinal) !==
      JSON.stringify(current.candidateReviewResolution) ||
    currentFinal.decision !== 'approve' ||
    !currentFinal.answerQualityCaseMaterializationAllowed
  ) {
    throw new Error('F1.18 requires one approved canonical F1.17 resolution.');
  }
}

function inspectHistory({ current, pendingDirectory, root }) {
  let final = null;
  let pending = null;
  let emptyPending = null;

  for (const name of readPrivateDirectory(root, 'F1.18 case history', { repoDir })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(`^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!isFinal && !isPending) {
      throw new Error('F1.18 case history is invalid.');
    }
    const names = readPrivateDirectory(directory, 'F1.18 case history entry', { repoDir });
    if (names.length === 0) {
      if (directory === pendingDirectory) {
        if (emptyPending) {
          throw new Error('F1.18 pending case history is ambiguous.');
        }
        emptyPending = directory;
        continue;
      }
      throw new Error('F1.18 case history entry is invalid.');
    }
    if (!sameNames(names, ['case.json'])) {
      throw new Error('F1.18 case history bundle is invalid.');
    }
    const record = readPrivateJsonState(
      path.join(directory, 'case.json'),
      'F1.18 stored case',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityCaseRecord(record);
    const expectedName = isFinal
      ? record.item.itemHash
      : `${PENDING_PREFIX}${record.item.itemHash}-` +
        record.candidateReviewResolution.candidateReviewResolutionHash;
    if (
      name !== expectedName ||
      record.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('F1.18 case history lineage is invalid.');
    }
    if (record.item.itemHash !== current.item.itemHash) {
      continue;
    }
    if (isFinal) {
      if (final) {
        throw new Error('F1.18 final case history is ambiguous.');
      }
      final = record;
    } else {
      if (pending) {
        throw new Error('F1.18 pending case history is ambiguous.');
      }
      pending = record;
    }
  }
  if (final && (pending || emptyPending)) {
    throw new Error('F1.18 final case conflicts with pending history.');
  }
  return { emptyPending, final, pending };
}

function build(current, materializedAt) {
  return buildFineTuningPrivateAnswerQualityCase({
    admission: current.admission,
    candidate: current.candidate,
    candidateReviewResolution: current.candidateReviewResolution,
    enrichmentInput: current.enrichmentInput,
    item: current.item,
    materializedAt,
    workspace: current.workspace,
  });
}

function assertStoredCase(current, record) {
  return assertFineTuningPrivateAnswerQualityCase(record, {
    admission: current.admission,
    candidate: current.candidate,
    candidateReviewResolution: current.candidateReviewResolution,
    enrichmentInput: current.enrichmentInput,
    item: current.item,
    workspace: current.workspace,
  });
}

function assertReady(initialInputs, pendingDirectory, record) {
  const current = load(filenames);
  assertSame(initialInputs, current);
  assertState(current);
  const history = inspectHistory({
    current,
    pendingDirectory,
    root: path.dirname(pendingDirectory),
  });
  if (
    history.final ||
    history.emptyPending ||
    !history.pending ||
    JSON.stringify(history.pending) !== JSON.stringify(record)
  ) {
    throw new Error('F1.18 pending case changed before publish.');
  }
  assertStoredCase(current, record);
  assertWindow(current);
}

function assertWindow(current) {
  const now = new Date().toISOString();
  if (
    Date.parse(now) >= Date.parse(current.item.expiresAt) ||
    Date.parse(now) >= Date.parse(current.item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private answer quality case item is expired.');
  }
}

function historyRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(
    path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash),
    'F1.18 case history',
    { repoDir },
  );
}

function assertSame(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.18 ${key}`,
    );
  }
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'candidate',
    'candidate-review-resolution',
    'enrichment-input',
  ];
  const invalid =
    args.length !== fields.length * 2 ||
    fields.some(
      (field, index) =>
        args[index * 2] !== `--${field}` ||
        !String(args[index * 2 + 1] || '').trim(),
    );
  if (invalid) {
    throw new Error('Expected exact private F1.18 input filenames.');
  }
  return Object.fromEntries(
    fields.map((field, index) => {
      const key =
        field === 'candidate-review-resolution'
          ? 'candidateReviewResolution'
          : field === 'enrichment-input'
            ? 'enrichmentInput'
            : field;
      return [key, args[index * 2 + 1]];
    }),
  );
}

function assertStoredF1_17Decision(value) {
  const record = value?.decisionRecord;
  const decidedAt = normalizeTimestamp(record?.decidedAt);
  const valid = value && typeof value === 'object' && !Array.isArray(value) &&
    sameNames(Object.keys(value), [
      'admission', 'candidate', 'decisionHash', 'decisionRecord', 'id', 'item', 'workspace',
    ]) &&
    record && typeof record === 'object' && !Array.isArray(record) &&
    sameNames(Object.keys(record), [
      'confirmationTokenSha256', 'decidedAt', 'decidedByRole', 'decision',
      'evidenceSha256', 'schemaVersion', 'target',
    ]) &&
    isReference(value.admission, 'fine-tuning-private-collection-item-admission-', 'admissionHash') &&
    isCandidateReference(value.candidate) &&
    isReference(value.item, 'fine-tuning-private-collection-item-', 'itemHash') &&
    isReference(value.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash') &&
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
  if (!valid) throw new Error('F1.18 F1.17 decision is invalid.');
  return value;
}

function isReference(value, prefix, hashField) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    sameNames(Object.keys(value), ['id', hashField]) &&
    isHash(value[hashField]) && value.id === `${prefix}${value[hashField]}`;
}

function isCandidateReference(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    sameNames(Object.keys(value), ['candidateHash', 'id']) &&
    isHash(value.candidateHash) && /^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id);
}

function normalizeTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sameNames(actual, expected) {
  return (
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}
