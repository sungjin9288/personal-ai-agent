# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T12:01:18.643Z
- verifiedCommit: 5668fcbafc243e7e316fbb3d9d9cfd9dc686d7fc
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: db4a5b3aa87f53e719be4355d0d2995cb5afce5e17020861c2b2cf9d386ebbb6
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
| `docs/clean-deployment-release-v1.md` | 3600 | `0ae9d8525cfecdc8fc6bae448f8dbf7065e19529f086174367a7b8b0f12b5402` |
| `docs/release-readiness-v1.md` | 10547 | `48845c604dd8f7e037a98e69622b79d02a11eba420c73848f24caf77f12225ab` |
| `docs/production-like-release-drill-v1.md` | 4849 | `709f5be68b0792ae8e4a212a9406565f4325836d12b3d8a00e2545cc6fbb334f` |
| `docs/execution-v1-evidence.md` | 10635 | `c5ad71d3bdf36f054940e67c6e11bf7b9f8ff2d8f45702e174abbf2c36964e68` |
| `docs/execution-v1-closeout.md` | 3351 | `7d8a552400585f9c98a97b372473f5deafc6edd66b93d717fd2d9c44b2c25a92` |
| `docs/execution-v1-handoff.md` | 5241 | `63343e43365dd29c2de2e7aacdc9f285bbd93205e1607ea2832050d7a11c66aa` |
| `docs/releases/execution-v1/5668fcbafc243e7e316fbb3d9d9cfd9dc686d7fc/execution-v1-evidence.md` | 10719 | `b8288a80eea8d7f53420d91f0d0bc8d876da5fa97bc98d8030af342461af7d06` |
| `docs/releases/execution-v1/5668fcbafc243e7e316fbb3d9d9cfd9dc686d7fc/execution-v1-closeout.md` | 3503 | `380c6de65fe7ddeea1a08a5473516494569f144cc26e4a01425d5e4051590808` |
| `docs/releases/execution-v1/5668fcbafc243e7e316fbb3d9d9cfd9dc686d7fc/execution-v1-handoff.md` | 5470 | `87b1eb1ed70af45b367781bb24bd32faee23860ab1c213e89001c3b1b71887a7` |
| `docs/releases/execution-v1/5668fcbafc243e7e316fbb3d9d9cfd9dc686d7fc/snapshot.json` | 487 | `61f9a6ed6eb0b0d20a6563a2b605fd70d2d2fdd1089a5c9fdd69c1a904b06ce7` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
