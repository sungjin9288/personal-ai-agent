import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { evaluateDeliveryImpact } from '../src/core/delivery-evidence-impact.mjs';

const MAX_INPUT_BYTES = 1024 * 1024;

function inputPacket() {
  return {
    schemaVersion: 'delivery-impact-input/v1',
    target: { projectId: 'purchasing', baseRevision: 'a'.repeat(40), sourceRevision: 'b'.repeat(40) },
    changedPaths: ['docs/unrelated.md'],
    graph: [
      { path: 'test/approval.test.mjs', dependencies: ['src/approval.mjs', 'config/policy.json'], complete: true },
      { path: 'src/approval.mjs', dependencies: ['src/permissions.mjs'], complete: true },
      { path: 'src/permissions.mjs', dependencies: [], complete: true },
      { path: 'config/policy.json', dependencies: [], complete: true },
      { path: 'docs/unrelated.md', dependencies: [], complete: true },
    ],
    requirements: [{
      id: 'REQ-1', criterionDigest: 'c'.repeat(64), roots: ['test/approval.test.mjs'],
      mapping: {
        projectId: 'purchasing', sourceRevision: 'a'.repeat(40), criterionDigest: 'c'.repeat(64), confirmed: true,
      },
    }],
  };
}

function row(input) {
  return evaluateDeliveryImpact(input).requirements[0];
}

