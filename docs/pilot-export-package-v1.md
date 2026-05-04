# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T10:18:17.552Z
- verifiedCommit: 21d582db511871b8db0aa1862b658409c2b4ffb4
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 69fe8450edf6c5c8cce64a01d0b51ac696c653e0a2deb979b153ad7f0ac12245
- fileCount: 19
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 150986 | `4607caedf54069cced7cfb33f29e989dc838af4ad3fb611021fd10f9190fe3b7` |
| `docs/product-plan-v1.md` | 10749 | `bc2405de2b628039733cf51f13cf83c09504595e30ec78619d9d7ae1695607ac` |
| `docs/security-model-v1.md` | 15512 | `a357e95ac2d0f68aa46dfd0ca973e185a0b7e8505b9b63b152f2418453af5b37` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 14828 | `47f508f09a4bbf2f8a26cd432586d8ae40299f1c558631792260266164156793` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/release-readiness-v1.md` | 10077 | `eb709119ba4843b8cdc72f42deddee935e24313bea45a8ded24407d1bfe17114` |
| `docs/production-like-release-drill-v1.md` | 4489 | `f48f7152c5339ff597cf3568a0d30aa1e9c1884486a4c6b98248c2124a49044c` |
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
