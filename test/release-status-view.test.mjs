import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getReleaseStatusBadge,
  renderReleaseCloseoutChecklist,
  renderReleaseRuntimeJobs,
  renderReleaseStatusOverview,
  renderReleaseVerificationSurfaces,
} from '../src/web/public/lib/release-status-view.js';

test('release status badge keeps ready, blocked, and neutral states distinct', () => {
  assert.equal(getReleaseStatusBadge('verification passed'), 'status-completed');
  assert.equal(getReleaseStatusBadge('missing-env'), 'status-failed');
  assert.equal(getReleaseStatusBadge('running'), 'status-pending');
  assert.equal(getReleaseStatusBadge(''), 'status-pending');
});

test('release overview derives visible status without trusting unescaped evidence text', () => {
  const commandCalls = [];
  const html = renderReleaseStatusOverview({
    release: {
      baseline: {
        archivedAt: '2026-07-13T12:00:00.000Z',
        blockedItems: 0,
        checklistOpen: 0,
        commit: 'verified-commit',
        ready: true,
      },
      releaseReadiness: {
        currentOpenBlockers: ['one'],
        productionBlockers: ['one', 'two'],
        productionReadyStatus: 'blocked',
      },
      runtimeJobs: { activeCount: 1, recentCount: 3 },
      stale: true,
      staleReasons: ['<script>unsafe</script>'],
      summary: {
        blockedItems: 0,
        checklistOpen: 0,
        coreDeterministicPassed: 8,
        coreDeterministicTotal: 8,
      },
      updatedAt: '2026-07-13T12:00:00.000Z',
    },
    releaseActionLabel: 'commit <unsafe>',
    renderCommandCopyButton(options) {
      commandCalls.push(options);
      return '<button data-test-command-copy="true"></button>';
    },
    snapshotEligibility: { allowed: false },
  });

  assert.match(html, /8\/8 passed/);
  assert.match(html, /production blockers[\s\S]*2건/);
  assert.match(html, /open blockers[\s\S]*1건/);
  assert.match(html, /execution v1 baseline ready · current surface refresh needed/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>unsafe<\/script>/);
  assert.match(html, /data-ui-action="archive-release-snapshot"[^>]* disabled/);
  assert.match(html, /data-test-command-copy="true"/);
  assert.deepEqual(commandCalls, [{
    actionLabel: '전체 preflight 명령 복사: commit <unsafe>',
    buttonText: '전체 preflight 명령 복사',
    command: 'npm run preflight:execution-v1:all',
    label: '전체 preflight 명령',
  }]);
});

test('release overview exposes explicit cancel actions only while confirmation is armed', () => {
  const html = renderReleaseStatusOverview({
    regenerationConfirmArmed: true,
    release: { summary: {} },
    releaseRefreshPreflight: { notes: ['regenerate note'] },
    releaseSnapshotPreflight: { notes: ['snapshot note'] },
    snapshotConfirmArmed: true,
    snapshotEligibility: { allowed: false },
  });

  assert.match(html, /data-ui-action="cancel-regenerate-release-surface"/);
  assert.match(html, /data-ui-action="cancel-archive-release-snapshot"/);
  assert.match(html, /regenerate note/);
  assert.match(html, /snapshot note/);
  assert.doesNotMatch(html, /data-ui-action="archive-release-snapshot"[^>]* disabled/);
});

test('release verification surfaces render deterministic and reference evidence rows', () => {
  const html = renderReleaseVerificationSurfaces({
    release: {
      deterministicRuntime: [{
        elapsed: '2s',
        script: 'smoke:<unsafe>',
        stderr: '0 B',
        stdout: '1 KB',
        summary: 'passed',
        timeout: '20m',
      }],
      referenceAdoptionAggregate: {
        scripts: [{ duration: '1s', script: 'smoke:reference', status: 'passed', timedOut: false }],
        totalDuration: '1s',
      },
    },
  });

  assert.match(html, /data-release-deterministic-runtime-row="smoke:&lt;unsafe&gt;"/);
  assert.match(html, /data-release-reference-adoption-row="smoke:reference"/);
  assert.match(html, /mini-badge status-completed">passed/);
  assert.match(html, /timedOut false/);
});

test('release verification and runtime surfaces keep honest empty states', () => {
  const verificationHtml = renderReleaseVerificationSurfaces();
  const jobsHtml = renderReleaseRuntimeJobs();

  assert.match(verificationHtml, /deterministic runtime summary가 없습니다/);
  assert.match(verificationHtml, /reference adoption aggregate details가 없습니다/);
  assert.match(jobsHtml, /최근 runtime job 기록이 없습니다/);
});

test('release runtime jobs and closeout checklist preserve audit identifiers and status', () => {
  const jobsHtml = renderReleaseRuntimeJobs({
    release: {
      runtimeJobs: {
        active: [{
          id: 'job-active-1234567890',
          kind: 'execution-v1-refresh',
          requestId: 'request-1234567890',
          scope: 'current-surface',
          startedAt: '2026-07-13T12:00:00.000Z',
          status: 'active',
        }],
        recent: [],
      },
    },
  });
  const checklistHtml = renderReleaseCloseoutChecklist({
    release: {
      branch: 'main',
      checklist: [{ done: false, label: '<closeout>' }],
      commit: 'commit-1',
      currentBranch: 'main',
      currentCommit: 'commit-2',
      docStatuses: [{ path: 'docs/<unsafe>.md', status: 'stale' }],
      values: { deterministic: 'passed', provider: 'missing-env' },
    },
  });

  assert.match(jobsHtml, /data-release-runtime-job-id="job-active-1234567890"/);
  assert.match(jobsHtml, /execution v1 refresh/);
  assert.match(jobsHtml, /request request-123/);
  assert.match(checklistHtml, /release-checklist-item is-blocked/);
  assert.match(checklistHtml, /&lt;closeout&gt;/);
  assert.match(checklistHtml, /mini-badge status-completed">passed/);
  assert.match(checklistHtml, /mini-badge status-failed">missing-env/);
  assert.match(checklistHtml, /docs\/&lt;unsafe&gt;\.md/);
});
