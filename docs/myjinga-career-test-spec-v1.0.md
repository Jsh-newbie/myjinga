# 마진가(Myjinga) 진로검사 기능 개발 명세서

- 문서 버전: v1.0
- 작성일: 2026-03-06
- 상태: 개발 착수용 실행 명세
- 대상: FE/BE 개발자
- 관련 요구사항: REQ-TEST-001 ~ REQ-TEST-012
- 기준 문서: `myjinga-development-spec-v1.1.md`, `myjinga-project-rules-v1.0.md`

---

## 1. 기능 범위

커리어넷 Open API를 연동하여 중/고등학생 대상 진로심리검사 5종을 제공한다.

- 포함: 검사 선택, 문항 풀기, 임시저장/이어하기, 제출, 결과 확인, 대시보드 연동
- 제외: 검사 결과 자체 분석(커리어넷 결과 URL 활용), 직업백과/학교정보 API

---

## 2. 요구사항 목록

| ID | 요구사항 | 수용 기준(AC) | 우선순위 |
|---|---|---|---|
| REQ-TEST-001 | 검사 5종 목록 조회 | 검사 선택 화면에서 5종 카드 노출, 검사명/시간/문항수 표시 | P0 |
| REQ-TEST-002 | 검사 문항 조회 | 커리어넷 V1/V2 API로 문항 로드, 정규화된 구조로 클라이언트 전달 | P0 |
| REQ-TEST-003 | 검사 진행 | 문항별 선택지 표시, 이전/다음 이동, 프로그레스 바 | P0 |
| REQ-TEST-004 | 임시저장 | 5문항/30초마다 자동저장, 명시적 저장 버튼, 나가기 시 저장 | P0 |
| REQ-TEST-005 | 이어하기 | 진행 중 검사 감지 시 마지막 위치에서 재개 | P0 |
| REQ-TEST-006 | 검사 제출 | 답변을 커리어넷 형식 변환 후 제출, 결과 URL 수신 | P0 |
| REQ-TEST-007 | 미응답 경고 | 제출 시 미응답 문항 목록 표시, 이동 또는 무시 선택 | P0 |
| REQ-TEST-008 | 결과 화면 | 커리어넷 결과 URL 외부 링크 제공, 완료 일시 표시 | P0 |
| REQ-TEST-009 | 결과 목록 | 완료한 검사 이력 목록, 검사명/날짜/결과보기 | P1 |
| REQ-TEST-010 | 대시보드 연동 | 진행 중 검사 카드(프로그레스 바) 대시보드 상단 노출 | P1 |
| REQ-TEST-011 | 다음 액션 추천 | 결과 화면에서 다른 검사/직업 탐색/학생부 기록 링크 | P2 |
| REQ-TEST-012 | 적성검사 tip 노출 | V1 적성검사 문항의 tipDesc 보충 설명 표시 | P2 |

---

## 3. 커리어넷 API 스펙

### 3.1 검사 5종 코드표

| 내부 ID | 검사명 | 검사번호(중/고) | 대상코드(중/고) | API 버전 | 문항수 | 예상시간 |
|---|---|---|---|---|---|---|
| `aptitude` | 직업적성검사 | 20 / 21 | 100206 / 100207 | V1 | 66 | 30분 |
| `interest` | 직업흥미검사(H) | 33 / 34 | 100206 / 100207 | V2 | 145~146 | 20분 |
| `maturity` | 진로성숙도검사 | 22 / 23 | 100206 / 100207 | V1 | ~45 | 20분 |
| `values` | 직업가치관검사 | 24 / 25 | 100206 / 100207 | V1 | ~28(+49) | 20분 |
| `competency` | 진로개발역량검사 | 26 / 27 | 100206 / 100207 | V1 | ~45 | 20분 |

기타 코드: 성별 남자=100323, 여자=100324

### 3.2 V1 API (적성/성숙도/가치관/역량)

**문항 조회:**
```
GET http://inspct.career.go.kr/inspct/openapi/test/questions?apikey={키}&q={검사번호}
```

