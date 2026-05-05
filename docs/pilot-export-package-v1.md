# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T02:44:28.890Z
- verifiedCommit: 3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 228ab45ba91a086dcd196c225355c8fd3b28dd885e77ac86f08bb37524d20c53
- fileCount: 29
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
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
| `README.md` | 159719 | `2643866bb55b6e98a6848e6b80e43a2647ff12a39b78d785e3ea313266641161` |
| `docs/product-plan-v1.md` | 11609 | `b8baa985ef66aadbecba0ad1c5a988f9524b209e3416906a63a0bc564fa11aae` |
| `docs/security-model-v1.md` | 21071 | `0424dbf7cfa85b08f579875c98d7adae2a454fa5dc9b8139c08075e58d6569f1` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 29878 | `327d42503948cddf291abe77977059f15cd4a2c31111c24f200eec9ed6e27135` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5313 | `5b54bf3e210a1c91af84d0ea8572c06f67ca28d37db8c854523a37fc0400040e` |
| `docs/production-slo-operating-v1.md` | 4216 | `681e3cd8e3385c25d8f52ced23f35d70b664f87aa0f54e19b7045d4ca367b7f1` |
| `docs/production-retention-operating-v1.md` | 5235 | `e98cdd50f167bfff6f3db680262f078698fec779865d3de034e14dfd9f996e0e` |
| `docs/production-provider-readiness-v1.md` | 5682 | `3d2110d36f586f827073767d931523c806dde73be131f8e42d84e7d25b8fb254` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `0b5c12e2ca2a56b212b72bbf1982e33329faa564115e7fa302fc4230e150a5d7` |
| `docs/target-deployment-contract-v1.md` | 6693 | `a41c9ca687a94b9ef9403e5bbdd5337c8f2ce3943d8fd6cc229e2733cccf90b8` |
| `docs/release-readiness-v1.md` | 16243 | `9bbdfb60344be112f7c6adb03237cdebe3a7dbfe689d7bbdef59f5a656bb7a8a` |
| `docs/production-like-release-drill-v1.md` | 8834 | `6c65bb70b44a5b426315ddf4575a6dc571ef8d018c57ab679b8b625ae1ef0111` |
| `docs/execution-v1-evidence.md` | 10644 | `a3aa246799512aaec65b5b33a1f8ac7623e6aa4ae9232d2c3c956ae90df9a85e` |
| `docs/execution-v1-closeout.md` | 3351 | `310576a36e1f5acabd4ae2bbb6226778342915c9366a9ef33d5e65b7128fd4ec` |
| `docs/execution-v1-handoff.md` | 5241 | `c1c4b170e2c35ecd3ebe3a3d2da8bbe5f130f66d10f8f8f85c0cf96cbceddedd` |
| `docs/releases/execution-v1/3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76/execution-v1-evidence.md` | 10728 | `1e0a8052f182e2f7bd39f0fc5c2ebc19518061d47c1280f3860f574688719bcc` |
| `docs/releases/execution-v1/3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76/execution-v1-closeout.md` | 3503 | `99a5379b4fbf62ebe7edb85123eb9740b97731c483700cd160f9700b6d828436` |
| `docs/releases/execution-v1/3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76/execution-v1-handoff.md` | 5470 | `4dc8e5afe8ebcf17207c397f392276b3e9ed89c3bd39fc22df58b7eb7b0f43c8` |
| `docs/releases/execution-v1/3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76/snapshot.json` | 487 | `82e54d94bc3ca3c2203e010b532827682ace5428fa278fe0c9b2adf0402ed829` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
