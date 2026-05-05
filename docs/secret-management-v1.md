# Secret Management v1

- status: local-secret-management-current
- localDate: 2026-05-05
- scope: self-hosted pilot secret injection, redaction, rotation, and release artifact hygiene gate
- productionReadyClaim: false
- relatedSecurity: [security-model-v1.md](security-model-v1.md)
- relatedDeployment: [deployment-pilot-v1.md](deployment-pilot-v1.md)
- relatedReleaseReadiness: [release-readiness-v1.md](release-readiness-v1.md)
- relatedTargetDeploymentContract: [target-deployment-contract-v1.md](target-deployment-contract-v1.md)

## Decision Boundary

This document defines the local pilot secret-management contract. It proves that provider credentials are injected through environment variables or an approved deployment secret manager, secret values are never written to tracked release artifacts, and sharing is blocked when artifact hygiene finds credential-like material.

It is not target secret manager evidence, not production credential rotation proof, not cloud KMS evidence, not break-glass access governance, and not permission to claim `production-ready`.

Production-ready remains blocked until the approved target environment proves secret manager injection, access policy, rotation cadence, audit trail, break-glass process, revocation, and zero secret leakage in production logs and artifacts.

## Secret Classes

| Class | Examples | Allowed Handling | Forbidden Handling |
| --- | --- | --- | --- |
| Provider API key | OpenAI, Anthropic, local gateway, Hermes gateway keys | inject through approved shell or deployment secret manager | commit, paste into docs, mission attachments, screenshots, or release artifacts |
| Web auth token | local shared-secret API token | inject through local environment for controlled pilot only | treat as enterprise identity or store in handoff artifacts |
| OIDC/JWKS material | issuer, audience, JWKS URL, token role or tenant claims | store non-secret configuration values in deployment docs | store bearer JWT values or private signing keys in release artifacts |
| Runtime export material | local export manifests, evidence snapshots, browser artifacts | scan before sharing and keep repository-relative paths only | include raw secret-bearing runtime state or machine-local paths |
| Emergency access material | break-glass credential or recovery token | document owner and rotation requirement only | include usable secret values in tracked files |

## Injection Rules

- provider credentials must be injected through environment variables or a deployment secret manager
- real credential values must not be committed, logged, copied into docs, pasted into mission attachments, or included in release artifacts
- examples must use placeholder values such as `"..."` only
- live validation commands may name environment variables but must not print values
- target production claims require target secret manager evidence, not only local environment variable usage

## Redaction And Hygiene Rules

- run `npm run smoke:release-artifact-hygiene` before sharing any pilot package
- artifact hygiene must report `secretFindingCount: 0` and `machinePathFindingCount: 0`
- if a credential-like pattern appears in release artifacts, stop sharing, rotate the potentially exposed credential, scrub the artifact, regenerate evidence, and rerun hygiene
- support and incident updates must describe secret presence by class and environment variable name only
- browser, visual, and snapshot evidence must keep absolute machine paths and bearer-token-like strings out of shareable artifacts

## Rotation And Revocation Checklist

- identify affected secret class, provider, environment, and owner
- revoke or rotate the secret in the provider console or approved secret manager
- remove secret-bearing logs, attachments, or artifacts from the shareable package
- regenerate execution evidence, closeout, handoff, snapshot, and pilot export package when the release artifact boundary changed
- rerun artifact hygiene and production readiness gate
- record accepted risk, owner, and next review date if rotation cannot be completed immediately

## Required Commands

```bash
npm run smoke:secret-management
npm run smoke:release-artifact-hygiene
npm run smoke:production-readiness-gate
```

## Acceptance Rule

This gate is acceptable only when secret classes, injection rules, redaction and hygiene rules, rotation and revocation checklist, required commands, and production gap are present and the document keeps `productionReadyClaim: false`.

## Production Gap

This is local pilot secret-management evidence. It does not prove target secret manager configuration, production credential access policy, automatic rotation, production audit logs, break-glass approval workflow, or revocation evidence from a hosted environment.

Secret management remains blocked for production-ready claims until the approved target deployment provides secret manager evidence and release artifacts continue to pass hygiene with zero credential findings.
