# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-08T19:09:49.307Z
- verifiedCommit: f6ebd3deed671069d9c45e7a2f35207eae5ed8f8
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: b4d855a10843d3133f04c2e57f91bba82b73b749f771da4a58c021466b06fb84
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
| `README.md` | 179560 | `0a32a7c8eee49b08b234b802e8ea1b589de2a3ce49294f131973a471838c230f` |
| `docs/product-plan-v1.md` | 13640 | `55ee208bed9fb357b761484afcd37838bf17663458f4d5deebcec38a584f8d45` |
| `docs/security-model-v1.md` | 34314 | `92cee3fb67df3668fa857fd6300681c5f73450beabf0eac7a7c460c1e170df12` |
| `docs/operator-runbook-v1.md` | 12886 | `55d23ce71630a8085b6edf7d869703a1c0b79f2be4135d21f0d653756d9fb705` |
| `docs/deployment-pilot-v1.md` | 70414 | `70d6e871002b49f68694853ac0b4b37a371311b68597a9a17344b0c77c0a43a2` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 6052 | `8e28ef80a072eed5e731b4db1ce7953d2a660689844a4566eec8d7b09d57f95d` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
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
| `docs/clean-deployment-release-v1.md` | 11693 | `b71edb42c692b9475596ab5dc8a712ecdef1ab5fe820daa4bb914541df727bab` |
| `docs/production-slo-operating-v1.md` | 8929 | `e0fa5272403e5a4e1888a1562c6f7abdf0a2ef6a4156d070447e4b8ff2fb84f6` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 9208 | `2d5fc5111a4a18c04dd7fc4ce221a0a2414edc6953d0885bd15a95998b2cdbe4` |
| `docs/target-provider-evidence-intake-v1.md` | 6942 | `037f10ef1c2d2f1147f2c28797e18563e7f7ce1803329eded06f8002977c57b7` |
| `docs/target-provider-operations-v1.md` | 11619 | `b1ebdeba6ecbf3be8584b824c81e65ca188e45a93506e123b0ead371a20d43f3` |
| `docs/target-openai-provider-account-v1.md` | 7612 | `1a2d38e69f28c7c54149e1736073cd31b2486e9ca61e342d9c4878da0416adba` |
| `docs/target-anthropic-provider-account-v1.md` | 7554 | `0a5d168389648e3ce065cfcf6572e3bae20f85cac7a81261dcae06425055d4a7` |
| `docs/target-local-provider-architecture-v1.md` | 7647 | `1c3e40ff1aaba558888f94c7ec0b73c127cd615debdeec2474e8c75df77dda75` |
| `docs/target-hermes-provider-architecture-v1.md` | 7338 | `28ce1d5a13736f47ea11fd4d8440b6e01490735ffa65aa5016093075cb117af0` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 23423 | `beb9227235efd2144fd09e57dccccd1d7e283f4b3346e10dccec01326307df3d` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6563 | `8ea7cc65da2aedf1a1538a8aff302a8a0ce0a35e0e91d34439cc5d35168d14de` |
| `docs/target-identity-session-operations-v1.md` | 7922 | `51917273f7fe8189b4982bd687dcbe5a959f75baa80346306d0a4461f404e954` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6481 | `3f5eafc98ceb74e045865e30a9611a934bff26828948f4f9660093220f953b9d` |
| `docs/target-tenant-isolation-operations-v1.md` | 8272 | `198442750996a90531c1609536665ba46f38d19459a9c5fe9381d345610941da` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 11448 | `711527deb6b80f6c8f3e7de9c242caeafb1dca814c315843b168a4da0e6ca38a` |
| `docs/release-readiness-v1.md` | 38996 | `66549a72e483289d68c83dcd041621384d2ff353df34ded0eaf01c23ca3d5711` |
| `docs/production-like-release-drill-v1.md` | 19140 | `1f65efb705b8883e1b6482805b3e2fc5a4a4db50c7c60d5685b344f90de671ab` |
| `docs/execution-v1-evidence.md` | 10172 | `be370136c5324c015efdd3786f316205eaaba112a3947bc979f4abd357f2651f` |
| `docs/execution-v1-closeout.md` | 3353 | `7101c3f58f348e191a50853677fded817f5f3e6465022e7f5a8b762293b0deb2` |
| `docs/execution-v1-handoff.md` | 5277 | `76c8eaeb125226b3c9af15f2e47819b8709e658f1b62a1066149d1498957385f` |
| `docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/execution-v1-evidence.md` | 10256 | `afecd1c6ad094327d0456c1a0847d21bf0147eb773998f1d7247611be18699f4` |
| `docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/execution-v1-closeout.md` | 3505 | `21e9ae31b26b3e145e6599931ceaf4e5a8ac8db7c3860fd909f0095f5b671104` |
| `docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/execution-v1-handoff.md` | 5506 | `706f64e9ad2e071ca091263a31750cbb70011c646f71348d875584e2b8f7e9cd` |
| `docs/releases/execution-v1/f6ebd3deed671069d9c45e7a2f35207eae5ed8f8/snapshot.json` | 487 | `a3e57fe5f7d3c66497231a887ff81887f089bf66ae393fe3b49bf0c6fdfb3d2d` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
