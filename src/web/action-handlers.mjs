export function createActionHandlerFactory({
  decodePathSegment,
  evaluateLearningCandidateTenantAccess,
  evaluateWorkspaceTenantAccess,
  parseOptionalBooleanQueryParam,
  readJsonBody,
  sendJson,
  sendTenantDenied,
  service,
} = {}) {
  return function createActionHandlers({ auth, request, response, url } = {}) {
    function buildWorkspaceLearningSelectionOverrideResponse(result) {
      const {
        clearNote: _clearNote,
        note: _note,
        ...selectionOverride
      } = result.selectionOverride || {};
      return {
        learningCandidateId: result.learningCandidate?.id || selectionOverride.candidateId || null,
        selectionOverride,
      };
    }

    function authorizeLearningCandidate(candidateId) {
      const tenant = evaluateLearningCandidateTenantAccess(candidateId, auth);
      if (!tenant.allowed) {
        sendTenantDenied(response, tenant);
        return false;
      }
      return true;
    }

    async function authorizeLearningPromotionScope(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.authorizeLearningPromotionScope(candidateId, {
        note: String(body.note || '').trim(),
        scope: String(body.scope || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function getInbox() {
      const workspaceId = String(url.searchParams.get('workspaceId') || '').trim();
      if (workspaceId) {
        const tenant = evaluateWorkspaceTenantAccess(workspaceId, auth);
        if (!tenant.allowed) {
          sendTenantDenied(response, tenant);
          return;
        }
      }

      const needsReminderOnly =
        parseOptionalBooleanQueryParam(url.searchParams, 'needsReminderOnly') ??
        parseOptionalBooleanQueryParam(url.searchParams, 'needsReminder');

      sendJson(response, 200, service.getActionInbox({
        actionClass: String(url.searchParams.get('actionClass') || '').trim(),
        effectiveOwner: String(url.searchParams.get('effectiveOwner') || '').trim(),
        missionId: String(url.searchParams.get('missionId') || '').trim(),
        needsReminderOnly,
        overdueOnly: parseOptionalBooleanQueryParam(url.searchParams, 'overdueOnly'),
        owner: String(url.searchParams.get('owner') || '').trim(),
        priority: String(url.searchParams.get('priority') || '').trim(),
        providerId: String(url.searchParams.get('providerId') || '').trim(),
        providerFallbackStopReason: String(
          url.searchParams.get('providerFallbackStopReason') ||
            url.searchParams.get('provider-fallback-stop-reason') ||
            '',
        ).trim(),
        promotionStatus: String(url.searchParams.get('promotionStatus') || '').trim(),
        workspaceId,
      }));
    }

    async function expireLearningPromotions() {
      const body = await readJsonBody(request);
      const result = service.expireLearningPromotions({
        before: String(body.before || '').trim(),
        missionId: String(body.missionId || '').trim(),
        note: String(body.note || '').trim(),
        recordType: String(body.recordType || '').trim(),
        scope: String(body.scope || '').trim(),
        target: String(body.target || '').trim(),
        workspaceId: String(body.workspaceId || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function remindLearningPromotion(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.remindLearningPromotionStopConditions(
        {
          dueOnly: body.dueOnly !== false,
          learningCandidateId: candidateId,
          missionId: String(body.missionId || '').trim(),
          overdueOnly: Boolean(body.overdueOnly),
          workspaceId: String(body.workspaceId || '').trim(),
        },
        String(body.note || '').trim(),
      );
      sendJson(response, 200, result);
    }

    async function resolveLearningPromotion(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.resolveLearningPromotion(candidateId, {
        decision: String(body.decision || '').trim(),
        note: String(body.note || '').trim(),
        scope: String(body.scope || '').trim(),
        target: String(body.target || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function rollbackLearningPromotion(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.rollbackLearningPromotion(candidateId, {
        note: String(body.note || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function setWorkspaceLearningSelectionOverride(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.setWorkspaceLearningSelectionOverride(candidateId, {
        expiresAt: String(body.expiresAt || '').trim(),
        note: String(body.note || '').trim(),
      });
      sendJson(response, 200, buildWorkspaceLearningSelectionOverrideResponse(result));
    }

    async function clearWorkspaceLearningSelectionOverride(params) {
      const candidateId = decodePathSegment(params.candidateId);
      if (!authorizeLearningCandidate(candidateId)) {
        return;
      }
      const body = await readJsonBody(request);
      const result = service.clearWorkspaceLearningSelectionOverride(candidateId, {
        note: String(body.note || '').trim(),
      });
      sendJson(response, 200, buildWorkspaceLearningSelectionOverrideResponse(result));
    }

    async function remediateProviderAttention(params) {
      const actionId = decodePathSegment(params.actionId);
      const body = await readJsonBody(request);
      const result = await service.remediateProviderAttention(actionId, {
        fallbackPolicy: String(body.fallbackPolicy || '').trim(),
        fallbackProvider: String(body.fallbackProvider || '').trim(),
      });
      sendJson(response, 200, result);
    }

    async function remediateSpecialistFollowUp(params) {
      const actionId = decodePathSegment(params.actionId);
      const result = await service.remediateSpecialistFollowUp(actionId);
      sendJson(response, 200, result);
    }

    async function resolveReviewerFollowUp(params) {
      const actionId = decodePathSegment(params.actionId);
      const body = await readJsonBody(request);
      const result = service.resolveReviewerFollowUp(actionId, {
        kind: String(body.kind || '').trim(),
        note: String(body.note || '').trim(),
      });
      sendJson(response, 200, result);
    }

    return {
      authorizeLearningPromotionScope,
      clearWorkspaceLearningSelectionOverride,
      expireLearningPromotions,
      getInbox,
      remediateProviderAttention,
      remediateSpecialistFollowUp,
      remindLearningPromotion,
      resolveLearningPromotion,
      resolveReviewerFollowUp,
      rollbackLearningPromotion,
      setWorkspaceLearningSelectionOverride,
    };
  };
}
