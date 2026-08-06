function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function title(roleId) {
  return roleId.charAt(0).toUpperCase() + roleId.slice(1);
}

function renderRoleDetails(role) {
  return `<article class="council-blueprint-role-card">
    <div class="council-blueprint-role-heading"><strong>${escapeHtml(title(role.id))}</strong><span>${escapeHtml(role.kind)}</span></div>
    <p>${escapeHtml(role.responsibility)}</p>
    <dl>
      <div><dt>Evidence</dt><dd>${escapeHtml(role.evidenceAllowlist.join(' · '))}</dd></div>
      <div><dt>Prohibited</dt><dd>${escapeHtml(role.prohibitedActions.join(' · '))}</dd></div>
      <div><dt>Output</dt><dd>${escapeHtml(role.outputContract)}</dd></div>
    </dl>
  </article>`;
}

function renderScheduleWave(wave, projection) {
  const readyStageIds = new Set(projection?.readyStageIds || []);
  const stages = (projection?.stages || []).filter((stage) => wave.stageIds.includes(stage.id));
  return `<li><strong>${escapeHtml(wave.id)}</strong><span>${escapeHtml(wave.status || 'waiting')}</span><small>barrier: ${escapeHtml(wave.barrier)} · canonical merge: ${escapeHtml(wave.stageIds.join(', '))}${readyStageIds.size ? ` · ready: ${escapeHtml([...readyStageIds].filter((id) => wave.stageIds.includes(id)).join(', ') || 'none')}` : ''}${stages.some((stage) => stage.status === 'dependency-blocked') ? ' · downstream dependency-blocked' : ''}</small></li>`;
}

function renderScheduleComparison(preview, scheduleShadow) {
  const baselineStages = scheduleShadow?.sequentialBaseline?.meetingPlan?.stages || preview?.meetingPlan?.stages || [];
  const schedule = scheduleShadow?.schedule;
  const projection = scheduleShadow?.completionProjection;
  if (!schedule || !projection) return '';

  return `<section class="council-blueprint-plan council-schedule-shadow" aria-label="Synthetic concurrent schedule comparison">
    <h5>Sequential baseline vs four candidate waves</h5>
    <p>Sequential baseline: ${escapeHtml(baselineStages.map((stage) => stage.id).join(' → '))}</p>
    <ol>${schedule.waves.map((wave) => renderScheduleWave({ ...wave, status: projection.waves.find((item) => item.id === wave.id)?.status }, projection)).join('')}</ol>
    <p class="council-blueprint-no-execution">Parity — stage ids: ${escapeHtml(scheduleShadow.parity?.stageIdsEqual)}, dependencies: ${escapeHtml(scheduleShadow.parity?.dependenciesEqual)}, authority: ${escapeHtml(scheduleShadow.parity?.authorityEqual)}.</p>
    <p class="council-blueprint-no-execution">Blocker: ${projection.blocker ? `${escapeHtml(projection.blocker.stageId)} · ${escapeHtml(projection.blocker.waveId)} · ${escapeHtml(projection.blocker.outcome)}` : 'none'}.</p>
    <p class="council-blueprint-no-execution">Synthetic/read-only schedule · actualConcurrentDispatch: false · overall: ${escapeHtml(projection.overallStatus)}. No execution or dispatch action is available here.</p>
  </section>`;
}

function renderEnvelopeShadow(envelopeShadow) {
  const envelope = envelopeShadow?.syntheticEnvelope;
  const safety = envelopeShadow?.safetyEnvelope;
  if (!envelope || !safety) return '';

  return `<section class="council-blueprint-plan council-schedule-shadow" aria-label="Synthetic concurrent envelope">
    <h5>Deterministic synthetic concurrency envelope</h5>
    <p>Sequential latency: ${escapeHtml(envelope.sequentialLatencyTicks)} synthetic-tick · Wave latency: ${escapeHtml(envelope.waveLatencyTicks)} synthetic-tick · Wave peak: ${escapeHtml(envelope.wavePeakResourceUnits)} synthetic-slot · Max parallelism: ${escapeHtml(envelope.maxParallelism)}.</p>
    <p class="council-blueprint-no-execution">${escapeHtml(safety.result)}${safety.failureCodes.length ? ` · ${escapeHtml(safety.failureCodes.join(', '))}` : ''}. decision: ${escapeHtml(envelopeShadow.decision)}.</p>
    <p class="council-blueprint-no-execution">Structural units only — actualMeasurements: false · actualConcurrentDispatchQualified: false · external/model/download/C13 calls: 0. No runtime measurement or dispatch action is available here.</p>
  </section>`;
}

