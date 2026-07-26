import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { buildFineTuningPrivateCollectionItemAdmission } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const admissionScript = path.join(repoDir, 'scripts', 'admit-fine-tuning-private-collection-item.mjs');
const lifecycleScript = path.join(repoDir, 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs');
const writerScript = path.join(repoDir, 'scripts', 'write-fine-tuning-private-collection-item.mjs');
const replaceInputPreload = path.join(repoDir, 'test', 'helpers', 'replace-fine-tuning-input-preload.mjs');
const datePreload = path.join(repoDir, 'test', 'helpers', 'two-step-date-preload.mjs');

test('writer stores a synthetic item without changing workspace bytes and admission may continue after write', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const first = writeAdmissionInputs(rootDir, sources, workspace, 1);
    assert.equal(runAdmission(rootDir, first).status, 0);
    const admission = readJson(admissionFiles(rootDir)[0]);
    const itemInputs = writeItemInputs(rootDir, sources, workspace, admission, 1);
    const before = fs.readFileSync(workspace);
    const result = runWriter(rootDir, itemInputs);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.collectionContentStored, true);
    assert.equal(summary.actualUserDataCollected, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(result.stdout.includes(rootDir), false);
    assert.equal(result.stdout.includes('Synthetic response'), false);
    assert.deepEqual(fs.readFileSync(workspace), before);
    const items = itemFiles(path.dirname(workspace));
    assert.equal(items.length, 1);
    assert.equal(fs.lstatSync(path.dirname(items[0])).mode & 0o777, 0o700);
    assert.equal(fs.lstatSync(items[0]).mode & 0o777, 0o600);

    const second = writeAdmissionInputs(rootDir, sources, workspace, 2);
    assert.equal(runAdmission(rootDir, second).status, 0, 'F1.9 admission should accept an immutable finalized F1.10 item');
  });
});

test('writer refuses duplicate admissions, malformed history, tombstones, and unsafe sanitized content', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
    assert.equal(runWriter(rootDir, inputs).status, 0);
    const duplicate = runWriter(rootDir, inputs);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already has an item/);
  });

  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
    const content = readJson(inputs.content);
    content.example.instruction = 'email person@example.com';
    writeJson(inputs.content, content, 0o600);
    const result = runWriter(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /raw customer data|identifier/);
    assert.deepEqual(itemFiles(path.dirname(workspace)), []);
  });

  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const root = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-tombstones', sources.workspace.workspaceHash, admitted.envelope.retention.withdrawalReferenceSha256);
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    fs.chmodSync(root, 0o700);
    writeJson(path.join(root, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: { id: admitted.id, admissionHash: admitted.admissionHash },
      evidenceSha256: createHash('sha256').update('tombstone evidence').digest('hex'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: admitted.envelope.retention.withdrawalReferenceSha256,
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
    }), 0o600);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.deepEqual(itemFiles(path.dirname(workspace)), []);
  });
});

test('a tombstone conflicts with every same-workspace finalized item before another write', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const first = admitOne(rootDir, sources, workspace, 1);
    assert.equal(runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, first, 1)).status, 0);
    const directory = path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      sources.workspace.workspaceHash,
      first.envelope.retention.withdrawalReferenceSha256,
    );
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'deleted',
      admission: { id: first.id, admissionHash: first.admissionHash },
      evidenceSha256: createHash('sha256').update('same-workspace tombstone').digest('hex'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: first.envelope.retention.withdrawalReferenceSha256,
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
    }), 0o600);
    const second = admitOne(rootDir, sources, workspace, 2);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, second, 2));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tombstone conflict/);
    assert.equal(itemFiles(path.dirname(workspace)).length, 1);
  });
});

