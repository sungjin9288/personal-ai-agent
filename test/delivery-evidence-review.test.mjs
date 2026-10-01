import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import http from 'node:http';
import test from 'node:test';

import { buildDeliveryEvidenceReview, restoreDeliveryEvidenceBundle } from '../src/core/delivery-evidence-review.mjs';
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

function impactFor(input = packet()) {
  const baseRevision = 'c'.repeat(40);
  const criterionDigest = createHash('sha256').update(input.requirements[0].criterion).digest('hex');
  return {
    schemaVersion: 'delivery-impact-input/v1',
    target: { ...input.target, baseRevision }, changedPaths: [],
    graph: [{ path: 'test/approval.test.mjs', dependencies: ['src/approval.mjs'], complete: true },
      { path: 'src/approval.mjs', dependencies: [], complete: true }],
    requirements: [{ id: input.requirements[0].id, criterionDigest, roots: ['test/approval.test.mjs'],
      mapping: { projectId: input.target.projectId, sourceRevision: baseRevision, criterionDigest, confirmed: true } }],
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sealBundle(bundle) {
  const { bundleDigest: _digest, ...input } = bundle;
  bundle.bundleDigest = createHash('sha256').update(canonicalJson(input)).digest('hex');
  return bundle;
}

function restore(bundle, extras = {}) {
  return restoreDeliveryEvidenceBundle({ workspaceId: 'ws-a', bundle, ...extras });
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

test('review export bundle contains only inputs and a canonical digest, including an empty review', () => {
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: packet() });
  assert.deepEqual(Object.keys(output.bundle).sort(),
    ['schemaVersion', 'workspaceId', 'packet', 'review', 'impactInput', 'bundleDigest'].sort());
  assert.equal(output.bundle.schemaVersion, 'delivery-review-bundle/v1');
  assert.equal(output.bundle.workspaceId, 'ws-a');
  assert.equal(output.bundle.review, null);
  assert.equal(output.impactInput, null);
  assert.equal(output.impactReport, null);
  assert.deepEqual(output.bundle.packet, output.packet);
  assert.deepEqual(output.bundle, sealBundle(structuredClone(output.bundle)));
  assert.deepEqual(restore(JSON.parse(JSON.stringify(output.bundle))), output);
});

test('restoring a bundle preserves archived self-declared identity, notes and exact ISO time', () => {
  const input = packet();
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input),
    impactInput: impactFor(input) });
  const bundle = structuredClone(output.bundle);
  bundle.review.reviewedAt = '2026-09-30T12:34:56.789Z';
  sealBundle(bundle);
  const original = structuredClone(bundle);
  const restored = restore(JSON.parse(JSON.stringify(bundle)));
  assert.deepEqual(restored.bundle, bundle);
  assert.deepEqual(restored.review, bundle.review);
  assert.equal(restored.review.reviewedAt, '2026-09-30T12:34:56.789Z');
  assert.equal(restored.review.reviewer.identityAssurance, 'self-declared');
  assert.deepEqual(restored.report, output.report);
  assert.deepEqual(restored.impactReport, output.impactReport);
  assert.match(restored.markdown, /2026-09-30T12:34:56\.789Z/);
  assert.match(restored.markdown, /시각.*self-declared|self-declared.*시각/);
  assert.deepEqual(bundle, original);
  restored.packet.evidence[0].result = 'passed';
  restored.impactInput.changedPaths.push('src/approval.mjs');
  assert.deepEqual(bundle, original);
});

test('bundle digest ignores object key order but detects packet, memo, time and impact mutations', () => {
  const input = packet();
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input),
    impactInput: impactFor(input) });
  const bundle = output.bundle;
  const reordered = Object.fromEntries(Object.entries(bundle).reverse());
  reordered.packet = Object.fromEntries(Object.entries(bundle.packet).reverse());
  assert.equal(restore(reordered).bundle.bundleDigest, bundle.bundleDigest);
  for (const mutate of [
    b => { b.packet.evidence[0].result = 'passed'; },
    b => { b.review.entries[0].reason = 'Replaced memo'; },
    b => { b.review.reviewedAt = '2026-01-01T00:00:00.000Z'; },
    b => { b.impactInput.changedPaths.push('src/approval.mjs'); },
    b => { b.workspaceId = 'ws-b'; },
  ]) {
    const changed = structuredClone(bundle); mutate(changed);
    assert.throws(() => restore(changed), error => error.status === 409);
  }
});

