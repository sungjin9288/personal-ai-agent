# 변경 인계 검증 — 개발 계획과 실행 기록

현재 포트폴리오 기술 범위는 **D1–D4 구현, D5 synthetic 평가, portable 검토 round-trip까지 로컬 검증 완료**다. 원래 D5의 사람 효과 평가는 미측정이다. 단계별 계약은 아래 현재 구현 기준을 따르며, 날짜가 있는 실행 기록은 당시 결과와 권한을 보존한다. 기존 공개본의 검증 이력은 [현재 계약 정합성 마감](#현재-계약-정합성-마감--2026-10-01), 후속 준비 범위는 아래 연습 환경 절을 따른다.

## 연습 환경과 평가 준비 — 2026-10-02

새 평가 repository를 사용자에게 요청하는 절차를 없애고, 기존 D2/D3와 synthetic fixture로 직접 써볼 수 있는 환경을 만든다. `scripts/prepare-delivery-evidence-practice.mjs`는 새 임시 디렉터리 안에 clean Git fixture, 실제 native Node receipt/import 결과, 정상·누락·stale packet, 선언 영향 입력과 미작성 평가 기록지를 준비한다. 생성된 `start.mjs`는 별도 runtime에서 기존 web server를 loopback·port 0으로 시작하며 provider와 사용자 runtime 설정을 상속하지 않는다. 원본 repository·remote는 변경하지 않는다.

완료 기준은 실제 생성 명령 → native tests → 등록된 workspace의 HTTP 판정 → launcher 종료와 source 보존 확인이다. 잘못된 옵션·준비 실패는 원본에 영향을 주지 않고, 부분 산출물의 위치와 단계를 보고해야 한다. 사례의 정답과 기록지는 synthetic 자가 점검용이며 사람 평가 결과를 생성하지 않는다. source 범위는 위 script, `test/delivery-evidence-practice.test.mjs`, 이 계획과 기존 case study다. 독립 review와 관련 회귀 후 로컬 마감하며 새 commit·push·PR·merge와 SHA-bound artifact 갱신은 별도 workflow다.

**로컬 완료:** 준비 명령 부재로 2건 RED를 확인한 뒤 구현했고, 실패 시 부분 디렉터리 보존을 더한 전용 검사 3/3 PASS를 확인했다. 실제 Node fixture 3건 PASS → importer → current/missing/stale HTTP 판정, 영향 입력의 recheck-required, Git clean 유지, 환경변수 격리와 launcher 종료를 검증했다. `npm run test:delivery-evidence`는 217/217 PASS였고, `npm test`는 Node v24.18.0 / Darwin arm64에서 총 2,213, PASS 2,212, fail/cancelled 0, skip 1, exit 0, 약 261.47초였다.

docs precloseout는 `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout` 59/59 PASS, Portfolio 문서 claim 검사·두 실행 파일의 `node --check`·`git diff --check`도 통과했다. 기존 SHA-bound closeout을 제외한 source 단계의 결과이며 새 release evidence는 아니다. Ego Lite에서는 생성된 세 JSON 파일을 실제로 열어 current/missing/stale 표시를 확인했다. 독립 read-only Agent review의 차단 지적은 없었고, 도구 revision 기록 안내·중복 launcher 실행 방지 안내·연습 범위를 보완했다.

연습 자료와 실제 사용자 기록지는 준비됐으며 D5 사람 효과 평가는 여전히 미실시다. 실행 로그·화면 확인은 Agent 기술 QA이고, 참가자의 판단·시간·사용 의사는 대신 작성하지 않았다. 위 로컬 완료 시점에는 commit·push·원격 CI·merge를 수행하지 않았다.

**후속 공개 workflow 승인:** 네 source 파일의 grouped commit을 먼저 고정하고, 해당 SHA에 official local-v1 closeout·execution reuse refresh·clean rehearsal·production-like drill·pilot export·Portfolio를 결속한 별도 generated evidence commit을 만든다. 기존 origin에 push한 뒤 ready PR과 required CI를 확인한다. merge·배포·새 live provider 실행은 제외한다. 이 문장은 실행 권한과 순서를 기록하며, 완료 여부는 생성 증적과 실제 PR head의 검사 결과로 확인한다.

## 추가 완성 범위 — portable 검토 round-trip (2026-10-01)

사용자는 포트폴리오 완성도를 위한 추가 로컬 개발을 요청했다. 이전 D1–D5 구현·공개 이력을 보존하고, 실제 사용자 흐름에서 남은 두 단절을 해결한다. 다운로드한 검토를 다시 열 때 메모가 사라지는 문제와 CLI에만 있던 D4 영향 판정을 기존 검토 화면에서 함께 처리한다. 서버 영속 history·자동 Git diff·dependency 추론·서명·실사용 효과 측정은 추가하지 않는다.

계획은 별도 Astra Agent가 실제 source를 읽고 비교했다. 주관 Agent와 backend Agent가 서로 다른 파일을 소유해 구현하며 독립 Agent가 다시 검토한다. 모델을 교체하기 위해 별도 Orca routing이나 Goal resource를 만들지 않는다.

- **계약:** 기존 workspace+packet `bindingDigest`는 유지한다. `delivery-review-bundle/v1`은 workspace, packet, 검토 기록, 선택적 impactInput을 canonical SHA-256으로 결속한다. digest는 수정 탐지용이며 누구나 재계산할 수 있고, 서명·진위·개인 인증이 아니다. 복원된 이름과 원래 시각도 자기 선언 기록이다.
- **복원:** 파일은 bounded UTF-8 JSON으로 읽고 기존 POST route에서 현재 등록 workspace의 clean source를 전후 확인한다. 제출한 report·Markdown은 복원 계약에 포함하지 않고 다시 계산한다. source·workspace·review binding이 다르면 복원하지 않는다. 이전 형식의 메모 포함 export는 자동으로 packet으로 축소하지 않고 명시적으로 거부한다. D1 packet과 D2 importer 입력은 계속 지원한다.
- **영향:** 기존 D4 판정기를 재사용한다. project/current revision과 requirement ID·criterion digest가 현재 packet과 정확히 같아야 한다. baseRevision, 변경 경로, graph는 선언형이다. 영향 입력을 편집하면 내보내기를 막고 재판정 후 메모·원래 시각과 함께 새 bundle을 만든다. D4는 D1 판정·CI 생략·PASS 재사용·실행 권한을 바꾸지 않는다.
- **실패:** 파일 읽기·HTTP의 오래된 응답은 epoch/workspace로 격리한다. 잘못된 영향 입력이나 네트워크 실패가 이미 반영한 메모를 지우지 않게 이전 결과를 보존하되, 다시 확인되기 전에는 내보내지 않는다. compact export의 크기는 다시 업로드 가능한 한도 안에 둔다.
- **파일 범위:** `src/core/delivery-evidence-review.mjs`, `src/web/delivery-evidence-handlers.mjs`, `src/web/public/lib/delivery-evidence-review.js`, `src/web/public/index.html`, 대응 review/http/ui tests, 이 계획, case study, README의 사용 설명. 새 package·route·store schema·provider contract는 없다.
- **완료 기준:** 복원·시각 보존·D4 cross-binding·오래된 응답·입력 한도·권한 회귀의 RED→GREEN, 실제 Node receipt→importer→HTTP→restore, 실제 desktop/mobile browser의 파일 열기·영향·메모·JSON/Markdown 다운로드, focused/full test 및 관련 UI smoke, 독립 diff review.
- **권한 경계:** 로컬 source/test/docs와 임시 synthetic fixture만 변경한다. 이 repository의 commit·push·PR·merge, 유료 provider·학습·실데이터·공개 배포, 기존 resource cleanup은 제외한다. SHA-bound closeout와 Portfolio artifact는 source commit 승인 뒤 갱신하며 이번 미commit snapshot의 검증으로 취급하지 않는다.

아래 이전 단계의 기록은 해당 시점의 이력이다. 이번 round-trip의 실제 검증 결과는 이 절에 추가하며 과거 검증 수치를 덮어쓰지 않는다.

### Round-trip 구현과 검증 완료 — 2026-10-01

- Backend TDD는 신규 core/handler 10건이 구현 전 모두 실패했고, core와 실제 HTTP 최종 검사는 `node --test --test-concurrency=4 test/delivery-evidence-review.test.mjs test/delivery-evidence-http.test.mjs` 28/28 PASS였다. 원래 메모·ISO 시각 보존, exact schema/digest/workspace, D1/D4 criterion 교차 결속, tenant/role, source drift, near-limit packet 거부를 확인했다.
- UI 초기 RED는 `node --test test/delivery-evidence-ui.test.mjs` 9 PASS / 8 FAIL이었다. 독립 리뷰에서 추가로 발견한 오류 응답의 메모 손실은 별도 RED 17 PASS / 1 FAIL 뒤 수정했다. 마지막 UI gate는 20/20 PASS이며, 큰 graph 교체 시 이전·새 graph를 중복 전송하지 않는 native WebCrypto 결속과 같은 workspace의 지연 응답 회귀를 포함한다. 새 controls 13개의 literal ARIA/title 계약도 유지한다.
- 최종 `npm run test:delivery-evidence`는 192/192 PASS, exit 0이다. 마지막 크기·비동기 수정 후 `npm test`를 다시 실행해 총 2,179 / PASS 2,178 / fail 0 / cancelled 0 / skip 1, exit 0, 약 208.28초를 확인했다. Node v24.18.0 / Darwin arm64이며 기존 Linux 전용 skip은 그대로다. 앞선 전체 실행 2,177건을 마지막 snapshot 결과로 재사용하지 않았다.
- `npm run smoke:ui-harness-browse`, `npm run smoke:web-oidc-rbac`, `npm run smoke:web-tenant-isolation`, `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`(59/59), `npm run smoke:release-artifact-hygiene`, touched executable의 `node --check`, `git diff --check`가 통과했다. closeout 제외는 uncommitted source 단계의 기존 precloseout 계약이며 final release gate 통과를 뜻하지 않는다. Hygiene는 기존 e8e3c960 source evidence를 검사했으며 새 구현의 SHA-bound evidence가 아니다.
- 실제 browser는 자체 임시 clean Git fixture에서 native Node receipt → importer 파일 → web 판정 → keyboard 메모 반영 → 선언 영향 → JSON/Markdown 다운로드 → 새로고침 → 파일 복원 → 재다운로드를 실행했다. 전후 JSON 파일의 SHA-256은 모두 `d8598543e759e1698f71f08320f360536ed722a90c673efbde17cee8f53a425e`였다. 메모·원래 시각·영향·digest가 byte-identical이며, 잘못된 영향 입력에 메모를 보존하고 export를 막는 것까지 확인했다. 이름과 사례는 synthetic이며 실제 참여자 효과 측정이 아니다.
- Ego Lite에서 390px viewport/document width가 모두 390인 모바일 사용과 다운로드를 확인했다. 넓은 화면은 허용된 localhost in-app preview에서 1,910px viewport/document width 일치와 배치를 시각 확인했다. Desktop preview를 모바일 다운로드·keyboard 회귀나 screen-reader 검증으로 확대하지 않는다. 검증용 tab/server만 종료했고 자체 fixture·receipt·download·screenshot은 외부 임시 경로에 보존했다.
- 별도 Astra Agent의 최종 정적 review는 PASS이며 메모 손실·큰 graph 중복 전송 지적의 수정도 재확인했다. 실제 테스트와 browser 실행은 주관 Agent의 별도 증거다. 새 dependency·store schema·route·provider contract는 추가하지 않았다.

**로컬 구현 완료 당시:** portable 검토 round-trip과 D4 web 통합의 로컬 구현·회귀·실제 사용 검증을 완료했다. Branch는 `codex/delivery-review-roundtrip`, HEAD/main/origin-main은 `e71a70f9b4e421915cf82bf756c1f61ca5a9fead`, index는 비어 있었다. 승인 범위의 source/test/docs 10개만 dirty이며 기존 worktree와 visual manifest를 보존했다. 이 시점에는 source commit·SHA-bound evidence refresh·push·PR·CI·merge·공개 배포를 하지 않았다. 원래 제품 전체의 provider·실제 학습·hosted production 및 사람의 효과 검증이 완료됐다는 의미가 아니다.

### Round-trip 공개 마감 — 2026-10-01

사용자는 grouped source commit → 해당 SHA의 generated evidence → push → ready PR → CI 순서에 이어 진행을 승인했다. 실행 전 변경 10개의 SHA-256이 로컬 검증 receipt와 모두 일치하고, index가 비어 있으며 원격 main이 위 시작 SHA를 유지함을 확인했다. 이 문서의 실행 단계 기록 외에는 검증된 source를 바꾸지 않는다.

기존 official local-v1 builder, execution refresh(`--reuse-existing-deterministic`), clean rehearsal, production-like drill, 최종 pilot export, Portfolio refresh/check를 순서대로 실행한다. fresh precloseout 검사와 재사용한 deterministic/live 증거의 원래 SHA·시각·상태를 구분한다. 기존 visual manifest는 외부에 보존한 뒤 pipeline이 재생성하는 해당 경로만 허용하며 stage하지 않는다. source 10개를 하나의 commit으로 고정하고 generated allowlist만 별도 commit으로 묶는다. 실제 source/evidence SHA와 최종 검증·CI 결과는 generated evidence와 PR에 남긴다. merge·배포·실제 provider 호출·학습·실데이터·기존 resource cleanup·history 재작성은 제외한다.

## 병합 후 재현 안내 점검 — 2026-10-01

사용자의 다음 단계 요청에 따라 main `55a60639bb3f4f4e876280784fd0ce6b582ac23d`의 계획·구현·사용 안내를 대조했다. 포트폴리오 기술 범위와 실제 사용자 효과 평가를 구분하고, 새 기능 대신 기존 case study에 직접 점검할 순서·예상 결과·중단 기준을 모았다. 이 절과 case study만 수정하며 runtime·test·README·release artifact는 변경하지 않는다.

- `node scripts/demo-delivery-evidence.mjs --format markdown` 및 `--format json`: exit 0. current → stale/no-declared-impact → stale/recheck-required → stale/unknown과 권한 불변을 확인했다.
- `node scripts/evaluate-delivery-evidence.mjs --format markdown` 및 `--format json`: exit 0. 기존 synthetic 12건에 candidate/reference가 모두 정답 12, 불일치 0을 출력했다. 새 사람 평가나 우위 측정이 아니다.
- `node scripts/check-delivery-impact.mjs < examples/delivery-evidence/impact.json`: exit 2, `recheck-required`. fixture의 정상적인 보류 결과다.
- `npm run test:delivery-evidence`: Node v24.18.0 / Darwin arm64에서 총 192, PASS 191, fail 0, cancelled 1, exit 1, 약 38.96초. `delivery-evidence-http.test.mjs`의 상위 통합 검사가 25초 timeout으로 취소됐다. 이 실행은 **미통과**이며 이전 192/192 기록으로 덮지 않는다.
- 같은 파일을 `node --test test/delivery-evidence-http.test.mjs`로 단독 실행했을 때 2/2 PASS, exit 0, 약 16.47초였다. timeout·assertion·병렬 설정은 변경하지 않았다. 실패 후 관찰한 host load average는 31.97/27.82/24.74였으나, 부하 수치와 단독 PASS만으로 원인을 확정하거나 병렬 안정성을 입증하지 않는다.

자가 점검 안내는 보완했지만 이번 관련 회귀 전체를 PASS로 마감하지 않는다. 남은 기술 확인은 **동일 병렬 조건의 HTTP timeout 원인 분리와 안정성 확인**이다. 새 browser 검증·전체 `npm test`·원격 CI·사람의 D5 효과 평가는 이번 단계에서 실행하지 않았다. commit·push·PR·merge·provider 호출·기존 resource cleanup도 하지 않았다. SHA-bound closeout과 Portfolio ZIP은 기존 병합본을 유지하며, 이번 미commit 문서 수정의 새 release evidence가 아니다.

### HTTP timeout 후속 보완 — 2026-10-01

사용자의 이어 진행 요청에 따라 위 미완료 검사를 조사하고 `src/core/delivery-evidence-import.mjs`와 대응 test만 보완했다. 앞 단계의 문서 변경과 실패 기록을 보존한다. timeout·assertion·file-level 병렬도 4는 바꾸지 않는다.

- 수정 전 같은 `npm run test:delivery-evidence`에서 191 PASS / cancelled 1, exit 1로 25초 HTTP timeout을 재현했다. source capture 3회 계측에서는 Git 조회 36회가 약 1.06초를 차지했다. 이 수치가 모든 timeout의 단일 원인을 입증하지는 않는다.
- 고정 metadata argv(`rev-parse --path-format=absolute --git-common-dir HEAD`)를 같은 synthetic repository와 제한 환경에서 10회씩 순차 실행했다. macOS 시스템 Git 런처는 약 725ms, `xcrun --find git`이 선택한 동일 Apple Git 실행 파일은 약 103ms였다. 단일 microbenchmark이며 일정한 host 부하나 제품 전체의 개선율을 입증하지 않는다.
- common directory와 HEAD 조회만 묶어 capture당 Git 조회를 12회에서 10회로 줄였다. 첫 세-query 통합안은 LF가 있는 wrong-root를 잘못 허용하는 반례가 독립 review에서 발견됐고, 회귀 RED를 확인한 뒤 폐기했다. 최종안은 root의 기존 exact 비교, 두 Git 관찰, index 비교, raw bytes/mode 재독, source identity와 drift 거부를 유지한다.
- Darwin에서는 capture마다 고정 `/usr/bin/xcrun --find git`으로 시스템 선택 Git을 한 번 확인하고 같은 실행 파일로 전후 조회한다. resolver도 기존 제한 환경·10초 timeout·4 MiB buffer를 사용한다. absolute regular executable 검사 실패는 `source-git-executable`로 거부하며 다른 Git으로 fallback하지 않는다. source나 실행 파일 경로를 전역 cache하지 않는다. 다른 OS의 제한 PATH를 이용한 Git 실행은 유지한다. Darwin은 시스템 개발 도구의 Git을 `xcrun`으로 찾을 수 있어야 하며 새 설치·Homebrew 전환은 하지 않았다.
- TDD: query-count 계약의 RED(10 PASS / 1 FAIL), LF root 경계 반례의 RED(0 PASS / 1 FAIL), native Git 선택·거부의 RED(0 PASS / 7 FAIL)를 각각 확인했다. 최종 회귀는 공백/LF root·linked detached worktree·SHA-256·unborn HEAD·Git 오류·전후 drift·resolver 실패/timeout/경로·무fallback·capture마다 재조회까지 포함한다.
- 최종 `npm run test:delivery-evidence`: Node v24.18.0 / Darwin arm64에서 **213/213 PASS**, fail/cancelled/skip 0, exit 0, 약 35.75초. HTTP 통합은 기존 25초 제한 안에서 약 14.62초였다. 조회 통합만 적용한 중간 실행의 HTTP timeout도 유지 기록이며, 최종안과 구분한다.
- 별도 Agent의 최종 source/test 정적 review는 PASS였다. Agent review는 주관 Agent의 실제 테스트나 사람의 인수를 대신하지 않는다. 수정 파일 `node --check`와 `git diff --check`도 통과했다.

- 전체 `npm test`: **총 2,200 / PASS 2,198 / fail 1 / cancelled 0 / skip 1**, exit 1, 약 778.71초였다. HTTP 통합은 약 22.72초로 통과했지만, 변경하지 않은 `local-training-process-supervisor.test.mjs`의 invalid-result 사례가 1초 제한에 걸려 `timeout`으로 종료돼 기대 코드와 달랐다. 기존 Linux 전용 skip 1개를 유지했다.
- 해당 실패만 `node --test --test-name-pattern='rejects invalid output after safe quiescence' test/local-training-process-supervisor.test.mjs`로 실행하면 같은 1초 제한에서 **1/1 PASS**, exit 0였다. 이 경로는 변경한 delivery importer를 사용하지 않는다. 단독 PASS로 전체 실패를 대체하거나 host 부하만으로 원인을 확정하지 않는다. supervisor 코드·timeout은 변경하지 않았다.
- `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`: **59/59 PASS**, exit 0. 미commit source 단계의 기존 precloseout 계약이며 새 SHA의 official closeout을 생성한 것은 아니다. 최종 diff 검사에서 source/test hash가 검증 실행 때와 같고 기존 case study 변경도 그대로임을 확인했다.

재현된 delivery HTTP 경로의 수정과 focused 검증은 완료했으나 **전체 suite는 위 supervisor 실패로 미통과**다. 다음 기술 확인은 해당 1초 fixture의 병렬 조건 분리다. 위 결과는 해당 로컬 기능·회귀 범위에 한하며 임의의 host 부하에 대한 시간 보장, Linux 실측, 원격 CI, D5 사용자 효과 또는 새 release evidence로 확대하지 않는다. repository commit·push·PR·merge·provider 호출·기존 resource cleanup은 이번 범위 밖이다.

### Supervisor 실패 분류 검증 계획 — 2026-10-01

현재 전체 회귀의 유일한 실패를 다음 순서로 보완한다. 시작 HEAD는 `55a60639bb3f4f4e876280784fd0ce6b582ac23d`이고 앞선 네 dirty 파일을 보존한다. 추가 수정은 `test/local-training-process-supervisor.test.mjs`와 이 기록으로 제한한다. 독립 Agent는 read-only 분석·review를 담당하고 주관 Agent가 수정·실행·결과를 확인한다.

1. **원인 경계:** supervisor는 spawn에서 실행 timer를 시작하고 close·authority·group absence 확인 뒤 JSON을 파싱한다. 먼저 발생한 timeout을 invalid-result로 덮지 않는 것은 기존 fail-closed 계약이다. 약 1,115ms의 실패와 단독 PASS만으로 runtime 결함이나 host 부하의 단일 인과를 주장하지 않는다.
2. **최소 보완:** 기존 spawn/process-group 주입 지점과 Node test mock timers로 999ms invalid close와 1,000ms timeout 우선순위를 결정적으로 검사한다. 실제 invalid JSON subprocess 통합은 유지하고 해당 사례에만 5초의 fixture 완료 예산을 명시한다. 앞선 단계의 timeout 불변 방침과 달리 이 test-local 예산만 의도적으로 변경하며, production deadline·기본 helper 예산·40ms 실제 timeout·권한 회수·descendant 보존·assertion은 완화하지 않는다.
3. **검증:** focused supervisor와 관련 runtime 검사 → 같은 `--test-concurrency=4`의 전체 `npm test` → docs precloseout gate·문법·diff·독립 review 순서로 진행한다. 이전 실패는 유지하고 새 실행 결과와 구분한다. 새로운 실패는 원인과 범위를 확인하며 무관한 timeout을 일괄 늘리지 않는다.
4. **종료선:** 현재 로컬 snapshot의 수정·회귀 결과와 잔여 조건을 이 문서에 기록한다. commit·push·PR·merge·새 release evidence·provider 호출·실제 학습·배포·기존 resource cleanup은 수행하지 않는다. D5 사람의 효과 평가는 이번 자동 검사로 대체하지 않는다.

**전체 회귀에서 발견한 추가 범위:** supervisor 집중 검증 32/32 이후 전체 검사에서 기존 HTTP parent가 다시 25초 제한을 초과했다. 이 parent에는 fixture 준비, 각각 최대 15초인 reporter/importer, 성공 HTTP 13회와 거부·revision 변경 경로가 누적된다. 개별 요청의 25초 초과나 product source 검증의 결함을 입증한 것은 아니다. `test/delivery-evidence-http.test.mjs`도 보완 범위에 포함해 인증/실패 검토, native receipt/export/revision, impact/위조 거부의 세 독립 fixture로 나눈다. **전체 흐름의 합산 25초 제한을 각 독립 scenario의 25초 제한으로 변경**하므로 총 허용 시간이 늘어난다. source 관찰·권한·기존 assertion·reporter/importer 15초 제한·병렬도는 유지한다. 요청과 서버 준비 대기는 owning test의 abort signal에 연결하며, 준비 대기의 별도 `100 × 30ms` 횟수 제한 대신 scenario의 25초를 공유한다. 서버가 먼저 종료하면 즉시 실패한다. fixture 서버 → JWKS → 해당 임시 root 순으로 정리하며 기존 사용자 resource는 대상이 아니다.

이 단계의 실행 기록:

- 새 virtual-time 경계 검사: `node --test --test-name-pattern='before the deadline|preserves timeout' test/local-training-process-supervisor.test.mjs` **3/3 PASS**, exit 0. 실행 timer가 시작된 뒤 999ms invalid close와 1,000ms 이후 valid/invalid 결과를 구별했다. 실제 OS process-group 부재나 임의 host 부하에서의 완료 시간을 증명하는 검사는 아니다.
- 외부 임시 loader가 테스트 프로세스 안에서만 supervisor deadline을 1ms 앞당긴 mutation은 0 PASS / 1 FAIL, 먼저 발생한 timeout을 제거한 mutation은 0 PASS / 2 FAIL로 거부됐다. 저장소 production 파일은 바뀌지 않았다. 실제 runtime 결함을 수정한 RED→GREEN으로 표현하지 않는다.
- `node --test --test-concurrency=4 test/local-training-process-supervisor.test.mjs test/local-training-runtime.test.mjs test/local-candidate-evaluation-process-lifecycle.test.mjs`: **32/32 PASS**, exit 0. real subprocess invalid-result, 실제 timeout, 권한 회수와 descendant 보존 검사를 포함한다. supervisor 변경의 독립 정적 review에서 추가 지적은 없었다.
- HTTP 분리 직후 `node --test test/delivery-evidence-http.test.mjs`는 **PASS 0 / fail 2 / cancelled 1**, exit 1이었다. 이 실행은 기존 전체 회귀와 겹쳤으며, 두 실패는 서버 discovery의 기존 횟수 제한, 나머지는 25초 scenario timeout이었다. 단순히 host 부하만을 원인으로 확정하지 않는다. discovery를 owning test deadline에 결속했고, review에서 지적한 plain bundle 복원 뒤 source clean assertion도 복원했다. 이후 검증 결과와 이 실패를 구분한다.
- 이 단계 첫 전체 `npm test`는 **총 2,203 / PASS 2,196 / fail 4 / cancelled 2 / skip 1**, exit 1이었다. HTTP parent timeout과 하위 거부 응답의 기대값 불일치, Darwin CPU probe의 network-control JSON 오류와 15초 fixture timeout, supervisor 정상 결과의 1초 timeout 및 descendant PID 준비 실패를 기록했다. HTTP 분리 전 snapshot의 실행이며 최종 변경 전체의 검증 결과가 아니다.
- 이 실행에서 supervisor test worker와 정확히 맞물린 stdout/stderr socket을 가진 synthetic descendant 하나가 남아 runner 종료를 막았다. signal spy가 이른 timeout의 신호를 기록만 한 채 전달하지 않아 worker가 이후 자식을 만들 수 있는 경로를 확인했다. PID·시작 시각·command·process group·양방향 socket identity를 재확인한 뒤 이번 fixture 하나만 SIGKILL해 결과를 회수했다. 기존 사용자 resource는 변경하지 않았다.
- supervisor 정상 결과·invalid 결과·leader-exit 통합의 세 사례에만 5초 fixture 완료 예산을 적용한다. spy는 실제 live-leader signal을 전달하면서 기록하며, 40ms 실제 timeout 검사가 SIGKILL 1회와 안전한 정리를 확인한다. no-late 검사의 signal 0회·descendant 생존·cleanup 불허 assertion은 유지한다. assertion 실패 시에도 after hook이 해당 fixture PID 파일을 확인해 descendant를 정리한 뒤 임시 root를 제거한다. production supervisor와 기본 helper 1초·가상 999/1,000ms 경계는 바꾸지 않는다.
- HTTP 최종 분리본의 단독 실행은 **3/3 PASS**, exit 0, 약 12.44초였다. 이 결과로 첫 전체 실패나 Darwin host 검증을 PASS로 대체하지 않는다.
- `npm run test:delivery-evidence`: 최종 분리본에서 **214/214 PASS**, fail/cancelled/skip 0, exit 0, 약 17.23초. 별도 fixture들이 같은 file-level 병렬도 4에서 인증·native receipt·복원·영향·위조·revision 거부를 확인했다.
- supervisor fixture 보완 후 단독 검사는 **11/11 PASS**, exit 0이었다. 이후 after hook의 PID 파일 fallback을 보완하고, 외부 loader로 PID 변수 설정 전 assertion 실패를 주입했다. 예상한 `synthetic cleanup failure` 1건과 exit 1을 약 5.2초에 반환해 열린 stdio로 runner를 붙잡지 않았다. production·test 파일 bytes는 failure injection으로 바뀌지 않았다. 최종 정적 review에서도 추가 지적은 없었다.
- `node --test test/local-training-os-isolation.test.mjs`: 변경하지 않은 OS-isolation 검사 **5/5 PASS**, exit 0. 앞선 전체 실행의 실패와 구분하며 전체 병렬 조건의 안정성을 대신하지 않는다. 기존 CPU·network·POSIX 한도와 assertion은 수정하지 않았다.
- 최종 `npm test`는 Node v24.18.0 / Darwin arm64, 기존 `node --test --test-concurrency=4 test/*.test.mjs`에서 **총 2,204 / PASS 2,203 / fail 0 / cancelled 0 / skip 1**, exit 0, 약 313.10초였다. 기존 Linux 전용 skip을 유지했다. HTTP 세 scenario는 각각 약 4.15/7.85/7.46초였으며, supervisor 11건과 앞서 실패했던 Darwin 검사도 같은 전체 실행에서 통과했다. 다른 test/smoke를 동시에 실행하지 않았고 검사 대상 source/test hash가 종료 후에도 동일했다. 이전 실패와 이번 PASS는 서로 다른 실행으로 보존한다.
- 최종 `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout` **59/59 PASS**, `npm run smoke:release-artifact-hygiene`, 수정 executable의 `node --check`, `git diff --check` 모두 exit 0이었다. docs 제외 항목은 기존 precloseout 계약이며, hygiene는 기존 artifact 검사이지 현재 dirty source의 새 SHA-bound release 증거가 아니다.

**이번 로컬 마감:** HTTP scenario 격리, supervisor deadline 분류와 실패 시 fixture 정리, 관련 회귀·전체 검사·독립 정적 review를 완료했다. main/원격 추적 ref·이전 branch/worktree·앞선 importer와 case study 변경을 보존했으며 index는 비어 있다. 변경 6개 파일은 uncommitted다. commit·push·PR·merge·새 release evidence·배포·provider 호출·실제 학습은 하지 않았다. D5 실제 사용자 효과, Linux host 실측 및 production 준비를 이번 PASS로 확대하지 않는다.

### 현재 계약 정합성 마감 — 2026-10-01

현재 코드·검사 로그와 별도 Astra read-only 검토를 대조했다. 추가 runtime 기능이 필요한 필수 계약 누락은 확인되지 않았지만, 아래 현재 단계표의 D4 예정 표시, D3의 복원 불가 설명, D5의 synthetic/사람 평가 구분 및 case study의 timeout 안내가 구현·검증 기록과 맞지 않았다.

1. **범위:** 이 문서와 `docs/delivery-evidence-case-study.md`만 보완한다. 단계별 현재 계약을 수정하고, 과거 실패·PASS 수치와 실행 이력은 유지한다. 기존 importer·HTTP·supervisor source/test 변경은 byte-preserved 상태로 둔다.
2. **완료 기준:** D4 구현 완료, D5 synthetic 완료, D5 사람 효과 미측정이 구분되고, POST bundle 복원·선택적 영향 입력·test-local 시간 예산이 실제 코드와 일치해야 한다. 문서 문자열만을 위한 새 테스트나 runtime 변경은 추가하지 않는다.
3. **검증:** 실제 handler·UI·evaluation source와 문서를 대조하고 `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`, `git diff --check`, 별도 read-only 문서 review를 수행한다. 앞선 전체·focused 검사 로그와 source/test hash를 확인하되 문서만 바뀐 상태에서 전체 suite를 새로 실행했다고 기록하지 않는다.
4. **다음 경계:** 현재 6개 dirty 변경의 grouped source commit → 해당 SHA의 기존 deterministic evidence refresh → 별도 generated-evidence commit → push·ready PR·required CI는 명시 승인 후 진행한다. merge·배포·provider·실제 학습·실데이터·cleanup은 포함하지 않는다. D5 사람 평가는 동의한 참여자와 비민감 사례 범위가 정해질 때 별도로 수행하며 포트폴리오 기술 마감의 결과로 대체하지 않는다.

**검증 결과:** 문서 보완 후 docs precloseout gate **59/59 PASS**, `node scripts/evaluate-delivery-evidence.mjs --format markdown`은 synthetic 12개에서 candidate/reference 모두 정답 일치 12·불일치 0, exit 0이었다. 별도 Astra 정적 review는 handler·core·UI와 현재 계약 및 문서 링크를 대조했으며 추가 지적은 없었다. `git diff --check`가 통과했고 기존 변경 source/test 4개와 production supervisor의 SHA-256이 직전 전체 검사 시점과 같았다. 따라서 앞선 전체 2,203 PASS / skip 1과 delivery 214/214 결과를 보존하되 이번 문서 단계에서 새로 실행한 결과로 표시하지 않는다. 새 source commit·SHA-bound artifact·원격 CI·browser 검증·사람 효과 측정은 하지 않았다.

### 병합 후 보완의 공개 마감 — 2026-10-01

사용자가 위 grouped source commit → SHA-bound evidence commit → push·ready PR·CI 계획의 진행을 승인했다. 시작 main과 원격 main은 `55a60639bb3f4f4e876280784fd0ce6b582ac23d`이며 index는 비어 있다. `codex/delivery-evidence-reliability-closeout`에서 이 문서·case study, `src/core/delivery-evidence-import.mjs`, `test/delivery-evidence-import.test.mjs`, `test/delivery-evidence-http.test.mjs`, `test/local-training-process-supervisor.test.mjs`의 6개 변경을 source commit 하나로 묶는다. 기존 branch·worktree는 보존한다.

그 SHA의 clean tracked tree에서 official local-v1 closeout이 full test·docs precloseout·hygiene·diff 검사를 새로 실행한다. 이어 `refresh:execution-v1-artifacts -- --reuse-existing-deterministic` → clean rehearsal → production-like drill → final pilot export → Portfolio refresh/check → full smoke를 수행한다. 재사용 증거의 원래 source·시각·not-rerun 표시는 유지하며, 기존 visual manifest는 외부에 보존한 후 pipeline이 해당 경로를 재생성하도록 한다. Generated allowlist만 두 번째 commit으로 고정하고 두 commit을 push한 뒤 ready PR과 해당 head의 required CI를 확인한다. 후속 결과와 SHA는 generated evidence·PR에 기록한다. merge·deploy·publish·새 provider 호출·실제 학습·실데이터·기존 resource cleanup·history 재작성은 제외한다.

**진행 결과와 중단 지점:** 6개 source/test/docs는 `a162a0e851d2ae2d7535a187b47e072ea2beaa5b`로 commit했다. exact staged scope·문법·diff·독립 정적 review와 새 docs precloseout 59/59는 통과했다. 그러나 그 SHA의 `npm run build:local-v1-completion-closeout -- --implementation-commit a162a0e851d2ae2d7535a187b47e072ea2beaa5b --output evidence/output-artifacts/local-v1-completion-closeout.json`은 내부 `npm test`가 600,000ms 한도를 넘겨 `timedOut:true`, `signal:SIGKILL`, exit 1로 중단됐다. 전체 PASS 수는 회수하지 못했으며 새 closeout artifact는 쓰지 않았다. 중간 출력의 HTTP 영향·bundle 사례 1건은 약 21.00초에 실패했다. 전체 종료 전에는 그 실패의 assertion stack이 출력되지 않아 원인을 확정하지 않는다.

이후 `node --test --test-name-pattern='roundtrip declared impact' test/delivery-evidence-http.test.mjs`는 **1/1 PASS**, exit 0, 약 9.97초였다. 단독 결과로 전체 실패를 대체하지 않는다. Node v24.18.0 / Darwin arm64, logical CPU 10개에서 전체 실행 전후 load average 첫 값 33.52→53.67, 이후 68.10과 free memory 14%를 관측했지만 host 부하만을 단일 원인으로 확정하지 않는다. 다른 작업 종료·전역 설정 변경·timeout 증가·검사 제외·반복 full 실행은 하지 않았다. 기존 artifact와 visual manifest는 그대로이며 generated commit·push·PR·원격 CI는 미실행이다. 이 중단 기록만 source commit 이후 미커밋으로 남긴다. 재개 시 실패 상세를 회수할 수 있는 bounded 진단과 로컬 실행 여건을 먼저 확인하고, 관련 보완을 묶은 source 상태에 official gate가 실제 통과한 뒤에만 evidence phase로 넘어간다. 기존 승인 범위는 유지하며 merge·배포·provider·cleanup 권한으로 확대하지 않는다.

### Darwin 경로 조회 실패의 진단 보완 — 2026-10-01

사용자의 재개 요청에 따라 외부 임시 runner로 native TAP 출력 전체를 보존했다. 테스트 목록·file-level 병렬도 4·600초 한도는 canonical 검사와 같고 reporter만 진단용 TAP으로 지정했다. HTTP 세 사례는 단독 **3/3 PASS**, 전체 진단에서도 모두 PASS였다. 전체 진단은 약 469.48초에 **2,204건 / PASS 2,202 / fail 1 / skip 1**, exit 1로 끝났으며 timeout이 아니었다. 이 실행은 공식 SHA-bound closeout의 대체 증거가 아니다.

이번 실패는 `test/local-training-darwin-suspended-exec.test.mjs`의 실제 signed fixture 검사였다. 약 5,008ms 뒤 `resolveSystemPython`에서 `could not resolve Python`을 반환했다. 고정 `/usr/bin/xcrun --find python3`의 5초 예산과 일치하는 시간이나 원래 오류에는 spawn error/status가 없어 timeout으로 확정하지 않는다. 단독 해당 파일은 **5/5 PASS**, 같은 제한·환경의 경로 조회는 약 75ms에 exit 0이었다. 전체 지연과 host 부하·메모리 관측은 함께 기록하되 단독 PASS나 load average로 과거 실패의 원인을 확정하지 않는다.

후속 source 범위는 `scripts/probe-local-training-darwin-suspended-exec.mjs`, 대응 test와 이 기록이다. 기존 거부 조건 안에서 오류를 `timeout`, `spawn-error`, `exit-failure`, `invalid-path`로 구분하며 raw stdout/stderr·native error message는 노출하지 않는다. 5초 제한·깨끗한 환경·capture 한도·shell 비활성·서명/CDHash 검증·실제 fixture·권한은 바꾸지 않고 fallback/retry를 추가하지 않는다. 여섯 mock 오류 사례는 구현 전 **0 PASS / 6 FAIL**을 확인했고, 최소 수정 후 실제 fixture를 포함한 해당 파일은 **11/11 PASS**, exit 0이었다. 두 실행 파일의 `node --check`와 `git diff --check`도 통과했다. 이 변경은 진단 공백 보완이지 경로 조회 지연이나 전체 회귀 안정성 해결의 증명이 아니다.

문서 precloseout은 **58/59 PASS**, exit 1이었다. 변경하지 않은 `smoke:target-secret-manager`의 npm child가 stdout/stderr 없이 `SIGABRT`로 종료됐으며 assertion 실패나 원인은 확인되지 않았다. 같은 command의 단독 진단은 약 1.21초에 exit 0이었다. 이 결과로 실패한 sweep을 PASS로 바꾸지 않고, 관련 문서나 검사 조건도 수정하지 않는다. 다른 프로세스를 종료하거나 전역 환경을 변경하지 않았다.

기존 source commit은 보존하고 이 후속 검증 보완과 실패 이력을 하나의 source commit으로 묶는다. 새 SHA의 clean tracked tree에서 공식 closeout을 수행하며 통과할 때만 기존 evidence pipeline을 이어간다. 따라서 기존 source·후속 source·generated evidence의 이력으로 구성하고 amend/rebase는 하지 않는다. 원래 source/test 네 파일은 `a162a0e8`과 byte-identical이며 추가 기능·학습·provider·배포·기존 resource 변경은 없다.

## 목표와 개발 지속 조건

여러 개발 도구가 만든 변경을 인계하는 사람이 현재 요구사항에 어떤 검증 근거가 있고 무엇을 더 확인해야 하는지 빠르게 판단하도록 돕는다. 범용 Agent runtime을 추가하지 않는다. 정확성·권한·이력 경계를 유지하되 문서와 승인 절차의 양을 성과로 삼지 않는다.

2026-09-28 사용자 요청에 따라 계획과 로컬 구현을 진행한다. 기존 product-plan-v1의 완료 이력을 새 기능의 완료 근거로 사용하지 않는다. 이 문서는 특화 기능 개발의 작업 기준이며 기존 실행 경로·provider·배포 권한을 변경하지 않는다. 경쟁 조사에서 제안한 방향은 제품 우위가 아니라 검증할 가설이다.

비교 기준은 기존 coding agent + 명세 도구 + CI + 검토 양식이다. 초기 paired synthetic case 뒤 실제 승인된 비민감 변경 사례로 확장한다. critical false-ready 0건을 최소 조건으로 삼되 일반 안전성을 입증했다고 해석하지 않는다. mapping 설정·유지 시간을 포함한 반복 검토시간 중앙값 30% 단축은 **제안 목표**이며 아직 측정 결과가 아니다. 개선이 없으면 독립 제품 확대를 중단하거나 작은 보조도구로 축소한다.

## 기능과 단계별 완료 기준

| 단계 | 사용자 결과 | 구현 범위 | 완료 기준 |
|---|---|---|---|
| D1 로컬 구현 완료 | 요구사항별 누락·binding 불일치·실패를 로컬에서 확인 | 순수 판정 함수, bounded stdin JSON CLI, JSON/Markdown 출력, 사용 계약 | RED→GREEN 회귀 및 실제 CLI 실행; 모든 입력은 출처 미검증으로 표시 |
| D2 로컬 구현 완료 | 기존 검사 결과를 수작업 복사 없이 연결 | Node 24 reporter와 read-only importer, source/test/config digest 수집 | 실제 Node 실행 fixture에서 잘못된 repository·revision·결과 차단; 원본 불변; D1 동일 계약 사용 |
| D3 로컬 구현 완료 | 검토자가 연결과 예외를 확인하고 다음 작업을 판단 | 기존 UI에 요구사항별 근거·누락 표시, revision-bound 검토 기록, 인계 export | 두 revision·권한·stale response 회귀 및 browser 검증; 예외 메모는 PASS로 승격하지 않음; 상세 검증 범위는 아래 실행 기록 |
| D4 로컬 구현 완료 | 변경 후 필요한 재확인 대상을 알 수 있음 | 선언된 의존성 범위의 영향 판정, CLI와 web 검토 통합 | known unrelated 변경과 unknown 영향 구별; 필수 CI 생략·PASS 재사용 권한 없음 |
| D5 synthetic 완료 / 사람 효과 미측정 | 상태 분류를 재현하고, 실제 사용 가치는 별도 평가 | 독립 checklist reference와 synthetic 사례 비교 구현; 설정·검토·유지 비용 및 재사용 의사 평가 미실행 | 기술 평가와 사람의 go / 축소 / stop 근거를 구분; 실측 전 우위·상용 준비 주장 없음 |

D1–D4와 D5 synthetic 평가의 구현은 제품 전체의 완료를 대신하지 않는다. D2는 Node 24 native test receipt를 지원하고, D3는 portable bundle과 다운로드를 지원하되 서버 영속 저장은 제공하지 않는다. 의미적 요구 충족, 증거 진위, 실제 사용자 효과, 배포 및 고객 인수는 각각 별도 판단이다.

## D1 입력 계약과 판정

- 파일: `src/core/delivery-evidence-gate.mjs`, `scripts/check-delivery-evidence.mjs`, `test/delivery-evidence-gate.test.mjs`, 이 문서. 기존 default runtime·package.json·README·release evidence는 수정하지 않는다.
- Node 표준 library만 사용한다. 기존 closeout의 domain-private 검증기를 가져오느라 기존 릴리즈 계약을 일반화하지 않는다.
- stdin JSON 객체: `schemaVersion: "delivery-evidence-input/v1"`, `target`, `requirements`, `evidence`만 허용한다.
- target: `projectId`, `sourceRevision`(full Git SHA-1 또는 SHA-256). 현재 working tree를 조회하지 않는다. dirty snapshot과 실제 파일 수집은 D2 전까지 지원하지 않는다.
- requirement: `id`, `criterion`, `mappingConfirmed`, `checks`. criterion의 정확한 UTF-8 bytes로 SHA-256을 계산해 증거의 `criterionDigest`와 비교한다. 사람이 바꾼 수용 기준이 같은 ID라고 자동 재사용되지 않는다.
- check: `id`, `definitionDigest`(SHA-256), `environmentId`. digest의 실제 파일 일치는 D1에서 검증하지 않는다. check 정의에는 관련 test/config를 포함하도록 입력자가 책임진다.
- evidence: `id`, `projectId`, `sourceRevision`, `requirementId`, `criterionDigest`, `checkId`, `definitionDigest`, `environmentId`, `result`만 허용한다. result는 `passed`, `failed`, `skipped`, `timeout`이다.
- 제한: requirements 1–100개, requirement당 checks 1–100개, evidence 0–10,000개, CLI UTF-8 입력 최대 1 MiB. 중복 ID·알 수 없는 참조·필수값 누락·unknown field를 오류로 처리한다. 사용자 문자열은 오류 메시지에 복제하지 않는다.
- check 결과: `current` / `missing` / `stale` / `failed` / `incomplete` / `conflicting`. 같은 현재 binding에 서로 다른 결과가 있으면 순서나 시간으로 하나를 선택하지 않고 conflicting으로 남긴다. 오래된 행은 binding 불일치 이유와 ID를 보존한다.
- 다른 project의 행은 `unmatchedEvidence`에 분리하고 충족 근거로 쓰지 않는다. 해당 check에 다른 증거가 없으면 `missing`이다. 알 수 없는 requirement/check 참조는 계약 오류다. 모든 배열은 ID 순서로 출력하므로 입력 순서로 판정이 달라지지 않는다.
- requirement 결과: 하나라도 검증 문제가 있으면 `blocked`; 문제는 없지만 mapping 미확정이면 `needs-review`; 전부 일치하는 reported pass이면 `evidence-current`.
- 전체 결과도 같은 3상태다. `evidence-current`는 입력 메타데이터 일치만 뜻하며 실행 진위·의미적 요구 충족·배포·인수를 뜻하지 않는다. `evidenceAuthenticity: "unverified"`, `acceptance: "not-assessed"`, `deployment: "not-assessed"`, `executionAuthorized: false`, `productionReadyClaim: false`를 항상 표시한다.
- 입력은 불변, 출력은 동일 입력에 결정적이다. command·URL·파일 경로를 실행하거나 역참조하지 않고 provider·network·state store를 사용하지 않는다.

## D1 사용 방법

준비한 packet을 stdin으로 전달한다. CLI는 입력 파일을 자동 생성·변경하지 않으며 stdout 이외에 보고서를 저장하지 않는다. 공유 시 criterion과 식별자에 민감정보가 없는지 확인해야 한다. 자동 비식별화 도구는 아니다.

```sh
node scripts/check-delivery-evidence.mjs < packet.json
node scripts/check-delivery-evidence.mjs --format markdown < packet.json
```

exit code는 `0 = evidence-current`, `2 = blocked 또는 needs-review`, `1 = 입력/옵션 오류`다. **0은 배포·인수·실행 허가가 아니다.** `--format json`도 허용하며 output path, 실행 command, URL 옵션은 없다.

아래는 synthetic packet이다. SHA와 definitionDigest는 설명용 값이며 실제 repo·검사 실행의 증거가 아니다. criterionDigest는 표시된 한국어 criterion의 UTF-8 SHA-256이다. criterion을 바꾸고 evidence를 그대로 두면 stale로 판정된다.

```json
{
  "schemaVersion": "delivery-evidence-input/v1",
  "target": {
    "projectId": "purchasing",
    "sourceRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "requirements": [{
    "id": "REQ-1",
    "criterion": "담당자와 관리자가 모두 승인해야 한다.",
    "mappingConfirmed": true,
    "checks": [{
      "id": "two-approvers",
      "definitionDigest": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "environmentId": "node24-local"
    }]
  }],
  "evidence": [{
    "id": "EV-1",
    "projectId": "purchasing",
    "sourceRevision": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "requirementId": "REQ-1",
    "criterionDigest": "d46f678b5f95558bc9284ff3a7d478dd61632bbe59732990fef83feaf620be39",
    "checkId": "two-approvers",
    "definitionDigest": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "environmentId": "node24-local",
    "result": "passed"
  }]
}
```

## D2–D5의 구현 계약과 진행 조건

D2의 CLI, D3의 web 검토·portable 복원, D4의 CLI·web 영향 판정과 D5 synthetic 평가는 구현했다. 아래는 현재 계약이며 원래 D5의 사람 효과 평가는 미실행이다. 개별 구현·검증 이력은 날짜가 있는 실행 기록과 구분하고, 제품 전체가 완료됐다고 공개하지 않는다.

### D2 — 실제 증거 수집

구현 위치는 `scripts/delivery-node-test-reporter.mjs`, `scripts/import-delivery-evidence.mjs`, `src/core/delivery-evidence-import.mjs`, 대응 `test/delivery-evidence-import.test.mjs`다. 이 저장소가 사용하는 Node test runner의 native summary 이벤트를 단일 지원 형식으로 선정했다. local-v1 precloseout JSON은 실패 결과·요구사항·환경 binding이 부족해 과거 결과를 현재 기준으로 재결합하지 않도록 재사용하지 않았다.

읽기 전용 importer는 실행 진위를 인증하지 않는다. 단순 local file과 검증한 CI attestation은 같은 trust로 표시할 수 없다. 경로 allowlist·symlink·최대 크기·raw secret 미수집·프로젝트 격리를 검사하고, 파일 내용의 instruction을 실행하지 않는다. dirty tree 지원은 snapshot 수집 계약이 결정된 후 추가한다.

RED 사례: foreign repo, partial/잘린 결과, unsupported/skipped outcome, stale SHA, source drift, 누락된 config digest, symlink escape. GREEN은 실제 형식 한 개의 정상 결과와 실패 결과가 D1의 동일 evaluator에 연결되고 source에 쓰기가 없을 때다.

#### D2 사용 계약

대상 repository root에 `delivery-evidence.json` manifest가 **이미 commit된 clean revision**을 사용한다. manifest 추가·commit은 이 기능이 자동 실행하지 않는다. 현재 개발 저장소의 미커밋 변경을 없애기 위해 cleanup하거나 commit하지 않는다.

```json
{
  "schemaVersion": "delivery-evidence-manifest/v1",
  "projectId": "purchasing",
  "testFiles": ["approval.test.mjs"],
  "configFiles": ["package.json"],
  "requirements": [{
    "id": "REQ-1",
    "criterion": "Two approvers are required.",
    "mappingConfirmed": true
  }]
}
```

`testFiles`는 실행할 파일의 명시 목록이며 glob을 넣지 않는다. `configFiles`에는 검사에 영향을 주는 설정을 명시한다. 두 목록 모두 비어 있으면 안 된다. 각 요구사항은 전체 `node-test-suite` 결과에 연결된다. 개별 assertion이 해당 요구를 충분히 검증한다는 뜻이 아니며 mappingConfirmed는 사람의 선언이다. 현재는 세부 test name별 연결을 제공하지 않는다.

아래 명령은 사용 예시다. reporter/importer의 절대 경로와 receipt 경로는 실제 위치로 바꾼다. receipt는 source 밖에 둔다. reporter는 stdout으로 기록하고 importer는 파일에 쓰지 않는다. shell redirect의 기존 파일 덮어쓰기를 피하려면 `set -o noclobber`와 새로운 receipt 이름을 사용한다.

```sh
# 대상 repository root에서, 명시적으로 테스트 실행을 허용한 경우만
node --test --test-reporter=/absolute/path/scripts/delivery-node-test-reporter.mjs approval.test.mjs > /absolute/evidence/new-run.json
node /absolute/path/scripts/import-delivery-evidence.mjs --repo /canonical/repository --receipt /canonical/evidence/new-run.json
```

출력은 `{ packet, report }`다. `packet`은 기존 D1 입력 계약이고 `report`는 동일 D1 evaluator의 결과다. JSON에서 packet을 추출하면 D1 Markdown renderer를 그대로 사용할 수 있다. importer exit code는 `0 = evidence-current`, `2 = blocked/needs-review`, `1 = import 거부`다.

- Reporter 지원은 Node 24다. `--test`, 단일 `--test-reporter=...`, 선택적인 `--test-concurrency=1..16` 외의 Node 실행 옵션과 `NODE_OPTIONS`를 거부한다. 테스트 필터·watch·only·재시도·preload는 지원하지 않는다. 옵션 거부는 **기록 생성 거부**이지 이미 실행된 preload나 테스트의 side effect를 취소하는 sandbox가 아니다.
- reporter module 초기화 시 source를 읽고 stream 종료 뒤 다시 비교한다. 파일별 summary의 목록이 testFiles와 같아야 하며 root summary는 정확히 하나, test count는 1 이상이어야 한다. 잘린 실행·누락된 파일 summary는 기록을 만들지 않는다.
- failed는 `failed`, skip/todo는 `skipped`로 연결하고 D1에서 차단한다. reporter는 파일별 또는 root summary에 cancelled가 하나라도 있으면 기록을 만들지 않고, importer도 cancelled count가 있는 기록을 거부한다. Node는 파일의 abort를 root에서는 failed로 집계하기도 하며 cancelled count만으로 timeout·명시적 abort·부모 취소를 구분할 수 없다. D1의 선언형 timeout 지원과 달리 D2는 취소 원인을 추측하지 않는다. raw 오류·stdout/stderr·test name은 저장하지 않는다.
- receipt는 source identity, 시작 당시 요구사항/검사 binding, Node version/platform/arch, 집계 결과를 보존한다. importer는 이를 현재 값으로 덮어쓰지 않고 현재 관찰과 동일한지 먼저 비교한다. 서명이나 실제 실행 인증은 없으므로 `unverified`를 유지한다.
- source identity는 canonical repository root와 Git common directory의 hash다. 같은 SHA여도 다른 clone에서 받은 기록은 거부한다. remote URL이나 credential을 읽지 않는다. 이동한 저장소·타 시스템 CI의 이식은 후속 별도 계약이다.
- Git 조회는 fixed argv·제한된 환경·timeout/maxBuffer·optional lock 및 fsmonitor 비활성화로 수행한다. `status`/`diff`의 clean filter에 의존하지 않고 HEAD tree와 index, tracked 파일의 raw Git blob hash를 직접 비교한다. assume-unchanged도 dirty bytes를 숨기지 못한다.
- tracked regular file만 허용한다. symlink·submodule·staged 변경·nonignored untracked 파일을 거부한다. 파일당 4 MiB, 총 64 MiB, 최대 10,000 tracked files, test/config 목록 각각 최대 100개다. receipt는 1 MiB 이하의 single-link regular file만 읽는다. canonical 경로와 descriptor 전후를 검사하며 관찰 전후 파일 bytes도 재확인한다.
- ignored 파일·node_modules·외부 서비스·전체 환경변수의 동일성은 인증하지 않는다. clean/smudge 변환된 working tree도 raw byte 비교에서 거부될 수 있다. 전후 관찰은 atomic snapshot이나 실행 중 순간적인 변경이 전혀 없었다는 증명이 아니다. 의미적 요구 충족·증거 진위·배포·인수 판단은 여전히 별도다.

### D3 — 검토와 인계

기존 web surface의 `검토하기`에서 workspace 단위의 변경 인계 근거 panel을 제공한다. mission 생성 없이 사용하며 별도 dashboard나 전역 approval 체계를 만들지 않는다. UI는 요구사항·기준·검사 상태·근거 ID·불일치 이유·다음 확인 항목을 표시한다. 성공 결과만 먼저 보여 실패·미검증을 숨기지 않는다.

검토 기록은 대상 packet/revision, reviewer identity의 확인 수준, mapping/예외의 종류, 이유를 연결한다. request-scoped 초안과 다운로드를 지원하고, 새로고침 뒤 저장한 `delivery-review-bundle/v1`을 다시 열어 현재 source가 일치할 때 메모·원래 자기 선언 시각·선택적 영향을 복원한다. 서버 저장 이력·자동 복원·승인 증명은 제공하지 않는다. 기존 store schema와 HTTP 요청 audit는 검토 기록의 영속 저장을 대신하지 않는다. 최종 source revision이나 packet이 바뀌면 과거 검토를 현재 검토로 자동 적용하지 않는다. JSON/Markdown export는 같은 판정 결과를 사용하며 외부 전송은 별도 행위다.

#### D3 구현 계약

- core: `src/core/delivery-evidence-review.mjs`, web handler: `src/web/delivery-evidence-handlers.mjs`, frontend: `src/web/public/lib/delivery-evidence-review.js`. 기존 server route registry, app bootstrap, workspace selection, review panel과 CSS만 연결한다. 테스트는 `test/delivery-evidence-review.test.mjs`, `test/delivery-evidence-ui.test.mjs`, `test/delivery-evidence-http.test.mjs`다.
- `GET /api/workspaces/:workspaceId/delivery-evidence`는 등록된 workspace path에서 D2 source capture를 재사용해 현재 manifest의 요구사항과 빈 evidence packet을 반환한다. 현재 clean revision·manifest가 없으면 409로 거부하며 자동 commit·cleanup·검사 실행은 하지 않는다.
- 같은 경로의 POST는 `{packet}` 또는 `{packet,review}`, 복원용 `{bundle}`을 받으며 두 방식 모두 선택적 `impactInput`을 허용한다. bundle과 packet/review를 함께 제출할 수 없다. D1 판정·review binding·bundle digest 및 선택적 D4 입력을 검증한 뒤 trusted source의 target/requirements와 동일한지, 읽기 전후 source가 동일한지 확인한다. 다른 revision·현재 요구사항 불일치·source drift는 409다. 이전 근거 행 자체는 현재 packet의 evidence로 제출할 수 있으며 D1이 stale/failed 등을 판정한다.
- API 공통 auth/RBAC와 handler의 workspace tenant 검사를 모두 거친다. tenant 검사는 body/source 판독보다 먼저 수행한다. RBAC enforce에서 GET은 viewer, POST는 operator 이상이다. 경로는 등록 workspace에서만 가져오며 요청에 arbitrary filesystem path를 받지 않는다. body는 fatal UTF-8 JSON, 최대 1 MiB이며 계약 오류 400, 크기 초과 413이다.
- `review`는 `{bindingDigest,reviewerName,entries}`다. binding은 workspaceId와 전체 packet의 key-sorted JSON SHA-256이다. entries는 요구사항별 하나씩 최대 100개이며 `{requirementId,kind,reason}`; kind는 `mapping-review` 또는 `exception-recorded`다. 이름 100자, 이유 1,000자 이하의 trim된 단일행 문자열을 사용한다. UI에서 같은 요구사항을 다시 반영하면 현재 초안만 교체한다.
- 검토자 이름은 항상 `self-declared`다. OIDC 인증을 통과했어도 입력 이름을 실제 개인 identity로 인증했다는 주장을 하지 않는다. 메모는 D1의 mappingConfirmed·status·권한을 변경하지 않는다. `evidence-current`도 진위 인증·의미적 요구 충족·승인·인수를 뜻하지 않는다.
- UI는 D1 packet, D2 `{packet,report}` 출력, portable bundle을 받는다. 제출된 report는 재사용하지 않으며 bundle의 report·Markdown은 서버에서 다시 계산한다. 메모가 있는 이전 export 형식은 packet으로 자동 축소하지 않고 거부한다. 새 packet 입력·workspace 전환은 이전 검토와 초안을 초기화한다. 영향 편집·검토 반영 실패 시 이미 반영한 메모를 보존하되 재확인 전에는 내보내지 않는다. epoch와 workspace를 함께 확인해 오래된 성공·오류·finally와 A→B→A 응답 재사용을 막는다. 요구사항 선택은 메모 반영 중 유지한다.
- 내보내기 직전 현재 bundle을 서버에서 재판정해 source/binding/report를 확인하고, 화면의 기존 검토 시각과 내용 그대로 JSON bundle/Markdown을 다운로드한다. 미반영 메모·영향 또는 재검증 필요 상태에서는 다운로드를 막는다. 화면 문자열은 escape하고 Markdown은 D1과 같은 escape 계약을 따른다. 기준·이름·메모는 민감정보 자동 제거 대상이 아니므로 공유 전 사람이 확인한다.
- 예외 메모를 남겨도 missing/stale/failed/incomplete/conflicting은 그대로 남는다. 서버 DB 저장·review signature·자동 테스트·provider 호출·외부 제출·실행/배포 승인은 이번 범위가 아니다.

RED 사례: 이전 revision 승인 재사용, foreign workspace 접근, 늦게 도착한 이전 요청이 새 화면을 덮음, markup injection, export와 화면 불일치. GREEN은 해당 회귀와 실제 keyboard/browser 흐름 검증 후다. 완성도나 인수 사실은 상태 이름만으로 만들어내지 않는다.

### D4 — 변경 영향

구현 위치는 `src/core/delivery-evidence-impact.mjs`, `scripts/check-delivery-impact.mjs`와 대응 테스트이며 web 검토에서도 같은 판정기를 사용한다. 자동으로 완전한 dependency graph를 추측하지 않는다. 선언된 requirement↔test/config/source 연결만 사용하며, 연결 정보가 불충분하면 unknown으로 분류한다. 선언 범위 안에서 영향이 없다는 결과도 실제 변경 부재나 이전 PASS의 재사용 허가가 아니다.

RED 사례: config 변경을 code만 비교해 놓침, 간접 의존성 누락, 새 requirement에 과거 mapping 재사용, unknown edge를 unrelated로 처리. 필수 CI를 생략하는 결정은 구현하지 않는다.

### D5 — 가치 검증

synthetic 평가는 `src/core/delivery-evidence-evaluation.mjs`, `scripts/evaluate-delivery-evidence.mjs`와 대응 테스트로 구현했다. `node scripts/evaluate-delivery-evidence.mjs --format markdown`은 별도 사전 정답표를 둔 paired 사례 12개(정상 4, 오류 8)를 평가한다. 독립 deterministic checklist reference와 candidate는 같은 입력을 받으며, 정답을 candidate 입력에 넣지 않는다. 모델 호출은 없고 D1 단위 테스트 수를 효과 평가 사례 수로 사용하지 않는다. 실제 사람의 false-ready·검토 시간·생산성 측정값은 `null`이다.

사람 효과 평가는 아직 수행하지 않았다. 수행 시에는 onboarding, mapping 유지, 누락 조사, 보고서 작성 시간을 포함해 측정한다. 중요 누락, 불필요한 stale 판정, 독립 reviewer의 재확인, 반복 사용 의사도 기록한다. synthetic 통과 후 실제 비민감 사례 사용에는 참여자 동의와 데이터 범위를 확인한다. 품질·사용성이 개선되지 않으면 모델·문서·승인 수를 더 늘려 결과를 포장하지 않는다.

false-ready는 제품이 승인 버튼을 갖는지 여부가 아니라, 도구를 사용한 reviewer가 근거 부족을 놓치고 인계 가능하다고 판단한 사례로 측정한다. 항상 `not-assessed` 또는 보류만 내놓아 0건을 만드는 방식은 성공이 아니다. 정상 사례의 처리율·불필요한 보류와 최종 사람 판단까지의 시간을 반드시 함께 비교한다. D1의 unit test PASS를 이 효과 평가의 PASS로 대체하지 않는다.

## D1 RED/GREEN와 검증 계획

1. 테스트부터 작성하고 아직 없는 모듈/CLI 때문에 실패하는 RED를 확인한다.
2. 최소 구현으로 정상 연결, 빈 근거, old source/criterion/test/environment/project binding, 실패·skip·timeout, 현재 충돌, old failure + current pass, mapping 미확정, 복수 요구/검사 집계, malformed/중복/unknown reference를 검증한다.
3. 실제 child process CLI로 JSON/Markdown·오류·입력 한도·비밀 입력 미반사·exit code를 검사한다. Markdown은 사용자 criterion을 escape한다.
4. `node --test test/delivery-evidence-gate.test.mjs`, `node --check` 두 실행 파일, `npm test`, `git diff --check`를 실행한다. README 수치·smoke inventory·SHA-bound release artifact는 이번 변경의 성과로 갱신하지 않는다.
5. 독립 read-only review로 false-ready, scope, conflicting evidence, input/output 보안 및 실제 사용을 검토한다. 발견 결함은 같은 범위에서 수정하고 관련 검사만 반복한다.

## 실행 책임과 승인 경계

주관 Agent가 계약·코드·검증을 연결하고 독립 Agent는 계약과 완료 diff를 검토한다. 모델 교체를 위해 별도 orchestrator/terminal을 만들지 않는다. 사용 가능한 현재 모델에서 작업하며 독립 검토 결과도 실제 코드·테스트로 재확인한다.

로컬 source/test/docs 작성과 검증만 현재 범위다. commit·push·PR·merge·deploy·publish·provider 활성화·고객 실데이터·기존 resource cleanup은 제외한다. 추후 승인되면 같은 기능의 source/test/docs를 grouped commit으로 묶고 SHA-bound release refresh는 그 source SHA 확정 뒤 별도 증적으로 처리한다. 현재 uncommitted 작업을 기존 release closeout 완료와 혼동하지 않는다.

## D1 실행 기록

- baseline: `9fe2a2aa6a6c7dc3921a93f8a39a33cd891f8644`, branch `codex/mission-navigation-consistency`, 시작 시 clean.
- D1 종료 당시: 로컬 판정기·CLI·JSON/Markdown 출력 구현 및 아래 검증 완료. 사용자 효과나 제품 전체 완성을 뜻하지 않으며 당시 D2–D5는 미착수였다.
- RED: 구현 전 focused test는 모듈 부재로 실패. 구현 후 Markdown의 escape된 ID를 raw ID로 비교한 assertion이 실패하여 escape 계약에 맞는 정확한 기대값으로 수정했다. 보안 escape를 제거하지 않았다.
- `node --test test/delivery-evidence-gate.test.mjs`: 22/22 PASS. 독립 Agent도 같은 22개를 실행해 PASS, 현재 D1 범위에서 actionable finding 없음.
- `node --check src/core/delivery-evidence-gate.mjs`, `node --check scripts/check-delivery-evidence.mjs`: PASS.
- 실제 CLI: 문서의 synthetic JSON 예제는 `evidence-current / unverified / not-assessed`, 변경 전 criterion 근거는 `blocked / stale`와 exit 2. 이 확인은 synthetic 사용 검증이며 실제 CI 증거 수집이 아니다.
- Node `v24.18.0`, Darwin에서 기본 `npm test`: 2,000개 중 1,998 PASS, 1 cancelled, 1 skipped로 exit 1. 기존 `Darwin CPU probe survives bounded scheduler starvation`이 15초 timeout에 걸렸다. 해당 테스트·runtime source는 수정하지 않았다.
- 같은 CPU 테스트 단독 실행: PASS(약 10.96초). 부하 민감성 가능성을 확인하기 위해 동일 suite를 `node --test --test-concurrency=4 test/*.test.mjs`로 실행: 1,999 PASS / 0 fail / 0 cancelled / 1 skipped, exit 0. CPU 테스트도 약 13.34초에 PASS. skip은 macOS에서 적용되지 않는 Linux boot-id injection regression이다. 기본 병렬 실행의 불안정 원인을 확정·수정한 것은 아니다.
- `npm run smoke:release-artifact-hygiene`: 기존 release 표면 127개 파일 검사 PASS. 새 기능 전체에 대한 secret 인증이나 새 release closeout은 아니다.
- `git diff --check` 및 4개 신규 파일의 `git diff --no-index --check /dev/null <file>`: whitespace 진단 없음. 신규 파일 비교의 exit 1은 파일 차이 존재를 뜻하며 통과 exit 0으로 기록하지 않는다.
- D1 종료 당시 변경은 위 4개 신규 파일만이며 uncommitted. 기존 source/runtime·package·README·release 증적과 HEAD를 보존했다.
- 당시 다음 단계: D2에서 실제 검사 결과 한 형식과 current source를 읽기 전용으로 연결한다. 자동 execution, trust 승격, UI/저장 schema 변경을 D1 완료에 포함하지 않는다.

## D2 실행 기록

- 시작 상태: 같은 HEAD와 branch, D1의 신규 파일 4개를 보존했다. D2는 신규 파일 4개와 이 개발 계획만 추가·수정한다. D1 evaluator·CLI·테스트, 기존 runtime·package·README·release 증적은 변경하지 않는다.
- 실제 Node test runner → reporter → receipt → read-only importer → D1 판정 경로를 구현했다. 통합 테스트는 별도 임시 Git repository의 synthetic 요구사항과 실제 Node 실행을 사용한다. 이 저장소의 실사용 인수·CI 인증이나 사용자 효과를 입증하는 것은 아니다.
- RED→GREEN: 구현 전 모듈 부재, source 수집 중 이미 읽은 파일의 변경 누락, cancelled를 timeout으로 잘못 분류하는 사례를 각각 실패로 재현한 뒤 수정했다. explicit abort가 file summary에서는 cancelled, root에서는 failed로 집계되는 실제 Node 동작도 확인해 두 수준 모두 검사한다.
- `node --test test/delivery-evidence-gate.test.mjs test/delivery-evidence-import.test.mjs`: 41/41 PASS, exit 0. 독립 Agent도 최신 수정에서 같은 41개를 실행해 PASS, 재검토 시 actionable finding 없음. 최초 취소 회귀의 40 PASS / 1 FAIL은 수정 전 결과다.
- `node --check`로 D2 core·reporter·importer·test 4개 파일 검사: PASS.
- 전체 회귀: 취소 회귀 실패 확인 직후 시작했던 실행은 중단했다. 수정 후 Node `v24.18.0`/Darwin에서 `node --test --test-concurrency=4 test/*.test.mjs`: 총 2,019개, 2,018 PASS / 0 fail / 0 cancelled / 1 skipped, exit 0(약 78.98초). skip은 Linux boot-id injection regression이고 기존 Darwin CPU 테스트도 PASS했다. 기본 `npm test`의 최대 병렬 부하 문제를 해결했다는 뜻은 아니다.
- `npm run smoke:release-artifact-hygiene`: 기존 release 표면 127개 파일 검사 PASS. 이 검사는 기존 release artifact 대상이며 D2의 공개·릴리즈나 진위 인증을 의미하지 않는다.
- 실제 개발 root의 source 수집은 `source-untracked`로 거부됐고 기존 변경은 그대로 보존했다. 기록 생성을 위해 commit·cleanup하지 않았다. commit·push·PR·merge·provider 활성화·배포 없음.
- `git diff --check` 및 신규 파일 8개의 `git diff --no-index --check /dev/null <file>`: whitespace 진단 없음. 신규 파일 비교의 exit 1은 파일 차이 존재다. tracked/staged diff는 비어 있고 HEAD는 시작 값 그대로이며, D1+D2의 신규 파일 8개는 uncommitted 상태다.
- D2 종료 당시 다음 단계는 D3의 기존 web route·workspace 권한·store 경계를 확인하고, D1/D2 결과를 요구사항별 검토와 revision-bound 인계로 연결하는 것이었다. 당시 UI 통합·검토 기록·효과 평가는 미구현이었다.

## D3 실행 기록

- 같은 HEAD/branch에서 D1/D2 신규 파일 8개를 보존하고 D3를 구현했다. 기존 web 파일 5개에 연결하고 D3 core/handler/frontend 및 테스트 6개를 추가했으며 이 계획을 갱신했다. 기존 D1/D2 코드·테스트, store schema, provider contract, README, package 및 release 증적은 변경하지 않았다.
- RED→GREEN: backend/UI 모듈 부재를 먼저 확인했다. 독립 리뷰에서 발견한 미반영 메모의 재판정 후 잔류, REQ-2 메모 반영 시 선택이 REQ-1로 바뀌는 문제도 각각 실패로 재현한 뒤 수정했다. 재검토에서 추가 actionable finding 없음.
- `node --test test/delivery-evidence-gate.test.mjs test/delivery-evidence-import.test.mjs test/delivery-evidence-review.test.mjs test/delivery-evidence-ui.test.mjs test/delivery-evidence-http.test.mjs`: **66/66 PASS**, exit 0. D3 신규 검사는 25개다. Core/handler 경계뿐 아니라 실제 서버의 OIDC 401, tenant/role 403, 현재 source·과거 review 409를 별도 임시 Git/JWKS/server fixture로 검사했다.
- `npm run smoke:web-tenant-isolation`: PASS. 기존 tenant 접근·헤더 spoof 방어 회귀도 유지했다.
- Node `v24.18.0`/Darwin에서 `node --test --test-concurrency=4 test/*.test.mjs`: **총 2,044개, 2,043 PASS / 0 fail / 0 cancelled / 1 skipped**, exit 0(약 183.49초). skip은 기존 Linux boot-id injection regression이다. 기본 `npm test` 병렬 부하 문제 해결이나 원격 CI 통과로 확대하지 않는다.
- 실제 local web browser: 별도 임시 clean Git workspace와 임시 runtime root만 사용했다. 현재 기준 조회 → 요구사항 표시 → 메모 반영 → JSON/Markdown 다운로드를 수행했고 두 다운로드의 Markdown 내용이 byte-identical임을 확인했다. exception 기록 뒤에도 blocked와 executionAuthorized:false가 유지됐다. criterion의 img와 메모의 svg 문자열은 literal text로 표시됐고 삽입된 DOM 요소는 0개였다.
- Browser에서 malformed JSON 입력 즉시 export 비활성화, 오류 시 status focus, workspace 변경 시 결과·packet·검토자 초기화를 확인했다. Tab/Enter로 이름·이유 입력, 메모 반영과 다운로드를 확인했으며 native select 값 변경은 Playwright selectOption으로 검증했다. native select의 화살표 선택 및 screen reader 전체 사용성은 별도 수동 검증을 완료했다고 주장하지 않는다.
- desktop/mobile screenshot을 열어 확인했다. 390px viewport에서 새 panel clientWidth/scrollWidth는 둘 다 334px로 가로 넘침이 없었다. 산출물: `output/playwright/delivery-d3-6m0i41/review-desktop.png`, `review-mobile.png`, `review.json`, `review.md`. 이 파일은 ignored local QA 산출물이며 배포·public release 증거가 아니다. browser console errors/warnings 0건. 이번 검증용 browser 두 개와 임시 web server는 종료했고 원본 runtime은 시작하거나 정리하지 않았다.
- D3 및 연결된 JS 파일 syntax 검사와 tracked/new file whitespace 검사 완료. HEAD와 index를 보존하며 모두 uncommitted 상태다. commit·push·PR·merge·외부 provider 호출·배포·기존 resource cleanup 없음.
- 다음은 D4의 명시적 requirement↔test/config/source 연결과 unknown 영향 구분이다. D3는 서버 저장 review history·서명 인증·고객 인수·D5 사용자 효과 평가를 완료한 것이 아니다.

## 포트폴리오 기술 완결 계획 — 2026-09-30

사용자가 사업 확장 대신 포트폴리오용 기술 완결의 계획·로컬 개발을 승인했다. 원래 D5의 사용자 효과 평가를 삭제하거나 완료로 바꾸지 않는다. 이번 종료선은 **D4의 선언된 영향 판정 + D5 synthetic 기술 평가 + 재현 가능한 데모·case study**이며, 실제 reviewer의 false-ready·설정/유지/검토 시간·재사용 의사·유료 수요는 미측정으로 남긴다.

### 현재 기준과 보존 범위

- HEAD `9fe2a2aa6a6c7dc3921a93f8a39a33cd891f8644`, branch `codex/mission-navigation-consistency`, Node `v24.18.0` / Darwin arm64.
- D1–D3는 미커밋 구현이다. 기존 web 5개와 D1–D3 source/test/script 13개를 SHA-256으로 관찰해 보존하며, 이 문서만 현재 계획과 새 실행 기록을 추가한다.
- 기존 D1 exact revision binding, D2 suite-wide mapping, D3 검토 권한·내보내기 계약을 바꾸지 않는다. D4 출력이 stale evidence를 current로 승격하지 않는다.
- 기존 README의 legacy demo·video·release artifact는 새 기능의 증거로 재사용하지 않는다. README에 별도 로컬 기술 사례의 실행 경로와 한계를 추가한다.

### 작업 순서와 완료 기준

| 단계 | 작업 | 검증·산출물 | 상태 |
|---|---|---|---|
| P1 | 계획과 입력/출력·권한 경계 고정 | 이 계획, 현재 Git·기존 변경 hash 확인 | 계획 기록 |
| P2 | D4 pure impact 판정과 bounded stdin CLI TDD | config·간접 의존성·신규/오래된 mapping·unknown·cycle·잘못된 입력 RED→GREEN | 구현·focused·독립 review 완료 |
| P3 | D5 독립 checklist reference와 oracle 기반 paired 평가 TDD | 정상 4 / 오류 8 synthetic 사례, 정상 처리·거짓 current·불필요한 보류·판정 오류 집계 | 기술 평가 구현·focused·독립 review 완료 |
| P4 | 정상·변경·불명 흐름을 credential-free CLI demo로 연결 | 실제 CLI JSON/Markdown, output parity, 권한 불변; case study와 README | 구현·focused·문서 review 수정 완료 |
| P5 | 통합 검증과 독립 review, 실행 기록 | focused + full regression, syntax·diff·hygiene, 기존 source/HEAD/index 보존 | 로컬 완료; 기본 병렬 실패 기록 유지 |

P2와 P3는 파일 소유권을 분리한다. D4 구현은 별도 Agent, D5와 문서·데모 통합은 주관 Agent가 담당한다. 독립 review는 구현과 분리하고, 주관 Agent가 실제 diff·실행 결과를 다시 확인한다. 모델 전환만을 위해 외부 orchestrator·terminal을 만들지 않으며 현재 사용 가능한 모델로 수행한다.

### D4 입력·출력 계약

- 파일: `src/core/delivery-evidence-impact.mjs`, `scripts/check-delivery-impact.mjs`, `test/delivery-evidence-impact.test.mjs`.
- `schemaVersion: delivery-impact-input/v1`, `target: {projectId,baseRevision,sourceRevision}`, `changedPaths`, `graph`, `requirements`를 받는 순수 함수다. path는 상대 file identifier이며 파일을 읽거나 실행하지 않는다.
- graph node는 `{path,dependencies,complete}`다. requirement는 `{id,criterionDigest,roots,mapping}`이고 mapping은 `null` 또는 `{projectId,sourceRevision,criterionDigest,confirmed}`다. mapping의 sourceRevision은 baseRevision에 해당해야 한다. complete/confirmed는 입력자의 선언일 뿐 완전성·진위 인증이 아니다.
- 유효한 mapping과 완전하다고 선언한 reachable graph에서 transitive dependency에 변경이 있으면 `recheck-required`, 겹치는 변경이 없으면 `no-declared-impact`, 그 외에는 `unknown`으로 이유를 남긴다. 알려진 변경이 있어도 mapping 또는 graph가 불명확하면 `unknown`이 우선하며 알려진 changedPaths는 보존한다. graph 밖 변경, 누락된 reachable node, 불완전 node, 오래된/다른 project/변경된 criterion mapping을 unrelated로 처리하지 않는다. cycle은 visited set으로 안전하게 처리한다.
- unknown field·duplicate ID/path·잘못된 상대 path·과도한 크기를 거부한다. 입력과 출력은 분리하고 배열 순서에 판정이 의존하지 않는다. stdin은 fatal UTF-8 JSON, 최대 1 MiB, 옵션은 없다.
- 출력은 `verificationScope: declared-dependencies-only`, `mappingTrust: self-declared`, `evidenceReuseAuthorized:false`, `ciSkipAuthorized:false`, `executionAuthorized:false`, `productionReadyClaim:false`를 포함한다. CLI exit 0은 모든 요구의 no-declared-impact, exit 2는 재확인/불명, exit 1은 입력 오류이며 **exit 0도 evidence-current나 실행 허가가 아니다**.

### D5 기술 평가 계약

- 파일: `src/core/delivery-evidence-evaluation.mjs`, `scripts/evaluate-delivery-evidence.mjs`, `test/delivery-evidence-evaluation.test.mjs`, `examples/delivery-evidence/cases.mjs`, `examples/delivery-evidence/expected.json`.
- 별도 oracle에 사례별 overall/requirement/check 판정의 정답을 기록한다. candidate와 reference 함수에는 packet의 복사본만 넘기며 oracle·group label을 넘기지 않는다. missing/duplicate/extra oracle과 잘못된 결과를 거부한다.
- baseline은 현재 코드·기준·test/config·환경·project·결과 충돌·mapping 확인을 모두 보는 **독립적으로 구현한 deterministic checklist reference**다. D1을 호출해 baseline 답을 만들지 않는다. 실제 Codex/Claude Code/CI/사람의 검토 성능을 측정한 것으로 표시하지 않는다.
- 정상 사례: 단일 current, 여러 요구/check current, old failure + current pass, SHA-256 revision. 오류 사례: missing, stale revision, 변경된 criterion, 변경된 test/config digest, environment mismatch, foreign project, conflicting current result, mapping 미확정.
- candidate/reference의 정답 일치, 정상 처리, 거짓 evidence-current, 불필요한 보류를 같이 출력한다. always-block과 always-current가 모두 실패하는 회귀를 남긴다. 시간·비용·실사용 생산성은 `null` / `not-measured`, 증거 진위는 `unverified`다.
- CLI는 bundled synthetic 사례만 사용하고 stdout만 출력한다. `--format json|markdown`만 허용한다. 정확성 일치는 0, 판정 불일치는 2, 입력/옵션 오류는 1로 종료하며 실제 인계 가능·배포·사업성 PASS가 아니다.

### 데모·문서와 검증

- 추가 파일: `scripts/demo-delivery-evidence.mjs`, `test/delivery-evidence-demo.test.mjs`, `examples/delivery-evidence/impact.json`, `docs/delivery-evidence-case-study.md`. stdin CLI에 바로 넣을 수 있는 impact fixture도 제공한다. 기존 README에는 짧은 별도 진입점만 추가한다. package scripts·default runtime·web UI·provider 계약은 변경하지 않는다.
- demo는 bundled synthetic input으로 current, stale, unknown을 설명하고 D1/D4/D5 결과를 연결한다. 실제 D2 reporter/importer와 D3 HTTP·UI의 통합은 기존 테스트를 재실행해 확인한다. synthetic demo가 실제 사용자·CI 인증 증거를 대신하지 않는다.
- focused: `node --test test/delivery-evidence-*.test.mjs`; 추가 executable/module에 `node --check`; 실제 CLI 정상·오류·UTF-8·크기·옵션 검사.
- full: 기존 `npm test`를 먼저 확인하고 실패하면 원인을 분리한다. Darwin probe 실패는 해당 suite의 분리 재현을 확인한 뒤 `node --test --test-concurrency=4 test/*.test.mjs` 결과를 별도로 기록하며 기본 실행 성공으로 바꾸지 않는다. probe의 timeout·assertion·필수 수용 기준은 변경하지 않는다.
- 기존 provider/network를 사용하지 않는 관련 tenant·README·hygiene smoke를 선택해 실행하고, diff/신규 파일 whitespace와 보호한 기존 파일 hash·HEAD/index를 확인한다.
- 종료: 별도 reviewer의 goal/계약/보안/판정·평가 정합성 의견을 수정·재검증하고 실제 command·exit·scope를 아래 기록한다. 고객 효과가 미측정이어도 이 **포트폴리오 기술 범위**는 마감할 수 있으나 원계획 D5 사용자 효과 검증 완료나 제품 전체 완료는 주장하지 않는다.

### 제외·확장 중단 조건

자동 dependency 추론, PASS 재binding, CI 생략, D2 assertion별 mapping/타 CI/dirty snapshot, DB·서명·영속 검토 이력, SaaS·새 provider·RAG/학습·배포는 제외한다. D4가 기존 계약의 구조 변경을 요구하면 그 변경은 수행하지 않고 해당 한계를 남긴다. commit·push·PR·merge·publish·고객 자료·provider 호출·기존 resource cleanup도 제외한다.

## 포트폴리오 기술 완결 실행 기록 — 2026-09-30

- D4는 별도 Agent가 새 core/CLI/test 3개만 담당했다. module 부재의 `ERR_MODULE_NOT_FOUND` RED(pass 0 / fail 1 / exit 1) 후 `node --test test/delivery-evidence-impact.test.mjs` **82/82 PASS**, exit 0. 누락/오래된 mapping, config/transitive 변경, mixed unknown 우선순위, cycle, mutation·순서, 잘못된 입력·UTF-8·1 MiB 경계를 검사했다. 주관 Agent도 code/contract를 읽었고 별도 reviewer가 같은 focused 결과와 dense graph 종료·순서 parity를 확인했다.
- D5는 주관 Agent가 구현했다. 평가 module 부재의 RED(pass 0 / fail 1 / exit 1) 후 `node --test test/delivery-evidence-evaluation.test.mjs` **13/13 PASS**, exit 0. 별도 reviewer가 oracle·independent reference·clone isolation·row shape·권한·미측정 경계를 읽고 같은 focused 결과를 직접 확인했다. normal/error oracle 검토는 Agent review이며 실제 사용자 성과 평가가 아니다.
- demo는 script/fixture 부재에서 3 fail을 먼저 확인한 뒤 `node --test test/delivery-evidence-demo.test.mjs` **5/5 PASS**, exit 0. JSON/Markdown 상태 parity, 다른 cwd에서 재현, real stdin impact CLI(exit 2), 옵션 거부를 검사했다. `node scripts/demo-delivery-evidence.mjs --format markdown`으로 current → stale/no-declared-impact → stale/recheck-required → stale/unknown을 확인했다.
- `node scripts/evaluate-delivery-evidence.mjs --format markdown`: synthetic 12건(normal 4 / error 8), candidate와 reference 모두 정답 12 / 불일치 0 / 정상 처리 4 / 거짓 current 0 / 불필요한 보류 0. 이 집계는 case/requirement/check 상태 분류에만 해당한다. 실제 검토자의 시간·false-ready·생산성·제품 우위는 미측정이다.
- 독립 최종 문서 review의 finding: “core는 파일/명령을 실행하지 않는다”는 문장이 D2 importer까지 포함하는 것으로 읽혔다. case study를 D1/D4/D5 판정 core로 한정하고 D1/D4 stdin, D2 source/test/config 및 고정 read-only Git 조회를 별도로 설명했다. reviewer가 실제 수정 상태를 재확인했다. 새 demo·D4·D5 code에 추가 actionable finding은 보고되지 않았다.
- 기본 `npm test`: Node `v24.18.0` / Darwin arm64에서 총 **2,144개, 2,140 PASS / 2 fail / 1 cancelled / 1 skipped**, exit 1, 약 207.28초. 변경하지 않은 Darwin suspended exec의 Python 조회 실패, OS isolation의 network control JSON 실패, 15초 fixture timeout이 남았다. 기본 전체 검사가 성공했다고 기록하지 않는다.
- 원인 분리: `node --test test/local-training-darwin-suspended-exec.test.mjs test/local-training-os-isolation.test.mjs` **10/10 PASS**, exit 0, 약 9.43초. 부하 조건에 민감한 결과와 일치하지만 단일 원인을 증명한 것으로 확대하지 않는다. runtime/probe/timeout/assertion은 수정하지 않았다.
- `node --test --test-concurrency=4 test/*.test.mjs`: **총 2,144개, 2,143 PASS / 0 fail / 0 cancelled / 1 skipped**, exit 0, 약 241.65초. skip은 기존 Linux boot-id injection regression이다. 기본 병렬 실행의 성공, Linux 실행 확인, 원격 CI 결과로 확대하지 않는다.
- 주관 통합 확인: `node --test test/delivery-evidence-*.test.mjs` **166/166 PASS**, exit 0, 약 13.11초. D1–D3의 실제 Node receipt/importer·HTTP 권한·source drift·UI 상태 회귀와 새 D4/D5/demo를 함께 확인했다. 기존 D3 browser 기록을 재사용해 새 browser 검증을 했다고 표현하지 않는다.
- `npm run smoke:web-tenant-isolation`, `npm run smoke:readme-portfolio-overview`, `npm run smoke:portfolio-docs-claim-boundary`, `npm run smoke:release-artifact-hygiene`: 모두 exit 0. 마지막 두 smoke는 기존 portfolio 문서/release 표면 검증이다. hygiene는 기존 artifact 127개, secret/machine-path finding 0이며 새 기능의 public release·증거 진위 인증이 아니다. 새 case study는 별도 static review로 확인했다.
- 새 module/script/test 9개 `node --check`: exit 0. tracked `git diff --check`, 새 파일과 계획 문서의 `git diff --no-index --check /dev/null <file>`: whitespace 진단 없음(신규 파일 diff의 exit 1은 차이 존재). README 새 수치의 측정 명령과 과장 표현을 확인했다.
- 시작 시 봉인한 D1–D3 기존 파일 18개 SHA-256이 모두 동일하다. README와 이 계획의 보완, 새 파일 12개만 이번 변경이다. HEAD와 branch는 시작 값 그대로이고 index는 비어 있다. 이전 dirty 변경은 그대로 보존한다. 모두 미커밋이며 commit·push·PR·merge·provider 호출·배포·publish·기존 resource cleanup은 하지 않았다.
- 종료선: **D4 + D5 synthetic 기술 평가 + demo/case study의 로컬 포트폴리오 기술 범위 완료**. 원래 D5 사용자 효과 평가, 전체 제품 roadmap, 기본 test 병렬 안정화, 외부 CI·공개·사업성은 완료로 표시하지 않는다. 선택적 기능 확장은 이번 종료 조건에 넣지 않는다.

## 최종 재현·검증 마감 계획 — 2026-09-30

사용자의 “이어서 완성까지” 요청에 따라 로컬 포트폴리오 범위의 실제 사용·검증 공백을 닫는다. 기능을 추가하지 않고 기존 D1–D5 계약을 유지한다. 직전 32-path dirty fingerprint, HEAD, 빈 index를 기준으로 변경 범위를 구분하며, 과거 실행 기록은 덮어쓰지 않는다.

| 단계 | 최소 변경 | 완료 기준 | 상태 |
|---|---|---|---|
| F1 | 기본 test scheduling과 새 기능의 CI 연결 | contract RED→GREEN, 같은 전체 glob·assertion·timeout 유지; 원격 미실행 구분 | 로컬 선언·검사 완료 |
| F2 | 실제 D2 receipt → D3 HTTP 검토·export 회귀 | 현재 source/receipt/검토 binding 일치, 권한 false, stale revision 거부, fixture source 불변 | 통합 회귀 완료 |
| F3 | case study에 실제 D2/D3 사용 순서 안내 | manifest·clean source·원본 보존·workspace 입력·메모·다운로드·종료 코드가 코드와 일치 | 작성·독립 검토 완료 |
| F4 | canonical npm test·focused·독립 review·기록 | 같은 전체 suite 실행 결과, 신규 회귀, diff/보존 검사와 정확한 로컬 종료선 | 로컬 마감 완료 |

F1은 `package.json`의 `test`에 `--test-concurrency=4`를 고정하고 `test:delivery-evidence`도 같은 병렬 제한으로 선언한다. `.github/workflows/provider-smoke.yml`의 기존 Node 24 job에 focused gate를 연결하고 `test/delivery-evidence-command.test.mjs`로 선언을 검사한다. 기존 CI·PR checklist 정합성을 유지하기 위해 `.github/pull_request_template.md`와 `scripts/smoke-contributor-onboarding.mjs`의 required command 목록도 같은 명령으로 맞춘다. 기존 제외·skip·timeout·assertion은 수정하지 않는다. 제한 병렬은 테스트 harness의 scheduling 정책이며 극단적 파일 간 부하에서 runtime의 안전성·성능이 입증됐다는 뜻이 아니다.

F2는 `test/delivery-evidence-http.test.mjs`의 기존 clean 임시 Git·JWKS·HTTP fixture를 재사용한다. 실제 native runner와 reporter/importer CLI를 실행하고 생성한 packet을 그대로 D3로 보낸다. 기존 실패·XSS·tenant/role·source 변경 경로를 삭제하거나 단순화하지 않는다. 임시 test fixture 안의 Git 초기화·commit과 정리는 기존 테스트의 동작이며 원본 repository의 commit·cleanup 권한이 아니다.

F3는 `docs/delivery-evidence-case-study.md`, 이 기록, README의 재현 명령만 맞춘다. 새로운 helper·provider·UI·fixture scaffold를 만들지 않는다. 실제 사용자는 승인된 clean 대상 repository를 사용하며, 이번 dirty 원본에서 receipt를 만들기 위해 commit·reset·cleanup하지 않는다.

소스 종료선은 F1–F4의 로컬 검증까지다. 원격 CI, 공개 fresh clone, source commit·push·PR·merge, 공개 artifact 갱신·publish·배포, 고객 자료·provider 호출은 아직 제외한다. 필요한 공개 작업은 이 검증 결과와 exact 변경 범위로 별도 승인 packet에 정리한다.

### 최종 마감 실행 기록

- 기본 command·focused command·기존 Node 24 CI 연결을 `test/delivery-evidence-command.test.mjs`로 먼저 고정했다. 선언 전 0 PASS / 2 FAIL, package 수정 후 CI 연결 부재 1 PASS / 1 FAIL, 연결 후 2/2 PASS, 각 RED exit 1 / GREEN exit 0을 확인했다. 같은 전체 `test/*.test.mjs`와 기존 timeout·assertion·skip을 유지했다.
- 실제 clean 임시 대상에서 native Node runner → reporter receipt → importer CLI → HTTP 판정·검토 → JSON/Markdown export를 연결했다. 요구·target·report·review binding, viewer 403, unverified 및 권한 false, fixture Git source 불변, 실제 packet/review의 revision 변경 후 409를 검사했다. 첫 실행의 Markdown 비교 실패는 기존 escaping을 빠뜨린 test 기대값을 수정한 것이며 runtime 결함 수정으로 기록하지 않는다. 원문 JSON entries와 escaped Markdown을 각각 확인한 재실행은 2/2 PASS, exit 0이다.
- Node `v24.18.0` / Darwin arm64에서 **`npm test`: 총 2,147 / 2,146 PASS / 0 fail / 0 cancelled / 1 skipped**, exit 0, 약 173.68초. 기존 Linux boot-id injection test가 skip됐고 Darwin CPU·OS 검사는 유지됐다. 기본 무제한 병렬의 실패 이력은 앞의 비교 기록에 남겼다. file scheduling 변경을 runtime 고부하 결함의 원인 규명·해결로 확대하지 않는다.
- **`npm run test:delivery-evidence`: 169/169 PASS**, exit 0, 약 16.14초. `npm-test.log`와 `delivery-focused.log`는 로컬 임시 로그로 보존하며 machine-specific directory는 공개 문서에서 제외한다. 임시 로컬 로그는 공개·서명된 evidence가 아니며 재현은 각각의 명령으로 한다.
- 새 CI 명령과 기존 onboarding의 exact command 목록이 달라 `npm run smoke:contributor-onboarding`에서 RED(exit 1)를 확인했다. PR template와 required 목록에 새 gate를 추가해 GREEN(exit 0)으로 맞췄다. 기존 parity·duplicate·negative 검사는 유지했다. 후속 변경은 이 두 선언뿐이며 관련 smoke, 2개 command regression 및 syntax를 다시 확인했다.
- `npm run smoke:readme-portfolio-overview`, `npm run smoke:portfolio-docs-claim-boundary`, `npm run smoke:release-artifact-hygiene`: exit 0. hygiene는 기존 release 대상 127개, machine-path·secret finding 0을 확인하며 새 feature의 공개·진위 인증은 아니다. 원격 workflow는 미실행이다.
- 수정한 두 test와 onboarding script의 `node --check`, tracked `git diff --check`, 전체 untracked 파일의 `git diff --no-index --check /dev/null <file>`에서 syntax·whitespace 진단이 없었다. 새 파일 diff의 exit 1은 내용 차이이며 검증 실패로 해석하지 않는다.
- 시작한 32-path fingerprint 중 의도적으로 보완한 README·case study·계획·HTTP test 4개를 제외한 **28개 파일의 SHA-256이 동일**했다. 추가된 dirty 경로는 package·workflow·PR template·onboarding script·command test 5개로 총 37개다. production D1–D5 및 UI 구현은 이번 마감 작업에서 변경하지 않았다. HEAD·branch는 시작 값 그대로이고 index는 비어 있다. commit·push·PR·merge·provider 호출·deploy·publish·기존 resource cleanup은 하지 않았다.
- 별도 Agent의 구현 review에서 actionable finding이 없었다. 문서 review가 macOS symlink 경유 임시 receipt 경로의 canonical 조건 위반을 지적해 `pwd -P`로 정정했고, 현재 파일 재검토에서 해결을 확인했다. 기본 local workspace와 기존 인증·tenant workspace도 구분했다. case study의 bash block 3개를 `bash -n`으로 syntax 검사해 exit 0을 확인했으며 실제 사용자 환경에서 새 수동 browser replay를 했다는 뜻은 아니다.
- **로컬 포트폴리오 기술 마감 완료.** 실제 receipt의 HTTP 인계, 재현 안내, canonical test scheduling, 기존 CI/checklist 선언까지 F1–F4를 닫았다. 원래 D5 사용자 효과 평가·사업성·production·원격 CI·공개 마감은 미완료로 남긴다. 현재 active app Goal은 조회에서 없었으며 과거 Orca Goal/resource를 재활성화하거나 변경하지 않았다.

### 공개 마감 승인 packet — 아직 미실행

대상은 `sungjin9288/personal-ai-agent`이며 현재 branch에 열린 PR은 read-only 조회에서 없었다. 제안 branch는 `codex/delivery-evidence-portfolio-closeout`이고 같은 local branch는 아직 없다. branch/remote 충돌이 확인되면 덮어쓰거나 force-push하지 않는다.

**승인 요청 범위:** 아래 37개 feature 경로를 하나의 grouped source commit으로 고정하고, 그 SHA에 필요한 기존 로컬 deterministic evidence를 결속한 별도 generated-evidence commit을 만든 뒤 push → ready PR → required CI 확인·관련 결함 보완까지 진행한다. 독립 Agent review는 현재 로컬 snapshot에서 수행했으며 후속 변경이 그 결과를 무효화하면 해당 부분을 다시 검토한다. merge·deploy·publish·외부 reviewer 알림·새 provider 호출·cleanup·history 재작성은 제외한다.

```text
.github/pull_request_template.md
.github/workflows/provider-smoke.yml
README.md
package.json
docs/delivery-evidence-case-study.md
docs/delivery-evidence-development-plan.md
examples/delivery-evidence/cases.mjs
examples/delivery-evidence/expected.json
examples/delivery-evidence/impact.json
scripts/check-delivery-evidence.mjs
scripts/check-delivery-impact.mjs
scripts/delivery-node-test-reporter.mjs
scripts/demo-delivery-evidence.mjs
scripts/evaluate-delivery-evidence.mjs
scripts/import-delivery-evidence.mjs
scripts/smoke-contributor-onboarding.mjs
src/core/delivery-evidence-evaluation.mjs
src/core/delivery-evidence-gate.mjs
src/core/delivery-evidence-impact.mjs
src/core/delivery-evidence-import.mjs
src/core/delivery-evidence-review.mjs
src/web/delivery-evidence-handlers.mjs
src/web/public/app.js
src/web/public/index.html
src/web/public/lib/delivery-evidence-review.js
src/web/public/lib/workspace-surface.js
src/web/public/styles.css
src/web/server.mjs
test/delivery-evidence-command.test.mjs
test/delivery-evidence-demo.test.mjs
test/delivery-evidence-evaluation.test.mjs
test/delivery-evidence-gate.test.mjs
test/delivery-evidence-http.test.mjs
test/delivery-evidence-impact.test.mjs
test/delivery-evidence-import.test.mjs
test/delivery-evidence-review.test.mjs
test/delivery-evidence-ui.test.mjs
```

기존 `smoke:execution-v1-snapshot`는 code 변경 commit을 artifact-only commit으로 인정하지 않는다. 따라서 공개 완료를 source commit만으로 표현하지 않는다. 승인 후 existing `build:local-v1-completion-closeout`, `refresh:execution-v1-artifacts -- --reuse-existing-deterministic`, 관련 clean/drill·pilot/Portfolio pipeline을 사용한다. `--live-*`는 사용하지 않고 과거 live evidence는 과거 증거로 보존한다. 이전 영상·screenshot·legacy synthetic evidence를 새 D1–D5의 fresh 실행 증거로 표시하지 않는다.

Generated commit은 `scripts/smoke-execution-v1-snapshot.mjs`의 `isReleaseArtifactSyncPath` 기존 allowlist 안에서 실제 pipeline이 생성한 관련 출력만 stage한다. 새 snapshot directory는 승인된 source SHA를 이름으로 사용한다. stage 전 실제 diff·출처·SHA binding·비밀정보·수치·기존 claim boundary를 확인하고, pipeline이 allowlist 밖을 수정하거나 provider·배포·새 권한을 요구하면 해당 작업을 중단한다. 검증은 touched surface와 필수 gate를 다시 실행하며, 원격 CI 성공은 실제 PR head의 결과로만 기록한다. 이번 packet은 실행 권한 자체가 아니며 사용자 승인이 필요하다.

### 공개 마감 preflight — 2026-09-30

사용자가 앞선 packet에 이어 진행을 요청했다. 주관 Agent와 별도 read-only Agent가 commit 전에 기존 release 계약을 다시 확인했으며 아래 두 dependency 누락을 발견했다. 기존 37-path 구현의 로컬 test PASS와 공개 pipeline 준비 완료는 구분한다.

1. `LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS`는 이전 `node --test test/*.test.mjs`를 고정한다. 현재 package의 cap4 명령과 달라 실제 command를 실행하기 전에 `Local v1 verification package script drifted: test.`로 거부된다. fake runner를 사용한 진단에서 command call은 0이었다. 기존 fixture가 같은 constant에서 기대값을 만들기 때문에 앞선 full unit PASS는 이 실제 manifest mismatch를 발견하지 못했다.
2. `config/portfolio-package-files.json`에 새 case study와 개발 계획이 없다. 기존 refresh만 실행하면 ZIP의 README에서 안내한 두 문서를 포함하지 못한다. 이 ZIP은 selective Portfolio 자료이며 전체 runtime을 담은 standalone 실행 bundle로 바꾸지 않는다.

검사 우회·이전 명령 복원·v2 artifact 재작성으로 마감하지 않는다. 최소 수정안은 **현재 verification/v3의 exact cap4 정책**, **과거 verification/v2의 역사 검증**, **current builder의 v3-only 실행**, **report의 개별 script digest와 제공한 package.json의 교차 결속**을 분리하는 것이다. 바깥 completion envelope는 shape·authority·status가 같으므로 기존 /v2를 유지하고 nested verification schema로 실행 정책을 구분한다. 과거 PASS를 현재 package/SHA의 PASS로 재사용하지 않는다.

앞선 37개에 다음 **4개 source 경로를 추가하는 승인**이 필요하다. 모두 미수정이며 source commit·generated evidence·push·PR도 아직 실행하지 않았다.

| 추가 경로 | 필요한 변경·회귀 |
|---|---|
| `src/core/local-v1-completion-closeout.mjs` | current policy 정합성, historical v2 검증 보존, package/script cross-binding |
| `test/local-v1-precloseout-verification.test.mjs` | literal 현재 manifest parity RED→GREEN; current builder가 legacy/변조 policy를 거부하고 실제 cap4 receipt를 결속 |
| `test/local-v1-completion-closeout.test.mjs` | frozen historical v2 보존, v3 결속, policy substitution·현재 package에 legacy receipt 재사용 거부 |
| `config/portfolio-package-files.json` | sorted allowlist에 새 case study·개발 계획 2개 추가 |

승인되면 source 범위는 총 41개이며 기존 grouped source commit → SHA-bound generated-evidence commit → push → ready PR → required CI 흐름을 유지한다. 새 회귀가 통과하면 current full suite 결과를 다시 측정한다. historical artifact의 byte·SHA·source 기록은 보존하고 실제 generated phase만 새 source SHA에 결속한다. 새 기능의 fresh 실행 증거와 legacy evidence의 carry-forward를 구분한다. merge·deploy·publish·provider 호출·cleanup·history 재작성 제외는 그대로다.

추가 승인 범위에는 기존 refresh가 재생성하는 ignored `output/playwright/execution-v1-visual-evidence-manifest.json`도 포함한다. 기존 파일이 있으면 먼저 byte·hash를 보존하고 이 경로만 재생성하며 stage하지 않는다. 그 밖의 예상하지 못한 출력은 중단한다. Portfolio pipeline 자체의 후보·transaction directory 생성·종료와 승인된 기존 pack 교체는 일반 pipeline 동작이며 기존 Goal·terminal·worktree 등의 cleanup을 허용하는 것은 아니다. handoff의 `git ls-remote`는 Git 원격 read-only 조회이지 provider 실행이 아니다.

실행 순서는 source commit 후 official local-v1 builder → execution refresh(`--reuse-existing-deterministic`) → clean rehearsal → production-like drill → 최종 pilot export → Portfolio refresh/check → 필수 smoke·diff → generated-evidence commit이다. builder 내부의 fresh command 실행과 reuse provenance를 구분한다. clean rehearsal은 현재 파일의 복사본 검사이지 Git-clean fresh clone 검사가 아니다. generated commit 뒤에는 source SHA를 유지한 채 검사를 확인하며 artifact HEAD로 다시 closeout builder를 실행하지 않는다.

### 41-path 공개 마감 실행 — 2026-09-30

사용자가 위 확장 packet에 이어 진행을 요청했다. 승인된 41개 source 경로와 명시한 generated/ignored 출력만 대상으로 TDD·검증·두 grouped commit·push·ready PR·CI를 진행한다. merge·deploy·publish·provider 호출·기존 resource cleanup·history 재작성은 하지 않는다.

- 시작 HEAD는 `9fe2a2aa6a6c7dc3921a93f8a39a33cd891f8644`, index는 비어 있고 기존 dirty 37개를 보존했다. 새 local branch `codex/delivery-evidence-portfolio-closeout`을 같은 HEAD에서 만들었으며 원래 branch ref는 변경하지 않았다.
- Portfolio 포함 회귀: 기존 command test에 literal 문서 두 경로와 sorted/unique manifest 검사를 추가했다. 수정 전 2 PASS / 1 FAIL(exit 1), manifest에 두 문서를 추가한 뒤 3/3 PASS(exit 0). ZIP은 selective 자료이며 전체 runtime bundle이라는 주장은 하지 않는다.
- 원격 main의 live SHA는 `58a5db21d56345e40dec057bd9a0ce47ccb6ab57`이다. 현재 기준에는 아직 원격에 없는 `7d5197dd` 미션 전환 정합성 commit과 `9fe2a2aa` 그 증적 commit이 포함돼 있다. main 대상 PR의 실제 diff에 두 commit도 포함되므로 동일 PR 공개를 추가 질문했으며, 답변 전에는 로컬 구현·검증·commit만 진행한다. 기존 commit은 amend·rebase·cherry-pick하지 않는다.
- local-v1 contract는 literal cap4 기대값, fresh builder의 legacy 거부, 현재 package에 historical receipt 재결속 거부를 먼저 검사했다. source 수정 전 focused RED 3/3 FAIL(exit 1), 최소 보완 후 두 suite 19/19 PASS(exit 0)다. 현재 verification/v3와 frozen historical/v2를 구분하고 전체 package hash뿐 아니라 각 script digest도 실제 package와 결속한다. outer completion/v2, authority·activity·status는 바꾸지 않았다.
- 별도 read-only Agent가 세 contract 파일의 diff를 검토해 actionable finding이 없었다. 실제 기존 artifact도 당시 `7d5197dd`의 19개 Git source와 historical/v2 assertion을 통과했다. 과거 artifact byte를 수정하거나 과거 PASS를 새 package/SHA의 PASS로 승격하지 않았다.
- Node `v24.18.0` / Darwin arm64에서 `npm test`는 총 2,154 / 2,153 PASS / fail 0 / cancelled 0 / skip 1, exit 0, 약 92.62초다. 기존 Linux 전용 skip은 유지했다. `npm run test:delivery-evidence`는 170/170 PASS, exit 0, 약 12.55초다. `npm-test-precommit.log`와 `delivery-focused.log`는 로컬 로그이며 공개·서명된 receipt가 아니다.
- `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`은 59/59 PASS, exit 0이다. 제외는 저장소가 정의한 precloseout 한 항목뿐이며 final docs 검사에서는 새 source SHA에 official closeout을 만든 뒤 포함한다. 관련 onboarding·README·claim-boundary smoke, contract syntax와 diff 검사가 통과했다.
- 원격 main 이후의 기존 두 commit은 별도 read-only Agent가 전체 19-path range를 검토했다. mission epoch·readiness·늦은 결과·실행 대상·port 0 처리와 회귀 계약에서 actionable finding이 없었다. 이 정적 review는 새 browser replay나 CI 실행, 공개·merge 승인을 대신하지 않는다.

Source 문서·코드·test를 commit 전에 검토·검증해 고정한다. source SHA 생성 후의 실행 결과와 공개 head·CI 상태는 해당 SHA의 official generated evidence와 PR에 기록하며, artifact-only commit에 source 계획 변경을 섞지 않는다.

### 재사용 provenance truth-sync 실행 — 2026-09-30

41-path source는 `3dd66ef00be8785814ba03b9322f26c1a73f5494`로 commit했다. 그 SHA의 official local-v1 검증 4개, docs 60개, clean rehearsal 36개, production-like drill 45개, pilot·Portfolio refresh/check는 로컬에서 통과했다. 그러나 별도 read-only review에서 기존 재사용 사유 `execution-v1-ui-http-unchanged-browser-excluded`가 실제 UI·HTTP 변경과 충돌하는 P2를 발견해 generated-evidence commit·push·PR을 보류했다. 과거 원본 SHA·시각·`reused-existing-not-rerun` 표기 보존은 통과했지만, 검사되지 않은 unchanged 사유까지 사실이 되는 것은 아니다.

사용자는 추가 3개 source와 관련 문서 정합성, 생성 후보 보존·해당 경로만의 baseline 복원, 별도 fix source commit → 최신 SHA 증거 commit → 기존 미게시 `7d5197dd`·`9fe2a2aa`를 포함한 같은 PR의 push·ready PR·CI 진행을 승인했다. `3dd66ef0`과 기존 commit은 그대로 보존한다. merge·deploy·publish·provider 호출·기존 resource cleanup·history 재작성은 계속 제외한다.

- 추가 source는 `scripts/execution-v1-deterministic-evidence-utils.mjs`, `test/execution-v1-deterministic-evidence-utils.test.mjs`, `scripts/smoke-execution-v1-reuse-provenance.mjs`뿐이다. 원본 source/time/status와 current-run 경계는 유지하고, 사유를 과거 증거 보존이라는 중립적 사실로 바꾼다. source identity를 검사하지 않는 코드에 unchanged 주장을 남기지 않는다.
- 생성 후보 31개는 archive SHA-256과 각 regular entry의 byte hash, exact inventory, path traversal 부재를 재검증했다. 그 후 tracked 생성 파일 25개만 exact `3dd66ef0` baseline으로 복원하고 신규 6개는 외부 보존 위치로 이동했다. archive와 신규 byte는 보존했고 source 41개·HEAD·branch·index·기존 snapshot은 변경하지 않았다. 복원 후 worktree는 clean이었다.
- 원격 main은 실행 직전에도 `58a5db21d56345e40dec057bd9a0ce47ccb6ab57`이며 같은 remote branch·PR은 없었다. branch protection의 strict required check는 `Provider fallback and attention smoke`다. 같은 PR에서 기존 `Target and enterprise documentation gate smokes`도 실제 head 결과를 확인한다. 이 조회는 CI 실행·성공이나 merge 승인을 뜻하지 않는다.

이 단계의 source 검증을 아래에 기록한 뒤 관련 문서를 함께 fix commit으로 고정한다. 이후 official builder와 기존 generated pipeline을 다시 실행하고 current full smoke·artifact parity·provenance·hygiene를 확인한다. 재사용한 과거 browser/live 결과는 이번 source SHA의 fresh 검증으로 표시하지 않는다.

- TDD는 `node --test test/execution-v1-deterministic-evidence-utils.test.mjs`로 literal 기대값을 먼저 고정했다. 구현 수정 전 총 5개 중 2 PASS / 3 FAIL(exit 1), 수정 후 5/5 PASS(exit 0)다. disposable cwd에서 실제 smoke를 실행해 중립 사유의 네 문서·snapshot 수용, 각각의 잘못된 unchanged 사유 거부, current-run에 남은 재사용 metadata 거부를 확인했다. oracle은 production 상수를 가져오지 않는다.
- 구현 변경은 utility와 smoke의 reason literal 세 곳뿐이다. source metadata 우선순위·timestamp·status·binding·browser 제외와 current-run guard는 그대로다. 세 파일의 `node --check`, `git diff --check`가 통과했다. 별도 read-only review도 actionable finding 없이 통과했고 실제 diff를 주관 Agent가 확인했다. 리뷰는 test·browser·provider 실행을 대신하지 않는다.
- Node `v24.18.0` / Darwin arm64에서 `npm test`는 총 2,157 / 2,156 PASS / fail 0 / cancelled 0 / skip 1, exit 0, 약 130.14초다. 기존 Linux 전용 skip은 유지했다. `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`은 59/59 PASS, exit 0이다. 이 source 단계에서는 새 SHA의 closeout을 아직 생성하지 않았고 canonical reuse smoke는 후속 official refresh 뒤에 확인한다.
- `npm run test:delivery-evidence`는 170/170 PASS, exit 0, 약 8.26초다. README overview·Portfolio claim-boundary smoke와 최종 source diff 검사가 통과했다. 이 결과까지 source 문서를 고정하고 이후 generated 결과와 실제 공개 head·CI는 별도 evidence/PR에 기록한다.

### D3 metadata와 host 관측 증거 보완 — 2026-10-01

`c51226ed508d870dcf80ee0d4798c4c05f81da80`의 generated pipeline은 통과했지만 최종 `npm run smoke:all`은 291개 중 287 PASS / 4 FAIL, exit 1, 534초였다. `smoke:ui-harness-browse`는 새 D3 control의 기존 명시적 metadata 계약 누락을 발견했다. `smoke:local-training-os-isolation`, `smoke:local-training-runtime-exec-observation`, `smoke:local-training-darwin-suspended-exec`는 저장 증거와 현재 host 관측 snapshot이 달랐다. 검사를 제외하거나 과거 증거를 수동 치환하지 않고 generated commit·push·PR을 보류했다.

사용자는 UI source 2개와 관련 문서 정합성, host 원본 JSON 3개 갱신, 보존된 생성 후보의 exact 복원, 논리별 commit·새 SHA 증거 재결속을 승인했다. 이후 기존 미게시 두 commit을 포함하는 push·ready PR·required CI까지 이어간다. Merge·deploy·publish·제품 provider/model 실행·download/training·고객/비밀정보·기존 Goal/terminal/worktree/resource cleanup·history 재작성은 제외한다.

- 재개 직전 HEAD와 branch, empty index, 기존 31-path candidate의 exact inventory·각 byte hash·archive hash가 일치했다. Tracked 생성 25개만 exact `c51226ed` baseline으로 복원하고 신규 6개는 외부 보존 위치로 옮겼다. Git clean과 refs·worktree identity 불변을 확인했다. Host 원본 JSON 3개도 먼저 byte/hash 보존했다. 외부 archive·manifest와 기존 후보·snapshot은 삭제하지 않았다.
- UI TDD는 실제 `index.html`의 D3 controls 10개를 literal 계약으로 검사했다. `node --test test/delivery-evidence-ui.test.mjs`에서 HTML 수정 전 9 PASS / 1 FAIL(exit 1), 보완 후 10/10 PASS(exit 0)다. Buttons 5개에 표시 문구와 같은 ARIA name/title, form controls 5개에 기존 label과 같은 ARIA name만 추가했다. Visible text·label 연결·input limits·disabled·동작·기존 static guard는 그대로다. 이미 있는 label을 무시하고 접근 가능한 이름이 전혀 없었다고 주장하지 않는다.
- `npm run smoke:ui-harness-browse`는 exit 0이다. 수정 test의 `node --check`, scoped `git diff --check`와 독립 read-only review도 통과했다. 정적 metadata와 local HTTP/fixture 검증이며 새 browser·screen-reader 실사용 검증은 아니다.
- Host 증거는 기존 `build:local-training-os-isolation-evidence` → `smoke:local-training-os-isolation`, `build:local-training-runtime-exec-observation-evidence` → `smoke:local-training-runtime-exec-observation`, `build:local-training-darwin-suspended-exec-evidence` → `smoke:local-training-darwin-suspended-exec`를 순차 실행했다. 각 builder/replay 1회, 총 6개 command exit 0이며 반복 갱신하지 않았다. 갱신 직후 독립 replay의 hash가 저장본과 같았다. 세 failure guard 집합 10/9/11개, claim boundary·schema·contract·limitations·costFree를 보존했다.
- 실제 변경은 `local-training-os-isolation.json`의 system-tool SHA, `local-training-runtime-exec-observation.json`의 runtime image count/set SHA/unresolved count, `local-training-darwin-suspended-exec.json`의 selected signed interpreter CDHash aggregate 및 각각의 evidence hash/id뿐이다. 원본 backup은 `c51226ed`와 byte-identical이며 self-hash와 builder/replay 로그를 주관·독립 Agent가 검산했다. OS 업데이트나 toolchain 선택을 단일 원인으로 단정하지 않고, 두 invocation의 일치를 무제한 host 환경 안정성으로 일반화하지 않는다.
- 기존 probe와 공통 adapter evaluator의 local subprocess·loopback control·자체 임시 fixture repo와 파일/hardlink 생성·finally 정리만 실행했다. 실제 provider·download/install·MLX/training·production 실행은 없었다. Runtime-image-provenance builder는 추가 실행하지 않았다. 세 원본은 artifact-sync allowlist 밖이므로 별도 grouped host-evidence integration commit으로 고정하며, allowlist·assertion·source 계약을 변경하지 않는다.
- Node `v24.18.0` / Darwin arm64에서 `npm test`는 총 2,158 / 2,157 PASS / fail 0 / cancelled 0 / skip 1, exit 0, 약 200.79초다. `npm run test:delivery-evidence`는 171/171 PASS, exit 0, 약 12.79초다. Linux 전용 기존 skip과 cap4 정책을 유지했다. 이 local 실행을 원격 CI 성공으로 대신하지 않는다.
- `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout`은 59/59 PASS, exit 0이다. 새 SHA의 closeout만 기존 계약대로 precloseout에서 제외했으며 final docs에서는 포함한다. Hygiene·README overview·Portfolio claim-boundary와 source diff 검사가 통과했다. Source 문서의 수치·권한·과거 실패·미실행 상태는 실제 로그와 대조했다.

UI fix와 문서, host 원본 증거를 각각의 논리적 commit으로 고정한 뒤 최신 integration SHA에 official local-v1 closeout·execution reuse·clean/drill·최종 pilot·Portfolio를 결속한다. Final docs/full smoke·hygiene·artifact parity·독립 검토를 실제 확인한 뒤에만 generated-evidence commit·push·ready PR·CI를 진행한다. source freeze 뒤의 실행 결과는 generated evidence·PR에 기록하며 source 문서를 artifact-only commit에 섞지 않는다. 관측이 다시 달라지거나 drift/예상 밖 출력이 생기면 재시도·manual copy·검사 완화 없이 중단한다.
