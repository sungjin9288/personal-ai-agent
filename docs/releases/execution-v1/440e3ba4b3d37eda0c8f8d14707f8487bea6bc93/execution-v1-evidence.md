# Execution v1 Evidence

- archivedAt: 2026-05-05T14:44:52.189Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T14:44:39.334Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: 440e3ba4b3d37eda0c8f8d14707f8487bea6bc93
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

- smoke:execution-flow: 2.3s elapsed, stdout 420B, stderr 0B, timeout 30.0m
- smoke:execution-cli: 1.4s elapsed, stdout 324B, stderr 0B, timeout 30.0m
- smoke:ui-execution-console: 1.3s elapsed, stdout 343B, stderr 0B, timeout 30.0m
- smoke:ui-execution-browser-e2e: 9.4m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 30.0m
- smoke:reference-adoptions: 21.7s elapsed, stdout 2.9KiB, stderr 0B, timeout 30.0m
- smoke:execution-v1-live-helpers: 9.5s elapsed, stdout 325B, stderr 0B, timeout 30.0m
- smoke:execution-v1-handoff: 207ms elapsed, stdout 419B, stderr 0B, timeout 30.0m
- smoke:production-readiness-gate: 157ms elapsed, stdout 1.4KiB, stderr 0B, timeout 30.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 21.5s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (237ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (89ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (208ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (352ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (640ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (550ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (77ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (201ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (288ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (164ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.1s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (9.3s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (897ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 168e780c365145060f824dd7500401d6872fe9d4be825b2069df140c19ac9652

## Live Validation

- openai: passed (missionId=mission_20260505144256_e271d3, executionSessionId=execsession_20260505144438_6f61c7, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-bydS5M | workspaceId=workspace_20260505144438_0662ee | missionId=mission_20260505144438_589d19 | artifact=manager-prompt.md | sessionId=session_20260505144438_7a934a | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-bydS5M
  - workspaceId: workspace_20260505144438_0662ee
  - missionId: mission_20260505144438_589d19
  - sessionId: session_20260505144438_7a934a
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
      "durationMs": 2259,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 1428,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 1308,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 564586,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7103,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 21683,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3010,
      "timeoutMs": 1800000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 237,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 89,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 208,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 352,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 640,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 550,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2156,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 77,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 201,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 288,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 164,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1082,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5291,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 9283,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 897,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 21515
      }
    },
    {
      "durationMs": 9537,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 207,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 1800000
    },
    {
      "durationMs": 157,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 1393,
      "timeoutMs": 1800000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505144438_6f61c7",
      "missionId": "mission_20260505144256_e271d3",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-UkvT4g",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505144256_557073"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-bydS5M | workspaceId=workspace_20260505144438_0662ee | missionId=mission_20260505144438_589d19 | artifact=manager-prompt.md | sessionId=session_20260505144438_7a934a | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
