# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-24T05:56:21.198Z
- verifiedCommit: 570ea89b1f1dbdef3722dbcc009eeba82e864ee4
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: e518b5a12236e606c3fc402cc11226c89d58a99188d46c8a60f74feeb95fbf8c
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
| `README.md` | 189747 | `52e778c597cd3c63b514d34cc1d5e9b4ee0a6de8906ad640e60606f7bf239bd1` |
| `docs/product-plan-v1.md` | 14987 | `22ccc9b0276672b68c232e64f31788619965423850d88f7fe7ee56cfb18ba9db` |
| `docs/security-model-v1.md` | 39292 | `9b7f2a28eea638c62e1b2913bea4fc8d68f91ff928a0ae3fa4025c4f0f05d038` |
| `docs/operator-runbook-v1.md` | 16410 | `f65c8794dae2f64042b1347a4041cd16f4b10deacb72cf89aba58d7ce38bc38a` |
| `docs/deployment-pilot-v1.md` | 80923 | `1fc2911c1ff618516e0633e91242582314dd34cb3bea1831f52e64d2da04ea0c` |
| `docs/pilot-onboarding-v1.md` | 11531 | `6ff643be98066ef785fe8d2852ee3846adf9734186acd222c1756c197d1ef64a` |
| `docs/demo-scenarios-v1.md` | 15384 | `6449b78afc0d8e14429926fd0f9b250ca0098e8ee4ec3443231fb780bf34aaf5` |
| `docs/incident-slo-v1.md` | 6052 | `8e28ef80a072eed5e731b4db1ce7953d2a660689844a4566eec8d7b09d57f95d` |
| `docs/customer-support-operations-v1.md` | 6200 | `8ed125281443fce70deb133eecfd9108744320ad1d977c5061e349f6fb1ab873` |
| `docs/support-escalation-review-v1.md` | 5328 | `3b77fef9b2cb83c887a3c634292d7a14dbe1b24704d481d7046520db55f0d80d` |
| `docs/target-support-architecture-v1.md` | 7879 | `73392e33b1b854f04aa729958e3bdfa648f86c2f040387c7f6a1a448018b5b6b` |
| `docs/target-support-operations-v1.md` | 10481 | `8857a22538bc216fafaae247ab085fcbcfaabea4f8ee99b74b9f8229cbb1b371` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 4559 | `353e86d49e7672282efef694140924ec3131d3f735760fc132d089ef2bc645ad` |
| `docs/observability-telemetry-v1.md` | 4418 | `8b2a0abcd363e7421c4efd67ce7b0340149cf2693552197087ce353deb8539bf` |
| `docs/target-observability-architecture-v1.md` | 8217 | `fda2c8d6c822fdcb4d30a8aa59025bd8e94a445e87bc29cdce1d69695dbe70c7` |
| `docs/target-observability-operations-v1.md` | 8187 | `23a52b518da8f85e5a74426addbbac8e2e1e2e67154f610070e94c17b1ad19cb` |
| `docs/target-slo-architecture-v1.md` | 9270 | `2471789c745deba0de18f95d3ae3c75660b809ff41c14dd15e740f389f25b830` |
| `docs/target-slo-operations-v1.md` | 9873 | `e19f0390ca38cdd1113ee1cd70b74b4155c89f384517d5b2f4b19cb0b435c977` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 7712 | `a0971a6c120a414acf63960c78de38b95f695d6e6620f2a9e4df3baa94d76b35` |
| `docs/target-clean-deployment-architecture-v1.md` | 7957 | `726327f99293d080c4da78c1a7abdba3101f4dd3ee4e9fbbde35322d3e930f82` |
| `docs/target-clean-deployment-operations-v1.md` | 9676 | `365c284435bc4bd5e572dad9568ced968a84509f460439ed7ec9ed04562f4eb5` |
| `docs/target-retention-operations-v1.md` | 8162 | `869bd3698a2eae1f48ec2db93f4e497865e0bbd7d12867bcccd5f1183664ef8d` |
| `docs/target-backup-operations-v1.md` | 7872 | `8cd93c20032803e555a4c87979f840813c1238a5a6d2e33fea4b1d1e349d49e4` |
| `docs/identity-session-admin-v1.md` | 5038 | `5d8288baa2d97f8f333ab3400924569fa472635fb2b79c56b9447d7960cef69a` |
| `docs/tenant-storage-admin-v1.md` | 5265 | `196643ffccc0778c211d82e063e5c6067444a53f550e1b134eecdfad9b6d7186` |
| `docs/clean-deployment-release-v1.md` | 11876 | `cd15b87089e404c59a9b0e33b1af6940c183dcdcdc84104f79255c9666c00f18` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 11130 | `514aba159394b661cbac5e70c7cd397a933fd841b80e139b74f958ad79dd9494` |
| `docs/target-provider-evidence-intake-v1.md` | 10566 | `d097c171096366359b6f0f7ff9ce8443744ed81241d575a7b0c61869f34c9ab6` |
| `docs/target-provider-operations-v1.md` | 19300 | `9d3e313048803539d7c2eab7b3adab8845ec39a1b0b1c36c4ab8cc15aad18a7d` |
| `docs/target-openai-provider-account-v1.md` | 12230 | `abbf171f9da78e952e2854d221a6382ef373927f58cf8d48c3522ace8ad6236b` |
| `docs/target-anthropic-provider-account-v1.md` | 12310 | `90de3698bbbc97db243909a0e0aac33a9bfc9fc9575ef24b5f41fd3e1599bb37` |
| `docs/target-local-provider-architecture-v1.md` | 11949 | `a390c78118396856431d1aecc8bd8c91131016d2ae3cdfc4043628872a0e2bc3` |
| `docs/target-hermes-provider-architecture-v1.md` | 11758 | `a39a07a49cc36e14e5b62de4154541f3c122f07e1b3cd3dc6d90ce909c460c8a` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 44390 | `5e79628f4223135913b82216b163e8db810a6b75a9afadf2ca592f2911b95cd5` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 8465 | `a7ef8624aff2308855b7ffed49c13fe30397c533ee8d849c0b6e9930042e80c8` |
| `docs/target-identity-session-operations-v1.md` | 13520 | `7b96655c9b1bcb0053f048428d23b4a4e739869b607429621401ab4e432b5eea` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 10047 | `4742f3eb4672e57b784ea227e104796923c6afc0332b7c8cc2a72be2afe775d7` |
| `docs/target-tenant-isolation-operations-v1.md` | 15089 | `fd494ef13c2b6974905e703751616aafb1819518c30831faf4fad2b9d4ae3e01` |
| `docs/target-secret-manager-architecture-v1.md` | 7132 | `9e2f8db426c4f4a706d1513a579dfe2d6addb092d8c2216ce23a924d44646b95` |
| `docs/target-environment-evidence-intake-v1.md` | 37864 | `c42b4ce1cd3832735cf59920557cc34b0e828642fb7ab14caeaf1ae307477f70` |
| `docs/release-readiness-v1.md` | 85630 | `0c30b6715e05b0ffcdeff3bf8429449fd2663e6aa7cc5bf10c069f6670800a97` |
| `docs/production-like-release-drill-v1.md` | 55726 | `b3ce90cac534a6e89239c8e69ae3ab16a529468dde6373583e3374145ea50328` |
| `docs/execution-v1-evidence.md` | 10427 | `1a833dea8c967a7f7ef3cdbbea178a851193b43119c8d4d906a9ddb0c7b94fce` |
| `docs/execution-v1-closeout.md` | 3249 | `56217b0184090e576e61e02adeff4fa48883697cc6ed36d41eaeb558b3c68a86` |
| `docs/execution-v1-handoff.md` | 6968 | `16f0f0a3ee0a0cef35ab09d38a7576279e56ceef9ad292407b3f6dd08bc30077` |
| `docs/releases/execution-v1/570ea89b1f1dbdef3722dbcc009eeba82e864ee4/execution-v1-evidence.md` | 10511 | `a39598c3d22fcb36f27df1b28e6c1d33a4132f2bfea00e990d4efbc57233552a` |
| `docs/releases/execution-v1/570ea89b1f1dbdef3722dbcc009eeba82e864ee4/execution-v1-closeout.md` | 3401 | `c481baded658b8f211b08c58f01e077b8a68efb4b352941cdd85c17edd2f61dc` |
| `docs/releases/execution-v1/570ea89b1f1dbdef3722dbcc009eeba82e864ee4/execution-v1-handoff.md` | 7197 | `6be5106bcefa10aeb25777bb799f2a0e633ed2e68b89d63969bb776e538933f4` |
| `docs/releases/execution-v1/570ea89b1f1dbdef3722dbcc009eeba82e864ee4/snapshot.json` | 487 | `3e9afb06e5db3687172f4e48e1a9739b02f4ddb15bf6c0538aae651c1d88bbfb` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