test('writer accepts an exact F1.11 terminal bundle and preserves its item conflict for manual recovery', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const first = admitOne(rootDir, sources, workspace, 1);
    assert.equal(runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, first, 1)).status, 0);
    const item = readJson(itemFiles(path.dirname(workspace))[0]);
    const decisionInput = {
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
      action: 'withdraw',
      item: { id: item.id, itemHash: item.itemHash },
      admission: { id: first.id, admissionHash: first.admissionHash },
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
      withdrawalReferenceSha256: first.envelope.retention.withdrawalReferenceSha256,
      evidenceSha256: createHash('sha256').update('terminal v2').digest('hex'),
      decidedAt: new Date().toISOString(),
      decidedBy: 'retention-deletion-owner-role',
      confirmationToken: `withdraw-private-collection-item:${item.itemHash}`,
    };
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: first,
      executionAt: new Date().toISOString(),
      input: decisionInput,
      item,
      workspace: sources.workspace,
    });
    const recordedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt });
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
      observedAt: recordedAt,
      tombstone,
    });
    const directory = path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      sources.workspace.workspaceHash,
      first.envelope.retention.withdrawalReferenceSha256,
    );
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'decision.json'), decision, 0o600);
    writeJson(path.join(directory, 'tombstone.json'), tombstone, 0o600);
    writeJson(path.join(directory, 'absence-receipt.json'), receipt, 0o600);
    const second = admitOne(rootDir, sources, workspace, 2);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, second, 2));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tombstone conflict/);
    assert.equal(itemFiles(path.dirname(workspace)).length, 1);
  });
});

test('a completed F1.11 lifecycle terminal bundle permanently blocks rewriting its removed admission', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
    assert.equal(runWriter(rootDir, inputs).status, 0);
    const itemFilename = itemFiles(path.dirname(workspace))[0];
    const item = readJson(itemFilename);
    const decisionFilename = path.join(rootDir, 'var', 'inputs', 'lifecycle-decision.json');
    writeJson(decisionFilename, {
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
      action: 'withdraw',
      item: { id: item.id, itemHash: item.itemHash },
      admission: { id: admitted.id, admissionHash: admitted.admissionHash },
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
      withdrawalReferenceSha256: admitted.envelope.retention.withdrawalReferenceSha256,
      evidenceSha256: createHash('sha256').update('completed lifecycle terminal').digest('hex'),
      decidedAt: new Date().toISOString(),
      decidedBy: 'retention-deletion-owner-role',
      confirmationToken: `withdraw-private-collection-item:${item.itemHash}`,
    }, 0o600);
    const lifecycle = spawnSync(process.execPath, [
      lifecycleScript,
      '--workspace', workspace,
      '--admission', inputs.admission,
      '--item', itemFilename,
      '--decision', decisionFilename,
    ], { cwd: rootDir, encoding: 'utf8' });
    assert.equal(lifecycle.status, 0, lifecycle.stderr);
    assert.equal(fs.existsSync(itemFilename), false);
    const blocked = runWriter(rootDir, inputs);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /permanently blocked/);
  });
});

test('a terminal tombstone recorded after deleteBy remains valid historical state', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const first = admitOne(rootDir, sources, workspace, 1);
    const directory = path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      sources.workspace.workspaceHash,
      first.envelope.retention.withdrawalReferenceSha256,
    );
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'deleted',
      admission: { id: first.id, admissionHash: first.admissionHash },
      evidenceSha256: createHash('sha256').update('late historical tombstone').digest('hex'),
      recordedAt: new Date(Date.parse(first.envelope.retention.deleteBy) + 1).toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: first.envelope.retention.withdrawalReferenceSha256,
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
    }), 0o600);

    const second = admitOne(rootDir, sources, workspace, 2);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, second, 2));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(itemFiles(path.dirname(workspace)).length, 1);
  });
});

test('all seven private inputs preserve no-follow, owner-only, and tracked-path boundaries', () => {
  for (const field of ['workspace', 'admission', 'content', 'executionResolution', 'executionRequest', 'plan', 'intakeResolution']) {
    withRoot((rootDir, sources) => {
      const workspace = writeWorkspace(rootDir, sources);
      const admitted = admitOne(rootDir, sources, workspace, 1);
      const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
      const linked = path.join(rootDir, 'var', `${field}-link.json`);
      fs.symlinkSync(inputs[field], linked);
      const result = runWriter(rootDir, { ...inputs, [field]: linked });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /owner-only bounded regular file|exact prepared workspace location|exact admission history location/);
    });
  }
});

