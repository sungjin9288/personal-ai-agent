import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildFineTuningPrivateCollectionItemLifecycleDecision } from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { prepareFineTuningPrivateAnswerQualityDeletionCascade } from '../scripts/helpers/fine-tuning-private-answer-quality-case-cascade.mjs';
import {
  f1_16FinalDirectory,
  f1_17FinalDirectory,
  f1_18FinalDirectory,
  f1_19FinalDirectory,
  f1_19HistoryRoot,
  f1_20FinalDirectory,
  runPayload,
  runReplay,
  withReadyPrivateAnswerQualityPayload,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import { writeLifecycleDecision } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const lifecycleScript = path.join(
  process.cwd(),
  'scripts',
  'lifecycle-fine-tuning-private-collection-item.mjs',
);
const datePreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'sequence-date-preload.mjs',
);
const cascadeCleanupPreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'fail-f1-19-cascade-cleanup-preload.mjs',
);

test('F1.11 withdraw removes F1.19 through F1.16 before publishing its terminal bundle', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const first = runLifecycle(values.fixture);
    const second = runLifecycle(values.fixture);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);

    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), false);
    }
    assert.equal(fs.existsSync(values.fixture.itemFilename), false);
    const terminal = terminalDirectory(values.fixture);
    assert.deepEqual(fs.readdirSync(terminal).sort(), [
      'absence-receipt.json',
      'decision.json',
      'tombstone.json',
    ]);
    const cascade = cascadeFinalDirectory(values.fixture);
    assert.deepEqual(fs.readdirSync(cascade).sort(), [
      'absence-receipt.json',
      'inventory.json',
    ]);
    const inventory = readJson(path.join(cascade, 'inventory.json'));
    assert.deepEqual(
      inventory.components.map((component) => component.kind),
      ['payload', 'case', 'resolution', 'candidate'],
    );
    const receipt = readJson(path.join(cascade, 'absence-receipt.json'));
    assert.equal(receipt.derivativePathsAbsent, true);
    assert.equal(receipt.derivativeMatchingCount, 0);
    assert.equal(receipt.itemPathAbsent, true);
    assert.equal(receipt.managedNamespaceOnly, true);
    assert.equal(receipt.productionReadyClaim, false);

    const output = JSON.parse(first.stdout);
    assert.deepEqual(Object.keys(output), [
      'externalProviderCalls',
      'itemPathAbsent',
      'matchingAdmissionItemCount',
      'matchingItemHashCount',
      'mode',
      'ok',
      'postDeleteAbsenceObserved',
      'productionReadyClaim',
      'status',
      'trainingAuthorized',
    ]);
    assert.equal(output.externalProviderCalls, 'none');
    assert.equal(output.productionReadyClaim, false);
  });
});

test('F1.11 removes the F1.19 raw payload before the F1.20 replay receipt', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    assert.equal(runReplay(values).status, 0);
    const replayFinal = f1_20FinalDirectory(values.fixture);
    const replayRequest = readJson(path.join(replayFinal, 'request.json'));
    const replayPending = path.join(
      path.dirname(replayFinal),
      `.fine-tuning-private-answer-quality-case-replay-pending-${values.fixture.item.itemHash}-${replayRequest.replayRequestHash}`,
    );
    fs.renameSync(replayFinal, replayPending);
    fs.unlinkSync(path.join(replayPending, 'receipt.json'));
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(f1_19FinalDirectory(values.fixture)), false);
    assert.equal(fs.existsSync(f1_20FinalDirectory(values.fixture)), false);
    assert.equal(fs.existsSync(replayPending), false);
    const inventory = readJson(path.join(cascadeFinalDirectory(values.fixture), 'inventory.json'));
    assert.deepEqual(inventory.components.map((component) => component.kind), [
      'payload', 'replay', 'case', 'resolution', 'candidate',
    ]);
  });
});

test('F1.11 cascades rejected and decision-only pending F1.19 histories', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    assert.deepEqual(fs.readdirSync(f1_19FinalDirectory(values.fixture)), [
      'decision.json',
    ]);
    writeLifecycleDecision(values.fixture, 'withdraw');
    const result = runLifecycle(values.fixture);
    assert.equal(result.status, 0, result.stderr);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), false);
    }
  }, { payloadDecision: 'reject' });

  withReadyPrivateAnswerQualityPayload((values) => {
    const input = readJson(values.enrichmentInputFilename);
    input.requiredAnswerTerms = ['drifted'];
    writePrivateJson(values.enrichmentInputFilename, input);
    const materialization = runPayload(values);
    assert.notEqual(materialization.status, 0);
    assert.equal(fs.readdirSync(f1_19HistoryRoot(values.fixture)).length, 1);

    writeLifecycleDecision(values.fixture, 'withdraw');
    const result = runLifecycle(values.fixture);
    assert.equal(result.status, 0, result.stderr);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), false);
    }
  });
});

