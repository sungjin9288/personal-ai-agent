import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import http from 'node:http';
import test from 'node:test';

import { buildDeliveryEvidenceReview } from '../src/core/delivery-evidence-review.mjs';
import { createDeliveryEvidenceHandlers } from '../src/web/delivery-evidence-handlers.mjs';

function packet() {
  const criterion = 'Approval requires two people.';
  return {
    schemaVersion: 'delivery-evidence-input/v1',
    target: { projectId: 'project-a', sourceRevision: 'a'.repeat(40) },
    requirements: [{ id: 'REQ-1', criterion, mappingConfirmed: false,
      checks: [{ id: 'test-suite', definitionDigest: 'b'.repeat(64), environmentId: 'local' }] }],
    evidence: [{ id: 'EV-1', projectId: 'project-a', sourceRevision: 'a'.repeat(40),
      requirementId: 'REQ-1', criterionDigest: createHash('sha256').update(criterion).digest('hex'),
      checkId: 'test-suite', definitionDigest: 'b'.repeat(64), environmentId: 'local', result: 'failed' }],
  };
}

function reviewFor(input = packet(), changes = {}) {
  return {
    bindingDigest: buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input }).bindingDigest,
    reviewerName: 'Local reviewer',
    entries: [{ requirementId: 'REQ-1', kind: 'exception-recorded', reason: 'Follow up before handoff.' }],
    ...changes,
  };
}

function harness({ body = { packet: packet() }, bytes, allowed = true, captureSource, params = { workspaceId: 'ws-a' } } = {}) {
  const input = packet();
  let captures = 0;
  let reads = 0;
  const calls = [];
  const request = Readable.from((async function* () {
    reads += 1;
    yield bytes ?? Buffer.from(JSON.stringify(body));
  })());
  const source = { target: input.target, requirements: input.requirements, repositoryIdentityDigest: 'c'.repeat(64) };
  const handlers = createDeliveryEvidenceHandlers({ request, response: {}, auth: {},
    evaluateWorkspaceTenantAccess(workspaceId) {
      assert.equal(workspaceId, 'ws-a');
      return { allowed, workspace: { path: '/registered/workspace' } };
    },
    sendTenantDenied() { calls.push({ status: 403 }); },
    sendJson(_response, status, data) { calls.push({ status, data }); },
    captureSource(directory) {
      assert.equal(directory, '/registered/workspace');
      captures += 1;
      return captureSource ? captureSource(captures, structuredClone(source)) : structuredClone(source);
    },
  });
  return { handlers, params, calls, get captures() { return captures; }, get reads() { return reads; } };
}

test('review binds full packet and workspace without changing evaluator judgment or input', () => {
  const input = packet();
  const original = structuredClone(input);
  const preview = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input });
  const reviewed = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input) });
  assert.deepEqual(reviewed.report, preview.report);
  assert.equal(reviewed.report.status, 'blocked');
  assert.equal(reviewed.report.executionAuthorized, false);
  assert.equal(reviewed.review.reviewer.identityAssurance, 'self-declared');
  assert.equal(reviewed.review.bindingDigest, preview.bindingDigest);
  assert.equal(reviewed.review.sourceRevision, input.target.sourceRevision);
  assert.deepEqual(input, original);
  assert.equal(preview.review, null);
});

test('stale review is rejected for revision, criterion, check, mapping, evidence, and workspace changes', () => {
  const original = packet();
  const review = reviewFor(original);
  const mutations = [
    p => { p.target.sourceRevision = 'd'.repeat(40); },
    p => { p.requirements[0].criterion = 'Changed acceptance criterion.'; },
    p => { p.requirements[0].checks[0].definitionDigest = 'd'.repeat(64); },
    p => { p.requirements[0].mappingConfirmed = true; },
    p => { p.evidence[0].result = 'passed'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: changed, review }), /binding/);
  }
  assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-b', packet: original, review }), /binding/);
});

test('object key order does not alter packet binding and report input cannot be supplied', () => {
  const input = packet();
  const reordered = { evidence: input.evidence, requirements: input.requirements, target: input.target, schemaVersion: input.schemaVersion };
  assert.equal(buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input }).bindingDigest,
    buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: reordered }).bindingDigest);
  assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: { ...input, report: { status: 'evidence-current' } } }));
});

test('review schema rejects extra fields, unknown or duplicate requirements, blank and oversized notes', () => {
  const input = packet();
  const base = reviewFor(input);
  for (const review of [
    { ...base, approved: true }, { ...base, reviewerName: ' ' }, { ...base, reviewerName: 'x'.repeat(101) },
    { ...base, entries: [] }, { ...base, entries: [...base.entries, ...base.entries] },
    { ...base, entries: [{ ...base.entries[0], requirementId: 'FOREIGN' }] },
    { ...base, entries: [{ ...base.entries[0], kind: 'approved' }] },
    { ...base, entries: [{ ...base.entries[0], reason: 'x'.repeat(1001) }] },
    { ...base, entries: [{ ...base.entries[0], reason: 'ok\u0000hidden' }] },
  ]) assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review }));
});

test('Markdown escapes reviewer and exception markup and retains blocked result and storage limit', () => {
  const input = packet();
  const review = reviewFor(input, { reviewerName: '<img src=x onerror=alert(1)>',
    entries: [{ requirementId: 'REQ-1', kind: 'exception-recorded', reason: '[click](javascript:alert(1)) <script>alert(1)</script>' }] });
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review });
  assert.ok(!output.markdown.includes('<script>'));
  assert.ok(!output.markdown.includes('[click](javascript:'));
  assert.ok(output.markdown.includes('&lt;script&gt;'));
  assert.match(output.markdown, /blocked/);
  assert.match(output.markdown, /self-declared/);
  assert.match(output.markdown, /서버.*저장/);
});

