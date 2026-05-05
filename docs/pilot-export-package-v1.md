# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T02:07:09.782Z
- verifiedCommit: b4fa0cae585814c8125b7a0d6c6e86e7216b4afb
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 98a248c017cbddbac6eac1363238e09be78ecaa8c3c77b7a66cd2f9396165df8
- fileCount: 27
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
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
| `README.md` | 158808 | `40f81029d24e1bfc01b37b2387577929b88c82360e5d2ed7ca28360513d255b7` |
| `docs/product-plan-v1.md` | 11521 | `fb72a3fb9d47641c8f75e3dc72328ef73c4c230f2f0a77d3ebedfca122b2d939` |
| `docs/security-model-v1.md` | 20162 | `4456a247d4a55a3a7b18f35c16ef8b88f96e074fbe14f828aee97331b951eb74` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 27240 | `108abae06335f0176c004a7c6ee8c19f5793c99d374892fdb2bbe0af9be831f8` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5238 | `afad6d46307862236cd7a9f395a111101b9084849d4ac329737cb3cd1341a2d6` |
| `docs/production-slo-operating-v1.md` | 4161 | `8bd8ce647e215c379160cf5bf5cc7c6da8acfbeb81206987956205deecb0ba07` |
| `docs/production-retention-operating-v1.md` | 5235 | `dc7ffd866a5081edbce5708026a73f84f716f45d95420e2d6b3a6cbfc8ddfdd9` |
| `docs/production-provider-readiness-v1.md` | 5682 | `4520915088a7a32991fff2d9428b37e58fc5e15044a76d67a3887414d845de8a` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `f33181704b0582c0e529865d602f6d017ad0b045417ce4b393afb300f965f49b` |
| `docs/target-deployment-contract-v1.md` | 6087 | `7220f7476f6c13e87e0137053ffe12724fe58b61edafdf68b3e6ae68e24fdc94` |
| `docs/release-readiness-v1.md` | 15027 | `251186d2b812f272779f3a9260ea37d4a7aa12f8885978e6165efac3d6ef459d` |
| `docs/production-like-release-drill-v1.md` | 8011 | `2a2478a4f799bd89b55f7e815f30278d33ffc2419d4c90cf1adfdd0d7ddaf2cf` |
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
