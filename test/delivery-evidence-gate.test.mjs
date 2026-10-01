import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { evaluateDeliveryEvidence, renderDeliveryEvidenceMarkdown } from '../src/core/delivery-evidence-gate.mjs';

function packet() {
  const criterion = '담당자와 관리자가 모두 승인해야 한다.';
  return {
    schemaVersion: 'delivery-evidence-input/v1',
    target: { projectId: 'purchasing', sourceRevision: 'a'.repeat(40) },
    requirements: [{
      id: 'REQ-1', criterion, mappingConfirmed: true,
      checks: [{ id: 'two-approvers', definitionDigest: 'b'.repeat(64), environmentId: 'node24-local' }],
    }],
    evidence: [{
      id: 'EV-1', projectId: 'purchasing', sourceRevision: 'a'.repeat(40),
      requirementId: 'REQ-1', criterionDigest: createHash('sha256').update(criterion).digest('hex'),
      checkId: 'two-approvers', definitionDigest: 'b'.repeat(64), environmentId: 'node24-local', result: 'passed',
    }],
  };
}

function firstCheck(input) {
  return evaluateDeliveryEvidence(input).requirements[0].checks[0];
}

function cli(input, args = []) {
  return spawnSync(process.execPath, ['scripts/check-delivery-evidence.mjs', ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', timeout: 10_000,
  });
}

test('current reported evidence never claims authenticity, acceptance or execution authority', () => {
  const input = packet();
  const before = structuredClone(input);
  const result = evaluateDeliveryEvidence(input);
  assert.equal(result.status, 'evidence-current');
  assert.equal(result.requirements[0].checks[0].status, 'current');
  assert.equal(result.verificationScope, 'declared-inputs-only');
  assert.equal(result.evidenceAuthenticity, 'unverified');
  assert.equal(result.acceptance, 'not-assessed');
  assert.equal(result.deployment, 'not-assessed');
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.productionReadyClaim, false);
  assert.deepEqual(input, before);
  assert.deepEqual(evaluateDeliveryEvidence(input), result);
  result.target.projectId = 'changed-output';
  assert.deepEqual(input, before);
});

test('missing evidence blocks instead of passing an empty set', () => {
  const input = packet();
  input.evidence = [];
  assert.equal(evaluateDeliveryEvidence(input).status, 'blocked');
  assert.equal(firstCheck(input).status, 'missing');
});

for (const [field, value] of [
  ['sourceRevision', 'c'.repeat(40)], ['criterionDigest', 'd'.repeat(64)],
  ['definitionDigest', 'e'.repeat(64)], ['environmentId', 'node22-ci'],
]) {
  test(`evidence with a different ${field} is stale with an explicit reason`, () => {
    const input = packet();
    input.evidence[0][field] = value;
    const check = firstCheck(input);
    assert.equal(check.status, 'stale');
    assert.deepEqual(check.excludedEvidence, [{ id: 'EV-1', mismatches: [field] }]);
    assert.equal(evaluateDeliveryEvidence(input).status, 'blocked');
  });
}

test('editing the criterion invalidates old evidence without changing the requirement ID', () => {
  const input = packet();
  input.requirements[0].criterion = '담당자, 관리자, 감사자가 모두 승인해야 한다.';
  assert.equal(firstCheck(input).status, 'stale');
  assert.deepEqual(firstCheck(input).excludedEvidence[0].mismatches, ['criterionDigest']);
});

test('another project cannot satisfy the same requirement and check IDs', () => {
  const input = packet();
  input.evidence[0].projectId = 'other-project';
  const result = evaluateDeliveryEvidence(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.requirements[0].checks[0].status, 'missing');
  assert.deepEqual(result.unmatchedEvidence, [{ id: 'EV-1', reason: 'project-mismatch' }]);
});

for (const [result, status] of [['failed', 'failed'], ['skipped', 'incomplete'], ['timeout', 'incomplete']]) {
  test(`${result} is not a current pass`, () => {
    const input = packet();
    input.evidence[0].result = result;
    assert.equal(firstCheck(input).status, status);
    assert.deepEqual(firstCheck(input).currentEvidence, [{ id: 'EV-1', result }]);
    assert.equal(evaluateDeliveryEvidence(input).status, 'blocked');
  });
}

test('conflicting current attempts are never resolved by array order', () => {
  const input = packet();
  input.evidence.push({ ...input.evidence[0], id: 'EV-2', result: 'failed' });
  const forward = evaluateDeliveryEvidence(input);
  input.evidence.reverse();
  assert.deepEqual(evaluateDeliveryEvidence(input), forward);
  assert.equal(forward.requirements[0].checks[0].status, 'conflicting');
  assert.equal(forward.status, 'blocked');
});

test('old failure remains visible but does not override a current reported pass', () => {
  const input = packet();
  input.evidence.push({ ...input.evidence[0], id: 'EV-old', sourceRevision: 'f'.repeat(40), result: 'failed' });
  const check = firstCheck(input);
  assert.equal(check.status, 'current');
  assert.deepEqual(check.currentEvidence, [{ id: 'EV-1', result: 'passed' }]);
  assert.deepEqual(check.excludedEvidence, [{ id: 'EV-old', mismatches: ['sourceRevision'] }]);
});

test('unconfirmed mapping still needs review even with current evidence', () => {
  const input = packet();
  input.requirements[0].mappingConfirmed = false;
  assert.equal(evaluateDeliveryEvidence(input).status, 'needs-review');
  input.evidence = [];
  const result = evaluateDeliveryEvidence(input);
  assert.equal(result.status, 'blocked');
  assert.equal(result.requirements[0].mappingConfirmed, false);
});

