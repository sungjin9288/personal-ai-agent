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
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createLocalProvider } from '../src/providers/local-provider.mjs';
import { extractProviderFailure } from '../src/providers/provider-runtime-utils.mjs';
import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const fixturePath = path.join(repoDir, 'fixtures/local-council-provider-shadow-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
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
      continue;
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

const artifact = buildLocalCouncilProviderShadowArtifact({
  calls,
  fixtureHash: hashLocalCouncilShadowValue(fixtureText),
  model: after.model,
  observedAt: new Date().toISOString(),
  runtime: {
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
  },
  validation,
});
assertLocalCouncilProviderShadowArtifact(artifact, { fixtureText });
writeEvidenceJson({
  artifact,
  defaultRelativePath: 'evidence/output-artifacts/local-council-provider-shadow.json',
  label: 'Local council provider shadow output',
  repoDir,
  value: options.outputPath,
});

console.log(JSON.stringify({
  callCount: artifact.summary.callCount,
  decision: artifact.qualification.decision,
  distinctOpeningOutputCount: artifact.summary.distinctOpeningOutputCount,
  localShadowQualified: artifact.localShadowQualified,
  mode: 'local-council-provider-shadow',
  ok: true,
  outputPath: path.relative(repoDir, options.outputPath),
}, null, 2));

function specialistInput({ councilBrief, councilFrame, metadata, seatId }) {
  return {
    councilBrief,
    councilFrame,
    councilId: fixture.councilId,
    councilPhase: metadata.councilPhase,
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
  const prompt = provider.preparePrompt(input);
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
    promptHash: hashLocalCouncilShadowValue(provider.preparePrompt(input)),
    retryCount: Math.max(0, Number(failure.retryCount || attemptCount - 1)),
    seatId: input.councilSeatId,
    status: 'failed',
    totalTokens: Math.max(0, Number(failure.usageTotalTokens || 0)),
  };
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
  if (
    !endpoint ||
    model !== 'qwen2.5:3b' ||
    values.get('--cloud-features-disabled') !== 'true' ||
    !output
  ) {
    throw new Error(
      'C6 local council shadow requires loopback endpoint, qwen2.5:3b, disabled cloud features, and output.',
    );
  }
  if (!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)) {
    throw new Error('C6 local council endpoint must be loopback.');
  }
  return {
    endpoint,
    model,
    outputPath: resolveEvidenceOutputPath({
      defaultRelativePath: 'evidence/output-artifacts/local-council-provider-shadow.json',
      label: 'Local council provider shadow output',
      repoDir,
      value: output,
    }),
    timeoutMs: 120_000,
  };
}
