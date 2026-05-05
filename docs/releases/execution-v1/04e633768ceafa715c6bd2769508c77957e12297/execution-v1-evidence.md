# Execution v1 Evidence

- archivedAt: 2026-05-05T08:42:45.673Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-05T08:42:29.398Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: 04e633768ceafa715c6bd2769508c77957e12297
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

- smoke:execution-flow: 2.3s elapsed, stdout 420B, stderr 0B, timeout 60.0m
- smoke:execution-cli: 1.8s elapsed, stdout 324B, stderr 0B, timeout 60.0m
- smoke:ui-execution-console: 1.4s elapsed, stdout 343B, stderr 0B, timeout 60.0m
- smoke:ui-execution-browser-e2e: 12.2m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 60.0m
- smoke:reference-adoptions: 46.9s elapsed, stdout 2.9KiB, stderr 0B, timeout 60.0m
- smoke:execution-v1-live-helpers: 35.0s elapsed, stdout 325B, stderr 0B, timeout 60.0m
- smoke:execution-v1-handoff: 607ms elapsed, stdout 419B, stderr 0B, timeout 60.0m
- smoke:production-readiness-gate: 433ms elapsed, stdout 1.2KiB, stderr 0B, timeout 60.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 46.5s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (514ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (338ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (560ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (824ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (1.5s, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (966ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.4s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (191ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (555ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (693ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (370ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (2.6s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.4s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (28.0s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (1.6s, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 13d9fd97ebb330df7304965b99189a08eac4eb8accf2a9b63ffe7c7527b9f5fc

## Live Validation

- openai: passed (missionId=mission_20260505084117_51b8c9, executionSessionId=execsession_20260505084228_c6df38, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-vcHIV6 | workspaceId=workspace_20260505084228_fd431d | missionId=mission_20260505084228_d69e5f | artifact=manager-prompt.md | sessionId=session_20260505084228_80516a | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-vcHIV6
  - workspaceId: workspace_20260505084228_fd431d
  - missionId: mission_20260505084228_d69e5f
  - sessionId: session_20260505084228_80516a
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
      "durationMs": 2337,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 1838,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 1372,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 731334,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7102,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 46858,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3015,
      "timeoutMs": 3600000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 514,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 338,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 560,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 824,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1499,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 966,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2385,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 191,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 555,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 693,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 370,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2602,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5420,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 27964,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1633,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 46514
      }
    },
    {
      "durationMs": 34981,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 607,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 3600000
    },
    {
      "durationMs": 433,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 1257,
      "timeoutMs": 3600000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260505084228_c6df38",
      "missionId": "mission_20260505084117_51b8c9",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-Yejh4U",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260505084117_3754ea"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-vcHIV6 | workspaceId=workspace_20260505084228_fd431d | missionId=mission_20260505084228_d69e5f | artifact=manager-prompt.md | sessionId=session_20260505084228_80516a | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