test('restore rejects uploaded authority, nonexact archive schemas, identity, binding and noncanonical times', () => {
  const input = packet();
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input) });
  for (const mutate of [
    b => { b.report = { status: 'evidence-current' }; },
    b => { b.markdown = '# Approved'; },
    b => { b.impactReport = { status: 'no-declared-impact' }; },
    b => { b.schemaVersion = 'delivery-review-bundle/v2'; },
    b => { delete b.impactInput; },
    b => { b.workspaceId = 'ws-b'; },
    b => { b.review.schemaVersion = 'delivery-review/v2'; },
    b => { b.review.workspaceId = 'ws-b'; },
    b => { b.review.sourceRevision = 'd'.repeat(40); },
    b => { b.review.bindingDigest = 'd'.repeat(64); },
    b => { b.review.reviewer.identityAssurance = 'verified'; },
    b => { b.review.reviewer.signature = 'trusted'; },
    b => { b.review.reviewer.name = ' '; },
    b => { b.review.entries[0].requirementId = 'UNKNOWN'; },
    b => { b.review.entries.push(b.review.entries[0]); },
    b => { b.review.entries[0].approved = true; },
    b => { b.review.reviewedAt = '2026-01-01'; },
    b => { b.review.reviewedAt = '2026-02-30T00:00:00.000Z'; },
    b => { b.review.reviewedAt = '2026-01-01T09:00:00.000+09:00'; },
  ]) {
    const changed = structuredClone(output.bundle); mutate(changed); sealBundle(changed);
    assert.throws(() => restore(changed));
  }
});

test('impact states remain separate from D1 judgment and cannot authorize reuse or CI skipping', () => {
  const input = packet();
  const preview = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input });
  for (const [status, mutate] of [
    ['no-declared-impact', () => {}],
    ['recheck-required', impact => { impact.changedPaths = ['src/approval.mjs']; }],
    ['unknown', impact => { impact.graph[1].complete = false; }],
  ]) {
    const impactInput = impactFor(input); mutate(impactInput);
    const original = structuredClone(impactInput);
    const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, impactInput });
    assert.equal(output.impactReport.status, status);
    assert.deepEqual(output.report, preview.report);
    assert.equal(output.bindingDigest, preview.bindingDigest);
    for (const flag of ['evidenceReuseAuthorized', 'ciSkipAuthorized', 'executionAuthorized', 'productionReadyClaim']) {
      assert.equal(output.impactReport[flag], false);
    }
    assert.equal(output.impactReport.mappingTrust, 'self-declared');
    assert.match(output.markdown, new RegExp(status));
    assert.deepEqual(restore(output.bundle), output);
    assert.deepEqual(impactInput, original);
  }
});

test('impact cross-binding rejects foreign project, stale source, missing IDs and changed criterion', () => {
  const input = packet();
  for (const mutate of [
    impact => { impact.target.projectId = 'foreign'; },
    impact => { impact.target.sourceRevision = 'd'.repeat(40); },
    impact => { impact.requirements[0].id = 'REQ-2'; },
    impact => { impact.requirements[0].criterionDigest = 'd'.repeat(64); },
    impact => { impact.requirements.push({ ...impact.requirements[0], id: 'REQ-2' }); },
  ]) {
    const impactInput = impactFor(input); mutate(impactInput);
    assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, impactInput }),
      error => error.status === 409 && error.code === 'delivery-evidence-impact-binding-mismatch');
  }
  const impactInput = impactFor(input); impactInput.report = { status: 'no-declared-impact' };
  assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, impactInput }));
});

test('impact override validates the original archive first and preserves review notes and time', () => {
  const input = packet();
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input) });
  const impactInput = impactFor(input); impactInput.graph[1].complete = false;
  const changed = restore(output.bundle, { impactInput });
  assert.deepEqual(changed.review, output.review);
  assert.equal(changed.bindingDigest, output.bindingDigest);
  assert.notEqual(changed.bundle.bundleDigest, output.bundle.bundleDigest);
  assert.equal(changed.impactReport.status, 'unknown');
  assert.deepEqual(restore(changed.bundle, { impactInput: null }).bundle, output.bundle);
  const corrupt = structuredClone(output.bundle); corrupt.review.entries[0].reason = 'tampered';
  assert.throws(() => restore(corrupt, { impactInput }), error => error.status === 409);
  const invalidOriginal = structuredClone(changed.bundle);
  invalidOriginal.impactInput.target.projectId = 'foreign'; sealBundle(invalidOriginal);
  assert.throws(() => restore(invalidOriginal, { impactInput: impactFor(input) }), error => error.status === 409);
});

