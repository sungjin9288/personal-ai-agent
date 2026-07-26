import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  parseFineTuningPrivateCombinedReadinessArguments,
  withFineTuningPrivateCombinedReadinessAuthority,
} from '../scripts/helpers/fine-tuning-private-combined-readiness-authority.mjs';
import {
  privateCombinedReadinessArgs,
  runPrivateCombinedReadinessScript,
  snapshotPrivateCombinedReadinessState,
  withFineTuningPrivateCombinedReadinessFixture,
} from './helpers/fine-tuning-private-combined-readiness-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(
  repoDir,
  'scripts',
  'project-fine-tuning-private-collection-gap-replan.mjs',
);

test('F1.25 CLI independently replans trusted F1.24 authority without mutation', () => {
  withFineTuningPrivateCombinedReadinessFixture((fixture) => {
    prepareLockRoot(fixture.rootDir);
    const before = snapshotPrivateCombinedReadinessState(fixture.rootDir);
    const first = runReplan(fixture);
    const second = runReplan(fixture);

    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    const result = JSON.parse(first.stdout);
    assert.deepEqual(result.projection.measurements, {
      acceptedExamples: 5,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 3,
      missionScopes: 5,
      trainExamples: 4,
      validationExamples: 1,
    });
    assert.deepEqual(result.projection.actionIds, [
      'collect-distinct-reviewed-mission-examples',
      'expand-answer-quality-baseline',
      'rebuild-readiness-and-reassess',
    ]);
    assert.equal(
      result.projection.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
      15,
    );
    assert.equal(result.projection.gaps.reviewedExamples.trainExamples.remaining, 12);
    assert.equal(result.projection.gaps.reviewedExamples.validationExamples.remaining, 3);
    assert.equal(result.projection.gaps.missionScopes.remaining, 5);
    assert.equal(result.projection.gaps.answerQualityCases.remaining, 7);
    for (const boundary of [
      'acceptedRiskRemediationRequired',
      'actualDatasetRebuilt',
      'actualModelTrainingExecuted',
      'actualReadinessReplaced',
      'actualSufficiencyChanged',
      'actualUserDataCollected',
      'auditRecorded',
      'candidateTrainingReviewAllowed',
      'collectionActionCompletionRecorded',
      'collectionAuthorized',
      'collectionExecutionAuthorized',
      'deploymentAuthorized',
      'externalSubmissionAuthorized',
      'fineTuningExecutionAuthorized',
      'mutationPerformed',
      'productionReadyClaim',
      'providerAuthorized',
      'reviewedExampleCollectionAuthorized',
      'timelineRecorded',
      'trackedIntakeRequestAmended',
      'trackedPlanReplaced',
      'trainingAuthorized',
    ]) {
      assert.equal(result[boundary], false, boundary);
    }
    for (const secret of [
      fixture.answer.item.example.instruction,
      fixture.answer.item.example.response,
      fixture.record.item.example.instruction,
      fixture.record.item.example.response,
      fixture.answer.item.id,
      fixture.record.item.id,
      fixture.rootDir,
      path.basename(fixture.answer.payloadFilename),
    ]) {
      assert.equal(first.stdout.includes(secret), false);
    }
    assert.deepEqual(snapshotPrivateCombinedReadinessState(fixture.rootDir), before);
  });
});

test('F1.25 rejects reordered arguments and tracked F1.2 plan tampering', () => {
  withFineTuningPrivateCombinedReadinessFixture((fixture) => {
    const args = privateCombinedReadinessArgs(fixture);
    [args[0], args[2]] = [args[2], args[0]];
    const unordered = runPrivateCombinedReadinessScript(script, fixture.rootDir, args);
    assert.notEqual(unordered.status, 0);
    assert.match(unordered.stderr, /Expected exact private F1\.25 input filenames/);

    const planFilename = trackedPlanFilename(fixture.rootDir);
    const plan = JSON.parse(fs.readFileSync(planFilename, 'utf8'));
    plan.status = 'no-collection-required';
    fs.writeFileSync(planFilename, `${JSON.stringify(plan)}\n`, { mode: 0o644 });
    fs.chmodSync(planFilename, 0o644);
    const rejected = runReplan(fixture);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Fine-tuning data collection plan integrity failed/);
    assert.equal(rejected.stderr.includes(fixture.answer.item.example.response), false);
  });
});

