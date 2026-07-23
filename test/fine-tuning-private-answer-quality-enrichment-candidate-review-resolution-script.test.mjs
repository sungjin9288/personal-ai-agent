import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './helpers/fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const sourceRepo = process.cwd();
const script = path.join(
  sourceRepo,
  'scripts',
  'resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs',
);
const datePreload = path.join(
  sourceRepo,
  'test',
  'helpers',
  'sequence-date-preload.mjs',
);
const replaceInputPreload = path.join(
  sourceRepo,
  'test',
  'helpers',
  'replace-f1-17-input-preload.mjs',
);

test('F1.17 CLI publishes and exactly replays approve and reject bundles without private output', () => {
  for (const decision of ['approve', 'reject']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture, {
        reviewDecision: decision,
      });
      const first = run(fixture, prepared);
      const second = run(fixture, prepared);
      assert.equal(first.status, 0, first.stderr);
      assert.equal(second.status, 0, second.stderr);
      assert.equal(first.stdout, second.stdout);

      const output = JSON.parse(first.stdout);
      assert.deepEqual(Object.keys(output), [
        'status',
        'reviewerVerdict',
        'q1ReviewerGateSatisfied',
        'q1ContractSatisfied',
        'answerQualityCaseMaterializationAllowed',
        'answerQualityCaseCreated',
        'trainingAuthorized',
        'externalProviderCalls',
        'productionReadyClaim',
      ]);
      assert.equal(output.reviewerVerdict, decision === 'approve' ? 'pass' : 'fail');
      assert.equal(
        output.answerQualityCaseMaterializationAllowed,
        decision === 'approve',
      );
      assert.equal(output.q1ContractSatisfied, false);
      assert.equal(output.answerQualityCaseCreated, false);
      assert.equal(output.trainingAuthorized, false);
      assert.equal(output.externalProviderCalls, 'none');
      assert.equal(output.productionReadyClaim, false);
      for (const privateValue of [
        prepared.decision.confirmationToken,
        fixture.item.example.instruction,
        fixture.item.example.response,
        prepared.candidateFilename,
      ]) {
        assert.equal(first.stdout.includes(privateValue), false);
      }

      const final = finalDirectory(fixture);
      assert.deepEqual(fs.readdirSync(final).sort(), [
        'decision.json',
        'resolution.json',
      ]);
      const storedDecision = readJson(path.join(final, 'decision.json'));
      const storedResolution = readJson(path.join(final, 'resolution.json'));
      assert.equal(storedDecision.decisionHash, storedResolution.decisionHash);
      assert.equal(
        storedDecision.decisionHash,
        storedResolution.bindings.candidateReviewDecisionHash,
      );
    }, { lane: 'answer-quality-cases' });
  }
});

test('F1.17 CLI recovers exact empty, decision-only, and complete pending bundles', () => {
  for (const state of ['empty', 'decision-only', 'complete']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
      const first = run(fixture, prepared);
      assert.equal(first.status, 0, first.stderr);
      const final = finalDirectory(fixture);
      const storedDecision = readJson(path.join(final, 'decision.json'));
      const pending = pendingDirectory(fixture, storedDecision.decisionHash);

      if (state === 'empty') {
        fs.rmSync(final, { recursive: true });
        makeDirectory(pending);
      } else {
        fs.renameSync(final, pending);
        if (state === 'decision-only') {
          fs.unlinkSync(path.join(pending, 'resolution.json'));
        }
      }

      const resumed = run(fixture, prepared);
      assert.equal(resumed.status, 0, resumed.stderr);
      assert.equal(fs.existsSync(pending), false);
      assert.deepEqual(fs.readdirSync(final).sort(), [
        'decision.json',
        'resolution.json',
      ]);
      const decision = readJson(path.join(final, 'decision.json'));
      const resolution = readJson(path.join(final, 'resolution.json'));
      assert.equal(decision.decisionHash, resolution.decisionHash);
    }, { lane: 'answer-quality-cases' });
  }
});

