# Execution v1 Evidence

- archivedAt: 2026-05-05T15:38:53.168Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T15:38:41.890Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: a08bec457ca8887403a8cac04698dd624fb8ff47
- mode: execution-v1-verification
- liveFlags: --live-openai, --live-anthropic

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

- smoke:execution-flow: 1.8s elapsed, stdout 420B, stderr 0B, timeout 30.0m
- smoke:execution-cli: 1.1s elapsed, stdout 324B, stderr 0B, timeout 30.0m
- smoke:ui-execution-console: 973ms elapsed, stdout 343B, stderr 0B, timeout 30.0m
- smoke:ui-execution-browser-e2e: 8.9m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 30.0m
- smoke:reference-adoptions: 22.9s elapsed, stdout 2.9KiB, stderr 0B, timeout 30.0m
- smoke:execution-v1-live-helpers: 10.0s elapsed, stdout 325B, stderr 0B, timeout 30.0m
- smoke:execution-v1-handoff: 225ms elapsed, stdout 419B, stderr 0B, timeout 30.0m
- smoke:production-readiness-gate: 178ms elapsed, stdout 1.5KiB, stderr 0B, timeout 30.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 22.7s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (263ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (92ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (220ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (388ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (628ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (592ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (82ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (210ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (303ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (210ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (10.1s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (947ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 388d7e386eae13fc10213e168ed5df57f8dd5996b35901f36fedf85df2229515

## Live Validation

- openai: passed (missionId=mission_20260505153709_515c03, executionSessionId=execsession_20260505153841_d0f8e5, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-HEb3u0 | workspaceId=workspace_20260505153841_4ebb72 | missionId=mission_20260505153841_ae287b | artifact=manager-prompt.md | sessionId=session_20260505153841_42c4f5 | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-HEb3u0
  - workspaceId: workspace_20260505153841_4ebb72
  - missionId: mission_20260505153841_ae287b
  - sessionId: session_20260505153841_42c4f5
  - artifact: manager-prompt.md
  - missionStatus: failed
  - providerId: anthropic
  - failedRole: manager
  - failureKind: http-status
  - httpStatus: 400
  - providerMessage: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.
  - recoverable: false
  - timedOut: false

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
      "durationMs": 1836,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 1134,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 973,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 531750,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7103,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 22890,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3011,
      "timeoutMs": 1800000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 263,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 92,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 220,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 388,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 628,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 592,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2165,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 82,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 210,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 303,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 210,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1203,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5307,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 10112,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 947,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 22722
      }
    },
    {
      "durationMs": 9985,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 225,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 178,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 1496,
      "timeoutMs": 1800000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505153841_d0f8e5",
      "missionId": "mission_20260505153709_515c03",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-yrqNRf",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505153709_5f1637"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-HEb3u0 | workspaceId=workspace_20260505153841_4ebb72 | missionId=mission_20260505153841_ae287b | artifact=manager-prompt.md | sessionId=session_20260505153841_42c4f5 | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
