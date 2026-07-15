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
| 기준선 확인 | 완료 | R4.4 시작 시 clean `main`, `148688d0`, origin과 일치 |
| R1 Provider execution analytics | 완료 | `mission-service.mjs`의 summary, timeline, bucket, delta를 순수 모듈로 이동 |
| R2.1 Action item builder | 완료 | approval, blocked, reviewer, maintenance 표시 record를 store 조회에서 분리 |
| R2.2 Specialist·provider attention builder | 완료 | specialist와 provider attention 표시 record를 store·registry·permission 조회에서 분리 |
| R2.3 Mutation·maintenance orchestration | 완료 | reminder·acknowledgement audit record와 maintenance run 계산을 store write에서 분리 |
| R3 Timeline assembly | 완료 | gateway·identity/session·sandbox·maintenance event 조립과 timeline 정렬을 순수 모듈로 이동 |
| R4 Operator UI module boundary | 완료 | 화면별 action·render 경계와 전역 event·bootstrap을 explicit dependency 모듈로 이동 |
| R4.2 Mission/action inbox UI | 완료 | 필터 상태·API query·화면 조립·DOM wiring을 분리하고 mutation 승인은 app callback에 유지 |
| R4.3.1 Release lifecycle actions | 완료 | preflight, refresh, regeneration, snapshot 확인·취소 wiring을 분리하고 mutation과 승인 판단은 app callback에 유지 |
| R4.3.2a Release navigation/state actions | 완료 | history, blocker, provider의 focus·filter·clear·toggle wiring 17개를 분리 |
| R4.3.2b Release copy actions | 완료 | copy action 71개의 handler 선택과 dataset payload 정규화를 복사 대상별로 분리 |
| R4.3.2c Release preview actions | 완료 | preview action 2개를 분리하고 release surface의 generic listener를 제거 |
| R4.3.3 Release status rendering | 완료 | 상태 요약부터 recommendation·snapshot·handoff·문서 panel까지 순수 render 모듈로 이동 |
| R4.3.3a Release overview rendering | 완료 | 첫 화면의 상태 요약과 runtime/checklist 흐름을 `release-status-view.js`로 분리 |
| R4.3.3b Release evidence triage rendering | 완료 | production blocker와 current-open blocker의 view model·표시 조립을 같은 순수 모듈로 이동 |
| R4.3.3b1 Production blocker rendering | 완료 | blocker filter/focus view model과 production blocker summary·detail·gap을 분리 |
| R4.3.3b2 Current-open blocker rendering | 완료 | filter action cluster, focused blocker, current-open list를 같은 view model 위로 이동 |
| R4.3.3c Release history·provider readiness rendering | 완료 | history 필터·포커스·상세와 provider readiness·closure 표시를 같은 순수 view model 위로 이동 |
| R4.3.3d Release recommendation·handoff·document rendering | 완료 | recommendation history 조립과 snapshot, handoff preview, 문서 panel을 두 순수 view 모듈로 이동 |
| R4.4 Bootstrap·global event wiring | 완료 | 전역 form·navigation listener와 시작 순서를 callback 기반 모듈로 분리 |
| R5 Web server boundary | 완료 | release read model, runtime job, route handler, static serving, process bootstrap을 책임별 모듈로 분리 |
| R5.1a Release artifact resolver | 완료 | handoff artifact와 evidence doc allowlist·경로 검증을 HTTP 독립 모듈로 분리 |
| R5.1b Release markdown parser | 완료 | release markdown의 section·checklist·deterministic·reference·live validation 추출을 순수 parser로 이동 |
| R5.1c Release status assembler | 완료 | parser 결과와 provider·blocker·artifact freshness를 받는 순수 API read model로 분리 |
| R5.2a Runtime job runner | 완료 | request id·job kind·scope·result/error lifecycle을 registry-backed service로 이동 |
| R5.2b Release command orchestration | 완료 | refresh·preflight·snapshot 확인 조건, runtime job 호출, release action audit 순서를 HTTP 독립 service로 이동 |
| R5.3a Route registry | 완료 | exact/param route 등록·match를 HTTP 독립 registry로 이동하고 auth·RBAC 이후 dispatch 순서를 유지 |
| R5.3b Release handlers | 완료 | status·blocker·artifact/doc read·refresh·preflight·snapshot 응답을 request-scoped handler factory로 이동 |
| R5.3c Mission/action handlers | 완료 | action과 mission을 독립 factory·검증·commit 경계로 나눠 이동 |
| R5.3c1 Action handlers | 완료 | inbox query·optional workspace tenant 검사와 learning/provider/specialist/reviewer mutation 응답을 request-scoped factory로 이동 |
| R5.3c2 Mission handlers | 완료 | mission tenant 검사·attachment 변환·document/memory/execution payload와 status code 선택을 request-scoped factory로 이동 |
| R5.4 Static/server bootstrap | 완료 | static path guard·content type·404와 discovery·port fallback·shutdown을 두 작은 경계로 분리 |
| D1 코드로 닫을 수 있는 후속 개발 | 완료 | provider 검증, action 실행 경계, session lineage를 기존 증적과 권한 계약 위에서 연결 |
| D1.1 Provider·blocker 검증 흐름 | 완료 | 필요한 증적 → 다음 검증 명령 → closure 판정을 같은 source-backed 화면 흐름으로 연결 |
| D1.2 Action inbox remediation·handoff | 완료 | 즉시 실행, 외부 승인·인계, 검토 후 실행을 기존 permission·owner·audit record로 구분 |
| D1.3 Session·log lineage | 완료 | run이 보유한 mission·session·provider response·retry·artifact 식별자를 한 문맥으로 표시하고 누락 연결을 분리 |
| D3 API 비용 없는 내부 경계 정리 | 진행 중 | 외부 provider 호출 없이 mission service의 남은 도메인을 검증 가능한 순서로 분리 |
| D3.1 Memory write·fact graph sync | 완료 | memory 검증·저장·fact graph 동기화를 독립 service로 이동 |
| D3.2a Execution mutation primitives | 완료 | content 계산, rollback preview, mutation audit·batch summary를 순수 모듈로 이동 |

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

R2.3 구현 검증:

