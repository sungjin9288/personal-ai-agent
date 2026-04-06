import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE = {
  workspaces: [],
  missions: [],
};

function cloneDefaultState() {
  return {
    workspaces: [],
    missions: [],
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
    };
  }

  function saveState(state) {
    ensureState();
    writeJsonAtomic(statePath, state);
  }

  function listWorkspaces() {
    return loadState().workspaces;
  }

  function listMissions() {
    return loadState().missions;
  }

  function saveWorkspace(workspace) {
    const state = loadState();
    state.workspaces.push(workspace);
    saveState(state);
    return workspace;
  }

  function saveMission(mission) {
    const state = loadState();
    state.missions.push(mission);
    saveState(state);
    return mission;
  }

  function updateMission(missionId, updater) {
    const state = loadState();
    const missionIndex = state.missions.findIndex((mission) => mission.id === missionId);

    if (missionIndex === -1) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const nextMission = updater(state.missions[missionIndex]);
    state.missions[missionIndex] = nextMission;
    saveState(state);
    return nextMission;
  }

  function getWorkspace(workspaceId) {
    return loadState().workspaces.find((workspace) => workspace.id === workspaceId) || null;
  }

  function getMission(missionId) {
    return loadState().missions.find((mission) => mission.id === missionId) || null;
  }

  function getMissionDir(missionId) {
    return path.join(missionsDir, missionId);
  }

  function writeMissionArtifact(missionId, fileName, content) {
    const missionDir = getMissionDir(missionId);
    ensureDirectory(missionDir);
    const artifactPath = path.join(missionDir, fileName);
    fs.writeFileSync(artifactPath, content, 'utf8');
    return artifactPath;
  }

  return {
    getMission,
    getMissionDir,
    getWorkspace,
    listMissions,
    listWorkspaces,
    loadState,
    rootDir,
    saveMission,
    saveWorkspace,
    statePath,
    updateMission,
    varDir,
    writeMissionArtifact,
  };
}