test('F1.11 retention deletion uses the same payload-first cascade', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    writeLifecycleDecision(
      values.fixture,
      'retention-delete',
      values.fixture.item.retention.deleteBy,
    );
    const afterDeleteBy = new Date(
      Date.parse(values.fixture.item.retention.deleteBy) + 1_000,
    ).toISOString();
    const env = {
      ...process.env,
      FINE_TUNING_TEST_DATE_SEQUENCE: JSON.stringify(
        Array(20).fill(afterDeleteBy),
      ),
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || '',
        `--import=${datePreload}`,
      ].join(' ').trim(),
    };

    const result = runLifecycle(values.fixture, { env });
    assert.equal(result.status, 0, result.stderr);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), false);
    }
    assert.equal(fs.existsSync(values.fixture.itemFilename), false);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
  });
});

test('F1.11 resumes after cascade finalization but before terminal publication', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    writeLifecycleDecision(values.fixture, 'withdraw');
    assert.equal(runLifecycle(values.fixture).status, 0);

    const final = terminalDirectory(values.fixture);
    const decision = readJson(path.join(final, 'decision.json'));
    const pending = path.join(
      terminalRoot(values.fixture),
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    fs.renameSync(final, pending);
    const removal = path.join(
      values.fixture.workspaceDirectory,
      values.fixture.item.lane,
      `.fine-tuning-private-collection-item-removal-${decision.decisionHash}`,
    );
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);

    const resumed = runLifecycle(values.fixture);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(fs.existsSync(pending), false);
    assert.equal(fs.existsSync(final), true);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);

    fs.renameSync(final, pending);
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);
    const cascadePending = path.join(
      path.dirname(cascadeFinalDirectory(values.fixture)),
      `.pending-${decision.decisionHash}`,
    );
    fs.renameSync(cascadeFinalDirectory(values.fixture), cascadePending);

    const receiptReadyResume = runLifecycle(values.fixture);
    assert.equal(receiptReadyResume.status, 0, receiptReadyResume.stderr);
    assert.equal(fs.existsSync(cascadePending), false);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
  });
});

test('F1.11 resumes after derivative deletion and before item removal', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: values.fixture.admission,
      executionAt: input.decidedAt,
      input,
      item: values.fixture.item,
      workspace: values.fixture.workspace,
    });
    const pendingTerminal = path.join(
      terminalRoot(values.fixture),
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    makePrivateDirectory(pendingTerminal);
    writePrivateJson(path.join(pendingTerminal, 'decision.json'), decision);

    const cascade = prepareFineTuningPrivateAnswerQualityDeletionCascade({
      current: {
        admission: values.fixture.admission,
        decision: input,
        item: values.fixture.item,
        workspace: values.fixture.workspace,
      },
      decision,
      repoDir: fs.realpathSync(values.fixture.rootDir),
    });
    assert.ok(cascade);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), false);
    }

    const resumed = runLifecycle(values.fixture);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(fs.existsSync(values.fixture.itemFilename), false);
    assert.equal(fs.existsSync(pendingTerminal), false);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
  });
});

test('F1.11 resumes an exact receipt-backed cascade cleanup suffix', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = lifecycleDecision(values.fixture, input);
    const interrupted = runLifecycle(values.fixture, {
      env: {
        ...process.env,
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS || '',
          `--import=${cascadeCleanupPreload}`,
        ].join(' ').trim(),
      },
    });

    assert.notEqual(interrupted.status, 0);
    assert.match(
      interrupted.stderr,
      /injected crash after first cascade cleanup directory/,
    );
    const pending = cascadePendingDirectory(values.fixture, decision);
    assert.deepEqual(
      fs.readdirSync(path.join(pending, 'staged')).sort(),
      ['02-case', '03-resolution', '04-candidate'],
    );

    const resumed = runLifecycle(values.fixture);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(fs.existsSync(pending), false);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
  });
});

