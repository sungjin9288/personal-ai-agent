import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { buildFineTuningPrivateAnswerQualityEnrichmentCandidate } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { writeJson } from './fine-tuning-private-collection-item-lifecycle-fixture.mjs';

export function prepareAnswerQualityEnrichmentCandidateFixture(
  fixture,
  { reviewDecision = 'approve' } = {},
) {
  const lineage = buildApprovedLineage(fixture);
  const candidate = buildFineTuningPrivateAnswerQualityEnrichmentCandidate({
    admission: fixture.admission,
    artifactPreparationResolution: lineage.artifactPreparationResolution,
    artifactRequest: lineage.artifactRequest,
    input: enrichmentInput(fixture, lineage.artifactPreparationResolution),
    item: fixture.item,
    observedAt: after(lineage.artifactPreparationResolution.resolvedAt),
    projection: lineage.projection,
    reviewResolution: lineage.reviewResolution,
    workspace: fixture.workspace,
  });
  const candidateDirectory = path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidates',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
  makeDirectory(candidateDirectory);
  const candidateFilename = path.join(candidateDirectory, 'candidate.json');
  writeJson(candidateFilename, candidate);

  const decision = buildCandidateReviewDecision(
    fixture,
    candidate,
    reviewDecision,
  );
  writeJson(fixture.decisionFilename, decision);
  return {
    candidate,
    candidateDirectory,
    candidateFilename,
    decision,
    decisionFilename: fixture.decisionFilename,
    lineage,
  };
}

export function buildCandidateReviewDecision(fixture, candidate, decision) {
  return {
    admission: reference(fixture.admission, 'admissionHash'),
    candidate: reference(candidate, 'candidateHash'),
    confirmationToken:
      `${decision}-private-answer-quality-enrichment-candidate-review:` +
      candidate.candidateHash,
    decidedAt: after(candidate.observedAt),
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: digest(`candidate-review-${decision}`),
    item: reference(fixture.item, 'itemHash'),
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate-review-decision-input/v1',
    target: 'answer-quality-case-q1-review',
    workspace: reference(fixture.workspace, 'workspaceHash'),
  };
}

function buildApprovedLineage(fixture) {
  const projectedAt = after(fixture.item.storedAt);
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt,
    request: {
      admission: reference(fixture.admission, 'admissionHash'),
      item: reference(fixture.item, 'itemHash'),
      requestedAt: projectedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: 'answer-quality-case-enrichment-review',
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const reviewedAt = after(projectedAt);
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: reference(fixture.admission, 'admissionHash'),
      confirmationToken:
        `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: digest('item-review'),
      item: reference(fixture.item, 'itemHash'),
      projection: reference(projection, 'projectionHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: reviewedAt,
    workspace: fixture.workspace,
  });
  const requestedAt = after(reviewedAt);
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: reference(fixture.admission, 'admissionHash'),
      item: reference(fixture.item, 'itemHash'),
      projection: reference(projection, 'projectionHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: reference(reviewResolution, 'resolutionHash'),
      schemaVersion:
        'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: 'answer-quality-case-enrichment',
      workspace: reference(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item: fixture.item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  const decidedAt = after(requestedAt);
  const artifactPreparationResolution =
    buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest,
      decision: {
        artifactRequest: reference(artifactRequest, 'artifactRequestHash'),
        confirmationToken:
          `approve-private-collection-item-artifact-preparation:` +
          artifactRequest.artifactRequestHash,
        decidedAt,
        decidedByRole: 'quality-reviewer',
        decision: 'approve',
        evidenceSha256: digest('artifact-preparation'),
        item: reference(fixture.item, 'itemHash'),
        schemaVersion:
          'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
        target: artifactRequest.target,
        workspace: reference(fixture.workspace, 'workspaceHash'),
      },
      item: fixture.item,
      projection,
      resolvedAt: decidedAt,
      reviewResolution,
      workspace: fixture.workspace,
    });
  return {
    artifactPreparationResolution,
    artifactRequest,
    projection,
    reviewResolution,
  };
}

function enrichmentInput(fixture, artifactPreparationResolution) {
  return {
    answer: { citedSourceKeys: ['memory:workspace/fact'] },
    artifactPreparationResolution: reference(
      artifactPreparationResolution,
      'artifactPreparationResolutionHash',
    ),
    expectedSourceKeys: ['memory:workspace/fact'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    item: reference(fixture.item, 'itemHash'),
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
      pack: { requiredSections: [], reviewRules: [] },
      previousOutputs: {},
      providerRole: 'manager',
      role: 'manager',
    },
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-input/v1',
    workspace: reference(fixture.workspace, 'workspaceHash'),
  };
}

function makeDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  let current = directory;
  for (let index = 0; index < 3; index += 1) {
    fs.chmodSync(current, 0o700);
    current = path.dirname(current);
  }
}

function reference(value, field) {
  return { id: value.id, [field]: value[field] };
}

function after(timestamp) {
  return new Date(Date.parse(timestamp) + 1_000).toISOString();
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
