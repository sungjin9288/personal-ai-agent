import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateCollectionItemReviewResolution,
  assertFineTuningPrivateCollectionItemReviewResolutionDecisionInput,
  assertFineTuningPrivateCollectionItemReviewResolutionRecord,
  buildFineTuningPrivateCollectionItemReviewResolution,
} from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const LANES = ['reviewed-examples', 'answer-quality-cases'];
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseFilenames(process.argv.slice(2));
const initial = loadInputs(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private collection item review resolution lock',
});

let resolution;
try {
  const current = loadInputs(filenames);
  assertInputsUnchanged(initial, current);
  resolution = resolve(current);
} finally {
  lock.release();
}

console.log(JSON.stringify({
  answerQualityCaseEnrichmentRequestAllowed: resolution.answerQualityCaseEnrichmentRequestAllowed,
  answerQualityCaseCreated: resolution.answerQualityCaseCreated,
  approvedTrainingRecordCreated: resolution.approvedTrainingRecordCreated,
  candidateTrainingReviewAllowed: resolution.candidateTrainingReviewAllowed,
  deploymentAuthorized: resolution.deploymentAuthorized,
  externalProviderCalls: resolution.externalProviderCalls,
  externalSubmissionAuthorized: resolution.externalSubmissionAuthorized,
  fineTuningExecutionAuthorized: resolution.fineTuningExecutionAuthorized,
  lane: resolution.lane,
  productionReadyClaim: resolution.productionReadyClaim,
  providerSubmissionAuthorized: resolution.providerSubmissionAuthorized,
  reviewedExampleCanonicalizationRequestAllowed: resolution.reviewedExampleCanonicalizationRequestAllowed,
  status: resolution.status,
  trainingAuthorized: resolution.trainingAuthorized,
}, null, 2));

function resolve(current) {
  assertNoTerminalOrRemovalHistory(current);
  assertProjectionHistoryIsFinal(current);
  const generated = buildResolution(current, new Date().toISOString());
  const historyRoot = prepareHistoryRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(historyRoot, current.item.itemHash);
  const pendingDirectory = path.join(
    historyRoot,
    `.fine-tuning-private-collection-item-review-resolution-pending-${current.item.itemHash}-${generated.decisionHash}`,
  );
  const history = inspectHistory({ current, finalDirectory, historyRoot, pendingDirectory, generated });
  if (history.final) return history.final.resolution;
  if (history.pending?.resolution) {
    assertReadyToPublish(current);
    publishPending({ finalDirectory, pendingDirectory, bundle: history.pending });
    return history.pending.resolution;
  }
  if (history.pending?.decision) {
    assertStoredDecisionMatches(generated, history.pending.decision);
    const resumed = buildResolution(current, new Date().toISOString());
    writePendingResolution(pendingDirectory, resumed);
    assertReadyToPublish(current);
    publishPending({ finalDirectory, pendingDirectory, bundle: { decision: history.pending.decision, resolution: resumed } });
    return resumed;
  }

  writePendingDecision(pendingDirectory, decisionHistoryRecord(generated));
  const complete = buildResolution(current, new Date().toISOString());
  writePendingResolution(pendingDirectory, complete);
  assertReadyToPublish(current);
  publishPending({
    finalDirectory,
    pendingDirectory,
    bundle: { decision: decisionHistoryRecord(complete), resolution: complete },
  });
  return complete;
}

function buildResolution(current, resolvedAt) {
  return buildFineTuningPrivateCollectionItemReviewResolution({
    admission: current.admission,
    decision: current.decision,
    item: current.item,
    projection: current.projection,
    resolvedAt,
    workspace: current.workspace,
  });
}

