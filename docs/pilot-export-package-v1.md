# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T04:24:53.063Z
- verifiedCommit: a46f6dd308be13561643dddb44b75dd55e8a64bd
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: cccdb1b1239799ca411c5d1a90baefebee3eb2c690e185421b37e01645bf34fc
- fileCount: 32
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 161243 | `bd75c782a0fe32884cbc3cd9e177c2a0713176655fcfd60eae7784cd73c537a5` |
| `docs/product-plan-v1.md` | 11766 | `59c0e6c55e2c1c5f04c4b025107eba0318d59e499c4bf840b492706aa6e50596` |
| `docs/security-model-v1.md` | 22335 | `f91fdd39c86bd6abce1db8f39f41e891cd27a45a52756a430a7af13823d4d858` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 34100 | `8ed77f9f87f36f3b443d1753c571687bdb77e89f3c21feca5093d5553dd80b36` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 6154 | `8d177f39e7cd6988c846900e4a0d391b72c6054ae72d4778a95316d7f8daf612` |
| `docs/production-slo-operating-v1.md` | 4789 | `610f6f5b1aa48eb141c4c96cace727db33f7d48c67f152574846dfd37ba6c9bf` |
| `docs/production-retention-operating-v1.md` | 5235 | `5dce80e56aa8b794c8a287970915949b0533c9f570cf753f84111fd36bc039fe` |
| `docs/production-provider-readiness-v1.md` | 5682 | `b430419c4e5e7859001bebe733a721a14e3eb0d963e529ae188803e91bafd597` |
| `docs/production-enterprise-controls-v1.md` | 7003 | `a8b185bac22662fdd41fcc7d29d282578e29e499d2fc86c2967c9cabd6915a54` |
| `docs/target-deployment-contract-v1.md` | 7229 | `731e017f7d92609dddb0de99aedd25c06ecc81f04a3fd97511f7abacb2bd9d3f` |
| `docs/release-readiness-v1.md` | 17666 | `0f1b48738201f2276e543d640ec07cb7bd1d79af418a85f14c5d9291448f91c2` |
| `docs/production-like-release-drill-v1.md` | 9860 | `52654233530a8dbf349fd59d9262850d1473ad78158c6e019462544239b04f55` |
| `docs/execution-v1-evidence.md` | 10646 | `d14027fa744d4dbdc2b47c1c162b598848ab5207a0cbadf2835917a1b7b6c100` |
| `docs/execution-v1-closeout.md` | 3351 | `64ef08c00772b0353a3b4ee27c7454ab70e786802cf61a97ac6a0b2fb15d841e` |
| `docs/execution-v1-handoff.md` | 5241 | `8d2e1166784c0fc90c0679cc580c321dcc92f0a1873cfd9cb2e41b485fdcffe8` |
| `docs/releases/execution-v1/a46f6dd308be13561643dddb44b75dd55e8a64bd/execution-v1-evidence.md` | 10730 | `7598eea4b1ed4c89b501819b53fda0015a10e37e8d288a3a4375322a8dea6aac` |
| `docs/releases/execution-v1/a46f6dd308be13561643dddb44b75dd55e8a64bd/execution-v1-closeout.md` | 3503 | `db43e5a5959904bdb26aaffc8c3d09d2f0f40ff71ccf4c594876e4a33aece6ca` |
| `docs/releases/execution-v1/a46f6dd308be13561643dddb44b75dd55e8a64bd/execution-v1-handoff.md` | 5470 | `c613585936f97728f3d9c8a628d0b54c311342612255339ea56731c8b1c1f0f2` |
| `docs/releases/execution-v1/a46f6dd308be13561643dddb44b75dd55e8a64bd/snapshot.json` | 487 | `fa7eef60085714cd3aa71d058d92f6bb1d5353aa70a5a2b57a70f6c9ad47aec6` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
