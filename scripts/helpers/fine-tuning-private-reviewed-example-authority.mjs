import fs from 'node:fs';
import path from 'node:path';

import { assertFineTuningDataCollectionPlan } from '../../src/core/fine-tuning-data-collection-plan.mjs';
import { assertFineTuningDataIntakeRequest } from '../../src/core/fine-tuning-data-intake-request.mjs';
import { assertFineTuningDataSufficiencyAssessment } from '../../src/core/fine-tuning-data-sufficiency.mjs';
import {
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord,
} from '../../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
} from '../../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
} from '../../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from '../../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  assertFineTuningPrivateCollectionItemReviewResolutionRecord,
} from '../../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItem,
  assertFineTuningPrivateCollectionItemRecord,
} from '../../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionWorkspace,
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningPrivateReviewedExampleSourceBundle,
} from '../../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertSamePrivateJsonState,
  readPrivateDirectory,
  readPrivateJsonState,
} from './private-json-state.mjs';

const F1_15_PENDING_PREFIX =
  '.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-';

export function loadFineTuningPrivateReviewedExampleAuthority({
  filenames,
  repoDir,
  label = 'F1.21',
}) {
  const inputStates = readAuthorityInputs({ filenames, label, repoDir });
  const values = Object.fromEntries(
    Object.entries(inputStates).map(([key, state]) => [key, state.value]),
  );
  const tracked = readTrackedF1Chain({ label, repoDir });

  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(
    values.artifactPreparationResolution,
  );

  const now = new Date().toISOString();
  const sources = {
    assessment: tracked.assessment.value,
    collectionPlan: tracked.collectionPlan.value,
    executionRequest: values.executionRequest,
    executionResolution: values.executionResolution,
    intakeRequest: tracked.intakeRequest.value,
    intakeResolution: values.intakeResolution,
    privateCollectionPlan: values.privateCollectionPlan,
  };
  assertFineTuningDataSufficiencyAssessment(sources.assessment);
  assertFineTuningDataCollectionPlan(sources.collectionPlan, {
    assessment: sources.assessment,
  });
  assertFineTuningDataIntakeRequest(sources.intakeRequest, {
    assessment: sources.assessment,
    collectionPlan: sources.collectionPlan,
    now,
  });
  assertFineTuningPrivateCollectionWorkspace(values.workspace, {
    ...sources,
    now,
  });
  assertFineTuningPrivateCollectionItemAdmission(values.admission, {
    ...sources,
    now,
    workspace: values.workspace,
  });
  assertFineTuningPrivateCollectionItem(values.item, {
    ...sources,
    admission: values.admission,
    now,
    workspace: values.workspace,
  });

  assertCanonicalAuthorityPaths({ inputStates, label, repoDir, values });
  assertFineTuningPrivateReviewedExampleAuthorityCurrent(values);
  const predecessorStates = readPredecessors(values, { label, repoDir });
  assertF1_15Bundle(values, { label, repoDir });
  assertNoTerminalOrRemovalHistory(values, { label, repoDir });

  return {
    ...values,
    states: { ...inputStates, ...predecessorStates },
    tracked,
  };
}

export function loadFineTuningPrivateReviewedExampleSource({
  authority,
  filename,
  repoDir,
  label = 'F1.21',
}) {
  const sourceState = readPrivateJsonState(
    filename,
    `${label} sourceBundle`,
    { repoDir },
  );
  const current = {
    ...authority,
    sourceBundle: assertFineTuningPrivateReviewedExampleSourceBundle(
      sourceState.value,
    ),
    states: {
      ...authority.states,
      sourceBundle: sourceState,
    },
  };
  assertFineTuningPrivateReviewedExampleSourceCurrent(current);
  return current;
}

export function assertSameFineTuningPrivateReviewedExampleAuthority(
  left,
  right,
  {
    compareTrackedFileIdentity = false,
    label = 'F1.21',
  } = {},
) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `${label} ${key}`,
    );
  }
  for (const key of Object.keys(left.tracked)) {
    const previous = left.tracked[key];
    const current = right.tracked[key];
    if (
      previous.filename !== current.filename ||
      !previous.bytes.equals(current.bytes) ||
      (compareTrackedFileIdentity &&
        !sameFile(previous.file, current.file))
    ) {
      throw new Error(`${label} tracked ${key} changed while resolving.`);
    }
  }
}

