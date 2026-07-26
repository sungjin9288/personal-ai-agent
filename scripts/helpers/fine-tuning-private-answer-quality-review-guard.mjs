import fs from 'node:fs';
import path from 'node:path';

import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding,
} from '../../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { assertFineTuningPrivateCollectionItemTombstone } from '../../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertPrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
} from './private-json-state.mjs';

const LANES = ['reviewed-examples', 'answer-quality-cases'];

export function assertFineTuningPrivateAnswerQualityReviewInputs({
  repoDir,
  states,
  values,
}) {
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-` +
      values.workspace.executionResolution.resolutionHash,
  );
  assertCanonicalPrivateJsonState(
    states.workspace,
    path.join(workspaceDirectory, 'workspace.json'),
    'F1.17 workspace',
  );
  assertCanonicalPrivateJsonState(
    states.admission,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-collection-item-admissions',
      values.admission.id,
      'admission.json',
    ),
    'F1.17 admission',
  );
  assertCanonicalPrivateJsonState(
    states.item,
    path.join(
      workspaceDirectory,
      values.item.lane,
      `fine-tuning-private-collection-item-${values.admission.admissionHash}`,
      'item.json',
    ),
    'F1.17 item',
  );
  assertCanonicalPrivateJsonState(
    states.candidate,
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      'private-answer-quality-enrichment-candidates',
      values.workspace.workspaceHash,
      values.item.itemHash,
      'candidate.json',
    ),
    'F1.17 candidate',
  );

  const { admission, candidate, decision, item, workspace } = values;
  const exact =
    item.lane === 'answer-quality-cases' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(admission.workspace, workspace, 'workspaceHash') &&
    sameReference(admission.envelope.workspace, workspace, 'workspaceHash') &&
    sameReference(item.admission, admission, 'admissionHash') &&
    sameReference(item.workspace, workspace, 'workspaceHash') &&
    sameReference(candidate.admission, admission, 'admissionHash') &&
    sameReference(candidate.item, item, 'itemHash') &&
    sameReference(candidate.workspace, workspace, 'workspaceHash') &&
    sameReference(decision.admission, admission, 'admissionHash') &&
    sameReference(decision.candidate, candidate, 'candidateHash') &&
    sameReference(decision.item, item, 'itemHash') &&
    sameReference(decision.workspace, workspace, 'workspaceHash');
  if (!exact) {
    throw new Error(
      'Fine-tuning private answer quality enrichment candidate review must bind one exact current F1.16 candidate.',
    );
  }
}

export function assertFineTuningPrivateAnswerQualityReviewState({
  current,
  repoDir,
}) {
  assertNoTerminalOrRemovalHistory({ current, repoDir });
  assertWorkspaceItemHistory({ current, repoDir });
  assertCanonicalCandidateHistory({ current, repoDir });
}

function assertCanonicalCandidateHistory({ current, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidates',
    current.workspace.workspaceHash,
  );
  let final = null;
  let matchingPending = false;

  for (const name of readPrivateDirectory(root, 'F1.17 F1.16 candidate history', {
    repoDir,
  })) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending =
      /^\.private-answer-quality-case-pending-[a-f0-9]{64}-[a-f0-9]{64}$/u.test(
        name,
      );
    if (!isFinal && !isPending) {
      throw new Error('F1.17 F1.16 candidate history is invalid.');
    }
    const directory = path.join(root, name);
    if (
      !sameNames(
        readPrivateDirectory(directory, 'F1.17 F1.16 candidate history entry', {
          repoDir,
        }),
        ['candidate.json'],
      )
    ) {
      throw new Error('F1.17 F1.16 candidate history is invalid.');
    }
    const stored = readPrivateJsonState(
      path.join(directory, 'candidate.json'),
      'F1.17 F1.16 candidate history',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(stored);
    const expectedPending =
      `.private-answer-quality-case-pending-${stored.item.itemHash}-` +
      stored.bindings.answerQualityCaseEnrichmentInputHash;
    if (
      stored.workspace.workspaceHash !== current.workspace.workspaceHash ||
      (isFinal && name !== stored.item.itemHash) ||
      (isPending && name !== expectedPending)
    ) {
      throw new Error('F1.17 F1.16 candidate history is invalid.');
    }
    if (stored.item.itemHash !== current.item.itemHash) {
      continue;
    }
    if (isPending) {
      matchingPending = true;
      continue;
    }
    if (final) {
      throw new Error('F1.17 F1.16 final candidate history is ambiguous.');
    }
    final = stored;
  }

  if (
    matchingPending ||
    !final ||
    JSON.stringify(final) !== JSON.stringify(current.candidate)
  ) {
    throw new Error(
      'F1.17 requires one current canonical F1.16 final candidate without pending history.',
    );
  }
}

function assertWorkspaceItemHistory({ current, repoDir }) {
  const workspaceDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-` +
      current.workspace.executionResolution.resolutionHash,
  );
  let exactCurrentItem = false;
  for (const lane of LANES) {
    const laneDirectory = path.join(workspaceDirectory, lane);
    for (const name of readPrivateDirectory(
      laneDirectory,
      'F1.17 private collection workspace lane',
      { repoDir },
    )) {
      if (/^\.fine-tuning-private-collection-item-removal-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('F1.17 removal history requires recovery.');
      }
      if (!/^fine-tuning-private-collection-item-[a-f0-9]{64}$/u.test(name)) {
        throw new Error('F1.17 private collection workspace lane is invalid.');
      }
      const directory = path.join(laneDirectory, name);
      if (
        !sameNames(
          readPrivateDirectory(directory, 'F1.17 workspace item', { repoDir }),
          ['item.json'],
        )
      ) {
        throw new Error('F1.17 workspace item is invalid.');
      }
      const state = readPrivateJsonState(
        path.join(directory, 'item.json'),
        'F1.17 workspace item',
        { repoDir },
      );
      assertFineTuningPrivateCollectionItemRecord(state.value);
      if (
        state.value.workspace.workspaceHash !==
          current.workspace.workspaceHash ||
        state.value.lane !== lane ||
        name !==
          `fine-tuning-private-collection-item-${state.value.admission.admissionHash}`
      ) {
        throw new Error('F1.17 workspace item is invalid.');
      }
      if (state.value.itemHash === current.item.itemHash) {
        if (
          exactCurrentItem ||
          state.canonicalFilename !== current.states.item.canonicalFilename ||
          !state.bytes.equals(current.states.item.bytes)
        ) {
          throw new Error('F1.17 current workspace item is ambiguous.');
        }
        exactCurrentItem = true;
      }
    }
  }
  if (!exactCurrentItem) {
    throw new Error('F1.17 current workspace item is missing.');
  }
}