test('POST restores bundle and impact override with unchanged two-capture source checks', async () => {
  const input = packet();
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input, review: reviewFor(input) });
  for (const body of [{ bundle: output.bundle }, { bundle: output.bundle, impactInput: impactFor(input) }]) {
    const fixture = harness({ body });
    await fixture.handlers.review(fixture.params);
    assert.equal(fixture.calls[0].status, 200);
    assert.deepEqual(fixture.calls[0].data.review, output.review);
    assert.equal(fixture.captures, 2);
  }
});

test('POST rejects bundle mixtures, uploaded reports and forged digests before source capture', async () => {
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: packet() });
  for (const body of [
    { bundle: output.bundle, packet: packet() }, { bundle: output.bundle, review: reviewFor() },
    { bundle: output.bundle, impactReport: { status: 'no-declared-impact' } },
    { bundle: { ...output.bundle, bundleDigest: 'd'.repeat(64) } },
  ]) {
    const fixture = harness({ body });
    await fixture.handlers.review(fixture.params);
    assert.equal(fixture.calls[0].status, Object.hasOwn(body.bundle, 'bundleDigest') && body.bundle.bundleDigest === 'd'.repeat(64) ? 409 : 400);
    assert.equal(fixture.captures, 0);
  }
});

test('bundle restore still rejects registered-source mismatch, drift and capture failure', async () => {
  const output = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: packet() });
  for (const captureSource of [
    (_count, source) => { source.target.sourceRevision = 'd'.repeat(40); return source; },
    (count, source) => { if (count > 1) source.repositoryIdentityDigest = 'changed'; return source; },
    () => { throw new Error('/private/source/secret'); },
  ]) {
    const fixture = harness({ body: { bundle: output.bundle }, captureSource });
    await fixture.handlers.review(fixture.params);
    assert.equal(fixture.calls[0].status, 409);
    assert.ok(!JSON.stringify(fixture.calls[0]).includes('secret'));
  }
});

test('portable bundle leaves HTTP envelope room and refuses near-limit packets instead of emitting unrestorable archives', async () => {
  const limit = 1024 * 1024;
  function sizedPacket(bodyBytes) {
    const input = packet();
    const row = { ...input.evidence[0], id: 'EV-00000' };
    input.evidence = [];
    const overhead = Buffer.byteLength(JSON.stringify({ packet: input }));
    const rowBytes = Buffer.byteLength(JSON.stringify(row)) + 1;
    const count = Math.floor((bodyBytes - overhead + 1) / rowBytes);
    input.evidence = Array.from({ length: count }, (_, index) => ({ ...row, id: `EV-${String(index).padStart(5, '0')}` }));
    const remainder = bodyBytes - Buffer.byteLength(JSON.stringify({ packet: input }));
    input.requirements[0].criterion += 'x'.repeat(remainder);
    assert.equal(Buffer.byteLength(JSON.stringify({ packet: input })), bodyBytes);
    return input;
  }
  const portable = buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: sizedPacket(limit - 1024) });
  assert.ok(Buffer.byteLength(JSON.stringify(portable.bundle)) <= limit - 32);
  assert.ok(Buffer.byteLength(JSON.stringify({ bundle: portable.bundle })) <= limit);
  assert.deepEqual(restore(JSON.parse(JSON.stringify(portable.bundle))), portable);
  const input = sizedPacket(limit);
  assert.throws(() => buildDeliveryEvidenceReview({ workspaceId: 'ws-a', packet: input }),
    error => error.status === 400 && error.code === 'delivery-evidence-bundle-limit');
  const fixture = harness({ body: { packet: input } });
  await fixture.handlers.review(fixture.params);
  assert.equal(fixture.calls[0].status, 400);
  assert.equal(fixture.calls[0].data.error, 'delivery-evidence-bundle-limit');
  assert.equal(fixture.captures, 0);
  const tooLarge = structuredClone(portable.bundle); tooLarge.packet = input; sealBundle(tooLarge);
  assert.throws(() => restore(tooLarge), error => error.code === 'delivery-evidence-bundle-limit');
});
