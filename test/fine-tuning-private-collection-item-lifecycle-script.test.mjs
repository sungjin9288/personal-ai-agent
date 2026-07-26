import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
  writeLifecycleDecision,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const lifecycleScript = path.join(process.cwd(), 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs');
const replaceInputPreload = path.join(process.cwd(), 'test', 'helpers', 'replace-fine-tuning-input-preload.mjs');

test('withdrawal unlinks the private item, publishes a content-free terminal bundle, and returns the same receipt idempotently', () => {
  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'withdraw');
    const first = runLifecycle(fixture);
    assert.equal(first.status, 0, first.stderr);
    const summary = JSON.parse(first.stdout);
    assert.equal(summary.status, 'private-collection-item-withdrawn-absence-observed');
    assert.equal(summary.itemPathAbsent, true);
    assert.equal(summary.matchingAdmissionItemCount, 0);
    assert.equal(first.stdout.includes(fixture.rootDir), false);
    assert.equal(first.stdout.includes('Synthetic lifecycle response'), false);
    assert.equal(fs.existsSync(fixture.itemFilename), false);
    const finalDirectory = terminalDirectory(fixture);
    assert.deepEqual(fs.readdirSync(finalDirectory).sort(), ['absence-receipt.json', 'decision.json', 'tombstone.json']);
    for (const name of fs.readdirSync(finalDirectory)) {
      assert.equal(fs.lstatSync(path.join(finalDirectory, name)).mode & 0o777, 0o600);
    }
    const receipt = fs.readFileSync(path.join(finalDirectory, 'absence-receipt.json'));
    const second = runLifecycle(fixture);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(fs.readFileSync(path.join(finalDirectory, 'absence-receipt.json')), receipt);
  });
});

test('an equivalent UTC offset decision timestamp remains idempotent after terminal publication', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const timestamp = new Date().toISOString().replace(/Z$/u, '+00:00');
    writeLifecycleDecision(fixture, 'withdraw', timestamp);
    assert.equal(runLifecycle(fixture).status, 0);
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
  });
});

test('retention deletion accepts expiry while withdrawal and early retention deletion fail closed', () => {
  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'retention-delete');
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /timing/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'retention-delete');
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(fixture.itemFilename), false);
  }, { deleteByOffset: -60 * 1000 });
});