응답 구조:
```json
{
  "SUCC_YN": "Y",
  "ERROR_REASON": "",
  "RESULT": [
    {
      "question": "문항 텍스트",
      "answer01": "매우낮음",  "answerScore01": "1",
      "answer02": "낮음",      "answerScore02": "2",
      ...
      "answer07": "매우높음",  "answerScore07": "7",
      "answer08": null,
      "qitemNo": 8,
      "tip1Desc": "보충 설명1",
      "tip2Desc": "보충 설명2",
      "tip3Desc": null
    }
  ]
}
```

- `answer01`~`answer10` 중 null이 아닌 것이 유효 선택지
- `answerScore01`~`answerScore10`이 해당 점수값
- `qitemNo`는 분야별 시퀀스 (답변 순서 번호와 다를 수 있음, JSON 순서 기준으로 답변 구성)
- 직업가치관 49번 문항: 선택값 3개를 쉼표 구분 (`49=8,1,4`)

**결과 제출:**
```
POST http://www.career.go.kr/inspct/openapi/test/report
Content-Type: application/json
```

요청:
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
  "answers": "1=5 2=7 3=3 4=7 5=1 ..."
}
```

응답:
```json
{
  "SUCC_YN": "Y",
  "RESULT": {
    "inspctSeq": 38918021,
    "url": "https://www.career.go.kr/inspct/web/psycho/vocation/report?seq=..."
  }
}
```

### 3.3 V2 API (직업흥미검사 H)

**문항 조회:**
```
GET https://www.career.go.kr/inspct/openapi/v2/test?apikey={키}&q={검사번호}
```

응답 구조:
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
        "title": null,
        "choices": [
          { "val": "1", "text": "매우 싫어한다", "type": "M" },
          { "val": "5", "text": "매우 좋아한다", "type": "M" }
        ]
      }
    ]
  },
  "success": "Y"
}
```

- `limit`: 답변수 (`"1"` = 단일 선택)
- `type`: `M`(선택), `I`(직접입력)
- 문항 121~146번: 규준 영향 없지만 반드시 전송
- 문항 132~136번: val 또는 text 값 모두 허용

**결과 제출:**
```
POST https://www.career.go.kr/inspct/openapi/v2/report
Content-Type: application/json
```

요청:
```json
{
  "apikey": "키",
  "qno": 33,
  "trgetse": "100206",
  "gender": "100323",
  "grade": "1",
  "startdtm": 1707389537857,
  "name": "",
  "school": "",
  "email": "",
  "answers": [{"no":"1","val":"1"}, {"no":"2","val":"3"}, ...]
}
```

응답:
```json
{
  "result": {
    "inspct": {
      "inspctseq": "52411194",
      "reporturl": "https://www.career.go.kr/inspct/web/psycho/holland2/report?seq=...",
      "trgetse": "100206",
      "sexdstn": "100323"
    }
  },
  "success": "Y"
}
```

### 3.4 답변 형식 변환 규칙

| API | 내부 저장 형태 | 제출 형태 | 변환 |
|---|---|---|---|
| V1 | `Record<string, string>` `{"1":"5","2":"3"}` | `"1=5 2=3 ..."` | 키 숫자 정렬 후 `=`/공백 조합 |
| V2 | `Record<string, string>` `{"1":"5","2":"3"}` | `[{no:"1",val:"5"}, ...]` | 키 숫자 정렬 후 객체 배열 |

특수 케이스: 직업가치관(24/25) 49번 문항은 값이 `"8,1,4"` 형태 (쉼표 구분 3개 선택값)

---

## 4. Firestore 데이터 모델

### 4.1 testSessions (임시저장)

경로: `users/{uid}/testSessions/{sessionId}`

