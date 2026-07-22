import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoDir = process.cwd();
const packageJsonPath = path.join(repoDir, 'package.json');
const changelogPath = path.join(repoDir, 'CHANGELOG.md');
const evidenceChecklistPath = path.join(repoDir, 'docs', 'evidence-checklist.md');
const portfolioManifestPath = path.join(repoDir, 'portfolio_manifest.md');
const zipPath = path.join(repoDir, '_portfolio_export', 'personal_ai_agent_portfolio_pack.zip');
const packDir = path.join(repoDir, '_portfolio_export', 'personal_ai_agent_portfolio_pack');

const packageJson = JSON.parse(readRequiredFile(packageJsonPath));
const changelog = readRequiredFile(changelogPath);
const evidenceChecklist = readRequiredFile(evidenceChecklistPath);
const portfolioManifest = readRequiredFile(portfolioManifestPath);

assert.equal(packageJson.scripts['smoke:portfolio-zip'], 'node scripts/smoke-portfolio-zip.mjs');
assert.equal(fs.existsSync(zipPath), true, 'portfolio ZIP missing');
assert.equal(fs.existsSync(packDir), true, 'portfolio pack directory missing');

const expectedSha = extractBacktickValue(portfolioManifest, '압축 파일 SHA-256');
const expectedSize = extractPlainValue(portfolioManifest, '압축 파일 크기');
assert.match(expectedSha, /^[a-f0-9]{64}$/);
assert.match(expectedSize, /^\d{1,3}(,\d{3})* bytes$/);

const zipBytes = fs.statSync(zipPath).size;
const zipSha = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
assert.equal(expectedSize, `${zipBytes.toLocaleString('en-US')} bytes`);
assert.equal(expectedSha, zipSha);
assertContains(changelog, expectedSha, 'CHANGELOG missing current portfolio ZIP SHA');
assertContains(changelog, expectedSize, 'CHANGELOG missing current portfolio ZIP size');
assertContains(evidenceChecklist, expectedSha, 'evidence checklist missing current portfolio ZIP SHA');
assertContains(evidenceChecklist, expectedSize, 'evidence checklist missing current portfolio ZIP size');

const unzipTest = runRequired('unzip', ['-t', zipPath]);
assertContains(unzipTest.stdout, 'No errors detected', 'portfolio ZIP integrity check did not report success');

const zipEntries = runRequired('zipinfo', ['-1', zipPath]).stdout.trim().split('\n').filter(Boolean);
for (const requiredEntry of [
  'personal_ai_agent_portfolio_pack/README.md',
  'personal_ai_agent_portfolio_pack/links.md',
  'personal_ai_agent_portfolio_pack/.github/ISSUE_TEMPLATE/bug_report.yml',
  'personal_ai_agent_portfolio_pack/.github/ISSUE_TEMPLATE/security_report.yml',
  'personal_ai_agent_portfolio_pack/.github/ISSUE_TEMPLATE/config.yml',
  'personal_ai_agent_portfolio_pack/docs/recorded-walkthrough-v1.md',
  'personal_ai_agent_portfolio_pack/docs/architecture-code-walkthrough-v1.md',
  'personal_ai_agent_portfolio_pack/docs/provider-readiness-matrix-v1.md',
  'personal_ai_agent_portfolio_pack/docs/provider-failure-recovery-demo-v1.md',
  'personal_ai_agent_portfolio_pack/docs/memory-retrieval-quality-fixture-v1.md',
  'personal_ai_agent_portfolio_pack/docs/ml-rag-development-plan-v1.md',
  'personal_ai_agent_portfolio_pack/docs/actual-user-query-evaluation-v1.md',
  'personal_ai_agent_portfolio_pack/docs/smoke-validation-summary-v1.md',
  'personal_ai_agent_portfolio_pack/docs/external-evidence-blockers-v1.md',
  'personal_ai_agent_portfolio_pack/docs/operator-surface-demo-evidence-v1.md',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-embedding-model-qualification.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-retrieval-robustness.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-reranker-evaluation.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-reranker-resource-envelope.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-reranker-runtime-stability.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-integration.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-replay.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-cache.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/approved-learning-rag-feedback.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/approved-learning-feedback-quality.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/workspace-learning-personalization.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/workspace-learning-conflict-revocation.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/workspace-learning-operator-override.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/workspace-learning-operator-surface.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-user-learning-personalization.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/user-learning-conflict-revocation.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/user-learning-operator-override.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/user-learning-operator-surface.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-runtime-contract.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-permission-surface.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-environment-preflight.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-toolchain-decision.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-acquisition-request.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-acquisition-runtime-contract.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-acquisition-artifact-verification.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-post-acquisition-readiness.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/mlx-lm-lora-training-adapter.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-training-candidate-artifact-verification.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-candidate-evaluation-admission.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-candidate-evaluation-runtime.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-candidate-evaluation-host-restart-rehearsal.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-candidate-evaluation-host-restart-receipt.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-quality-baseline.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-composition-candidate.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-composition-robustness.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-composition-hardening.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/answer-input-boundary-evaluation.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-composition-boundary-regression.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/user-query-evaluation-intake.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-user-query-quality.json',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/local-answer-review-action-generalization.json',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/workspace-learning-operator-surface.png',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/user-learning-operator-surface.png',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/local-training-permission-surface.png',
  'personal_ai_agent_portfolio_pack/evidence/output-artifacts/operator-surface-demo-browser-report.json',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/operator-surface-mission-run.png',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/operator-surface-provider-readiness.png',
  'personal_ai_agent_portfolio_pack/evidence/screenshots/operator-surface-action-inbox.png',
]) {
  assert.equal(zipEntries.includes(requiredEntry), true, `portfolio ZIP missing ${requiredEntry}`);
}

