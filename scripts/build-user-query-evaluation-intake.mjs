import fs from 'node:fs';

import {
  assertUserQueryEvaluationIntake,
  buildUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';

const outputPath = parseOutputPath(process.argv.slice(2));
const dataset = JSON.parse(fs.readFileSync(
  'fixtures/user-query-evaluation-intake-dry-run-v1.json',
  'utf8',
));
const evidence = buildUserQueryEvaluationIntake({
  dataset,
  observedAt: new Date().toISOString(),
});
assertUserQueryEvaluationIntake(evidence);

if (outputPath) {
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  dataClassification: evidence.dataClassification,
  domainCount: evidence.coverage.domains.length,
  evidenceHash: evidence.evidenceHash,
  languageCount: evidence.coverage.languages.length,
  mode: 'user-query-evaluation-intake',
  ok: true,
  outputPath,
  recordCount: evidence.records.length,
  status: evidence.status,
}, null, 2));

function parseOutputPath(args) {
  if (args.length === 0) {
    return null;
  }
  if (
    args.length !== 2 ||
    args[0] !== '--output' ||
    args[1] !== 'evidence/output-artifacts/user-query-evaluation-intake.json'
  ) {
    throw new Error('Expected the stable user query evaluation intake output path.');
  }
  return args[1];
}
