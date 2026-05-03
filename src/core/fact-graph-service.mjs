import { createId } from './id.mjs';

function now() {
  return new Date().toISOString();
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeStatement(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const FACT_EDGE_MIN_SHARED_TOKENS = 2;
const FACT_EDGE_STOP_TOKENS = new Set([
  'after',
  'and',
  'before',
  'for',
  'from',
  'into',
  'requires',
  'the',
  'uses',
  'with',
]);

function tokenizeFactStatement(value) {
  return [
    ...new Set(
      normalizeStatement(value)
        .split(/[^0-9a-z\u3131-\u318e\uac00-\ud7a3]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !FACT_EDGE_STOP_TOKENS.has(token)),
    ),
  ];
}

function findSourceNode(store, sourceId) {
  return store.listFactGraphNodes({ sourceId, status: 'all' }).at(-1) || null;
}

function buildMemoryProvenance(memoryEntry) {
  return {
    kind: memoryEntry.kind,
    scope: memoryEntry.scope,
    scopeId: memoryEntry.scopeId,
    sourceCreatedAt: memoryEntry.createdAt || null,
    sourceId: memoryEntry.id,
    sourceType: 'memory',
    sourceUpdatedAt: memoryEntry.updatedAt || null,
  };
}

function buildFactEdgeReason(sharedTokens = []) {
  const tokens = Array.isArray(sharedTokens) ? sharedTokens.filter(Boolean) : [];
  if (!tokens.length) {
    return 'related by shared fact terms';
  }

  return `related by shared fact terms: ${tokens.slice(0, 8).join(', ')}`;
}

export function createFactGraphService({ store }) {
  function retireNodeEdges(nodeId, { reason = 'fact-node-updated' } = {}) {
    const retiredAt = now();
    const activeEdges = store.listFactGraphEdges({ nodeId, status: 'active' });

    for (const edge of activeEdges) {
      store.updateFactGraphEdge(edge.id, (currentEdge) => ({
        ...currentEdge,
        retiredAt,
        retiredReason: reason,
        status: 'retired',
        updatedAt: retiredAt,
        validTo: retiredAt,
      }));
    }
  }

  function buildFactEdgeCandidate(leftNode, rightNode) {
    if (!leftNode || !rightNode || leftNode.id === rightNode.id) {
      return null;
    }
    if (leftNode.status !== 'active' || rightNode.status !== 'active') {
      return null;
    }
    if (leftNode.scope !== rightNode.scope || leftNode.scopeId !== rightNode.scopeId) {
      return null;
    }

    const leftTokens = new Set(tokenizeFactStatement(leftNode.statement));
    const sharedTokens = tokenizeFactStatement(rightNode.statement).filter((token) => leftTokens.has(token));
    if (sharedTokens.length < FACT_EDGE_MIN_SHARED_TOKENS) {
      return null;
    }

    const sortedNodeIds = [leftNode.id, rightNode.id].sort((left, right) => left.localeCompare(right));
    return {
      fromNodeId: sortedNodeIds[0],
      relation: 'shared-keyword',
      relationReason: buildFactEdgeReason(sharedTokens),
      sharedTokens,
      toNodeId: sortedNodeIds[1],
      weight: sharedTokens.length,
    };
  }

  function rebuildNodeEdges(node) {
    if (!node || node.status !== 'active') {
      return [];
    }

    retireNodeEdges(node.id);
    const peers = store
      .listFactGraphNodes({ scope: node.scope, scopeId: node.scopeId, status: 'active' })
      .filter((peer) => peer.id !== node.id);
    const createdEdges = [];

    for (const peer of peers) {
      const candidate = buildFactEdgeCandidate(node, peer);
      if (!candidate) {
        continue;
      }

      const existingActiveEdge = store
        .listFactGraphEdges({ nodeId: node.id, status: 'active' })
        .find(
          (edge) =>
            edge.fromNodeId === candidate.fromNodeId &&
            edge.toNodeId === candidate.toNodeId &&
            edge.relation === candidate.relation,
        );
      if (existingActiveEdge) {
        continue;
      }

      createdEdges.push(
        store.saveFactGraphEdge({
          id: createId('factedge'),
          createdAt: now(),
          fromNodeId: candidate.fromNodeId,
          relation: candidate.relation,
          relationReason: candidate.relationReason,
          scope: node.scope,
          scopeId: node.scopeId,
          sharedTokens: candidate.sharedTokens,
          status: 'active',
          toNodeId: candidate.toNodeId,
          updatedAt: now(),
          validFrom: now(),
          validTo: null,
          weight: candidate.weight,
        }),
      );
    }

    return createdEdges;
  }

  function retireMemoryFact(memoryEntry, { reason = 'memory-retired' } = {}) {
    if (!memoryEntry?.id) {
      return null;
    }

    const existingNode = findSourceNode(store, memoryEntry.id);
    if (!existingNode || existingNode.status === 'retired') {
      return existingNode;
    }

    const retiredNode = store.updateFactGraphNode(existingNode.id, (node) => ({
      ...node,
      retiredAt: now(),
      retiredReason: reason,
      status: 'retired',
      updatedAt: now(),
      validTo: now(),
    }));
    retireNodeEdges(retiredNode.id, { reason });
    return retiredNode;
  }

  function syncMemoryFact(memoryEntry, { previousEntry = null } = {}) {
    if (!memoryEntry?.id) {
      return null;
    }

    if (memoryEntry.kind !== 'fact') {
      return retireMemoryFact(memoryEntry, { reason: 'memory-kind-changed' });
    }

    const statement = normalizeText(memoryEntry.content);
    if (!statement) {
      return retireMemoryFact(memoryEntry, { reason: 'memory-empty' });
    }

    const existingNode = findSourceNode(store, memoryEntry.id);
    if (!existingNode || existingNode.status === 'retired') {
      const createdNode = store.saveFactGraphNode({
        id: createId('factnode'),
        createdAt: now(),
        normalizedStatement: normalizeStatement(statement),
        provenance: [buildMemoryProvenance(memoryEntry)],
        revisions: [],
        scope: memoryEntry.scope,
        scopeId: memoryEntry.scopeId,
        sourceId: memoryEntry.id,
        sourceType: 'memory',
        statement,
        status: 'active',
        updatedAt: now(),
        validFrom: memoryEntry.createdAt || now(),
        validTo: null,
        version: 1,
      });
      rebuildNodeEdges(createdNode);
      return createdNode;
    }

    const previousStatement = normalizeText(previousEntry?.content, existingNode.statement);
    const statementChanged = normalizeStatement(previousStatement) !== normalizeStatement(statement);
    const revisions = statementChanged
      ? [
          ...(Array.isArray(existingNode.revisions) ? existingNode.revisions : []),
          {
            recordedAt: now(),
            statement: previousStatement,
            validFrom: existingNode.validFrom || existingNode.createdAt || null,
            validTo: now(),
            version: Number(existingNode.version || 1),
          },
        ]
      : Array.isArray(existingNode.revisions)
        ? existingNode.revisions
        : [];

    const updatedNode = store.updateFactGraphNode(existingNode.id, (node) => ({
      ...node,
      normalizedStatement: normalizeStatement(statement),
      provenance: [buildMemoryProvenance(memoryEntry)],
      revisions,
      scope: memoryEntry.scope,
      scopeId: memoryEntry.scopeId,
      statement,
      status: 'active',
      updatedAt: now(),
      validFrom: statementChanged ? now() : node.validFrom,
      validTo: null,
      version: statementChanged ? Number(node.version || 1) + 1 : Number(node.version || 1),
    }));
    if (statementChanged) {
      rebuildNodeEdges(updatedNode);
    }
    return updatedNode;
  }

  function listFactGraph(filter = {}) {
    const status = normalizeText(filter.status, 'active');
    const nodes = store.listFactGraphNodes({
      scope: normalizeText(filter.scope),
      scopeId: normalizeText(filter.scopeId),
      sourceId: normalizeText(filter.sourceId),
      status: status === 'all' ? 'all' : status,
    });

    const activeNodes = nodes.filter((node) => node.status === 'active');
    const retiredNodes = nodes.filter((node) => node.status === 'retired');
    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const edges = store
      .listFactGraphEdges({
        scope: normalizeText(filter.scope),
        scopeId: normalizeText(filter.scopeId),
        status: status === 'all' ? 'all' : status,
      })
      .filter((edge) => nodeIdSet.has(edge.fromNodeId) || nodeIdSet.has(edge.toNodeId));
    const activeEdges = edges.filter((edge) => edge.status === 'active');
    const retiredEdges = edges.filter((edge) => edge.status === 'retired');
    const scopeCounts = nodes.reduce((counts, node) => {
      const key = `${node.scope || 'unknown'}/${node.scopeId || 'global'}`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});

    return {
      edges,
      nodes,
      summary: {
        activeCount: activeNodes.length,
        activeEdgeCount: activeEdges.length,
        edgeCount: edges.length,
        latestUpdatedAt: nodes.at(-1)?.updatedAt || nodes.at(-1)?.createdAt || null,
        retiredEdgeCount: retiredEdges.length,
        retiredCount: retiredNodes.length,
        scopeCounts,
        total: nodes.length,
      },
    };
  }

  return {
    listFactGraph,
    retireMemoryFact,
    syncMemoryFact,
  };
}