for (const entry of zipEntries) {
  assert.equal(/__MACOSX|\.DS_Store|\.env$|node_modules|\/\.git\//.test(entry), false, `forbidden ZIP entry: ${entry}`);
}

const packedManifest = readRequiredFile(path.join(packDir, 'portfolio_manifest.md'));
const packedChangelog = readRequiredFile(path.join(packDir, 'CHANGELOG.md'));
const packedEvidenceChecklist = readRequiredFile(path.join(packDir, 'docs', 'evidence-checklist.md'));
assertContains(packedManifest, '루트 `portfolio_manifest.md` 기준', 'packed manifest must avoid self-referential ZIP checksum');
assertContains(
  packedChangelog,
  'Size and SHA-256 are tracked in the repository root `portfolio_manifest.md` after the ZIP is generated.',
  'packed changelog must avoid self-referential ZIP checksum',
);
assertContains(
  packedEvidenceChecklist,
  '최종 size/SHA-256은 루트 `portfolio_manifest.md` 기준',
  'packed evidence checklist must avoid self-referential ZIP checksum',
);

assertPackedFilesMatchSource();
scanPackedTextFiles(packDir);

console.log(
  JSON.stringify(
    {
      mode: 'portfolio-zip-smoke',
      ok: true,
      zipBytes,
      zipSha256: zipSha,
      zipEntryCount: zipEntries.length,
    },
    null,
    2,
  ),
);

function scanPackedTextFiles(rootDir) {
  const actualHome = os.homedir();
  const actualHomePattern = actualHome && actualHome !== '/' ? new RegExp(escapeRegExp(actualHome), 'g') : null;
  const secretPattern = /(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-[0-9A-Za-z-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})/g;

  for (const filePath of listFiles(rootDir)) {
    if (!isTextLike(filePath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(repoDir, filePath);
    if (actualHomePattern) {
      assert.doesNotMatch(content, actualHomePattern, `${relativePath} contains actual local home path`);
    }
    assert.doesNotMatch(content, /\/private\/var\/folders\//, `${relativePath} contains macOS temp path`);
    assert.doesNotMatch(content, secretPattern, `${relativePath} contains secret-like token`);
  }
}

function assertPackedFilesMatchSource() {
  const selfReferentialFiles = new Set(['CHANGELOG.md', 'portfolio_manifest.md', 'docs/evidence-checklist.md']);
  for (const packedPath of listFiles(packDir)) {
    const relativePath = path.relative(packDir, packedPath);
    if (selfReferentialFiles.has(relativePath)) {
      continue;
    }
    const sourcePath = path.join(repoDir, relativePath);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      continue;
    }
    assert.deepEqual(
      fs.readFileSync(packedPath),
      fs.readFileSync(sourcePath),
      `packed file is stale against source: ${relativePath}`,
    );
  }
}

function listFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
}

function isTextLike(filePath) {
  return /\.(md|mmd|json|log|txt|yml|yaml)$/i.test(filePath);
}

function runRequired(command, args) {
  const result = spawnSync(command, args, { cwd: repoDir, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(text, needle, message) {
  assert.ok(String(text || '').includes(needle), message);
}

function extractBacktickValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+\`([^\`]+)\`$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function extractPlainValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
