# Personal AI Agent

CLI-first local-first personal AI agent for two classes of work:

- `engineering`: implementation planning, verification planning, repo-oriented execution proposals
- `knowledge`: PRDs, decision memos, research briefs, execution plans, and checklists

## v1 Direction

This repo is building a managed multi-agent runtime first:

`manager -> planner -> executor -> reviewer`

The runtime stays intentionally narrow in v1:

- Node.js ESM
- CLI-first
- OpenAI as the operational default when `OPENAI_API_KEY` is configured; stub remains the offline fallback and bootstrap default
- Anthropic remains available as an explicit comparison or fallback provider behind provider-specific configuration
- optional manager-controlled parallel specialist fan-out across `research`, `implementation`, and `verification`
- explicit approval gates before risky actions
- runtime state under `var/`
- repo-tracked strategy and incident docs under `docs/`

## Reference Direction

Reference repos are design input, not vendored implementation:

- `fireauto`: commandized workflow boundaries
- `oh-my-codex`: thin workflow layer over an existing coding agent
- `everything-claude-code`: `agents / skills / hooks / rules` separation
- `mrstack`: persistent memory mindset
- `multi-agent-workflow`: deterministic role sequencing
- `OpenHarness`: harness boundary, governance hooks, session-first orchestration

See [docs/reference-repos.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/reference-repos.md) for the borrowed and rejected patterns.

## Current Commands

Local bootstrap for first test run:

```bash
npm run bootstrap:local
```

로컬 운영 콘솔 실행:

```bash
npm run ui
```

기본 주소는 `http://127.0.0.1:4317`이며, 콘솔은 `한 화면` 안에서 `미션 정하기 → 실행하기 → 검토하기 → 결과 보기` 순서로 따라가는 한국어 operator flow로 동작합니다.

- 좌측 rail에서 workspace 선택과 mission queue 탐색
- 상단 운영 헤더에서 현재 mission, 현재 단계, 지금 해야 할 일, 막힌 이유를 한 번에 확인
- 상단 진행 흐름 strip에서 `완료 / 현재 / 다음 단계`를 같은 문맥 안에서 읽고 바로 이동
- 좌측 mission queue는 `표시 중 / 검토 필요 / 완료` 요약과 `다음 액션` 중심 행 디자인으로 빠르게 스캔
- 좌측 mission queue는 밝은 카드 더미 대신 dark inbox 밀도로 정리되어, 어떤 mission을 먼저 열어야 하는지 한눈에 판단
- 각 mission row는 단계, 목표 요약, 다음 액션, 최신 provider를 한 줄 흐름으로 압축해 PM/운영자도 우선순위를 빠르게 고를 수 있게 정리
- 선택한 mission은 메인 작업면 상단 `선택한 미션` bridge strip으로 다시 보여 주어, 왼쪽 queue 선택과 중앙 현재 단계 작업판이 같은 기준으로 연결됨을 바로 이해할 수 있게 구성
- `선택한 미션` bridge strip에는 `현재 보기 / 세션 포커스 / 결과물 포커스` breadcrumb를 함께 노출해, URL에 실린 현재 탐색 상태를 화면에서도 바로 읽을 수 있음
- 활성 mission row에는 `현재 작업 중`과 현재 열린 단계가 같이 보이도록 정리해, queue 포커스와 workspace 포커스가 분리돼 보이지 않도록 보정
- 좌측 rail 폭과 mission row 패딩을 더 줄여, queue는 덜 무겁게 보이고 메인 작업면은 더 넓고 선명하게 읽히도록 조정
- 상단 command header는 핵심 3개 메트릭과 짧은 상태 신호만 남겨, 첫 화면에서 현재 단계와 다음 행동이 바로 읽히도록 압축
- `지금 할 일` 패널과 진행 흐름 strip은 하나의 상단 control surface처럼 이어져, 현재 단계 판단과 다음 이동을 같은 문맥에서 처리
- 현재 선택한 `workspace / mission / 단계 / 세부 탭 / session / artifact`는 URL query로 같이 동기화되며, 직접 클릭해 바꾼 상태는 browser history에도 쌓여 새로고침, 링크 공유, 뒤로가기/앞으로가기까지 같은 작업면 기준으로 복원 가능
- 상단 `지금 해야 할 일` 패널에는 `현재 링크 복사`와 `보기 초기화` 액션이 있어, operator가 현재 작업면을 바로 공유하거나 추천 단계 기준 기본 보기로 빠르게 되돌릴 수 있음
- `미션 정하기` 단계에서 playbook 선택, 템플릿 선택, mission 작성
- `실행하기` 단계에서 provider 지정 실행과 manager → planner → executor → reviewer 흐름 확인
- `결과 보기` 단계는 대표 결과물, 검토 상태, 마무리 체크리스트를 먼저 보여주고, 아래 `결과와 기록` workbench에서 본문과 실행 타임라인을 함께 확인
- `검토하기` 단계에서 review readiness, action queue, approval inbox를 묶어서 처리
- `결과 보기` 단계에서 최종 결과 요약을 먼저 보고, 아래 `결과와 기록` 작업 영역에서 현재 세부 보기 맥락과 함께 결과물·실행 기록·검토 이력·입력값과 설정을 분리해서 확인
- `결과와 기록`에 `하네스` 탭을 추가해 문서 source-of-record, 미션/워크스페이스 메모리, 유지보수·검토·provider 상태를 한 번에 확인
- `결과와 기록`의 `v1 마감 상태` 탭에서 deterministic smoke 4종, browser interaction readiness, live validation 상태, execution closeout checklist, evidence 문서를 같은 화면에서 확인하고 새로고침할 수 있음
- `v1 마감 상태` 탭은 provider별 `env 준비 여부 / 실행 명령 / live validation 실행 버튼`을 함께 보여 주므로, 남은 closeout gap이 코드 문제인지 credential 미주입인지 화면에서 바로 구분 가능
- `미션 정하기` 단계와 상단 `지금 해야 할 일`에도 하네스 권장 조치를 끌어올려, review/action/maintenance 압력이 있으면 바로 관련 단계나 탭으로 이동
- `하네스 > 메모리 레이어`에서 fact / decision / preference 메모를 바로 추가할 수 있어, 미션 실행 문맥을 UI에서 직접 누적
- `하네스 > 메모리 레이어`는 미션 메모뿐 아니라 워크스페이스 메모도 같은 화면에서 저장할 수 있어, 장기 운영 규칙과 현재 실행 문맥을 분리해 누적
- `하네스 > 메모리 레이어`에서 저장된 미션/워크스페이스 메모를 `불러오기 → 수정 저장 / 삭제`까지 처리할 수 있어, add-only가 아니라 실제 운영용 memory curation surface로 사용할 수 있음
- `하네스 > 메모리 레이어`는 전체 미션/워크스페이스 메모를 `내용 검색 + 범위 필터 + kind 필터`로 바로 좁혀 볼 수 있어, recent entry 몇 개를 넘어서 누적된 layered memory를 같은 화면에서 큐레이션 가능
- `하네스 > 메모리 레이어`와 `하네스 > 소스 오브 레코드`는 각각 `정렬 + 페이지 탐색`을 지원하므로, 누적된 메모/문서가 길어져도 전용 browse API 기준으로 이전/다음 페이지를 넘기며 안정적으로 스캔 가능
- 하네스 browse API는 `currentPage / totalPages / hasPrev / hasNext / pageStart / pageEnd`를 함께 내려주므로, 프론트는 offset 계산 없이 현재 범위와 페이지 이동 가능 여부를 그대로 렌더링
- 하네스에서 메모/문서를 추가·수정·삭제한 뒤에도 현재 검색/필터/페이지 상태를 유지한 채 재조회하며, 문서·메모리 탐색 모두 `페이지 크기 변경`과 `필터 초기화`를 같은 패널에서 바로 처리할 수 있음
- 하네스 탐색 패널은 현재 `검색 / 유형·범위 / 정렬 / 페이지 크기`를 chip으로 바로 노출하고, 이전·다음 버튼도 현재 페이지 크기에 맞춰 표기하므로 operator가 지금 어떤 조건으로 기록을 보고 있는지 즉시 파악 가능
- 하네스 문서/메모리 탐색은 전용 browse API로 분리되어, `showMission` payload는 recent summary만 유지하고 실제 검색·정렬·더 보기는 server-side filtered result로 처리
- `npm run smoke:ui-harness-browse`는 임시 root에 seed data를 만든 뒤 served UI asset과 하네스 browse API의 검색, 필터, 페이지 이동, reset contract를 함께 검증하는 UI contract smoke 경로
- 수동 Playwright CLI 확인에서 생기는 `.playwright-cli/` 세션 아티팩트는 `.gitignore`로 제외되어, 브라우저 확인 뒤에도 워크트리가 불필요하게 dirty 상태로 남지 않음
- `하네스 > 소스 오브 레코드`에서 핵심 내용을 Markdown 본문으로 바로 기록해 `reference/devlog/incident` 문서에 남길 수 있어, 문서 intake를 콘솔 안에서 시작 가능
- `하네스 > 소스 오브 레코드`는 Markdown/txt/json 파일을 브라우저에서 바로 읽어 제목과 본문에 채워 넣을 수 있어, 외부 작업 메모를 dependency 없이 Markdown source-of-record로 흡수 가능
- `하네스 > 소스 오브 레코드`에서 저장된 tracked Markdown entry를 `불러오기 → 수정 저장 / 삭제`까지 처리할 수 있어, source log도 add-only가 아니라 실제 운영용 기록면으로 다룰 수 있음
- `하네스 > 소스 오브 레코드`는 예전 append-only `devlog` 섹션을 `기존 개발 로그 전환` 한 번으로 tracked entry로 감싸므로, 과거 로그도 같은 화면에서 수정/삭제 가능한 기록으로 정리할 수 있음
- `하네스 > 소스 오브 레코드`는 tracked 문서 기록 전체를 `제목 / 본문 / 경로` 검색과 `reference/devlog/incident` 필터로 바로 좁혀 볼 수 있어, 누적된 기록이 많아져도 최근 6건만 보는 대신 전체 source log를 같은 화면에서 탐색할 수 있음
- `결과와 기록` 상단에는 현재 detail mode, 최근 세션, 결과물 수, 검토 상태를 먼저 보여 주는 context strip을 배치
- `하네스` 탭은 MarkItDown식 Markdown source-of-record 원칙, MemPalace식 layered memory recall, Hermes/OpenAI식 session-first 운영 루프를 현재 런타임 데이터 위에서 읽기 좋은 형태로 묶어 줌
- 세션 목록과 provider 상태는 항상 열어 두는 inspector 대신, 하단 세부 탭 안에서 필요할 때만 확인
- `결과와 기록` workbench는 결과 본문이 더 넓고 또렷하게 읽히도록 비율과 타이포를 조정했고, 실행/승인/산출물 목록은 더 얇은 검사 패널처럼 분리
- `검토하기` 단계와 검토 탭은 `승인 대기 → 후속 작업 → 준비 상태` 순서로 재배치해, 사람이 먼저 결정해야 하는 항목이 가장 먼저 보이도록 정리

