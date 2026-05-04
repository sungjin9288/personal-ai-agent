# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T17:06:11.650Z
- verifiedCommit: 1cb73a2e2e0e3eccf28759b97b316a1c62e13208
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: f87d75c06363fcdccb1dc5a331b4e5d31c2c3e207d041bbf0725fb0f77caccee
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
| `docs/production-slo-operating-v1.md` | 4160 | `6c0582665aa3a23b1c95d13d248f483ae0cdbc61487191bbcac5aa94b8ebff8a` |
| `docs/production-retention-operating-v1.md` | 4186 | `4b357e597ad4cf6d12dcb0973a30e1c9063dddcfbf480c6f384e21e860f66b63` |
| `docs/production-provider-readiness-v1.md` | 5682 | `fdedc66f700daa2ddfd55ae812c75e26c6cc1b2b129010b3ad415cc5635f216b` |
| `docs/production-enterprise-controls-v1.md` | 4874 | `4b4aa7f0c3e09754e1efe052fc2113f1981ca63facc05f84a087885b40b42f59` |
| `docs/release-readiness-v1.md` | 12840 | `de5cab1d59e3ff93ab08cc83ebb562137404f93e939d35a80f3b5733f64f390f` |
| `docs/production-like-release-drill-v1.md` | 6821 | `61e63fcaecb07f34f42eabbcdf6fba90c815cd32858d2f14326ce6eead597456` |
| `docs/execution-v1-evidence.md` | 10635 | `772dd20f1c965628b7a6e9a5df6233dcd483c61642cff0837de6c32067e46a08` |
| `docs/execution-v1-closeout.md` | 3351 | `bef213223c0bd7ad724691cfac64c465e643ed749682870b1aa68a348608856f` |
| `docs/execution-v1-handoff.md` | 5241 | `4cb8fcf000d68d2bed961681550c0f5fe65ef3f791acad31bc7f45b16039e66b` |
| `docs/releases/execution-v1/1cb73a2e2e0e3eccf28759b97b316a1c62e13208/execution-v1-evidence.md` | 10719 | `266011e34822ac097a14fc143064f60e6695b6bc1bd1378c30f00eeadb6b98be` |
| `docs/releases/execution-v1/1cb73a2e2e0e3eccf28759b97b316a1c62e13208/execution-v1-closeout.md` | 3503 | `92d82caff5f2737d16696672d58d53a3e555d9358c7c62f3eff10aabad445e55` |
| `docs/releases/execution-v1/1cb73a2e2e0e3eccf28759b97b316a1c62e13208/execution-v1-handoff.md` | 5470 | `cc3641b479459a02c7c0d36e75b1df69d25917bd48d11d809937f5ddfa18e15e` |
| `docs/releases/execution-v1/1cb73a2e2e0e3eccf28759b97b316a1c62e13208/snapshot.json` | 487 | `b49f6cabed459c7788883d024564d8bbed93523e76c96f57f2b4f4371536e0ce` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
