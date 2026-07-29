# Execution v1 Evidence

- generatedAt: 2026-07-29T05:09:31.030Z
- branch: codex/council-rebuttal-stability-chair-reachability-shadow
- commit: 40740effe0d396257a6b04473f7438d78a023fc1
- mode: execution-v1-verification
- liveFlags: none
- liveValidationMode: archived-preserved-not-rerun
- archivedLiveValidationSourceGeneratedAt: 2026-07-22T14:21:18.412Z
- archivedLiveValidationSourceCommit: cc19deb60f3d6f948f5be7b1991df532298be922
- archivedLiveValidationProviders: openai, anthropic, local

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

- smoke:execution-flow: 1.4s elapsed, stdout 420B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 872ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 827ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 6.3m elapsed, stdout 7.1KiB, stderr 8.7KiB, timeout 20.0m
- smoke:reference-adoptions: 56.7s elapsed, stdout 6.0KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 12.7s elapsed, stdout 391B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 2.4s elapsed, stdout 438B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 293ms elapsed, stdout 2.5KiB, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 31
- totalDuration: 56.5s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (416ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (118ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (304ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (568ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (656ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (631ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (4.0s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (74ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (306ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (485ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (280ms, timeout 5.0m, timedOut false)
- scripts/smoke-openclaw-hermes-orchestration-docs.mjs: passed (54ms, timeout 5.0m, timedOut false)
- scripts/smoke-channel-adapter-seam.mjs: passed (578ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-context-records.mjs: passed (800ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-audit-surface.mjs: passed (594ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-audit-surface.mjs: passed (757ms, timeout 5.0m, timedOut false)
- scripts/smoke-permission-decision-records.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-sandbox-decision-timelines.mjs: passed (704ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-learning-candidate.mjs: passed (718ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-fallback-route-decision.mjs: passed (690ms, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-queue.mjs: passed (2.3s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-candidate-audit-surface.mjs: passed (1.4s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-gate.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-stop-condition.mjs: passed (1.4s, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.5s, timeout 5.0m, timedOut false)
- scripts/smoke-council-stub-runtime.mjs: passed (392ms, timeout 5.0m, timedOut false)
- scripts/smoke-ui-council-board.mjs: passed (678ms, timeout 5.0m, timedOut false)
- scripts/smoke-council-quality-comparison.mjs: passed (769ms, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (26.6s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (902ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: f6a57cd15e106d750562c101b1d0e2e518b31954590354e5c9ae0000210502e3

## Archived Live Validation (not rerun in this refresh)

- sourceGeneratedAt: 2026-07-22T14:21:18.412Z
- sourceCommit: cc19deb60f3d6f948f5be7b1991df532298be922
- currentRefreshReranProviders: none

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
- live provider 결과는 위 source commit에서 보존되었으며 이번 refresh에서 재실행되지 않음

## Raw Summary

```json
{
  "deterministic": [
    {
      "durationMs": 1361,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 872,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 827,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 378449,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8896,
      "stdoutBytes": 7226,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 56689,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 6132,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 31,
        "scripts": [
          {
            "durationMs": 416,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 118,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 304,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 568,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 656,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 631,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 4002,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 74,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 306,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 485,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 280,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 54,
            "ok": true,
            "script": "scripts/smoke-openclaw-hermes-orchestration-docs.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 578,
            "ok": true,
            "script": "scripts/smoke-channel-adapter-seam.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 800,
            "ok": true,
            "script": "scripts/smoke-identity-session-context-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 594,
            "ok": true,
            "script": "scripts/smoke-identity-session-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 757,
            "ok": true,
            "script": "scripts/smoke-gateway-event-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1227,
            "ok": true,
            "script": "scripts/smoke-permission-decision-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 704,
            "ok": true,
            "script": "scripts/smoke-sandbox-decision-timelines.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 718,
            "ok": true,
            "script": "scripts/smoke-gateway-event-learning-candidate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 690,
            "ok": true,
            "script": "scripts/smoke-provider-fallback-route-decision.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2308,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-queue.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1398,
            "ok": true,
            "script": "scripts/smoke-learning-candidate-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1223,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1412,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-stop-condition.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1521,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 392,
            "ok": true,
            "script": "scripts/smoke-council-stub-runtime.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 678,
            "ok": true,
            "script": "scripts/smoke-ui-council-board.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 769,
            "ok": true,
            "script": "scripts/smoke-council-quality-comparison.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5332,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 26647,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 902,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 56544
      }
    },
    {
      "durationMs": 12705,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 391,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 2423,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 438,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 293,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 2588,
      "timeoutMs": 1200000
    }
  ],
  "liveValidation": [],
  "ok": true,
  "mode": "execution-v1-verification"
}
```