현재 playbook presets는 공개 agent repo 운영 패턴을 참고해 구성되어 있습니다.

- `Team Pipeline`: staged multi-agent handoff
- `Research First`: evidence before build
- `Review Stack`: product / design / engineering readiness
- `Verify Before Close`: verification evidence and completion gates

환경 변수로 호스트와 포트를 바꿀 수 있습니다.

```bash
PERSONAL_AI_AGENT_UI_HOST=127.0.0.1 PERSONAL_AI_AGENT_UI_PORT=4400 npm run ui
```

`bootstrap:local` registers the current repo as a workspace, creates a starter mission, runs it with the `stub` provider, and prints the workspace/mission/run payload so you can inspect the full flow without external API keys. Use `node scripts/bootstrap-local.mjs --workspace /path --name my-repo --run --provider stub` for custom paths or providers.

Register a workspace:

```bash
node src/cli.mjs workspace add /absolute/path/to/repo --name my-repo
```

Show or list workspaces:

```bash
node src/cli.mjs overview global
node src/cli.mjs overview providers
node src/cli.mjs overview operator-timeline
node src/cli.mjs overview operator-timeline --provider-since 2026-04-02T00:00:00.000Z
node src/cli.mjs provider list
node src/cli.mjs provider check openai
node src/cli.mjs provider activity
node src/cli.mjs provider activity-timeline --provider stub
node src/cli.mjs provider events --provider local
node src/cli.mjs provider probe openai
node src/cli.mjs provider history
node src/cli.mjs provider timeline
node src/cli.mjs workspace list
node src/cli.mjs workspace show workspace_xxx
node src/cli.mjs workspace overview workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx
node src/cli.mjs workspace timeline workspace_xxx --provider-since 2026-04-02T00:00:00.000Z
```

`workspace overview`와 `overview global`은 mission/session/approval 집계뿐 아니라 open escalation pressure, escalation tier 분포, breach count total, reminder count total, needs-reminder count, owner transition total, pending owner handoff overdue count, pending owner handoff reminder count, next pending owner handoff due/reminder timestamp, 그리고 maintenance가 실제로 영향을 준 mission breadth까지 함께 보여줍니다. `overview global`은 여기에 provider health summary와 nested `providerOverview`도 포함해서 configured/ready provider 수, latest probe success or failure, unprobed provider 수, pending provider attention overdue count, pending provider attention needs-reminder count, next provider attention due/reminder timestamp, latest provider attention reminder를 top-level control-plane에서 바로 확인할 수 있습니다. `overview operator-timeline --provider-since ...`는 이 operator chronology 위에 같은 recent provider window contract를 덧붙여, 최근 provider execution or attention trend를 operator event stream과 같은 응답에서 같이 읽을 수 있게 합니다. `workspace timeline --provider-since ...`도 같은 recent provider window contract를 받아서, workspace chronology와 recent workspace-bound provider execution or attention trend를 한 surface에서 같이 읽을 수 있습니다. `workspace overview`는 workspace-scope run뿐 아니라 global sweep나 mission-scope sweep가 이 workspace mission에 남긴 maintenance impact도 함께 집계하고, 이 workspace에서 실제로 발생한 provider execution 실패와 provider attention pending/reminder 상태도 별도 summary field로 노출합니다.

Create missions:

```bash
node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --deliverable prd \
  --title "Draft agent roadmap" \
  --objective "Draft the next milestone PRD"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Stabilize release smoke" \
  --objective "Produce a bounded implementation proposal" \
  --constraints "Keep blast radius small|Preserve release evidence flow"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode engineering \
  --title "Parallel specialist dry run" \
  --objective "Validate manager-controlled specialist fan-out and merge" \
  --constraints "parallel-specialists:research,implementation,verification|Keep blast radius small"

node src/cli.mjs mission create \
  --workspace workspace_xxx \
  --mode knowledge \
  --title "Profile-driven specialist dry run" \
  --objective "Validate orchestration profile preset selection" \
  --constraints "orchestration-profile:knowledge-triad|Keep blast radius small"
```

Run and inspect missions:

```bash
node src/cli.mjs mission list
node src/cli.mjs mission run mission_xxx
node src/cli.mjs mission run mission_xxx --provider stub
OPENAI_API_KEY=... node src/cli.mjs mission run mission_xxx --provider openai
ANTHROPIC_API_KEY=... node src/cli.mjs mission run mission_xxx --provider anthropic
LOCAL_PROVIDER_MODEL=llama3.1 LOCAL_PROVIDER_BASE_URL=http://127.0.0.1:11434/v1 node src/cli.mjs mission run mission_xxx --provider local
node src/cli.mjs mission execution preflight mission_xxx
node src/cli.mjs mission execution preflight mission_xxx --request-approval
node src/cli.mjs mission execution start mission_xxx
node src/cli.mjs mission execution status mission_xxx
node src/cli.mjs mission execution logs mission_xxx
node src/cli.mjs mission execution stop mission_xxx
node src/cli.mjs mission show mission_xxx
node src/cli.mjs mission timeline mission_xxx
node src/cli.mjs session list mission_xxx
node src/cli.mjs session show mission_xxx
node src/cli.mjs session show mission_xxx --session session_xxx
node src/cli.mjs overview profiles --used-only
node src/cli.mjs overview profiles --workspace workspace_xxx --used-only
node src/cli.mjs overview profiles --drift-only --status follow-up-required
node src/cli.mjs overview profiles --reason-code quality-gate-blocked
node src/cli.mjs overview profiles --usage-trend growing --used-only
node src/cli.mjs overview profiles --workspace-usage-trend declining --used-only
node src/cli.mjs overview profiles --adoption-drift-status growing --used-only
node src/cli.mjs overview profiles --workspace-adoption-drift-status growing --used-only
node src/cli.mjs overview profiles --workspace-adoption-drift-reason-code workspace-profile-footprint-declining --used-only
node src/cli.mjs overview profiles --workspace-drift-only
node src/cli.mjs overview profiles --workspace-reason-code specialist-follow-up-open
node src/cli.mjs overview profiles --workspace-status follow-up-required --used-only
node src/cli.mjs overview maintenance
node src/cli.mjs overview maintenance --outcome effective
node src/cli.mjs overview maintenance --since 2026-04-01T00:00:00.000Z
```

`mission run mission_xxx` without `--provider` now resolves to `openai` when `OPENAI_API_KEY` is present. If OpenAI is not configured, it falls back to `stub` so local smoke runs and bootstrap still work without external credentials. Use `--provider anthropic` for side-by-side comparison or fallback experiments rather than the default execution path.

운영 콘솔에서도 같은 정책이 적용됩니다. UI에서 provider를 비워 두고 실행하면 현재 런타임 기본 provider 정책을 그대로 따릅니다.

`mission execution ...` 명령군은 execution-capable `engineering` mission 전용입니다.

