# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-06T07:37:14.356Z
- verifiedCommit: c36025b279d46e82e8bfc175e639e4bedf3edb00
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 9406f91e85fdf813056a4b04df8b7d764a4333741a16cf3d4496698557e7d783
- fileCount: 50
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedTargetSupportArchitecture: [target-support-architecture-v1.md](target-support-architecture-v1.md)
- relatedTargetSupportOperations: [target-support-operations-v1.md](target-support-operations-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityArchitecture: [target-observability-architecture-v1.md](target-observability-architecture-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedTargetSloArchitecture: [target-slo-architecture-v1.md](target-slo-architecture-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
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
| `README.md` | 171633 | `b424c862addd063a43559163b920d7e75110222680a01bcfd1d49edb2860f245` |
| `docs/product-plan-v1.md` | 12752 | `bef388db1857f661d924ea1e8b55e02d752c446ec938732f8643e772d750f45c` |
| `docs/security-model-v1.md` | 31318 | `195f82d4d18d59be9989ab6d9d302bf81ea7486152ea0ac92951bb4eaff116b6` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 59158 | `ead52462f47f74a3c657502e48eed624ae68487a44743f861b72868ee0fb3a16` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5760 | `66baa00da71aee1a2b9062c3501f485468ac6a2e1b3c4f6dbe1c6a00bc2d3f64` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5328 | `3b77fef9b2cb83c887a3c634292d7a14dbe1b24704d481d7046520db55f0d80d` |
| `docs/target-support-architecture-v1.md` | 7879 | `73392e33b1b854f04aa729958e3bdfa648f86c2f040387c7f6a1a448018b5b6b` |
| `docs/target-support-operations-v1.md` | 5748 | `577682d060b34209afb44dbf093d84101462d89a890105ad239155cba5eaf98d` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 4559 | `353e86d49e7672282efef694140924ec3131d3f735760fc132d089ef2bc645ad` |
| `docs/observability-telemetry-v1.md` | 4418 | `8b2a0abcd363e7421c4efd67ce7b0340149cf2693552197087ce353deb8539bf` |
| `docs/target-observability-architecture-v1.md` | 7083 | `1c068d8c4f758ebdb1799e8cb97fd379cfe6dd0c6819eb2e23a824643bb64cbd` |
| `docs/target-observability-operations-v1.md` | 5170 | `842327b061b0b6e8f13ceaeb48fb85bb55763f33a400251ebe126fd7e4854252` |
| `docs/target-slo-architecture-v1.md` | 7879 | `f2e45ee41062f2e415da2b489efecdb45b0222c75950eb6b82a86e63782bcbad` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 7712 | `a0971a6c120a414acf63960c78de38b95f695d6e6620f2a9e4df3baa94d76b35` |
| `docs/target-clean-deployment-architecture-v1.md` | 7515 | `9d19841b7c0eecb4ca09b6cee7515542ef5964ee10d7d60ed720b5067dea40ae` |
| `docs/target-retention-operations-v1.md` | 5907 | `765b2ab63c9cfa0f4bc08f155781d43b603f915da221929a347155dd0af2938f` |
| `docs/target-backup-operations-v1.md` | 5365 | `7e495e2b86760b8f83b73e98f2074b365c4c1d37d774a122fcc8ea3b69482a83` |
| `docs/identity-session-admin-v1.md` | 4817 | `3c2c72168aa7bd6302f4b7e1cdd3666adebcdaeddf7709f1e13c702c11cd61d4` |
| `docs/tenant-storage-admin-v1.md` | 5044 | `e76454f983e0796ba10753189b07b6ce38480d002ecfc757ab125840dba64288` |
| `docs/clean-deployment-release-v1.md` | 9578 | `8fa118d252d0a2aabb05fe42c5faaf84f8cb2949fe31abdde583e7bb25a65ffd` |
| `docs/production-slo-operating-v1.md` | 8157 | `13b63f1a71404be77804ad72604142ec20ab7811861a9a251b34aa5266a88b5b` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 7412 | `df6f714b1cf0c08c9dcf1158612c3dddeabeb2bdf8f795a2b2d85c4b6e5bac33` |
| `docs/target-provider-evidence-intake-v1.md` | 5015 | `580769b77c759a699d15ff472c9845caf849270052789e20e8d48df0c1cfcd90` |
| `docs/target-local-provider-architecture-v1.md` | 7647 | `1c3e40ff1aaba558888f94c7ec0b73c127cd615debdeec2474e8c75df77dda75` |
| `docs/target-hermes-provider-architecture-v1.md` | 7338 | `28ce1d5a13736f47ea11fd4d8440b6e01490735ffa65aa5016093075cb117af0` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 17330 | `620f193143afb245095993bd2c963f98d227f1ee228bf5d594b67331dca8f418` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6387 | `771a895cff02ee4e7bcba087555686f1162738e6f566e22e61a4b07688689229` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6305 | `a715fc5d62517a40c3f4c447a471bed364dd6b7960ecff66f69565079e1cc892` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 8277 | `a6cc15cb08583ba100360daab2336791e2577e791da53de65fbe102ddac03997` |
| `docs/release-readiness-v1.md` | 31467 | `e743a8fba268dc16e57142458f9e424650d2c99f7b5e3feb2d567a911ed6c8bd` |
| `docs/production-like-release-drill-v1.md` | 15882 | `0503689671b5b03e5acb3dceaf4b4305e574a4652711ab86a433e0ccff8f2323` |
| `docs/execution-v1-evidence.md` | 10165 | `8fbfc3b90e0c3dace6fdc400a1b8508767be177b75cf0c78996b38ce4b29beed` |
| `docs/execution-v1-closeout.md` | 3351 | `43a08d8a808f69ebab1db8e42d9cdad78d9ddd317f5f2b51056795a0d52f5f76` |
| `docs/execution-v1-handoff.md` | 5240 | `b72a9aee3739e6e7d63ef1012516a8a871c97db6bea1bdaa070b5f800ba7a573` |
| `docs/releases/execution-v1/c36025b279d46e82e8bfc175e639e4bedf3edb00/execution-v1-evidence.md` | 10249 | `265e0a4ef75327356d30f52c685acdde98a4cd91544d5f2fb304e117c9313867` |
| `docs/releases/execution-v1/c36025b279d46e82e8bfc175e639e4bedf3edb00/execution-v1-closeout.md` | 3503 | `e993a5ecfd43817ad8b4638507914226a473b11b62b6714865b42939a84ce7f8` |
| `docs/releases/execution-v1/c36025b279d46e82e8bfc175e639e4bedf3edb00/execution-v1-handoff.md` | 5469 | `84635f5a38bb8488ba16175bfdab1c40d86e646d62b84df62f2666267ec401e6` |
| `docs/releases/execution-v1/c36025b279d46e82e8bfc175e639e4bedf3edb00/snapshot.json` | 487 | `70aa035dbb8ba8672ef9db871da52f340cba7f1a5655c659ad6bc188fe7f7223` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
