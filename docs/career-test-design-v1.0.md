# 진로검사 기능 설계서 v1.0

- 작성일: 2026-03-06
- 상태: 설계 완료, 구현 착수 전

---

## 1. 검사별 상세 스펙

### 1.1 검사 5종 요약

| # | 검사명 | 내부 ID | 검사번호(중/고) | API | 문항수 | 예상시간 | 선택지 | 답변 형식 |
|---|---|---|---|---|---|---|---|---|
| 1 | 직업적성검사 | `aptitude` | 20 / 21 | V1 | 66문항 | 30분 | 7점 척도 (매우낮음~매우높음) | `1=5 2=4 3=3 ...` |
| 2 | 직업흥미검사(H) | `interest` | 33 / 34 | **V2** | 145~146문항 | 20분 | 5점 척도 (매우 싫어한다~매우 좋아한다) | `[{no,val}]` JSON |
| 3 | 진로성숙도검사 | `maturity` | 22 / 23 | V1 | ~45문항 | 20분 | 5점 척도 | `1=5 2=4 ...` |
| 4 | 직업가치관검사 | `values` | 24 / 25 | V1 | ~28+49문항 | 20분 | 쌍비교(3값 선택) / 5점 | `1=1 2=4 ...` (49번: `49=8,1,4`) |
| 5 | 진로개발역량검사 | `competency` | 26 / 27 | V1 | ~45문항 | 20분 | 5점 척도 | `1=1 2=4 ...` |

### 1.2 V1 문항 구조 (적성/성숙도/가치관/역량)

```json
{
  "SUCC_YN": "Y",
  "RESULT": [
    {
      "question": "몸을 구부리는 동작을 잘 할 수 있다.",
      "answer01": "매우낮음", "answerScore01": "1",
      "answer02": "낮음",     "answerScore02": "2",
      ...
      "answer07": "매우높음", "answerScore07": "7",
      "qitemNo": 8,
      "tip1Desc": "서서 몸을 앞으로 숙였을 때...",
      "tip2Desc": "..."
    }
  ]
}
```

특징:
- `answer01`~`answer10` 중 null이 아닌 것이 유효 선택지
- `answerScore01`~`answerScore10`이 해당 점수값
- `qitemNo`는 분야별 시퀀스 (답변 순서 번호와 다를 수 있음)
- `tip1Desc`~`tip3Desc`는 문항 보충 설명 (적성검사에서 활용)
- 직업가치관검사 49번 문항: 선택값 3개를 쉼표로 구분 (`49=8,1,4`)

### 1.3 V2 문항 구조 (직업흥미검사 H)

```json
{
  "result": {
    "qnm": "직업흥미검사(H)",
    "qno": "33",
    "etime": "20",
    "questions": [
      {
        "no": "1",
        "limit": "1",
        "text": "고장 난 물건 직접 수리하기",
        "choices": [
          { "val": "1", "text": "매우 싫어한다", "type": "M" },
          { "val": "2", "text": "싫어한다", "type": "M" },
          { "val": "3", "text": "보통이다", "type": "M" },
          { "val": "4", "text": "좋아한다", "type": "M" },
          { "val": "5", "text": "매우 좋아한다", "type": "M" }
        ]
      }
    ]
  }
}
```

특징:
- `limit`: 답변수 (1이면 단일 선택)
- `type`: M(선택), I(직접입력)
- 문항 121~146번: 규준에 영향 없지만 요청값으로 전송 필요
- 문항 132~136번: val 또는 text 값 모두 사용 가능

### 1.4 결과 응답

**V1 결과:**
```json
{
  "SUCC_YN": "Y",
  "RESULT": {
    "inspctSeq": 38918021,
    "url": "https://www.career.go.kr/inspct/web/psycho/vocation/report?seq=..."
  }
}
```

**V2 결과:**
```json
{
  "result": {
    "inspct": {
      "inspctseq": "52411194",
      "reporturl": "https://www.career.go.kr/inspct/web/psycho/holland2/report?seq=...",
      "trgetse": "100206",
      "sexdstn": "100323"
    }
  }
}
```

