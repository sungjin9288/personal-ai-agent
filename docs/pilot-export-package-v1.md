# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-06T03:41:17.217Z
- verifiedCommit: 3a0be66cedbb1cd4288b45d728bf9e9710b8f000
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 8c1acc489512fbbe44637262966526a8ffe20e2011c2a09676b0581c1225b691
- fileCount: 45
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
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
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
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 168594 | `83024e9a12e31532c75a094909506fe344e757e663bf996cd29a7045c6170539` |
| `docs/product-plan-v1.md` | 12477 | `34d896fea7f0e5ed5dc9995f6a7139de5e0921df0c437bc447a125347d659e9d` |
| `docs/security-model-v1.md` | 29017 | `4f63003c2913ed5e985a84759d1a3f006f437fc9bf833aca252ee0069d6da23e` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 52358 | `a283e95565c77d3854c758664d695455fffc46d04be234a2d1bcea57d19effa0` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/target-support-operations-v1.md` | 5363 | `72e33305ab66a38e03ba772cb9ccd0071a1ae4e8f139ad5d558b6870e16d6c78` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 4559 | `353e86d49e7672282efef694140924ec3131d3f735760fc132d089ef2bc645ad` |
| `docs/observability-telemetry-v1.md` | 4285 | `3352ed684783d0886812603403c1aeb23e082e1a8a2c40c74059b18bc6f1983a` |
| `docs/target-observability-architecture-v1.md` | 6950 | `a6b02f8788a3bd503a789e71615499382cdfa9a931eaa039f606ac3e986ca568` |
| `docs/target-observability-operations-v1.md` | 5037 | `a90090c49f12ca77d89228b32a9babf57b247be8fe7c88f9da8956b721ce9cd0` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 7712 | `a0971a6c120a414acf63960c78de38b95f695d6e6620f2a9e4df3baa94d76b35` |
| `docs/target-retention-operations-v1.md` | 5907 | `765b2ab63c9cfa0f4bc08f155781d43b603f915da221929a347155dd0af2938f` |
| `docs/target-backup-operations-v1.md` | 5365 | `7e495e2b86760b8f83b73e98f2074b365c4c1d37d774a122fcc8ea3b69482a83` |
| `docs/identity-session-admin-v1.md` | 4817 | `3c2c72168aa7bd6302f4b7e1cdd3666adebcdaeddf7709f1e13c702c11cd61d4` |
| `docs/tenant-storage-admin-v1.md` | 5044 | `e76454f983e0796ba10753189b07b6ce38480d002ecfc757ab125840dba64288` |
| `docs/clean-deployment-release-v1.md` | 8046 | `83f0935b3a9e0c1de4a7859ad37038cfcfa5ecb8a30faef5c4018f270b67277a` |
| `docs/production-slo-operating-v1.md` | 6736 | `2cd32bd88c5f7786daa06da8ed36dde2fff1f732ec3e423c9c5bade134f81553` |
| `docs/production-retention-operating-v1.md` | 7282 | `f97d6ef1875a7fb0fe0ac3c2af19d96b3364f70da56d18ac8d63276e5044c21b` |
| `docs/production-provider-readiness-v1.md` | 6535 | `c66f3f31a63135878179724e062707ec7ff149c809c4d336f811a963f19d4ec2` |
| `docs/target-provider-evidence-intake-v1.md` | 4063 | `08161129cd4238baa56f98cc2584db834db409eb63c4b31c888ff6c1d2821de9` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 13498 | `7436edc7a913f4a0545a5b14276815a2b6762f2dc6e153cef6725d6421b5e697` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6387 | `771a895cff02ee4e7bcba087555686f1162738e6f566e22e61a4b07688689229` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6305 | `a715fc5d62517a40c3f4c447a471bed364dd6b7960ecff66f69565079e1cc892` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 6776 | `54e8485b1815454eee6366abc1ad7a28e85a3a098034595f08f90c21bb2f4e6f` |
| `docs/release-readiness-v1.md` | 27046 | `4a5b11669ddc83797b3deaffee83ff54ff6015e3b13869bb269aee3093a57dff` |
| `docs/production-like-release-drill-v1.md` | 13539 | `3c565a07e3d686363b5883b69bc36092cb4ad89e861e9821661b0f9c0a61352c` |
| `docs/execution-v1-evidence.md` | 10166 | `4d892f3b785bd057a3640ff40b2dae17fc706de388bdbd2a45163c244c1a159c` |
| `docs/execution-v1-closeout.md` | 3351 | `a6665fc967e0f6f6edd66d9064f7fdb20a220f082513da2dfb4a153d7ad25de0` |
| `docs/execution-v1-handoff.md` | 5240 | `9ad3a07e5147b4a4db8306b76316c6768cfbd46b0d3ad3f371fb6524143c5754` |
| `docs/releases/execution-v1/3a0be66cedbb1cd4288b45d728bf9e9710b8f000/execution-v1-evidence.md` | 10250 | `4c6a09adc889d949b92d41c005cc1e91b5972cb487f86d2a02863e718b183c96` |
| `docs/releases/execution-v1/3a0be66cedbb1cd4288b45d728bf9e9710b8f000/execution-v1-closeout.md` | 3503 | `81af34fe66709498c01db4208257a57e052c9bfd35621ac82b5b49f546141858` |
| `docs/releases/execution-v1/3a0be66cedbb1cd4288b45d728bf9e9710b8f000/execution-v1-handoff.md` | 5469 | `7e6712757d2ca536d8ad41a88f44e5400fca2448ac482bde30636b07bedba3df` |
| `docs/releases/execution-v1/3a0be66cedbb1cd4288b45d728bf9e9710b8f000/snapshot.json` | 487 | `062a3f867f7d624a1ca331c495c90b4b3a9e201db4ef11771bc59c8242e01c59` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
