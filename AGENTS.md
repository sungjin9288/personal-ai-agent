# AGENTS — personal-ai-agent

> Codex/AI 에이전트 작업 지침. README를 생성·수정할 때 아래 정직성 규칙을 반드시 따른다.

---

## Codex 작업 흐름

- 비 trivial 작업은 `$karpathy-guidelines`로 시작해 가정, 성공 기준, 최소 변경 범위, 검증 기준을 먼저 잡는다.
- 새 영역을 수정하기 전에는 `$repo-intake`로 기존 런타임, 증적, smoke 명령, 승인 경계를 확인한다.
- 구현 중에는 `$edit-discipline`을 적용해 요청과 직접 연결되지 않는 리팩터링이나 speculative abstraction을 피한다.
- 종료 전에는 `$verify-gate`로 touched surface에 맞는 검증을 실행하고, 큰 변경은 `$review-angles`로 goal, 품질, 보안, 실제 사용, 문맥 관점까지 확인한다.

## 외부 패턴 이식 기준

- LazyCodex류 패턴은 제품 의존성으로 vendoring하지 않는다. `plan -> execute -> review -> verify -> evidence` 운영 흐름, 역할 분리, 검증 루프만 현재 harness 모델에 맞게 재해석한다.
- Hermes Desktop류 패턴은 Electron 앱 구조를 가져오지 않는다. provider setup, profile isolation, session history, logs, action inbox 같은 operator UX 패턴만 local-first web/CLI 표면에 맞게 적용한다.
- 새 외부 패키지, 전역 Codex 설정 변경, provider contract 변경은 별도 명시 요청이나 승인 없이는 하지 않는다.

## README 정직성 규칙 (포트폴리오 공개용 — 반드시 준수)

이 repo의 README는 채용 담당자·외부 방문자가 본다. README를 생성·수정할 때 아래를 **절대 규칙**으로 지킨다. 규칙을 어기면 작업을 멈추고 보고한다.

### 금지

- **측정 근거를 한 줄로 댈 수 없는 수치는 쓰지 않는다.** (예: "99.8% 비용 절감", "94.2% 자동화", "정확도 95%", "요청당 €0.0005")
  - 숫자를 쓰려면 **어떻게 쟀는지**(측정 커맨드·로그·방법)를 같은 자리에 표기한다. 못 대면 **삭제**한다.
- **과장 표현 금지**: "production-ready", "enterprise", "상용 운영", "엔터프라이즈". 실제가 PoC/MVP면 그대로 표기한다.
- 코드에 **없는** 기능·엔드포인트·성과를 적지 않는다. 추측 금지.

### 필수

- **테스트 수는 실제 코드로 카운트**해서 적고, 카운트 커맨드를 함께 둔다.
  - 예: `grep -rE "def test_" tests | wc -l`, `grep -rE "\b(test|it)\(" --include="*.test.*" | wc -l`
  - "정의된 함수 수"와 "통과 수"를 구분한다. 실제로 돌리지 않았으면 **"정의 기준 카운트, pass 여부는 별도 확인"**으로 표기.
- **엔드포인트·환경변수·디렉터리 구조는 코드/`.env.example`에서 직접 추출**한다. 손으로 지어내지 않는다.
- **`## Scope & Limitations` 섹션을 반드시 둔다.** 미구현·미검증·외부 의존·범위 밖 항목을 명시한다.
- **Demo·운영 URL은 접근 검증된 것만 링크**한다. 미검증이면 "(접근 검증 필요)"로 표기한다.

### 표준 구조

제목 → 한 줄 소개 → Why I Built This → Features → Tech Stack → Architecture → Key Design Decisions → Getting Started → (API/Usage) → Testing → Scope & Limitations → Links

### 갱신 절차

1. README를 고치기 전에 위 규칙을 먼저 적용한다.
2. 수정 후 **측정 근거 없는 새 수치가 들어가지 않았는지** 스스로 검사한다 (`99.8`, `production-ready` 등 grep).
3. 큰 변경은 "어디를 왜 바꿨는지"를 커밋 메시지/PR에 남긴다.
