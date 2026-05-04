# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T18:44:44.769Z
- verifiedCommit: 1d7fb035937c84314908bca803ce6d88ff0ee2d5
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: ea64ec171342f15e0b3e1bf93f678ae1ab0a01c2c0513559d808d66e65709901
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
| `docs/clean-deployment-release-v1.md` | 4167 | `2c483d8f229ad1f0d3a1d7593d11615d3fe748ab8008187a4956cadac8db49d0` |
| `docs/production-slo-operating-v1.md` | 4160 | `724c51eaa86719585d5683256ec78562613ff932a0f322d1af2f847899ca7d66` |
| `docs/production-retention-operating-v1.md` | 4729 | `995641035e10e76180e413ce320e49e94bc93f3bb0ba7ff9be840d8e533cce0a` |
| `docs/production-provider-readiness-v1.md` | 5682 | `a03f0d523d81dbbadcbf8213c17c00dfd1c4d5067e07ba1fb234568f1cc24a1e` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `1ecafdcfc45643036d5199cd361840affec0b1e17b34924c0e261314b1f4d1f6` |
| `docs/release-readiness-v1.md` | 13260 | `7271d8167d3cdd67ff9948ed66ea954bfc92046f52128f542ce6169965039120` |
| `docs/production-like-release-drill-v1.md` | 7032 | `e6e129f99b4a8e5f6f63a4dd37014d322594911b577150f7c1f38efe31b1b5a3` |
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