test('all seven private inputs reject hardlinks, weak modes, oversized bytes, and malformed JSON', () => {
  for (const field of ['workspace', 'admission', 'content', 'executionResolution', 'executionRequest', 'plan', 'intakeResolution']) {
    for (const mutate of [
      (rootDir, inputs) => {
        const linked = path.join(rootDir, 'var', `${field}-hardlink.json`);
        fs.linkSync(inputs[field], linked);
      },
      (_rootDir, inputs) => fs.chmodSync(inputs[field], 0o640),
      (_rootDir, inputs) => writeRaw(inputs[field], 'x'.repeat(64 * 1024 + 1)),
      (_rootDir, inputs) => writeRaw(inputs[field], '{'),
    ]) {
      withRoot((rootDir, sources) => {
        const workspace = writeWorkspace(rootDir, sources);
        const admitted = admitOne(rootDir, sources, workspace, 1);
        const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
        mutate(rootDir, inputs);
        const result = runWriter(rootDir, inputs);
        assert.notEqual(result.status, 0);
        assert.deepEqual(itemFiles(path.dirname(workspace)), []);
      });
    }
  }
});

test('same-byte workspace, admission, and content replacement fails before the atomic rename', () => {
  for (const field of ['workspace', 'admission', 'content']) {
    withRoot((rootDir, sources) => {
      const workspace = writeWorkspace(rootDir, sources);
      const admitted = admitOne(rootDir, sources, workspace, 1);
      const inputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
      const result = runWriter(rootDir, inputs, { replaceInput: inputs[field] });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /changed during write|publish failed/);
      assert.deepEqual(itemFiles(path.dirname(workspace)), []);
    });
  }
});

test('same-byte tracked artifacts and a replaced lane fail before the atomic rename', () => {
  for (const artifact of [
    'fine-tuning-data-sufficiency.json',
    'fine-tuning-data-collection-plan.json',
    'fine-tuning-data-intake-request.json',
  ]) {
    withRoot((rootDir, sources) => {
      const workspace = writeWorkspace(rootDir, sources);
      const admitted = admitOne(rootDir, sources, workspace, 1);
      const result = runWriter(
        rootDir,
        writeItemInputs(rootDir, sources, workspace, admitted, 1),
        { replaceInput: path.join(rootDir, 'evidence', 'output-artifacts', artifact) },
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /tracked input changed during write|publish failed/);
      assert.deepEqual(itemFiles(path.dirname(workspace)), []);
    });
  }

  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const result = runWriter(
      rootDir,
      writeItemInputs(rootDir, sources, workspace, admitted, 1),
      { replaceLane: path.join(path.dirname(workspace), 'reviewed-examples') },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lane changed during write|staging is invalid|publish failed/);
    assert.deepEqual(itemFiles(path.dirname(workspace)), []);
  });
});

test('rename-time tracked-source and lane replacement preserve the item and require manual recovery', () => {
  for (const replace of [
    (rootDir) => ({
      replaceInput: path.join(rootDir, 'evidence', 'output-artifacts', 'fine-tuning-data-sufficiency.json'),
    }),
    (_rootDir, workspace) => ({
      replaceLane: path.join(path.dirname(workspace), 'reviewed-examples'),
    }),
  ]) {
    for (const replacePhase of ['before-item-rename', 'after-item-rename']) {
      withRoot((rootDir, sources) => {
        const workspace = writeWorkspace(rootDir, sources);
        const admitted = admitOne(rootDir, sources, workspace, 1);
        const result = runWriter(
          rootDir,
          writeItemInputs(rootDir, sources, workspace, admitted, 1),
          { ...replace(rootDir, workspace), replacePhase },
        );
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /committed but durability confirmation failed; manual recovery required/);
        assert.equal(itemFiles(path.dirname(workspace)).length, 1);
      });
    }
  }
});

