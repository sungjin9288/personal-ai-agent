# Execution v1 Evidence

- archivedAt: 2026-05-05T07:20:55.178Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T07:20:42.213Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: 4bd56bd121b48e1ffdb495a4c37366d542937709
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

- smoke:execution-flow: 1.8s elapsed, stdout 420B, stderr 0B, timeout 60.0m
- smoke:execution-cli: 986ms elapsed, stdout 324B, stderr 0B, timeout 60.0m
- smoke:ui-execution-console: 1.0s elapsed, stdout 343B, stderr 0B, timeout 60.0m
- smoke:ui-execution-browser-e2e: 15.2m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 60.0m
- smoke:reference-adoptions: 23.0s elapsed, stdout 2.9KiB, stderr 0B, timeout 60.0m
- smoke:execution-v1-live-helpers: 11.1s elapsed, stdout 325B, stderr 0B, timeout 60.0m
- smoke:execution-v1-handoff: 349ms elapsed, stdout 419B, stderr 0B, timeout 60.0m
- smoke:production-readiness-gate: 352ms elapsed, stdout 1.2KiB, stderr 0B, timeout 60.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 22.8s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (385ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (110ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (230ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (358ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (642ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (566ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (99ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (231ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (331ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (191ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.1s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (10.0s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (919ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: f25e6ed1a7d0262a6d9d57dcf65b86582bd348517d4397abb458287a49db6453

## Live Validation

- openai: passed (missionId=mission_20260505071855_36b5b7, executionSessionId=execsession_20260505072039_7f6a8f, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-iuWOlU | workspaceId=workspace_20260505072039_969ecd | missionId=mission_20260505072039_6ed77c | artifact=manager-prompt.md | sessionId=session_20260505072039_9db0bb | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-iuWOlU
  - workspaceId: workspace_20260505072039_969ecd
  - missionId: mission_20260505072039_6ed77c
  - sessionId: session_20260505072039_9db0bb
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
      "durationMs": 1768,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 986,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 1040,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 909406,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7102,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 22958,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3012,
      "timeoutMs": 3600000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 385,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 110,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 230,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 358,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 642,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 566,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2211,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 99,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 231,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 331,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 191,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1149,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5308,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 10039,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 919,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 22769
      }
    },
    {
      "durationMs": 11099,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 349,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 352,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 1206,
      "timeoutMs": 3600000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505072039_7f6a8f",
      "missionId": "mission_20260505071855_36b5b7",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-8Hlte7",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505071855_e54f72"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-iuWOlU | workspaceId=workspace_20260505072039_969ecd | missionId=mission_20260505072039_6ed77c | artifact=manager-prompt.md | sessionId=session_20260505072039_9db0bb | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
