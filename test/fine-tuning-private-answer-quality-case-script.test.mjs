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
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './helpers/fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const sourceRepo = process.cwd();
const resolveScript = path.join(
  sourceRepo,
  'scripts',
  'resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs',
);
const materializeScript = path.join(
  sourceRepo,
  'scripts',
  'materialize-fine-tuning-private-answer-quality-case.mjs',
);
const datePreload = path.join(sourceRepo, 'test', 'helpers', 'sequence-date-preload.mjs');
const replaceInputPreload = path.join(
  sourceRepo,
  'test',
  'helpers',
  'replace-f1-18-input-preload.mjs',
);

test('F1.18 CLI publishes and replays one content-free logical case', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const first = materialize(fixture, prepared, inputFilename);
    const second = materialize(fixture, prepared, inputFilename);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);

    const output = JSON.parse(first.stdout);
    assert.deepEqual(Object.keys(output), [
      'status', 'reviewerVerdict', 'q1ReviewerGateSatisfied', 'q1ContractSatisfied',
      'answerQualityCaseCreated', 'answerQualityCaseEvaluationExecuted', 'trainingAuthorized',
      'externalProviderCalls', 'productionReadyClaim',
    ]);
    assert.equal(output.q1ContractSatisfied, true);
    assert.equal(output.answerQualityCaseEvaluationExecuted, true);
    assert.equal(output.trainingAuthorized, false);
    assert.equal(output.externalProviderCalls, 'none');
    assert.equal(output.productionReadyClaim, false);

    const stored = readJson(path.join(finalDirectory(fixture), 'case.json'));
    assert.deepEqual(fs.readdirSync(finalDirectory(fixture)), ['case.json']);
    for (const privateValue of [
      fixture.item.example.instruction,
      fixture.item.example.response,
      buildInput(fixture, prepared).retrievalInput.memoryEntries[0].content,
      buildInput(fixture, prepared).expectedSourceKeys[0],
      buildInput(fixture, prepared).forbiddenAnswerTerms[0],
      inputFilename,
      prepared.decision.confirmationToken,
    ]) {
      assert.equal(first.stdout.includes(privateValue), false);
      assert.equal(JSON.stringify(stored).includes(privateValue), false);
    }
  });
});

test('F1.18 CLI refuses a rejected F1.17 resolution before case history exists', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture, {
      reviewDecision: 'reject',
    });
    assert.equal(resolve(fixture, prepared).status, 0);
    const inputFilename = writeInput(fixture, prepared);
    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(historyRoot(fixture)), false);
  }, { lane: 'answer-quality-cases' });
});

test('F1.18 CLI recovers exact empty and complete pending cases', () => {
  for (const state of ['empty', 'complete']) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
      const final = finalDirectory(fixture);
      const pending = pendingDirectory(fixture);
      if (state === 'empty') {
        fs.rmSync(final, { recursive: true });
        makeDirectory(pending);
      } else {
        fs.renameSync(final, pending);
      }

      const resumed = materialize(fixture, prepared, inputFilename);
      assert.equal(resumed.status, 0, resumed.stderr);
      assert.equal(fs.existsSync(pending), false);
      assert.deepEqual(fs.readdirSync(final), ['case.json']);
    });
  }
});

test('F1.18 CLI preserves final-plus-pending and conflicting pending history', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    const final = finalDirectory(fixture);
    const pending = pendingDirectory(fixture);
    makeDirectory(pending);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicts with pending/);
    assert.equal(fs.existsSync(final), true);
    assert.equal(fs.existsSync(pending), true);
  });

  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    const expectedPending = pendingDirectory(fixture);
    fs.renameSync(finalDirectory(fixture), expectedPending);
    const conflicting = path.join(
      historyRoot(fixture),
      `.fine-tuning-private-answer-quality-case-pending-${fixture.item.itemHash}-${'f'.repeat(64)}`,
    );
    makeDirectory(conflicting);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(expectedPending), true);
    assert.equal(fs.existsSync(conflicting), true);
  });
});

test('F1.18 CLI requires canonical F1.16 candidate and F1.17 resolution paths', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const copy = path.join(fixture.rootDir, 'var', 'inputs', 'candidate-copy.json');
    writeJson(copy, prepared.candidate);
    const result = materialize(fixture, prepared, inputFilename, {
      candidateFilename: copy,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.17 candidate must use its exact canonical location/);
  });

  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const copy = path.join(fixture.rootDir, 'var', 'inputs', 'resolution-copy.json');
    writeJson(copy, reviewResolution(fixture));
    const result = materialize(fixture, prepared, inputFilename, {
      resolutionFilename: copy,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /candidate review resolution must use its exact canonical location/);
  });
});

