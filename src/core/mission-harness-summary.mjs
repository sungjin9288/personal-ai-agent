import path from 'node:path';

function buildRecommendations({ actionInbox, latestArtifact, missionMemoryEntries, summary }) {
  const recommendations = [];

  if (!latestArtifact) {
    recommendations.push({
      code: 'missing-artifact',
      level: 'attention',
      title: '최종 산출물이 source-of-record로 아직 고정되지 않았습니다.',
    });
  }
  if (Number(summary.approvalCounts?.pending || 0) > 0) {
    recommendations.push({
      code: 'pending-approvals',
      level: 'attention',
      title: `사람의 승인 ${summary.approvalCounts.pending}건을 먼저 해소해야 하네스가 닫힙니다.`,
    });
  }
  if (Number(actionInbox.summary?.pendingActionCount || 0) > 0) {
    recommendations.push({
      code: 'pending-actions',
      level: 'attention',
      title: `후속 작업 ${actionInbox.summary.pendingActionCount}건이 남아 있습니다. review loop를 먼저 닫아야 결과를 확정할 수 있습니다.`,
    });
  }
  if (Number(summary.maintenanceRequiredCount || 0) > 0) {
    recommendations.push({
      code: 'maintenance-required',
      level: 'warning',
      title: `유지보수 루프가 ${summary.maintenanceRequiredCount}건 열려 있습니다. 정기 sweep 결과를 확인해야 합니다.`,
    });
  }
  if (summary.providerHealthDriftStatus !== 'stable') {
    recommendations.push({
      code: 'provider-health-drift',
      level: 'warning',
      title: 'provider health drift가 안정 상태가 아닙니다. 최근 attention/retry 이력을 확인해야 합니다.',
    });
  }
  if (!missionMemoryEntries.length) {
    recommendations.push({
      code: 'empty-memory',
      level: 'info',
      title: '미션 메모리가 비어 있습니다. 핵심 결정과 사실을 memory로 남기면 다음 실행 품질이 올라갑니다.',
    });
  }

  return recommendations;
}

function compactFactGraphPreview(graph) {
  const nodeById = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const nodes = (graph.nodes || [])
    .filter((node) => node.status === 'active')
    .sort((left, right) =>
      String(right.updatedAt || right.createdAt || '').localeCompare(
        String(left.updatedAt || left.createdAt || ''),
      ),
    )
    .slice(0, 5)
    .map((node) => ({
      id: node.id,
      provenance: Array.isArray(node.provenance) ? node.provenance.slice(0, 1) : [],
      scope: node.scope,
      scopeId: node.scopeId,
      sourceId: node.sourceId,
      statement: node.statement,
      updatedAt: node.updatedAt || node.createdAt || null,
      version: node.version || 1,
    }));
  const edges = (graph.edges || [])
    .filter((edge) => edge.status === 'active')
    .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0))
    .slice(0, 5)
    .map((edge) => ({
      fromNodeId: edge.fromNodeId,
      fromStatement: nodeById.get(edge.fromNodeId)?.statement || '',
      id: edge.id,
      relation: edge.relation,
      relationReason: edge.relationReason || `related by shared fact terms: ${(edge.sharedTokens || []).slice(0, 8).join(', ')}`,
      scope: edge.scope,
      scopeId: edge.scopeId,
      sharedTokens: Array.isArray(edge.sharedTokens) ? edge.sharedTokens.slice(0, 8) : [],
      toNodeId: edge.toNodeId,
      toStatement: nodeById.get(edge.toNodeId)?.statement || '',
      weight: edge.weight || 0,
    }));

  return {
    edges,
    nodes,
    summary: graph.summary,
  };
}

