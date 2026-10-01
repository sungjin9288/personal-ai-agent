import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/prepare-delivery-evidence-practice.mjs', import.meta.url));
const run = (args = [], env = {}) => spawnSync(process.execPath, [script, ...args], {
  cwd: os.tmpdir(), encoding: 'utf8', timeout: 30_000,
  env: { PATH: process.env.PATH, ...env },
});

test('practice help and invalid options cannot create a workspace or accept a target path', () => {
  const help = run(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /synthetic/);
  for (const args of [['--repo', 'DO-NOT-ECHO'], ['--output', 'DO-NOT-ECHO'], ['--serve']]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /DO-NOT-ECHO|Partial practice/);
  }
});

test('failed preparation retains only its new partial directory and reports the failed stage', t => {
  const result = run([], { PATH: '' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /failed at fixture-git/);
  const root = result.stderr.match(/Partial practice preserved: (.+)\n/)[1];
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.ok(path.basename(root).startsWith('paa-delivery-practice-'));
  assert.ok(fs.existsSync(path.join(root, 'workspace/approval.test.mjs')));
  assert.equal(fs.existsSync(path.join(root, 'start.mjs')), false);
});

test('practice prepares native evidence and serves current missing stale packets in an isolated runtime', { timeout: 45_000 }, async t => {
  const result = run([], { GIT_DIR: '/invalid-inherited-git-dir', PERSONAL_AI_AGENT_ROOT: '/invalid-inherited-runtime',
    OPENAI_API_KEY: 'DO-NOT-COPY-SECRET', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/invalid-hooks' });
  assert.equal(result.status, 0, result.stderr);
  const practice = JSON.parse(result.stdout);
  let server;
  t.after(async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
    }
    fs.rmSync(practice.rootDir, { recursive: true, force: true });
  });
  assert.equal(fs.realpathSync(practice.rootDir), practice.rootDir);
  const read = name => fs.readFileSync(path.join(practice.rootDir, name), 'utf8');
  const json = name => JSON.parse(read(name));
  assert.deepEqual(json('receipt.json').summary, {
    tests: 3, passed: 3, failed: 0, cancelled: 0, skipped: 0, todo: 0, success: true,
  });
  const git = spawnSync('git', ['status', '--porcelain'], {
    cwd: practice.workspace.path, env: { PATH: process.env.PATH }, encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);
  assert.equal(git.stdout, '');
  const remotes = spawnSync('git', ['remote'], { cwd: practice.workspace.path, encoding: 'utf8' });
  assert.equal(remotes.stdout, '');
  assert.match(read('GUIDE.md'), /synthetic/);
  assert.match(read('assessment.md'), /미실시/);
  assert.match(read('assessment.md'), /정답 사전 열람/);
  assert.doesNotMatch(read('start.mjs') + read('GUIDE.md') + read('assessment.md'), /DO-NOT-COPY-SECRET/);
  assert.equal(json('imported.json').report.status, 'evidence-current');
  const packets = ['case-01.json', 'case-02.json', 'case-03.json'].map(json);
  assert.ok(packets.every(packet => packet.target.sourceRevision === packets[0].target.sourceRevision));
  assert.deepEqual(packets[1].evidence, []);
  assert.notEqual(packets[2].evidence[0].sourceRevision, packets[0].target.sourceRevision);

  server = spawn(process.execPath, [path.join(practice.rootDir, 'start.mjs')], {
    cwd: os.tmpdir(), env: { PATH: process.env.PATH, PERSONAL_AI_AGENT_UI_HOST: '0.0.0.0',
      PERSONAL_AI_AGENT_UI_PORT: '1', PERSONAL_AI_AGENT_WEB_AUTH_MODE: 'oidc', OPENAI_API_KEY: 'DO-NOT-COPY-SECRET' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  const discoveryPath = path.join(practice.rootDir, 'runtime/var/server.json');
  while (!fs.existsSync(discoveryPath)) {
    assert.equal(server.exitCode, null, output);
    assert.equal(server.signalCode, null, output);
    await delay(30, undefined, { signal: t.signal });
  }
  const discovery = JSON.parse(fs.readFileSync(discoveryPath));
  assert.equal(discovery.host, '127.0.0.1');
  assert.equal(discovery.requestedPort, 0);
  assert.equal(discovery.rootDir, path.join(practice.rootDir, 'runtime'));
  const endpoint = `${discovery.url}/api/workspaces/${practice.workspace.id}/delivery-evidence`;
  for (const [index, expected] of ['evidence-current', 'blocked', 'blocked'].entries()) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ packet: packets[index] }), signal: t.signal });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.report.status, expected);
    assert.equal(body.report.requirements[0].checks[0].status, ['current', 'missing', 'stale'][index]);
    assert.equal(body.report.executionAuthorized, false);
    assert.equal(body.report.productionReadyClaim, false);
  }
  const impactResponse = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packet: packets[0], impactInput: json('impact.json') }), signal: t.signal });
  assert.equal(impactResponse.status, 200);
  assert.equal((await impactResponse.json()).impactReport.status, 'recheck-required');
  const state = json('runtime/var/state.json');
  for (const key of ['missions', 'agentRuns', 'providerProbes', 'executionSessions']) assert.deepEqual(state[key], []);
  const finalGit = spawnSync('git', ['status', '--porcelain'], { cwd: practice.workspace.path, encoding: 'utf8' });
  assert.equal(finalGit.status, 0);
  assert.equal(finalGit.stdout, '');
  const finalHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: practice.workspace.path, encoding: 'utf8' });
  assert.equal(finalHead.stdout.trim(), packets[0].target.sourceRevision);
  const exited = once(server, 'exit');
  server.kill('SIGTERM');
  await exited;
  assert.throws(() => process.kill(discovery.pid, 0), { code: 'ESRCH' });
});
