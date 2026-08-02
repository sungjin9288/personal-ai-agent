import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

import {
  CouncilBlueprintPreviewValidationError,
  createCouncilBlueprintPreview,
  getCouncilBlueprintCatalog,
  projectCouncilBlueprintMeetingStatus,
} from '../src/core/council-blueprint-preview.mjs';
import { renderCouncilBlueprintPreview } from '../src/web/public/lib/council-blueprint-preview.js';
import { createCouncilConcurrentEnvelopeShadow } from '../src/core/council-concurrent-envelope-shadow.mjs';
import { createCouncilConcurrentScheduleShadow } from '../src/core/council-concurrent-schedule-shadow.mjs';

const DEFAULT_ROLES = ['research', 'implementation', 'verification'];

test('council blueprint preview canonicalizes role permutations and keeps exact role contracts', () => {
  const preview = createCouncilBlueprintPreview({ roleIds: DEFAULT_ROLES });
  const permuted = createCouncilBlueprintPreview({ roleIds: ['verification', 'research', 'implementation'] });
  const catalog = getCouncilBlueprintCatalog();

  assert.deepEqual(preview, permuted);
  assert.deepEqual(preview.selectedRoleIds, DEFAULT_ROLES);
  assert.equal(preview.productionReadyClaim, false);
  assert.deepEqual(preview.authority, {
    mode: 'read-only-preview',
    providerCallsAuthorized: false,
    modelSelectionAuthorized: false,
    missionMutationAuthorized: false,
    approvalMutationAuthorized: false,
    runtimeActivationAuthorized: false,
    filesystemMutationAuthorized: false,
  });
  assert.equal(preview.c13Boundary, 'keep-stub-only');

  for (const role of [...catalog.selectableRoles, ...catalog.fixedRoles]) {
    assert.deepEqual(Object.keys(role), [
      'id',
      'kind',
      'responsibility',
      'evidenceAllowlist',
      'prohibitedActions',
      'outputContract',
    ]);
    assert.equal(role.prohibitedActions.includes('call a provider or model'), true);
    assert.equal(role.prohibitedActions.includes('change mission, workspace, artifact, or filesystem state'), true);
  }
});

test('council blueprint meeting plan has deterministic stage counts and rotation', () => {
  const defaultPreview = createCouncilBlueprintPreview({ roleIds: DEFAULT_ROLES });
  const completePreview = createCouncilBlueprintPreview({
    roleIds: ['operations', 'security', 'verification', 'implementation', 'architecture', 'product', 'research'],
  });

  assert.equal(defaultPreview.meetingPlan.stageCount, 8);
  assert.equal(completePreview.meetingPlan.stageCount, 16);
  assert.deepEqual(defaultPreview.meetingPlan.stages.slice(0, 3).map((stage) => stage.dependsOn), [[], [], []]);
  assert.deepEqual(defaultPreview.meetingPlan.stages.slice(3, 6).map((stage) => stage.targetRoleId), [
    'implementation',
    'verification',
    'research',
  ]);
  assert.deepEqual(defaultPreview.meetingPlan.stages[6].dependsOn, [
    'rebuttal:research',
    'rebuttal:implementation',
    'rebuttal:verification',
  ]);
  assert.deepEqual(defaultPreview.meetingPlan.stages[7].dependsOn, ['chair:synthesis']);
  assert.equal(defaultPreview.meetingPlan.stages.every((stage) => stage.onDependencyFailure === 'dependency-blocked'), true);
});

test('council blueprint failure projection blocks dependent rounds without execution', () => {
  const preview = createCouncilBlueprintPreview({
    failedStageIds: ['opening:research'],
    roleIds: DEFAULT_ROLES,
  });
  const byId = Object.fromEntries(preview.statusProjection.stages.map((stage) => [stage.id, stage.status]));

  assert.equal(byId['opening:research'], 'failed');
  assert.equal(byId['rebuttal:research'], 'dependency-blocked');
  assert.equal(byId['rebuttal:implementation'], 'dependency-blocked');
  assert.equal(byId['chair:synthesis'], 'dependency-blocked');
  assert.equal(byId['reviewer:review'], 'dependency-blocked');

  const rebuttalFailure = projectCouncilBlueprintMeetingStatus(preview.meetingPlan, ['rebuttal:verification']);
  const rebuttalById = Object.fromEntries(rebuttalFailure.stages.map((stage) => [stage.id, stage.status]));
  assert.equal(rebuttalById['chair:synthesis'], 'dependency-blocked');
  assert.equal(rebuttalById['reviewer:review'], 'dependency-blocked');

  const chairFailure = projectCouncilBlueprintMeetingStatus(preview.meetingPlan, ['chair:synthesis']);
  const chairById = Object.fromEntries(chairFailure.stages.map((stage) => [stage.id, stage.status]));
  assert.equal(chairById['chair:synthesis'], 'failed');
  assert.equal(chairById['reviewer:review'], 'dependency-blocked');

  const unreachableFailure = projectCouncilBlueprintMeetingStatus(
    preview.meetingPlan,
    ['opening:research', 'chair:synthesis', 'reviewer:review'],
  );
  const unreachableById = Object.fromEntries(unreachableFailure.stages.map((stage) => [stage.id, stage.status]));
  assert.equal(unreachableById['chair:synthesis'], 'dependency-blocked');
  assert.equal(unreachableById['reviewer:review'], 'dependency-blocked');
});