export function assertFineTuningPrivateReviewedExampleAuthorityCurrent(current) {
  const {
    admission,
    artifactPreparationResolution: resolution,
    item,
    workspace,
  } = current;
  const approved =
    item.lane === 'reviewed-examples' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(admission.workspace, workspace, 'workspaceHash') &&
    sameReference(item.admission, admission, 'admissionHash') &&
    sameReference(item.workspace, workspace, 'workspaceHash') &&
    sameReference(resolution.admission, admission, 'admissionHash') &&
    sameReference(resolution.item, item, 'itemHash') &&
    sameReference(resolution.workspace, workspace, 'workspaceHash') &&
    resolution.decision === 'approve' &&
    resolution.reviewedExampleCanonicalizationPreparationAllowed === true &&
    resolution.approvedTrainingRecordCreated === false &&
    resolution.eligibilityEvaluated === false &&
    resolution.fineTuningExecutionAuthorized === false &&
    resolution.externalSubmissionAuthorized === false &&
    resolution.productionReadyClaim === false;

  if (!approved) {
    throw new Error(
      'Private reviewed example canonicalization requires one approved live F1.15 reviewed-example source.',
    );
  }
  assertFineTuningPrivateReviewedExampleWindow(current);
}

export function assertFineTuningPrivateReviewedExampleSourceCurrent(current) {
  const { admission, item, sourceBundle, workspace } = current;
  const matchesAuthority =
    sourceBundle.admission.admissionHash === admission.admissionHash &&
    sourceBundle.item.itemHash === item.itemHash &&
    sourceBundle.workspace.workspaceHash === workspace.workspaceHash &&
    sourceBundle.lineageSha256 === admission.envelope.source.lineageSha256 &&
    sourceBundle.referenceSha256 === admission.envelope.source.referenceSha256 &&
    sourceBundle.scopeReferenceSha256 ===
      admission.envelope.source.scopeReferenceSha256 &&
    JSON.stringify(sourceBundle.example) === JSON.stringify(item.example);

  if (!matchesAuthority) {
    throw new Error(
      'Private reviewed example canonicalization requires one approved live F1.15 reviewed-example source.',
    );
  }
}

export function assertFineTuningPrivateReviewedExampleWindow(current) {
  const now = Date.now();
  if (
    now >= Date.parse(current.item.expiresAt) ||
    now >= Date.parse(current.item.retention.deleteBy)
  ) {
    throw new Error('Private reviewed example canonicalization item is expired.');
  }
}

function readAuthorityInputs({ filenames, label, repoDir }) {
  return Object.fromEntries(
    Object.entries(filenames)
      .filter(([key]) => key !== 'sourceBundle')
      .map(([key, filename]) => [
        key,
        readPrivateJsonState(filename, `${label} ${key}`, { repoDir }),
      ]),
  );
}