test('F1.11 resumes only the exact payload-first staged deletion suffix', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = lifecycleDecision(values.fixture, input);
    writePendingTerminalDecision(values.fixture, decision);

    const originalUnlink = fs.unlinkSync;
    let payloadRemoved = false;
    fs.unlinkSync = (filename) => {
      originalUnlink(filename);
      if (
        filename.endsWith(`${path.sep}payload.json`) &&
        filename.includes(`${path.sep}staged${path.sep}`)
      ) {
        payloadRemoved = true;
        throw new Error('injected crash after payload unlink');
      }
    };
    try {
      assert.throws(
        () =>
          prepareFineTuningPrivateAnswerQualityDeletionCascade({
            current: cascadeCurrent(values, input),
            decision,
            repoDir: fs.realpathSync(values.fixture.rootDir),
          }),
        /injected crash/,
      );
    } finally {
      fs.unlinkSync = originalUnlink;
    }
    assert.equal(payloadRemoved, true);
    const stagedPayload = path.join(
      cascadePendingDirectory(values.fixture, decision),
      'staged',
      '01-payload',
    );
    assert.deepEqual(fs.readdirSync(stagedPayload), ['decision.json']);

    const resumed = prepareFineTuningPrivateAnswerQualityDeletionCascade({
      current: cascadeCurrent(values, input),
      decision,
      repoDir: fs.realpathSync(values.fixture.rootDir),
    });
    assert.ok(resumed);
    assert.deepEqual(fs.readdirSync(stagedPayload), []);

    const completed = runLifecycle(values.fixture);
    assert.equal(completed.status, 0, completed.stderr);
    assert.equal(fs.existsSync(values.fixture.itemFilename), false);
  });
});

test('F1.11 rejects deletion progress beyond the global payload-first frontier', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = lifecycleDecision(values.fixture, input);
    writePendingTerminalDecision(values.fixture, decision);

    const originalUnlink = fs.unlinkSync;
    fs.unlinkSync = (filename) => {
      if (
        filename.endsWith(`${path.sep}payload.json`) &&
        filename.includes(`${path.sep}staged${path.sep}`)
      ) {
        throw new Error('injected crash before staged deletion');
      }
      originalUnlink(filename);
    };
    try {
      assert.throws(
        () =>
          prepareFineTuningPrivateAnswerQualityDeletionCascade({
            current: cascadeCurrent(values, input),
            decision,
            repoDir: fs.realpathSync(values.fixture.rootDir),
          }),
        /injected crash/,
      );
    } finally {
      fs.unlinkSync = originalUnlink;
    }

    const staged = path.join(
      cascadePendingDirectory(values.fixture, decision),
      'staged',
    );
    fs.unlinkSync(path.join(staged, '02-case', 'case.json'));

    assert.throws(
      () =>
        prepareFineTuningPrivateAnswerQualityDeletionCascade({
          current: cascadeCurrent(values, input),
          decision,
          repoDir: fs.realpathSync(values.fixture.rootDir),
        }),
      /staged deletion order is invalid/,
    );
    assert.deepEqual(fs.readdirSync(path.join(staged, '01-payload')).sort(), [
      'decision.json',
      'payload.json',
    ]);
    assert.deepEqual(fs.readdirSync(path.join(staged, '02-case')), []);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });
});

test('F1.11 recovers only empty pre-inventory cascade states', () => {
  for (const state of ['empty', 'staged-only']) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      const input = writeLifecycleDecision(values.fixture, 'withdraw');
      const decision = lifecycleDecision(values.fixture, input);
      writePendingTerminalDecision(values.fixture, decision);
      const pending = cascadePendingDirectory(values.fixture, decision);
      makePrivateDirectory(pending);
      if (state === 'staged-only') {
        makePrivateDirectory(path.join(pending, 'staged'));
      }

      const result = runLifecycle(values.fixture);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.existsSync(pending), false);
      assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
    });
  }
});

test('F1.11 rejects rehashed payload content and predecessor lineage drift', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const filename = path.join(
      f1_19FinalDirectory(values.fixture),
      'payload.json',
    );
    const payload = readJson(filename);
    payload.payload.objective = 'Different synthetic objective';
    payload.bindings.contentHash = hash({
      instruction: payload.payload.objective,
      response: payload.payload.caseDefinition.answer.text,
    });
    payload.bindings.payloadContentHash = hash(payload.payload);
    rehashPayloadRecord(payload);
    writePrivateJson(filename, payload);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical private item/);
    assert.equal(fs.existsSync(filename), true);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const filename = path.join(
      f1_17FinalDirectory(values.fixture),
      'decision.json',
    );
    const decision = readJson(filename);
    decision.decisionRecord.evidenceSha256 = 'f'.repeat(64);
    decision.decisionHash = hash(decision.decisionRecord);
    decision.id =
      'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
      decision.decisionHash;
    writePrivateJson(filename, decision);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /resolution decision lineage/);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });
});

