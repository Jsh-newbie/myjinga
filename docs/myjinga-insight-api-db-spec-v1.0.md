# 마진가(Myjinga) 학생부 Insight API/DB 설계서

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-insight-spec-v1.0.md`, `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-project-rules-v1.0.md`
- 작성일: 2026-03-08
- 상태: Draft (구현 기준)
- 적용 범위: 학생부 Insight 기능의 Firestore 컬렉션, API 계약, 추천 규칙, 운영/보안 정책

---

## 1. 목적

본 문서는 `학생부 Insight` MVP 구현을 위한 서버/API/데이터 저장 구조를 정의한다.

본 설계의 목표는 다음과 같다.

1. 관심 직업/학과 기반 피드를 AI 없이도 조회 가능하게 한다.
2. 학생의 저장/메모 행동을 Firestore에 영속화한다.
3. AI 기능은 후처리형 보조로 분리해 핵심 피드 기능과 독립적으로 운영한다.
4. 외부 콘텐츠 수집 실패 시에도 fallback 피드를 제공한다.

---

## 2. 설계 원칙

1. `조회`와 `랭킹`은 비AI 경로를 기본으로 한다.
2. 외부 콘텐츠 수집은 서버 라우트에서만 처리한다.
3. 외부 원문 전체 저장보다 제목/링크/요약/태그 중심의 정규화 저장을 우선한다.
4. 사용자별 반응 데이터는 공용 콘텐츠와 분리 저장한다.
5. AI 보조 호출은 별도 엔드포인트와 사용 로그로 관리한다.

---

## 3. Firestore 컬렉션 설계

## 3.1 공용 콘텐츠

### `insightContents/{contentId}`

역할:

1. 외부 수집 또는 운영자 등록 콘텐츠 저장
2. 피드 응답용 캐시 및 정규화 저장소

필드:

- required:
  - `title: string`
  - `sourceName: string`
  - `sourceUrl: string`
  - `publishedAt: timestamp`
  - `contentType: "news" | "trend" | "research" | "career-story" | "major-story"`
  - `topics: string[]`
  - `relatedJobs: string[]`
  - `relatedMajors: string[]`
  - `summary: string`
  - `studentInsightPoints: string[]`
  - `status: "draft" | "published" | "archived"`
  - `createdAt: timestamp`
  - `updatedAt: timestamp`
- optional:
  - `studentFriendlySummary: string`
  - `whyItMatters: string`
  - `exploreQuestions: string[]`
  - `thumbnailUrl: string`
  - `sourceType: "manual" | "rss" | "api" | "partner"`
  - `qualityScore: number`
  - `fetchKey: string`

주의:

1. RSS/API 수집 항목은 `fetchKey`로 중복 제어한다.
2. 원문 본문 전체는 기본 저장하지 않는다.

## 3.2 사용자 저장

### `users/{uid}/insightSaves/{saveId}`

역할:

1. 저장/호기심/탐구/기록 연결 의도 저장
2. 학생 메모 및 연결 질문 축적

필드:

- required:
  - `contentId: string`
  - `savedAt: timestamp`
  - `updatedAt: timestamp`
  - `reactionType: "saved" | "curious" | "explore" | "record"`
  - `titleSnapshot: string`
  - `sourceUrlSnapshot: string`
- optional:
  - `memo: string`
  - `linkedJob: string`
  - `linkedMajor: string`
  - `linkedRecordId: string`
  - `exploreQuestion: string`
  - `tags: string[]`
  - `status: "active" | "used" | "archived"`

정책:

1. 동일 `contentId`는 사용자 기준 upsert 처리한다.
2. `saveId`는 기본적으로 `contentId` 재사용을 권장한다.

## 3.3 사용자 초안

### `users/{uid}/insightDrafts/{draftId}`

역할:

1. 저장 항목을 묶어 초안화한 결과 저장
2. AI 보조 초안과 수동 초안을 공통 관리

필드:

- required:
  - `draftType: "reportOutline" | "selfReviewMaterial" | "subjectNoteMaterial"`
  - `title: string`
  - `sourceContentIds: string[]`
  - `createdAt: timestamp`
  - `updatedAt: timestamp`
- optional:
  - `outline: string`
  - `keyQuestions: string[]`
  - `linkedRecordIds: string[]`
  - `aiAssisted: boolean`
  - `status: "draft" | "completed" | "archived"`

---

## 4. 인덱스 설계

## 4.1 필수 인덱스

1. `insightContents`: `status ASC, publishedAt DESC`
2. `insightContents`: `contentType ASC, publishedAt DESC`
3. `users/{uid}/insightSaves`: `status ASC, updatedAt DESC`
4. `users/{uid}/insightSaves`: `reactionType ASC, updatedAt DESC`
5. `users/{uid}/insightDrafts`: `status ASC, updatedAt DESC`

## 4.2 금지 쿼리

1. 태그 배열에 대한 무분별한 복수 조건 조합
2. 사용자별 저장 전체 full scan 후 클라이언트 정렬
3. 발행일 없는 콘텐츠 무제한 노출

---

## 5. API 계약

응답 공통 형식:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

오류 공통 형식:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "..."
  }
}
```

## 5.1 피드 조회 API

### `GET /api/insights/feed`

목적:

1. 관심 직업/관심 학과/최근 기록 기반 피드 조회

query:

- `tab=all|jobs|majors|record-linked`
- `limit=number`

