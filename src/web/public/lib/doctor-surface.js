// Impure doctor-surface domain extracted from app.js.
// Owns the local diagnostics fetch, summary render, action wiring, and
// summary-copy flow. Reads shared `state`/`elements` from app-state.js and
// re-imports the `api`, `setUiNotice`, and `copyPlainTextValue` helpers from
// app.js (module cycles with function declarations are safe in browsers).
import { state, elements } from './app-state.js';
import { escapeHtml, formatDate } from './html-format.js';
import { renderDoctorDetailPanel } from './render-fragments.js';
import { api, setUiNotice, copyPlainTextValue } from '../app.js';

async function copyDoctorDiagnosticsSummary() {
  if (!state.doctor) {
    setUiNotice('복사할 doctor 진단 결과가 없습니다.');
    return;
  }

  await copyPlainTextValue(state.doctor.handoffSummary || '', {
    promptMessage: 'doctor 진단 요약을 복사하세요.',
    shownNotice: 'doctor 진단 요약을 표시했습니다.',
    successNotice: 'doctor 진단 요약을 복사했습니다.',
    unavailableNotice: '브라우저가 doctor 진단 요약 복사를 지원하지 않습니다.',
  });
}

export function renderDoctorSummary() {
  if (!elements.doctorSummary) {
    return;
  }

  const doctor = state.doctor;
  if (!doctor) {
    elements.doctorSummary.className = 'doctor-summary';
    elements.doctorSummary.innerHTML = `
      <p class="flow-status-label">로컬 진단</p>
      <strong class="flow-status-value">진단 대기 중</strong>
      <p class="flow-status-copy">필수 파일, scripts, provider 설정 상태를 확인합니다.</p>
    `;
    return;
  }

  const summary = doctor.summary || {};
  const pass = Number(summary.pass || 0);
  const warn = Number(summary.warn || 0);
  const fail = Number(summary.fail || 0);
  const providers = Array.isArray(doctor.providers) ? doctor.providers : [];
  const checks = Array.isArray(doctor.checks) ? doctor.checks : [];
  const attentionChecks = checks.filter((check) => ['fail', 'warn'].includes(check.status));
  const generatedAt = doctor.generatedAt || '';
  const missingProviderIds = providers
    .filter((provider) => provider.id !== 'stub' && !provider.configured)
    .map((provider) => provider.id)
    .filter(Boolean);
  const statusClass = fail > 0 ? 'is-danger' : warn > 0 ? 'is-warning' : 'is-success';
  const statusLabel = fail > 0 ? '확인 필요' : warn > 0 ? '경고 있음' : '정상';
  const copy = fail > 0
    ? '필수 파일 또는 script 등록 상태를 확인해야 합니다.'
    : missingProviderIds.length
      ? `${missingProviderIds.join(', ')} provider env 미설정`
      : '필수 파일과 provider 진단이 통과했습니다.';

  elements.doctorSummary.className = `doctor-summary ${statusClass}`;
  elements.doctorSummary.innerHTML = `
    <p class="flow-status-label">로컬 진단</p>
    <strong class="flow-status-value">${escapeHtml(statusLabel)} · pass ${escapeHtml(pass)} · warn ${escapeHtml(warn)} · fail ${escapeHtml(fail)}</strong>
    <p class="flow-status-copy">${escapeHtml(copy)}</p>
    <div class="doctor-summary-actions">
      <button
        class="ghost-button doctor-refresh-button"
        type="button"
        data-doctor-refresh="true"
        aria-label="로컬 진단 새로고침"
        title="로컬 진단 새로고침"
        ${state.doctorLoading ? 'disabled' : ''}
      >
        ${state.doctorLoading ? '새로고침 중' : '새로고침'}
      </button>
      <button
        class="ghost-button doctor-copy-button"
        type="button"
        data-doctor-copy-summary="true"
        aria-label="doctor 진단 요약 복사"
        title="doctor 진단 요약 복사"
      >
        요약 복사
      </button>
      <button
        class="ghost-button doctor-detail-toggle"
        type="button"
        data-doctor-detail-toggle="true"
        aria-controls="doctor-detail-panel"
        aria-expanded="${state.doctorDetailsExpanded ? 'true' : 'false'}"
        aria-label="${state.doctorDetailsExpanded ? '로컬 진단 상세 닫기' : '로컬 진단 상세 보기'}"
        title="${state.doctorDetailsExpanded ? '로컬 진단 상세 닫기' : '로컬 진단 상세 보기'}"
      >
        ${state.doctorDetailsExpanded ? '상세 닫기' : '상세 보기'}
      </button>
      <span class="mini-badge ${attentionChecks.length ? 'status-pending' : 'status-completed'}">${escapeHtml(String(attentionChecks.length))} checks</span>
      <span class="doctor-refresh-meta">갱신 ${escapeHtml(formatDate(generatedAt))}</span>
    </div>
    ${state.doctorDetailsExpanded ? renderDoctorDetailPanel({ attentionChecks, providers }) : ''}
  `;
  wireDoctorSummaryActions();
}

function wireDoctorSummaryActions() {
  const copyButton = elements.doctorSummary?.querySelector('[data-doctor-copy-summary]');
  const refreshButton = elements.doctorSummary?.querySelector('[data-doctor-refresh]');
  const toggleButton = elements.doctorSummary?.querySelector('[data-doctor-detail-toggle]');
  copyButton?.addEventListener('click', () => {
    void copyDoctorDiagnosticsSummary();
  });
  refreshButton?.addEventListener('click', () => {
    void loadDoctor({ keepDetailsExpanded: true });
  });
  toggleButton?.addEventListener('click', () => {
    state.doctorDetailsExpanded = !state.doctorDetailsExpanded;
    renderDoctorSummary();
  });
}

export async function loadDoctor({ keepDetailsExpanded = false } = {}) {
  if (!keepDetailsExpanded) {
    state.doctorDetailsExpanded = false;
  }
  state.doctorLoading = true;
  renderDoctorSummary();
  try {
    state.doctor = await api('/api/doctor');
  } catch (error) {
    state.doctor = {
      mode: 'doctor',
      ok: false,
      summary: {
        fail: 1,
        pass: 0,
        total: 1,
        warn: 0,
      },
      providers: [],
      error: error.message || 'doctor diagnostics unavailable',
    };
  } finally {
    state.doctorLoading = false;
  }
  renderDoctorSummary();
}
