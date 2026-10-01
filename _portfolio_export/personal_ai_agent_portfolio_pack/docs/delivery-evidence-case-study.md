# 변경 인계 검증: 완료 주장과 현재 근거를 분리하기

이 사례는 coding agent를 대체하는 제품이 아니라 **요구사항·현재 코드·시험 근거가 어긋났을 때 인계 판단을 보류하는 local 기술 사례**다. 판정은 선언된 입력과 binding의 일치를 확인한다. 고객 인수, 증거 진위, 요구사항의 의미적 충족을 인증하지 않는다.

범용 Personal AI Agent의 사업 확장과 분리해 종료선을 정했다. 기존 harness를 더 크게 만드는 대신 revision-bound 근거 판정, 실제 Node test 결과 수집, 검토·내보내기, 선언된 변경 영향, 재현 평가를 하나의 흐름으로 연결했다. SaaS 출시나 유료 수요를 입증한 사례는 아니다.

## 해결하려는 문제

이전 commit에서 시험이 통과했더라도 현재 코드의 근거는 아니다. 코드가 같아도 요구 기준, test/config digest 또는 환경이 바뀌면 같은 결론을 재사용할 수 없다. 시험이 요구사항을 검증한다는 매핑 자체도 검토가 필요하다.

이 사례의 질문은 “agent가 작업을 완료했다고 말했는가?”가 아니라 “선언한 현재 기준에 맞는 근거가 있고, 검토가 필요한 부분을 구분했는가?”다. 항상 막는 방식도 정상 사례를 처리하지 못하므로 평가를 통과할 수 없다.

## 책임과 흐름

```text
요구 기준 + 현재 source/check/environment + D2 Node test receipt
  → D1 binding 판정 → D3 요구별 검토·revision-bound 내보내기

선언된 dependency graph + 변경 path + base mapping
  → D4 재확인 / 선언된 영향 없음 / 불명 (D1 상태는 변경하지 않음)

별도 synthetic 입력 → D1 / 독립 checklist
  → D5 oracle와 상태 분류 비교
```

D4는 D1의 판정을 수정하지 않는다. `no-declared-impact`여도 과거 revision의 PASS는 계속 stale이다. D4는 CLI와 기존 web 검토 화면에서 선택적으로 사용하며, D5는 별도 CLI다. D5는 D1의 상태 분류를 검사하며 사용자 효과나 증거의 진위를 대신 검사하지 않는다.

| 구성 | 실제 구현 | 중요한 경계 |
|---|---|---|
| D1 | [gate](../src/core/delivery-evidence-gate.mjs), [CLI](../scripts/check-delivery-evidence.mjs) | project·revision·criterion·check digest·environment 일치, 실패·누락·충돌·미확정 mapping 구분 |
| D2 | [reporter](../scripts/delivery-node-test-reporter.mjs), [importer](../src/core/delivery-evidence-import.mjs), [CLI](../scripts/import-delivery-evidence.mjs) | Node 24 native runner와 clean committed source; suite-wide mapping이지 assertion별 요구 추적은 아님 |
| D3 | [review core](../src/core/delivery-evidence-review.mjs), [HTTP handler](../src/web/delivery-evidence-handlers.mjs), [UI](../src/web/public/lib/delivery-evidence-review.js) | workspace/tenant/role 및 현재 source 확인; self-declared reviewer, portable bundle 복원, JSON/Markdown export. 서명·서버 영속 review history는 없음 |
| D4 | [impact core](../src/core/delivery-evidence-impact.mjs), [stdin CLI](../scripts/check-delivery-impact.mjs), web 검토 panel | graph·mapping은 self-declared. packet과 project/revision/requirement criterion을 함께 확인. 자동 의존성 추론·시험 생략·PASS 재binding 없음 |
| D5 | [evaluation core](../src/core/delivery-evidence-evaluation.mjs), [evaluation CLI](../scripts/evaluate-delivery-evidence.mjs) | 별도 [입력](../examples/delivery-evidence/cases.mjs)·[정답표](../examples/delivery-evidence/expected.json); 상태 분류만 비교 |

### 주요 설계 판단