test('F1.17 CLI rejects conflicting, final-plus-pending, and multiple pending state without deleting it', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const first = run(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    const final = finalDirectory(fixture);
    const storedDecision = readJson(path.join(final, 'decision.json'));
    const pending = pendingDirectory(fixture, storedDecision.decisionHash);
    makeDirectory(pending);

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicts with pending/);
    assert.equal(fs.existsSync(final), true);
    assert.equal(fs.existsSync(pending), true);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const first = run(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    const final = finalDirectory(fixture);
    const storedDecision = readJson(path.join(final, 'decision.json'));
    const pending = pendingDirectory(fixture, storedDecision.decisionHash);
    fs.renameSync(final, pending);

    prepared.decision.evidenceSha256 = 'e'.repeat(64);
    writeJson(prepared.decisionFilename, prepared.decision);
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicts with the current decision/);
    assert.equal(fs.existsSync(pending), true);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const first = run(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    const final = finalDirectory(fixture);
    const storedDecision = readJson(path.join(final, 'decision.json'));
    const firstPending = pendingDirectory(fixture, storedDecision.decisionHash);
    fs.renameSync(final, firstPending);
    const secondPending = pendingDirectory(fixture, 'f'.repeat(64));
    makeDirectory(secondPending);
    const alternate = structuredClone(storedDecision);
    alternate.decisionHash = 'f'.repeat(64);
    writeJson(path.join(secondPending, 'decision.json'), alternate);

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(firstPending), true);
    assert.equal(fs.existsSync(secondPending), true);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI requires one canonical final candidate and rejects its pending alias', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    fs.rmSync(prepared.candidateDirectory, { recursive: true });
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.17 candidate/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const pending = path.join(
      path.dirname(prepared.candidateDirectory),
      `.private-answer-quality-case-pending-${fixture.item.itemHash}-` +
        prepared.candidate.bindings.answerQualityCaseEnrichmentInputHash,
    );
    makeDirectory(pending);
    writeJson(path.join(pending, 'candidate.json'), prepared.candidate);
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /without pending history/);
    assert.equal(fs.existsSync(pending), true);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const malformed = path.join(
      path.dirname(prepared.candidateDirectory),
      `.private-answer-quality-case-pending-${fixture.item.itemHash}-` +
        prepared.candidate.bindings.answerQualityCaseEnrichmentInputHash,
    );
    makeDirectory(malformed);
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /candidate history is invalid/);
    assert.equal(fs.existsSync(malformed), true);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI rejects weak files, symlinks, hardlinks, empty and oversized JSON', () => {
  const attacks = [
    (fixture, prepared) => fs.chmodSync(prepared.decisionFilename, 0o644),
    (fixture, prepared) => {
      const target = `${prepared.decisionFilename}.target`;
      fs.renameSync(prepared.decisionFilename, target);
      fs.symlinkSync(target, prepared.decisionFilename);
    },
    (fixture, prepared) => {
      fs.linkSync(prepared.decisionFilename, `${prepared.decisionFilename}.hardlink`);
    },
    (fixture, prepared) => fs.truncateSync(prepared.decisionFilename, 0),
    (fixture, prepared) => {
      fs.writeFileSync(prepared.decisionFilename, 'x'.repeat(64 * 1024 + 1), {
        mode: 0o600,
      });
    },
  ];

  for (const attack of attacks) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
      attack(fixture, prepared);
      const result = run(fixture, prepared);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /0600 bounded regular JSON/);
    }, { lane: 'answer-quality-cases' });
  }
});