test('pending decision with item and pending terminal bundle with an empty removal directory resume without rewriting receipt time', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const pending = pendingDirectory(fixture, decision.decisionHash);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), decision);
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(fixture.itemFilename), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const pending = pendingDirectory(fixture, decision.decisionHash);
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    fs.renameSync(path.dirname(fixture.itemFilename), removal);
    fs.unlinkSync(path.join(removal, 'item.json'));
    const observedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: observedAt });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({ absence: observedAbsence(), decision, observedAt, tombstone });
    writeJson(path.join(pending, 'decision.json'), decision);
    writeJson(path.join(pending, 'tombstone.json'), tombstone);
    writeJson(path.join(pending, 'absence-receipt.json'), receipt);
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
    const finalReceipt = fs.readFileSync(path.join(terminalDirectory(fixture), 'absence-receipt.json'));
    assert.deepEqual(finalReceipt, Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`));
    assert.equal(fs.existsSync(removal), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const pending = writePendingDecision(fixture, decision);
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.renameSync(path.dirname(fixture.itemFilename), removal);
    assert.equal(runLifecycle(fixture).status, 0);
    assert.equal(fs.existsSync(removal), false);
    assert.equal(fs.existsSync(fixture.itemFilename), false);
    assert.equal(fs.existsSync(pending), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const pending = writePendingDecision(fixture, decision);
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.renameSync(path.dirname(fixture.itemFilename), removal);
    fs.unlinkSync(path.join(removal, 'item.json'));
    assert.equal(runLifecycle(fixture).status, 0);
    assert.equal(fs.existsSync(removal), false);
    assert.equal(fs.existsSync(pending), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const pending = writePendingDecision(fixture, decision);
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.renameSync(path.dirname(fixture.itemFilename), removal);
    fs.unlinkSync(path.join(removal, 'item.json'));
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: new Date().toISOString() });
    writeJson(path.join(pending, 'tombstone.json'), tombstone);
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readdirSync(terminalDirectory(fixture)).sort(), ['absence-receipt.json', 'decision.json', 'tombstone.json']);
  });
});

test('incomplete or conflicting pending states preserve evidence and require manual recovery', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    writePendingDecision(fixture, decision);
    fs.unlinkSync(fixture.itemFilename);
    fs.rmdirSync(path.dirname(fixture.itemFilename));
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending state requires manual recovery/);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    writePendingDecision(fixture, decision);
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);
    writeJson(path.join(removal, 'item.json'), fixture.item);
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /item and removal directory conflict/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(path.join(removal, 'item.json')), true);
  });
});

test('conflicting current-reference pending decisions fail while unrelated valid pending history is preserved', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const conflictingInput = structuredClone(input);
    conflictingInput.evidenceSha256 = 'f'.repeat(64);
    const conflicting = buildDecision(fixture, conflictingInput);
    writePendingDecision(fixture, conflicting);
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicting pending decision/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const current = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    const unrelated = structuredClone(current);
    unrelated.withdrawalReferenceSha256 = 'e'.repeat(64);
    rehashDecision(unrelated);
    const pending = writePendingDecision(fixture, unrelated);
    assert.equal(runLifecycle(fixture).status, 0);
    assert.equal(fs.existsSync(pending), true);
  });
});

test('final terminal plus an empty removal directory is cleaned while the immutable receipt remains unchanged', () => {
  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'withdraw');
    assert.equal(runLifecycle(fixture).status, 0);
    const finalDirectory = terminalDirectory(fixture);
    const decision = readJson(path.join(finalDirectory, 'decision.json'));
    const removal = removalDirectory(fixture, decision.decisionHash);
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);
    const before = fs.readFileSync(path.join(finalDirectory, 'absence-receipt.json'));
    const result = runLifecycle(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(removal), false);
    assert.deepEqual(fs.readFileSync(path.join(finalDirectory, 'absence-receipt.json')), before);
  });
});

test('unsafe links, unexpected lane content, and conflicting terminal states remain fail closed', () => {
  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'withdraw');
    const linked = path.join(fixture.rootDir, 'var', 'inputs', 'decision-link.json');
    fs.symlinkSync(fixture.decisionFilename, linked);
    const result = runLifecycle(fixture, { decision: linked });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  });

  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'withdraw');
    fs.mkdirSync(path.join(fixture.workspaceDirectory, 'reviewed-examples', 'unexpected'), { mode: 0o700 });
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unexpected content|workspace/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  for (const mutate of [
    (fixture) => fs.chmodSync(fixture.decisionFilename, 0o640),
    (fixture) => fs.linkSync(fixture.decisionFilename, path.join(fixture.rootDir, 'var', 'inputs', 'decision-hardlink.json')),
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      writeLifecycleDecision(fixture, 'withdraw');
      mutate(fixture);
      const result = runLifecycle(fixture);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /owner-only bounded regular file/);
      assert.equal(fs.existsSync(fixture.itemFilename), true);
    });
  }

  withSyntheticLifecycleFixture((fixture) => {
    writeLifecycleDecision(fixture, 'withdraw');
    const legacy = terminalDirectory(fixture);
    fs.mkdirSync(legacy, { recursive: true, mode: 0o700 });
    fs.chmodSync(legacy, 0o700);
    writeJson(path.join(legacy, 'tombstone.json'), { legacy: true });
    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /legacy terminal bundle requires manual recovery/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });
});

test('same-byte removal item replacement after atomic rename is preserved and rejected before unlink', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    const removalItem = path.join(removalDirectory(fixture, decision.decisionHash), 'item.json');
    const result = runLifecycle(fixture, {
      env: {
        FINE_TUNING_REPLACE_INPUT: removalItem,
        FINE_TUNING_REPLACE_PHASE: 'after-removal-rename',
      },
      preload: true,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /moved item integrity failed/);
    assert.equal(fs.existsSync(removalItem), true);
  });
});

function runLifecycle(fixture, overrides = {}) {
  const args = [
    ...(overrides.preload ? ['--import', replaceInputPreload] : []),
    lifecycleScript,
    '--workspace', overrides.workspace || fixture.workspaceFilename,
    '--admission', overrides.admission || fixture.admissionFilename,
    '--item', overrides.item || fixture.itemFilename,
    '--decision', overrides.decision || fixture.decisionFilename,
  ];
  return spawnSync(process.execPath, args, {
    cwd: fixture.rootDir,
    encoding: 'utf8',
    env: { ...process.env, ...overrides.env },
  });
}

function buildDecision(fixture, input) {
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: new Date().toISOString(),
    input,
    item: fixture.item,
    workspace: fixture.workspace,
  });
}

function terminalRoot(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-tombstones', fixture.workspace.workspaceHash);
}

function terminalDirectory(fixture) {
  return path.join(terminalRoot(fixture), fixture.admission.envelope.retention.withdrawalReferenceSha256);
}

function pendingDirectory(fixture, decisionHash) {
  return path.join(terminalRoot(fixture), `.fine-tuning-private-collection-item-terminal-pending-${decisionHash}`);
}

function writePendingDecision(fixture, decision) {
  const pending = pendingDirectory(fixture, decision.decisionHash);
  fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
  return pending;
}

function rehashDecision(decision) {
  const { decisionHash: _decisionHash, id: _id, ...content } = decision;
  const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  decision.decisionHash = hash;
  decision.id = `fine-tuning-private-collection-item-lifecycle-decision-${hash}`;
}

function removalDirectory(fixture, decisionHash) {
  return path.join(fixture.workspaceDirectory, fixture.admission.envelope.lane, `.fine-tuning-private-collection-item-removal-${decisionHash}`);
}

function observedAbsence() {
  return {
    itemPathAbsent: true,
    matchingAdmissionItemCount: 0,
    matchingItemHashCount: 0,
    postDeleteAbsenceObserved: true,
    removalDirectoryEmpty: true,
    workspaceRecordUnchanged: true,
  };
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