- `preflight`: 실행 가능 여부, policy verdict, blocked reason, current or latest lease 확인
- `preflight --request-approval`: 1회 실행용 `execution_lease` approval 생성
- `start`: active lease가 있을 때 foreground execution session 시작
- `status`: latest execution session, verification, changed files, lease 상태 확인
- `logs`: 저장된 execution log line 확인
- `stop`: 현재 foreground execution session 중단 요청

v1 기본값은 현재 리포 [personal-ai-agent](/Users/sungjin/dev/personal/personal-ai-agent)만 execution-capable로 취급하는 것입니다. 다른 workspace는 proposal-only로 남고, `preflight`에서 `실행 미지원`으로 명확히 드러납니다.

`overview profiles`는 preset catalog와 health drift뿐 아니라 top-level summary에 workspace별 preset footprint와 monthly usage trend도 함께 올립니다. 그래서 `workspaceProfileCounts`, `workspaceMissionCounts`, `usedWorkspaceCount`, `latestUsedWorkspace`만으로 어떤 workspace가 어떤 orchestration profile을 실제로 많이 쓰는지 바로 읽을 수 있고, `workspaceHealthDriftProfileCounts`, `workspaceHealthDriftStatusCounts`, `latestHealthDriftWorkspace`로 unstable preset pressure가 어느 workspace에서 올라오는지도 바로 확인할 수 있습니다. root-level `workspaceHealthDrift`는 workspace layer 전체의 current status를 quick field로 보여주고, `workspaceProfileCounts`, `workspaceStatusCounts`, `latestFollowUpRequiredWorkspace`, `latestWatchWorkspace`도 함께 반환하므로 unstable preset pressure가 어느 workspace에서 몇 개 profile로 쌓였는지뿐 아니라 가장 최근 follow-up-required workspace와 watch workspace도 root field만으로 바로 식별할 수 있습니다. root-level `workspaceUsageTrend`는 catalog 전체 workspace footprint가 month-over-month로 growing인지 declining인지 빠르게 읽게 해 주고, 이 `workspaceUsageTrend`도 `workspaceCount`, `workspaceProfileCounts`, `workspaceStatusCounts`, `workspaceIdsByStatus`, `latestWorkspaceId`, `latestWorkspaceName`, `latestWorkspaceProfileId`, `latestWorkspaceStatus`, `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로, profile-level workspace trend가 어느 workspace에 분포하는지와 최근 어떤 workspace가 growth or decline를 만들었는지도 root quick field만으로 바로 확인할 수 있습니다. 여기에 root-level `workspaceAdoptionDrift`도 추가되어 workspace 기준 mission volume 변화와 preset footprint 변화를 함께 해석한 combined adoption status를 quick field로 제공합니다. `workspaceAdoptionDrift`는 `statusCounts`, `reasonCodeCounts`, `missionTrendStatusCounts`, `profileFootprintTrendStatusCounts`, `workspaceIdsByStatus`, `latestWorkspace`를 같이 반환하므로, 어떤 workspace가 preset mission volume을 늘리고 있는지와 어떤 workspace가 footprint 자체를 확장 또는 축소하는지도 catalog root에서 바로 읽을 수 있습니다. 이번 단계부터 root quick field는 `latestGrowingProfile`, `latestDecliningProfile`, `latestGrowingWorkspace`, `latestDecliningWorkspace`도 같이 반환하므로, workspace adoption pressure를 만든 최신 preset과 최신 workspace를 방향별로 바로 식별할 수 있습니다. 각 profile item의 `workspaceUsageTrend`도 같은 방향으로 확장되어 `workspaceCount`, `workspaceStatusCounts`, `workspaceIdsByStatus`, `latestWorkspace`, `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로 한 preset 안에서 어느 workspace가 footprint growth를 만들었고 어느 workspace가 최근 decline를 만들었는지도 item payload에서 바로 읽을 수 있습니다. 각 profile item의 `workspaceAdoptionDrift`도 같이 반환하므로, 한 preset 안에서 workspace별 mission volume drift와 profile footprint drift를 combined signal로 바로 읽을 수 있고 `latestWorkspace`를 통해 가장 최근 adoption pressure를 만든 workspace도 확인할 수 있습니다. 이번 단계부터 item payload도 `latestGrowingWorkspace`, `latestDecliningWorkspace`를 같이 반환하므로 one preset 안에서 최근 growth를 만든 workspace와 decline를 만든 workspace를 root quick field와 같은 방식으로 바로 식별할 수 있습니다. 이제 `--workspace-adoption-drift-status`와 `--workspace-adoption-drift-reason-code`도 지원하므로, growing workspace adoption이나 declining workspace footprint를 만드는 preset만 catalog surface에서 직접 slice할 수 있습니다. summary 역시 `healthDriftStatus`, `healthDriftCounts`, `healthDriftReasonCodes`, `healthDriftReasonCodeCounts`, `healthDriftLatestProfile`, `workspaceHealthDriftStatus`, `workspaceHealthDriftCounts`, `workspaceHealthDriftReasonCodes`, `workspaceHealthDriftReasonCodeCounts`, `workspaceHealthDriftLatestWorkspace`, `workspaceHealthDriftLatestFollowUpRequiredWorkspace`, `workspaceHealthDriftLatestWatchWorkspace`, `workspaceHealthDriftWorkspaceCount`, `workspaceHealthDriftWorkspaceProfileCounts`, `workspaceHealthDriftWorkspaceStatusCounts`, `workspaceHealthDriftWorkspaceIdsByStatus`, `usageTrendStatus`, `usageTrendProfileCount`, `usageTrendStatusCounts`, `usageTrendLatestGrowingProfile`, `usageTrendLatestDecliningProfile`, `usageTrendLatestUnusedProfile`, `workspaceUsageTrendStatus`, `workspaceUsageTrendProfileCount`, `workspaceUsageTrendWorkspaceCount`, `workspaceUsageTrendProfileStatusCounts`, `workspaceUsageTrendWorkspaceProfileCounts`, `workspaceUsageTrendLatestGrowingProfile`, `workspaceUsageTrendLatestDecliningProfile`, `workspaceUsageTrendLatestUnusedProfile`, `workspaceUsageTrendLatestGrowingWorkspace`, `workspaceUsageTrendLatestDecliningWorkspace`, `workspaceUsageTrendLatestWorkspaceProfileId`, `workspaceUsageTrendLatestWorkspaceId`, `workspaceUsageTrendLatestWorkspaceName`, `workspaceUsageTrendLatestWorkspaceStatus`, `workspaceUsageTrendWorkspaceIdsByStatus`, `workspaceUsageTrendWorkspaceStatusCounts`, `workspaceUsageTrendProfileCounts`, `workspaceUsageTrendStatusCounts`뿐 아니라 `adoptionDriftStatus`, `adoptionDriftStatusCounts`, `adoptionDriftReasonCodes`, `adoptionDriftLatestProfile`, `adoptionDriftLatestGrowingProfile`, `adoptionDriftLatestDecliningProfile`, `adoptionDriftLatestUnusedProfile`, `workspaceAdoptionDriftProfileCounts`, `workspaceAdoptionDriftWorkspaceProfileCounts`, `workspaceAdoptionDriftStatusCounts`, `workspaceAdoptionDriftWorkspaceStatusCounts`, `workspaceAdoptionDriftCounts`, `workspaceAdoptionDriftStatus`, `workspaceAdoptionDriftReasonCodes`, `workspaceAdoptionDriftLatestGrowingProfile`, `workspaceAdoptionDriftLatestDecliningProfile`, `workspaceAdoptionDriftLatestGrowingWorkspace`, `workspaceAdoptionDriftLatestDecliningWorkspace`, `workspaceAdoptionDriftLatestWorkspace`, `workspaceAdoptionDriftMissionTrendStatusCounts`, `workspaceAdoptionDriftProfileFootprintTrendStatusCounts`, `workspaceAdoptionDriftWorkspaceIdsByStatus`, `workspaceAdoptionDriftReasonCodeCounts`, `workspaceAdoptionDriftWorkspaceCount`, `latestGrowingWorkspaceAdoptionProfile`, `latestDecliningWorkspaceAdoptionProfile`, `latestGrowingWorkspaceAdoptionWorkspace`, `latestDecliningWorkspaceAdoptionWorkspace`도 같이 반환해서 profile-level health pressure, mission volume trend, workspace footprint growth or decline, combined adoption pressure가 어느 축에서 생기는지와 최근 누가 그 신호를 만들었는지까지 post-processing 없이 읽게 합니다. root-level `usageTrend`는 catalog 전체 mission volume trend를 보여주고, `adoptionDrift`는 mission volume과 workspace footprint를 함께 해석한 combined adoption status를 quick field로 제공하며, `healthDrift`와 `workspaceHealthDrift`도 quality gate 또는 specialist follow-up pressure를 quick field로 제공합니다. 이번 단계부터 `healthDrift`는 `latestFollowUpRequiredProfile`, `latestWatchProfile`, `latestStableProfile`, summary는 `healthDriftLatestFollowUpRequiredProfile`, `healthDriftLatestWatchProfile`, `healthDriftLatestStableProfile`도 같이 반환하므로 follow-up-required preset, watch preset, stable preset의 최신 linkage도 generic latest profile과 분리해서 바로 읽을 수 있습니다. `workspaceHealthDrift`와 summary alias도 `latestStableWorkspace`와 `workspaceHealthDriftLatestStableWorkspace`를 같이 반환해 stable workspace까지 같은 direction-aware contract로 확인할 수 있습니다. 각 profile item도 `healthDrift`, `adoptionDrift`, `usageTrend`, `workspaceUsageTrend`를 같이 반환하므로 어떤 preset이 quality gate로 막혀 있는지, 실행량은 늘었지만 workspace footprint는 정체인지, 또는 둘 다 declining인지까지 profile catalog만으로 바로 확인할 수 있습니다. 이번 단계부터 item-level `healthDrift`도 `latestProfile`, `latestFollowUpRequiredProfile`, `latestWatchProfile`, `latestStableProfile`를 같이 반환하므로 root quick field와 item payload를 같은 direction-aware linkage shape로 소비할 수 있습니다. summary와 item이 모두 `usageMonthlyBuckets`, `usageMonthlyBucketCount`, `usageLatestMonthlyBucketStartDate`, `usageLatestMonthlyBucketDelta`, `usageTrend`, `workspaceUsageTrend`를 같이 반환하므로 어떤 preset이 최근 월간 사용량 기준으로 실제로 늘고 있는지뿐 아니라 workspace footprint 기준으로도 커지고 있는지 또는 줄고 있는지 profile catalog만으로 바로 확인할 수 있습니다. 이제 `--reason-code`, `--workspace-reason-code`, `--usage-trend`, `--workspace-usage-trend`, `--adoption-drift-status`, `--adoption-drift-reason-code`, `--workspace-adoption-drift-status`, `--workspace-adoption-drift-reason-code`, `--workspace-drift-only`, `--workspace-status`도 지원하므로 blocked quality gate, open specialist follow-up, adoption growth or decline를 같은 catalog surface에서 바로 slice할 수 있습니다.