test('F1.11 rejects a rehashed F1.20 receipt payloadContentHash drift and preserves state', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    assert.equal(runReplay(values).status, 0);
    const replayDirectory = f1_20FinalDirectory(values.fixture);
    const receiptFilename = path.join(replayDirectory, 'receipt.json');
    const receipt = readJson(receiptFilename);
    receipt.bindings.payloadContentHash = 'f'.repeat(64);
    rehashReplayReceipt(receipt);
    writePrivateJson(receiptFilename, receipt);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.20 derivative replay definition lineage conflict/);
    assert.equal(fs.existsSync(path.join(f1_19FinalDirectory(values.fixture), 'payload.json')), true);
    assert.equal(fs.existsSync(replayDirectory), true);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });
});

test('F1.11 binds candidate retention and decision-only review timing', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    fs.rmSync(f1_19FinalDirectory(values.fixture), { recursive: true });
    fs.rmSync(f1_18FinalDirectory(values.fixture), { recursive: true });
    fs.rmSync(f1_17FinalDirectory(values.fixture), { recursive: true });
    const filename = path.join(
      f1_16FinalDirectory(values.fixture),
      'candidate.json',
    );
    const candidate = readJson(filename);
    candidate.sourceObservation.expiresAt = '9999-01-01T00:00:00.000Z';
    candidate.sourceObservation.deleteBy = '9999-01-02T00:00:00.000Z';
    rehashCandidateRecord(candidate);
    writePrivateJson(filename, candidate);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical private item/);
    assert.equal(fs.existsSync(filename), true);
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });

  for (const decideAt of [
    (values) =>
      new Date(Date.parse(values.prepared.candidate.observedAt) - 1_000).toISOString(),
    (values) =>
      new Date(
        Date.parse(values.fixture.item.retention.deleteBy) + 1_000,
      ).toISOString(),
  ]) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      fs.rmSync(f1_19FinalDirectory(values.fixture), { recursive: true });
      fs.rmSync(f1_18FinalDirectory(values.fixture), { recursive: true });
      const resolutionDirectory = f1_17FinalDirectory(values.fixture);
      const decisionFilename = path.join(resolutionDirectory, 'decision.json');
      const decision = readJson(decisionFilename);
      fs.unlinkSync(path.join(resolutionDirectory, 'resolution.json'));
      decision.decisionRecord.decidedAt = decideAt(values);
      decision.decisionHash = hash(decision.decisionRecord);
      decision.id =
        'fine-tuning-private-answer-quality-enrichment-candidate-review-decision-' +
        decision.decisionHash;
      writePrivateJson(decisionFilename, decision);
      const pending = path.join(
        path.dirname(resolutionDirectory),
        `.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-` +
          `${values.fixture.item.itemHash}-${decision.decisionHash}`,
      );
      fs.renameSync(resolutionDirectory, pending);
      writeLifecycleDecision(values.fixture, 'withdraw');

      const result = runLifecycle(values.fixture);

      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /timeline conflicts|canonical private item/,
      );
      assert.equal(fs.existsSync(pending), true);
      assert.equal(fs.existsSync(values.fixture.itemFilename), true);
    });
  }
});

test('F1.11 binds recordful F1.16 and F1.18 pending names to stored hashes', () => {
  for (const moveToWrongPending of [
    (values) => {
      const source = f1_16FinalDirectory(values.fixture);
      const target = path.join(
        path.dirname(source),
        `.private-answer-quality-case-pending-${values.fixture.item.itemHash}-` +
          'f'.repeat(64),
      );
      fs.renameSync(source, target);
    },
    (values) => {
      const source = f1_18FinalDirectory(values.fixture);
      const target = path.join(
        path.dirname(source),
        `.fine-tuning-private-answer-quality-case-pending-` +
          `${values.fixture.item.itemHash}-${'f'.repeat(64)}`,
      );
      fs.renameSync(source, target);
    },
  ]) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      moveToWrongPending(values);
      writeLifecycleDecision(values.fixture, 'withdraw');

      const result = runLifecycle(values.fixture);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /candidate history|case history/);
      assert.equal(fs.existsSync(values.fixture.itemFilename), true);
    });
  }
});

