#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildEngineeringApprovalRehearsalEvidence,
  ENGINEERING_APPROVAL_REHEARSAL_FIXTURE_REASON,
  ENGINEERING_APPROVAL_REHEARSAL_SCENARIO,
  inspectFixtureApproval,
} from '../src/core/engineering-approval-rehearsal-evidence.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const outputPath = resolveEvidenceOutputPath(readOption(process.argv.slice(2), '--output'));
const captureCommit = readOption(process.argv.slice(2), '--capture-commit') || readGitCommit();
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-approval-rehearsal-'));
const workspacePath = path.join(runtimeRoot, 'workspace');

let observations;

try {
  fs.mkdirSync(workspacePath, { recursive: true });
  observations = runRehearsal(runtimeRoot, workspacePath);
} finally {
  fs.rmSync(runtimeRoot, { force: true, recursive: true });
}

if (fs.existsSync(runtimeRoot)) {
  throw new Error('Engineering approval rehearsal runtime root was not cleaned.');
}

const evidence = buildEngineeringApprovalRehearsalEvidence({
  ...observations,
  captureCommit,
  generatedAt: new Date().toISOString(),
  limitations: {
    costClaim: false,
    customerImpactClaim: false,
    externalProviderValidated: false,
    generalizableClaim: false,
    humanApprovalCollected: false,
    humanFeedbackCollected: false,
    participantCount: 0,
    productivityClaim: false,
    productionReadyClaim: false,
    slaClaim: false,
  },
  safety: {
    ...observations.safety,
    runtimeRootCleaned: true,
  },
  status: 'verified-deterministic-rehearsal',
});

const serializedEvidence = `${JSON.stringify(evidence, null, 2)}\n`;

if (outputPath) {
  writeEvidenceAtomically(outputPath, serializedEvidence);
}

process.stdout.write(serializedEvidence);

function runRehearsal(rootDir, targetWorkspacePath) {
  const workspaceDigestBefore = digestDirectory(targetWorkspacePath);
  const workspace = runCli(rootDir, [
    'workspace',
    'add',
    targetWorkspacePath,
    '--name',
    'engineering-approval-rehearsal',
  ]);
  const mission = runCli(rootDir, [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.title,
    '--objective',
    ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.objective,
    '--constraints',
    ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.constraints.join('|'),
  ]);
  const run = runCli(rootDir, [
    'mission',
    'run',
    mission.id,
    '--provider',
    'stub',
  ]);
  const missionShow = runCli(rootDir, ['mission', 'show', mission.id]);
  const timeline = runCli(rootDir, ['mission', 'timeline', mission.id]);
  const approvalInboxBefore = runCli(rootDir, ['approval', 'inbox', '--mission', mission.id]);
  const actionInboxBefore = runCli(rootDir, ['action', 'inbox', '--mission', mission.id]);
  const sessionBefore = runCli(rootDir, ['session', 'show', mission.id]);

  ensure(run.provider === 'stub', 'Scenario 2 must run with the stub provider.');
  ensure(run.status === 'awaiting_approval', 'Scenario 2 must stop at the approval gate.');
  ensure(run.reviewerVerdict === 'pass', 'Scenario 2 reviewer must pass the bounded proposal.');
  ensure(missionShow.mission?.id === mission.id, 'Mission show did not return the rehearsal mission.');
  ensure(missionShow.mission?.status === 'awaiting_approval', 'Mission show missed the approval state.');
  ensure(timeline.mission?.id === mission.id, 'Mission timeline did not return the rehearsal mission.');
  ensure(Array.isArray(timeline.timeline) && timeline.timeline.length > 0, 'Mission timeline is empty.');
  ensure(approvalInboxBefore.summary?.pendingCount === 1, 'Approval inbox must contain one pending approval.');
  ensure(actionInboxBefore.summary?.actionCounts?.approval === 1, 'Action inbox must expose the pending approval.');
  ensure(missionShow.summary?.providerExecutionEstimatedCostUsdTotal === 0, 'Stub provider cost must remain zero.');
  ensure(
    missionShow.summary?.latestGatewayEvent?.source?.externalMessagingEnabled === false,
    'Scenario 2 must keep external messaging disabled.',
  );
  ensure(
    sessionBefore.agentRuns.every((agentRun) => agentRun.providerId === 'stub'),
    'Every Scenario 2 role must use the stub provider.',
  );

  const resolution = runCli(rootDir, [
    'approval',
    'resolve',
    run.approvalId,
    '--decision',
    'approve',
    '--reason',
    ENGINEERING_APPROVAL_REHEARSAL_FIXTURE_REASON,
  ]);
  const missionAfter = runCli(rootDir, ['mission', 'show', mission.id]);
  const timelineAfter = runCli(rootDir, ['mission', 'timeline', mission.id]);
  const approvalInboxAfter = runCli(rootDir, ['approval', 'inbox', '--mission', mission.id]);
  const actionInboxAfter = runCli(rootDir, ['action', 'inbox', '--mission', mission.id]);
  const sessionAfter = runCli(rootDir, ['session', 'show', mission.id]);

  ensure(resolution.mission?.status === 'completed', 'Fixture approval must complete the rehearsal mission.');
  ensure(missionAfter.mission?.status === 'completed', 'Mission show missed the completed state.');
  ensure(timelineAfter.mission?.status === 'completed', 'Mission timeline missed the completed state.');
  ensure(approvalInboxAfter.summary?.pendingCount === 0, 'Resolved approval must leave the approval inbox.');
  ensure(actionInboxAfter.summary?.actionCounts?.approval === 0, 'Resolved approval must leave the action inbox.');

  const executionReadyBrief = readArtifact(sessionAfter, 'execution-ready-brief.md', rootDir);
  const fixtureObservation = inspectFixtureApproval({
    approval: resolution.approval,
    handoffArtifact: executionReadyBrief.artifact,
    handoffContent: executionReadyBrief.content.toString('utf8'),
  });
  const artifactSha256 = {
    executionReadyBrief: executionReadyBrief.sha256,
    executorDeliverable: hashArtifact(sessionBefore, 'implementation-proposal.md', rootDir),
    manager: hashArtifact(sessionBefore, 'manager-context.md', rootDir),
    planner: hashArtifact(sessionBefore, 'planner-plan.md', rootDir),
    reviewerReport: hashArtifact(sessionBefore, 'reviewer-report.md', rootDir),
  };
  const workspaceDigestAfter = digestDirectory(targetWorkspacePath);

  return {
    artifactSha256,
    observed: {
      actionInboxInspected: true,
      approvalInboxInspected: true,
      ...fixtureObservation,
      missionShowInspected: true,
      pendingApprovalCountAfter: approvalInboxAfter.summary.pendingCount,
      pendingApprovalCountBefore: approvalInboxBefore.summary.pendingCount,
      postApprovalStatus: missionAfter.mission.status,
      preApprovalStatus: run.status,
      reviewerVerdict: run.reviewerVerdict,
      roleOrder: sessionBefore.agentRuns.map((agentRun) => agentRun.role),
      timelineInspected: true,
    },
    safety: {
      externalMessagingEnabled: missionShow.summary.latestGatewayEvent.source.externalMessagingEnabled,
      externalProviderCalls: 0,
      providerCostUsd: missionShow.summary.providerExecutionEstimatedCostUsdTotal,
      rawArtifactContentPublished: false,
      runtimeRootEphemeral: true,
      targetWorkspaceDigestAfter: workspaceDigestAfter,
      targetWorkspaceDigestBefore: workspaceDigestBefore,
    },
    scenario: {
      ...ENGINEERING_APPROVAL_REHEARSAL_SCENARIO,
      constraints: [...ENGINEERING_APPROVAL_REHEARSAL_SCENARIO.constraints],
      distinctFromPilotFeedbackMission: true,
      providerMode: 'stub',
    },
  };
}