test('a valid foreign-workspace admission history does not block the current workspace writer', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const foreignSources = buildSources(Date.now() - 5 * 60 * 1000 + 1);
    const foreign = buildFineTuningPrivateCollectionItemAdmission({
      ...foreignSources,
      admittedAt: new Date().toISOString(),
      envelope: buildEnvelope(foreignSources.workspace, 91),
    });
    const directory = path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-admissions',
      foreign.id,
    );
    fs.mkdirSync(directory, { mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'admission.json'), foreign, 0o600);

    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(itemFiles(path.dirname(workspace)).length, 1);
  });
});

test('same-workspace admission history rechecks source, lineage, and withdrawal uniqueness', () => {
  for (const [group, field] of [
    ['source', 'referenceSha256'],
    ['source', 'lineageSha256'],
    ['retention', 'withdrawalReferenceSha256'],
  ]) {
    withRoot((rootDir, sources) => {
      const workspace = writeWorkspace(rootDir, sources);
      const first = admitOne(rootDir, sources, workspace, 1);
      const envelope = buildEnvelope(sources.workspace, 2);
      envelope[group][field] = first.envelope[group][field];
      const duplicate = buildFineTuningPrivateCollectionItemAdmission({
        ...sources,
        admittedAt: new Date().toISOString(),
        envelope,
      });
      const directory = path.join(
        rootDir,
        'var',
        'fine-tuning',
        'private-collection-item-admissions',
        duplicate.id,
      );
      fs.mkdirSync(directory, { mode: 0o700 });
      fs.chmodSync(directory, 0o700);
      writeJson(path.join(directory, 'admission.json'), duplicate, 0o600);

      const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, first, 1));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /admission history is invalid/);
      assert.deepEqual(itemFiles(path.dirname(workspace)), []);
    });
  }
});

test('F1.9 admission CLI rejects malformed, tampered, misplaced, and mismatched finalized items', () => {
  const corruptions = [
    (_rootDir, itemFile) => writeRaw(itemFile, '{}\n'),
    (_rootDir, itemFile) => {
      const item = readJson(itemFile);
      item.trainingAuthorized = true;
      writeJson(itemFile, item, 0o600);
    },
    (_rootDir, itemFile) => {
      const itemDirectory = path.dirname(itemFile);
      const workspaceDirectory = path.dirname(path.dirname(itemDirectory));
      const otherLane = path.join(
        workspaceDirectory,
        path.basename(path.dirname(itemDirectory)) === 'reviewed-examples'
          ? 'answer-quality-cases'
          : 'reviewed-examples',
        path.basename(itemDirectory),
      );
      fs.renameSync(itemDirectory, otherLane);
    },
    (rootDir, itemFile, sources, workspace) => {
      const second = admitOne(rootDir, sources, workspace, 2);
      const item = readJson(itemFile);
      item.admission = { id: second.id, admissionHash: second.admissionHash };
      writeJson(itemFile, item, 0o600);
    },
  ];

  for (const corrupt of corruptions) {
    withRoot((rootDir, sources) => {
      const workspace = writeWorkspace(rootDir, sources);
      const first = admitOne(rootDir, sources, workspace, 1);
      assert.equal(runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, first, 1)).status, 0);
      const file = itemFiles(path.dirname(workspace))[0];
      corrupt(rootDir, file, sources, workspace);
      const result = runAdmission(rootDir, writeAdmissionInputs(rootDir, sources, workspace, 3));
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /workspace is invalid|expired/);
    });
  }
});

test('partial item staging and malformed or foreign tombstones remain fail-closed and preserved', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const staging = path.join(path.dirname(workspace), 'reviewed-examples', '.fine-tuning-private-collection-item-staging-partial');
    fs.mkdirSync(staging, { mode: 0o700 });
    fs.writeFileSync(path.join(staging, 'item.json'), '{}\n', { mode: 0o600 });
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1));
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(staging), true);
  });

  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const directory = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-tombstones', sources.workspace.workspaceHash, admitted.envelope.retention.withdrawalReferenceSha256);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'tombstone.json'), {
      action: 'deleted',
      admission: { id: admitted.id, admissionHash: 'f'.repeat(64) },
      evidenceSha256: createHash('sha256').update('foreign').digest('hex'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-tombstone/v1',
      withdrawalReferenceSha256: admitted.envelope.retention.withdrawalReferenceSha256,
      workspace: { id: sources.workspace.id, workspaceHash: sources.workspace.workspaceHash },
    }, 0o600);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tombstone history is invalid/);
    assert.equal(fs.existsSync(path.join(directory, 'tombstone.json')), true);
  });
});

