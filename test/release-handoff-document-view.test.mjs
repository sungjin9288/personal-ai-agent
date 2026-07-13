import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createReleaseHandoffDocumentViewModel,
  isReleaseHandoffPreviewable,
  renderReleaseHandoffDocuments,
} from '../src/web/public/lib/release-handoff-document-view.js';

function createView(preview = {}) {
  return createReleaseHandoffDocumentViewModel({
    preview: {
      artifactId: 'handoff-json',
      content: '{"safe":"<value>"}',
      lineCount: 40,
      status: 'ready',
      truncated: true,
      ...preview,
    },
    release: {
      baseline: { ready: true },
      closeout: { markdown: '# Closeout\n<script>bad</script>', path: 'docs/<closeout>.md' },
      evidence: { markdown: 'Evidence', path: 'docs/evidence.md' },
      handoff: { markdown: 'Handoff', path: 'docs/handoff.md' },
      handoffArtifacts: [
        {
          bytes: 1024,
          description: '검토 <artifact>',
          exists: true,
          format: 'json',
          href: '/api/handoff?id=handoff-json',
          id: 'handoff-json',
          kind: 'report',
          label: 'Handoff <JSON>',
          path: 'artifacts/handoff.json',
          recommended: true,
          structuredSummary: {
            open: { errorFreeSessions: 2, overviewLine: 'open <2/2>', totalSessions: 2 },
            overviewLine: 'all <ready>',
            preview: {
              errorFreeSessions: 2,
              overviewLine: 'preview <2/2>',
              stableLines: ['stable <line>'],
              totalSessions: 2,
            },
            sha256: 'abc<sha>',
          },
          updatedAt: '2026-07-14T01:00:00.000Z',
        },
        {
          exists: false,
          format: 'zip',
          id: 'missing-zip',
          label: 'Missing ZIP',
          path: 'artifacts/missing.zip',
        },
      ],
      liveValidation: [{ provider: 'openai<script>', status: 'passed' }],
      refreshPlan: {
        affectsPaths: ['docs/<current>.md'],
        rerunsDeterministicVerification: true,
        rerunsLiveValidation: false,
        snapshotChanges: false,
      },
      snapshot: {
        archivedAt: '2026-07-14T00:00:00.000Z',
        closeoutPath: 'snapshot/closeout.md',
        evidencePath: 'snapshot/evidence.md',
        handoffPath: 'snapshot/handoff.md',
        matchesCurrentHead: true,
        matchesGeneratedCommit: true,
        verifiedCommit: 'abc123',
      },
      snapshotEligibility: { allowed: true },
    },
  });
}

test('handoff previewability requires an existing linked text artifact', () => {
  assert.equal(isReleaseHandoffPreviewable({ exists: true, format: 'JSON', href: '/artifact' }), true);
  assert.equal(isReleaseHandoffPreviewable({ exists: true, format: 'zip', href: '/artifact' }), false);
  assert.equal(isReleaseHandoffPreviewable({ exists: false, format: 'text', href: '/artifact' }), false);
  assert.equal(isReleaseHandoffPreviewable({ exists: true, format: 'markdown' }), false);
});

test('handoff view model decorates counts, preview, and structured summary once', () => {
  const view = createView();

  assert.equal(view.readyCount, 1);
  assert.equal(view.recommendedCount, 1);
  assert.equal(view.preview.artifact.id, 'handoff-json');
  assert.equal(view.preview.artifact.previewActive, true);
  assert.equal(view.preview.artifact.previewButtonLabel, '미리보기 닫기');
  assert.equal(view.preview.artifact.structuredSummaryRows.length, 2);
  assert.equal(view.preview.artifact.structuredSummaryDetails.length, 2);
  assert.equal(view.preview.artifact.structuredSummarySha, 'abc<sha>');
});

test('handoff renderer escapes runtime evidence and preserves preview, summary, and document contracts', () => {
  const commandCalls = [];
  const linkCalls = [];
  const summaryCalls = [];
  const html = renderReleaseHandoffDocuments({
    copyButtons: {
      renderReleaseCommandCopyButton(options) {
        commandCalls.push(options);
        return '<button data-command-copy="true"></button>';
      },
      renderReleaseHandoffLinkCopyButton(options) {
        linkCalls.push(options);
        return `<button data-link-action="${options.action}"></button>`;
      },
      renderReleaseHandoffStructuredSummaryCopyButton(options) {
        summaryCalls.push(options);
        return `<button data-summary-action="${options.action}"></button>`;
      },
      renderReleaseToggleActionButton(options) {
        return `<button data-toggle-action="${options.action}"></button>`;
      },
    },
    view: createView(),
  });

  assert.match(html, /ready 1\/2/);
  assert.match(html, /recommended 1개/);
  assert.match(html, /data-release-handoff-preview-panel="handoff-json"/);
  assert.match(html, /data-toggle-action="toggle-release-handoff-preview"/);
  assert.match(html, /data-release-handoff-preview-note/);
  assert.match(html, /Handoff &lt;JSON&gt;/);
  assert.match(html, /openai&lt;script&gt;/);
  assert.match(html, /&lt;value&gt;/);
  assert.doesNotMatch(html, /<value>|<script>bad<\/script>/);
  assert.match(html, /data-release-doc-kind="closeout"/);
  assert.match(html, /data-release-doc-kind="evidence"/);
  assert.match(html, /data-release-doc-kind="handoff"/);
  assert.equal(commandCalls.some((item) => item.command === 'artifacts/handoff.json'), true);
  assert.equal(linkCalls.some((item) => item.action === 'copy-release-handoff-preview-link'), true);
  assert.equal(summaryCalls.some((item) => item.action === 'copy-release-handoff-structured-summary-stable-line'), true);
});

test('handoff renderer keeps loading, error, and honest empty states explicit', () => {
  const loadingHtml = renderReleaseHandoffDocuments({ view: createView({ status: 'loading' }) });
  const errorHtml = renderReleaseHandoffDocuments({
    view: createView({ error: 'preview <failed>', status: 'error' }),
  });
  const emptyHtml = renderReleaseHandoffDocuments({
    view: createReleaseHandoffDocumentViewModel(),
  });

  assert.match(loadingHtml, /선택한 artifact를 불러오는 중입니다/);
  assert.match(errorHtml, /preview &lt;failed&gt;/);
  assert.doesNotMatch(errorHtml, /preview <failed>/);
  assert.match(emptyHtml, /Release snapshot이 아직 없습니다/);
  assert.match(emptyHtml, /not requested/);
  assert.match(emptyHtml, /data-release-doc-kind="closeout"/);
  assert.doesNotMatch(emptyHtml, /Release Handoff/);
});
