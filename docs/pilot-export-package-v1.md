# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T14:24:24.896Z
- verifiedCommit: 7d2885295c2900496dc899cfed667f1fc190bdc3
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 5809e672a14d8b1a90658fda349800f31c98dd6a5ccf68e1f2ce5907250f22fb
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
| `docs/clean-deployment-release-v1.md` | 3956 | `1770b0983857bdc90438e1a22c366867fef51b42e7a39349ff30b7c9bd01d15e` |
| `docs/production-slo-operating-v1.md` | 4166 | `3dcf133e5973ac4a4e4acd5d0fe40e9e56c40950022cf14d044a8a965b8035ce` |
| `docs/release-readiness-v1.md` | 11134 | `ae810b432196b3e931466a8451765ab69f41479107743f7fc3a14a1b43a56eb9` |
| `docs/production-like-release-drill-v1.md` | 5609 | `ddbe61da4b60aedb209ed5a87d6b9a35eae5014f2f19060af737206e8811ba6c` |
| `docs/execution-v1-evidence.md` | 10643 | `fc6bd7829a555a8769249d495b354899ef88d5a233112cbc5316cde57923ca84` |
| `docs/execution-v1-closeout.md` | 3351 | `772ddb03553313049dd3298ffaefdc671334b9a15f15820653c19c8878b105e2` |
| `docs/execution-v1-handoff.md` | 5241 | `3b532e7c8eb896a32198f22aef3b44051cf2a6eede3ff00acacf8a792b8ab5c5` |
| `docs/releases/execution-v1/7d2885295c2900496dc899cfed667f1fc190bdc3/execution-v1-evidence.md` | 10727 | `4e41c647b22433e3ea73bc8d467df6368fee8d158b1ca17ee6d4dcc202858b65` |
| `docs/releases/execution-v1/7d2885295c2900496dc899cfed667f1fc190bdc3/execution-v1-closeout.md` | 3503 | `8d46a29d9a9cc06f9474a863cc2e3d91573a0629618bc4e42d00b836ede63d34` |
| `docs/releases/execution-v1/7d2885295c2900496dc899cfed667f1fc190bdc3/execution-v1-handoff.md` | 5470 | `ed17a5f0522f76baf1a2c6ad291403c480ea67c3d75c54db252ddaebc31d8926` |
| `docs/releases/execution-v1/7d2885295c2900496dc899cfed667f1fc190bdc3/snapshot.json` | 487 | `b7b039d8bb49408172c1bd5576a7bf48f5ba5d1ccf3c5ba6e3bbf20d6aa0336a` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