test('council blueprint rejects invalid selectable role input', () => {
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: ['research', 'implementation', 'chair'] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: ['research', 'implementation', 'verification', 'verification'] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: ['research', 'implementation'] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: [] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: ['research', 'implementation', 'unknown'] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({ roleIds: ['research', 'implementation', 'reviewer'] }),
    CouncilBlueprintPreviewValidationError,
  );
  assert.throws(
    () => createCouncilBlueprintPreview({
      roleIds: ['research', 'product', 'architecture', 'implementation', 'security', 'verification', 'operations', 'research'],
    }),
    CouncilBlueprintPreviewValidationError,
  );
});

test('council blueprint renderer keeps controls accessible and has no execution action', () => {
  const catalog = getCouncilBlueprintCatalog();
  const preview = createCouncilBlueprintPreview({ roleIds: DEFAULT_ROLES });
  const markup = renderCouncilBlueprintPreview({ catalog, preview, selectedRoleIds: DEFAULT_ROLES });

  assert.match(markup, /role="group" aria-label="Select three to seven council specialist roles"/);
  assert.equal((markup.match(/data-council-blueprint-role=/g) || []).length, 7);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /Chair and reviewer are locked/);
  assert.match(markup, /No execution action is available here/);
  assert.doesNotMatch(markup, /buildMissionConstraintPayload|mission create|run mission/i);

  const loadingMarkup = renderCouncilBlueprintPreview({
    catalog,
    loading: true,
    preview,
    selectedRoleIds: DEFAULT_ROLES,
  });
  assert.equal((loadingMarkup.match(/ disabled/g) || []).length, 7);

  const scheduleMarkup = renderCouncilBlueprintPreview({
    catalog,
    preview,
    scheduleShadow: createCouncilConcurrentScheduleShadow({ roleIds: DEFAULT_ROLES }),
    selectedRoleIds: DEFAULT_ROLES,
  });
  assert.match(scheduleMarkup, /Sequential baseline vs four candidate waves/);
  assert.match(scheduleMarkup, /canonical merge: opening:research, opening:implementation, opening:verification/);
  assert.match(scheduleMarkup, /Parity — stage ids: true, dependencies: true, authority: true/);
  assert.match(scheduleMarkup, /Blocker: none/);
  assert.match(scheduleMarkup, /actualConcurrentDispatch: false/);
  assert.match(scheduleMarkup, /No execution or dispatch action is available here/);

  const envelopeMarkup = renderCouncilBlueprintPreview({
    catalog,
    envelopeShadow: createCouncilConcurrentEnvelopeShadow({ roleIds: DEFAULT_ROLES }),
    preview,
    selectedRoleIds: DEFAULT_ROLES,
  });
  assert.match(envelopeMarkup, /Deterministic synthetic concurrency envelope/);
  assert.match(envelopeMarkup, /actualMeasurements: false/);
  assert.match(envelopeMarkup, /actualConcurrentDispatchQualified: false/);
  assert.match(envelopeMarkup, /No runtime measurement or dispatch action is available here/);
});

test('council preview leaves the mission constraint payload builder byte-equivalent', () => {
  const current = fs.readFileSync(new URL('../src/web/public/app.js', import.meta.url), 'utf8');
  const baseline = execFileSync('git', ['show', 'HEAD:src/web/public/app.js'], { encoding: 'utf8' });

  assert.equal(extractMissionConstraintPayload(current), extractMissionConstraintPayload(baseline));
});

function extractMissionConstraintPayload(source) {
  const start = source.indexOf('function buildMissionConstraintPayload');
  const end = source.indexOf('\nfunction getMissionAiConfiguration', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}
