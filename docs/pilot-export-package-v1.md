# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-23T15:36:42.000Z
- verifiedCommit: e24f08314e918f5d1fd9933f0179d81bb49d1000
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 9c653dc71288748a7c5a78c6f9d9fb6de8270120ddefc0529375e1f9c09587eb
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
| `docs/target-clean-deployment-architecture-v1.md` | 7691 | `0a13442d5ac2144e04eebe8faed583480c8a2b445341dece2ba6df562ae1e686` |
| `docs/target-clean-deployment-operations-v1.md` | 9356 | `ea23523450a3bad7da9c751b4590efcdfb73160998d88749b37108150e272bd5` |
| `docs/target-retention-operations-v1.md` | 8162 | `869bd3698a2eae1f48ec2db93f4e497865e0bbd7d12867bcccd5f1183664ef8d` |
| `docs/target-backup-operations-v1.md` | 7872 | `8cd93c20032803e555a4c87979f840813c1238a5a6d2e33fea4b1d1e349d49e4` |
| `docs/identity-session-admin-v1.md` | 5038 | `5d8288baa2d97f8f333ab3400924569fa472635fb2b79c56b9447d7960cef69a` |
| `docs/tenant-storage-admin-v1.md` | 5265 | `196643ffccc0778c211d82e063e5c6067444a53f550e1b134eecdfad9b6d7186` |
| `docs/clean-deployment-release-v1.md` | 11884 | `5e09b93183574eda115154b0fc910a93c05eb17bbf6452bcb5e1e3a2c1b2730b` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 11138 | `e5246a3f00a8eeceb581b8c4895bb68beddb3eeb21de856944de4bfbb5c4ce66` |
| `docs/target-provider-evidence-intake-v1.md` | 10566 | `d097c171096366359b6f0f7ff9ce8443744ed81241d575a7b0c61869f34c9ab6` |
| `docs/target-provider-operations-v1.md` | 19300 | `9d3e313048803539d7c2eab7b3adab8845ec39a1b0b1c36c4ab8cc15aad18a7d` |
| `docs/target-openai-provider-account-v1.md` | 12230 | `abbf171f9da78e952e2854d221a6382ef373927f58cf8d48c3522ace8ad6236b` |
| `docs/target-anthropic-provider-account-v1.md` | 12310 | `90de3698bbbc97db243909a0e0aac33a9bfc9fc9575ef24b5f41fd3e1599bb37` |
| `docs/target-local-provider-architecture-v1.md` | 11949 | `a390c78118396856431d1aecc8bd8c91131016d2ae3cdfc4043628872a0e2bc3` |
| `docs/target-hermes-provider-architecture-v1.md` | 11758 | `a39a07a49cc36e14e5b62de4154541f3c122f07e1b3cd3dc6d90ce909c460c8a` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 44070 | `2bd829c28d91c9588c61a5a4c0c0af06c9091501fa0241308ec70dd79d3492d3` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 8465 | `a7ef8624aff2308855b7ffed49c13fe30397c533ee8d849c0b6e9930042e80c8` |
| `docs/target-identity-session-operations-v1.md` | 13520 | `7b96655c9b1bcb0053f048428d23b4a4e739869b607429621401ab4e432b5eea` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 10047 | `4742f3eb4672e57b784ea227e104796923c6afc0332b7c8cc2a72be2afe775d7` |
| `docs/target-tenant-isolation-operations-v1.md` | 15089 | `fd494ef13c2b6974905e703751616aafb1819518c30831faf4fad2b9d4ae3e01` |
| `docs/target-secret-manager-architecture-v1.md` | 7132 | `9e2f8db426c4f4a706d1513a579dfe2d6addb092d8c2216ce23a924d44646b95` |
| `docs/target-environment-evidence-intake-v1.md` | 37800 | `702ad24ad8888b11a608181bab830f53da67879cbe1566f0ab0fda2e2e6901e0` |
| `docs/release-readiness-v1.md` | 85310 | `564cbf437a215b5c837639bfd4c916116e7ec1b1807c062a816dec0adb74ac15` |
| `docs/production-like-release-drill-v1.md` | 55422 | `86fb06ba7f085551ed1c60b3255b0e2bcd2de828f810e340b0c7392ea8f76c24` |
| `docs/execution-v1-evidence.md` | 10437 | `7d9bc0742a36573bb43fe07c0d151626b4318421db327a255fda27f1463efc6f` |
| `docs/execution-v1-closeout.md` | 3257 | `446b3aa4e68bddf9256eaeb6783544d6db0e9fa323cd4f9e8a41dc17a42999b9` |
| `docs/execution-v1-handoff.md` | 6976 | `9f0d69c4dd94c7129f632c89844718c3055516beda0d2e31cb5172a2d6cef9d6` |
| `docs/releases/execution-v1/e24f08314e918f5d1fd9933f0179d81bb49d1000/execution-v1-evidence.md` | 10521 | `f1b8b3a6e3bbb538b60651b44526695fcb8442b03b1ae1550e20523be71142fa` |
| `docs/releases/execution-v1/e24f08314e918f5d1fd9933f0179d81bb49d1000/execution-v1-closeout.md` | 3409 | `59d529289bf6ce42ce95972ee6a2a91c73c67119de2566e7e29c1f04fe315038` |
| `docs/releases/execution-v1/e24f08314e918f5d1fd9933f0179d81bb49d1000/execution-v1-handoff.md` | 7205 | `0135d670034b792c661120f76a9322f4e03992eb2c8346b8838f131406af86f6` |
| `docs/releases/execution-v1/e24f08314e918f5d1fd9933f0179d81bb49d1000/snapshot.json` | 487 | `87cf9b7722abebea5a0eb06b81e206b00beedf34acd292e053bc3d91e9f3b063` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
