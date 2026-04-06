import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE = {
  workspaces: [],
  missions: [],
  sessions: [],
  agentRuns: [],
  artifacts: [],
  approvals: [],
  escalations: [],
  reviewerFollowUps: [],
  providerProbes: [],
  providerAttentionAcknowledgements: [],
  maintenanceRuns: [],
  memoryEntries: [],
};

function cloneDefaultState() {
  return {
    workspaces: [],
    missions: [],
    sessions: [],
    agentRuns: [],
    artifacts: [],
    approvals: [],
    escalations: [],
    reviewerFollowUps: [],
    providerProbes: [],
    providerAttentionAcknowledgements: [],
    maintenanceRuns: [],
    memoryEntries: [],
  };
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeJsonAtomic(filePath, payload) {
  ensureDirectory(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sortByCreatedAt(items) {
  return [...items].sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function createStore({ rootDir }) {
  const varDir = path.join(rootDir, 'var');
  const statePath = path.join(varDir, 'state.json');
  const missionsDir = path.join(varDir, 'missions');

  function ensureState() {
    ensureDirectory(varDir);
    ensureDirectory(missionsDir);
    if (!fs.existsSync(statePath)) {
      writeJsonAtomic(statePath, DEFAULT_STATE);
    }
  }

  function loadState() {
    ensureState();
    const state = readJson(statePath, cloneDefaultState());
    return {
      workspaces: Array.isArray(state.workspaces) ? state.workspaces : [],
      missions: Array.isArray(state.missions) ? state.missions : [],
      sessions: Array.isArray(state.sessions) ? state.sessions : [],
      agentRuns: Array.isArray(state.agentRuns) ? state.agentRuns : [],
      artifacts: Array.isArray(state.artifacts) ? state.artifacts : [],
      approvals: Array.isArray(state.approvals) ? state.approvals : [],
      escalations: Array.isArray(state.escalations) ? state.escalations : [],
      reviewerFollowUps: Array.isArray(state.reviewerFollowUps) ? state.reviewerFollowUps : [],
      providerProbes: Array.isArray(state.providerProbes) ? state.providerProbes : [],
      providerAttentionAcknowledgements: Array.isArray(state.providerAttentionAcknowledgements)
        ? state.providerAttentionAcknowledgements
        : [],
      maintenanceRuns: Array.isArray(state.maintenanceRuns) ? state.maintenanceRuns : [],
      memoryEntries: Array.isArray(state.memoryEntries) ? state.memoryEntries : [],
    };
  }

  function saveState(state) {
    ensureState();
    writeJsonAtomic(statePath, state);
  }

  function listCollection(collectionName) {
    return loadState()[collectionName];
  }

  function getCollectionItem(collectionName, id) {
    return listCollection(collectionName).find((item) => item.id === id) || null;
  }

  function saveCollectionItem(collectionName, item) {
    const state = loadState();
    state[collectionName].push(item);
    saveState(state);
    return item;
  }

  function updateCollectionItem(collectionName, id, updater) {
    const state = loadState();
    const itemIndex = state[collectionName].findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      throw new Error(`${collectionName} item not found: ${id}`);
    }

    const nextItem = updater(state[collectionName][itemIndex]);
    state[collectionName][itemIndex] = nextItem;
    saveState(state);
    return nextItem;
  }

  function getMissionDir(missionId) {
    return path.join(missionsDir, missionId);
  }

  function getSessionDir(missionId, sessionId) {
    return path.join(getMissionDir(missionId), 'sessions', sessionId);
  }

  function writeArtifactContent({ missionId, sessionId, fileName, content }) {
    const targetDir = sessionId ? getSessionDir(missionId, sessionId) : path.join(getMissionDir(missionId), 'shared');
    ensureDirectory(targetDir);
    const artifactPath = path.join(targetDir, fileName);
    fs.writeFileSync(artifactPath, content, 'utf8');
    return artifactPath;
  }

  return {
    getAgentRun(runId) {
      return getCollectionItem('agentRuns', runId);
    },
    getApproval(approvalId) {
      return getCollectionItem('approvals', approvalId);
    },
    getArtifact(artifactId) {
      return getCollectionItem('artifacts', artifactId);
    },
    getEscalation(escalationId) {
      return getCollectionItem('escalations', escalationId);
    },
    getMission(missionId) {
      return getCollectionItem('missions', missionId);
    },
    getReviewerFollowUp(followUpId) {
      return getCollectionItem('reviewerFollowUps', followUpId);
    },
    getMissionDir,
    getSession(sessionId) {
      return getCollectionItem('sessions', sessionId);
    },
    getSessionDir,
    getStatePath() {
      return statePath;
    },
    getWorkspace(workspaceId) {
      return getCollectionItem('workspaces', workspaceId);
    },
    listAgentRunsBySession(sessionId) {
      return sortByCreatedAt(listCollection('agentRuns').filter((run) => run.sessionId === sessionId));
    },
    listApprovals(filter = {}) {
      return sortByCreatedAt(
        listCollection('approvals').filter((approval) => {
          if (filter.status && approval.status !== filter.status) {
            return false;
          }
          if (filter.missionId && approval.missionId !== filter.missionId) {
            return false;
          }
          if (filter.sessionId && approval.sessionId !== filter.sessionId) {
            return false;
          }
          return true;
        }),
      );
    },
    listEscalations(filter = {}) {
      return sortByCreatedAt(
        listCollection('escalations').filter((escalation) => {
          if (filter.status && escalation.status !== filter.status) {
            return false;
          }
          if (filter.actionId && escalation.actionId !== filter.actionId) {
            return false;
          }
          if (filter.missionId && escalation.missionId !== filter.missionId) {
            return false;
          }
          if (filter.workspaceId && escalation.workspaceId !== filter.workspaceId) {
            return false;
          }
          if (filter.owner && escalation.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        }),
      );
    },
    listReviewerFollowUps(filter = {}) {
      return sortByCreatedAt(
        listCollection('reviewerFollowUps').filter((followUp) => {
          if (filter.status && followUp.status !== filter.status) {
            return false;
          }
          if (filter.actionId && followUp.actionId !== filter.actionId) {
            return false;
          }
          if (filter.missionId && followUp.missionId !== filter.missionId) {
            return false;
          }
          if (filter.sessionId && followUp.sessionId !== filter.sessionId) {
            return false;
          }
          if (filter.workspaceId && followUp.workspaceId !== filter.workspaceId) {
            return false;
          }
          return true;
        }),
      );
    },
    listProviderProbes(filter = {}) {
      return sortByCreatedAt(
        listCollection('providerProbes').filter((probe) => {
          if (filter.providerId && probe.providerId !== filter.providerId) {
            return false;
          }
          if (typeof filter.ok === 'boolean' && Boolean(probe.ok) !== filter.ok) {
            return false;
          }
          if (typeof filter.attempted === 'boolean' && Boolean(probe.attempted) !== filter.attempted) {
            return false;
          }
          return true;
        }),
      );
    },
    listProviderAttentionAcknowledgements(filter = {}) {
      return sortByCreatedAt(
        listCollection('providerAttentionAcknowledgements').filter((record) => {
          if (filter.providerId && record.providerId !== filter.providerId) {
            return false;
          }
          if (filter.actionId && record.actionId !== filter.actionId) {
            return false;
          }
          if (filter.eventFamily && record.eventFamily !== filter.eventFamily) {
            return false;
          }
          if (filter.eventRefId && record.eventRefId !== filter.eventRefId) {
            return false;
          }
          if (filter.missionId && record.missionId !== filter.missionId) {
            return false;
          }
          if (filter.workspaceId && record.workspaceId !== filter.workspaceId) {
            return false;
          }
          return true;
        }),
      );
    },
    listMaintenanceRuns(filter = {}) {
      return sortByCreatedAt(
        listCollection('maintenanceRuns').filter((run) => {
          if (filter.missionId && run.missionId !== filter.missionId) {
            return false;
          }
          if (filter.workspaceId && run.workspaceId !== filter.workspaceId) {
            return false;
          }
          if (filter.owner && run.owner !== filter.owner) {
            return false;
          }
          return true;
        }),
      );
    },
    listArtifactsBySession(sessionId) {
      return sortByCreatedAt(listCollection('artifacts').filter((artifact) => artifact.sessionId === sessionId));
    },
    listMemoryEntries(filter = {}) {
      return sortByCreatedAt(
        listCollection('memoryEntries').filter((entry) => {
          if (filter.scope && entry.scope !== filter.scope) {
            return false;
          }
          if (filter.scopeId && entry.scopeId !== filter.scopeId) {
            return false;
          }
          return true;
        }),
      );
    },
    listMissions() {
      return sortByCreatedAt(listCollection('missions'));
    },
    listSessionsByMission(missionId) {
      return sortByCreatedAt(listCollection('sessions').filter((session) => session.missionId === missionId));
    },
    listWorkspaces() {
      return sortByCreatedAt(listCollection('workspaces'));
    },
    loadState,
    rootDir,
    saveAgentRun(agentRun) {
      return saveCollectionItem('agentRuns', agentRun);
    },
    saveApproval(approval) {
      return saveCollectionItem('approvals', approval);
    },
    saveArtifact(artifact) {
      return saveCollectionItem('artifacts', artifact);
    },
    saveEscalation(escalation) {
      return saveCollectionItem('escalations', escalation);
    },
    saveReviewerFollowUp(reviewerFollowUp) {
      return saveCollectionItem('reviewerFollowUps', reviewerFollowUp);
    },
    saveProviderProbe(providerProbe) {
      return saveCollectionItem('providerProbes', providerProbe);
    },
    saveProviderAttentionAcknowledgement(providerAttentionAcknowledgement) {
      return saveCollectionItem('providerAttentionAcknowledgements', providerAttentionAcknowledgement);
    },
    saveMaintenanceRun(maintenanceRun) {
      return saveCollectionItem('maintenanceRuns', maintenanceRun);
    },
    saveMemoryEntry(memoryEntry) {
      return saveCollectionItem('memoryEntries', memoryEntry);
    },
    saveMission(mission) {
      return saveCollectionItem('missions', mission);
    },
    saveSession(session) {
      return saveCollectionItem('sessions', session);
    },
    saveWorkspace(workspace) {
      return saveCollectionItem('workspaces', workspace);
    },
    updateAgentRun(runId, updater) {
      return updateCollectionItem('agentRuns', runId, updater);
    },
    updateApproval(approvalId, updater) {
      return updateCollectionItem('approvals', approvalId, updater);
    },
    updateArtifact(artifactId, updater) {
      return updateCollectionItem('artifacts', artifactId, updater);
    },
    updateEscalation(escalationId, updater) {
      return updateCollectionItem('escalations', escalationId, updater);
    },
    updateReviewerFollowUp(followUpId, updater) {
      return updateCollectionItem('reviewerFollowUps', followUpId, updater);
    },
    updateProviderAttentionAcknowledgement(providerAttentionAcknowledgementId, updater) {
      return updateCollectionItem('providerAttentionAcknowledgements', providerAttentionAcknowledgementId, updater);
    },
    updateMission(missionId, updater) {
      return updateCollectionItem('missions', missionId, updater);
    },
    updateSession(sessionId, updater) {
      return updateCollectionItem('sessions', sessionId, updater);
    },
    varDir,
    writeArtifactContent,
  };
}