- 판정기는 deterministic 함수다. LLM의 완료 설명이나 자유 형식 답변을 근거로 상태를 올리지 않는다. 이 기능 자체에는 provider가 필요하지 않다.
- evidence-current는 현재 binding에 맞는 reported pass라는 뜻이다. 입력자가 거짓 결과나 불충분한 시험을 제공하는 문제까지 해결한 이름이 아니다.
- 알려진 영향과 불명이 함께 있으면 D4는 `unknown`을 우선하며 알려진 changedPaths도 남긴다. graph 밖 변경을 무관한 변경으로 낙관하지 않는다. cycle은 visited set으로 종료한다.
- 정상 입력에 대한 독립 checklist reference를 별도로 작성했다. candidate를 호출하거나 정답표를 읽어 reference 답을 생성하지 않는다. 두 구현 모두 같은 정답이어도 성능·생산성 우위를 주장하지 않는다.
- D1/D4/D5 판정 core는 파일·명령·network를 실행하지 않는다. D1/D4 CLI는 제한된 stdin을 읽고, demo/evaluation CLI는 bundled fixture를 읽어 stdout으로 출력한다. D2 importer는 source/test/config를 읽고 고정된 read-only Git 조회 명령으로 clean source identity를 확인한다. 새 의존성이나 default runtime 설정은 추가하지 않았다.

## 로컬 재현

저장소 root에서 Node 24로 실행한다. 아래 demo·evaluation은 credential-free이며 실제 provider나 고객 자료를 사용하지 않는다.

```bash
node scripts/demo-delivery-evidence.mjs --format markdown
node scripts/evaluate-delivery-evidence.mjs --format markdown
node scripts/check-delivery-impact.mjs < examples/delivery-evidence/impact.json
npm run test:delivery-evidence
```

impact 명령의 exit 2는 fixture의 `recheck-required`라는 정상적인 보류 결과다. D4는 모든 요구가 `no-declared-impact`이면 exit 0, 재확인/불명이면 2, 입력 오류면 1이다. **exit 0도 근거 재사용이나 실행 허가가 아니다.** demo/evaluation의 exit 0은 bundled 평가가 정답과 일치한다는 뜻일 뿐이다.

D4 입력은 상대 file identifier를 사용하며 파일을 열지 않는다. UTF-8 JSON을 최대 1 MiB로 받고 잘못된 경로·중복·알 수 없는 field·크기 초과를 거부한다. arbitrary input/output path 옵션은 제공하지 않는다. JSON 전체 결과는 demo/evaluation의 `--format json`으로 확인할 수 있다.

### 혼자 점검할 때의 순서와 완료 기준

