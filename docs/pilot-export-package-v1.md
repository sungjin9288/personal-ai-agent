# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T01:28:36.582Z
- verifiedCommit: 3e3d1ee4c0f2f137914cc8518789c3de06231117
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: aef9145813ee15d200393134b152a4bec90c7d01bbbe65a952c176ae4d8d0e4f
- fileCount: 26
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
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
| `README.md` | 158306 | `5b3cb7df78fff6ca45c260fc026dc3ec05d28092da6df1700f284d3f2c7f69b9` |
| `docs/product-plan-v1.md` | 11470 | `a8623d68e7bad33810c97a557979d08b6e6475f1cb84f13c03341100be31dff4` |
| `docs/security-model-v1.md` | 20162 | `4456a247d4a55a3a7b18f35c16ef8b88f96e074fbe14f828aee97331b951eb74` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 25964 | `096a5d67f5c605d99eba9615277dc1b6e3eea49482bfba41fe578c4aba56c98c` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 4926 | `f26ddb735d188449c07dd3cca4b7e105f56f0989c02a0c8175ac6494bad9af43` |
| `docs/production-slo-operating-v1.md` | 4161 | `570e141bd63a6bde9fc7793ad149eab48318b4344e261c83c5f951c270c33a06` |
| `docs/production-retention-operating-v1.md` | 5235 | `94df32d2fb1ec35fb9eea63c4f25bbfa5e053fa8bc3ea7ed66dba4b49a220544` |
| `docs/production-provider-readiness-v1.md` | 5682 | `064f278367d995b6e355dcfb0c77f4d40bc02b299b4847beea0b547cf251951e` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `6dc34059882d45bfa63deb0e25f06f41d05166e9fed16e629d17d736618e1de0` |
| `docs/target-deployment-contract-v1.md` | 5731 | `9fee7e99f682274fd49e166d89bc6c826304c1b12dcf03fbe21085e13ea6536f` |
| `docs/release-readiness-v1.md` | 14400 | `7a46a0713298e8b77e7fb1072676e6e2b4498c6037fcbf9ce9ab704df3329c68` |
| `docs/production-like-release-drill-v1.md` | 7607 | `468e978a9d63075b2646cccf68c4d8e6e6d8409f61fa95f0dae03d3d7f8285e6` |
| `docs/execution-v1-evidence.md` | 10637 | `552e270e6f51899409a0aa95124a16b21209138098b3a39dd5a60f5222990abb` |
| `docs/execution-v1-closeout.md` | 3351 | `50bb74204d03993ad3fade590baf6bc6f45bda9ad192d982ee422ad15b59646b` |
| `docs/execution-v1-handoff.md` | 5241 | `c80ce529f7596d0bca5c5c00ee2b4df16461b95f6137475c2ef6bd6f3a0df2f8` |
| `docs/releases/execution-v1/3e3d1ee4c0f2f137914cc8518789c3de06231117/execution-v1-evidence.md` | 10721 | `41d347f56f7dc68e2dd4d858687c49054fdd975dc0f449684c3ba6c41950d75d` |
| `docs/releases/execution-v1/3e3d1ee4c0f2f137914cc8518789c3de06231117/execution-v1-closeout.md` | 3503 | `71c8e737a2da4d1abf5dba9b8caae01c3eb8c4c40199e8e54a2766ca2c897dc1` |
| `docs/releases/execution-v1/3e3d1ee4c0f2f137914cc8518789c3de06231117/execution-v1-handoff.md` | 5470 | `b1538b4c322f21e21e1970f8172104a0300d83df144208cd014329521c348a86` |
| `docs/releases/execution-v1/3e3d1ee4c0f2f137914cc8518789c3de06231117/snapshot.json` | 487 | `f0064ddd829278c0d78effa25c4c3989fc02904d69c63827767b8ea67a45d927` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
