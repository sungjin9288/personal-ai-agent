# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-06T06:54:02.195Z
- verifiedCommit: 5d982dd7dbb4c300cee3f022bf1026917c5acc02
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 144b22dae0c0946376f5607a02e57fcc10cbffead89fb1313c4ab25f8923f24b
- fileCount: 49
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
| `README.md` | 171035 | `b35d1964513697eeee5e126f1bec2015bc8d9caca855700376c9f3cbf9f372a9` |
| `docs/product-plan-v1.md` | 12694 | `e5e29053ae3b12f1d9d60e44e9dcd3342c5a9495b10e4a817b2d0b259b5fa54e` |
| `docs/security-model-v1.md` | 30967 | `b34d5ae6f62866fe9d5b17512e7717ed30b2df6794fee8860caf4478bdc86a24` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 58082 | `be2408430673e3d80df453a73b003c7524c820bac9b7b97451a50e3001181697` |
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
| `docs/clean-deployment-release-v1.md` | 9286 | `d8f3ff258f3ea46895fef65f401e8378e747d6447a3c3c8ee64a929a6d307c2d` |
| `docs/production-slo-operating-v1.md` | 8157 | `13b63f1a71404be77804ad72604142ec20ab7811861a9a251b34aa5266a88b5b` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 6963 | `0d76ffe03c66b76eb5114ecf7d91997d4b55e55c94591a2e92f71f81931cfad2` |
| `docs/target-provider-evidence-intake-v1.md` | 4542 | `da56ed458d614cdd5116c893544c71bd29d9016f6b42d585b4baf90eedfaf3be` |
| `docs/target-hermes-provider-architecture-v1.md` | 7338 | `28ce1d5a13736f47ea11fd4d8440b6e01490735ffa65aa5016093075cb117af0` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 16596 | `736f22973428a4d7b080a51abde27ccab6cac653d94826165ea312f413da3466` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6387 | `771a895cff02ee4e7bcba087555686f1162738e6f566e22e61a4b07688689229` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6305 | `a715fc5d62517a40c3f4c447a471bed364dd6b7960ecff66f69565079e1cc892` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 7917 | `32a21751909f104b1441b091efb185d14e4969d5b1cb8f9c93fbe64793505aa5` |
| `docs/release-readiness-v1.md` | 30477 | `ecb1484f8e16306d3ec4516828e3bf0303f692f0863c08f60bc2c5b11aaa0668` |
| `docs/production-like-release-drill-v1.md` | 15315 | `cb57ebc7df93ffd3a583069e046cac9235404fac29054d7b25dba4dadf2fbd54` |
| `docs/execution-v1-evidence.md` | 10168 | `c92d6f77b9b310e0631fd7df3acb7856fc8dae62ffd0033bbc6f130d40011b3c` |
| `docs/execution-v1-closeout.md` | 3351 | `88a440acb199730701d4a0bd579b2577fa0f7d0bdbf7fccf61105dcc54b67503` |
| `docs/execution-v1-handoff.md` | 5241 | `58580ae7f0e925d9d281680c80febee2d6e632d854f1ea44a0031d9d53094fe3` |
| `docs/releases/execution-v1/5d982dd7dbb4c300cee3f022bf1026917c5acc02/execution-v1-evidence.md` | 10252 | `6d7a02ee403e76ce2bdac393640000b4c4267167142cbebd363f1454b5d52147` |
| `docs/releases/execution-v1/5d982dd7dbb4c300cee3f022bf1026917c5acc02/execution-v1-closeout.md` | 3503 | `edf3d3de68561dd4113bfbfa5897ee4c3378510f28c4a6c0a3f188ecfc6e5cfe` |
| `docs/releases/execution-v1/5d982dd7dbb4c300cee3f022bf1026917c5acc02/execution-v1-handoff.md` | 5470 | `1388b4dd5a92482ce16046fe46730b95e0648ef12f1baeacd8eb267a36305104` |
| `docs/releases/execution-v1/5d982dd7dbb4c300cee3f022bf1026917c5acc02/snapshot.json` | 487 | `6685176d2f4e572bf12dd37cb0fec9e29d8073554aa0c2f67276a96999e31afe` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