function renderRetryTerminalityShadow(retryTerminalityShadow) {
  if (!retryTerminalityShadow) return '';

  const lineage = retryTerminalityShadow.retryLineage;
  const terminality = retryTerminalityShadow.retryTerminality;
  const parentAttempt = lineage?.parentAttempt;
  const projectedAttempt = lineage?.projectedAttempt;
  const nextBarrier = terminality?.nextBarrier;
  const lineageText = lineage
    ? `${escapeHtml(lineage.stageId)} · attempt ${escapeHtml(parentAttempt.attemptNumber)} / retry ${escapeHtml(parentAttempt.retryCount)} → virtual attempt ${escapeHtml(projectedAttempt.attemptNumber)} / retry ${escapeHtml(projectedAttempt.retryCount)}`
    : 'No retry candidate until a canonical timeout projection is supplied through CLI or GET.';
  const barrierText = nextBarrier
    ? `${escapeHtml(nextBarrier.state)}${nextBarrier.waveId ? ` · ${escapeHtml(nextBarrier.waveId)}` : ''}${nextBarrier.blockedBy ? ` · ${escapeHtml(nextBarrier.blockedBy)}` : ''}${nextBarrier.readyStageIds ? ` · ready: ${escapeHtml(nextBarrier.readyStageIds.join(', '))}` : ''}`
    : 'none';

  return `<section class="council-blueprint-plan council-retry-terminality-shadow" aria-label="Retry terminality projection">
    <h5>Retry lineage and terminality projection</h5>
    <p>Projection status: ${escapeHtml(retryTerminalityShadow.state)} · terminality: ${escapeHtml(terminality?.status || 'not-started')}.</p>
    <p>Lineage: ${lineageText}</p>
    <p>Next barrier: ${barrierText}</p>
    <p class="council-blueprint-no-execution">retryDecision: ${escapeHtml(retryTerminalityShadow.retryDecision)} · decision: ${escapeHtml(retryTerminalityShadow.decision)} · actualRetryAuthorized: false · actualRetryExecuted: false · actualConcurrentDispatchQualified: false.</p>
  </section>`;
}

export function renderCouncilBlueprintPreview({ catalog, envelopeShadow, error = '', loading = false, preview, retryTerminalityShadow, scheduleShadow, selectedRoleIds = [] } = {}) {
  const selectableRoles = catalog?.selectableRoles || [];
  const selected = new Set(selectedRoleIds);
  const selectedRoles = preview?.specialists || selectableRoles.filter((role) => selected.has(role.id));
  const fixedRoles = preview?.fixedRoles || catalog?.fixedRoles || [];
  const stages = preview?.statusProjection?.stages || [];
  const count = selectedRoleIds.length;

  return `<div class="council-blueprint-preview-shell" aria-live="polite">
    <div class="council-blueprint-preview-head">
      <div>
        <p class="section-kicker">Council blueprint preview</p>
        <h4>읽기 전용 역할 회의 미리보기</h4>
        <p>미션 생성·실행과 분리된 projection입니다. 선택은 어떠한 실행 권한도 만들지 않습니다.</p>
      </div>
      <span class="council-blueprint-boundary">productionReadyClaim: false · C13: keep-stub-only</span>
    </div>
    <div class="council-blueprint-role-selector" role="group" aria-label="Select three to seven council specialist roles">
      ${selectableRoles.map((role) => {
        const isSelected = selected.has(role.id);
        const cannotRemove = isSelected && count <= 3;
        const cannotAdd = !isSelected && count >= 7;
        const actionLabel = `${isSelected ? 'Remove' : 'Add'} ${role.id} council specialist`;
        return `<button type="button" class="council-blueprint-role-button${isSelected ? ' is-selected' : ''}" data-council-blueprint-role="${escapeHtml(role.id)}" aria-pressed="${isSelected}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${loading || cannotRemove || cannotAdd ? ' disabled' : ''}>${escapeHtml(title(role.id))}</button>`;
      }).join('')}
    </div>
    <p class="council-blueprint-selection-count">${count}/7 specialist roles selected (minimum 3). Chair and reviewer are locked.</p>
    ${loading ? '<p class="council-blueprint-status">Preview를 계산하는 중입니다.</p>' : ''}
    ${error ? `<p class="council-blueprint-status is-error">${escapeHtml(error)}</p>` : ''}
    <div class="council-blueprint-role-grid">
      ${selectedRoles.map(renderRoleDetails).join('')}
      ${fixedRoles.map(renderRoleDetails).join('')}
    </div>
    <section class="council-blueprint-plan" aria-label="Council meeting plan">
      <h5>Opening → rebuttal → chair → reviewer</h5>
      <ol>
        ${stages.map((stage) => `<li><strong>${escapeHtml(stage.id)}</strong><span>${escapeHtml(stage.status)}</span><small>${stage.dependsOn.length ? `depends on ${escapeHtml(stage.dependsOn.join(', '))}` : 'no dependencies'}${stage.targetRoleId ? ` · targets ${escapeHtml(stage.targetRoleId)}` : ''}</small></li>`).join('')}
      </ol>
    </section>
    ${renderScheduleComparison(preview, scheduleShadow)}
    ${renderEnvelopeShadow(envelopeShadow)}
    ${renderRetryTerminalityShadow(retryTerminalityShadow)}
    <p class="council-blueprint-no-execution">No execution action is available here. This panel has read-only authority only.</p>
  </div>`;
}
