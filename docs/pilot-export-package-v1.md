# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-20T14:54:32.658Z
- verifiedCommit: 694ce2f3208836113bd9fc51a91f2b2bf50ee4ae
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a6c50d5889685b0c15e3bf214efc6277fab99d5376dd0537ed6d6524e4d66c4c
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
| `README.md` | 187397 | `5e5c8bfca8539e558616b9d0cbc7fd5c1c728a836187059122254252642a8f48` |
| `docs/product-plan-v1.md` | 14865 | `8ec57c32de85c27a2217371f2c9de51ea198a0f34e92a7356bd650f53f4307ba` |
| `docs/security-model-v1.md` | 37001 | `b00be7c0013428f8ef446405ad67aba105c0dfbba71ea513e53237b54757ea0e` |
| `docs/operator-runbook-v1.md` | 16044 | `693431033c49d2384cbd5b26dbdc7caf63a0ceb95ed5e3dbfa09dd2a2f914e68` |
| `docs/deployment-pilot-v1.md` | 75861 | `022d81dc272f0bac346707b90c1e9908604657cc377ef7823b6eeffd4b5331ae` |
| `docs/pilot-onboarding-v1.md` | 11287 | `a4e532d69c6280bfb1efd9f25c237384ed6509e583f8c04805543908423e5ce6` |
| `docs/demo-scenarios-v1.md` | 14954 | `2ce7ea5947a830f945a703457aa2395440a15172bc3bc5edf02f912f5930eaf8` |
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
| `docs/clean-deployment-release-v1.md` | 11853 | `8162589347aee2daca988de30529529c5e8242de8f1eb1f5820badb2446129c8` |
| `docs/production-slo-operating-v1.md` | 8945 | `ca23ab86aba846614f25518266055de2f1a7c5ffb4d52a342ad05629506f242b` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 10492 | `409919c898a09de95ef453fc28a0aac9d1246ac56c2199158221ce801918c44a` |
| `docs/target-provider-evidence-intake-v1.md` | 9832 | `96901f83ad08a34814d2225734fc256051cdc2f7d378c032945e467d590b312f` |
| `docs/target-provider-operations-v1.md` | 18157 | `f585dec348ef633860f7916744fafe742448f4377a32ee90448c8358bc807e96` |
| `docs/target-openai-provider-account-v1.md` | 11699 | `7271723b46434bca9d7bc7f3d5beefdd20891094b6de1c0ab1a22cc29986e91d` |
| `docs/target-anthropic-provider-account-v1.md` | 11790 | `d0d2fa304a4ce0a8c3de932fef3c3079d9f7d60e38ad31db914e5241c3ee0d9e` |
| `docs/target-local-provider-architecture-v1.md` | 11714 | `f599d071d11fc13c0b95f180b42095a9a111276e02afd98abb8c79410b216154` |
| `docs/target-hermes-provider-architecture-v1.md` | 11438 | `9831899c5cd670165c5dec1606bac2fa7dec297256e3ed51665f3fe383c2cf87` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 32499 | `f4d98654f886e0cdd05111b2fb90f5e145182873ccdd8cf14e42dfef2ff5fc87` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 8465 | `a7ef8624aff2308855b7ffed49c13fe30397c533ee8d849c0b6e9930042e80c8` |
| `docs/target-identity-session-operations-v1.md` | 13520 | `7b96655c9b1bcb0053f048428d23b4a4e739869b607429621401ab4e432b5eea` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6481 | `3f5eafc98ceb74e045865e30a9611a934bff26828948f4f9660093220f953b9d` |
| `docs/target-tenant-isolation-operations-v1.md` | 12129 | `dc8a83aaf504f45333c552e1871ce8ab38c9ddc6cef70c6768e9ee13aa452890` |
| `docs/target-secret-manager-architecture-v1.md` | 7132 | `9e2f8db426c4f4a706d1513a579dfe2d6addb092d8c2216ce23a924d44646b95` |
| `docs/target-environment-evidence-intake-v1.md` | 30821 | `2b9ef42d902209d3d11b49d021a5979fc3f4e3fb445a5d047b4b4bbd7abe3de3` |
| `docs/release-readiness-v1.md` | 70774 | `cf20568dcee577117d99d0d6fa7e2a270451b55dd0f0fd4201dcfecfce0199b2` |
| `docs/production-like-release-drill-v1.md` | 44968 | `3a4e0b082bba9423d126bfca0a4238d36313cebfafaad2eaf4e9b6dc8c9c8b5f` |
| `docs/execution-v1-evidence.md` | 10425 | `43b85e892979c741fc6c72d9d31a66ac679ec6061a43b0ec8bbd1f75374121a3` |
| `docs/execution-v1-closeout.md` | 3249 | `b2f50529f8f96307d46e6862e9c2a5127f41f1e42a85c514182930e61e5d04f0` |
| `docs/execution-v1-handoff.md` | 6731 | `fcc5b15fa6af82897012207403cc592db932daa064a17ec12758cbeaae9718c3` |
| `docs/releases/execution-v1/694ce2f3208836113bd9fc51a91f2b2bf50ee4ae/execution-v1-evidence.md` | 10509 | `099f65bd49231ff043a50450472538fb404388e17788dafb717863995acbb976` |
| `docs/releases/execution-v1/694ce2f3208836113bd9fc51a91f2b2bf50ee4ae/execution-v1-closeout.md` | 3401 | `fdbd81c1a6db737c2efb2cde2c6bb929ca1fa0e191020a54184595259cf95d9f` |
| `docs/releases/execution-v1/694ce2f3208836113bd9fc51a91f2b2bf50ee4ae/execution-v1-handoff.md` | 6960 | `9d13370b9cd1625e6b1b6de4871ad2420dab55c662b3bbcb2dece8186f304c54` |
| `docs/releases/execution-v1/694ce2f3208836113bd9fc51a91f2b2bf50ee4ae/snapshot.json` | 487 | `2402440fc48b7220cdb843d0bd5fa26789fa148f59f74e612df6a510f8e49bed` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
