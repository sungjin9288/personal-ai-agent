# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T02:57:54.988Z
- verifiedCommit: e25d566ab96ae66bfb87912011e899be9cff2696
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 698acc7c6a5801319e3a100fa86ceb1226d847c51f1d957ad09229c79bf7b3f2
- fileCount: 29
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
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
| `README.md` | 159719 | `2643866bb55b6e98a6848e6b80e43a2647ff12a39b78d785e3ea313266641161` |
| `docs/product-plan-v1.md` | 11609 | `b8baa985ef66aadbecba0ad1c5a988f9524b209e3416906a63a0bc564fa11aae` |
| `docs/security-model-v1.md` | 21071 | `0424dbf7cfa85b08f579875c98d7adae2a454fa5dc9b8139c08075e58d6569f1` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 29878 | `327d42503948cddf291abe77977059f15cd4a2c31111c24f200eec9ed6e27135` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5313 | `10d663c1780c7a78c85057db94b589829a987e79216b370b633cfb30006149a0` |
| `docs/production-slo-operating-v1.md` | 4211 | `1545236ede019892009b03c206a0008db93eba7efd5840dccef0e11760fca551` |
| `docs/production-retention-operating-v1.md` | 5235 | `75eb0ea206c37ce8021dad8713a0163918434d75e5480cfab73068fcdd42a208` |
| `docs/production-provider-readiness-v1.md` | 5682 | `57aec3103984a50c531493f77a118cfa9029e50bfea670db8cf95a1c982c87dc` |
| `docs/production-enterprise-controls-v1.md` | 5628 | `8f0905a7be74222832393de5e3b6ed3a9d5c88e83ca654a222531e3d159b877a` |
| `docs/target-deployment-contract-v1.md` | 6693 | `a41c9ca687a94b9ef9403e5bbdd5337c8f2ce3943d8fd6cc229e2733cccf90b8` |
| `docs/release-readiness-v1.md` | 16243 | `9bbdfb60344be112f7c6adb03237cdebe3a7dbfe689d7bbdef59f5a656bb7a8a` |
| `docs/production-like-release-drill-v1.md` | 8828 | `ad1a3dd73dbb95bdc97654d685f6d3179f80c1a9239a21748640180c5f6a3994` |
| `docs/execution-v1-evidence.md` | 10646 | `fcf08493506d2491938c213e1250d9a63be758248127fe2217cf5d5f4e53a69a` |
| `docs/execution-v1-closeout.md` | 3351 | `326eafda6b3b878f745d77347d4cdb76eb77219e1e6fd5588aa7fd94661d6a9a` |
| `docs/execution-v1-handoff.md` | 5241 | `9619b1c1dfdfa75fe22de3881273f6fcf828f94be133c94182ff2d5fe72483cc` |
| `docs/releases/execution-v1/e25d566ab96ae66bfb87912011e899be9cff2696/execution-v1-evidence.md` | 10730 | `f6d5b351809256ec639f039a3b18f1824b8170d4a617758fdb64f50ad50022eb` |
| `docs/releases/execution-v1/e25d566ab96ae66bfb87912011e899be9cff2696/execution-v1-closeout.md` | 3503 | `75351dbcb0af5db45a8d01c616f35193d76cb6718cb448cf79d652addcf3c918` |
| `docs/releases/execution-v1/e25d566ab96ae66bfb87912011e899be9cff2696/execution-v1-handoff.md` | 5470 | `1d4ace9aa24fba51a897b3b1c0883d034d62c2ccceb83bdb7fc5ca7d8c73faaa` |
| `docs/releases/execution-v1/e25d566ab96ae66bfb87912011e899be9cff2696/snapshot.json` | 487 | `ef7a97faf7b6eddda991976761244339716e14e4a1a57a8a64a3d2c42753418c` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
