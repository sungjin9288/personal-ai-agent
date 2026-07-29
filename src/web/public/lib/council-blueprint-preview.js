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

export function renderCouncilBlueprintPreview({ catalog, error = '', loading = false, preview, selectedRoleIds = [] } = {}) {
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
        return `<button type="button" class="council-blueprint-role-button${isSelected ? ' is-selected' : ''}" data-council-blueprint-role="${escapeHtml(role.id)}" aria-pressed="${isSelected}" aria-label="${isSelected ? 'Remove' : 'Add'} ${escapeHtml(role.id)} council specialist"${loading || cannotRemove || cannotAdd ? ' disabled' : ''}>${escapeHtml(title(role.id))}</button>`;
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
    <p class="council-blueprint-no-execution">No execution action is available here. This panel has read-only authority only.</p>
  </div>`;
}
