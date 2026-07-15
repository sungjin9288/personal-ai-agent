function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function startExecutionSession(session, at) {
  return {
    ...session,
    startedAt: session.startedAt || at,
    status: 'running',
    updatedAt: at,
  };
}

export function startExecutionStep(step, at) {
  return {
    ...step,
    startedAt: at,
    status: 'running',
  };
}

export function completeExecutionStep(step, { at, mutationAudit }) {
  return {
    ...step,
    endedAt: at,
    exitCode: 0,
    mutationAudit: mutationAudit || step.mutationAudit || null,
    status: 'completed',
  };
}

export function failExecutionStep(step, { at, error, stopRequested }) {
  return {
    ...step,
    endedAt: at,
    error: errorMessage(error),
    exitCode: 1,
    status: stopRequested ? 'stopped' : 'failed',
  };
}

export function completeExecutionSession(
  session,
  { at, changedFiles, mutationAudits, mutationBatchAudit, verification },
) {
  return {
    ...session,
    changedFiles,
    endedAt: at,
    mutationAudits,
    mutationBatchAudit,
    status: 'completed',
    verification,
  };
}

export function failExecutionSession(
  session,
  { at, changedFiles, error, mutationAudits, mutationBatchAudit, stopRequested, verification },
) {
  return {
    ...session,
    blockedReasons: stopRequested ? [] : [errorMessage(error)],
    changedFiles,
    endedAt: at,
    mutationAudits,
    mutationBatchAudit,
    status: stopRequested ? 'stopped' : 'failed',
    verification,
  };
}
