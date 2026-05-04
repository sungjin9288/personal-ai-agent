import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE_NAME = 'state.json';
const VAR_DIR_NAME = 'var';

export function buildRuntimeDataInventory({ rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const statePath = path.join(varDir, STATE_FILE_NAME);
  const state = readJsonIfExists(statePath);
  const files = fs.existsSync(varDir) ? listFiles(varDir) : [];

  return {
    artifactFileCount: files.filter((filePath) => filePath.includes(`${path.sep}missions${path.sep}`)).length,
    collectionCounts: countStateCollections(state),
    exists: fs.existsSync(varDir),
    fileCount: files.length,
    generatedAt: new Date().toISOString(),
    rootName: path.basename(normalizedRootDir),
    stateExists: Boolean(state),
    stateSha256: state ? hashFile(statePath) : '',
    totalBytes: files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0),
    varDirName: VAR_DIR_NAME,
  };
}

export function buildTenantRuntimeDataInventory({ rootDir, tenantId }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    throw new Error('tenantId is required for tenant runtime data inventory.');
  }

  const statePath = path.join(normalizedRootDir, VAR_DIR_NAME, STATE_FILE_NAME);
  const state = readJsonIfExists(statePath);
  const tenantState = filterStateByTenant(state, normalizedTenantId);
  const missionIds = new Set(tenantState.missions.map((mission) => mission.id));
  const missionFiles = listTenantMissionFiles({ missionIds, rootDir: normalizedRootDir });
  const stateBytes = Buffer.byteLength(`${JSON.stringify(tenantState, null, 2)}\n`, 'utf8');
  const hasTenantState = tenantState.workspaces.length > 0 || tenantState.missions.length > 0 || missionFiles.length > 0;

  return {
    artifactFileCount: missionFiles.length,
    collectionCounts: countStateCollections(tenantState),
    exists: hasTenantState,
    fileCount: hasTenantState ? missionFiles.length + 1 : 0,
    generatedAt: new Date().toISOString(),
    rootName: path.basename(normalizedRootDir),
    stateExists: Boolean(state),
    tenantId: normalizedTenantId,
    tenantStateSha256: hashString(`${JSON.stringify(tenantState, null, 2)}\n`),
    totalBytes: missionFiles.reduce((sum, filePath) => sum + fs.statSync(filePath).size, stateBytes),
    varDirName: VAR_DIR_NAME,
  };
}

