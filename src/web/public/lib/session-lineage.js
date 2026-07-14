import {
  escapeHtml,
  formatDate,
  formatDurationMs,
  getDisplayLabel,
  getStatusClass,
} from './html-format.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value || '').trim();
}

function count(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function describeRunLinks(run, missionId, sessionId) {
  const gaps = [];
  if (!text(run.missionId)) {
    gaps.push('mission ID 없음');
  } else if (text(run.missionId) !== missionId) {
    gaps.push(`mission ID 불일치: ${text(run.missionId)}`);
  }
  if (!text(run.sessionId)) {
    gaps.push('session ID 없음');
  } else if (text(run.sessionId) !== sessionId) {
    gaps.push(`session ID 불일치: ${text(run.sessionId)}`);
  }
  return gaps;
}

function buildRunLineage(run, { artifactsById, missionId, sessionId }) {
  const artifactIds = asArray(run.artifactIds).map(text).filter(Boolean);
  const artifacts = artifactIds.map((artifactId) => artifactsById.get(artifactId)).filter(Boolean);
  const missingArtifactIds = artifactIds.filter((artifactId) => !artifactsById.has(artifactId));
  const attempts = asArray(run.attemptHistory).filter((attempt) => count(attempt?.attempt) > 0);
  const attemptCount = count(run.attemptCount, attempts.at(-1)?.attempt || 0);
  const retryCount = count(run.retryCount, Math.max(0, attemptCount - 1));
  const gaps = describeRunLinks(run, missionId, sessionId);

  if (!text(run.providerResponseId)) {
    gaps.push('provider response ID 없음');
  }
  if (!text(run.endedAt)) {
    gaps.push('run 종료 시각 없음');
  }
  if (retryCount > 0 && attempts.length === 0) {
    gaps.push('provider retry 상세 없음');
  }
  if (missingArtifactIds.length > 0) {
    gaps.push(`artifact record 없음: ${missingArtifactIds.join(', ')}`);
  }

  return {
    artifactIds,
    artifacts,
    attemptCount,
    attempts,
    gaps,
    id: text(run.id),
    parentRunId: text(run.parentRunId),
    providerId: text(run.providerId),
    providerResponseId: text(run.providerResponseId),
    resumeFromRunId: text(run.resumeFromRunId),
    retryCount,
    role: text(run.role || run.workflowRole),
    runEndedAt: text(run.endedAt),
    startedAt: text(run.startedAt),
    status: text(run.status),
  };
}

export function createSessionLineage(sessionPayload = {}) {
  const mission = sessionPayload.mission || {};
  const session = sessionPayload.session || {};
  const artifacts = asArray(sessionPayload.artifacts);
  const artifactsById = new Map(artifacts.map((artifact) => [text(artifact.id), artifact]).filter(([id]) => id));
  const missionId = text(mission.id);
  const sessionId = text(session.id);
  const runs = asArray(sessionPayload.agentRuns).map((run) =>
    buildRunLineage(run, { artifactsById, missionId, sessionId }),
  );
  const linkedArtifactIds = new Set(runs.flatMap((run) => run.artifactIds));
  const sourceContext = session.sourceContext || {};

  return {
    fallback: sourceContext.providerFallbackRequested
      ? {
          attempt: count(sourceContext.providerFallbackAttempt, 1),
          attemptCount: count(sourceContext.providerFallbackAttemptCount, 1),
          policy: text(sourceContext.providerFallbackPolicy),
          primaryProviderId: text(sourceContext.providerFallbackPrimary),
        }
      : null,
    mission: {
      id: missionId,
      title: text(mission.title),
    },
    runs,
    session: {
      endedAt: text(session.endedAt),
      id: sessionId,
      providerId: text(session.provider),
      startedAt: text(session.startedAt),
    },
    unlinkedArtifacts: artifacts.filter((artifact) => !linkedArtifactIds.has(text(artifact.id))),
  };
}

function renderAttempt(attempt) {
  const result = attempt.ok ? '성공' : '실패';
  const details = [
    `시도 ${count(attempt.attempt)} ${result}`,
    Number.isFinite(Number(attempt.durationMs)) ? formatDurationMs(attempt.durationMs) : '',
    Number.isFinite(Number(attempt.httpStatus)) ? `HTTP ${Number(attempt.httpStatus)}` : '',
    text(attempt.failureKind) ? `원인 ${text(attempt.failureKind)}` : '',
  ].filter(Boolean);
  return details.join(' · ');
}

function renderRunLineage(run, fallbackProviderId) {
  const providerId = run.providerId || fallbackProviderId || '미기록';
  const response = run.providerResponseId || '연결 기록 없음';
  const runEndedAt = run.runEndedAt ? formatDate(run.runEndedAt) : '종료 시각 기록 없음';
  const attempts = run.attempts.length
    ? run.attempts.map((attempt) => `<div>${escapeHtml(renderAttempt(attempt))}</div>`).join('')
    : '<div>개별 시도 기록 없음</div>';
  const runLinks = [
    run.parentRunId ? `parent ${run.parentRunId}` : '',
    run.resumeFromRunId ? `resume ${run.resumeFromRunId}` : '',
  ].filter(Boolean);
  const artifacts = run.artifacts.length
    ? run.artifacts
        .map((artifact) => {
          const label = text(artifact.title || artifact.fileName || artifact.id);
          const createdAt = text(artifact.createdAt) ? formatDate(artifact.createdAt) : '시각 기록 없음';
          return `<div>${escapeHtml(label)} · <span class="mono">${escapeHtml(artifact.id)}</span> · ${escapeHtml(createdAt)}</div>`;
        })
        .join('')
    : '<div>연결된 산출물 기록 없음</div>';
  const gaps = run.gaps.length
    ? `<div class="item-meta" data-lineage-gaps="true"><strong>누락</strong> ${escapeHtml(run.gaps.join(' · '))}</div>`
    : '<div class="item-meta" data-lineage-gaps="false"><strong>연결 상태</strong> 기록 일치</div>';

  return `
    <div class="inspector-block session-lineage-run" data-session-lineage-run="${escapeHtml(run.id)}">
      <h3>${escapeHtml(getDisplayLabel(run.role || run.id, run.role || run.id || '실행'))}</h3>
      <div class="status-row">
        <span class="mini-badge ${escapeHtml(getStatusClass(run.status))}">${escapeHtml(getDisplayLabel(run.status))}</span>
        <span class="mini-badge ${escapeHtml(getStatusClass(providerId))}">${escapeHtml(providerId)}</span>
      </div>
      <div class="item-meta mono" data-lineage-step="run"><strong>run</strong> ${escapeHtml(run.id || '연결 기록 없음')} · ${escapeHtml(run.startedAt ? formatDate(run.startedAt) : '시각 기록 없음')}</div>
      <div class="item-meta mono" data-lineage-step="provider-response"><strong>provider response</strong> ${escapeHtml(response)} · run 종료 ${escapeHtml(runEndedAt)}</div>
      <div class="item-meta" data-lineage-step="retry"><strong>provider retry</strong> ${escapeHtml(String(run.retryCount))}회 · 총 ${escapeHtml(String(run.attemptCount))}회 시도${attempts}</div>
      <div class="item-meta mono" data-lineage-step="run-link"><strong>실행 재개</strong> ${escapeHtml(runLinks.join(' · ') || '연결 기록 없음')}</div>
      <div class="item-meta" data-lineage-step="artifact"><strong>산출물</strong>${artifacts}</div>
      ${gaps}
    </div>`;
}

export function renderSessionLineage(sessionPayload = {}) {
  const lineage = createSessionLineage(sessionPayload);
  if (!lineage.session.id) {
    return '<p class="empty-state">세션 연결 기록이 없습니다.</p>';
  }

  const missionLabel = lineage.mission.title || lineage.mission.id || '연결 기록 없음';
  const sessionWindow = `${lineage.session.startedAt ? formatDate(lineage.session.startedAt) : '시작 시각 없음'} → ${lineage.session.endedAt ? formatDate(lineage.session.endedAt) : '종료 시각 없음'}`;
  const fallback = lineage.fallback
    ? `<div class="item-meta mono" data-lineage-step="fallback"><strong>provider fallback</strong> ${escapeHtml(String(lineage.fallback.attempt))}/${escapeHtml(String(lineage.fallback.attemptCount))} · primary ${escapeHtml(lineage.fallback.primaryProviderId || '연결 기록 없음')} · policy ${escapeHtml(lineage.fallback.policy || '연결 기록 없음')}</div>`
    : '';
  const runs = lineage.runs.length
    ? lineage.runs.map((run) => renderRunLineage(run, lineage.session.providerId)).join('')
    : '<p class="empty-state">실행 연결 기록이 없습니다.</p>';
  const unlinkedArtifacts = lineage.unlinkedArtifacts.length
    ? `
      <div class="inspector-block" data-lineage-unlinked-artifacts="true">
        <h3>실행 연결이 없는 산출물</h3>
        ${lineage.unlinkedArtifacts
          .map((artifact) => `<div class="item-meta mono">${escapeHtml(artifact.id)} · ${escapeHtml(artifact.title || artifact.fileName || '')}</div>`)
          .join('')}
      </div>`
    : '';

  return `
    <div class="inspector-block session-lineage-context" data-session-lineage="${escapeHtml(lineage.session.id)}">
      <h3>${escapeHtml(missionLabel)}</h3>
      <div class="item-meta mono" data-lineage-step="mission"><strong>mission</strong> ${escapeHtml(lineage.mission.id || '연결 기록 없음')}</div>
      <div class="item-meta mono" data-lineage-step="session"><strong>session</strong> ${escapeHtml(lineage.session.id)} · ${escapeHtml(sessionWindow)}</div>
      ${fallback}
    </div>
    ${runs}
    ${unlinkedArtifacts}`;
}