test('shared lock permits one duplicate writer and serializes admission against write', async () => {
  await withRootAsync(async (rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const writerInputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
    const duplicate = await Promise.all([
      runWriterAsync(rootDir, writerInputs),
      runWriterAsync(rootDir, writerInputs),
    ]);
    assert.equal(duplicate.filter((result) => result.status === 0).length, 1);
    assert.equal(itemFiles(path.dirname(workspace)).length, 1);
  });

  await withRootAsync(async (rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const writerInputs = writeItemInputs(rootDir, sources, workspace, admitted, 1);
    const admissionInputs = writeAdmissionInputs(rootDir, sources, workspace, 2);
    const results = await Promise.all([
      runWriterAsync(rootDir, writerInputs),
      runAdmissionAsync(rootDir, admissionInputs),
    ]);
    assert.equal(results.filter((result) => result.status === 0).length, 1);
    assert.equal(itemFiles(path.dirname(workspace)).length + admissionFiles(rootDir).length, 2);
  });
});

test('expiry and retention at final publish refuse a known staging item', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1), {
      preloadDates: {
        first: new Date().toISOString(),
        second: sources.executionResolution.expiresAt,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.deepEqual(itemFiles(path.dirname(workspace)), []);
  });

  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    const result = runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1), {
      preloadDates: {
        first: new Date().toISOString(),
        second: admitted.envelope.retention.deleteBy,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.deepEqual(itemFiles(path.dirname(workspace)), []);
  });
});

