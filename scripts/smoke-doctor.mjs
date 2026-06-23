import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { runDoctor } from '../src/core/doctor-service.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const support = fs.readFileSync(path.join(repoDir, 'SUPPORT.md'), 'utf8');

assert.equal(packageJson.scripts.doctor, 'node src/cli.mjs doctor');
assert.equal(packageJson.scripts['smoke:doctor'], 'node scripts/smoke-doctor.mjs');

const direct = runDoctor({ rootDir: repoDir, env: {} });
assert.equal(direct.mode, 'doctor');
assert.equal(direct.ok, true, JSON.stringify(direct.checks, null, 2));
assert.equal(direct.providers.some((provider) => provider.id === 'stub' && provider.configured), true);
assert.equal(direct.providers.some((provider) => provider.id === 'openai' && provider.missingEnv.includes('OPENAI_API_KEY')), true);
assert.equal(direct.checks.some((check) => check.id === 'script:doctor' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'script:smoke:doctor' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'env-example:provider-coverage' && check.status === 'pass'), true);

const cliResult = spawnSync(process.execPath, ['src/cli.mjs', 'doctor'], {
  cwd: repoDir,
  encoding: 'utf8',
});

assert.equal(cliResult.status, 0, cliResult.stderr || cliResult.stdout);
assert.equal(cliResult.stderr, '');
const cliDoctor = JSON.parse(cliResult.stdout);
assert.equal(cliDoctor.mode, 'doctor');
assert.equal(cliDoctor.ok, true, JSON.stringify(cliDoctor.checks, null, 2));
assert.equal(cliDoctor.summary.fail, 0);
assert.equal(cliDoctor.checks.some((check) => check.path === '.env.example'), true);

for (const term of [
  'npm run doctor',
  'npm run smoke:doctor',
]) {
  assert.equal(readme.includes(term), true, `README missing ${term}`);
  assert.equal(support.includes(term), true, `SUPPORT missing ${term}`);
}

for (const text of [JSON.stringify(direct), JSON.stringify(cliDoctor)]) {
  assert.doesNotMatch(text, /sk-[A-Za-z0-9_-]{10,}/);
  assert.doesNotMatch(text, /\/Users\//);
  assert.doesNotMatch(text, /\/private\/var\/folders\//);
  assert.doesNotMatch(text, /\/var\/folders\//);
}

console.log(
  JSON.stringify(
    {
      mode: 'doctor-smoke',
      ok: true,
      checkCount: cliDoctor.summary.total,
      warningCount: cliDoctor.summary.warn,
    },
    null,
    2,
  ),
);
