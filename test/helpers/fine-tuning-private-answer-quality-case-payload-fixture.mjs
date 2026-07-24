import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
} from './fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const sourceRepo = process.cwd();
const resolveScript = path.join(
  sourceRepo,
  'scripts',
  'resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs',
);
const caseScript = path.join(
  sourceRepo,
  'scripts',
  'materialize-fine-tuning-private-answer-quality-case.mjs',
);
const payloadScript = path.join(
  sourceRepo,
  'scripts',
  'materialize-fine-tuning-private-answer-quality-case-payload.mjs',
);

export function withReadyPrivateAnswerQualityPayload(
  callback,
  { payloadDecision = 'approve' } = {},
) {
  return withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const resolved = runResolution(fixture, prepared);
    if (resolved.status !== 0) {
      throw new Error(resolved.stderr);
    }
    const enrichmentInputFilename = writeEnrichmentInput(fixture, prepared);
    const materialized = runCase(fixture, prepared, enrichmentInputFilename);
    if (materialized.status !== 0) {
      throw new Error(materialized.stderr);
    }
    const candidateReviewResolutionFilename = path.join(
      f1_17FinalDirectory(fixture),
      'resolution.json',
    );
    const answerQualityCaseFilename = path.join(
      f1_18FinalDirectory(fixture),
      'case.json',
    );
    const candidateReviewResolution = readJson(
      candidateReviewResolutionFilename,
    );
    const answerQualityCase = readJson(answerQualityCaseFilename);
    const payloadDecisionFilename = writePayloadDecision(
      fixture,
      answerQualityCase,
      payloadDecision,
    );
    return callback({
      answerQualityCase,
      answerQualityCaseFilename,
      candidateReviewResolution,
      candidateReviewResolutionFilename,
      enrichmentInputFilename,
      fixture,
      payloadDecisionFilename,
      prepared,
    });
  }, { lane: 'answer-quality-cases' });
}

export function runPayload(values, overrides = {}) {
  return spawnSync(
    process.execPath,
    [
      payloadScript,
      '--workspace',
      fixturePath(values.fixture, overrides.workspace || values.fixture.workspaceFilename),
      '--admission',
      fixturePath(values.fixture, overrides.admission || values.fixture.admissionFilename),
      '--item',
      fixturePath(values.fixture, overrides.item || values.fixture.itemFilename),
      '--candidate',
      fixturePath(
        values.fixture,
        overrides.candidate || values.prepared.candidateFilename,
      ),
      '--candidate-review-resolution',
      fixturePath(
        values.fixture,
        overrides.candidateReviewResolution ||
          values.candidateReviewResolutionFilename,
      ),
      '--case',
      fixturePath(
        values.fixture,
        overrides.answerQualityCase || values.answerQualityCaseFilename,
      ),
      '--decision',
      fixturePath(
        values.fixture,
        overrides.decision || values.payloadDecisionFilename,
      ),
      '--enrichment-input',
      fixturePath(
        values.fixture,
        overrides.enrichmentInput || values.enrichmentInputFilename,
      ),
    ],
    {
      cwd: canonical(values.fixture.rootDir),
      encoding: 'utf8',
      env: overrides.env || process.env,
    },
  );
}

export function writePayloadDecision(
  fixture,
  answerQualityCase,
  decision = 'approve',
) {
  const filename = path.join(
    fixture.rootDir,
    'var',
    'inputs',
    'answer-quality-case-payload-decision.json',
  );
  writeJson(filename, {
    answerQualityCase: reference(answerQualityCase, 'answerQualityCaseHash'),
    confirmationToken:
      `materialize-private-answer-quality-case-payload:${fixture.item.itemHash}:` +
      answerQualityCase.answerQualityCaseHash,
    decidedAt: answerQualityCase.materializedAt,
    decidedByRole: 'retention-deletion-owner-role',
    decision,
    evidenceSha256: digest(`payload-${decision}`),
    item: reference(fixture.item, 'itemHash'),
    payloadPurpose: 'local-answer-quality-evaluation-replay-only',
    schemaVersion:
      'personal-ai-agent-fine-tuning-private-answer-quality-case-payload-decision-input/v1',
    target: 'private-answer-quality-case-payload',
    workspace: reference(fixture.workspace, 'workspaceHash'),
  });
  return filename;
}

export function f1_16FinalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidates',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

export function f1_17FinalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-enrichment-candidate-review-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

export function f1_18FinalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-cases',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

export function f1_19HistoryRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-payloads',
    fixture.workspace.workspaceHash,
  );
}

export function f1_19FinalDirectory(fixture) {
  return path.join(f1_19HistoryRoot(fixture), fixture.item.itemHash);
}

function runResolution(fixture, prepared) {
  return spawnSync(
    process.execPath,
    [
      resolveScript,
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
    ],
    { cwd: canonical(fixture.rootDir), encoding: 'utf8' },
  );
}

function runCase(fixture, prepared, enrichmentInputFilename) {
  return spawnSync(
    process.execPath,
    [
      caseScript,
      '--workspace',
      fixturePath(fixture, fixture.workspaceFilename),
      '--admission',
      fixturePath(fixture, fixture.admissionFilename),
      '--item',
      fixturePath(fixture, fixture.itemFilename),
      '--candidate',
      fixturePath(fixture, prepared.candidateFilename),
      '--candidate-review-resolution',
      fixturePath(fixture, path.join(f1_17FinalDirectory(fixture), 'resolution.json')),
      '--enrichment-input',
      fixturePath(fixture, enrichmentInputFilename),
    ],
    { cwd: canonical(fixture.rootDir), encoding: 'utf8' },
  );
}

function writeEnrichmentInput(fixture, prepared) {
  const filename = path.join(
    fixture.rootDir,
    'var',
    'inputs',
    'enrichment-input.json',
  );
  writeJson(
    filename,
    buildAnswerQualityEnrichmentInput(
      fixture,
      prepared.lineage.artifactPreparationResolution,
    ),
  );
  return filename;
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function fixturePath(fixture, filename) {
  return path.join(
    canonical(fixture.rootDir),
    path.relative(fixture.rootDir, filename),
  );
}

function canonical(filename) {
  return fs.realpathSync(filename);
}

function reference(value, field) {
  return { id: value.id, [field]: value[field] };
}

function after(value) {
  return new Date(Date.parse(value) + 1_000).toISOString();
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