- `npm test`: 508개 통과
- specialist/provider reminder, provider lifecycle/remediation, specialist remediation, action maintenance/history smoke 7개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- store write는 `mission-service`에 유지하고 async remediation, permission decision, fallback policy는 변경하지 않았다.

R3 구현 검증:

- `npm test`: 513개 통과
- mission·workspace·operator timeline smoke 3개 통과
- identity/session·gateway·sandbox audit surface smoke 3개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- gateway source id, mission/workspace context, permission decision, sandbox decision 계약을 순수 모듈 단위 테스트로 고정
- specialist와 provider fallback 도메인 로직은 변경하지 않고 기존 event를 같은 정렬 경계에 연결했다.

R4.1 harness browse 구현 검증:

- `npm test`: 520개 통과
- frontend module graph 및 TDZ guard 2개 통과
- UI harness browse, execution console, mission attachment, retrieval memory smoke 4개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E와 생성 artifact restore smoke 통과
- 새 `harness-browse.js`는 `app.js`를 import하지 않고 state, API, render, mutation callback을 명시적으로 받는다.

R4.2 mission/action inbox 구현 검증:

- `npm test`: 527개 통과
- frontend module graph 및 TDZ guard 2개 통과
- action, provider attention, specialist follow-up, learning promotion, reviewer follow-up, UI execution 관련 smoke 12개 통과
- UI learning promotion surface smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E와 생성 artifact restore smoke 통과
- 새 `action-inbox.js`는 `app.js`를 import하지 않으며 필터·조회·렌더링·DOM wiring만 맡는다. confirm, prompt, API mutation, permission-sensitive refresh는 `app.js` callback에 유지한다.

R4.3.1 release lifecycle actions 구현 검증:

- `npm test`: 530개 통과
- release lifecycle action과 frontend module graph·TDZ guard 단위 테스트 5개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E와 생성 artifact restore smoke 통과
- 새 `release-status-actions.js`는 `app.js`를 import하지 않으며 lifecycle DOM wiring만 맡는다. release artifact 해석, API mutation, live validation 승인 판단은 `app.js` callback에 유지한다.
- 기존 release render와 action wiring을 한 번에 옮기면 약 4,000줄과 많은 callback이 함께 이동하므로, R4.3을 lifecycle action, navigation action, render assembly 세 단계로 나눴다.

R4.3.2a release navigation/state actions 구현 검증:

- `npm test`: 534개 통과
- release lifecycle·navigation action과 frontend module graph·TDZ guard 단위 테스트 9개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E와 생성 artifact restore smoke 통과
- history, blocker, production blocker, provider의 focus·filter·clear·toggle action 17개를 `release-status-actions.js`로 이동했다. state 변경, URL 기록, scroll target 결정은 기존 `release-navigation.js` callback에 유지한다.
- 조사된 release action 90개 가운데 copy 71개와 preview 2개는 각각 R4.3.2b와 R4.3.2c에서 검증 가능한 별도 묶음으로 처리한다.

R4.3.2b release copy actions 구현 검증:

- `npm test`: 537개 통과
- release lifecycle·navigation·copy action과 frontend module graph·TDZ guard 단위 테스트 12개 통과
- copy action ownership 71개와 provider-only action·handler 25개 일치를 verifier로 확인
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 copy·fallback session 38개가 모두 error-free였고 생성 artifact restore smoke 통과
- copy action 71개의 handler 선택과 dataset payload 정규화를 `release-status-actions.js`로 이동했다. clipboard, prompt fallback, copied-state, notice 처리는 기존 `copy-handlers.js` namespace에 유지한다.
- `wireQuickActions()`에는 copy action이 남지 않았으며 preview toggle·clear 2개만 R4.3.2c 대상으로 남아 있다.

R4.3.2c release preview actions 구현 검증:

- `npm test`: 540개 통과
- release lifecycle·navigation·copy·preview action과 frontend module graph·TDZ guard 단위 테스트 15개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- preview toggle·clear의 DOM dispatch를 `release-status-actions.js`로 이동했다. artifact 조회와 API 요청, preview state 갱신은 기존 `app.js` callback에 유지한다.
- 빈 상태와 정상 상태 모두 release 전용 wiring을 사용한다. `wireQuickActions()`와 release surface 사이의 generic listener 연결은 남아 있지 않다.

R4.3.3a release overview rendering 구현 검증:

- `npm test`: 546개 통과
- release status view와 release action, frontend module graph·TDZ guard 단위 테스트 21개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- 실제 브라우저에서 release 화면의 summary, deterministic/reference 검증, runtime job, closeout checklist를 확인했다. 이 과정에서 남아 있던 preflight button import 누락을 발견해 복구한 뒤 전체 browser E2E를 다시 통과했다.
- `app.js`는 11,889줄, 새 `release-status-view.js`는 550줄이다. 새 모듈은 `app.js`, state, API, permission 경계를 직접 import하지 않고 표시 데이터와 copy button renderer를 명시적으로 받는다.
- summary와 세부 목록은 escaping, 빈 상태, disabled snapshot, audit id를 단위 테스트로 고정했다. API mutation, 승인 판단, URL state, artifact 조회는 기존 경계에 유지한다.

R4.3.3b1 production blocker rendering 구현 검증:

- `npm test`: 551개 통과
- evidence triage view, release status/action, frontend module graph·TDZ guard 단위 테스트 26개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- 실제 브라우저에서 production blocker 24건의 초기 8건 요약, 전체 24건 확장, 10번 blocker focus, `rpblocker=10` URL, focused row index 9, 근거 문서 링크와 focus action 6개를 확인했다. console error는 없었다.
- `app.js`는 11,673줄, 새 `release-evidence-triage-view.js`는 382줄이다. 새 모듈은 state, API, permission, URL 모듈을 import하지 않고 release data, view state, selector, copy renderer를 명시적으로 받는다.
- production-ready claim은 계속 blocked로 표시하며 escaping, 빈 목록, 8건 요약, focus, audit link, gap 빈 상태를 단위 테스트로 고정했다.

R4.3.3b2 current-open blocker rendering 구현 검증:

