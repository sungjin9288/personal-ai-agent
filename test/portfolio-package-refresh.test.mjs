import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PORTFOLIO_PACK_DIR,
  PORTFOLIO_ZIP_PATH,
  buildPortfolioPackageCandidate,
  loadPortfolioFileManifest,
  refreshPortfolioPackage,
} from '../scripts/refresh-portfolio-package.mjs';

test('portfolio refresh is idempotent and preserves the recorded public release changelog', () => {
  const fixture = createFixture();
  try {
    const changelogBefore = read(fixture.rootDir, 'CHANGELOG.md');
    const candidate = buildPortfolioPackageCandidate({ rootDir: fixture.rootDir });
    try {
      assert.deepEqual([...candidate.rootDocuments.keys()], [
        'docs/evidence-checklist.md',
        'portfolio_manifest.md',
      ]);
    } finally {
      candidate.cleanup();
    }
    const first = refreshPortfolioPackage({ rootDir: fixture.rootDir });
    const firstSnapshot = snapshotOutputs(fixture.rootDir);
    const second = refreshPortfolioPackage({ rootDir: fixture.rootDir });

    assert.deepEqual(second, first);
    assert.deepEqual(snapshotOutputs(fixture.rootDir), firstSnapshot);
    assert.equal(read(fixture.rootDir, 'CHANGELOG.md'), changelogBefore);
    assert.equal(read(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/CHANGELOG.md`), changelogBefore);
    assert.match(
      read(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/portfolio_manifest.md`),
      /압축 파일 크기 및 SHA-256: 루트 `portfolio_manifest\.md` 기준/,
    );
    assert.match(
      read(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/docs/evidence-checklist.md`),
      /최종 size\/SHA-256은 루트 `portfolio_manifest\.md` 기준/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('a different local candidate changes only local metadata and preserves the public release changelog', () => {
  const fixture = createFixture();
  try {
    refreshPortfolioPackage({ rootDir: fixture.rootDir });
    const changelogBefore = read(fixture.rootDir, 'CHANGELOG.md');
    const manifestBefore = read(fixture.rootDir, 'portfolio_manifest.md');
    const checklistBefore = read(fixture.rootDir, 'docs/evidence-checklist.md');

    write(fixture.rootDir, 'sample.txt', 'changed sample\n');
    refreshPortfolioPackage({ rootDir: fixture.rootDir });

    assert.equal(read(fixture.rootDir, 'CHANGELOG.md'), changelogBefore);
    assert.equal(read(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/CHANGELOG.md`), changelogBefore);
    assert.notEqual(read(fixture.rootDir, 'portfolio_manifest.md'), manifestBefore);
    assert.notEqual(read(fixture.rootDir, 'docs/evidence-checklist.md'), checklistBefore);
  } finally {
    fixture.cleanup();
  }
});

