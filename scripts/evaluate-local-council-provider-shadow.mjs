import fs from 'node:fs';
import path from 'node:path';

import {
  createCouncilBrief,
  createCouncilFrame,
  createCouncilManifest,
  createCouncilStatement,
  createCouncilStatementMetadata,
  createCouncilSynthesis,
  createCouncilSynthesisInput,
  hashCouncilValue,
  sealCouncilStatement,
  sealCouncilSynthesis,
  validateCouncilManifest,
} from '../src/core/council-contract.mjs';
import {
  assertLocalCouncilProviderShadowArtifact,
  buildLocalCouncilProviderShadowArtifact,
  hashLocalCouncilShadowValue,
} from '../src/core/local-council-provider-shadow.mjs';
import {
  assertLocalCouncilSeatContractShadowArtifact,
  buildLocalCouncilSeatContractShadowArtifact,
} from '../src/core/local-council-seat-contract-shadow.mjs';
import {
  assertLocalCouncilClaimContractRobustnessArtifact,
  buildLocalCouncilClaimContractRobustnessArtifact,
} from '../src/core/local-council-claim-contract-robustness.mjs';
import {
  assertLocalCouncilRebuttalSynthesisShadowArtifact,
  buildLocalCouncilRebuttalSynthesisShadowArtifact,
} from '../src/core/local-council-rebuttal-synthesis-shadow.mjs';
import {
  classifyCouncilClaimFailure,
  resolveCouncilSeatPromptContract,
} from '../src/core/council-seat-prompt-contract.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';
import { extractProviderFailure } from '../src/providers/provider-runtime-utils.mjs';
import { buildRequestPrompt } from '../src/providers/structured-provider-utils.mjs';
import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const rebuttalSynthesisMode = options.promptProfile === 'seat-scoped-v3';
const robustnessMode = options.promptProfile === 'seat-scoped-v2';
const seatContractMode = Boolean(options.promptProfile);
const fixturePath = path.join(
  repoDir,
  rebuttalSynthesisMode
    ? 'fixtures/local-council-rebuttal-synthesis-shadow-v1.json'
    : robustnessMode
    ? 'fixtures/local-council-claim-contract-robustness-v1.json'
    : seatContractMode
      ? 'fixtures/local-council-seat-contract-shadow-v1.json'
      : 'fixtures/local-council-provider-shadow-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
if (options.promptProfile && fixture.promptProfile !== options.promptProfile) {
  throw new Error('Local council fixture prompt profile does not match the requested profile.');
}
const c6BaselinePath = path.join(
  repoDir,
  'evidence/output-artifacts/local-council-provider-shadow.json',
);
const c7BaselinePath = path.join(
  repoDir,
  'evidence/output-artifacts/local-council-seat-contract-shadow.json',
);
const c8BaselinePath = path.join(
  repoDir,
  'evidence/output-artifacts/local-council-claim-contract-robustness.json',
);
const c6BaselineText = seatContractMode
  ? fs.readFileSync(c6BaselinePath, 'utf8')
  : null;
const c7BaselineText = robustnessMode || rebuttalSynthesisMode
  ? fs.readFileSync(c7BaselinePath, 'utf8')
  : null;
const c8BaselineText = rebuttalSynthesisMode
  ? fs.readFileSync(c8BaselinePath, 'utf8')
  : null;
const c6BaselineArtifact = c6BaselineText ? JSON.parse(c6BaselineText) : null;
const c7BaselineArtifact = c7BaselineText ? JSON.parse(c7BaselineText) : null;
const c8BaselineArtifact = c8BaselineText ? JSON.parse(c8BaselineText) : null;
if (c6BaselineArtifact) {
  assertLocalCouncilProviderShadowArtifact(c6BaselineArtifact, {
    fixtureText: fs.readFileSync(
      path.join(repoDir, 'fixtures/local-council-provider-shadow-v1.json'),
      'utf8',
    ),
  });
}
if (c7BaselineArtifact) {
  assertLocalCouncilSeatContractShadowArtifact(c7BaselineArtifact, {
    baselineArtifact: c6BaselineArtifact,
    fixtureText: fs.readFileSync(
      path.join(repoDir, 'fixtures/local-council-seat-contract-shadow-v1.json'),
      'utf8',
    ),
  });
}
if (c8BaselineArtifact) {
  assertLocalCouncilClaimContractRobustnessArtifact(c8BaselineArtifact, {
    c6BaselineArtifact,
    c7BaselineArtifact,
    fixtureText: fs.readFileSync(
      path.join(repoDir, 'fixtures/local-council-claim-contract-robustness-v1.json'),
      'utf8',
    ),
  });
}
const before = await readRuntime();
const provider = createLocalProvider({
  rootDir: repoDir,
  env: {
    ...process.env,
    LOCAL_PROVIDER_BASE_URL: `${options.endpoint}/v1`,
    LOCAL_PROVIDER_MAX_TOKENS: '1600',
    LOCAL_PROVIDER_MODEL: options.model,
    LOCAL_PROVIDER_RUN_TIMEOUT_MS: String(options.timeoutMs),
  },
});
const diagnostic = rebuttalSynthesisMode
  ? diagnosticFromC8ImplementationFailure(c8BaselineArtifact)
  : robustnessMode
    ? await observeC7ResearchFailure()
    : null;
const calls = [];
const targetBindings = [];

const frame = buildFrame(fixture, fixtureText);
const openingIsolation = {
  contextHash: hashLocalCouncilShadowValue(frame),
  contextKind: 'council-frame',
  otherOpeningStatementCount: 0,
  verified: true,
};
const promptProfileHash = rebuttalSynthesisMode
  ? hashLocalCouncilShadowValue(profileContracts(fixture))
  : seatContractMode
    ? hashLocalCouncilShadowValue(
        fixture.requiredSeats.map((seatId) =>
          resolveCouncilSeatPromptContract({
            phase: 'opening-position',
            profile: options.promptProfile,
            seatId,
          })),
      )
    : null;

const openings = [];
for (const seatId of fixture.requiredSeats) {
  const metadata = createCouncilStatementMetadata({
    frame,
    round: 'opening',
    seatId,
  });
  const input = specialistInput({
    councilBrief: null,
    councilFrame: frame,
    metadata,
    seatId,
  });
  assertOpeningIsolation(input);
  let observation;
  try {
    observation = await runProviderStage(input);
  } catch (error) {
    calls.push(providerFailureCall(input, error));
    continue;
  }
  const draft = {
    artifactContent: observation.output.artifactContent,
    councilStatement: observation.output.councilStatement,
    metadata: {
      ...metadata,
      outputDigest: `sha256:${'0'.repeat(64)}`,
    },
    runId: `run-opening-${seatId}`,
  };
  try {
    openings.push(createCouncilStatement({
      ...sealCouncilStatement(draft),
      frame,
    }));
    calls.push(observation.call);
  } catch (error) {
    calls.push(contractFailureCall(observation.call, error));
  }
}

const brief = openings.length === fixture.requiredSeats.length
  ? createCouncilBrief({ frame, openings })
  : null;
const rebuttals = [];
if (brief) {
  for (const seatId of fixture.requiredSeats) {
    const metadata = createCouncilStatementMetadata({
      brief,
      frame,
      openings,
      round: 'rebuttal',
      seatId,
    });
    const input = specialistInput({
      councilBrief: brief,
      councilFrame: null,
      metadata,
      seatId,
    });
    let observation;
    try {
      observation = await runProviderStage(input);
    } catch (error) {
      calls.push(providerFailureCall(input, error));
      if (seatContractMode) {
        targetBindings.push(buildTargetBinding(input));
      }
      continue;
    }
    if (seatContractMode) {
      targetBindings.push(observation.targetBinding);
    }
    const draft = {
      artifactContent: observation.output.artifactContent,
      councilStatement: observation.output.councilStatement,
      metadata: {
        ...metadata,
        outputDigest: `sha256:${'0'.repeat(64)}`,
      },
      runId: `run-rebuttal-${seatId}`,
    };
    try {
      rebuttals.push(createCouncilStatement({
        ...sealCouncilStatement(draft),
        brief,
        frame,
        openings,
      }));
      calls.push(observation.call);
    } catch (error) {
      calls.push(contractFailureCall(observation.call, error));
    }
  }
} else {
  calls.push(
    ...fixture.requiredSeats.map((seatId) => notAttemptedCall('rebuttal', seatId)),
  );
  if (seatContractMode) {
    targetBindings.push(
      ...fixture.requiredSeats.map((seatId) =>
        buildTargetBinding({
          councilPhase: 'rebuttal',
          councilSeatId: seatId,
        })),
    );
  }
}

let validation = {
  code: 'council-contract-failed',
  manifestDigest: null,
  status: 'failed',
};
if (brief && rebuttals.length === fixture.requiredSeats.length) {
  const synthesisMetadata = createCouncilSynthesisInput({
    brief,
    frame,
    openings,
    rebuttals,
  });
  const synthesisInput = {
    brief,
    metadata: synthesisMetadata,
    rebuttals: rebuttals.map((record) => ({
      councilStatement: record.councilStatement,
      metadata: record.metadata,
      runId: record.runId,
    })),
  };
  const input = {
    councilBrief: null,
    councilFrame: null,
    councilId: fixture.councilId,
    councilPhase: 'synthesis',
    councilRound: 'rebuttal',
    councilRuntime: {
      artifactFileName: 'local-council-shadow-decision.md',
      artifactTitle: 'Local Council Shadow Decision',
      deliverableType: 'decision-memo',
      nextAction: 'Keep the default profile unchanged pending independent review.',
      proposedAction: {
        kind: 'none',
        reason: 'Shadow qualification cannot mutate a workspace.',
        requiresApproval: false,
        title: 'No workspace action',
      },
    },
    councilSeatId: 'chair',
    councilSynthesisInput: synthesisInput,
    parentRunIds: synthesisMetadata.parentRunIds,
    providerRole: 'executor',
    role: 'executor',
    sourceDigest: synthesisMetadata.sourceDigest,
    specialistKind: null,
  };
  let observation;
  try {
    observation = await runProviderStage(input);
    const synthesisDraft = {
      artifactContent: observation.output.artifactContent,
      brief,
      councilSynthesis: observation.output.councilSynthesis,
      frame,
      metadata: {
        ...synthesisMetadata,
        outputDigest: `sha256:${'0'.repeat(64)}`,
      },
      openings,
      rebuttals,
      runId: 'run-synthesis-chair',
    };
    const synthesis = createCouncilSynthesis(sealCouncilSynthesis(synthesisDraft));
    const manifest = createCouncilManifest({
      brief,
      frame,
      openings,
      rebuttals,
      synthesis,
    });
    const result = validateCouncilManifest({
      brief,
      frame,
      manifest,
      openings,
      rebuttals,
      synthesis,
    });
    calls.push(observation.call);
    validation = {
      code: result.code,
      manifestDigest: manifest.manifestDigest,
      status: result.status,
    };
  } catch (error) {
    calls.push(
      observation
        ? contractFailureCall(observation.call, error)
        : providerFailureCall(input, error),
    );
  }
} else {
  calls.push(notAttemptedCall('synthesis', 'chair'));
}
const after = await readRuntime();
assertRuntimeStable(before, after);

const runtime = {
  afterContextLength: after.process.contextLength,
  afterLoaded: after.process.loaded,
  afterSizeBytes: after.process.sizeBytes,
  afterVramBytes: after.process.vramBytes,
  beforeLoaded: before.process.loaded,
  cloudFeaturesDisabled: true,
  endpointAlias: 'loopback-ollama',
  kind: 'ollama',
  transportLoopback: true,
  version: after.version,
};
const artifact = rebuttalSynthesisMode
  ? buildLocalCouncilRebuttalSynthesisShadowArtifact({
      baseline: {
        c6: baselineBinding(c6BaselineArtifact),
        c7: baselineBinding(c7BaselineArtifact),
        c8: baselineBinding(c8BaselineArtifact),
      },
      c8ImplementationCall: c8BaselineArtifact.calls.find(
        (call) => call.phase === 'rebuttal' && call.seatId === 'implementation',
      ),
      calls,
      diagnostic,
      fixtureHash: hashLocalCouncilShadowValue(fixtureText),
      model: after.model,
      observedAt: new Date().toISOString(),
      openingIsolation,
      promptProfileHash,
      runtime,
      targetBindings,
      validation,
    })
  : robustnessMode
  ? buildLocalCouncilClaimContractRobustnessArtifact({
      baseline: {
        c6: baselineBinding(c6BaselineArtifact),
        c7: baselineBinding(c7BaselineArtifact),
      },
      c7ResearchCall: c7BaselineArtifact.calls.find(
        (call) =>
          call.phase === 'opening-position' &&
          call.seatId === 'research',
      ),
      calls,
      diagnostic,
      fixtureHash: hashLocalCouncilShadowValue(fixtureText),
      model: after.model,
      observedAt: new Date().toISOString(),
      openingIsolation,
      promptProfileHash,
      runtime,
      targetBindings,
      validation,
    })
  : seatContractMode
    ? buildLocalCouncilSeatContractShadowArtifact({
      baseline: {
        artifactId: c6BaselineArtifact.id,
        decision: c6BaselineArtifact.qualification.decision,
        integrityHash: c6BaselineArtifact.integrityHash,
        localShadowQualified: c6BaselineArtifact.localShadowQualified,
      },
      calls,
      fixtureHash: hashLocalCouncilShadowValue(fixtureText),
      model: after.model,
      observedAt: new Date().toISOString(),
      openingIsolation,
      promptProfileHash,
      runtime,
      targetBindings,
      validation,
    })
    : buildLocalCouncilProviderShadowArtifact({
        calls,
        fixtureHash: hashLocalCouncilShadowValue(fixtureText),
        model: after.model,
        observedAt: new Date().toISOString(),
        runtime,
        validation,
      });
if (rebuttalSynthesisMode) {
  assertLocalCouncilRebuttalSynthesisShadowArtifact(artifact, {
    c6BaselineArtifact,
    c7BaselineArtifact,
    c8BaselineArtifact,
    fixtureText,
  });
} else if (robustnessMode) {
  assertLocalCouncilClaimContractRobustnessArtifact(artifact, {
    c6BaselineArtifact,
    c7BaselineArtifact,
    fixtureText,
  });
} else if (seatContractMode) {
  assertLocalCouncilSeatContractShadowArtifact(artifact, {
    baselineArtifact: c6BaselineArtifact,
    fixtureText,
  });
} else {
  assertLocalCouncilProviderShadowArtifact(artifact, { fixtureText });
}
writeEvidenceJson({
  artifact,
  defaultRelativePath: robustnessMode
    ? 'evidence/output-artifacts/local-council-claim-contract-robustness.json'
    : rebuttalSynthesisMode
      ? 'evidence/output-artifacts/local-council-rebuttal-synthesis-shadow.json'
    : seatContractMode
      ? 'evidence/output-artifacts/local-council-seat-contract-shadow.json'
      : 'evidence/output-artifacts/local-council-provider-shadow.json',
  label: robustnessMode
    ? 'Local council claim contract robustness output'
    : rebuttalSynthesisMode
      ? 'Local council rebuttal synthesis shadow output'
    : seatContractMode
      ? 'Local council seat contract shadow output'
      : 'Local council provider shadow output',
  repoDir,
  value: options.outputPath,
});
if (
  c6BaselineText &&
  fs.readFileSync(c6BaselinePath, 'utf8') !== c6BaselineText
) {
  throw new Error(`${robustnessMode ? 'C8' : 'C7'} changed the C6 baseline artifact.`);
}
if (
  c7BaselineText &&
  fs.readFileSync(c7BaselinePath, 'utf8') !== c7BaselineText
) {
  throw new Error('C8 changed the C7 baseline artifact.');
}
if (
  c8BaselineText &&
  fs.readFileSync(c8BaselinePath, 'utf8') !== c8BaselineText
) {
  throw new Error('C9 changed the C8 baseline artifact.');
}

console.log(JSON.stringify({
  callCount: artifact.summary.callCount,
  decision: artifact.qualification.decision,
  diagnosticFailureSubreason: robustnessMode || rebuttalSynthesisMode
    ? artifact.diagnostic.failureSubreason
    : undefined,
  distinctOpeningOutputCount: artifact.summary.distinctOpeningOutputCount,
  localShadowQualified: artifact.localShadowQualified,
  mode: rebuttalSynthesisMode
    ? 'local-council-rebuttal-synthesis-shadow'
    : robustnessMode
    ? 'local-council-claim-contract-robustness'
    : seatContractMode
      ? 'local-council-seat-contract-shadow'
      : 'local-council-provider-shadow',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
}, null, 2));

function specialistInput({
  councilBrief,
  councilFrame,
  metadata,
  promptProfile = options.promptProfile,
  seatId,
  sourceFixture = fixture,
}) {
  return {
    councilBrief,
    councilFrame,
    councilId: sourceFixture.councilId,
    councilPhase: metadata.councilPhase,
    councilPromptProfile: promptProfile,
    councilRound: metadata.councilRound,
    councilRuntime: null,
    councilSeatId: seatId,
    councilSynthesisInput: null,
    parentRunIds: metadata.parentRunIds,
    providerRole: 'specialist',
    role: 'specialist',
    sourceDigest: metadata.sourceDigest,
    specialistKind: seatId,
  };
}

async function runProviderStage(input) {
  const prompt = prepareObservedPrompt(input);
  const result = await provider.run(input);
  const output = provider.normalizeOutput(result, input);
  return {
    call: addFailureSubreason({
      attemptCount: Number(result.attemptCount || 1),
      durationMs: Math.max(0, Math.round(Number(result.durationMs || 0))),
      failureKind: null,
      inputTokens: Number(result.usageInputTokens || 0),
      outputHash: hashLocalCouncilShadowValue(result.output),
      outputTokens: Number(result.usageOutputTokens || 0),
      phase: input.councilPhase,
      promptHash: hashLocalCouncilShadowValue(prompt),
      retryCount: Number(result.retryCount || 0),
      seatId: input.councilSeatId,
      status: 'passed',
      totalTokens: Number(result.usageTotalTokens || 0),
    }),
    output,
    targetBinding: input.councilPhase === 'rebuttal' && input.councilPromptProfile
      ? buildTargetBinding(input, output.councilStatement?.targetClaimIds)
      : null,
  };
}

function assertOpeningIsolation(input) {
  if (
    seatContractMode &&
    (
      input.councilPhase !== 'opening-position' ||
      input.councilBrief !== null ||
      input.councilFrame !== frame
    )
  ) {
    throw new Error('C7 opening input must contain only the shared CouncilFrame.');
  }
}

function buildTargetBinding(input, targetClaimIds = []) {
  const seatContract = resolveCouncilSeatPromptContract({
    phase: 'opening-position',
    profile: input.councilPromptProfile,
    seatId: input.councilSeatId,
  });
  const expectedTarget = `${seatContract.targetSeatId}:claim-1`;
  const observedTarget = Array.isArray(targetClaimIds) && targetClaimIds.length === 1
    ? String(targetClaimIds[0] || '').trim()
    : '';
  return {
    expectedTargetHash: hashLocalCouncilShadowValue(expectedTarget),
    matched: observedTarget === expectedTarget,
    observedTargetHash: observedTarget
      ? hashLocalCouncilShadowValue(observedTarget)
      : null,
    seatId: input.councilSeatId,
  };
}

function contractFailureCall(call, error) {
  return addFailureSubreason({
    ...call,
    failureKind: `council-contract:${String(error?.code || 'invalid-output')}`,
    status: 'failed',
  }, classifyCouncilClaimFailure(error));
}

function providerFailureCall(input, error) {
  const failure = extractProviderFailure(error);
  const attemptCount = Math.max(1, Number(failure.attemptCount || 1));
  return addFailureSubreason({
    attemptCount,
    durationMs: Math.max(0, Math.round(Number(failure.durationMs || 0))),
    failureKind: `provider:${failure.failureKind || 'unknown'}`,
    inputTokens: Math.max(0, Number(failure.usageInputTokens || 0)),
    outputHash: null,
    outputTokens: Math.max(0, Number(failure.usageOutputTokens || 0)),
    phase: input.councilPhase,
    promptHash: hashLocalCouncilShadowValue(prepareObservedPrompt(input)),
    retryCount: Math.max(0, Number(failure.retryCount || attemptCount - 1)),
    seatId: input.councilSeatId,
    status: 'failed',
    totalTokens: Math.max(0, Number(failure.usageTotalTokens || 0)),
  });
}

function prepareObservedPrompt(input) {
  const delegatedPrompt = provider.preparePrompt(input);
  return input.councilPromptProfile
    ? buildRequestPrompt(input, delegatedPrompt)
    : delegatedPrompt;
}

function notAttemptedCall(phase, seatId) {
  return addFailureSubreason({
    attemptCount: 0,
    durationMs: 0,
    failureKind: 'dependency-blocked',
    inputTokens: 0,
    outputHash: null,
    outputTokens: 0,
    phase,
    promptHash: null,
    retryCount: 0,
    seatId,
    status: 'not-attempted',
    totalTokens: 0,
  });
}

function addFailureSubreason(call, failureSubreason = null) {
  return robustnessMode || rebuttalSynthesisMode
    ? {
        ...call,
        failureSubreason,
      }
    : call;
}

function baselineBinding(artifact) {
  return {
    artifactId: artifact.id,
    decision: artifact.qualification.decision,
    integrityHash: artifact.integrityHash,
    localShadowQualified: artifact.localShadowQualified,
  };
}

function profileContracts(sourceFixture) {
  const openingClaims = sourceFixture.requiredSeats.map((seatId) => ({
    id: `${seatId}:claim-1`,
    seatId,
  }));
  return sourceFixture.requiredSeats.flatMap((seatId) => [
    resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: options.promptProfile,
      seatId,
    }),
    resolveCouncilSeatPromptContract({
      councilBrief: { claims: openingClaims },
      phase: 'rebuttal',
      profile: options.promptProfile,
      seatId,
    }),
  ]);
}

