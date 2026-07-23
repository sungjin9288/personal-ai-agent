import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput,
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution,
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord,
  buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../src/core/fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningPrivateAnswerQualityReviewInputs,
  assertFineTuningPrivateAnswerQualityReviewState,
} from './helpers/fine-tuning-private-answer-quality-review-guard.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertSamePrivateJsonState,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';

const HISTORY_NAME =
  'private-answer-quality-enrichment-candidate-review-resolutions';
const PENDING_PREFIX =
  '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseFilenames(process.argv.slice(2));
const initial = loadInputs(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix:
    'Fine-tuning private answer quality enrichment candidate review lock',
});

let resolution;
try {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  resolution = resolveReview(initial, current);
} finally {
  lock.release();
}

assertLiveReviewWindow(initial);
console.log(JSON.stringify({
  status: resolution.status,
  reviewerVerdict: resolution.reviewerVerdict,
  q1ReviewerGateSatisfied: resolution.q1ReviewerGateSatisfied,
  q1ContractSatisfied: resolution.q1ContractSatisfied,
  answerQualityCaseMaterializationAllowed:
    resolution.answerQualityCaseMaterializationAllowed,
  answerQualityCaseCreated: resolution.answerQualityCaseCreated,
  trainingAuthorized: resolution.trainingAuthorized,
  externalProviderCalls: resolution.externalProviderCalls,
  productionReadyClaim: resolution.productionReadyClaim,
}, null, 2));

function resolveReview(initialInputs, current) {
  assertFineTuningPrivateAnswerQualityReviewState({ current, repoDir });

  const root = prepareResolutionHistoryRoot(current.workspace.workspaceHash);
  const desiredDecision = buildStoredDecision(current);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(
    root,
    `${PENDING_PREFIX}${current.item.itemHash}-${desiredDecision.decisionHash}`,
  );
  let history = inspectResolutionHistory({
    current,
    desiredDecision,
    pendingDirectory,
    root,
  });

  if (history.final) {
    const stored = assertStoredResolutionMatchesCurrent(
      current,
      desiredDecision,
      history.final,
    );
    assertLiveReviewWindow(current);
    return stored;
  }

  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.17 resolution history', { repoDir });
    history = { final: null, pending: null };
  }

  let pendingResolution;
  if (history.pending?.resolution) {
    pendingResolution = assertStoredResolutionMatchesCurrent(
      current,
      desiredDecision,
      history.pending.resolution,
    );
  } else if (history.pending?.decision) {
    assertStoredDecisionMatchesCurrent(history.pending.decision, desiredDecision);
    pendingResolution = buildResolution(current, new Date().toISOString());
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'resolution.json'),
      pendingResolution,
      'F1.17 pending resolution',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.17 pending resolution', {
      repoDir,
    });
  } else {
    pendingResolution = buildResolution(current, new Date().toISOString());
    makePrivateDirectory(pendingDirectory, 'F1.17 pending resolution', {
      repoDir,
    });
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'decision.json'),
      desiredDecision,
      'F1.17 pending decision',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.17 pending resolution', {
      repoDir,
    });
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'resolution.json'),
      pendingResolution,
      'F1.17 pending resolution',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.17 pending resolution', {
      repoDir,
    });
  }

  assertReadyToPublish({
    initial: initialInputs,
    pendingDirectory,
    resolution: pendingResolution,
  });
  publishPending({
    current,
    finalDirectory,
    pendingDirectory,
    resolution: pendingResolution,
    root,
  });
  return pendingResolution;
}

function assertLiveReviewWindow(current) {
  const now = new Date().toISOString();
  if (
    Date.parse(now) >= Date.parse(current.item.expiresAt) ||
    Date.parse(now) >= Date.parse(current.item.retention.deleteBy)
  ) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review item is expired.',
    );
  }
}

function loadInputs(names) {
  const states = Object.fromEntries(
    Object.entries(names).map(([key, filename]) => [
      key,
      readPrivateJsonState(filename, `F1.17 ${key}`, { repoDir }),
    ]),
  );
  const values = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state.value]),
  );

  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(values.candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput(
    values.decision,
  );
  assertFineTuningPrivateAnswerQualityReviewInputs({
    repoDir,
    states,
    values,
  });

  const now = new Date().toISOString();
  if (
    Date.parse(now) >= Date.parse(values.item.expiresAt) ||
    Date.parse(now) >= Date.parse(values.item.retention.deleteBy)
  ) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review item is expired.',
    );
  }
  return { ...values, now, states };
}

function assertSameInputs(before, after) {
  for (const key of Object.keys(before.states)) {
    assertSamePrivateJsonState(
      before.states[key],
      after.states[key],
      `F1.17 ${key}`,
    );
  }
}

function buildResolution(current, resolvedAt) {
  return buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
    admission: current.admission,
    candidate: current.candidate,
    decision: current.decision,
    item: current.item,
    resolvedAt,
    workspace: current.workspace,
  });
}

