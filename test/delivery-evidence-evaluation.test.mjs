import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { deliveryEvaluationCases } from '../examples/delivery-evidence/cases.mjs';
import { evaluateDeliveryEvidence } from '../src/core/delivery-evidence-gate.mjs';
import {
  evaluateDeliveryEvidenceCases, renderDeliveryEvaluationMarkdown, reviewEvidenceChecklist,
} from '../src/core/delivery-evidence-evaluation.mjs';

const oracle = () => JSON.parse(readFileSync(new URL('../examples/delivery-evidence/expected.json', import.meta.url), 'utf8'));
const cli = args => spawnSync(process.execPath, ['scripts/evaluate-delivery-evidence.mjs', ...args], {
  encoding: 'utf8', timeout: 10_000,
});

function fixedDecision(packet, current) {
  return {
    status: current ? 'evidence-current' : 'blocked',
    requirements: packet.requirements.map(requirement => ({
      id: requirement.id, status: current ? 'evidence-current' : 'blocked',
      checks: requirement.checks.map(check => ({ id: check.id, status: current ? 'current' : 'missing' })),
    })),
  };
}

test('independent reference and candidate agree with the separately reviewed oracle', () => {
  const cases = deliveryEvaluationCases();
  const expected = oracle();
  const before = structuredClone({ cases, expected });
  const report = evaluateDeliveryEvidenceCases(cases, expected);
  assert.equal(report.passed, true);
  assert.deepEqual(report.corpus, { caseCount: 12, normalCount: 4, errorCount: 8 });
  for (const implementation of ['candidate', 'reference']) {
    assert.deepEqual(report.summary[implementation], {
      correctCount: 12, mismatchCount: 0, normalHandledCount: 4,
      falseEvidenceCurrentCount: 0, unnecessaryHoldCount: 0,
    });
  }
  assert.deepEqual({ cases, expected }, before);
  assert.deepEqual(evaluateDeliveryEvidenceCases(cases, expected), report);
  assert.equal(report.measurements.humanFalseReadyCount, null);
  assert.equal(report.measurements.reviewTimeSeconds, null);
  assert.equal(report.measurements.productivityImprovement, null);
  assert.equal(report.evidenceAuthenticity, 'unverified');
  assert.equal(report.executionAuthorized, false);
  assert.equal(report.productionReadyClaim, false);
  assert.equal(report.acceptance, 'not-assessed');
});

test('always blocking cannot pass by hiding normal cases', () => {
  const report = evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle(), {
    candidate: packet => fixedDecision(packet, false),
  });
  assert.equal(report.passed, false);
  assert.equal(report.summary.candidate.falseEvidenceCurrentCount, 0);
  assert.equal(report.summary.candidate.unnecessaryHoldCount, 4);
  assert.equal(report.summary.candidate.normalHandledCount, 0);
});

test('always current exposes every unsafe synthetic decision', () => {
  const report = evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle(), {
    candidate: packet => fixedDecision(packet, true),
  });
  assert.equal(report.passed, false);
  assert.equal(report.summary.candidate.falseEvidenceCurrentCount, 8);
});

test('wrong check-level reasons fail even if the overall blocked label is right', () => {
  const report = evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle(), {
    candidate: packet => {
      const result = evaluateDeliveryEvidence(packet);
      for (const requirement of result.requirements) {
        for (const check of requirement.checks) if (check.status === 'stale') check.status = 'missing';
      }
      return result;
    },
  });
  assert.equal(report.passed, false);
  assert.equal(report.summary.candidate.mismatchCount, 4);
});

test('candidate and reference only receive isolated packets, never oracle or case labels', () => {
  const cases = deliveryEvaluationCases();
  const before = structuredClone(cases);
  let calls = 0;
  const isolated = packet => {
    assert.deepEqual(Object.keys(packet).sort(), ['evidence', 'requirements', 'schemaVersion', 'target']);
    assert.notEqual(packet, cases[0].packet);
    const result = reviewEvidenceChecklist(packet);
    packet.target.projectId = 'local-mutation';
    calls += 1;
    return result;
  };
  const report = evaluateDeliveryEvidenceCases(cases, oracle(), { candidate: isolated, reference: isolated });
  assert.equal(report.passed, true);
  assert.equal(calls, 24);
  assert.deepEqual(cases, before);
});