function diagnosticFromC8ImplementationFailure(c8Artifact) {
  const call = c8Artifact.calls.find((candidate) =>
    candidate.phase === 'rebuttal' && candidate.seatId === 'implementation');
  if (!call || call.failureKind !== 'council-contract:missing-field') {
    throw new Error('C9 requires the fixed C8 implementation missing-field baseline.');
  }
  return {
    failureKind: call.failureKind,
    failureSubreason: 'claim-severity',
    inputTokens: call.inputTokens,
    outputHash: call.outputHash,
    outputTokens: call.outputTokens,
    promptHash: call.promptHash,
    totalTokens: call.totalTokens,
  };
}

function buildFrame(sourceFixture, sourceFixtureText) {
  return createCouncilFrame({
    contextDigest: hashCouncilValue({
      fixtureHash: hashLocalCouncilShadowValue(sourceFixtureText),
    }),
    councilId: sourceFixture.councilId,
    evidenceCatalog: sourceFixture.evidenceCatalog.map((item) => ({
      ...item,
      councilId: sourceFixture.councilId,
      sessionId: sourceFixture.sessionId,
      workspaceId: sourceFixture.workspaceId,
    })),
    parentRunId: sourceFixture.parentRunId,
    riskSignals: [],
    sessionId: sourceFixture.sessionId,
    workspaceId: sourceFixture.workspaceId,
  });
}

