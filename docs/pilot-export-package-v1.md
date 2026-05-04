# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T10:07:59.005Z
- verifiedCommit: 21d582db511871b8db0aa1862b658409c2b4ffb4
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a95b99d8b727b200b8bfd0711c60dd5513b940e52a319ceea3b3b1c857f3d8e4
- fileCount: 18
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 150243 | `934afa197cfd45054c0b008d59f4cb59ed25b732f6e3d238749df7dd4e455769` |
| `docs/product-plan-v1.md` | 10702 | `0fd39a01a151ae30fd1fb01afac627aa2dc049783786e1bee493b6ccd6fd04b5` |
| `docs/security-model-v1.md` | 14792 | `930572fd7076fb6ae689e6a8e9f5c224e5ea38aa013da4fe909a9d29d1c27260` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 13588 | `67a69f3195bdbe84fdfdaeb30310dae104dc724dcea8bb29aba197f3a206c97a` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/release-readiness-v1.md` | 9647 | `79d99d874df29f956a63fe9ebce6f0fd46432bc1b157c58b82a7138414fe5a4f` |
| `docs/production-like-release-drill-v1.md` | 4141 | `b37e0c0998754d3a97c21145c50e5f348e59c947d56b4b949cb3ac8ac897c283` |
| `docs/execution-v1-evidence.md` | 10641 | `b274ff873f4227a41ba9c4f3980482408654901a9d17d19ef39049fcd271fe51` |
| `docs/execution-v1-closeout.md` | 3351 | `4a4f47781f9df73b425d0a6d57667206a7cd5975b0fa26be3e87a278f05a26d6` |
| `docs/execution-v1-handoff.md` | 5241 | `ea4b65f21258b0f53e43d748313441cb64510adc6ec4c563b04a578b177a509e` |
| `docs/releases/execution-v1/21d582db511871b8db0aa1862b658409c2b4ffb4/execution-v1-evidence.md` | 10725 | `df0bdb31157c58ab9190c9a072efe79d9c3a69ccc6ba4f7fde7337c5a231f2b3` |
| `docs/releases/execution-v1/21d582db511871b8db0aa1862b658409c2b4ffb4/execution-v1-closeout.md` | 3503 | `66d9319cde38b3b6b97b5ade55b504d7fa404637385e98045a4b5fa6e9b7edfa` |
| `docs/releases/execution-v1/21d582db511871b8db0aa1862b658409c2b4ffb4/execution-v1-handoff.md` | 5470 | `c27451ae76d4a561d417d9f239acf945c0a45ec314f670a95d76a87ba6b5ad8f` |
| `docs/releases/execution-v1/21d582db511871b8db0aa1862b658409c2b4ffb4/snapshot.json` | 487 | `7ac4da87a328b46399ddee28303e8c09c81c8f76420394ea62dba0b6c8fd70df` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
