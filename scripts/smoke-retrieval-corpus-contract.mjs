import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { formatRetrievalArtifactContent } from '../src/core/retrieval-artifacts.mjs';
import {
  buildFactCorpusRecord,
  RETRIEVAL_CORPUS_SCHEMA_VERSION,
} from '../src/core/retrieval-corpus.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'fixtures', 'retrieval-corpus-cases-v1.json'), 'utf8'),
);
const developmentPlan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');

function buildContext(memoryContent = fixture.memory.content) {
  return buildRetrievalContextWithCorpus({
    attachments: [fixture.attachment],
    memoryEntries: [{ ...fixture.memory, content: memoryContent }],
    mission: fixture.mission,
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: 'manager',
    role: 'manager',
  });
}

const first = buildContext();
const repeated = buildContext();
const firstContext = first.items;
const repeatedContext = repeated.items;

assert.deepEqual(repeatedContext, firstContext);
assert.ok(firstContext.length >= 2);

const firstRecords = first.corpusRecords;
const repeatedRecords = repeated.corpusRecords;

assert.equal(firstRecords.every(Boolean), true);
assert.deepEqual(repeatedRecords, firstRecords);
assert.equal(firstRecords.every((record) => record.schemaVersion === RETRIEVAL_CORPUS_SCHEMA_VERSION), true);
assert.equal(firstRecords.every((record) => /^[a-f0-9]{64}$/.test(record.contentHash)), true);
assert.equal(firstRecords.every((record) => /^chunk-[a-f0-9]{64}$/.test(record.chunkId)), true);
assert.equal(firstRecords.some((record) => record.sourceType === 'memory'), true);
assert.equal(firstRecords.some((record) => record.sourceType === 'attachment'), true);

const changed = buildContext(`${fixture.memory.content} Revised.`);
const firstMemoryRecord = firstRecords.find((record) => record.sourceType === 'memory');
const changedMemoryRecord = changed.corpusRecords.find((record) => record?.sourceType === 'memory');

assert.ok(firstMemoryRecord);
assert.ok(changedMemoryRecord);
assert.notEqual(changedMemoryRecord.contentHash, firstMemoryRecord.contentHash);
assert.notEqual(changedMemoryRecord.revision.id, firstMemoryRecord.revision.id);
assert.notEqual(changedMemoryRecord.chunkId, firstMemoryRecord.chunkId);

const factRecord = buildFactCorpusRecord(fixture.fact);
assert.equal(factRecord.sourceType, 'fact');
assert.equal(factRecord.revision.number, 2);
assert.equal(factRecord.provenance.sourceId, fixture.memory.id);

const artifactContent = formatRetrievalArtifactContent({
  providerRole: 'manager',
  retrievalContext: firstContext,
  retrievalCorpusRecords: firstRecords,
  role: 'manager',
});

assert.match(artifactContent, /corpusSchema: personal-ai-agent-retrieval-corpus\/v1/);
assert.match(artifactContent, /corpusId: corpus-[a-f0-9]{64}/);
assert.match(artifactContent, /chunkId: chunk-[a-f0-9]{64}/);
assert.match(artifactContent, /contentHash: [a-f0-9]{64}/);
assert.match(artifactContent, /snippetHash: [a-f0-9]{64}/);
assert.match(artifactContent, /scope: (workspace|mission)\//);
assert.match(artifactContent, /revision: revision-[a-f0-9]{64}/);
assert.doesNotMatch(artifactContent, /\/private\//);

assert.match(developmentPlan, /status: user-learning-operator-surface-current/);
assert.match(developmentPlan, /\| R1 Corpus contract \| 완료 \|/);
assert.match(developmentPlan, /\| R2 Retrieval evaluation \| 완료 \|/);
assert.match(developmentPlan, /npm run smoke:retrieval-corpus-contract/);
assert.match(developmentPlan, /productionReadyClaim: false/);
assert.match(developmentPlan, /externalProviderCalls: none/);

console.log(
  JSON.stringify(
    {
      changedRevisionVerified: true,
      corpusRecordCount: firstRecords.length,
      factRevision: factRecord.revision.number,
      mode: 'retrieval-corpus-contract',
      ok: true,
      schemaVersion: RETRIEVAL_CORPUS_SCHEMA_VERSION,
    },
    null,
    2,
  ),
);