async function observeC7ResearchFailure() {
  const c7FixtureText = fs.readFileSync(
    path.join(repoDir, 'fixtures/local-council-seat-contract-shadow-v1.json'),
    'utf8',
  );
  const c7Fixture = JSON.parse(c7FixtureText);
  const c7Frame = buildFrame(c7Fixture, c7FixtureText);
  const metadata = createCouncilStatementMetadata({
    frame: c7Frame,
    round: 'opening',
    seatId: 'research',
  });
  const input = specialistInput({
    councilBrief: null,
    councilFrame: c7Frame,
    metadata,
    promptProfile: 'seat-scoped-v1',
    seatId: 'research',
    sourceFixture: c7Fixture,
  });

  let observation;
  try {
    observation = await runProviderStage(input);
  } catch (error) {
    return diagnosticFromCall(providerFailureCall(input, error));
  }
  const draft = {
    artifactContent: observation.output.artifactContent,
    councilStatement: observation.output.councilStatement,
    metadata: {
      ...metadata,
      outputDigest: `sha256:${'0'.repeat(64)}`,
    },
    runId: 'run-opening-research',
  };
  try {
    createCouncilStatement({
      ...sealCouncilStatement(draft),
      frame: c7Frame,
    });
    return diagnosticFromCall(observation.call);
  } catch (error) {
    return diagnosticFromCall(contractFailureCall(observation.call, error));
  }
}