export function exportRuntimeDataBundle({ outputDir, rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedOutputDir = path.resolve(String(outputDir || '').trim());
  if (!normalizedOutputDir) {
    throw new Error('outputDir is required for runtime data export.');
  }

  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const exportDir = path.join(normalizedOutputDir, 'runtime-data-export');
  const inventory = buildRuntimeDataInventory({ rootDir: normalizedRootDir });
  const exportedFiles = [];

  fs.rmSync(exportDir, { force: true, recursive: true });
  fs.mkdirSync(exportDir, { recursive: true });

  if (fs.existsSync(varDir)) {
    for (const sourcePath of listFiles(varDir)) {
      const relativePath = path.relative(normalizedRootDir, sourcePath);
      const targetPath = path.join(exportDir, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      exportedFiles.push({
        bytes: fs.statSync(sourcePath).size,
        path: relativePath,
        sha256: hashFile(sourcePath),
      });
    }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    exportedFiles,
    exportedFileCount: exportedFiles.length,
    inventory,
    policy: {
      deleteRequiresConfirmationToken: buildRuntimeDataDeleteConfirmationToken({ rootDir: normalizedRootDir }),
      scope: 'local-runtime-var-directory',
    },
  };
  const manifestPath = path.join(exportDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    exportDir,
    manifest,
    manifestPath,
  };
}

export function exportTenantRuntimeDataBundle({ outputDir, rootDir, tenantId }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedOutputDir = path.resolve(String(outputDir || '').trim());
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedOutputDir) {
    throw new Error('outputDir is required for tenant runtime data export.');
  }
  if (!normalizedTenantId) {
    throw new Error('tenantId is required for tenant runtime data export.');
  }

  const state = readJsonIfExists(path.join(normalizedRootDir, VAR_DIR_NAME, STATE_FILE_NAME));
  const tenantState = filterStateByTenant(state, normalizedTenantId);
  const missionIds = new Set(tenantState.missions.map((mission) => mission.id));
  const exportDir = path.join(normalizedOutputDir, `tenant-${safePathSegment(normalizedTenantId)}-runtime-data-export`);
  const inventory = buildTenantRuntimeDataInventory({ rootDir: normalizedRootDir, tenantId: normalizedTenantId });
  const exportedFiles = [];

  fs.rmSync(exportDir, { force: true, recursive: true });
  fs.mkdirSync(path.join(exportDir, VAR_DIR_NAME), { recursive: true });

  const exportedStatePath = path.join(exportDir, VAR_DIR_NAME, STATE_FILE_NAME);
  fs.writeFileSync(exportedStatePath, `${JSON.stringify(tenantState, null, 2)}\n`, 'utf8');
  exportedFiles.push({
    bytes: fs.statSync(exportedStatePath).size,
    path: `${VAR_DIR_NAME}/${STATE_FILE_NAME}`,
    sha256: hashFile(exportedStatePath),
  });

  for (const sourcePath of listTenantMissionFiles({ missionIds, rootDir: normalizedRootDir })) {
    const relativePath = path.relative(normalizedRootDir, sourcePath);
    const targetPath = path.join(exportDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    exportedFiles.push({
      bytes: fs.statSync(sourcePath).size,
      path: relativePath,
      sha256: hashFile(sourcePath),
    });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    exportedFiles,
    exportedFileCount: exportedFiles.length,
    inventory,
    policy: {
      deleteRequiresConfirmationToken: buildTenantRuntimeDataDeleteConfirmationToken({
        rootDir: normalizedRootDir,
        tenantId: normalizedTenantId,
      }),
      scope: 'tenant-runtime-data',
      tenantId: normalizedTenantId,
    },
  };
  const manifestPath = path.join(exportDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    exportDir,
    manifest,
    manifestPath,
  };
}

export function buildRuntimeDataDeleteConfirmationToken({ rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const digest = crypto.createHash('sha256').update(normalizedRootDir).digest('hex').slice(0, 12);
  return `delete-runtime-data:${path.basename(normalizedRootDir)}:${digest}`;
}

export function buildTenantRuntimeDataDeleteConfirmationToken({ rootDir, tenantId }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    throw new Error('tenantId is required for tenant runtime data deletion.');
  }
  const digest = crypto
    .createHash('sha256')
    .update(`${normalizedRootDir}\0${normalizedTenantId}`)
    .digest('hex')
    .slice(0, 12);
  return `delete-tenant-runtime-data:${path.basename(normalizedRootDir)}:${normalizedTenantId}:${digest}`;
}

export function deleteRuntimeData({ confirmationToken = '', rootDir }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const expectedToken = buildRuntimeDataDeleteConfirmationToken({ rootDir: normalizedRootDir });
  if (confirmationToken !== expectedToken) {
    throw new Error('runtime data deletion requires the exact confirmation token.');
  }

  const varDir = path.join(normalizedRootDir, VAR_DIR_NAME);
  const before = buildRuntimeDataInventory({ rootDir: normalizedRootDir });
  fs.rmSync(varDir, { force: true, recursive: true });
  const after = buildRuntimeDataInventory({ rootDir: normalizedRootDir });

  return {
    after,
    before,
    deleted: before.exists && !after.exists,
    deletedAt: new Date().toISOString(),
  };
}

export function deleteTenantRuntimeData({ confirmationToken = '', rootDir, tenantId }) {
  const normalizedRootDir = path.resolve(String(rootDir || '').trim() || process.cwd());
  const normalizedTenantId = normalizeTenantId(tenantId);
  const expectedToken = buildTenantRuntimeDataDeleteConfirmationToken({
    rootDir: normalizedRootDir,
    tenantId: normalizedTenantId,
  });
  if (confirmationToken !== expectedToken) {
    throw new Error('tenant runtime data deletion requires the exact confirmation token.');
  }

  const statePath = path.join(normalizedRootDir, VAR_DIR_NAME, STATE_FILE_NAME);
  const state = readJsonIfExists(statePath);
  const before = buildTenantRuntimeDataInventory({ rootDir: normalizedRootDir, tenantId: normalizedTenantId });
  const tenantState = filterStateByTenant(state, normalizedTenantId);
  const missionIds = new Set(tenantState.missions.map((mission) => mission.id));
  const remainingState = removeTenantState(state, normalizedTenantId);

  if (state) {
    fs.writeFileSync(statePath, `${JSON.stringify(remainingState, null, 2)}\n`, 'utf8');
  }

  for (const missionId of missionIds) {
    fs.rmSync(path.join(normalizedRootDir, VAR_DIR_NAME, 'missions', missionId), { force: true, recursive: true });
  }

  const after = buildTenantRuntimeDataInventory({ rootDir: normalizedRootDir, tenantId: normalizedTenantId });

  return {
    after,
    before,
    deleted: before.exists && !after.exists,
    deletedAt: new Date().toISOString(),
    tenantId: normalizedTenantId,
  };
}

function countStateCollections(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, value.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function filterStateByTenant(state, tenantId) {
  const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const workspaces = ensureArray(source.workspaces).filter((workspace) => workspace.tenantId === tenantId);
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const missions = ensureArray(source.missions).filter((mission) => workspaceIds.has(mission.workspaceId));
  const missionIds = new Set(missions.map((mission) => mission.id));
  const executionSessions = ensureArray(source.executionSessions).filter((item) => missionIds.has(item.missionId));
  const executionSessionIds = new Set(executionSessions.map((item) => item.id));
  const sessions = ensureArray(source.sessions).filter((item) => missionIds.has(item.missionId));
  const sessionIds = new Set(sessions.map((item) => item.id));
  const memoryEntries = ensureArray(source.memoryEntries).filter((item) => isTenantScopedItem(item, {
    executionSessionIds,
    missionIds,
    sessionIds,
    workspaceIds,
  }));
  const memoryIds = new Set(memoryEntries.map((item) => item.id));
  const factGraphNodes = ensureArray(source.factGraphNodes).filter(
    (item) => workspaceIds.has(item.workspaceId) || memoryIds.has(item.memoryId),
  );
  const factGraphNodeIds = new Set(factGraphNodes.map((item) => item.id));

  return {
    ...Object.fromEntries(Object.entries(source).map(([key, value]) => [key, Array.isArray(value) ? [] : value])),
    workspaces,
    missions,
    missionAttachments: filterTenantCollection(source.missionAttachments, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    sessions,
    executionSessions,
    executionLeases: filterTenantCollection(source.executionLeases, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    releaseActions: filterTenantCollection(source.releaseActions, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    agentRuns: filterTenantCollection(source.agentRuns, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    artifacts: filterTenantCollection(source.artifacts, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    approvals: filterTenantCollection(source.approvals, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    escalations: filterTenantCollection(source.escalations, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    reviewerFollowUps: filterTenantCollection(source.reviewerFollowUps, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    providerProbes: filterTenantCollection(source.providerProbes, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    providerAttentionAcknowledgements: filterTenantCollection(source.providerAttentionAcknowledgements, {
      executionSessionIds,
      missionIds,
      sessionIds,
      workspaceIds,
    }),
    providerAttentionReminders: filterTenantCollection(source.providerAttentionReminders, {
      executionSessionIds,
      missionIds,
      sessionIds,
      workspaceIds,
    }),
    specialistFollowUpReminders: filterTenantCollection(source.specialistFollowUpReminders, {
      executionSessionIds,
      missionIds,
      sessionIds,
      workspaceIds,
    }),
    maintenanceRuns: filterTenantCollection(source.maintenanceRuns, { executionSessionIds, missionIds, sessionIds, workspaceIds }),
    memoryEntries,
    factGraphNodes,
    factGraphEdges: ensureArray(source.factGraphEdges).filter(
      (item) => factGraphNodeIds.has(item.fromNodeId) || factGraphNodeIds.has(item.toNodeId),
    ),
  };
}

function removeTenantState(state, tenantId) {
  const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const tenantState = filterStateByTenant(source, tenantId);
  const idsByCollection = Object.fromEntries(
    Object.entries(tenantState)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, new Set(value.map((item) => item.id).filter(Boolean))]),
  );

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => {
      if (!Array.isArray(value)) {
        return [key, value];
      }
      const ids = idsByCollection[key] || new Set();
      return [key, value.filter((item) => !ids.has(item.id))];
    }),
  );
}

function filterTenantCollection(collection, scope) {
  return ensureArray(collection).filter((item) => isTenantScopedItem(item, scope));
}

function isTenantScopedItem(item, { executionSessionIds, missionIds, sessionIds, workspaceIds }) {
  if (!item || typeof item !== 'object') {
    return false;
  }
  if (workspaceIds.has(item.workspaceId)) {
    return true;
  }
  if (missionIds.has(item.missionId) || (item.scope === 'mission' && missionIds.has(item.scopeId))) {
    return true;
  }
  if (workspaceIds.has(item.scopeId) && item.scope === 'workspace') {
    return true;
  }
  if (sessionIds.has(item.sessionId)) {
    return true;
  }
  return executionSessionIds.has(item.executionSessionId);
}

function listTenantMissionFiles({ missionIds, rootDir }) {
  const missionsDir = path.join(rootDir, VAR_DIR_NAME, 'missions');
  return [...missionIds].flatMap((missionId) => {
    const missionDir = path.join(missionsDir, missionId);
    return fs.existsSync(missionDir) ? listFiles(missionDir) : [];
  });
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function listFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hashString(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeTenantId(value) {
  return String(value || '').trim();
}

function safePathSegment(value) {
  return String(value || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'tenant';
}