test('F1.11 supports candidate-only and reviewed-candidate derivative prefixes', () => {
  for (const remove of [
    (values) => {
      fs.rmSync(f1_19FinalDirectory(values.fixture), { recursive: true });
      fs.rmSync(f1_18FinalDirectory(values.fixture), { recursive: true });
      fs.rmSync(f1_17FinalDirectory(values.fixture), { recursive: true });
    },
    (values) => {
      fs.rmSync(f1_19FinalDirectory(values.fixture), { recursive: true });
      fs.rmSync(f1_18FinalDirectory(values.fixture), { recursive: true });
    },
  ]) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      remove(values);
      writeLifecycleDecision(values.fixture, 'withdraw');

      const result = runLifecycle(values.fixture);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.existsSync(values.fixture.itemFilename), false);
      assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
    });
  }
});

test('F1.11 rechecks derivative absence after writing the cascade receipt', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const decisionRecord = readJson(
      path.join(f1_19FinalDirectory(values.fixture), 'decision.json'),
    );
    const payloadRecord = readJson(
      path.join(f1_19FinalDirectory(values.fixture), 'payload.json'),
    );
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const resurrected = f1_19FinalDirectory(values.fixture);
    const hook = {
      directories: [resurrected],
      files: [
        {
          filename: path.join(resurrected, 'decision.json'),
          value: decisionRecord,
        },
        {
          filename: path.join(resurrected, 'payload.json'),
          value: payloadRecord,
        },
      ],
      index: 2,
    };
    const env = {
      ...process.env,
      FINE_TUNING_TEST_DATE_HOOK: JSON.stringify(hook),
      FINE_TUNING_TEST_DATE_SEQUENCE: JSON.stringify(
        Array(8).fill(input.decidedAt),
      ),
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || '',
        `--import=${datePreload}`,
      ].join(' ').trim(),
    };

    const result = runLifecycle(values.fixture, { env });
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /derivative absence check failed|predecessor chain is incomplete/,
    );
    assert.equal(fs.existsSync(resurrected), true);
    assert.equal(fs.existsSync(terminalDirectory(values.fixture)), false);
  });
});

test('F1.11 preserves derivatives when workspace preflight fails', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    fs.writeFileSync(
      path.join(values.fixture.workspaceDirectory, 'answer-quality-cases', 'rogue'),
      'unexpected',
    );
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace contains unexpected content/);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), true);
    }
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = lifecycleDecision(values.fixture, input);
    writePendingTerminalDecision(values.fixture, decision);
    const removal = lifecycleRemovalDirectory(values.fixture, decision);
    makePrivateDirectory(removal);
    fs.copyFileSync(values.fixture.itemFilename, path.join(removal, 'item.json'));
    fs.chmodSync(path.join(removal, 'item.json'), 0o600);

    const result = runLifecycle(values.fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item and removal directory conflict/);
    for (const directory of derivativeDirectories(values)) {
      assert.equal(fs.existsSync(directory), true);
    }
    assert.equal(fs.existsSync(values.fixture.itemFilename), true);
  });
});

test('F1.11 rejects derivative resurrection without durable cascade history', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const candidateBackup = path.join(
      values.fixture.rootDir,
      'var',
      'inputs',
      'candidate-backup',
    );
    fs.cpSync(f1_16FinalDirectory(values.fixture), candidateBackup, {
      recursive: true,
    });
    chmodPrivateTree(candidateBackup);
    for (const directory of derivativeDirectories(values)) {
      fs.rmSync(directory, { recursive: true });
    }
    const input = writeLifecycleDecision(values.fixture, 'withdraw');
    const decision = lifecycleDecision(values.fixture, input);
    const pendingTerminal = writePendingTerminalDecision(
      values.fixture,
      decision,
    );
    const removal = lifecycleRemovalDirectory(values.fixture, decision);
    fs.renameSync(path.dirname(values.fixture.itemFilename), removal);
    fs.unlinkSync(path.join(removal, 'item.json'));
    fs.mkdirSync(path.dirname(f1_16FinalDirectory(values.fixture)), {
      recursive: true,
      mode: 0o700,
    });
    fs.chmodSync(path.dirname(f1_16FinalDirectory(values.fixture)), 0o700);
    fs.cpSync(candidateBackup, f1_16FinalDirectory(values.fixture), {
      recursive: true,
    });
    chmodPrivateTree(f1_16FinalDirectory(values.fixture));

    const result = runLifecycle(values.fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /resurrected derivative history/);
    assert.equal(fs.existsSync(f1_16FinalDirectory(values.fixture)), true);
    assert.equal(fs.existsSync(pendingTerminal), true);
    assert.equal(fs.existsSync(removal), true);
  });
});

