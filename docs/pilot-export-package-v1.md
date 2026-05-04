# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T09:36:07.182Z
- verifiedCommit: 947334830c0de5e2a1be76fa77017d6b77bd3d1a
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a711ac27486cea3e6aa6ea2cc45385ba202942a43ef91c6607fa6d8d13692423
- fileCount: 17
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
| `README.md` | 149797 | `f3b77e0713ce3a856145e8164ee400b1a97d6634be56da9e0d11299dba98cf6d` |
| `docs/product-plan-v1.md` | 10648 | `a8a30b348e101f9e96192e96265907d4010fde85a81bc8afb988d089266fe88d` |
| `docs/security-model-v1.md` | 14343 | `0425e636f529633b01282571af4cf252f2f0b18161126d733917aef83ce5ac73` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 13441 | `de0093305ca4969a5a98a6113181e2dc45f85232fb887ef10030ba55498a0bb8` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/release-readiness-v1.md` | 9303 | `1bcd4f553415919aa82ab877a9e8fac2e96c66de65960933761cd9a0d2901206` |
| `docs/production-like-release-drill-v1.md` | 3912 | `8c7c325494c332a66acf526d565297cb6f0835bd913a643a8959b1680fa6242d` |
| `docs/execution-v1-evidence.md` | 10643 | `902d90799170cfc1bbe455b0dffa6d5d8ca67bfe804eb370d9b586e6356838cc` |
| `docs/execution-v1-closeout.md` | 3351 | `14f4dd9d13cf3485da38601ae3a2a3119c1fb6ca60d640f864cca8ae3e2dd159` |
| `docs/execution-v1-handoff.md` | 5241 | `cd1abf20456f2b9b170d45f6ec28f2092999a952217ad28fb5fdb7bc0b69adc2` |
| `docs/releases/execution-v1/947334830c0de5e2a1be76fa77017d6b77bd3d1a/execution-v1-evidence.md` | 10727 | `f4495781b86adefc3bb78ed66b0858dece0848426006bdd03c696f562c20c200` |
| `docs/releases/execution-v1/947334830c0de5e2a1be76fa77017d6b77bd3d1a/execution-v1-closeout.md` | 3503 | `4d16013cb206967012a5d8f11df4f33904750b743b154aec40720978bc88a6e3` |
| `docs/releases/execution-v1/947334830c0de5e2a1be76fa77017d6b77bd3d1a/execution-v1-handoff.md` | 5470 | `40bad19debaf7632e0113c58687bef08dd595f2391c445fd8ab9d8d70f014dba` |
| `docs/releases/execution-v1/947334830c0de5e2a1be76fa77017d6b77bd3d1a/snapshot.json` | 487 | `0eee888cff61ee6d990daca622d0358220beae69c84dcb5090d81f5a205d925c` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