function diagnosticFromCall(call) {
  const {
    phase: _phase,
    seatId: _seatId,
    ...diagnostic
  } = call;
  return diagnostic;
}

async function readRuntime() {
  const [version, tags, show, processes] = await Promise.all([
    requestLoopbackJson({
      endpoint: options.endpoint,
      pathname: '/api/version',
      timeoutMs: options.timeoutMs,
    }),
    requestLoopbackJson({
      endpoint: options.endpoint,
      pathname: '/api/tags',
      timeoutMs: options.timeoutMs,
    }),
    requestLoopbackJson({
      body: { model: options.model },
      endpoint: options.endpoint,
      pathname: '/api/show',
      timeoutMs: options.timeoutMs,
    }),
    requestLoopbackJson({
      endpoint: options.endpoint,
      pathname: '/api/ps',
      timeoutMs: options.timeoutMs,
    }),
  ]);
  const installed = tags.models?.find(
    (item) => item.name === options.model || item.model === options.model,
  );
  if (!installed?.digest || !Number.isSafeInteger(installed.size)) {
    throw new Error('C6 requires installed qwen2.5:3b runtime provenance.');
  }
  const license = String(show.license || '').trim() ||
    String(show.modelfile || '').match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]?.trim();
  if (!license) {
    throw new Error('C6 requires model license provenance.');
  }
  const process = processes.models?.find(
    (item) => item.name === options.model || item.model === options.model,
  );
  return {
    model: {
      digest: installed.digest,
      id: options.model,
      licenseHash: hashLocalCouncilShadowValue(license),
      sizeBytes: installed.size,
    },
    process: {
      contextLength: Number(process?.context_length || 0),
      loaded: Boolean(process),
      sizeBytes: Number(process?.size || 0),
      vramBytes: Number(process?.size_vram || 0),
    },
    version: String(version.version || '').trim(),
  };
}

