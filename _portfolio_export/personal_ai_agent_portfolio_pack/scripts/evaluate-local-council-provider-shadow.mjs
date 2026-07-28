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
const seatContractMode = options.promptProfile === 'seat-scoped-v1';
const fixturePath = path.join(
  repoDir,
  seatContractMode
    ? 'fixtures/local-council-seat-contract-shadow-v1.json'
    : 'fixtures/local-council-provider-shadow-v1.json',
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const baselinePath = path.join(
  repoDir,
  'evidence/output-artifacts/local-council-provider-shadow.json',
);
const baselineText = seatContractMode
  ? fs.readFileSync(baselinePath, 'utf8')
  : null;
const baselineArtifact = baselineText ? JSON.parse(baselineText) : null;
if (baselineArtifact) {
  assertLocalCouncilProviderShadowArtifact(baselineArtifact, {
    fixtureText: fs.readFileSync(
      path.join(repoDir, 'fixtures/local-council-provider-shadow-v1.json'),
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
const calls = [];
const targetBindings = [];

const frame = createCouncilFrame({
  contextDigest: hashCouncilValue({
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
  }),
  councilId: fixture.councilId,
  evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
    ...item,
    councilId: fixture.councilId,
    sessionId: fixture.sessionId,
    workspaceId: fixture.workspaceId,
  })),
  parentRunId: fixture.parentRunId,
  riskSignals: [],
  sessionId: fixture.sessionId,
  workspaceId: fixture.workspaceId,
});
const openingIsolation = {
  contextHash: hashLocalCouncilShadowValue(frame),
  contextKind: 'council-frame',
  otherOpeningStatementCount: 0,
  verified: true,
};
const promptProfileHash = seatContractMode
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
  try {
    const observation = await runProviderStage(input);
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
    calls.push(providerFailureCall(input, error));
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
const artifact = seatContractMode
  ? buildLocalCouncilSeatContractShadowArtifact({
      baseline: {
        artifactId: baselineArtifact.id,
        decision: baselineArtifact.qualification.decision,
        integrityHash: baselineArtifact.integrityHash,
        localShadowQualified: baselineArtifact.localShadowQualified,
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
if (seatContractMode) {
  assertLocalCouncilSeatContractShadowArtifact(artifact, {
    baselineArtifact,
    fixtureText,
  });
} else {
  assertLocalCouncilProviderShadowArtifact(artifact, { fixtureText });
}
writeEvidenceJson({
  artifact,
  defaultRelativePath: seatContractMode
    ? 'evidence/output-artifacts/local-council-seat-contract-shadow.json'
    : 'evidence/output-artifacts/local-council-provider-shadow.json',
  label: seatContractMode
    ? 'Local council seat contract shadow output'
    : 'Local council provider shadow output',
  repoDir,
  value: options.outputPath,
});
if (baselineText && fs.readFileSync(baselinePath, 'utf8') !== baselineText) {
  throw new Error('C7 changed the C6 baseline artifact.');
}

console.log(JSON.stringify({
  callCount: artifact.summary.callCount,
  decision: artifact.qualification.decision,
  distinctOpeningOutputCount: artifact.summary.distinctOpeningOutputCount,
  localShadowQualified: artifact.localShadowQualified,
  mode: seatContractMode
    ? 'local-council-seat-contract-shadow'
    : 'local-council-provider-shadow',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
}, null, 2));

function specialistInput({ councilBrief, councilFrame, metadata, seatId }) {
  return {
    councilBrief,
    councilFrame,
    councilId: fixture.councilId,
    councilPhase: metadata.councilPhase,
    councilPromptProfile: options.promptProfile,
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
    call: {
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
    },
    output,
    targetBinding: input.councilPhase === 'rebuttal' && seatContractMode
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
    profile: options.promptProfile,
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
  return {
    ...call,
    failureKind: `council-contract:${String(error?.code || 'invalid-output')}`,
    status: 'failed',
  };
}

function providerFailureCall(input, error) {
  const failure = extractProviderFailure(error);
  const attemptCount = Math.max(1, Number(failure.attemptCount || 1));
  return {
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
  };
}

function prepareObservedPrompt(input) {
  const delegatedPrompt = provider.preparePrompt(input);
  return seatContractMode
    ? buildRequestPrompt(input, delegatedPrompt)
    : delegatedPrompt;
}

function notAttemptedCall(phase, seatId) {
  return {
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
  };
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
  const goalLabel = promptProfile ? 'C7' : 'C6';
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
  if (promptProfile && promptProfile !== 'seat-scoped-v1') {
    throw new Error('Local council prompt profile must be seat-scoped-v1.');
  }
  const outputPath = resolveEvidenceOutputPath({
    defaultRelativePath: promptProfile
      ? 'evidence/output-artifacts/local-council-seat-contract-shadow.json'
      : 'evidence/output-artifacts/local-council-provider-shadow.json',
    label: promptProfile
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
    throw new Error('C7 output must not overwrite the C6 baseline artifact.');
  }
  return {
    endpoint,
    model,
    outputPath,
    promptProfile,
    timeoutMs: 120_000,
  };
}
