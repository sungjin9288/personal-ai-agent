# Execution v1 Evidence

- archivedAt: 2026-05-04T10:31:00.792Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-04T10:30:52.422Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: 3e6afca33f9891294b58839b6bb6b76645430803
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

- smoke:execution-flow: 1.3s elapsed, stdout 420B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 980ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 972ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 8.4m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 27.2s elapsed, stdout 2.9KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 12.7s elapsed, stdout 325B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 279ms elapsed, stdout 419B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 247ms elapsed, stdout 625B, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 26.9s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (364ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (119ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (266ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (459ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (592ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (750ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.3s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (231ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (387ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (459ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (262ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.5s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (13.0s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (961ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: f889d72f59e356f141040617653b41cb2320f39239e2577eaff8300d1eba6d72

## Live Validation

- openai: passed (missionId=mission_20260504102924_685a0c, executionSessionId=execsession_20260504103051_e32469, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-CzTm7h | workspaceId=workspace_20260504103051_ab4c8b | missionId=mission_20260504103051_d4c804 | artifact=manager-prompt.md | sessionId=session_20260504103051_d075a6 | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-CzTm7h
  - workspaceId: workspace_20260504103051_ab4c8b
  - missionId: mission_20260504103051_d4c804
  - sessionId: session_20260504103051_d075a6
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
      "durationMs": 1274,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 980,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 972,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 501957,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7102,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 27155,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3013,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 364,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 119,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 266,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 459,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 592,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 750,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2251,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 231,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 387,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 459,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 262,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1536,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5323,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 12972,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 961,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 26932
      }
    },
    {
      "durationMs": 12714,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 279,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 247,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 625,
      "timeoutMs": 1200000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260504103051_e32469",
      "missionId": "mission_20260504102924_685a0c",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-86w2xU",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260504102924_b2af06"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-CzTm7h | workspaceId=workspace_20260504103051_ab4c8b | missionId=mission_20260504103051_d4c804 | artifact=manager-prompt.md | sessionId=session_20260504103051_d075a6 | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