test('missing duplicate extra or mislabeled oracle cases are rejected', () => {
  for (const change of [
    value => value.cases.pop(),
    value => value.cases.push(structuredClone(value.cases[0])),
    value => { value.cases[0].id = 'unexpected'; },
    value => { value.cases[0].kind = 'error'; },
    value => { value.cases[0].requirements[0].checks[0].id = 'wrong-check'; },
    value => { value.cases[0].status = 'invented'; },
  ]) {
    const expected = oracle();
    change(expected);
    assert.throws(() => evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), expected), /Invalid delivery evaluation/);
  }
});

test('case identity duplication and oracle leakage are rejected before evaluators run', () => {
  for (const change of [
    cases => cases.push(structuredClone(cases[0])),
    cases => { cases[0].expected = 'evidence-current'; },
  ]) {
    const cases = deliveryEvaluationCases();
    change(cases);
    assert.throws(() => evaluateDeliveryEvidenceCases(cases, oracle()), /Invalid delivery evaluation/);
  }
});

test('invalid evaluator output is not converted into a passing or skipped case', () => {
  for (const result of [null, { status: 'passed', requirements: [] }, { status: 'blocked', requirements: [] }]) {
    assert.throws(() => evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle(), {
      candidate: () => result,
    }), /Invalid delivery evaluation/);
  }
});

test('duplicate extra missing or malformed result rows are refused', () => {
  for (const change of [
    value => { value.requirements = null; },
    value => value.requirements.push(structuredClone(value.requirements[0])),
    value => { value.requirements[0].id = 'unexpected'; },
    value => { value.requirements[0].checks = []; },
    value => value.requirements[0].checks.push(structuredClone(value.requirements[0].checks[0])),
    value => { value.requirements[0].checks[0].status = 'invented'; },
  ]) {
    assert.throws(() => evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle(), {
      candidate: packet => {
        const result = evaluateDeliveryEvidence(packet);
        change(result);
        return result;
      },
    }), /Invalid delivery evaluation/);
  }
  const expected = oracle();
  expected.cases[0].requirements = null;
  assert.throws(() => evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), expected), /Invalid delivery evaluation/);
});

test('checklist reference preserves failed skipped timeout and mixed requirement precedence', () => {
  for (const result of ['failed', 'skipped', 'timeout']) {
    const packet = deliveryEvaluationCases()[0].packet;
    packet.evidence[0].result = result;
    const reference = reviewEvidenceChecklist(packet);
    assert.equal(reference.status, 'blocked');
    assert.equal(reference.requirements[0].checks[0].status, result === 'failed' ? 'failed' : 'incomplete');
  }
  const packet = deliveryEvaluationCases().find(row => row.id === 'current-multiple').packet;
  packet.requirements[0].mappingConfirmed = false;
  packet.evidence = packet.evidence.filter(row => row.requirementId !== 'REQ-2');
  const reference = reviewEvidenceChecklist(packet);
  assert.equal(reference.status, 'blocked');
  assert.equal(reference.requirements[0].status, 'needs-review');
  assert.equal(reference.requirements[1].status, 'blocked');
});

test('case oracle and requirement ordering do not affect the result', () => {
  const cases = deliveryEvaluationCases();
  const expected = oracle();
  const before = evaluateDeliveryEvidenceCases(cases, expected);
  cases.reverse();
  expected.cases.reverse();
  for (const item of cases) {
    item.packet.requirements.reverse();
    item.packet.evidence.reverse();
    for (const requirement of item.packet.requirements) requirement.checks.reverse();
  }
  assert.deepEqual(evaluateDeliveryEvidenceCases(cases, expected), before);
});

test('evaluation CLI JSON and Markdown describe the same measured synthetic cases', () => {
  const json = cli([]);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stderr, '');
  const report = JSON.parse(json.stdout);
  assert.deepEqual(report, evaluateDeliveryEvidenceCases(deliveryEvaluationCases(), oracle()));
  const markdown = cli(['--format', 'markdown']);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.equal(markdown.stdout, renderDeliveryEvaluationMarkdown(report));
  assert.match(markdown.stdout, /not-measured/);
  assert.match(markdown.stdout, /deterministic-checklist-reference/);
});

test('evaluation CLI refuses arbitrary paths outputs and repeated flags without echoing them', () => {
  for (const args of [['--output', 'DO-NOT-ECHO'], ['--cases', 'DO-NOT-ECHO'], ['--format', 'html'],
    ['--format', 'json', '--format', 'json']]) {
    const result = cli(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /DO-NOT-ECHO/);
  }
});