- `npm test`: 554개 통과
- evidence triage view, release status/action, frontend module graph·TDZ guard 단위 테스트 29개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- 실제 브라우저에서 전체 7건, `provider-account` category 2건, 상충하는 `release-owner` 조합 0건, category만 유지한 복구 2건, focused blocker와 근거 링크 3개를 확인했다. `rbcategory`, `rbowner`, `rblocker` URL 상태가 유지되었고 console error와 warning은 없었다.
- `app.js`는 10,704줄, `release-evidence-triage-view.js`는 1,429줄이다. current-open filter action cluster, empty recovery, focused evidence·commands, blocker row list를 view 모듈로 옮겼고 copy button renderer는 명시적인 dependency object로 전달한다.
- view 모듈은 state, API, permission, URL 모듈을 import하지 않는다. state mutation, URL 기록, clipboard와 prompt fallback은 기존 action·navigation·copy 경계에 유지한다.
- production-ready claim은 계속 blocked로 표시하며 필터 결과, 빈 조합 복구, 포커스, escaping, 증적 링크, command와 copy payload 전달을 단위 테스트로 고정했다.

R4.3.3c release history·provider readiness rendering 구현 검증:

- `npm test`: 559개 통과
- history·provider view, evidence triage view, release status/action, frontend module graph·TDZ guard 단위 테스트 34개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- 실제 브라우저에서 history 5건과 provider card 4개를 확인했다. OpenAI history를 고정하고 상세를 연 뒤 provider 필터를 적용해 1건만 남는 흐름과 `rhistory`, `rprovider` URL 상태를 확인했다.
- OpenAI provider card를 포커스했을 때 카드가 상단으로 이동하고 `rcard=openai`, `claim blocked`, closure verification 2건, required proof 14건, command 12건, evidence document 5건이 유지되는 것을 확인했다. env가 없는 live action은 disabled였고 console error와 warning은 없었다.
- `app.js`는 10,099줄, 새 `release-history-provider-view.js`는 722줄이다. 새 모듈은 state, API, permission, URL 모듈을 import하지 않고 release data, view state, label·selector 함수, copy button renderer를 명시적으로 받는다.
- state mutation, URL 기록, clipboard·prompt fallback, preflight와 live validation은 기존 action·navigation·copy·lifecycle 경계에 유지했다. production-ready claim은 계속 blocked이며 필터·포커스·정렬·빈 상태·escaping·closure 근거·copy payload 전달을 단위 테스트로 고정했다.

R4.3.3d release recommendation·handoff·document rendering 구현 검증:

- `npm test`: 566개 통과
- 새 recommendation·handoff view와 frontend module graph·TDZ guard 단위 테스트 9개 통과
- UI harness browse, learning promotion surface, execution console, production readiness, release blocker handoff smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E의 preview copy·fallback session 38개와 open session 2개가 모두 error-free였고 생성 artifact restore smoke 통과
- 실제 브라우저에서 recommendation 2개, handoff card 21개, preview trigger 20개, closeout·evidence·handoff 문서 panel 3개를 확인했다. JSON과 structured summary preview가 ready로 열렸고 deep-link reload와 close URL 정리가 유지되었으며 console error와 warning은 없었다.
- `app.js`는 9,230줄, 새 `release-recommendation-view.js`는 340줄, 새 `release-handoff-document-view.js`는 498줄이다. `renderReleaseStatus()`는 view model을 만들고 하위 renderer를 배치하는 shell로 남았다.
- 새 view 모듈은 state, API, permission, URL 모듈을 import하지 않는다. API preview load, state mutation, URL 기록, clipboard·prompt fallback, release lifecycle action은 기존 경계에 유지했고 production-ready claim도 높이지 않았다.
- browser E2E의 source sanity는 단일 `app.js` 문자열이 아니라 실제로 제공되는 재귀 ES module bundle을 검사해 모듈 추출 뒤에도 동일한 문서 계약을 검증한다.

R4.4 bootstrap·global event wiring 구현 검증:

- `npm test`: 572개 통과
- 새 application event·bootstrap과 frontend module graph·TDZ guard 단위 테스트 8개 통과
- `npm run smoke:all`: 165개 통과
- 실제 브라우저에서 theme 전환, setup → run 단계 이동, config → runs → release 탭 이동, browser back의 runs → setup/config 복원을 확인했고 console error와 warning은 없었다.
- `app.js`는 9,138줄, 새 `application-events.js`는 85줄, 새 `application-bootstrap.js`는 19줄이다. event 모듈은 DOM target과 callback만 받고 bootstrap 모듈은 theme → event → static render → data load → URL restore 순서와 오류 전달만 맡는다.
- API 요청과 state mutation은 기존 app callback에 유지했다. 문서·미션·메모리·워크스페이스 form, 실행 버튼, browser history의 alert와 button/input 복구 문구도 그대로 유지했다.
- global listener는 각 target에 한 번만 등록되는 것을 단위 테스트로 고정했다. 동적으로 다시 그려지는 mission attachment form listener는 기존 render 경계에 남겨 bootstrap listener와 섞지 않았다.

R5.1a release artifact resolver 구현 검증:

- `npm test`: 575개 통과
- 새 resolver 단위 테스트 3개에서 mutable artifact, immutable snapshot, evidence doc, missing file, directory, root 밖 artifact, unknown id를 확인했다.
- `npm run smoke:ui-harness-browse`, `npm run smoke:execution-v1-handoff`, `npm run smoke:all` 165개 통과
- 실제 HTTP에서 browser report와 release readiness 문서의 200, 기존 content type, `content-disposition` filename을 확인했다. unknown artifact id와 snapshot prefix 안에서 `..`를 사용한 allowlist 우회는 모두 404였다.
- `server.mjs`는 3,850줄, 새 `release-artifact-resolver.mjs`는 91줄이다. resolver는 root path, artifact catalog, allowlist만 받고 HTTP request/response, auth, RBAC, tenant, provider, release status를 직접 알지 않는다.
- content type과 filename은 static serving도 공유하는 HTTP 응답 책임이므로 R5.1a로 이동하지 않았다. route는 resolver가 돌려준 안전한 path만 읽고 기존 response header를 그대로 조립한다.
- auth·RBAC 선검사와 route table은 변경하지 않았다. snapshot prefix는 계속 허용하되 빈 경로, absolute path, `.`·`..` segment를 거부하도록 경로 계약을 명시했다.

