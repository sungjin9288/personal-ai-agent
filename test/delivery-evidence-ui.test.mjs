import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createDeliveryReviewController, mountDeliveryReview, renderDeliveryReview } from '../src/web/public/lib/delivery-evidence-review.js';

const packet = { target: { projectId: 'project', sourceRevision: 'a'.repeat(40) }, requirements: [], evidence: [] };
function result(revision = 'a') {
  return {
    workspaceId: 'workspace-a', packet: { ...packet, target: { ...packet.target, sourceRevision: revision.repeat(40) } },
    bindingDigest: revision.repeat(64), review: null, markdown: '# Same report\n',
    report: { status: 'blocked', target: packet.target, requirements: [], unmatchedEvidence: [] },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(api) {
  let workspace = 'workspace-a';
  const downloads = [];
  const controller = createDeliveryReviewController({ api, getWorkspaceId: () => workspace,
    onChange() {}, download: (...args) => downloads.push(args) });
  return { controller, downloads, select(value) { workspace = value; controller.syncWorkspace(); } };
}

test('review HTML shell keeps explicit accessible metadata on every review control', () => {
  const html = readFileSync(new URL('../src/web/public/index.html', import.meta.url), 'utf8');
  const section = /<section\b[^>]*\bid="delivery-review"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  assert.ok(section, 'D3 review section must exist in the actual HTML shell');
  const controls = [...section[1].matchAll(/<(button|input|select|textarea)\b([^>]*)>/g)];
  const expected = [
    { tag: 'button', id: 'delivery-current', name: '현재 기준 읽기', title: '현재 기준 읽기' },
    { tag: 'input', id: 'delivery-file', name: '저장한 검토 JSON 파일 열기' },
    { tag: 'textarea', id: 'delivery-input', name: 'Packet, importer 출력 또는 검토 bundle JSON' },
    { tag: 'button', id: 'delivery-evaluate', name: '증거 판정하기', title: '증거 판정하기' },
    { tag: 'input', id: 'delivery-reviewer', name: '검토자 이름 — 자기 선언' },
    { tag: 'select', id: 'delivery-requirement', name: '요구사항' },
    { tag: 'select', id: 'delivery-kind', name: '메모 종류' },
    { tag: 'input', id: 'delivery-reason', name: '검토 이유와 다음 조치' },
    { tag: 'button', name: '검토 메모 반영', title: '검토 메모 반영' },
    { tag: 'textarea', id: 'delivery-impact-input', name: '선언된 변경 영향 JSON' },
    { tag: 'button', id: 'delivery-impact-apply', name: '변경 영향 반영', title: '변경 영향 반영' },
    { tag: 'button', id: 'delivery-json', name: '현재 결과 JSON 다운로드', title: '현재 결과 JSON 다운로드' },
    { tag: 'button', id: 'delivery-markdown', name: '현재 결과 Markdown 다운로드', title: '현재 결과 Markdown 다운로드' },
  ];
  assert.equal(controls.length, 13, 'Every new control remains part of the accessibility contract');
  const actual = controls.map(([, tag, attributes]) => {
    const values = new Map([...attributes.matchAll(/\b([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
    return { tag, ...(values.has('id') ? { id: values.get('id') } : {}),
      name: values.get('aria-label')?.trim(),
      ...(tag === 'button' ? { title: values.get('title')?.trim() } : {}) };
  });
  assert.deepEqual(actual, expected, 'Each control needs its explicit non-empty name, and each button its non-empty title');
});

function bundledResult() {
  const payload = result();
  payload.review = { reviewer: { name: 'Reviewer', identityAssurance: 'self-declared' },
    entries: [], reviewedAt: '2026-09-28T00:00:00.000Z' };
  payload.impactInput = null;
  payload.impactReport = null;
  payload.bundle = { schemaVersion: 'delivery-review-bundle/v1', workspaceId: payload.workspaceId,
    packet: payload.packet, review: payload.review, impactInput: null, bundleDigest: 'c'.repeat(64) };
  return payload;
}

test('portable bundle restore keeps memo and timestamp and exports only the verified bundle', async () => {
  const payload = bundledResult();
  const sent = [];
  const { controller, downloads } = setup(async (_url, options) => {
    sent.push(JSON.parse(options.body)); return structuredClone(payload);
  });
  controller.setInput(JSON.stringify(payload.bundle));
  await controller.evaluate();
  assert.deepEqual(sent[0], { bundle: payload.bundle });
  await controller.export('json');
  assert.deepEqual(sent[1], { bundle: payload.bundle });
  assert.deepEqual(JSON.parse(downloads[0][0]), payload.bundle);
  assert.equal(controller.state.result.review.reviewedAt, payload.review.reviewedAt);
});

test('legacy reviewed export is never silently reduced to a packet and loses its notes', async () => {
  let calls = 0;
  const { controller } = setup(async () => { calls++; return result(); });
  controller.setInput(JSON.stringify(bundledResult()));
  await controller.evaluate();
  assert.equal(calls, 0);
  assert.match(controller.state.error, /이전.*검토/);
});

test('impact draft blocks export and submitted impact keeps the bound review bundle', async () => {
  const payload = bundledResult(), sent = [];
  const impactInput = { schemaVersion: 'delivery-impact-input/v1', changedPaths: ['test.mjs'] };
  const { controller, downloads } = setup(async (_url, options) => {
    if (options) sent.push(JSON.parse(options.body)); return structuredClone(payload);
  });
  await controller.loadCurrent();
  controller.setImpactInput(JSON.stringify(impactInput));
  await controller.export('json');
  assert.equal(downloads.length, 0);
  await controller.applyImpact();
  assert.deepEqual(sent[0].bundle.impactInput, impactInput);
  assert.deepEqual(sent[0].bundle.review, payload.bundle.review);
  assert.match(sent[0].bundle.bundleDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(sent[0]), ['bundle']);
  assert.equal(controller.state.impactDraftDirty, false);
});

test('invalid impact response preserves recoverable memo until corrected input is verified', async () => {
  const payload = bundledResult(); let calls = 0;
  const sent = [];
  const { controller, downloads } = setup(async (_url, options) => {
    if (options) sent.push(JSON.parse(options.body));
    if (++calls === 2) throw new Error('Invalid impact');
    return structuredClone(payload);
  });
  await controller.loadCurrent();
  controller.setImpactInput('{}');
  await controller.applyImpact();
  assert.equal(controller.state.result.review.reviewedAt, payload.review.reviewedAt);
  assert.equal(controller.state.revalidationRequired, true);
  await controller.export('json');
  assert.equal(downloads.length, 0);
  controller.setImpactInput('');
  await controller.applyImpact();
  assert.equal(sent[1].bundle.impactInput, null);
  assert.deepEqual(sent[1].bundle.review, payload.bundle.review);
  assert.equal(controller.state.revalidationRequired, false);
});

test('large impact replacement sends one graph below the same portable request limit', async () => {
  const payload = bundledResult();
  const impactInput = { graph: 'x'.repeat(600 * 1024) };
  payload.bundle.impactInput = impactInput;
  payload.impactInput = impactInput;
  let sent;
  const { controller } = setup(async (_url, options) => {
    if (options) sent = JSON.parse(options.body);
    return structuredClone(payload);
  });
  await controller.loadCurrent();
  controller.setImpactInput(JSON.stringify(impactInput));
  await controller.applyImpact();
  assert.deepEqual(Object.keys(sent), ['bundle']);
  assert.deepEqual(sent.bundle.impactInput, impactInput);
  assert.ok(new TextEncoder().encode(JSON.stringify(sent)).length < 1024 * 1024);
  assert.equal(controller.state.error, '');
});

test('editing impact or changing workspace suppresses old impact success and failure', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const pending = deferred(), started = deferred(); let calls = 0;
    const { controller, select } = setup(() => {
      if (++calls === 1) return bundledResult();
      started.resolve(); return pending.promise;
    });
    await controller.loadCurrent();
    controller.setImpactInput('{}');
    const applying = controller.applyImpact();
    await started.promise;
    controller.setImpactInput('{"new":"draft"}');
    select('workspace-b'); select('workspace-a');
    pending[outcome](outcome === 'resolve' ? bundledResult() : new Error('old impact error'));
    await applying;
    assert.equal(controller.state.result, null);
    assert.equal(controller.state.error, '');
    assert.equal(controller.state.impactInput, '');
  }
});

test('same-workspace draft edits retain the displayed bundle and suppress pending export or impact responses', async () => {
  for (const method of ['export', 'applyImpact']) {
    for (const outcome of ['resolve', 'reject']) {
      const payload = bundledResult(), pending = deferred(), started = deferred(); let calls = 0;
      const { controller, downloads } = setup(() => {
        if (++calls === 1) return structuredClone(payload);
        started.resolve(); return pending.promise;
      });
      await controller.loadCurrent();
      if (method === 'applyImpact') controller.setImpactInput('{}');
      const updating = method === 'export' ? controller.export('json') : controller.applyImpact();
      await started.promise;
      if (method === 'export') controller.editReviewDraft();
      else controller.setImpactInput('{"new":"draft"}');
      pending[outcome](outcome === 'resolve' ? payload : new Error('old request failure'));
      await updating;
      assert.deepEqual(controller.state.result.bundle, payload.bundle);
      assert.equal(controller.state.result.review.reviewedAt, payload.review.reviewedAt);
      assert.equal(controller.state[method === 'export' ? 'reviewDraftDirty' : 'impactDraftDirty'], true);
      assert.equal(controller.state.busy, false);
      assert.equal(controller.state.error, '');
      assert.equal(downloads.length, 0);
    }
  }
});

test('file restore rejects oversized and invalid UTF8 files without requests', async () => {
  let calls = 0;
  const { controller } = setup(async () => { calls++; return result(); });
  for (const file of [
    { size: 1024 * 1024 + 1, arrayBuffer: () => assert.fail('oversized file must not be read') },
    { size: 1, arrayBuffer: async () => Uint8Array.of(255).buffer },
  ]) {
    await controller.importFile(file);
    assert.equal(controller.state.result, null);
    assert.ok(controller.state.error);
  }
  assert.equal(calls, 0);
});

test('late file read cannot restore a different workspace or overwrite newer input', async () => {
  const pending = deferred(); let calls = 0;
  const { controller, select } = setup(async () => { calls++; return result(); });
  const loading = controller.importFile({ size: 100, arrayBuffer: () => pending.promise });
  select('workspace-b'); select('workspace-a');
  controller.setInput('{"new":"input"}');
  pending.resolve(new TextEncoder().encode(JSON.stringify(bundledResult().bundle)).buffer);
  await loading;
  assert.equal(controller.state.input, '{"new":"input"}');
  assert.equal(calls, 0);
});

test('impact render escapes paths and reasons and does not advertise execution authority', () => {
  const payload = bundledResult();
  payload.impactReport = { status: 'unknown', requirements: [{ id: 'REQ-1', status: 'unknown',
    reasons: ['graph-node-missing'], changedPaths: ['<img src=x>'], unknownPaths: ['<svg>'] }] };
  const html = renderDeliveryReview(payload);
  assert.match(html, /graph-node-missing/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|<svg/);
  assert.match(html, /CI.*생략/);
});

test('new packet invalidates previous review and export even when JSON is malformed', async () => {
  const { controller, downloads } = setup(async () => result());
  await controller.loadCurrent();
  controller.setInput('{');
  assert.equal(controller.state.result, null);
  await controller.evaluate();
  await controller.export('json');
  assert.equal(downloads.length, 0);
  assert.ok(controller.state.error);
});

test('old success, error and finally cannot replace a newer revision request', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const old = deferred(), next = deferred();
    let calls = 0;
    const { controller } = setup(() => (++calls === 1 ? old.promise : next.promise));
    const first = controller.loadCurrent();
    controller.setInput(JSON.stringify(packet));
    const second = controller.evaluate();
    old[outcome](outcome === 'resolve' ? result('a') : new Error('old error'));
    await first;
    assert.equal(controller.state.busy, true);
    assert.equal(controller.state.error, '');
    next.resolve(result('b'));
    await second;
    assert.equal(controller.state.result.bindingDigest, 'b'.repeat(64));
    assert.equal(controller.state.busy, false);
  }
});

test('workspace A to B to A never resurrects an old response', async () => {
  const pending = deferred();
  const { controller, select } = setup(() => pending.promise);
  const request = controller.loadCurrent();
  select('workspace-b'); select('workspace-a');
  pending.resolve(result());
  await request;
  assert.equal(controller.state.result, null);
  assert.equal(controller.state.input, '');
});

test('D2 wrapper report is discarded and only packet goes to the server', async () => {
  const requests = [];
  const { controller } = setup(async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return result(); });
  controller.setInput(JSON.stringify({ packet, report: { status: 'evidence-current', executionAuthorized: true } }));
  await controller.evaluate();
  assert.deepEqual(requests[0].body, { packet });
  assert.equal(controller.state.result.report.status, 'blocked');
});

test('export revalidates source and a stale export never downloads', async () => {
  const pending = deferred();
  let calls = 0;
  const { controller, downloads } = setup(() => ++calls === 1 ? result() : pending.promise);
  await controller.loadCurrent();
  const exporting = controller.export('json');
  controller.setInput(JSON.stringify({ ...packet, evidence: ['changed'] }));
  pending.resolve(result());
  await exporting;
  assert.equal(downloads.length, 0);
});

test('export keeps displayed review timestamp and content after successful revalidation', async () => {
  const displayed = { ...result(), review: { bindingDigest: 'a'.repeat(64), reviewedAt: '2026-09-28T00:00:00Z' } };
  let calls = 0;
  const { controller, downloads } = setup(async () => ++calls === 1 ? displayed : result());
  await controller.loadCurrent();
  await controller.export('json');
  assert.equal(JSON.parse(downloads[0][0]).review.reviewedAt, displayed.review.reviewedAt);
});

test('exception record cannot change the report and draft edits disable export', async () => {
  const responses = [result(), { ...result(), review: { entries: [{ requirementId: 'REQ-1', kind: 'exception-recorded', reason: 'Investigate' }] } }];
  const sent = [];
  const { controller, downloads } = setup(async (url, options) => { if (options) sent.push(JSON.parse(options.body)); return responses.shift(); });
  await controller.loadCurrent();
  controller.editReviewDraft();
  await controller.export('json');
  assert.equal(downloads.length, 0);
  await controller.record({ reviewerName: 'Reviewer', requirementId: 'REQ-1', kind: 'exception-recorded', reason: 'Investigate' });
  assert.equal(sent[0].review.bindingDigest, 'a'.repeat(64));
  assert.equal(controller.state.result.report.status, 'blocked');
});

test('render escapes markup, exposes mismatches and preserves unverified boundaries', () => {
  const payload = result();
  payload.report.requirements = [{ id: 'REQ-1', criterion: '<img src=x onerror=alert(1)>', status: 'blocked', mappingConfirmed: false,
    checks: [{ id: 'check', status: 'stale', currentEvidence: [], excludedEvidence: [{ id: 'EV-1', mismatches: ['sourceRevision'] }] }] }];
  payload.review = { reviewer: { name: '<script>evil</script>' }, entries: [{ requirementId: 'REQ-1', kind: 'exception-recorded', reason: '<svg onload=alert(1)>' }] };
  const html = renderDeliveryReview(payload);
  assert.doesNotMatch(html, /<img|<script|<svg/);
  assert.match(html, /&lt;img/);
  assert.match(html, /sourceRevision/);
  assert.match(html, /unverified/);
  assert.match(html, /not-assessed/);
});

test('re-evaluation clears visible draft fields and recording preserves the selected requirement', async () => {
  const controls = new Map();
  const get = id => {
    if (!controls.has(id)) {
      let html = '';
      controls.set(id, { value: '', addEventListener() {}, focus() {},
        get innerHTML() { return html; },
        set innerHTML(value) { html = value; if (id === 'requirement') this.value = /value="([^"]+)"/.exec(value)?.[1] || ''; },
      });
    }
    return controls.get(id);
  };
  get('record-form').reset = () => { get('reviewer').value = ''; get('reason').value = ''; };
  const payload = result();
  payload.report.requirements = ['REQ-1', 'REQ-2'].map(id => ({ id, criterion: id, checks: [], status: 'blocked' }));
  const controller = mountDeliveryReview({ root: { querySelector: selector => get(selector.slice('#delivery-'.length)), setAttribute() {} },
    api: async () => structuredClone(payload), getWorkspaceId: () => 'workspace-a' });
  await controller.loadCurrent();
  get('reason').value = 'Unrecorded draft';
  controller.editReviewDraft();
  await controller.evaluate();
  assert.equal(get('reason').value, '');
  get('requirement').value = 'REQ-2';
  get('reason').value = 'REQ-2 note';
  await controller.record({ reviewerName: 'Reviewer', requirementId: 'REQ-2', kind: 'mapping-review', reason: 'REQ-2 note' });
  assert.equal(get('requirement').value, 'REQ-2');
  assert.equal(get('reason').value, 'REQ-2 note');
});
