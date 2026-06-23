import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { buildDoctorDiagnosticsSummary, runDoctor } from '../src/core/doctor-service.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const support = fs.readFileSync(path.join(repoDir, 'SUPPORT.md'), 'utf8');

assert.equal(packageJson.scripts.doctor, 'node src/cli.mjs doctor');
assert.equal(packageJson.scripts['doctor:summary'], 'node src/cli.mjs doctor summary');
assert.equal(packageJson.scripts['smoke:doctor'], 'node scripts/smoke-doctor.mjs');
assert.equal(packageJson.scripts['smoke:ui-doctor-surface'], 'node scripts/smoke-ui-doctor-surface.mjs');

const direct = runDoctor({ rootDir: repoDir, env: {} });
const directSummary = buildDoctorDiagnosticsSummary({
  generatedAt: '2026-06-23T00:00:00.000Z',
  ...direct,
});
assert.equal(direct.mode, 'doctor');
assert.equal(direct.ok, true, JSON.stringify(direct.checks, null, 2));
assert.equal(direct.providers.some((provider) => provider.id === 'stub' && provider.configured), true);
assert.equal(direct.providers.some((provider) => provider.id === 'openai' && provider.missingEnv.includes('OPENAI_API_KEY')), true);
assert.equal(direct.checks.some((check) => check.id === 'script:doctor' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'script:doctor:summary' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'script:smoke:doctor' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'script:smoke:ui-doctor-surface' && check.status === 'pass'), true);
assert.equal(direct.checks.some((check) => check.id === 'env-example:provider-coverage' && check.status === 'pass'), true);
assert.match(directSummary, /^# Personal AI Agent doctor diagnostics/m);
assert.match(directSummary, /summary: pass=\d+ warn=\d+ fail=0 total=\d+/);
assert.match(directSummary, /Boundary: missing environment variable names only; secret values are not included\./);

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

const cliSummaryResult = spawnSync('npm', ['run', '--silent', 'doctor:summary'], {
  cwd: repoDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    OPENAI_API_KEY: '',
  },
});

assert.equal(cliSummaryResult.status, 0, cliSummaryResult.stderr || cliSummaryResult.stdout);
assert.equal(cliSummaryResult.stderr, '');
assert.match(cliSummaryResult.stdout, /^# Personal AI Agent doctor diagnostics/m);
assert.match(cliSummaryResult.stdout, /Provider env:/);
assert.match(cliSummaryResult.stdout, /missingEnv=OPENAI_API_KEY/);
assert.match(cliSummaryResult.stdout, /Boundary: missing environment variable names only; secret values are not included\./);

const doctorHelpResult = spawnSync(process.execPath, ['src/cli.mjs', 'doctor', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
});

assert.equal(doctorHelpResult.status, 0, doctorHelpResult.stderr || doctorHelpResult.stdout);
assert.equal(doctorHelpResult.stderr, '');
assert.match(doctorHelpResult.stdout, /Usage:\n  doctor\n  doctor summary/);
assert.match(doctorHelpResult.stdout, /Doctor diagnostics list missing environment variable names only/);
assert.doesNotMatch(doctorHelpResult.stdout, /"mode": "doctor"/);

const doctorSummaryHelpResult = spawnSync(process.execPath, ['src/cli.mjs', 'doctor', 'summary', '--help'], {
  cwd: repoDir,
  encoding: 'utf8',
});

assert.equal(doctorSummaryHelpResult.status, 0, doctorSummaryHelpResult.stderr || doctorSummaryHelpResult.stdout);
assert.equal(doctorSummaryHelpResult.stderr, '');
assert.match(doctorSummaryHelpResult.stdout, /Usage:\n  doctor summary/);
assert.match(doctorSummaryHelpResult.stdout, /npm run doctor:summary/);
assert.doesNotMatch(doctorSummaryHelpResult.stdout, /^# Personal AI Agent doctor diagnostics/m);

for (const term of [
  'npm run doctor',
  'npm run doctor:summary',
  'npm run smoke:doctor',
  'npm run smoke:ui-doctor-surface',
]) {
  assert.equal(readme.includes(term), true, `README missing ${term}`);
  assert.equal(support.includes(term), true, `SUPPORT missing ${term}`);
}

for (const text of [
  JSON.stringify(direct),
  JSON.stringify(cliDoctor),
  directSummary,
  cliSummaryResult.stdout,
  doctorHelpResult.stdout,
  doctorSummaryHelpResult.stdout,
]) {
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
