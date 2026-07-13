# 리팩토링·개발 실행 계획 v1

> 기준 시점: 2026-07-13
> 기준 커밋: `64466813`
> 현재 경계: local-first pilot이며 `production-ready` 또는 all-provider complete로 설명하지 않는다.

## 1. 목표

코드를 파일 크기만 줄이는 방향으로 쪼개지 않는다. 한 파일을 읽을 때 한 가지 책임이 자연스럽게 이어지고, 함수 이름과 호출 순서만으로 의도가 드러나게 만든다. 동작, 승인 경계, 감사 기록, 증적 생성 방식은 그대로 유지한다.

개발 작업은 코드만으로 끝낼 수 있는 항목과 외부 계정·승인·운영 환경 증적이 필요한 항목을 분리한다. 외부 증거가 없는 기능은 구현 여부와 검증 여부를 구분해 기록한다.

## 2. 현재 기준선

| 항목 | 현재 측정값 | 측정 방법 |
|---|---:|---|
| `mission-service.mjs` | 14,676줄 | `wc -l src/core/mission-service.mjs` |
| `app.js` | 13,772줄 | `wc -l src/web/public/app.js` |
| `server.mjs` | 3,900줄 | `wc -l src/web/server.mjs` |
| 단위 테스트 | 484개 통과 | `npm test` |
| 문서 게이트 | 33개 통과 | `npm run smoke:docs-gates` |

2026-06-30 점검 이후 attachment, retrieval artifact, provider telemetry, escalation, maintenance, learning promotion, frontend copy/navigation/state, web path guard와 API route table의 1차 분리는 완료되었다. 이 계획은 완료된 작업을 반복하지 않고 남은 경계만 다룬다.

### 실행 현황

| 작업 | 상태 | 현재 증거 |
|---|---|---|
| 기준선 확인 | 완료 | clean `main`, `64466813`, origin과 일치 |
| R1 Provider execution analytics | 완료 | `mission-service.mjs`의 summary, timeline, bucket, delta를 순수 모듈로 이동 |
| R2.1 Action item builder | 완료 | approval, blocked, reviewer, maintenance 표시 record를 store 조회에서 분리 |
| R2.2 Specialist·provider attention builder | 완료 | specialist와 provider attention 표시 record를 store·registry·permission 조회에서 분리 |
| R2.3 Mutation·maintenance orchestration | 다음 작업 | reminder, acknowledge, resolve, remediate의 write·audit 경계를 점검할 예정 |

R1 완료 검증:

- `npm test`: 493개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- browser E2E 2개는 `smoke:all`의 명시적 제외 대상이며 이번 작업은 UI를 변경하지 않았다.

R2.1 구현 검증:

- `npm test`: 499개 통과
- action, maintenance, approval, reviewer, provider attention, specialist 관련 smoke 12개 통과
- `npm run smoke:docs-gates`: 33개 통과
- 구현 commit 전 `npm run smoke:all`: 163개 통과, 2개 실패는 이전 commit을 가리키는 clean deployment와 production-like drill artifact이며 구현 commit 후 표준 artifact refresh 대상으로 분리

R2.2 구현 검증:

- `npm test`: 503개 통과
- specialist follow-up, provider attention, action inbox, maintenance, provider fallback 관련 smoke 12개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- browser E2E 2개는 `smoke:all`의 명시적 제외 대상이며 이번 작업은 UI를 변경하지 않았다.

## 3. 변경 원칙

1. 한 번에 하나의 도메인만 옮긴다.
2. 기존 함수의 입력·출력과 저장 형식을 먼저 고정한 뒤 이동한다.
3. 새 추상화보다 이름이 분명한 함수와 작은 factory를 우선한다.
4. 추출 과정에서 기능을 추가하지 않는다. 기능 변경은 별도 작업 묶음으로 다룬다.
5. 승인, tenant, path guard, provider fallback stop condition은 완화하지 않는다.
6. 단위 테스트는 순수 로직을 맡고, smoke는 CLI·web·artifact 연결을 맡는다.
7. README와 release 문서는 실제 명령 결과와 증적이 바뀔 때만 갱신한다.

