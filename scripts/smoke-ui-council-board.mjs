import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { renderCouncilBoard } from '../src/web/public/lib/council-board.js';
import { buildCouncilReadModel } from '../src/web/public/lib/council-read-model.js';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-board-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });
const workspace = service.addWorkspace({
  name: 'council-board-workspace',
  workspacePath,
});

async function runCouncilMission({ constraints, title }) {
  const mission = service.createMission({
    constraints,
    deliverableType: 'decision-memo',
    mode: 'knowledge',
    objective: `Render ${title} from persisted council records.`,
    title,
    workspaceId: workspace.id,
  });
  await service.runMission(mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  const missionDetail = service.showMission(mission.id);
  const session = missionDetail.sessions.at(-1);
  return service.showSession(mission.id, { sessionId: session.id });
}

const completedPayload = await runCouncilMission({
  constraints: ['orchestration-profile:knowledge-council-triad'],
  title: 'Completed council board',
});
const completedModel = buildCouncilReadModel({ sessionPayload: completedPayload });
const completedMarkup = renderCouncilBoard(completedModel);

assert.equal(completedModel.state, 'completed');
assert.equal(completedModel.seats.length, 3);
assert.equal(completedModel.seats.every((seat) => seat.opening.runId && seat.rebuttal.runId), true);
assert.equal(completedModel.reviewer.result, 'pass');
assert.equal((completedMarkup.match(/data-council-focus-key=/g) || []).length, 3);
assert.match(completedMarkup, /data-retrieval-artifact-open=/);
assert.doesNotMatch(completedMarkup, /data-approval-(approve|reject)/);
assert.doesNotMatch(completedMarkup, /data-ui-action=/);
assert.doesNotMatch(completedMarkup, /council-round-next/);
assert.equal((completedMarkup.match(/<aside class="council-next-action"/g) || []).length, 1);

const blockedPayload = await runCouncilMission({
  constraints: [
    'orchestration-profile:knowledge-council-triad',
    'council-critical-conflict',
  ],
  title: 'Blocked council board',
});
const blockedModel = buildCouncilReadModel({ sessionPayload: blockedPayload });
const blockedMarkup = renderCouncilBoard(blockedModel);

assert.equal(blockedModel.state, 'blocked');
assert.equal(blockedModel.reviewer.result, '기록 없음');
assert.equal(blockedModel.humanApproval.status, '기록 없음');
assert.match(blockedMarkup, /중단됨/);
assert.equal((blockedMarkup.match(/<aside class="council-next-action"/g) || []).length, 1);

const indexHtml = fs.readFileSync(path.join(process.cwd(), 'src/web/public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(process.cwd(), 'src/web/public/app.js'), 'utf8');
const styles = fs.readFileSync(path.join(process.cwd(), 'src/web/public/styles.css'), 'utf8');

assert.match(indexHtml, /id="council-board"/);
assert.match(indexHtml, /Read-only council/);
assert.match(appJs, /wireCouncilSeatNavigation/);
assert.match(appJs, /wireRetrievalArtifactButtons\(elements\.councilBoard\)/);
assert.match(styles, /\.council-seat:focus-visible/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /@media \(max-width: 640px\)/);

console.log(
  JSON.stringify(
    {
      blockedState: blockedModel.state,
      completedState: completedModel.state,
      mode: 'ui-council-board',
      ok: true,
      seatCount: completedModel.seats.length,
    },
    null,
    2,
  ),
);
