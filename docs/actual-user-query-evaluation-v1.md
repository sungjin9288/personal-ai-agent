# Actual User-Query Evaluation v1

- status: protocol-ready-data-not-provided
- actualUserQueryData: false
- actualEvaluationExecuted: false
- actualUserQueryQualityValidated: false
- currentAnswerPathChanged: false
- productionReadyClaim: false
- externalProviderCalls: none
- baseline: `review-action-generalization-v5`

## 목적

이 문서는 실제 사용자 질의로 로컬 답변 품질을 평가할 때 필요한 준비, 실행, 철회 절차를 정한다. 현재 저장소에는 실제 사용자 질의가 없으며 실제 평가는 실행하지 않았다.

평가는 이미 설치된 `qwen2.5:3b`와 loopback Ollama만 사용한다. 외부 Provider, API 전송, training, fine-tuning 제출은 허용하지 않는다. 통과 결과가 나오더라도 answer path 활성화와 rollout은 별도 결정이다.

## 저장 위치

원문 dataset과 consent intake는 Git이 추적하지 않는 위치에 둔다.

- 저장소 안에서 작업할 때: `var/actual-user-query-evaluation/`
- 저장소 밖에서 작업할 때: 운영자가 관리하는 별도 private directory

실제 dataset을 `fixtures/`, `docs/`, `evidence/` 또는 다른 tracked 경로에 두면 intake 생성 명령이 중단된다. Symbolic link와 2 MiB를 넘는 입력도 거부한다.

## Dataset 계약

Dataset은 `personal-ai-agent-user-query-evaluation-dataset/v1` 형식의 JSON 파일이다. 최소 12개의 서로 다른 질의가 필요하고 다음 여섯 domain과 네 language가 모두 포함되어야 한다.

- domain: `accessibility`, `data-governance`, `incident-operations`, `research`, `security`, `software-engineering`
- language: `en`, `es`, `ja`, `ko`

각 record는 다음 형태를 따른다.

```json
{
  "id": "<private stable id>",
  "domain": "software-engineering",
  "language": "ko",
  "source": "consented-user-query",
  "query": "<deidentified query>",
  "evidence": ["<reviewed supporting evidence>"],
  "expectedAnswerTerms": ["<review term 1>", "<review term 2>"],
  "containsDirectIdentifiers": false,
  "containsSensitiveData": false
}
```

Dataset 최상위에는 다음 경계를 명시한다.

```json
{
  "schemaVersion": "personal-ai-agent-user-query-evaluation-dataset/v1",
  "datasetId": "<private dataset id>",
  "actualUserQueryData": true,
  "dataClassification": "deidentified-user-query",
  "productionReadyClaim": false,
  "consent": {
    "status": "granted",
    "purpose": "answer-quality-evaluation",
    "withdrawalSupported": true,
    "recordedAt": "<ISO-8601 timestamp>",
    "expiresAt": "<future ISO-8601 timestamp>",
    "recordHash": "<sha256>"
  },
  "deidentification": {
    "methodVersion": "<review method version>",
    "directIdentifiersRemoved": true,
    "freeTextReviewed": true,
    "secretsScanned": true,
    "reidentificationProhibited": true,
    "reviewedAt": "<ISO-8601 timestamp>",
    "reviewerIdHash": "<sha256>"
  },
  "usage": {
    "evaluationAuthorized": true,
    "trainingAuthorized": false,
    "fineTuningSubmissionAuthorized": false,
    "externalTransferAuthorized": false,
    "localModelInputAuthorized": true,
    "providerInputAuthorized": false,
    "retentionUntil": "<future ISO-8601 timestamp>"
  },
  "records": []
}
```

`containsDirectIdentifiers`와 `containsSensitiveData`는 실제 검토 결과여야 한다. 값을 false로 적는 것만으로 비식별 검토를 대신할 수 없다.

## 실행

1. Private dataset에서 content-free intake를 만든다.

```bash
npm run build:user-query-evaluation-intake -- \
  --dataset var/actual-user-query-evaluation/dataset.json \
  --output var/actual-user-query-evaluation/intake.json
```

2. 설치된 model과 Q7 baseline이 일치하는지 확인하고 cloud 기능을 끈 loopback Ollama를 시작한다.

```bash
OLLAMA_HOST=127.0.0.1:11514 OLLAMA_NO_CLOUD=1 ollama serve
```

3. Actual query evaluation을 실행한다.

```bash
npm run evaluate:local-user-query-quality -- \
  --dataset var/actual-user-query-evaluation/dataset.json \
  --intake var/actual-user-query-evaluation/intake.json \
  --endpoint http://127.0.0.1:11514 \
  --model qwen2.5:3b \
  --output var/actual-user-query-evaluation/quality.json \
  --cloud-features-disabled
```

Actual intake가 확인되면 evaluator는 Q4 v4가 아니라 Q7 v5 reviewer-action baseline을 사용한다. Model에는 질의와 reviewed evidence만 전달하고 expected answer term과 threshold는 evaluator에만 남긴다.

각 model 호출 직전에 dataset과 intake를 다시 읽어 consent, retention, local-model authorization과 dataset hash를 확인한다. 평가 중 intake가 삭제되거나 바뀌면 다음 model 호출 전에 중단한다.

## 철회와 보존

- 평가 전 철회: intake 파일을 삭제하고 실행하지 않는다.
- 평가 중 철회: intake 파일을 삭제하거나 승인된 새 intake로 교체한다. 현재 실행은 다음 case 전에 중단된다.
- 평가 후 철회: `var/actual-user-query-evaluation/`의 dataset, intake, quality 파일을 승인된 삭제 절차에 따라 제거한다.
- Raw query, evidence, expected term과 model response는 tracked evidence에 복사하지 않는다.
- `quality.json`도 reviewer가 content-free 여부와 consent 상태를 확인하기 전에는 `evidence/`로 옮기지 않는다.

## 판정

모든 case가 기존 all-pass threshold를 통과하면 결과는 `actual-user-query-quality-passed-governance-blocked`가 된다. 이 상태는 실제 분포에서 답변 품질 gate를 통과했다는 뜻이지만 다음 권한은 주지 않는다.

- 현재 answer path 변경
- model training 또는 fine-tuning 제출
- runtime activation
- rollout
- production-ready 주장

실패하면 `local-user-query-quality-failed-keep-current`로 기록하고 현재 answer path를 유지한다. Threshold나 dataset을 통과용으로 완화하지 않는다.

## 실행 전 체크리스트

- [ ] 모든 record에 명시적 평가 동의가 있다.
- [ ] 철회 방법과 연락 경로가 기록되어 있다.
- [ ] 직접 식별자, secret, 민감정보가 제거되었다.
- [ ] 비식별 reviewer와 method version이 기록되어 있다.
- [ ] retention과 consent 만료 시각이 현재 시각 이후다.
- [ ] dataset과 intake가 private 또는 `var/` 경로에 있다.
- [ ] `trainingAuthorized`, `externalTransferAuthorized`, `providerInputAuthorized`가 false다.
- [ ] 설치 model digest가 Q7 evidence와 일치한다.
- [ ] 결과를 활성화 결정과 분리해 검토할 reviewer가 정해져 있다.

## 현재 남은 조건

현재 repository에는 실제 사용자 dataset과 consent record가 없다. 따라서 이 문서는 실행 가능한 protocol만 증명하며 `actualUserQueryData: false`, `actualUserQueryQualityValidated: false`, `productionReadyClaim: false`를 유지한다.