test('F1.25 rejects tracked F1.2 mode, symlink, and hardlink drift', () => {
  for (const tamper of ['mode', 'symlink', 'hardlink']) {
    withFineTuningPrivateCombinedReadinessFixture((fixture) => {
      const planFilename = trackedPlanFilename(fixture.rootDir);
      if (tamper === 'mode') {
        fs.chmodSync(planFilename, 0o600);
      } else if (tamper === 'symlink') {
        const replacement = path.join(fixture.rootDir, 'evidence', 'plan-copy.json');
        fs.copyFileSync(planFilename, replacement);
        fs.chmodSync(replacement, 0o644);
        fs.unlinkSync(planFilename);
        fs.symlinkSync(replacement, planFilename);
      } else if (tamper === 'hardlink') {
        fs.linkSync(
          planFilename,
          path.join(fixture.rootDir, 'evidence', 'plan-hardlink.json'),
        );
      }
      const rejected = runReplan(fixture);
      assert.notEqual(rejected.status, 0, tamper);
      assert.equal(rejected.stderr.includes(fixture.answer.item.example.response), false);
    });
  }
});

test('F1.25 shared authority rejects final tracked F1.2 replacement and releases locks in reverse order', () => {
  for (const drift of ['same-bytes-inode', 'bytes']) {
    withFineTuningPrivateCombinedReadinessFixture((fixture) => {
      const rootDir = fs.realpathSync(fixture.rootDir);
      prepareLockRoot(rootDir);
      const planFilename = trackedPlanFilename(rootDir);
      const lockRoot = path.join(
        rootDir,
        'var',
        'fine-tuning',
        'private-collection-item-admission-locks',
      );
      const filenames = parseFineTuningPrivateCombinedReadinessArguments(
        privateCombinedReadinessArgs(fixture).map((value, index) =>
          index % 2 === 0 ? value : fs.realpathSync(value),
        ),
        { label: 'F1.25' },
      );
      const releaseOrder = [];
      const renameSync = fs.renameSync;
      fs.renameSync = (from, to) => {
        if (path.dirname(from) === lockRoot && from.endsWith('.lock')) {
          releaseOrder.push(path.basename(from));
        }
        return renameSync(from, to);
      };

      try {
        assert.throws(
          () => withFineTuningPrivateCombinedReadinessAuthority({
            filenames,
            label: 'F1.25',
            lockLabel: 'F1.25 collection-gap replan shadow lock',
            project() {
              replaceTrackedPlan(planFilename, { drift });
              return {};
            },
            repoDir: rootDir,
          }),
          /tracked collectionPlan changed while resolving|Fine-tuning data collection plan integrity failed/,
        );
      } finally {
        fs.renameSync = renameSync;
      }

      const expectedReleaseOrder = [
        fixture.answer.workspace.workspaceHash,
        fixture.record.workspace.workspaceHash,
      ]
        .sort()
        .reverse()
        .map((workspaceHash) => `${workspaceHash}.lock`);
      assert.deepEqual(releaseOrder, expectedReleaseOrder);
      assert.deepEqual(fs.readdirSync(lockRoot), []);
    });
  }
});

function runReplan(fixture) {
  return runPrivateCombinedReadinessScript(
    script,
    fixture.rootDir,
    privateCombinedReadinessArgs(fixture),
  );
}

function trackedPlanFilename(rootDir) {
  return path.join(
    rootDir,
    'evidence',
    'output-artifacts',
    'fine-tuning-data-collection-plan.json',
  );
}

function replaceTrackedPlan(filename, { drift }) {
  const bytes = fs.readFileSync(filename);
  const original = fs.lstatSync(filename);
  const temporary = `${filename}.replacement`;
  fs.writeFileSync(
    temporary,
    drift === 'bytes' ? Buffer.concat([bytes, Buffer.from('\n')]) : bytes,
    { flag: 'wx', mode: 0o644 },
  );
  fs.chmodSync(temporary, 0o644);
  if (drift === 'same-bytes-inode') {
    assert.notEqual(fs.lstatSync(temporary).ino, original.ino);
  }
  fs.renameSync(temporary, filename);
}

function prepareLockRoot(rootDir) {
  fs.chmodSync(path.join(rootDir, 'var'), 0o700);
  fs.chmodSync(path.join(rootDir, 'var', 'fine-tuning'), 0o700);
  fs.chmodSync(
    path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-admission-locks',
    ),
    0o700,
  );
}
