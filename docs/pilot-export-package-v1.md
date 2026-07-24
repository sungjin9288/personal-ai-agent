# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-07-24T03:30:56.222Z
- verifiedCommit: 80cad411d228ad7282908ef4c33f5ab4285ee2e2
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 70f3eab567ce7f7826cf5909fa07a1f6403fdd692f99d9aba00d67c1683fbfaa
- fileCount: 135
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
| `README.md` | 78019 | `551ee9baa6cf5300b1b61383fed6fb7ba11e19aa9a9478296bc0021610cc5707` |
| `CHANGELOG.md` | 38402 | `c322c0fa9b5dd9563893da4af4fe650f1eae3aea6a25f34965afdcc941120590` |
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
| `docs/architecture-code-walkthrough-v1.md` | 7477 | `4df605052f493c20b129527dcc188db562ecd298558a44386c904272f2d91e9c` |
| `docs/provider-readiness-matrix-v1.md` | 5822 | `21b096fb61633be89f1fc2197a36eb2ca8ed15734fa453a54c2949b12b4062f6` |
| `docs/provider-failure-recovery-demo-v1.md` | 5483 | `181a3813c6144c64774eee96198a2dca61e06247aa7ef7d39b10f0408370518d` |
| `docs/memory-retrieval-quality-fixture-v1.md` | 16894 | `6efd3afdeb52bfc563dc5cb1ce66c310813fbde3187cd1f559e7bf6d561eaeaf` |
| `docs/ml-rag-development-plan-v1.md` | 264994 | `846ed2a079d0ea4c85f775e1aaae0765f3806b9b589cc216fd4465ca3e2eece0` |
| `docs/actual-user-query-evaluation-v1.md` | 7573 | `bc4c9cb12b524004b693dd7b91412b2c9750121a4ce8ef96774cc5e5d6a70d40` |
| `docs/smoke-validation-summary-v1.md` | 41517 | `19c8518fc59f0ca257e6be955e8273147b4739d4e7b71186649a97137cec8e76` |
| `docs/external-evidence-blockers-v1.md` | 6443 | `1ab0bdaee3c6b3deca6b6232d8f6db488b27f1641976e9248815cf533198189a` |
| `docs/operator-surface-demo-evidence-v1.md` | 5487 | `c8b550add27b5e0b0f0692a755707397c1a287d4c64d9e07801fde35f317f2c4` |
| `evidence/output-artifacts/local-embedding-model-qualification.json` | 15383 | `2d8960b1c4da4cfc77bf69b4ff400e05b1f5adf508d67f5544409ded528b40d5` |
| `evidence/output-artifacts/local-retrieval-robustness.json` | 30382 | `37307acf03ee242fc7a4b7ee16691608c10fecda370a8df8bc1db8f768dd5a46` |
| `evidence/output-artifacts/local-relevance-reranker-evaluation.json` | 70503 | `0192e188a225d54c706dc6b5a9be72cd97fb6362abc64eb83f3e361c540b6b99` |
| `evidence/output-artifacts/local-reranker-resource-envelope.json` | 118773 | `1aff6609f3b4867a14f8e6991ce8d346ca4f37e101a360b8d835f55d6297488c` |
| `evidence/output-artifacts/local-reranker-runtime-stability.json` | 183035 | `56cc51ab85176c9c49e580a7c98eadd5e841bbae0452aa30047ffd73e461e06b` |
| `evidence/output-artifacts/local-relevance-shadow-integration.json` | 13657 | `a2b634da22f1b60ce200f6c574ac520202b1a8948351cee30f1ea3c536660e0e` |
| `evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json` | 220475 | `2be7367108670aaf05ba047eed9e6596d57076783bb2d75f8d37398ef7a36295` |
| `evidence/output-artifacts/local-relevance-shadow-replay.json` | 220401 | `57c844e31e0097c21ffee8fac3e080ad0b428224cf7d4a3f6a3f93b083d73b30` |
| `evidence/output-artifacts/local-relevance-shadow-cache.json` | 234856 | `24f311998f98ca6838ba04db51a382b4325d61aa8a73c8b1674bc1ed56b26cf3` |
| `evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json` | 250227 | `b3f84b829daa3d13e5f3a3a5513a2371893abea49758ca6fe5a79f56621e2f7d` |
| `evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json` | 17953 | `e61329c5efb39ff08e923e59f2f496b668354a6f989695205ac69ae960d712f6` |
| `evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json` | 14691 | `46e19f84743b09ba1f230a52c99ead3f39558e7eb34704a2dc6f1e4e57749a27` |
| `evidence/output-artifacts/approved-learning-rag-feedback.json` | 5004 | `dd80ccff7473dce89df6fab37ae02f18f4eee9e3cd1400fcbaae997211fdb3c0` |
| `evidence/output-artifacts/approved-learning-feedback-quality.json` | 26606 | `147c1d4ffc10d4de7626db7814a122b520c75f748a7c816811f058eba50542be` |
| `evidence/output-artifacts/workspace-learning-personalization.json` | 15652 | `f5fd4bde18e9f6771c9190ab30cd5311dad46f4ac0db137402059ac46e07d389` |
| `evidence/output-artifacts/workspace-learning-conflict-revocation.json` | 21391 | `939ee1834cfcf0e999203cd8c1f1565b32399d5d18b43310f240d0cdbf381e32` |
| `evidence/output-artifacts/workspace-learning-operator-override.json` | 25237 | `c1ebc16645ec9a1905f177ff8d9c276c741d21cf17063631c906b7b9c2d868fe` |
| `evidence/output-artifacts/workspace-learning-operator-surface.json` | 1334 | `17eadaeb0920b8a99b5061b7c74a8aacf53eddcc983c2763d0183751f8cddb77` |
| `evidence/output-artifacts/local-user-learning-personalization.json` | 15656 | `93cef0bf36a5a9bd192b9b09480635bbcd618e198da54a1600eba2cd6ad7830b` |
| `evidence/output-artifacts/user-learning-conflict-revocation.json` | 22516 | `465c1dcaa6b81072e7ca70f789ad678e4a2087f94023e7fe672add0118c1f011` |
| `evidence/output-artifacts/user-learning-operator-override.json` | 26640 | `0bea7e33ce36599abfff1d0e73b09dd71580c4a073fe0d15e9ec0471654d4427` |
| `evidence/output-artifacts/user-learning-operator-surface.json` | 1411 | `eb39a23b569a984d1569d5fdc21ac85397a1b2d327eb31af107966b79ef429b7` |
| `evidence/output-artifacts/fine-tuning-data-sufficiency.json` | 3455 | `f1fc78138b4ca6d6dea8065d2a5ce01b061abec92076a41e44b478950e4c0e1f` |
| `evidence/output-artifacts/fine-tuning-data-collection-plan.json` | 3334 | `f60ea83826b3ddf034d998bd21be6d362eeea66a651b78c9aa45a4a1566f61af` |
| `evidence/output-artifacts/fine-tuning-data-intake-request.json` | 3502 | `d6bf832a904e5c1f71c18428300190a958b261fa89fadada1bb5bcada0d0a228` |
| `evidence/output-artifacts/local-training-runtime-contract.json` | 2826 | `26440c443c31226dd6efb2479399a13aa36f5466068c889045c13b3af1a9bf68` |
| `evidence/output-artifacts/local-training-permission-surface.json` | 1401 | `e2c0acf8053c02054bec15615b3bff68ac9b291c9f36b5a58ea22f34d2962905` |
| `evidence/output-artifacts/local-training-environment-preflight.json` | 4379 | `1d961f011145230f82b158f286b3b24424f21c94a324b4270560cac09cd47c3c` |
| `evidence/output-artifacts/local-training-toolchain-decision.json` | 4061 | `e571fc960d5b4dbdb66a0eddc41a1ebf93e7289ac6b31fb2140240978c274bee` |
| `evidence/output-artifacts/local-training-acquisition-request.json` | 2244 | `58476a9aba687d1e97466172c12799a8572f1e882e3eb2e7d9c06127db2147e5` |
| `evidence/output-artifacts/local-training-acquisition-runtime-contract.json` | 2036 | `8bbf18191ff62e7e0ca7acc44d89db20e8e429cc7f64795f604f34146fd6249c` |
| `evidence/output-artifacts/local-training-acquisition-artifact-verification.json` | 2220 | `fd904fec00f52606dae155c5b730ca2d44f63ee190c1d2e61d5c4e395d0d460e` |
| `evidence/output-artifacts/local-training-post-acquisition-readiness.json` | 2714 | `768058529b39638e82f920cc58fbffbf751337349066d1a804c33c98006a0ff1` |
| `evidence/output-artifacts/mlx-lm-lora-training-adapter.json` | 7502 | `254d8f7aa3a8b5710cf31d0ca3cfdcc98861cb4f2e1abbaff2c857860ec3618b` |
| `evidence/output-artifacts/local-training-runtime-closure-provenance.json` | 2537 | `de17affb566435e95f91faff77370d41bfbc7678ae9164731a6bc8646348c06a` |
| `evidence/output-artifacts/local-training-process-supervisor.json` | 2139 | `2bf853d0342b864e69f1515458dd00f14ade94514d858f34a24de6e4c7e4a858` |
| `evidence/output-artifacts/local-training-os-isolation.json` | 2577 | `075e663e746dc3e70ed2022b272dde6f6b07105355bab61f3eba73067f4019c2` |
| `evidence/output-artifacts/local-training-runtime-exec-observation.json` | 2937 | `7fd8a03192e9e05e4ee38da855b64dcd3af72847dab2c51aecddef4044b662db` |
| `evidence/output-artifacts/local-training-runtime-image-provenance.json` | 3255 | `db78e761ae94d001bfa54db44e99c8d9fd87ca68327409113eed56645ab2ced6` |
| `evidence/output-artifacts/local-training-darwin-suspended-exec.json` | 2718 | `478ed2743445a1231ea7c84158207c417b8a575dece3af5f37b6e1eded97e6c6` |
| `evidence/output-artifacts/local-training-failure-recovery.json` | 2048 | `70e8e9aba53d30e96537b2f492ce38a1241ee6a12fbe529a11d7104c0612e8c6` |
| `evidence/output-artifacts/local-training-candidate-artifact-verification.json` | 2254 | `aa86aaa074332fd6fa09dbbb8c35046f935b8ef8828a82ff397f4301b7344498` |
| `evidence/output-artifacts/local-candidate-evaluation-admission.json` | 2955 | `25b08f43f901a1ef5c2b94f8ffde9016706f2085595c284e39fb5625521b14f3` |
| `evidence/output-artifacts/local-candidate-evaluation-runtime.json` | 3959 | `5cf3d5bf52805496e373fea46cb2dbad0a493caa074d76864bf253901d394b75` |
| `evidence/output-artifacts/local-candidate-evaluation-host-restart-rehearsal.json` | 1421 | `4cbb68d20eb1cf70bf333f293871b97401e03b0bf505157e1790ee7f101b3cbe` |
| `evidence/output-artifacts/local-candidate-evaluation-host-restart-receipt.json` | 1392 | `a3325570b1b47b2fe8329534acb584b25c76b020c968e4ee3b0e7eb8fe212025` |
| `evidence/output-artifacts/local-answer-quality-baseline.json` | 13952 | `34da61aa5715e235883aa6c10dff48c54acb905beb2d8704425e5dd091e23d2e` |
| `evidence/output-artifacts/local-answer-composition-candidate.json` | 28268 | `1cb388d694e7a96bc2993a04a59903dd32cf15fe0e31cc2383fbb3b517927e1c` |
| `evidence/output-artifacts/local-answer-composition-robustness.json` | 49779 | `1324d8267b75e40ccb950b458845929e1a55e40edc24ce9f5bf96c53faf662a8` |
| `evidence/output-artifacts/local-answer-composition-hardening.json` | 76500 | `d83ac9eb399d4ed16f3596e77fe1b26e7091bb3639580049deffb7119c65278e` |
| `evidence/output-artifacts/answer-input-boundary-evaluation.json` | 7098 | `45218019d186e4dcf3cd03a018355bf6c7f0430712e4374dafccd7f88f5bffa5` |
| `evidence/output-artifacts/local-answer-composition-boundary-regression.json` | 20173 | `88599f43061b18c2aba2670fcbf47499d189fbf4447ea13a348f61901a625e39` |
| `evidence/output-artifacts/user-query-evaluation-intake.json` | 9225 | `fad444e01c76ec11eadd636b1861bd6fce80ce4ac8f084587720a5f81ff51e4b` |
| `evidence/output-artifacts/local-user-query-quality.json` | 35540 | `a8270b51925d61161eb917b812bab5b603df43abe035339b39ab9e3046434186` |
| `evidence/output-artifacts/local-answer-review-action-generalization.json` | 54068 | `7a71e2c24ec751903fb2b971b0f776381dce4dcc9f553f466730e08ad31a974f` |
| `evidence/screenshots/workspace-learning-operator-surface.png` | 617352 | `a2632b7a8cfd46943df39b978cd3c82bdbb0aa05c350dc5f42b7b105869228fe` |
| `evidence/screenshots/user-learning-operator-surface.png` | 612712 | `2d6cf19a60308ce7c0a7a10f1d97ea1df0b726c77a8566c858a8781271d5400d` |
| `evidence/screenshots/local-training-permission-surface.png` | 549515 | `e6748c2c82c9cb91d854e2c0b05e70d13cd28c226f390717a95f714509e27670` |
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
| `docs/clean-deployment-release-v1.md` | 11889 | `0cf3be0cc94a70ff7dc6ed9a40c7a377f043b1adc7bd1466033aa2fe3fbf5c3c` |
| `docs/production-slo-operating-v1.md` | 9996 | `7c6732ff3de75775f9530b5f53524b7919aef52ab19143209c67a4b9fc65935f` |
| `docs/production-retention-operating-v1.md` | 7732 | `d7c5c7d83dc30968bbf5393cee279a5bc7f9c346eea333c3474e07d4d2854b2d` |
| `docs/production-provider-readiness-v1.md` | 22137 | `2ac12b77116ac121059848f26032e53e51d16e0be53c202d5af940e50c496cc7` |
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
| `docs/production-like-release-drill-v1.md` | 56184 | `6533062a2b76ed98974be915b41adb8ad846495c6477bc1517493e31cf2b57e0` |
| `docs/execution-v1-evidence.md` | 14554 | `d57acbc4a963724354497929b25f5c8711b3f5fce0c64c28101357ecaa73929d` |
| `docs/execution-v1-closeout.md` | 3873 | `d2bc2b4efd695249827dfc7dee180f2efc2ffa2f6a82978ee10cd702a11e6331` |
| `docs/execution-v1-handoff.md` | 9540 | `35b61c8cc292591c9f57ad48427ad67653fcdda0f6d055070f5a65b1a541570f` |
| `docs/releases/execution-v1/80cad411d228ad7282908ef4c33f5ab4285ee2e2/execution-v1-evidence.md` | 14638 | `23fb8b178527cbbc7c2e6318587af27b18beb755049ece8945ad500c86f393d7` |
| `docs/releases/execution-v1/80cad411d228ad7282908ef4c33f5ab4285ee2e2/execution-v1-closeout.md` | 4025 | `d8ee31ba800ae13fb53c1851ef7999cd6d372ec0cabcf646a66b2a31501b840a` |
| `docs/releases/execution-v1/80cad411d228ad7282908ef4c33f5ab4285ee2e2/execution-v1-handoff.md` | 9769 | `c290e31eedab7936e51feabc5bceac7ec9cd42dd38c84447ccbb167f66ce34b5` |
| `docs/releases/execution-v1/80cad411d228ad7282908ef4c33f5ab4285ee2e2/snapshot.json` | 487 | `bf894ee637bb4c1ee25b32f0107e7d649dbbd24fecfd54a3950ae95673e023e6` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