## 4. 작업 순서

### R1. Provider execution analytics 분리

목적은 provider 실행 이력의 집계·기간별 bucket·delta·timeline 변환을 `mission-service`의 상태 제어에서 떼어내는 것이다.

- 범위: execution/probe summary, daily·weekly·monthly bucket, latest delta, execution timeline
- 제외: provider 실행, fallback 정책, attention remediation 동작
- 완료 조건:
  - 순수 모듈이 store 또는 provider registry를 직접 알지 않는다.
  - 기존 API·CLI payload가 바뀌지 않는다.
  - 빈 입력, 성공·실패 혼합, retry, 비용 미측정, 기간 경계를 단위 테스트한다.
- 검증: `npm test`, provider telemetry/history/timeline/overview 관련 smoke, `npm run smoke:docs-gates`
- 커밋 묶음: 순수 모듈, 단위 테스트, mission-service 연결을 한 commit으로 묶는다.

### R2. Mission action과 maintenance 흐름 분리

action inbox를 만드는 코드와 action을 처리하는 코드를 구분한다. operator가 무엇을 보아야 하는지와 실제 상태를 어떻게 바꾸는지가 한 덩어리로 섞이지 않게 한다.

- 1차 범위: approval·reviewer·specialist·provider attention item builder
- 2차 범위: reminder·acknowledge·resolve·remediate orchestration
- 3차 범위: maintenance run과 impact summary 연결
- 완료 조건:
  - item builder는 입력 상태를 받아 표시용 record만 반환한다.
  - mutation은 store write와 audit record를 같은 경계에서 처리한다.
  - permission decision과 accepted-risk 흐름이 유지된다.
- 검증: action inbox, approval, escalation, specialist follow-up, provider attention, maintenance smoke
- 커밋 묶음: builder 분리와 mutation 분리는 서로 다른 commit으로 묶는다.

### R3. Mission·workspace·operator timeline 분리

여러 이벤트를 모으는 단계, 시간순으로 정렬하는 단계, summary를 만드는 단계를 나눈다.

- 범위: specialist, provider fallback, identity/session, gateway, sandbox, maintenance event assembly
- 완료 조건:
  - event schema와 정렬 순서가 유지된다.
  - source id, mission id, workspace id, permission·sandbox decision 근거가 사라지지 않는다.
- 검증: mission/workspace/operator timeline과 audit surface smoke
- 커밋 묶음: timeline assembly와 테스트를 한 commit으로 묶는다.

### R4. Operator UI 모듈 경계 정리

현재 남아 있는 `app.js`의 harness, release, mission/action UI를 화면 단위로 옮긴다. DOM을 감추는 범용 framework는 만들지 않는다.

- 순서: harness browse → mission/action inbox → release status → bootstrap/event wiring
- 유지할 경계: browser ESM, no bundler, 현재 URL state, copy action, theme 초기화
- 완료 조건:
  - 각 모듈은 필요한 state와 callback을 명시적으로 받는다.
  - circular import가 없다.
  - 브라우저 module graph가 TDZ 없이 평가된다.
- 검증: frontend module graph test, UI harness, execution console, browser E2E artifact restore smoke
- 커밋 묶음: 한 화면 영역과 해당 회귀 검증을 한 commit으로 묶는다.

### R5. Web server 경계 정리

release 문서 해석, runtime job, API request 처리, static serving을 분리한다. route table은 유지하고 handler 본문만 응집도에 맞게 옮긴다.

- 순서: release artifact parser → release job service → mission/action handlers
- 완료 조건:
  - auth·RBAC·tenant 검사가 handler보다 먼저 실행된다.
  - path resolution은 기존 `path-guard`만 사용한다.
  - error status와 response payload가 유지된다.
- 검증: runtime discovery, web auth/RBAC/OIDC, tenant isolation, release status·artifact refresh smoke
- 커밋 묶음: 한 server 경계와 관련 smoke를 한 commit으로 묶는다.

### D1. 코드로 닫을 수 있는 후속 개발

리팩토링 묶음 사이에는 사용자 흐름을 실제로 단순하게 만드는 기능만 넣는다.

