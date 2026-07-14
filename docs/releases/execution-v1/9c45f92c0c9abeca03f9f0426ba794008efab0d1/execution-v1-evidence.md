# Execution v1 Evidence

- archivedAt: 2026-07-14T05:35:02.300Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-07-14T05:34:53.328Z
- branch: main
- commit: 9c45f92c0c9abeca03f9f0426ba794008efab0d1
- mode: execution-v1-verification
- liveFlags: --live-openai, --live-anthropic, --live-local

## Deterministic Verification

- smoke:execution-flow: passed
- smoke:execution-cli: passed
- smoke:ui-execution-console: passed
- smoke:ui-execution-browser-e2e: passed
- smoke:reference-adoptions: passed
- smoke:execution-v1-live-helpers: passed
- smoke:execution-v1-handoff: passed
- smoke:production-readiness-gate: passed

## Deterministic Runtime Summary

- smoke:execution-flow: 1.2s elapsed, stdout 331B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 782ms elapsed, stdout 237B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 803ms elapsed, stdout 242B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 6.9m elapsed, stdout 7.0KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 57.2s elapsed, stdout 5.3KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 14.3s elapsed, stdout 280B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 2.2s elapsed, stdout 283B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 185ms elapsed, stdout 2.4KiB, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 28
- totalDuration: 57.0s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (413ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (112ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (277ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (446ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (624ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (633ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (3.9s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (88ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (289ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (417ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (211ms, timeout 5.0m, timedOut false)
- scripts/smoke-openclaw-hermes-orchestration-docs.mjs: passed (53ms, timeout 5.0m, timedOut false)
- scripts/smoke-channel-adapter-seam.mjs: passed (525ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-context-records.mjs: passed (695ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-audit-surface.mjs: passed (520ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-audit-surface.mjs: passed (615ms, timeout 5.0m, timedOut false)
- scripts/smoke-permission-decision-records.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-sandbox-decision-timelines.mjs: passed (777ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-learning-candidate.mjs: passed (698ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-fallback-route-decision.mjs: passed (686ms, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-queue.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-candidate-audit-surface.mjs: passed (1.3s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-gate.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-stop-condition.mjs: passed (1.9s, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (2.0s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (29.1s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (926ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 16e2082fc01ae260fabb07db059f0977a545924b434c966ec0a92592fc0df24f

## Live Validation

- openai: passed (missionId=mission_20260505155933_6f9a04, executionSessionId=execsession_20260505160104_45b7df, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-S78A4H | workspaceId=workspace_20260505160104_ea885a | missionId=mission_20260505160104_5c9b4f | artifact=manager-prompt.md | sessionId=session_20260505160104_292515 | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-S78A4H
  - workspaceId: workspace_20260505160104_ea885a
  - missionId: mission_20260505160104_5c9b4f
  - sessionId: session_20260505160104_292515
  - artifact: manager-prompt.md
  - missionStatus: failed
  - providerId: anthropic
  - failedRole: manager
  - failureKind: http-status
  - httpStatus: 400
  - providerMessage: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.
  - recoverable: false
  - timedOut: false
- local: passed (missionId=mission_20260710042525_03ab32, executionSessionId=execsession_20260710042606_961cb5, verification=passed)

## What This Proves

- engineering mission이 reviewer 통과 후 execution-capable 상태로 전환되는지
- execution lease approval이 1회 실행 세션에 바인딩되는지
- foreground execution session이 완료되고 verification 결과가 남는지
- CLI, service, UI contract가 같은 execution 상태를 읽는지
- 실제 browser interaction이 미션 생성 → 실행 승인 요청 → 승인 → 실행 시작 → 결과 확인 → history restore까지 이어지는지
- browser screenshot/report visual evidence가 safe local artifact root 안에서 manifest로 추적되는지
- externally inspired reference adoption 기능들이 aggregate smoke gate로 회귀 검증되는지

## Coverage and Remaining Gaps

- browser interaction E2E: ready (Playwright CLI flow passed)
- reference adoption gate: ready (aggregate smoke passed)
- live provider validation은 해당 provider env가 있을 때만 수행되며, 요청되지 않았거나 env가 없으면 skipped 상태로 남음

## Raw Summary

```json
{
  "deterministic": [
    {
      "durationMs": 1218,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 331,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 782,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 237,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 803,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 242,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 413318,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7117,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 57222,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 5473,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 28,
        "scripts": [
          {
            "durationMs": 413,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 112,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 277,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 446,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 624,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 633,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 3900,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 88,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 289,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 417,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 211,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 53,
            "ok": true,
            "script": "scripts/smoke-openclaw-hermes-orchestration-docs.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 525,
            "ok": true,
            "script": "scripts/smoke-channel-adapter-seam.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 695,
            "ok": true,
            "script": "scripts/smoke-identity-session-context-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 520,
            "ok": true,
            "script": "scripts/smoke-identity-session-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 615,
            "ok": true,
            "script": "scripts/smoke-gateway-event-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1244,
            "ok": true,
            "script": "scripts/smoke-permission-decision-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 777,
            "ok": true,
            "script": "scripts/smoke-sandbox-decision-timelines.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 698,
            "ok": true,
            "script": "scripts/smoke-gateway-event-learning-candidate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 686,
            "ok": true,
            "script": "scripts/smoke-provider-fallback-route-decision.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2176,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-queue.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1250,
            "ok": true,
            "script": "scripts/smoke-learning-candidate-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1158,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1880,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-stop-condition.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1982,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5341,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 29110,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 926,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 57046
      }
    },
    {
      "durationMs": 14274,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 280,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 2201,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 283,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 185,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 2476,
      "timeoutMs": 1200000
    }
  ],
  "liveValidation": [
    {
      "provider": "openai",
      "reason": "Missing OPENAI_API_KEY",
      "status": "skipped"
    },
    {
      "provider": "anthropic",
      "reason": "Missing ANTHROPIC_API_KEY",
      "status": "skipped"
    },
    {
      "provider": "local",
      "reason": "Missing LOCAL_PROVIDER_MODEL",
      "status": "skipped"
    }
  ],
  "ok": true,
  "mode": "execution-v1-verification"
}
```