test('F1.17 CLI rejects ancestor and history-root symlinks', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const inputDirectory = path.dirname(prepared.decisionFilename);
    const target = `${inputDirectory}-target`;
    fs.renameSync(inputDirectory, target);
    fs.symlinkSync(target, inputDirectory, 'dir');
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /0600 bounded regular JSON/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-enrichment-candidate-review-resolutions',
    );
    const target = path.join(fixture.rootDir, 'history-target');
    makeDirectory(target);
    fs.symlinkSync(target, root, 'dir');
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /0700 directory|resolution history/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI rejects dangling tombstone history root and workspace symlinks', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
    );
    fs.symlinkSync(path.join(fixture.rootDir, 'missing-tombstone-root'), root, 'dir');

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /current-owner 0700 directory/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
    );
    makeDirectory(root);
    fs.symlinkSync(
      path.join(fixture.rootDir, 'missing-workspace-tombstones'),
      path.join(root, fixture.workspace.workspaceHash),
      'dir',
    );

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /current-owner 0700 directory/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI validates foreign workspace items and resolution entries before skipping them', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    withSyntheticLifecycleFixture((foreign) => {
      const source = path.dirname(foreign.itemFilename);
      const destination = path.join(
        fixture.workspaceDirectory,
        'reviewed-examples',
        path.basename(source),
      );
      fs.cpSync(source, destination, { recursive: true });
      chmodTree(destination);
    }, { lane: 'reviewed-examples' });

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace item is invalid/);
  }, { lane: 'answer-quality-cases' });

  for (const entryType of ['final', 'pending']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
      const first = run(fixture, prepared);
      assert.equal(first.status, 0, first.stderr);

      withSyntheticLifecycleFixture((foreign) => {
        const foreignPrepared =
          prepareAnswerQualityEnrichmentCandidateFixture(foreign);
        const foreignRun = run(foreign, foreignPrepared);
        assert.equal(foreignRun.status, 0, foreignRun.stderr);
        const source = finalDirectory(foreign);
        const foreignDecision = readJson(path.join(source, 'decision.json'));
        const destination = entryType === 'final'
          ? path.join(
            path.dirname(finalDirectory(fixture)),
            foreign.item.itemHash,
          )
          : path.join(
            path.dirname(finalDirectory(fixture)),
            '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-' +
              `${foreign.item.itemHash}-${foreignDecision.decisionHash}`,
          );
        fs.cpSync(source, destination, { recursive: true });
        chmodTree(destination);
      }, { lane: 'answer-quality-cases' });

      const result = run(fixture, prepared);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /history lineage is invalid/);
    }, { lane: 'answer-quality-cases' });
  }
});

test('F1.17 CLI rejects cross-workspace candidate history before item filtering', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    withSyntheticLifecycleFixture((foreign) => {
      const foreignPrepared =
        prepareAnswerQualityEnrichmentCandidateFixture(foreign);
      const destination = path.join(
        path.dirname(prepared.candidateDirectory),
        foreign.item.itemHash,
      );
      fs.cpSync(foreignPrepared.candidateDirectory, destination, {
        recursive: true,
      });
      chmodTree(destination);
    }, { lane: 'answer-quality-cases' });

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.16 candidate history is invalid/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI rejects tombstone v1, tombstone v2, pending terminal, and removal state', () => {
  for (const terminalState of ['v1', 'v2', 'pending', 'removal']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
      if (terminalState === 'v1') {
        writeTombstoneV1(fixture);
      } else if (terminalState === 'v2') {
        writeTombstoneV2(fixture);
      } else if (terminalState === 'pending') {
        writePendingTerminal(fixture);
      } else {
        const removal = path.join(
          fixture.workspaceDirectory,
          fixture.item.lane,
          `.fine-tuning-private-collection-item-removal-${fixture.item.itemHash}`,
        );
        makeDirectory(removal);
      }

      const result = run(fixture, prepared);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /terminal history|pending terminal|removal history/,
      );
    }, { lane: 'answer-quality-cases' });
  }
});