- provider readiness와 blocker 화면에서 다음 검증 명령과 필요한 증적을 한 흐름으로 연결한다.
- action inbox에서 실행 가능한 remediation과 외부 승인이 필요한 handoff를 명확히 나눈다.
- session history와 logs에서 mission, provider response, retry lineage, artifact provenance를 같은 문맥으로 추적할 수 있는지 점검한다.
- 변경 전 관련 smoke가 현재 동작을 고정하지 못하면 먼저 회귀 검증을 추가한다.

### D2. 외부 증적이 필요한 개발

아래 항목은 코드로 상태를 꾸미지 않는다. 실제 환경과 승인 자료가 있을 때만 실행한다.

- Anthropic billing/credit blocker 해소와 target-boundary live validation
- Hermes endpoint ownership, model pin, secret injection, tool-call/session lifecycle 증적
- hosted identity/session, tenant isolation, secret manager, observability/SLO 운영 증적
- production-like environment에서 나온 deployment·rollback·support evidence

각 항목은 preflight → live validation → artifact hygiene → snapshot refresh → 문서 claim 갱신 순서로 닫는다. 중간 단계가 실패하면 기존 release label을 유지한다.

## 5. 모델 운용

현재 실행 환경에서는 작업 중 모델을 코드로 자동 전환할 수 없다. 모델 전환은 사용자가 Codex UI에서 수행하고, 각 작업은 다음 프로필에 맞춘다.

| 작업 | 권장 프로필 | 이유 |
|---|---|---|
| 경계 분석·위험 검토 | 고추론 모델 | 의존성, 승인, 증적 손실 위험 판단 |
| 모듈 추출·테스트 작성 | 코딩 중심 모델 | 작은 diff와 기존 스타일 보존 |
| smoke 로그 분류·문서 정합성 | 빠른 경량 모델 | 반복 확인과 낮은 판단 비용 |
| 큰 묶음 최종 리뷰 | 고추론 모델 | goal, 보안, 실제 사용, 문맥을 함께 검토 |

모델이 바뀌어도 현재 계획, 마지막 검증 결과, 미완료 항목을 먼저 읽고 이어간다. 이전 모델의 완료 주장은 실제 diff와 명령 결과로 다시 확인한다.

## 6. 검증과 증적

각 작업 묶음은 아래 순서로 닫는다.

1. 변경 파일에 직접 연결된 단위 테스트
2. 해당 도메인의 deterministic smoke
3. `npm test`
4. `npm run smoke:docs-gates`
5. 큰 묶음은 `npm run smoke:all`
6. release artifact가 바뀐 경우에만 refresh, hygiene, snapshot 절차 실행

외부 credential이 필요한 live 검증은 자동으로 우회하지 않는다. 실행하지 못한 검증은 blocker와 필요한 환경변수를 기록한다.

## 7. 커밋과 push

- 함수 하나를 옮길 때마다 commit하지 않는다.
- 같은 도메인의 모듈 추출, 테스트, 연결 변경을 한 commit으로 묶는다.
- 문서·artifact 재생성은 구현 commit과 분리하되 같은 push 묶음에 포함할 수 있다.
- 각 commit에는 변경 배경, 구현 방식, 영향 범위, 검증 결과를 기록한다.
- push 전 `git diff --check`, 관련 테스트, 관련 smoke, working tree 범위를 확인한다.
- 외부 시스템 승인, credential, target environment 증거가 필요한 단계에서는 commit으로 완료 상태를 꾸미지 않는다.

## 8. 중단·재계획 조건

다음 상황에서는 다음 작업으로 넘어가지 않는다.

- public API, CLI payload, 저장 schema 변경이 필요해진 경우
- 새 production dependency가 필요한 경우
- 승인·RBAC·tenant·path guard가 약해지는 경우
- baseline에서 없던 실패가 발생하고 원인이 분명하지 않은 경우
- release claim을 높이려면 외부 증거가 필요한 경우
- 추출 모듈이 원래 service보다 더 많은 내부 상태를 인자로 요구하는 경우

이때는 현재 diff를 작게 유지한 채 원인과 선택지를 다시 기록하고 계획을 수정한다.