이번 단계부터 item-level `workspaceHealthDrift`도 `workspaceProfileCounts`와 `workspaceStatusCounts`를 같이 반환하므로 per-profile workspace health pressure 분포를 root `workspaceHealthDrift`와 같은 field shape로 바로 읽을 수 있습니다. summary도 `workspaceUsageTrendCurrentMonthStartDate`, `workspaceUsageTrendCurrentMonthWorkspaceCount`, `workspaceUsageTrendPreviousMonthStartDate`, `workspaceUsageTrendPreviousMonthWorkspaceCount`, `workspaceUsageTrendWorkspaceCountDelta`를 직접 반환하므로 root quick field를 다시 열지 않아도 workspace footprint month-over-month comparison을 바로 읽을 수 있습니다. 같은 방식으로 `usageTrendCurrentMonthStartDate`, `usageTrendCurrentMonthMissionCount`, `usageTrendPreviousMonthStartDate`, `usageTrendPreviousMonthMissionCount`, `usageTrendMissionCountDelta`도 summary에 올라오므로 mission-volume month-over-month comparison 역시 root `usageTrend`를 다시 열지 않고 summary만으로 바로 읽을 수 있습니다. `adoptionDriftUsageTrendStatus`와 `adoptionDriftWorkspaceUsageTrendStatus`도 summary에 직접 올라오므로 combined adoption status가 mission-volume growth 때문인지 workspace footprint growth 때문인지도 root `adoptionDrift` quick field를 다시 열지 않고 바로 해석할 수 있습니다. 같은 symmetry로 `workspaceAdoptionDrift`도 이제 root quick field와 summary 모두 `missionTrendStatus`와 `profileFootprintTrendStatus`를 반환하므로 workspace-level combined adoption pressure가 어떤 축에서 올라오는지도 같은 field shape로 바로 읽을 수 있습니다. 이번 단계부터 `usageTrend`와 `workspaceUsageTrend`도 root quick field와 summary 모두 `latestProfile`, `latestWorkspace` generic linkage를 같이 반환하므로 direction-specific latest link와 별도로 해당 trend surface의 최신 preset과 최신 workspace를 빠르게 식별할 수 있습니다.

`mission timeline`은 session, approval, reviewer follow-up, memory뿐 아니라 mission-scoped escalation open/resolved/reminded event도 함께 보여주며, resolved follow-up은 `rerun-fixed`, `superseded`, `scope-reduced`, `accepted-risk` taxonomy를 detail에 포함합니다. `accepted-risk`는 close와 동시에 monitoring escalation을 열고, owner transition이 발생하면 해당 escalation은 `action inbox --class handoff-required`와 `action owner-handoffs`에서 acknowledgement queue로 다시 노출됩니다. owner handoff에는 별도 reminder trail도 붙으며, overdue acknowledgement나 re-notify 모두 timeline detail에 남습니다. mission-scoped maintenance sweep를 실행하면 mission summary와 mission timeline도 직접 maintenance evidence를 보여주고, workspace-wide maintenance sweep가 특정 mission pressure를 처리한 경우에도 mission timeline에는 related `maintenance-run` evidence가 연결됩니다. mission summary는 direct maintenance aggregate와 별도로 combined `maintenance impact` summary를 제공해, indirect workspace sweep가 이 mission에 준 reminder 효과도 한 번에 확인할 수 있습니다. mission summary는 여기에 mission-scoped provider execution and provider attention aggregate, specialist run and merge aggregate도 함께 노출해서, 해당 mission에서 어떤 provider run이 실패했고 provider attention이 pending, recovered, acknowledged, resolved, reminded 중 어디까지 진행됐는지, specialist branch가 completed, blocked, failed, abandoned 중 어디에 있는지도 바로 확인할 수 있습니다. specialist branch는 이제 typed `specialistHandoff`를 남기므로 manager merge와 specialist follow-up surface가 `currentState`, `deliverables`, `acceptanceCriteria`, `evidence`, `blockers`, `nextHandoff`를 같은 contract로 읽습니다. specialist runtime은 `orchestration-profile:<id>` constraint도 받아서 preset specialist set과 quality gate를 선택할 수 있고, mission/workspace/global/operator summary는 `specialistOrchestrationProfileId`, `specialistConfiguredKinds`, `specialistOrchestrationProfileCounts`, `specialistTouchedOrchestrationProfileIds`를 함께 반환하므로 profile-driven fan-out도 explicit specialist constraint와 같은 observability를 유지합니다. `overview profiles`는 여기에 preset catalog와 actual mission usage, latest selected mission, latest parallel group, open specialist follow-up pressure를 같은 payload로 묶어 주므로 어떤 orchestration profile이 실제 runtime에서 얼마나 쓰였고 어느 preset에 gate backlog가 남아 있는지도 별도 state reconstruction 없이 바로 읽을 수 있습니다. 이번 단계부터는 profile surface도 `specialistFollowUpRetryPolicyCounts`, `specialistFollowUpRemediationRouteCounts`, `specialistFollowUpLatestReminderAt`, `specialistFollowUpNextReminderAt`, `healthDrift`를 같이 반환하므로 triad preset이 실제로 fast verification remediation path를 얼마나 만들고 있는지와 어떤 preset이 현재 follow-up-required 상태인지도 preset 단위로 바로 읽을 수 있습니다. profile quality gate가 미충족이면 manager merge는 실제로 차단되고, mission summary에는 `specialistQualityGateStatus`, `specialistQualityGateViolationCount`, `specialistLatestQualityGateViolation`이 올라오며 mission/workspace/operator chronology에는 `specialist-quality-gate-blocked` event가 남습니다. 이 경우 `specialist-follow-up-required`는 failed or blocked branch뿐 아니라 gate-only violation도 `followUpSource=quality-gate`로 다시 열어 주므로, abandoned or missing verification signal 같은 profile policy gap도 same follow-up surface에서 복구할 수 있습니다. triad profile은 이제 `retryPolicy`를 실제 follow-up policy에 연결해서 verification gate backlog를 더 짧은 SLA와 reminder cadence로 올리고, specialist follow-up item의 기본 command hint도 direct `action remediate-specialist-follow-up` route로 바꿔서 operator가 generic mission rerun 대신 dedicated remediation path로 바로 진입하게 합니다. generic action summary도 `specialistFollowUpProviderCounts`, `specialistFollowUpKindCounts`, `specialistFollowUpStatusCounts`, `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistFollowUpReminderCountTotal`, `specialistFollowUpRetryPolicyCounts`, `specialistFollowUpRemediationRouteCounts`를 같이 반환하므로 mixed queue에서도 specialist pressure와 remediation route 분포를 별도 follow-up 화면 없이 읽을 수 있습니다. specialist follow-up reminder aggregate도 mission, workspace, global summary에 같이 올라오므로 `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistFollowUpReminderCountTotal`, `specialistLatestReminderAt`, `specialistNextReminderAt`만으로 reminder pressure의 현재 상태를 다시 계산하지 않고 바로 읽을 수 있습니다. specialist reminder record는 이제 same remediation route metadata와 fallback command를 같이 남기므로 fast-policy reminder인지와 later remediation path를 reminder trail만으로도 바로 확인할 수 있습니다. unified `action inbox`는 이제 monitoring escalation, owner handoff, provider attention reminder pressure를 공통 `--needs-reminder` slice로도 보여주고, blocked or failed specialist branch는 `specialist-follow-up-required` action으로 다시 노출합니다. `action log-overdue`도 같은 specialist aggregate를 response summary와 incident markdown에 포함하므로 queue에서 본 specialist reminder pressure를 incident trail에서 그대로 다시 확인할 수 있습니다. overdue incident markdown은 여기에 specialist follow-up retry policy aggregate, remediation route aggregate, per-item route urgency, fallback command까지 기록하므로 queue triage에서 본 recovery path가 incident trail에서도 유지됩니다. 같은 overdue incident payload는 `providerHealthDriftOverdueCount`, `providerHealthDriftProviderCounts`, `providerHealthDriftReasonCodeCounts`도 같이 노출하므로 provider drift pressure도 queue와 incident trail 사이에서 같은 summary contract를 유지합니다. specialist follow-up도 이제 dedicated reminder trail을 가지므로 `action specialist-follow-ups --needs-reminder`와 `action remind-specialist-follow-ups`가 same mission/workspace timeline에 `specialist-follow-up-reminded` evidence를 남깁니다. workspace/global operator timeline은 maintenance sweep 실행뿐 아니라 pressure를 실제로 처리한 `maintenance-required-acknowledged`, `maintenance-required-resolved` evidence, workspace-bound `provider-execution-failed` trigger, 이어지는 provider attention `opened/reminded/recovered/acknowledged/resolved` lifecycle, 그리고 specialist branch/merge chronology도 함께 보여줍니다. 이제 이 operator chronology summary도 `specialistFollowUpRequiredCount`, `specialistFollowUpNeedsReminderCount`, `specialistFollowUpOverdueCount`, `specialistLatestReminderAt`, `specialistNextReminderAt`를 직접 반환하므로 timeline payload만으로 current specialist reminder pressure를 읽을 수 있습니다.

