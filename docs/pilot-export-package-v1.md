# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T12:19:03.459Z
- verifiedCommit: e295cea1f7c11c573b9d568c1b37a09fd546c659
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 9638e0e4069e7bfe5f52568736110081e8c04a30d4e9be9c6d202aa56d087389
- fileCount: 35
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
- relatedTargetBackupOperations: [target-backup-operations-v1.md](target-backup-operations-v1.md)
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
| `README.md` | 162864 | `20716963927f179a1c6a7c9be92ff3504b94ab95fc63ea37fd9e6e9374a2fee0` |
| `docs/product-plan-v1.md` | 11914 | `a834a44c60ed725fb7ba32ce9d0133bf24256436996f44c1b0e9a4af60758b3b` |
| `docs/security-model-v1.md` | 23525 | `c5fa73e1d526263801a99bc697df7dc33dc31cca7a1a659721e287f29c932a03` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 38805 | `a6486670d7eb10014a9803f22c595c1ca2ccd745bd28c051d5613bb2922b95d5` |
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
| `docs/retention-delete-v1.md` | 7108 | `dd22c44e14cdf4ae018d38a7cd24108d058a62603920433976d06ef1740d68d5` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/target-backup-operations-v1.md` | 5189 | `58a74e44d2c08a6a91d9c532f18517acf85a497b8bee011c4f6d3409927df3b9` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 6937 | `c3a6e6721f1cc5959c24db126c794789b54076d26f9468c98e4123ececcf1ccf` |
| `docs/production-slo-operating-v1.md` | 5414 | `e49fc5d1b372a3795ba632e15d71bd087a61350833bb99fa424ebc3af1ab3056` |
| `docs/production-retention-operating-v1.md` | 5866 | `7c6ffc65aa7494d3ed178a8269e392c4792660b797fea9800ece51e263bf0535` |
| `docs/production-provider-readiness-v1.md` | 5682 | `a1317da8e73bffb03769b5894c4bbf3df8ab3cb706c43087c01cf22403f87d42` |
| `docs/production-enterprise-controls-v1.md` | 7003 | `7a5de100c1c54ed6949681df632cda4aefd4c71868a04b6d80715592a9609428` |
| `docs/target-deployment-contract-v1.md` | 7817 | `b363956a5b322274973bae98834099c89a50c1ced05fd3aa8ac7363ebdfd8e5d` |
| `docs/release-readiness-v1.md` | 19624 | `8b5d8a96c8eb24e9ce21a21ff7e5a44c10c968bcd0726afce2402a7dbafad1ff` |
| `docs/production-like-release-drill-v1.md` | 10934 | `43ec43fb1ae0e52e9c92cba43e1464a174e563551104da2a76c92eef5a634977` |
| `docs/execution-v1-evidence.md` | 10646 | `563d5ac9a1cca5ba0cb50c592d10d044c8d583a872bd8f3735fc8c07f969ee5d` |
| `docs/execution-v1-closeout.md` | 3351 | `00cdd9c3db1cfbade2e5025c251dfe7b02246589bf545116bb5df3ca331dff8d` |
| `docs/execution-v1-handoff.md` | 5241 | `c0e282d264392553f992c08965b401758b4e727f1060aa4edea5428a108006e6` |
| `docs/releases/execution-v1/e295cea1f7c11c573b9d568c1b37a09fd546c659/execution-v1-evidence.md` | 10730 | `45857277c85e64deaa4cc7f9e95668f22f50ca36e7314de1b4b7762dbe809f1e` |
| `docs/releases/execution-v1/e295cea1f7c11c573b9d568c1b37a09fd546c659/execution-v1-closeout.md` | 3503 | `30ec0b691c9ac8973ec8d831d7941ec9bc176c45cbec93e6dbeb7a7eac9ca526` |
| `docs/releases/execution-v1/e295cea1f7c11c573b9d568c1b37a09fd546c659/execution-v1-handoff.md` | 5470 | `1432d2ac65780037d4797a83e2c6778be34efa04f533d6791ebcc3e2d66005fb` |
| `docs/releases/execution-v1/e295cea1f7c11c573b9d568c1b37a09fd546c659/snapshot.json` | 487 | `344cb53ec8fe6cfa826dac77717a39e4f169c6dc9725170a123bfd7d68a5351e` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
