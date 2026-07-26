import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  f1_16FinalDirectory,
  f1_17FinalDirectory,
  f1_19FinalDirectory,
  f1_19HistoryRoot,
  runPayload,
  withReadyPrivateAnswerQualityPayload,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import { writeJson } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const datePreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'sequence-date-preload.mjs',
);
const expireAfterPublishPreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'expire-f1-19-after-publish-preload.mjs',
);
const replaceInputAfterPublishPreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'replace-f1-19-input-after-publish-preload.mjs',
);
const recreateExpiredPayloadPreload = path.join(
  process.cwd(),
  'test',
  'helpers',
  'recreate-f1-19-expired-payload-preload.mjs',
);

test('F1.19 CLI publishes and replays one owner-authorized local payload', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const first = runPayload(values);
    const second = runPayload(values);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);

    const output = JSON.parse(first.stdout);
    assert.deepEqual(Object.keys(output), [
      'status',
      'decision',
      'payloadStored',
      'contentCopied',
      'q1ContractSatisfied',
      'trainingAuthorized',
      'externalProviderCalls',
      'productionReadyClaim',
    ]);
    assert.equal(output.decision, 'approve');
    assert.equal(output.payloadStored, true);
    assert.equal(output.contentCopied, true);
    assert.equal(output.trainingAuthorized, false);
    assert.equal(output.externalProviderCalls, 'none');
    assert.equal(output.productionReadyClaim, false);

    const final = f1_19FinalDirectory(values.fixture);
    assert.deepEqual(fs.readdirSync(final).sort(), [
      'decision.json',
      'payload.json',
    ]);
    assert.equal(fs.statSync(final).mode & 0o777, 0o700);
    assert.equal(
      fs.statSync(path.join(final, 'payload.json')).mode & 0o777,
      0o600,
    );
    const payload = readJson(path.join(final, 'payload.json'));
    assert.equal(
      payload.payload.objective,
      values.fixture.item.example.instruction,
    );
    assert.equal(
      payload.payload.caseDefinition.answer.text,
      values.fixture.item.example.response,
    );
    assertPrivatePayloadValuesAbsent(first, privatePayloadValues(values));
  });
});

test('F1.19 reject path never reads or stores the enrichment payload', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    fs.unlinkSync(values.enrichmentInputFilename);
    const result = runPayload(values);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'reject');
    assert.equal(output.payloadStored, false);
    assert.equal(output.contentCopied, false);
    assert.deepEqual(fs.readdirSync(f1_19FinalDirectory(values.fixture)), [
      'decision.json',
    ]);
  }, { payloadDecision: 'reject' });
});

test('F1.19 CLI recovers exact empty, decision-only, and complete pending bundles', () => {
  for (const state of ['empty', 'decision-only', 'complete']) {
    withReadyPrivateAnswerQualityPayload((values) => {
      assert.equal(runPayload(values).status, 0);
      const final = f1_19FinalDirectory(values.fixture);
      const storedDecision = readJson(path.join(final, 'decision.json'));
      const pending = path.join(
        f1_19HistoryRoot(values.fixture),
        `.fine-tuning-private-answer-quality-case-payload-pending-` +
          `${values.fixture.item.itemHash}-${storedDecision.decisionHash}`,
      );
      if (state === 'empty') {
        fs.rmSync(final, { recursive: true });
        makePrivateDirectory(pending);
      } else {
        fs.renameSync(final, pending);
        if (state === 'decision-only') {
          fs.unlinkSync(path.join(pending, 'payload.json'));
        }
      }

      const resumed = runPayload(values);
      assert.equal(resumed.status, 0, resumed.stderr);
      assert.equal(fs.existsSync(pending), false);
      assert.deepEqual(fs.readdirSync(final).sort(), [
        'decision.json',
        'payload.json',
      ]);
    });
  }
});

test('F1.19 CLI rejects authority and payload drift before content publication', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const privateValues = privatePayloadValues(values);
    const decision = readJson(values.payloadDecisionFilename);
    decision.decidedByRole = 'quality-reviewer';
    writeJson(values.payloadDecisionFilename, decision);

    const result = runPayload(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /decision authority is invalid/);
    assertPrivatePayloadValuesAbsent(result, privateValues);
    assert.equal(fs.existsSync(f1_19HistoryRoot(values.fixture)), false);
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    const privateValues = privatePayloadValues(values);
    const input = readJson(values.enrichmentInputFilename);
    input.requiredAnswerTerms = ['different'];
    writeJson(values.enrichmentInputFilename, input);

    const result = runPayload(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /drifted from F1\.18|deterministic evaluation/);
    assertPrivatePayloadValuesAbsent(result, privateValues);
    const entries = fs.readdirSync(f1_19HistoryRoot(values.fixture));
    assert.equal(entries.length, 1);
    const pending = path.join(f1_19HistoryRoot(values.fixture), entries[0]);
    assert.deepEqual(fs.readdirSync(pending), ['decision.json']);
  });
});

