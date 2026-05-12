# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-12T11:06:45.016Z
- verifiedCommit: 71d90264dd2e7920c59c3956ca3ae0381468413c
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: dfa5645fa06ded65f576889035ce9eff9943e42b4e367a4220cebfc8e741f6c3
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
| `README.md` | 180333 | `cb3d444289a7d01bf146a00ceb5796ac915909319389363da6cb1662305d505c` |
| `docs/product-plan-v1.md` | 13640 | `55ee208bed9fb357b761484afcd37838bf17663458f4d5deebcec38a584f8d45` |
| `docs/security-model-v1.md` | 34314 | `92cee3fb67df3668fa857fd6300681c5f73450beabf0eac7a7c460c1e170df12` |
| `docs/operator-runbook-v1.md` | 13375 | `dc98b461ec380c1829dfb99bb0cf59f03b1641da4d2342842e774e37bd0bf10d` |
| `docs/deployment-pilot-v1.md` | 70928 | `47ec49c0592349ad35d4295fa039f3a8d957bd1595df8a2df2d2128011b0a46a` |
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
| `docs/clean-deployment-release-v1.md` | 11701 | `7f08d4749675f69b343bb6834550964039813486c16f5ead406f0df606cad86e` |
| `docs/production-slo-operating-v1.md` | 8929 | `e0fa5272403e5a4e1888a1562c6f7abdf0a2ef6a4156d070447e4b8ff2fb84f6` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 9226 | `e7056b64482c6870a28d97ea5d6eaf7ce0ebf620c01c3ebe30d3a2456314649f` |
| `docs/target-provider-evidence-intake-v1.md` | 7549 | `041fa4f477cea746feb0c177294410428743eea72ef0f09055662971e9ea2265` |
| `docs/target-provider-operations-v1.md` | 16779 | `bd4fbc391a569478f949f4ea8054bc2ccd8fbda227fe3a49e2eaf31af053314e` |
| `docs/target-openai-provider-account-v1.md` | 10958 | `ae5f69e170b199b63f0d0b1bfc203720d572c4db245a52a6502808a1a75b3c13` |
| `docs/target-anthropic-provider-account-v1.md` | 11014 | `deff87c76a566782738dbbb4a8f035f6203f9dae09bb769f3a7109b51bcd2a3a` |
| `docs/target-local-provider-architecture-v1.md` | 10855 | `ded02834bfba4ebb9bf104ed258dfd5d8f888e13eacc6024db30afd1d754b9c5` |
| `docs/target-hermes-provider-architecture-v1.md` | 10632 | `0a4050bd3b1e7869778523cb63d0cb787459a378f9a9a68fe9a64446311f4ed0` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 27513 | `cf82407c4669a07f7e602349918fe4584dadad3996ecc3e6ee51214551dffbdf` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6563 | `8ea7cc65da2aedf1a1538a8aff302a8a0ce0a35e0e91d34439cc5d35168d14de` |
| `docs/target-identity-session-operations-v1.md` | 11675 | `668530e27322cbc62574cbef7548aa4a2b081a6d46d558f383c9b263f1ca1f8c` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6481 | `3f5eafc98ceb74e045865e30a9611a934bff26828948f4f9660093220f953b9d` |
| `docs/target-tenant-isolation-operations-v1.md` | 8272 | `198442750996a90531c1609536665ba46f38d19459a9c5fe9381d345610941da` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 15686 | `51534e68b776fea7e6279cc22a11cea15b9e1e4b4e6232c97ef188b752263661` |
| `docs/release-readiness-v1.md` | 39250 | `03beedd1da19143b52b2126b6e1bcdc2db428ef04b8157d27488874bb7fe7e52` |
| `docs/production-like-release-drill-v1.md` | 19148 | `fa662ecde38444ced3c80dbfa6d753b25502e8b68f16f86d90a89c44690ea80e` |
| `docs/execution-v1-evidence.md` | 10424 | `f1ce88063b61703b56575ee2f6bf45bd62e93df3b603254097a4dddc1c8a870e` |
| `docs/execution-v1-closeout.md` | 3254 | `e5fd590681e1e973c120a62d42e709330274436a00d3d4bf5338a68cd6ec974c` |
| `docs/execution-v1-handoff.md` | 5564 | `2d86f2496c810c20e6914be151cce4ba4fd066ab79395fc03ccf51164bd35885` |
| `docs/releases/execution-v1/71d90264dd2e7920c59c3956ca3ae0381468413c/execution-v1-evidence.md` | 10508 | `3feb7b8ece6fd848b3bc3901ee78a85e86cfbab7b4fc7b94a3d80287e21f699c` |
| `docs/releases/execution-v1/71d90264dd2e7920c59c3956ca3ae0381468413c/execution-v1-closeout.md` | 3406 | `e4b4afdf02553a058605b81cba069e5cf735a951f998e537e3ed0d9e9ea9c43a` |
| `docs/releases/execution-v1/71d90264dd2e7920c59c3956ca3ae0381468413c/execution-v1-handoff.md` | 5793 | `bb883607d49f09051e3f4d8ed0bc7628122186f8b7aefade51d68f2ccebcd92a` |
| `docs/releases/execution-v1/71d90264dd2e7920c59c3956ca3ae0381468413c/snapshot.json` | 487 | `ef9db0727f4e96671b0b623e38ae3c0d91bad510a5797164dc71d89e628e11cc` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
