# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T12:59:07.080Z
- verifiedCommit: 7d2885295c2900496dc899cfed667f1fc190bdc3
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: fbec6da63fb10317135db0acf72fca7a4c673711038fc8af11626906e804483b
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
| `README.md` | 152779 | `06a9c5975cc922bd19b15dd2eb1cdf57b13d65f6b0b4918963b643b72f75c007` |
| `docs/product-plan-v1.md` | 10865 | `6d0c9a015b2783aa4f09b2b5ab630c9d5bbca3b816544402ff7facc8e3bc82c9` |
| `docs/security-model-v1.md` | 16121 | `6a44c34fff3b5bd6d4d58dde6171d6b75e60ddb9cc03f2bb5805cf336d2f1928` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 17373 | `a2950eb0518f5c90ebd42cb48eaac7c85705670983b527579c502dbcb7a9863e` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/clean-deployment-release-v1.md` | 3602 | `e4c37c6f6b76a3747bad17e92ea2e1c1a4742a251d51a3eb0dbc289fad5c1d96` |
| `docs/production-slo-operating-v1.md` | 4163 | `24e16834d0efb14eb658ec19e52dc8d6858f2719566bc69ce84268472b21d58f` |
| `docs/release-readiness-v1.md` | 10974 | `121b79c27eccff716313ec7eb3840d4db5b7e49da6468ae22423b33428483dcf` |
| `docs/production-like-release-drill-v1.md` | 5217 | `c3482d55018ab3c30a8a12132f67174ec06544e29b64ef4742b8b32b9ba8af43` |
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