test('portfolio refresh removes files that are no longer in the manifest', () => {
  const fixture = createFixture();
  try {
    write(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/stale.txt`, 'stale\n');
    refreshPortfolioPackage({ rootDir: fixture.rootDir });

    assert.equal(fs.existsSync(path.join(fixture.rootDir, PORTFOLIO_PACK_DIR, 'stale.txt')), false);
  } finally {
    fixture.cleanup();
  }
});

test('portfolio manifest rejects unsafe, invalid, duplicate, and unsorted paths', async (t) => {
  const cases = [
    { name: 'absolute', files: ['/tmp/private.txt'], message: /must be relative/ },
    { name: 'traversal', files: ['../private.txt'], message: /normalized POSIX|traversal/ },
    { name: 'Windows separator', files: ['docs\\private.txt'], message: /normalized POSIX/ },
    { name: 'missing', files: ['missing.txt'], message: /source is missing/ },
    { name: 'directory', files: ['docs'], message: /regular file/ },
    { name: 'forbidden name', files: ['.env'], message: /forbidden name/ },
    { name: 'duplicate', files: ['sample.txt', 'sample.txt'], message: /duplicate/ },
    { name: 'unsorted', files: ['sample.txt', 'CHANGELOG.md'], message: /sorted/ },
  ];

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const fixture = createFixture();
      try {
        writeManifest(fixture.rootDir, entry.files);
        assert.throws(() => loadPortfolioFileManifest({ rootDir: fixture.rootDir }), entry.message);
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test('portfolio manifest rejects parent and final symlinks', async (t) => {
  await t.test('parent symlink', () => {
    const fixture = createFixture();
    try {
      fs.rmSync(path.join(fixture.rootDir, 'docs'), { recursive: true });
      fs.mkdirSync(path.join(fixture.rootDir, 'real-docs'));
      fs.symlinkSync('real-docs', path.join(fixture.rootDir, 'docs'));
      assert.throws(
        () => loadPortfolioFileManifest({ rootDir: fixture.rootDir }),
        /contains a symlink/,
      );
    } finally {
      fixture.cleanup();
    }
  });

  await t.test('final symlink', () => {
    const fixture = createFixture();
    try {
      fs.rmSync(path.join(fixture.rootDir, 'sample.txt'));
      write(fixture.rootDir, 'real-sample.txt', 'sample\n');
      fs.symlinkSync('real-sample.txt', path.join(fixture.rootDir, 'sample.txt'));
      assert.throws(
        () => loadPortfolioFileManifest({ rootDir: fixture.rootDir }),
        /contains a symlink/,
      );
    } finally {
      fixture.cleanup();
    }
  });
});

test('manifest file lookup rejects parent and final symlinks before reading JSON', async (t) => {
  await t.test('manifest parent symlink', () => {
    const fixture = createFixture();
    try {
      const manifest = read(fixture.rootDir, 'config/portfolio-package-files.json');
      fs.rmSync(path.join(fixture.rootDir, 'config'), { recursive: true });
      write(fixture.rootDir, 'real-config/portfolio-package-files.json', manifest);
      fs.symlinkSync('real-config', path.join(fixture.rootDir, 'config'));

      assert.throws(
        () => loadPortfolioFileManifest({ rootDir: fixture.rootDir }),
        /source path contains a symlink/,
      );
    } finally {
      fixture.cleanup();
    }
  });

  await t.test('manifest final symlink', () => {
    const fixture = createFixture();
    try {
      const manifestPath = path.join(fixture.rootDir, 'config/portfolio-package-files.json');
      fs.renameSync(manifestPath, path.join(fixture.rootDir, 'config/real-manifest.json'));
      fs.symlinkSync('real-manifest.json', manifestPath);

      assert.throws(
        () => loadPortfolioFileManifest({ rootDir: fixture.rootDir }),
        /source path contains a symlink/,
      );
    } finally {
      fixture.cleanup();
    }
  });
});

test('manifest file lookup rejects repository escape before reading a file', () => {
  const fixture = createFixture();
  try {
    assert.throws(
      () => loadPortfolioFileManifest({
        rootDir: fixture.rootDir,
        manifestPath: '../outside-manifest.json',
      }),
      /normalized POSIX|traversal/,
    );
  } finally {
    fixture.cleanup();
  }
});

test('publish and check reject an unsafe portfolio output root without touching its target', async (t) => {
  await t.test('symlink escape', () => {
    const fixture = createFixture();
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-output-external-'));
    try {
      const rootDocuments = snapshotRootDocuments(fixture.rootDir);
      write(external, 'sentinel.txt', 'external\n');
      fs.rmSync(path.join(fixture.rootDir, '_portfolio_export'), { recursive: true });
      fs.symlinkSync(external, path.join(fixture.rootDir, '_portfolio_export'));

      for (const check of [false, true]) {
        assert.throws(
          () => refreshPortfolioPackage({ rootDir: fixture.rootDir, check }),
          /output root must not be a symlink/,
        );
      }
      assert.equal(read(external, 'sentinel.txt'), 'external\n');
      assert.deepEqual(snapshotRootDocuments(fixture.rootDir), rootDocuments);
    } finally {
      fixture.cleanup();
      fs.rmSync(external, { force: true, recursive: true });
    }
  });

  await t.test('non-directory', () => {
    const fixture = createFixture();
    try {
      const rootDocuments = snapshotRootDocuments(fixture.rootDir);
      fs.rmSync(path.join(fixture.rootDir, '_portfolio_export'), { recursive: true });
      write(fixture.rootDir, '_portfolio_export', 'not a directory\n');

      assert.throws(
        () => refreshPortfolioPackage({ rootDir: fixture.rootDir }),
        /output root must be a directory/,
      );
      assert.deepEqual(snapshotRootDocuments(fixture.rootDir), rootDocuments);
    } finally {
      fixture.cleanup();
    }
  });
});

test('hygiene failure preserves the tracked package and metadata', () => {
  const fixture = createFixture();
  try {
    const before = snapshotOutputs(fixture.rootDir);
    write(fixture.rootDir, 'sample.txt', `token sk-${'a'.repeat(24)}\n`);

    assert.throws(
      () => refreshPortfolioPackage({ rootDir: fixture.rootDir }),
      /secret-like token/,
    );
    assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
  } finally {
    fixture.cleanup();
  }
});

test('missing and duplicate local metadata markers fail before publication', async (t) => {
  for (const target of [
    {
      path: 'portfolio_manifest.md',
      line: /^- 압축 파일 크기: .+\n/m,
      message: /portfolio manifest (size marker|metadata markers) must appear exactly once/,
    },
    {
      path: 'docs/evidence-checklist.md',
      line: /^\| Repository-local portfolio ZIP 갱신 \| 완료 \| .*\n/m,
      message: /evidence checklist portfolio ZIP marker must appear exactly once/,
    },
  ]) {
    for (const markerCase of ['missing', 'duplicate']) {
      await t.test(`${target.path} ${markerCase}`, () => {
        const fixture = createFixture();
        try {
          const targetPath = path.join(fixture.rootDir, target.path);
          const source = fs.readFileSync(targetPath, 'utf8');
          const match = source.match(target.line);
          assert.ok(match, `fixture marker missing: ${target.path}`);
          fs.writeFileSync(
            targetPath,
            markerCase === 'missing'
              ? source.replace(target.line, '')
              : `${source}${match[0]}`,
          );
          const before = snapshotOutputs(fixture.rootDir);

          assert.throws(
            () => refreshPortfolioPackage({ rootDir: fixture.rootDir }),
            target.message,
          );
          assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
        } finally {
          fixture.cleanup();
        }
      });
    }
  }
});

test('ZIP creation failure preserves the tracked package and metadata', () => {
  const fixture = createFixture();
  try {
    const before = snapshotOutputs(fixture.rootDir);
    assert.throws(
      () => refreshPortfolioPackage({ rootDir: fixture.rootDir, zipCommand: 'missing-zip-command' }),
      /ZIP creation failed/,
    );
    assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
  } finally {
    fixture.cleanup();
  }
});

test('injected publication failure rolls every output back', () => {
  const fixture = createFixture();
  try {
    const before = snapshotOutputs(fixture.rootDir);
    assert.throws(
      () => refreshPortfolioPackage({
        rootDir: fixture.rootDir,
        beforePublishStep(step) {
          if (step === 'before-root:docs/evidence-checklist.md') {
            throw new Error('injected publication failure');
          }
        },
      }),
      /injected publication failure/,
    );
    assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
  } finally {
    fixture.cleanup();
  }
});

test('--check equivalent builds twice without mutating and detects tracked drift', () => {
  const fixture = createFixture();
  try {
    refreshPortfolioPackage({ rootDir: fixture.rootDir });
    const before = snapshotOutputs(fixture.rootDir);
    const result = refreshPortfolioPackage({ rootDir: fixture.rootDir, check: true });
    assert.equal(result.mode, 'check');
    assert.deepEqual(snapshotOutputs(fixture.rootDir), before);

    write(fixture.rootDir, `${PORTFOLIO_PACK_DIR}/sample.txt`, 'stale\n');
    const drifted = snapshotOutputs(fixture.rootDir);
    assert.throws(
      () => refreshPortfolioPackage({ rootDir: fixture.rootDir, check: true }),
      /tracked portfolio pack is stale/,
    );
    assert.deepEqual(snapshotOutputs(fixture.rootDir), drifted);
  } finally {
    fixture.cleanup();
  }
});

test('--check rejects extra file and directory symlinks without mutating the pack', async (t) => {
  for (const entry of [
    { name: 'final symlink', target: 'sample.txt' },
    { name: 'directory symlink', target: 'docs' },
  ]) {
    await t.test(entry.name, () => {
      const fixture = createFixture();
      try {
        refreshPortfolioPackage({ rootDir: fixture.rootDir });
        const before = snapshotOutputs(fixture.rootDir);
        const linkPath = path.join(fixture.rootDir, PORTFOLIO_PACK_DIR, `extra-${entry.name.replace(' ', '-')}`);
        fs.symlinkSync(entry.target, linkPath);

        assert.throws(
          () => refreshPortfolioPackage({ rootDir: fixture.rootDir, check: true }),
          /portfolio pack contains a symlink/,
        );
        assert.equal(fs.lstatSync(linkPath).isSymbolicLink(), true);
        fs.unlinkSync(linkPath);
        assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
      } finally {
        fixture.cleanup();
      }
    });
  }
});

test('staging failure cleans its transaction directory and preserves every output', () => {
  const fixture = createFixture();
  try {
    const before = snapshotOutputs(fixture.rootDir);
    const outputRoot = path.join(fixture.rootDir, '_portfolio_export');
    const temporaryBefore = listPublishTransactions(outputRoot);

    assert.throws(
      () => refreshPortfolioPackage({
        rootDir: fixture.rootDir,
        beforeStageStep(step) {
          if (step === 'before-root:docs/evidence-checklist.md') {
            throw new Error('injected staging failure');
          }
        },
      }),
      /injected staging failure/,
    );

    assert.deepEqual(listPublishTransactions(outputRoot), temporaryBefore);
    assert.deepEqual(snapshotOutputs(fixture.rootDir), before);
  } finally {
    fixture.cleanup();
  }
});

test('candidate ZIP bytes are reproducible across independent staging directories', () => {
  const fixture = createFixture();
  try {
    const first = buildPortfolioPackageCandidate({ rootDir: fixture.rootDir });
    const second = buildPortfolioPackageCandidate({ rootDir: fixture.rootDir });
    try {
      assert.equal(first.zipSha256, second.zipSha256);
      assert.deepEqual(first.zip, second.zip);
      const listing = spawnSync('zipinfo', ['-1', first.zipPath], { encoding: 'utf8' });
      assert.equal(listing.status, 0);
      assert.deepEqual(
        listing.stdout.trim().split('\n'),
        first.files.map((relativePath) => `personal_ai_agent_portfolio_pack/${relativePath}`),
      );
    } finally {
      first.cleanup();
      second.cleanup();
    }
  } finally {
    fixture.cleanup();
  }
});

function createFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-refresh-test-'));
  write(rootDir, 'CHANGELOG.md', [
    '# Changelog',
    '',
    'Public release artifact: `v0.1.0`',
    '',
    '',
  ].join('\n'));
  write(rootDir, 'portfolio_manifest.md', [
    '# Portfolio manifest',
    '',
    '- 압축 파일 크기: 10 bytes',
    `- 압축 파일 SHA-256: \`${'a'.repeat(64)}\``,
    '',
  ].join('\n'));
  write(rootDir, 'docs/evidence-checklist.md', [
    '# Evidence',
    '',
    `| Repository-local portfolio ZIP 갱신 | 완료 | \`_portfolio_export/personal_ai_agent_portfolio_pack.zip\` | local candidate: 10 bytes, SHA-256 \`${'a'.repeat(64)}\`; published v0.1.0 asset과 별도 |`,
    '',
  ].join('\n'));
  write(rootDir, 'sample.txt', 'sample\n');
  write(rootDir, 'config/public-release-v0.1.0.json', `${JSON.stringify({ tag: 'v0.1.0' })}\n`);
  writeManifest(rootDir, [
    'CHANGELOG.md',
    'config/public-release-v0.1.0.json',
    'docs/evidence-checklist.md',
    'portfolio_manifest.md',
    'sample.txt',
  ]);
  write(rootDir, `${PORTFOLIO_PACK_DIR}/sentinel.txt`, 'previous pack\n');
  write(rootDir, PORTFOLIO_ZIP_PATH, 'previous zip\n');

  return {
    cleanup: () => fs.rmSync(rootDir, { force: true, recursive: true }),
    rootDir,
  };
}

function writeManifest(rootDir, files) {
  write(rootDir, 'config/portfolio-package-files.json', `${JSON.stringify({ files }, null, 2)}\n`);
}

function snapshotOutputs(rootDir) {
  const rootDocuments = snapshotRootDocuments(rootDir);
  const packDir = path.join(rootDir, PORTFOLIO_PACK_DIR);
  const packFiles = listFiles(packDir).map((filePath) => [
    path.relative(packDir, filePath),
    sha256(fs.readFileSync(filePath)),
  ]);
  const zipPath = path.join(rootDir, PORTFOLIO_ZIP_PATH);
  return {
    packFiles,
    rootDocuments,
    zip: fs.existsSync(zipPath) ? sha256(fs.readFileSync(zipPath)) : null,
  };
}

function snapshotRootDocuments(rootDir) {
  return [
    'CHANGELOG.md',
    'docs/evidence-checklist.md',
    'portfolio_manifest.md',
  ].map((relativePath) => [relativePath, sha256(fs.readFileSync(path.join(rootDir, relativePath)))]);
}

function listFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const fullPath = path.join(rootDir, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    });
}

function listPublishTransactions(outputRoot) {
  return fs.readdirSync(outputRoot)
    .filter((name) => name.startsWith('.portfolio-publish-'))
    .sort();
}

function read(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function write(rootDir, relativePath, content) {
  const destination = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
