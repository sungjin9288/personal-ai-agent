# Execution v1 Evidence

- archivedAt: 2026-06-15T12:35:11.041Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-06-15T12:35:00.173Z
- branch: codex/learning-promotion-rollback-button-renderer
- commit: 70d8693a1d6919c2bf6951e3970efce24afebffe
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

- smoke:execution-flow: 1.4s elapsed, stdout 421B, stderr 0B, timeout 20.0m
- smoke:execution-cli: 963ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 1.2s elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 7.4m elapsed, stdout 7.1KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 1.3m elapsed, stdout 5.4KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 12.6s elapsed, stdout 391B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 2.9s elapsed, stdout 429B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 257ms elapsed, stdout 2.5KiB, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 28
- totalDuration: 1.3m
- ok: true

- scripts/smoke-output-compaction.mjs: passed (316ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (116ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (300ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (539ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (1.8s, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (525ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (5.1s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (88ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (349ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (625ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (248ms, timeout 5.0m, timedOut false)
- scripts/smoke-openclaw-hermes-orchestration-docs.mjs: passed (60ms, timeout 5.0m, timedOut false)
- scripts/smoke-channel-adapter-seam.mjs: passed (797ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-context-records.mjs: passed (890ms, timeout 5.0m, timedOut false)
- scripts/smoke-identity-session-audit-surface.mjs: passed (566ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-audit-surface.mjs: passed (1.0s, timeout 5.0m, timedOut false)
- scripts/smoke-permission-decision-records.mjs: passed (1.5s, timeout 5.0m, timedOut false)
- scripts/smoke-sandbox-decision-timelines.mjs: passed (856ms, timeout 5.0m, timedOut false)
- scripts/smoke-gateway-event-learning-candidate.mjs: passed (1.2s, timeout 5.0m, timedOut false)
- scripts/smoke-provider-fallback-route-decision.mjs: passed (1.1s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-queue.mjs: passed (1.9s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-candidate-audit-surface.mjs: passed (1.3s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-gate.mjs: passed (1.6s, timeout 5.0m, timedOut false)
- scripts/smoke-learning-promotion-verification-stop-condition.mjs: passed (2.7s, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (1.6s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.3s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (45.4s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (895ms, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: e8344945c989529506e8b90a5343c24c8a7a2840826e4cfca7be364649aa5bf6

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
      "durationMs": 1450,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 421,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 963,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 1151,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 444963,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7226,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 78777,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 5576,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 28,
        "scripts": [
          {
            "durationMs": 316,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 116,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 300,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 539,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1753,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 525,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5067,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 88,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 349,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 625,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 248,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 60,
            "ok": true,
            "script": "scripts/smoke-openclaw-hermes-orchestration-docs.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 797,
            "ok": true,
            "script": "scripts/smoke-channel-adapter-seam.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 890,
            "ok": true,
            "script": "scripts/smoke-identity-session-context-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 566,
            "ok": true,
            "script": "scripts/smoke-identity-session-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1046,
            "ok": true,
            "script": "scripts/smoke-gateway-event-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1477,
            "ok": true,
            "script": "scripts/smoke-permission-decision-records.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 856,
            "ok": true,
            "script": "scripts/smoke-sandbox-decision-timelines.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1207,
            "ok": true,
            "script": "scripts/smoke-gateway-event-learning-candidate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1107,
            "ok": true,
            "script": "scripts/smoke-provider-fallback-route-decision.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1868,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-queue.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1294,
            "ok": true,
            "script": "scripts/smoke-learning-candidate-audit-surface.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1560,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2718,
            "ok": true,
            "script": "scripts/smoke-learning-promotion-verification-stop-condition.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1643,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5324,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 45358,
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
        "totalDurationMs": 78592
      }
    },
    {
      "durationMs": 12636,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 391,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 2865,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 429,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 257,
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
