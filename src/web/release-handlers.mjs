import path from 'node:path';

export function createExecutionV1ReleaseHandlerFactory({
  buildBlockerHandoff,
  buildLiveValidationArgs,
  buildStatus,
  decodePathSegment,
  getContentType,
  parseOptionalBooleanQueryParam,
  readFile,
  readJsonBody,
  releaseArtifactResolver,
  releaseCommandOrchestrator,
  rootDir,
  sendBuffer,
  sendJson,
  sendNotFound,
} = {}) {
  return function createReleaseHandlers({ request, response, url } = {}) {
    async function getStatus() {
      sendJson(response, 200, buildStatus());
    }

    async function getBlockers() {
      const includeSharedQuery =
        parseOptionalBooleanQueryParam(url.searchParams, 'includeShared') ??
        parseOptionalBooleanQueryParam(url.searchParams, 'include-shared');
      const withoutSharedQuery =
        parseOptionalBooleanQueryParam(url.searchParams, 'withoutShared') ??
        parseOptionalBooleanQueryParam(url.searchParams, 'without-shared');
      const includeShared = withoutSharedQuery === true ? false : includeSharedQuery !== false;

      sendJson(
        response,
        200,
        buildBlockerHandoff({
          category: String(url.searchParams.get('category') || '').trim(),
          docHrefBase: '/api/execution-v1/release-doc?path=',
          includeShared,
          owner: String(url.searchParams.get('owner') || '').trim(),
          provider: String(url.searchParams.get('provider') || '').trim(),
          rootDir,
        }),
      );
    }

    async function getHandoffArtifact(params) {
      const artifactId = decodePathSegment(params.artifactId);
      const artifactRecord = releaseArtifactResolver.resolveHandoffArtifact(artifactId);
      if (!artifactRecord) {
        sendNotFound(response);
        return;
      }

      sendBuffer(
        response,
        200,
        readFile(artifactRecord.artifactPath),
        getContentType(artifactRecord.artifactPath),
        {
          'content-disposition': `inline; filename="${path.basename(artifactRecord.artifactPath)}"`,
        },
      );
    }

    async function getDocument() {
      const docRecord = releaseArtifactResolver.resolveEvidenceDoc(url.searchParams.get('path') || '');
      if (!docRecord) {
        sendNotFound(response);
        return;
      }

      sendBuffer(
        response,
        200,
        readFile(docRecord.path),
        getContentType(docRecord.path),
        {
          'content-disposition': `inline; filename="${path.basename(docRecord.path)}"`,
        },
      );
    }

    async function refresh() {
      const body = await readJsonBody(request);
      const command = releaseCommandOrchestrator.refresh({
        args: buildLiveValidationArgs(body),
        confirmCurrentSurfaceRewrite: body.confirmCurrentSurfaceRewrite,
        confirmLiveValidation: body.confirmLiveValidation,
        requestId: request.id,
      });
      if (!command.ok) {
        sendJson(response, 409, {
          error: command.error,
          message: command.message,
          preflight: command.preflight,
          status: command.releaseStatus,
        });
        return;
      }

      sendJson(response, 200, {
        ...command.result,
        runtimeJobId: command.runtimeJobId,
      });
    }

    async function inspectRefresh() {
      const body = await readJsonBody(request);
      const command = releaseCommandOrchestrator.inspectRefresh({
        args: buildLiveValidationArgs(body),
      });
      sendJson(response, 200, {
        preflight: command.preflight,
        status: command.releaseStatus,
      });
    }

    async function preflightProvider() {
      const body = await readJsonBody(request);
      sendJson(response, 200, {
        preflight: releaseCommandOrchestrator.preflightProvider(body.provider),
      });
    }

    async function snapshot() {
      const body = await readJsonBody(request);
      const command = releaseCommandOrchestrator.snapshot({
        confirmSnapshotFreeze: body.confirmSnapshotFreeze,
        requestId: request.id,
      });
      if (command.ok) {
        sendJson(response, 200, {
          ...command.result,
          runtimeJobId: command.runtimeJobId,
        });
        return;
      }

      sendJson(response, 409, {
        error: command.error,
        message: command.message,
        ...(command.preflight ? { preflight: command.preflight } : {}),
        status: command.releaseStatus,
      });
    }

    async function inspectSnapshot() {
      const command = releaseCommandOrchestrator.inspectSnapshot();
      sendJson(response, 200, {
        preflight: command.preflight,
        status: command.releaseStatus,
      });
    }

    return {
      getBlockers,
      getDocument,
      getHandoffArtifact,
      getStatus,
      inspectRefresh,
      inspectSnapshot,
      preflightProvider,
      refresh,
      snapshot,
    };
  };
}