test('F1.19 CLI removes pending or newly published payload content at retention expiry', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const before = new Date(
      Date.parse(values.answerQualityCase.materializedAt) + 1_000,
    ).toISOString();
    const expired = runPayload(values, {
      env: dateEnvironment([
        before,
        values.fixture.item.retention.deleteBy,
      ]),
    });

    assert.notEqual(expired.status, 0);
    assert.match(expired.stderr, /item is expired/);
    const [pendingName] = fs.readdirSync(f1_19HistoryRoot(values.fixture));
    const pending = path.join(f1_19HistoryRoot(values.fixture), pendingName);
    assert.deepEqual(fs.readdirSync(pending), ['decision.json']);

    const replay = runPayload(values, {
      env: dateEnvironment([values.fixture.item.retention.deleteBy]),
    });
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /item is expired/);
    assert.deepEqual(fs.readdirSync(pending), ['decision.json']);
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    const before = new Date(
      Date.parse(values.answerQualityCase.materializedAt) + 1_000,
    ).toISOString();
    const env = {
      ...process.env,
      FINE_TUNING_TEST_AFTER_PUBLISH_DATE:
        values.fixture.item.retention.deleteBy,
      FINE_TUNING_TEST_BEFORE_PUBLISH_DATE: before,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || '',
        `--import=${expireAfterPublishPreload}`,
      ].join(' ').trim(),
    };
    const expired = runPayload(values, { env });

    assert.notEqual(expired.status, 0);
    assert.match(expired.stderr, /item is expired/);
    assert.deepEqual(
      fs.readdirSync(f1_19FinalDirectory(values.fixture)),
      ['decision.json'],
    );

    const replay = runPayload(values, {
      env: dateEnvironment([values.fixture.item.retention.deleteBy]),
    });
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /item is expired/);
    assert.deepEqual(
      fs.readdirSync(f1_19FinalDirectory(values.fixture)),
      ['decision.json'],
    );
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    const published = runPayload(values);
    assert.equal(published.status, 0, published.stderr);
    const final = f1_19FinalDirectory(values.fixture);

    const expiredReplay = runPayload(values, {
      env: dateEnvironment([values.fixture.item.retention.deleteBy]),
    });

    assert.notEqual(expiredReplay.status, 0);
    assert.match(expiredReplay.stderr, /item is expired/);
    assert.deepEqual(fs.readdirSync(final).sort(), [
      'decision.json',
      'payload.json',
    ]);
  });
});

test('F1.19 CLI detects payload recreation during expiry cleanup', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const before = new Date(
      Date.parse(values.answerQualityCase.materializedAt) + 1_000,
    ).toISOString();
    const env = {
      ...dateEnvironment([
        before,
        values.fixture.item.retention.deleteBy,
      ]),
    };
    env.NODE_OPTIONS = [
      env.NODE_OPTIONS,
      `--import=${recreateExpiredPayloadPreload}`,
    ].join(' ');

    const result = runPayload(values, { env });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /could not be removed safely/);
    const [pendingName] = fs.readdirSync(f1_19HistoryRoot(values.fixture));
    const pending = path.join(f1_19HistoryRoot(values.fixture), pendingName);
    assert.deepEqual(fs.readdirSync(pending).sort(), [
      'decision.json',
      'payload.json',
    ]);
  });
});

test('F1.19 CLI detects same-byte input replacement after publish', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const privateValues = privatePayloadValues(values);
    const result = runPayload(values, {
      env: {
        ...process.env,
        FINE_TUNING_TEST_REPLACE_INPUT_AFTER_PUBLISH:
          values.enrichmentInputFilename,
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS || '',
          `--import=${replaceInputAfterPublishPreload}`,
        ].join(' ').trim(),
      },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /enrichmentInput.*changed/);
    assertPrivatePayloadValuesAbsent(result, privateValues);
    assert.deepEqual(
      fs.readdirSync(f1_19FinalDirectory(values.fixture)).sort(),
      ['decision.json', 'payload.json'],
    );
  });
});

test('F1.19 CLI preserves conflicting final and pending histories', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const final = f1_19FinalDirectory(values.fixture);
    const decision = readJson(path.join(final, 'decision.json'));
    const pending = path.join(
      f1_19HistoryRoot(values.fixture),
      `.fine-tuning-private-answer-quality-case-payload-pending-` +
        `${values.fixture.item.itemHash}-${decision.decisionHash}`,
    );
    makePrivateDirectory(pending);

    const result = runPayload(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicts with pending/);
    assert.equal(fs.existsSync(final), true);
    assert.equal(fs.existsSync(pending), true);
  });
});

