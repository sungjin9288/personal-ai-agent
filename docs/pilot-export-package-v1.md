# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T16:55:59.704Z
- verifiedCommit: a19aa820ebafc7d54d849ac3810da64ea7505895
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: c510e5a6da8777d6bf414d6825b0900f278f572d648f976e76c62fe5b8639c3c
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
| `README.md` | 155362 | `6b5d91f973eddbc10bdea5614789e8fbf8dd1c827b6aaac90e05f919d25ddd1d` |
| `docs/product-plan-v1.md` | 11213 | `7be554dffca368319cf478e64a69cef95d81dc2c9178ab7169f5d5e6e32c3631` |
| `docs/security-model-v1.md` | 18703 | `b68c784e3acb3c43d41760d3fa12c2abdf9c14e590c6c96da55fbf24c0dc41f3` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 22900 | `29ac5c607452d1a52e37f31b6d1c3dd843c87c397879a7411f05d395d8429584` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5799 | `8f4bcfc405ecfc19e1746dd591c7a5b47ee9a0a216e161b151b01a5b04c2e560` |
| `docs/clean-deployment-release-v1.md` | 3957 | `323f2214bcc17f4e2fe273b95d1f8afb874909a32f5306366fa8bf663cc66d77` |
| `docs/production-slo-operating-v1.md` | 4160 | `77f95dafc48df1d767a326e610a738feff845fea67854c633214c93e28b384b1` |
| `docs/production-retention-operating-v1.md` | 4186 | `d7bcc52237e51a5da90f224a5f55bc64318507ab4ce77ed4e693eab255c1810c` |
| `docs/production-provider-readiness-v1.md` | 5682 | `37949cff38a8fcbef561c76a9a5b65d5ab4998353eab4bd7a9a8c41ca050c78d` |
| `docs/production-enterprise-controls-v1.md` | 4874 | `68e958445e53012f80ea1d7f28fc402fd1172fd4aab339cedb2d3e73b10a751d` |
| `docs/release-readiness-v1.md` | 12840 | `de5cab1d59e3ff93ab08cc83ebb562137404f93e939d35a80f3b5733f64f390f` |
| `docs/production-like-release-drill-v1.md` | 6827 | `07a59285064c64d866b14c50ed424d8216604f8536b6190c0625069618989d64` |
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
