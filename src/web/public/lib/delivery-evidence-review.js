import { escapeHtml } from './html-format.js';

const MAX_BYTES = 1024 * 1024;
const nextSteps = {
  missing: '검사 증거를 추가하세요.', stale: '현재 기준에 맞는 검사 결과를 다시 수집하세요.',
  failed: '실패 원인을 해결하고 다시 검사하세요.', incomplete: '생략·중단된 검사를 확인하세요.',
  conflicting: '서로 다른 결과의 원인을 확인하세요.', current: '보고된 PASS의 내용과 요구사항 연결을 검토하세요.',
};

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function replaceBundleImpact(bundle, impactInput) {
  const { bundleDigest, ...input } = bundle;
  input.impactInput = impactInput;
  const bytes = new TextEncoder().encode(canonicalJson(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return { ...input, bundleDigest: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') };
}

export function createDeliveryReviewController({ api, getWorkspaceId, onChange, download }) {
  const state = { workspaceId: getWorkspaceId(), input: '', impactInput: '', result: null, busy: false,
    error: '', reviewDraftDirty: false, impactDraftDirty: false, revalidationRequired: false, draftVersion: 0 };
  let epoch = 0;
  function invalidate() {
    epoch++;
    state.draftVersion++;
    Object.assign(state, { result: null, busy: false, error: '', reviewDraftDirty: false,
      impactDraftDirty: false, revalidationRequired: false, impactInput: '' });
  }
  function syncWorkspace() {
    if (state.workspaceId === getWorkspaceId()) return;
    invalidate();
    state.workspaceId = getWorkspaceId();
    state.input = '';
    onChange(state);
  }
  function setInput(value) {
    syncWorkspace();
    invalidate();
    state.input = value;
    onChange(state);
  }
  async function request(body, accept, retain = false) {
    syncWorkspace();
    const workspace = state.workspaceId;
    const token = ++epoch;
    const previous = state.result;
    Object.assign(state, { result: retain ? previous : null, error: '', busy: true });
    onChange(state);
    const current = () => epoch === token && getWorkspaceId() === workspace;
    try {
      if (!workspace) throw new Error('워크스페이스를 먼저 선택하세요.');
      const options = body ? { method: 'POST', body: JSON.stringify(body) } : undefined;
      if (options && new TextEncoder().encode(options.body).length > MAX_BYTES) throw new Error('검토 요청은 1 MiB 이하여야 합니다.');
      const payload = await api(`/api/workspaces/${encodeURIComponent(workspace)}/delivery-evidence`, options);
      if (!current()) return;
      if (payload.workspaceId !== workspace) throw new Error('현재 워크스페이스와 다른 결과입니다.');
      state.result = payload;
      state.reviewDraftDirty = false;
      state.impactDraftDirty = false;
      state.revalidationRequired = false;
      state.impactInput = payload.impactInput ? JSON.stringify(payload.impactInput, null, 2) : '';
      if (payload.bundle) state.input = JSON.stringify(payload.bundle);
      if (accept) accept(payload);
    } catch (error) {
      if (!current()) return;
      state.result = retain ? previous : null;
      state.revalidationRequired = retain;
      state.error = error.message || '검토 요청을 완료하지 못했습니다.';
    } finally {
      if (current()) {
        state.busy = false;
        onChange(state);
      }
    }
  }
  async function loadCurrent() {
    invalidate();
    return request(undefined, payload => { state.input = JSON.stringify(payload.packet, null, 2); });
  }
  async function evaluate() {
    syncWorkspace();
    invalidate();
    let body;
    try {
      if (new TextEncoder().encode(state.input).length > MAX_BYTES) throw new Error('JSON은 1 MiB 이하여야 합니다.');
      const parsed = JSON.parse(state.input);
      if (parsed?.schemaVersion === 'delivery-review-bundle/v1') body = { bundle: parsed };
      else {
        if (parsed?.review) throw new Error('이전 형식 검토 파일의 메모는 자동 복원할 수 없습니다. 원본을 보존하고 packet을 별도로 입력하세요.');
        body = { packet: parsed?.packet ?? parsed };
      }
    } catch (error) {
      invalidate();
      state.error = error instanceof SyntaxError ? '올바른 packet, importer 출력 또는 검토 bundle JSON을 입력하세요.' : error.message;
      onChange(state);
      return;
    }
    return request(body);
  }
  async function importFile(file) {
    if (!file) return;
    syncWorkspace();
    invalidate();
    const token = epoch, workspace = state.workspaceId;
    state.busy = true;
    onChange(state);
    const current = () => epoch === token && getWorkspaceId() === workspace;
    try {
      if (file.size > MAX_BYTES) throw new Error('JSON 파일은 1 MiB 이하여야 합니다.');
      const bytes = await file.arrayBuffer();
      if (!current()) return;
      if (bytes.byteLength > MAX_BYTES) throw new Error('JSON 파일은 1 MiB 이하여야 합니다.');
      const input = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      setInput(input);
      return evaluate();
    } catch {
      if (!current()) return;
      state.error = '1 MiB 이하의 UTF-8 JSON 파일을 선택하세요. 원본 파일은 변경하지 않습니다.';
      state.busy = false;
      onChange(state);
    }
  }
  function setImpactInput(value) {
    syncWorkspace();
    epoch++;
    Object.assign(state, { impactInput: value, impactDraftDirty: true, busy: false, error: '' });
    onChange(state);
  }
  async function applyImpact() {
    syncWorkspace();
    const result = state.result;
    if (!result || state.busy || state.reviewDraftDirty) return;
    let impactInput;
    try {
      if (new TextEncoder().encode(state.impactInput).length > MAX_BYTES) throw new Error();
      impactInput = state.impactInput.trim() ? JSON.parse(state.impactInput) : null;
    } catch {
      state.error = '1 MiB 이하의 올바른 영향 JSON을 입력하세요. 빈 입력은 영향을 제거합니다.';
      onChange(state);
      return;
    }
    const token = ++epoch, workspace = state.workspaceId;
    state.busy = true;
    onChange(state);
    try {
      // Replace, rather than duplicate, the graph in a bounded portable request.
      const body = result.bundle ? { bundle: await replaceBundleImpact(result.bundle, impactInput) } : { packet: result.packet, impactInput };
      if (epoch !== token || getWorkspaceId() !== workspace) return;
      return request(body, undefined, true);
    } catch {
      if (epoch !== token || getWorkspaceId() !== workspace) return;
      state.busy = false;
      state.error = '변경 영향 입력의 digest를 만들 수 없습니다. 안전한 local 연결에서 다시 확인하세요.';
      onChange(state);
    }
  }
  async function record({ reviewerName, requirementId, kind, reason }) {
    syncWorkspace();
    const result = state.result;
    if (!result || state.busy || state.impactDraftDirty) return;
    const entries = [...(result.review?.entries || []).filter(row => row.requirementId !== requirementId), { requirementId, kind, reason }];
    return request({ packet: result.packet, review: { bindingDigest: result.bindingDigest, reviewerName, entries },
      ...(result.impactInput ? { impactInput: result.impactInput } : {}) }, undefined, true);
  }
  async function exportResult(format) {
    syncWorkspace();
    const displayed = state.result;
    if (!displayed || state.busy || state.reviewDraftDirty || state.impactDraftDirty || state.revalidationRequired || !['json', 'markdown'].includes(format)) return;
    // Recheck current source, but keep the exact displayed review and its timestamp.
    return request(displayed.bundle ? { bundle: displayed.bundle } : { packet: displayed.packet }, verified => {
      if (verified.bindingDigest !== displayed.bindingDigest || JSON.stringify(verified.report) !== JSON.stringify(displayed.report) ||
        (displayed.bundle && (verified.bundle?.bundleDigest !== displayed.bundle.bundleDigest ||
          JSON.stringify(verified.impactReport) !== JSON.stringify(displayed.impactReport)))) {
        throw new Error('검토 기준이 달라졌습니다. 다시 확인하세요.');
      }
      state.result = displayed;
      download(format === 'json' ? JSON.stringify(displayed.bundle || displayed) + '\n' : displayed.markdown,
        format === 'json' ? 'application/json' : 'text/markdown',
        `delivery-review-${displayed.bindingDigest.slice(0, 12)}.${format === 'json' ? 'json' : 'md'}`);
    }, true);
  }
  return { state, setInput, setImpactInput, applyImpact, importFile, syncWorkspace, loadCurrent, evaluate, record, export: exportResult,
    editReviewDraft() { epoch++; state.busy = false; state.reviewDraftDirty = true; onChange(state); } };
}

export function renderDeliveryReview(result) {
  const { report, review } = result;
  return `<div class="delivery-binding">
    <p><strong>${escapeHtml(report.status)}</strong> · ${escapeHtml(report.target.projectId)}</p>
    <p>source revision <code>${escapeHtml(result.packet.target.sourceRevision)}</code></p>
    <p>검토 binding <code>${escapeHtml(result.bindingDigest)}</code></p>
    <p>증거 진위: unverified · 인수/배포: not-assessed · 실행 허가 없음</p>
  </div>${report.requirements.map(requirement => `<article class="delivery-requirement">
    <h5>${escapeHtml(requirement.id)} · ${escapeHtml(requirement.status)}</h5>
    <p>${escapeHtml(requirement.criterion)}</p>
    <p>요구사항 연결: ${requirement.mappingConfirmed ? '입력자가 확인했다고 선언함' : '사람의 확인 필요'}</p>
    ${requirement.checks.map(check => `<details open><summary>${escapeHtml(check.id)} · ${escapeHtml(check.status)}</summary>
      <p>${escapeHtml(nextSteps[check.status] || '검사 내용을 확인하세요.')}</p>
      <ul>${check.currentEvidence.map(row => `<li>${escapeHtml(row.id)}: ${escapeHtml(row.result)}</li>`).join('')}
      ${check.excludedEvidence.map(row => `<li>제외 ${escapeHtml(row.id)}: ${escapeHtml(row.mismatches.join(', '))} 불일치</li>`).join('')}</ul>
    </details>`).join('')}
  </article>`).join('')}
  ${report.unmatchedEvidence.length ? `<p>범위 밖 근거: ${report.unmatchedEvidence.map(row => escapeHtml(row.id)).join(', ')}</p>` : ''}
  ${review ? `<section class="delivery-requirement"><h5>반영된 검토 메모</h5>
    <p>${escapeHtml(review.reviewer?.name)} · 자기 선언, 신원 인증 아님</p>
    ${review.entries.map(row => `<p>${escapeHtml(row.requirementId)} · ${escapeHtml(row.kind)}: ${escapeHtml(row.reason)}</p>`).join('')}
    <p>검토 시각 ${escapeHtml(review.reviewedAt)} · 자기 선언 시각, 서버 저장 이력 아님</p>
    <p>메모는 원래 판정·요구사항 연결·실행 권한을 변경하지 않습니다.</p></section>` : ''}
  ${result.impactReport ? `<div class="delivery-requirement"><h5>선언된 변경 영향 · ${escapeHtml(result.impactReport.status)}</h5>
    <p>입력자가 선언한 변경과 의존성만 평가합니다. 자동 Git diff·완전한 graph가 아니며, PASS 재사용·CI 생략·실행을 허가하지 않습니다.</p>
    ${result.impactReport.requirements.map(row => `<h6>${escapeHtml(row.id)} · ${escapeHtml(row.status)}</h6>
      <p>이유: ${row.reasons.map(escapeHtml).join(', ')}</p>
      <p>영향 경로: ${row.changedPaths.map(escapeHtml).join(', ') || '없음'}</p>
      <p>불명 경로: ${row.unknownPaths.map(escapeHtml).join(', ') || '없음'}</p>`).join('')}</div>` : ''}`;
}

let mounted;
export function syncDeliveryWorkspaceSelection() { mounted?.syncWorkspace(); }

export function mountDeliveryReview({ root, api, getWorkspaceId }) {
  const get = id => root.querySelector(`#delivery-${id}`);
  let renderedResult;
  let renderedDraftVersion = 0;
  const controller = createDeliveryReviewController({ api, getWorkspaceId,
    download(text, type, name) {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const link = document.createElement('a');
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    onChange(state) {
      if (renderedDraftVersion !== state.draftVersion) {
        renderedDraftVersion = state.draftVersion;
        get('record-form').reset();
      }
      root.setAttribute('aria-busy', String(state.busy));
      if (get('input').value !== state.input) get('input').value = state.input;
      if (get('impact-input').value !== state.impactInput) get('impact-input').value = state.impactInput;
      get('status').textContent = state.error || (state.busy ? '현재 기준을 확인하고 있습니다.' :
        state.impactDraftDirty ? '변경 영향 초안을 반영해야 메모 반영·내보내기를 할 수 있습니다.' :
        state.reviewDraftDirty ? '메모 초안을 반영해야 내보낼 수 있습니다.' :
          state.result ? '현재 관찰한 기준으로 판정했습니다. 내보내기 전 다시 확인합니다.' : '현재 기준을 읽거나 packet을 입력하세요.');
      get('record-fields').disabled = !state.result || state.busy || state.impactDraftDirty;
      get('impact-fields').disabled = !state.result || state.busy || state.reviewDraftDirty;
      get('evaluate').disabled = state.busy;
      for (const format of ['json', 'markdown']) get(format).disabled = !state.result || state.busy || state.reviewDraftDirty || state.impactDraftDirty || state.revalidationRequired;
      if (renderedResult !== state.result) {
        renderedResult = state.result;
        get('result').innerHTML = state.result ? renderDeliveryReview(state.result) : '';
        if (state.result || !state.busy) {
          const selected = get('requirement').value;
          const requirements = state.result?.report.requirements || [];
          get('requirement').innerHTML = requirements.map(row =>
            `<option value="${escapeHtml(row.id)}">${escapeHtml(row.id)}</option>`).join('');
          if (requirements.some(row => row.id === selected)) get('requirement').value = selected;
        }
      }
      if (state.error) get('status').focus();
    },
  });
  mounted = controller;
  get('current').addEventListener('click', () => controller.loadCurrent());
  get('input').addEventListener('input', event => controller.setInput(event.target.value));
  get('file').addEventListener('change', event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    controller.importFile(file);
  });
  get('impact-input').addEventListener('input', event => controller.setImpactInput(event.target.value));
  get('impact-form').addEventListener('submit', event => { event.preventDefault(); controller.applyImpact(); });
  get('evaluate-form').addEventListener('submit', event => { event.preventDefault(); controller.evaluate(); });
  get('record-form').addEventListener('input', () => controller.editReviewDraft());
  get('record-form').addEventListener('submit', event => {
    event.preventDefault();
    controller.record({ reviewerName: get('reviewer').value, requirementId: get('requirement').value,
      kind: get('kind').value, reason: get('reason').value });
  });
  for (const format of ['json', 'markdown']) get(format).addEventListener('click', () => controller.export(format));
  return controller;
}
