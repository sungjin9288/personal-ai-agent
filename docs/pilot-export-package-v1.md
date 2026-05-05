# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T14:56:24.122Z
- verifiedCommit: 440e3ba4b3d37eda0c8f8d14707f8487bea6bc93
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 45cd91c596c0e02885269a2b43a3ffb23489b944f82b6938f8fbb274b20b6d52
- fileCount: 38
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

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 164542 | `074a5f8bb8991c7d83ec63dfdc82b23f63cf5c06297044d78f213faa5338075e` |
| `docs/product-plan-v1.md` | 12069 | `b42c88f933cb78e6e4c24a7dbe60f8249a58e4c7e6b9e3bdd91e255575a75dda` |
| `docs/security-model-v1.md` | 24844 | `db7c866e3aaea39be4395739692d8c7a48538b8dccc55fb9a4b4097f534cef5f` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 43120 | `4f368d78c177eb7a2cc2f4a9c07762850c59de14bbd809c268fc4c701a1e2c24` |
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
| `docs/clean-deployment-release-v1.md` | 7461 | `f1182fabbf1813b663eec7e03bb8231419bfa22f24e595613ebeb846ad446920` |
| `docs/production-slo-operating-v1.md` | 6055 | `432c191d3980cda01eab74426cd193c3e8ec2c3c6e218bede0194d3f9a74f702` |
| `docs/production-retention-operating-v1.md` | 6501 | `71b17675043d3afaa18eca673b05b5800c96636c5a23cf0197dc26392cd82fd7` |
| `docs/production-provider-readiness-v1.md` | 6535 | `da2f664348c2d914104a8c4f5f0c14d9c4d3b6219d60f6fbfbb4d5c4487dd2b1` |
| `docs/target-provider-evidence-intake-v1.md` | 4063 | `08161129cd4238baa56f98cc2584db834db409eb63c4b31c888ff6c1d2821de9` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `1f14af0844f1dd2602617083a230dd1b4bb049a8254c10e6198f8fe742f9b85b` |
| `docs/target-deployment-contract-v1.md` | 8669 | `fcdf173a828cee9e2b57295cf664b3aacecaf19fd708b649519ce65d8dac2a62` |
| `docs/release-readiness-v1.md` | 21563 | `5a8efb13135381d9f0eb14473cd4e2b8ddf01a20209f867aac8760d6291bcc27` |
| `docs/production-like-release-drill-v1.md` | 11618 | `14eef5b94e7f042c4d25343e43a5dd7bb21b212afdcabe4220669ae075caa032` |
| `docs/execution-v1-evidence.md` | 10638 | `f338954cced6081f1781fffcce8a3d3e8962d18013917a902e3c17d869fd33d7` |
| `docs/execution-v1-closeout.md` | 3351 | `3548d8a515ccb2f233669948cf51b1d121ade2dbf2fd5bd812eacba0ceb681f6` |
| `docs/execution-v1-handoff.md` | 5241 | `cbdbe5e628c079597e4036b267b34acbd7c6095682c1dfff1d3f2771c72c9dd6` |
| `docs/releases/execution-v1/440e3ba4b3d37eda0c8f8d14707f8487bea6bc93/execution-v1-evidence.md` | 10722 | `1b596a3ef21d7f0c949200ae0f46748adf8ba8e52e57f8a2af7d220f59d3d9fb` |
| `docs/releases/execution-v1/440e3ba4b3d37eda0c8f8d14707f8487bea6bc93/execution-v1-closeout.md` | 3503 | `0b0ecebf91b2a65c6fa88bb0a1550c22b1ec7fe96407a0c147fdcbc264409698` |
| `docs/releases/execution-v1/440e3ba4b3d37eda0c8f8d14707f8487bea6bc93/execution-v1-handoff.md` | 5470 | `8b48140d859f3af727e4429a504de720b79bda1547c4dd4ac5547aaf4b576a53` |
| `docs/releases/execution-v1/440e3ba4b3d37eda0c8f8d14707f8487bea6bc93/snapshot.json` | 487 | `d69da176e22fa7e45f1ce3bab40d356cde245e38ddf59fb0098dbcd57dd3690a` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
