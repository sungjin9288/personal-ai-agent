# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T12:45:18.731Z
- verifiedCommit: 5e0c7ff6f3c561c7a2de93bf0d36aabb031096c9
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 5ca2db0926f05e128e87d7302847a48ba51be8596b7d9eb0777ca1b8a534ea29
- fileCount: 21
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 152779 | `06a9c5975cc922bd19b15dd2eb1cdf57b13d65f6b0b4918963b643b72f75c007` |
| `docs/product-plan-v1.md` | 10865 | `6d0c9a015b2783aa4f09b2b5ab630c9d5bbca3b816544402ff7facc8e3bc82c9` |
| `docs/security-model-v1.md` | 16121 | `6a44c34fff3b5bd6d4d58dde6171d6b75e60ddb9cc03f2bb5805cf336d2f1928` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 17373 | `a2950eb0518f5c90ebd42cb48eaac7c85705670983b527579c502dbcb7a9863e` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/clean-deployment-release-v1.md` | 3600 | `42b8ee25f730c6176b155da4078d64019ae77d3e2669b4a05fb06f72edd32080` |
| `docs/production-slo-operating-v1.md` | 4160 | `fb951ce7dd948f473b484f9d4e0d482f3faf5d53368de02d1f37ff797e47f123` |
| `docs/release-readiness-v1.md` | 10974 | `121b79c27eccff716313ec7eb3840d4db5b7e49da6468ae22423b33428483dcf` |
| `docs/production-like-release-drill-v1.md` | 5215 | `81d0d1ef0addaaec27ef2c4e74d6804b5f8577e75149c08870f85a216a60a8ed` |
| `docs/execution-v1-evidence.md` | 10643 | `12dab4b87db80c0388213ba4033464e191bdb90c75e1b87e645102c4c9aa0834` |
| `docs/execution-v1-closeout.md` | 3351 | `b449ed9ba7ececfe61ecc347d4a5e868fec3a7e6f935585bfa15d145f328be9b` |
| `docs/execution-v1-handoff.md` | 5241 | `82f3277ab609a86e213821846d5dce76e7cae8b9bef9d79ecc3a2cb04a5134d6` |
| `docs/releases/execution-v1/5e0c7ff6f3c561c7a2de93bf0d36aabb031096c9/execution-v1-evidence.md` | 10727 | `4bb95e6f96968db166aa68e9fb2060c8a3676f764a789ea835dec47df0b472d0` |
| `docs/releases/execution-v1/5e0c7ff6f3c561c7a2de93bf0d36aabb031096c9/execution-v1-closeout.md` | 3503 | `4f841ed86d5e1a7c82f191725f64f7a91102fe54441b697b9ca30ef3f15fa5a8` |
| `docs/releases/execution-v1/5e0c7ff6f3c561c7a2de93bf0d36aabb031096c9/execution-v1-handoff.md` | 5470 | `9596317e16202a7386a3c7e06f4672e3591c3ba7246c4354992d85124a885aae` |
| `docs/releases/execution-v1/5e0c7ff6f3c561c7a2de93bf0d36aabb031096c9/snapshot.json` | 487 | `eb676c71ff14382c4c11e2c6ea00526ec32974b97c20378c1919d656f54424e7` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
