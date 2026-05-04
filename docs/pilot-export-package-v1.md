# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T12:12:52.555Z
- verifiedCommit: 007b0526d81b0bf9bd979518087d87f6547b5de5
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 5bbc0546011c787b9d2a85536a9dee2527d0e6a26d4b44dd08459098b6a952da
- fileCount: 20
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCleanDeploymentRelease: [clean-deployment-release-v1.md](clean-deployment-release-v1.md)

## Decision Boundary

This manifest defines the minimum dry-run export package for a controlled OpenAI-scoped self-hosted/local-first pilot handoff.

It is not production deployment evidence, not a customer production data export, and not permission to claim `production-ready`.

The package can be shared only after release artifact hygiene passes with zero credential and machine-local path findings.

## Package Contents

| Path | Bytes | Sha256 |
| --- | ---: | --- |
| `README.md` | 151846 | `70cca88a257565d682c56944179ffa5700def7c8f74db6e315822d0647316714` |
| `docs/product-plan-v1.md` | 10807 | `140cc353b404f43a6b13d20531bd24ceccfc23cfd2e089d1c0a29fda50fce6fb` |
| `docs/security-model-v1.md` | 15823 | `bfdad569c407be0bcbc3eab849d4786b1908e6c5fa53de4b69580f508f1e239d` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 16138 | `20f28be9b27b9f926d55958b55d997600ba598b17f7147329f0d68b3c79e74cb` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 4996 | `677c862d2f09194b5ac2d7ceee19e76debdbfe0603d75c69686101b907f7ba7b` |
| `docs/runtime-isolation-v1.md` | 2233 | `30697df9a53bd365c7bbeb226c785260c434d97d6134a28ab3ed357594ec70ce` |
| `docs/retention-delete-v1.md` | 5394 | `99a48e074c395d3e02e78bbfa903bdba7f56077a9ebdea440a95068956da4e48` |
| `docs/clean-deployment-release-v1.md` | 3600 | `8c4cc4cd53efc61a85894bc342cd1aaed96a229404b8eec8b7d1102fa9fb2875` |
| `docs/release-readiness-v1.md` | 10547 | `48845c604dd8f7e037a98e69622b79d02a11eba420c73848f24caf77f12225ab` |
| `docs/production-like-release-drill-v1.md` | 4849 | `59dc7209016a3e28355d7d97adfbca732bf42f8dc723ed9c4ec70a11c2b86147` |
| `docs/execution-v1-evidence.md` | 10643 | `5229fa53f81a56cedd2a786a8d9bff84204cc1b086a60de6d4eaef50e360714a` |
| `docs/execution-v1-closeout.md` | 3351 | `7927676f5afec45b73f01cd49026715b4164ede5ef8a80917279c68857e0c54b` |
| `docs/execution-v1-handoff.md` | 5241 | `32d47efb4d460b785fbafbb9349c0251e67f2ca8e8a5ffa648c7edfb8740c0a3` |
| `docs/releases/execution-v1/007b0526d81b0bf9bd979518087d87f6547b5de5/execution-v1-evidence.md` | 10727 | `fb174e2b6892565cd8e8844ed1f6fc9d7e37b58c655f7172b64b76da62663c7e` |
| `docs/releases/execution-v1/007b0526d81b0bf9bd979518087d87f6547b5de5/execution-v1-closeout.md` | 3503 | `214fb998dbd63163f5848d3f626cdae50b362aa8d63e23c2c9ad5545cb9f4326` |
| `docs/releases/execution-v1/007b0526d81b0bf9bd979518087d87f6547b5de5/execution-v1-handoff.md` | 5470 | `57f06112f0178bf8ec5e6b1674c681603e2df466872fbe6907299fae2fe18780` |
| `docs/releases/execution-v1/007b0526d81b0bf9bd979518087d87f6547b5de5/snapshot.json` | 487 | `6cfe449955eba1ff0c53b4cb45496e6d951b975ffecc13cca0bc67cc91e916f4` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