이번 단계부터 root-level `workspaceAdoptionDrift`와 각 profile item은 generic `latestProfile`를 같이 반환하고, summary도 `workspaceAdoptionDriftLatestProfile` alias를 같이 노출합니다. 그래서 workspace adoption pressure를 만든 최신 preset을 direction-specific latest link를 다시 조합하지 않고 바로 읽을 수 있습니다.

Operator flow:

```bash
node src/cli.mjs action inbox
node src/cli.mjs action inbox --class retry-ready
node src/cli.mjs action inbox --class handoff-required
node src/cli.mjs action inbox --class maintenance-required
node src/cli.mjs action inbox --class monitoring-required
node src/cli.mjs action inbox --class specialist-follow-up-required
node src/cli.mjs action specialist-follow-ups
node src/cli.mjs action specialist-follow-ups --needs-reminder
node src/cli.mjs action specialist-follow-ups --status failed
node src/cli.mjs action remind-specialist-follow-ups --due --status failed --note "Re-check the failed specialist branch and resume if still relevant"
node src/cli.mjs action remediate-specialist-follow-up specialist-follow-up:parallel-group_xxx:implementation:agentrun_xxx
node src/cli.mjs action inbox --class monitoring-required --effective-owner human-approver
node src/cli.mjs action inbox --needs-reminder
node src/cli.mjs action provider-attention
node src/cli.mjs action provider-attention --needs-reminder
node src/cli.mjs action provider-attention --overdue
node src/cli.mjs action provider-attention --status acknowledged
node src/cli.mjs action provider-attention --status recovered
node src/cli.mjs action provider-attention --status resolved
node src/cli.mjs action inbox --priority high
node src/cli.mjs action inbox --owner human-approver
node src/cli.mjs action inbox --overdue
node src/cli.mjs action maintenance --workspace workspace_xxx --note "Sweep due reminders for escalations, owner handoffs, provider attention, and specialist follow-ups"
node src/cli.mjs action maintenance-history
node src/cli.mjs action maintenance-history --outcome no-op
node src/cli.mjs action maintenance-history --since 2026-04-01T00:00:00.000Z
node src/cli.mjs action reviewer-followups
node src/cli.mjs action reviewer-followups --status resolved
node src/cli.mjs action reviewer-followups --status resolved --kind scope-reduced
node src/cli.mjs action owner-handoffs
node src/cli.mjs action owner-handoffs --needs-reminder
node src/cli.mjs action owner-handoffs --overdue
node src/cli.mjs action owner-handoffs --status acknowledged
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind scope-reduced --note "Handled in a narrower follow-up plan"
node src/cli.mjs action resolve-reviewer-follow-up reviewer-follow-up:mission_xxx:session_xxx --kind accepted-risk --note "Accept risk until the next release window"
node src/cli.mjs action log-overdue
node src/cli.mjs action log-overdue --class specialist-follow-up-required
node src/cli.mjs action escalated
node src/cli.mjs action escalated --tier critical
node src/cli.mjs action escalated --needs-reminder
node src/cli.mjs action escalated --needs-reminder --effective-owner human-approver
node src/cli.mjs action sync-escalations
node src/cli.mjs action remind-escalations --due
node src/cli.mjs action remind-escalations --tier critical --overdue --note "Notify the workspace owner to re-check this pressure"
node src/cli.mjs action remind-owner-handoffs --due --note "Follow up with the human approver about the pending handoff"
node src/cli.mjs action remind-provider-attention --due --note "Re-check the pending provider failure and confirm remediation"
node src/cli.mjs action remediate-provider-attention provider-attention:stub:execution:agentrun_xxx
node src/cli.mjs action acknowledge-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe failure acknowledged"
node src/cli.mjs action resolve-provider-attention provider-attention:anthropic:probe:provider-probe_xxx --note "Anthropic probe recovered"
node src/cli.mjs action acknowledge-owner-handoff escalation_xxx --note "Human approver acknowledged the ownership handoff"
node src/cli.mjs action resolve-escalation escalation_xxx --note "Handled manually"
node src/cli.mjs approval inbox
node src/cli.mjs approval list
node src/cli.mjs approval resolve approval_xxx --decision approve --reason "Proceed with the proposed workspace change"
```

`action maintenance-history`와 `overview maintenance`는 이제 reminder total뿐 아니라 affected mission breadth, latest impact run, latest impact mission ids도 같이 보여줍니다. `--workspace`는 global sweep와 mission-scope run이 이 workspace mission에 남긴 impact까지 포함하고, `--mission`은 related workspace sweep를 history item으로 포함하면서도 mission-specific reminder effect는 별도 `missionImpact*` summary field로 같이 보여줍니다. 또 maintenance 전용 summary는 `effectiveRunCount`, `noOpRunCount`, `impactRunCount`, `latestEffectiveRun`, `latestNoOpRun`, `recentRuns`를 함께 반환해서 최근 sweep trend를 raw item 재해석 없이 바로 확인할 수 있고, `--outcome <effective|no-op|impactful>`로 원하는 run slice만 직접 조회할 수 있습니다. `--since <iso-timestamp>`를 함께 주면 최근 기간 run만 남겨서 time-window audit도 할 수 있습니다. 추가로 `dailyBuckets`는 filtered run set을 날짜별로 묶어 runCount, effective/no-op split, totalRemindedCount, affected mission breadth를 같이 보여주고, `latestBucketDelta`는 최신 날짜 bucket과 직전 bucket의 차이를 바로 요약합니다. maintenance summary는 여기에 `weeklyBuckets`, `latestWeeklyBucketDelta`, `monthlyBuckets`, `latestMonthlyBucketDelta`도 같이 반환하므로, 같은 filtered slice를 더 거친 주간 and 월간 trend로도 바로 읽을 수 있습니다. 이 daily, weekly, monthly bucket plus delta payload는 이제 specialist follow-up retry policy and remediation route aggregate도 같이 보존하므로, maintenance trend만 봐도 어떤 specialist recovery path가 누적되거나 사라졌는지 바로 읽을 수 있습니다. mission, workspace, global summary뿐 아니라 workspace timeline과 operator timeline summary, immediate `action maintenance` receipt, unified `action inbox` summary, 그리고 `action log-overdue` response summary까지 여기에 `maintenanceMonthlyBucketCount`, `maintenanceLatestMonthlyBucketStartDate`, `maintenanceOldestMonthlyBucketStartDate`, `maintenanceLatestMonthlyBucketDelta` quick field를 같이 노출하므로 `overview maintenance`를 따로 열지 않아도 current month maintenance drift를 control-plane과 incident triage 경로에서 바로 읽을 수 있습니다. provider attention reminder뿐 아니라 specialist follow-up reminder도 maintenance sweep 대상에 포함되므로, maintenance summary와 mission/workspace/global overview에는 `providerAttentionRemindedCount`와 `specialistFollowUpRemindedCount` 계열 집계가 같이 올라옵니다. maintenance execution summary와 persisted maintenance run은 이제 specialist follow-up retry policy and remediation route aggregate도 같이 남기므로, maintenance sweep 결과와 later maintenance history 양쪽에서 어떤 specialist recovery path를 다시 밀었는지 바로 읽을 수 있습니다. `action remind-specialist-follow-ups` summary도 이제 provider, specialist kind, retry policy, remediation route, status aggregate를 함께 반환하므로 reminder emission 결과만으로도 어떤 recovery path를 다시 밀어야 하는지 바로 읽을 수 있습니다.