R5.1b release markdown parser 구현 검증:

- `npm test`: 580개 통과
- 새 parser fixture 테스트 5개에서 metadata, heading level, section bullet, labeled blocker, checklist, status map, deterministic/runtime, reference adoption, live validation과 malformed input 기본값을 확인했다.
- execution-v1 status·handoff, production readiness, release blocker handoff, artifact hygiene 집중 smoke 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 3,657줄, 새 `release-markdown-parser.mjs`는 205줄이다. parser는 문자열만 받고 filesystem, HTTP, auth, RBAC, tenant, process global을 직접 알지 않는다.
- verification 분류, blocker closure, provider readiness, git·artifact freshness와 API payload 조립은 R5.1c 대상이므로 `server.mjs`에 유지했다. auth·RBAC 선검사와 route table은 변경하지 않았다.

R5.1c release status assembler 구현 검증:

- `npm test`: 585개 통과
- 새 assembler fixture 테스트 5개에서 verification 분류, required·optional gap, artifact-sync current, commit mismatch stale, snapshot 추천, provider preflight·env 추천과 missing document 기본값을 확인했다.
- execution-v1 status·handoff, production readiness, release blocker handoff, artifact hygiene 집중 smoke 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 3,287줄, 새 `release-status-assembler.mjs`는 422줄이다. server는 markdown·git·env·snapshot·store·runtime job을 읽어 명시적인 입력으로 넘기고 assembler는 parser 결과와 전달받은 값만으로 기존 API payload를 만든다.
- artifact freshness, handoff 일치, stale reason, refresh plan, snapshot eligibility, provider recommendation과 current·baseline summary를 순수 read model에서 조립한다. filesystem, HTTP request/response, process global, store, runtime registry는 직접 알지 않는다.
- auth·RBAC·tenant 선검사, route table, artifact resolver, blocker closure 문구와 `productionReadyClaim=false` 경계는 변경하지 않았다.

R5.2a runtime job runner 구현 검증:

- `npm test`: 588개 통과
- 새 runner 단위 테스트 3개에서 완료 결과 요약, request id·kind·scope·source 연결, 실패 terminal 기록 후 원본 오류 재전파, non-object 결과 기본값을 실제 temp registry로 확인했다.
- runtime discovery, execution-v1 artifact refresh 8단계, snapshot, status, UI execution console과 UI harness browse 집중 smoke 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 3,233줄, 새 `runtime-job-runner.mjs`는 61줄이다. server는 job 입력과 task만 넘기고 runner가 start → task → completed/failed terminal 기록 순서를 소유한다.
- registry 영속 형식, active·terminal history, runtime job id, request id, release API 응답과 release action audit 연결을 유지했다. runner는 HTTP request/response, route, 승인 조건, release command 구현을 직접 알지 않는다.
- refresh·preflight·snapshot 확인 조건과 release action audit orchestration은 R5.2b 대상으로 handler에 유지했다.

R5.2b release command orchestration 구현 검증:

- `npm test`: 596개 통과
- 새 orchestrator 단위 테스트 8개에서 current surface·live refresh 확인, provider 차단, runtime job request id 연결, refresh 성공·실패 audit, refresh/provider/snapshot preflight audit, snapshot eligibility·확인·성공·실패를 확인했다.
- runtime discovery, execution-v1 artifact refresh 8단계, snapshot, status, UI execution console과 UI harness browse 집중 smoke 통과
- web RBAC smoke에서 operator의 admin-only snapshot 실행이 service 진입 전에 계속 403으로 차단되는 것을 확인했다.
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 3,037줄, 새 `release-command-orchestrator.mjs`는 285줄이다. handler는 body와 request id를 넘기고 service 결과를 기존 status code와 JSON payload로 옮긴다.
- orchestrator는 refresh·preflight·snapshot의 blocked → confirmation-required → runtime job → completed/failed audit 순서를 소유한다. command 실행 함수, status read model, runtime job runner, audit writer는 명시적으로 주입받는다.
- refresh 실행 실패는 기존처럼 release action에 기록한 뒤 원본 오류를 재전파하고, snapshot 실행 실패는 audit 기록 뒤 기존 409 `snapshot-not-ready` 응답으로 정리한다.
- auth·RBAC·tenant 선검사, route table, confirmation field, runtime job kind·scope·request id, release action 저장 형식과 `productionReadyClaim=false` 경계는 변경하지 않았다.

R5.3a route registry 구현 검증:

- `npm test`: 602개 통과
- 새 registry 단위 테스트 6개에서 exact match, raw param 추출, exact 우선, param 등록 순서, static param pattern, exact replacement, method·segment 불일치를 확인했다.
- 구현 전후 `registerExactRoute`·`registerParamRoute` 호출을 직접 비교해 exact 22개와 param/static-pattern 33개의 method·path·등록 순서가 바뀌지 않았음을 확인했다.
- runtime discovery, UI harness browse, UI execution console, web RBAC·auth/RBAC·OIDC/RBAC·tenant isolation, action inbox, execution flow 집중 smoke 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 2,994줄, 새 `route-registry.mjs`는 76줄이다. server는 auth·RBAC 통과 후 handler closure를 등록하고 registry match 결과만 dispatch한다.
- exact route를 param route보다 먼저 평가한다. 현재 route table에는 두 종류가 같은 method/path에서 충돌하는 항목이 없어 기존 응답은 유지하면서 precedence를 명시적인 계약으로 고정했다.
- param 값은 decode하거나 검증하지 않고 raw segment로 전달해 기존 handler의 `decodePathSegment` 경계를 유지한다. param route끼리는 기존 등록 순서대로 평가한다.
- auth·RBAC·tenant 검사, handler 본문, route path, status code, response payload, 404와 error 처리, static serving은 변경하지 않았다.

R5.3b release handlers 구현 검증:

