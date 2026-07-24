import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  assertFineTuningPrivateAnswerQualityCaseReplayRecord,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
  buildFineTuningPrivateAnswerQualityCaseReplay,
  buildFineTuningPrivateAnswerQualityCaseReplayRequest,
} from '../src/core/fine-tuning-private-answer-quality-case-replay.mjs';

import {
  f1_19FinalDirectory,
  f1_20FinalDirectory,
  runPayload,
  runReplay,
  withReadyPrivateAnswerQualityPayload,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import { writeJson } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

test('F1.20 CLI replays only the stored F1.19 payload and writes a content-free receipt', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const first = runReplay(values);
    const second = runReplay(values);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    assert.deepEqual(Object.keys(JSON.parse(first.stdout)), [
      'status', 'q1ContractSatisfied', 'actualModelEvaluated', 'trainingAuthorized',
      'externalProviderCalls', 'productionReadyClaim',
    ]);
    const directory = f1_20FinalDirectory(values.fixture);
    assert.deepEqual(fs.readdirSync(directory).sort(), ['receipt.json', 'request.json']);
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    const receipt = fs.readFileSync(path.join(directory, 'receipt.json'), 'utf8');
    for (const forbidden of [
      values.fixture.item.example.instruction,
      values.fixture.item.example.response,
      'retrievedItems', 'requiredAnswerTerms', 'forbiddenAnswerTerms', 'payload.json',
    ]) assert.equal(receipt.includes(forbidden), false);
  });
});

test('F1.20 refuses a replay request without exact authority, timing, or stored payload identity', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const request = JSON.parse(fs.readFileSync(values.replayRequestFilename, 'utf8'));
    request.requestedByRole = 'retention-deletion-owner-role';
    writeJson(values.replayRequestFilename, request);
    const invalidAuthority = runReplay(values);
    assert.notEqual(invalidAuthority.status, 0);
    assert.match(invalidAuthority.stderr, /replay request is invalid/);
    assert.equal(fs.existsSync(f1_20FinalDirectory(values.fixture)), false);
  });

  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const payload = path.join(f1_19FinalDirectory(values.fixture), 'payload.json');
    fs.renameSync(payload, `${payload}.moved`);
    const missingPayload = runReplay(values);
    assert.notEqual(missingPayload.status, 0);
    assert.match(missingPayload.stderr, /F1\.20 payload/);
    assert.equal(fs.existsSync(f1_20FinalDirectory(values.fixture)), false);
  });
});

test('F1.20 recovers an exact pending receipt and rejects final-plus-pending history', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    assert.equal(runReplay(values).status, 0);
    const final = f1_20FinalDirectory(values.fixture);
    const request = JSON.parse(fs.readFileSync(path.join(final, 'request.json'), 'utf8'));
    const pending = path.join(path.dirname(final), `.fine-tuning-private-answer-quality-case-replay-pending-${values.fixture.item.itemHash}-${request.replayRequestHash}`);
    fs.renameSync(final, pending);
    fs.unlinkSync(path.join(pending, 'receipt.json'));
    const resumed = runReplay(values);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.equal(fs.existsSync(pending), false);
    fs.mkdirSync(pending, { mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    const conflicting = runReplay(values);
    assert.notEqual(conflicting.status, 0);
    assert.match(conflicting.stderr, /conflicts with pending/);
  });
});

test('F1.20 requires completion after the request and rejects arbitrary count or metric shapes', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const payload = JSON.parse(fs.readFileSync(path.join(f1_19FinalDirectory(values.fixture), 'payload.json'), 'utf8'));
    const requestInput = JSON.parse(fs.readFileSync(values.replayRequestFilename, 'utf8'));
    const request = buildFineTuningPrivateAnswerQualityCaseReplayRequest({
      answerQualityCase: values.answerQualityCase, item: values.fixture.item, payload,
      request: requestInput, workspace: values.fixture.workspace,
    });
    assert.throws(() => buildFineTuningPrivateAnswerQualityCaseReplay({
      answerQualityCase: values.answerQualityCase, item: values.fixture.item, payload,
      replayCompletedAt: request.requestRecord.requestedAt, request, workspace: values.fixture.workspace,
    }), /replay window is invalid/);

    assert.equal(runReplay(values).status, 0);
    const receipt = JSON.parse(fs.readFileSync(path.join(f1_20FinalDirectory(values.fixture), 'receipt.json'), 'utf8'));
    receipt.counts.privateText = 1;
    assert.throws(() => assertFineTuningPrivateAnswerQualityCaseReplayRecord(receipt), /receipt counts fields are invalid/);
  });
});

test('F1.20 record-only relation rejects a request extended beyond the receipt retention window', () => {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    assert.equal(runReplay(values).status, 0);
    const directory = f1_20FinalDirectory(values.fixture);
    const request = JSON.parse(fs.readFileSync(path.join(directory, 'request.json'), 'utf8'));
    const receipt = JSON.parse(fs.readFileSync(path.join(directory, 'receipt.json'), 'utf8'));
    const forgedExpiry = new Date(Date.parse(receipt.sourceObservation.expiresAt) + 1_000).toISOString();
    request.requestRecord.expiresAt = forgedExpiry;
    request.replayRequestHash = digest({
      answerQualityCase: request.answerQualityCase,
      item: request.item,
      payload: request.payload,
      requestRecord: request.requestRecord,
      workspace: request.workspace,
    });
    request.id = `fine-tuning-private-answer-quality-case-replay-request-${request.replayRequestHash}`;
    receipt.bindings.replayRequestHash = request.replayRequestHash;
    receipt.replayRequest = { id: request.id, replayRequestHash: request.replayRequestHash };
    receipt.sourceObservation.requestExpiresAt = forgedExpiry;
    rehashReceipt(receipt);
    assert.doesNotThrow(() => assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(request));
    assert.doesNotThrow(() => assertFineTuningPrivateAnswerQualityCaseReplayRecord(receipt));
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request }),
      /request and receipt relation is invalid/,
    );
  });
});

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rehashReceipt(receipt) {
  const { id: _id, privateAnswerQualityCaseReplayHash: _hash, ...content } = receipt;
  receipt.privateAnswerQualityCaseReplayHash = digest(content);
  receipt.id = `fine-tuning-private-answer-quality-case-replay-${receipt.privateAnswerQualityCaseReplayHash}`;
}
