# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T19:07:44.430Z
- verifiedCommit: 1d7fb035937c84314908bca803ce6d88ff0ee2d5
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: d2c36e6d13e9971f02c752aca99b412b7284bf497a4c3f85e8388e1daaff769d
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
| `docs/clean-deployment-release-v1.md` | 4686 | `fda7c949be0c69ba80f162c4b706d2c65a2c5e4f0151fd003e92ebb3647aeda1` |
| `docs/production-slo-operating-v1.md` | 4160 | `724c51eaa86719585d5683256ec78562613ff932a0f322d1af2f847899ca7d66` |
| `docs/production-retention-operating-v1.md` | 4729 | `995641035e10e76180e413ce320e49e94bc93f3bb0ba7ff9be840d8e533cce0a` |
| `docs/production-provider-readiness-v1.md` | 5682 | `a03f0d523d81dbbadcbf8213c17c00dfd1c4d5067e07ba1fb234568f1cc24a1e` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `1ecafdcfc45643036d5199cd361840affec0b1e17b34924c0e261314b1f4d1f6` |
| `docs/target-deployment-contract-v1.md` | 5673 | `e16ecc0a9146abc18c8ed19bfb83e4996eace578a59c1285bbe673303c5970d9` |
| `docs/release-readiness-v1.md` | 13959 | `c1820501c7c1718502de3e3f50b2c837ab3044c0259fc88008b42e4d2a489b97` |
| `docs/production-like-release-drill-v1.md` | 7367 | `a51c662e42d353febe9109ad77970e140e165734ceee95f4235da010ac99503a` |
| `docs/execution-v1-evidence.md` | 10637 | `8f1994f9d71f270415e5ccf44230e5bb6b4b239c6f4e2dc7d415eef0727af2d4` |
| `docs/execution-v1-closeout.md` | 3351 | `75184da9c92de22ded0aa043458ae6f781defb489bc052a587cf6b80922f4a60` |
| `docs/execution-v1-handoff.md` | 5241 | `79c9bb3ca7f6e9e3e2ffed467d7eaa0e1783e7bb5ad4e3bd5d7438c8dace61d0` |
| `docs/releases/execution-v1/1d7fb035937c84314908bca803ce6d88ff0ee2d5/execution-v1-evidence.md` | 10721 | `1b3274a278bf770fd46d545ab1e916b243911eb28a0074442a47a7fb5f3bcf32` |
| `docs/releases/execution-v1/1d7fb035937c84314908bca803ce6d88ff0ee2d5/execution-v1-closeout.md` | 3503 | `60ef1dace814f206df3a06814579e16f4ddc204e6a92ece7d84f73e3feba0594` |
| `docs/releases/execution-v1/1d7fb035937c84314908bca803ce6d88ff0ee2d5/execution-v1-handoff.md` | 5470 | `2551f53e64bd57115b4be83a63996187b2edfd80c7c43407a0d881ca9c1d8e4a` |
| `docs/releases/execution-v1/1d7fb035937c84314908bca803ce6d88ff0ee2d5/snapshot.json` | 487 | `5c4ecc78b1a4df9946b8bec6ea59aedc066b1b89447a96b26bea85a236882aea` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
