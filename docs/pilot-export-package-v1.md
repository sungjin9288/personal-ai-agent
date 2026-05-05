# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T02:30:48.386Z
- verifiedCommit: 3c6097fa0c48d6cc0c5f8b370cf6aa4a70112b76
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: dcdf8a3f72df5b91f47cbd6f415188febc451570c090c02d71c4ba18567a2751
- fileCount: 28
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
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
| `README.md` | 159246 | `c9b4233a66935c2dee31f058d2888f454c157e5a75c444e987278df47bb699b7` |
| `docs/product-plan-v1.md` | 11562 | `2d7c08bc49263cea52fc503b935d3dacfbece181db403e69e48649cbcd0e9f7b` |
| `docs/security-model-v1.md` | 20597 | `d6c12e6d220d7aca5a0b90bceb94a8ca33f8d8ae52f0f2a47af8fd0f487123f7` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 28626 | `ef88b391b201a812e6dabca364c4cf2de8ce5f1dabccb23081c54359ace4ee54` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5511 | `0aeac5deeb035bfb499558bc00c558bb03818ee16412b81a8a9f35f8a7bab358` |
| `docs/production-slo-operating-v1.md` | 4161 | `d87d87dd5158931f9676c0b59e406e994a02b20feabcd333fd9abcebf31e1328` |
| `docs/production-retention-operating-v1.md` | 5235 | `e98cdd50f167bfff6f3db680262f078698fec779865d3de034e14dfd9f996e0e` |
| `docs/production-provider-readiness-v1.md` | 5682 | `3d2110d36f586f827073767d931523c806dde73be131f8e42d84e7d25b8fb254` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `0b5c12e2ca2a56b212b72bbf1982e33329faa564115e7fa302fc4230e150a5d7` |
| `docs/target-deployment-contract-v1.md` | 6379 | `ff8eeea645bb0c193ac4f3fd2fd8ed8d14b011f5fd7871d9717d0459ef83c423` |
| `docs/release-readiness-v1.md` | 15613 | `0ba6a758b325b554a668397153a780df38acfde013b6a6bde582ff7dbd7c2c66` |
| `docs/production-like-release-drill-v1.md` | 8405 | `1064025ffeb72caee1462532c498063ec1711820ecf2db6a09301178948805eb` |
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