function assertCanonicalAuthorityPaths({
  inputStates,
  label,
  repoDir,
  values,
}) {
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${values.workspace.bindings.executionResolutionHash}`,
  );
  assertCanonicalPrivateJsonState(
    inputStates.workspace,
    path.join(workspaceDirectory, 'workspace.json'),
    `${label} workspace`,
  );
  assertCanonicalPrivateJsonState(
    inputStates.admission,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-admissions',
      values.admission.id,
      'admission.json',
    ),
    `${label} admission`,
  );
  assertCanonicalPrivateJsonState(
    inputStates.item,
    path.join(
      workspaceDirectory,
      values.item.lane,
      `fine-tuning-private-collection-item-${values.item.admission.admissionHash}`,
      'item.json',
    ),
    `${label} item`,
  );
  assertCanonicalPrivateJsonState(
    inputStates.artifactPreparationResolution,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-preparation-resolutions',
      values.workspace.workspaceHash,
      values.item.itemHash,
      'resolution.json',
    ),
    `${label} F1.15 resolution`,
  );
}

function readTrackedF1Chain({ label, repoDir }) {
  const filenames = {
    assessment: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    ),
    collectionPlan: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-collection-plan.json',
    ),
    intakeRequest: path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-intake-request.json',
    ),
  };
  return Object.fromEntries(
    Object.entries(filenames).map(([key, filename]) => {
      const before = fs.lstatSync(filename);
      if (
        !before.isFile() ||
        before.isSymbolicLink() ||
        before.nlink !== 1
      ) {
        throw new Error(`${label} tracked ${key} is invalid.`);
      }
      const bytes = fs.readFileSync(filename);
      const after = fs.lstatSync(filename);
      if (
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        bytes.length === 0
      ) {
        throw new Error(`${label} tracked ${key} changed while reading.`);
      }
      return [
        key,
        {
          bytes,
          file: after,
          filename,
          value: JSON.parse(bytes.toString('utf8')),
        },
      ];
    }),
  );
}

function readPredecessors(current, { label, repoDir }) {
  const { workspaceHash } = current.workspace;
  const { itemHash } = current.item;
  const filenames = {
    artifactRequest: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      workspaceHash,
      `${itemHash}.json`,
    ),
    projection: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-projections',
      workspaceHash,
      `${itemHash}.json`,
    ),
    reviewResolution: path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-resolutions',
      workspaceHash,
      itemHash,
      'resolution.json',
    ),
  };
  const states = Object.fromEntries(
    Object.entries(filenames).map(([key, filename]) => [
      `predecessor:${key}`,
      readPrivateJsonState(filename, `${label} ${key}`, { repoDir }),
    ]),
  );
  const projection = states['predecessor:projection'].value;
  const reviewResolution = states['predecessor:reviewResolution'].value;
  const artifactRequest = states['predecessor:artifactRequest'].value;

  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(artifactRequest);

  const lineageMatches =
    sameReference(projection.admission, current.admission, 'admissionHash') &&
    sameReference(projection.item, current.item, 'itemHash') &&
    sameReference(projection.workspace, current.workspace, 'workspaceHash') &&
    sameReference(
      reviewResolution.projection,
      projection,
      'projectionHash',
    ) &&
    sameReference(reviewResolution.item, current.item, 'itemHash') &&
    sameReference(
      reviewResolution.workspace,
      current.workspace,
      'workspaceHash',
    ) &&
    sameReference(artifactRequest.projection, projection, 'projectionHash') &&
    sameReference(
      artifactRequest.reviewResolution,
      reviewResolution,
      'resolutionHash',
    ) &&
    sameReference(artifactRequest.item, current.item, 'itemHash') &&
    sameReference(
      artifactRequest.workspace,
      current.workspace,
      'workspaceHash',
    ) &&
    sameReference(
      current.artifactPreparationResolution.projection,
      projection,
      'projectionHash',
    ) &&
    sameReference(
      current.artifactPreparationResolution.reviewResolution,
      reviewResolution,
      'resolutionHash',
    ) &&
    sameReference(
      current.artifactPreparationResolution.artifactRequest,
      artifactRequest,
      'artifactRequestHash',
    );
  if (!lineageMatches) {
    throw new Error(`${label} predecessor lineage is invalid.`);
  }

  assertNoCurrentPending(
    path.dirname(filenames.projection),
    itemHash,
    'F1.12 projection',
    { label, repoDir },
  );
  assertNoCurrentPending(
    path.dirname(path.dirname(filenames.reviewResolution)),
    itemHash,
    'F1.13 review resolution',
    { label, repoDir },
  );
  assertNoCurrentPending(
    path.dirname(filenames.artifactRequest),
    itemHash,
    'F1.14 artifact request',
    { label, repoDir },
  );
  return states;
}

function assertNoCurrentPending(
  root,
  itemHash,
  historyLabel,
  { label, repoDir },
) {
  const names = readPrivateDirectory(
    root,
    `${label} ${historyLabel} history`,
    { repoDir },
  );
  if (names.some((name) => name.startsWith('.') && name.includes(itemHash))) {
    throw new Error(`${label} ${historyLabel} history is pending.`);
  }
}

function assertF1_15Bundle(current, { label, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-preparation-resolutions',
    current.workspace.workspaceHash,
  );
  let found = null;

  for (const name of readPrivateDirectory(
    root,
    `${label} F1.15 history`,
    { repoDir },
  )) {
    const final = /^[a-f0-9]{64}$/u.test(name);
    const pending = new RegExp(
      `^\\${F1_15_PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!final && !pending) {
      throw new Error(`${label} F1.15 history is invalid.`);
    }

    const directory = path.join(root, name);
    const names = readPrivateDirectory(
      directory,
      `${label} F1.15 history entry`,
      { repoDir },
    );
    if (
      JSON.stringify(names) !==
      JSON.stringify(['decision.json', 'resolution.json'])
    ) {
      throw new Error(`${label} F1.15 history bundle is invalid.`);
    }

    const resolution = readPrivateJsonState(
      path.join(directory, 'resolution.json'),
      `${label} F1.15 resolution history`,
      { repoDir },
    ).value;
    const decision = readPrivateJsonState(
      path.join(directory, 'decision.json'),
      `${label} F1.15 decision history`,
      { repoDir },
    ).value;
    assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(
      resolution,
    );

    const expectedName = final
      ? resolution.item.itemHash
      : `${F1_15_PENDING_PREFIX}${resolution.item.itemHash}-${resolution.bindings.artifactPreparationDecisionHash}`;
    const lineageMatches =
      resolution.workspace.workspaceHash === current.workspace.workspaceHash &&
      name === expectedName &&
      decision?.artifactPreparationDecisionHash ===
        resolution.bindings.artifactPreparationDecisionHash &&
      JSON.stringify(decision?.decisionRecord) ===
        JSON.stringify(resolution.decisionRecord) &&
      JSON.stringify(decision?.artifactRequest) ===
        JSON.stringify(resolution.artifactRequest) &&
      JSON.stringify(decision?.item) === JSON.stringify(resolution.item) &&
      JSON.stringify(decision?.workspace) === JSON.stringify(resolution.workspace);
    if (!lineageMatches) {
      throw new Error(`${label} F1.15 history lineage is invalid.`);
    }

    if (resolution.item.itemHash === current.item.itemHash) {
      if (pending) {
        throw new Error(
          `${label} requires F1.15 resolution history without current pending state.`,
        );
      }
      if (found) {
        throw new Error(
          `${label} F1.15 final resolution history is ambiguous.`,
        );
      }
      found = resolution;
    }
  }

  if (
    !found ||
    JSON.stringify(found) !==
      JSON.stringify(current.artifactPreparationResolution)
  ) {
    throw new Error(
      `${label} requires one approved canonical F1.15 resolution.`,
    );
  }
}