Memory and documentation:

```bash
node src/cli.mjs memory add --scope user --kind preference --content "Prefer concise decision memos."
node src/cli.mjs memory list --scope user
node src/cli.mjs doc log --type devlog --title "Kickoff" --content "Started managed multi-agent implementation."
```

## Runtime Behavior

`mission run` in v1 performs a deterministic managed sequence:

1. `manager` builds session context and loads memory
2. `planner` produces a bounded plan and adapts it with prior mission memory when available
3. if the mission constraints include `parallel-specialists:<kinds>` or `orchestration-profile:<profileId>`, the manager opens up to three specialist child branches across `research`, `implementation`, and `verification`
4. unresolved specialist branches surface as `specialist-follow-up-required`, and profile quality gate violations can also open the same follow-up item even when the latest branch is only `abandoned` or missing
5. manager merge runs only after the active profile quality gate passes; when it does not, the mission stops at `specialist` with `specialist-quality-gate-blocked` evidence
6. `action remediate-specialist-follow-up <actionId>` reruns the same mission and provider, so only unresolved or quality-gate-required specialist branches resume inside the same `parallelGroupId` lineage
7. `executor` writes the merged draft artifact or the standard sequential artifact and carries forward prior mission signals
8. `reviewer` validates required sections and next action
9. if the result is risky, an `Approval` is created and the mission stops at `awaiting_approval`

Engineering mode intentionally stops at proposal quality. It does not mutate registered workspaces in v1.

## Provider Notes

- `provider list` shows implementation state, env readiness, required env, and default-provider status without executing a mission.
- `provider check <id>` shows one provider's effective local configuration with secret values reduced to presence booleans, plus the latest persisted probe and latest execution when available.
- provider probes and provider-backed mission stages now share one normalized failure envelope: `failureKind`, `recoverable`, `httpStatus`, `timedOut`, `attemptCount`, `providerResponseId`, `rawMessage`.
- provider adapters now use explicit timeout plus bounded retry. retry is limited to transport failures, timeout, `429`, and `5xx`; `4xx`, empty output, non-JSON output, and schema-invalid output are treated as deterministic no-retry failures.
- probe and execution telemetry now carries `durationMs`, and provider-backed executions also normalize `usageInputTokens`, `usageOutputTokens`, and `usageTotalTokens` so provider observability can distinguish failure shape from runtime cost signals.
- provider-backed execution telemetry now also supports optional pricing envs per adapter: `OPENAI_INPUT_COST_PER_1M_USD`, `OPENAI_OUTPUT_COST_PER_1M_USD`, `ANTHROPIC_INPUT_COST_PER_1M_USD`, `ANTHROPIC_OUTPUT_COST_PER_1M_USD`, `LOCAL_INPUT_COST_PER_1M_USD`, `LOCAL_OUTPUT_COST_PER_1M_USD`. when set, executions persist `estimatedCostUsd`, so `provider check`, provider activity or events, provider overview, and mission or workspace or global summaries can inspect approximate execution spend without re-reading raw usage data.
- execution cost summary now also exposes `estimatedCostUsdByProviderId` and `estimatedCostUsdByRole`, so aggregate spend can be attributed to one provider or one stage role without rebuilding the breakdown client-side.
- retry-aware provider telemetry now also persists `retryCount` plus per-attempt `attemptHistory`, so provider probe, provider activity, provider events, provider attention, and mission or workspace or global summaries can distinguish one-shot failures from success-after-retry and retry-exhausted failures.
- `provider activity` exposes provider-backed stage execution history derived from persisted `agentRuns`, with `--provider`, `--role`, `--status`, and `--since` filters.
- `provider activity` summary now also includes execution `dailyBuckets` plus `latestBucketDelta`, and these bucket aggregates follow the same filtered slice, so recent provider spend trend can be read for the whole history or just a recent window without rebuilding timeline data client-side.
- `provider activity-timeline` turns provider execution history into chronological success or failure events so model-backed mission execution can be inspected as a time axis.
- `provider events` merges persisted probe events, provider execution events, and provider attention opened, acknowledgement, recovery, resolution, reminder events into one chronological stream, with `--family <probe|execution|attention>`, probe- and execution-specific filters, and `--since` for recent-window provider chronology slices.
- `overview providers` now also accepts `--since` and returns a `recentWindow` summary so top-level provider health can show a recent probe or execution or attention slice without changing the existing full-history summary contract.
- `overview providers` summary now also promotes the recent monthly rollup linkage directly as `providerRecentExecutionMonthlyBucketCount`, `providerRecentExecutionLatestMonthlyBucketStartDate`, `providerRecentExecutionOldestMonthlyBucketStartDate`, and `providerRecentExecutionLatestMonthlyBucketDelta`, so the provider-only control-plane can read month-level trend without opening nested recentWindow buckets first.
- `overview providers` now also returns `healthDrift`, and `overview global` returns `providerHealthDrift`, combining current attention overdue or needs-reminder pressure with recent monthly execution drift so provider health movement can be read from one summary block.
- `mission show`, `mission timeline`, `workspace overview`, `workspace timeline`, and `overview operator-timeline` now also return `providerHealthDrift`, so provider drift can be read symmetrically from mission, workspace, operator, provider, and global surfaces.
- `action inbox` now also exposes `provider-health-drift-required`, a mission-owner follow-up action for `watch` drift that remains after provider attention has already been closed, so residual provider degradation can be triaged without reopening the provider-only overview surfaces.
- `action provider-health-drift` now exposes the same residual drift follow-up items as a dedicated query surface, so drift-only mission follow-up can be sliced by provider, workspace, mission, or overdue-only state without filtering the generic inbox manually.
- `action log-overdue` now also accepts `provider-health-drift-required`, so overdue residual drift follow-up can be promoted into the incident trail instead of staying only in queue state.
- `action inbox` and `action log-overdue` now also accept `--provider <stub|openai|anthropic|local>`, so provider-specific attention or drift work can be sliced directly from the generic control-plane surface.
- `action inbox` summary now also exposes `providerCounts`, so provider-scoped backlog can be read directly from the generic queue summary without dropping into provider-only surfaces.
- `action remediate-provider-attention <actionId>` now provides a local-first remediation path for current provider failures: probe attention reruns provider probe, and execution attention reruns the same mission with the same provider so recovery evidence can be produced from one operator command.
- `overview global` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so the top-level control-plane can show overall system state and recent provider health together.
- `overview operator-timeline` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so operator chronology and recent provider execution or attention trend can be inspected from one surface.
- `workspace overview` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so a workspace owner can inspect current workspace state and recent provider execution or attention activity together.
- `workspace timeline` now also accepts `--provider-since` and returns `providerRecentWindow` plus recent provider summary linkage, so workspace chronology and recent provider execution or attention trend can be inspected together.
- `mission show` and `mission timeline` now also accept `--provider-since` and return `providerRecentWindow` plus recent provider summary linkage, so mission-level provider execution and attention activity can be inspected without leaving the mission surface.
- every `providerRecentWindow` now also includes execution `dailyBuckets`, `executionBucketCount`, `executionLatestBucketDate`, `executionOldestBucketDate`, and `executionLatestBucketDelta`, so recent provider execution trend can be read without reopening provider activity history.
- `providerRecentWindow` now also includes execution `weeklyBuckets`, `executionWeeklyBucketCount`, `executionLatestWeeklyBucketStartDate`, `executionOldestWeeklyBucketStartDate`, and `executionLatestWeeklyBucketDelta` for coarse weekly trend checks on the same recent slice.
- `providerRecentWindow` now also includes execution `monthlyBuckets`, `executionMonthlyBucketCount`, `executionLatestMonthlyBucketStartDate`, `executionOldestMonthlyBucketStartDate`, and `executionLatestMonthlyBucketDelta` so the same recent slice can be read as a coarse monthly rollup without reopening full provider activity history.
- provider-aware mission or workspace or global or operator summaries now also promote the recent monthly rollup linkage directly as `providerRecentExecutionMonthlyBucketCount`, `providerRecentExecutionLatestMonthlyBucketStartDate`, `providerRecentExecutionOldestMonthlyBucketStartDate`, and `providerRecentExecutionLatestMonthlyBucketDelta`, so the latest month trend can be read without opening the nested recentWindow payload first.
- `overview providers` combines current provider readiness with persisted probe audit so configured, ready, unprobed, latest-success, latest-failure, and latest-skipped probe state can be read in one response.
- `overview providers` now also summarizes provider execution volume, execution and probe duration totals or averages, execution token usage totals, latest successful or failed execution, latest provider attention acknowledgement, latest provider attention recovery, latest provider attention resolution, latest provider attention reminder, pending attention overdue count, pending attention needs-reminder count, next attention due/reminder timestamp, and it exposes the latest unified provider event so probe health, operator acknowledgement, recovery evidence, explicit resolution, reminder pressure, and actual mission-path usage can be inspected together.
- `provider check <id>` now includes the current pending provider attention item when it exists, including `pendingAttentionDueAt`, `pendingAttentionIsOverdue`, `pendingAttentionSlaHours`, `pendingAttentionNeedsReminder`, `pendingAttentionNextReminderAt`, and `pendingAttentionReminderCount`.
- `action inbox --class provider-attention-required` now promotes the latest failed provider probe or failed provider execution into an operator action item. probe failure becomes a global attention item, and mission-scoped execution failure becomes a workspace-bound attention item.
- `action provider-attention` exposes the provider attention lifecycle directly and supports `--status <pending|acknowledged|recovered|resolved>`, `--needs-reminder`, and `--overdue` so provider failures can be audited and re-triaged after they leave the main action inbox.
- `action acknowledge-provider-attention <actionId>` records that a specific latest provider failure was acknowledged; the pending attention item stays cleared until a newer failed provider event arrives for that provider.
- `action resolve-provider-attention <actionId>` explicitly closes an acknowledged provider attention item and adds a `provider-attention-resolved` event to the unified provider event stream.
- a newer successful probe or successful mission execution by the same provider now promotes the previous latest failure into derived `recovered` attention state, so operator surfaces can distinguish silent recovery from manual acknowledgement or explicit resolution.
- `action remind-provider-attention` records reminder emission against currently pending provider attention items, and `action maintenance` now includes provider attention due reminders in the same local-first sweep as escalations and owner handoffs.
- `provider probe <id>` attempts a lightweight endpoint reachability check and model listing when the provider is configured; if required env is missing it returns a structured non-attempted result instead of throwing.
- `provider history` shows persisted probe runs and supports `--provider`, `--ok`, and `--attempted` filtering.
- `provider timeline` turns persisted probe runs into chronological events so recent success, failure, and skipped checks can be inspected as a time axis.
- `smoke:provider-retry-telemetry` locks successful retry, retry-exhausted execution failure, pending provider attention retry metadata, and mission or workspace or global retry-summary propagation in one deterministic local scenario.
- `stub` remains the deterministic default for local development and smoke coverage.
- `openai` now uses the OpenAI Responses API and reads:
  - `OPENAI_API_KEY` required
  - `OPENAI_MODEL` optional, default `gpt-5.2`
  - `OPENAI_BASE_URL` optional, default `https://api.openai.com/v1`
