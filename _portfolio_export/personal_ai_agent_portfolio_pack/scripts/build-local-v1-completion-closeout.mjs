import fs from 'node:fs';
import path from 'node:path';

import {
  LOCAL_V1_SOURCE_DOCUMENTS,
  assertLocalV1VerificationReport,
  buildLocalV1CompletionArtifact,
} from '../src/core/local-v1-completion-closeout.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const args = parseArgs(process.argv.slice(2));
const verificationReportPath = resolveRequiredPath(args.verificationReport, '--verification-report');
if (!args.output) throw new Error('--output is required.');

if (!/^[a-f0-9]{40}$/.test(args.implementationCommit || '')) {
  throw new Error('--implementation-commit must be a 40-character SHA-1.');
}

const verificationReport = readJson(verificationReportPath, 'verification report');
assertLocalV1VerificationReport(verificationReport);
const sourceDocumentTexts = Object.fromEntries(
  LOCAL_V1_SOURCE_DOCUMENTS.map((document) => [document, readText(path.join(repoDir, document), document)]),
);
const artifact = buildLocalV1CompletionArtifact({
  c13AttemptText: readText(
    path.join(repoDir, 'evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json'),
    'C13 attempt receipt',
  ),
  c13FinalText: readText(
    path.join(repoDir, 'evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json'),
    'C13 final artifact',
  ),
  implementationCommit: args.implementationCommit,
  sourceDocumentTexts,
  verificationReport,
});

const outputPath = writeEvidenceJson({
  artifact,
  defaultRelativePath: 'evidence/output-artifacts/local-v1-completion-closeout.json',
  label: 'Local v1 completion closeout output',
  repoDir,
  value: args.output,
});
console.log(JSON.stringify({ id: artifact.id, ok: true, outputPath, status: artifact.status }, null, 2));

function parseArgs(argv) {
  const parsed = { implementationCommit: null, output: null, verificationReport: null };
  const known = new Map([
    ['--implementation-commit', 'implementationCommit'],
    ['--output', 'output'],
    ['--verification-report', 'verificationReport'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = known.get(argv[index]);
    if (!key || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new Error('Expected --verification-report, --implementation-commit, and --output.');
    }
    if (parsed[key] !== null) throw new Error(`Duplicate argument: ${argv[index]}.`);
    parsed[key] = argv[index + 1];
    index += 1;
  }
  return parsed;
}

function resolveRequiredPath(value, flag) {
  if (!value) throw new Error(`${flag} is required.`);
  return path.resolve(repoDir, value);
}

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} file is missing.`);
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readText(filePath, label));
  } catch {
    throw new Error(`${label} JSON is invalid.`);
  }
}