function assertNoTerminalOrRemovalHistory(current, { label, repoDir }) {
  assertNoPendingItemRemoval(current, { label, repoDir });
  assertNoTerminalItemHistory(current, { label, repoDir });
  assertNoCanonicalRecordDeletionCascade(current, { label, repoDir });
}

function assertNoPendingItemRemoval(current, { label, repoDir }) {
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${current.workspace.bindings.executionResolutionHash}`,
  );
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const names = readPrivateDirectory(
      path.join(workspaceDirectory, lane),
      `${label} private collection workspace`,
      { repoDir },
    );
    if (
      names.some((name) =>
        name.startsWith('.fine-tuning-private-collection-item-removal-'))
    ) {
      throw new Error(`${label} removal history requires recovery.`);
    }
  }
}

function assertNoTerminalItemHistory(current, { label, repoDir }) {
  const terminalRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    current.workspace.workspaceHash,
  );
  if (!fs.lstatSync(terminalRoot, { throwIfNoEntry: false })) {
    return;
  }

  for (const name of readPrivateDirectory(
    terminalRoot,
    `${label} terminal history`,
    { repoDir },
  )) {
    const directory = path.join(terminalRoot, name);
    const names = readPrivateDirectory(
      directory,
      `${label} terminal history entry`,
      { repoDir },
    );
    if (!names.includes('decision.json')) {
      if (name === current.item.retention.withdrawalReferenceSha256) {
        throw new Error(`${label} is blocked by terminal history.`);
      }
      continue;
    }

    const decision = readPrivateJsonState(
      path.join(directory, 'decision.json'),
      `${label} terminal decision`,
      { repoDir },
    ).value;
    assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
    if (
      names.includes('absence-receipt.json') &&
      names.includes('tombstone.json')
    ) {
      assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({
        decision,
        receipt: readPrivateJsonState(
          path.join(directory, 'absence-receipt.json'),
          `${label} terminal absence receipt`,
          { repoDir },
        ).value,
        tombstone: readPrivateJsonState(
          path.join(directory, 'tombstone.json'),
          `${label} terminal tombstone`,
          { repoDir },
        ).value,
      });
    }

    const sameItem =
      decision.item.itemHash === current.item.itemHash ||
      decision.admission.admissionHash === current.admission.admissionHash ||
      decision.withdrawalReferenceSha256 ===
        current.item.retention.withdrawalReferenceSha256;
    if (sameItem) {
      throw new Error(`${label} is blocked by terminal history.`);
    }
  }
}

function assertNoCanonicalRecordDeletionCascade(
  current,
  { label, repoDir },
) {
  const cascadeRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-reviewed-example-canonical-record-deletion-cascades',
    current.workspace.workspaceHash,
  );
  if (!fs.lstatSync(cascadeRoot, { throwIfNoEntry: false })) {
    return;
  }

  const names = readPrivateDirectory(
    cascadeRoot,
    `${label} deletion cascade history`,
    { repoDir },
  );
  const blocked = names.some(
    (name) =>
      name === current.item.retention.withdrawalReferenceSha256 ||
      name.startsWith('.pending-'),
  );
  if (blocked) {
    throw new Error(`${label} is blocked by deletion cascade history.`);
  }
}

function sameReference(left, right, hashField) {
  return left?.id === right?.id && left?.[hashField] === right?.[hashField];
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    (left.mode & 0o777) === (right.mode & 0o777)
  );
}
