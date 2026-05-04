# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T14:37:33.703Z
- verifiedCommit: f109cbab41f3ec9a6ee144dba11a07d0328eab4c
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 864a5eaeb1eec70886b1ed6a047160e4aa09b2729411935f0557cc31085231df
- fileCount: 21
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 153263 | `fce3d72006241a68ebf679e25963af698ceaefebca64e3436460147c7985e8ae` |
| `docs/product-plan-v1.md` | 10950 | `b6ca456083f4464c7a1ef397e54da95fceeddb820d6a745343f3390437d183f9` |
| `docs/security-model-v1.md` | 16636 | `905b9da9e9ce4ba2143cdd8a87dc1a9c90ec149d3ba15e6874b011d6597981ed` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 17937 | `cd63f0e1a6631af0a6b7e379a8ea397a22803d3260ce7cf622cf00aed0ea28a4` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/clean-deployment-release-v1.md` | 3957 | `323f2214bcc17f4e2fe273b95d1f8afb874909a32f5306366fa8bf663cc66d77` |
| `docs/production-slo-operating-v1.md` | 4161 | `d577245e5546324d092b68d3ec6f53522676934afc0958e3099746747d77ef3b` |
| `docs/release-readiness-v1.md` | 11134 | `ae810b432196b3e931466a8451765ab69f41479107743f7fc3a14a1b43a56eb9` |
| `docs/production-like-release-drill-v1.md` | 5604 | `8440dad41a108e13aec1e4ed15d11612acead4a9b021fc2b759f28851c3f469e` |
| `docs/execution-v1-evidence.md` | 10639 | `66df3369cab0a79143eeae93bc759994a17bdfe5717711a14247928cdc7ca52c` |
| `docs/execution-v1-closeout.md` | 3351 | `ec829fa809af4f7eab0436823088198eb9e0f9022fce0bb3aa1d4636609b4c67` |
| `docs/execution-v1-handoff.md` | 5241 | `4d4649d5ed621238e9ae0ba2daa1744734a1fdfff73905de3cbfb31af6dd3f83` |
| `docs/releases/execution-v1/f109cbab41f3ec9a6ee144dba11a07d0328eab4c/execution-v1-evidence.md` | 10723 | `79c51ae5fcd666f467bc3067ec7ba7c5e49d8b7976578d3a5a2c9183aa035f92` |
| `docs/releases/execution-v1/f109cbab41f3ec9a6ee144dba11a07d0328eab4c/execution-v1-closeout.md` | 3503 | `45116362000e342e0852e72fde2b47824cff43d9948f45dfdd06cdc52245f4ff` |
| `docs/releases/execution-v1/f109cbab41f3ec9a6ee144dba11a07d0328eab4c/execution-v1-handoff.md` | 5470 | `5804216da3254e22c10d76bcad8d1aeb5829e2733dbf226110a30c18e0b1171d` |
| `docs/releases/execution-v1/f109cbab41f3ec9a6ee144dba11a07d0328eab4c/snapshot.json` | 487 | `e418bff9812af0115ac09c05df449386743ac386ec466154af344808c89508b4` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
