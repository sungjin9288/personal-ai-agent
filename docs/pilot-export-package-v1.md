# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T16:02:09.272Z
- verifiedCommit: 613d8a375099eba74ac7d26790049131a8c4abf2
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: a3b08a89da803374b87ab4008c11a3fdd7cca9247f368fb18987add699712e2b
- fileCount: 23
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)
- relatedProductionProviderReadiness: [production-provider-readiness-v1.md](production-provider-readiness-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 154306 | `d999a4cb1d0029532c40e00ed06f5ddecfb6b6f0adf9209a65ee387cd84e2470` |
| `docs/product-plan-v1.md` | 11077 | `83c1a12697b1799fb6f5aa71279157c88c42f9725871e60b0c96b7036bf6cb01` |
| `docs/security-model-v1.md` | 17346 | `1e734c2f9963ca24344d0d714de74d73a0572c5452b61f671a0bb11e56a3759e` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 20525 | `24cd1b59785839e5d0f39f4aa8d4e07035bb8ef384923805c87e06d4463b6912` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5799 | `8f4bcfc405ecfc19e1746dd591c7a5b47ee9a0a216e161b151b01a5b04c2e560` |
| `docs/clean-deployment-release-v1.md` | 3957 | `323f2214bcc17f4e2fe273b95d1f8afb874909a32f5306366fa8bf663cc66d77` |
| `docs/production-slo-operating-v1.md` | 4160 | `f536d560761ab48a8b2b0a3a58dfd88d0bcb4202a9a734963c0f9e9f502d2955` |
| `docs/production-retention-operating-v1.md` | 4186 | `42d8113cd47a937719b85d4465ec9c9948e51c44cd760cf83cc03015b8933287` |
| `docs/production-provider-readiness-v1.md` | 5682 | `4d1436409e3b5cfdd71ca6009a3e5174e0385c5f40e958fc8338c2aae4c7cb4f` |
| `docs/release-readiness-v1.md` | 12106 | `dafebd31294486030da5d0aca7d78a9c1ff5c72aef09c09345a29bdcbc2be86e` |
| `docs/production-like-release-drill-v1.md` | 6413 | `3928bba7496411bd10de30929d1c07119a2a787ec36f9c7ccf94ba8e6f8d7d7d` |
| `docs/execution-v1-evidence.md` | 10637 | `3485d92bc75357818ee1a0cc55ba0fa4f5f1aa597db886cd77ee4b2cc774e5bc` |
| `docs/execution-v1-closeout.md` | 3351 | `f5f606ecd53ee29835685753f7c82f6dda94d969633a74f13b4557baac875d61` |
| `docs/execution-v1-handoff.md` | 5241 | `150d2eaadbaa22629b7f7173f435720b0f94c416cd99b2fef6bb0f0e94cbbd76` |
| `docs/releases/execution-v1/613d8a375099eba74ac7d26790049131a8c4abf2/execution-v1-evidence.md` | 10721 | `ba2f41456a8f8e112abf2136e2320c3b9c2810f4d0c01932ec67ad2f4740f0a6` |
| `docs/releases/execution-v1/613d8a375099eba74ac7d26790049131a8c4abf2/execution-v1-closeout.md` | 3503 | `955bf9e8abc89b2f5eda8996bbe27dfcfbabd1c15b2c50c1ee66481c72f7eb30` |
| `docs/releases/execution-v1/613d8a375099eba74ac7d26790049131a8c4abf2/execution-v1-handoff.md` | 5470 | `d4a4ae53f265afa054944cd0e718874375a5421d0e435214cca2863659d951b8` |
| `docs/releases/execution-v1/613d8a375099eba74ac7d26790049131a8c4abf2/snapshot.json` | 487 | `41854be78943d77a537048365d46938948e50be4ba38b27d4f26f26fd10bffaa` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
