# Execution v1 Evidence

- archivedAt: 2026-06-02T08:05:07.556Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-06-02T08:04:59.135Z
- branch: codex/release-blocker-handoff-cli
- commit: f242f0fc8eeee77cf788b771137227e708b6c9de
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
- smoke:execution-cli: 700ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 721ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 7.0m elapsed, stdout 7.1KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 44.0s elapsed, stdout 5.4KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 9.9s elapsed, stdout 391B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 3.1s elapsed, stdout 413B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 142ms elapsed, stdout 2.5KiB, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 28
- totalDuration: 43.9s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (222ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (83ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (179ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (343ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (576ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (524ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (3.5s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (65ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (213ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (286ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (151ms, timeout 5.0m, timedOut false)
- scripts/smoke-openclaw-hermes-orchestration-docs.mjs: passed (38ms, timeout 5.0m, timedOut false)
- scripts/smoke-channel-adapter-seam.mjs: passed (377ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-context-records.mjs: passed (542ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-audit-surface.mjs: passed (391ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-audit-surface.mjs: passed (421ms, timeout 5.0m, timedOut false)
- scripts/smoke-permission-decision-records.mjs: passed (909ms, timeout 5.0m, timedOut false)
- scripts/smoke-sandbox-decision-timelines.mjs: passed (516ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-learning-candidate.mjs: passed (533ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-fallback-route-decision.mjs: passed (537ms, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-queue.mjs: passed (1.5s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-candidate-audit-surface.mjs: passed (731ms, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-gate.mjs: passed (677ms, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-stop-condition.mjs: passed (936ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (996ms, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (22.4s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (879ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 317ff182f395590f3bc1d647a62e23ef07bed238405b4018b6db7effd1f3fe15

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
      "durationMs": 1138,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 700,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 721,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 421896,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7225,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 43986,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 5566,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 28,
        "scripts": [
          {
            "durationMs": 222,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 83,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 179,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 343,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 576,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 524,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 3496,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 65,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 213,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 286,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 151,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 38,
            "ok": true,
            "script": "scripts/smoke-openclaw-hermes-orchestration-docs.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 377,
            "ok": true,
            "script": "scripts/smoke-channel-adapter-seam.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 542,
            "ok": true,
            "script": "scripts/smoke-identity-session-context-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 391,
            "ok": true,
            "script": "scripts/smoke-identity-session-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 421,
            "ok": true,
            "script": "scripts/smoke-gateway-event-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 909,
            "ok": true,
            "script": "scripts/smoke-permission-decision-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 516,
            "ok": true,
            "script": "scripts/smoke-sandbox-decision-timelines.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 533,
            "ok": true,
            "script": "scripts/smoke-gateway-event-learning-candidate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 537,
            "ok": true,
            "script": "scripts/smoke-provider-fallback-route-decision.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1505,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-queue.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 731,
            "ok": true,
            "script": "scripts/smoke-learning-candidate-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 677,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 936,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-stop-condition.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 996,
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
            "durationMs": 22447,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 879,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 43862
      }
    },
    {
      "durationMs": 9902,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 391,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 3055,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 413,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 142,
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
