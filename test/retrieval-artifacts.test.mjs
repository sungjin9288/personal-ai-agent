import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  summarizeStoredRetrievalArtifact,
  compareRetrievalPreviewWithLatestArtifact,
  formatRetrievalArtifactContent,
} from '../src/core/retrieval-artifacts.mjs';
import { buildMemoryCorpusRecord } from '../src/core/retrieval-corpus.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'retrieval-artifacts-test-'));
}

function writeArtifactFile(dir, fileName, content) {
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

test('summarizeStoredRetrievalArtifact', async (t) => {
  await t.test('returns null when artifact has no path', () => {
    assert.equal(summarizeStoredRetrievalArtifact({}), null);
    assert.equal(summarizeStoredRetrievalArtifact({ path: '' }), null);
  });

  await t.test('returns null when artifact.path does not exist on disk', () => {
    const dir = makeTmpDir();
    const missingPath = path.join(dir, 'does-not-exist.md');
    assert.equal(summarizeStoredRetrievalArtifact({ path: missingPath }), null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  await t.test('parses role, dedups snippet sources, and counts by sourceType', () => {
    const dir = makeTmpDir();
    const content = [
      '# Retrieved Context',
      '',
      '## Agent',
      '- role: reviewer',
      '- provider role: anthropic',
      '',
      '## Snippets',
      '- [memory] Some memory label chunk 1',
      '  - score: 1',
      '- [memory] Some memory label chunk 2',
      '  - score: 1',
      '- [attachment] file.txt chunk 1',
      '  - score: 2',
      '',
    ].join('\n');
    const filePath = writeArtifactFile(dir, 'artifact.md', content);

    const summary = summarizeStoredRetrievalArtifact({ path: filePath, role: 'fallback-role' });

    assert.equal(summary.role, 'reviewer');
    assert.equal(summary.snippetCount, 3);
    assert.equal(summary.memorySourceCount, 1);
    assert.equal(summary.attachmentSourceCount, 1);
    assert.equal(summary.sourceEntries.length, 2);
    assert.deepEqual(summary.sourceKeys.sort(), ['attachment:file.txt', 'memory:Some memory label'].sort());
    assert.ok(summary.sourceLabels.includes('메모 · Some memory label'));
    assert.ok(summary.sourceLabels.includes('첨부 · file.txt'));

    fs.rmSync(dir, { recursive: true, force: true });
  });

  await t.test('falls back to artifact.role when no "- role:" line is present', () => {
    const dir = makeTmpDir();
    const filePath = writeArtifactFile(dir, 'artifact.md', '# Retrieved Context\n\n## Snippets\n- no retrieval snippets selected\n');

    const summary = summarizeStoredRetrievalArtifact({ path: filePath, role: 'manager' });

    assert.equal(summary.role, 'manager');
    assert.equal(summary.snippetCount, 0);
    assert.deepEqual(summary.sourceEntries, []);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  await t.test('role is null when neither the content nor artifact.role provides one', () => {
    const dir = makeTmpDir();
    const filePath = writeArtifactFile(dir, 'artifact.md', 'no role line here\n');

    const summary = summarizeStoredRetrievalArtifact({ path: filePath });

    assert.equal(summary.role, null);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  await t.test('excludes snippet lines whose captured label is only whitespace from both snippetCount and sourceEntries', () => {
    const dir = makeTmpDir();
    // Trailing spaces after "]" so the regex matches but the trimmed label is empty;
    // snippetEntries itself is filtered by sourceLabel truthiness before snippetCount is read.
    const line = ['- [memory]', ' ', ' ', ' '].join('');
    const filePath = writeArtifactFile(dir, 'artifact.md', `${line}\n`);

    const summary = summarizeStoredRetrievalArtifact({ path: filePath });

    assert.equal(summary.snippetCount, 0);
    assert.equal(summary.sourceEntries.length, 0);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

test('compareRetrievalPreviewWithLatestArtifact', async (t) => {
  await t.test('status "no-evidence" when latestSummary is null/falsy', () => {
    const result = compareRetrievalPreviewWithLatestArtifact(
      [{ sourceType: 'memory', sourceLabel: 'Alpha' }],
      null,
    );

    assert.equal(result.status, 'no-evidence');
    assert.equal(result.previewOnlyCount, 1);
    assert.equal(result.previewSourceCount, 1);
    assert.equal(result.previewSnippetCount, 1);
    assert.equal(result.latestSnippetCount, 0);
    assert.equal(result.latestSourceCount, 0);
    assert.equal(result.sharedSourceCount, 0);
  });

  await t.test('dedups preview items sharing the same sourceType/sourceLabel key', () => {
    const result = compareRetrievalPreviewWithLatestArtifact(
      [
        { sourceType: 'memory', sourceLabel: 'Alpha' },
        { sourceType: 'memory', sourceLabel: 'Alpha' },
        { sourceType: 'memory', sourceLabel: 'Beta' },
      ],
      null,
    );

    assert.equal(result.previewSourceCount, 2);
    assert.equal(result.previewSnippetCount, 3);
  });

  await t.test('filters out preview items missing sourceType or sourceLabel', () => {
    const result = compareRetrievalPreviewWithLatestArtifact(
      [
        { sourceType: '', sourceLabel: 'Alpha' },
        { sourceType: 'memory', sourceLabel: '' },
        { sourceType: 'memory', sourceLabel: 'Beta' },
      ],
      null,
    );

    assert.equal(result.previewSourceCount, 1);
  });

  await t.test('status "empty" when both preview and latest have zero entries', () => {
    const result = compareRetrievalPreviewWithLatestArtifact([], { sourceEntries: [], snippetCount: 0 });
    assert.equal(result.status, 'empty');
    assert.equal(result.sharedSourceCount, 0);
  });

  await t.test('status "shifted" when there is no overlap but both sides are non-empty', () => {
    const latestSummary = {
      sourceEntries: [{ key: 'memory:Gamma', label: '메모 · Gamma', sourceLabel: 'Gamma', sourceType: 'memory' }],
      snippetCount: 1,
    };
    const result = compareRetrievalPreviewWithLatestArtifact(
      [{ sourceType: 'memory', sourceLabel: 'Alpha' }],
      latestSummary,
    );

    assert.equal(result.status, 'shifted');
    assert.equal(result.sharedSourceCount, 0);
    assert.equal(result.previewOnlyCount, 1);
    assert.equal(result.latestOnlyCount, 1);
  });

  await t.test('status "aligned" when preview and latest sources are identical', () => {
    const latestSummary = {
      sourceEntries: [{ key: 'memory:Alpha', label: '메모 · Alpha', sourceLabel: 'Alpha', sourceType: 'memory' }],
      snippetCount: 1,
    };
    const result = compareRetrievalPreviewWithLatestArtifact(
      [{ sourceType: 'memory', sourceLabel: 'Alpha' }],
      latestSummary,
    );

    assert.equal(result.status, 'aligned');
    assert.equal(result.sharedSourceCount, 1);
    assert.equal(result.previewOnlyCount, 0);
    assert.equal(result.latestOnlyCount, 0);
  });

  await t.test('status "partial" when there is overlap plus extra entries on either side', () => {
    const latestSummary = {
      sourceEntries: [
        { key: 'memory:Alpha', label: '메모 · Alpha', sourceLabel: 'Alpha', sourceType: 'memory' },
        { key: 'memory:Gamma', label: '메모 · Gamma', sourceLabel: 'Gamma', sourceType: 'memory' },
      ],
      snippetCount: 2,
    };
    const result = compareRetrievalPreviewWithLatestArtifact(
      [
        { sourceType: 'memory', sourceLabel: 'Alpha' },
        { sourceType: 'memory', sourceLabel: 'Beta' },
      ],
      latestSummary,
    );

    assert.equal(result.status, 'partial');
    assert.equal(result.sharedSourceCount, 1);
    assert.equal(result.previewOnlyCount, 1);
    assert.equal(result.latestOnlyCount, 1);
    assert.deepEqual(result.previewOnlyLabels, ['메모 · Beta']);
    assert.deepEqual(result.latestOnlyLabels, ['메모 · Gamma']);
  });

  await t.test('previewOnlySources/latestOnlySources are capped at 4 and labels at 3', () => {
    const previewItems = Array.from({ length: 6 }, (_, i) => ({
      sourceType: 'memory',
      sourceLabel: `Item${i}`,
    }));
    const result = compareRetrievalPreviewWithLatestArtifact(previewItems, null);

    assert.equal(result.previewOnlySources.length, 4);
    assert.equal(result.previewOnlyLabels.length, 3);
  });

  await t.test('defaults previewItems to [] when omitted', () => {
    const result = compareRetrievalPreviewWithLatestArtifact();
    assert.equal(result.status, 'no-evidence');
    assert.equal(result.previewSourceCount, 0);
  });
});

test('formatRetrievalArtifactContent', async (t) => {
  await t.test('renders header fields and "no retrieval snippets selected" when retrievalContext is empty', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      retrievalContext: [],
      role: 'reviewer',
    });

    assert.match(output, /^# Retrieved Context/);
    assert.match(output, /- role: reviewer/);
    assert.match(output, /- provider role: anthropic/);
    assert.match(output, /- no retrieval snippets selected/);
  });

  await t.test('omits the specialist kind line when specialistKind is not provided', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      retrievalContext: [],
      role: 'reviewer',
    });

    assert.doesNotMatch(output, /specialist kind/);
  });

  await t.test('includes the specialist kind line when specialistKind is provided', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      retrievalContext: [],
      role: 'specialist',
      specialistKind: 'security',
    });

    assert.match(output, /- specialist kind: security/);
  });

  await t.test('defaults retrievalContext to [] when omitted', () => {
    const output = formatRetrievalArtifactContent({ providerRole: 'anthropic', role: 'reviewer' });
    assert.match(output, /- no retrieval snippets selected/);
  });

  await t.test('renders one snippet block per retrievalContext item with score fallbacks', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [
        {
          sourceType: 'memory',
          sourceLabel: 'Alpha',
          chunkIndex: 2,
          score: 0.9,
          matchedTerms: ['foo', 'bar'],
          retrievalReason: 'keyword match',
          snippet: 'some snippet text',
        },
      ],
    });

    assert.match(output, /- \[memory\] Alpha chunk 2/);
    assert.match(output, /- score: 0\.9/);
    assert.match(output, /- lexicalScore: 0\.9/);
    assert.match(output, /- bm25Score: 0/);
    assert.match(output, /- phraseBoostScore: 0/);
    assert.match(output, /- matchTermCount: 0/);
    assert.match(output, /- matchedTerms: foo, bar/);
    assert.match(output, /- retrievalReason: keyword match/);
    assert.match(output, /- snippet: some snippet text/);
  });

  await t.test('renders internal corpus lineage without requiring it from legacy callers', () => {
    const item = {
      sourceType: 'memory',
      sourceLabel: 'workspace/fact',
      score: 1,
      snippet: 'Provider drift evidence.',
    };
    const corpusRecord = buildMemoryCorpusRecord({
      content: item.snippet,
      createdAt: '2026-07-16T00:00:00.000Z',
      id: 'memory-1',
      kind: 'fact',
      scope: 'workspace',
      scopeId: 'workspace-1',
    });

    const output = formatRetrievalArtifactContent({
      providerRole: 'manager',
      role: 'manager',
      retrievalContext: [item],
      retrievalCorpusRecords: [corpusRecord],
    });

    assert.match(output, /- corpusSchema: personal-ai-agent-retrieval-corpus\/v1/);
    assert.match(output, /- corpusId: corpus-[a-f0-9]{64}/);
    assert.match(output, /- chunkId: chunk-[a-f0-9]{64}/);
    assert.match(output, /- contentHash: [a-f0-9]{64}/);
    assert.match(output, /- snippetHash: [a-f0-9]{64}/);
    assert.match(output, /- scope: workspace\/workspace-1/);
    assert.match(output, /- revision: revision-[a-f0-9]{64}/);
    assert.match(output, /- provenance: \{"kind":"fact"/);
  });

  await t.test('omits " chunk N" suffix when chunkIndex is falsy (0, undefined)', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [
        { sourceType: 'attachment', sourceLabel: 'file.txt', chunkIndex: 0, score: 1, snippet: 'x' },
      ],
    });

    assert.match(output, /- \[attachment\] file\.txt\n/);
  });

  await t.test('uses explicit lexicalScore/bm25Score/phraseBoostScore/matchTermCount when present (no fallback)', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [
        {
          sourceType: 'memory',
          sourceLabel: 'Alpha',
          score: 1,
          lexicalScore: 0.5,
          bm25Score: 2.2,
          phraseBoostScore: 0.1,
          matchTermCount: 3,
          snippet: 'x',
        },
      ],
    });

    assert.match(output, /- lexicalScore: 0\.5/);
    assert.match(output, /- bm25Score: 2\.2/);
    assert.match(output, /- phraseBoostScore: 0\.1/);
    assert.match(output, /- matchTermCount: 3/);
  });

  await t.test('renders "retrievalReason: not recorded" when retrievalReason is missing', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [{ sourceType: 'memory', sourceLabel: 'Alpha', score: 1, snippet: 'x' }],
    });

    assert.match(output, /- retrievalReason: not recorded/);
  });

  await t.test('renders empty matchedTerms string when matchedTerms is not an array', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [{ sourceType: 'memory', sourceLabel: 'Alpha', score: 1, snippet: 'x' }],
    });

    assert.match(output, /- matchedTerms: \n/);
  });

  await t.test('joins multiple snippet entries with a single newline between blocks', () => {
    const output = formatRetrievalArtifactContent({
      providerRole: 'anthropic',
      role: 'reviewer',
      retrievalContext: [
        { sourceType: 'memory', sourceLabel: 'Alpha', score: 1, snippet: 'first' },
        { sourceType: 'attachment', sourceLabel: 'file.txt', score: 2, snippet: 'second' },
      ],
    });

    assert.match(output, /- \[memory\] Alpha[\s\S]*- \[attachment\] file\.txt/);
  });
});