test('F1.19 CLI rejects current lineage copied into a foreign workspace root', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const currentCaseDirectory = path.dirname(values.answerQualityCaseFilename);
    const foreignCaseDirectory = path.join(
      path.dirname(path.dirname(currentCaseDirectory)),
      'f'.repeat(64),
      'e'.repeat(64),
    );
    fs.cpSync(currentCaseDirectory, foreignCaseDirectory, { recursive: true });
    chmodPrivateTree(path.dirname(foreignCaseDirectory));

    const result = runPayload(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /foreign workspace copy/);
    assert.equal(fs.existsSync(f1_19HistoryRoot(values.fixture)), false);
  });

  for (const currentDirectory of [
    (values) => f1_16FinalDirectory(values.fixture),
    (values) => f1_17FinalDirectory(values.fixture),
  ]) {
    withReadyPrivateAnswerQualityPayload((values) => {
      const source = currentDirectory(values);
      const foreign = path.join(
        path.dirname(path.dirname(source)),
        'f'.repeat(64),
        'e'.repeat(64),
      );
      fs.cpSync(source, foreign, { recursive: true });
      chmodPrivateTree(path.dirname(foreign));

      const result = runPayload(values);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /foreign workspace copy/);
      assert.equal(fs.existsSync(f1_19HistoryRoot(values.fixture)), false);
    });
  }

  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    const foreignPayloadDirectory = path.join(
      path.dirname(f1_19HistoryRoot(values.fixture)),
      'f'.repeat(64),
      'e'.repeat(64),
    );
    fs.cpSync(f1_19FinalDirectory(values.fixture), foreignPayloadDirectory, {
      recursive: true,
    });
    chmodPrivateTree(path.dirname(foreignPayloadDirectory));

    const result = runPayload(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /foreign workspace copy/);
  });
});

test('F1.19 CLI rejects unrelated same-workspace history without live lineage', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    const published = runPayload(values);
    assert.equal(published.status, 0, published.stderr);

    const unrelatedItemHash = 'f'.repeat(64);
    const sourceDecision = readJson(
      path.join(f1_19FinalDirectory(values.fixture), 'decision.json'),
    );
    const unrelatedDecision = structuredClone(sourceDecision);
    unrelatedDecision.item = {
      id: `fine-tuning-private-collection-item-${unrelatedItemHash}`,
      itemHash: unrelatedItemHash,
    };
    const unrelatedDirectory = path.join(
      f1_19HistoryRoot(values.fixture),
      unrelatedItemHash,
    );
    makePrivateDirectory(unrelatedDirectory);
    writeJson(
      path.join(unrelatedDirectory, 'decision.json'),
      unrelatedDecision,
    );

    const replay = runPayload(values);

    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /no canonical live item/);
    assert.deepEqual(
      fs.readdirSync(f1_19FinalDirectory(values.fixture)).sort(),
      ['decision.json', 'payload.json'],
    );
    assert.deepEqual(fs.readdirSync(unrelatedDirectory), ['decision.json']);
  });
});

test('F1.19 CLI rejects weak, linked, empty, and oversized raw input files', () => {
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
      fs.writeFileSync(filename, 'x'.repeat(64 * 1024 + 1));
      fs.chmodSync(filename, 0o600);
    },
  ];

  for (const attack of attacks) {
    withReadyPrivateAnswerQualityPayload((values) => {
      const privateValues = privatePayloadValues(values);
      attack(values.enrichmentInputFilename);
      const result = runPayload(values);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /F1\.19 enrichmentInput must be a current-owner 0600 bounded regular JSON file/,
      );
      assertPrivatePayloadValuesAbsent(result, privateValues);
    });
  }
});

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function privatePayloadValues(values) {
  const enrichmentInput = readJson(values.enrichmentInputFilename);
  return [
    values.fixture.item.example.instruction,
    values.fixture.item.example.response,
    enrichmentInput.retrievalInput.memoryEntries[0].content,
    values.enrichmentInputFilename,
    readJson(values.payloadDecisionFilename).confirmationToken,
  ];
}

function assertPrivatePayloadValuesAbsent(result, privateValues) {
  for (const privateValue of privateValues) {
    assert.equal(result.stdout.includes(privateValue), false);
    assert.equal(result.stderr.includes(privateValue), false);
  }
}

function makePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
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

function dateEnvironment(dates) {
  return {
    ...process.env,
    FINE_TUNING_TEST_DATE_SEQUENCE: JSON.stringify(dates),
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS || '',
      `--import=${datePreload}`,
    ].join(' ').trim(),
  };
}
