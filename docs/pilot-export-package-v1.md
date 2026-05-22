# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-22T02:39:43.281Z
- verifiedCommit: 0f3485372e594f9689119c80d8b91e213f3f3efe
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 16ee4949857e32ba0c5588239e27240819218f86ca3f88917c4cccbe5cd91b15
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
| `README.md` | 189600 | `bc054b5205601e10fd3f65907320fb063a0e2c2f7df72039e2b17176325fbc47` |
| `docs/product-plan-v1.md` | 14929 | `6439c01a8e17b70c8290097189ab3cc064daf13b24982c868c81384a13dba9b4` |
| `docs/security-model-v1.md` | 39166 | `2e596b68726f4f9d3d43f2dc612ad381dfbd738668f5f1add6f8e9d0b7d89c8a` |
| `docs/operator-runbook-v1.md` | 16236 | `969e368984e44b515b6c849fa3b3ed15171641be995382c78340fc88d88f69fe` |
| `docs/deployment-pilot-v1.md` | 80678 | `6de930b5677a160c80e411a6e8e93b910da84a2c0c8bd74942ce2e420ad3c7ee` |
| `docs/pilot-onboarding-v1.md` | 11415 | `57fb797d4ca7af9abf5e5b75a5f009f45062bfe8d8b6542056214d2302e7bf9c` |
| `docs/demo-scenarios-v1.md` | 15210 | `de66ce82e515ee6359bf989d22d28f54d4f29366d7ade59e72da37936d431fd7` |
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
| `docs/clean-deployment-release-v1.md` | 11880 | `7b09617d2df895cbf1494b8d4d15d26056fa16ff09817f8a357153d3da200314` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 10969 | `8e6032e4de8292539ec5b0fd1a0f62b7e7f26cdd83500b5d0bf41029991e1eb8` |
| `docs/target-provider-evidence-intake-v1.md` | 10036 | `7dc989fec574a524b1bdfc9c8b4ab955fbbad54f7e73cf2cdd2a09f7961f20eb` |
| `docs/target-provider-operations-v1.md` | 18542 | `e08a015d2f816bcb6ab2d1852e833a7949da844d3610602c6d17cb724d2607e2` |
| `docs/target-openai-provider-account-v1.md` | 11699 | `7271723b46434bca9d7bc7f3d5beefdd20891094b6de1c0ab1a22cc29986e91d` |
| `docs/target-anthropic-provider-account-v1.md` | 11790 | `d0d2fa304a4ce0a8c3de932fef3c3079d9f7d60e38ad31db914e5241c3ee0d9e` |
| `docs/target-local-provider-architecture-v1.md` | 11722 | `ce37e5dbdead27979b76489cc914ffd690077a4a0bed81281d071f10c156dabd` |
| `docs/target-hermes-provider-architecture-v1.md` | 11438 | `9831899c5cd670165c5dec1606bac2fa7dec297256e3ed51665f3fe383c2cf87` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 43950 | `893e300776968012896bd5c397332bc75afb5c03bf9cd25427dd16da2d023ad6` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 8465 | `a7ef8624aff2308855b7ffed49c13fe30397c533ee8d849c0b6e9930042e80c8` |
| `docs/target-identity-session-operations-v1.md` | 13520 | `7b96655c9b1bcb0053f048428d23b4a4e739869b607429621401ab4e432b5eea` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 10047 | `4742f3eb4672e57b784ea227e104796923c6afc0332b7c8cc2a72be2afe775d7` |
| `docs/target-tenant-isolation-operations-v1.md` | 15089 | `fd494ef13c2b6974905e703751616aafb1819518c30831faf4fad2b9d4ae3e01` |
| `docs/target-secret-manager-architecture-v1.md` | 7132 | `9e2f8db426c4f4a706d1513a579dfe2d6addb092d8c2216ce23a924d44646b95` |
| `docs/target-environment-evidence-intake-v1.md` | 37721 | `9b94cf5e99e17c3fb32ad282df2ca3b6cdf0938102e75e64dc12c1b1f20d38ae` |
| `docs/release-readiness-v1.md` | 83840 | `b75842e691c334c47824d1908eb512950194c171952653666646257f9f5d25a0` |
| `docs/production-like-release-drill-v1.md` | 54395 | `ddc6bb75fb08fe786e6e47094e6c51ab57e6341dabcfcb99b01e32d58952727c` |
| `docs/execution-v1-evidence.md` | 10050 | `c0e930af88c47984f1c89f471e654a638f2f23a85d0440d3fa4ac15eb069d3ad` |
| `docs/execution-v1-closeout.md` | 3253 | `5aea9c4314356b430890b063200d4fade10fdb37712bb3a319867d0f698d048a` |
| `docs/execution-v1-handoff.md` | 6877 | `38fb7b1dce275125c274e0d2691a563f73e7b17b1a5c2825bff8dbf369078099` |
| `docs/releases/execution-v1/0f3485372e594f9689119c80d8b91e213f3f3efe/execution-v1-evidence.md` | 10134 | `2cb2ec3c3003f21167bbc97a476d4073a7f74b152d573d170adaa9166bb2cd69` |
| `docs/releases/execution-v1/0f3485372e594f9689119c80d8b91e213f3f3efe/execution-v1-closeout.md` | 3405 | `90205a6089d0b4112f74480f8e69497cbfcf30a1c206496453838c5980ce8d4b` |
| `docs/releases/execution-v1/0f3485372e594f9689119c80d8b91e213f3f3efe/execution-v1-handoff.md` | 7106 | `6308e74bcbceaa42a93795b1f7d8be68856976e7ec3979563e05d7269b3e11cc` |
| `docs/releases/execution-v1/0f3485372e594f9689119c80d8b91e213f3f3efe/snapshot.json` | 487 | `9f5944d296467b2e88aef416d4e4dd7dced00dfa6651e7984494fcf75c6ee129` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