- `npm test`: 609개 통과
- 새 handler 단위 테스트 7개에서 status와 blocker query, handoff artifact raw id decode와 content disposition, evidence doc read, allowlist miss 404, refresh confirmation 409·성공 200, provider/refresh preflight, snapshot 성공·실패·preflight 응답을 확인했다.
- 구현 전후 release route 등록을 직접 비교해 exact 8개와 param 1개의 kind·method·path·순서가 모두 같음을 확인했다.
- execution-v1 status·artifact refresh 8단계·snapshot, release blocker handoff, artifact hygiene, production readiness, UI execution console과 UI harness browse 집중 smoke 통과
- web RBAC·auth/RBAC·OIDC/RBAC smoke에서 release handler 생성과 dispatch보다 auth 401·RBAC 403 검사가 계속 먼저 적용되는 것을 확인했다.
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E 생성 artifact restore smoke 통과
- `server.mjs`는 2,893줄, 새 `release-handlers.mjs`는 168줄이다. server는 auth·RBAC 통과 뒤 request-scoped handler를 만들고 route registry에 named handler만 등록한다.
- factory는 request body·query·path parameter를 기존 helper로 해석하고 resolver·read model·command orchestrator 결과를 기존 status code와 JSON/buffer payload로 변환한다.
- resolver allowlist, raw path decode, refresh·snapshot confirmation, runtime request id, release action audit, content type·filename, `productionReadyClaim=false` 경계는 변경하지 않았다.
- tenant 검사, mission/action route, static serving, global error 처리와 release 이외 handler는 이번 범위에서 이동하지 않았다.

R5.3c1 action handlers 구현 검증:

- `npm test`: 614개 통과
- 새 handler 단위 테스트 5개에서 inbox query alias와 optional workspace tenant 차단, expire filter trim, learning promotion path decode·remind·resolve·rollback payload, provider·specialist·reviewer remediation service argument와 200 응답을 확인했다.
- 구현 전후 action route 등록을 직접 비교해 exact 1개와 기존 static pattern을 포함한 param 7개의 kind·method·path·순서가 모두 같음을 확인했다.
- UI learning promotion surface에서 실제 HTTP inbox filter, promote·reject·expire·rollback mutation을 확인했고 action inbox·maintenance, reviewer lifecycle, provider attention, specialist follow-up 집중 smoke가 통과했다.
- web tenant isolation·RBAC·auth/RBAC·OIDC/RBAC smoke가 통과했다. auth 401·RBAC 403은 action handler 생성보다 먼저 적용되고, optional workspace tenant 거부는 inbox service 호출 전에 응답을 끝낸다.
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E에서 console error와 page error가 0건이었고 handoff 6개, release preview 38개, release artifact open 2개 세션이 모두 error-free였다. 생성 artifact restore smoke도 통과했다.
- `server.mjs`는 2,834줄, 새 `action-handlers.mjs`는 132줄이다. server는 route registry에 8개의 named handler만 등록하고 factory가 query·body·raw path parameter를 기존 helper로 해석한다.
- 기존 learning promotion 기본값과 Boolean 변환, provider fallback field, async remediation 대기, tenant response helper, status code와 JSON payload를 변경하지 않았다.
- mission tenant·attachment·document·memory·execution handler, workspace·approval·artifact route, static serving과 global error 처리는 R5.3c2 이후 경계로 남겼다.

R5.3c2 mission handlers 구현 검증:

- `npm test`: 623개 통과
- 새 handler 단위 테스트 9개에서 mission list·create, workspace/mission tenant 차단 순서, attachment conversion·source fallback, session·harness query, execution rollback/preflight/start/stop/status/logs, document title prefix·legacy migration, mission memory scope, provider fallback과 web request id lineage를 확인했다.
- 구현 전후 전체 route 등록 55개를 직접 비교해 kind·method·path·순서가 모두 같음을 확인했다. Mission route는 exact 2개와 param 20개를 기존 위치에 유지한다.
- execution flow·CLI·UI console, harness browse, mission/UI attachment, session history, mission timeline, memory rerun·retrieval·fact graph, document conversion 집중 smoke가 통과했다.
- web tenant isolation·RBAC·auth/RBAC·OIDC/RBAC smoke가 통과했다. auth 401·RBAC 403은 mission handler 생성보다 먼저 적용되고 기존 workspace/mission tenant 검사는 attachment 변환과 service 호출보다 먼저 종료된다.
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E에서 mission create·run·approval·execution console과 retrieval restore가 통과했고 console error와 page error가 0건이었다. handoff 6개, release preview 38개, release artifact open 2개 세션이 모두 error-free였으며 생성 artifact restore smoke도 통과했다.
- `server.mjs`는 2,677줄, 새 `mission-handlers.mjs`는 280줄이다. Server는 22개의 named mission handler만 route registry에 등록하고 factory가 기존 helper와 service 결과를 HTTP response로 변환한다.
- 기존 attachment conversion, constraint parse, document title prefix, memory scope, Boolean coercion, raw path decode, provider fallback field, request id·route source context, 200/201 status와 JSON payload를 변경하지 않았다.
- workspace memory·approval·artifact route, static serving, discovery file, port fallback, shutdown과 global error 처리는 R5.4 이후 경계로 남겼다.

R5.4 static/server bootstrap 구현 검증:

- `npm test`: 631개 통과. 새 단위 테스트 8개에서 public root·nested module·content type·404, traversal·외부 symlink 차단, 연속 port fallback·비대상 오류 중단, discovery payload·runtime 상태 순서, shutdown best-effort 처리를 확인했다.
- 구현 전후 전체 route 등록 55개를 직접 비교해 kind·method·path·순서가 모두 같음을 확인했다. auth·RBAC·tenant 검사와 API error payload는 변경하지 않았다.
- `smoke:runtime-discovery`에서 요청 포트 점유 시 다음 포트 선택, `var/server.json`의 기존 필드, `/`와 `/app.js`의 실제 content type·본문, missing static 404, SIGTERM 이후 runtime status의 `stopped` 기록을 한 프로세스에서 확인했다.
- `npm run smoke:all`: 165개 통과. 실제 browser E2E에서 console error와 page error가 0건이었고 release handoff preview 38개와 artifact open 2개 세션이 모두 error-free였다. 강제 실패 시 생성 artifact restore smoke도 통과했다.
- `server.mjs`는 2,560줄, 새 `server-bootstrap.mjs`는 139줄이다. bootstrap은 starting 기록 → listener와 port fallback → discovery 기록 → listening 기록 → signal shutdown 순서를 소유한다.
- 새 `static-file-handler.mjs`는 66줄이다. 기존 `path-guard`로 lexical path와 real path를 모두 검사해 public root 밖의 직접 경로와 symlink target을 열지 않으며, 텍스트·PNG 응답을 같은 content type으로 buffer-safe하게 전달한다.
- discovery JSON field, requested/actual port, stale runtime request/job count, request URL의 active port, SIGINT 130·SIGTERM 143 종료 코드와 status 기록의 best-effort 성격은 유지했다.
- R5 web server 경계 정리는 완료했다. 다음 구현은 D1의 provider readiness·blocker 검증 흐름이며, 외부 provider 계정이나 production claim은 실제 승인·증적 없이 변경하지 않는다.

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

