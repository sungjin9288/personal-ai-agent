# Reference Repositories

## Working Rule

These repositories are design input. Patterns are borrowed deliberately and documented here before implementation. Code is not vendored by default.

## References

### fireauto
- source: https://github.com/imgompanda/fireauto
- borrowed: commandized workflow boundaries and explicit role naming
- rejected for now: repo-specific command sprawl before the core runtime stabilizes

### awesome-design-md
- source: https://github.com/VoltAgent/awesome-design-md
- borrowed: explicit design intent documents as agent context
- rejected for now: design-doc specialization before the core session and approval loop is mature

### claw-code
- source: https://github.com/ultraworkers/claw-code
- borrowed: runtime/provider separation mindset
- rejected for now: low-level harness rewrite and broader platform scope

### oh-my-codex
- source: https://github.com/Yeachan-Heo/oh-my-codex
- borrowed: thin orchestration layer over an existing agent workflow
- rejected for now: codex-specific assumptions as the only runtime model

### OpenSpace
- source: https://github.com/HKUDS/OpenSpace
- borrowed: skill quality and iterative improvement as a future direction
- rejected for now: automatic skill evolution before the managed path is stable

### everything-claude-code
- source: https://github.com/affaan-m/everything-claude-code
- borrowed: `agents / skills / hooks / rules` separation
- rejected for now: provider-specific conventions as hard requirements

### mrstack
- source: https://github.com/whynowlab/mrstack
- borrowed: persistent memory and always-on assistant mindset
- rejected for now: messaging channel integrations in v1

### claw-empire
- source: https://github.com/GreenSheep01201/claw-empire
- borrowed: stronger multi-agent operating model as a later-phase target
- rejected for now: full orchestration dashboard and company-simulation abstractions

### multi-agent-workflow
- source: https://github.com/junsungkim-lab/multi-agent-workflow
- borrowed: deterministic role sequencing and reviewer/checker framing
- rejected for now: deeper debate trees before the managed runtime is proven

### OpenHarness
- source: https://github.com/HKUDS/OpenHarness
- borrowed: explicit harness boundary, governance hooks, session-first orchestration
- rejected for now: Python-first rewrite and direct code vendoring

## Current Borrowed Set

- managed multi-agent role order
- provider abstraction boundary
- harness-level approval and memory hooks
- repo-native strategy and incident documentation
