# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-19T06:44:26.978Z
- verifiedCommit: dc92096f761d4aff68bb3fd858e9804d64f868f0
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 855282d113594148b1c55385b02ee4c7627cc45b7014499c7b4970928e796a53
- fileCount: 57
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
- relatedTargetSloOperations: [target-slo-operations-v1.md](target-slo-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedTargetDataLifecycleArchitecture: [target-data-lifecycle-architecture-v1.md](target-data-lifecycle-architecture-v1.md)
- relatedTargetCleanDeploymentArchitecture: [target-clean-deployment-architecture-v1.md](target-clean-deployment-architecture-v1.md)
- relatedTargetCleanDeploymentOperations: [target-clean-deployment-operations-v1.md](target-clean-deployment-operations-v1.md)
- relatedTargetRetentionOperations: [target-retention-operations-v1.md](target-retention-operations-v1.md)
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedTargetProviderEvidenceIntake: [target-provider-evidence-intake-v1.md](target-provider-evidence-intake-v1.md)
- relatedTargetProviderOperations: [target-provider-operations-v1.md](target-provider-operations-v1.md)
- relatedTargetOpenAIProviderAccount: [target-openai-provider-account-v1.md](target-openai-provider-account-v1.md)
- relatedTargetAnthropicProviderAccount: [target-anthropic-provider-account-v1.md](target-anthropic-provider-account-v1.md)
- relatedTargetLocalProviderArchitecture: [target-local-provider-architecture-v1.md](target-local-provider-architecture-v1.md)
- relatedTargetHermesProviderArchitecture: [target-hermes-provider-architecture-v1.md](target-hermes-provider-architecture-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)
- relatedHostedSaasArchitectureDecision: [hosted-saas-architecture-decision-v1.md](hosted-saas-architecture-decision-v1.md)
- relatedHostedIdentitySessionArchitecture: [hosted-identity-session-architecture-v1.md](hosted-identity-session-architecture-v1.md)
- relatedTargetIdentitySessionOperations: [target-identity-session-operations-v1.md](target-identity-session-operations-v1.md)
- relatedHostedTenantIsolationArchitecture: [hosted-tenant-isolation-architecture-v1.md](hosted-tenant-isolation-architecture-v1.md)
- relatedTargetTenantIsolationOperations: [target-tenant-isolation-operations-v1.md](target-tenant-isolation-operations-v1.md)
- relatedTargetSecretManagerArchitecture: [target-secret-manager-architecture-v1.md](target-secret-manager-architecture-v1.md)
- relatedTargetEnvironmentEvidenceIntake: [target-environment-evidence-intake-v1.md](target-environment-evidence-intake-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 185576 | `ae33d9fc9611e931f6ef6875003b30a012fa3e3d1771358fc109195ee889c5d1` |
| `docs/product-plan-v1.md` | 14428 | `6f23b58cf34c8286ca76ab7eaab95979712eb72160c7cc7f9022fd2168da37b1` |
| `docs/security-model-v1.md` | 35087 | `ba42f7eb0121f3c755065d1a1a4918e0da01886775b0cbb5523c606af3a670cb` |
| `docs/operator-runbook-v1.md` | 14878 | `e82d3777c3a87311eb312bbd2a34b124c461275523c4494813e89cc51502dbae` |
| `docs/deployment-pilot-v1.md` | 72018 | `2dc1d5960ecd467637b605a581327897091b87421247f188748f822b3e8a065a` |
| `docs/pilot-onboarding-v1.md` | 10523 | `02411e20ddd63bf93f0824a541779280add7e33aaa17f4fadda7520c29ea709c` |
| `docs/demo-scenarios-v1.md` | 13373 | `2ec17b6796bf0e3024ee8a04d2cafe680a66a1b751716f9480183a2243544c04` |
| `docs/incident-slo-v1.md` | 6052 | `8e28ef80a072eed5e731b4db1ce7953d2a660689844a4566eec8d7b09d57f95d` |
| `docs/customer-support-operations-v1.md` | 6200 | `8ed125281443fce70deb133eecfd9108744320ad1d977c5061e349f6fb1ab873` |
| `docs/support-escalation-review-v1.md` | 5328 | `3b77fef9b2cb83c887a3c634292d7a14dbe1b24704d481d7046520db55f0d80d` |
| `docs/target-support-architecture-v1.md` | 7879 | `73392e33b1b854f04aa729958e3bdfa648f86c2f040387c7f6a1a448018b5b6b` |
| `docs/target-support-operations-v1.md` | 5748 | `577682d060b34209afb44dbf093d84101462d89a890105ad239155cba5eaf98d` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 4559 | `353e86d49e7672282efef694140924ec3131d3f735760fc132d089ef2bc645ad` |
| `docs/observability-telemetry-v1.md` | 4418 | `8b2a0abcd363e7421c4efd67ce7b0340149cf2693552197087ce353deb8539bf` |
| `docs/target-observability-architecture-v1.md` | 7083 | `1c068d8c4f758ebdb1799e8cb97fd379cfe6dd0c6819eb2e23a824643bb64cbd` |
| `docs/target-observability-operations-v1.md` | 5170 | `842327b061b0b6e8f13ceaeb48fb85bb55763f33a400251ebe126fd7e4854252` |
| `docs/target-slo-architecture-v1.md` | 8004 | `abf2e8beb5b5d355bc534f52e044b956c6199ce416bc59bc3f28aedb8f969435` |
| `docs/target-slo-operations-v1.md` | 9191 | `b6c5b4f5dab8cd887bafc188d39cb42445b16d641b740118380c39069d38d70c` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 7712 | `a0971a6c120a414acf63960c78de38b95f695d6e6620f2a9e4df3baa94d76b35` |
| `docs/target-clean-deployment-architecture-v1.md` | 7691 | `0a13442d5ac2144e04eebe8faed583480c8a2b445341dece2ba6df562ae1e686` |
| `docs/target-clean-deployment-operations-v1.md` | 9356 | `ea23523450a3bad7da9c751b4590efcdfb73160998d88749b37108150e272bd5` |
| `docs/target-retention-operations-v1.md` | 5907 | `765b2ab63c9cfa0f4bc08f155781d43b603f915da221929a347155dd0af2938f` |
| `docs/target-backup-operations-v1.md` | 5365 | `7e495e2b86760b8f83b73e98f2074b365c4c1d37d774a122fcc8ea3b69482a83` |
| `docs/identity-session-admin-v1.md` | 5038 | `5d8288baa2d97f8f333ab3400924569fa472635fb2b79c56b9447d7960cef69a` |
| `docs/tenant-storage-admin-v1.md` | 5265 | `196643ffccc0778c211d82e063e5c6067444a53f550e1b134eecdfad9b6d7186` |
| `docs/clean-deployment-release-v1.md` | 11707 | `69c650b02256b4129b6c446452c9adb4f14f7e8d63abb4eb8794e1a844a3e2e5` |
| `docs/production-slo-operating-v1.md` | 8945 | `ca23ab86aba846614f25518266055de2f1a7c5ffb4d52a342ad05629506f242b` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 9389 | `8981c3835e6439d833bf62ff6a10372e0502fcf55efd870048384a020fdf427f` |
| `docs/target-provider-evidence-intake-v1.md` | 8900 | `5a73efe7188803040ad57edaa95fe162acdf63a27eae0cc44589320be3332894` |
| `docs/target-provider-operations-v1.md` | 17847 | `ae38ffa64154b00aad9d7cf0ca4cd248a3d7fcf40378eca29fea5890261c1635` |
| `docs/target-openai-provider-account-v1.md` | 10958 | `ae5f69e170b199b63f0d0b1bfc203720d572c4db245a52a6502808a1a75b3c13` |
| `docs/target-anthropic-provider-account-v1.md` | 11014 | `deff87c76a566782738dbbb4a8f035f6203f9dae09bb769f3a7109b51bcd2a3a` |
| `docs/target-local-provider-architecture-v1.md` | 11048 | `cf79dca9a7206cbcd28af0d68f1f274da53f7e6a05138f178026ca90e186a1bc` |
| `docs/target-hermes-provider-architecture-v1.md` | 10997 | `2d3ae78ef6d76360482c713c24e705e98586c488c017fd680bee646568d7802a` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 28248 | `fa939d7a7b7285d6cd00b2552d5c67d160ad035cc019402c1becf3898e219acd` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6563 | `8ea7cc65da2aedf1a1538a8aff302a8a0ce0a35e0e91d34439cc5d35168d14de` |
| `docs/target-identity-session-operations-v1.md` | 11675 | `668530e27322cbc62574cbef7548aa4a2b081a6d46d558f383c9b263f1ca1f8c` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6481 | `3f5eafc98ceb74e045865e30a9611a934bff26828948f4f9660093220f953b9d` |
| `docs/target-tenant-isolation-operations-v1.md` | 12129 | `dc8a83aaf504f45333c552e1871ce8ab38c9ddc6cef70c6768e9ee13aa452890` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 27372 | `224069ac65e166dd46c2fafb25ba2817040dce41c8d2f96e429988991e9e328d` |
| `docs/release-readiness-v1.md` | 44237 | `ee1d33e189b90291aa3dfe83c01254ece73ab64bad056f081aa50fd1a2a9a463` |
| `docs/production-like-release-drill-v1.md` | 22691 | `b8d6fb3ff7e8ea61ff60f29821a1affaeae596ed0a0d2e0ad8ac834daaa2e81a` |
| `docs/execution-v1-evidence.md` | 10439 | `e64647eab9de3bef520e3228204768bd24658122c6e0beabe0c2feba5a0e29b2` |
| `docs/execution-v1-closeout.md` | 3259 | `d8cc4e4a7d261f10e90c93c3505e983e9fd4900e1100a2462d30484e001c4ec3` |
| `docs/execution-v1-handoff.md` | 5905 | `956b05c0be6c8f56de334bf00b96fa0e8e682b8e95a586afbf924e3c0f590a46` |
| `docs/releases/execution-v1/dc92096f761d4aff68bb3fd858e9804d64f868f0/execution-v1-evidence.md` | 10523 | `4feb30d181882426c8328fccb3304f282f9de27320fe6a9d9c96b693f678e9a1` |
| `docs/releases/execution-v1/dc92096f761d4aff68bb3fd858e9804d64f868f0/execution-v1-closeout.md` | 3411 | `2e09e53a8c63271aa3f38443a6eed36626e74a0beb494ee5f4741dd1a7bba932` |
| `docs/releases/execution-v1/dc92096f761d4aff68bb3fd858e9804d64f868f0/execution-v1-handoff.md` | 6134 | `a48118d8cfc10dfabe257f27e21724805078a57d2d828fabb3a4c04c6ff4935d` |
| `docs/releases/execution-v1/dc92096f761d4aff68bb3fd858e9804d64f868f0/snapshot.json` | 487 | `6378cbfbcc939f0bb23b8a029f99cf7f3e5aaac51f4a64e46f70c222aafa3cb8` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
