# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T19:19:23.907Z
- verifiedCommit: 3e3d1ee4c0f2f137914cc8518789c3de06231117
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 564e034e6f7a6c0cb1a99c58de3e8cc53d837e223043e7d88c3a2bdfe636ffc7
- fileCount: 25
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
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
| `README.md` | 157439 | `59676f5d86db435dcae6fbd5f2260c409b49abeda376bfde41d29b4e1e81c7bc` |
| `docs/product-plan-v1.md` | 11413 | `c641fc2d0ef20f9215e2cde3082897333149d7969232bfb1accfa56be3b7afb1` |
| `docs/security-model-v1.md` | 19849 | `05fb2ceaad5e23e099436659e8060d76a78fd61460f461801f9d36cd496864f3` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 24958 | `0db93af6f1cfad81610264beb1b4d7ad4d813c0df2135e8eb510f3a2047998c9` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6517 | `ca7282026a953feb6c9b7a91e47737cb6a06997d5a0d6357c93c23237a39ade0` |
| `docs/clean-deployment-release-v1.md` | 4686 | `55ae18a4046947a770d6bd637fdc4037e2ecb58da17713c40e40e65359d20d78` |
| `docs/production-slo-operating-v1.md` | 4161 | `570e141bd63a6bde9fc7793ad149eab48318b4344e261c83c5f951c270c33a06` |
| `docs/production-retention-operating-v1.md` | 4729 | `c32ca468ae54a84058371fb3ab849a198b66781750fc3dff819b2c0915851661` |
| `docs/production-provider-readiness-v1.md` | 5682 | `064f278367d995b6e355dcfb0c77f4d40bc02b299b4847beea0b547cf251951e` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `6dc34059882d45bfa63deb0e25f06f41d05166e9fed16e629d17d736618e1de0` |
| `docs/target-deployment-contract-v1.md` | 5673 | `e16ecc0a9146abc18c8ed19bfb83e4996eace578a59c1285bbe673303c5970d9` |
| `docs/release-readiness-v1.md` | 13959 | `a9ec94b8aa3fa48d892db4f527d446346b6dbf37f2dde486141a6f5fa4b6b8ec` |
| `docs/production-like-release-drill-v1.md` | 7361 | `112fde459e6b1fc9919cdacca5a2fd3e6e650780783fb3f5efa411c92382760c` |
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