- 순서: harness browse → mission/action inbox → release lifecycle action → release navigation action → release render assembly → bootstrap/event wiring
- release 세부 경계:
  - R4.3.1 lifecycle action: preflight, refresh, regeneration, snapshot의 확인·취소 wiring
  - R4.3.2a navigation/state action: history, blocker, provider의 focus, filter, clear, toggle wiring
  - R4.3.2b copy action: triage, blocker, target evidence, handoff copy routing
  - R4.3.2c preview action: handoff preview toggle과 clear, release surface generic listener 제거
  - R4.3.3a overview rendering: 상태 요약, deterministic/reference 검증, runtime job, closeout checklist
  - R4.3.3b1 production blocker rendering: blocker view model, production blocker summary·detail, evidence link, gap
  - R4.3.3b2 current-open blocker rendering: filter action cluster, focused blocker, current-open list와 handoff
  - R4.3.3c history·provider rendering: release history와 provider readiness의 필터·상태 표시
  - R4.3.3d recommendation·handoff·document rendering: recommendation history, snapshot, handoff artifact, 문서 panel과 최종 release shell
  - R4.4a global event wiring: workspace·mission·memory·document form, run action, output tab, browser history, theme listener를 명시적 callback으로 연결
  - R4.4b bootstrap orchestration: theme 초기화 → event 연결 → 정적 surface render → 병렬 data load → URL state 복원 순서를 한 시작 경계로 이동
- 유지할 경계: browser ESM, no bundler, 현재 URL state, copy action, theme 초기화
- 완료 조건:
  - 각 모듈은 필요한 state와 callback을 명시적으로 받는다.
  - circular import가 없다.
  - 브라우저 module graph가 TDZ 없이 평가된다.
  - release render 모듈은 API 요청, permission 판단, mutation, URL state를 소유하지 않는다.
  - 각 하위 surface는 빈 상태와 정상 상태를 독립적으로 검증하며, 현재 audit id와 evidence 근거를 잃지 않는다.
  - bootstrap 모듈은 API와 mutation 구현을 직접 알지 않고 시작 순서와 오류 전달만 맡는다.
  - form submit과 browser history listener는 중복 등록되지 않으며 기존 alert·button recovery 동작을 유지한다.
- 검증: frontend module graph test, UI harness, execution console, browser E2E artifact restore smoke
- 커밋 묶음: 한 화면 영역과 해당 회귀 검증을 한 commit으로 묶는다.

### R5. Web server 경계 정리

release 문서 해석, runtime job, API request 처리, static serving을 분리한다. route table은 유지하고 handler 본문만 응집도에 맞게 옮긴다.

- 현재 기준: `src/web/server.mjs` 3,900줄. 인증·RBAC 선검사 뒤 `handleApi()` 안에서 exact/param route를 매 요청마다 등록하고, release read model·job 실행·mission/action handler가 같은 파일에 있다.
- 순서:
  - R5.1a release artifact resolver: handoff artifact id와 evidence document path를 허용 목록에서 해석하고 안전한 file path와 catalog entry를 반환한다. content type·파일명은 HTTP route에 유지한다.
  - R5.1b release markdown parser: bullet, section, checklist, deterministic/reference/live validation 항목 추출을 순수 parser로 옮긴다.
  - R5.1c release status assembler: parser 결과, provider readiness, blocker closure, git/artifact freshness를 받아 API payload를 만드는 read model로 분리한다.
  - R5.2a runtime job runner: request id, job kind, scope, summary, result/error 기록을 한 service 경계로 옮긴다.
  - R5.2b release command orchestration: refresh·preflight·snapshot의 확인 조건, runtime job 호출, release action audit 기록을 분리한다.
  - R5.3a route registry: exact/param route 등록과 match만 담당하고 auth·RBAC 이후에 dispatch한다.
  - R5.3b release handlers: status, blocker, artifact/doc read, refresh, preflight, snapshot 응답을 handler factory로 묶는다.
  - R5.3c1 action handlers: inbox query와 optional workspace tenant 검사, learning/provider/specialist/reviewer mutation 응답을 action factory로 옮긴다.
  - R5.3c2 mission handlers: mission tenant 검사, attachment 변환, document·memory·execution payload와 status code 선택을 mission factory로 옮긴다.
  - R5.4 static/server bootstrap: static path guard, discovery file, port fallback, shutdown 순서를 마지막에 정리한다.
- 완료 조건:
  - auth·RBAC·tenant 검사가 handler보다 먼저 실행된다.
  - path resolution은 기존 `path-guard`만 사용한다.
  - error status와 response payload가 유지된다.
  - release parser와 status assembler는 filesystem, HTTP request/response, process global을 직접 알지 않는다.
  - runtime job은 시작·완료·실패 기록과 request id 연결을 잃지 않는다.
  - route registry는 route table을 바꾸지 않고 exact route를 param route보다 먼저 평가한다.
  - static serving은 public root 밖의 path를 열지 않고 기존 content type과 404 동작을 유지한다.
- 검증:
  - R5.1: execution-v1 status, handoff, blocker, artifact hygiene, production readiness smoke와 parser fixture test
  - R5.2: runtime request/job registry, refresh preflight, snapshot confirmation, artifact refresh·restore smoke
  - R5.3: web auth/RBAC/OIDC, tenant isolation, action inbox, mission execution·document·memory smoke
  - R5.4: runtime discovery, static UI fetch, port fallback, shutdown smoke