function cli(input, args = []) {
  return spawnSync(process.execPath, ['scripts/check-delivery-impact.mjs', ...args], {
    input: typeof input === 'string' || Buffer.isBuffer(input) ? input : JSON.stringify(input),
    encoding: 'utf8', timeout: 10_000, maxBuffer: 4 * MAX_INPUT_BYTES,
  });
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

test('known unrelated change only establishes no declared impact without reuse or execution authority', () => {
  const input = inputPacket();
  const report = evaluateDeliveryImpact(input);
  assert.equal(report.schemaVersion, 'delivery-impact-report/v1');
  assert.deepEqual(report.target, input.target);
  assert.equal(report.status, 'no-declared-impact');
  assert.equal(report.verificationScope, 'declared-dependencies-only');
  assert.equal(report.mappingTrust, 'self-declared');
  for (const field of ['evidenceReuseAuthorized', 'ciSkipAuthorized', 'executionAuthorized', 'productionReadyClaim']) {
    assert.equal(report[field], false);
  }
  assert.deepEqual(report.requirements, [{
    id: 'REQ-1', status: 'no-declared-impact', reasons: ['no-declared-dependency-changed'],
    changedPaths: [], unknownPaths: [],
  }]);
});

for (const changedPath of ['test/approval.test.mjs', 'src/approval.mjs', 'src/permissions.mjs', 'config/policy.json']) {
  test(`declared reachable change ${changedPath} requires rechecking`, () => {
    const input = inputPacket();
    input.changedPaths = [changedPath];
    assert.deepEqual(row(input), {
      id: 'REQ-1', status: 'recheck-required', reasons: ['declared-dependency-changed'],
      changedPaths: [changedPath], unknownPaths: [],
    });
    assert.equal(evaluateDeliveryImpact(input).status, 'recheck-required');
  });
}

test('empty change set is not evidence-current and still requires a valid mapping and graph', () => {
  const input = inputPacket();
  input.changedPaths = [];
  assert.equal(row(input).status, 'no-declared-impact');
  input.requirements[0].mapping = null;
  assert.deepEqual(row(input).reasons, ['mapping-missing']);
  assert.equal(row(input).status, 'unknown');
});

test('a changed path absent from the declared graph is unknown for every requirement', () => {
  const input = inputPacket();
  input.changedPaths = ['src/new-module.mjs'];
  input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-2', roots: ['docs/unrelated.md'] });
  const report = evaluateDeliveryImpact(input);
  assert.equal(report.status, 'unknown');
  for (const requirement of report.requirements) {
    assert.deepEqual(requirement.reasons, ['changed-path-unmodeled']);
    assert.deepEqual(requirement.unknownPaths, ['src/new-module.mjs']);
    assert.deepEqual(requirement.changedPaths, []);
  }
});

test('a missing transitive node is unknown instead of unrelated', () => {
  const input = inputPacket();
  input.graph = input.graph.filter(node => node.path !== 'src/permissions.mjs');
  assert.deepEqual(row(input), {
    id: 'REQ-1', status: 'unknown', reasons: ['graph-node-missing'],
    changedPaths: [], unknownPaths: ['src/permissions.mjs'],
  });
});

test('a missing root remains unknown even with no changes', () => {
  const input = inputPacket();
  input.changedPaths = [];
  input.requirements[0].roots = ['test/unknown.test.mjs'];
  assert.deepEqual(row(input).unknownPaths, ['test/unknown.test.mjs']);
  assert.deepEqual(row(input).reasons, ['graph-node-missing']);
  assert.equal(row(input).status, 'unknown');
});

test('an incomplete reachable node does not authorize a no-impact or recheck-only conclusion', () => {
  const input = inputPacket();
  input.graph.find(node => node.path === 'src/approval.mjs').complete = false;
  input.changedPaths = ['config/policy.json'];
  assert.deepEqual(row(input), {
    id: 'REQ-1', status: 'unknown', reasons: ['graph-node-incomplete'],
    changedPaths: ['config/policy.json'], unknownPaths: ['src/approval.mjs'],
  });
});

test('incompleteness outside a requirement reachable graph does not hide a known unrelated change', () => {
  const input = inputPacket();
  input.graph.find(node => node.path === 'docs/unrelated.md').complete = false;
  assert.equal(row(input).status, 'no-declared-impact');
});

for (const [field, value, reason] of [
  ['confirmed', false, 'mapping-unconfirmed'],
  ['projectId', 'foreign-project', 'mapping-project-mismatch'],
  ['sourceRevision', 'd'.repeat(40), 'mapping-revision-mismatch'],
  ['sourceRevision', 'b'.repeat(40), 'mapping-revision-mismatch'],
  ['criterionDigest', 'd'.repeat(64), 'mapping-criterion-mismatch'],
]) {
  test(`mapping ${field} mismatch remains unknown even with a declared reachable change (${reason})`, () => {
    const input = inputPacket();
    input.changedPaths = ['src/permissions.mjs'];
    input.requirements[0].mapping[field] = value;
    assert.deepEqual(row(input), {
      id: 'REQ-1', status: 'unknown', reasons: [reason],
      changedPaths: ['src/permissions.mjs'], unknownPaths: [],
    });
  });
}

test('a new requirement with no baseline mapping never inherits a previous no-impact result', () => {
  const input = inputPacket();
  input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-new', mapping: null });
  const report = evaluateDeliveryImpact(input);
  assert.deepEqual(report.requirements.map(requirement => requirement.status), ['no-declared-impact', 'unknown']);
  assert.deepEqual(report.requirements[1].reasons, ['mapping-missing']);
  assert.equal(report.status, 'unknown');
});

test('cycles and self-links terminate while retaining reachable config changes', () => {
  const input = inputPacket();
  input.graph.find(node => node.path === 'src/permissions.mjs').dependencies = [
    'src/permissions.mjs', 'test/approval.test.mjs',
  ];
  input.changedPaths = ['config/policy.json'];
  assert.equal(row(input).status, 'recheck-required');
  assert.deepEqual(row(input).changedPaths, ['config/policy.json']);
});

test('all reasons and paths are deduplicated and sorted independently of array order', () => {
  const input = inputPacket();
  input.changedPaths = ['z/unmodeled.mjs', 'src/approval.mjs', 'a/unmodeled.mjs', 'config/policy.json'];
  input.graph.find(node => node.path === 'src/approval.mjs').complete = false;
  input.graph.find(node => node.path === 'src/permissions.mjs').dependencies = ['z/missing.mjs', 'a/missing.mjs'];
  input.requirements[0].roots.push('config/policy.json');
  input.requirements[0].mapping = null;
  input.requirements.push({ ...structuredClone(input.requirements[0]), id: 'REQ-0' });
  const forward = evaluateDeliveryImpact(input);
  input.changedPaths.reverse();
  input.graph.reverse();
  for (const node of input.graph) node.dependencies.reverse();
  input.requirements.reverse();
  for (const requirement of input.requirements) requirement.roots.reverse();
  assert.deepEqual(evaluateDeliveryImpact(input), forward);
  assert.deepEqual(forward.requirements.map(requirement => requirement.id), ['REQ-0', 'REQ-1']);
  assert.deepEqual(forward.requirements[0].reasons, [
    'changed-path-unmodeled', 'graph-node-incomplete', 'graph-node-missing', 'mapping-missing',
  ]);
  assert.deepEqual(forward.requirements[0].changedPaths, ['config/policy.json', 'src/approval.mjs']);
  assert.deepEqual(forward.requirements[0].unknownPaths, [
    'a/missing.mjs', 'a/unmodeled.mjs', 'src/approval.mjs', 'z/missing.mjs', 'z/unmodeled.mjs',
  ]);
});

test('pure evaluation accepts deep-frozen input and output shares no mutable references', () => {
  const input = deepFreeze(inputPacket());
  const before = structuredClone(input);
  const report = evaluateDeliveryImpact(input);
  assert.deepEqual(evaluateDeliveryImpact(input), report);
  report.target.projectId = 'output-only';
  report.requirements[0].reasons.push('output-only');
  report.requirements[0].changedPaths.push('output-only');
  report.requirements[0].unknownPaths.push('output-only');
  report.requirements.push({ id: 'output-only' });
  assert.deepEqual(input, before);
});

test('full SHA-256 revisions and ordinary UTF-8 relative file identifiers are supported', () => {
  const input = inputPacket();
  input.target.baseRevision = 'e'.repeat(64);
  input.target.sourceRevision = 'f'.repeat(64);
  input.requirements[0].mapping.sourceRevision = input.target.baseRevision;
  input.changedPaths = ['docs/검토 기록.md'];
  input.graph.push({ path: input.changedPaths[0], dependencies: [], complete: true });
  assert.equal(row(input).status, 'no-declared-impact');
});

test('maximum allowed graph depth is traversed iteratively', () => {
  const input = inputPacket();
  input.graph = Array.from({ length: 1000 }, (_, index) => ({
    path: `src/node-${index}.mjs`, dependencies: index === 999 ? [] : [`src/node-${index + 1}.mjs`], complete: true,
  }));
  input.requirements[0].roots = ['src/node-0.mjs'];
  input.changedPaths = ['src/node-999.mjs'];
  assert.equal(row(input).status, 'recheck-required');
});

test('IDs, revisions and digests reject final line terminators rather than matching before them', () => {
  for (const append of [
    input => { input.target.projectId += '\n'; },
    input => { input.target.baseRevision += '\r'; },
    input => { input.target.sourceRevision += '\u2028'; },
    input => { input.requirements[0].id += '\n'; },
    input => { input.requirements[0].criterionDigest += '\n'; },
    input => { input.requirements[0].mapping.projectId += '\n'; },
    input => { input.requirements[0].mapping.sourceRevision += '\n'; },
    input => { input.requirements[0].mapping.criterionDigest += '\n'; },
  ]) {
    const input = inputPacket();
    append(input);
    assert.throws(() => evaluateDeliveryImpact(input), /Invalid delivery impact/);
  }
});

const invalidContracts = [
  ['unknown input field', input => { input.executionAuthorized = true; }],
  ['schema', input => { input.schemaVersion = 'other/v1'; }],
  ['unknown target field', input => { input.target.repo = '/private'; }],
  ['project ID', input => { input.target.projectId = 'not an ID'; }],
  ['short base revision', input => { input.target.baseRevision = 'aaaa'; }],
  ['uppercase source revision', input => { input.target.sourceRevision = 'B'.repeat(40); }],
  ['empty requirements', input => { input.requirements = []; }],
  ['too many requirements', input => { input.requirements = Array(101).fill(input.requirements[0]); }],
  ['duplicate requirement IDs', input => { input.requirements.push(structuredClone(input.requirements[0])); }],
  ['unknown requirement field', input => { input.requirements[0].confirmed = true; }],
  ['invalid requirement ID', input => { input.requirements[0].id = ''; }],
  ['criterion digest', input => { input.requirements[0].criterionDigest = 'c'.repeat(40); }],
  ['empty roots', input => { input.requirements[0].roots = []; }],
  ['too many roots', input => { input.requirements[0].roots = Array(101).fill('src/a.mjs'); }],
  ['duplicate roots', input => { input.requirements[0].roots.push(input.requirements[0].roots[0]); }],
  ['missing mapping', input => { delete input.requirements[0].mapping; }],
  ['unknown mapping field', input => { input.requirements[0].mapping.id = 'mapping'; }],
  ['mapping boolean', input => { input.requirements[0].mapping.confirmed = 'true'; }],
  ['mapping project ID', input => { input.requirements[0].mapping.projectId = null; }],
  ['mapping revision', input => { input.requirements[0].mapping.sourceRevision = 'bad'; }],
  ['mapping digest', input => { input.requirements[0].mapping.criterionDigest = 'bad'; }],
  ['graph type', input => { input.graph = {}; }],
  ['too many graph nodes', input => { input.graph = Array(1001).fill(input.graph[0]); }],
  ['duplicate graph paths', input => { input.graph.push(structuredClone(input.graph[0])); }],
  ['unknown graph field', input => { input.graph[0].inferred = true; }],
  ['complete boolean', input => { input.graph[0].complete = 1; }],
  ['dependencies type', input => { input.graph[0].dependencies = 'src/a.mjs'; }],
  ['too many dependencies', input => { input.graph[0].dependencies = Array(101).fill('src/a.mjs'); }],
  ['duplicate dependency links', input => { input.graph[0].dependencies.push(input.graph[0].dependencies[0]); }],
  ['changedPaths type', input => { input.changedPaths = null; }],
  ['too many changed paths', input => { input.changedPaths = Array(1001).fill('src/a.mjs'); }],
  ['duplicate changed paths', input => { input.changedPaths.push(input.changedPaths[0]); }],
];

for (const [name, mutate] of invalidContracts) {
  test(`invalid ${name} fails closed without echoing private values`, () => {
    const input = inputPacket();
    mutate(input);
    assert.throws(() => evaluateDeliveryImpact(input), { message: /^Invalid delivery impact: [A-Za-z.-]+\.$/ });
  });
}

for (const path of [
  '', '.', '..', './src/a.mjs', 'src/../a.mjs', 'src/./a.mjs', '/private/a.mjs',
  'src//a.mjs', 'src/a.mjs/', 'C:/private/a.mjs', 'C:\\private\\a.mjs', '\\\\host\\share',
  'src\\a.mjs', 'https://example.test/a', ' src/a.mjs', 'src/a.mjs ',
  'src/secret\u0000.mjs', 'src/secret\n.mjs', 'src/secret\u202e.mjs', 'a'.repeat(513),
]) {
  test(`invalid relative path ${JSON.stringify(path)} is rejected in every path-bearing field`, () => {
    for (const mutate of [
      input => { input.changedPaths = [path]; },
      input => { input.graph[0].path = path; },
      input => { input.graph[0].dependencies = [path]; },
      input => { input.requirements[0].roots = [path]; },
    ]) {
      const input = inputPacket();
      mutate(input);
      assert.throws(() => evaluateDeliveryImpact(input), /Invalid delivery impact/);
    }
  });
}

test('empty declared graph is accepted but its missing roots and unmodeled change are unknown', () => {
  const input = inputPacket();
  input.graph = [];
  assert.equal(row(input).status, 'unknown');
  assert.deepEqual(row(input).reasons, ['changed-path-unmodeled', 'graph-node-missing']);
});

test('CLI JSON equals the pure report and has exit 0 only for all no-declared-impact requirements', () => {
  const input = inputPacket();
  const result = cli(input);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), evaluateDeliveryImpact(input));
});