test('mapping review leaves unconfirmed mapping and needs-review unchanged', () => {
  const input = packet(); input.evidence[0].result = 'passed';
  const review = reviewFor(input); review.entries[0].kind = 'mapping-review';
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review });
  assert.equal(output.report.status, 'needs-review');
  assert.equal(output.packet.requirements[0].mappingConfirmed, false);
});

test('current GET returns registered source with empty evidence and performs two captures', async () => {
  const fixture = harness();
  await fixture.handlers.getCurrent(fixture.params);
  assert.equal(fixture.calls[0].status, 200);
  assert.deepEqual(fixture.calls[0].data.packet.evidence, []);
  assert.equal(fixture.calls[0].data.report.status, 'blocked');
  assert.equal(fixture.captures, 2);
  assert.equal(fixture.reads, 0);
});

test('tenant rejection precedes body read and source capture on both routes', async () => {
  for (const method of ['getCurrent', 'review']) {
    const fixture = harness({ allowed: false });
    await fixture.handlers[method](fixture.params);
    assert.equal(fixture.calls[0].status, 403);
    assert.equal(fixture.captures, 0);
    assert.equal(fixture.reads, 0);
  }
});

test('POST evaluates and records review with matching trusted source', async () => {
  const input = packet();
  const fixture = harness({ body: { packet: input, review: reviewFor(input) } });
  await fixture.handlers.review(fixture.params);
  assert.equal(fixture.calls[0].status, 200);
  assert.equal(fixture.calls[0].data.review.entries[0].kind, 'exception-recorded');
  assert.equal(fixture.calls[0].data.report.status, 'blocked');
  assert.equal(fixture.captures, 2);
});

test('POST rejects oversized, malformed, non-UTF8, and unknown fields without reflecting input', async () => {
  for (const [bytes, status] of [
    [Buffer.alloc(1024 * 1024 + 1, 'x'), 413], [Buffer.from('secret-malformed'), 400],
    [Buffer.from([0xff, 0xfe]), 400], [Buffer.from(JSON.stringify({ packet: packet(), path: '/secret/path' })), 400],
  ]) {
    const fixture = harness({ bytes });
    await fixture.handlers.review(fixture.params);
    assert.equal(fixture.calls[0].status, status);
    assert.ok(!JSON.stringify(fixture.calls[0]).includes('secret'));
    assert.equal(fixture.captures, 0);
  }
});

test('POST rejects foreign project and changed current requirements instead of rebinding packet', async () => {
  for (const mutate of [p => { p.target.projectId = 'foreign'; }, p => { p.requirements[0].criterion = 'Changed'; }]) {
    const input = packet(); mutate(input);
    const fixture = harness({ body: { packet: input } });
    await fixture.handlers.review(fixture.params);
    assert.equal(fixture.calls[0].status, 409);
    assert.equal(fixture.calls[0].data.packet, undefined);
  }
});

test('both handlers reject source observation drift and source capture errors generically', async () => {
  for (const method of ['getCurrent', 'review']) {
    for (const captureSource of [
      (count, source) => { if (count > 1) source.repositoryIdentityDigest = 'changed'; return source; },
      () => { throw new Error('/private/source/path with secret'); },
    ]) {
      const fixture = harness({ captureSource });
      await fixture.handlers[method](fixture.params);
      assert.equal(fixture.calls[0].status, 409);
      assert.ok(!JSON.stringify(fixture.calls[0]).includes('private'));
    }
  }
});

test('POST rejects old review binding with 409 before source read', async () => {
  const input = packet();
  const review = reviewFor(input);
  input.evidence[0].result = 'passed';
  const fixture = harness({ body: { packet: input, review } });
  await fixture.handlers.review(fixture.params);
  assert.equal(fixture.calls[0].status, 409);
  assert.equal(fixture.captures, 0);
});

test('exception records never promote missing, stale, incomplete, or conflicting evidence', () => {
  for (const mutate of [
    input => { input.evidence = []; },
    input => { input.evidence[0].sourceRevision = 'd'.repeat(40); },
    input => { input.evidence[0].result = 'skipped'; },
    input => { input.evidence.push({ ...input.evidence[0], id: 'EV-2', result: 'passed' }); },
  ]) {
    const input = packet(); mutate(input);
    const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input) });
    assert.equal(output.report.status, 'blocked');
    assert.equal(output.report.evidenceAuthenticity, 'unverified');
    assert.equal(output.report.acceptance, 'not-assessed');
  }
});

test('real HTTP oversized upload receives 413 instead of losing its socket', async () => {
  const server = http.createServer((request, response) => {
    const handlers = createDeliveryEvidenceHandlers({ request, response, auth: {},
      evaluateWorkspaceTenantAccess: () => ({ allowed: true, workspace: { path: '/unused' } }),
      sendTenantDenied: () => assert.fail('unexpected tenant denial'),
      captureSource: () => assert.fail('oversized request must not capture source'),
      sendJson(res, status, data) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); },
    });
    void handlers.review({ workspaceId: 'ws-a' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}`, {
      method: 'POST', body: Buffer.alloc(1024 * 1024 + 1, 'x'),
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, 'delivery-evidence-body-limit');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
