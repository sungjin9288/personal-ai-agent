import { escapeHtml, getStatusClass } from './html-format.js';
import { renderRetrievalArtifactOpenButton } from './render-fragments.js';

const EMPTY_VALUE = '기록 없음';

function renderArtifactButton(artifact, buttonText) {
  if (!artifact) {
    return `<span class="council-missing">${EMPTY_VALUE}</span>`;
  }

  return renderRetrievalArtifactOpenButton({
    artifact,
    buttonText,
    className: 'ghost-button council-artifact-button',
    openLabel: `협의 산출물 열기: ${artifact.title || artifact.fileName || artifact.id}`,
  });
}

function renderEvidence(evidence = []) {
  if (!evidence.length) {
    return `<span class="council-missing">${EMPTY_VALUE}</span>`;
  }

  return evidence
    .map((reference) => {
      if (!reference.artifact) {
        return `<span class="council-evidence-id mono">${escapeHtml(reference.id)}</span>`;
      }
      return renderArtifactButton(reference.artifact, reference.artifact.title || '근거 열기');
    })
    .join('');
}

function renderClaims(claims = []) {
  if (!claims.length) {
    return `<p class="council-missing">${EMPTY_VALUE}</p>`;
  }

  return `
    <ul class="council-claim-list">
      ${claims
        .map(
          (claim) => `
            <li>
              <div class="council-claim-head">
                <strong>${escapeHtml(claim.summary)}</strong>
                <span class="mini-badge ${getStatusClass(claim.severity)}">${escapeHtml(claim.severity)}</span>
              </div>
              <div class="council-evidence-row" aria-label="주장 근거">
                ${renderEvidence(claim.evidence)}
              </div>
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
}

function renderRound(round, label) {
  return `
    <section class="council-round" aria-label="${escapeHtml(label)}">
      <div class="council-round-head">
        <h6>${escapeHtml(label)}</h6>
        ${renderArtifactButton(round.artifact, `${label} 산출물`)}
      </div>
      ${renderClaims(round.claims)}
    </section>
  `;
}

function renderSeats(seats = []) {
  return `
    <div class="council-seat-grid" aria-label="seat별 opening과 rebuttal">
      ${seats
        .map(
          (seat) => `
            <article
              class="council-seat"
              tabindex="0"
              data-council-focus-key="seat-${escapeHtml(seat.id)}"
              aria-label="${escapeHtml(seat.label)} seat 협의 기록"
            >
              <header class="council-seat-head">
                <p class="section-kicker">Council seat</p>
                <h5>${escapeHtml(seat.label)}</h5>
              </header>
              ${renderRound(seat.opening, 'Opening')}
              ${renderRound(seat.rebuttal, 'Rebuttal')}
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderDecisionItems(items, emptyDetail = EMPTY_VALUE) {
  if (!items.length) {
    return `<p class="council-missing">${escapeHtml(emptyDetail)}</p>`;
  }

  return `
    <ul class="council-decision-list">
      ${items
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.summary)}</strong>
              ${item.reason ? `<p>${escapeHtml(item.reason)}</p>` : ''}
              ${item.evidence ? `<div class="council-evidence-row">${renderEvidence(item.evidence)}</div>` : ''}
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
}

function renderEmptyState(model) {
  return `
    <div class="council-board-state council-board-state-${escapeHtml(model.state)}">
      <p class="council-state-announcement" role="status" aria-live="polite">
        ${escapeHtml(model.stateCopy.label)} · ${escapeHtml(model.stateCopy.summary)}
      </p>
      <div class="empty-card">
        <strong>${escapeHtml(model.stateCopy.label)}</strong>
        <p>${escapeHtml(model.stateCopy.summary)}</p>
      </div>
      <aside class="council-next-action" aria-label="현재 증적에 근거한 다음 행동">
        <span>Next action</span>
        <strong>${escapeHtml(model.nextAction)}</strong>
      </aside>
    </div>
  `;
}

export function renderCouncilBoard(model) {
  if (['loading', 'empty'].includes(model.state)) {
    return renderEmptyState(model);
  }

  const approvalStatusClass =
    model.humanApproval.status === EMPTY_VALUE ? '' : getStatusClass(model.humanApproval.status);
  const reviewerStatusClass =
    model.reviewer.result === EMPTY_VALUE ? '' : getStatusClass(model.reviewer.result);

  return `
    <div class="council-board-state council-board-state-${escapeHtml(model.state)}">
      <div class="council-board-topline">
        <p class="council-state-announcement" role="status" aria-live="polite">
          ${escapeHtml(model.stateCopy.label)} · ${escapeHtml(model.stateCopy.summary)}
        </p>
        <div class="council-board-artifacts" aria-label="협의 핵심 산출물">
          ${renderArtifactButton(model.artifacts.manifest, 'Manifest 열기')}
          ${renderArtifactButton(model.artifacts.synthesis, 'Synthesis 열기')}
        </div>
      </div>

      ${renderSeats(model.seats)}

      <div class="council-decision-grid">
        <section class="council-decision-card is-agreement">
          <p class="section-kicker">Agreement</p>
          <h5>합의된 주장</h5>
          ${renderDecisionItems(model.agreement)}
        </section>
        <section class="council-decision-card is-rejected">
          <p class="section-kicker">Rejected option</p>
          <h5>채택하지 않은 선택지</h5>
          ${renderDecisionItems(model.rejectedOptions)}
        </section>
        <section class="council-decision-card is-conflict">
          <p class="section-kicker">Unresolved conflict</p>
          <h5>남은 충돌</h5>
          ${renderDecisionItems(model.unresolvedConflicts)}
        </section>
      </div>

      <div class="council-review-grid">
        <section class="council-review-card">
          <div class="council-review-head">
            <div>
              <p class="section-kicker">Independent reviewer</p>
              <h5>Reviewer 결과</h5>
            </div>
            <span class="mini-badge ${reviewerStatusClass}">${escapeHtml(model.reviewer.result)}</span>
          </div>
          <p>${escapeHtml(model.reviewer.summary)}</p>
          ${renderArtifactButton(model.reviewer.artifact, 'Reviewer 기록 열기')}
        </section>
        <section class="council-review-card">
          <div class="council-review-head">
            <div>
              <p class="section-kicker">Human approval</p>
              <h5>사람의 승인</h5>
            </div>
            <span class="mini-badge ${approvalStatusClass}">${escapeHtml(model.humanApproval.status)}</span>
          </div>
          <strong>${escapeHtml(model.humanApproval.title)}</strong>
          <p>${escapeHtml(model.humanApproval.decisionReason)}</p>
        </section>
      </div>

      <aside class="council-next-action" aria-label="현재 증적에 근거한 다음 행동">
        <span>Next action</span>
        <strong>${escapeHtml(model.nextAction)}</strong>
      </aside>
    </div>
  `;
}