test('CLI emits valid report and exit 2 for both recheck and unknown, with no stderr', () => {
  const input = inputPacket();
  for (const [path, status] of [['config/policy.json', 'recheck-required'], ['src/new.mjs', 'unknown']]) {
    input.changedPaths = [path];
    const result = cli(input);
    assert.equal(result.status, 2);
    assert.equal(result.stderr, '');
    assert.equal(JSON.parse(result.stdout).status, status);
  }
});

test('CLI rejects arguments without outputting private argument values', () => {
  for (const args of [['--format', 'json'], ['--output', 'PRIVATE-OUTPUT'], ['PRIVATE-ARGUMENT']]) {
    const result = cli(inputPacket(), args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Expected no arguments/);
    assert.doesNotMatch(result.stderr, /PRIVATE/);
  }
});

test('CLI rejects empty, malformed JSON and invalid UTF-8 without reflecting their contents', () => {
  for (const input of ['', '{"private":"PRIVATE-SECRET"', Buffer.from([0xc3, 0x28])]) {
    const result = cli(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /valid UTF-8 JSON/);
    assert.doesNotMatch(result.stderr, /PRIVATE/);
  }
});

test('CLI rejects invalid contracts without copying private values or field names', () => {
  const input = inputPacket();
  input['PRIVATE-FIELD'] = 'PRIVATE-SECRET';
  const result = cli(input);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Invalid delivery impact: input/);
  assert.doesNotMatch(result.stderr, /PRIVATE/);
});

test('CLI UTF-8 byte limit permits exactly 1 MiB and rejects one byte more', () => {
  const input = JSON.stringify(inputPacket());
  const exact = input + ' '.repeat(MAX_INPUT_BYTES - Buffer.byteLength(input));
  const allowed = cli(exact);
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stderr, '');
  const refused = cli(exact + ' ');
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /exceeds 1 MiB/);
});