function loadInputs(inputFilenames) {
  const tracked = readTrackedSources();
  const executionResolutionInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.executionResolution, 'Fine-tuning private collection execution resolution'),
    'Fine-tuning private collection execution resolution',
  );
  const executionRequestInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.executionRequest, 'Fine-tuning private collection execution request'),
    'Fine-tuning private collection execution request',
  );
  const planInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.plan, 'Fine-tuning private collection plan'),
    'Fine-tuning private collection plan',
  );
  const intakeResolutionInput = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.intakeResolution, 'Fine-tuning private collection intake resolution'),
    'Fine-tuning private collection intake resolution',
  );
  const workspace = readWorkspace(
    validatePrivateFilename(inputFilenames.workspace, 'Fine-tuning private collection workspace'),
    executionResolutionInput.value,
  );
  const admission = readAdmission(
    validatePrivateFilename(inputFilenames.admission, 'Fine-tuning private collection item admission'),
    workspace.value,
  );
  const item = readItem(
    validatePrivateFilename(inputFilenames.item, 'Fine-tuning private collection item'),
    admission.value,
    workspace.value,
    workspace.workspaceDirectory,
  );
  const projection = readProjection(
    validatePrivateFilename(inputFilenames.projection, 'Fine-tuning private collection item review projection'),
    admission.value,
    item.value,
    workspace.value,
  );
  const decision = readOwnerOnlyJson(
    validatePrivateFilename(inputFilenames.decision, 'Fine-tuning private collection item review decision'),
    'Fine-tuning private collection item review decision',
  );
  assertFineTuningPrivateCollectionItemReviewResolutionDecisionInput(decision.value);

  const now = new Date().toISOString();
  const sources = {
    ...tracked.values,
    admission: admission.value,
    executionRequest: executionRequestInput.value,
    executionResolution: executionResolutionInput.value,
    intakeResolution: intakeResolutionInput.value,
    privateCollectionPlan: planInput.value,
    workspace: workspace.value,
  };
  assertFineTuningPrivateCollectionWorkspace(workspace.value, { ...sources, now });
  assertFineTuningPrivateCollectionItemAdmission(admission.value, { ...sources, now });
  assertFineTuningPrivateCollectionItem(item.value, { ...sources, now });
  assertFineTuningPrivateCollectionItemReviewProjection(projection.value, {
    admission: admission.value,
    item: item.value,
    request: projectionRequest(projection.value),
    workspace: workspace.value,
  });
  assertDecisionReferences({ admission: admission.value, decision: decision.value, item: item.value, projection: projection.value, workspace: workspace.value });

  return {
    admission: admission.value,
    decision: decision.value,
    files: {
      admission,
      decision,
      executionRequest: executionRequestInput,
      executionResolution: executionResolutionInput,
      intakeResolution: intakeResolutionInput,
      item,
      plan: planInput,
      projection,
      workspace,
    },
    item: item.value,
    projection: projection.value,
    sources,
    tracked,
    workspace: workspace.value,
    workspaceDirectory: workspace.workspaceDirectory,
  };
}

function projectionRequest(projection) {
  return {
    admission: projection.admission,
    item: projection.item,
    requestedAt: projection.projectionRequest.requestedAt,
    requestedByRole: projection.projectionRequest.requestedByRole,
    schemaVersion: projection.projectionRequest.schemaVersion,
    target: projection.projectionRequest.target,
    workspace: projection.workspace,
  };
}

function assertDecisionReferences({ admission, decision, item, projection, workspace }) {
  if (
    decision.workspace.id !== workspace.id ||
    decision.workspace.workspaceHash !== workspace.workspaceHash ||
    decision.admission.id !== admission.id ||
    decision.admission.admissionHash !== admission.admissionHash ||
    decision.item.id !== item.id ||
    decision.item.itemHash !== item.itemHash ||
    decision.projection.id !== projection.id ||
    decision.projection.projectionHash !== projection.projectionHash ||
    decision.target !== projection.projectionKind
  ) {
    throw new Error('Fine-tuning private collection item review decision must bind the exact F1.12 projection.');
  }
}

function assertInputsUnchanged(initial, current) {
  if (
    initial.workspace.workspaceHash !== current.workspace.workspaceHash ||
    initial.workspace.id !== current.workspace.id ||
    initial.admission.admissionHash !== current.admission.admissionHash ||
    initial.item.itemHash !== current.item.itemHash ||
    initial.projection.projectionHash !== current.projection.projectionHash ||
    JSON.stringify(initial.decision) !== JSON.stringify(current.decision)
  ) {
    throw new Error('Fine-tuning private collection item review resolution inputs changed before the workspace lock.');
  }
  for (const key of Object.keys(initial.files)) {
    const previous = initial.files[key];
    const observed = current.files[key];
    if (
      previous.canonicalFilename !== observed.canonicalFilename ||
      !sameObservation(previous.initialFile, observed.initialFile) ||
      !previous.bytes.equals(observed.bytes)
    ) {
      throw new Error(`Fine-tuning private collection item review resolution ${key} changed before publication.`);
    }
  }
  for (const key of Object.keys(initial.tracked.states)) {
    const previous = initial.tracked.states[key];
    const observed = current.tracked.states[key];
    if (
      previous.canonicalFilename !== observed.canonicalFilename ||
      !sameObservation(previous.initialFile, observed.initialFile) ||
      !previous.bytes.equals(observed.bytes)
    ) {
      throw new Error('Fine-tuning private collection item review resolution tracked F1 chain changed before publication.');
    }
  }
}