핵심: 결과는 **커리어넷 결과 URL**을 반환한다. 상세 결과 데이터를 직접 제공하지 않으므로, 결과 화면에서는 이 URL을 iframe 또는 외부 링크로 보여주는 전략이 필요하다.

### 1.5 V1 결과 제출 요청 형식

```json
{
  "apikey": "키",
  "qestrnSeq": "20",
  "trgetSe": "100206",
  "name": "홍길동",
  "gender": "100323",
  "school": "율도중학교",
  "grade": "2",
  "email": "",
  "startDtm": 1550466291034,
  "answers": "1=5 2=7 3=3 4=7 5=1 6=2 7=1 8=5 9=5 10=1 ..."
}
```

### 1.6 V2 결과 제출 요청 형식

```json
{
  "apikey": "키",
  "answers": [{"no":"1","val":"1"}, {"no":"120","val":"2"}, ...],
  "email": "",
  "gender": "100323",
  "grade": "1",
  "name": "",
  "qno": 33,
  "school": "",
  "startdtm": 1707389537857,
  "trgetse": "100206"
}
```

---

## 2. Firestore 데이터 구조

### 2.1 컬렉션 설계

```
users/{uid}/testSessions/{sessionId}     -- 임시저장 (진행 중 검사)
users/{uid}/testResults/{resultId}       -- 완료된 검사 결과
```

### 2.2 testSessions (임시저장)

```typescript
interface TestSession {
  // 식별
  testTypeId: string;        // 'aptitude' | 'interest' | 'maturity' | 'values' | 'competency'
  qestrnSeq: string;         // 커리어넷 검사번호 ('20','21','22'...)
  trgetSe: string;           // 대상코드 ('100206' | '100207')

  // 진행 상태
  status: 'in_progress' | 'submitted';
  totalQuestions: number;     // 전체 문항수
  answeredCount: number;      // 응답 완료 문항수
  currentIndex: number;       // 마지막 위치 (0-based)

  // 답변 데이터
  answers: Record<string, string>;  // { "1": "5", "2": "3", ... } 문항번호→선택값

  // 검사 시작 시간 (커리어넷 제출에 필요)
  startedAt: Timestamp;
  startDtm: number;           // epoch ms (커리어넷 형식)

  // 메타
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

설계 근거:
- `answers`를 `Record<string, string>`으로 저장하면 문항별 개별 접근/업데이트가 가능
- `currentIndex`로 이탈 후 복귀 시 마지막 위치 복원
- `answeredCount`로 진행률 계산: `answeredCount / totalQuestions * 100`
- `status: 'submitted'`이면 제출 완료 → testResults로 이관됨

### 2.3 testResults (완료된 결과)

```typescript
interface TestResult {
  // 식별
  testTypeId: string;
  qestrnSeq: string;
  trgetSe: string;

  // 커리어넷 응답
  inspctSeq: string;          // 커리어넷 검사결과 번호
  resultUrl: string;          // 커리어넷 결과 페이지 URL

  // 원본 보관
  answerPayload: {
    answers: string | object[];  // V1: "1=5 2=3...", V2: [{no,val}]
  };