응답 예시:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "google-news-abc",
        "title": "헬스케어 AI 확산",
        "sourceName": "Google News",
        "sourceUrl": "https://...",
        "publishedAt": "2026-03-08T01:20:00.000Z",
        "summary": "의료 현장에서 AI 활용이 확대되고 있습니다.",
        "whyItMatters": "간호, 의생명, 컴퓨터공학 관심 학생에게 연결됩니다.",
        "topics": ["헬스케어", "AI"],
        "relatedJobs": ["간호사"],
        "relatedMajors": ["의생명공학과"],
        "studentInsightPoints": [
          "생명과학, 정보 과목과 연결 가능",
          "AI 윤리 탐구 주제로 확장 가능"
        ],
        "exploreQuestions": [
          "의료 AI가 현장 의사결정에 어떤 영향을 줄까?"
        ],
        "score": 14
      }
    ],
    "keywords": ["간호사", "의생명공학과"],
    "fallback": false
  },
  "error": null
}
```

정책:

1. 인증 필수
2. 외부 수집 실패 시 fallback 피드 반환 허용
3. 피드 API는 실패보다 부분 성공을 우선한다

## 5.2 저장 API

### `GET /api/insights/saves`

query:

- `status=active|used|archived`
- `limit=number`

### `POST /api/insights/saves`

body:

```json
{
  "contentId": "google-news-abc",
  "reactionType": "saved",
  "titleSnapshot": "헬스케어 AI 확산",
  "sourceUrlSnapshot": "https://...",
  "memo": "간호학과와 AI 윤리 둘 다 연결 가능해 보임",
  "linkedJob": "간호사",
  "linkedMajor": "의생명공학과"
}
```

정책:

1. 동일 `contentId`는 upsert 처리
2. 입력 메모 길이 제한 적용

### `PATCH /api/insights/saves/:saveId`

목적:

1. 메모 수정
2. 반응 타입 변경
3. 상태 변경

### `DELETE /api/insights/saves/:saveId`

목적:

1. 저장 항목 삭제

## 5.3 초안 API

### `GET /api/insights/drafts`
### `POST /api/insights/drafts`
### `PATCH /api/insights/drafts/:draftId`
### `DELETE /api/insights/drafts/:draftId`

MVP 정책:

1. 초안 API는 후속 구현 가능
2. 1차 구현에서는 저장 API와 분리해도 무방

## 5.4 AI 보조 API

### `POST /api/insights/ai/summary`
### `POST /api/insights/ai/questions`
### `POST /api/insights/ai/draft`

정책:

1. AI 결과는 초안으로만 제공
2. 사용량은 `aiUsageLogs`에 기록
3. 원문 프롬프트 저장 금지

---

## 6. 추천 알고리즘

기본 점수식:

`score = interestScore + topicScore + behaviorScore + recordScore + recencyScore`

## 6.1 interestScore

1. 관심 직업 직접 일치: +5
2. 관심 학과 직접 일치: +5
3. 검사 추천 직업/학과 간접 일치: +3

## 6.2 topicScore

1. 사용자 관심사와 콘텐츠 태그 일치: +2
2. 태그 사전 매핑으로 연관 태그 일치: +2

## 6.3 behaviorScore

1. 유사 태그 저장 경험: +2
2. 유사 태그 메모 경험: +3

## 6.4 recordScore

1. 최근 `careerIdea` 태그와 일치: +3
2. 최근 `subjectNote` 과목과 주제가 연관: +2

## 6.5 recencyScore

1. 최근 7일 콘텐츠: +3
2. 최근 30일 콘텐츠: +1

---

## 7. 외부 수집 전략

## 7.1 권장 수집 순서

1. 관심 직업 상위 2개 키워드
2. 관심 학과 상위 2개 키워드
3. 기록 기반 주제어 1개

## 7.2 수집 채널

1. Google News RSS
2. 운영자 직접 등록
3. 추후 제휴/기관 RSS

## 7.3 정규화 규칙

1. 제목 길이 과도 시 절단
2. 출처명 추출
3. 발행일 파싱 실패 시 현재 시각 대체 금지
4. 중복 URL 또는 유사 제목 제거

## 7.4 캐시 정책

1. 공용 콘텐츠는 수집 후 Firestore 캐시 저장 가능
2. MVP에서는 서버 메모리 또는 즉시 응답 방식 허용
3. 수집 실패 시 정적 fallback 콘텐츠 사용

---

## 8. 보안/운영 정책

1. 외부 URL fetch는 서버 라우트에서만 수행
2. API 키 사용 소스 도입 시 서버 환경변수 강제
3. 사용자 메모는 본인 소유 데이터만 접근 가능
4. 로그에 사용자 메모 전문 저장 금지
5. AI 결과에는 `AI 초안, 사용자 검토 필요` 표기 강제

---

## 9. 구현 우선순위

## 9.1 즉시 구현

1. `GET /api/insights/feed`
2. `GET /api/insights/saves`
3. `POST /api/insights/saves`
4. `PATCH /api/insights/saves/:saveId`
5. `DELETE /api/insights/saves/:saveId`

## 9.2 후속 구현

1. `insightDrafts`
2. AI 보조 API
3. 콘텐츠 캐시 배치 수집

---

## 10. 공개 사례 참고

구조적 참고:

1. `Refeed`
  - RSS 기반 피드 정규화와 저장 항목 분리 패턴 참고
2. `jotty`
  - 메모/초안 저장 구조 분리 패턴 참고

적용 원칙:

1. 외부 프로젝트의 구조 아이디어만 참고하고 본 프로젝트의 도메인 모델에 맞게 축소 적용한다.
2. 학생부 도메인 특성상 `저장 -> 탐구 노트 -> 기록 연결` 흐름을 우선한다.

---

## 11. 변경 이력

### v1.0 (2026-03-08)

1. 학생부 Insight API/DB 설계 초안 작성
2. 피드/저장/초안 API 범위 정의
3. 관심 기반 추천 점수식과 외부 수집 전략 정의