function buildStoredDecision(current) {
  const decision =
    assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewDecisionInput(
      current.decision,
    );
  const decisionRecord = {
    confirmationTokenSha256: hashValue(decision.confirmationToken),
    decidedAt: decision.decidedAt,
    decidedByRole: decision.decidedByRole,
    decision: decision.decision,
    evidenceSha256: decision.evidenceSha256,
    schemaVersion: decision.schemaVersion,
    target: decision.target,
  };
  const decisionHash = hashRecord(decisionRecord);
  return {
    admission: decision.admission,
    candidate: decision.candidate,
    decisionHash,
    decisionRecord,
    id:
      'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
      decisionHash,
    item: decision.item,
    workspace: decision.workspace,
  };
}

function inspectResolutionHistory({
  current,
  desiredDecision,
  pendingDirectory,
  root,
}) {
  let final = null;
  const pending = [];
  const emptyPending = [];

  for (const name of readPrivateDirectory(root, 'F1.17 resolution history', {
    repoDir,
  })) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(
      `^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!isFinal && !isPending) {
      throw new Error('F1.17 resolution history is invalid.');
    }

    const directory = path.join(root, name);
    const names = readPrivateDirectory(
      directory,
      'F1.17 resolution history entry',
      { repoDir },
    );
    if (names.length === 0) {
      if (isPending && directory === pendingDirectory) {
        emptyPending.push(directory);
        continue;
      }
      throw new Error('F1.17 resolution history entry is invalid.');
    }
    const decisionOnly = sameNames(names, ['decision.json']);
    const complete = sameNames(names, ['decision.json', 'resolution.json']);
    if ((isFinal && !complete) || (isPending && !decisionOnly && !complete)) {
      throw new Error('F1.17 resolution history bundle is invalid.');
    }

    const decision = readStoredDecision(
      path.join(directory, 'decision.json'),
      'F1.17 stored decision',
    );
    const expectedName = isFinal
      ? decision.item.itemHash
      : `${PENDING_PREFIX}${decision.item.itemHash}-${decision.decisionHash}`;
    if (
      name !== expectedName ||
      decision.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('F1.17 resolution history lineage is invalid.');
    }

    let resolution;
    if (complete) {
      resolution = readPrivateJsonState(
        path.join(directory, 'resolution.json'),
        'F1.17 stored resolution',
        { repoDir },
      ).value;
      assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
        resolution,
      );
      assertDecisionMatchesResolution(decision, resolution);
    }

    if (decision.item.itemHash !== current.item.itemHash) {
      continue;
    }
    if (isFinal) {
      if (final) {
        throw new Error('F1.17 final resolution history is ambiguous.');
      }
      final = resolution;
    } else {
      pending.push({ decision, directory, resolution });
    }
  }

  if (final && (pending.length > 0 || emptyPending.length > 0)) {
    throw new Error('F1.17 final resolution conflicts with pending history.');
  }
  if (pending.length + emptyPending.length > 1) {
    throw new Error('F1.17 pending resolution history is ambiguous.');
  }
  if (pending.length === 1) {
    assertStoredDecisionMatchesCurrent(pending[0].decision, desiredDecision);
  }
  return {
    emptyPending: emptyPending[0] || null,
    final,
    pending: pending[0] || null,
  };
}

function readStoredDecision(filename, label) {
  const decision = readPrivateJsonState(filename, label, { repoDir }).value;
  const expectedKeys = [
    'admission',
    'candidate',
    'decisionHash',
    'decisionRecord',
    'id',
    'item',
    'workspace',
  ];
  const record = decision?.decisionRecord;
  if (
    !decision ||
    typeof decision !== 'object' ||
    Array.isArray(decision) ||
    !sameNames(Object.keys(decision), expectedKeys) ||
    !sameNames(Object.keys(record || {}), [
      'confirmationTokenSha256',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'schemaVersion',
      'target',
    ]) ||
    !referenceShape(
      decision.admission,
      'fine-tuning-private-collection-item-admission-',
      'admissionHash',
    ) ||
    !candidateReferenceShape(decision.candidate) ||
    !referenceShape(
      decision.item,
      'fine-tuning-private-collection-item-',
      'itemHash',
    ) ||
    !referenceShape(
      decision.workspace,
      'fine-tuning-private-collection-workspace-',
      'workspaceHash',
    ) ||
    !isSha256(record?.confirmationTokenSha256) ||
    !isSha256(record?.evidenceSha256) ||
    record?.decidedAt !== normalizeTimestamp(record?.decidedAt) ||
    record?.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(record?.decision) ||
    record?.schemaVersion !==
      'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-decision-input/v1' ||
    record?.target !== 'answer-quality-case-q1-review' ||
    decision.candidate.id !==
      `private-answer-quality-case-${decision.item.itemHash}` ||
    decision.decisionHash !== hashRecord(record) ||
    decision.id !==
      'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
        decision.decisionHash
  ) {
    throw new Error(`${label} is invalid.`);
  }
  return decision;
}

function assertDecisionMatchesResolution(decision, resolution) {
  if (
    decision.decisionHash !== resolution.decisionHash ||
    decision.decisionHash !==
      resolution.bindings.candidateReviewDecisionHash ||
    JSON.stringify(decision.decisionRecord) !==
      JSON.stringify(resolution.decisionRecord) ||
    JSON.stringify(decision.admission) !== JSON.stringify(resolution.admission) ||
    JSON.stringify(decision.candidate) !== JSON.stringify(resolution.candidate) ||
    JSON.stringify(decision.item) !== JSON.stringify(resolution.item) ||
    JSON.stringify(decision.workspace) !== JSON.stringify(resolution.workspace)
  ) {
    throw new Error('F1.17 resolution history bundle is invalid.');
  }
}

function assertStoredDecisionMatchesCurrent(stored, current) {
  if (JSON.stringify(stored) !== JSON.stringify(current)) {
    throw new Error(
      'F1.17 stored decision conflicts with the current decision or candidate.',
    );
  }
}

function assertStoredResolutionMatchesCurrent(
  current,
  desiredDecision,
  resolution,
) {
  assertDecisionMatchesResolution(desiredDecision, resolution);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution(
    resolution,
    {
      admission: current.admission,
      candidate: current.candidate,
      decision: current.decision,
      item: current.item,
      workspace: current.workspace,
    },
  );
  return resolution;
}

function prepareResolutionHistoryRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(
    path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash),
    'F1.17 resolution history',
    { repoDir },
  );
}

function assertReadyToPublish({ initial, pendingDirectory, resolution }) {
  const current = loadInputs(filenames);
  assertSameInputs(initial, current);
  assertFineTuningPrivateAnswerQualityReviewState({ current, repoDir });
  const desiredDecision = buildStoredDecision(current);
  const history = inspectResolutionHistory({
    current,
    desiredDecision,
    pendingDirectory,
    root: path.dirname(pendingDirectory),
  });
  if (
    history.final ||
    history.emptyPending ||
    history.pending?.directory !== pendingDirectory ||
    !history.pending.resolution ||
    JSON.stringify(history.pending.resolution) !== JSON.stringify(resolution)
  ) {
    throw new Error('F1.17 pending resolution changed before publish.');
  }
  assertStoredResolutionMatchesCurrent(current, desiredDecision, resolution);
}

function publishPending({
  current,
  finalDirectory,
  pendingDirectory,
  resolution,
  root,
}) {
  if (fs.existsSync(finalDirectory)) {
    throw new Error('F1.17 final resolution already exists.');
  }
  assertLiveReviewWindow(current);
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.17 resolution history', { repoDir });
  const names = readPrivateDirectory(
    finalDirectory,
    'F1.17 published resolution bundle',
    { repoDir },
  );
  if (!sameNames(names, ['decision.json', 'resolution.json'])) {
    throw new Error('F1.17 published resolution bundle is incomplete.');
  }
  const storedDecision = readStoredDecision(
    path.join(finalDirectory, 'decision.json'),
    'F1.17 published decision',
  );
  const storedResolution = readPrivateJsonState(
    path.join(finalDirectory, 'resolution.json'),
    'F1.17 published resolution',
    { repoDir },
  ).value;
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
    storedResolution,
  );
  assertDecisionMatchesResolution(storedDecision, storedResolution);
  if (JSON.stringify(storedResolution) !== JSON.stringify(resolution)) {
    throw new Error('F1.17 published resolution integrity failed.');
  }
}

function parseFilenames(args) {
  const expected = [
    '--workspace',
    'workspace',
    '--admission',
    'admission',
    '--item',
    'item',
    '--candidate',
    'candidate',
    '--decision',
    'decision',
  ];
  const namesMatch = expected.every(
    (value, index) => index % 2 !== 0 || args[index] === value,
  );
  const valuesPresent = expected.every(
    (_, index) => index % 2 === 0 || String(args[index] || '').trim(),
  );
  if (args.length !== expected.length || !namesMatch || !valuesPresent) {
    throw new Error('Expected exact private F1.17 input filenames.');
  }
  const fields = expected.filter((_, index) => index % 2 === 1);
  return Object.fromEntries(
    fields.map((field, index) => [field, args[index * 2 + 1]]),
  );
}

function normalizeTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function referenceShape(value, prefix, hashField) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), ['id', hashField]) &&
    isSha256(value[hashField]) &&
    value.id === `${prefix}${value[hashField]}`
  );
}

function candidateReferenceShape(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), ['candidateHash', 'id']) &&
    isSha256(value.candidateHash) &&
    /^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id)
  );
}

function sameNames(actual, expected) {
  return (
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}
