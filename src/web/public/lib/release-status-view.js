import {
  escapeHtml,
  formatDate,
  formatDurationMs,
  getDisplayLabel,
} from './html-format.js';
import {
  renderReleaseConfirmActionButton,
  renderReleasePreflightAllButton,
  renderReleaseSimpleActionButton,
  renderReleaseStatusRefreshButton,
  renderReleaseTabActionButton,
} from './render-fragments.js';

export function getReleaseStatusBadge(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return 'status-pending';
  }
  if (normalized.includes('passed') || normalized.includes('ready') || normalized.includes('completed')) {
    return 'status-completed';
  }
  if (
    normalized.includes('abandoned')
    || normalized.includes('blocked')
    || normalized.includes('failed')
    || normalized.includes('missing-env')
  ) {
    return 'status-failed';
  }
  return 'status-pending';
}

export function renderReleaseStatusOverview({
  regenerationConfirmArmed = false,
  release = {},
  releaseActionLabel = 'execution-v1 release',
  releaseRefreshPreflight = null,
  releaseSnapshotPreflight = null,
  renderCommandCopyButton = () => '',
  snapshotConfirmArmed = false,
  snapshotEligibility = { allowed: false },
} = {}) {
  const summary = release.summary || {};
  const baseline = release.baseline || null;
  const runtimeJobs = release.runtimeJobs || {};
  const coreDeterministicPassed = summary.coreDeterministicPassed ?? summary.deterministicPassed ?? 0;
  const coreDeterministicTotal = summary.coreDeterministicTotal ?? summary.deterministicTotal ?? 0;
  const referenceAdoptionPassed = Number(summary.referenceAdoptionPassed || 0);
  const referenceAdoptionTotal = Number(summary.referenceAdoptionTotal || 0);
  const executionV1HelperPassed = Number(summary.executionV1HelperPassed || 0);
  const executionV1HelperTotal = Number(summary.executionV1HelperTotal || 0);
  const executionV1HandoffPassed = Number(summary.executionV1HandoffPassed || 0);
  const executionV1HandoffTotal = Number(summary.executionV1HandoffTotal || 0);
  const productionBlockers = Array.isArray(release.releaseReadiness?.productionBlockers)
    ? release.releaseReadiness.productionBlockers
    : [];
  const currentOpenBlockers = Array.isArray(release.releaseReadiness?.currentOpenBlockers)
    ? release.releaseReadiness.currentOpenBlockers
    : [];
  const productionBlockerCount = Number.isFinite(Number(summary.productionBlockerCount))
    ? Number(summary.productionBlockerCount)
    : productionBlockers.length;
  const currentOpenBlockerCount = Number.isFinite(Number(summary.currentOpenBlockerCount))
    ? Number(summary.currentOpenBlockerCount)
    : currentOpenBlockers.length;
  const productionReadyStatus = String(
    summary.productionReadyStatus || release.releaseReadiness?.productionReadyStatus || 'not tracked',
  ).trim();
  const referenceAdoptionLabel = referenceAdoptionTotal > 0
    ? `${referenceAdoptionPassed}/${referenceAdoptionTotal} passed`
    : 'not tracked';
  const executionV1HelperLabel = executionV1HelperTotal > 0
    ? `${executionV1HelperPassed}/${executionV1HelperTotal} passed`
    : 'not tracked';
  const executionV1HandoffLabel = executionV1HandoffTotal > 0
    ? `${executionV1HandoffPassed}/${executionV1HandoffTotal} passed`
    : 'not tracked';
  const artifactStateLabel = release.artifactState === 'local-current'
    ? '로컬 갱신됨'
    : release.stale
      ? '갱신 필요'
      : '최신';
  const baselineStateLabel = baseline?.ready
    ? 'verified snapshot ready'
    : release.snapshot
      ? 'snapshot archived'
      : 'snapshot 없음';
  const releaseHeadline = summary.ready
    ? release.artifactState === 'local-current'
      ? 'execution v1 closeout ready (local evidence)'
      : 'execution v1 closeout ready'
    : baseline?.ready && release.stale
      ? 'execution v1 baseline ready · current surface refresh needed'
      : baseline?.ready
        ? 'execution v1 baseline ready'
        : release.stale
          ? 'execution v1 evidence 갱신 필요'
          : 'execution v1 closeout 미완료';
  const releaseCopy = summary.ready
    ? release.artifactState === 'local-current'
      ? '현재 HEAD 기준 evidence/closeout/handoff가 로컬에서 갱신되었습니다. 커밋되지 않았지만 근거 문서는 최신입니다.'
      : 'deterministic 검증과 closeout checklist가 모두 닫혔습니다.'
    : baseline?.ready && release.stale
      ? '마지막 verified snapshot 기준 필수 closeout은 이미 닫혔습니다. 현재 화면의 evidence/closeout/handoff는 최신 HEAD와 어긋나 있어 current surface만 다시 생성하면 됩니다.'
      : baseline?.ready
        ? 'verified snapshot 기준 release baseline은 준비되어 있습니다. current surface evidence/closeout/handoff를 다시 만들면 현재 HEAD 기준 closeout 상태도 맞출 수 있습니다.'
        : release.stale
          ? '현재 HEAD와 evidence/closeout/handoff 문서 상태가 어긋나 있습니다. rerun 또는 refresh로 근거 문서를 다시 맞춰야 합니다.'
          : '남은 gap과 환경 block을 먼저 정리해야 closeout을 닫을 수 있습니다.';
  const staleReasons = Array.isArray(release.staleReasons) ? release.staleReasons : [];
  const localArtifactNotes = Array.isArray(release.localArtifactNotes) ? release.localArtifactNotes : [];
  const refreshPlan = release.refreshPlan || null;

  return `
    <section class="release-summary-grid">
      <div class="summary-chip">
        <span>deterministic smoke</span>
        <strong>${escapeHtml(`${coreDeterministicPassed}/${coreDeterministicTotal} passed`)}</strong>
      </div>
      <div class="summary-chip">
        <span>reference gate</span>
        <strong>${escapeHtml(referenceAdoptionLabel)}</strong>
      </div>
      <div class="summary-chip">
        <span>live helper</span>
        <strong>${escapeHtml(executionV1HelperLabel)}</strong>
      </div>
      <div class="summary-chip">
        <span>handoff generator</span>
        <strong>${escapeHtml(executionV1HandoffLabel)}</strong>
      </div>
      <div class="summary-chip">
        <span>열린 체크리스트</span>
        <strong>${escapeHtml(String(summary.checklistOpen || 0))}건</strong>
      </div>
      <div class="summary-chip">
        <span>필수 gap</span>
        <strong>${escapeHtml(String(summary.blockedItems || 0))}건</strong>
      </div>
      <div class="summary-chip">
        <span>verified baseline</span>
        <strong>${escapeHtml(baselineStateLabel)}</strong>
      </div>
      <div class="summary-chip">
        <span>optional provider gap</span>
        <strong>${escapeHtml(String(summary.optionalBlockedItems || 0))}건</strong>
      </div>
      <div class="summary-chip">
        <span>production blockers</span>
        <strong>${escapeHtml(String(productionBlockerCount))}건</strong>
      </div>
      <div class="summary-chip">
        <span>open blockers</span>
        <strong>${escapeHtml(String(currentOpenBlockerCount))}건</strong>
      </div>
      <div class="summary-chip">
        <span>production status</span>
        <strong>${escapeHtml(productionReadyStatus)}</strong>
      </div>
      <div class="summary-chip">
        <span>evidence 상태</span>
        <strong>${escapeHtml(artifactStateLabel)}</strong>
      </div>
      <div class="summary-chip" data-release-runtime-job-metric="true">
        <span>runtime jobs</span>
        <strong>${escapeHtml(`active ${Number(runtimeJobs.activeCount || 0)} · recent ${Number(runtimeJobs.recentCount || 0)}`)}</strong>
      </div>
      <div class="summary-chip">
        <span>최종 갱신</span>
        <strong>${escapeHtml(formatDate(release.updatedAt))}</strong>
      </div>
    </section>

    <section class="release-callout">
      <div>
        <p class="section-kicker">릴리스 상태</p>
        <h4>${escapeHtml(releaseHeadline)}</h4>
        <p>${escapeHtml(releaseCopy)}</p>
        ${release.stale
          ? `
              <div class="release-stale-note">
                ${staleReasons
                  .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                  .join('')}
              </div>
            `
          : ''}
        ${!release.stale && localArtifactNotes.length
          ? `
              <div class="release-stale-note">
                ${localArtifactNotes
                  .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                  .join('')}
              </div>
            `
          : ''}
        ${baseline?.ready
          ? `
              <div class="release-stale-note">
                <div class="release-stale-line">verified snapshot 기준 필수 closeout ${escapeHtml(String(baseline.checklistOpen || 0))}건 · 필수 gap ${escapeHtml(String(baseline.blockedItems || 0))}건입니다.</div>
                <div class="release-stale-line">snapshot commit ${escapeHtml(baseline.commit || '-')} · archived ${escapeHtml(formatDate(baseline.archivedAt || baseline.generatedAt || ''))}</div>
              </div>
            `
          : ''}
        ${refreshPlan
          ? `
              <div class="release-stale-note">
                <div class="release-stale-line">${escapeHtml(refreshPlan.summary || 'current surface regeneration preview를 확인할 수 없습니다.')}</div>
                ${(refreshPlan.notes || [])
                  .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                  .join('')}
              </div>
            `
          : ''}
        ${regenerationConfirmArmed
          ? `
              <div class="release-stale-note">
                <div class="release-stale-line">${escapeHtml(releaseRefreshPreflight?.summary || '재생성 확인이 활성화되었습니다. 이 작업은 current surface evidence, closeout, handoff를 다시 쓰고, deterministic verification을 다시 실행합니다.')}</div>
                <div class="release-stale-line">실행하려면 아래의 재생성 확인을 누르고, 취소하려면 현재 재생성 취소를 선택하세요.</div>
                ${(releaseRefreshPreflight?.notes || [])
                  .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                  .join('')}
              </div>
            `
          : ''}
        ${snapshotConfirmArmed
          ? `
              <div class="release-stale-note">
                <div class="release-stale-line">${escapeHtml(releaseSnapshotPreflight?.summary || 'release snapshot 고정 확인이 활성화되었습니다.')}</div>
                <div class="release-stale-line">실행하려면 아래의 snapshot 고정 확인을 누르고, 취소하려면 현재 snapshot 고정 취소를 선택하세요.</div>
                ${(releaseSnapshotPreflight?.notes || [])
                  .map((item) => `<div class="release-stale-line">${escapeHtml(item)}</div>`)
                  .join('')}
              </div>
            `
          : ''}
      </div>
      <div class="action-row">
        ${renderReleaseStatusRefreshButton({
          actionLabel: `상태 다시 읽기: ${releaseActionLabel}`,
        })}
        ${renderReleasePreflightAllButton({
          actionLabel: `전체 preflight 실행: ${releaseActionLabel}`,
        })}
        ${renderCommandCopyButton({
          actionLabel: `전체 preflight 명령 복사: ${releaseActionLabel}`,
          buttonText: '전체 preflight 명령 복사',
          command: 'npm run preflight:execution-v1:all',
          label: '전체 preflight 명령',
        })}
        ${renderReleaseConfirmActionButton({
          action: 'regenerate-release-surface',
          actionLabel: regenerationConfirmArmed
            ? `current surface 재생성 확인: ${releaseActionLabel}`
            : `current surface 재생성: ${releaseActionLabel}`,
          buttonText: regenerationConfirmArmed ? '재생성 확인' : 'current surface 재생성',
          className: regenerationConfirmArmed ? 'primary-button' : 'ghost-button',
          pressed: regenerationConfirmArmed,
        })}
        ${regenerationConfirmArmed
          ? renderReleaseSimpleActionButton({
              action: 'cancel-regenerate-release-surface',
              actionLabel: `current surface 재생성 취소: ${releaseActionLabel}`,
              buttonText: '현재 재생성 취소',
            })
          : ''}
        ${renderReleaseConfirmActionButton({
          action: 'archive-release-snapshot',
          actionLabel: snapshotConfirmArmed
            ? `release snapshot 고정 확인: ${releaseActionLabel}`
            : `release snapshot 고정: ${releaseActionLabel}`,
          buttonText: snapshotConfirmArmed ? 'snapshot 고정 확인' : 'release snapshot 고정',
          className: snapshotConfirmArmed ? 'primary-button' : 'ghost-button',
          disabled: !snapshotConfirmArmed && !snapshotEligibility.allowed,
          pressed: snapshotConfirmArmed,
        })}
        ${snapshotConfirmArmed
          ? renderReleaseSimpleActionButton({
              action: 'cancel-archive-release-snapshot',
              actionLabel: `release snapshot 고정 취소: ${releaseActionLabel}`,
              buttonText: '현재 snapshot 고정 취소',
            })
          : ''}
        ${renderReleaseTabActionButton({
          actionLabel: `실행 기록 보기: ${releaseActionLabel}`,
          buttonText: '실행 기록 보기',
          value: 'runs',
        })}
        ${renderReleaseTabActionButton({
          actionLabel: `하네스 보기: ${releaseActionLabel}`,
          buttonText: '하네스 보기',
          value: 'harness',
        })}
      </div>
    </section>
  `;
}

