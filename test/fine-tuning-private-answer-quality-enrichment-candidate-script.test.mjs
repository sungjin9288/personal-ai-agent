import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemAdmission } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { buildFineTuningPrivateCollectionItem } from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { buildFineTuningPrivateAnswerQualityEnrichmentCandidate } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const script = path.join(process.cwd(), 'scripts', 'prepare-fine-tuning-private-answer-quality-enrichment-candidate.mjs');
const datePreload = path.join(process.cwd(), 'test', 'helpers', 'sequence-date-preload.mjs');

test('F1.16 CLI publishes, replays, resumes a full pending candidate, and keeps private content out of history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const first = run(fixture, prepared.inputs);
    const second = run(fixture, prepared.inputs);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    const candidate = readCandidate(fixture);
    assert.equal(candidate.answerQualityCaseEnrichmentCandidateCreated, true);
    assert.equal(candidate.q1ContractSatisfied, false);
    assert.equal(JSON.stringify(candidate).includes(fixture.item.example.response), false);
    assert.equal(JSON.stringify(candidate).includes('memory:workspace/fact'), false);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const candidate = buildCandidate(fixture, prepared);
    const pending = pendingDirectory(fixture, candidate);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'candidate.json'), candidate);
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readCandidate(fixture), candidate);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI rejects unsafe input files, current predecessor ambiguity, conflicting payload, and lifecycle terminal history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    fs.chmodSync(prepared.inputs.enrichmentInput, 0o644);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const candidate = buildCandidate(fixture, prepared);
    const first = pendingDirectory(fixture, candidate);
    const alternate = structuredClone(candidate);
    alternate.inputSummary.inputHash = 'f'.repeat(64);
    alternate.bindings.answerQualityCaseEnrichmentInputHash = 'f'.repeat(64);
    rehashCandidate(alternate);
    const second = pendingDirectory(fixture, alternate);
    fs.mkdirSync(first, { recursive: true, mode: 0o700 });
    fs.chmodSync(first, 0o700);
    fs.mkdirSync(second, { recursive: true, mode: 0o700 });
    fs.chmodSync(second, 0o700);
    writeJson(path.join(first, 'candidate.json'), candidate);
    writeJson(path.join(second, 'candidate.json'), alternate);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid|ambiguous|conflicts with current input/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const pending = path.join(
      path.dirname(path.dirname(prepared.inputs.artifactPreparationResolution)),
      `.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-`
        + `${fixture.item.itemHash}-${prepared.resolution.bindings.artifactPreparationDecisionHash}`,
    );
    fs.mkdirSync(pending, { mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'resolution.json'), prepared.resolution);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const candidate = buildCandidate(fixture, prepared);
    const final = finalDirectory(fixture);
    fs.mkdirSync(final, { recursive: true, mode: 0o700 });
    fs.chmodSync(final, 0o700);
    writeJson(path.join(final, 'candidate.json'), { ...candidate, status: 'different' });
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /integrity|conflicts/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI recovers an empty exact pending directory and rejects final plus pending ambiguity', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const candidate = buildCandidate(fixture, prepared);
    const pending = pendingDirectory(fixture, candidate);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
    const stored = readCandidate(fixture);
    assert.equal(
      stored.bindings.answerQualityCaseEnrichmentInputHash,
      candidate.bindings.answerQualityCaseEnrichmentInputHash,
    );
    assert.equal(Date.parse(stored.observedAt) >= Date.parse(prepared.resolution.resolvedAt), true);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const first = run(fixture, prepared.inputs);
    assert.equal(first.status, 0, first.stderr);
    const candidate = readCandidate(fixture);
    const pending = pendingDirectory(fixture, candidate);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'candidate.json'), candidate);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /final history conflicts with pending state/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI accepts valid foreign predecessor pending states and rejects malformed foreign history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const foreign = createForeignLineage(fixture, 'foreign-valid');
    writeForeignPredecessorPendingHistory(fixture, foreign);
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const foreign = createForeignLineage(fixture, 'foreign-malformed');
    writeForeignPredecessorPendingHistory(fixture, foreign);
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-resolutions',
      fixture.workspace.workspaceHash,
    );
    const pending = path.join(
      root,
      `.fine-tuning-private-collection-item-review-resolution-pending-`
        + `${foreign.item.itemHash}-${foreign.reviewResolution.decisionHash}`,
    );
    const decision = JSON.parse(fs.readFileSync(path.join(pending, 'decision.json'), 'utf8'));
    decision.extra = true;
    writeJson(path.join(pending, 'decision.json'), decision);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /F1\.13 decision history is invalid/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI accepts valid foreign v1, v2, and pending lifecycle history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const foreign = createForeignLineage(fixture, 'foreign-lifecycle');
    writeForeignLifecycleHistory(fixture, foreign);
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI rejects a candidate from another workspace in the current workspace history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    let foreignCandidate;
    let foreignWorkspaceHash;

    withSyntheticLifecycleFixture((foreignFixture) => {
      const foreignPrepared = prepare(foreignFixture);
      foreignCandidate = buildCandidate(foreignFixture, foreignPrepared);
      foreignWorkspaceHash = foreignFixture.workspace.workspaceHash;
    }, { lane: 'answer-quality-cases' });

    assert.notEqual(foreignWorkspaceHash, fixture.workspace.workspaceHash);
    const root = path.dirname(finalDirectory(fixture));
    const directory = path.join(root, foreignCandidate.item.itemHash);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'candidate.json'), foreignCandidate);

    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /candidate history is invalid/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    let foreignCandidate;

    withSyntheticLifecycleFixture((foreignFixture) => {
      const foreignPrepared = prepare(foreignFixture);
      foreignCandidate = buildCandidate(foreignFixture, foreignPrepared);
    }, { lane: 'answer-quality-cases' });

    const root = path.dirname(finalDirectory(fixture));
    const directory = path.join(
      root,
      `.private-answer-quality-case-pending-${foreignCandidate.item.itemHash}-`
        + foreignCandidate.bindings.answerQualityCaseEnrichmentInputHash,
    );
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    writeJson(path.join(directory, 'candidate.json'), foreignCandidate);

    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /candidate history is invalid/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI blocks current lifecycle history, malformed lifecycle entries, and removal directories', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    writeLegacyTombstone(fixture);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /blocked by terminal history/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    writeCurrentPendingLifecycle(fixture);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal history/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const root = tombstoneRoot(fixture);
    fs.mkdirSync(path.join(root, 'malformed'), { recursive: true, mode: 0o700 });
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /terminal history is invalid/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const removal = path.join(
      fixture.workspaceDirectory,
      fixture.item.lane,
      `.fine-tuning-private-collection-item-removal-${fixture.item.itemHash}`,
    );
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /removal history requires recovery/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI rejects symlink, hardlink, in-repo escape, and history-root symlink attacks', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const symlink = path.join(path.dirname(prepared.inputs.enrichmentInput), 'enrichment-link.json');
    fs.symlinkSync(prepared.inputs.enrichmentInput, symlink);
    const result = run(fixture, { ...prepared.inputs, enrichmentInput: symlink });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const hardlink = path.join(path.dirname(prepared.inputs.enrichmentInput), 'enrichment-hardlink.json');
    fs.linkSync(prepared.inputs.enrichmentInput, hardlink);
    const result = run(fixture, { ...prepared.inputs, enrichmentInput: hardlink });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const outside = path.join(fixture.rootDir, 'outside-enrichment.json');
    writeJson(outside, enrichmentInput(fixture, prepared.resolution));
    const escape = path.join(fixture.rootDir, 'var', 'escape');
    fs.symlinkSync(fixture.rootDir, escape, 'dir');
    const escapedInput = path.join(
      fs.realpathSync(fixture.rootDir),
      'var',
      'escape',
      'outside-enrichment.json',
    );
    const result = run(fixture, { ...prepared.inputs, enrichmentInput: escapedInput });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const canonicalRoot = fs.realpathSync(fixture.rootDir);
    const alias = path.join(canonicalRoot, 'var', 'input-alias');
    fs.symlinkSync(path.join(fixture.rootDir, 'var', 'inputs'), alias, 'dir');
    const result = run(fixture, {
      ...prepared.inputs,
      enrichmentInput: path.join(alias, 'enrichment.json'),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const canonicalRoot = fs.realpathSync(fixture.rootDir);
    const alias = path.join(canonicalRoot, 'var', 'workspace-alias');
    fs.symlinkSync(path.dirname(prepared.inputs.workspace), alias, 'dir');
    const result = run(fixture, {
      ...prepared.inputs,
      workspace: path.join(alias, 'workspace.json'),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  }, { lane: 'answer-quality-cases' });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const target = path.join(fixture.rootDir, 'candidate-history-target');
    fs.mkdirSync(target, { mode: 0o700 });
    const root = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-enrichment-candidates',
    );
    fs.symlinkSync(target, root, 'dir');
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /candidate history is invalid/);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI fails closed when retention expires at publish-time validation', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const before = new Date(Date.parse(prepared.resolution.resolvedAt) + 1_000).toISOString();
    const result = run(fixture, prepared.inputs, {
      dates: [before, before, before, fixture.item.retention.deleteBy],
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
  }, { lane: 'answer-quality-cases' });
});

