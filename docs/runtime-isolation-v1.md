# Runtime Isolation v1

- status: pilot-isolation-evidence-current
- localDate: 2026-05-04
- scope: self-hosted one-runtime-per-customer pilot isolation
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)

## Position

The current v1 isolation model is self-hosted and runtime-root based. A pilot customer or company should receive a separate runtime data root and separate registered workspace roots.

This is not hosted multi-tenant SaaS isolation evidence and does not prove per-tenant encryption, central tenant administration, separate auth realms, or shared-control-plane isolation.

## Verified Pilot Guarantee

`npm run smoke:runtime-isolation` verifies the local pilot isolation contract:

- two independent runtime roots can be created in one test process
- each runtime can register a distinct workspace, memory item, mission, session, and artifact set
- runtime state hashes differ between customers
- runtime A state does not contain runtime B workspace, mission, or memory markers
- runtime B state does not contain runtime A workspace, mission, or memory markers
- exports use runtime-relative paths
- deleting runtime A `var/` with the exact confirmation token does not delete or modify runtime B state

`npm run smoke:tenant-data-lifecycle` verifies the local tenant-scoped lifecycle contract inside one runtime root:

- tenant export includes only filtered state and mission artifacts for the selected tenant
- tenant export excludes another tenant's state markers and mission artifacts
- tenant deletion requires an exact tenant confirmation token
- deleting tenant A state and mission artifacts does not delete or modify tenant B state

## Operator Rule

Use one runtime root per pilot customer or company:

```text
pilot-root/
  customer-a/
    personal-ai-agent/
    workspace/
  customer-b/
    personal-ai-agent/
    workspace/
```

Do not register unrelated customer workspaces into the same runtime root.

## Required Commands

```bash
npm run smoke:runtime-isolation
npm run smoke:runtime-data-lifecycle
npm run smoke:tenant-data-lifecycle
npm run package:pilot-export
npm run smoke:pilot-export-package
```

## Production Gap

Production-ready remains blocked because hosted tenant isolation is not implemented.

Before a hosted production claim, the system still needs authenticated tenant identity, tenant-scoped authorization, per-tenant storage isolation, centralized tenant administration, backup/restore isolation, and production deletion evidence from the target deployment model.
