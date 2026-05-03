import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-document-conversion-'));
const workspacePath = path.join(tempRoot, 'workspace');
const markdownPath = path.join(tempRoot, 'notes.md');
const pseudoPdfPath = path.join(tempRoot, 'strategy.pdf');
const converterPath = path.join(tempRoot, 'fake-markitdown.mjs');

fs.mkdirSync(workspacePath, { recursive: true });
fs.writeFileSync(markdownPath, '# Native Notes\n\nProvider retry plan stays text-native.\n', 'utf8');
fs.writeFileSync(pseudoPdfPath, '%PDF pseudo fixture for converter boundary\n', 'utf8');
fs.writeFileSync(
  converterPath,
  [
    '#!/usr/bin/env node',
    "const filePath = process.argv.at(-1);",
    "console.log(`# Converted Strategy\\n\\nConverted from ${filePath.split('/').pop()} with provider drift appendix.`);",
    '',
  ].join('\n'),
  'utf8',
);
fs.chmodSync(converterPath, 0o755);

const previousConverter = process.env.PERSONAL_AI_AGENT_MARKITDOWN_BIN;
process.env.PERSONAL_AI_AGENT_MARKITDOWN_BIN = converterPath;

try {
  const workspace = runCli({
    rootDir: tempRoot,
    args: ['workspace', 'add', workspacePath, '--name', 'document-conversion-workspace'],
  });

  const mission = runCli({
    rootDir: tempRoot,
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
      'Document conversion smoke',
      '--objective',
      'Verify converted document attachments are stored as Markdown retrieval input.',
      '--attachment',
      markdownPath,
      '--attachment',
      pseudoPdfPath,
    ],
  });

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ rootDir: tempRoot, store });
  const attachments = service.listMissionAttachments(mission.id);
  const nativeAttachment = attachments.find((attachment) => attachment.fileName === 'notes.md');
  const convertedAttachment = attachments.find((attachment) => attachment.fileName === 'strategy.pdf');

  assert.ok(nativeAttachment);
  assert.ok(convertedAttachment);
  assert.equal(nativeAttachment.source, 'cli');
  assert.equal(nativeAttachment.conversion?.converted, false);
  assert.equal(convertedAttachment.source, 'cli-converted');
  assert.equal(convertedAttachment.mimeType, 'text/markdown');
  assert.equal(convertedAttachment.conversion?.converted, true);
  assert.equal(convertedAttachment.conversion?.converter, path.basename(converterPath));

  const convertedContent = fs.readFileSync(convertedAttachment.path, 'utf8');
  assert.match(convertedContent, /# Converted Strategy/);
  assert.match(convertedContent, /provider drift appendix/);

  const run = await service.runMission(mission.id, {
    provider: 'stub',
    providerSpecified: true,
  });
  assert.equal(run.mission.status, 'completed');

  const latestSession = service.showSession(mission.id);
  const retrievalArtifact = latestSession.artifacts.find((artifact) => artifact.fileName === 'manager-retrieval.md');
  assert.ok(retrievalArtifact);

  const retrievalContent = fs.readFileSync(retrievalArtifact.path, 'utf8');
  assert.match(retrievalContent, /\[attachment\] strategy\.pdf chunk 1/);
  assert.match(retrievalContent, /Converted from strategy\.pdf/);

  console.log(
    JSON.stringify(
      {
        attachmentCount: attachments.length,
        convertedAttachmentId: convertedAttachment.id,
        missionId: mission.id,
        mode: 'document-conversion',
        ok: true,
      },
      null,
      2,
    ),
  );
} finally {
  if (previousConverter === undefined) {
    delete process.env.PERSONAL_AI_AGENT_MARKITDOWN_BIN;
  } else {
    process.env.PERSONAL_AI_AGENT_MARKITDOWN_BIN = previousConverter;
  }
}
