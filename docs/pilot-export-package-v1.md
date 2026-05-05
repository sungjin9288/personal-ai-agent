# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T04:06:53.492Z
- verifiedCommit: a46f6dd308be13561643dddb44b75dd55e8a64bd
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: cafeaaaf780ceea8a3e7f38f5d30f53bb13d118639cf47335093f6efd1eec842
- fileCount: 31
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
| `README.md` | 160737 | `3001d3ceb058a9a67c547150e69bc1fe949262387128c4ab4533294c83b19cbb` |
| `docs/product-plan-v1.md` | 11713 | `5c95ab7d08d6b7eeee0bbae571d402ae07029de64c807e9cdd314b439ad9c4ab` |
| `docs/security-model-v1.md` | 21817 | `83b15c79bdb78d74eee0e55e31b8a8dd6bb1d6a75d193a9f1a335629fa2dbec0` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 32700 | `023b6bf0ab9367025aeaf84ca7a288e47c20c1fdd0bf42149e94f9071b2c1e04` |
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
| `docs/clean-deployment-release-v1.md` | 5883 | `3f8d19f8d98151bf51aacc60986ed30a00faa62a830a4cce2d58a188c84e06c2` |
| `docs/production-slo-operating-v1.md` | 4789 | `610f6f5b1aa48eb141c4c96cace727db33f7d48c67f152574846dfd37ba6c9bf` |
| `docs/production-retention-operating-v1.md` | 5235 | `5dce80e56aa8b794c8a287970915949b0533c9f570cf753f84111fd36bc039fe` |
| `docs/production-provider-readiness-v1.md` | 5682 | `b430419c4e5e7859001bebe733a721a14e3eb0d963e529ae188803e91bafd597` |
| `docs/production-enterprise-controls-v1.md` | 6301 | `97f288d2bd835ba2dc04f39726118675cdefd456f2e84a1282ab3cd8b90cd159` |
| `docs/target-deployment-contract-v1.md` | 7068 | `43849155df73d23155f7d45c556c3eab03c102488165ad1efe6a1211e660a15c` |
| `docs/release-readiness-v1.md` | 17226 | `144a8483d3adf46929ea6b86798855c02dfbdd83d26edba44894529dd1a564dc` |
| `docs/production-like-release-drill-v1.md` | 9534 | `b8091bb0799c15af4bfe02f593fbe9430a6f19500d2a13c35bfb156ee7eca36c` |
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