test('F1.11 fails closed when derivative history reappears after cascade completion', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const payloadBackup = path.join(
      values.fixture.rootDir,
      'var',
      'inputs',
      'payload-backup',
    );
    assert.equal(runPayload(values).status, 0);
    fs.cpSync(f1_19FinalDirectory(values.fixture), payloadBackup, {
      recursive: true,
    });
    chmodPrivateTree(payloadBackup);
    writeLifecycleDecision(values.fixture, 'withdraw');
    assert.equal(runLifecycle(values.fixture).status, 0);

    const resurrected = f1_19FinalDirectory(values.fixture);
    fs.mkdirSync(path.dirname(resurrected), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(resurrected), 0o700);
    fs.cpSync(payloadBackup, resurrected, { recursive: true });
    chmodPrivateTree(resurrected);

    const replay = runLifecycle(values.fixture);
    assert.notEqual(replay.status, 0);
    assert.match(
      replay.stderr,
      /derivative absence check failed|predecessor chain is incomplete/,
    );
    assert.equal(fs.existsSync(resurrected), true);
  });
});

test('F1.11 rejects a current cascade receipt copied into a foreign workspace', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    writeLifecycleDecision(values.fixture, 'withdraw');
    assert.equal(runLifecycle(values.fixture).status, 0);

    const foreign = path.join(
      path.dirname(path.dirname(cascadeFinalDirectory(values.fixture))),
      'f'.repeat(64),
      'e'.repeat(64),
    );
    fs.cpSync(cascadeFinalDirectory(values.fixture), foreign, {
      recursive: true,
    });
    chmodPrivateTree(path.dirname(foreign));

    const replay = runLifecycle(values.fixture);
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /foreign workspace copy/);
    assert.equal(fs.existsSync(foreign), true);
  });
});

test('F1.11 rejects current staged content hidden in unrelated cascade history', () => {
  for (const placement of ['same-workspace', 'foreign-workspace']) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      const input = writeLifecycleDecision(values.fixture, 'withdraw');
      const decision = lifecycleDecision(values.fixture, input);
      writePendingTerminalDecision(values.fixture, decision);

      const originalUnlink = fs.unlinkSync;
      fs.unlinkSync = (filename) => {
        if (
          filename.endsWith(`${path.sep}payload.json`) &&
          filename.includes(`${path.sep}staged${path.sep}`)
        ) {
          throw new Error('injected crash before staged payload unlink');
        }
        originalUnlink(filename);
      };
      try {
        assert.throws(
          () =>
            prepareFineTuningPrivateAnswerQualityDeletionCascade({
              current: cascadeCurrent(values, input),
              decision,
              repoDir: fs.realpathSync(values.fixture.rootDir),
            }),
          /injected crash/,
        );
      } finally {
        fs.unlinkSync = originalUnlink;
      }

      const source = cascadePendingDirectory(values.fixture, decision);
      const foreignWorkspaceHash = 'f'.repeat(64);
      const targetWorkspaceHash =
        placement === 'foreign-workspace'
          ? foreignWorkspaceHash
          : values.fixture.workspace.workspaceHash;
      const targetRoot = path.join(
        values.fixture.rootDir,
        'var',
        'fine-tuning',
        'private-answer-quality-case-deletion-cascades',
        targetWorkspaceHash,
      );
      makePrivateDirectory(targetRoot);
      const copiedDecisionHash = '0'.repeat(64);
      const target = path.join(targetRoot, `.pending-${copiedDecisionHash}`);
      fs.cpSync(source, target, { recursive: true });
      chmodPrivateTree(target);
      rebindCopiedCascadeInventory(target, {
        decisionHash: copiedDecisionHash,
        itemHash: 'd'.repeat(64),
        withdrawalReferenceSha256: 'e'.repeat(64),
        workspaceHash: targetWorkspaceHash,
      });

      const result = runLifecycle(values.fixture);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /staged lineage is invalid|derivative payload history is invalid/,
      );
      assert.equal(
        fs.existsSync(path.join(target, 'staged', '01-payload', 'payload.json')),
        true,
      );
    });
  }
});

