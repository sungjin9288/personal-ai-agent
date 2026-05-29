# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-29T06:00:12.005Z
- verifiedCommit: fa4bb66494a2365773a17816bb0f37a1c03744fa
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 37718a8170202493cdf2817a9c2b579d8c6c0235741b72d60139f057f1ad6018
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
| `README.md` | 190219 | `4e8d3aca0707338d398fd3d312072c9181641b5408bd8a4c56f9150f11b3deaf` |
| `docs/product-plan-v1.md` | 15459 | `6572614d5262aa4e915ef99c27ae63bdfe2e3c9081ce257c8bebaa5b79ce4261` |
| `docs/security-model-v1.md` | 39764 | `42f9a43d6930ea87b5cad305f7067194ed5a7100945659731b90ad4f51d23c14` |
| `docs/operator-runbook-v1.md` | 17537 | `5010c050f1921324f3adf75d5d4c796b6fbdde0c550f89f1f6b4849a4dcfc900` |
| `docs/deployment-pilot-v1.md` | 82325 | `bc454889d127e247acf259e07538051bbcde1f3acbfd02cd016de574994b630e` |
| `docs/pilot-onboarding-v1.md` | 12003 | `d6e3beeb3df6f5cf46d26f77331b770310d43c7eed616a6d09293c2a9668eb9c` |
| `docs/demo-scenarios-v1.md` | 15988 | `8c7833755dbbd7ad459bfd533fb089c225b5138670ba2bcbd6ebb8d1c89571bb` |
| `docs/incident-slo-v1.md` | 6052 | `8e28ef80a072eed5e731b4db1ce7953d2a660689844a4566eec8d7b09d57f95d` |
| `docs/customer-support-operations-v1.md` | 6200 | `8ed125281443fce70deb133eecfd9108744320ad1d977c5061e349f6fb1ab873` |
| `docs/support-escalation-review-v1.md` | 5328 | `3b77fef9b2cb83c887a3c634292d7a14dbe1b24704d481d7046520db55f0d80d` |
| `docs/target-support-architecture-v1.md` | 9203 | `d9272d05871c2ed77cb15dc276fd341c96cef11e74dafa481aece71fc1b7a959` |
| `docs/target-support-operations-v1.md` | 10481 | `8857a22538bc216fafaae247ab085fcbcfaabea4f8ee99b74b9f8229cbb1b371` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 4559 | `353e86d49e7672282efef694140924ec3131d3f735760fc132d089ef2bc645ad` |
| `docs/observability-telemetry-v1.md` | 4418 | `8b2a0abcd363e7421c4efd67ce7b0340149cf2693552197087ce353deb8539bf` |
| `docs/target-observability-architecture-v1.md` | 9840 | `9ab1e84144a86cfd81c3ada9d70b76b583c762ab6ef175fc6b81d96331ea5e78` |
| `docs/target-observability-operations-v1.md` | 8187 | `23a52b518da8f85e5a74426addbbac8e2e1e2e67154f610070e94c17b1ad19cb` |
| `docs/target-slo-architecture-v1.md` | 10720 | `aee95a9cec9ef9fb6fc1d60b4a31016440896db108f80053b394f06d55850e09` |
| `docs/target-slo-operations-v1.md` | 9873 | `e19f0390ca38cdd1113ee1cd70b74b4155c89f384517d5b2f4b19cb0b435c977` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 9665 | `67efbdeea24eb6ebb16f6936902ea1baafafc76e8e0ebcc12cda9b00984f7091` |
| `docs/target-clean-deployment-architecture-v1.md` | 9944 | `1c34f9dfb33c77d3db7396ebb240a4ef6f5757e08311298fbc4251cd029329e2` |
| `docs/target-clean-deployment-operations-v1.md` | 9676 | `365c284435bc4bd5e572dad9568ced968a84509f460439ed7ec9ed04562f4eb5` |
| `docs/target-retention-operations-v1.md` | 8162 | `869bd3698a2eae1f48ec2db93f4e497865e0bbd7d12867bcccd5f1183664ef8d` |
| `docs/target-backup-operations-v1.md` | 7872 | `8cd93c20032803e555a4c87979f840813c1238a5a6d2e33fea4b1d1e349d49e4` |
| `docs/identity-session-admin-v1.md` | 5038 | `5d8288baa2d97f8f333ab3400924569fa472635fb2b79c56b9447d7960cef69a` |
| `docs/tenant-storage-admin-v1.md` | 5265 | `196643ffccc0778c211d82e063e5c6067444a53f550e1b134eecdfad9b6d7186` |
| `docs/clean-deployment-release-v1.md` | 11878 | `7f63da40c323b66cbb5c1001c2f6baaac751285cbebc12e137cd89d51038f7f7` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 20113 | `0b799dbfa8ade01e6331995c64bf7a7f2ce62c09702c3c749da7440c520690b5` |
| `docs/target-provider-evidence-intake-v1.md` | 13617 | `17f4750fe722f151743181f94a7d58f149f47976e7175c2772bbac1f8732b4c1` |
| `docs/target-provider-operations-v1.md` | 22263 | `2cbf909fd2cad9803048f801066d1fd46d2dc00b985a9aea746eda87c2fa0ef7` |
| `docs/target-openai-provider-account-v1.md` | 14039 | `15f7eb72f44b2fd93d1dfbe8eea2c7fca708afd3d7c8061644863b3bbe1b7b0b` |
| `docs/target-anthropic-provider-account-v1.md` | 14164 | `8c39979ddb44e2420e6af92799f0c25044bab066adb715de56ffd721ec99b9d9` |
| `docs/target-local-provider-architecture-v1.md` | 13894 | `e4eeb0dfe1dabaeecd1f96c7c8961c226852c9d4ab568a677569b8a9e941527c` |
| `docs/target-hermes-provider-architecture-v1.md` | 13676 | `19c4d70cc53acbe306a62f92b82631a3a789aa2175d9878b2ad2b6e046e514ef` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 46875 | `cf564b2861242343dfafc353dd9182d929bcda42a2acbd91b698f019e7a3b2f7` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 8465 | `a7ef8624aff2308855b7ffed49c13fe30397c533ee8d849c0b6e9930042e80c8` |
| `docs/target-identity-session-operations-v1.md` | 13520 | `7b96655c9b1bcb0053f048428d23b4a4e739869b607429621401ab4e432b5eea` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 10047 | `4742f3eb4672e57b784ea227e104796923c6afc0332b7c8cc2a72be2afe775d7` |
| `docs/target-tenant-isolation-operations-v1.md` | 15089 | `fd494ef13c2b6974905e703751616aafb1819518c30831faf4fad2b9d4ae3e01` |
| `docs/target-secret-manager-architecture-v1.md` | 9085 | `805cf311fb11c26b7ec03f35241d40c41546d835cf0109809a2bddcfc099de1d` |
| `docs/target-environment-evidence-intake-v1.md` | 46296 | `1e54ac2484b9e4fa5d7f76d5ccbf95b6e16db54c490e6786794e665d2e1de668` |
| `docs/release-readiness-v1.md` | 92579 | `5c65024e30def571fe6d43b96c271c1ccc7c07e156695c8418da7526022bc4f0` |
| `docs/production-like-release-drill-v1.md` | 56167 | `cb62842a76f03f4be8cdbeb78d299b9dc4e2dbf6878438a8a2d7f8d955f82dc8` |
| `docs/execution-v1-evidence.md` | 10431 | `63365de8bad3707082318b78aac441d05d092e5e696a4f6d3472232563aed9c1` |
| `docs/execution-v1-closeout.md` | 3251 | `5e29ebaa473418a683c7b1bd064ca617696712ff636ea6aeb425e4f5541bf0c6` |
| `docs/execution-v1-handoff.md` | 8892 | `22241837176342056ea325e6a9704fa5e3fec192da9150acc66aebe908041b7c` |
| `docs/releases/execution-v1/fa4bb66494a2365773a17816bb0f37a1c03744fa/execution-v1-evidence.md` | 10515 | `8084ed67e2a578aad0f0e2fd94992d4848a4e40213e75fc43b368b054bb3efc1` |
| `docs/releases/execution-v1/fa4bb66494a2365773a17816bb0f37a1c03744fa/execution-v1-closeout.md` | 3403 | `62e160322746aba8dcae8401d361e83a61c002dbacf540ee012932b76c95577e` |
| `docs/releases/execution-v1/fa4bb66494a2365773a17816bb0f37a1c03744fa/execution-v1-handoff.md` | 9121 | `f06df150b3f4a2e7bd42aac78ff9dc1d397602565b2cca9f4649fcb32c352d9c` |
| `docs/releases/execution-v1/fa4bb66494a2365773a17816bb0f37a1c03744fa/snapshot.json` | 487 | `0919c1bc04edacf3d0ec4b55698a0ec3ae9a9b82c37647d1002b91f1cdb285b2` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
