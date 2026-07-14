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
| R5 Web server boundary | 진행 중 | release artifact resolver부터 parser·status assembly·job orchestration 순으로 분리 |
| R5.1a Release artifact resolver | 완료 | handoff artifact와 evidence doc allowlist·경로 검증을 HTTP 독립 모듈로 분리 |
| R5.1b Release markdown parser | 완료 | release markdown의 section·checklist·deterministic·reference·live validation 추출을 순수 parser로 이동 |
| R5.1c Release status assembler | 완료 | parser 결과와 provider·blocker·artifact freshness를 받는 순수 API read model로 분리 |
| R5.2a Runtime job runner | 완료 | request id·job kind·scope·result/error lifecycle을 registry-backed service로 이동 |
| R5.2b Release command orchestration | 완료 | refresh·preflight·snapshot 확인 조건, runtime job 호출, release action audit 순서를 HTTP 독립 service로 이동 |
| R5.3a Route registry | 다음 작업 | exact/param route 등록과 match를 분리하고 기존 auth·RBAC 이후 dispatch 순서를 유지 |

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
  - R5.3c mission/action handlers: tenant 검사, payload parse, service 호출, status code 선택을 도메인별 handler factory로 옮긴다.
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
- 커밋 묶음: R5.1a resolver, R5.1b parser, R5.1c read model, R5.2 job/orchestration, R5.3 handler domain, R5.4 server bootstrap를 각각 응집된 commit으로 묶고 한 묶음이 검증되기 전에는 다음 경계를 옮기지 않는다.

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
