# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T15:50:35.428Z
- verifiedCommit: a08bec457ca8887403a8cac04698dd624fb8ff47
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 2d8bae7250ba4adbdd297fab1e263d8a4708bafcc0bef24978c3d7fb605e0e55
- fileCount: 40
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 165670 | `8fe231b07b266cf4d2e497cd9933cb86099e7d955e9ce4081e6d3f141ec7f223` |
| `docs/product-plan-v1.md` | 12184 | `8a3fddb9776e788c28327396238875cf75c381448ab6c0a7d3fa21b191491758` |
| `docs/security-model-v1.md` | 25701 | `2a0b08247f213e3d64cbd2010d4a58cc5d1a38a88989fe8b426af8b37597b56a` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 44674 | `88dbf970f9d82fca15082ddc7e79434cf9c367de3cae157bb96f4ed81db55ea3` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/target-support-operations-v1.md` | 5363 | `72e33305ab66a38e03ba772cb9ccd0071a1ae4e8f139ad5d558b6870e16d6c78` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/target-secret-manager-v1.md` | 4383 | `6f3351530c533e8d7b88d7910b16c23e27ad384076fd95d530aba23804513d79` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/target-observability-operations-v1.md` | 4864 | `5927d5bc63a83a0be77feac5c718f2747f750aeb2dbcfa6caf16d6bdf671e5d5` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7286 | `c609674cf72c9d91d5ebe7a1885e300cc70ab3d794744863046e586e8aba1016` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-retention-operations-v1.md` | 5731 | `1f05714bf1144fec736d4108afa46b21f81292f5050d7961f3e3cf0899b3d54c` |
| `docs/target-backup-operations-v1.md` | 5189 | `58a74e44d2c08a6a91d9c532f18517acf85a497b8bee011c4f6d3409927df3b9` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 7461 | `35ffc7a0990a4116073bd2bb670fd2d6c989dd806e077fa1142b998fd34b855c` |
| `docs/production-slo-operating-v1.md` | 6054 | `f70b410aa3a8fc9a41d6bedca7a9e68c3a5bead21bc5526e6dc2d211bd15c018` |
| `docs/production-retention-operating-v1.md` | 6501 | `9796f075e08b7aa9b8626d8749ee0658eb769d652d9f3c02c766ddf5c59ae523` |
| `docs/production-provider-readiness-v1.md` | 6535 | `be4207c18e5471d2afcc0ff61ecbc9f631dfb8584528f8cbec5a7fca57beac0b` |
| `docs/target-provider-evidence-intake-v1.md` | 4063 | `08161129cd4238baa56f98cc2584db834db409eb63c4b31c888ff6c1d2821de9` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `76a4aa05e0b1d2ca9c7e773c314064fad6888b4fa3cb5d66238eccd12e554644` |
| `docs/target-deployment-contract-v1.md` | 9878 | `2b27175dbe57581a672343bdceb4edaecf6273081259d57f2f048c36f03d11c5` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5389 | `71c83b96c256de453c506598cdfdc3c7efca32a51b78153a3da16bedfe78e71f` |
| `docs/target-environment-evidence-intake-v1.md` | 5735 | `f1134b249a65536bae3cfa2a0f4478ed739d7a49a67b576d7d6ee60366234d70` |
| `docs/release-readiness-v1.md` | 22965 | `e344985d0fc6ba37abdcedab213413487abfe81ea1762ccb8100344d1cc4cf54` |
| `docs/production-like-release-drill-v1.md` | 11617 | `9ff0b2ab0fab331a6f0465554f066d8c5202adec01cf3c824371f1f01b481a08` |
| `docs/execution-v1-evidence.md` | 10641 | `f580f4a709e73c75890a08b86a1dea1acdaf21d5451bd9c98c8d2e99b6e2d3e7` |
| `docs/execution-v1-closeout.md` | 3351 | `ee790c84ddae03c88e87aab26ac16dc9b1265204b75ccfd615ac8c316b0a886b` |
| `docs/execution-v1-handoff.md` | 5241 | `d65a0816d8225d6316375f6b3bda8590539c4820b4981ee4275a41e09b22bccf` |
| `docs/releases/execution-v1/a08bec457ca8887403a8cac04698dd624fb8ff47/execution-v1-evidence.md` | 10725 | `fb0797eb6ae8dbc2cb12e9591da2069836dd88f1297a183928b64b0d36913932` |
| `docs/releases/execution-v1/a08bec457ca8887403a8cac04698dd624fb8ff47/execution-v1-closeout.md` | 3503 | `14d26bf84b5a69b4c69e7947da0f8bfe61ffd6f3039ee5ba72adfd95e0aec82e` |
| `docs/releases/execution-v1/a08bec457ca8887403a8cac04698dd624fb8ff47/execution-v1-handoff.md` | 5470 | `7962b1b8a029af91b281aaf5a55a9af9d7c5d5547b23045acbde2fbda03aa6d2` |
| `docs/releases/execution-v1/a08bec457ca8887403a8cac04698dd624fb8ff47/snapshot.json` | 487 | `0ab81cb7cf27026d546443d0c15d3099986a15cd908c43653c929bfaa1017fb9` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
