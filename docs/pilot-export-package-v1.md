# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T15:22:33.746Z
- verifiedCommit: 44ce6ff7ac9292f4fce96b63a05f24b9fa55576d
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 6a87f3912bcabf912b30d9988983e946099c6f38085973440a5553e2c5b52503
- fileCount: 22
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)
- relatedProductionSloOperating: [production-slo-operating-v1.md](production-slo-operating-v1.md)
- relatedProductionRetentionOperating: [production-retention-operating-v1.md](production-retention-operating-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 153789 | `22fea8617ae432e8e446381c42b7ed39b6abb5aea1ae4997982c6275ee291eaa` |
| `docs/product-plan-v1.md` | 11014 | `6269f93b27df811f361c92fd76548f1ae5e8f2905e0bea683b1a60c43b5a538b` |
| `docs/security-model-v1.md` | 17017 | `4a7501b06aeeeb987ccae2ad1489dca8e059704b941043ea0ead06bf82987e83` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 19328 | `ffc4feb04a558bf6da4c502c2f998e812ce8149748f7e5aa383bcfe97cd41a24` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5799 | `8f4bcfc405ecfc19e1746dd591c7a5b47ee9a0a216e161b151b01a5b04c2e560` |
| `docs/clean-deployment-release-v1.md` | 3957 | `323f2214bcc17f4e2fe273b95d1f8afb874909a32f5306366fa8bf663cc66d77` |
| `docs/production-slo-operating-v1.md` | 4160 | `0e0cb8b14dff35de9bb7e7591b36a04d7ec97e024a12eac78de2d3b053b6896c` |
| `docs/production-retention-operating-v1.md` | 4186 | `68c1577f02cdcf5a0f53beccf4ce28352a9e56dd25fe6f2a5eb46a93c7a439f7` |
| `docs/release-readiness-v1.md` | 11637 | `4dd8e86067a66a78c8acadb15b312bcd69df68ca1dfadd7019f8e7436bdb5d71` |
| `docs/production-like-release-drill-v1.md` | 6011 | `35e07b42efa9b5a5e0587c154e81ddbcf3d90c2566e145da358fa836472c4cff` |
| `docs/execution-v1-evidence.md` | 10635 | `4f77fe2a8b83a8e427a32dc60381906d4472d9f0221c8319ad238aa960d9a14d` |
| `docs/execution-v1-closeout.md` | 3351 | `b1cd4838bcaf7c31debe3d719c17bba8fadcfbddd74afc099a3bbd1dae70974f` |
| `docs/execution-v1-handoff.md` | 5241 | `3c8fdd8307c09892fa3e9d59dc38b771f1ca858dc25a6524566df34119b5a3b0` |
| `docs/releases/execution-v1/44ce6ff7ac9292f4fce96b63a05f24b9fa55576d/execution-v1-evidence.md` | 10719 | `514f414aedb13aed61f04e2f063cbac33d3ff8ab04263759ef5c1f19531e70b5` |
| `docs/releases/execution-v1/44ce6ff7ac9292f4fce96b63a05f24b9fa55576d/execution-v1-closeout.md` | 3503 | `976d2656e8b8ae2c06be9733dc9ba5fd5da5b169fbdaad1723d1bf54d26f3838` |
| `docs/releases/execution-v1/44ce6ff7ac9292f4fce96b63a05f24b9fa55576d/execution-v1-handoff.md` | 5470 | `9782128db2b2a982468f4162555e7bc0b1824c5c5dcc491edd3c8a437a6886e2` |
| `docs/releases/execution-v1/44ce6ff7ac9292f4fce96b63a05f24b9fa55576d/snapshot.json` | 487 | `7ad02f634cdc8e3ce98e354f2cb5c031499c99258701be727a6820a36f2ee258` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
