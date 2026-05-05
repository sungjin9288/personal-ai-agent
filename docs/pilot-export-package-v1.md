# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T03:55:16.873Z
- verifiedCommit: 0890545e7f4949a90dc01865494a498c562c88ab
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 589e8ec10a22a38d16998e3bc11f10e3581efc77ed73b6b54c2011249293c42c
- fileCount: 31
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
| `README.md` | 160737 | `3001d3ceb058a9a67c547150e69bc1fe949262387128c4ab4533294c83b19cbb` |
| `docs/product-plan-v1.md` | 11713 | `5c95ab7d08d6b7eeee0bbae571d402ae07029de64c807e9cdd314b439ad9c4ab` |
| `docs/security-model-v1.md` | 21817 | `83b15c79bdb78d74eee0e55e31b8a8dd6bb1d6a75d193a9f1a335629fa2dbec0` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 32700 | `023b6bf0ab9367025aeaf84ca7a288e47c20c1fdd0bf42149e94f9071b2c1e04` |
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
| `docs/clean-deployment-release-v1.md` | 5883 | `fd70202b46cb0900af1f463c60ce8afa469b98cf56761057604e269c8e618544` |
| `docs/production-slo-operating-v1.md` | 4789 | `4eb9120cd2eaf82a12e8351ef2a0387aec8288914210ea7d0b6c90cf62f49b7a` |
| `docs/production-retention-operating-v1.md` | 5235 | `c382b3e7e20a4deb2c6b19add18bcebc956dca802f6431a1dfc4217a8a0282b7` |
| `docs/production-provider-readiness-v1.md` | 5682 | `920122e15f126432003c8077257984b897807e36d4e4b25a394f06651e42b8db` |
| `docs/production-enterprise-controls-v1.md` | 6301 | `41738c935f6940a70055c5788652471896bcc1237a57227a44a559257ef2b42b` |
| `docs/target-deployment-contract-v1.md` | 7068 | `43849155df73d23155f7d45c556c3eab03c102488165ad1efe6a1211e660a15c` |
| `docs/release-readiness-v1.md` | 17226 | `144a8483d3adf46929ea6b86798855c02dfbdd83d26edba44894529dd1a564dc` |
| `docs/production-like-release-drill-v1.md` | 9541 | `2bb256f3e15e62e0e65bc5aed7f69b65eb5bda6fa3cac2b746c019bd910e0ef7` |
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