test('every required check and requirement contributes to the result', () => {
  const input = packet();
  input.requirements[0].checks.push({ ...input.requirements[0].checks[0], id: 'permission-denied' });
  input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-2' });
  const result = evaluateDeliveryEvidence(input);
  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.requirements.map(row => row.status), ['blocked', 'blocked']);
  assert.equal(result.requirements[0].checks.find(row => row.id === 'permission-denied').status, 'missing');
});

test('invalid contracts fail closed without coercion or unknown authority fields', () => {
  const changes = [
    x => { x.schemaVersion = 2; }, x => { x.requirements = []; },
    x => { x.requirements[0].checks = []; }, x => { x.requirements[0].mappingConfirmed = 'true'; },
    x => { x.target.sourceRevision = 'aaaa'; }, x => { x.target.projectId = ' purchasing'; },
    x => { x.requirements[0].criterion = '\u202ehidden'; },
    x => { x.evidence[0].result = 'success'; }, x => { x.evidence[0].origin = 'verified-runner'; },
    x => { x.evidence[0].requirementId = 'unknown'; }, x => { x.evidence[0].checkId = 'unknown'; },
    x => { x.evidence[0].definitionDigest = null; }, x => { x.executionAuthorized = true; },
    x => { x.target.extra = true; }, x => { x.requirements[0].extra = true; },
    x => { x.requirements[0].checks[0].extra = true; },
    x => { x.requirements.push(structuredClone(x.requirements[0])); },
    x => { x.requirements[0].checks.push({ ...x.requirements[0].checks[0] }); },
    x => { x.evidence.push({ ...x.evidence[0] }); }, x => { x.evidence = null; },
    x => { x.requirements = Array(101).fill(x.requirements[0]); },
  ];
  for (const change of changes) {
    const input = packet();
    change(input);
    assert.throws(() => evaluateDeliveryEvidence(input), /Invalid delivery evidence/);
  }
  for (const input of [null, [], false]) assert.throws(() => evaluateDeliveryEvidence(input));
});

test('Markdown retains binding, evidence IDs, limitations and escapes criterion markup', () => {
  const input = packet();
  input.requirements[0].criterion = '<img src=x> [click](https://example.invalid) | *required*';
  const result = evaluateDeliveryEvidence(input);
  const markdown = renderDeliveryEvidenceMarkdown(result);
  assert.match(markdown, /REQ\\-1/);
  assert.match(markdown, /EV\\-1/);
  assert.match(markdown, /criterionDigest/);
  assert.match(markdown, /unverified/);
  assert.match(markdown, /not-assessed/);
  assert.doesNotMatch(markdown, /<img|\[click\]\(https/);
});

test('CLI JSON and Markdown are projections of the same evaluator', () => {
  const input = packet();
  const json = cli(input);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stderr, '');
  assert.deepEqual(JSON.parse(json.stdout), evaluateDeliveryEvidence(input));
  const markdown = cli(input, ['--format', 'markdown']);
  assert.equal(markdown.status, 0, markdown.stderr);
  assert.equal(markdown.stdout, renderDeliveryEvidenceMarkdown(evaluateDeliveryEvidence(input)));
  input.evidence = [];
  const blocked = cli(input);
  assert.equal(blocked.status, 2);
  assert.equal(JSON.parse(blocked.stdout).status, 'blocked');
  input.evidence = packet().evidence;
  input.requirements[0].mappingConfirmed = false;
  assert.equal(cli(input).status, 2);
});

test('CLI rejects invalid input and options without reflecting private content', () => {
  for (const [input, args] of [
    ['{"private":"DO-NOT-ECHO",', []], [packet(), ['--output', 'DO-NOT-ECHO']],
    [packet(), ['--format', 'json', '--format', 'json']], ['x'.repeat(1024 * 1024 + 1), []],
  ]) {
    const result = cli(input, args);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /DO-NOT-ECHO/);
  }
});

test('all current non-pass combinations block regardless of row order', () => {
  for (const other of ['failed', 'skipped', 'timeout']) {
    const input = packet();
    input.evidence.push({ ...input.evidence[0], id: 'EV-2', result: other });
    assert.equal(firstCheck(input).status, 'conflicting');
    input.evidence.reverse();
    assert.equal(evaluateDeliveryEvidence(input).status, 'blocked');
  }
});

test('reordering requirements, checks and evidence preserves the entire report', () => {
  const input = packet();
  input.requirements[0].checks.push({ ...input.requirements[0].checks[0], id: 'another-check' });
  input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-2' });
  input.evidence.push({ ...input.evidence[0], id: 'EV-2', checkId: 'another-check' });
  const before = evaluateDeliveryEvidence(input);
  input.requirements.reverse();
  for (const requirement of input.requirements) requirement.checks.reverse();
  input.evidence.reverse();
  assert.deepEqual(evaluateDeliveryEvidence(input), before);
});

test('CLI rejects malformed UTF-8 without replacing bytes in the criterion', () => {
  const input = Buffer.from(JSON.stringify(packet()));
  const corrupted = Buffer.concat([input.subarray(0, 20), Buffer.from([0xff]), input.subarray(20)]);
  const result = spawnSync(process.execPath, ['scripts/check-delivery-evidence.mjs'], {
    input: corrupted, encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /valid UTF-8 JSON/);
});
