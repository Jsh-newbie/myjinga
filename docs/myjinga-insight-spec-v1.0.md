# 마진가(Myjinga) 학생부 Insight 기능 명세서

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-project-rules-v1.0.md`, `docs/myjinga-records-spec-v1.0.md`
- 작성일: 2026-03-08
- 상태: Draft (구현 검토용)
- 적용 범위: 학생부 Insight 기능의 제품 정의, 정보 구조, 개인화 로직, 데이터 모델, API 초안, AI 적용 범위, MVP 범위

---

## 1. 목적

본 문서는 `학생부 Insight` 기능을 단순 AI 도우미 또는 뉴스 피드가 아닌, 학생의 관심 직업/관심 학과/학생부 기록을 기반으로 최신 정보를 탐색하고 이를 학생부 관련 산출물 준비로 연결하는 기능으로 정의한다.

핵심 목적은 다음과 같다.

1. 학생이 관심 진로와 관련된 최신 정보와 흥미로운 이야기를 꾸준히 접하도록 한다.
2. 학생이 콘텐츠 소비를 끝내지 않고 `탐구 노트`와 `학생부 준비 메모`로 전환하도록 유도한다.
3. 저장한 콘텐츠와 반응 데이터를 바탕으로 탐구 보고서, 자기평가서, 세특 준비 메모의 초안 재료를 축적한다.
4. AI는 조회 자체보다 해석, 질문 생성, 초안 보조에 제한적으로 사용한다.

---

## 2. 기능 정의

`학생부 Insight`는 아래 3개 레이어를 갖는 기능으로 정의한다.

1. `피드형 인사이트`
  - 관심 직업, 관심 학과, 최근 기록과 연결된 최신 콘텐츠를 노출한다.
2. `탐구 노트`
  - 학생이 콘텐츠에 대한 생각, 질문, 연결 포인트를 저장하는 작업공간이다.
3. `학생부 연결 작업`
  - 탐구 노트를 기반으로 보고서 개요, 자기평가서 소재, 세특 준비 메모를 정리한다.

기능 정체성은 `뉴스 서비스`가 아니라 `학생부 소재 발굴 엔진`이다.

---

## 3. 제품 원칙

## 3.1 핵심 원칙

1. 학생은 긴 글 작성보다 `짧은 반응과 저장`부터 시작하도록 설계한다.
2. 외부 콘텐츠 자체보다 `왜 이 학생에게 중요한가`를 더 강하게 설명한다.
3. 학생부 공식 문장 자동생성보다 `탐구 메모`와 `초안 재료` 정리에 우선순위를 둔다.
4. 외부 정보의 최신성과 학생 데이터의 연결성을 분리해 안내한다.
5. AI 결과는 초안으로만 제공하며 사용자 검토가 필요하다는 고지를 고정한다.

## 3.2 학생부 기록 기능과의 관계

1. `학생부 Insight`는 학생부 공식 입력 기능이 아니다.
2. 학생은 뉴스/콘텐츠에서 출발해 탐구 아이디어, 성찰, 추가 조사 질문을 축적한다.
3. 생성 결과는 `학생부 문장`이 아니라 `탐구 보고서 초안`, `자기평가서 소재`, `세특 준비 메모`로 한정한다.
4. 기록 기능의 `careerIdea`, `subjectNote`, `dailyLog`와 연결되는 보조 기능으로 설계한다.

---

## 4. 요구사항 ID

1. `REQ-INSIGHT-001`: 학생은 관심 직업/학과 기반으로 개인화된 인사이트 피드를 볼 수 있어야 한다.
2. `REQ-INSIGHT-002`: 학생은 피드 항목을 저장하고 한 줄 메모 또는 탐구 질문을 남길 수 있어야 한다.
3. `REQ-INSIGHT-003`: 저장한 인사이트는 탐구 노트로 누적 관리되어야 한다.
4. `REQ-INSIGHT-004`: 탐구 노트는 학생부 관련 산출물 초안의 입력 재료로 사용되어야 한다.
5. `REQ-INSIGHT-005`: 개인화 추천은 AI 없이도 동작 가능해야 하며, AI 실패 시 핵심 기능은 유지되어야 한다.
6. `REQ-INSIGHT-006`: AI가 개입하는 경우 결과에는 `AI 초안, 사용자 검토 필요` 문구를 표시해야 한다.
7. `REQ-INSIGHT-007`: 외부 콘텐츠는 출처, 발행일, 관련 주제 태그를 함께 보여줘야 한다.
8. `REQ-INSIGHT-008`: 학생부 연결 포인트는 일반 뉴스 설명과 구분되어야 한다.

---

## 5. 주요 사용자 시나리오

## 5.1 시나리오 A: 관심 학과 기반 피드 탐색

1. 학생은 `관심 학과`로 저장한 학과와 관련된 최신 피드를 본다.
2. 카드에서 짧은 요약과 `왜 중요한지` 설명을 읽는다.
3. `탐구해보고 싶어요`를 누르고 한 줄 메모를 남긴다.
4. 해당 콘텐츠는 탐구 노트에 저장된다.
5. 학생은 나중에 저장된 노트를 보고 탐구 보고서 개요를 만든다.

## 5.2 시나리오 B: 관심 직업 기반 학생부 연결

1. 학생은 관심 직업과 관련된 산업 변화 또는 사회 이슈 콘텐츠를 본다.
2. 카드의 `학생부 연결 포인트`에서 관련 과목, 활동, 역량을 확인한다.
3. 학생은 `세특 준비 메모로 저장`을 눌러 기존 기록과 연결한다.
4. 기록 기능의 `careerIdea` 또는 `subjectNote`로 후속 저장한다.

## 5.3 시나리오 C: 저장 콘텐츠에서 산출물 초안 생성

1. 학생은 여러 개의 저장 콘텐츠를 선택한다.
2. 시스템은 공통 주제를 묶어 `탐구 주제`, `배경`, `핵심 질문`, `추가 조사 방향`을 제안한다.
3. 학생은 이를 자기 생각으로 수정한다.
4. 최종 결과는 탐구 보고서 개요 또는 자기평가서 소재로 저장된다.

---

## 6. 화면 정보 구조(IA)

## 6.1 상위 구조

1. `오늘의 피드`
2. `직업 기반`
3. `학과 기반`
4. `내 탐구 노트`
5. `학생부 연결 작업`

## 6.2 홈 진입 카드 구성

메인 대시보드의 `학생부 Insight` 진입 버튼은 다음 기대 기능을 대표한다.

1. 최신 관심 피드 보기
2. 저장한 탐구 노트 관리
3. 학생부 연결 초안 시작

## 6.3 학생부 Insight 메인 화면

### A. 상단 요약 영역

1. `오늘의 추천 주제`
2. `최근 저장한 탐구 노트 수`
3. `이번 주 학생부 연결 후보`

### B. 피드 탭

1. `전체`
2. `관심 직업`
3. `관심 학과`
4. `학생부 연결 추천`

### C. 탐구 노트 탭

1. 저장 콘텐츠 목록
2. 내가 남긴 메모
3. 추가 탐구 질문
4. 연결된 직업/학과

### D. 산출물 작업 탭

1. 탐구 보고서 개요 만들기
2. 자기평가서 소재 정리
3. 세특 준비 메모 정리

---

## 7. 콘텐츠 카드 설계

각 피드 카드는 아래 정보를 포함한다.

1. 제목
2. 출처명
3. 발행일
4. 학생용 짧은 요약
5. `왜 중요한가`
6. 연결된 직업/학과 태그
7. 학생부 연결 포인트
8. 추천 탐구 질문 1~3개
9. 액션 버튼
  - `저장`
  - `한 줄 메모`
  - `탐구 질문 보기`
  - `기록으로 연결`

### 학생부 연결 포인트 예시

1. 어떤 과목과 연결되는가
2. 어떤 탐구 활동으로 확장할 수 있는가
3. 어떤 역량 키워드와 연계되는가
4. 어떤 기록 카테고리로 저장할 수 있는가

---

## 8. 개인화 로직

## 8.1 AI 없이 가능한 개인화

개인화 1차 버전은 AI 없이 구현 가능하다.

사용 가능한 입력 데이터:

1. `users/{uid}/favoriteJobs`
2. `users/{uid}/favoriteMajors`
3. `users/{uid}/records`
4. `users/{uid}/testResults`의 추천 직업/학과
5. `users/{uid}`의 `interests`

추천 방식:

1. `직접 매칭`
  - 관심 직업명/학과명과 콘텐츠 태그가 직접 일치하면 우선 노출
2. `사전 태그 매핑`
  - 예: `간호사 -> 보건, 의료, 생명과학`
  - 예: `컴퓨터공학과 -> AI, 소프트웨어, 데이터, 윤리`
3. `행동 기반 가중치`
  - 저장, 클릭, 메모 빈도가 높은 주제를 상위 노출
4. `기록 기반 가중치`
  - 최근 `careerIdea`, `subjectNote`, `dailyLog`의 과목/키워드와 일치하는 콘텐츠에 가점

## 8.2 AI가 필요한 개인화

아래 영역은 AI가 있으면 품질이 크게 향상된다.

1. 개인 맞춤 해설
2. 콘텐츠 간 의미적 유사도 분석
3. 학생 수준에 맞춘 요약 생성
4. 맞춤형 탐구 질문 생성
5. 여러 저장 노트를 묶은 초안 생성

## 8.3 권장 원칙

1. `조회와 랭킹`은 AI 의존 없이 동작해야 한다.
2. `요약, 질문, 초안화`는 AI 보조 기능으로 분리한다.
3. AI 실패 시 원본 콘텐츠, 정적 연결 포인트, 기본 질문 템플릿을 대체 노출한다.

---

## 9. 비AI MVP와 AI 고도화 범위

## 9.1 비AI MVP 범위

1. 관심 직업/학과 기반 피드 조회
2. 콘텐츠 태그 기반 추천
3. 콘텐츠 저장
4. 한 줄 메모 저장
5. 탐구 노트 목록 조회
6. 학생부 연결 포인트 템플릿 노출
7. 탐구 질문 템플릿 노출
8. 탐구 보고서 개요 폼 생성

## 9.2 AI 보조 기능 범위

1. 학생용 쉬운 요약 생성
2. 왜 이 학생에게 중요한지 설명 생성
3. 학생 맞춤 탐구 질문 생성
4. 저장 노트 기반 초안 생성
5. 중복 콘텐츠 병합 요약

## 9.3 MVP 제외 권장 범위

1. 대화형 챗봇
2. 실시간 초개인화 추천 엔진
3. 기사 원문 전체 AI 분석
4. 학생부 공식 문장 자동생성 중심 UX

---

## 10. 데이터 모델 초안

## 10.1 콘텐츠 컬렉션

### `insightContents/{contentId}`

외부 또는 내부에서 수집한 인사이트 콘텐츠 저장 컬렉션.

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
  - `aiGeneratedFields: string[]`

## 10.2 저장 컬렉션

### `users/{uid}/insightSaves/{saveId}`

학생이 저장하거나 반응한 인사이트 항목.

- required:
  - `contentId: string`
  - `savedAt: timestamp`
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

## 10.3 초안 컬렉션

### `users/{uid}/insightDrafts/{draftId}`

탐구 노트에서 파생된 학생부 준비 초안.

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

## 10.4 참조 관계

1. `insightContents`는 공용 콘텐츠 저장소다.
2. `insightSaves`는 학생별 반응과 메모 저장소다.
3. `insightDrafts`는 학생별 산출물 초안 저장소다.
4. `records`와 직접 병합하지 않고 링크 필드로만 연결한다.

---

## 11. API 초안

모든 API는 공통 응답 형식을 따른다.

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## 11.1 피드 조회

1. `GET /api/insights/feed`
  - query:
    - `tab=all|jobs|majors|record-linked`
    - `cursor`
    - `limit`
  - purpose:
    - 관심 기반 피드 조회
  - auth:
    - required

2. `GET /api/insights/feed/:contentId`
  - purpose:
    - 콘텐츠 상세 조회

## 11.2 저장/반응

1. `POST /api/insights/saves`
  - body:
    - `contentId`
    - `reactionType`
    - `memo?`
    - `linkedJob?`
    - `linkedMajor?`
    - `linkedRecordId?`

2. `GET /api/insights/saves`
  - query:
    - `status`
    - `cursor`
    - `limit`

3. `PATCH /api/insights/saves/:saveId`
  - purpose:
    - 메모/질문/상태 수정

4. `DELETE /api/insights/saves/:saveId`

## 11.3 초안 작업

1. `POST /api/insights/drafts`
  - body:
    - `draftType`
    - `sourceContentIds`
    - `linkedRecordIds?`

2. `GET /api/insights/drafts`

3. `GET /api/insights/drafts/:draftId`

4. `PATCH /api/insights/drafts/:draftId`

## 11.4 AI 보조

1. `POST /api/insights/ai/summary`
2. `POST /api/insights/ai/questions`
3. `POST /api/insights/ai/draft`

공통 정책:

1. premium 여부 또는 별도 사용 정책 확인
2. 호출 제한 적용
3. 원문 프롬프트 저장 금지 또는 마스킹
4. 결과에 `AI 초안, 사용자 검토 필요` 문구 강제

---

## 12. 추천/랭킹 규칙 초안

피드 정렬은 아래 점수 합산 방식으로 시작한다.

`score = interestMatch + tagMatch + behaviorWeight + recencyWeight + recordWeight`

## 12.1 interestMatch

1. 관심 직업 직접 매칭: +5
2. 관심 학과 직접 매칭: +5
3. 커리어넷 추천 직업/학과 연관 태그 일치: +3

## 12.2 tagMatch

1. 콘텐츠 `topics`와 사용자 `interests` 일치: +2
2. 기록 태그와 콘텐츠 태그 일치: +2

## 12.3 behaviorWeight

1. 유사 주제 저장 경험: +2
2. 유사 주제 메모 작성 경험: +3

## 12.4 recencyWeight

1. 최근 7일 발행: +3
2. 최근 30일 발행: +1

## 12.5 recordWeight

1. 최근 30일 `careerIdea`와 직접 연결: +3
2. 최근 30일 `subjectNote` 과목과 연결: +2

---

## 13. 학생부 연결 규칙

## 13.1 기본 원칙

1. 외부 콘텐츠는 학생부 공식 내용이 아니다.
2. 학생부 연결은 `활동 아이디어`, `탐구 질문`, `기록 포인트` 수준으로 안내한다.
3. 과장된 진로 적합성 판단이나 확정적 추천 문구는 금지한다.

## 13.2 출력 유형

1. `탐구 질문`
2. `교과 연결 포인트`
3. `활동 아이디어`
4. `세특 준비 메모`
5. `자기평가서 소재`

## 13.3 금지 방향

1. 특정 대학 합격 가능성 예측
2. 교사 평가문 자동 완성 중심 UX
3. 사실 확인 없는 성과 서술
4. 학생부 공식 기재문처럼 오인될 수 있는 단정적 문장

---

## 14. 콘텐츠 수급 전략

## 14.1 권장 방식

`외부 콘텐츠 수집 + 내부 재가공 + 학생부 연결 포인트 부여`의 혼합형을 권장한다.

## 14.2 수급 경로

1. 운영자 직접 등록
2. RSS 수집
3. 외부 뉴스/콘텐츠 API
4. 제휴 기관 콘텐츠

## 14.3 내부 재가공 항목

1. 태그 정규화
2. 중복 제거
3. 학생용 요약 생성
4. 학생부 연결 포인트 작성
5. 탐구 질문 부여

## 14.4 운영 원칙

1. 출처 신뢰도 낮은 콘텐츠는 노출 금지
2. 선정적 제목만 강한 콘텐츠는 제외
3. 발행일과 출처를 명확히 표시
4. 콘텐츠 원문 재배포 대신 요약/링크 중심으로 제공

---

## 15. 구현 단계 제안

## 15.1 Phase 1

1. 관심 직업/학과 기반 피드
2. 카드 저장/메모
3. 탐구 노트 목록
4. 정적 학생부 연결 포인트
5. 기본 질문 템플릿

## 15.2 Phase 2

1. AI 학생용 요약
2. AI 맞춤 탐구 질문
3. 탐구 노트 -> 보고서 개요 초안

## 15.3 Phase 3

1. 기록 기능과 양방향 연결
2. 학기 단위 추천 주제 묶음
3. 저장 콘텐츠 군집 기반 탐구 포트폴리오

---

## 16. 품질 게이트 및 검증 포인트

## 16.1 기능 검증

1. 관심 직업/학과가 없는 사용자에 대한 fallback 피드 제공
2. 저장/수정/삭제 흐름 정상 동작
3. 같은 콘텐츠 중복 저장 정책 검증
4. 탐구 노트에서 기록 기능 연결 동작 검증

## 16.2 품질 검증

1. 최신 콘텐츠 정렬 정확성
2. 개인화 추천 적합도
3. 출처/발행일 표시 정확성
4. 학생부 연결 포인트의 과장/오인 가능성 점검

## 16.3 AI 검증

1. 금지 표현 필터 적용 여부
2. `AI 초안, 사용자 검토 필요` 문구 고정 표시
3. 허위 사실 또는 과도한 확정 표현 차단
4. 비용 및 응답 시간 측정

---

## 17. 리스크 및 대응

1. `일반 뉴스 앱처럼 보일 위험`
  - 대응: 모든 카드에 `학생부 연결 포인트`와 `탐구 질문` 제공
2. `초기 개인화 데이터 부족`
  - 대응: 커리어넷 추천 결과, 공통 인기 주제, 사용자 관심사 필드 병행 사용
3. `AI가 학생부 문장 생성으로 과도하게 확장될 위험`
  - 대응: 출력 타입을 초안/질문/개요 중심으로 제한
4. `최신 정보 품질 편차`
  - 대응: 출처 정책, 품질 점수, 운영 검수 흐름 도입

---

## 18. 오픈 이슈

1. 외부 콘텐츠 수집 소스 선정과 저작권/요약 정책 확정 필요
2. AI 보조 기능을 `premium` 전용으로 둘지 별도 제한 정책을 둘지 결정 필요
3. 탐구 노트와 기존 `records`의 저장 경계 명확화 필요
4. 직업/학과 태그 사전의 초기 구축 방식 결정 필요

---

## 19. 변경 이력

### v1.0 (2026-03-08)

1. `학생부 Insight` 기능의 제품 정의와 사용자 흐름 초안 작성
2. 관심 기반 개인화의 비AI/AI 역할 분리
3. Firestore 컬렉션 및 API 초안 정의
4. MVP 범위와 단계별 확장 전략 정리
