# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-20T07:54:45.851Z
- verifiedCommit: ebb64109fd2e55b91a4b03d8309dbf4ad30ae3f3
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 5f65755431466ef3a0de730606a18f5a60fd1c3e953fcda5e68c71343da7bc08
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
| `README.md` | 186761 | `65d72a414b253c6a4360f0719cad16bdfbdb425c24518e9c90151719cca2026d` |
| `docs/product-plan-v1.md` | 14865 | `8ec57c32de85c27a2217371f2c9de51ea198a0f34e92a7356bd650f53f4307ba` |
| `docs/security-model-v1.md` | 36315 | `26ade2a316f42519b5fbecd3e2524d3754efc583f1f42b50fa5a7d93165466d2` |
| `docs/operator-runbook-v1.md` | 16044 | `693431033c49d2384cbd5b26dbdc7caf63a0ceb95ed5e3dbfa09dd2a2f914e68` |
| `docs/deployment-pilot-v1.md` | 74829 | `5a7d4b0852d343a588a1bb33f0e22bea52ed71aaee8844ff0d42aec8b9e6cf03` |
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
| `docs/clean-deployment-release-v1.md` | 11881 | `13677993c84983917baa56e9d04a3cfcaac43315a5a47f33051983fdcfc9ab7b` |
| `docs/production-slo-operating-v1.md` | 8945 | `ca23ab86aba846614f25518266055de2f1a7c5ffb4d52a342ad05629506f242b` |
| `docs/production-retention-operating-v1.md` | 7279 | `76df11f1fb91e906e8b35ab6e4813dc49d2a3745e00bbbe5866c033f9583fa3d` |
| `docs/production-provider-readiness-v1.md` | 10497 | `0e6ce4aed19971726d15ab0b3fe9e5737133a5176cff7b3fbfb733c7acf21a98` |
| `docs/target-provider-evidence-intake-v1.md` | 9832 | `96901f83ad08a34814d2225734fc256051cdc2f7d378c032945e467d590b312f` |
| `docs/target-provider-operations-v1.md` | 18157 | `f585dec348ef633860f7916744fafe742448f4377a32ee90448c8358bc807e96` |
| `docs/target-openai-provider-account-v1.md` | 11699 | `7271723b46434bca9d7bc7f3d5beefdd20891094b6de1c0ab1a22cc29986e91d` |
| `docs/target-anthropic-provider-account-v1.md` | 11790 | `d0d2fa304a4ce0a8c3de932fef3c3079d9f7d60e38ad31db914e5241c3ee0d9e` |
| `docs/target-local-provider-architecture-v1.md` | 11714 | `f599d071d11fc13c0b95f180b42095a9a111276e02afd98abb8c79410b216154` |
| `docs/target-hermes-provider-architecture-v1.md` | 11438 | `9831899c5cd670165c5dec1606bac2fa7dec297256e3ed51665f3fe383c2cf87` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a4b911e1e91216b585beb4f19556cfefcfca7246ba531f60f251f53a05e2b6ef` |
| `docs/target-deployment-contract-v1.md` | 30496 | `3bec2589e7812f159bd8cc098545923c686e409b25310de053adb767648a68c7` |
| `docs/hosted-saas-architecture-decision-v1.md` | 5871 | `1da26fed1ef1ff84f9e0ea6fd9adfab39175d0f489b41bb34b89475f44aecd8c` |
| `docs/hosted-identity-session-architecture-v1.md` | 6563 | `8ea7cc65da2aedf1a1538a8aff302a8a0ce0a35e0e91d34439cc5d35168d14de` |
| `docs/target-identity-session-operations-v1.md` | 11675 | `668530e27322cbc62574cbef7548aa4a2b081a6d46d558f383c9b263f1ca1f8c` |
| `docs/hosted-tenant-isolation-architecture-v1.md` | 6481 | `3f5eafc98ceb74e045865e30a9611a934bff26828948f4f9660093220f953b9d` |
| `docs/target-tenant-isolation-operations-v1.md` | 12129 | `dc8a83aaf504f45333c552e1871ce8ab38c9ddc6cef70c6768e9ee13aa452890` |
| `docs/target-secret-manager-architecture-v1.md` | 6224 | `889b5ab3c5ba2dd58874391c538cbe910470e84d8770fb4b3d1469f65a127e3f` |
| `docs/target-environment-evidence-intake-v1.md` | 28607 | `bc6911329ad0f082156c2ab7c86e28625a774e567757f5d13f889e6c6e4baecd` |
| `docs/release-readiness-v1.md` | 66835 | `67fcca10573f5b3b1cf189504fd307af334c696b82ab1fdf6745d480c461cd9f` |
| `docs/production-like-release-drill-v1.md` | 41946 | `6c343bfb6bbb3e4fff9153740639b3561e83ea7d542c9dbe05f0eddf42e4717a` |
| `docs/execution-v1-evidence.md` | 10434 | `bbead199ecef43ab290f7e0cedb486dadc9637eb59ec05d471c9366713a8df33` |
| `docs/execution-v1-closeout.md` | 3254 | `51075b5f2350f0f5e63a1d7fc3e42da0cfb2e1722546a42a7ef875ec0b6216a4` |
| `docs/execution-v1-handoff.md` | 6719 | `0b4ccaec8038560da4d238224a0af7992b0090aae3df5b7121b4ee4bbed4242c` |
| `docs/releases/execution-v1/ebb64109fd2e55b91a4b03d8309dbf4ad30ae3f3/execution-v1-evidence.md` | 10518 | `5b9ab46836823246dbe2af54aaeef9f89c65b5570acf5d38e66c6c4a35cd6bba` |
| `docs/releases/execution-v1/ebb64109fd2e55b91a4b03d8309dbf4ad30ae3f3/execution-v1-closeout.md` | 3406 | `63af9be8e825106765a49ad52000acc8b6914cbc7639c6ac0752ebceaf039fad` |
| `docs/releases/execution-v1/ebb64109fd2e55b91a4b03d8309dbf4ad30ae3f3/execution-v1-handoff.md` | 6948 | `0435410d57c3f0fd1c052f2fc208f28767eaecec0f261682d1338d199b214f85` |
| `docs/releases/execution-v1/ebb64109fd2e55b91a4b03d8309dbf4ad30ae3f3/snapshot.json` | 487 | `b52b283fb86e77936f7d084a161db9943d7d2158282c21d0f80563545614b019` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