function runCli(rootDir, args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      PERSONAL_AI_AGENT_ROOT: rootDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.slice(0, 2).join(' ')}): ${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : null;
}

function hashArtifact(session, fileName, rootDir) {
  return readArtifact(session, fileName, rootDir).sha256;
}

function readArtifact(session, fileName, rootDir) {
  const artifact = session.artifacts.find((candidate) => candidate.fileName === fileName);
  ensure(artifact, `Scenario 2 is missing ${fileName}.`);

  const relativePath = path.relative(rootDir, artifact.path);
  ensure(relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath), `${fileName} left the runtime root.`);
  const content = fs.readFileSync(artifact.path);
  return {
    artifact,
    content,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

function digestDirectory(rootDir) {
  const entries = [];
  visitDirectory(rootDir, '', entries);
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function visitDirectory(rootDir, relativeDir, entries) {
  const directoryPath = path.join(rootDir, relativeDir);
  const directoryEntries = fs.readdirSync(directoryPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of directoryEntries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      entries.push({ path: relativePath, type: 'directory' });
      visitDirectory(rootDir, relativePath, entries);
      continue;
    }
    ensure(entry.isFile(), `Unsupported workspace entry: ${relativePath}`);
    entries.push({
      path: relativePath,
      sha256: createHash('sha256').update(fs.readFileSync(path.join(rootDir, relativePath))).digest('hex'),
      type: 'file',
    });
  }
}

function readGitCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to read the capture commit.');
  }
  return result.stdout.trim();
}

function readOption(args, option) {
  const index = args.indexOf(option);
  return index === -1 ? '' : String(args[index + 1] || '');
}

function resolveEvidenceOutputPath(requestedPath) {
  if (!requestedPath) {
    return '';
  }

  const allowedPath = 'evidence/output-artifacts/engineering-approval-workflow-rehearsal.json';
  if (requestedPath !== allowedPath) {
    throw new Error(`Evidence output must be ${allowedPath}.`);
  }

  const outputPath = path.join(repoDir, allowedPath);
  const parentPath = path.dirname(outputPath);
  if (fs.realpathSync(parentPath) !== parentPath) {
    throw new Error('Evidence output directory must not use symbolic links.');
  }
  if (fs.existsSync(outputPath)) {
    const outputStat = fs.lstatSync(outputPath);
    if (!outputStat.isFile() || outputStat.isSymbolicLink() || outputStat.nlink !== 1) {
      throw new Error('Existing evidence output must be one regular unlinked file.');
    }
  }

  return outputPath;
}

function writeEvidenceAtomically(outputPath, content) {
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
  }
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
