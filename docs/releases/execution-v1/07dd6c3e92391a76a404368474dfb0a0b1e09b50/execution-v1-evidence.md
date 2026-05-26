# Execution v1 Evidence

- archivedAt: 2026-05-26T17:37:38.366Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-26T17:37:29.713Z
- branch: codex/execution-v1-artifacts-07dd6c3-refresh
- commit: 07dd6c3e92391a76a404368474dfb0a0b1e09b50
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

- smoke:execution-flow: 1.1s elapsed, stdout 420B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 635ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 754ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 7.3m elapsed, stdout 7.1KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 29.7s elapsed, stdout 2.9KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 10.9s elapsed, stdout 391B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 3.3s elapsed, stdout 424B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 173ms elapsed, stdout 2.5KiB, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 29.6s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (253ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (100ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (211ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (376ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (648ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (574ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.7s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (77ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (218ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (313ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (174ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.1s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (16.6s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (895ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: f1dc71cb96f55e5e0ad937b835be53adcd7be1c79e8ae8a9fa97b718e1403ba4

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
- local: passed (missionId=mission_20260511180026_e5920a, executionSessionId=execsession_20260511180103_885603, verification=passed)

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
      "durationMs": 1144,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 635,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 754,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 435679,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7226,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 29725,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3012,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 253,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 100,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 211,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 376,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 648,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 574,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2707,
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
            "durationMs": 218,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 313,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 174,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1111,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5299,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 16611,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 895,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 29567
      }
    },
    {
      "durationMs": 10877,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 391,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 3302,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 424,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 173,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 2587,
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