export function renderReleaseVerificationSurfaces({ release = {} } = {}) {
  const summary = release.summary || {};
  const deterministicRuntime = Array.isArray(release.deterministicRuntime) ? release.deterministicRuntime : [];
  const referenceAdoptionAggregate = release.referenceAdoptionAggregate || {};
  const referenceAdoptionScripts = Array.isArray(referenceAdoptionAggregate.scripts)
    ? referenceAdoptionAggregate.scripts
    : [];
  const referenceAdoptionScriptCount = Number(
    summary.referenceAdoptionAggregateScriptCount
      || referenceAdoptionAggregate.scriptCount
      || referenceAdoptionScripts.length
      || 0,
  );

  return `
    <section class="surface" data-release-deterministic-runtime="true">
      <div class="mini-head">
        <div>
          <p class="section-kicker">Deterministic Runtime Summary</p>
          <h4>smoke 실행 시간과 출력 크기</h4>
        </div>
        <div class="release-meta release-meta-secondary">
          <span class="item-meta">${escapeHtml(String(deterministicRuntime.length))} checks</span>
        </div>
      </div>
      <div class="release-current-status">
        ${deterministicRuntime.length
          ? deterministicRuntime
            .map(
              (item) => `
                <div class="harness-row" data-release-deterministic-runtime-row="${escapeHtml(item.script || '')}">
                  <div>
                    <div class="item-title">${escapeHtml(item.script || 'unknown smoke')}</div>
                    <div class="item-meta">${escapeHtml(item.summary || 'runtime summary unavailable')}</div>
                  </div>
                  <div class="harness-row-meta">
                    <span class="mini-badge status-running">${escapeHtml(item.elapsed || 'n/a')}</span>
                    <span class="item-meta">stdout ${escapeHtml(item.stdout || 'n/a')}</span>
                    <span class="item-meta">stderr ${escapeHtml(item.stderr || 'n/a')}</span>
                    <span class="item-meta">timeout ${escapeHtml(item.timeout || 'n/a')}</span>
                  </div>
                </div>
              `,
            )
            .join('')
          : `
              <article class="release-snapshot-card is-empty">
                <div class="item-title">deterministic runtime summary가 없습니다.</div>
                <p class="item-meta">archived live proof를 유지하려면 기존 evidence를 재사용하고, provider proof를 갱신할 때만 selected live evidence command를 실행하세요.</p>
              </article>
            `}
      </div>
    </section>

    <section class="surface" data-release-reference-adoption-aggregate="true">
      <div class="mini-head">
        <div>
          <p class="section-kicker">Reference Adoption Aggregate</p>
          <h4>외부 레퍼런스 채택 회귀 게이트</h4>
        </div>
        <div class="release-meta release-meta-secondary">
          <span class="item-meta">${escapeHtml(String(referenceAdoptionScriptCount))} scripts</span>
          <span class="item-meta">${escapeHtml(referenceAdoptionAggregate.totalDuration || 'duration n/a')}</span>
        </div>
      </div>
      <div class="release-current-status">
        ${referenceAdoptionScripts.length
          ? referenceAdoptionScripts
            .map(
              (item) => `
                <div class="harness-row" data-release-reference-adoption-row="${escapeHtml(item.script || '')}">
                  <div>
                    <div class="item-title">${escapeHtml(item.script || 'unknown reference smoke')}</div>
                    <div class="item-meta">borrowed-pattern regression coverage</div>
                  </div>
                  <div class="harness-row-meta">
                    <span class="mini-badge ${item.status === 'passed' ? 'status-completed' : 'status-failed'}">${escapeHtml(item.status || 'unknown')}</span>
                    <span class="item-meta">${escapeHtml(item.duration || 'duration n/a')}</span>
                    ${item.timeout ? `<span class="item-meta">timeout ${escapeHtml(item.timeout)}</span>` : ''}
                    ${typeof item.timedOut === 'boolean'
                      ? `<span class="item-meta">timedOut ${escapeHtml(String(item.timedOut))}</span>`
                      : ''}
                  </div>
                </div>
              `,
            )
            .join('')
          : `
              <article class="release-snapshot-card is-empty">
                <div class="item-title">reference adoption aggregate details가 없습니다.</div>
                <p class="item-meta">archived live proof를 유지하려면 기존 evidence를 재사용하고, provider proof를 갱신할 때만 selected live evidence command를 실행하세요.</p>
              </article>
            `}
      </div>
    </section>
  `;
}