- if `OPENAI_API_KEY` is missing, `mission run --provider openai` returns a normalized failed mission result before any network call.
- `anthropic` now uses the Anthropic Messages API and reads:
  - `ANTHROPIC_API_KEY` required
  - `ANTHROPIC_MODEL` optional, default `claude-sonnet-4-6`
  - `ANTHROPIC_BASE_URL` optional, default `https://api.anthropic.com/v1`
  - `ANTHROPIC_VERSION` optional, default `2023-06-01`
  - `ANTHROPIC_MAX_TOKENS` optional, default `2048`
- if `ANTHROPIC_API_KEY` is missing, `mission run --provider anthropic` returns a normalized failed mission result before any network call.
- `local` targets an OpenAI-compatible local `/chat/completions` endpoint and reads:
  - `LOCAL_PROVIDER_MODEL` required
  - `LOCAL_PROVIDER_BASE_URL` optional, default `http://127.0.0.1:11434/v1`
  - `LOCAL_PROVIDER_API_KEY` optional
  - `LOCAL_PROVIDER_MAX_TOKENS` optional, default `2048`
- if `LOCAL_PROVIDER_MODEL` is missing, `mission run --provider local` returns a normalized failed mission result before any network call.

## State Layout

```text
docs/
  roadmap.md
  reference-repos.md
  devlog.md
  incidents.md
  adr/ADR-001-runtime-and-agent-shape.md

var/
  state.json
  missions/<mission-id>/
    sessions/<session-id>/
      manager-prompt.md
      manager-context.md
      planner-prompt.md
      planner-plan.md
      executor-prompt.md
      implementation-proposal.md
      prd.md
      decision-memo.md
      reviewer-prompt.md
      reviewer-report.md
      approval-resolution.md
```

## Verification

Run the local-first smoke suite:

```bash
npm run smoke
npm run smoke:execution-flow
npm run smoke:execution-cli
npm run smoke:ui-execution-console
npm run verify:execution-v1
npm run smoke:action-inbox
npm run smoke:escalated-inbox
npm run smoke:escalation-sync
npm run smoke:escalation-reminder-due
npm run smoke:escalation-reminders
npm run smoke:escalation-owner-chain
npm run smoke:escalation-owner-handoff
npm run smoke:escalation-owner-handoff-reminders
npm run smoke:escalation-owner-history
npm run smoke:action-overdue-log
npm run smoke:operator-timeline
npm run smoke:reviewer-follow-up-lifecycle
npm run smoke:reviewer-follow-up-accepted-risk
npm run smoke:approval-approve
npm run smoke:approval-inbox
npm run smoke:reviewer-fail
npm run smoke:approval
npm run smoke:approval-reject
npm run smoke:memory-rerun
npm run smoke:session-history
npm run smoke:mission-timeline
npm run smoke:workspace-overview
npm run smoke:global-overview
npm run smoke:provider-surface
npm run smoke:provider-overview
npm run smoke:provider-activity
npm run smoke:provider-events
npm run smoke:provider-hardening
npm run smoke:provider-telemetry
npm run smoke:provider-action-inbox
npm run smoke:provider-attention-lifecycle
npm run smoke:provider-attention-recovery
npm run smoke:provider-attention-reminders
npm run smoke:provider-probe
npm run smoke:provider-history
npm run smoke:provider-timeline
npm run smoke:parallel-specialists
npm run smoke:openai-provider
npm run smoke:anthropic-provider
npm run smoke:local-provider
```

All current smokes are deterministic and require no external API key.

`npm run verify:execution-v1`는 실행형 에이전트 v1 마감용 검증 entrypoint입니다.

- 기본 실행:
  - `smoke:execution-flow`
  - `smoke:execution-cli`
  - `smoke:ui-execution-console`
- 선택적 live validation:
  - `npm run verify:execution-v1 -- --live-openai`
  - `npm run verify:execution-v1 -- --live-anthropic`
  - `npm run verify:execution-v1 -- --live-local`

live validation flag를 주면 해당 provider env가 있을 때만 실제 `engineering mission run → execution lease approval → foreground execution start → verification passed`까지 검증합니다. env가 없으면 그 provider는 `skipped`로 기록됩니다.
실행 자체가 실패하더라도 `npm run evidence:execution-v1 -- --live-openai`는 중간에서 종료하지 않고, 실패 원인을 evidence와 closeout에 그대로 기록합니다.

`npm run evidence:execution-v1`는 위 검증 결과를 [execution-v1-evidence.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-evidence.md)에 Markdown evidence로 저장합니다.

- 기본 실행: deterministic smoke 4개 실행 후 evidence 문서 갱신
- 선택적 live validation 포함:
  - `npm run evidence:execution-v1 -- --live-openai`
  - `npm run evidence:execution-v1 -- --live-anthropic`
  - `npm run evidence:execution-v1 -- --live-local`

`npm run closeout:execution-v1`는 evidence를 다시 생성한 뒤 [execution-v1-closeout.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-closeout.md)에 v1 마감 체크리스트를 기록합니다. 이 문서는 deterministic smoke 4종, browser interaction readiness, live validation 상태를 한눈에 보여 주는 closeout surface입니다.

provider별 live validation을 한 번에 실행하려면 아래 helper를 사용하면 됩니다.

- `npm run preflight:execution-v1:openai`
- `npm run preflight:execution-v1:anthropic`
- `npm run preflight:execution-v1:local`
- `npm run live:execution-v1:openai`
- `npm run live:execution-v1:anthropic`
- `npm run live:execution-v1:local`

preflight helper는 해당 provider rerun 전에 필요한 deterministic smoke를 먼저 돌리고, env 준비 여부까지 JSON으로 요약합니다. 예를 들어 OpenAI preflight는 `smoke:openai-provider`와 `smoke:execution-flow`를 같이 확인한 뒤 `ready-for-live-validation` 또는 `ready-but-missing-env` 상태를 출력합니다.

