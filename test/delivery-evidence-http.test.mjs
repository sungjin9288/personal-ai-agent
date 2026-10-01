import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createStore } from '../src/core/store.mjs';

function sealBundle(bundle) {
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }
  const { bundleDigest: _digest, ...input } = bundle;
  bundle.bundleDigest = createHash('sha256').update(canonical(input)).digest('hex');
  return bundle;
}

test('actual web routes enforce identity, tenant, role and current revision before review/export', { timeout: 25_000 }, async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-http-test-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'workspace');
  fs.mkdirSync(repo);
  const manifest = { schemaVersion: 'delivery-evidence-manifest/v1', projectId: 'delivery-http',
    requirements: [{ id: 'REQ-1', criterion: '<img src=x onerror=alert(1)> remains text', mappingConfirmed: true }],
    testFiles: ['approval.test.mjs'], configFiles: ['package.json'] };
  fs.writeFileSync(path.join(repo, 'delivery-evidence.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(repo, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(repo, 'approval.test.mjs'), "import test from 'node:test'; test('approval', () => {});\n");
  function git(...args) {
    const run = spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: {
      PATH: process.env.PATH, HOME: repo, GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
      GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
    } });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout.trim();
  }
  git('init', '--quiet');
  git('add', 'delivery-evidence.json', 'package.json', 'approval.test.mjs');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'synthetic test source');
  createStore({ rootDir: root }).saveWorkspace({ id: 'workspace-a', name: 'Delivery test', path: repo, tenantId: 'tenant-a' });

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), alg: 'RS256', kid: 'delivery-test', use: 'sig' };
  const jwks = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  jwks.listen(0, '127.0.0.1');
  await once(jwks, 'listening');
  t.after(() => new Promise(resolve => jwks.close(resolve)));
  function token(role, tenant = 'tenant-a') {
    const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${b64({ alg: 'RS256', kid: jwk.kid })}.${b64({
      iss: 'https://delivery.example.invalid', aud: 'delivery-test', sub: 'synthetic-reviewer', role,
      tenant_id: tenant, exp: Math.floor(Date.now() / 1000) + 120,
    })}`;
    return `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
  }
  const server = spawn(process.execPath, ['src/web/server.mjs'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], env: {
    PATH: process.env.PATH, PERSONAL_AI_AGENT_ROOT: root, PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: '0', PERSONAL_AI_AGENT_RBAC_MODE: 'enforce', PERSONAL_AI_AGENT_WEB_AUTH_MODE: 'oidc',
    PERSONAL_AI_AGENT_TENANT_MODE: 'enforce', PERSONAL_AI_AGENT_OIDC_ISSUER: 'https://delivery.example.invalid',
    PERSONAL_AI_AGENT_OIDC_AUDIENCE: 'delivery-test', PERSONAL_AI_AGENT_OIDC_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/jwks`,
  } });
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited;
    }
  });
  const discovery = path.join(root, 'var/server.json');
  for (let attempt = 0; !fs.existsSync(discovery) && attempt < 100; attempt++) await delay(30);
  assert.ok(fs.existsSync(discovery), output);
  const base = JSON.parse(fs.readFileSync(discovery)).url;
  const endpoint = `${base}/api/workspaces/workspace-a/delivery-evidence`;
  const call = async (jwt, body, headers = {}) => {
    const response = await fetch(endpoint, { method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, payload: await response.json() };
  };
  assert.equal((await call('invalid')).status, 401);
  const foreign = await call(token('admin', 'tenant-b'), { packet: {} }, { 'x-personal-ai-agent-tenant': 'tenant-a' });
  assert.equal(foreign.status, 403);
  assert.equal(foreign.payload.error, 'tenant-forbidden');
  assert.equal((await call(token('viewer'), { packet: {} }, { 'x-personal-ai-agent-role': 'admin' })).status, 403);

  const loaded = await call(token('operator'));
  assert.equal(loaded.status, 200);
  assert.equal(loaded.payload.report.status, 'blocked');

  let collectedPacket, collectedReview, collectedBundle;
  await t.test('real Node receipt flows through importer and HTTP review into a bound export', async () => {
    const reporter = fileURLToPath(new URL('../scripts/delivery-node-test-reporter.mjs', import.meta.url));
    const receipt = spawnSync(process.execPath, ['--test', '--test-concurrency=4',
      `--test-reporter=${reporter}`, 'approval.test.mjs'], {
      cwd: repo, encoding: 'utf8', timeout: 15_000, env: { PATH: process.env.PATH },
    });
    assert.equal(receipt.status, 0, receipt.stderr);
    const receiptData = JSON.parse(receipt.stdout);
    assert.equal(receiptData.summary.passed, 1);
    const receiptPath = path.join(root, 'receipt.json');
    fs.writeFileSync(receiptPath, receipt.stdout);
    const importer = fileURLToPath(new URL('../scripts/import-delivery-evidence.mjs', import.meta.url));
    const imported = spawnSync(process.execPath, [importer, '--repo', repo, '--receipt', receiptPath], {
      encoding: 'utf8', timeout: 15_000, env: { PATH: process.env.PATH },
    });
    assert.equal(imported.status, 0, imported.stderr);
    const result = JSON.parse(imported.stdout);
    collectedPacket = result.packet;
    assert.deepEqual(collectedPacket.target, loaded.payload.packet.target);
    assert.deepEqual(collectedPacket.requirements, loaded.payload.packet.requirements);
    assert.equal((await call(token('viewer'), { packet: collectedPacket })).status, 403);

    const evaluated = await call(token('operator'), { packet: collectedPacket });
    assert.equal(evaluated.status, 200);
    assert.deepEqual(evaluated.payload.report, result.report);
    collectedReview = { bindingDigest: evaluated.payload.bindingDigest, reviewerName: 'Synthetic reviewer',
      entries: [{ requirementId: 'REQ-1', kind: 'mapping-review', reason: 'Native suite receipt reviewed; mapping remains self-declared.' }] };
    const exported = await call(token('operator'), { packet: collectedPacket, review: collectedReview });
    assert.equal(exported.status, 200);
    assert.deepEqual(exported.payload.packet, collectedPacket);
    assert.deepEqual(exported.payload.report, result.report);
    assert.equal(exported.payload.review.sourceRevision, receiptData.source.target.sourceRevision);
    assert.equal(exported.payload.review.bindingDigest, collectedReview.bindingDigest);
    assert.deepEqual(exported.payload.review.entries, collectedReview.entries);
    assert.equal(exported.payload.review.reviewer.identityAssurance, 'self-declared');
    assert.equal(exported.payload.report.status, 'evidence-current');
    assert.equal(exported.payload.report.evidenceAuthenticity, 'unverified');
    assert.equal(exported.payload.report.executionAuthorized, false);
    assert.equal(exported.payload.report.productionReadyClaim, false);
    assert.ok(exported.payload.markdown.includes('상태: evidence-current'));
    assert.ok(exported.payload.markdown.includes(collectedPacket.target.sourceRevision));
    assert.ok(exported.payload.markdown.includes(collectedReview.bindingDigest));
    assert.ok(exported.payload.markdown.includes('Native suite receipt reviewed; mapping remains self\\-declared\\.'));
    assert.doesNotMatch(exported.payload.markdown, /<img/);
    assert.equal(git('status', '--porcelain'), '');

    collectedBundle = JSON.parse(JSON.stringify(exported.payload.bundle));
    const restored = await call(token('operator'), { bundle: collectedBundle });
    assert.equal(restored.status, 200);
    assert.deepEqual(restored.payload, exported.payload);
    assert.equal((await call(token('viewer'), { bundle: collectedBundle })).status, 403);
    assert.equal((await call(token('admin', 'tenant-b'), { bundle: collectedBundle })).status, 403);

    const baseRevision = 'a'.repeat(40);
    const criterionDigest = createHash('sha256').update(collectedPacket.requirements[0].criterion).digest('hex');
    const impact = {
      schemaVersion: 'delivery-impact-input/v1', target: { ...collectedPacket.target, baseRevision }, changedPaths: [],
      graph: [{ path: 'approval.test.mjs', dependencies: ['package.json'], complete: true },
        { path: 'package.json', dependencies: [], complete: true }],
      requirements: [{ id: 'REQ-1', criterionDigest, roots: ['approval.test.mjs'], mapping: {
        projectId: collectedPacket.target.projectId, sourceRevision: baseRevision, criterionDigest, confirmed: true,
      } }],
    };
    for (const [status, mutate] of [
      ['no-declared-impact', () => {}],
      ['recheck-required', value => { value.changedPaths = ['package.json']; }],
      ['unknown', value => { value.graph[1].complete = false; }],
    ]) {
      const impactInput = structuredClone(impact); mutate(impactInput);
      const impacted = await call(token('operator'), { bundle: collectedBundle, impactInput });
      assert.equal(impacted.status, 200);
      assert.equal(impacted.payload.impactReport.status, status);
      assert.deepEqual(impacted.payload.report, exported.payload.report);
      assert.deepEqual(impacted.payload.review, exported.payload.review);
      assert.equal(impacted.payload.bindingDigest, exported.payload.bindingDigest);
      assert.equal(impacted.payload.impactReport.ciSkipAuthorized, false);
      assert.equal(impacted.payload.impactReport.evidenceReuseAuthorized, false);
      const roundtrip = await call(token('operator'), { bundle: impacted.payload.bundle });
      assert.equal(roundtrip.status, 200);
      assert.deepEqual(roundtrip.payload, impacted.payload);
    }
    for (const mutate of [
      value => { value.target.projectId = 'foreign'; },
      value => { value.target.sourceRevision = 'f'.repeat(40); },
      value => { value.requirements[0].criterionDigest = 'f'.repeat(64); },
      value => { value.requirements[0].id = 'UNKNOWN'; },
    ]) {
      const impactInput = structuredClone(impact); mutate(impactInput);
      const rejected = await call(token('operator'), { bundle: collectedBundle, impactInput });
      assert.equal(rejected.status, 409);
      assert.equal(rejected.payload.error, 'delivery-evidence-impact-binding-mismatch');
    }
    const forged = structuredClone(collectedBundle); forged.review.entries[0].reason = 'forged memo';
    const badDigest = await call(token('operator'), { bundle: forged });
    assert.equal(badDigest.status, 409);
    assert.equal(badDigest.payload.error, 'delivery-evidence-bundle-digest-mismatch');
    sealBundle(forged); forged.review.bindingDigest = 'f'.repeat(64); sealBundle(forged);
    const badBinding = await call(token('operator'), { bundle: forged });
    assert.equal(badBinding.status, 409);
    assert.equal(badBinding.payload.error, 'delivery-evidence-review-binding-mismatch');
    const foreignBundle = structuredClone(collectedBundle); foreignBundle.workspaceId = 'foreign'; sealBundle(foreignBundle);
    assert.equal((await call(token('operator'), { bundle: foreignBundle })).status, 409);
    for (const body of [
      { bundle: collectedBundle, packet: collectedPacket },
      { bundle: collectedBundle, review: collectedReview },
      { bundle: { ...collectedBundle, report: { status: 'evidence-current' } } },
      { bundle: collectedBundle, impactReport: { status: 'no-declared-impact' } },
    ]) assert.equal((await call(token('operator'), body)).status, 400);
    assert.equal(git('status', '--porcelain'), '');
  });

  const packet = loaded.payload.packet;
  const requirement = packet.requirements[0], check = requirement.checks[0];
  packet.evidence.push({ id: 'EV-1', ...packet.target, requirementId: requirement.id, checkId: check.id,
    definitionDigest: check.definitionDigest, environmentId: check.environmentId,
    criterionDigest: createHash('sha256').update(requirement.criterion).digest('hex'), result: 'failed' });
  const evaluated = await call(token('operator'), { packet });
  assert.equal(evaluated.status, 200);
  const review = { bindingDigest: evaluated.payload.bindingDigest, reviewerName: 'Synthetic reviewer',
    entries: [{ requirementId: 'REQ-1', kind: 'exception-recorded', reason: '<svg onload=alert(1)> investigate failure' }] };
  const reviewed = await call(token('operator'), { packet, review });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.payload.report.status, 'blocked');
  assert.equal(reviewed.payload.review.reviewer.identityAssurance, 'self-declared');
  assert.equal(reviewed.payload.report.executionAuthorized, false);
  assert.doesNotMatch(reviewed.payload.markdown, /<svg|<img/);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal((await call(token('operator'), { packet, report: { status: 'evidence-current' } })).status, 400);

  manifest.requirements[0].criterion = 'Changed requirement';
  fs.writeFileSync(path.join(repo, 'delivery-evidence.json'), JSON.stringify(manifest));
  assert.equal((await call(token('operator'), { packet })).status, 409);
  assert.equal((await call(token('operator'), { bundle: collectedBundle })).status, 409);
  git('add', 'delivery-evidence.json');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'second synthetic revision');
  assert.equal((await call(token('operator'), { packet, review })).status, 409);
  assert.equal((await call(token('operator'), { packet: collectedPacket, review: collectedReview })).status, 409);
  const staleBundle = await call(token('operator'), { bundle: collectedBundle });
  assert.equal(staleBundle.status, 409);
  assert.equal(staleBundle.payload.error, 'delivery-evidence-source-mismatch');
  const next = await call(token('operator'));
  assert.notEqual(next.payload.packet.target.sourceRevision, packet.target.sourceRevision);
  assert.equal((await call(token('operator'), { packet: next.payload.packet, review })).status, 409);
  assert.equal((await call(token('operator'), { packet: next.payload.packet, review: collectedReview })).status, 409);
});