  // 메타
  completedAt: Timestamp;
  createdAt: Timestamp;
}
```

### 2.4 보안 규칙 (추가분)

```
match /users/{uid}/testSessions/{sessionId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

---

## 3. UI/UX 설계

### 3.1 화면 구조 (라우트)

```
/career-test                    -- 검사 선택 화면 (홈)
/career-test/[testTypeId]       -- 검사 진행 화면
/career-test/result/[resultId]  -- 결과 확인 화면
```

### 3.2 검사 선택 화면 (`/career-test`)

```
+------------------------------------------+
| < 뒤로   진로 검사                         |
+------------------------------------------+
|                                          |
|  나에게 맞는 진로를 찾아보세요               |
|  커리어넷 공인 심리검사 5종                  |
|                                          |
|  [진행 중인 검사 카드] (있을 때만 표시)      |
|  +--------------------------------------+|
|  | 직업적성검사              이어하기 >    ||
|  | ████████░░░░ 45/66 (68%)             ||
|  | 마지막 저장: 3분 전                    ||
|  +--------------------------------------+|
|                                          |
|  ── 전체 검사 ──                          |
|                                          |
|  +--------------------------------------+|
|  | 📋 직업적성검사            30분 | 66문항||
|  | 나의 잠재 능력과 적성을 알아봐요        ||
|  +--------------------------------------+|
|  | 🎯 직업흥미검사(H)        20분 | 145문항||
|  | 어떤 일에 흥미가 있는지 알아봐요        ||
|  +--------------------------------------+|
|  | 📊 진로성숙도검사          20분 | 45문항||
|  | 진로 결정 준비가 얼마나 되었는지        ||
|  +--------------------------------------+|
|  | ⚖️ 직업가치관검사          20분 | 28문항||
|  | 직업 선택 시 중요하게 여기는 가치        ||
|  +--------------------------------------+|
|  | 🚀 진로개발역량검사        20분 | 45문항||
|  | 진로 개발을 위한 역량 수준 확인         ||
|  +--------------------------------------+|
|                                          |
|  ── 완료한 검사 ──                        |
|                                          |
|  +--------------------------------------+|
|  | 직업흥미검사(H)  2026.03.01  결과보기 >||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
|  홈  |  검사  |  기록  |  탐색            |
+------------------------------------------+
```

핵심 UX:
- **진행 중인 검사**가 최상단에 프로그레스 바와 함께 노출
- 전체 검사 목록에서 각 카드는 검사명, 소요시간, 문항수, 한줄 설명
- 이미 진행 중인 검사의 카드에는 "이어하기" 표시
- 완료한 검사는 하단에 날짜와 "결과보기" 버튼

### 3.3 검사 진행 화면 (`/career-test/[testTypeId]`)

```
+------------------------------------------+
| < 나가기                    임시저장       |
+------------------------------------------+
| 직업적성검사                              |
| ████████████░░░░░░░░ 12/66               |
+------------------------------------------+
|                                          |
|  Q12.                                    |
|  손가락을 빠르고 정확하게 움직일 수        |
|  있다.                                    |
|                                          |
|  💡 양손으로 바느질을 할 수 있다면 높음     |
|     이상에 해당합니다.                     |
|                                          |
|  ○ 매우낮음                              |
|  ○ 낮음                                  |
|  ○ 약간낮음                              |
|  ● 보통          ← 선택됨                |
|  ○ 약간높음                              |
|  ○ 높음                                  |
|  ○ 매우높음                              |
|                                          |
+------------------------------------------+
|  [ < 이전 ]              [ 다음 > ]      |
+------------------------------------------+
```

핵심 UX:
- **상단 프로그레스 바**: 현재 위치 / 전체 문항
- **"나가기" 버튼**: 현재까지 답변 자동 저장 후 검사 선택 화면으로
- **"임시저장" 버튼**: 명시적 저장 (자동 저장과 별개로 안심 제공)
- **tipDesc 노출**: 적성검사의 보충 설명이 있으면 말풍선으로 표시
- **이전/다음 버튼**: 자유 이동, 답변 미선택 시 다음 이동 가능 (마지막에 미응답 경고)
- **자동 저장**: 5문항마다 또는 30초마다 Firestore에 임시저장
- **마지막 문항 후**: "제출하기" 버튼 → 확인 모달 → 미응답 문항 경고

#### 제출 확인 모달:

```
+--------------------------------------+
|         검사를 제출하시겠습니까?       |
|                                      |
|  전체 66문항 중 66문항 응답 완료       |
|  ⚠️ 제출 후에는 수정할 수 없습니다    |
|                                      |
|  [ 취소 ]          [ 제출하기 ]       |
+--------------------------------------+
```

미응답이 있을 때:

```
+--------------------------------------+
|         ⚠️ 미응답 문항이 있습니다     |
|                                      |
|  전체 66문항 중 63문항 응답 완료       |
|  미응답: 14번, 32번, 58번             |
|                                      |
|  [ 돌아가서 답변 ]  [ 그래도 제출 ]   |
+--------------------------------------+
```

### 3.4 결과 화면 (`/career-test/result/[resultId]`)

```
+------------------------------------------+
| < 뒤로   검사 결과                        |
+------------------------------------------+
|                                          |
|  직업적성검사 결과                         |
|  2026년 3월 6일 완료                      |
|                                          |
|  +--------------------------------------+|
|  |         커리어넷 결과 리포트           ||
|  |                                      ||
|  |  [ 결과 페이지로 이동하기 → ]         ||
|  |                                      ||
|  |  커리어넷에서 제공하는 상세한          ||
|  |  분석 결과를 확인할 수 있습니다.      ||
|  +--------------------------------------+|
|                                          |
|  +--------------------------------------+|
|  |  다음 추천 액션                       ||
|  |                                      ||
|  |  📋 다른 검사도 해보기               ||
|  |  🔍 결과 기반 직업 탐색하기          ||
|  |  ✏️ 학생부에 기록하기                ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

핵심 UX:
- 커리어넷 결과 URL은 **외부 링크 버튼**으로 제공 (iframe은 커리어넷 정책상 불가할 수 있음)
- 결과 하단에 **다음 액션 추천** 카드: 다른 검사, 직업 탐색, 학생부 기록 연결
- 완료된 검사 목록에서도 결과를 다시 볼 수 있음

### 3.5 대시보드 진행 중 검사 표시

대시보드(`/dashboard`) 기존 "진로 탐색" 섹션에 진행 중 검사 카드 추가:

```
── 진로 탐색 ──

+--------------------------------------+
| 🔄 진행 중: 직업적성검사     이어하기 >|
| ████████░░░░ 45/66 (68%)             |
+--------------------------------------+

+--------------------------------------+
| 📋 커리어넷 진로 검사                 |
| 적성, 흥미, 가치관 검사로 나를 알아봐요 |
+--------------------------------------+
```

---

## 4. API 설계

### 4.1 검사 문항 조회

```
GET /api/career-net/questions?testTypeId=aptitude
```

응답:
```json
{
  "success": true,
  "data": {
    "testTypeId": "aptitude",
    "qestrnSeq": "20",
    "totalQuestions": 66,
    "estimatedMinutes": 30,
    "questions": [
      {
        "no": 1,
        "text": "몸을 구부리는 동작을 잘 할 수 있다.",
        "choices": [
          { "value": "1", "label": "매우낮음" },
          { "value": "2", "label": "낮음" },
          ...
        ],
        "tip": "서서 몸을 앞으로 숙였을 때, 손끝이..."
      }
    ]
  }
}
```

### 4.2 임시저장

```
PUT /api/career-net/sessions
```

요청:
```json
{
  "testTypeId": "aptitude",
  "answers": { "1": "5", "2": "3", "12": "4" },
  "currentIndex": 12,
  "answeredCount": 12
}
```

응답:
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "savedAt": "2026-03-06T..."
  }
}
```

### 4.3 임시저장 조회 (진행 중 검사 목록)

```
GET /api/career-net/sessions
```

응답:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "abc123",
        "testTypeId": "aptitude",
        "totalQuestions": 66,
        "answeredCount": 45,
        "currentIndex": 45,
        "updatedAt": "2026-03-06T..."
      }
    ]
  }
}
```

### 4.4 임시저장 상세 (이어하기용)

```
GET /api/career-net/sessions/[sessionId]
```

### 4.5 검사 제출

```
POST /api/career-net/report
```

요청:
```json
{
  "sessionId": "abc123"
}
```

처리 흐름:
1. sessionId로 testSession 조회
2. answers를 커리어넷 형식으로 변환 (V1: `"1=5 2=3..."`, V2: `[{no,val}]`)
3. 사용자 프로필에서 name, gender, school, grade 조회
4. 커리어넷 API 호출
5. testResults에 결과 저장
6. testSession.status를 'submitted'로 변경
7. 결과 반환

응답:
```json
{
  "success": true,
  "data": {
    "resultId": "xyz789",
    "resultUrl": "https://www.career.go.kr/inspct/web/...",
    "inspctSeq": "38918021"
  }
}
```

### 4.6 결과 목록 / 상세

```
GET /api/career-net/results                  -- 완료된 검사 목록
GET /api/career-net/results/[resultId]       -- 결과 상세
```

(기존 코드 유지, testTypeId 필터 추가)

---

## 5. 검사별 답변 형식 변환 규칙

커리어넷 제출 시 내부 `answers: Record<string, string>`을 변환해야 한다.

### V1 (적성/성숙도/가치관/역량)

```typescript
// Record<string, string> → "1=5 2=3 3=7 ..."
function toV1AnswerString(answers: Record<string, string>): string {
  return Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => `${no}=${val}`)
    .join(' ');
}
```

직업가치관 49번 문항 특수 처리:
- 49번 답변이 `"8,1,4"` 형태 (쉼표 구분 3개 값)

### V2 (직업흥미검사 H)

```typescript
// Record<string, string> → [{no, val}]
function toV2AnswerArray(answers: Record<string, string>): {no: string; val: string}[] {
  return Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => ({ no, val }));
}
```

---

## 6. 자동 저장 전략

| 트리거 | 동작 |
|---|---|
| 답변 선택 시 5문항 누적 | Firestore 저장 |
| 30초 경과 (변경 있을 때) | Firestore 저장 |
| "나가기" 버튼 클릭 | 즉시 저장 후 이동 |
| "임시저장" 버튼 클릭 | 즉시 저장 + 토스트 알림 |
| 브라우저 beforeunload | 저장 시도 (best-effort) |

클라이언트에서 `answers` 상태를 메모리에 유지하고, 위 조건에서 API 호출하여 Firestore에 반영한다. 낙관적 업데이트로 UX 차단 없이 진행.

---

## 7. 검사 메타데이터 (하드코딩 상수)

```typescript
export const CAREER_TESTS = {
  aptitude: {
    id: 'aptitude',
    name: '직업적성검사',
    description: '나의 잠재 능력과 적성을 알아봐요',
    icon: 'clipboard',
    qestrnSeq: { middle: '20', high: '21' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1' as const,
    estimatedMinutes: 30,
  },
  interest: {
    id: 'interest',
    name: '직업흥미검사(H)',
    description: '어떤 일에 흥미가 있는지 알아봐요',
    icon: 'target',
    qestrnSeq: { middle: '33', high: '34' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v2' as const,
    estimatedMinutes: 20,
  },
  maturity: {
    id: 'maturity',
    name: '진로성숙도검사',
    description: '진로 결정 준비가 얼마나 되었는지 확인해요',
    icon: 'chart',
    qestrnSeq: { middle: '22', high: '23' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1' as const,
    estimatedMinutes: 20,
  },
  values: {
    id: 'values',
    name: '직업가치관검사',
    description: '직업 선택 시 중요하게 여기는 가치를 알아봐요',
    icon: 'scale',
    qestrnSeq: { middle: '24', high: '25' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1' as const,
    estimatedMinutes: 20,
  },
  competency: {
    id: 'competency',
    name: '진로개발역량검사',
    description: '진로 개발을 위한 역량 수준을 확인해요',
    icon: 'rocket',
    qestrnSeq: { middle: '26', high: '27' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1' as const,
    estimatedMinutes: 20,
  },
} as const;
```

---

## 8. 구현 우선순위

1. **타입/상수 정의** - 검사 메타데이터, Firestore 타입
2. **커리어넷 클라이언트 리팩토링** - V1/V2 실제 스펙 대응
3. **API Route** - sessions CRUD, 제출 로직
4. **검사 선택 화면** - `/career-test`
5. **검사 진행 화면** - `/career-test/[testTypeId]` + 자동저장
6. **결과 화면** - `/career-test/result/[resultId]`
7. **대시보드 연동** - 진행 중 검사 카드

---

문서 끝.
