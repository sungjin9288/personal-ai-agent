# Execution v1 Evidence

- archivedAt: 2026-05-05T01:41:56.013Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T01:41:47.407Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: d6bc909d19b0cef037e36168d5184e2eb3fb1e88
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

- smoke:execution-flow: 1.1s elapsed, stdout 420B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 571ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 731ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 8.1m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 23.9s elapsed, stdout 2.9KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 9.4s elapsed, stdout 325B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 201ms elapsed, stdout 419B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 167ms elapsed, stdout 908B, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 23.7s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (232ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (87ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (197ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (348ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (3.3s, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (326ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (76ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (190ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (283ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (164ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.1s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (9.1s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (890ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 8c11ff96e0fca7ef979ea633afafee4c338358873404ab2f22960b152ca169b7

## Live Validation

- openai: passed (missionId=mission_20260505014020_7c57f0, executionSessionId=execsession_20260505014146_7c7b7c, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-Hs8Fv1 | workspaceId=workspace_20260505014146_ecd13c | missionId=mission_20260505014146_73da8b | artifact=manager-prompt.md | sessionId=session_20260505014146_d9a703 | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-Hs8Fv1
  - workspaceId: workspace_20260505014146_ecd13c
  - missionId: mission_20260505014146_73da8b
  - sessionId: session_20260505014146_d9a703
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
      "durationMs": 1060,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 571,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 731,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 483585,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7103,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 23880,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3011,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 232,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 87,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 197,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 348,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 3321,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 326,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2152,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 76,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 190,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 283,
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
            "durationMs": 1052,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5289,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 9116,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 890,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 23723
      }
    },
    {
      "durationMs": 9375,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 201,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 167,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 908,
      "timeoutMs": 1200000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505014146_7c7b7c",
      "missionId": "mission_20260505014020_7c57f0",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-AMwLcR",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505014020_e3b8ba"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-Hs8Fv1 | workspaceId=workspace_20260505014146_ecd13c | missionId=mission_20260505014146_73da8b | artifact=manager-prompt.md | sessionId=session_20260505014146_d9a703 | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
