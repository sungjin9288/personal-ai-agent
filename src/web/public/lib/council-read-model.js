const COUNCIL_SEATS = Object.freeze([
  { id: 'research', label: '리서치' },
  { id: 'implementation', label: '구현' },
  { id: 'verification', label: '검증' },
]);

const EMPTY_VALUE = '기록 없음';
const COUNCIL_APPROVAL_KINDS = new Set(['provider_selection', 'workspace_execution']);

const STATE_COPY = Object.freeze({
  blocked: {
    label: '중단됨',
    summary: '검증 또는 승인 기록이 협의를 중단한 상태입니다.',
  },
  completed: {
    label: '완료',
    summary: '검증된 협의와 reviewer 기록이 모두 남아 있습니다.',
  },
  empty: {
    label: '협의 없음',
    summary: '선택한 세션에는 council 기록이 없습니다.',
  },
  loading: {
    label: '불러오는 중',
    summary: '선택한 세션의 협의 기록을 확인하고 있습니다.',
  },
  'approval-pending': {
    label: '승인 대기',
    summary: '협의와 reviewer 검증은 끝났고 사람의 결정을 기다립니다.',
  },
  'reviewer-failed': {
    label: 'Reviewer 실패',
    summary: 'reviewer가 협의 결과를 통과시키지 않았습니다.',
  },
});

function text(value) {
  return String(value || '').trim();
}

function records(value) {
  return Array.isArray(value) ? value : [];
}

function latest(items, getTimestamp) {
  return [...items].sort((left, right) => {
    const leftAt = text(getTimestamp(left));
    const rightAt = text(getTimestamp(right));
    return leftAt.localeCompare(rightAt) || text(left.id).localeCompare(text(right.id));
  }).at(-1) || null;
}

function runTimestamp(run) {
  return run?.endedAt || run?.startedAt || '';
}

function artifactTimestamp(artifact) {
  return artifact?.updatedAt || artifact?.createdAt || '';
}

function approvalTimestamp(approval) {
  return approval?.resolvedAt || approval?.createdAt || '';
}

function findRunArtifact(run, artifacts, preferredKinds) {
  const artifactById = new Map(artifacts.map((artifact) => [text(artifact.id), artifact]));
  const candidates = records(run?.artifactIds)
    .map((artifactId) => artifactById.get(text(artifactId)))
    .filter(Boolean);

  for (const kind of preferredKinds) {
    const match = latest(
      candidates.filter((artifact) => text(artifact.kind) === kind),
      artifactTimestamp,
    );
    if (match) {
      return match;
    }
  }

  return latest(candidates, artifactTimestamp);
}

function buildEvidenceReference(referenceId, frame, artifacts) {
  const id = text(referenceId);
  const catalogEntry = records(frame?.evidenceCatalog).find((entry) => text(entry.id) === id) || null;
  const artifactId = id.startsWith('artifact:') ? id.slice('artifact:'.length) : '';
  const artifact = artifacts.find((item) => text(item.id) === artifactId) || null;
  const allowedArtifact =
    artifact &&
    catalogEntry?.kind === 'artifact' &&
    text(catalogEntry.councilId) === text(frame?.councilId) &&
    text(catalogEntry.sessionId) === text(artifact.sessionId)
      ? artifact
      : null;

  return {
    artifact: allowedArtifact,
    id: id || EMPTY_VALUE,
    kind: text(catalogEntry?.kind) || EMPTY_VALUE,
  };
}

function buildClaim(claim, frame, artifacts) {
  return {
    evidence: records(claim?.evidenceRefs).map((referenceId) =>
      buildEvidenceReference(referenceId, frame, artifacts)),
    id: text(claim?.id) || EMPTY_VALUE,
    position: text(claim?.position) || EMPTY_VALUE,
    severity: text(claim?.severity) || EMPTY_VALUE,
    summary: text(claim?.summary) || EMPTY_VALUE,
  };
}

function buildStatement(run, frame, artifacts) {
  if (!run) {
    return {
      artifact: null,
      claims: [],
      nextAction: EMPTY_VALUE,
      runId: null,
      status: EMPTY_VALUE,
    };
  }

  return {
    artifact: findRunArtifact(run, artifacts, ['deliverable']),
    claims: records(run.councilStatement?.claims).map((claim) => buildClaim(claim, frame, artifacts)),
    nextAction: text(run.councilStatement?.nextAction) || text(run.nextAction) || EMPTY_VALUE,
    runId: text(run.id) || null,
    status: text(run.status) || EMPTY_VALUE,
  };
}

function buildDecisionItems(ids, claimById, frame, artifacts) {
  return records(ids).map((claimId) => {
    const id = text(claimId);
    const claim = claimById.get(id) || null;
    return {
      evidence: records(claim?.evidenceRefs).map((referenceId) =>
        buildEvidenceReference(referenceId, frame, artifacts)),
      id: id || EMPTY_VALUE,
      summary: text(claim?.summary) || EMPTY_VALUE,
    };
  });
}

