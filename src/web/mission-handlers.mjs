function buildMissionDocumentTitle(missionTitle, title) {
  const rawTitle = String(title || '').trim();
  return rawTitle.startsWith(`${missionTitle} · `) ? rawTitle : `${missionTitle} · ${rawTitle}`;
}

export function createMissionHandlerFactory({
  buildMissionListPayload,
  convertMissionAttachmentPayloads,
  decodePathSegment,
  evaluateMissionTenantAccess,
  evaluateWorkspaceTenantAccess,
  parseConstraints,
  readJsonBody,
  resolveAuthTenantId,
  sendJson,
  sendTenantDenied,
  service,
} = {}) {
  return function createMissionHandlers({ auth, request, response, url } = {}) {
    async function listMissions() {
      sendJson(response, 200, buildMissionListPayload({ tenantId: resolveAuthTenantId(auth) }));
    }

    async function createMission() {
      const body = await readJsonBody(request);
      const workspaceId = String(body.workspaceId || '').trim();
      const tenant = evaluateWorkspaceTenantAccess(workspaceId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return;
      }

      const mission = service.createMission({
        attachments: await convertMissionAttachmentPayloads(body.attachments),
        constraints: parseConstraints(body.constraints),
        deliverableType: String(body.deliverableType || '').trim(),
        mode: String(body.mode || '').trim(),
        objective: String(body.objective || '').trim(),
        title: String(body.title || '').trim(),
        workspaceId,
      });

      sendJson(response, 201, { mission });
    }

    async function addAttachments(params) {
      const missionId = decodePathSegment(params.missionId);
      const tenant = evaluateMissionTenantAccess(missionId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return;
      }

      const body = await readJsonBody(request);
      const attachments = await convertMissionAttachmentPayloads(body.attachments);
      const created = attachments.map((attachment) =>
        service.addMissionAttachment({
          content: attachment.content,
          conversion: attachment.conversion,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          missionId,
          source: attachment.source || 'ui-upload',
        }),
      );

      sendJson(response, 201, { attachments: created });
    }

    async function getMission(params) {
      const missionId = decodePathSegment(params.missionId);
      const tenant = evaluateMissionTenantAccess(missionId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return;
      }
      sendJson(response, 200, service.showMission(missionId));
    }

    async function rollbackExecution(params) {
      const missionId = decodePathSegment(params.missionId);
      const body = await readJsonBody(request);
      const result = service.rollbackExecution(missionId, {
        dryRun: Boolean(body.dryRun),
        executionId: decodePathSegment(body.executionId || ''),
      });
      sendJson(response, 200, result);
    }

    async function getSession(params) {
      const missionId = decodePathSegment(params.missionId);
      const sessionId = String(url.searchParams.get('sessionId') || '').trim();
      sendJson(response, 200, service.showSession(missionId, { sessionId }));
    }

    async function browseDocuments(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(
        response,
        200,
        service.browseMissionHarnessDocuments(missionId, {
          limit: String(url.searchParams.get('limit') || '').trim(),
          offset: String(url.searchParams.get('offset') || '').trim(),
          query: String(url.searchParams.get('query') || '').trim(),
          sort: String(url.searchParams.get('sort') || '').trim(),
          type: String(url.searchParams.get('type') || '').trim(),
        }),
      );
    }

    async function browseMemory(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(
        response,
        200,
        service.browseMissionHarnessMemory(missionId, {
          kind: String(url.searchParams.get('kind') || '').trim(),
          limit: String(url.searchParams.get('limit') || '').trim(),
          offset: String(url.searchParams.get('offset') || '').trim(),
          query: String(url.searchParams.get('query') || '').trim(),
          scope: String(url.searchParams.get('scope') || '').trim(),
          sort: String(url.searchParams.get('sort') || '').trim(),
        }),
      );
    }

    async function getTimeline(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(response, 200, service.getMissionTimeline(missionId));
    }

    async function updateDocument(params) {
      const missionId = decodePathSegment(params.missionId);
      const entryId = decodePathSegment(params.entryId);
      const mission = service.showMission(missionId).mission;
      const body = await readJsonBody(request);
      const result = service.updateDocumentLog({
        content: String(body.content || '').trim(),
        entryId,
        title: buildMissionDocumentTitle(mission.title, body.title),
        type: String(body.type || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function deleteDocument(params) {
      const entryId = decodePathSegment(params.entryId);
      sendJson(response, 200, service.deleteDocumentLog(entryId));
    }

    async function preflightExecution(params) {
      const missionId = decodePathSegment(params.missionId);
      const body = await readJsonBody(request);
      const result = service.preflightExecution(missionId, {
        requestApproval: Boolean(body.requestApproval),
      });
      sendJson(response, 200, result);
    }

    async function startExecution(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(response, 200, service.startExecution(missionId));
    }

    async function stopExecution(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(response, 200, service.stopExecution(missionId));
    }

    async function getExecutionStatus(params) {
      const missionId = decodePathSegment(params.missionId);
      sendJson(response, 200, service.getExecutionStatus(missionId));
    }

    async function getExecutionLogs(params) {
      const missionId = decodePathSegment(params.missionId);
      const executionId = decodePathSegment(url.searchParams.get('executionId') || '');
      sendJson(response, 200, service.getExecutionLogs(missionId, { executionId }));
    }

    async function migrateLegacyDocuments(params) {
      const missionId = decodePathSegment(params.missionId);
      service.showMission(missionId);
      sendJson(response, 200, service.migrateLegacyDocumentLogs());
    }

    async function createDocument(params) {
      const missionId = decodePathSegment(params.missionId);
      const mission = service.showMission(missionId).mission;
      const body = await readJsonBody(request);
      const result = service.logDocument({
        content: String(body.content || '').trim(),
        title: buildMissionDocumentTitle(mission.title, body.title),
        type: String(body.type || '').trim(),
      });
      sendJson(response, 201, result);
    }

    async function updateMemory(params) {
      const missionId = decodePathSegment(params.missionId);
      const memoryId = decodePathSegment(params.memoryId);
      const body = await readJsonBody(request);
      const entry = service.updateMemory({
        content: String(body.content || '').trim(),
        kind: String(body.kind || '').trim(),
        memoryId,
        scope: 'mission',
        scopeId: missionId,
      });
      sendJson(response, 200, { entry });
    }

    async function deleteMemory(params) {
      const missionId = decodePathSegment(params.missionId);
      const memoryId = decodePathSegment(params.memoryId);
      const entry = service.deleteMemory({
        memoryId,
        scope: 'mission',
        scopeId: missionId,
      });
      sendJson(response, 200, { entry });
    }

    async function createMemory(params) {
      const missionId = decodePathSegment(params.missionId);
      const body = await readJsonBody(request);
      const entry = service.addMemory({
        content: String(body.content || '').trim(),
        kind: String(body.kind || '').trim(),
        scope: 'mission',
        scopeId: missionId,
      });
      sendJson(response, 201, { entry });
    }

    async function runMission(params) {
      const missionId = decodePathSegment(params.missionId);
      const body = await readJsonBody(request);
      const provider = String(body.provider || '').trim();
      const result = await service.runMission(missionId, {
        fallbackPolicy: String(body.fallbackPolicy || '').trim(),
        fallbackProvider: String(body.fallbackProvider || '').trim(),
        provider,
        providerSpecified: Boolean(provider),
        sourceContext: {
          channel: 'web',
          requestId: request.id,
          route: url.pathname,
          sourceType: 'web',
        },
      });
      sendJson(response, 200, result);
    }

    return {
      addAttachments,
      browseDocuments,
      browseMemory,
      createDocument,
      createMemory,
      createMission,
      deleteDocument,
      deleteMemory,
      getExecutionLogs,
      getExecutionStatus,
      getMission,
      getSession,
      getTimeline,
      listMissions,
      migrateLegacyDocuments,
      preflightExecution,
      rollbackExecution,
      runMission,
      startExecution,
      stopExecution,
      updateDocument,
      updateMemory,
    };
  };
}