- 커밋 묶음: R5.1a resolver, R5.1b parser, R5.1c read model, R5.2 job/orchestration, R5.3c1 action handler, R5.3c2 mission handler, R5.4 server bootstrap를 각각 응집된 commit으로 묶고 한 묶음이 검증되기 전에는 다음 경계를 옮기지 않는다.

### D1. 코드로 닫을 수 있는 후속 개발

리팩토링 묶음 사이에는 사용자 흐름을 실제로 단순하게 만드는 기능만 넣는다.

#### D1.1 Provider·blocker 검증 흐름 — 완료

- blocker의 기존 `closureVerification`, command, evidence document, required proof만 읽는 순수 흐름을 만든다. 화면에서 새 증거나 완료 상태를 추정하지 않는다.
- focused provider와 focused blocker에 필요한 증적 → 다음 검증 명령 → closure 판정을 같은 순서로 표시한다.
- provider에 blocker가 없으면 기존 preflight 명령만 안내하고, 존재하지 않는 증적이나 claim 판정을 만들지 않는다.
- 링크·명령은 복사와 열기만 제공한다. 실행, 승인, 권한 변경은 기존 lifecycle 경계에 둔다.
- 완료 조건: 두 화면이 같은 helper 계약을 사용하고, `productionReadyClaimAllowed`와 target boundary가 명시되지 않았을 때 이를 완료로 표시하지 않는다.

D1.1 구현 검증:

- `npm test`: 635개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E에서 console error 0건, page error 0건, release artifact preview 38회, open 2회가 모두 error-free였고 생성 artifact restore smoke를 통과했다.
- provider readiness, release blocker handoff, UI harness browse, web auth·RBAC 관련 smoke를 통과했다.
- 사용자 입력과 증적 경로는 escape하고 외부 링크에 accessible label과 `rel="noreferrer"`를 유지했다. API mutation, live validation 승인, clipboard fallback 권한 경계는 변경하지 않았다.

#### D1.2 Action inbox remediation·handoff — 완료

- 기존 action type, action class, permission decision만 읽는 순수 guidance 계약으로 `즉시 실행 가능`, `외부 승인·인계 필요`, `검토 후 실행`을 구분한다.
- 각 action card에 담당, 권한 record, 다음 command, 종료 증적을 같은 순서로 표시하고 summary에서 세 lane의 전체 건수를 보여준다.
- provider remediation은 `permission allow`가 기록된 경우에만 버튼을 노출한다. permission이 없거나 approval-required·deny이면 직접 실행하지 않는다.
- generic 미션 재실행은 실제 command가 `mission run`인 reviewer retry에만 허용한다. approval, owner handoff, maintenance, blocked follow-up, provider drift는 각 record의 command와 종료 증적을 안내한다.
- API mutation, confirmation prompt, web RBAC, reminder, audit record 생성 경계는 변경하지 않았다.

D1.2 구현 검증:

- `npm test`: 642개 통과
- action inbox guidance·UI·frontend module graph focused test 16개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- action inbox 13개 항목, provider action, provider attention remediation, specialist remediation, approval·approval inbox, learning promotion UI, web auth·RBAC smoke를 통과했다.
- 실제 browser E2E에서 pending approval card가 `external-handoff`, 담당 `human-approver`, resolution record로 표시되고 잘못된 rerun action이 없음을 확인했다. console error 0건, page error 0건, release artifact preview 38회, open 2회가 모두 error-free였고 생성 artifact를 복원했다.
- 문자열과 identifier는 escape하며 저장 schema, permission contract, provider contract, production-ready claim은 변경하지 않았다.

#### D1.3 Session·log lineage — 완료

- 기존 `agentRun`의 `missionId`, `sessionId`, `providerResponseId`, `attemptHistory`, `parentRunId`, `resumeFromRunId`, `artifactIds`만 읽는 순수 lineage 계약을 추가했다.
- 산출물 연결은 `agentRun.artifactIds`에 기록된 ID만 사용한다. 같은 세션에 있지만 run이 참조하지 않은 산출물은 별도 목록으로 두고 연결을 추정하지 않는다.
- provider response ID는 run의 실제 `endedAt`과 구분해 함께 표시하고, 산출물은 artifact의 실제 `createdAt`을 표시한다. response 자체 시각과 개별 retry timestamp처럼 저장되지 않은 값은 만들지 않는다.
- mission·session 불일치, response ID·시각 누락, retry 상세 누락, artifact record 누락을 run별로 함께 표시한다.
- 저장 schema, session API payload, provider contract, permission·RBAC·tenant 경계는 변경하지 않았다.

D1.3 구현 검증:

- `npm test`: 645개 통과
- session lineage·frontend module graph 집중 테스트 5개 통과
- session history, provider history·activity·retry telemetry, mission timeline 집중 smoke 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: 165개 통과
- 실제 browser E2E에서 선택 세션의 mission·session과 각 run의 provider response·retry·artifact 단계가 표시되고, stub provider의 미기록 response ID가 `연결 기록 없음`으로 드러나는 것을 확인했다. console error 0건, page error 0건, release artifact preview 38회, open 2회가 모두 error-free였고 생성 artifact를 복원했다.
- 문자열과 identifier는 escape하며 새 mutation, 외부 요청, 권한 변경, production-ready claim을 추가하지 않았다.

모든 D1 작업은 변경 전 관련 smoke가 현재 동작을 고정하지 못하면 먼저 회귀 검증을 추가한다. 커밋은 D1.1, D1.2, D1.3처럼 사용자 흐름 단위로 묶고, 검증되지 않은 외부 상태는 같은 커밋에서 완료로 올리지 않는다.

### D2. 외부 증적이 필요한 개발

아래 항목은 코드로 상태를 꾸미지 않는다. 실제 환경과 승인 자료가 있을 때만 실행한다.

- Anthropic billing/credit blocker 해소와 target-boundary live validation
- Hermes endpoint ownership, model pin, secret injection, tool-call/session lifecycle 증적
- hosted identity/session, tenant isolation, secret manager, observability/SLO 운영 증적
- production-like environment에서 나온 deployment·rollback·support evidence