```typescript
interface TestSession {
  testTypeId: 'aptitude' | 'interest' | 'maturity' | 'values' | 'competency';
  qestrnSeq: string;         // 커리어넷 검사번호
  trgetSe: string;           // 대상코드

  status: 'in_progress' | 'submitted';
  totalQuestions: number;
  answeredCount: number;
  currentIndex: number;       // 0-based, 마지막 위치

  answers: Record<string, string>;  // 문항번호 → 선택값

  startedAt: Timestamp;
  startDtm: number;           // epoch ms (커리어넷 제출용)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

제약:
- 사용자당 `status: 'in_progress'`인 세션은 검사 유형별 최대 1개
- `status: 'submitted'`으로 변경 후 7일 뒤 삭제 가능 (배치)

### 4.2 testResults (완료 결과)

경로: `users/{uid}/testResults/{resultId}`

```typescript
interface TestResult {
  testTypeId: string;
  qestrnSeq: string;
  trgetSe: string;

  inspctSeq: string;          // 커리어넷 결과 번호
  resultUrl: string;          // 커리어넷 결과 페이지 URL

  answerPayload: {
    format: 'v1' | 'v2';
    raw: string | object[];   // V1: "1=5 2=3...", V2: [{no,val}]
  };

  completedAt: Timestamp;
  createdAt: Timestamp;
}
```

### 4.3 보안 규칙

```
match /users/{uid}/testSessions/{sessionId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
// testResults는 기존 규칙 유지
```

### 4.4 인덱스

```
users/{uid}/testSessions: status ASC, updatedAt DESC
users/{uid}/testResults:  testTypeId ASC, completedAt DESC  (기존)
```

---

## 5. API 계약

모든 응답은 프로젝트 공통 형식: `{ success, data, error }`

### 5.1 검사 문항 조회

```
GET /api/career-net/questions?testTypeId={aptitude|interest|maturity|values|competency}
Authorization: Bearer {token}
```

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| testTypeId | string | Y | 검사 내부 ID |

응답 `data`:
```json
{
  "testTypeId": "aptitude",
  "qestrnSeq": "20",
  "testName": "직업적성검사",
  "totalQuestions": 66,
  "estimatedMinutes": 30,
  "questions": [
    {
      "no": 1,
      "text": "몸을 구부리는 동작을 잘 할 수 있다.",
      "choices": [
        { "value": "1", "label": "매우낮음" },
        { "value": "7", "label": "매우높음" }
      ],
      "tip": "서서 몸을 앞으로 숙였을 때..."
    }
  ]
}
```

오류: `VALIDATION_ERROR`(400), `UNAUTHORIZED`(401), `EXTERNAL_API_ERROR`(502)

### 5.2 임시저장 생성/갱신

```
PUT /api/career-net/sessions
Authorization: Bearer {token}
Content-Type: application/json
```

요청:
```json
{
  "testTypeId": "aptitude",
  "answers": { "1": "5", "2": "3", "12": "4" },
  "currentIndex": 12,
  "answeredCount": 12,
  "totalQuestions": 66
}
```

처리:
1. 해당 testTypeId로 `status: 'in_progress'`인 세션 검색
2. 있으면 업데이트, 없으면 신규 생성
3. `startDtm`은 최초 생성 시에만 기록

응답 `data`:
```json
{
  "sessionId": "abc123",
  "savedAt": "2026-03-06T10:30:00Z"
}
```

### 5.3 진행 중 세션 목록

```
GET /api/career-net/sessions
Authorization: Bearer {token}
```

응답 `data`:
```json
{
  "sessions": [
    {
      "sessionId": "abc123",
      "testTypeId": "aptitude",
      "testName": "직업적성검사",
      "totalQuestions": 66,
      "answeredCount": 45,
      "currentIndex": 45,
      "updatedAt": "2026-03-06T10:30:00Z"
    }
  ]
}
```

필터: `status == 'in_progress'`만 반환

### 5.4 세션 상세 (이어하기용)

```
GET /api/career-net/sessions/{sessionId}
Authorization: Bearer {token}
```

응답 `data`: TestSession 전체 (answers 포함)

### 5.5 검사 제출

```
POST /api/career-net/submit
Authorization: Bearer {token}
Content-Type: application/json
```

요청:
```json
{
  "sessionId": "abc123"
}
```

처리 흐름:
1. sessionId로 testSession 조회, 본인 소유 확인
2. 사용자 프로필에서 name, gender(→코드 변환), school, grade 조회
3. answers를 커리어넷 형식으로 변환 (V1: 문자열, V2: 배열)
4. 커리어넷 API 호출 (V1: `/inspct/openapi/test/report`, V2: `/inspct/openapi/v2/report`)
5. 성공 시 testResults에 결과 저장
6. testSession.status를 `'submitted'`로 변경
7. 결과 반환

응답 `data`:
```json
{
  "resultId": "xyz789",
  "resultUrl": "https://www.career.go.kr/inspct/web/...",
  "inspctSeq": "38918021"
}
```

오류: `SESSION_NOT_FOUND`(404), `SESSION_ALREADY_SUBMITTED`(409), `EXTERNAL_API_ERROR`(502)

### 5.6 결과 목록 / 상세

```
GET /api/career-net/results?testTypeId={optional}
GET /api/career-net/results/{resultId}
Authorization: Bearer {token}
```

(기존 API 유지, `testTypeId` 필터 파라미터 추가)

---

## 6. 라우트 및 화면 구조

### 6.1 라우트

| 경로 | 타입 | 설명 |
|---|---|---|
| `/career-test` | 클라이언트 컴포넌트 | 검사 선택 화면 |
| `/career-test/[testTypeId]` | 클라이언트 컴포넌트 | 검사 진행 화면 |
| `/career-test/result/[resultId]` | 클라이언트 컴포넌트 | 결과 확인 화면 |

### 6.2 검사 선택 화면 (`/career-test`)

구성 요소:
1. **페이지 헤더**: "진로 검사" 타이틀, 뒤로가기(대시보드)
2. **진행 중 검사 섹션** (있을 때만): 프로그레스 바, 문항 진행률(%), "이어하기" 버튼, 마지막 저장 시간
3. **전체 검사 목록**: 5종 카드, 각각 아이콘/검사명/소요시간/문항수/한줄 설명. 진행 중이면 "이어하기" 배지
4. **완료한 검사 목록** (있을 때만): 검사명, 완료일, "결과보기" 버튼

데이터 로드:
- `GET /api/career-net/sessions` (진행 중)
- `GET /api/career-net/results` (완료 목록)

### 6.3 검사 진행 화면 (`/career-test/[testTypeId]`)

구성 요소:
1. **상단 바**: "나가기" 버튼(좌), "임시저장" 버튼(우)
2. **검사 정보**: 검사명, 프로그레스 바 (`answeredCount / totalQuestions`)
3. **문항 카드**: 문항 번호, 문항 텍스트, tip 말풍선(있을 때), 선택지 라디오 버튼
4. **하단 네비게이션**: "이전" / "다음" 버튼
5. **마지막 문항 이후**: "제출하기" 버튼 → 확인 모달

진입 흐름:
1. `GET /api/career-net/sessions` 로 해당 testTypeId 진행 중 세션 확인
2. 있으면 → 세션 상세 로드 (`GET /api/career-net/sessions/{id}`) → answers 복원, currentIndex 위치 이동
3. 없으면 → `GET /api/career-net/questions?testTypeId=...` 로 문항 로드 → 새 세션 시작

자동 저장 트리거:

| 조건 | 동작 |
|---|---|
| 5문항 답변 누적 | `PUT /api/career-net/sessions` |
| 30초 경과 (변경 있을 때) | `PUT /api/career-net/sessions` |
| "나가기" 클릭 | 즉시 저장 후 `/career-test`로 이동 |
| "임시저장" 클릭 | 즉시 저장 + 토스트 "저장되었습니다" |
| `beforeunload` | 저장 시도 (best-effort, `navigator.sendBeacon`) |

제출 모달:
- 전체 문항 / 응답 완료 수 표시
- 미응답 있으면 미응답 문항 번호 나열, "돌아가서 답변" / "그래도 제출" 선택
- 미응답 없으면 "취소" / "제출하기" 선택
- 제출 중 로딩 상태 표시, 중복 제출 방지

### 6.4 결과 화면 (`/career-test/result/[resultId]`)

구성 요소:
1. **페이지 헤더**: "검사 결과" 타이틀, 뒤로가기
2. **결과 정보 카드**: 검사명, 완료 일시
3. **커리어넷 결과 링크**: "결과 페이지로 이동하기" 외부 링크 버튼, 안내 텍스트
4. **다음 액션 카드**: 다른 검사 해보기, 결과 기반 직업 탐색, 학생부에 기록하기

데이터 로드: `GET /api/career-net/results/{resultId}`

### 6.5 대시보드 수정 사항

`/dashboard` 페이지의 "진로 탐색" 섹션 상단에 진행 중 검사 카드 추가:
- `GET /api/career-net/sessions` 호출
- 세션이 있으면: 검사명, 프로그레스 바, 진행률, "이어하기" 링크
- 세션이 없으면: 기존 카드 그대로

---

## 7. 검사 메타데이터 상수

`src/lib/careernet/constants.ts`에 정의:

```typescript
export type CareerTestTypeId = 'aptitude' | 'interest' | 'maturity' | 'values' | 'competency';

export interface CareerTestMeta {
  id: CareerTestTypeId;
  name: string;
  description: string;
  qestrnSeq: { middle: string; high: string };
  trgetSe: { middle: string; high: string };
  apiVersion: 'v1' | 'v2';
  estimatedMinutes: number;
}

export const CAREER_TESTS: Record<CareerTestTypeId, CareerTestMeta> = {
  aptitude: {
    id: 'aptitude',
    name: '직업적성검사',
    description: '나의 잠재 능력과 적성을 알아봐요',
    qestrnSeq: { middle: '20', high: '21' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 30,
  },
  interest: {
    id: 'interest',
    name: '직업흥미검사(H)',
    description: '어떤 일에 흥미가 있는지 알아봐요',
    qestrnSeq: { middle: '33', high: '34' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v2',
    estimatedMinutes: 20,
  },
  maturity: {
    id: 'maturity',
    name: '진로성숙도검사',
    description: '진로 결정 준비가 얼마나 되었는지 확인해요',
    qestrnSeq: { middle: '22', high: '23' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
  values: {
    id: 'values',
    name: '직업가치관검사',
    description: '직업 선택 시 중요하게 여기는 가치를 알아봐요',
    qestrnSeq: { middle: '24', high: '25' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
  competency: {
    id: 'competency',
    name: '진로개발역량검사',
    description: '진로 개발을 위한 역량 수준을 확인해요',
    qestrnSeq: { middle: '26', high: '27' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
};

export const GENDER_CODE = { male: '100323', female: '100324' } as const;
export const TARGET_CODE = { middle: '100206', high: '100207' } as const;
```

---

## 8. 파일 구조 (신규/변경)

```
src/
  lib/careernet/
    constants.ts          -- [신규] 검사 메타데이터 상수
    types.ts              -- [변경] 타입 확장 (TestSession, TestResult 등)
    client.ts             -- [변경] V1/V2 실제 API 스펙 대응
    repository.ts         -- [변경] testSessions CRUD 추가
    normalize.ts          -- [신규] V1/V2 문항 정규화 함수
    answer-format.ts      -- [신규] 답변 형식 변환 (내부 → 커리어넷)

  app/api/career-net/
    questions/route.ts    -- [변경] testTypeId 기반, V1/V2 분기
    sessions/route.ts     -- [신규] PUT(저장), GET(목록)
    sessions/[sessionId]/route.ts  -- [신규] GET(상세)
    submit/route.ts       -- [신규] POST(제출)
    results/route.ts      -- [변경] testTypeId 필터 추가
    results/[resultId]/route.ts  -- [유지]

  app/career-test/
    page.tsx              -- [신규] 검사 선택 화면
    [testTypeId]/page.tsx -- [신규] 검사 진행 화면
    result/[resultId]/page.tsx  -- [신규] 결과 화면

  app/dashboard/
    page.tsx              -- [변경] 진행 중 검사 카드 추가

  app/globals.css         -- [변경] 검사 관련 스타일 추가
```

---

## 9. 구현 순서 및 완료 기준

### Phase 1: 기반 (타입/상수/클라이언트)

| 순서 | 작업 | 산출물 | 완료 기준 |
|---|---|---|---|
| 1-1 | 검사 메타데이터 상수 정의 | `constants.ts` | 5종 검사 정보 완비, 타입 export |
| 1-2 | 타입 확장 | `types.ts` | TestSession, TestResult, 정규화 문항 타입 |
| 1-3 | V1/V2 문항 정규화 | `normalize.ts` | V1/V2 원시 응답 → 공통 Question 배열 변환 |
| 1-4 | 답변 형식 변환 | `answer-format.ts` | 내부 Record → V1 문자열, V2 배열 변환, 가치관 49번 처리 |
| 1-5 | 커리어넷 클라이언트 리팩토링 | `client.ts` | V1/V2 엔드포인트 분기, 실제 URL/파라미터 대응, mock 유지 |

### Phase 2: API Route

| 순서 | 작업 | 산출물 | 완료 기준 |
|---|---|---|---|
| 2-1 | 문항 조회 API 수정 | `questions/route.ts` | testTypeId 파라미터, V1/V2 분기, 정규화 응답 |
| 2-2 | 세션 CRUD API | `sessions/route.ts`, `sessions/[sessionId]/route.ts` | PUT 저장, GET 목록, GET 상세 |
| 2-3 | 제출 API | `submit/route.ts` | 세션→커리어넷 제출→결과 저장→세션 상태 변경 |
| 2-4 | 결과 API 수정 | `results/route.ts` | testTypeId 필터 |
| 2-5 | Firestore repository 확장 | `repository.ts` | testSessions CRUD 함수 |

### Phase 3: UI

| 순서 | 작업 | 산출물 | 완료 기준 |
|---|---|---|---|
| 3-1 | 검사 선택 화면 | `career-test/page.tsx` | 5종 목록, 진행 중 카드, 완료 목록 |
| 3-2 | 검사 진행 화면 | `career-test/[testTypeId]/page.tsx` | 문항 표시, 선택, 이동, 자동저장, 제출 모달 |
| 3-3 | 결과 화면 | `career-test/result/[resultId]/page.tsx` | 결과 URL 링크, 완료 정보, 다음 액션 |
| 3-4 | 대시보드 연동 | `dashboard/page.tsx` 수정 | 진행 중 검사 카드 |
| 3-5 | CSS 스타일 | `globals.css` 추가 | 검사 관련 UI 스타일 |

---

## 10. 오류 처리

| 상황 | 처리 |
|---|---|
| 커리어넷 API 타임아웃 (5초) | 1회 재시도 후 실패 → 502 + "잠시 후 다시 시도해 주세요" |
| 커리어넷 API 비정상 응답 | 502 + 원본 응답 로그(마스킹) |
| 세션 미발견 | 404 + "검사 세션을 찾을 수 없습니다" |
| 이미 제출된 세션 | 409 + "이미 제출된 검사입니다" |
| 인증 실패 | 401 |
| 잘못된 testTypeId | 400 + VALIDATION_ERROR |

---

## 11. 테스트 계획

| 유형 | 대상 | 케이스 |
|---|---|---|
| Unit | `normalize.ts` | V1 원시→정규화 변환, V2 원시→정규화 변환 |
| Unit | `answer-format.ts` | V1 변환, V2 변환, 가치관 49번 특수 처리 |
| Integration | `questions/route.ts` | mock 모드 문항 조회, 유효하지 않은 testTypeId |
| Integration | `sessions/route.ts` | 세션 생성, 업데이트, 목록 조회 |
| Integration | `submit/route.ts` | mock 모드 제출, 세션 상태 변경 확인 |
| E2E | 검사 전체 흐름 | 검사 선택→진행→나가기→이어하기→제출→결과 확인 |

---

## 12. 성별 코드 매핑

사용자 프로필의 성별 정보를 커리어넷 코드로 변환:

```typescript
function toGenderCode(gender: string): string {
  // 프로필에 저장된 값 → 커리어넷 코드
  if (gender === 'male') return '100323';
  if (gender === 'female') return '100324';
  return '100323'; // 기본값
}
```

사용자 프로필에 성별 필드가 없는 경우 검사 시작 시 입력받아야 한다 (MVP에서는 프로필 설정 유도).

---

문서 끝.
