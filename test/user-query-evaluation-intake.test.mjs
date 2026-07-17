import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertUserQueryEvaluationIntake,
  buildUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';

const fixture = JSON.parse(fs.readFileSync(
  'fixtures/user-query-evaluation-intake-dry-run-v1.json',
  'utf8',
));
const observedAt = '2026-07-17T06:00:00.000Z';

test('synthetic user-query intake stays content-free and evaluation-only', () => {
  const evidence = buildUserQueryEvaluationIntake({ dataset: fixture, observedAt });

  assertUserQueryEvaluationIntake(evidence);
  assert.equal(evidence.status, 'synthetic-user-query-intake-contract-passed');
  assert.equal(evidence.actualUserQueryData, false);
  assert.equal(evidence.actualUserQueryQualityValidated, false);
  assert.equal(evidence.records.length, 12);
  assert.equal(evidence.usage.trainingAuthorized, false);
  assert.equal(JSON.stringify(evidence).includes('retry guard'), false);
});

test('actual user-query intake requires current consent and deidentification proof', () => {
  const dataset = structuredClone(fixture);
  dataset.actualUserQueryData = true;
  dataset.dataClassification = 'deidentified-user-query';
  dataset.consent = {
    expiresAt: '2026-08-17T00:00:00.000Z',
    purpose: 'answer-quality-evaluation',
    recordHash: 'b'.repeat(64),
    recordedAt: '2026-07-16T00:00:00.000Z',
    status: 'granted',
    withdrawalSupported: true,
  };
  for (const record of dataset.records) {
    record.source = 'consented-user-query';
  }
  const evidence = buildUserQueryEvaluationIntake({ dataset, observedAt });

  assert.equal(evidence.status, 'actual-user-query-intake-ready-for-local-evaluation');
  assert.equal(evidence.actualUserQueryData, true);
  assert.equal(evidence.actualUserQueryQualityValidated, false);

  dataset.consent.status = 'revoked';
  assert.throws(
    () => buildUserQueryEvaluationIntake({ dataset, observedAt }),
    /current evaluation consent/,
  );
});

test('user-query intake rejects direct identifiers, secret-like content, and tampering', () => {
  const identified = structuredClone(fixture);
  identified.records[0].query = 'Explain the retry for person@example.com.';
  assert.throws(
    () => buildUserQueryEvaluationIntake({ dataset: identified, observedAt }),
    /secret or direct identifier/,
  );

  const evidence = buildUserQueryEvaluationIntake({ dataset: fixture, observedAt });
  evidence.records[0].queryHash = '0'.repeat(64);
  assert.throws(
    () => assertUserQueryEvaluationIntake(evidence),
    /integrity validation/,
  );
});