function buildRejectedItems(items, claimById) {
  return records(items).map((item) => {
    const id = text(item?.claimId);
    return {
      id: id || EMPTY_VALUE,
      reason: text(item?.reason) || EMPTY_VALUE,
      summary: text(claimById.get(id)?.summary) || EMPTY_VALUE,
    };
  });
}

function selectReviewerRun(runs, synthesisRun, session) {
  if (!synthesisRun) {
    return null;
  }

  const runIds = records(session?.agentRunIds).map(text);
  const synthesisIndex = runIds.indexOf(text(synthesisRun.id));
  if (synthesisIndex < 0) {
    return null;
  }

  const expectedReviewerId = runIds[synthesisIndex + 1];
  const reviewer = runs.find((run) => text(run.id) === expectedReviewerId) || null;
  if (text(reviewer?.role) !== 'reviewer') {
    return null;
  }

  const synthesisAt = text(runTimestamp(synthesisRun));
  const reviewerAt = text(reviewer.startedAt || reviewer.endedAt);
  return !synthesisAt || !reviewerAt || synthesisAt <= reviewerAt ? reviewer : null;
}

function selectCouncilApproval(approvals, reviewerRun, session) {
  if (!reviewerRun) {
    return { ambiguous: false, approval: null };
  }

  const reviewerAt = text(runTimestamp(reviewerRun));
  const approvalIds = new Set(records(session?.approvalIds).map(text));
  const councilApprovals = approvals.filter((approval) => {
    const createdAt = text(approval.createdAt);
    return (
      approvalIds.has(text(approval.id)) &&
      COUNCIL_APPROVAL_KINDS.has(text(approval.kind)) &&
      text(approval.requestedByRole) === 'reviewer' &&
      (!reviewerAt || !createdAt || reviewerAt <= createdAt)
    );
  });
  return {
    ambiguous: councilApprovals.length > 1,
    approval: councilApprovals.length === 1 ? councilApprovals[0] : null,
  };
}

function buildReviewer(reviewerRun, artifacts) {
  if (!reviewerRun) {
    return {
      artifact: null,
      result: EMPTY_VALUE,
      runId: null,
      summary: EMPTY_VALUE,
    };
  }

  const runStatus = text(reviewerRun.status);
  const result = runStatus === 'completed'
    ? 'pass'
    : ['blocked', 'failed'].includes(runStatus)
      ? 'fail'
      : runStatus || EMPTY_VALUE;

  return {
    artifact: findRunArtifact(reviewerRun, artifacts, ['agent-output']),
    result,
    runId: text(reviewerRun.id) || null,
    summary: text(reviewerRun.outputSummary) || EMPTY_VALUE,
  };
}

function buildHumanApproval(approval) {
  if (!approval) {
    return {
      decisionReason: EMPTY_VALUE,
      id: null,
      status: EMPTY_VALUE,
      title: EMPTY_VALUE,
    };
  }

  return {
    decisionReason: text(approval.decisionReason) || text(approval.reason) || EMPTY_VALUE,
    id: text(approval.id) || null,
    status: text(approval.status) || EMPTY_VALUE,
    title: text(approval.title) || EMPTY_VALUE,
  };
}

function deriveState({
  approval,
  approvalAmbiguous,
  councilRuns,
  reviewer,
  sessionStatus,
  synthesisRun,
}) {
  const validationStatus = text(synthesisRun?.councilValidation?.status);
  const hasBlockedCouncilRun = councilRuns.some((run) =>
    ['blocked', 'failed'].includes(text(run.status)),
  );

  if (
    approvalAmbiguous ||
    validationStatus === 'blocked' ||
    validationStatus === 'failed' ||
    hasBlockedCouncilRun
  ) {
    return 'blocked';
  }
  if (reviewer.result === 'fail') {
    return 'reviewer-failed';
  }
  if (approval?.status === 'pending') {
    return 'approval-pending';
  }
  if (approval?.status === 'rejected') {
    return 'blocked';
  }
  if (
    validationStatus === 'passed' &&
    reviewer.result === 'pass' &&
    sessionStatus === 'completed' &&
    (!approval || approval.status === 'approved')
  ) {
    return 'completed';
  }
  return 'blocked';
}

function deriveNextAction({ approval, reviewerRun, state, synthesisRun }) {
  if (state === 'approval-pending') {
    return text(approval?.title) || text(approval?.reason) || EMPTY_VALUE;
  }
  if (state === 'reviewer-failed') {
    return text(reviewerRun?.nextAction) || text(reviewerRun?.outputSummary) || EMPTY_VALUE;
  }
  if (state === 'blocked' && approval?.status === 'rejected') {
    return text(approval.decisionReason) || text(approval.reason) || text(approval.title) || EMPTY_VALUE;
  }
  return (
    text(synthesisRun?.councilSynthesis?.nextAction) ||
    text(synthesisRun?.nextAction) ||
    text(synthesisRun?.outputSummary) ||
    EMPTY_VALUE
  );
}

