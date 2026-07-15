# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-07-15T10:56:38.394Z
- verifiedCommit: 4224272fc0e4262b1c05f7f090ef40c99a23355e
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a7e1b32c9e98106f416213264eee5cb2a358ed2ad8e02d0d3a80b36110220b0d
- fileCount: 75
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
| `README.md` | 29859 | `f08fcf7aaa79341afb4299ce775322f84fc05d9fa31d76185567f796b0dd1a89` |
| `CHANGELOG.md` | 4188 | `c51baa4c2aec614a83e548fc82643ed37c39ab39fd0ff6e59104bfd53a3aec0a` |
| `links.md` | 1274 | `55d078fd4ed06bbe725bbd39b527c476a2dd925f66bfba0c729868ed5ece81d1` |
| `SUPPORT.md` | 3031 | `014678a1dbde6ba23e9cb4f9f0792bf28a67302799dfa9ac4eac6d6e1e43a2b1` |
| `CONTRIBUTING.md` | 3538 | `c0eb900493b00cc33250a4e4122107a99e2fdc71f4e7441a11bac1d04c67e9b2` |
| `SECURITY.md` | 2036 | `33b814aa3c9e7386831f0da761b25f069abbaa0136708e79e659943d950d3ad6` |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | 2777 | `046394852ef960bc5c885af9c5d6c4f948c0517d56c030e9cc5bdd93218bf42c` |
| `.github/ISSUE_TEMPLATE/security_report.yml` | 2090 | `f89558f8e98760fba974b4cb5ed7d81e9c68d42aadd24adc6ada35e5796c20a9` |
| `.github/ISSUE_TEMPLATE/config.yml` | 638 | `1a658b3ba52c0b68eecea56c137e463f3f1cb5f1faa5b54eebb4dff122ccc3f0` |
| `docs/product-plan-v1.md` | 19100 | `20ac5772f3a672c9c8ac3ce6b422fdd772b28e3594b00bcc07fca111d9a88a40` |
| `docs/security-model-v1.md` | 39764 | `42f9a43d6930ea87b5cad305f7067194ed5a7100945659731b90ad4f51d23c14` |
| `docs/operator-runbook-v1.md` | 17537 | `5010c050f1921324f3adf75d5d4c796b6fbdde0c550f89f1f6b4849a4dcfc900` |
| `docs/deployment-pilot-v1.md` | 82325 | `bc454889d127e247acf259e07538051bbcde1f3acbfd02cd016de574994b630e` |
| `docs/pilot-onboarding-v1.md` | 12003 | `d6e3beeb3df6f5cf46d26f77331b770310d43c7eed616a6d09293c2a9668eb9c` |
| `docs/demo-scenarios-v1.md` | 20536 | `5e01fa6f993b6ef7790f19bc945e9b3c774fa3ce6c2da374e81b09c87a06fe9e` |
| `docs/demo-evidence-index-v1.md` | 4010 | `0244e4b23fba823f168e339cc08bafaffb4811cf05e0762201e6a4651be553b1` |
| `docs/recorded-walkthrough-v1.md` | 5378 | `cc3fe2615d81a6af5bcaad7b3489aebd294a941dcbb192d81e4772447dd43ea5` |
| `docs/architecture-code-walkthrough-v1.md` | 5756 | `fb82a8b47503bb5556101e39de2156da5248d7a5692df03c8c292f942dce0fb0` |
| `docs/provider-readiness-matrix-v1.md` | 5822 | `21b096fb61633be89f1fc2197a36eb2ca8ed15734fa453a54c2949b12b4062f6` |
| `docs/provider-failure-recovery-demo-v1.md` | 5483 | `181a3813c6144c64774eee96198a2dca61e06247aa7ef7d39b10f0408370518d` |
| `docs/memory-retrieval-quality-fixture-v1.md` | 4867 | `681fb5b3c41929787b951b80fdb61c62e08683724290eebbe2f107e329248709` |
| `docs/smoke-validation-summary-v1.md` | 6113 | `fa19fa137e0136376569074845ad215e2e2fb9d88c8360177ca3505038418e21` |
| `docs/external-evidence-blockers-v1.md` | 6443 | `1ab0bdaee3c6b3deca6b6232d8f6db488b27f1641976e9248815cf533198189a` |
| `docs/operator-surface-demo-evidence-v1.md` | 5487 | `c8b550add27b5e0b0f0692a755707397c1a287d4c64d9e07801fde35f317f2c4` |
| `docs/fork-onboarding-v1.md` | 3407 | `c7d02e8281a439e515117f2fa4878bc0259a1c355b335da1129e66186dd93dc8` |
| `docs/incident-slo-v1.md` | 6052 | `8e28ef80a072eed5e731b4db1ce7953d2a660689844a4566eec8d7b09d57f95d` |
| `docs/customer-support-operations-v1.md` | 6200 | `8ed125281443fce70deb133eecfd9108744320ad1d977c5061e349f6fb1ab873` |
| `docs/support-escalation-review-v1.md` | 5328 | `3b77fef9b2cb83c887a3c634292d7a14dbe1b24704d481d7046520db55f0d80d` |
| `docs/target-support-architecture-v1.md` | 9203 | `d9272d05871c2ed77cb15dc276fd341c96cef11e74dafa481aece71fc1b7a959` |
| `docs/target-support-operations-v1.md` | 12176 | `62aa2a2a617b1788bb0bddbb36c50454b645ac0c1c2e33d7cda42a30366b2ad2` |
| `docs/secret-management-v1.md` | 5171 | `605881026b319a651f26c0c275a13f79ef043c55cf1fe6a3070a326e8f00292a` |
| `docs/target-secret-manager-v1.md` | 6284 | `de69614fba79052759e41859b8f589291089911eca15c2bfaf31e66f3021f877` |
| `docs/observability-telemetry-v1.md` | 4418 | `8b2a0abcd363e7421c4efd67ce7b0340149cf2693552197087ce353deb8539bf` |
| `docs/target-observability-architecture-v1.md` | 9840 | `9ab1e84144a86cfd81c3ada9d70b76b583c762ab6ef175fc6b81d96331ea5e78` |
| `docs/target-observability-operations-v1.md` | 9974 | `6a36795dce4505c8de21879460d30d03c00b50cc5337cfc9bce84290f2cdf499` |
| `docs/target-slo-architecture-v1.md` | 10720 | `aee95a9cec9ef9fb6fc1d60b4a31016440896db108f80053b394f06d55850e09` |
| `docs/target-slo-operations-v1.md` | 11849 | `442d1a2bfcade62ecb141a22d9369676177c5f559b2fe037b25611b93e308df3` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 7507 | `977b7de750c0c7aca5ca3b299da72227477603aecbe58727fce1c3b59d1e22bf` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-data-lifecycle-architecture-v1.md` | 9665 | `67efbdeea24eb6ebb16f6936902ea1baafafc76e8e0ebcc12cda9b00984f7091` |
| `docs/target-clean-deployment-architecture-v1.md` | 9944 | `1c34f9dfb33c77d3db7396ebb240a4ef6f5757e08311298fbc4251cd029329e2` |
| `docs/target-clean-deployment-operations-v1.md` | 9676 | `365c284435bc4bd5e572dad9568ced968a84509f460439ed7ec9ed04562f4eb5` |
| `docs/target-retention-operations-v1.md` | 10078 | `11bb33f9fe851e688b482d11dd5ec5794c27334e82f6ee1c1f64c70ecfc66690` |
| `docs/target-backup-operations-v1.md` | 9763 | `2f30be20f210cf3b2a52c2fc19fb2cdee223a4e07105c0d53826cd528952b9e0` |
| `docs/identity-session-admin-v1.md` | 5290 | `ffed2867d7d61f9e0241c65c056de0109f6b03ea466c9f8c452b5b17e9a88cc4` |
| `docs/tenant-storage-admin-v1.md` | 5265 | `196643ffccc0778c211d82e063e5c6067444a53f550e1b134eecdfad9b6d7186` |
| `docs/clean-deployment-release-v1.md` | 11815 | `8d72e1d19e2ffd76b95cb3c821055fdf5e71551ecaf98165def556195d06d2ab` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 22089 | `0f16cc4fafb627cff4b81562db54fbc997c2f322060c33653c85601868de7db1` |
| `docs/target-provider-evidence-intake-v1.md` | 13617 | `17f4750fe722f151743181f94a7d58f149f47976e7175c2772bbac1f8732b4c1` |
| `docs/target-provider-operations-v1.md` | 22263 | `2cbf909fd2cad9803048f801066d1fd46d2dc00b985a9aea746eda87c2fa0ef7` |
| `docs/target-openai-provider-account-v1.md` | 14039 | `15f7eb72f44b2fd93d1dfbe8eea2c7fca708afd3d7c8061644863b3bbe1b7b0b` |
| `docs/target-anthropic-provider-account-v1.md` | 14164 | `8c39979ddb44e2420e6af92799f0c25044bab066adb715de56ffd721ec99b9d9` |
| `docs/target-local-provider-architecture-v1.md` | 13894 | `e4eeb0dfe1dabaeecd1f96c7c8961c226852c9d4ab568a677569b8a9e941527c` |
| `docs/target-hermes-provider-architecture-v1.md` | 13676 | `19c4d70cc53acbe306a62f92b82631a3a789aa2175d9878b2ad2b6e046e514ef` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 46875 | `cf564b2861242343dfafc353dd9182d929bcda42a2acbd91b698f019e7a3b2f7` |
| `docs/hosted-saas-architecture-decision-v1.md` | 8539 | `7234938503e810c59c864619dea7109a44776cb1db5b1c0157d2e7e855199d0f` |
| `docs/hosted-identity-session-architecture-v1.md` | 10404 | `1110dacd3552e12926dad40015414fee7b71e7bf7bf833a5ccefb6d5405f7d89` |
| `docs/target-identity-session-operations-v1.md` | 15612 | `7f21ea3d3f8f2b4a2ab8f7b292b57c8765799ae76c4803cf6cf5ad7c89e5de83` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 12496 | `c132227ecc53c808ce65522cd62ff109f3843b54a1e3ee409f6292cd0c652e3e` |
| `docs/target-tenant-isolation-operations-v1.md` | 17016 | `996199f842280029794f93eb85fa94960e4028102111c49e3f86f2ba5f467f75` |
| `docs/target-secret-manager-architecture-v1.md` | 9085 | `805cf311fb11c26b7ec03f35241d40c41546d835cf0109809a2bddcfc099de1d` |
| `docs/target-environment-evidence-intake-v1.md` | 48284 | `e619d472a8b17ecccf5eb793aac1fa828fe04c987e38422f98050cc4c100db05` |
| `docs/release-readiness-v1.md` | 92579 | `5c65024e30def571fe6d43b96c271c1ccc7c07e156695c8418da7526022bc4f0` |
| `docs/production-like-release-drill-v1.md` | 56069 | `2201210bca6c0b6c4e98bb34810f114d36bbeaade81751170fb99f01feeb692e` |
| `docs/execution-v1-evidence.md` | 14104 | `11f573657c63b56dd40a1cc4a8610f73c195ca5ffe0a52ea945c026f0426b3a1` |
| `docs/execution-v1-closeout.md` | 3211 | `cc9ac2eb1f436e2cd554b76ca6c7a7dbbb04b21861f62a5cdb42634e3539300a` |
| `docs/execution-v1-handoff.md` | 8824 | `3af92140dcc657c69fe6ce3553dcda7fe3c05b2252ff5d4b232ae4dc064279da` |
| `docs/releases/execution-v1/4224272fc0e4262b1c05f7f090ef40c99a23355e/execution-v1-evidence.md` | 14188 | `d198224150237a1289aba2a6eb1f69005c9635693d6a39005f6e80be7488b8f2` |
| `docs/releases/execution-v1/4224272fc0e4262b1c05f7f090ef40c99a23355e/execution-v1-closeout.md` | 3363 | `b6c93b688133ca6927ab5dbdb984bae75c3c78fed98f1df37bc594712039bcdc` |
| `docs/releases/execution-v1/4224272fc0e4262b1c05f7f090ef40c99a23355e/execution-v1-handoff.md` | 9053 | `299bff23cd6a9c210bb574bbcd8e7ba399f9e56cef48d6ed24d852bd758d6b73` |
| `docs/releases/execution-v1/4224272fc0e4262b1c05f7f090ef40c99a23355e/snapshot.json` | 487 | `e71f7556a06791ee65b4bdaf9d5bb4ae3293e3203a695331999f47e1578c4b87` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
