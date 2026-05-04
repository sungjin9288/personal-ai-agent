# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T18:20:25.603Z
- verifiedCommit: e7ba7ad18cc0795d8b8f1e1a1115a12ff77ee486
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: b37b8345484e1a7141811dd4605f4204f92a1d46fdb60eef2fcf237cf07bc78c
- fileCount: 24
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)
- relatedProductionEnterpriseControls: [production-enterprise-controls-v1.md](production-enterprise-controls-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 156607 | `9a251d0f3469a6347edcd7af24198612c0608427e62a9b3c8e9fab6de618f121` |
| `docs/product-plan-v1.md` | 11363 | `8367666efc857de80a9e66df0bc233955a61a4f0f1a556c91d0e5854568bfd39` |
| `docs/security-model-v1.md` | 19483 | `9ac48b8410f2e714836d776699f67055cc03db49396f1bd2d8b95d04ec3afc50` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 23699 | `4b91cddbf8e8709eac5531a2f0e52e3304f283514a0258e293e76dcc6f1a3ee6` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6517 | `ca7282026a953feb6c9b7a91e47737cb6a06997d5a0d6357c93c23237a39ade0` |
| `docs/clean-deployment-release-v1.md` | 4167 | `570aaa2df311979494f0b732db52b5932efe2a5d2074286e526ba7d654ca8f25` |
| `docs/production-slo-operating-v1.md` | 4160 | `b7209938ba7bcd355feb90378dcaf2472907771fe3914ed0fe076fde17059d05` |
| `docs/production-retention-operating-v1.md` | 4729 | `52ce20733907f0d34bcc6bb5238bb0642f05b2c84b52f919d3ed2b3d7cef639a` |
| `docs/production-provider-readiness-v1.md` | 5682 | `4a4308f0b6551369aeae494bd971431edeb498a1ff2b7ad3fa76b38331cbdcfb` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `7310ad25a20fe965a63ba6a1d3ba607146ae138cf11a1cb7fdeb2b78073f9777` |
| `docs/release-readiness-v1.md` | 13260 | `0d7569957ebfe7d1bd9968355912f3fdc9b2913d1541445be8f18beb81644611` |
| `docs/production-like-release-drill-v1.md` | 7032 | `dea42503091a156b9a80c7731f21da877e2b82ff2dbfbd451d08c7e3fd7215d1` |
| `docs/execution-v1-evidence.md` | 10637 | `d1614ac263ad6c3a7eadcdb5ee88f9c1846dbf621e9beae95ac8dabd02fd29f9` |
| `docs/execution-v1-closeout.md` | 3351 | `14d601bb970fe0ef849f6f63fffd14e50416599099077cea152a5b4864d12ebc` |
| `docs/execution-v1-handoff.md` | 5241 | `73465f6771608a7b1e11a5a0720e639bf6cb237edbd9d523e3c167dfaec079df` |
| `docs/releases/execution-v1/e7ba7ad18cc0795d8b8f1e1a1115a12ff77ee486/execution-v1-evidence.md` | 10721 | `1613143c7578738434d7f54e00153e949f65413069d008b7adf118ab09bf551a` |
| `docs/releases/execution-v1/e7ba7ad18cc0795d8b8f1e1a1115a12ff77ee486/execution-v1-closeout.md` | 3503 | `8a6f25775c07ab63e64da45b2b93ca2ee1875e1f76e1397dc421149068c8a231` |
| `docs/releases/execution-v1/e7ba7ad18cc0795d8b8f1e1a1115a12ff77ee486/execution-v1-handoff.md` | 5470 | `ba0019223fca2e9fa6b7696f4a97538a0aa34a2352b7dec74b5cecb512a9fd86` |
| `docs/releases/execution-v1/e7ba7ad18cc0795d8b8f1e1a1115a12ff77ee486/snapshot.json` | 487 | `b71da58ea2e91c0200027c640afbb62a67dbfe1b29366f45f8b7518b170e6965` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