각 항목은 preflight → live validation → artifact hygiene → snapshot refresh → 문서 claim 갱신 순서로 닫는다. 중간 단계가 실패하면 기존 release label을 유지한다.

### D3. API 비용 없는 내부 경계 정리

D2를 기다리는 동안 외부 API와 배포 환경이 필요 없는 리팩토링을 이어간다. 대상은 `mission-service.mjs` 안에서 이미 한 도메인으로 모여 있고, 기존 public API와 저장 schema를 바꾸지 않고 분리할 수 있는 흐름으로 한정한다.

#### D3.1 Memory write·fact graph sync — 완료

- memory scope·kind·content 검증, 부모 workspace·mission 확인, CRUD, fact graph 동기화·retire를 하나의 작은 service로 옮긴다.
- `mission-service.mjs`는 새 service를 조립하고 기존 `addMemory`, `updateMemory`, `deleteMemory`, `listMemory`, `listFactGraph` API를 그대로 노출한다.
- 단위 테스트는 잘못된 scope·kind·빈 content가 저장 전에 중단되는지, workspace·mission 검증이 유지되는지, update·delete가 fact graph에 이전 record를 전달하는지 확인한다.
- 완료 조건: 저장 형식, error message, CLI/API payload가 바뀌지 않고 fact graph와 retrieval 관련 smoke가 통과한다.

D3.1 구현 검증:

- `mission-memory-service.mjs`가 기존 memory public method 5개를 소유하고, `mission-service.mjs`는 같은 이름으로 조립해 노출한다.
- 새 단위 테스트 10개와 mission memory handler를 포함한 집중 테스트 19개가 통과했다.
- `npm run smoke:fact-graph-memory`: graph node 3개, edge 1개, retired node 2개로 통과했다.
- `npm test`: 655개 통과
- `npm run smoke:docs-gates`: 33개 통과
- `npm run smoke:all`: live provider와 browser E2E를 제외한 deterministic smoke 165개 통과
- 실제 browser E2E에서 memory·attachment retrieval handoff 6개, release artifact preview 38개, open 2개가 모두 error-free였고 console error와 page error는 0건이었다. timeout 실패 시 기존 artifact를 복원하는 smoke도 통과했다.
- 외부 provider 호출, 저장 schema, CLI/API payload, tenant·RBAC·permission 경계, release claim은 변경하지 않았다.

#### D3.2 Execution mutation·rollback boundary

- manifest에서 mutation bundle을 만드는 계산, path state·audit·rollback plan 조립, 실제 filesystem write와 child process 실행을 순서대로 분리한다.
- 먼저 순수 계산을 옮기고, 실행·중단·rollback lifecycle과 path guard는 검증이 갖춰진 뒤 이동한다.
- 완료 조건: approval, execution lease, path containment, secret-like path 차단, mutation audit, rollback preview·실행 결과가 기존과 동일하다.

D3.2는 아래 순서로 진행한다.

1. D3.2a mutation primitives: edit content 계산, text hash·line count, rollback preview, mutation audit, preview·execution batch summary를 I/O 없는 모듈로 옮긴다.
2. D3.2b filesystem state·bundle: directory/file state 수집과 mutation bundle 예측을 묶되 path containment와 secret-like path 차단은 그대로 유지한다.
3. D3.2c rollback plan·execution: 현재 상태 hash guard, snapshot 검증, reverse order plan과 실제 restore/delete를 분리한다.
4. D3.2d runner lifecycle: step 실행, verification, log, stop, lease·session 종료 기록을 명시적인 lifecycle 순서로 정리한다.

각 하위 단계는 앞 단계가 전체 execution smoke까지 통과한 뒤 시작한다. 파일 쓰기와 child process를 다루는 D3.2b 이후에는 dry-run과 실제 temp workspace 실행을 모두 검증하며, path·secret·approval guard를 약화하는 변경은 중단 조건으로 취급한다.

D3.2a 구현 검증:

- 순수 mutation primitive 단위 테스트 `24/24` 통과
- 전체 unit test `679/679` 통과
- docs gate `33/33` 통과
- 전체 smoke `165`개 중 `163`개 통과, 구현 중 artifact commit 불일치만 감지한 release freshness gate `2`개는 evidence refresh 단계로 이월
- execution flow·CLI smoke 통과
- 실제 browser E2E와 artifact restore 통과, browser console/page error `0`건
- provider live 명령과 외부 API 호출은 실행하지 않음

#### D3.3 Provider read model·event aggregation

- 저장된 probe·run·attention·fallback record를 provider status, overview, history, timeline으로 바꾸는 읽기 흐름을 live probe 실행과 분리한다.
- provider registry 조회와 `probeProvider` mutation은 기존 경계에 남기고, read model은 전달받은 record만 해석한다.
- 완료 조건: failure taxonomy, retry·cost telemetry, attention recovery, fallback stop reason, filter 결과가 기존 smoke와 동일하다.

#### D3.4 Mission run·fallback orchestration

- specialist stage, quality gate, provider attempt, fallback policy, session closeout의 순서를 작은 orchestration 경계로 나눈다.
- live provider는 호출하지 않고 stub provider와 deterministic failure fixture만 사용한다.
- 완료 조건: approval 대기, reviewer failure, parallel specialist merge, `provider-failure-only`, `recoverable-provider-failure-only`, artifact lineage가 유지된다.

#### D3.5 Harness·action·timeline read boundaries

- harness document/memory browse와 mission summary, action/escalation inbox, mission/workspace/operator timeline을 서로 다른 read model로 정리한다.
- reminder·acknowledgement·resolution처럼 기록을 쓰는 동작은 읽기 조립과 함께 옮기지 않는다.
- 완료 조건: tenant·RBAC·permission 판단, owner handoff, reminder cadence, audit event ordering, UI payload가 바뀌지 않는다.

D3는 D3.1부터 순서대로 진행한다. 각 묶음은 focused unit test와 deterministic smoke를 먼저 통과한 뒤 `npm test`, `npm run smoke:docs-gates`, `npm run smoke:all`로 닫는다. provider live 명령, 유료 배포, release claim 갱신은 포함하지 않는다.

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