test('F1.9 admission refuses an expired retained finalized item until lifecycle cleanup', () => {
  withRoot((rootDir, sources) => {
    const workspace = writeWorkspace(rootDir, sources);
    const admitted = admitOne(rootDir, sources, workspace, 1);
    assert.equal(runWriter(rootDir, writeItemInputs(rootDir, sources, workspace, admitted, 1)).status, 0);
    const item = readJson(itemFiles(path.dirname(workspace))[0]);
    const result = runAdmission(
      rootDir,
      writeAdmissionInputs(rootDir, sources, workspace, 2),
      {
        preloadDates: {
          first: new Date().toISOString(),
          second: item.retention.deleteBy,
        },
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
  });
});

function withRoot(callback) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-write-'));
  try {
    const sources = buildSources();
    writeSources(rootDir, sources);
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    fs.chmodSync(path.join(rootDir, 'var'), 0o700);
    callback(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

async function withRootAsync(callback) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-write-'));
  try {
    const sources = buildSources();
    writeSources(rootDir, sources);
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    fs.chmodSync(path.join(rootDir, 'var'), 0o700);
    await callback(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildSources(now = Date.now() - 5 * 60 * 1000) {
  const time = (offset) => new Date(now + offset).toISOString();
  const assessment = assessFineTuningDataSufficiency({ readinessPackage: buildDeterministicFineTuningReadinessFixture() });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({ assessment, collectionPlan, expiresAt: time(60 * 60 * 1000), requestedAt: time(0), requestedBy: 'local-operator-role' });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment, collectionPlan, request: intakeRequest, resolvedAt: time(30 * 1000),
    reviews: intakeRequest.requiredReviews.map((review, index) => ({ decision: 'approve', decidedAt: time(30 * 1000), evidenceSha256: String(index + 1).repeat(64), id: review.id, ownerRole: review.ownerRole, reason: 'Synthetic attestation.' })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({ assessment, collectionPlan, plannedAt: time(60 * 1000), request: intakeRequest, resolution: intakeResolution });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({ assessment, collectionPlan, intakeRequest, intakeResolution, privateCollectionPlan, requestedAt: time(90 * 1000), requestedBy: 'local-operator-role' });
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment, collectionPlan, executionRequest, intakeRequest, intakeResolution, privateCollectionPlan, resolvedAt: time(120 * 1000),
    reviews: executionRequest.requiredReviews.map((review, index) => ({ decision: 'approve', decidedAt: time(120 * 1000), evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64), id: review.id, ownerRole: review.ownerRole, reason: 'Synthetic review.' })),
  });
  const base = { assessment, collectionPlan, executionRequest, executionResolution, intakeRequest, intakeResolution, privateCollectionPlan };
  return { ...base, workspace: buildFineTuningPrivateCollectionWorkspace({ ...base, preparedAt: time(150 * 1000) }) };
}

function writeSources(rootDir, sources) {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
  writeJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json'), sources.assessment);
  writeJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json'), sources.collectionPlan);
  writeJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json'), sources.intakeRequest);
}

function writeWorkspace(rootDir, sources) {
  const directory = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-workspaces', `fine-tuning-private-collection-workspace-${sources.executionResolution.resolutionHash}`);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(directory, lane);
    fs.mkdirSync(laneDirectory, { mode: 0o700 });
    fs.chmodSync(laneDirectory, 0o700);
  }
  const filename = path.join(directory, 'workspace.json');
  writeJson(filename, sources.workspace, 0o600);
  return filename;
}

function admitOne(rootDir, sources, workspace, index) {
  const existing = new Set(admissionFiles(rootDir));
  const inputs = writeAdmissionInputs(rootDir, sources, workspace, index);
  const result = runAdmission(rootDir, inputs);
  assert.equal(result.status, 0, result.stderr);
  const created = admissionFiles(rootDir).filter((filename) => !existing.has(filename));
  assert.equal(created.length, 1);
  return readJson(created[0]);
}

function writeAdmissionInputs(rootDir, sources, workspace, index) {
  const inputs = writeChainInputs(rootDir, sources, index);
  inputs.workspace = workspace;
  inputs.envelope = path.join(path.dirname(inputs.content), `envelope-${index}.json`);
  writeJson(inputs.envelope, buildEnvelope(sources.workspace, index), 0o600);
  return inputs;
}

function writeItemInputs(rootDir, sources, workspace, admission, index) {
  const inputs = writeChainInputs(rootDir, sources, index);
  inputs.workspace = workspace;
  inputs.admission = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admissions', admission.id, 'admission.json');
  writeJson(inputs.content, {
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1',
    admission: { id: admission.id, admissionHash: admission.admissionHash },
    dataOrigin: 'curated-synthetic',
    example: { instruction: `Explain synthetic case ${index}.`, response: `Synthetic response ${index}.` },
    sanitization: {
      policyId: 'deidentify-before-content-admission-v1', evidenceSha256: admission.envelope.redaction.evidenceSha256, methodVersion: 'private-sanitized-training-text-v1', reviewedAt: new Date().toISOString(), reviewerRole: 'quality-reviewer', directIdentifiersRemoved: true, freeTextReviewed: true, secretsScanned: true, reidentificationProhibited: true,
    },
  }, 0o600);
  return inputs;
}

function writeChainInputs(rootDir, sources, index) {
  const directory = path.join(rootDir, 'var', 'inputs');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const filename = (name) => path.join(directory, `${name}-${index}.json`);
  const inputs = {
    content: filename('content'), executionRequest: filename('execution-request'), executionResolution: filename('execution-resolution'), intakeResolution: filename('intake-resolution'), plan: filename('plan'),
  };
  writeJson(inputs.executionRequest, sources.executionRequest, 0o600);
  writeJson(inputs.executionResolution, sources.executionResolution, 0o600);
  writeJson(inputs.intakeResolution, sources.intakeResolution, 0o600);
  writeJson(inputs.plan, sources.privateCollectionPlan, 0o600);
  return inputs;
}

function buildEnvelope(workspace, index) {
  const digest = (offset) => createHash('sha256').update(`item-envelope-${index}-${offset}`).digest('hex');
  return {
    lane: index % 2 === 0 ? 'answer-quality-cases' : 'reviewed-examples',
    privacy: { consentStatus: 'not-required-owner-authored', evidenceSha256: digest(1), purpose: 'private-answer-quality-improvement-and-readiness-review' },
    redaction: { evidenceSha256: digest(2), policyId: 'deidentify-before-content-admission-v1' },
    retention: { deleteBy: new Date(Date.now() + 30 * 60 * 1000).toISOString(), evidenceSha256: digest(3), policyId: 'delete-by-expiry-or-withdrawal-v1', withdrawalReferenceSha256: digest(4) },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
    source: { lineageSha256: digest(5), referenceSha256: digest(6), scopeReferenceSha256: digest(7), usageBasis: 'owner-attested-private-quality-improvement', usageBasisEvidenceSha256: digest(8) },
    submittedBy: 'local-operator-role',
    workspace: { id: workspace.id, workspaceHash: workspace.workspaceHash },
  };
}

function runAdmission(rootDir, inputs, options) {
  return run(rootDir, admissionScript, [
    '--workspace', inputs.workspace, '--envelope', inputs.envelope, '--execution-resolution', inputs.executionResolution, '--execution-request', inputs.executionRequest, '--plan', inputs.plan, '--intake-resolution', inputs.intakeResolution,
  ], options);
}

function runWriter(rootDir, inputs, { preloadDates, replaceInput, replaceLane, replacePhase } = {}) {
  return run(rootDir, writerScript, [
    '--workspace', inputs.workspace, '--admission', inputs.admission, '--content', inputs.content, '--execution-resolution', inputs.executionResolution, '--execution-request', inputs.executionRequest, '--plan', inputs.plan, '--intake-resolution', inputs.intakeResolution,
  ], { preloadDates, replaceInput, replaceLane, replacePhase });
}

function run(rootDir, script, args, { preloadDates, replaceInput, replaceLane, replacePhase } = {}) {
  const nodeArgs = [];
  if (preloadDates) nodeArgs.push('--import', datePreload);
  if (replaceInput || replaceLane) nodeArgs.push('--import', replaceInputPreload);
  nodeArgs.push(script, ...args);
  const env = { ...process.env };
  if (preloadDates) {
    env.FINE_TUNING_TEST_FIRST_NO_ARG_DATE = preloadDates.first;
    env.FINE_TUNING_TEST_SECOND_NO_ARG_DATE = preloadDates.second;
  }
  if (replaceInput) env.FINE_TUNING_REPLACE_INPUT = replaceInput;
  if (replaceLane) env.FINE_TUNING_REPLACE_LANE = replaceLane;
  if (replacePhase) env.FINE_TUNING_REPLACE_PHASE = replacePhase;
  return fs.existsSync(script)
    ? spawnSync(process.execPath, nodeArgs, {
      cwd: rootDir,
      encoding: 'utf8',
      env,
    })
    : { status: 1, stderr: 'missing script' };
}

function runWriterAsync(rootDir, inputs) {
  return runAsync(rootDir, writerScript, [
    '--workspace', inputs.workspace, '--admission', inputs.admission, '--content', inputs.content, '--execution-resolution', inputs.executionResolution, '--execution-request', inputs.executionRequest, '--plan', inputs.plan, '--intake-resolution', inputs.intakeResolution,
  ]);
}

function runAdmissionAsync(rootDir, inputs) {
  return runAsync(rootDir, admissionScript, [
    '--workspace', inputs.workspace, '--envelope', inputs.envelope, '--execution-resolution', inputs.executionResolution, '--execution-request', inputs.executionRequest, '--plan', inputs.plan, '--intake-resolution', inputs.intakeResolution,
  ]);
}

function runAsync(rootDir, script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stderr }));
  });
}

function admissionFiles(rootDir) {
  const root = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admissions');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).sort().map((name) => path.join(root, name, 'admission.json'));
}

function itemFiles(workspaceDirectory) {
  return ['reviewed-examples', 'answer-quality-cases'].flatMap((lane) => {
    const directory = path.join(workspaceDirectory, lane);
    return fs.readdirSync(directory)
      .filter((name) => name.startsWith('fine-tuning-private-collection-item-'))
      .map((name) => path.join(directory, name, 'item.json'));
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value, mode = 0o644) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(filename, mode);
}

function writeRaw(filename, value) {
  fs.writeFileSync(filename, value, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
}
