# Recorded Walkthrough v1

- status: published-walkthrough-verified
- publicHostedDemoUrl: https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4
- privateRecordedWalkthroughUrl: none
- releaseTag: walkthrough-v1
- releaseUrl: https://github.com/sungjin9288/personal-ai-agent/releases/tag/walkthrough-v1
- assetId: 507595206
- assetSizeBytes: 45936551
- assetSha256: 9b1655542dcf4f87a118d5094bd6be4743cbd9a4c3bd202cf1663e5f08c3ea47
- captureCommit: a4034fde5a47b7d246eab9573763663a366ca8ab
- accessPolicy: public GitHub release asset
- accessVerifiedAt: 2026-08-09T14:39:41Z
- accessVerification: unauthenticated HTTP 200 and exact byte/SHA match
- productionReadyClaim: false
- relatedDemoIndex: [demo-evidence-index-v1.md](demo-evidence-index-v1.md)
- relatedDemoScenarios: [demo-scenarios-v1.md](demo-scenarios-v1.md)
- relatedOperatorSurfaceEvidence: [operator-surface-demo-evidence-v1.md](operator-surface-demo-evidence-v1.md)

## Purpose

This document records the storyboard and publication evidence for the public portfolio walkthrough. The video is a public GitHub release asset, not a hosted interactive demo or production service.

The walkthrough should show the repository's strongest verified path: a credential-free local replay backed by release evidence, operator surface screenshots, browser reports, and smoke checks. It supports the scoped `provider-scoped pilot-ready` claim for the OpenAI-backed local-first/self-hosted path only.

## Recording Boundary

- Use a clean local checkout and run only credential-free commands.
- Do not show `.env`, provider keys, personal filesystem paths, private issue trackers, or external customer data.
- Keep `productionReadyClaim: false` visible in the narration and evidence.
- State that the public asset is a recorded walkthrough, not a hosted interactive demo.
- Treat Anthropic, Hermes, target local provider, hosted SaaS, production identity/session, tenant isolation, secret manager, observability/SLO, hosted interactive demo or production service URL, pilot feedback, and operating metrics as unverified or blocked unless new evidence is added.

## Pre-Recording Checklist

```bash
npm run demo:local -- --plan
npm run smoke:recorded-walkthrough
npm run smoke:demo-evidence-index
npm run smoke:operator-surface-demo-evidence
npm run smoke:release-artifact-hygiene
```

Required evidence before recording:

- `docs/demo-evidence-index-v1.md`
- `docs/demo-scenarios-v1.md`
- `docs/operator-surface-demo-evidence-v1.md`
- `evidence/cli-logs/representative-release-demo-replay.log`
- `evidence/output-artifacts/representative-release-demo-summary.json`
- `evidence/output-artifacts/representative-release-demo-browser-e2e.json`
- `evidence/output-artifacts/operator-surface-demo-browser-report.json`
- `evidence/screenshots/representative-release-demo-preview.png`
- `evidence/screenshots/representative-release-demo-release-status.png`
- `evidence/screenshots/operator-surface-mission-run.png`
- `evidence/screenshots/operator-surface-provider-readiness.png`
- `evidence/screenshots/operator-surface-action-inbox.png`

## Storyboard

| Segment | Target length | Screen | Narration goal | Evidence |
|---|---:|---|---|---|
| 1. Problem and boundary | 30 seconds | README Portfolio Overview | Explain why managed AI execution needs approval, provider state, artifacts, and evidence | `README.md`, `docs/demo-evidence-index-v1.md` |
| 2. One-command local replay | 60 seconds | Terminal | Show the credential-free command path and explain that it uses deterministic smoke evidence | `npm run demo:local -- --plan`, `npm run demo:local` |
| 3. Release readiness walkthrough | 90 seconds | Operator console release status | Show release status, blockers, handoff, snapshot, and `productionReadyClaim: false` boundary | `evidence/screenshots/representative-release-demo-release-status.png`, `docs/execution-v1-handoff.md` |
| 4. Mission run evidence | 60 seconds | Mission operator screenshot | Show that mission/session/artifact state exists beyond the release tab | `evidence/screenshots/operator-surface-mission-run.png` |
| 5. Provider readiness evidence | 60 seconds | Provider readiness screenshot | Explain provider registry, fallback/attention surfaces, and blocked provider claims | `evidence/screenshots/operator-surface-provider-readiness.png` |
| 6. Action inbox evidence | 45 seconds | Action inbox screenshot | Show how approval/follow-up work is kept visible | `evidence/screenshots/operator-surface-action-inbox.png` |
| 7. Close and limitations | 45 seconds | README Scope & Limitations | Close with what is verified, what remains blocked, and how a reviewer can rerun checks | `docs/roadmap.md`, `docs/pilot-export-package-v1.md` |

## Recording Commands

Use these commands during or immediately before recording:

```bash
npm run demo:local -- --plan
npm run smoke:recorded-walkthrough
npm run smoke:demo-evidence-index
npm run smoke:operator-surface-demo-evidence
```

Use this command only when refreshing evidence intentionally:

```bash
npm run evidence:operator-surface-demo
```

## Publication Evidence

| Field | Verified value |
|---|---|
| Public asset | [Personal AI Agent Recorded Walkthrough v1](https://github.com/sungjin9288/personal-ai-agent/releases/download/walkthrough-v1/personal-ai-agent-recorded-walkthrough-v1.mp4) |
| Release | [Recorded Walkthrough v1](https://github.com/sungjin9288/personal-ai-agent/releases/tag/walkthrough-v1) |
| Asset identity | ID `507595206`, 45,936,551 bytes |
| SHA-256 | `9b1655542dcf4f87a118d5094bd6be4743cbd9a4c3bd202cf1663e5f08c3ea47` |
| Capture | commit `a4034fde5a47b7d246eab9573763663a366ca8ab`, 390 seconds, 1920×1080 H.264, no audio |
| Privacy review | 17 representative frames, Korean/English OCR, full-stream decode, no machine-path or secret-pattern findings |
| Access check | unauthenticated download returned HTTP 200 and matched the recorded byte size and SHA-256 at `2026-08-09T14:39:41Z` |

The machine-readable observation is [config/public-walkthrough-v1.json](../config/public-walkthrough-v1.json). It is separate from the v0.1.0 Portfolio ZIP release identity and does not change the production-readiness boundary.

## Publication Checklist

Before replacing or republishing the current public recorded walkthrough URL:

- verify the URL is accessible in the intended access mode
- verify the recording contains no secrets, machine-local paths, private customer data, or personal account details
- verify the recording does not claim production readiness, hosted SaaS readiness, all-provider completion, real customer feedback, or operating metrics
- update `publicHostedDemoUrl` or `privateRecordedWalkthroughUrl` only after the replacement access is verified
- rerun `npm run smoke:recorded-walkthrough`, `npm run smoke:demo-evidence-index`, and `npm run smoke:release-artifact-hygiene`

## Acceptance Rule

This walkthrough publication remains valid when every required evidence file exists, the public asset record matches the verified URL, byte size, and SHA-256, `npm run smoke:recorded-walkthrough` passes, and the narrative keeps the video inside the credential-free local replay boundary without implying an interactive hosted service or production readiness.
