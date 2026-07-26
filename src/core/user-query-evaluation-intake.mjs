import { createHash } from 'node:crypto';

export const USER_QUERY_EVALUATION_INTAKE_SCHEMA_VERSION =
  'personal-ai-agent-user-query-evaluation-intake/v1';

const ALLOWED_DOMAINS = Object.freeze([
  'accessibility',
  'data-governance',
  'incident-operations',
  'research',
  'security',
  'software-engineering',
]);
const ALLOWED_LANGUAGES = Object.freeze(['en', 'es', 'ja', 'ko']);
const SECRET_OR_IDENTIFIER_PATTERNS = Object.freeze([
  /\bsk-[a-z0-9_-]{10,}\b/iu,
  /\b(?:api[_ -]?key|password|secret|token)\s*[:=]\s*\S+/iu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b(?:\+?\d[\s().-]*){9,}\d\b/u,
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(`User query evaluation ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function assertContentSafe(value) {
  const text = normalizeText(value);
  if (!text || SECRET_OR_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error('User query evaluation intake rejected secret or direct identifier content.');
  }
  return text;
}

function normalizeConsent(consent = {}, actualUserQueryData, observedAt) {
  const status = normalizeText(consent.status);
  if (!actualUserQueryData) {
    if (status !== 'not-applicable-synthetic') {
      throw new Error('Synthetic user query intake must mark consent as not applicable.');
    }
    return {
      purpose: 'answer-quality-evaluation',
      status,
      withdrawalSupported: false,
    };
  }
  const recordedAt = requireTimestamp(consent.recordedAt, 'consent recordedAt');
  const expiresAt = requireTimestamp(consent.expiresAt, 'consent expiresAt');
  if (
    status !== 'granted' ||
    normalizeText(consent.purpose) !== 'answer-quality-evaluation' ||
    consent.withdrawalSupported !== true ||
    Date.parse(recordedAt) > Date.parse(observedAt) ||
    Date.parse(expiresAt) <= Date.parse(observedAt) ||
    !isSha256(consent.recordHash)
  ) {
    throw new Error('Actual user query intake requires current evaluation consent.');
  }
  return {
    expiresAt,
    purpose: 'answer-quality-evaluation',
    recordHash: consent.recordHash,
    recordedAt,
    status,
    withdrawalSupported: true,
  };
}

function normalizeDeidentification(deidentification = {}, observedAt) {
  const reviewedAt = requireTimestamp(
    deidentification.reviewedAt,
    'deidentification reviewedAt',
  );
  if (
    !normalizeText(deidentification.methodVersion) ||
    deidentification.directIdentifiersRemoved !== true ||
    deidentification.freeTextReviewed !== true ||
    deidentification.secretsScanned !== true ||
    deidentification.reidentificationProhibited !== true ||
    !isSha256(deidentification.reviewerIdHash) ||
    Date.parse(reviewedAt) > Date.parse(observedAt)
  ) {
    throw new Error('User query evaluation deidentification review is incomplete.');
  }
  return {
    directIdentifiersRemoved: true,
    freeTextReviewed: true,
    methodVersion: normalizeText(deidentification.methodVersion),
    reidentificationProhibited: true,
    reviewedAt,
    reviewerIdHash: deidentification.reviewerIdHash,
    secretsScanned: true,
  };
}

function normalizeUsage(usage = {}, observedAt) {
  const retentionUntil = requireTimestamp(usage.retentionUntil, 'retentionUntil');
  if (
    usage.evaluationAuthorized !== true ||
    usage.trainingAuthorized !== false ||
    usage.fineTuningSubmissionAuthorized !== false ||
    usage.externalTransferAuthorized !== false ||
    usage.providerInputAuthorized !== false ||
    usage.localModelInputAuthorized !== true ||
    Date.parse(retentionUntil) <= Date.parse(observedAt)
  ) {
    throw new Error('User query evaluation usage boundary is invalid.');
  }
  return {
    evaluationAuthorized: true,
    externalTransferAuthorized: false,
    fineTuningSubmissionAuthorized: false,
    localModelInputAuthorized: true,
    providerInputAuthorized: false,
    retentionUntil,
    trainingAuthorized: false,
  };
}

function normalizeRecords(records, actualUserQueryData) {
  const normalized = Array.isArray(records)
    ? records.map((record) => {
      const id = normalizeText(record?.id);
      const domain = normalizeText(record?.domain);
      const language = normalizeText(record?.language);
      const query = assertContentSafe(record?.query);
      const evidence = Array.isArray(record?.evidence)
        ? record.evidence.map(assertContentSafe)
        : [];
      const expectedAnswerTerms = Array.isArray(record?.expectedAnswerTerms)
        ? record.expectedAnswerTerms.map(assertContentSafe)
        : [];
      const source = normalizeText(record?.source);
      if (
        !id ||
        !ALLOWED_DOMAINS.includes(domain) ||
        !ALLOWED_LANGUAGES.includes(language) ||
        evidence.length === 0 ||
        expectedAnswerTerms.length < 2 ||
        source !== (actualUserQueryData ? 'consented-user-query' : 'curated-synthetic') ||
        record.containsDirectIdentifiers !== false ||
        record.containsSensitiveData !== false
      ) {
        throw new Error('User query evaluation record is incomplete.');
      }
      return {
        domain,
        evidenceHash: hashRecord(evidence),
        evidenceItemCount: evidence.length,
        expectedAnswerContractHash: hashRecord(expectedAnswerTerms),
        expectedAnswerTermCount: expectedAnswerTerms.length,
        idHash: sha256(id),
        language,
        queryHash: sha256(query),
        source,
      };
    })
    : [];
  const domains = [...new Set(normalized.map((record) => record.domain))].sort();
  const languages = [...new Set(normalized.map((record) => record.language))].sort();
  if (
    normalized.length < 12 ||
    domains.length !== ALLOWED_DOMAINS.length ||
    languages.length !== ALLOWED_LANGUAGES.length ||
    new Set(normalized.map((record) => record.idHash)).size !== normalized.length ||
    new Set(normalized.map((record) => record.queryHash)).size !== normalized.length
  ) {
    throw new Error('User query evaluation intake requires diverse unique records.');
  }
  return normalized.sort((left, right) => left.idHash.localeCompare(right.idHash));
}

function buildCoverage(records) {
  return {
    domains: ALLOWED_DOMAINS.map((domain) => ({
      count: records.filter((record) => record.domain === domain).length,
      id: domain,
    })),
    languages: ALLOWED_LANGUAGES.map((language) => ({
      count: records.filter((record) => record.language === language).length,
      id: language,
    })),
  };
}

function check(id, passed) {
  return { id, passed: Boolean(passed), status: passed ? 'passed' : 'failed' };
}

export function buildUserQueryEvaluationIntake({ dataset, observedAt } = {}) {
  const normalizedObservedAt = requireTimestamp(observedAt, 'observedAt');
  const actualUserQueryData = dataset?.actualUserQueryData === true;
  const expectedClassification = actualUserQueryData
    ? 'deidentified-user-query'
    : 'curated-synthetic';
  if (
    dataset?.schemaVersion !== 'personal-ai-agent-user-query-evaluation-dataset/v1' ||
    normalizeText(dataset?.datasetId) === '' ||
    dataset?.dataClassification !== expectedClassification ||
    dataset?.productionReadyClaim !== false
  ) {
    throw new Error('User query evaluation dataset metadata is incomplete.');
  }
  const consent = normalizeConsent(dataset.consent, actualUserQueryData, normalizedObservedAt);
  const deidentification = normalizeDeidentification(
    dataset.deidentification,
    normalizedObservedAt,
  );
  const usage = normalizeUsage(dataset.usage, normalizedObservedAt);
  const records = normalizeRecords(dataset.records, actualUserQueryData);
  const coverage = buildCoverage(records);
  const checks = [
    check('record-count-minimum', records.length >= 12),
    check('all-domains-covered', coverage.domains.every((item) => item.count > 0)),
    check('all-languages-covered', coverage.languages.every((item) => item.count > 0)),
    check('deidentification-review-complete', deidentification.freeTextReviewed),
    check(
      'consent-boundary-valid',
      actualUserQueryData ? consent.status === 'granted' : consent.status === 'not-applicable-synthetic',
    ),
    check(
      'local-evaluation-only-usage',
      usage.evaluationAuthorized &&
        usage.localModelInputAuthorized &&
        !usage.trainingAuthorized &&
        !usage.externalTransferAuthorized,
    ),
  ];
  const content = {
    actualUserQueryData,
    actualUserQueryQualityValidated: false,
    checks,
    consent,
    coverage,
    dataClassification: expectedClassification,
    datasetIdHash: sha256(dataset.datasetId),
    deidentification,
    externalProviderCalls: 'none',
    observedAt: normalizedObservedAt,
    productionReadyClaim: false,
    records,
    schemaVersion: USER_QUERY_EVALUATION_INTAKE_SCHEMA_VERSION,
    status: actualUserQueryData
      ? 'actual-user-query-intake-ready-for-local-evaluation'
      : 'synthetic-user-query-intake-contract-passed',
    usage,
  };
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `user-query-evaluation-intake-${evidenceHash}`,
  };
}

export function assertUserQueryEvaluationIntake(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  if (
    evidenceHash !== expectedHash ||
    id !== `user-query-evaluation-intake-${expectedHash}` ||
    content.schemaVersion !== USER_QUERY_EVALUATION_INTAKE_SCHEMA_VERSION ||
    content.productionReadyClaim !== false ||
    content.actualUserQueryQualityValidated !== false ||
    content.externalProviderCalls !== 'none' ||
    !Array.isArray(content.records) ||
    content.records.length < 12 ||
    content.records.some((record) =>
      !isSha256(record.idHash) ||
      !isSha256(record.queryHash) ||
      !isSha256(record.evidenceHash) ||
      !isSha256(record.expectedAnswerContractHash))
  ) {
    throw new Error('User query evaluation intake failed integrity validation.');
  }
  return evidence;
}
