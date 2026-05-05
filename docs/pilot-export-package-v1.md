# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T03:46:08.512Z
- verifiedCommit: 0890545e7f4949a90dc01865494a498c562c88ab
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: b1c801db331c5aacb6fed00ffa592a48b067f0c386d8ce313d442426395b0bb5
- fileCount: 30
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 160219 | `8894bc228b00d0bbc256cae876ab8dfa3cb251d285a2693c034abd7f428dc5c5` |
| `docs/product-plan-v1.md` | 11658 | `11f82d76e4555a4aeb553aad4072b90a1b5fea8c0ea54494293fe80b1ecfc867` |
| `docs/security-model-v1.md` | 21288 | `d8300f726bff7318589ba6cab7dd89b6ce9cda5d2a55b7bfd67724e1a29a55d7` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 31279 | `f11d98cafc18d5d8af9eb4695d46485604f5ee8e0a31c331643bf4bfb6c11198` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5607 | `02f4665e39b5de9413483151766999ec6728539e65b404975032249068e7877f` |
| `docs/production-slo-operating-v1.md` | 4789 | `4eb9120cd2eaf82a12e8351ef2a0387aec8288914210ea7d0b6c90cf62f49b7a` |
| `docs/production-retention-operating-v1.md` | 5235 | `c382b3e7e20a4deb2c6b19add18bcebc956dca802f6431a1dfc4217a8a0282b7` |
| `docs/production-provider-readiness-v1.md` | 5682 | `920122e15f126432003c8077257984b897807e36d4e4b25a394f06651e42b8db` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `3df1209ff428c873860135c79b3b63be8cf79e9f5b98a953079bb610b7882acb` |
| `docs/target-deployment-contract-v1.md` | 6903 | `207a076ee3ff01d6822954c1dd904b4a545dce98e02849a7b263a42cb48a4e5f` |
| `docs/release-readiness-v1.md` | 16768 | `a2561377fbcf311f0f9e49ea04ac32918f16d95484eb5f7eb3f8b86f98ed690c` |
| `docs/production-like-release-drill-v1.md` | 9214 | `8e4a34999a1f2384fed73c727a09f9256a8851d78c360eff56eb60d00035310c` |
| `docs/execution-v1-evidence.md` | 10646 | `b76e7996714a942a2927808c2426d13af3547d3402016b7e2a8254d5dd51e452` |
| `docs/execution-v1-closeout.md` | 3351 | `553fa02afd7edca655edace1a6c9788f8f8410fb0724f2b11a978c7049d0b139` |
| `docs/execution-v1-handoff.md` | 5241 | `4e0e2699cab0617289ac3a7514976aa365009b315f19f6636518492efc9f46ca` |
| `docs/releases/execution-v1/0890545e7f4949a90dc01865494a498c562c88ab/execution-v1-evidence.md` | 10730 | `4396fdb1a3eb3ee5913f34b3d63cec1ee4a96d0c9350fcbebf38374779698198` |
| `docs/releases/execution-v1/0890545e7f4949a90dc01865494a498c562c88ab/execution-v1-closeout.md` | 3503 | `4213ec1d4eedb7f90572b002c35edfd33e32867186c8fc3574c36458c704e4a6` |
| `docs/releases/execution-v1/0890545e7f4949a90dc01865494a498c562c88ab/execution-v1-handoff.md` | 5470 | `82591bafdb13731155b524578672b36e12a04eef7aada9a28c8848546dce3560` |
| `docs/releases/execution-v1/0890545e7f4949a90dc01865494a498c562c88ab/snapshot.json` | 487 | `118ea2287c47455e6e770902263f00562d9ebbb131ece6f4417c389a0272ade6` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
