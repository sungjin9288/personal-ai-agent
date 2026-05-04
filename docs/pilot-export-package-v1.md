# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-04T12:22:49.558Z
- verifiedCommit: 007b0526d81b0bf9bd979518087d87f6547b5de5
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 3b6e2efa94c37e99433a6b42bb8f0eb7cbfc6422f3722f4d3db19bf2eeb4a005
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
| `docs/clean-deployment-release-v1.md` | 3600 | `8c4cc4cd53efc61a85894bc342cd1aaed96a229404b8eec8b7d1102fa9fb2875` |
| `docs/production-slo-operating-v1.md` | 4168 | `33697eb8c9615db1de98de9d9f5cac6e1e66b65bd78b0a92e950dfe8309d45a1` |
| `docs/release-readiness-v1.md` | 10974 | `121b79c27eccff716313ec7eb3840d4db5b7e49da6468ae22423b33428483dcf` |
| `docs/production-like-release-drill-v1.md` | 5222 | `a26b44fcfd2b0f6efea592b7ebe2687c2597cc69fbadb83937c3fdeabb8e05a4` |
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
