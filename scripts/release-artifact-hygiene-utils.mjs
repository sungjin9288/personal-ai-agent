import fs from 'node:fs';
import path from 'node:path';

const SECRET_PATTERNS = [
  {
    label: 'OpenAI-style API key',
    pattern: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    label: 'Anthropic-style API key',
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
  },
  {
    label: 'Google API key',
    pattern: /AIza[0-9A-Za-z_-]{20,}/g,
  },
  {
    label: 'Slack token',
    pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/g,
  },
  {
    label: 'GitHub token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  },
  {
    label: 'Bearer token',
    pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/g,
  },
];

const MACHINE_LOCAL_PATH_PATTERNS = [
  {
    label: 'macOS user path',
    pattern: /\/Users\/[^/\s`"')]+/g,
  },
  {
    label: 'macOS temp folder',
    pattern: /\/(?:private\/)?var\/folders\/[^\s`"')]+/g,
  },
];

const CURRENT_RELEASE_ARTIFACTS = [
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-handoff.md',
  'docs/pilot-export-package-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/retention-delete-v1.md',
  'docs/clean-deployment-release-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/target-provider-evidence-intake-v1.md',
  'docs/target-provider-operations-v1.md',
  'docs/target-openai-provider-account-v1.md',
  'docs/target-anthropic-provider-account-v1.md',
  'docs/target-local-provider-architecture-v1.md',
  'docs/target-hermes-provider-architecture-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/target-deployment-contract-v1.md',
  'docs/hosted-saas-architecture-decision-v1.md',
  'docs/hosted-identity-session-architecture-v1.md',
  'docs/target-identity-session-operations-v1.md',
  'docs/hosted-tenant-isolation-architecture-v1.md',
  'docs/target-tenant-isolation-operations-v1.md',
  'docs/target-secret-manager-architecture-v1.md',
  'docs/target-environment-evidence-intake-v1.md',
  'docs/backup-restore-drill-v1.md',
  'docs/target-data-lifecycle-architecture-v1.md',
  'docs/target-clean-deployment-architecture-v1.md',
  'docs/target-clean-deployment-operations-v1.md',
  'docs/target-retention-operations-v1.md',
  'docs/identity-session-admin-v1.md',
  'docs/tenant-storage-admin-v1.md',
  'docs/customer-support-operations-v1.md',
  'docs/support-escalation-review-v1.md',
  'docs/target-support-architecture-v1.md',
  'docs/target-support-operations-v1.md',
  'docs/secret-management-v1.md',
  'docs/target-secret-manager-v1.md',
  'docs/observability-telemetry-v1.md',
  'docs/target-observability-architecture-v1.md',
  'docs/target-observability-operations-v1.md',
  'docs/target-slo-architecture-v1.md',
  'docs/target-slo-operations-v1.md',
  'docs/target-backup-operations-v1.md',
];

export function runReleaseArtifactHygiene({ repoDir = process.cwd() } = {}) {
  const currentArtifactPaths = CURRENT_RELEASE_ARTIFACTS.map((filePath) => path.join(repoDir, filePath));
  const verifiedCommit = extractVerifiedCommit(repoDir, currentArtifactPaths);
  const snapshotPaths = verifiedCommit ? collectSnapshotPaths(repoDir, verifiedCommit) : [];
  const scannedFiles = [...new Set([...currentArtifactPaths, ...snapshotPaths])]
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

  const findings = scannedFiles.flatMap((filePath) => scanFile(filePath, repoDir));
  const secretFindings = findings.filter((finding) => finding.kind === 'secret');
  const machinePathFindings = findings.filter((finding) => finding.kind === 'machine-local-path');

  return {
    machinePathFindingCount: machinePathFindings.length,
    ok: findings.length === 0 && scannedFiles.length >= CURRENT_RELEASE_ARTIFACTS.length,
    scannedFiles: scannedFiles.map((filePath) => path.relative(repoDir, filePath)),
    secretFindingCount: secretFindings.length,
    totalFindingCount: findings.length,
    verifiedCommit,
    findings,
  };
}

function extractVerifiedCommit(repoDir, currentArtifactPaths) {
  const commitCandidates = [];
  for (const filePath of currentArtifactPaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const markdown = fs.readFileSync(filePath, 'utf8');
    const commit = extractBulletValue(markdown, 'commit');
    if (/^[0-9a-f]{40}$/i.test(commit)) {
      commitCandidates.push(commit);
    }
  }

  const currentCommit = commitCandidates.at(0) || '';
  if (currentCommit) {
    return currentCommit;
  }

  const snapshotsRoot = path.join(repoDir, 'docs', 'releases', 'execution-v1');
  if (!fs.existsSync(snapshotsRoot)) {
    return '';
  }

  return fs
    .readdirSync(snapshotsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[0-9a-f]{40}$/i.test(entry.name))
    .map((entry) => {
      const manifestPath = path.join(snapshotsRoot, entry.name, 'snapshot.json');
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return {
          archivedAt: String(manifest.archivedAt || ''),
          verifiedCommit: String(manifest.verifiedCommit || entry.name),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.archivedAt.localeCompare(right.archivedAt))
    .at(-1)?.verifiedCommit || '';
}

function collectSnapshotPaths(repoDir, verifiedCommit) {
  const snapshotDir = path.join(repoDir, 'docs', 'releases', 'execution-v1', verifiedCommit);
  if (!fs.existsSync(snapshotDir)) {
    return [];
  }

  return fs
    .readdirSync(snapshotDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.md') || entry.name === 'snapshot.json'))
    .map((entry) => path.join(snapshotDir, entry.name));
}

function scanFile(filePath, repoDir) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoDir, filePath);
  const findings = [];
  for (const definition of SECRET_PATTERNS) {
    findings.push(...collectMatches(content, definition.pattern, relativePath, 'secret', definition.label));
  }
  for (const definition of MACHINE_LOCAL_PATH_PATTERNS) {
    findings.push(
      ...collectMatches(content, definition.pattern, relativePath, 'machine-local-path', definition.label),
    );
  }
  return findings;
}

function collectMatches(content, pattern, filePath, kind, label) {
  const findings = [];
  for (const match of content.matchAll(pattern)) {
    findings.push({
      filePath,
      kind,
      label,
      line: countLinesBefore(content, match.index || 0) + 1,
      matchPreview: redactMatch(match[0]),
    });
  }
  return findings;
}

function redactMatch(value) {
  const text = String(value || '');
  if (text.length <= 12) {
    return '<redacted>';
  }
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function countLinesBefore(content, index) {
  return String(content || '').slice(0, index).split('\n').length - 1;
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