function renderReleaseRuntimeJobCard(job = {}, bucket = 'recent') {
  const jobId = String(job.id || '').trim();
  const requestId = String(job.requestId || '').trim();
  const status = String(job.status || (bucket === 'active' ? 'active' : 'unknown')).trim();
  const scope = String(job.scope || '').trim();
  const durationLabel = bucket === 'active' ? 'running' : formatDurationMs(job.durationMs);
  const timestamp = bucket === 'active' ? job.startedAt : job.endedAt || job.startedAt;
  const kindLabel = {
    'execution-v1-refresh': 'execution v1 refresh',
    'execution-v1-snapshot': 'execution v1 snapshot',
  }[String(job.kind || '').trim().toLowerCase()] || getDisplayLabel(job.kind || 'runtime job');
  const scopeLabel = {
    'current-surface': 'current surface',
    'live-validation': 'live validation',
    'provider-readiness': 'provider readiness',
    snapshot: 'snapshot freeze',
  }[scope.toLowerCase()] || 'release flow';

  return `
    <article class="release-snapshot-card" data-release-runtime-job-id="${escapeHtml(jobId)}">
      <div class="release-provider-meta">
        <div>
          <div class="item-title">${escapeHtml(kindLabel)}</div>
          <div class="item-meta">${escapeHtml(scope ? scopeLabel : 'runtime flow')}${requestId ? ` · request ${escapeHtml(requestId.slice(0, 12))}` : ''}</div>
        </div>
        <div class="release-history-actions">
          <span class="mini-badge ${getReleaseStatusBadge(status)}">${escapeHtml(status || 'unknown')}</span>
          <span class="mini-badge status-pending">${escapeHtml(durationLabel)}</span>
        </div>
      </div>
      <div class="item-meta">${escapeHtml(job.summary || (bucket === 'active' ? 'runtime job is currently active.' : 'runtime job summary가 없습니다.'))}</div>
      <div class="release-meta release-meta-secondary">
        <span class="item-meta">${escapeHtml(bucket === 'active' ? 'started' : 'finished')} ${escapeHtml(formatDate(timestamp))}</span>
        ${jobId ? `<span class="item-meta mono">${escapeHtml(jobId.slice(0, 24))}</span>` : ''}
        ${job.source ? `<span class="item-meta">${escapeHtml(job.source)}</span>` : ''}
      </div>
    </article>
  `;
}

