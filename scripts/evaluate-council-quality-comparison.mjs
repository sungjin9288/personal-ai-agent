import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COUNCIL_BASELINE_PROFILE,
  COUNCIL_CANDIDATE_PROFILE,
  COUNCIL_QUALITY_SCHEMA_VERSION,
  assertCouncilQualityComparison,
  assertCouncilQualityFixtures,
  buildCouncilQualityComparison,
  buildProfileQualityObservation,
  formatCouncilQualityValue,
  hashCouncilQualityValue,
  sealCouncilQualityEvidence,
} from '../src/core/council-quality-comparison.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const defaultFixturePath = path.join(
  repositoryRoot,
  'fixtures',
  'council-quality-comparison-cases-v1.json',
);
const profileIds = [
  COUNCIL_BASELINE_PROFILE,
  COUNCIL_CANDIDATE_PROFILE,
];

function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function loadFixtures(fixturePath) {
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return assertCouncilQualityFixtures(fixtures);
}

function missionRecords(state, missionId) {
  return {
    approvals: state.approvals.filter((item) => item.missionId === missionId),
    artifacts: state.artifacts.filter((item) => item.missionId === missionId),
    executionLeases: state.executionLeases.filter((item) => item.missionId === missionId),
    mission: state.missions.find((item) => item.id === missionId),
    runs: state.agentRuns.filter((item) => item.missionId === missionId),
    session: state.sessions.find((item) => item.missionId === missionId),
  };
}

function bindArtifacts(records) {
  const runIndexByArtifactId = new Map();
  records.runs.forEach((run, runIndex) => {
    for (const artifactId of run.artifactIds || []) {
      runIndexByArtifactId.set(artifactId, runIndex);
    }
  });

  return records.artifacts.map((artifact, artifactIndex) => {
    const content = fs.readFileSync(artifact.path);
    const runIndex = runIndexByArtifactId.get(artifact.id);
    const run = runIndex === undefined ? null : records.runs[runIndex];
    return {
      artifactIndex,
      byteLength: content.byteLength,
      fileName: path.basename(artifact.path),
      kind: artifact.kind,
      role: artifact.role,
      runIndex: runIndex ?? null,
      sha256: sha256(content),
      specialistKind: run?.specialistKind || null,
      stageKind: run?.stageKind || null,
    };
  });
}

async function runProfileFixture(fixture, profileId) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-quality-'));
  const workspacePath = path.join(rootDir, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });

  try {
    const store = createStore({ rootDir });
    const service = createMissionService({ rootDir, store });
    const workspace = service.addWorkspace({
      name: `council-quality-${fixture.id}-${profileId}`,
      workspacePath,
    });
    const mission = service.createMission({
      constraints: [
        `orchestration-profile:${profileId}`,
        ...fixture.constraints,
      ],
      deliverableType: fixture.deliverableType,
      mode: 'knowledge',
      objective: fixture.objective,
      title: fixture.title,
      workspaceId: workspace.id,
    });

    await service.runMission(mission.id, {
      provider: 'stub',
      providerSpecified: true,
    });

    const records = missionRecords(store.loadState(), mission.id);
    return buildProfileQualityObservation({
      approvals: records.approvals,
      artifacts: bindArtifacts(records),
      executionLeases: records.executionLeases,
      fixture,
      mission: records.mission,
      profileId,
      runs: records.runs,
      session: records.session,
    });
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

async function runSuite(fixtures) {
  const observations = [];
  for (const fixture of fixtures.cases) {
    for (const profileId of profileIds) {
      observations.push(await runProfileFixture(fixture, profileId));
    }
  }
  return observations;
}

function suiteSemanticHash(observations) {
  return hashCouncilQualityValue(
    observations.map((observation) => ({
      fixtureId: observation.fixtureId,
      profileId: observation.profileId,
      semanticHash: observation.semanticHash,
    })),
  );
}

export async function evaluateCouncilQualityComparison({ fixturePath = defaultFixturePath } = {}) {
  const fixtures = loadFixtures(fixturePath);
  const firstReplay = await runSuite(fixtures);
  const secondReplay = await runSuite(fixtures);
  const replaySemanticHashes = [
    suiteSemanticHash(firstReplay),
    suiteSemanticHash(secondReplay),
  ];
  const fixtureSetHash = hashCouncilQualityValue(fixtures);
  const comparison = buildCouncilQualityComparison({
    fixtureSetHash,
    observations: firstReplay,
    replaySemanticHashes,
  });
  const evidence = sealCouncilQualityEvidence({
    actualUserDataUsed: false,
    approvalOrderingChanged: false,
    comparison,
    costFree: true,
    determinism: {
      replayCount: 2,
      replaySemanticHashes,
    },
    evaluatedAt: 'deterministic-local-replay',
    externalProviderCalls: 'none',
    fixtureSetHash,
    fixtureSource: 'fixtures/council-quality-comparison-cases-v1.json',
    modelDownload: false,
    observations: firstReplay,
    permissionChanged: false,
    productionDependencyAdded: false,
    productionReadyClaim: false,
    publicContractChanged: false,
    schemaVersion: COUNCIL_QUALITY_SCHEMA_VERSION,
    storageSchemaChanged: false,
  });
  return assertCouncilQualityComparison(evidence, fixtures);
}

function outputArgument(argv) {
  const index = argv.indexOf('--output');
  return index === -1 ? '' : String(argv[index + 1] || '').trim();
}

async function main() {
  const evidence = await evaluateCouncilQualityComparison();
  const content = formatCouncilQualityValue(evidence);
  const output = outputArgument(process.argv.slice(2));

  if (output) {
    const outputPath = path.resolve(repositoryRoot, output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content);
  } else {
    process.stdout.write(content);
  }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  await main();
}