test('F1.17 CLI preserves complete pending state when retention expires before publish', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const before = new Date(
      Date.parse(prepared.decision.decidedAt) + 1_000,
    ).toISOString();
    const result = run(fixture, prepared, {
      dates: [
        before,
        before,
        before,
        fixture.item.retention.deleteBy,
      ],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    const root = path.dirname(finalDirectory(fixture));
    const pending = fs.readdirSync(root).find((name) =>
      name.startsWith(
        '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-',
      ));
    assert.ok(pending);
    assert.deepEqual(fs.readdirSync(path.join(root, pending)).sort(), [
      'decision.json',
      'resolution.json',
    ]);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI fails closed when retention crosses at rename, replay return, or output', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const before = new Date(
      Date.parse(prepared.decision.decidedAt) + 1_000,
    ).toISOString();
    const result = run(fixture, prepared, {
      dates: [
        before,
        before,
        before,
        before,
        fixture.item.retention.deleteBy,
      ],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item is expired/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    const root = path.dirname(finalDirectory(fixture));
    const pending = fs.readdirSync(root).find((name) =>
      name.startsWith(
        '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-',
      ));
    assert.ok(pending);
    assert.deepEqual(fs.readdirSync(path.join(root, pending)).sort(), [
      'decision.json',
      'resolution.json',
    ]);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const first = run(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    const before = new Date(
      Date.parse(prepared.decision.decidedAt) + 1_000,
    ).toISOString();
    const replay = run(fixture, prepared, {
      dates: [before, before, fixture.item.retention.deleteBy],
    });
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /item is expired/);
    assert.equal(replay.stdout, '');
    assert.deepEqual(fs.readdirSync(finalDirectory(fixture)).sort(), [
      'decision.json',
      'resolution.json',
    ]);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const before = new Date(
      Date.parse(prepared.decision.decidedAt) + 1_000,
    ).toISOString();
    const result = run(fixture, prepared, {
      dates: [
        before,
        before,
        before,
        before,
        before,
        fixture.item.retention.deleteBy,
      ],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item is expired/);
    assert.equal(result.stdout, '');
    assert.deepEqual(fs.readdirSync(finalDirectory(fixture)).sort(), [
      'decision.json',
      'resolution.json',
    ]);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI preserves pending state when terminal history appears before publish', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const decision = lifecycleDecision(fixture);
    const pendingTerminal = path.join(
      tombstoneRoot(fixture),
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    const before = new Date(
      Date.parse(prepared.decision.decidedAt) + 1_000,
    ).toISOString();
    const result = run(fixture, prepared, {
      dates: [before, before, before, before],
      hook: {
        directories: [canonicalFuture(fixture, pendingTerminal)],
        files: [{
          filename: canonicalFuture(
            fixture,
            path.join(pendingTerminal, 'decision.json'),
          ),
          value: decision,
        }],
        index: 3,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal history/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    const resolutionRoot = path.dirname(finalDirectory(fixture));
    assert.equal(
      fs.readdirSync(resolutionRoot).some((name) =>
        name.startsWith(
          '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-',
        )),
      true,
    );
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI rejects a valid decision file that no longer matches the published resolution', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const first = run(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    const final = finalDirectory(fixture);
    const decision = readJson(path.join(final, 'decision.json'));
    decision.decisionRecord.evidenceSha256 = 'e'.repeat(64);
    decision.decisionHash = digestRecord(decision.decisionRecord);
    decision.id =
      'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
      decision.decisionHash;
    writeJson(path.join(final, 'decision.json'), decision);

    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bundle is invalid/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.17 CLI detects same-inode byte changes and same-byte inode replacement before publish', () => {
  for (const mode of ['bytes', 'inode']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
      const result = run(fixture, prepared, {
        replace: {
          filename: fixturePath(fixture, prepared.decisionFilename),
          mode,
        },
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /changed while resolving/);
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
      const root = path.dirname(finalDirectory(fixture));
      assert.equal(
        fs.readdirSync(root).some((name) =>
          name.startsWith(
            '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-',
          )),
        true,
      );
    }, { lane: 'answer-quality-cases' });
  }
});

function run(fixture, prepared, { dates, hook, replace } = {}) {
  const args = [
    script,
    '--workspace',
    fixturePath(fixture, fixture.workspaceFilename),
    '--admission',
    fixturePath(fixture, fixture.admissionFilename),
    '--item',
    fixturePath(fixture, fixture.itemFilename),
    '--candidate',
    fixturePath(fixture, prepared.candidateFilename),
    '--decision',
    fixturePath(fixture, prepared.decisionFilename),
  ];
  const env = { ...process.env };
  const imports = [];
  if (dates) {
    imports.push(datePreload);
    env.FINE_TUNING_TEST_DATE_SEQUENCE = JSON.stringify(dates);
    env.FINE_TUNING_TEST_DATE_HOOK = JSON.stringify(hook || null);
  }
  if (replace) {
    imports.push(replaceInputPreload);
    env.FINE_TUNING_F1_17_REPLACE_INPUT = replace.filename;
    env.FINE_TUNING_F1_17_REPLACE_MODE = replace.mode;
  }
  env.NODE_OPTIONS = [
    env.NODE_OPTIONS || '',
    ...imports.map((filename) => `--import=${filename}`),
  ].join(' ').trim();
  return spawnSync(process.execPath, args, {
    cwd: canonical(fixture.rootDir),
    encoding: 'utf8',
    env,
  });
}

function finalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidate-review-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

function pendingDirectory(fixture, decisionHash) {
  return path.join(
    path.dirname(finalDirectory(fixture)),
    '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-' +
      `${fixture.item.itemHash}-${decisionHash}`,
  );
}

function makeDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function canonical(filename) {
  return fs.realpathSync(filename);
}

function fixturePath(fixture, filename) {
  return path.join(
    canonical(fixture.rootDir),
    path.relative(fixture.rootDir, filename),
  );
}

function canonicalFuture(fixture, filename) {
  return path.join(
    canonical(fixture.rootDir),
    path.relative(fixture.rootDir, filename),
  );
}

function tombstoneRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    fixture.workspace.workspaceHash,
  );
}

function lifecycleDecision(fixture) {
  const decidedAt = new Date().toISOString();
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: decidedAt,
    input: {
      action: 'withdraw',
      admission: reference(fixture.admission, 'admissionHash'),
      confirmationToken:
        `withdraw-private-collection-item:${fixture.item.itemHash}`,
      decidedAt,
      decidedBy: 'retention-deletion-owner-role',
      evidenceSha256: 'd'.repeat(64),
      item: reference(fixture.item, 'itemHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
      withdrawalReferenceSha256:
        fixture.item.retention.withdrawalReferenceSha256,
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    workspace: fixture.workspace,
  });
}

function writeTombstoneV1(fixture) {
  const directory = path.join(
    tombstoneRoot(fixture),
    fixture.item.retention.withdrawalReferenceSha256,
  );
  makeDirectory(directory);
  writeJson(
    path.join(directory, 'tombstone.json'),
    buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: reference(fixture.admission, 'admissionHash'),
      evidenceSha256: 'a'.repeat(64),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256:
        fixture.item.retention.withdrawalReferenceSha256,
      workspace: reference(fixture.workspace, 'workspaceHash'),
    }),
  );
}

function writeTombstoneV2(fixture) {
  const decision = lifecycleDecision(fixture);
  const observedAt = new Date().toISOString();
  const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({
    decision,
    recordedAt: observedAt,
  });
  const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
    absence: {
      itemPathAbsent: true,
      matchingAdmissionItemCount: 0,
      matchingItemHashCount: 0,
      postDeleteAbsenceObserved: true,
      removalDirectoryEmpty: true,
      workspaceRecordUnchanged: true,
    },
    decision,
    observedAt,
    tombstone,
  });
  const directory = path.join(
    tombstoneRoot(fixture),
    fixture.item.retention.withdrawalReferenceSha256,
  );
  makeDirectory(directory);
  writeJson(path.join(directory, 'absence-receipt.json'), receipt);
  writeJson(path.join(directory, 'decision.json'), decision);
  writeJson(path.join(directory, 'tombstone.json'), tombstone);
}

function writePendingTerminal(fixture) {
  const decision = lifecycleDecision(fixture);
  const directory = path.join(
    tombstoneRoot(fixture),
    `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
  );
  makeDirectory(directory);
  writeJson(path.join(directory, 'decision.json'), decision);
}

function chmodTree(directory) {
  fs.chmodSync(directory, 0o700);
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      chmodTree(filename);
    } else {
      fs.chmodSync(filename, 0o600);
    }
  }
}

function reference(value, field) {
  return { id: value.id, [field]: value[field] };
}

function digestRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
