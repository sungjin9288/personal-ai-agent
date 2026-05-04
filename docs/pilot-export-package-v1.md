# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T10:31:04.438Z
- verifiedCommit: 3e6afca33f9891294b58839b6bb6b76645430803
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 9fa1af6a834f5326151a47565a4d6c0c6b0e00ef0760b4fcca4b5316e732f562
- fileCount: 19
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 150986 | `4607caedf54069cced7cfb33f29e989dc838af4ad3fb611021fd10f9190fe3b7` |
| `docs/product-plan-v1.md` | 10749 | `bc2405de2b628039733cf51f13cf83c09504595e30ec78619d9d7ae1695607ac` |
| `docs/security-model-v1.md` | 15512 | `a357e95ac2d0f68aa46dfd0ca973e185a0b7e8505b9b63b152f2418453af5b37` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 14828 | `47f508f09a4bbf2f8a26cd432586d8ae40299f1c558631792260266164156793` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/release-readiness-v1.md` | 10077 | `eb709119ba4843b8cdc72f42deddee935e24313bea45a8ded24407d1bfe17114` |
| `docs/production-like-release-drill-v1.md` | 4483 | `17b9f25bd26bd43f2feb183d978129aa7a4fa00ea0cc9880e2625474fd69b115` |
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
