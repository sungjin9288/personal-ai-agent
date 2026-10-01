const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const REVISION = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

function requireValue(condition, field) {
  if (!condition) throw new Error(`Invalid delivery impact: ${field}.`);
}

function exactKeys(value, keys, field) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), field);
  requireValue(Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
}

function matches(value, pattern, field) {
  requireValue(typeof value === 'string' && pattern.test(value), field);
}

function array(value, min, max, field) {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, field);
}

function relativePath(value, field) {
  requireValue(
    typeof value === 'string' && value.length >= 1 && value.length <= 512 && value.trim() === value &&
    !/[\\:\p{Cc}\p{Cf}\p{Cs}]/u.test(value) &&
    value.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..'),
    field,
  );
}

function paths(value, min, max, field) {
  array(value, min, max, field);
  const seen = new Set();
  for (const path of value) {
    relativePath(path, `${field}.path`);
    requireValue(!seen.has(path), `${field}.duplicate-path`);
    seen.add(path);
  }
}

function validateInput(input) {
  exactKeys(input, ['schemaVersion', 'target', 'changedPaths', 'graph', 'requirements'], 'input');
  requireValue(input.schemaVersion === 'delivery-impact-input/v1', 'schemaVersion');
  exactKeys(input.target, ['projectId', 'baseRevision', 'sourceRevision'], 'target');
  matches(input.target.projectId, ID, 'target.projectId');
  matches(input.target.baseRevision, REVISION, 'target.baseRevision');
  matches(input.target.sourceRevision, REVISION, 'target.sourceRevision');
  paths(input.changedPaths, 0, 1000, 'changedPaths');
  array(input.graph, 0, 1000, 'graph');
  const graphPaths = new Set();
  for (const node of input.graph) {
    exactKeys(node, ['path', 'dependencies', 'complete'], 'graph-node');
    relativePath(node.path, 'graph-node.path');
    requireValue(!graphPaths.has(node.path), 'graph.duplicate-path');
    graphPaths.add(node.path);
    paths(node.dependencies, 0, 100, 'graph-node.dependencies');
    requireValue(typeof node.complete === 'boolean', 'graph-node.complete');
  }
  array(input.requirements, 1, 100, 'requirements');
  const ids = new Set();
  for (const requirement of input.requirements) {
    exactKeys(requirement, ['id', 'criterionDigest', 'roots', 'mapping'], 'requirement');
    matches(requirement.id, ID, 'requirement.id');
    requireValue(!ids.has(requirement.id), 'requirements.duplicate-id');
    ids.add(requirement.id);
    matches(requirement.criterionDigest, DIGEST, 'requirement.criterionDigest');
    paths(requirement.roots, 1, 100, 'requirement.roots');
    if (requirement.mapping !== null) {
      exactKeys(requirement.mapping, ['projectId', 'sourceRevision', 'criterionDigest', 'confirmed'], 'mapping');
      matches(requirement.mapping.projectId, ID, 'mapping.projectId');
      matches(requirement.mapping.sourceRevision, REVISION, 'mapping.sourceRevision');
      matches(requirement.mapping.criterionDigest, DIGEST, 'mapping.criterionDigest');
      requireValue(typeof requirement.mapping.confirmed === 'boolean', 'mapping.confirmed');
    }
  }
}

function sorted(values) {
  return [...values].sort();
}

function evaluateRequirement(requirement, target, graph, changes, unmodeledChanges) {
  const reasons = new Set();
  const unknownPaths = new Set(unmodeledChanges);
  if (unmodeledChanges.length) reasons.add('changed-path-unmodeled');
  const mapping = requirement.mapping;
  if (mapping === null) reasons.add('mapping-missing');
  else {
    if (!mapping.confirmed) reasons.add('mapping-unconfirmed');
    if (mapping.projectId !== target.projectId) reasons.add('mapping-project-mismatch');
    if (mapping.sourceRevision !== target.baseRevision) reasons.add('mapping-revision-mismatch');
    if (mapping.criterionDigest !== requirement.criterionDigest) reasons.add('mapping-criterion-mismatch');
  }

  const visited = new Set();
  const changedPaths = new Set();
  const pending = [...requirement.roots];
  while (pending.length) {
    const path = pending.pop();
    if (visited.has(path)) continue;
    visited.add(path);
    const node = graph.get(path);
    if (!node) {
      reasons.add('graph-node-missing');
      unknownPaths.add(path);
      continue;
    }
    if (changes.has(path)) changedPaths.add(path);
    if (!node.complete) {
      reasons.add('graph-node-incomplete');
      unknownPaths.add(path);
    }
    for (const dependency of node.dependencies) {
      if (!visited.has(dependency)) pending.push(dependency);
    }
  }

  let status = 'unknown';
  if (!reasons.size) {
    status = changedPaths.size ? 'recheck-required' : 'no-declared-impact';
    reasons.add(changedPaths.size ? 'declared-dependency-changed' : 'no-declared-dependency-changed');
  }
  return {
    id: requirement.id, status, reasons: sorted(reasons),
    changedPaths: sorted(changedPaths), unknownPaths: sorted(unknownPaths),
  };
}

export function evaluateDeliveryImpact(input) {
  validateInput(input);
  const graph = new Map(input.graph.map(node => [node.path, node]));
  const changes = new Set(input.changedPaths);
  const unmodeledChanges = input.changedPaths.filter(path => !graph.has(path));
  const requirements = [...input.requirements]
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    .map(requirement => evaluateRequirement(requirement, input.target, graph, changes, unmodeledChanges));
  const status = requirements.some(requirement => requirement.status === 'unknown') ? 'unknown'
    : requirements.some(requirement => requirement.status === 'recheck-required') ? 'recheck-required' : 'no-declared-impact';
  return {
    schemaVersion: 'delivery-impact-report/v1',
    target: { ...input.target },
    status,
    verificationScope: 'declared-dependencies-only',
    mappingTrust: 'self-declared',
    evidenceReuseAuthorized: false,
    ciSkipAuthorized: false,
    executionAuthorized: false,
    productionReadyClaim: false,
    requirements,
  };
}
