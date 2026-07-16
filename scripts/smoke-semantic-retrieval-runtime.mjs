import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const repoDir = process.cwd();
const fixtureCommandPath = path.join(repoDir, 'fixtures', 'local-embedding-command.mjs');
const environmentKeys = [
  'PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON',
  'PERSONAL_AI_AGENT_EMBEDDING_COMMAND',
  'PERSONAL_AI_AGENT_RETRIEVAL_MODE',
];
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

try {
  const semanticFixture = createMissionFixture('semantic');
  enableSemanticRuntime([fixtureCommandPath]);
  const semanticService = createMissionService({
    rootDir: semanticFixture.rootDir,
    store: semanticFixture.store,
  });
  const semanticRun = await semanticService.runMission(semanticFixture.mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  assert.equal(semanticRun.mission.status, 'completed');

  const semanticRetrieval = readManagerRetrieval(
    semanticService.showSession(semanticFixture.mission.id),
  );
  assert.match(semanticRetrieval, /retrievalReason: semantic .*local model fixture-semantic-map-v1/);
  assert.equal(
    semanticRetrieval.indexOf('[memory] mission/fact') <
      semanticRetrieval.indexOf('[attachment] sign-in-page.md'),
    true,
  );
  assert.match(semanticRetrieval, /Renew expired authentication credentials/);
  assert.doesNotMatch(
    JSON.stringify(semanticFixture.store.loadState()),
    /PERSONAL_AI_AGENT_EMBEDDING|fixture-semantic-map-v1|semanticScore/,
  );

  const lexicalFixture = createMissionFixture('lexical');
  disableSemanticRuntime();
  const lexicalService = createMissionService({
    rootDir: lexicalFixture.rootDir,
    store: lexicalFixture.store,
  });
  const lexicalRun = await lexicalService.runMission(lexicalFixture.mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  assert.equal(lexicalRun.mission.status, 'completed');

  const lexicalRetrieval = readManagerRetrieval(
    lexicalService.showSession(lexicalFixture.mission.id),
  );
  assert.doesNotMatch(lexicalRetrieval, /local model fixture-semantic-map-v1/);
  assert.match(lexicalRetrieval, /retrievalReason: matched \d+ query terms?:/);
  assert.match(lexicalRetrieval, /bm25Score:/);

  const failureFixture = createMissionFixture('failure');
  enableSemanticRuntime([
    '-e',
    "process.stdin.resume(); process.stdin.on('end', () => { process.stderr.write('fixture embedding failure'); process.exit(3); });",
  ]);
  const failureService = createMissionService({
    rootDir: failureFixture.rootDir,
    store: failureFixture.store,
  });
  await assert.rejects(
    () => failureService.runMission(failureFixture.mission.id, {
      provider: 'stub',
      providerSpecified: true,
    }),
    /code 3: fixture embedding failure/,
  );
  const failureState = failureFixture.store.loadState();
  assert.equal(failureState.agentRuns.length, 0);
  assert.equal(
    failureState.artifacts.some((artifact) => ['prompt', 'retrieval'].includes(artifact.kind)),
    false,
  );

  const developmentPlan = fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  );
  for (const term of [
    'status: local-relevance-shadow-integration-current',
    '| R5 Local semantic runtime opt-in | 완료 |',
    'PERSONAL_AI_AGENT_RETRIEVAL_MODE=semantic-rerank',
    'npm run smoke:semantic-retrieval-runtime',
    'productionReadyClaim: false',
    'actualLocalEmbeddingModelQualityValidated: true',
    'actualLocalEmbeddingModelQualified: false',
  ]) {
    assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
  }

  console.log(
    JSON.stringify(
      {
        actualLocalEmbeddingModelQualityValidated: true,
        actualLocalEmbeddingModelQualified: false,
        costFree: true,
        failureBeforeProviderRun: true,
        mode: 'semantic-retrieval-runtime',
        ok: true,
        productionReadyClaim: false,
        rollbackMode: 'lexical',
        runtimeActivation: 'explicit-local-opt-in',
        semanticFirstSource: 'memory',
      },
      null,
      2,
    ),
  );
} finally {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  }
}

function createMissionFixture(label) {
  disableSemanticRuntime();
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `personal-ai-agent-semantic-runtime-${label}-`),
  );
  const workspacePath = path.join(rootDir, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });
  const workspace = runCli({
    args: ['workspace', 'add', workspacePath, '--name', `${label}-workspace`],
    rootDir,
  });
  const mission = runCli({
    args: [
      'mission',
      'create',
      '--workspace',
      workspace.id,
      '--mode',
      'knowledge',
      '--deliverable',
      'decision-memo',
      '--title',
      'Sign-in recovery',
      '--objective',
      'Recover a sign-in token after timeout.',
    ],
    rootDir,
  });
  const store = createStore({ rootDir });
  const service = createMissionService({ rootDir, store });
  service.addMemory({
    content: 'Renew expired authentication credentials and preserve verification evidence.',
    kind: 'fact',
    scope: 'mission',
    scopeId: mission.id,
  });
  service.addMissionAttachment({
    content: 'The sign-in page uses blue color and compact typography.',
    fileName: 'sign-in-page.md',
    mimeType: 'text/markdown',
    missionId: mission.id,
    source: 'fixture',
  });
  return { mission, rootDir, store };
}

function enableSemanticRuntime(args) {
  process.env.PERSONAL_AI_AGENT_RETRIEVAL_MODE = 'semantic-rerank';
  process.env.PERSONAL_AI_AGENT_EMBEDDING_COMMAND = process.execPath;
  process.env.PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON = JSON.stringify(args);
}

function disableSemanticRuntime() {
  process.env.PERSONAL_AI_AGENT_RETRIEVAL_MODE = 'lexical';
  delete process.env.PERSONAL_AI_AGENT_EMBEDDING_COMMAND;
  delete process.env.PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON;
}

function readManagerRetrieval(sessionView) {
  const artifact = sessionView.artifacts.find(
    (item) => item.fileName === 'manager-retrieval.md',
  );
  assert.ok(artifact, 'manager retrieval artifact is required');
  return fs.readFileSync(artifact.path, 'utf8');
}