test('F1.18 CLI validates the exact F1.17 stored decision wrapper', () => {
  const attacks = [
    (decision) => { decision.unexpected = true; },
    (decision) => { delete decision.candidate; },
    (decision) => {
      decision.decisionRecord.evidenceSha256 = 'f'.repeat(64);
      decision.decisionHash = hash(decision.decisionRecord);
      decision.id =
        'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
        decision.decisionHash;
    },
  ];

  for (const attack of attacks) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      const filename = path.join(f1_17FinalDirectory(fixture), 'decision.json');
      const decision = readJson(filename);
      attack(decision);
      writeJson(filename, decision);

      const result = materialize(fixture, prepared, inputFilename);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /F1\.18 F1\.17 decision is invalid|F1\.18 F1\.17 resolution history lineage is invalid/);
    });
  }
});

test('F1.18 CLI validates malformed foreign F1.17 history before filtering it', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const foreign = path.join(f1_17HistoryRoot(fixture), 'f'.repeat(64));
    fs.cpSync(f1_17FinalDirectory(fixture), foreign, { recursive: true });
    chmodTree(foreign);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 F1\.17 resolution history lineage is invalid/);
    assert.equal(fs.existsSync(foreign), true);
  });
});

test('F1.18 CLI recognizes a canonical current F1.17 pending bundle before rejecting it', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const resolution = reviewResolution(fixture);
    const pending = path.join(
      f1_17HistoryRoot(fixture),
      '.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-' +
        `${fixture.item.itemHash}-${resolution.decisionHash}`,
    );
    fs.cpSync(f1_17FinalDirectory(fixture), pending, { recursive: true });
    chmodTree(pending);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /requires F1\.17 resolution history without current pending state/,
    );
    assert.equal(fs.existsSync(pending), true);
    assert.equal(fs.existsSync(historyRoot(fixture)), false);
  });
});

test('F1.18 CLI validates malformed foreign F1.18 history before filtering it', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    const foreign = path.join(historyRoot(fixture), 'f'.repeat(64));
    fs.cpSync(finalDirectory(fixture), foreign, { recursive: true });
    chmodTree(foreign);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 case history lineage is invalid/);
    assert.equal(fs.existsSync(foreign), true);
  });
});

test('F1.18 CLI rejects weak, linked, empty, and oversized private input files', () => {
  const attacks = [
    (filename) => fs.chmodSync(filename, 0o644),
    (filename) => {
      const target = `${filename}.target`;
      fs.renameSync(filename, target);
      fs.symlinkSync(target, filename);
    },
    (filename) => fs.linkSync(filename, `${filename}.hardlink`),
    (filename) => fs.truncateSync(filename, 0),
    (filename) => {
      fs.writeFileSync(filename, 'x'.repeat(64 * 1024 + 1), { mode: 0o600 });
      fs.chmodSync(filename, 0o600);
    },
  ];

  for (const attack of attacks) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      attack(inputFilename);
      const result = materialize(fixture, prepared, inputFilename);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /F1\.18 enrichmentInput must be a current-owner 0600 bounded regular JSON file/);
    });
  }
});

test('F1.18 CLI rejects input ancestor symlinks and dangling history roots', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const inputs = path.dirname(inputFilename);
    const backup = `${inputs}-backup`;
    fs.renameSync(inputs, backup);
    fs.symlinkSync(backup, inputs);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 enrichmentInput must be a current-owner 0600 bounded regular JSON file/);
  });

  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-cases',
    );
    fs.symlinkSync(path.join(fixture.rootDir, 'missing-history-root'), root);

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 case history must be a current-owner 0700 directory/);
  });
});

test('F1.18 CLI rejects weak and hardlinked published history files', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    fs.chmodSync(path.join(finalDirectory(fixture), 'case.json'), 0o644);
    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 stored case must be a current-owner 0600 bounded regular JSON file/);
  });

  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    const filename = path.join(finalDirectory(fixture), 'case.json');
    fs.linkSync(filename, `${filename}.hardlink`);
    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 case history bundle is invalid/);
  });
});

