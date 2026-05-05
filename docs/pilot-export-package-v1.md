# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T02:17:00.489Z
- verifiedCommit: b4fa0cae585814c8125b7a0d6c6e86e7216b4afb
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: c95e64b227314a10d09c4bbfc0bbfb497e93f4409e56ffb7d3ea9574b74e988a
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
| `docs/clean-deployment-release-v1.md` | 5511 | `563bd4504f2da781571105a50f8ef364c98c5d40a110036422f24ee6f8323138` |
| `docs/production-slo-operating-v1.md` | 4161 | `8bd8ce647e215c379160cf5bf5cc7c6da8acfbeb81206987956205deecb0ba07` |
| `docs/production-retention-operating-v1.md` | 5235 | `dc7ffd866a5081edbce5708026a73f84f716f45d95420e2d6b3a6cbfc8ddfdd9` |
| `docs/production-provider-readiness-v1.md` | 5682 | `4520915088a7a32991fff2d9428b37e58fc5e15044a76d67a3887414d845de8a` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `f33181704b0582c0e529865d602f6d017ad0b045417ce4b393afb300f965f49b` |
| `docs/target-deployment-contract-v1.md` | 6379 | `ff8eeea645bb0c193ac4f3fd2fd8ed8d14b011f5fd7871d9717d0459ef83c423` |
| `docs/release-readiness-v1.md` | 15613 | `0ba6a758b325b554a668397153a780df38acfde013b6a6bde582ff7dbd7c2c66` |
| `docs/production-like-release-drill-v1.md` | 8411 | `0473d1a968b56761a508d010e6be5351210af9307a41bdf4f2d5076e36bbeb79` |
| `docs/execution-v1-evidence.md` | 10635 | `971c1285f1885b4c3da0f9740bb51f831e78057f353e020f2d5cd98f141688d8` |
| `docs/execution-v1-closeout.md` | 3351 | `9439f4030bc4ae2e36095d9fff505ce171a46315b8264e57f464d93cae5db600` |
| `docs/execution-v1-handoff.md` | 5241 | `ddacb37595b544e32d1a1bc1eec8c55439a24718461c898d6e8c217889cbc077` |
| `docs/releases/execution-v1/b4fa0cae585814c8125b7a0d6c6e86e7216b4afb/execution-v1-evidence.md` | 10719 | `dcbc97d3b28de75d2505c1ae61da269c98a1c98cabdcd2009e5f9c818f814677` |
| `docs/releases/execution-v1/b4fa0cae585814c8125b7a0d6c6e86e7216b4afb/execution-v1-closeout.md` | 3503 | `f856396d76818a8630b401d76b97f584d6e4f005c14a71a81c60c771a60e2e7c` |
| `docs/releases/execution-v1/b4fa0cae585814c8125b7a0d6c6e86e7216b4afb/execution-v1-handoff.md` | 5470 | `5c056f2cf49695201a3e854ede2ee34979608dc4a6e25372db0e6074d304367c` |
| `docs/releases/execution-v1/b4fa0cae585814c8125b7a0d6c6e86e7216b4afb/snapshot.json` | 487 | `4506a76a401fdfad1af6587d231039930e6d14d31741a1ce9f780cc9b26f238a` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
