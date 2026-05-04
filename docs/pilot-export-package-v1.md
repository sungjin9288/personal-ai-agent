# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T11:27:49.413Z
- verifiedCommit: 3e6afca33f9891294b58839b6bb6b76645430803
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 06b875234eaa7785caf4e11b9134256d32501315210a461972db3fbd11595024
- fileCount: 20
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 151846 | `70cca88a257565d682c56944179ffa5700def7c8f74db6e315822d0647316714` |
| `docs/product-plan-v1.md` | 10807 | `140cc353b404f43a6b13d20531bd24ceccfc23cfd2e089d1c0a29fda50fce6fb` |
| `docs/security-model-v1.md` | 15823 | `bfdad569c407be0bcbc3eab849d4786b1908e6c5fa53de4b69580f508f1e239d` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 16138 | `20f28be9b27b9f926d55958b55d997600ba598b17f7147329f0d68b3c79e74cb` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/clean-deployment-release-v1.md` | 3602 | `64a14637ec0961f4b2ce8ed116d9be1a4dce1f00fa024da9a438bdfbd902ce65` |
| `docs/release-readiness-v1.md` | 10547 | `48845c604dd8f7e037a98e69622b79d02a11eba420c73848f24caf77f12225ab` |
| `docs/production-like-release-drill-v1.md` | 4857 | `8d588695d89e0ceeb13eeb99b3a549e432b81ebee45642f39751fd092598b47b` |
| `docs/execution-v1-evidence.md` | 10643 | `a3cdedc5564bca9bc1b0b5db172a928e474fa1b379ee8326869fe27589593b90` |
| `docs/execution-v1-closeout.md` | 3351 | `627f4354b89f945ace96ad9f79a75d916a79c9f72e472ba8a5cbffe1591decfd` |
| `docs/execution-v1-handoff.md` | 5241 | `6e969688abc9a0e42eb40edb93b2da0d496367bfce646d93221dba9504255ddf` |
| `docs/releases/execution-v1/3e6afca33f9891294b58839b6bb6b76645430803/execution-v1-evidence.md` | 10727 | `7374d7b1641a800d17c8af76173de5c77a8c55e5e4615d6f4a90ce06a0793978` |
| `docs/releases/execution-v1/3e6afca33f9891294b58839b6bb6b76645430803/execution-v1-closeout.md` | 3503 | `b0740965a0adeb21d9f0a7d62aa2215fefbfebe6b8a39108bbef6e8482151bd0` |
| `docs/releases/execution-v1/3e6afca33f9891294b58839b6bb6b76645430803/execution-v1-handoff.md` | 5470 | `3f85c183c08c2c9b591e9b4aca67d6ad77addc5fc02873ce45cb34c7c28c630a` |
| `docs/releases/execution-v1/3e6afca33f9891294b58839b6bb6b76645430803/snapshot.json` | 487 | `cb3a562fe827088f5d9a7335c27069838efb28e4a0e679a7504f5e904db77e1b` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