export function renderReleaseRuntimeJobs({ release = {} } = {}) {
  const runtimeJobs = release.runtimeJobs || {};
  const activeRuntimeJobs = Array.isArray(runtimeJobs.active) ? runtimeJobs.active.slice(0, 5) : [];
  const recentRuntimeJobs = Array.isArray(runtimeJobs.recent) ? runtimeJobs.recent.slice(0, 5) : [];
  const visibleRuntimeJobs = [
    ...activeRuntimeJobs.map((item) => ({ bucket: 'active', item })),
    ...recentRuntimeJobs.map((item) => ({ bucket: 'recent', item })),
  ].slice(0, 8);

  return `
    <section class="surface" data-release-runtime-job-list="true">
      <div class="mini-head">
        <div>
          <p class="section-kicker">Runtime Job History</p>
          <h4>active/recent release runtime jobs</h4>
        </div>
        <div class="release-meta release-meta-secondary">
          <span class="item-meta">active ${escapeHtml(String(activeRuntimeJobs.length))}</span>
          <span class="item-meta">recent ${escapeHtml(String(runtimeJobs.recentCount || recentRuntimeJobs.length))}</span>
        </div>
      </div>
      <div class="release-history-list">
        ${visibleRuntimeJobs.length
          ? visibleRuntimeJobs.map(({ bucket, item }) => renderReleaseRuntimeJobCard(item, bucket)).join('')
          : `
              <article class="release-snapshot-card is-empty">
                <div class="item-title">최근 runtime job 기록이 없습니다.</div>
                <p class="item-meta">current surface 재생성 또는 release snapshot 고정을 실행하면 job id, request id, duration, status가 여기에 표시됩니다.</p>
              </article>
            `}
      </div>
    </section>
  `;
}