필수 env가 없으면 helper는 실패 대신 `missing-env` JSON과 필요한 `export` 명령 형식을 먼저 출력합니다.
live validation 자체가 실패하면 helper는 `status=failed`와 함께 evidence path, closeout path, mission id, session id, temp root 경로를 출력하고 non-zero로 종료합니다.
실패 이유가 `provider live mission run failed | rootDir=... | missionId=...` 형식이면 helper와 evidence 문서가 같은 값을 구조화해서 `failure`, `rootDir`, `workspaceId`, `missionId`, `sessionId`, `artifact`, `reviewerSummary`로 다시 보여 줍니다. reviewer report와 implementation proposal이 temp root에 남아 있으면 helper는 `liveFailureTriage` 아래에 `reviewerReportPath`, `implementationProposalPath`, `failedChecks`, `findings`, `nextActionSnippet`까지 같이 출력합니다. rerun 뒤에는 터미널과 [execution-v1-evidence.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-evidence.md)만 보면 바로 triage에 들어갈 수 있습니다.
OpenAI helper는 live validation rerun에서 planner timeout 재발을 줄이기 위해 `OPENAI_RUN_TIMEOUT_MS=60000`을 기본 child env로 자동 주입합니다. 이미 값을 export한 경우에는 사용자가 지정한 값을 그대로 우선합니다.
운영 콘솔의 `v1 마감 상태` 탭은 evidence/closeout 문서가 현재 HEAD를 가리키는지도 같이 보여 줍니다. 현재 commit과 문서가 기록한 commit이 다르거나, 두 문서가 워크트리에서 수정된 상태면 `evidence 갱신 필요`로 표시되며 closeout ready 상태로 계산하지 않습니다.
`npm run live:execution-v1:openai` helper는 이제 live evidence를 한 번만 생성하고, closeout은 그 evidence 파일을 재사용합니다. 즉, 성공한 first live run 뒤에 closeout 단계가 second live run을 다시 실행해 결과를 덮어쓰지 않습니다.

OpenAI live validation은 planner/executor 단계가 provider 응답 시간에 더 민감하므로 기본 `runTimeoutMs`를 45초로 맞췄습니다. 더 긴 응답 시간을 허용해야 하면 아래 env override를 같은 터미널 세션에 추가해서 rerun하면 됩니다.

- `OPENAI_RUN_TIMEOUT_MS=60000 npm run live:execution-v1:openai`
- `OPENAI_PROBE_TIMEOUT_MS=12000 npm run smoke:openai-provider`

engineering deliverable은 reviewer rubric과 executor output contract를 같은 규칙으로 맞춥니다. provider가 `Next Action`에 approval gate를 직접 쓰지 않더라도, normalize 단계에서 `Request explicit approval before running shell commands or mutating files ...` 문구로 canonicalize한 뒤 reviewer가 같은 기준으로 평가합니다. 같은 경로에서 `Diagnosis`, `Implementation Plan`, `Verification Plan`, `Risk Notes` 중 빠진 섹션이 있거나 `Verification Plan`에 smoke/test 언급이 없으면 execution manifest와 mission context를 기준으로 canonical section을 채워 넣습니다.
provider가 execution manifest에 `inspect`/`artifact` step만 주더라도 normalize 단계에서 최소 `test` step(`node --check src/cli.mjs`)을 강제로 추가합니다. 이 bounded verification fallback 덕분에 live validation은 reviewer markdown뿐 아니라 실제 execution session의 `verification.status`도 deterministic하게 `passed/failed`로 귀결되고, `not-run` 상태로 빠지지 않습니다.
같은 fallback 경로에서 planner/proposal이 제안한 hinted command는 그대로 실행하지 않고, 현재 리포에서 실제로 실행 가능한 command만 채택합니다. 예를 들어 `npm run <script>`는 `package.json`에 script가 있어야 하고, `python -m module` 또는 `node file`도 해당 모듈/파일이 실제로 존재할 때만 manifest에 포함됩니다. 존재하지 않는 hinted command는 버리고 bounded verification step만 유지합니다.
provider-supplied execution manifest에도 같은 정리가 적용됩니다. `TBD_AFTER_INSPECTION`, `e.g. ...`, `or equivalent`, `<runner>`, `<live-validate-entrypoint>`, `<model>` 같은 placeholder command는 실행 대상에서 제거하고, `ls -ლა`처럼 비ASCII option token이 섞인 suspicious shell command도 drop합니다. edit step 역시 `scripts/foo.{ext}` 같은 placeholder filePath나 `PLACEHOLDER:` content면 실행 대상에서 제외합니다. 그 결과 verification step이 비면 기본 `node --check src/cli.mjs` smoke로 대체합니다. 즉, live provider가 미완성 계획 텍스트를 남겨도 foreground execution session이 그 문자열을 그대로 shell이나 file write로 실행하지 않습니다.

`결과와 기록 > v1 마감 상태`의 evidence 표시는 `stale`와 `로컬 갱신됨(local-current)`을 구분합니다. evidence/closeout 문서가 현재 HEAD 기준으로 다시 생성되었지만 아직 커밋되지 않은 경우에는 stale로 보지 않고, 로컬에서 최신 근거 문서가 준비된 상태로 표시합니다. 즉, OpenAI live rerun 직후 evidence markdown이 dirty여도 현재 commit과 일치하면 release surface는 “근거 문서는 최신, 아직 미커밋”으로 보여야 합니다.

성공한 local evidence를 실제 release artifact로 남기려면 `npm run snapshot:execution-v1`를 실행합니다. 이 스크립트는 현재 [execution-v1-evidence.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-evidence.md)와 [execution-v1-closeout.md](/Users/sungjin/dev/personal/personal-ai-agent/docs/execution-v1-closeout.md)를 읽어 `docs/releases/execution-v1/<verified-commit>/` 아래에 immutable snapshot을 만듭니다. current surface는 계속 dirty/local-current 상태로 유지하면서도, verified commit 기준 근거 문서는 별도 snapshot으로 커밋할 수 있습니다.

`결과와 기록 > v1 마감 상태`는 이제 이 snapshot도 함께 보여 줍니다. 즉, current evidence가 현재 HEAD와 어긋나 stale하더라도 마지막으로 고정된 verified snapshot의 commit, archivedAt, evidence/closeout 경로를 같은 화면에서 바로 확인할 수 있습니다. 또한 Anthropic/local live validation은 optional provider expansion으로 분리되어, OpenAI 기준 v1 closeout readiness를 가리는 필수 gap처럼 집계되지 않습니다.

current surface와 verified baseline도 분리해서 읽습니다. `summary.ready`는 현재 HEAD 기준 evidence/closeout가 fresh한지를 의미하고, `verified baseline`은 마지막 immutable snapshot 기준으로 필수 closeout이 이미 닫혔는지를 의미합니다. 그래서 current evidence가 stale하더라도 verified snapshot이 있으면 UI는 `baseline ready · current surface refresh needed`처럼 두 상태를 함께 보여 줍니다.

release snapshot도 이제 콘솔에서 직접 고정할 수 있습니다. `v1 마감 상태` 탭의 `release snapshot 고정` 버튼은 current surface evidence/closeout가 fresh하고 필수 closeout이 모두 닫힌 경우에만 활성화되며, stale current surface에서는 잘못된 artifact를 남기지 않도록 비활성화됩니다. 같은 경로를 계속 터미널에서 쓰고 싶다면 `npm run snapshot:execution-v1`를 그대로 실행해도 됩니다.

provider expansion도 콘솔에서 바로 preflight할 수 있습니다. `v1 마감 상태` 탭의 provider card는 이제 `preflight 실행` 버튼을 제공하고, deterministic smoke 결과를 provider별로 `ready-for-live-validation / ready-but-missing-env / blocked`로 다시 보여 줍니다. 즉, optional provider를 붙이기 전에 `env 부족`인지 `코드 readiness 부족`인지 탭 안에서 바로 분리할 수 있습니다.

release tab의 액션도 read-only와 mutating 동작을 분리했습니다. `상태 다시 읽기`는 `/api/execution-v1/status`만 다시 호출하는 read-only reload이고, evidence/closeout를 현재 HEAD 기준으로 다시 만드는 동작은 별도 `current surface 재생성` 버튼이나 provider별 live validation 경로로만 실행됩니다. 따라서 operator는 단순 상태 확인과 artifact regeneration을 같은 버튼으로 착각하지 않아도 됩니다.

release tab은 이제 `current surface 재생성`의 영향도 함께 보여 줍니다. 이 preview는 evidence/closeout rewrite 대상 경로, deterministic verification 재실행 여부, provider live validation 재실행 여부, snapshot 자동 갱신 여부를 같이 노출합니다. 즉, operator는 regenerate 버튼을 누르기 전에 어떤 artifact가 다시 계산되고 어떤 것은 그대로 유지되는지를 같은 화면에서 확인할 수 있습니다.

`current surface 재생성`은 이제 release tab 안에서 두 단계로 동작합니다. 첫 클릭은 confirm state만 활성화하고 영향 요약을 다시 강조하며, 두 번째 `재생성 확인` 클릭에서만 실제 rewrite가 실행됩니다. 즉, read-only reload와 mutating regeneration이 분리된 것에 더해, regeneration 자체도 한 번 더 의도적으로 확인해야 실행됩니다.
