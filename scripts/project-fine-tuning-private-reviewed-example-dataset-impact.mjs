import fs from 'node:fs';
import path from 'node:path';

import { buildDeterministicFineTuningBaselineContext } from './local-training-permission-fixture.mjs';
import {
  buildFineTuningPrivateReviewedExampleDatasetImpactShadow,
} from '../src/core/fine-tuning-private-reviewed-example-dataset-impact.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleSource,
} from './helpers/fine-tuning-private-reviewed-example-authority.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleHistory,
  readFineTuningPrivateReviewedExampleHistory,
  selectFineTuningPrivateReviewedExampleHistory,
} from './helpers/fine-tuning-private-reviewed-example-history.mjs';
import {
  assertSamePrivateJsonState,
  readPrivateJsonState,
} from './helpers/private-json-state.mjs';

const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadFineTuningPrivateReviewedExampleAuthority({ filenames, repoDir, label: 'F1.22' });
const initialCurrent = loadFineTuningPrivateReviewedExampleSource({
  authority: initial,
  filename: filenames.sourceBundle,
  label: 'F1.22',
  repoDir,
});
const initialBaselineFixtures = readBaselineFixtures();
const initialHistory = readFineTuningPrivateReviewedExampleHistory({
  label: 'F1.22 canonical record history',
  repoDir,
});
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'F1.22 dataset impact shadow lock',
});

let projection;
try {
  const authority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initial, authority, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const currentBaselineFixtures = readBaselineFixtures();
  assertSameBaselineFixtures(initialBaselineFixtures, currentBaselineFixtures);
  const current = loadFineTuningPrivateReviewedExampleSource({
    authority,
    filename: filenames.sourceBundle,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initialCurrent, current, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const currentHistory = readFineTuningPrivateReviewedExampleHistory({
    label: 'F1.22 canonical record history',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleHistory(
    initialHistory,
    currentHistory,
    'F1.22 canonical record history',
  );
  const stored = selectFineTuningPrivateReviewedExampleHistory(
    currentHistory,
    current,
    { label: 'F1.22 canonical record history' },
  );
  const baselineContext = buildDeterministicFineTuningBaselineContext({
    fixtureValues: currentBaselineFixtures.values,
    repoDir,
  });
  projection = buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
    baselineContext,
    record: stored.record.value,
    receipt: stored.receipt.value,
    trackedAssessment: current.tracked.assessment.value,
  });
  const finalAuthority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initial, finalAuthority, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const finalBaselineFixtures = readBaselineFixtures();
  assertSameBaselineFixtures(initialBaselineFixtures, finalBaselineFixtures);
  const finalCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: finalAuthority,
    filename: filenames.sourceBundle,
    label: 'F1.22',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleAuthority(initialCurrent, finalCurrent, {
    compareTrackedFileIdentity: true,
    label: 'F1.22',
  });
  const finalHistory = readFineTuningPrivateReviewedExampleHistory({
    label: 'F1.22 canonical record history',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleHistory(
    initialHistory,
    finalHistory,
    'F1.22 canonical record history',
  );
  selectFineTuningPrivateReviewedExampleHistory(
    finalHistory,
    finalCurrent,
    { label: 'F1.22 canonical record history' },
  );
  console.log(JSON.stringify(projection, null, 2));
} finally {
  lock.release();
}

function readBaselineFixtures() {
  const root = path.join(repoDir, 'fixtures');
  const readiness = readFixtureState('fine-tuning-readiness-cases-v1.json', root);
  const dataset = readFixtureState(readiness.value.datasetFixture, root);
  const answerQuality = readFixtureState(
    readiness.value.answerQualityFixture,
    root,
  );
  const states = { answerQuality, dataset, readiness };
  return {
    states,
    values: Object.fromEntries(
      Object.values(states).map((state) => [
        path.relative(repoDir, state.canonicalFilename),
        state.value,
      ]),
    ),
  };
}

function readFixtureState(relativePath, root) {
  const filename = relativePath.startsWith('fixtures/')
    ? relativePath
    : path.join('fixtures', relativePath);
  return readPrivateJsonState(
    path.join(repoDir, filename),
    'F1.22 baseline fixture',
    { allowedRoot: root, expectedMode: 0o644, repoDir },
  );
}

function assertSameBaselineFixtures(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.22 baseline fixture ${key}`,
    );
  }
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'intake-resolution',
    'private-collection-plan',
    'execution-request',
    'execution-resolution',
    'artifact-preparation-resolution',
    'source-bundle',
  ];
  const invalid =
    args.length !== fields.length * 2 ||
    fields.some(
      (field, index) =>
        args[index * 2] !== `--${field}` || !args[index * 2 + 1],
    );
  if (invalid) {
    throw new Error('Expected exact private F1.22 input filenames.');
  }
  const keys = {
    'artifact-preparation-resolution': 'artifactPreparationResolution',
    'execution-request': 'executionRequest',
    'execution-resolution': 'executionResolution',
    'intake-resolution': 'intakeResolution',
    'private-collection-plan': 'privateCollectionPlan',
    'source-bundle': 'sourceBundle',
  };
  return Object.fromEntries(
    fields.map((field, index) => [
      keys[field] || field,
      args[index * 2 + 1],
    ]),
  );
}