test('F1.16 CLI fails closed when current lifecycle history appears before publish', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const decision = lifecycleDecision(fixture);
    const pending = path.join(
      tombstoneRoot(fixture),
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    const before = new Date(Date.parse(prepared.resolution.resolvedAt) + 1_000).toISOString();
    const result = run(fixture, prepared.inputs, {
      dates: [before, before, before, before],
      hook: {
        directories: [pending],
        files: [{ filename: path.join(pending, 'decision.json'), value: decision }],
        index: 3,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal history/);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
  }, { lane: 'answer-quality-cases' });
});

function prepare(fixture) {
  const inputDirectory = path.join(fixture.rootDir, 'var', 'inputs');
  const artifactDirectory = path.join(fixture.rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.join(fixture.rootDir, 'evidence'), 0o700);
  fs.chmodSync(artifactDirectory, 0o700);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-sufficiency.json'), fixture.sources.assessment);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-collection-plan.json'), fixture.sources.collectionPlan);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-intake-request.json'), fixture.sources.intakeRequest);
  const inputs = {
    admission: fixture.admissionFilename,
    artifactPreparationResolution: resolutionFilename(fixture),
    artifactRequest: artifactRequestFilename(fixture),
    enrichmentInput: path.join(inputDirectory, 'enrichment.json'),
    executionRequest: path.join(inputDirectory, 'execution-request.json'),
    executionResolution: path.join(inputDirectory, 'execution-resolution.json'),
    intakeResolution: path.join(inputDirectory, 'intake-resolution.json'),
    item: fixture.itemFilename,
    plan: path.join(inputDirectory, 'plan.json'),
    projection: projectionFilename(fixture),
    reviewResolution: reviewResolutionFilename(fixture),
    workspace: fixture.workspaceFilename,
  };
  writeJson(inputs.executionRequest, fixture.sources.executionRequest);
  writeJson(inputs.executionResolution, fixture.sources.executionResolution);
  writeJson(inputs.intakeResolution, fixture.sources.intakeResolution);
  writeJson(inputs.plan, fixture.sources.privateCollectionPlan);
  const projectedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({ admission: fixture.admission, item: fixture.item, projectedAt, request: {
    admission: ref(fixture.admission, 'admissionHash'), item: ref(fixture.item, 'itemHash'), requestedAt: projectedAt, requestedByRole: 'local-operator-role',
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1', target: 'answer-quality-case-enrichment-review', workspace: ref(fixture.workspace, 'workspaceHash'),
  }, workspace: fixture.workspace });
  fs.mkdirSync(path.dirname(inputs.projection), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.projection), 0o700);
  writeJson(inputs.projection, projection);
  const reviewedAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({ admission: fixture.admission, decision: {
    admission: ref(fixture.admission, 'admissionHash'), confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
    decidedAt: reviewedAt, decidedByRole: 'quality-reviewer', decision: 'approve', evidenceSha256: digest('review'), item: ref(fixture.item, 'itemHash'), projection: ref(projection, 'projectionHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1', target: projection.projectionKind, workspace: ref(fixture.workspace, 'workspaceHash'),
  }, item: fixture.item, projection, resolvedAt: reviewedAt, workspace: fixture.workspace });
  fs.mkdirSync(path.dirname(inputs.reviewResolution), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.reviewResolution), 0o700);
  writeJson(path.join(path.dirname(inputs.reviewResolution), 'decision.json'), reviewDecision(reviewResolution));
  writeJson(inputs.reviewResolution, reviewResolution);
  const requestedAt = new Date(Date.parse(reviewedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({ admission: fixture.admission, artifactRequestInput: {
    admission: ref(fixture.admission, 'admissionHash'), item: ref(fixture.item, 'itemHash'), projection: ref(projection, 'projectionHash'), requestedAt, requestedByRole: 'local-operator-role', reviewResolution: ref(reviewResolution, 'resolutionHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1', target: 'answer-quality-case-enrichment', workspace: ref(fixture.workspace, 'workspaceHash'),
  }, createdAt: requestedAt, item: fixture.item, projection, reviewResolution, workspace: fixture.workspace });
  fs.mkdirSync(path.dirname(inputs.artifactRequest), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.artifactRequest), 0o700);
  writeJson(inputs.artifactRequest, artifactRequest);
  const decidedAt = new Date(Date.parse(requestedAt) + 1_000).toISOString();
  const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({ admission: fixture.admission, artifactRequest, decision: {
    artifactRequest: ref(artifactRequest, 'artifactRequestHash'), confirmationToken: `approve-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
    decidedAt, decidedByRole: 'quality-reviewer', decision: 'approve', evidenceSha256: digest('preparation'), item: ref(fixture.item, 'itemHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1', target: artifactRequest.target, workspace: ref(fixture.workspace, 'workspaceHash'),
  }, item: fixture.item, projection, resolvedAt: decidedAt, reviewResolution, workspace: fixture.workspace });
  fs.mkdirSync(path.dirname(inputs.artifactPreparationResolution), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.artifactPreparationResolution), 0o700);
  writeJson(path.join(path.dirname(inputs.artifactPreparationResolution), 'decision.json'), preparationDecision(resolution));
  writeJson(inputs.artifactPreparationResolution, resolution);
  writeJson(inputs.enrichmentInput, enrichmentInput(fixture, resolution));
  return { artifactRequest, inputs, projection, resolution, reviewResolution };
}

function enrichmentInput(fixture, resolution) {
  return {
    answer: {
      citedSourceKeys: ['memory:workspace/fact'],
    },
    artifactPreparationResolution: ref(
      resolution,
      'artifactPreparationResolutionHash',
    ),
    expectedSourceKeys: ['memory:workspace/fact'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    item: ref(fixture.item, 'itemHash'),
    requiredAnswerTerms: ['synthetic', 'lifecycle'],
    retrievalInput: {
      attachments: [],
      memoryEntries: [{
        content: 'Synthetic lifecycle response is verified.',
        dataOrigin: 'curated-synthetic',
        kind: 'fact',
        scope: 'workspace',
      }],
      mission: {
        constraints: [],
        deliverableType: 'decision-memo',
        mode: 'knowledge',
        objective: fixture.item.example.instruction,
        title: 'Synthetic lifecycle',
      },
      pack: {
        requiredSections: [],
        reviewRules: [],
      },
      previousOutputs: {},
      providerRole: 'manager',
      role: 'manager',
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-input/v1',
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
}
function buildCandidate(fixture, prepared) {
  return buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
    admission: fixture.admission,
    artifactPreparationResolution: prepared.resolution,
    artifactRequest: prepared.artifactRequest,
    input: enrichmentInput(fixture, prepared.resolution),
    item: fixture.item,
    observedAt: new Date(Date.parse(prepared.resolution.resolvedAt) + 1_000).toISOString(),
    projection: prepared.projection,
    reviewResolution: prepared.reviewResolution,
    workspace: fixture.workspace,
  });
}
function createForeignLineage(fixture, marker) {
  const admittedAt = new Date(Date.parse(fixture.admission.admittedAt) + 100).toISOString();
  const storedAt = new Date(Date.parse(fixture.item.storedAt) + 100).toISOString();
  const foreignDigest = (label) => digest(`${marker}-${label}`);
  const admission = buildFineTuningPrivateCollectionItemAdmission({
    ...fixture.sources,
    admittedAt,
    envelope: {
      lane: 'answer-quality-cases',
      privacy: {
        consentStatus: 'not-required-owner-authored',
        evidenceSha256: foreignDigest('privacy'),
        purpose: 'private-answer-quality-improvement-and-readiness-review',
      },
      redaction: {
        evidenceSha256: foreignDigest('redaction'),
        policyId: 'deidentify-before-content-admission-v1',
      },
      retention: {
        deleteBy: fixture.item.retention.deleteBy,
        evidenceSha256: foreignDigest('retention'),
        policyId: 'delete-by-expiry-or-withdrawal-v1',
        withdrawalReferenceSha256: foreignDigest('withdrawal'),
      },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
      source: {
        lineageSha256: foreignDigest('lineage'),
        referenceSha256: foreignDigest('reference'),
        scopeReferenceSha256: foreignDigest('scope'),
        usageBasis: 'owner-attested-private-quality-improvement',
        usageBasisEvidenceSha256: foreignDigest('usage'),
      },
      submittedBy: 'local-operator-role',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const item = buildFineTuningPrivateCollectionItem({
    admission,
    content: {
      admission: ref(admission, 'admissionHash'),
      dataOrigin: 'curated-synthetic',
      example: {
        instruction: `Explain ${marker} synthetic lifecycle case.`,
        response: `${marker} synthetic lifecycle response.`,
      },
      sanitization: {
        directIdentifiersRemoved: true,
        evidenceSha256: admission.envelope.redaction.evidenceSha256,
        freeTextReviewed: true,
        methodVersion: 'private-sanitized-training-text-v1',
        policyId: 'deidentify-before-content-admission-v1',
        reidentificationProhibited: true,
        reviewedAt: storedAt,
        reviewerRole: 'quality-reviewer',
        secretsScanned: true,
      },
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1',
    },
    storedAt,
  });
  const itemDirectory = path.join(
    fixture.workspaceDirectory,
    item.lane,
    `fine-tuning-private-collection-item-${admission.admissionHash}`,
  );
  fs.mkdirSync(itemDirectory, { mode: 0o700 });
  fs.chmodSync(itemDirectory, 0o700);
  writeJson(path.join(itemDirectory, 'item.json'), item);

  const projectedAt = new Date(Date.parse(storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission,
    item,
    projectedAt,
    request: {
      admission: ref(admission, 'admissionHash'),
      item: ref(item, 'itemHash'),
      requestedAt: projectedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: 'answer-quality-case-enrichment-review',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewedAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission,
    decision: {
      admission: ref(admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: foreignDigest('review'),
      item: ref(item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item,
    projection,
    resolvedAt: reviewedAt,
    workspace: fixture.workspace,
  });
  const requestedAt = new Date(Date.parse(reviewedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission,
    artifactRequestInput: {
      admission: ref(admission, 'admissionHash'),
      item: ref(item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: ref(reviewResolution, 'resolutionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: 'answer-quality-case-enrichment',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  const decidedAt = new Date(Date.parse(requestedAt) + 1_000).toISOString();
  const resolution = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission,
    artifactRequest,
    decision: {
      artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
      confirmationToken:
        `approve-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
      decidedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: foreignDigest('preparation'),
      item: ref(item, 'itemHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
      target: artifactRequest.target,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item,
    projection,
    resolvedAt: decidedAt,
    reviewResolution,
    workspace: fixture.workspace,
  });
  return { admission, artifactRequest, item, projection, resolution, reviewResolution };
}

function writeForeignPredecessorPendingHistory(fixture, foreign) {
  const workspaceHash = fixture.workspace.workspaceHash;
  const roots = {
    artifactRequest: path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      workspaceHash,
    ),
    preparation: path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-preparation-resolutions',
      workspaceHash,
    ),
    projection: path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-projections',
      workspaceHash,
    ),
    review: path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-review-resolutions',
      workspaceHash,
    ),
  };
  const projectionPending = path.join(
    roots.projection,
    `.fine-tuning-private-collection-item-review-projection-pending-`
      + `${foreign.item.itemHash}-${foreign.projection.bindings.projectionRequestHash}`,
  );
  const reviewPending = path.join(
    roots.review,
    `.fine-tuning-private-collection-item-review-resolution-pending-`
      + `${foreign.item.itemHash}-${foreign.reviewResolution.decisionHash}`,
  );
  const requestPending = path.join(
    roots.artifactRequest,
    `.fine-tuning-private-collection-item-artifact-request-pending-`
      + `${foreign.item.itemHash}-${foreign.artifactRequest.artifactRequestInputHash}`,
  );
  const preparationPending = path.join(
    roots.preparation,
    `.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-`
      + `${foreign.item.itemHash}-${foreign.resolution.bindings.artifactPreparationDecisionHash}`,
  );
  for (const directory of [
    projectionPending,
    reviewPending,
    requestPending,
    preparationPending,
  ]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
  writeJson(path.join(projectionPending, 'projection.json'), foreign.projection);
  writeJson(path.join(reviewPending, 'decision.json'), reviewDecision(foreign.reviewResolution));
  writeJson(path.join(requestPending, 'request.json'), foreign.artifactRequest);
  writeJson(path.join(preparationPending, 'decision.json'), preparationDecision(foreign.resolution));
  writeJson(path.join(preparationPending, 'resolution.json'), foreign.resolution);
}

