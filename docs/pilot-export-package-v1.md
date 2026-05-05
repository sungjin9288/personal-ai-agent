# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T01:48:39.023Z
- verifiedCommit: d6bc909d19b0cef037e36168d5184e2eb3fb1e88
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 136827ca84b30be6394089d60eec5f4853a141e2213909e49e29d57312997b74
- fileCount: 27
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
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
| `README.md` | 158808 | `40f81029d24e1bfc01b37b2387577929b88c82360e5d2ed7ca28360513d255b7` |
| `docs/product-plan-v1.md` | 11521 | `fb72a3fb9d47641c8f75e3dc72328ef73c4c230f2f0a77d3ebedfca122b2d939` |
| `docs/security-model-v1.md` | 20162 | `4456a247d4a55a3a7b18f35c16ef8b88f96e074fbe14f828aee97331b951eb74` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 27240 | `108abae06335f0176c004a7c6ee8c19f5793c99d374892fdb2bbe0af9be831f8` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/clean-deployment-release-v1.md` | 5237 | `1cd82d3579040bbadda24e7d211d88605ad21a4d5266f354e8c5cd41860e5b35` |
| `docs/production-slo-operating-v1.md` | 4161 | `3b4f6b6beaaccefdf663b63a76d9490ada774f457429b2db59adbeebed20f106` |
| `docs/production-retention-operating-v1.md` | 5235 | `88e9954a1fe1eccace72537a46579f05707b152122f2e5f62c93ba84cda8ef67` |
| `docs/production-provider-readiness-v1.md` | 5682 | `d8d3e5e642a317a971da4d0d13fa8061922d5f4bd6b8c9a3734f5eaa78072016` |
| `docs/production-enterprise-controls-v1.md` | 5627 | `8fdd9e641b7bfdbc7b24da6a70d353b5baf022af926aa74e0d33f5adbbbaf683` |
| `docs/target-deployment-contract-v1.md` | 6087 | `7220f7476f6c13e87e0137053ffe12724fe58b61edafdf68b3e6ae68e24fdc94` |
| `docs/release-readiness-v1.md` | 15027 | `251186d2b812f272779f3a9260ea37d4a7aa12f8885978e6165efac3d6ef459d` |
| `docs/production-like-release-drill-v1.md` | 8017 | `1045f9f2c23131f69fec9ab53793048d0d93a356b50179549f15c6e438819896` |
| `docs/execution-v1-evidence.md` | 10635 | `8203ebf7739d5bfb95497765fe32a4828473cfb90a15898cb8f9c3b13bf7a63a` |
| `docs/execution-v1-closeout.md` | 3351 | `fd58bf27c1fdfb31ba3fc800097b1d51a616903aea8fd988b6dc3ad3983abc97` |
| `docs/execution-v1-handoff.md` | 5241 | `316d4f729f18baf30c24234381a454955562db74e74075d0703a5bb8d0a695a5` |
| `docs/releases/execution-v1/d6bc909d19b0cef037e36168d5184e2eb3fb1e88/execution-v1-evidence.md` | 10719 | `93fb723eec7b331cd5a8e7a267a84d3c45d24779efc4504057e91b8634c0fb9f` |
| `docs/releases/execution-v1/d6bc909d19b0cef037e36168d5184e2eb3fb1e88/execution-v1-closeout.md` | 3503 | `328989f9f8e8a50636500f67596ac62da28d16a9f712895eb6624ab61f593afd` |
| `docs/releases/execution-v1/d6bc909d19b0cef037e36168d5184e2eb3fb1e88/execution-v1-handoff.md` | 5470 | `11707c758194a2a95b204193bd6a528dc348036a3c0b695f223451496cb852e2` |
| `docs/releases/execution-v1/d6bc909d19b0cef037e36168d5184e2eb3fb1e88/snapshot.json` | 487 | `d3d6867f0c0b124f9de898c9f0e623e09c18ac37dc5b34488c0a7fa86c7cc17e` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