test('F1.18 CLI rejects a cross-workspace materialized record before item filtering', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    withSyntheticLifecycleFixture((foreign) => {
      const foreignPrepared = prepareAnswerQualityEnrichmentCandidateFixture(foreign);
      assert.equal(resolve(foreign, foreignPrepared).status, 0);
      const foreignInput = writeInput(foreign, foreignPrepared);
      assert.equal(materialize(foreign, foreignPrepared, foreignInput).status, 0);
      const destination = path.join(historyRoot(fixture), foreign.item.itemHash);
      fs.cpSync(finalDirectory(foreign), destination, { recursive: true });
      chmodTree(destination);
    }, { lane: 'answer-quality-cases' });

    const result = materialize(fixture, prepared, inputFilename);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.18 case history lineage is invalid/);
  });
});

test('F1.18 CLI rejects tombstone v1, tombstone v2, pending terminal, and removal state', () => {
  for (const terminalState of ['v1', 'v2', 'pending', 'removal']) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      if (terminalState === 'v1') writeTombstoneV1(fixture);
      else if (terminalState === 'v2') writeTombstoneV2(fixture);
      else if (terminalState === 'pending') writePendingTerminal(fixture);
      else makeDirectory(path.join(
        fixture.workspaceDirectory,
        fixture.item.lane,
        `.fine-tuning-private-collection-item-removal-${fixture.item.itemHash}`,
      ));

      const result = materialize(fixture, prepared, inputFilename);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /terminal history|pending terminal|removal history/);
    });
  }
});

test('F1.18 CLI detects same-inode bytes and same-byte inode replacement before publish', () => {
  for (const mode of ['bytes', 'inode']) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      const result = materialize(fixture, prepared, inputFilename, {
        replace: { filename: fixturePath(fixture, inputFilename), mode },
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /F1\.18 enrichmentInput changed while resolving/);
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
      assert.ok(fs.readdirSync(historyRoot(fixture)).some((name) =>
        name.startsWith('.fine-tuning-private-answer-quality-case-pending-')));
    });
  }
});

test('F1.18 CLI preserves pending case when terminal or removal history appears before publish', () => {
  for (const state of ['terminal', 'removal']) {
    withReadyCase(({ fixture, inputFilename, prepared }) => {
      const before = materializationTime(fixture);
      const decision = lifecycleDecision(fixture);
      const hook = state === 'terminal'
        ? {
          directories: [path.join(
            tombstoneRoot(fixture),
            `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
          )],
          files: [{
            filename: path.join(
              tombstoneRoot(fixture),
              `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
              'decision.json',
            ),
            value: decision,
          }],
          index: 4,
        }
        : {
          directories: [path.join(
            fixture.workspaceDirectory,
            fixture.item.lane,
            `.fine-tuning-private-collection-item-removal-${fixture.item.itemHash}`,
          )],
          index: 4,
        };
      const result = materialize(fixture, prepared, inputFilename, {
        dates: Array(8).fill(before),
        hook,
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /terminal history|pending terminal|removal history/);
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
      assert.ok(fs.readdirSync(historyRoot(fixture)).some((name) =>
        name.startsWith('.fine-tuning-private-answer-quality-case-pending-')));
    });
  }
});

test('F1.18 CLI preserves pending case when retention crosses at rename', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const before = materializationTime(fixture);
    const result = materialize(fixture, prepared, inputFilename, {
      dates: [
        before, before, before, before, before, before, before, before,
        fixture.item.retention.deleteBy,
      ],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item is expired/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    assert.ok(fs.readdirSync(historyRoot(fixture)).some((name) =>
      name.startsWith('.fine-tuning-private-answer-quality-case-pending-')));
  });
});

test('F1.18 CLI fails closed when retention crosses during replay return or final output', () => {
  withReadyCase(({ fixture, inputFilename, prepared }) => {
    assert.equal(materialize(fixture, prepared, inputFilename).status, 0);
    const before = materializationTime(fixture);
    const replay = materialize(fixture, prepared, inputFilename, {
      dates: [before, before, before, fixture.item.retention.deleteBy],
    });
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /item is expired/);
    assert.equal(replay.stdout, '');
    assert.deepEqual(fs.readdirSync(finalDirectory(fixture)), ['case.json']);
  });

  withReadyCase(({ fixture, inputFilename, prepared }) => {
    const before = materializationTime(fixture);
    const result = materialize(fixture, prepared, inputFilename, {
      dates: [
        before, before, before, before, before, before, before, before, before,
        fixture.item.retention.deleteBy,
      ],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item is expired/);
    assert.equal(result.stdout, '');
    assert.deepEqual(fs.readdirSync(finalDirectory(fixture)), ['case.json']);
  });
});

function withReadyCase(callback) {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const resolved = resolve(fixture, prepared);
    assert.equal(resolved.status, 0, resolved.stderr);
    callback({ fixture, inputFilename: writeInput(fixture, prepared), prepared });
  }, { lane: 'answer-quality-cases' });
}

