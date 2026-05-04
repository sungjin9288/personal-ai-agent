# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T15:03:29.190Z
- verifiedCommit: 27a5b7146b069d674a9a062fb854de03840f1380
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: ce8f9accbe4cbee6585c3da9a9484131f1f6c590703a00694963525a045e23f8
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
| `docs/production-slo-operating-v1.md` | 4160 | `b10b61bce98449f9b406f59bddcd95b3a2738e0a99705c2353f42e37f512c799` |
| `docs/production-retention-operating-v1.md` | 4186 | `2df06127ff7ddda75f905f051ac22dfad823617153c1fb3291521e6cfcca7729` |
| `docs/release-readiness-v1.md` | 11637 | `4dd8e86067a66a78c8acadb15b312bcd69df68ca1dfadd7019f8e7436bdb5d71` |
| `docs/production-like-release-drill-v1.md` | 6011 | `d04a07e3429498fc171f08107b568a6a3f2d3ac4d36201d424cf452b012f2abf` |
| `docs/execution-v1-evidence.md` | 10635 | `4356779d7d0c6ef95bf85f5dcc19b6adcdf9df3ab7bacfd98ae0d8fe165c8f58` |
| `docs/execution-v1-closeout.md` | 3351 | `521968ec85df75c09189ce92ddba0ac21102c3d9babe14e29120ec5853383267` |
| `docs/execution-v1-handoff.md` | 5241 | `09e8ac2f56a575ed18578deefe71a9823d85bef1bb4e99c9278332c8df957654` |
| `docs/releases/execution-v1/27a5b7146b069d674a9a062fb854de03840f1380/execution-v1-evidence.md` | 10719 | `191e8660d50e0951090e82ec4cc02e7687831d2ac6684b98c63329d82e5e1ea7` |
| `docs/releases/execution-v1/27a5b7146b069d674a9a062fb854de03840f1380/execution-v1-closeout.md` | 3503 | `409aef63fa8b3cf220b52fb54eddcc5223bfafda75bf5ff30fb20f01808b551d` |
| `docs/releases/execution-v1/27a5b7146b069d674a9a062fb854de03840f1380/execution-v1-handoff.md` | 5470 | `3456c85a8cf3e892b05da6c5e536c9a2cfcd8bd45601a06dc366d8980c779329` |
| `docs/releases/execution-v1/27a5b7146b069d674a9a062fb854de03840f1380/snapshot.json` | 487 | `871ac5cc4d15fec2a009508f727fa82a6fd508de12da49015cfb23cc436c78cb` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
