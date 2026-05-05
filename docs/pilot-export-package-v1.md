# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T08:43:28.885Z
- verifiedCommit: 04e633768ceafa715c6bd2769508c77957e12297
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 08ee45a3bf47da1320a30efba143fb129fc3a82a9c1b835dbeadb0ebfc334140
- fileCount: 34
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedTargetObservabilityOperations: [target-observability-operations-v1.md](target-observability-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
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
| `README.md` | 162304 | `7bad20935a5f32fd5533e3b8ffd9ae2d2e35e8edf423ded7f7c8cef7b25eb4dc` |
| `docs/product-plan-v1.md` | 11866 | `b42be0a28a5fa12ce21762bbc155ac1d1ab56dbfd7936d2afffa1323cae82a9d` |
| `docs/security-model-v1.md` | 23108 | `c552841db0ebee29b500f9bb4b66030f9011a64d5ab11fcfc5b5ef06079cb324` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 37176 | `1afb0c241c12acf9d8334ce14275bc658e9c699783e69c6b42943d89e4d476a7` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/target-secret-manager-v1.md` | 4383 | `6f3351530c533e8d7b88d7910b16c23e27ad384076fd95d530aba23804513d79` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/target-observability-operations-v1.md` | 4864 | `5927d5bc63a83a0be77feac5c718f2747f750aeb2dbcfa6caf16d6bdf671e5d5` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 6679 | `f0901178661e4313904385d08339c04de771de635c841908e3b314a60e119178` |
| `docs/production-slo-operating-v1.md` | 5413 | `ae98a7303fb6c85e1aa93f6875f19e58596f21e278c9ffa8b8e763b325d5ce44` |
| `docs/production-retention-operating-v1.md` | 5235 | `fbd493caf7f4c54717df7913b11c2bd527b49c1bbb5d1f766489722e84d51a23` |
| `docs/production-provider-readiness-v1.md` | 5682 | `d028a2886cbad7dcf4ff3e446a18d2af531830b67c803cf1ef57efaceeef4ce4` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `5963e5114a5ee7a16998ed8352b9e67cd43cfae2e9d0c7871062d51134502aa2` |
| `docs/target-deployment-contract-v1.md` | 7622 | `70ceda384addeb460042a5277acf0c011da70f30bdbe82744dff07db4c83cca5` |
| `docs/release-readiness-v1.md` | 18941 | `068f37af7efa368bd46e45294a499466014f2e7ee795d62e8b0952e68b04bac1` |
| `docs/production-like-release-drill-v1.md` | 10566 | `cd669cae01275e02cbe64adde3493d31f46eaca011e7780b311355a5a08fb747` |
| `docs/execution-v1-evidence.md` | 10647 | `7ba687f7e4b2534326c71afb5a4ba6f62a96abc3379c4bec1fd3325203f82a46` |
| `docs/execution-v1-closeout.md` | 3351 | `236b5be1c973c4fe464c7690628de73cfa36705d395bfa985d218182699cb2ad` |
| `docs/execution-v1-handoff.md` | 5234 | `53275bdc343ade50dedf31e18fbd51802bc5e52543da5f3bac99defcbb84daed` |
| `docs/releases/execution-v1/04e633768ceafa715c6bd2769508c77957e12297/execution-v1-evidence.md` | 10731 | `3961fedfd963248ac6b8da2bf46914283a796726a0bad4c2e5d8cb09b0de8ac3` |
| `docs/releases/execution-v1/04e633768ceafa715c6bd2769508c77957e12297/execution-v1-closeout.md` | 3503 | `f7bdf492133dfed829e292fb0f4b2b26b4f45ac9fb1888d33c9c964ccc224549` |
| `docs/releases/execution-v1/04e633768ceafa715c6bd2769508c77957e12297/execution-v1-handoff.md` | 5463 | `13ac2abbea4ca772ee5a1652c0aa1fc80d97b2c52698a8b15691e5e2121553b0` |
| `docs/releases/execution-v1/04e633768ceafa715c6bd2769508c77957e12297/snapshot.json` | 487 | `16f315614f75c0d08121f1b3ca5d929f5100ea2e701d20ed16cadde4a460e7ed` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
