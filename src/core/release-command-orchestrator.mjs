function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export function createReleaseCommandOrchestrator({
  archiveSnapshot,
  buildRefreshPreflight,
  buildSnapshotPreflight,
  buildStatus,
  recordAction,
  refreshArtifacts,
  runProviderPreflight,
  runtimeJobRunner,
} = {}) {
  function refresh({
    args = [],
    confirmCurrentSurfaceRewrite = false,
    confirmLiveValidation = false,
    requestId = '',
  } = {}) {
    const preflight = buildRefreshPreflight(args);
    const liveValidation = args.length > 0;
    const provider = preflight.provider || '';
    const scope = liveValidation ? 'live-validation' : 'current-surface';

    if (!preflight.allowed) {
      recordAction({
        action: 'refresh',
        details: { args, preflight },
        outcome: 'blocked',
        provider,
        scope,
        summary: preflight.summary,
      });
      return {
        error: 'refresh-not-allowed',
        message: preflight.summary,
        ok: false,
        preflight,
        releaseStatus: buildStatus(),
      };
    }

    if (liveValidation && !confirmLiveValidation) {
      const message = `${provider || 'provider'} live validation 실행은 명시적 확인이 필요합니다.`;
      recordAction({
        action: 'refresh',
        details: {
          args,
          confirmField: 'confirmLiveValidation',
          preflight,
        },
        outcome: 'confirmation-required',
        provider,
        scope,
        summary: message,
      });
      return {
        error: 'live-validation-confirmation-required',
        message,
        ok: false,
        preflight,
        releaseStatus: buildStatus(),
      };
    }

    if (!liveValidation && !confirmCurrentSurfaceRewrite) {
      const message = 'current surface evidence/closeout/handoff 재생성은 명시적 확인이 필요합니다.';
      recordAction({
        action: 'refresh',
        details: {
          args,
          confirmField: 'confirmCurrentSurfaceRewrite',
          preflight,
        },
        outcome: 'confirmation-required',
        provider,
        scope,
        summary: message,
      });
      return {
        error: 'refresh-confirmation-required',
        message,
        ok: false,
        preflight,
        releaseStatus: buildStatus(),
      };
    }

    const runningSummary = liveValidation
      ? `${provider} live validation과 current surface 재생성을 실행합니다.`
      : 'current surface evidence/closeout/handoff 재생성을 실행합니다.';
    const completedSummary = liveValidation
      ? `${provider} live validation과 current surface 재생성을 완료했습니다.`
      : 'current surface evidence/closeout/handoff 재생성을 완료했습니다.';

    try {
      const { job, result } = runtimeJobRunner.run({
        details: {
          args,
          preflight,
          provider,
        },
        jobKind: 'execution-v1-refresh',
        requestId,
        scope,
        summary: runningSummary,
        task: () => refreshArtifacts(args),
      });
      recordAction({
        action: 'refresh',
        details: {
          args,
          runtimeJobId: job.id,
          preflight,
        },
        outcome: 'completed',
        provider,
        scope,
        summary: completedSummary,
      });
      return {
        ok: true,
        result,
        runtimeJobId: job.id,
      };
    } catch (error) {
      const message = getErrorMessage(error, 'execution-v1 refresh failed');
      recordAction({
        action: 'refresh',
        details: {
          args,
          error: getErrorMessage(error, 'unknown error'),
          preflight,
        },
        outcome: 'failed',
        provider,
        scope,
        summary: message,
      });
      throw error;
    }
  }

  function inspectRefresh({ args = [] } = {}) {
    const preflight = buildRefreshPreflight(args);
    recordAction({
      action: 'refresh-preflight',
      details: { args, preflight },
      outcome: preflight.allowed ? 'allowed' : 'blocked',
      provider: preflight.provider || '',
      scope: preflight.provider ? 'live-validation' : 'current-surface',
      summary: preflight.summary,
    });
    return {
      preflight,
      releaseStatus: buildStatus(),
    };
  }

  function preflightProvider(provider = '') {
    const requestedProvider = String(provider || '').trim();
    const preflight = runProviderPreflight(requestedProvider);
    recordAction({
      action: requestedProvider === 'all' ? 'aggregate-provider-preflight' : 'provider-preflight',
      details: { preflight },
      outcome: preflight.status || 'unknown',
      provider: requestedProvider === 'all' ? '' : requestedProvider,
      scope: 'provider-readiness',
      summary: requestedProvider === 'all'
        ? `all provider preflight ${preflight.status || 'unknown'} · missing env ${preflight.missingEnvCount ?? 'unknown'}`
        : `${requestedProvider || 'provider'} preflight ${preflight.status || 'unknown'}`,
    });
    return preflight;
  }

  function snapshot({ confirmSnapshotFreeze = false, requestId = '' } = {}) {
    const preflight = buildSnapshotPreflight();
    if (!preflight.allowed) {
      recordAction({
        action: 'snapshot',
        details: { preflight },
        outcome: 'blocked',
        scope: 'snapshot',
        summary: preflight.summary,
      });
      return {
        error: 'snapshot-not-ready',
        message: preflight.summary,
        ok: false,
        preflight,
        releaseStatus: buildStatus(),
      };
    }

    if (!confirmSnapshotFreeze) {
      const message = 'release snapshot 고정은 명시적 확인이 필요합니다.';
      recordAction({
        action: 'snapshot',
        details: {
          confirmField: 'confirmSnapshotFreeze',
          preflight,
        },
        outcome: 'confirmation-required',
        scope: 'snapshot',
        summary: message,
      });
      return {
        error: 'snapshot-confirmation-required',
        message,
        ok: false,
        preflight,
        releaseStatus: buildStatus(),
      };
    }

    try {
      const { job, result } = runtimeJobRunner.run({
        details: { preflight },
        jobKind: 'execution-v1-snapshot',
        requestId,
        scope: 'snapshot',
        summary: 'release snapshot 고정을 실행합니다.',
        task: archiveSnapshot,
      });
      recordAction({
        action: 'snapshot',
        details: {
          archiveResult: result.archiveResult || null,
          runtimeJobId: job.id,
          preflight,
        },
        outcome: 'completed',
        scope: 'snapshot',
        summary: `release snapshot을 고정했습니다. (${String(result.archiveResult?.verifiedCommit || '').slice(0, 7) || 'verified'})`,
      });
      return {
        ok: true,
        result,
        runtimeJobId: job.id,
      };
    } catch (error) {
      const message = getErrorMessage(error, 'snapshot을 생성할 수 없습니다.');
      recordAction({
        action: 'snapshot',
        details: {
          error: getErrorMessage(error, 'unknown error'),
          preflight,
        },
        outcome: 'failed',
        scope: 'snapshot',
        summary: message,
      });
      return {
        error: 'snapshot-not-ready',
        message,
        ok: false,
        releaseStatus: buildStatus(),
      };
    }
  }

  function inspectSnapshot() {
    const preflight = buildSnapshotPreflight();
    recordAction({
      action: 'snapshot-preflight',
      details: { preflight },
      outcome: preflight.allowed ? 'allowed' : 'blocked',
      scope: 'snapshot',
      summary: preflight.summary,
    });
    return {
      preflight,
      releaseStatus: buildStatus(),
    };
  }

  return {
    inspectRefresh,
    inspectSnapshot,
    preflightProvider,
    refresh,
    snapshot,
  };
}
