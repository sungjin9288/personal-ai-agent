# Demo Evidence Index v1

- status: current-local-recorded-evidence
- publicHostedDemoUrl: none
- productionReadyClaim: false
- sourceSummary: [representative-release-demo-summary.json](../evidence/output-artifacts/representative-release-demo-summary.json)
- sourceReplayLog: [representative-release-demo-replay.log](../evidence/cli-logs/representative-release-demo-replay.log)
- sourceBrowserReport: [representative-release-demo-browser-e2e.json](../evidence/output-artifacts/representative-release-demo-browser-e2e.json)
- sourcePreview: [representative-release-demo-preview.png](../evidence/screenshots/representative-release-demo-preview.png)
- sourceScreenshot: [representative-release-demo-release-status.png](../evidence/screenshots/representative-release-demo-release-status.png)
- relatedWalkthrough: [demo-scenarios-v1.md](demo-scenarios-v1.md)

## Purpose

This index gives reviewers one stable entry point for the current representative demo evidence. It is a recorded local replay, not a public hosted demo URL.

The evidence supports the scoped claim that this repository has a credential-free representative walkthrough for a provider-scoped local-first pilot boundary. It does not support a production-ready, all-provider-complete, or hosted SaaS claim.

## Current Recorded Replay

| Field | Value |
|---|---|
| Demo | Representative Demo: Release Readiness Evidence Walkthrough |
| Captured at | 2026-06-22T06:11:00.579Z |
| Captured commit | `b89e5f1060f6a4771855acfdd6490f40f6a04454` |
| Credential-free | yes |
| Production-ready claim | false |
| Replay command count | 6 |
| Replay status | all recorded commands exited with status `0` |

## Evidence Files

| Evidence | Path | SHA-256 |
|---|---|---|
| Replay log | `evidence/cli-logs/representative-release-demo-replay.log` | `a8ac9deff193fd4e88dbc3d5295767be7b3df960185ebe31e6e141b35318b8bd` |
| Replay summary | `evidence/output-artifacts/representative-release-demo-summary.json` | `25456d1c164f078f1153c1c607ad221ed1e9c437f3976755950744a3e54975bd` |
| Browser E2E report | `evidence/output-artifacts/representative-release-demo-browser-e2e.json` | `86c8b928d7b5dedf102d23b68185272379030df144343ab7ac7fc2929d1db5f6` |
| README preview screenshot | `evidence/screenshots/representative-release-demo-preview.png` | `a2d9c386c3a2ae40bbb35a2bb908bddcf66cca98d5c27010113916690c9b8fec` |
| Release status screenshot | `evidence/screenshots/representative-release-demo-release-status.png` | `be3dead0aabaf8330e1ed40009fa4c26a261fd6ca632ead88acf044ee5bd0a6a` |

![Representative demo preview](../evidence/screenshots/representative-release-demo-preview.png)

## Replay Commands

The recorded replay summary contains these credential-free commands:

```bash
npm run smoke:representative-demo
npm run smoke:execution-v1-status
npm run smoke:execution-v1-snapshot
npm run smoke:execution-v1-handoff
npm run smoke:release-artifact-hygiene
npm run smoke:pilot-export-package
```

For the shortest local replay, use:

```bash
npm run demo:local
```

To refresh the recorded evidence files after intentional demo changes, run:

```bash
npm run evidence:representative-demo
npm run smoke:demo-evidence-index
npm run smoke:representative-demo-evidence
```

## Claim Boundary

- There is no public hosted demo URL.
- The current evidence is a local recorded replay plus screenshot and browser report.
- The demo remains credential-free and should not require OpenAI, Anthropic, local provider, or Hermes credentials.
- Production readiness remains explicitly blocked by release readiness evidence.
- Anthropic, Hermes, hosted SaaS, and target local provider production claims remain outside the current evidence boundary.