function assertReadyToPublish(current) {
  const publishCurrent = loadInputs(filenames);
  assertInputsUnchanged(current, publishCurrent);
  const now = new Date().toISOString();
  assertFineTuningPrivateCollectionWorkspace(publishCurrent.workspace, { ...publishCurrent.sources, now });
  assertFineTuningPrivateCollectionItemAdmission(publishCurrent.admission, { ...publishCurrent.sources, now });
  assertFineTuningPrivateCollectionItem(publishCurrent.item, { ...publishCurrent.sources, now });
  assertFineTuningPrivateCollectionItemReviewProjection(publishCurrent.projection, {
    admission: publishCurrent.admission,
    item: publishCurrent.item,
    request: projectionRequest(publishCurrent.projection),
    workspace: publishCurrent.workspace,
  });
  assertNoTerminalOrRemovalHistory(publishCurrent);
  assertProjectionHistoryIsFinal(publishCurrent);
  if (
    Date.parse(now) >= Date.parse(publishCurrent.item.expiresAt) ||
    Date.parse(now) >= Date.parse(publishCurrent.item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item review resolution retention or approval expired.');
  }
}

function inspectHistory({ current, finalDirectory, historyRoot, pendingDirectory, generated }) {
  const finalName = path.basename(finalDirectory);
  const pendingName = path.basename(pendingDirectory);
  let final;
  let pending;
  const emptyPending = [];
  for (const name of readPrivateDirectory(historyRoot, 'Fine-tuning private collection item review resolution history')) {
    if (!/^[a-f0-9]{64}$/u.test(name) && !/^\.fine-tuning-private-collection-item-review-resolution-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private collection item review resolution history is invalid.');
    }
    const directory = path.join(historyRoot, name);
    if (/^[a-f0-9]{64}$/u.test(name)) {
      const bundle = readFinalBundle(directory);
      if (name !== bundle.resolution.item.itemHash) {
        throw new Error('Fine-tuning private collection item review resolution history is invalid.');
      }
      if (name === finalName) final = bundle;
      continue;
    }
    const names = readPrivateDirectory(directory, 'Fine-tuning private collection item review resolution pending history');
    if (sameNames(names, [])) {
      emptyPending.push({ directory, name });
      continue;
    }
    if (!sameNames(names, ['decision.json']) && !sameNames(names, ['decision.json', 'resolution.json'])) {
      throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
    }
    const decision = readHistoryDecision(path.join(directory, 'decision.json'));
    if (name !== `.fine-tuning-private-collection-item-review-resolution-pending-${decision.item.itemHash}-${decision.decisionHash}`) {
      throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
    }
    const bundle = {
      decision,
      ...(names.includes('resolution.json') ? { resolution: readResolution(path.join(directory, 'resolution.json')) } : {}),
    };
    if (bundle.resolution && !sameHistoryDecision(bundle.decision, bundle.resolution)) {
      throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
    }
    if (decision.item.itemHash === current.item.itemHash) {
      if (name !== pendingName) {
        throw new Error('Fine-tuning private collection item review resolution conflicts with a different decision.');
      }
      pending = bundle;
    }
  }
  if (final) {
    assertBundleMatchesCurrent(final, current, generated);
    if (pending || emptyPending.length > 0) {
      throw new Error('Fine-tuning private collection item review resolution history is ambiguous.');
    }
    return { final };
  }
  if (emptyPending.length > 0) {
    if (emptyPending.length === 1 && emptyPending[0].name === pendingName && !pending) {
      fs.rmdirSync(emptyPending[0].directory);
      fsyncDirectory(historyRoot);
    } else {
      throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
    }
  }
  if (pending) {
    assertStoredDecisionMatches(generated, pending.decision);
    if (pending.resolution) {
      assertFineTuningPrivateCollectionItemReviewResolution(pending.resolution, {
        admission: current.admission,
        decision: current.decision,
        item: current.item,
        projection: current.projection,
        workspace: current.workspace,
      });
    }
  }
  return { pending };
}

function assertBundleMatchesCurrent(bundle, current, generated) {
  if (!sameHistoryDecision(bundle.decision, bundle.resolution)) {
    throw new Error('Fine-tuning private collection item review resolution final history is invalid.');
  }
  assertStoredDecisionMatches(generated, bundle.decision);
  assertFineTuningPrivateCollectionItemReviewResolution(bundle.resolution, {
    admission: current.admission,
    decision: current.decision,
    item: current.item,
    projection: current.projection,
    workspace: current.workspace,
  });
}

function decisionHistoryRecord(resolution) {
  return {
    admission: resolution.admission,
    confirmationTokenSha256: resolution.decisionRecord.confirmationTokenSha256,
    decidedAt: resolution.decisionRecord.decidedAt,
    decidedByRole: resolution.decisionRecord.decidedByRole,
    decision: resolution.decision,
    decisionHash: resolution.decisionHash,
    evidenceSha256: resolution.decisionRecord.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${resolution.decisionHash}`,
    item: resolution.item,
    projection: resolution.projection,
    schemaVersion: resolution.decisionRecord.schemaVersion,
    target: resolution.target,
    workspace: resolution.workspace,
  };
}

function readHistoryDecision(filename) {
  const value = readOwnerOnlyJson(
    validatePrivateFilename(filename, 'Fine-tuning private collection item review resolution decision history'),
    'Fine-tuning private collection item review resolution decision history',
  ).value;
  assertHistoryDecisionRecord(value);
  return value;
}

function assertHistoryDecisionRecord(value) {
  const expectedKeys = [
    'admission', 'confirmationTokenSha256', 'decidedAt', 'decidedByRole', 'decision', 'decisionHash', 'evidenceSha256',
    'id', 'item', 'projection', 'schemaVersion', 'target', 'workspace',
  ];
  const decision = {
    confirmationTokenSha256: value?.confirmationTokenSha256,
    decidedAt: value?.decidedAt,
    decidedByRole: value?.decidedByRole,
    decision: value?.decision,
    evidenceSha256: value?.evidenceSha256,
    schemaVersion: value?.schemaVersion,
    target: value?.target,
  };
  if (
    !sameKeySet(value || {}, expectedKeys) ||
    !sameReference(value?.admission, 'fine-tuning-private-collection-item-admission-', 'admissionHash') ||
    !sameReference(value?.item, 'fine-tuning-private-collection-item-', 'itemHash') ||
    !sameReference(value?.projection, 'fine-tuning-private-collection-item-review-projection-', 'projectionHash') ||
    !sameReference(value?.workspace, 'fine-tuning-private-collection-workspace-', 'workspaceHash') ||
    !isSha256(decision.confirmationTokenSha256) ||
    !isSha256(decision.evidenceSha256) ||
    decision.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(decision.decision) ||
    decision.schemaVersion !== 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1' ||
    !['reviewed-example-candidate-review', 'answer-quality-case-enrichment-review'].includes(decision.target) ||
    !Number.isFinite(Date.parse(String(decision.decidedAt || ''))) ||
    value?.decisionHash !== hashRecord({ ...decision, decidedAt: new Date(Date.parse(decision.decidedAt)).toISOString() }) ||
    value?.id !== `fine-tuning-private-collection-item-review-resolution-decision-${value?.decisionHash}`
  ) {
    throw new Error('Fine-tuning private collection item review resolution decision history is invalid.');
  }
}

function sameHistoryDecision(decision, resolution) {
  return JSON.stringify(decision) === JSON.stringify(decisionHistoryRecord(resolution));
}

function assertStoredDecisionMatches(generated, stored) {
  if (!sameHistoryDecision(stored, generated)) {
    throw new Error('Fine-tuning private collection item review resolution conflicts with a different decision.');
  }
}

function readFinalBundle(directory) {
  if (!sameNames(readPrivateDirectory(directory, 'Fine-tuning private collection item review resolution final history'), ['decision.json', 'resolution.json'])) {
    throw new Error('Fine-tuning private collection item review resolution final history is invalid.');
  }
  const decision = readHistoryDecision(path.join(directory, 'decision.json'));
  const resolution = readResolution(path.join(directory, 'resolution.json'));
  if (!sameHistoryDecision(decision, resolution)) {
    throw new Error('Fine-tuning private collection item review resolution final history is invalid.');
  }
  return { decision, resolution };
}

function writePendingDecision(pendingDirectory, decision) {
  if (fs.existsSync(pendingDirectory)) {
    throw new Error('Fine-tuning private collection item review resolution pending history conflicts with the exact decision.');
  }
  fs.mkdirSync(pendingDirectory, { mode: 0o700 });
  fs.chmodSync(pendingDirectory, 0o700);
  assertOwnerOnlyDirectory(pendingDirectory, 'Fine-tuning private collection item review resolution pending history');
  fsyncDirectory(path.dirname(pendingDirectory));
  writePrivateJson(path.join(pendingDirectory, 'decision.json'), decision);
  fsyncDirectory(pendingDirectory);
  fsyncDirectory(path.dirname(pendingDirectory));
}

function writePendingResolution(pendingDirectory, resolution) {
  const decision = readHistoryDecision(path.join(pendingDirectory, 'decision.json'));
  if (!sameHistoryDecision(decision, resolution)) {
    throw new Error('Fine-tuning private collection item review resolution pending decision is invalid.');
  }
  if (!sameNames(readPrivateDirectory(pendingDirectory, 'Fine-tuning private collection item review resolution pending history'), ['decision.json'])) {
    throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
  }
  writePrivateJson(path.join(pendingDirectory, 'resolution.json'), resolution);
  fsyncDirectory(pendingDirectory);
  fsyncDirectory(path.dirname(pendingDirectory));
}

function publishPending({ finalDirectory, pendingDirectory, bundle }) {
  const pending = readFinalBundle(pendingDirectory);
  if (JSON.stringify(pending) !== JSON.stringify(bundle)) {
    throw new Error('Fine-tuning private collection item review resolution pending history is invalid.');
  }
  if (fs.existsSync(finalDirectory)) {
    throw new Error('Fine-tuning private collection item review resolution final history conflicts with pending state.');
  }
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncDirectory(path.dirname(finalDirectory));
  const final = readFinalBundle(finalDirectory);
  if (JSON.stringify(final) !== JSON.stringify(bundle)) {
    throw new Error('Fine-tuning private collection item review resolution published but integrity confirmation failed.');
  }
}

function assertProjectionHistoryIsFinal(current) {
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', current.workspace.workspaceHash);
  assertOwnerOnlyDirectory(root, 'Fine-tuning private collection item review projection history');
  const finalName = `${current.item.itemHash}.json`;
  let finalSeen = false;
  for (const name of readPrivateDirectory(root, 'Fine-tuning private collection item review projection history')) {
    if (!/^[a-f0-9]{64}\.json$/u.test(name) && !/^\.fine-tuning-private-collection-item-review-projection-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(name)) {
      throw new Error('Fine-tuning private collection item review projection history is invalid.');
    }
    if (name === finalName) finalSeen = true;
    if (name.startsWith(`.fine-tuning-private-collection-item-review-projection-pending-${current.item.itemHash}-`)) {
      throw new Error('Fine-tuning private collection item review projection has pending or ambiguous history.');
    }
  }
  if (!finalSeen) {
    throw new Error('Fine-tuning private collection item review projection must use the exact canonical F1.12 final history path.');
  }
}

function assertNoTerminalOrRemovalHistory(current) {
  assertNoRemovalDirectories(current.workspaceDirectory);
  const root = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-tombstones');
  if (!fs.existsSync(root)) return;
  assertOwnerOnlyDirectory(root, 'Fine-tuning private collection item tombstone history');
  const workspaceRoot = path.join(root, current.workspace.workspaceHash);
  if (!fs.existsSync(workspaceRoot)) return;
  for (const name of readPrivateDirectory(workspaceRoot, 'Fine-tuning private collection item tombstone history')) {
    const terminal = path.join(workspaceRoot, name);
    if (/^[a-f0-9]{64}$/u.test(name)) {
      const names = readPrivateDirectory(terminal, 'Fine-tuning private collection item terminal history');
      if (sameNames(names, ['tombstone.json'])) {
        const tombstone = readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'tombstone.json'), 'Fine-tuning private collection item tombstone history'), 'Fine-tuning private collection item tombstone history').value;
        assertFineTuningPrivateCollectionItemTombstone(tombstone);
        if (matchesTerminal(tombstone, current)) throw new Error('Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.');
        continue;
      }
      if (sameNames(names, ['absence-receipt.json', 'decision.json', 'tombstone.json'])) {
        const bundle = {
          decision: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'decision.json'), 'Fine-tuning private collection item terminal decision'), 'Fine-tuning private collection item terminal decision').value,
          receipt: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'absence-receipt.json'), 'Fine-tuning private collection item absence receipt'), 'Fine-tuning private collection item absence receipt').value,
          tombstone: readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'tombstone.json'), 'Fine-tuning private collection item tombstone history'), 'Fine-tuning private collection item tombstone history').value,
        };
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
        if (matchesTerminal(bundle.tombstone, current)) throw new Error('Fine-tuning private collection item is permanently blocked by a withdrawal or deletion tombstone.');
        continue;
      }
      throw new Error('Fine-tuning private collection item terminal history is invalid.');
    }
    if (/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(name)) {
      const names = readPrivateDirectory(terminal, 'Fine-tuning private collection item pending terminal history');
      if (!sameNames(names, ['decision.json'])) throw new Error('Fine-tuning private collection item pending terminal history is invalid.');
      const decision = readOwnerOnlyJson(validatePrivateFilename(path.join(terminal, 'decision.json'), 'Fine-tuning private collection item pending terminal decision'), 'Fine-tuning private collection item pending terminal decision').value;
      assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
      if (matchesTerminal(decision, current)) throw new Error('Fine-tuning private collection item has pending terminal lifecycle history.');
      continue;
    }
    throw new Error('Fine-tuning private collection item tombstone history is invalid.');
  }
}

function matchesTerminal(record, current) {
  return record.admission?.id === current.admission.id ||
    record.admission?.admissionHash === current.admission.admissionHash ||
    record.item?.id === current.item.id ||
    record.item?.itemHash === current.item.itemHash ||
    record.withdrawalReferenceSha256 === current.item.retention.withdrawalReferenceSha256;
}

function assertNoRemovalDirectories(workspaceDirectory) {
  for (const lane of LANES) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of readPrivateDirectory(laneDirectory, 'Fine-tuning private collection workspace')) {
      if (/^\.fine-tuning-private-collection-item-removal-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection item removal history requires manual recovery.');
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
      const itemDirectory = path.join(laneDirectory, name);
      if (!sameNames(readPrivateDirectory(itemDirectory, 'Fine-tuning private collection workspace item'), ['item.json'])) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
      const stored = readOwnerOnlyJson(validatePrivateFilename(path.join(itemDirectory, 'item.json'), 'Fine-tuning private collection workspace item'), 'Fine-tuning private collection workspace item').value;
      assertFineTuningPrivateCollectionItemRecord(stored);
      if (stored.lane !== lane || name !== `fine-tuning-private-collection-item-${stored.admission.admissionHash}`) {
        throw new Error('Fine-tuning private collection workspace is invalid.');
      }
    }
  }
}

function prepareHistoryRoot(workspaceHash) {
  const directories = [
    [path.join(repoDir, 'var'), true],
    [path.join(repoDir, 'var', 'fine-tuning'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions'), false],
    [path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions', workspaceHash), false],
  ];
  for (const [directory, allowGroupRead] of directories) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
    }
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection item review resolution history', { allowGroupRead });
  }
  const root = fs.realpathSync(directories.at(-1)[0]);
  if (!isPathWithin(path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions'), root)) {
    throw new Error('Fine-tuning private collection item review resolution history is invalid.');
  }
  return root;
}

function readWorkspace(input, executionResolution) {
  if (!isSha256(executionResolution?.resolutionHash)) throw new Error('Fine-tuning private collection workspace resolution hash is invalid.');
  const workspaceDirectory = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`);
  assertExactCanonicalFilename(input, path.join(workspaceDirectory, 'workspace.json'), 'Fine-tuning private collection workspace must use the exact prepared workspace location.');
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection workspace');
  assertFineTuningPrivateCollectionWorkspaceRecord(result.value);
  if (result.value.executionResolution.id !== executionResolution.id || result.value.executionResolution.resolutionHash !== executionResolution.resolutionHash) {
    throw new Error('Fine-tuning private collection workspace is invalid.');
  }
  for (const directory of [workspaceDirectory, ...LANES.map((lane) => path.join(workspaceDirectory, lane))]) {
    assertOwnerOnlyDirectory(directory, 'Fine-tuning private collection workspace');
  }
  return { ...result, workspaceDirectory };
}

function readAdmission(input, workspace) {
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection item admission');
  assertFineTuningPrivateCollectionItemAdmissionRecord(result.value);
  const expected = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-admissions', result.value.id, 'admission.json');
  if (!isExactCanonicalFilename(input, expected) || result.value.workspace.id !== workspace.id || result.value.workspace.workspaceHash !== workspace.workspaceHash) {
    throw new Error('Fine-tuning private collection item admission must use the exact admission history location.');
  }
  return result;
}

function readItem(input, admission, workspace, workspaceDirectory) {
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection item');
  assertFineTuningPrivateCollectionItemRecord(result.value);
  const expected = path.join(workspaceDirectory, admission.envelope.lane, `fine-tuning-private-collection-item-${admission.admissionHash}`, 'item.json');
  if (
    !isExactCanonicalFilename(input, expected) ||
    result.value.admission.id !== admission.id ||
    result.value.admission.admissionHash !== admission.admissionHash ||
    result.value.workspace.id !== workspace.id ||
    result.value.workspace.workspaceHash !== workspace.workspaceHash ||
    result.value.lane !== admission.envelope.lane
  ) {
    throw new Error('Fine-tuning private collection item must use the exact F1.10 stored item location.');
  }
  return result;
}

function readProjection(input, admission, item, workspace) {
  const expected = path.join(repoDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', workspace.workspaceHash, `${item.itemHash}.json`);
  assertExactCanonicalFilename(input, expected, 'Fine-tuning private collection item review projection must use the exact canonical F1.12 final history path.');
  const result = readOwnerOnlyJson(input, 'Fine-tuning private collection item review projection');
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(result.value);
  if (
    result.value.workspace.id !== workspace.id || result.value.workspace.workspaceHash !== workspace.workspaceHash ||
    result.value.admission.id !== admission.id || result.value.admission.admissionHash !== admission.admissionHash ||
    result.value.item.id !== item.id || result.value.item.itemHash !== item.itemHash
  ) {
    throw new Error('Fine-tuning private collection item review projection is invalid.');
  }
  return result;
}

function readTrackedSources() {
  const artifactDir = path.join(repoDir, 'evidence', 'output-artifacts');
  const states = {
    assessment: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json')),
    collectionPlan: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json')),
    intakeRequest: readTrackedJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json')),
  };
  return { states, values: Object.fromEntries(Object.entries(states).map(([key, value]) => [key, value.value])) };
}

function parseFilenames(args) {
  const expected = [
    '--workspace', 'workspace', '--admission', 'admission', '--item', 'item', '--projection', 'projection', '--decision', 'decision',
    '--execution-resolution', 'executionResolution', '--execution-request', 'executionRequest', '--plan', 'plan', '--intake-resolution', 'intakeResolution',
  ];
  if (args.length !== expected.length || expected.some((value, index) => index % 2 === 0 && args[index] !== value) || expected.some((_, index) => index % 2 === 1 && !String(args[index] || '').trim())) {
    throw new Error('Expected --workspace <private-json-path> --admission <private-json-path> --item <private-json-path> --projection <private-json-path> --decision <private-json-path> --execution-resolution <private-json-path> --execution-request <private-json-path> --plan <private-json-path> --intake-resolution <private-json-path>.');
  }
  return Object.fromEntries(expected.filter((_, index) => index % 2 === 1).map((key, index) => [key, args[index * 2 + 1]]));
}

function validatePrivateFilename(value, errorPrefix) {
  const filename = path.resolve(repoDir, value);
  const varDir = path.join(repoDir, 'var');
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    if (initialFile.isSymbolicLink()) throw new Error();
    assertOwnerOnlyFile(initialFile, errorPrefix);
    canonicalFilename = fs.realpathSync(filename);
    if (!sameObservation(initialFile, fs.lstatSync(filename)) || !sameObservation(initialFile, fs.statSync(canonicalFilename))) throw new Error();
  } catch {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
  const relative = findRelativePath(repoDir, filename);
  const lexicalInRepo = relative !== null;
  const lexicalInVar = relative === 'var' || relative?.startsWith(`var${path.sep}`);
  if ((lexicalInRepo && (!lexicalInVar || !isPathWithin(varDir, canonicalFilename))) || (isPathWithin(repoDir, canonicalFilename) && !isPathWithin(varDir, canonicalFilename))) {
    throw new Error(`${errorPrefix} must remain private under var/ or outside the repository.`);
  }
  return { canonicalFilename, filename, initialFile };
}

function readOwnerOnlyJson(input, errorPrefix) {
  let descriptor;
  try { descriptor = fs.openSync(input.canonicalFilename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)); }
  catch { throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`); }
  try {
    const before = fs.fstatSync(descriptor);
    assertOwnerOnlyFile(before, errorPrefix);
    if (!sameObservation(input.initialFile, before) || fs.realpathSync(input.filename) !== input.canonicalFilename) throw new Error(`${errorPrefix} changed before it was read.`);
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameObservation(before, after)) throw new Error(`${errorPrefix} changed while it was read.`);
    try { return { ...input, bytes, value: JSON.parse(bytes.toString('utf8')) }; }
    catch { throw new Error(`${errorPrefix} JSON is invalid.`); }
  } finally { fs.closeSync(descriptor); }
}

function readTrackedJson(filename) {
  let initialFile;
  let canonicalFilename;
  try {
    initialFile = fs.lstatSync(filename);
    canonicalFilename = fs.realpathSync(filename);
    if (!initialFile.isFile() || initialFile.isSymbolicLink() || initialFile.nlink !== 1 || initialFile.size <= 0 || initialFile.size > MAX_JSON_BYTES) throw new Error();
    const bytes = fs.readFileSync(canonicalFilename);
    if (!sameObservation(initialFile, fs.lstatSync(filename)) || !sameObservation(initialFile, fs.statSync(canonicalFilename))) throw new Error();
    return { bytes, canonicalFilename, filename, initialFile, value: JSON.parse(bytes.toString('utf8')) };
  } catch { throw new Error('Fine-tuning private collection item review resolution tracked F1 chain is invalid.'); }
}

function readResolution(filename) {
  const value = readOwnerOnlyJson(validatePrivateFilename(filename, 'Fine-tuning private collection item review resolution history'), 'Fine-tuning private collection item review resolution history').value;
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(value);
  return value;
}

function writePrivateJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  fsyncFile(filename);
  assertOwnerOnlyFile(fs.lstatSync(filename), 'Fine-tuning private collection item review resolution pending history');
}

function readPrivateDirectory(directory, errorPrefix) {
  assertOwnerOnlyDirectory(directory, errorPrefix);
  return fs.readdirSync(directory).sort();
}

function assertOwnerOnlyDirectory(directory, errorPrefix, { allowGroupRead = false } = {}) {
  let stat;
  try { stat = fs.lstatSync(directory); }
  catch { throw new Error(`${errorPrefix} is invalid.`); }
  const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
  if (!stat.isDirectory() || stat.isSymbolicLink() || !isCurrentUserOwned(stat) || (stat.mode & forbiddenMode) !== 0) throw new Error(`${errorPrefix} is invalid.`);
}

function assertOwnerOnlyFile(stat, errorPrefix) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size <= 0 || stat.size > MAX_JSON_BYTES || !isCurrentUserOwned(stat) || (stat.mode & 0o077) !== 0) {
    throw new Error(`${errorPrefix} must be an owner-only bounded regular file.`);
  }
}

function fsyncFile(filename) {
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
}

function sameObservation(left, right) {
  return left.dev === right.dev && left.ino === right.ino && (left.mode & 0o777) === (right.mode & 0o777) && left.size === right.size && left.nlink === right.nlink;
}

function sameNames(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sameReference(value, prefix, hashField) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    sameKeySet(value, ['id', hashField]) &&
    isSha256(value[hashField]) && value.id === `${prefix}${value[hashField]}`;
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sameKeySet(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function isExactCanonicalFilename(input, expected) {
  try {
    assertExactCanonicalFilename(input, expected, 'Fine-tuning private collection item history is invalid.');
    return true;
  } catch {
    return false;
  }
}

function assertExactCanonicalFilename(input, expected, errorMessage) {
  if (input.canonicalFilename !== expected) {
    throw new Error(errorMessage);
  }
  const relative = path.relative(repoDir, expected);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(errorMessage);
  }
  let current = repoDir;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(errorMessage);
    }
  }
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function findRelativePath(directory, candidate) {
  const directoryStat = fs.statSync(directory);
  let current = candidate;
  while (true) {
    try {
      const stat = fs.statSync(current);
      if (stat.dev === directoryStat.dev && stat.ino === directoryStat.ino) return path.relative(current, candidate);
    } catch { /* bounded file check reports unreadable paths */ }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
