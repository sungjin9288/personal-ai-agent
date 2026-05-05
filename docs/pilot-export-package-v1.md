# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T04:35:47.899Z
- verifiedCommit: 471972f549a3ff3a17becc5f6e789bb7f3bf225a
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: dae42acc71b5c9d2f1fd19c0e05cf1413b72da8ff168af6752a9f5edd69a04ce
- fileCount: 32
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
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
| `README.md` | 161243 | `bd75c782a0fe32884cbc3cd9e177c2a0713176655fcfd60eae7784cd73c537a5` |
| `docs/product-plan-v1.md` | 11766 | `59c0e6c55e2c1c5f04c4b025107eba0318d59e499c4bf840b492706aa6e50596` |
| `docs/security-model-v1.md` | 22335 | `f91fdd39c86bd6abce1db8f39f41e891cd27a45a52756a430a7af13823d4d858` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 34100 | `8ed77f9f87f36f3b443d1753c571687bdb77e89f3c21feca5093d5553dd80b36` |
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
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 6150 | `74d0142dd74d164744c5349b52e136852121257f4016800c158dce0bf46d5896` |
| `docs/production-slo-operating-v1.md` | 4789 | `28fce8f8eeae7483951d6c466531ec6a0399e268ce4d24bd3e55ec61417ede24` |
| `docs/production-retention-operating-v1.md` | 5235 | `a3032b90de81fe4a257cc3d11e4511b4805f71e3d7b6328dab91286efdca6cce` |
| `docs/production-provider-readiness-v1.md` | 5682 | `30925dc86fb0b48ca4597468cd621f013c0055b88cbddde177f2043599c292d8` |
| `docs/production-enterprise-controls-v1.md` | 7002 | `a25a207d22467ab930e6f34aa126532221e4d0e27513f84db95499d2fb6e19f6` |
| `docs/target-deployment-contract-v1.md` | 7229 | `731e017f7d92609dddb0de99aedd25c06ecc81f04a3fd97511f7abacb2bd9d3f` |
| `docs/release-readiness-v1.md` | 17666 | `0f1b48738201f2276e543d640ec07cb7bd1d79af418a85f14c5d9291448f91c2` |
| `docs/production-like-release-drill-v1.md` | 9843 | `cd6bf4c0d16a48d5d86dcd73ffd95b58e096883d28592f5c9d0b215a89df21e3` |
| `docs/execution-v1-evidence.md` | 10642 | `3beefc5f4335b0361b1e83822459c6335c46ef0e9e9464603f37d13f96b82ac4` |
| `docs/execution-v1-closeout.md` | 3351 | `1f55bae4548cf6a525f471f9fe4ab6b9b52d36163ce588fbf3f7ccc85151c2b8` |
| `docs/execution-v1-handoff.md` | 5241 | `8d1d63c37707cd946727b178c7408a4e1105d6ac782db432500a237e0d88e252` |
| `docs/releases/execution-v1/471972f549a3ff3a17becc5f6e789bb7f3bf225a/execution-v1-evidence.md` | 10726 | `58892dc340a524d77a8c6b5db8376718f9013adf6eae23655909bfdc8cdb4e34` |
| `docs/releases/execution-v1/471972f549a3ff3a17becc5f6e789bb7f3bf225a/execution-v1-closeout.md` | 3503 | `6bafd1fc06aa271f4a7df25b4852ca303148c3e6d674400b197439479402ba67` |
| `docs/releases/execution-v1/471972f549a3ff3a17becc5f6e789bb7f3bf225a/execution-v1-handoff.md` | 5470 | `1da8f3127bee4daf4405a207b36528d13871abf831b79bd4f523d1cb55127a92` |
| `docs/releases/execution-v1/471972f549a3ff3a17becc5f6e789bb7f3bf225a/snapshot.json` | 487 | `12434e2c1b77ae3fe2ff07856f51fc48dadc48a4d226ce8349d60f6259e71f97` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
