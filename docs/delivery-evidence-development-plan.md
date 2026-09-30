# 변경 인계 검증 — 개발 계획과 실행 기록

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
| D4 후속 | 변경 후 필요한 재확인 대상을 알 수 있음 | 명시적 의존성 범위의 영향 판정과 불명확한 연결 표시 | known unrelated 변경과 unknown 영향 구별; 필수 CI 생략 권한 없음 |
| D5 후속 | 계속 사용할 가치가 있는지 결정 | 강한 baseline과 동일 사례 비교, 설정·검토·유지 비용 및 재사용 의사 평가 | go / 축소 / stop 근거; 실측 전 우위·상용 준비 주장 없음 |

D1은 제품 전체의 완료를 대신하지 않는다. D2의 adapter 선택은 실제 검사 출력으로 결정하고, D3의 저장 schema와 UI 계약은 D1/D2 사용 결과를 확인한 뒤 고정한다. 의미적 요구 충족, 증거 진위, 배포 및 고객 인수는 각각 별도 판단이다.

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

D2는 아래 CLI 경로로 구현했고 D3는 기존 web surface에 통합한다. D4–D5는 예정 상태다. 제품 전체가 완료됐다고 공개하지 않는다.

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

기존 web surface의 `검토하기`에 workspace 단위의 변경 인계 근거 panel을 추가한다. mission 생성 없이 사용하며 별도 dashboard나 전역 approval 체계를 만들지 않는다. UI는 요구사항·기준·검사 상태·근거 ID·불일치 이유·다음 확인 항목을 표시한다. 성공 결과만 먼저 보여 실패·미검증을 숨기지 않는다.

검토 기록은 대상 packet/revision, reviewer identity의 확인 수준, mapping/예외의 종류, 이유를 연결한다. 현재는 request-scoped 초안과 다운로드만 지원하며 서버 저장 이력·새로고침 후 복원·승인 증명을 제공하지 않는다. 기존 store schema를 변경하지 않는다. 기존 HTTP 요청 audit는 유지되지만 검토 기록의 영속 저장을 대신하지 않는다. 최종 source revision이나 packet이 바뀌면 과거 검토를 현재 검토로 자동 적용하지 않는다. JSON/Markdown export는 같은 판정 결과를 사용하며 외부 전송은 별도 행위다.

#### D3 구현 계약