function resolve(fixture, prepared) {
  return spawnSync(process.execPath, [
    resolveScript,
    '--workspace', fixturePath(fixture, fixture.workspaceFilename),
    '--admission', fixturePath(fixture, fixture.admissionFilename),
    '--item', fixturePath(fixture, fixture.itemFilename),
    '--candidate', fixturePath(fixture, prepared.candidateFilename),
    '--decision', fixturePath(fixture, prepared.decisionFilename),
  ], { cwd: canonical(fixture.rootDir), encoding: 'utf8' });
}

function materialize(
  fixture,
  prepared,
  inputFilename,
  { candidateFilename = prepared.candidateFilename, dates, hook, replace, resolutionFilename = currentResolutionFilename(fixture) } = {},
) {
  const env = { ...process.env };
  const imports = [];
  if (dates) {
    imports.push(datePreload);
    env.FINE_TUNING_TEST_DATE_SEQUENCE = JSON.stringify(dates);
    env.FINE_TUNING_TEST_DATE_HOOK = JSON.stringify(hook || null);
  }
  if (replace) {
    imports.push(replaceInputPreload);
    env.FINE_TUNING_F1_18_REPLACE_INPUT = replace.filename;
    env.FINE_TUNING_F1_18_REPLACE_MODE = replace.mode;
  }
  env.NODE_OPTIONS = [
    env.NODE_OPTIONS || '',
    ...imports.map((filename) => `--import=${filename}`),
  ].join(' ').trim();
  return spawnSync(process.execPath, [
    materializeScript,
    '--workspace', fixturePath(fixture, fixture.workspaceFilename),
    '--admission', fixturePath(fixture, fixture.admissionFilename),
    '--item', fixturePath(fixture, fixture.itemFilename),
    '--candidate', fixturePath(fixture, candidateFilename),
    '--candidate-review-resolution', fixturePath(fixture, resolutionFilename),
    '--enrichment-input', fixturePath(fixture, inputFilename),
  ], { cwd: canonical(fixture.rootDir), encoding: 'utf8', env });
}

function buildInput(fixture, prepared) {
  return buildAnswerQualityEnrichmentInput(
    fixture,
    prepared.lineage.artifactPreparationResolution,
  );
}

function writeInput(fixture, prepared) {
  const filename = path.join(fixture.rootDir, 'var', 'inputs', 'enrichment-input.json');
  writeJson(filename, buildInput(fixture, prepared));
  return filename;
}

function currentResolutionFilename(fixture) {
  return path.join(f1_17FinalDirectory(fixture), 'resolution.json');
}

function reviewResolution(fixture) {
  return readJson(currentResolutionFilename(fixture));
}

function f1_17HistoryRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidate-review-resolutions',
    fixture.workspace.workspaceHash,
  );
}

function f1_17FinalDirectory(fixture) {
  return path.join(f1_17HistoryRoot(fixture), fixture.item.itemHash);
}

function historyRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-cases',
    fixture.workspace.workspaceHash,
  );
}

function finalDirectory(fixture) {
  return path.join(historyRoot(fixture), fixture.item.itemHash);
}

function pendingDirectory(fixture) {
  return path.join(
    historyRoot(fixture),
    `.fine-tuning-private-answer-quality-case-pending-${fixture.item.itemHash}-` +
      reviewResolution(fixture).candidateReviewResolutionHash,
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
  return path.join(canonical(fixture.rootDir), path.relative(fixture.rootDir, filename));
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function materializationTime(fixture) {
  return new Date(
    Date.parse(reviewResolution(fixture).resolvedAt) + 1_000,
  ).toISOString();
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
      confirmationToken: `withdraw-private-collection-item:${fixture.item.itemHash}`,
      decidedAt,
      decidedBy: 'retention-deletion-owner-role',
      evidenceSha256: 'd'.repeat(64),
      item: reference(fixture.item, 'itemHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
      withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
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
  writeJson(path.join(directory, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
    action: 'withdrawn',
    admission: reference(fixture.admission, 'admissionHash'),
    evidenceSha256: 'a'.repeat(64),
    recordedAt: new Date().toISOString(),
    recordedBy: 'retention-deletion-owner-role',
    withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
    workspace: reference(fixture.workspace, 'workspaceHash'),
  }));
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

function reference(value, field) {
  return { id: value.id, [field]: value[field] };
}

function chmodTree(directory) {
  fs.chmodSync(directory, 0o700);
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) chmodTree(filename);
    else fs.chmodSync(filename, 0o600);
  }
}
