import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateParallelQualityGate,
  getOrchestrationQualityGateRequiredKinds,
  parseMissionConstraintDirectives,
  resolveMissionParallelPlan,
} from '../src/core/mission-parallel-plan.mjs';

test('parseMissionConstraintDirectives', async (t) => {
  await t.test('returns empty defaults when the mission has no constraints', () => {
    const directives = parseMissionConstraintDirectives({});
    assert.deepEqual(directives, {
      orchestrationProfileId: '',
      parallelSpecialists: [],
      specialistAbandonKinds: [],
      specialistBlockKinds: [],
      specialistFailKinds: [],
    });
  });

  await t.test('parses profile id and filtered specialist kinds from constraints', () => {
    const directives = parseMissionConstraintDirectives({
      constraints: [
        'orchestration-profile:Knowledge-Triad',
        'parallel-specialists:research,verification,not-a-kind',
        'parallel-fail:implementation',
      ],
    });
    assert.equal(directives.orchestrationProfileId, 'knowledge-triad');
    assert.deepEqual(directives.parallelSpecialists, ['research', 'verification']);
    assert.deepEqual(directives.specialistFailKinds, ['implementation']);
  });

  await t.test('ignores blank and unknown constraint keys', () => {
    const directives = parseMissionConstraintDirectives({
      constraints: ['', '   ', 'unknown-key:research'],
    });
    assert.equal(directives.orchestrationProfileId, '');
    assert.deepEqual(directives.parallelSpecialists, []);
  });
});

test('resolveMissionParallelPlan', async (t) => {
  await t.test('reports source "none" and no kinds for a mission without directives', () => {
    const plan = resolveMissionParallelPlan({});
    assert.equal(plan.source, 'none');
    assert.deepEqual(plan.effectiveKinds, []);
    assert.equal(plan.orchestrationProfile, null);
  });

  await t.test('resolves the orchestration profile and its specialist kinds', () => {
    const plan = resolveMissionParallelPlan({
      constraints: ['orchestration-profile:knowledge-triad'],
    });
    assert.equal(plan.source, 'orchestration-profile');
    assert.deepEqual(plan.effectiveKinds, ['research', 'implementation', 'verification']);
    assert.equal(plan.orchestrationProfile.id, 'knowledge-triad');
    assert.equal(plan.orchestrationProfile.source, 'orchestration-profile');
  });

  await t.test('explicit specialists override the profile kinds but keep the profile', () => {
    const plan = resolveMissionParallelPlan({
      constraints: [
        'orchestration-profile:knowledge-triad',
        'parallel-specialists:research',
      ],
    });
    assert.equal(plan.source, 'profile-with-explicit-specialists');
    assert.deepEqual(plan.effectiveKinds, ['research']);
    assert.equal(plan.orchestrationProfile.id, 'knowledge-triad');
  });

  await t.test('explicit specialists without a profile use the explicit-specialists source', () => {
    const plan = resolveMissionParallelPlan({
      constraints: ['parallel-specialists:research,verification'],
    });
    assert.equal(plan.source, 'explicit-specialists');
    assert.deepEqual(plan.effectiveKinds, ['research', 'verification']);
    assert.equal(plan.orchestrationProfile, null);
  });
});

test('getOrchestrationQualityGateRequiredKinds', async (t) => {
  await t.test('returns only verification for a verification-signal-required gate', () => {
    const kinds = getOrchestrationQualityGateRequiredKinds({
      qualityGate: 'verification-signal-required',
      parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    });
    assert.deepEqual(kinds, ['verification']);
  });

  await t.test('returns research and verification for the combined gate', () => {
    const kinds = getOrchestrationQualityGateRequiredKinds({
      qualityGate: 'research-and-verification-signal-required',
      parallelSpecialistKinds: ['research', 'implementation', 'verification', 'design'],
    });
    assert.deepEqual(kinds, ['research', 'verification']);
  });

  await t.test('returns an empty list for gates without required signals', () => {
    assert.deepEqual(
      getOrchestrationQualityGateRequiredKinds({
        qualityGate: 'manager-merge-ready',
        parallelSpecialistKinds: ['research', 'verification'],
      }),
      [],
    );
    assert.deepEqual(getOrchestrationQualityGateRequiredKinds(null), []);
  });
});

test('evaluateParallelQualityGate', async (t) => {
  await t.test('returns a "none" gate when there is no profile or quality gate', () => {
    const result = evaluateParallelQualityGate({
      latestByKind: new Map(),
      orchestrationProfile: null,
    });
    assert.equal(result.status, 'none');
    assert.equal(result.qualityGate, null);
    assert.deepEqual(result.violations, []);
  });

  await t.test('passes a manager-merge-ready gate regardless of run state', () => {
    const result = evaluateParallelQualityGate({
      latestByKind: new Map(),
      orchestrationProfile: {
        id: 'knowledge-research-implementation',
        qualityGate: 'manager-merge-ready',
        parallelSpecialistKinds: ['research', 'implementation'],
      },
    });
    assert.equal(result.status, 'passed');
    assert.equal(result.violationCount, 0);
  });

  await t.test('passes when required specialist runs are completed', () => {
    const result = evaluateParallelQualityGate({
      latestByKind: new Map([
        ['verification', { id: 'run-1', status: 'completed' }],
      ]),
      orchestrationProfile: {
        id: 'knowledge-triad',
        displayName: 'Knowledge Triad',
        qualityGate: 'verification-signal-required',
        parallelSpecialistKinds: ['research', 'implementation', 'verification'],
      },
    });
    assert.equal(result.status, 'passed');
    assert.deepEqual(result.requiredKinds, ['verification']);
    assert.equal(result.violationCount, 0);
  });

  await t.test('blocks and records a violation when a required run is missing or failed', () => {
    const result = evaluateParallelQualityGate({
      latestByKind: new Map([
        ['verification', { id: 'run-2', status: 'failed', endedAt: '2026-01-01T00:00:00Z' }],
      ]),
      orchestrationProfile: {
        id: 'knowledge-triad',
        displayName: 'Knowledge Triad',
        qualityGate: 'verification-signal-required',
        parallelSpecialistKinds: ['research', 'implementation', 'verification'],
      },
    });
    assert.equal(result.status, 'blocked');
    assert.equal(result.violationCount, 1);
    assert.deepEqual(result.rerunKinds, ['verification']);
    assert.equal(result.violations[0].specialistKind, 'verification');
    assert.equal(result.violations[0].status, 'failed');
    assert.equal(result.latestViolation.runId, 'run-2');
  });
});
