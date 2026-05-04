import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const outputPath = path.join(docsDir, 'pilot-export-package-v1.md');

const BASE_PACKAGE_FILES = [
  'README.md',
  'docs/product-plan-v1.md',
  'docs/security-model-v1.md',
  'docs/operator-runbook-v1.md',
  'docs/deployment-pilot-v1.md',
  'docs/pilot-onboarding-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/incident-slo-v1.md',
  'docs/runtime-isolation-v1.md',
  'docs/release-readiness-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-handoff.md',
];

const generatedAt = new Date().toISOString();
const evidence = readRequiredFile(path.join(repoDir, 'docs', 'execution-v1-evidence.md'));
const closeout = readRequiredFile(path.join(repoDir, 'docs', 'execution-v1-closeout.md'));
const verifiedCommit = extractBulletValue(closeout, 'commit') || extractBulletValue(evidence, 'commit');

if (!/^[0-9a-f]{40}$/i.test(verifiedCommit)) {
  throw new Error(`valid verified commit not found in execution-v1 artifacts: ${verifiedCommit || '<empty>'}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (!fs.existsSync(outputPath)) {
  fs.writeFileSync(outputPath, renderPendingManifest({ generatedAt, verifiedCommit }), 'utf8');
}

const snapshotFiles = [
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-evidence.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-closeout.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`,
  `docs/releases/execution-v1/${verifiedCommit}/snapshot.json`,
];
const fileEntries = [...BASE_PACKAGE_FILES, ...snapshotFiles].map(buildFileEntry);
const missingEntries = fileEntries.filter((entry) => !entry.exists);

if (missingEntries.length > 0) {
  throw new Error(`pilot export package is missing required files: ${missingEntries.map((entry) => entry.path).join(', ')}`);
}

const bundleSha256 = crypto
  .createHash('sha256')
  .update(fileEntries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}`).join('\n'))
  .digest('hex');

fs.writeFileSync(
  outputPath,
  renderManifest({
    bundleSha256,
    fileEntries,
    generatedAt,
    verifiedCommit,
  }),
  'utf8',
);

const hygiene = runReleaseArtifactHygiene({ repoDir });
if (!hygiene.ok) {
  throw new Error(`pilot export package hygiene failed: ${JSON.stringify(hygiene.findings, null, 2)}`);
}

console.log(
  JSON.stringify(
    {
      bundleSha256,
      fileCount: fileEntries.length,
      generatedAt,
      hygiene: 'passed',
      mode: 'pilot-export-package',
      ok: true,
      outputPath: path.relative(repoDir, outputPath),
      verifiedCommit,
    },
    null,
    2,
  ),
);

function buildFileEntry(relativePath) {
  const absolutePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return {
      bytes: 0,
      exists: false,
      path: relativePath,
      sha256: '',
    };
  }

  const content = fs.readFileSync(absolutePath);
  return {
    bytes: content.byteLength,
    exists: true,
    path: relativePath,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

function renderManifest({ bundleSha256, fileEntries, generatedAt, verifiedCommit }) {
  const rows = fileEntries
    .map((entry) => `| \`${entry.path}\` | ${entry.bytes} | \`${entry.sha256}\` |`)
    .join('\n');

  return `# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: ${generatedAt}
- verifiedCommit: ${verifiedCommit}
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: ${bundleSha256}
- fileCount: ${fileEntries.length}
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim \`production-ready\`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
${rows}

## Operator Re-Run

\`\`\`bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
\`\`\`

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep \`productionReadyClaim: false\` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
`;
}

function renderPendingManifest({ generatedAt, verifiedCommit }) {
  return `# Pilot Export Package v1

- status: dry-run-package-pending
- generatedAt: ${generatedAt}
- verifiedCommit: ${verifiedCommit}
- packageMode: manifest-only
- productionReadyClaim: false

## Decision Boundary

This pending placeholder exists only so artifact hygiene can scan the export manifest output path while the package manifest is being generated.

It is not production deployment evidence, not a customer production data export, and not permission to claim \`production-ready\`.
`;
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
