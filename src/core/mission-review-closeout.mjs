function normalizeText(value) {
  return String(value || '').trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function joinBullets(items, fallback) {
  const list = ensureArray(items).filter(Boolean);
  return list.length ? list.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

function renderReviewerReport({ verdict, findings, checks }) {
  return `# Reviewer Report

## Verdict
- verdict: ${verdict}

## Checks
${joinBullets(
  ensureArray(checks).map((check) => `${check.passed ? 'pass' : 'fail'}: ${check.id} - ${check.description}`),
  'No additional rubric checks recorded.',
)}

## Findings
${joinBullets(findings, 'No findings. The draft preserves required sections and includes a next action.')}

## Next Action
${verdict === 'pass' ? '- continue to completion or approval gate' : '- revise the draft before proceeding'}
`;
}

export function buildReviewerReconciliation({ deterministicReview, reviewerStage, updatedAt }) {
  const reviewerVerdict = normalizeText(reviewerStage.output?.verdict);
  if (!reviewerVerdict || reviewerVerdict === deterministicReview.verdict) {
    return null;
  }

  const passed = deterministicReview.verdict !== 'fail';
  const report = renderReviewerReport(deterministicReview);
  const outputSummary = passed
    ? 'Deterministic review passed after provider mismatch.'
    : 'Deterministic review failed after provider mismatch.';

  return {
    output: {
      ...reviewerStage.output,
      artifactContent: report,
      checks: deterministicReview.checks,
      findings: deterministicReview.findings,
      summaryText: outputSummary,
      verdict: deterministicReview.verdict,
    },
    runPatch: {
      outputSummary,
      status: passed ? 'completed' : 'failed',
      updatedAt,
    },
  };
}

export function buildReviewerFollowUpSeed({ at, mission, reviewerStage, session, workspace }) {
  return {
    actionClass: 'retry-ready',
    actionId: `reviewer-follow-up:${mission.id}:${session.id}`,
    actionType: 'reviewer-follow-up',
    createdAt: at,
    deliverableType: mission.deliverableType,
    findings: reviewerStage.output.findings,
    missionId: mission.id,
    missionStatus: 'failed',
    missionTitle: mission.title,
    mode: mission.mode,
    reason: reviewerStage.run.outputSummary,
    reportPath: reviewerStage.artifact.path,
    requestedByRole: 'reviewer',
    resolutionKind: '',
    resolutionNote: '',
    resolvedAt: null,
    sessionId: session.id,
    sessionStatus: 'failed',
    status: 'open',
    title: `Reviewer follow-up required for ${mission.title}`,
    updatedAt: at,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}

export function buildExecutionManifestArtifact({ executionContext, generatedAt, mission, session, workspace }) {
  if (!executionContext.manifest) {
    return null;
  }

  return {
    missionId: mission.id,
    sessionId: session.id,
    role: 'executor',
    kind: 'execution-manifest',
    fileName: 'execution-manifest.json',
    title: 'Execution Manifest',
    content: `${JSON.stringify(
      {
        ...executionContext.manifest,
        generatedAt,
        manifestHash: executionContext.manifestHash,
        missionId: mission.id,
        reviewSessionId: executionContext.reviewSession?.id || null,
        workspacePath: workspace.path,
      },
      null,
      2,
    )}\n`,
  };
}

export function buildApprovalRequest({ mission, risk, session }) {
  return {
    kind: risk.kind,
    missionId: mission.id,
    reason: risk.reason,
    requestedByRole: 'reviewer',
    sessionId: session.id,
    title: risk.title,
  };
}

export function buildMissionCloseoutResult({
  approval = null,
  artifactPath,
  execution,
  learningCandidate,
  mission,
  providerId,
  reviewerVerdict,
  session,
}) {
  return {
    approval,
    artifactPath,
    ...(execution ? { execution } : {}),
    learningCandidate,
    mission,
    provider: providerId,
    reviewerVerdict,
    session,
  };
}
