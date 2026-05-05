# Pilot Export Package v1

- status: dry-run-package-current
- generatedAt: 2026-05-05T07:22:05.128Z
- verifiedCommit: 4bd56bd121b48e1ffdb495a4c37366d542937709
- packageMode: manifest-only
- productionReadyClaim: false
- shareable: yes-after-hygiene-pass
- bundleSha256: 1d4a9072d0a3b5e08178571b7681f3b17990871ee82988246adf924eb0a4a4da
- fileCount: 33
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedProductionLikeDrill: [production-like-release-drill-v1.md](production-like-release-drill-v1.md)
- relatedRetentionDelete: [retention-delete-v1.md](retention-delete-v1.md)
- relatedCustomerSupportOperations: [customer-support-operations-v1.md](customer-support-operations-v1.md)
- relatedSupportEscalationReview: [support-escalation-review-v1.md](support-escalation-review-v1.md)
- relatedSecretManagement: [secret-management-v1.md](secret-management-v1.md)
- relatedTargetSecretManager: [target-secret-manager-v1.md](target-secret-manager-v1.md)
- relatedObservabilityTelemetry: [observability-telemetry-v1.md](observability-telemetry-v1.md)
- relatedBackupRestoreDrill: [backup-restore-drill-v1.md](backup-restore-drill-v1.md)
- relatedIdentitySessionAdmin: [identity-session-admin-v1.md](identity-session-admin-v1.md)
- relatedTenantStorageAdmin: [tenant-storage-admin-v1.md](tenant-storage-admin-v1.md)
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
| `README.md` | 161739 | `a10ff2b2ed843ffc380b297e8fa40739cc6ba2f4a75c55478c64b641f451a828` |
| `docs/product-plan-v1.md` | 11811 | `f65093bd820bf8c79b28e813b60de55951e59639f90b3da5c19a3857dd8fc4f8` |
| `docs/security-model-v1.md` | 22795 | `d217844e7bf0ee438eb7f844d77e2d9beba199ae85ce0c6e6cd820c65385b6da` |
| `docs/operator-runbook-v1.md` | 12410 | `87bd028d346de2b7bd506301554bc6ffab74afa92ad632e12ed1b052ec8ec2d1` |
| `docs/deployment-pilot-v1.md` | 35545 | `2261af1178eabab58d2b1436069335a318cff697617b71fa04fc45e90147248b` |
| `docs/pilot-onboarding-v1.md` | 9406 | `ec670cb055cf5bdcf7e88f652b336610d0622726d4742e87c91d1eb1a7a02088` |
| `docs/demo-scenarios-v1.md` | 11621 | `cccd41868242cc43ef552b5a7477d5a3d06e5d8fd6971942ea079d79cdb9bc0b` |
| `docs/incident-slo-v1.md` | 5477 | `c4e0234a09a5dab27f44fe6d45b4af3d488e77a596dff2ca646568653aa8451f` |
| `docs/customer-support-operations-v1.md` | 6159 | `6bd7d533ba8c14397032cf82a2a510fd8fa198cd4ea22b14506cea91fc2f20c8` |
| `docs/support-escalation-review-v1.md` | 5195 | `d77b91c88d55ed06f7d8c28537f29c961d04d8f08a62aa4d674cdd874a7d7121` |
| `docs/secret-management-v1.md` | 4995 | `bddb8270d329a9f4031f5d85e6905feb25e1ac7a290428609928f5ac06ab6ca8` |
| `docs/target-secret-manager-v1.md` | 4383 | `6f3351530c533e8d7b88d7910b16c23e27ad384076fd95d530aba23804513d79` |
| `docs/observability-telemetry-v1.md` | 4112 | `5740d363494abeb281646144e1863a70923e7223f0972be1546062532a2a54e4` |
| `docs/runtime-isolation-v1.md` | 2706 | `3df3871cd9ab71d9fd63fd45fb6b1824f9ae4e008fcabc6f805548dfd5455f21` |
| `docs/retention-delete-v1.md` | 6945 | `56023a0818669d328f2350e52388d70f6e43ec95c0f21698c7e4a13940c1390b` |
| `docs/backup-restore-drill-v1.md` | 2824 | `14fcab0a9a03d1371350b349f187ce82a8113f006860adbc42baafd8ac1ba504` |
| `docs/identity-session-admin-v1.md` | 4633 | `21159854e1b51e62e16bd5a735f077a742073e58656d5309b363f0398b4c5a6a` |
| `docs/tenant-storage-admin-v1.md` | 4860 | `b40ad98e96b145568a725a11648f384fe4af4c570e6fde875437ec2b14aa5a08` |
| `docs/clean-deployment-release-v1.md` | 6400 | `99e92afd908ffeeffc59c0dc15877c8d0d3562e1b3b9f71ee02559d6210548d1` |
| `docs/production-slo-operating-v1.md` | 4794 | `d7236f116d12e99d73095030e0ae008cecfcfc3269c1b7722a45660ea1fd81c8` |
| `docs/production-retention-operating-v1.md` | 5237 | `b157fc4a9a511d61547f11a31fa13764c110d945eea8daa65399df3ea29a33d3` |
| `docs/production-provider-readiness-v1.md` | 5683 | `beb49e7b622d90460df2b6103a32262acd78363863c4490a0b2374d0c348ecbd` |
| `docs/production-enterprise-controls-v1.md` | 7005 | `157b6bec170a516c9ac046b3ebdcaae5915e369f187d0f222c415728a8dbe028` |
| `docs/target-deployment-contract-v1.md` | 7382 | `e0d5fe943b62c1e3f8c91e6808e3f12bd81038283d549c3199904c7504e1c56f` |
| `docs/release-readiness-v1.md` | 18218 | `1ed5dbb6255403d57acb117a8f73fd3e06b008586dcada5ca486905b0595a2da` |
| `docs/production-like-release-drill-v1.md` | 10171 | `8ddab5c85d809bd064794d6fb41838086eac17a2e7894a681eb8bf82ef9cdf8f` |
| `docs/execution-v1-evidence.md` | 10645 | `5278f6328292de41c93353a91b6c6232d1a90ab5ed4b94b69551e7d2db2ae6fe` |
| `docs/execution-v1-closeout.md` | 3351 | `b5713c727b328d9ba6972addde2da2f0cbfcb6d9041360d614c18c680c5781e6` |
| `docs/execution-v1-handoff.md` | 5241 | `fcb97179d8b31da0fa9be264257ffe3e1f77c8da391cedaedf0f59327f4a5a29` |
| `docs/releases/execution-v1/4bd56bd121b48e1ffdb495a4c37366d542937709/execution-v1-evidence.md` | 10729 | `f1ecba13e4547447e00ea282cded1661671b785c6a05f94c7f876e7e28ec89c0` |
| `docs/releases/execution-v1/4bd56bd121b48e1ffdb495a4c37366d542937709/execution-v1-closeout.md` | 3503 | `331f4eb48490d18c94c28088e60a084b17c7cc2e78a580584add766b63468a57` |
| `docs/releases/execution-v1/4bd56bd121b48e1ffdb495a4c37366d542937709/execution-v1-handoff.md` | 5470 | `43e6e54cc2ec2cf13463ac24dcabc228b5ebc52886ca4acdedcacd616d2e1d81` |
| `docs/releases/execution-v1/4bd56bd121b48e1ffdb495a4c37366d542937709/snapshot.json` | 487 | `913c81068f978b23e119ede59a7a68386e2d327c622dd10f43568561f9ca8aa2` |

## Operator Re-Run

```bash
npm run package:pilot-export
npm run smoke:pilot-export-package
npm run smoke:release-artifact-hygiene
```

## Acceptance Rule

The package is acceptable only when every required file exists, every path is repository-relative, every sha256 is a 64-character lowercase digest, and release artifact hygiene reports zero findings.

The package must keep `productionReadyClaim: false` until target production providers, enterprise controls, production retention/export/delete procedures, and production-like deployment evidence are verified.
