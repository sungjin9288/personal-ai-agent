import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    '--test',
    'test/fine-tuning-private-combined-readiness-impact.test.mjs',
    'test/fine-tuning-private-combined-readiness-impact-script.test.mjs',
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}
console.log(JSON.stringify({
  command: 'fine-tuning-private-combined-readiness-impact',
  productionReadyClaim: false,
  status: 'passed',
  syntheticFixtureOnly: true,
}));
