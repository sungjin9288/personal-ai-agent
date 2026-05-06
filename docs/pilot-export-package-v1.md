# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-06T02:18:28.171Z
- verifiedCommit: 6b9f4cbc1183272f60c4f65aac6dfc0be6ceb20b
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 21d45b74b372fb766706c57510273e8d4cc59af8ad6d8afab66c9f04b44fbad5
- fileCount: 42
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
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 166829 | `bf584fbaf95e512443904594ad19b1a09a01910acd821349dc89d96261afdfa6` |
| `docs/product-plan-v1.md` | 12304 | `6ad0abaa1d18d8a9eacf9cd85129001693102b15f19aa27f673d85a2cfa98896` |
| `docs/security-model-v1.md` | 27142 | `60233a093f13c39c90159ac41df963a36b524088558627c0a25505cb31b493cf` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 47571 | `e8ecbd12bf824443106eed757d776e5f179a38fd210d27f2477bf54ef907b881` |
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
| `docs/identity-session-admin-v1.md` | 4817 | `3c2c72168aa7bd6302f4b7e1cdd3666adebcdaeddf7709f1e13c702c11cd61d4` |
| `docs/tenant-storage-admin-v1.md` | 5044 | `e76454f983e0796ba10753189b07b6ce38480d002ecfc757ab125840dba64288` |
| `docs/clean-deployment-release-v1.md` | 7462 | `ab8ae34735a6996b86bd2639a86102e57c90bed08ad8020433a28a36e3bda056` |
| `docs/production-slo-operating-v1.md` | 6054 | `f140ba90d97232b6a0a2dba4ea833cf4c6b9178d9793d02679de64c8f4d047a7` |
| `docs/production-retention-operating-v1.md` | 6501 | `b8462d371fc0330283844d0d6c97b7e033dbcc578a17edcdda205237adebb104` |
| `docs/production-provider-readiness-v1.md` | 6535 | `c66f3f31a63135878179724e062707ec7ff149c809c4d336f811a963f19d4ec2` |
| `docs/target-provider-evidence-intake-v1.md` | 4063 | `08161129cd4238baa56f98cc2584db834db409eb63c4b31c888ff6c1d2821de9` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 11322 | `0b9b7ba24b3eabc493e2db62e842e617dd9f0baedbd94a3851c440676b5702df` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6387 | `771a895cff02ee4e7bcba087555686f1162738e6f566e22e61a4b07688689229` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6305 | `a715fc5d62517a40c3f4c447a471bed364dd6b7960ecff66f69565079e1cc892` |
| `docs/target-environment-evidence-intake-v1.md` | 6103 | `6986399b3e00434fc45f45fb9bfcdbacb05d7e9162bc246477453a46a7e0082a` |
| `docs/release-readiness-v1.md` | 24545 | `b9c3abe5e3aa9f82612a0bf112b95d3a033221703e390cf009bae28e6358bc48` |
| `docs/production-like-release-drill-v1.md` | 12295 | `11d157368d144d23a701ea7a1a7b5fbab3b2a1ececff3902769bb030c9cf3f89` |
| `docs/execution-v1-evidence.md` | 10169 | `19c86cfbc7a18c009f68789da88f73760a22eb477849012175d153ef2771413d` |
| `docs/execution-v1-closeout.md` | 3351 | `63b52174e763070071a2297181552f8297b6be5cb88ba2053846295b4405d02c` |
| `docs/execution-v1-handoff.md` | 5241 | `97c2fe800400e669ec8c343d218435bada9b3efaaba47b878743653151706ed5` |
| `docs/releases/execution-v1/6b9f4cbc1183272f60c4f65aac6dfc0be6ceb20b/execution-v1-evidence.md` | 10253 | `5b7c9d8e99296e31e0f34cf9de459d4270d9af421f440d51a714ccc3fb7aa557` |
| `docs/releases/execution-v1/6b9f4cbc1183272f60c4f65aac6dfc0be6ceb20b/execution-v1-closeout.md` | 3503 | `8ad058af3f85f5e924d82f715b8c75fccd2ebe54ebc1a1ec5ff9038a8ca95ece` |
| `docs/releases/execution-v1/6b9f4cbc1183272f60c4f65aac6dfc0be6ceb20b/execution-v1-handoff.md` | 5470 | `63b687d960b1d861c1237ec3371103f0ec1d5e3998c2f1d41887fdc16d013898` |
| `docs/releases/execution-v1/6b9f4cbc1183272f60c4f65aac6dfc0be6ceb20b/snapshot.json` | 487 | `d684bac707b85a459c62e9222d51bbd3f123a3ae031995ee0793f3bff2659309` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