function assertNoTerminalOrRemovalHistory({ current, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
  );
  if (!hasDirectoryEntry(root)) {
    return;
  }
  assertPrivateDirectory(root, 'F1.17 tombstone history', { repoDir });
  const workspaceRoot = path.join(root, current.workspace.workspaceHash);
  if (!hasDirectoryEntry(workspaceRoot)) {
    return;
  }

  for (const name of readPrivateDirectory(
    workspaceRoot,
    'F1.17 tombstone history',
    { repoDir },
  )) {
    const directory = path.join(workspaceRoot, name);
    const names = readPrivateDirectory(directory, 'F1.17 terminal history', {
      repoDir,
    });
    if (/^[a-f0-9]{64}$/u.test(name)) {
      if (sameNames(names, ['tombstone.json'])) {
        const tombstone = readPrivateJsonState(
          path.join(directory, 'tombstone.json'),
          'F1.17 v1 tombstone',
          { repoDir },
        ).value;
        assertFineTuningPrivateCollectionItemTombstone(tombstone);
        assertTerminalLineage(name, tombstone, current);
        if (matchesTerminal(tombstone, current)) {
          throw new Error('F1.17 is blocked by terminal history.');
        }
        continue;
      }
      if (
        sameNames(names, [
          'absence-receipt.json',
          'decision.json',
          'tombstone.json',
        ])
      ) {
        const bundle = {
          decision: readPrivateJsonState(
            path.join(directory, 'decision.json'),
            'F1.17 terminal decision',
            { repoDir },
          ).value,
          receipt: readPrivateJsonState(
            path.join(directory, 'absence-receipt.json'),
            'F1.17 absence receipt',
            { repoDir },
          ).value,
          tombstone: readPrivateJsonState(
            path.join(directory, 'tombstone.json'),
            'F1.17 v2 tombstone',
            { repoDir },
          ).value,
        };
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle(bundle);
        assertTerminalLineage(name, bundle.tombstone, current);
        if (matchesTerminal(bundle.tombstone, current)) {
          throw new Error('F1.17 is blocked by terminal history.');
        }
        continue;
      }
      throw new Error('F1.17 terminal history is invalid.');
    }

    if (
      !/^\.fine-tuning-private-collection-item-terminal-pending-[a-f0-9]{64}$/u.test(
        name,
      ) ||
      (!sameNames(names, ['decision.json']) &&
        !sameNames(names, ['decision.json', 'tombstone.json']) &&
        !sameNames(names, [
          'absence-receipt.json',
          'decision.json',
          'tombstone.json',
        ]))
    ) {
      throw new Error('F1.17 pending terminal history is invalid.');
    }
    const decision = readPrivateJsonState(
      path.join(directory, 'decision.json'),
      'F1.17 pending terminal decision',
      { repoDir },
    ).value;
    assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
    if (
      name !==
        `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}` ||
      decision.workspace.workspaceHash !== current.workspace.workspaceHash
    ) {
      throw new Error('F1.17 pending terminal history is invalid.');
    }
    if (names.includes('tombstone.json')) {
      const tombstone = readPrivateJsonState(
        path.join(directory, 'tombstone.json'),
        'F1.17 pending tombstone',
        { repoDir },
      ).value;
      if (names.includes('absence-receipt.json')) {
        const receipt = readPrivateJsonState(
          path.join(directory, 'absence-receipt.json'),
          'F1.17 pending absence receipt',
          { repoDir },
        ).value;
        assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({
          decision,
          receipt,
          tombstone,
        });
      } else {
        assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({
          decision,
          tombstone,
        });
      }
    }
    if (matchesTerminal(decision, current)) {
      throw new Error('F1.17 has pending terminal history.');
    }
  }
}

function hasDirectoryEntry(directory) {
  return fs.lstatSync(directory, { throwIfNoEntry: false }) !== undefined;
}

function assertTerminalLineage(name, record, current) {
  if (
    name !== record.withdrawalReferenceSha256 ||
    record.workspace.workspaceHash !== current.workspace.workspaceHash
  ) {
    throw new Error('F1.17 terminal history lineage is invalid.');
  }
}

function matchesTerminal(record, current) {
  return (
    record.admission?.id === current.admission.id ||
    record.admission?.admissionHash === current.admission.admissionHash ||
    record.item?.id === current.item.id ||
    record.item?.itemHash === current.item.itemHash ||
    record.withdrawalReferenceSha256 ===
      current.item.retention.withdrawalReferenceSha256
  );
}

function sameReference(left, right, hashField) {
  return left?.id === right?.id && left?.[hashField] === right?.[hashField];
}

function sameNames(actual, expected) {
  return (
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}
