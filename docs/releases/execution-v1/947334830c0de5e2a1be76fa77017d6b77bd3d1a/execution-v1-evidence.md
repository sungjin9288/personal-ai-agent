# Execution v1 Evidence

- archivedAt: 2026-05-04T09:28:18.359Z
- sourcePath: docs/execution-v1-evidence.md

- generatedAt: 2026-05-04T09:28:12.678Z
- branch: codex/managed-multi-agent-v1-foundation
- commit: 947334830c0de5e2a1be76fa77017d6b77bd3d1a
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
- smoke:execution-cli: 707ms elapsed, stdout 324B, stderr 0B, timeout 20.0m
- smoke:ui-execution-console: 798ms elapsed, stdout 343B, stderr 0B, timeout 20.0m
- smoke:ui-execution-browser-e2e: 8.3m elapsed, stdout 6.9KiB, stderr 8.6KiB, timeout 20.0m
- smoke:reference-adoptions: 36.6s elapsed, stdout 2.9KiB, stderr 0B, timeout 20.0m
- smoke:execution-v1-live-helpers: 14.5s elapsed, stdout 325B, stderr 0B, timeout 20.0m
- smoke:execution-v1-handoff: 380ms elapsed, stdout 419B, stderr 0B, timeout 20.0m
- smoke:production-readiness-gate: 278ms elapsed, stdout 508B, stderr 0B, timeout 20.0m

## Reference Adoption Aggregate

- scriptCount: 15
- totalDuration: 36.3s
- ok: true

- scripts/smoke-output-compaction.mjs: passed (396ms, timeout 5.0m, timedOut false)
- scripts/smoke-provider-capability-rate-guard.mjs: passed (129ms, timeout 5.0m, timedOut false)
- scripts/smoke-hermes-provider.mjs: passed (313ms, timeout 5.0m, timedOut false)
- scripts/smoke-mission-quality-gate.mjs: passed (599ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion.mjs: passed (687ms, timeout 5.0m, timedOut false)
- scripts/smoke-document-conversion-diagnostics.mjs: passed (842ms, timeout 5.0m, timedOut false)
- scripts/smoke-runtime-discovery.mjs: passed (2.3s, timeout 5.0m, timedOut false)
- scripts/smoke-visual-evidence-manifest.mjs: passed (144ms, timeout 5.0m, timedOut false)
- scripts/smoke-retrieval-memory.mjs: passed (417ms, timeout 5.0m, timedOut false)
- scripts/smoke-fact-graph-memory.mjs: passed (583ms, timeout 5.0m, timedOut false)
- scripts/smoke-instruction-boundary-fixture.mjs: passed (319ms, timeout 5.0m, timedOut false)
- scripts/smoke-orchestration-profiles.mjs: passed (2.2s, timeout 5.0m, timedOut false)
- scripts/smoke-ui-agent-blueprints.mjs: passed (5.4s, timeout 5.0m, timedOut false)
- scripts/smoke-parallel-specialists.mjs: passed (20.7s, timeout 5.0m, timedOut false)
- scripts/smoke-process-timeout-utils.mjs: passed (1.4s, timeout 5.0m, timedOut false)

## Visual Evidence Manifest

- outputPath: output/playwright/execution-v1-visual-evidence-manifest.json
- available: 2
- missing: 0
- visualArtifactCount: 1
- artifactSetSha256: 1d4a9a3f25f7f5aef73ec7eee256643bed69cc8b210f1bc059edbe25e3d19efd

## Live Validation

- openai: passed (missionId=mission_20260504092635_a16716, executionSessionId=execsession_20260504092812_48cf14, verification=passed)
- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-wJMzYP | workspaceId=workspace_20260504092812_d0803c | missionId=mission_20260504092812_5d3388 | artifact=manager-prompt.md | sessionId=session_20260504092812_2652ff | missionStatus=failed)
  - failure: anthropic live mission run failed
  - rootDir: <temp>/personal-ai-agent-live-anthropic-wJMzYP
  - workspaceId: workspace_20260504092812_d0803c
  - missionId: mission_20260504092812_5d3388
  - sessionId: session_20260504092812_2652ff
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
      "durationMs": 1080,
      "script": "smoke:execution-flow",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 420,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 707,
      "script": "smoke:execution-cli",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 324,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 798,
      "script": "smoke:ui-execution-console",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 343,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 498655,
      "script": "smoke:ui-execution-browser-e2e",
      "status": "passed",
      "stderrBytes": 8840,
      "stdoutBytes": 7102,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 36608,
      "script": "smoke:reference-adoptions",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 3014,
      "timeoutMs": 1200000,
      "referenceAdoptionSummary": {
        "mode": "reference-adoptions-smoke",
        "ok": true,
        "scriptCount": 15,
        "scripts": [
          {
            "durationMs": 396,
            "ok": true,
            "script": "scripts/smoke-output-compaction.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 129,
            "ok": true,
            "script": "scripts/smoke-provider-capability-rate-guard.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 313,
            "ok": true,
            "script": "scripts/smoke-hermes-provider.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 599,
            "ok": true,
            "script": "scripts/smoke-mission-quality-gate.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 687,
            "ok": true,
            "script": "scripts/smoke-document-conversion.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 842,
            "ok": true,
            "script": "scripts/smoke-document-conversion-diagnostics.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2296,
            "ok": true,
            "script": "scripts/smoke-runtime-discovery.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 144,
            "ok": true,
            "script": "scripts/smoke-visual-evidence-manifest.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 417,
            "ok": true,
            "script": "scripts/smoke-retrieval-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 583,
            "ok": true,
            "script": "scripts/smoke-fact-graph-memory.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 319,
            "ok": true,
            "script": "scripts/smoke-instruction-boundary-fixture.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 2215,
            "ok": true,
            "script": "scripts/smoke-orchestration-profiles.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 5355,
            "ok": true,
            "script": "scripts/smoke-ui-agent-blueprints.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 20666,
            "ok": true,
            "script": "scripts/smoke-parallel-specialists.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          },
          {
            "durationMs": 1381,
            "ok": true,
            "script": "scripts/smoke-process-timeout-utils.mjs",
            "timedOut": false,
            "timeoutMs": 300000
          }
        ],
        "totalDurationMs": 36342
      }
    },
    {
      "durationMs": 14488,
      "script": "smoke:execution-v1-live-helpers",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 325,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 380,
      "script": "smoke:execution-v1-handoff",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 419,
      "timeoutMs": 1200000
    },
    {
      "durationMs": 278,
      "script": "smoke:production-readiness-gate",
      "status": "passed",
      "stderrBytes": 0,
      "stdoutBytes": 508,
      "timeoutMs": 1200000
    }
  ],
  "liveValidation": [
    {
      "executionSessionId": "execsession_20260504092812_48cf14",
      "missionId": "mission_20260504092635_a16716",
      "provider": "openai",
      "rootDir": "<temp>/personal-ai-agent-live-openai-ZbApFI",
      "status": "passed",
      "verificationStatus": "passed",
      "workspaceId": "workspace_20260504092635_81f4e4"
    },
    {
      "provider": "anthropic",
      "reason": "anthropic live mission run failed | rootDir=<temp>/personal-ai-agent-live-anthropic-wJMzYP | workspaceId=workspace_20260504092812_d0803c | missionId=mission_20260504092812_5d3388 | artifact=manager-prompt.md | sessionId=session_20260504092812_2652ff | missionStatus=failed",
      "status": "failed"
    }
  ],
  "ok": false,
  "mode": "execution-v1-verification"
}
```
