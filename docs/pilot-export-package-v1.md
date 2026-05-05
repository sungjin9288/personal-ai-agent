# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T12:45:04.884Z
- verifiedCommit: 94b018728a493fac74f24c0dbe937df8546e37a3
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 876e20cb20f5545434d53538196583da3d71b454bb9d14d44d8c4b793a06c3dc
- fileCount: 36
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
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
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
| `README.md` | 163407 | `d0affcd61b0077ade041fe28f07b8d60e6f06425304f27ca99bee8614c970676` |
| `docs/product-plan-v1.md` | 11963 | `dc819bdb3529470a833b749ca18f111ab1f48631ca9402b38f262823e2a15bd0` |
| `docs/security-model-v1.md` | 23945 | `f409c590907bc50d96f0e6a317011301e6b853c040479c44ddfc8f95a83e20da` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 40416 | `897a7ed37e82fd3ee11df4d3c02b854c7d3bb65d099d9bd2a07db897a301ab55` |
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
| `docs/retention-delete-v1.md` | 7108 | `dd22c44e14cdf4ae018d38a7cd24108d058a62603920433976d06ef1740d68d5` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-backup-operations-v1.md` | 5189 | `58a74e44d2c08a6a91d9c532f18517acf85a497b8bee011c4f6d3409927df3b9` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 7195 | `73a1f30b227feca10afd904ca76c2a23865c70900954174cbaa1a0038de37b8b` |
| `docs/production-slo-operating-v1.md` | 6054 | `ffcd169fa8e0a9ff84851d8da768ffd792170e6605ca5b4397874425f6f725ab` |
| `docs/production-retention-operating-v1.md` | 5867 | `3d6efbaeb968b54a9ab8dc4ef8512e2e7eca6104bf81a53a61b51e9402201c11` |
| `docs/production-provider-readiness-v1.md` | 5682 | `20a3e9e52a3224687634c1143eca9a8af97aa2f159f1aa9d6c8c0ab1933b797e` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `9803b9befcb558014ed2718058d3ad6843d859a74a4ae43f58cd313ba43004fb` |
| `docs/target-deployment-contract-v1.md` | 8025 | `410963f8777e62a743f95ed1804a48233d501ef37b632323d72e9780eea58a5a` |
| `docs/release-readiness-v1.md` | 20241 | `f5e40b328c5bab1828c9892518fbfc037f1030debd21774f9901d00c54e252d1` |
| `docs/production-like-release-drill-v1.md` | 11263 | `a8fc7c8b19efd77e22bb37afc195e1fbdfa0fbc2af05528b5f0affd8defcd7a0` |
| `docs/execution-v1-evidence.md` | 10646 | `164ea98c420a7b9f1f8ca1508066655b4a451b9322fd56296513a9b808a3d2c0` |
| `docs/execution-v1-closeout.md` | 3351 | `d8c01e9ae5685efe5f88ec6207bcf26fe725c86a38cca653d8d815b40f703533` |
| `docs/execution-v1-handoff.md` | 5241 | `0f4fbd506f800814e3bdbc16e62f084346f9ade93866a7f811248db33b2cb90d` |
| `docs/releases/execution-v1/94b018728a493fac74f24c0dbe937df8546e37a3/execution-v1-evidence.md` | 10730 | `c5c48d0a176e1a158993653f3289a7168ff85bbaf3e6b0e9b59b7baab19d5c9f` |
| `docs/releases/execution-v1/94b018728a493fac74f24c0dbe937df8546e37a3/execution-v1-closeout.md` | 3503 | `58fb87749396bf360fc7e34bf88cbb3b9cc5531a0f0f8950b2dacd08a32326d9` |
| `docs/releases/execution-v1/94b018728a493fac74f24c0dbe937df8546e37a3/execution-v1-handoff.md` | 5470 | `ff2fa0cb75bea41a665a02858d4f8cf991e8d48456b40843675bb588bed5f2b4` |
| `docs/releases/execution-v1/94b018728a493fac74f24c0dbe937df8546e37a3/snapshot.json` | 487 | `a416373bdb4f0c07d472eb37574e4d61764e632324d465ab5354b53bc4a1ef73` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
