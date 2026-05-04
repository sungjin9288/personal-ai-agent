# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T18:08:15.174Z
- verifiedCommit: 254aa024b0371f3af2d7f9f29e98f5a1ae720f97
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 2c1861f68eec5e5a095c0e8b1539767c613cac59abb40b726f2225546407d9d8
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
| `docs/clean-deployment-release-v1.md` | 4168 | `61ed088d6e350d582c5d03025caf39c808e0566f8fd68c1868dd98b572305212` |
| `docs/production-slo-operating-v1.md` | 4160 | `bcd5889f161cbccf5862d226b8d4391b68a0bff9d510ab804c4761bf924dd3dd` |
| `docs/production-retention-operating-v1.md` | 4730 | `d7e34ddee144288646ae39abd8b70aa0e8e822f47350a62586dd055f98c92578` |
| `docs/production-provider-readiness-v1.md` | 5682 | `3eca033a6e7fdcc677cb5a04e463a4ed96992545b063425aec5e41b078db39ad` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `50dafa5608109493981e747c3f157f5a6d7c5cc192a84e9efd8aa2af7d34a4d8` |
| `docs/release-readiness-v1.md` | 13260 | `878c5ffa82d7dd3e4cea400944c9351b81d4580756eea5aef722d494681bfc35` |
| `docs/production-like-release-drill-v1.md` | 7039 | `eec63d243d50e193433de854ce755f68761957127684411566d63621fd17dca3` |
| `docs/execution-v1-evidence.md` | 10635 | `848122adb5ba22657a1708f3bb5c9bda354359c123184d2a20fae08dee423987` |
| `docs/execution-v1-closeout.md` | 3351 | `66d1c596b371c21b580bcfa5e60624f374d20d15d9c7aee9b13279188962cc7e` |
| `docs/execution-v1-handoff.md` | 5241 | `227c4a8b02f1da57e3186c6c08b79cbcb25a229c00b38d8126addcc0db426c33` |
| `docs/releases/execution-v1/254aa024b0371f3af2d7f9f29e98f5a1ae720f97/execution-v1-evidence.md` | 10719 | `6df62542132385eef9e0caa71cac1827e81f9f635de30fc647543c0dd0ccb855` |
| `docs/releases/execution-v1/254aa024b0371f3af2d7f9f29e98f5a1ae720f97/execution-v1-closeout.md` | 3503 | `ac4b518148198cebd290aa1de282489142d1743086a2310ca27ab13206960a14` |
| `docs/releases/execution-v1/254aa024b0371f3af2d7f9f29e98f5a1ae720f97/execution-v1-handoff.md` | 5470 | `1909e17fa448320bd0ee07c3a225fdd1557671b8617fc918049b7677229c2990` |
| `docs/releases/execution-v1/254aa024b0371f3af2d7f9f29e98f5a1ae720f97/snapshot.json` | 487 | `4d19abe20d65494d4641faa3c36178932438a8baafdbf1ac7c2c3d0e77e7ea7d` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
