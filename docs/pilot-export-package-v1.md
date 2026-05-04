# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T09:55:47.775Z
- verifiedCommit: 180e686613129558d3c8f398b54af0ca3a741c71
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: e20a8b83f30b7e4c0443bffd44031058cc10401ec67e08c6c4fd35c5c34eb55f
- fileCount: 18
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 150243 | `934afa197cfd45054c0b008d59f4cb59ed25b732f6e3d238749df7dd4e455769` |
| `docs/product-plan-v1.md` | 10702 | `0fd39a01a151ae30fd1fb01afac627aa2dc049783786e1bee493b6ccd6fd04b5` |
| `docs/security-model-v1.md` | 14792 | `930572fd7076fb6ae689e6a8e9f5c224e5ea38aa013da4fe909a9d29d1c27260` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 13588 | `67a69f3195bdbe84fdfdaeb30310dae104dc724dcea8bb29aba197f3a206c97a` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/release-readiness-v1.md` | 9647 | `79d99d874df29f956a63fe9ebce6f0fd46432bc1b157c58b82a7138414fe5a4f` |
| `docs/production-like-release-drill-v1.md` | 4147 | `c2c8ae0dd10dd80726d232b3c4cf6e24f471f2b02272a7e7fcb7ca4b9015b95e` |
| `docs/execution-v1-evidence.md` | 10635 | `4fc2ef57be6ff3a4c294fd32f44cbde1a6234991557986911e4b01c392ff63b6` |
| `docs/execution-v1-closeout.md` | 3351 | `54c124369a81e981efae21a0c2eb26f28a5a84d5d4293c414c7e05ca569d6c84` |
| `docs/execution-v1-handoff.md` | 5241 | `437b33a0b64a45fa99ea4abae516c39ae34d2e41deeab96f344a8b0a715f3c88` |
| `docs/releases/execution-v1/180e686613129558d3c8f398b54af0ca3a741c71/execution-v1-evidence.md` | 10719 | `89c9d3fedf46e37dfb6d29168c8ff9298a9e719c699790961a4794c1a419ff2d` |
| `docs/releases/execution-v1/180e686613129558d3c8f398b54af0ca3a741c71/execution-v1-closeout.md` | 3503 | `dd784b80c4afc9bebc5b746a1a96a9a215ed6a0176697e57480be02ef4810c26` |
| `docs/releases/execution-v1/180e686613129558d3c8f398b54af0ca3a741c71/execution-v1-handoff.md` | 5470 | `77ad832fa80edf9cac7ede433e6c9c055f2579d9a0ff3e30248c234ff96fb562` |
| `docs/releases/execution-v1/180e686613129558d3c8f398b54af0ca3a741c71/snapshot.json` | 487 | `8cdce481cac4decf2519e7a26c77beda91fea0b3866056059b4d2c41b819ce79` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
