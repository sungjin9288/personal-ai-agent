# Execution v1 Evidence

- archivedAt: 2026-05-05T12:17:53.829Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T12:17:41.401Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: e295cea1f7c11c573b9d568c1b37a09fd546c659
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

- smoke:execution-flow: 1.2s elapsed, stdout 420B, stderr 0B, timeout 60.0m
- smoke:execution-cli: 848ms elapsed, stdout 324B, stderr 0B, timeout 60.0m
- smoke:ui-execution-console: 892ms elapsed, stdout 343B, stderr 0B, timeout 60.0m
- smoke:ui-execution-browser-e2e: 9.7m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 60.0m
- smoke:reference-adoptions: 35.9s elapsed, stdout 2.9KiB, stderr 0B, timeout 60.0m
- smoke:execution-v1-live-helpers: 19.1s elapsed, stdout 325B, stderr 0B, timeout 60.0m
- smoke:execution-v1-handoff: 423ms elapsed, stdout 419B, stderr 0B, timeout 60.0m
- smoke:production-readiness-gate: 333ms elapsed, stdout 1.3KiB, stderr 0B, timeout 60.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 35.5s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (593ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (287ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (508ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (825ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (1.0s, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (1.0s, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.5s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (226ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (696ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (666ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (344ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (2.9s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.4s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (17.3s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (1.2s, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 2510d4c0d5bdc8739bf5908edbbb902f307223825e366b12ddd9fd6ec737a736

## Live Validation

- openai: passed (missionId=mission_20260505121622_3705b9, executionSessionId=execsession_20260505121739_6d351c, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-z5vaOk | workspaceId=workspace_20260505121740_55f7cd | missionId=mission_20260505121740_06d336 | artifact=manager-prompt.md | sessionId=session_20260505121740_5b6c0a | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-z5vaOk
  - workspaceId: workspace_20260505121740_55f7cd
  - missionId: mission_20260505121740_06d336
  - sessionId: session_20260505121740_5b6c0a
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
      "durationMs": 1176,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 848,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 892,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 584499,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7102,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 35935,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3016,
      "timeoutMs": 3600000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 593,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 287,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 508,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 825,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1019,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1027,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2539,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 226,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 696,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 666,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 344,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2948,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5380,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 17275,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1160,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 35493
      }
    },
    {
      "durationMs": 19073,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 423,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 333,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 1301,
      "timeoutMs": 3600000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505121739_6d351c",
      "missionId": "mission_20260505121622_3705b9",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-6cTaH3",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505121622_8d6ea7"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-z5vaOk | workspaceId=workspace_20260505121740_55f7cd | missionId=mission_20260505121740_06d336 | artifact=manager-prompt.md | sessionId=session_20260505121740_5b6c0a | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