test('F1.11 rejects rehashed private fields in cascade inventory shapes', () => {
  for (const mutate of [
    (inventory) => {
      inventory.privateContent = 'must not enter cascade audit history';
    },
    (inventory) => {
      inventory.components[0].files[0].role =
        'private content must not become an audit role';
    },
  ]) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      writeLifecycleDecision(values.fixture, 'withdraw');
      assert.equal(runLifecycle(values.fixture).status, 0);

      const cascade = cascadeFinalDirectory(values.fixture);
      const inventoryFilename = path.join(cascade, 'inventory.json');
      const inventory = readJson(inventoryFilename);
      mutate(inventory);
      const { inventoryHash: _inventoryHash, ...inventoryContent } = inventory;
      inventory.inventoryHash = hash(inventoryContent);
      writePrivateJson(inventoryFilename, inventory);

      const receiptFilename = path.join(cascade, 'absence-receipt.json');
      const receipt = readJson(receiptFilename);
      receipt.cascadeInventoryHash = inventory.inventoryHash;
      const {
        absenceReceiptHash: _absenceReceiptHash,
        ...receiptContent
      } = receipt;
      receipt.absenceReceiptHash = hash(receiptContent);
      writePrivateJson(receiptFilename, receipt);

      const replay = runLifecycle(values.fixture);
      assert.notEqual(replay.status, 0);
      assert.match(replay.stderr, /cascade inventory is invalid/);
    });
  }
});

test('F1.11 preserves unrelated valid cascade history in the same workspace', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const unrelated = writeUnrelatedCascadeHistory(values.fixture);
    writeLifecycleDecision(values.fixture, 'withdraw');

    const result = runLifecycle(values.fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(unrelated), true);
    assert.equal(fs.existsSync(cascadeFinalDirectory(values.fixture)), true);
  });
});

function runLifecycle(fixture, { env = process.env } = {}) {
  return spawnSync(
    process.execPath,
    [
      lifecycleScript,
      '--workspace',
      fixture.workspaceFilename,
      '--admission',
      fixture.admissionFilename,
      '--item',
      fixture.itemFilename,
      '--decision',
      fixture.decisionFilename,
    ],
    { cwd: fs.realpathSync(fixture.rootDir), encoding: 'utf8', env },
  );
}

function lifecycleDecision(fixture, input) {
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: input.decidedAt,
    input,
    item: fixture.item,
    workspace: fixture.workspace,
  });
}

