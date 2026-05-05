# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T03:35:40.063Z
- verifiedCommit: e25d566ab96ae66bfb87912011e899be9cff2696
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 7438949b03ac5ed4c572d25ad72afa0f5dbc97667182dbd5e063371884f1e525
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
| `docs/clean-deployment-release-v1.md` | 5607 | `a51ab6591297bad0604122f57717095375b9391a0d7a15c57e70b54339d68db8` |
| `docs/production-slo-operating-v1.md` | 4795 | `55cd1a4ea7e87b4560146ead90044f5adc23bdd0958d19d1f6585547b8f82f33` |
| `docs/production-retention-operating-v1.md` | 5235 | `75eb0ea206c37ce8021dad8713a0163918434d75e5480cfab73068fcdd42a208` |
| `docs/production-provider-readiness-v1.md` | 5682 | `57aec3103984a50c531493f77a118cfa9029e50bfea670db8cf95a1c982c87dc` |
| `docs/production-enterprise-controls-v1.md` | 5628 | `8f0905a7be74222832393de5e3b6ed3a9d5c88e83ca654a222531e3d159b877a` |
| `docs/target-deployment-contract-v1.md` | 6903 | `207a076ee3ff01d6822954c1dd904b4a545dce98e02849a7b263a42cb48a4e5f` |
| `docs/release-readiness-v1.md` | 16768 | `a2561377fbcf311f0f9e49ea04ac32918f16d95484eb5f7eb3f8b86f98ed690c` |
| `docs/production-like-release-drill-v1.md` | 9220 | `952a4bfe137dee828ec05e8f5fd243966fb4d24aa8cf47b4ec41e4474467a2c9` |
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
