# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T16:37:14.721Z
- verifiedCommit: a19aa820ebafc7d54d849ac3810da64ea7505895
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a93dc3ab3ddfbe6e78e801c074884ebace569e56febba464fbaa534c484d2dc7
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
| `README.md` | 154832 | `8ec6e51393f93c1c783980c91aa6c62214c47b03ad351e7e3c8615551fc2f65c` |
| `docs/product-plan-v1.md` | 11141 | `27f003db17f278c5d0a72cfe43ad94adb5a05a87ba4a3cccac6b0ef4dc73b014` |
| `docs/security-model-v1.md` | 18031 | `b4a3e373cf3e4dd84c0bf6f03ff0ced75afe8a97156c6fb4df66d9496197e756` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 21985 | `75e6e2c4af94f47fa7ef207fc7550bca8a421c19cb611b8be56ee1b7a46ee355` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5799 | `8f4bcfc405ecfc19e1746dd591c7a5b47ee9a0a216e161b151b01a5b04c2e560` |
| `docs/clean-deployment-release-v1.md` | 3957 | `323f2214bcc17f4e2fe273b95d1f8afb874909a32f5306366fa8bf663cc66d77` |
| `docs/production-slo-operating-v1.md` | 4160 | `77f95dafc48df1d767a326e610a738feff845fea67854c633214c93e28b384b1` |
| `docs/production-retention-operating-v1.md` | 4186 | `d7bcc52237e51a5da90f224a5f55bc64318507ab4ce77ed4e693eab255c1810c` |
| `docs/production-provider-readiness-v1.md` | 5682 | `37949cff38a8fcbef561c76a9a5b65d5ab4998353eab4bd7a9a8c41ca050c78d` |
| `docs/production-enterprise-controls-v1.md` | 4171 | `38e003a4e63bde59ff71e68f187b2f16fa2ba96f64fa393f44c265d9f319990f` |
| `docs/release-readiness-v1.md` | 12614 | `34630a49814798439c91d99cc5bfe3b92b61ba360b5c665f3bfa3274cd487b6f` |
| `docs/production-like-release-drill-v1.md` | 6820 | `f9172c6f29ef42d95cc98c37eef60eed29a60d0899ab349127e9eeac16d11a6c` |
| `docs/execution-v1-evidence.md` | 10637 | `d09a9d375b47d6525ab6f8348d627babd832ecb27ed0b7bff68b6fb2359e83f0` |
| `docs/execution-v1-closeout.md` | 3351 | `b13e06a72ba3b2d307a4d86d9083ed15757b2c17beabecda533c353d87a5e9ac` |
| `docs/execution-v1-handoff.md` | 5241 | `f174e2ad2cfcb64ab6938bead40a90d2a2134da7f2725d5e477791cb49c43b0c` |
| `docs/releases/execution-v1/a19aa820ebafc7d54d849ac3810da64ea7505895/execution-v1-evidence.md` | 10721 | `9dc9ed7e6d9649a38e9499103011038e0cbb904b5019101b775ec4fc2c268e06` |
| `docs/releases/execution-v1/a19aa820ebafc7d54d849ac3810da64ea7505895/execution-v1-closeout.md` | 3503 | `133ae840603804bde0d1522c4d0ecc148fc01c8ec1442d3a84085b66b7776641` |
| `docs/releases/execution-v1/a19aa820ebafc7d54d849ac3810da64ea7505895/execution-v1-handoff.md` | 5470 | `29907e9d9b52f3319fcbe66863e7e34be99c1acdadb3c3a7e6d8d9e23166e358` |
| `docs/releases/execution-v1/a19aa820ebafc7d54d849ac3810da64ea7505895/snapshot.json` | 487 | `46212be0b8a06fa7d860d2e5f460bdb1ca82c376a4d476d09a6e1ad2df263128` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
