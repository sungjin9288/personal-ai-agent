# Development Roadmap

## 1. 현재 상태 요약

- 현재 구현 완료: Node.js ESM CLI/web runtime, local JSON store, workspace/mission/session/artifact/approval model, provider registry/adapters, OpenAI-backed local-first pilot evidence, smoke scripts, GitHub Actions provider smoke
- 개발 중: target provider operations, release blocker closure, hosted identity/session architecture, hosted tenant isolation, target secret manager, target observability/SLO, clean deployment evidence
- 미구현: hosted production SaaS, full production multi-tenant isolation, production-ready all-provider deployment, public demo link
- 검증 필요: Anthropic billing/credit blocker closure, Hermes live validation, target local provider architecture proof, actual pilot feedback and metrics

## 2. Phase 1 - MVP 완성

- 목표: portfolio에서 설명 가능한 local-first AI agent MVP를 안정화한다.
- 현재 대표 demo: `Release Readiness Evidence Walkthrough`를 기본 portfolio/pilot walkthrough로 사용한다.
- 해야 할 작업:
  - 대표 demo scenario 1개를 선정하고 deterministic release evidence flow로 재현
  - README를 portfolio-friendly 구조로 재작성할 초안 반영
  - `npm run smoke`, provider smoke 중 핵심 3~5개를 최신 상태로 통과 확인
  - web console screenshot과 CLI output 예시 확보
- 완료 기준:
  - clean repo에서 실행 방법이 10분 내 재현 가능
  - 구현 완료/개발 중/미구현 상태가 README와 docs에서 일관됨
  - OpenAI-backed local-first pilot 외 claim이 과장되지 않음
- 산출물:
  - updated README
  - demo screenshot
  - smoke result summary
  - portfolio case study

## 3. Phase 2 - 기능 고도화

- 목표: provider reliability와 operator workflow를 더 명확히 검증한다.
- 해야 할 작업:
  - Anthropic account/billing blocker 해결 후 live validation 재실행
  - Hermes provider target evidence와 live validation proof 확보
  - provider fallback/attention remediation demo scenario 정리
  - memory/retrieval/fact graph 품질 확인용 fixture 추가
- 완료 기준:
  - provider별 status matrix가 코드, docs, smoke evidence와 일치
  - 실패/재시도/fallback을 면접에서 코드 수준으로 설명 가능
- 산출물:
  - provider readiness matrix
  - updated release readiness
  - provider failure recovery demo

## 4. Phase 3 - 서비스화 / 배포

- 목표: self-hosted pilot로 배포 가능한 수준의 operational package를 만든다.
- 해야 할 작업:
  - target secret injection, clean deployment, rollback/recovery 절차 검증
  - web auth/RBAC/OIDC/tenant mode 운영 가이드 정리
  - pilot export package와 deployment pilot docs를 실제 재현 흐름으로 다듬기
  - public 또는 private demo 환경 선택
- 완료 기준:
  - 배포/실행/검증/rollback 절차가 문서와 command로 재현됨
  - production-ready claim 없이 self-hosted pilot-ready claim만 사용
- 산출물:
  - self-hosted pilot package
  - deployment guide
  - operator runbook update
  - demo URL 또는 recorded walkthrough

## 5. Phase 4 - 포트폴리오 완성

- 목표: 이력서, GitHub README, case study, 면접 답변에서 일관되게 설명 가능한 프로젝트로 정리한다.
- 해야 할 작업:
  - README 개선안 반영
  - architecture diagram과 주요 코드 walkthrough 작성
  - resume bullet을 직접 기여 범위에 맞게 수정
  - “위험 표현” 목록을 README와 면접 답변에서 제거
- 완료 기준:
  - 면접에서 `mission-service`, provider registry, web API, store, smoke evidence를 설명 가능
  - 구현 완료와 roadmap 표현이 분리됨
  - demo screenshot 또는 실행 로그가 준비됨
- 산출물:
  - portfolio README
  - project card
  - case study
  - interview story
  - screenshots/demo notes

## 6. 우선순위 높은 다음 작업 5개

| 우선순위 | 작업 | 이유 | 예상 산출물 |
|---|---|---|---|
| 1 | 대표 demo scenario 재현 근거 확장 | 포트폴리오 설명의 중심 사례가 정해졌으므로 screenshot/CLI output 근거가 필요 | demo script, screenshot, CLI output |
| 2 | README를 구현 완료/개발 중/미구현 기준으로 재구성 | 현재 README는 운영 로그가 길어 핵심 전달이 어렵다 | updated README |
| 3 | 핵심 smoke command 최신 실행 결과 정리 | 구현 주장에 검증 근거를 붙이기 위함 | smoke summary |
| 4 | Anthropic/Hermes validation blocker 정리 | multi-provider claim의 위험을 줄이기 위함 | provider readiness matrix |
| 5 | Architecture walkthrough 작성 | 면접에서 코드 수준 설명을 강화 | architecture notes |

## 7. 대표 demo 보조 증거 현황

- 완료: release readiness screenshot, replay log, browser E2E report, representative demo summary
- 완료: operator surface demo evidence 문서로 mission/provider/action support evidence를 CLI/API/evidence manifest에 연결
- 완료: mission creation/run browser screenshot, provider readiness browser screenshot, action inbox browser screenshot
- 완료: recorded walkthrough script와 no-hosted-demo smoke guard
- 완료: architecture code walkthrough와 symbol smoke guard
- 완료: provider readiness matrix와 catalog smoke guard
- 현재 claim boundary: provider-scoped local-first pilot support evidence
- 남은 polish: published private/public walkthrough URL, actual pilot feedback and metric evidence
