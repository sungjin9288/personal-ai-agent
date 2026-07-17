import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  assertUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';

const evidenceText = fs.readFileSync(
  'evidence/output-artifacts/user-query-evaluation-intake.json',
  'utf8',
);
const evidence = JSON.parse(evidenceText);
assertUserQueryEvaluationIntake(evidence);

assert.equal(evidence.status, 'synthetic-user-query-intake-contract-passed');
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.actualUserQueryQualityValidated, false);
assert.equal(evidence.dataClassification, 'curated-synthetic');
assert.equal(evidence.records.length, 12);
assert.equal(evidence.coverage.domains.length, 6);
assert.equal(evidence.coverage.languages.length, 4);
assert.equal(evidence.usage.evaluationAuthorized, true);
assert.equal(evidence.usage.trainingAuthorized, false);
assert.equal(evidence.usage.fineTuningSubmissionAuthorized, false);
assert.equal(evidence.usage.externalTransferAuthorized, false);
assert.equal(evidence.usage.localModelInputAuthorized, true);
assert.equal(evidence.usage.providerInputAuthorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.doesNotMatch(
  evidenceText,
  /retry guard|snapshot hash|삭제 증명서|監査記録|registro de autorización/u,
);

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  domainCount: evidence.coverage.domains.length,
  evidenceHash: evidence.evidenceHash,
  languageCount: evidence.coverage.languages.length,
  mode: 'user-query-evaluation-intake-smoke',
  ok: true,
  recordCount: evidence.records.length,
  status: evidence.status,
}, null, 2));
