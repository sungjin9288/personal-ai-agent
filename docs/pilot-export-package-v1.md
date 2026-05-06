# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-06T01:40:33.756Z
- verifiedCommit: 7925f213f5097ceaef292a289087a24699ed0012
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: e760a666aa3ae9f643a541ef0e74fdfd3d6bc1e9bf72796e7ea795639538528e
- fileCount: 41
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
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 166246 | `dc8c590d4a71809e3e5e89890b325e7234e253a3e83c964d0303aec03388c6e0` |
| `docs/product-plan-v1.md` | 12244 | `f712c68ec67f4f4204487da61788b5fcca04b3056b6ebec39852020f43d4f29d` |
| `docs/security-model-v1.md` | 26419 | `890b04401e879384567e1a4351edf6c72981d19fd74170c86ca8ef640c712bf4` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 45879 | `64e67cca4d75ac33a8833242b38477d918b4774980372446959f93fcb108b086` |
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
| `docs/tenant-storage-admin-v1.md` | 5044 | `e76454f983e0796ba10753189b07b6ce38480d002ecfc757ab125840dba64288` |
| `docs/clean-deployment-release-v1.md` | 7462 | `ab8ae34735a6996b86bd2639a86102e57c90bed08ad8020433a28a36e3bda056` |
| `docs/production-slo-operating-v1.md` | 6054 | `f140ba90d97232b6a0a2dba4ea833cf4c6b9178d9793d02679de64c8f4d047a7` |
| `docs/production-retention-operating-v1.md` | 6501 | `b8462d371fc0330283844d0d6c97b7e033dbcc578a17edcdda205237adebb104` |
| `docs/production-provider-readiness-v1.md` | 6535 | `c66f3f31a63135878179724e062707ec7ff149c809c4d336f811a963f19d4ec2` |
| `docs/target-provider-evidence-intake-v1.md` | 4063 | `08161129cd4238baa56f98cc2584db834db409eb63c4b31c888ff6c1d2821de9` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 10594 | `ae57369b1866518968936c08ce56282c87df4cad04aeb84dad57a58e82e1ff89` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5630 | `edf9b30fb340f39eb119043f9b3fb74103768777e417aacf741be8fe40107e1a` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6305 | `a715fc5d62517a40c3f4c447a471bed364dd6b7960ecff66f69565079e1cc892` |
| `docs/target-environment-evidence-intake-v1.md` | 5919 | `0360657d59ddd2f443e11187fdb5706e084b4727dfd7bac8308abd8ae0b210c7` |
| `docs/release-readiness-v1.md` | 23781 | `32e21c7163934ef0b8b950d25a8ddac9e60ded11b463b704524791553810f43d` |
| `docs/production-like-release-drill-v1.md` | 11981 | `eb32d49bcc45d3daa82aeba0db3254e204a1c33ff4ba3d545e2d2f1477185ca4` |
| `docs/execution-v1-evidence.md` | 10168 | `9de0fcb6ac353cfd9bd3e57ff874c274879c1869e557af149939b63c78d535da` |
| `docs/execution-v1-closeout.md` | 3351 | `f57b0556b334b0afa29996977c916c15fda9c326dc7a99751698774c5bbd96df` |
| `docs/execution-v1-handoff.md` | 5241 | `0be06ffb7c3829ed9cbfcac256c7c09d23c8fedeb1ec08ea4b6d9e744ffccda5` |
| `docs/releases/execution-v1/7925f213f5097ceaef292a289087a24699ed0012/execution-v1-evidence.md` | 10252 | `396f4679a9c9e2643b55c7862801e9be64a9c1bde6ae1d68c5bcd759378e89a3` |
| `docs/releases/execution-v1/7925f213f5097ceaef292a289087a24699ed0012/execution-v1-closeout.md` | 3503 | `89a99ba7e782dbe20683430f8c7e32a62dc381c31d35aae3766a5def797a1a6a` |
| `docs/releases/execution-v1/7925f213f5097ceaef292a289087a24699ed0012/execution-v1-handoff.md` | 5470 | `f6505e998b645dd4029599c3806e33f97d795399d9cc3f1187758b0237752acc` |
| `docs/releases/execution-v1/7925f213f5097ceaef292a289087a24699ed0012/snapshot.json` | 487 | `a0e57f642a2619e74cc60c549cffa23bb1ff86eb7918e7b9fab0c87d4d49d482` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