function writePendingTerminalDecision(fixture, decision) {
  const directory = path.join(
    terminalRoot(fixture),
    `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
  );
  makePrivateDirectory(directory);
  writePrivateJson(path.join(directory, 'decision.json'), decision);
  return directory;
}

function cascadeCurrent(values, decisionInput) {
  return {
    admission: values.fixture.admission,
    decision: decisionInput,
    item: values.fixture.item,
    workspace: values.fixture.workspace,
  };
}

function cascadePendingDirectory(fixture, decision) {
  return path.join(
    path.dirname(cascadeFinalDirectory(fixture)),
    `.pending-${decision.decisionHash}`,
  );
}

function lifecycleRemovalDirectory(fixture, decision) {
  return path.join(
    fixture.workspaceDirectory,
    fixture.item.lane,
    `.fine-tuning-private-collection-item-removal-${decision.decisionHash}`,
  );
}

function rehashPayloadRecord(payload) {
  const {
    answerQualityCasePayloadHash: _answerQualityCasePayloadHash,
    id: _id,
    ...content
  } = payload;
  payload.answerQualityCasePayloadHash = hash(content);
  payload.id =
    `fine-tuning-private-answer-quality-case-payload-` +
    payload.answerQualityCasePayloadHash;
}

function rehashReplayReceipt(receipt) {
  const { id: _id, privateAnswerQualityCaseReplayHash: _hash, ...content } = receipt;
  receipt.privateAnswerQualityCaseReplayHash = hash(content);
  receipt.id =
    `fine-tuning-private-answer-quality-case-replay-` +
    receipt.privateAnswerQualityCaseReplayHash;
}

function rehashCandidateRecord(candidate) {
  const { candidateHash: _candidateHash, id: _id, ...content } = candidate;
  candidate.candidateHash = hash(content);
}

function derivativeDirectories(values) {
  return [
    f1_19FinalDirectory(values.fixture),
    f1_18FinalDirectory(values.fixture),
    f1_17FinalDirectory(values.fixture),
    f1_16FinalDirectory(values.fixture),
  ];
}

function terminalRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    fixture.workspace.workspaceHash,
  );
}

function terminalDirectory(fixture) {
  return path.join(
    terminalRoot(fixture),
    fixture.item.retention.withdrawalReferenceSha256,
  );
}

function cascadeFinalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-deletion-cascades',
    fixture.workspace.workspaceHash,
    fixture.item.retention.withdrawalReferenceSha256,
  );
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writePrivateJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
  fs.chmodSync(filename, 0o600);
}

function chmodPrivateTree(directory) {
  fs.chmodSync(directory, 0o700);
  for (const name of fs.readdirSync(directory)) {
    const filename = path.join(directory, name);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      chmodPrivateTree(filename);
    } else {
      fs.chmodSync(filename, 0o600);
    }
  }
}

function makePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  fs.chmodSync(path.dirname(directory), 0o700);
}

function writeUnrelatedCascadeHistory(fixture) {
  const withdrawalReferenceSha256 = 'e'.repeat(64);
  const directory = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-deletion-cascades',
    fixture.workspace.workspaceHash,
    withdrawalReferenceSha256,
  );
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodPrivateTree(directory);
  const inventoryContent = {
    components: [{
      directoryDev: 1,
      directoryIno: 1,
      entryNameSha256: 'a'.repeat(64),
      files: [{
        bytesSha256: '4'.repeat(64),
        dev: 1,
        ino: 1,
        mode: 0o600,
        role: 'candidate',
        size: 1,
      }],
      kind: 'candidate',
      recordHash: 'b'.repeat(64),
      sourceState: 'final',
    }],
    decisionHash: 'c'.repeat(64),
    itemHash: 'd'.repeat(64),
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-case-deletion-cascade/v1',
    withdrawalReferenceSha256,
    workspaceHash: fixture.workspace.workspaceHash,
  };
  const inventory = {
    ...inventoryContent,
    inventoryHash: hash(inventoryContent),
  };
  const receiptContent = {
    cascadeInventoryHash: inventory.inventoryHash,
    decisionHash: inventory.decisionHash,
    derivativeMatchingCount: 0,
    derivativePathsAbsent: true,
    itemHash: inventory.itemHash,
    itemPathAbsent: true,
    managedNamespaceOnly: true,
    observedAt: new Date().toISOString(),
    pendingDerivativeCount: 0,
    productionReadyClaim: false,
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-case-deletion-cascade-absence-receipt/v1',
    terminalHashes: {
      decisionHash: '1'.repeat(64),
      receiptHash: '2'.repeat(64),
      tombstoneHash: '3'.repeat(64),
    },
    withdrawalReferenceSha256,
    workspaceHash: fixture.workspace.workspaceHash,
  };
  writePrivateJson(path.join(directory, 'inventory.json'), inventory);
  writePrivateJson(path.join(directory, 'absence-receipt.json'), {
    ...receiptContent,
    absenceReceiptHash: hash(receiptContent),
  });
  return directory;
}

function rebindCopiedCascadeInventory(directory, bindings) {
  const inventoryFilename = path.join(directory, 'inventory.json');
  const inventory = readJson(inventoryFilename);
  for (const [index, component] of inventory.components.entries()) {
    const componentDirectory = path.join(
      directory,
      'staged',
      `${String(index + 1).padStart(2, '0')}-${component.kind}`,
    );
    const directoryStat = fs.lstatSync(componentDirectory);
    component.directoryDev = directoryStat.dev;
    component.directoryIno = directoryStat.ino;
    component.files = component.files.map((file) => {
      const filename = path.join(
        componentDirectory,
        stagedRoleFilename(file.role),
      );
      const stat = fs.lstatSync(filename);
      return {
        ...file,
        bytesSha256: hashBytes(fs.readFileSync(filename)),
        dev: stat.dev,
        ino: stat.ino,
        mode: stat.mode & 0o777,
        size: stat.size,
      };
    });
  }
  Object.assign(inventory, bindings);
  const { inventoryHash: _inventoryHash, ...content } = inventory;
  inventory.inventoryHash = hash(content);
  writePrivateJson(inventoryFilename, inventory);
}

function stagedRoleFilename(role) {
  const filenames = {
    candidate: 'candidate.json',
    case: 'case.json',
    payload: 'payload.json',
    'payload-decision': 'decision.json',
    resolution: 'resolution.json',
    'resolution-decision': 'decision.json',
  };
  return filenames[role];
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashBytes(value) {
  return createHash('sha256').update(value).digest('hex');
}
