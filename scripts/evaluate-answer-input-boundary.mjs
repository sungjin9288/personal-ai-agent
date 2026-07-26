import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertAnswerInputBoundaryEvaluation,
  buildAnswerInputBoundaryEvaluation,
} from '../src/core/answer-input-boundary-evaluation.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(
  repoDir,
  'fixtures',
  'answer-input-boundary-cases-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const outputPath = parseOutputPath(process.argv.slice(2));
const evidence = buildAnswerInputBoundaryEvaluation({
  fixture,
  fixtureHash: createHash('sha256').update(fixtureText).digest('hex'),
  observedAt: new Date().toISOString(),
});
assertAnswerInputBoundaryEvaluation(evidence);

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  caseCount: evidence.caseResults.length,
  evidenceHash: evidence.evidenceHash,
  metrics: evidence.metrics,
  mode: 'answer-input-boundary-evaluation',
  ok: evidence.status === 'boundary-fixture-passed-local-only',
  outputPath: outputPath
    ? path.relative(repoDir, outputPath).split(path.sep).join('/')
    : null,
  productionReadyClaim: evidence.productionReadyClaim,
  status: evidence.status,
}, null, 2));

function parseOutputPath(args) {
  if (args.length === 0) {
    return null;
  }
  if (args.length !== 2 || args[0] !== '--output' || !String(args[1]).trim()) {
    throw new Error('Expected --output with one repository-local path.');
  }
  const outputPath = path.resolve(repoDir, String(args[1]).trim());
  if (outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Answer input boundary output must stay inside the repository.');
  }
  return outputPath;
}