function lifecycleDecision(fixture, source = fixture) {
  const decidedAt = new Date().toISOString();
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: source.admission,
    executionAt: decidedAt,
    input: {
      action: 'withdraw',
      admission: ref(source.admission, 'admissionHash'),
      confirmationToken: `withdraw-private-collection-item:${source.item.itemHash}`,
      decidedAt,
      decidedBy: 'retention-deletion-owner-role',
      evidenceSha256: digest(`lifecycle-${source.item.itemHash}`),
      item: ref(source.item, 'itemHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1',
      withdrawalReferenceSha256: source.item.retention.withdrawalReferenceSha256,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: source.item,
    workspace: fixture.workspace,
  });
}

function writeForeignLifecycleHistory(fixture, foreign) {
  const root = tombstoneRoot(fixture);
  const legacyReference = digest(`legacy-${foreign.item.itemHash}`);
  const legacyDirectory = path.join(root, legacyReference);
  fs.mkdirSync(legacyDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(legacyDirectory, 0o700);
  writeJson(path.join(legacyDirectory, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
    action: 'withdrawn',
    admission: {
      admissionHash: digest(`legacy-admission-${foreign.item.itemHash}`),
      id: `fine-tuning-private-collection-item-admission-${digest(`legacy-admission-${foreign.item.itemHash}`)}`,
    },
    evidenceSha256: digest(`legacy-evidence-${foreign.item.itemHash}`),
    recordedAt: new Date().toISOString(),
    recordedBy: 'retention-deletion-owner-role',
    withdrawalReferenceSha256: legacyReference,
    workspace: ref(fixture.workspace, 'workspaceHash'),
  }));

  const decision = lifecycleDecision(fixture, foreign);
  const observedAt = new Date().toISOString();
  const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: observedAt });
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
  const finalDirectory = path.join(root, foreign.item.retention.withdrawalReferenceSha256);
  fs.mkdirSync(finalDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(finalDirectory, 0o700);
  writeJson(path.join(finalDirectory, 'absence-receipt.json'), receipt);
  writeJson(path.join(finalDirectory, 'decision.json'), decision);
  writeJson(path.join(finalDirectory, 'tombstone.json'), tombstone);

  const pending = path.join(
    root,
    `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
  );
  fs.mkdirSync(pending, { mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
}

function writeLegacyTombstone(fixture) {
  const directory = path.join(tombstoneRoot(fixture), fixture.item.retention.withdrawalReferenceSha256);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  writeJson(path.join(directory, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
    action: 'withdrawn',
    admission: ref(fixture.admission, 'admissionHash'),
    evidenceSha256: digest('current-legacy-tombstone'),
    recordedAt: new Date().toISOString(),
    recordedBy: 'retention-deletion-owner-role',
    withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
    workspace: ref(fixture.workspace, 'workspaceHash'),
  }));
}

function writeCurrentPendingLifecycle(fixture) {
  const decision = lifecycleDecision(fixture);
  const pending = path.join(
    tombstoneRoot(fixture),
    `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
  );
  fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
}

