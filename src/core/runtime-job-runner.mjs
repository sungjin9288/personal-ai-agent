function summarizeRuntimeJobResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return {
    archiveCommit: String(result.archiveResult?.verifiedCommit || '').trim(),
    evidencePath: String(result.evidencePath || result.evidenceResult?.outputPath || '').trim(),
    generatedAt: String(result.generatedAt || result.closeoutResult?.generatedAt || '').trim(),
    keyCount: Object.keys(result).length,
    ok: Boolean(result.ok),
    outputPath: String(result.outputPath || result.closeoutResult?.checklistPath || '').trim(),
  };
}

export function createRuntimeJobRunner({ registry, source = 'web-ui' } = {}) {
  function run({
    details = null,
    jobKind,
    requestId = '',
    scope = '',
    summary = '',
    task,
  }) {
    const job = registry.startJob({
      details,
      kind: jobKind,
      requestId,
      scope,
      source,
      summary,
    });

    try {
      const result = task(job);
      registry.finishJob(job.id, {
        details: {
          ...job.details,
          result: summarizeRuntimeJobResult(result),
        },
        status: 'completed',
        summary,
      });
      return {
        job,
        result,
      };
    } catch (error) {
      registry.finishJob(job.id, {
        error: error instanceof Error ? error.message : 'unknown runtime job error',
        status: 'failed',
        summary,
      });
      throw error;
    }
  }

  return {
    run,
  };
}