먼저 위 demo·evaluation으로 [상태 차이](#데모에서-보이는-차이)를 확인하고, `npm run test:delivery-evidence`로 실제 Node receipt·HTTP·복원·오류 경로의 자동 회귀를 실행한다. demo의 정답을 미리 본 자가 점검은 blind 평가가 아니며, 자동 회귀 통과도 직접 화면을 사용했다는 뜻은 아니다.

화면은 아래 사용 안내의 **실행을 승인받은 clean 대상과 독립 local runtime**에서 점검한다. 대상이 준비되지 않았다면 자동 회귀까지만 확인하고 화면 점검은 미실행으로 남긴다. 점검을 위해 작업 중인 repository를 commit·reset하거나 기존 runtime을 종료하지 않는다.

| 직접 해 볼 동작 | 정상적으로 보여야 할 결과 |
|---|---|
| `현재 기준 읽기` | 근거가 없는 packet은 `blocked`다. 이 버튼이 새 시험을 실행하거나 PASS를 만들어서는 안 된다. |
| 현재 대상에서 수집한 `imported.json` 열기 | 모든 검사가 PASS이고 mapping이 확인된 입력이면 `evidence-current`다. 현재 binding의 reported pass일 뿐 인수·배포·실행 허가는 아니다. |
| 검토자·이유를 넣어 메모 반영 | 반영된 메모가 보이고 원래 evidence 판정은 유지된다. 예외 메모도 blocked를 PASS로 올리지 않는다. |
| 메모가 있는 상태에서 영향 입력에 `{`만 넣고 반영 | 입력 오류를 알리고 마지막 반영 메모를 보존한다. JSON/Markdown 다운로드는 막혀야 한다. 영향 입력을 비우고 다시 반영하면 영향을 제거한 결과를 재확인할 수 있다. |
| JSON과 Markdown 저장 후 새로고침, 같은 workspace에서 JSON 다시 열기 | 메모·원래 자기 선언 시각·선택적 영향이 복원된다. JSON/Markdown의 판정과 메모는 서로 맞아야 한다. source가 달라져 복원이 거부되면 과거 PASS나 메모를 새 기준에 수동으로 결속하지 않는다. |

다른 workspace·revision의 거부는 기존 자동 회귀에도 포함된다. 직접 보겠다고 대상 source를 바꾸거나 새 commit을 만들 필요는 없다. 새 packet 입력은 이전 검토를 무효화하므로 이미 반영한 메모를 남기려면 먼저 JSON으로 저장한다. 서버에는 영속 검토 이력이 없다.

점검 기록에는 `git rev-parse HEAD`, `git status --short`, `node --version`, 실행한 명령의 exit code와 직접 확인한 동작만 남긴다. 각 항목을 통과·실패·미실행으로 구분하고, 실패하면 원본 bundle을 보존한 채 재현 동작과 오류를 기록한다. 이름·경로·메모·화면에 민감정보가 없는지 확인하기 전에는 외부로 공유하지 않는다.

HTTP 통합 검사가 timeout으로 취소되면 해당 실행은 통과가 아니다. `node --test test/delivery-evidence-http.test.mjs`로 현재 같은 테스트의 단독 실행을 비교할 수 있지만, 단독 PASS로 원래 병렬 실행 결과를 대체하지 않는다. 현재 HTTP 검사는 세 독립 scenario마다 25초를 허용한다. 이전 합산 25초에서 총 예산이 늘어난 사실과 supervisor 세 통합 사례의 test-local 5초 예산은 [후속 검증 기록](delivery-evidence-development-plan.md#supervisor-실패-분류-검증-계획--2026-10-01)에 명시했다. production deadline·권한·assertion은 유지했다. 제한이나 fixture를 바꿨다면 이유·영향을 공개하고 관련 전체 회귀를 다시 확인하며, 원래 실패를 지우거나 검사를 제외해 완료로 기록하지 않는다.

이 점검은 포트폴리오 기술 사례를 이해하고 재현할 수 있는지 확인한다. 실제 reviewer의 false-ready·설정/유지/검토 시간·반복 사용 의사와 유료 수요는 측정하지 않는다. 기능 점검을 마쳤다고 원래 D5 사용자 효과 평가를 완료로 바꾸거나, 정답을 본 자가 점검을 독립 reviewer 평가로 기록하지 않는다.

### 실제 Node 결과를 web 검토로 연결하기

위 synthetic demo와 다른 경로다. 자동 임시 fixture 재현은 `node --test test/delivery-evidence-http.test.mjs`로 확인할 수 있다. 이 검사는 native runner → receipt → importer CLI → 실제 HTTP 검토 → JSON/Markdown 결과 → revision 변경 후 거부를 실행한다. 임시 fixture의 Git commit은 검사 내부의 준비 동작이며 이 저장소나 실제 대상의 commit을 뜻하지 않는다.

직접 사용하려면 실행을 승인받은 비민감 **clean 대상 repository**가 필요하다. 그 대상에는 [D2 manifest](delivery-evidence-development-plan.md#d2-사용-계약)가 이미 commit돼 있어야 한다. 준비를 위해 현재 dirty 원본을 commit·reset·cleanup하지 않는다. 아래 두 경로와 test 파일명은 실제 위치·manifest의 `testFiles` 전체 목록으로 바꾼다. Node 24와 symlink가 아닌 실제 파일·directory의 canonical 절대 경로를 사용한다. suite-wide 결과이므로 개별 요구사항 충족 여부는 사람이 따로 검토한다.

```bash
tool_repo="/absolute/personal-ai-agent"
target_repo="/absolute/approved-clean-target"
evidence_dir="$(cd "$(mktemp -d)" && pwd -P)"

(
  cd "$target_repo"
  node --test --test-concurrency=4 \
    --test-reporter="$tool_repo/scripts/delivery-node-test-reporter.mjs" \
    approval.test.mjs > "$evidence_dir/receipt.json"
)
node "$tool_repo/scripts/import-delivery-evidence.mjs" \
  --repo "$target_repo" --receipt "$evidence_dir/receipt.json" \
  > "$evidence_dir/imported.json"
```

fresh evidence directory 안에만 출력을 둔다. `pwd -P`는 macOS의 `/var` 같은 symlink 경유 경로를 물리 경로로 바꿔 importer의 canonical path 조건을 유지한다. importer는 대상에 쓰지 않는다. 검사 실패여도 완료된 receipt가 있으면 importer가 blocked로 설명하며 exit 2다. abort·잘린 실행·지원하지 않는 옵션에는 완료된 receipt가 없으므로 import를 진행하지 않는다. 검사 코드는 실행되는 것이므로 reporter를 sandbox로 취급하지 않는다.

그다음 같은 대상에 대한 독립 로컬 runtime을 시작한다. workspace 등록은 새 runtime에 기록하는 작업이며 대상 Git source를 수정하지 않는다. 기존 실행 중인 server나 runtime을 종료·덮어쓰지 않는다.

```bash
export PERSONAL_AI_AGENT_ROOT="$(cd "$(mktemp -d)" && pwd -P)"
export PERSONAL_AI_AGENT_UI_HOST="127.0.0.1"
export PERSONAL_AI_AGENT_UI_PORT="0"
node "$tool_repo/src/cli.mjs" workspace add "$target_repo" --name "Delivery review"
node "$tool_repo/src/web/server.mjs"
```

server가 표시한 실제 local URL을 연다. port 0은 비어 있는 port를 선택한다. 기본 local 예시는 외부 공개용 인증 설정이 아니며 `0.0.0.0`으로 노출하지 않는다. CLI로 새로 등록한 workspace는 tenant가 비어 있는 local workspace다. 이미 인증·tenant/RBAC를 사용하는 환경에서는 위 local 등록 예시 대신 해당 tenant에 이미 허용된 workspace와 operator 권한을 사용하며, 거부를 피하려고 인증·권한 설정을 낮추지 않는다. provider 설정이나 mission 실행은 필요 없다.

1. 등록한 workspace를 선택하고 `검토하기`의 `변경 인계 근거`로 이동한다.
2. `현재 기준 읽기`는 근거 없는 현재 packet을 보여 주므로 처음에는 blocked다. 새 시험을 실행하는 버튼이 아니다.
3. `imported.json` 전체를 `Packet, importer 출력 또는 검토 bundle JSON`에 넣고 `증거 판정하기`를 누르거나 JSON 파일 열기를 사용한다. 업로드한 report는 버리고 서버에서 packet과 현재 source를 다시 판정한다.
4. 검토자 이름, 요구사항, 메모 종류, 이유를 입력하고 `검토 메모 반영`을 누른다. self-declared 메모는 상태나 권한을 올리지 않는다. 미반영 초안이 있으면 다운로드할 수 없다.
5. 선택적으로 `선언된 변경 영향 JSON`에 D4 입력을 넣고 `변경 영향 반영`을 누른다. [입력 예](../examples/delivery-evidence/impact.json)의 project/current revision과 모든 requirement ID·criterion SHA-256을 현재 packet에 맞춰야 한다. baseRevision과 mapping은 과거 선언 기준이며, 변경 경로·graph를 자동으로 수집하지 않는다. 빈 입력 반영은 영향을 제거한다. 실패하거나 unknown이어도 메모가 인계 승인으로 바뀌지 않는다.
6. `현재 결과 JSON 다운로드`는 다시 열 수 있는 `delivery-review-bundle/v1`을, Markdown은 같은 화면의 판정·메모·영향을 내려받는다. source는 다운로드 직전 다시 확인한다. JSON은 업로드 한도를 지키기 위해 compact 형식이다.
7. 새로고침 뒤 같은 workspace에서 저장한 JSON 파일을 열면 현재 source를 다시 확인하고 메모·원래 자기 선언 시각·영향을 복원한다. workspace·revision·기준이 달라진 저장본은 자동 재binding하지 않는다. 이전 형식의 메모 포함 export는 조용히 메모를 버리지 않고 안내와 함께 거부한다. 원본을 보존한 뒤 packet만 별도로 입력할 수 있다.

bundle의 digest는 packet·메모·시각·impact 입력의 수정 탐지용이다. 누구나 다시 계산할 수 있으므로 서명·공식 검토 이력·실행 진위 인증이 아니다. 복원한 report와 Markdown을 신뢰하는 대신 서버가 다시 계산하며, 메모 편집 시 새 검토 시각을 기록한다. 잘못된 영향 입력이나 HTTP 실패에는 마지막 결과를 보존하지만 재확인 전 export는 막는다.

공유 전 기준·식별자·이름·메모를 직접 확인한다. 자동 비식별화·외부 전송·영속 review history는 제공하지 않는다. 사용을 마치면 **자신이 이 예제로 시작한 server만** Ctrl+C로 종료하며, 기존 server·source·artifact는 정리하지 않는다.

### 데모에서 보이는 차이

모든 revision·파일명·근거는 synthetic이다. 다음 상태는 실제 `node scripts/demo-delivery-evidence.mjs --format markdown` 출력으로 재현된다.

| 단계 | D1 evidence | D4 영향 | 의미 |
|---|---|---|---|
| 현재 binding의 reported pass | evidence-current | 미평가 | 선언된 현재 근거는 맞지만 인수·배포 승인 아님 |
| graph에 선언된 무관한 파일 변경 | blocked / stale | no-declared-impact | 영향이 없다고 선언돼도 과거 PASS는 현재 근거가 아님 |
| 간접 의존 config 변경 | blocked / stale | recheck-required | 선언된 test → source → config 연결에 변경 존재 |
| graph 밖 신규 파일 변경 | blocked / stale | unknown | 모델에 없는 영향은 모른다고 남김 |

이전 public recorded walkthrough는 기존 harness의 별도 증거다. 새 D1–D5 기능의 영상·hosted demo로 재사용하지 않는다. D3의 이전 browser 검증과 이후 metadata 보완은 [개발 기록](delivery-evidence-development-plan.md)에 남긴다. 이번 portable round-trip과 D4 web 통합의 새 검증은 같은 문서의 추가 완성 범위에 별도로 기록하며 과거 영상·metadata 검사를 fresh browser 검증으로 표시하지 않는다.

## Synthetic 평가 결과와 한계

측정 명령: `node scripts/evaluate-delivery-evidence.mjs --format markdown`. 입력과 별도로 작성한 oracle의 overall/requirement/check ID 및 상태에 대해 비교한다. 별도 Agent가 oracle·reference·결과 shape와 claim boundary를 읽기 전용으로 검토했다. 이는 사람의 업무 성과 측정이나 고객 인수가 아니다.

| 대상 | 사례 수 | 정답 일치 | 불일치 | 정상 처리 | 거짓 evidence-current | 불필요한 보류 |
|---|---:|---:|---:|---:|---:|---:|
| candidate D1 | 12 | 12 | 0 | 4 | 0 | 0 |
| deterministic checklist reference | 12 | 12 | 0 | 4 | 0 | 0 |

분모는 정상 4건과 오류 8건이다. 정상 처리·불필요한 보류는 정상 사례, 거짓 current는 오류 사례에서 집계한다. 여러 요구/check 사례도 case 한 건으로 세며 전체 requirement/check 상태가 일치해야 정답 일치로 센다. 정의된 fixture 수와 이 명령의 실제 결과를 구분하며 회귀 test 수와 혼용하지 않는다.

오류 사례는 누락, 오래된 revision, criterion 변경, test/config digest 변경, 다른 environment, 다른 project, current pass/fail 충돌, mapping 미확정이다. 독립 reference와 candidate는 **동률**이다. 실제 사람이 놓치는 빈도, Codex/Claude Code/CI 대비 우위, 시간·비용 절감은 이 표로 알 수 없다.

always-block은 정상 처리를 놓치고 always-current는 오류를 current로 올리므로 둘 다 실패한다. 올바른 overall blocked만 반환하고 check 수준에서 stale을 missing으로 잘못 구분해도 실패한다. 누락·중복·추가·잘못된 output row, oracle 누락/중복, 입력 mutation과 label leakage를 회귀로 검사한다.

## 로컬 검증 상태

아래 표는 Node `v24.18.0` / Darwin arm64, 2026-09-30~2026-10-01 초기 source 단계의 역사적 실행 기록이다. 최신 portable round-trip·병합 후 보완과 전체 회귀 결과는 [개발 계획의 최신 로컬 마감](delivery-evidence-development-plan.md#현재-계약-정합성-마감--2026-10-01)에서 확인한다. 아래 수치는 정의된 test 함수 수가 아니라 각 명령의 실제 runner 결과다. 이 기록 시점에 원격 CI는 실행하지 않았다. source SHA에 결속한 후속 closeout과 원격 CI는 generated evidence와 해당 PR에서 구분해 기록한다.

### 초기 source 단계의 마감 검사

`npm test`는 같은 전체 glob에 file-level `--test-concurrency=4`를 고정했다. 실제 Darwin 검사를 제외하거나 timeout·assertion을 낮추지 않았다. 이는 재현 가능한 test scheduling 정책이며 무제한 host 부하에 대한 runtime 보증이 아니다.

| 명령 | 실제 결과 | 범위·제한 |
|---|---|---|
| `npm test` | 총 2,158 / 2,157 PASS / 실패 0 / skip 1, exit 0 | 2026-10-01 전체 regression, 기존 Linux 전용 1개 skip |
| `npm run test:delivery-evidence` | 171/171 PASS, exit 0 | 2026-10-01 실제 receipt → importer → HTTP 검토/export 및 과거 revision 거부 포함 |
| `node --test test/delivery-evidence-ui.test.mjs` | 10/10 PASS, exit 0 | 실제 HTML의 D3 control 10개 metadata와 기존 UI 상태·export 회귀 |
| `npm run smoke:ui-harness-browse` | PASS, exit 0 | 기존 static metadata 계약과 local HTTP/fixture 검사; 새 browser 실행 아님 |
| `node --test --test-concurrency=4 test/local-v1-precloseout-verification.test.mjs test/local-v1-completion-closeout.test.mjs` | 19/19 PASS, exit 0 | 현재 verification/v3, 과거 v2 보존, policy substitution·현재 package에 과거 receipt 재결속 거부 |
| `node --test test/execution-v1-deterministic-evidence-utils.test.mjs` | 5/5 PASS, exit 0 | 중립적인 archive 재사용 사유, 원본 source/time/status 유지, 네 문서·snapshot의 잘못된 unchanged 사유와 current-run 잔존 metadata 거부 |
| `npm run smoke:docs-gates -- --exclude smoke:local-v1-completion-closeout` | 59/59 PASS, exit 0 | source commit 전 계약상 precloseout; 새 SHA의 closeout은 이후 official builder로 생성 |

focused gate를 기존 Node 24 CI job에 선언했으며 이 연결을 static regression으로 검사했다. 원격 workflow를 실행하거나 CI가 통과했다고 주장하지 않는다.

### 마감 전 비교 기록

다음은 scheduling 변경 전의 결과다. 이전 기본 실행의 실패를 최종 성공 결과로 덮어쓰지 않는다.

| 명령 | 실제 결과 | 범위·제한 |
|---|---|---|
| `node --test test/delivery-evidence-*.test.mjs` | 166/166 PASS, exit 0 | D1–D5와 demo, 실제 임시 Node receipt·HTTP fixture 포함 |
| `node --test --test-concurrency=4 test/*.test.mjs` | 총 2,144 / 2,143 PASS / 실패 0 / skip 1, exit 0 | 제한 병렬 full regression; skip은 기존 Linux 전용 검사 |
| `npm test` | 2,140 PASS / 실패 2 / cancelled 1 / skip 1, exit 1 | 기본 병렬에서 변경하지 않은 Darwin 실행·OS probe가 실패/timeout. 기본 성공으로 대체하지 않음 |
| `node --test test/local-training-darwin-suspended-exec.test.mjs test/local-training-os-isolation.test.mjs` | 10/10 PASS, exit 0 | 위 실패 suite의 분리 실행. 병렬 실패의 단일 원인 규명은 아님 |

syntax·whitespace·관련 smoke와 독립 code/document review도 수행했다. source commit 전에는 기존 dirty 변경을 보존하면서 integration test·재현 안내·test command/CI 선언과 필요한 closeout·Portfolio 계약만 보완했다. 과거 closeout을 덮어쓰지 않고 현재 builder와 역사 검증을 분리했으며, actual historical artifact도 당시 Git source와 검증했다. 상세 명령·권한·후속 generated evidence 범위는 [실행 기록](delivery-evidence-development-plan.md)에 남긴다. 현재 scheduling에서의 통과를 무제한 병렬 안정화나 공개 release 완료로 해석하지 않는다.

첫 source commit 이후 generated review에서 기존 재사용 사유의 `ui-http-unchanged`가 실제 변경과 충돌하는 오류를 발견했다. 과거 source/time/not-rerun은 유지하되 사유를 `execution-v1-archived-evidence-browser-excluded`로 정정했다. 위 최종 full 수치는 이 보완까지 포함한다. 과거 browser·live 결과 자체를 다시 실행하거나 최신 UI의 검증으로 재분류하지 않았다.

`c51226ed`의 최종 full smoke는 287/291 PASS, 실패 4개로 공개 마감을 중단했다. D3의 metadata 계약 누락과 host-bound 관측 증거 3개의 불일치였다. 승인 후 UI의 명시적 metadata만 보완하고 기존 host builder 3개와 대응 독립 replay를 각각 1회 실행해 모두 통과했다. 관측값·hash/id 외 권한·guard·계약은 유지했으며 원본과 생성 후보를 보존했다. Host 증거는 release artifact allowlist 밖이므로 별도 integration commit으로 고정한다. 이 source 기록은 후속 SHA의 final full smoke·원격 CI 성공을 예고하지 않는다.

## Scope & Limitations

- 이 기능은 local prototype의 기술 사례다. 전체 Personal AI Agent roadmap, 사업성, 배포·제품 출시의 완료를 뜻하지 않는다.
- Portfolio ZIP은 이 case study와 개발 기록을 포함한 selective 자료 모음이지 standalone 실행 bundle이 아니다. source 링크·CLI·test 재현은 전체 repository에서 사용한다.
- 선언된 입력·graph·mapping의 진위를 보장하지 않는다. source diff 자동 수집, dependency 완전성 증명, assertion별 요구 매핑은 없다.
- D2는 Node 24 native test receipt의 제한된 경로만 지원한다. 다른 CI 형식, dirty source snapshot, receipt 서명·외부 attestation은 구현하지 않았다.
- D3 검토자·매핑 확인은 self-declared이며 공식 서명이나 고객 수용 증명이 아니다. 서버에 영속 review history를 저장하지 않는다.
- D5는 synthetic 상태 분류 평가다. standalone failed/skipped/timeout과 mixed requirement 우선순위는 별도 unit regression으로 다루며 bundled 12개 사례 수에 포함하지 않는다. evidence ID·제외 사유 정합성은 기존 D1 회귀와 구분한다.
- 실제 reviewer의 false-ready, 설정/유지/검토 시간, 재사용 의사, 유료 수요는 미측정이다. 원래 D5 사용자 효과 검증은 여전히 미완료이며 과거 계획의 개선 목표는 관측 성과가 아니다.
- `executionAuthorized:false`, `productionReadyClaim:false`를 유지한다. D4는 `evidenceReuseAuthorized:false`, `ciSkipAuthorized:false`도 유지한다. 배포·production 변경·paid provider·고객 자료·학습은 이 사례에 포함하지 않는다.

## 포트폴리오에서 전달할 내용

핵심은 “새 coding agent를 만들었다”가 아니라 **완료 주장, 시험 근거, 변경 영향, 고객 인수의 경계를 설계하고 재현 가능한 반례로 검증했다**는 점이다. AI-assisted 개발임을 숨기거나 모든 설계·코드를 혼자 작성했다고 주장하지 않는다. 구현·시험·독립 검토의 역할과 실제 실행 기록은 [개발 계획 및 기록](delivery-evidence-development-plan.md)에 남긴다.

추가 확장은 사용자 효과를 측정할 필요가 생겼을 때만 별도로 판단한다. 이 기술 사례를 끝내기 위해 새 provider, hosted 서비스, 서명 체계나 기능 확장을 만들지 않는다.