function tombstoneRoot(fixture) {
  const root = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    fixture.workspace.workspaceHash,
  );
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(root), 0o700);
  fs.chmodSync(root, 0o700);
  return root;
}

function run(fixture, inputs, { dates, hook } = {}) {
  const nodeArgs = [script, ...args(inputs)];
  const env = { ...process.env };
  if (dates) {
    nodeArgs.unshift(datePreload);
    nodeArgs.unshift('--import');
    env.FINE_TUNING_TEST_DATE_SEQUENCE = JSON.stringify(dates);
    if (hook) env.FINE_TUNING_TEST_DATE_HOOK = JSON.stringify(hook);
  }
  return spawnSync(process.execPath, nodeArgs, {
    cwd: fixture.rootDir,
    encoding: 'utf8',
    env,
    maxBuffer: 2 * 1024 * 1024,
  });
}
function args(inputs) {
  return [
    '--workspace', inputs.workspace,
    '--admission', inputs.admission,
    '--item', inputs.item,
    '--projection', inputs.projection,
    '--review-resolution', inputs.reviewResolution,
    '--artifact-request', inputs.artifactRequest,
    '--artifact-preparation-resolution', inputs.artifactPreparationResolution,
    '--enrichment-input', inputs.enrichmentInput,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ];
}

function readCandidate(fixture) {
  return JSON.parse(
    fs.readFileSync(path.join(finalDirectory(fixture), 'candidate.json'), 'utf8'),
  );
}

function finalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidates',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

function pendingDirectory(fixture, candidate) {
  return path.join(
    path.dirname(finalDirectory(fixture)),
    `.private-answer-quality-case-pending-${fixture.item.itemHash}-`
      + candidate.bindings.answerQualityCaseEnrichmentInputHash,
  );
}

function projectionFilename(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    fixture.workspace.workspaceHash,
    `${fixture.item.itemHash}.json`,
  );
}

function reviewResolutionFilename(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
    'resolution.json',
  );
}

function artifactRequestFilename(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-requests',
    fixture.workspace.workspaceHash,
    `${fixture.item.itemHash}.json`,
  );
}

function resolutionFilename(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-preparation-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
    'resolution.json',
  );
}

function ref(value, field) {
  return { id: value.id, [field]: value[field] };
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
function rehashCandidate(candidate) {
  const { candidateHash: ignoredHash, id: ignoredId, ...content } = candidate;
  candidate.candidateHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
}
function reviewDecision(resolution) {
  return {
    admission: resolution.admission,
    confirmationTokenSha256: resolution.decisionRecord.confirmationTokenSha256,
    decidedAt: resolution.decisionRecord.decidedAt,
    decidedByRole: resolution.decisionRecord.decidedByRole,
    decision: resolution.decision,
    decisionHash: resolution.decisionHash,
    evidenceSha256: resolution.decisionRecord.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${resolution.decisionHash}`,
    item: resolution.item,
    projection: resolution.projection,
    schemaVersion: resolution.decisionRecord.schemaVersion,
    target: resolution.target,
    workspace: resolution.workspace,
  };
}
function preparationDecision(resolution) {
  const artifactPreparationDecisionHash = resolution.bindings.artifactPreparationDecisionHash;
  return {
    artifactPreparationDecisionHash,
    artifactRequest: resolution.artifactRequest,
    decisionRecord: resolution.decisionRecord,
    id: `fine-tuning-private-collection-item-artifact-preparation-decision-${artifactPreparationDecisionHash}`,
    item: resolution.item,
    workspace: resolution.workspace,
  };
}