export function renderReleaseCloseoutChecklist({ release = {} } = {}) {
  const checklist = Array.isArray(release.checklist) ? release.checklist : [];
  const values = release.values || {};
  const docStatuses = Array.isArray(release.docStatuses) ? release.docStatuses : [];

  return `
    <section class="surface">
      <div class="mini-head">
        <div>
          <p class="section-kicker">Closeout Checklist</p>
          <h4>마감 체크리스트와 현재 상태</h4>
        </div>
      </div>
      <div class="release-meta">
        <span class="item-meta">branch ${escapeHtml(release.branch || '-')}</span>
        <span class="item-meta mono">${escapeHtml(release.commit || '-')}</span>
      </div>
      ${release.currentCommit || release.currentBranch
        ? `
            <div class="release-meta release-meta-secondary">
              <span class="item-meta">current ${escapeHtml(release.currentBranch || '-')}</span>
              <span class="item-meta mono">${escapeHtml(release.currentCommit || '-')}</span>
            </div>
          `
        : ''}
      <div class="release-checklist">
        ${checklist
          .map(
            (item) => `
              <div class="release-checklist-item ${item.done ? 'is-ready' : 'is-blocked'}">
                <span class="status-badge ${item.done ? 'status-completed' : 'status-failed'}">${escapeHtml(item.done ? '완료' : '남음')}</span>
                <div>
                  <strong>${escapeHtml(item.label)}</strong>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
      <div class="release-current-status">
        ${Object.entries(values)
          .map(
            ([label, value]) => `
              <div class="harness-row">
                <div>
                  <div class="item-title">${escapeHtml(label)}</div>
                </div>
                <div class="harness-row-meta">
                  <span class="mini-badge ${getReleaseStatusBadge(value)}">${escapeHtml(value)}</span>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
      ${docStatuses.length
        ? `
            <div class="release-doc-status-list">
              ${docStatuses
                .map(
                  (item) => `
                    <div class="harness-row">
                      <div>
                        <div class="item-title">${escapeHtml(item.path)}</div>
                      </div>
                      <div class="harness-row-meta">
                        <span class="mini-badge status-failed">${escapeHtml(item.status)}</span>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          `
        : ''}
    </section>
  `;
}