function emptyReadModel(state) {
  return {
    agreement: [],
    artifacts: {},
    councilId: null,
    humanApproval: buildHumanApproval(null),
    nextAction: EMPTY_VALUE,
    rejectedOptions: [],
    reviewer: buildReviewer(null, []),
    seats: COUNCIL_SEATS.map((seat) => ({
      ...seat,
      opening: buildStatement(null, null, []),
      rebuttal: buildStatement(null, null, []),
    })),
    state,
    stateCopy: STATE_COPY[state],
    synthesis: null,
    unresolvedConflicts: [],
  };
}

export function buildCouncilReadModel({ loading = false, sessionPayload = null } = {}) {
  if (loading) {
    return emptyReadModel('loading');
  }

  const sessionId = text(sessionPayload?.session?.id);
  if (!sessionId) {
    return emptyReadModel('empty');
  }

  const runs = records(sessionPayload?.agentRuns).filter(
    (run) => text(run.sessionId) === sessionId,
  );
  const artifacts = records(sessionPayload?.artifacts).filter(
    (artifact) => text(artifact.sessionId) === sessionId,
  );
  const approvals = records(sessionPayload?.approvals).filter(
    (approval) => text(approval.sessionId) === sessionId,
  );
  const councilRuns = runs.filter((run) => text(run.councilId));

  if (!councilRuns.length) {
    return emptyReadModel('empty');
  }

  const councilId = text(latest(councilRuns, runTimestamp)?.councilId);
  const selectedCouncilRuns = councilRuns.filter((run) => text(run.councilId) === councilId);
  const frame =
    selectedCouncilRuns.find((run) => text(run.councilFrame?.councilId) === councilId)?.councilFrame ||
    null;
  const openingRuns = selectedCouncilRuns.filter(
    (run) => text(run.councilPhase) === 'opening-position',
  );
  const rebuttalRuns = selectedCouncilRuns.filter(
    (run) => text(run.councilPhase) === 'rebuttal',
  );
  const synthesisRun = latest(
    selectedCouncilRuns.filter((run) => text(run.councilPhase) === 'synthesis'),
    runTimestamp,
  );
  const reviewerRun = selectReviewerRun(runs, synthesisRun, sessionPayload.session);
  const reviewer = buildReviewer(reviewerRun, artifacts);
  const approvalSelection = selectCouncilApproval(approvals, reviewerRun, sessionPayload.session);
  const approval = approvalSelection.approval;
  const synthesis = synthesisRun?.councilSynthesis || null;
  const claimById = new Map(
    [...openingRuns, ...rebuttalRuns]
      .flatMap((run) => records(run.councilStatement?.claims))
      .map((claim) => [text(claim.id), claim]),
  );
  const state = deriveState({
    approval,
    approvalAmbiguous: approvalSelection.ambiguous,
    councilRuns: selectedCouncilRuns,
    reviewer,
    sessionStatus: text(sessionPayload.session.status),
    synthesisRun,
  });

  return {
    agreement: buildDecisionItems(synthesis?.agreementIds, claimById, frame, artifacts),
    artifacts: {
      manifest:
        latest(
          artifacts.filter(
            (artifact) =>
              text(artifact.kind) === 'council-manifest' &&
              text(artifact.metadata?.councilId) === councilId,
          ),
          artifactTimestamp,
        ) || null,
      synthesis: findRunArtifact(synthesisRun, artifacts, ['deliverable']),
    },
    councilId,
    humanApproval: buildHumanApproval(approval),
    nextAction: deriveNextAction({ approval, reviewerRun, state, synthesisRun }),
    rejectedOptions: buildRejectedItems(synthesis?.rejectedClaims, claimById),
    reviewer,
    seats: COUNCIL_SEATS.map((seat) => ({
      ...seat,
      opening: buildStatement(
        latest(
          openingRuns.filter((run) => text(run.councilSeatId) === seat.id),
          runTimestamp,
        ),
        frame,
        artifacts,
      ),
      rebuttal: buildStatement(
        latest(
          rebuttalRuns.filter((run) => text(run.councilSeatId) === seat.id),
          runTimestamp,
        ),
        frame,
        artifacts,
      ),
    })),
    state,
    stateCopy: STATE_COPY[state],
    synthesis,
    unresolvedConflicts: buildDecisionItems(
      synthesis?.unresolvedConflictIds,
      claimById,
      frame,
      artifacts,
    ),
  };
}

export { COUNCIL_SEATS, EMPTY_VALUE };
