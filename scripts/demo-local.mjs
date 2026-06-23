#!/usr/bin/env node
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const planOnly = args.has('--plan');
const jsonOnly = args.has('--json');

const steps = Object.freeze([
  {
    command: 'npm run bootstrap:local',
    purpose: 'Create a local workspace, create a starter mission, and run it with the stub provider.',
  },
  {
    command: 'npm run smoke:representative-demo',
    purpose: 'Verify the representative demo contract and README/demo catalog boundary.',
  },
  {
    command: 'npm run smoke:representative-demo-evidence',
    purpose: 'Verify the replay log, summary JSON, screenshot, and browser evidence references.',
  },
  {
    command: 'npm run smoke:demo-evidence-index',
    purpose: 'Verify the reviewer-facing demo evidence index and public demo claim boundary.',
  },
  {
    command: 'npm run smoke:release-artifact-hygiene',
    purpose: 'Verify release artifacts do not expose secrets or machine-local paths.',
  },
  {
    command: 'npm run smoke:portfolio-zip',
    purpose: 'Verify the public portfolio ZIP integrity, checksum, required entries, and packaged content freshness.',
  },
  {
    command: 'npm run smoke:pilot-export-package',
    purpose: 'Verify the manifest-only pilot export package and productionReadyClaim=false boundary.',
  },
]);

const evidence = Object.freeze([
  'evidence/cli-logs/representative-release-demo-replay.log',
  'evidence/output-artifacts/representative-release-demo-summary.json',
  'evidence/screenshots/representative-release-demo-preview.png',
  'evidence/screenshots/representative-release-demo-release-status.png',
  'docs/demo-evidence-index-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/pilot-export-package-v1.md',
]);

const plan = {
  credentialFree: true,
  evidence,
  mode: 'local-demo-plan',
  productionReadyClaim: false,
  steps,
};

if (planOnly || jsonOnly) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

console.log('# Personal AI Agent local demo');
console.log('');
console.log('This runs the credential-free local replay path with the stub provider and evidence checks.');
console.log('It does not claim production readiness or all-provider completion.');
console.log('');

for (const [index, step] of steps.entries()) {
  console.log(`## Step ${index + 1}: ${step.command}`);
  console.log(step.purpose);
  console.log('');
  await runCommand(step.command);
  console.log('');
}

console.log('# Demo complete');
console.log('');
console.log('Evidence to inspect:');
for (const item of evidence) {
  console.log(`- ${item}`);
}

async function runCommand(commandText) {
  const [command, ...commandArgs] = commandText.split(' ');
  const executable = command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command;

  await new Promise((resolve, reject) => {
    const child = spawn(executable, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${commandText} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });
}