- core: `src/core/delivery-evidence-review.mjs`, web handler: `src/web/delivery-evidence-handlers.mjs`, frontend: `src/web/public/lib/delivery-evidence-review.js`. 기존 server route registry, app bootstrap, workspace selection, review panel과 CSS만 연결한다. 테스트는 `test/delivery-evidence-review.test.mjs`, `test/delivery-evidence-ui.test.mjs`, `test/delivery-evidence-http.test.mjs`다.
- `GET /api/workspaces/:workspaceId/delivery-evidence`는 등록된 workspace path에서 D2 source capture를 재사용해 현재 manifest의 요구사항과 빈 evidence packet을 반환한다. 현재 clean revision·manifest가 없으면 409로 거부하며 자동 commit·cleanup·검사 실행은 하지 않는다.
- 같은 경로의 POST는 `{packet}` 또는 `{packet,review}`만 받는다. D1 판정과 review binding을 검증한 뒤 trusted source의 target/requirements와 동일한지, 읽기 전후 source가 동일한지 확인한다. 다른 revision·현재 요구사항 불일치·source drift는 409다. 이전 근거 행 자체는 현재 packet의 evidence로 제출할 수 있으며 D1이 stale/failed 등을 판정한다.
- API 공통 auth/RBAC와 handler의 workspace tenant 검사를 모두 거친다. tenant 검사는 body/source 판독보다 먼저 수행한다. RBAC enforce에서 GET은 viewer, POST는 operator 이상이다. 경로는 등록 workspace에서만 가져오며 요청에 arbitrary filesystem path를 받지 않는다. body는 fatal UTF-8 JSON, 최대 1 MiB이며 계약 오류 400, 크기 초과 413이다.
- `review`는 `{bindingDigest,reviewerName,entries}`다. binding은 workspaceId와 전체 packet의 key-sorted JSON SHA-256이다. entries는 요구사항별 하나씩 최대 100개이며 `{requirementId,kind,reason}`; kind는 `mapping-review` 또는 `exception-recorded`다. 이름 100자, 이유 1,000자 이하의 trim된 단일행 문자열을 사용한다. UI에서 같은 요구사항을 다시 반영하면 현재 초안만 교체한다.
- 검토자 이름은 항상 `self-declared`다. OIDC 인증을 통과했어도 입력 이름을 실제 개인 identity로 인증했다는 주장을 하지 않는다. 메모는 D1의 mappingConfirmed·status·권한을 변경하지 않는다. `evidence-current`도 진위 인증·의미적 요구 충족·승인·인수를 뜻하지 않는다.
- UI는 D1 packet과 D2 `{packet,report}` 출력을 받되 제출된 report는 폐기한다. 입력 변경·workspace 전환·재판정은 이전 검토와 초안을 초기화한다. epoch와 workspace를 함께 확인해 오래된 성공·오류·finally와 A→B→A 응답 재사용을 막는다. 요구사항 선택은 메모 반영 중 유지한다.
- 내보내기 직전 같은 packet을 서버에서 재판정해 source/binding/report를 확인하고, 화면의 기존 검토 시각과 내용 그대로 JSON/Markdown을 다운로드한다. 미반영 메모가 있으면 다운로드를 막는다. 화면 문자열은 escape하고 Markdown은 D1과 같은 escape 계약을 따른다. 기준·이름·메모는 민감정보 자동 제거 대상이 아니므로 공유 전 사람이 확인한다.
- 예외 메모를 남겨도 missing/stale/failed/incomplete/conflicting은 그대로 남는다. 서버 DB 저장·review signature·자동 테스트·provider 호출·외부 제출·실행/배포 승인은 이번 범위가 아니다.

RED 사례: 이전 revision 승인 재사용, foreign workspace 접근, 늦게 도착한 이전 요청이 새 화면을 덮음, markup injection, export와 화면 불일치. GREEN은 해당 회귀와 실제 keyboard/browser 흐름 검증 후다. 완성도나 인수 사실은 상태 이름만으로 만들어내지 않는다.

### D4 — 변경 영향

예정 위치는 `src/core/delivery-evidence-impact.mjs`와 대응 테스트다. 자동으로 완전한 dependency graph를 추측하지 않는다. 사람이 확인한 requirement↔test/config/source 연결을 먼저 사용하며, 연결 정보가 불충분하면 unknown으로 분류한다. 변경 없음을 입증할 수 있는 범위에서만 이전 근거 재사용 후보를 제안한다.

RED 사례: config 변경을 code만 비교해 놓침, 간접 의존성 누락, 새 requirement에 과거 mapping 재사용, unknown edge를 unrelated로 처리. 필수 CI를 생략하는 결정은 구현하지 않는다.

### D5 — 가치 검증

예정 위치는 `scripts/evaluate-delivery-evidence.mjs`와 대응 테스트이며 D1 단위 테스트 수를 효과 평가 사례 수로 사용하지 않는다. 별도 사전 정답표를 둔 paired 사례 12개(정상 4, 오류 8)를 제안한다. baseline과 candidate는 같은 자료·검토 기준을 받는다. 모델을 사용하면 같은 model/config와 예산으로 비교하며, 정답을 candidate 입력에 넣지 않는다.

사람의 onboarding, mapping 유지, 누락 조사, 보고서 작성 시간을 포함해 측정한다. 중요 누락, 불필요한 stale 판정, 독립 reviewer의 재확인, 반복 사용 의사도 기록한다. synthetic 통과 후 실제 비민감 사례 사용에는 참여자 동의와 데이터 범위를 확인한다. 품질·사용성이 개선되지 않으면 모델·문서·승인 수를 더 늘려 결과를 포장하지 않는다.

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
