import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertFineTuningPrivateCollectionItemAbsenceReceiptRecord,
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord,
  assertFineTuningPrivateCollectionItemLifecycleTerminalBundle,
  assertFineTuningPrivateCollectionItemTombstoneV2Record,
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  withSyntheticLifecycleFixture,
  writeLifecycleDecision,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('withdrawal decision, terminal tombstone, and content-free absence receipt bind one stored synthetic item', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildDecision(fixture, input);
    const recordedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({ absence: observedAbsence(), decision, observedAt: recordedAt, tombstone });
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision));
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemTombstoneV2Record(tombstone));
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(receipt));
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({ decision, receipt, tombstone }));
    assert.equal(Object.hasOwn(decision, 'confirmationToken'), false);
    assert.equal(decision.ownerAttestationRecorded, true);
    assert.equal(decision.ownerIdentityVerified, false);
    assert.equal(receipt.itemPathAbsent, true);
    assert.equal(receipt.matchingAdmissionItemCount, 0);
    assert.equal(receipt.matchingItemHashCount, 0);
    assert.equal(receipt.deletionExecutionIndependentlyVerified, false);
    assert.equal(receipt.externalProviderCalls, 'none');
  });
});

test('decision timing and exact confirmation fail closed for withdrawal and retention deletion', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'withdraw', fixture.item.retention.deleteBy);
    assert.throws(() => buildDecision(fixture, input), /timing/);
    input.decidedAt = new Date(Date.parse(fixture.item.storedAt) - 1).toISOString();
    assert.throws(() => buildDecision(fixture, input), /timing/);
    input.decidedAt = new Date().toISOString();
    input.confirmationToken = 'wrong';
    assert.throws(() => buildDecision(fixture, input), /confirmation token/);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'retention-delete', new Date().toISOString());
    assert.throws(() => buildDecision(fixture, input), /timing/);
  }, { deleteByOffset: 30 * 60 * 1000 });
});

test('retention deletion accepts an expired retained item without revalidating its current F1 approval chain', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const input = writeLifecycleDecision(fixture, 'retention-delete', new Date().toISOString());
    const decision = buildDecision(fixture, input);
    assert.equal(decision.action, 'retention-delete');
    assert.equal(decision.status, 'private-collection-item-retention-delete-decided-not-executed');
  }, { deleteByOffset: -60 * 1000 });
});

test('semantic tampering in decision, tombstone, and receipt is rejected', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: new Date().toISOString() });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({ absence: observedAbsence(), decision, observedAt: new Date().toISOString(), tombstone });
    const changedDecision = structuredClone(decision);
    changedDecision.ownerIdentityVerified = true;
    assert.throws(() => assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(changedDecision), /integrity failed/);
    const changedTombstone = structuredClone(tombstone);
    changedTombstone.item.itemHash = 'f'.repeat(64);
    assert.throws(() => assertFineTuningPrivateCollectionItemTombstoneV2Record(changedTombstone), /invalid|integrity failed/);
    const changedReceipt = structuredClone(receipt);
    changedReceipt.matchingItemHashCount = 1;
    assert.throws(() => assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(changedReceipt), /integrity failed/);
  });
});

test('terminal validation rejects a rehashed tombstone whose evidence no longer matches the decision', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: new Date().toISOString() });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({ absence: observedAbsence(), decision, observedAt: new Date().toISOString(), tombstone });
    const rehashed = structuredClone(tombstone);
    rehashed.evidenceSha256 = 'f'.repeat(64);
    const { id: _id, tombstoneHash: _tombstoneHash, ...content } = rehashed;
    rehashed.tombstoneHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
    rehashed.id = `fine-tuning-private-collection-item-tombstone-${rehashed.tombstoneHash}`;
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemTombstoneV2Record(rehashed));
    assert.throws(
      () => assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({ decision, receipt, tombstone: rehashed }),
      /does not match the terminal decision/,
    );
  });
});

test('a receipt cannot predate its tombstone even when both records are individually valid', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const decision = buildDecision(fixture, writeLifecycleDecision(fixture, 'withdraw'));
    const recordedAt = new Date(Date.now() + 1_000).toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
      absence: observedAbsence(),
      decision,
      observedAt: decision.decidedAt,
      tombstone,
    });
    assert.doesNotThrow(() => assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(receipt));
    assert.throws(() => assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({ decision, receipt, tombstone }), /terminal bundle integrity failed/);
  });
});

function buildDecision(fixture, input) {
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: new Date().toISOString(),
    input,
    item: fixture.item,
    workspace: fixture.workspace,
  });
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