export function buildMissionHarnessSummary({
  actionInbox,
  allFactGraph,
  documentRegistry,
  latestArtifact,
  latestRetrievalArtifact,
  latestRetrievalSession,
  latestRetrievalSummary,
  learningCandidates,
  missionAttachments,
  missionFactGraph,
  missionMemoryEntries,
  retrievalCompare,
  retrievalPreview,
  rootDir,
  summary,
  workspaceFactGraph,
  workspaceMemoryEntries,
}) {
  return {
    adoptedPatterns: [
      {
        detail: '비정형 입력은 작업용 Markdown으로 정규화한 뒤 docs/와 artifact 경로를 source-of-record로 유지합니다.',
        label: 'Markdown source-of-record',
      },
      {
        detail: '세션, 승인, 산출물, 유지보수 이벤트를 분리하지 않고 하나의 운영 루프로 관찰합니다.',
        label: 'Session-first harness loop',
      },
      {
        detail: '결정/사실/선호 메모를 mission 단위로 누적하고, 필요한 경우 workspace 메모리까지 확장합니다.',
        label: 'Layered memory recall',
      },
    ],
    documents: {
      items: documentRegistry.items,
      recentEntries: documentRegistry.recentEntries,
      latestArtifact: latestArtifact
        ? {
            kind: latestArtifact.kind,
            path: latestArtifact.path ? path.relative(rootDir, latestArtifact.path) : null,
            title: latestArtifact.title || latestArtifact.fileName || latestArtifact.id,
            updatedAt: latestArtifact.createdAt || null,
          }
        : null,
    },
    attachments: {
      recentEntries: missionAttachments.slice(-5).reverse().map((attachment) => ({
        charCount: attachment.charCount,
        createdAt: attachment.createdAt,
        excerpt: attachment.excerpt,
        fileName: attachment.fileName,
        id: attachment.id,
        lineCount: attachment.lineCount,
        mimeType: attachment.mimeType,
        source: attachment.source,
        truncated: attachment.truncated,
        updatedAt: attachment.updatedAt || null,
      })),
      summary: {
        latestCreatedAt: missionAttachments.at(-1)?.createdAt || null,
        total: missionAttachments.length,
        totalChars: missionAttachments.reduce((sum, attachment) => sum + Number(attachment.charCount || 0), 0),
        truncatedCount: missionAttachments.filter((attachment) => attachment.truncated).length,
      },
    },
    loops: {
      maintenance: {
        latestRunAt: summary.latestMaintenanceRunAt || null,
        nextDueAt: summary.maintenanceNextDueAt || null,
        requiredCount: summary.maintenanceRequiredCount || 0,
      },
      provider: {
        healthDriftStatus: summary.providerHealthDriftStatus || 'stable',
        latestFailureAt: summary.latestFailedProviderExecution?.endedAt || null,
        latestFailureKind: summary.latestFailedProviderExecution?.failureKind || null,
        latestSuccessAt: summary.latestSuccessfulProviderExecution?.endedAt || null,
      },
      quality: {
        blockedCount: summary.specialistQualityGateBlockedCount || 0,
        latestViolation: summary.specialistLatestQualityGateViolation || null,
        status: summary.specialistQualityGateStatus || 'none',
      },
      review: {
        latestReviewerSummary: summary.latestSession?.reviewerSummary || null,
        latestReviewerStatus: summary.latestSession?.reviewerStatus || null,
        pendingActions: actionInbox.summary?.pendingActionCount || 0,
        pendingApprovals: summary.approvalCounts?.pending || 0,
      },
      learning: {
        candidateCount: learningCandidates.length,
        latestCandidateId: learningCandidates.at(-1)?.id || null,
        latestRecordType: learningCandidates.at(-1)?.recordType || null,
        pendingReviewCount: Number(summary.learningCandidatePromotionStatusCounts?.['pending-review'] || 0),
      },
    },
    memory: {
      factGraph: allFactGraph.summary,
      factGraphPreview: {
        all: compactFactGraphPreview(allFactGraph),
        mission: compactFactGraphPreview(missionFactGraph),
        workspace: compactFactGraphPreview(workspaceFactGraph),
      },
      missionFactGraph: missionFactGraph.summary,
      workspaceFactGraph: workspaceFactGraph.summary,
      missionCounts: summary.memoryCounts,
      recentMissionEntries: missionMemoryEntries.slice(-5).reverse().map((entry) => ({
        createdAt: entry.createdAt,
        id: entry.id,
        kind: entry.kind,
        content: entry.content,
        updatedAt: entry.updatedAt || null,
      })),
      recentWorkspaceEntries: workspaceMemoryEntries.slice(-3).reverse().map((entry) => ({
        createdAt: entry.createdAt,
        id: entry.id,
        kind: entry.kind,
        content: entry.content,
        updatedAt: entry.updatedAt || null,
      })),
      workspaceCount: workspaceMemoryEntries.length,
    },
    retrieval: {
      ...retrievalPreview,
      compare: retrievalCompare,
      latestArtifact: latestRetrievalArtifact
        ? {
            id: latestRetrievalArtifact.id,
            fileName: latestRetrievalArtifact.fileName,
            kind: latestRetrievalArtifact.kind,
            path: latestRetrievalArtifact.path ? path.relative(rootDir, latestRetrievalArtifact.path) : null,
            role: latestRetrievalArtifact.role || null,
            sessionId: latestRetrievalArtifact.sessionId,
            sessionStatus: latestRetrievalSession?.status || null,
            summary: latestRetrievalSummary
              ? {
                  attachmentSourceCount: latestRetrievalSummary.attachmentSourceCount,
                  memorySourceCount: latestRetrievalSummary.memorySourceCount,
                  role: latestRetrievalSummary.role,
                  snippetCount: latestRetrievalSummary.snippetCount,
                  sourceLabels: latestRetrievalSummary.sourceLabels.slice(0, 4),
                }
              : null,
            title: latestRetrievalArtifact.title || latestRetrievalArtifact.fileName || latestRetrievalArtifact.id,
            updatedAt: latestRetrievalArtifact.createdAt || null,
          }
        : null,
    },
    recommendations: buildRecommendations({
      actionInbox,
      latestArtifact,
      missionMemoryEntries,
      summary,
    }),
  };
}