function assertRuntimeStable(before, after) {
  if (
    JSON.stringify(before.model) !== JSON.stringify(after.model) ||
    before.version !== after.version
  ) {
    throw new Error('C6 local runtime provenance changed during evaluation.');
  }
  if (!after.process.loaded) {
    throw new Error('C6 local model is not loaded after evaluation.');
  }
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    values.set(args[index], args[index + 1]);
  }
  const endpoint = values.get('--endpoint');
  const model = values.get('--model');
  const output = values.get('--output');
  const promptProfile = values.get('--prompt-profile') || null;
  const goalLabel = promptProfile === 'seat-scoped-v3'
    ? 'C9'
    : promptProfile === 'seat-scoped-v2'
    ? 'C8'
    : promptProfile
      ? 'C7'
      : 'C6';
  if (
    !endpoint ||
    model !== 'qwen2.5:3b' ||
    values.get('--cloud-features-disabled') !== 'true' ||
    !output
  ) {
    throw new Error(
      `${goalLabel} local council shadow requires loopback endpoint, qwen2.5:3b, disabled cloud features, and output.`,
    );
  }
  if (!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)) {
    throw new Error(`${goalLabel} local council endpoint must be loopback.`);
  }
  if (
    promptProfile &&
    !['seat-scoped-v1', 'seat-scoped-v2', 'seat-scoped-v3'].includes(promptProfile)
  ) {
    throw new Error('Local council prompt profile must be seat-scoped-v1, seat-scoped-v2, or seat-scoped-v3.');
  }
  const outputPath = resolveEvidenceOutputPath({
    defaultRelativePath: promptProfile === 'seat-scoped-v3'
      ? 'evidence/output-artifacts/local-council-rebuttal-synthesis-shadow.json'
      : promptProfile === 'seat-scoped-v2'
      ? 'evidence/output-artifacts/local-council-claim-contract-robustness.json'
      : promptProfile
        ? 'evidence/output-artifacts/local-council-seat-contract-shadow.json'
        : 'evidence/output-artifacts/local-council-provider-shadow.json',
    label: promptProfile === 'seat-scoped-v3'
      ? 'Local council rebuttal synthesis shadow output'
      : promptProfile === 'seat-scoped-v2'
      ? 'Local council claim contract robustness output'
      : promptProfile
        ? 'Local council seat contract shadow output'
        : 'Local council provider shadow output',
    repoDir,
    value: output,
  });
  if (
    promptProfile &&
    outputPath === path.join(
      repoDir,
      'evidence/output-artifacts/local-council-provider-shadow.json',
    )
  ) {
    throw new Error(`${goalLabel} output must not overwrite the C6 baseline artifact.`);
  }
  if (
    promptProfile === 'seat-scoped-v2' &&
    outputPath === path.join(
      repoDir,
      'evidence/output-artifacts/local-council-seat-contract-shadow.json',
    )
  ) {
    throw new Error('C8 output must not overwrite the C7 baseline artifact.');
  }
  if (
    promptProfile === 'seat-scoped-v3' &&
    outputPath === path.join(
      repoDir,
      'evidence/output-artifacts/local-council-seat-contract-shadow.json',
    )
  ) {
    throw new Error('C9 output must not overwrite the C7 baseline artifact.');
  }
  if (
    promptProfile === 'seat-scoped-v3' &&
    outputPath === path.join(
      repoDir,
      'evidence/output-artifacts/local-council-claim-contract-robustness.json',
    )
  ) {
    throw new Error('C9 output must not overwrite the C8 baseline artifact.');
  }
  return {
    endpoint,
    model,
    outputPath,
    promptProfile,
    timeoutMs: 120_000,
  };
}
