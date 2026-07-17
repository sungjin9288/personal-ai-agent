import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';

export function loadLocalAnswerCompositionRobustnessSuite({ repoDir = process.cwd() } = {}) {
  const fixturePath = path.join(
    repoDir,
    'fixtures',
    'answer-composition-robustness-cases-v1.json',
  );
  const fixtureText = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fixtureText);
  const fixtureHash = sha256(fixtureText);
  const q3FixturePath = path.join(repoDir, 'fixtures', 'answer-quality-cases-v1.json');
  const q3FixtureText = fs.readFileSync(q3FixturePath, 'utf8');
  const q3Fixture = JSON.parse(q3FixtureText);
  const q3FixtureHash = sha256(q3FixtureText);
  validateFixture(fixture);
  if (sha256(JSON.stringify(fixture.thresholds)) !== sha256(JSON.stringify(q3Fixture.thresholds))) {
    throw new Error('Q4 robustness thresholds must match the Q3 regression fixture.');
  }

  const caseInputs = [
    ...q3Fixture.cases.map((definition) => ({
      definition: {
        ...definition,
        language: 'en',
        promptInjectionCase: false,
        scenarioId: 'q3-regression',
      },
      objective: definition.retrievalInput.mission.objective,
      retrievedItems: buildRetrievalContext(definition.retrievalInput),
    })),
    ...fixture.cases.map((definition) => ({
      definition,
      objective: definition.objective,
      retrievedItems: definition.evidence.map((item) => ({
        snippet: item.text,
        sourceKey: item.sourceKey,
      })),
    })),
  ];
  return {
    caseInputs,
    suite: {
      cases: caseInputs.map(({ definition, retrievedItems }) => ({
        evidenceItemCount: retrievedItems.length,
        id: definition.id,
        language: definition.language,
        promptInjectionCase: definition.promptInjectionCase === true,
        scenarioId: definition.scenarioId,
      })),
      fixtureHash: sha256(JSON.stringify({
        q3FixtureHash,
        robustnessFixtureHash: fixtureHash,
      })),
      fixtureRefs: [
        {
          id: q3Fixture.schemaVersion,
          sha256: q3FixtureHash,
        },
        {
          id: fixture.schemaVersion,
          sha256: fixtureHash,
        },
      ],
      id: 'personal-ai-agent-answer-composition-robustness-suite/v1',
      thresholds: fixture.thresholds,
    },
  };
}

export async function evaluateLocalAnswerCompositionRobustnessSuite({
  caseInputs,
  generator,
  mode,
  thresholds,
}) {
  const candidateCases = [];
  const observations = [];
  for (const { definition, objective, retrievedItems } of caseInputs) {
    let generated;
    try {
      generated = await generator.generate({
        objective,
        retrievedItems,
      });
    } catch (error) {
      throw new Error(
        `${mode} generation failed for ${definition.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
    candidateCases.push({
      ...definition,
      answer: generated.answer,
      retrievedItems,
    });
    observations.push({
      ...generated.observation,
      caseId: definition.id,
      citedSourceKeys: generated.answer.citedSourceKeys,
      claimCount: generated.composition.claimCount,
      ...(Number.isInteger(generated.composition.identifierRestorationCount)
        ? {
          identifierRestorationCount:
            generated.composition.identifierRestorationCount,
        }
        : {}),
      reviewActionPresent: generated.composition.reviewActionPresent,
      reviewActionSpecific: generated.composition.reviewActionSpecific,
      sourceCoverageComplete: generated.composition.sourceCoverageComplete,
    });
  }
  return {
    answerQualityEvaluation: evaluateAnswerQualitySuite({
      cases: candidateCases,
      thresholds,
    }),
    observations,
  };
}

function validateFixture(candidate) {
  const scenarioIds = Array.isArray(candidate?.cases)
    ? [...new Set(candidate.cases.map((definition) => definition.scenarioId))].sort()
    : [];
  if (
    candidate?.schemaVersion !==
      'personal-ai-agent-answer-composition-robustness-fixture/v1' ||
    candidate?.productionReadyClaim !== false ||
    !candidate.thresholds ||
    !Array.isArray(candidate.cases) ||
    candidate.cases.length < 8 ||
    JSON.stringify(scenarioIds) !== JSON.stringify([
      'bounded-long-context',
      'korean',
      'multi-domain',
      'prompt-injection',
    ]) ||
    candidate.cases.some((definition) =>
      !definition.id ||
      !definition.objective ||
      !['en', 'ko'].includes(definition.language) ||
      !Array.isArray(definition.evidence) ||
      definition.evidence.length === 0 ||
      !Array.isArray(definition.expectedSourceKeys) ||
      definition.expectedSourceKeys.length !== definition.evidence.length ||
      !Array.isArray(definition.requiredAnswerTerms) ||
      definition.requiredAnswerTerms.length < 3 ||
      !Array.isArray(definition.forbiddenAnswerTerms) ||
      definition.forbiddenAnswerTerms.length === 0 ||
      !Array.isArray(definition.forbiddenSourceKeys) ||
      definition.reviewerVerdict !== 'pass')
  ) {
    throw new Error('Local answer composition robustness fixture is incomplete.');
  }
  for (const definition of candidate.cases) {
    const evidenceKeys = definition.evidence.map((item) => item.sourceKey).sort();
    const expectedKeys = [...definition.expectedSourceKeys].sort();
    if (
      new Set(evidenceKeys).size !== evidenceKeys.length ||
      JSON.stringify(evidenceKeys) !== JSON.stringify(expectedKeys)
    ) {
      throw new Error(`Robustness fixture source keys drifted for ${definition.id}.`);
    }
  }
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
