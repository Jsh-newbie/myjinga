# 마진가(Myjinga) 학생부 기록 기능 명세서

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-project-rules-v1.0.md`, `2026 학교생활기록부 기재요령(고)_F_260219 (1).pdf`
- 작성일: 2026-03-08
- 상태: Draft (구현 설계 기준)
- 적용 범위: 학생부 기록 기능의 정보 구조, 기록 프로세스, 카테고리 설계, 화면/데이터/API 초안

---

## 1. 목적

본 문서는 학생이 학교생활을 매일 기록하고, 주간/학기말 정리를 통해 실제 학교생활기록부 반영 가능성이 높은 근거를 체계적으로 관리할 수 있도록 학생부 기록 기능의 구조를 정의한다.

핵심 원칙은 다음과 같다.

1. 학생이 학교생활기록부를 직접 작성하는 구조로 설계하지 않는다.
2. 학생은 매일 활동 근거와 아이디어를 기록하고, 앱은 이를 학생부 친화적 구조로 정리한다.
3. 공식 학생부 입력 주체가 교사인 항목과, 학생이 보조적으로 관리할 수 있는 항목을 구분한다.
4. 2026학년도 학교생활기록부 기재요령(고등학교) 기준의 입력 가능/제한 사항을 안내와 검증 정책에 반영한다.

---

## 2. 설계 원칙

## 2.1 제품 원칙

1. `매일 3분 기록`을 기본 UX로 한다.
2. 하루 기록은 짧고 가볍게, 학기말 정리는 구조적으로 깊게 설계한다.
3. 학생이 `무엇을 했는지`보다 `무엇이 드러났는지`를 함께 남기게 한다.
4. 학생부 반영 가능성이 높은 활동은 카테고리화하고, 즉시 학생부 문장 생성으로 넘어가지 않는다.
5. 사실 입력 항목과 해석/성찰 항목을 분리한다.

## 2.2 컴플라이언스 원칙

1. 교외상, 교외대회, 해외활동, 방과후학교 활동, 소논문 실적은 학생부 공식 항목으로 안내하거나 저장 분류하지 않는다.
2. 특정 대학명, 기관명, 상호명, 강사명 등 금지 표현은 안내 및 AI 필터 규칙에 반영한다.
3. 자격증 정보는 자격증 항목에서만 관리한다.
4. 학생부 공식 입력 주체가 교사인 항목은 학생용 앱에서 `준비 메모` 또는 `검토 참고자료`로만 다룬다.

---

## 3. 학생용 기록 영역 분류

학생부 기록 기능은 아래 5개 관점으로 구성한다.

1. `단기 기록`: 오늘 또는 이번 주 안에 기록해야 가치가 높은 활동
2. `중장기 관리`: 학기 단위 누적 관리가 필요한 항목
3. `아이디어 기록`: 세특/탐구/진로 확장 아이디어
4. `학기말 검토`: 실제 학생부와 비교 및 점검
5. `단순 입력`: 사실 위주 정보 입력

---

## 4. 학생이 직접 기록해야 하는 핵심 카테고리

## 4.1 MVP 기록 카테고리

1. `dailyLog`: 오늘의 기록
2. `subjectNote`: 세특 준비 기록
3. `creativeActivity`: 창체 기록
4. `volunteer`: 봉사 기록
5. `reading`: 독서 기록
6. `award`: 수상 기록
7. `certificate`: 자격증 기록
8. `careerIdea`: 진로/탐구 아이디어
9. `semesterReview`: 학기말 점검

본 문서의 카테고리 값은 기존 실행 명세(`users/{uid}/records/{recordId}`의 `category`)를 확장한 값으로 사용한다. 즉, 구현 시 저장 필드명은 `category`를 유지한다.

## 4.2 카테고리별 목적

### `dailyLog`

매일 알림으로 진입하는 기본 기록. 학생부 공식 항목이 아니라, 후속 분류를 위한 원재료다.

- 저장 목적:
  - 오늘 있었던 의미 있는 수업/활동/생각을 빠르게 남김
  - 주간 정리 시 세특/창체/진로 아이디어로 승격

### `subjectNote`

교과학습발달상황 중 `세부능력 및 특기사항`에 반영될 수 있는 수업 근거 메모.

- 저장 목적:
  - 과목별 참여, 발표, 탐구, 질문, 수행평가 근거 축적
  - 학기말 세특 검토 자료 정리

### `creativeActivity`

창의적 체험활동상황 기록. 내부 서브타입을 둔다.

- 서브타입:
  - `autonomy` (자율·자치활동)
  - `club` (동아리활동)
  - `career` (진로활동)

### `volunteer`

봉사활동 실적 기록. 사실 정보와 간단한 성찰을 함께 저장한다.

### `reading`

독서활동상황 관리. 기본은 `도서명/저자/학기` 중심이며, 감상은 참고 메모로 저장한다.

### `award`

교내 수상만 관리한다. 교외상은 공식 기록 대상으로 분류하지 않는다.

### `certificate`

고등학교 재학 중 취득 자격증을 관리한다. 허용 가능한 자격 범위 안내가 필요하다.

### `careerIdea`

진로희망, 탐구 주제, 보고서 아이디어, 심화활동 아이디어 저장용 메모.

### `semesterReview`

학기말 실제 학생부, 누락 활동, 금지 표현, 진로 연계 흐름을 점검하는 검토 기록.

---

## 5. 학생이 직접 입력하지 않는 항목

아래 항목은 학생이 공식 기록을 작성하는 구조로 제공하지 않는다.

1. `인적사항`
2. `학적사항`
3. `교과 성적/학점/석차/성취도 자체`
4. `행동특성 및 종합의견`
5. `국가직무능력표준 이수상황`
6. `공식 출결 데이터 전체`

처리 원칙:

1. 학생이 필요시 참고 메모는 남길 수 있다.
2. 공식 항목 입력 화면처럼 보이지 않게 한다.
3. 교사/학교 행정 입력 영역이라는 점을 명확히 안내한다.

---

## 6. 기록 프로세스 설계

## 6.1 일일 기록 프로세스

목표: 매일 2~3분 내에 의미 있는 근거를 남긴다.

### 사용자 흐름

1. 알림 수신: `오늘의 기록을 남겨보세요`
2. 빠른 선택:
  - 오늘 기록할 것이 있음
  - 아이디어만 메모하고 싶음
  - 오늘은 기록 없음
3. 기본 질문 입력
4. 카테고리 추천
5. 저장 후 후속 액션 제안

### 일일 기록 질문

1. 오늘 기억할 수업/활동이 있었는가
2. 내가 한 행동이나 역할은 무엇인가
3. 무엇을 배우거나 느꼈는가
4. 진로/관심 분야와 연결되는 점이 있는가
5. 나중에 더 키우고 싶은 주제나 아이디어가 있는가
6. 사진, 자료, 결과물 같은 증빙이 있는가

### 일일 기록 최소 필드

1. `recordDate`
2. `title`
3. `activitySummary`
4. `myRole`
5. `learningPoint`
6. `careerConnection`
7. `ideaNote`
8. `evidenceStatus`
9. `tags`

## 6.2 주간 정리 프로세스

목표: 일일 로그를 학생부 연결형 기록으로 정리한다.

1. 이번 주 `dailyLog` 목록 제시
2. 중요 기록 선택
3. 기록 유형 분류:
  - 세특 준비
  - 창체
  - 봉사
  - 독서
  - 진로 아이디어
4. 중복 기록 통합
5. 증빙 누락 점검
6. 다음 주 액션 설정

## 6.3 월간/중간 점검 프로세스

목표: 과목별/진로별 누적 방향성을 확인한다.

1. 과목별 기록 수 확인
2. 창체/봉사/독서 활동 분포 점검
3. 진로 관련 활동의 일관성 점검
4. 탐구 아이디어 중 실제 실행할 항목 선택
5. 기록 부족 카테고리 알림

## 6.4 학기말 검토 프로세스

목표: 실제 학생부 반영 가능성 및 누락 여부를 검토한다.

1. 과목별 세특 근거 정리
2. 창체 영역별 대표 활동 정리
3. 봉사/독서/수상/자격증 사실 확인
4. 금지 표현 포함 여부 검토
5. 실제 학생부 기재 내용과 비교
6. 누락/오류/과장 여부 점검
7. 다음 학기 목표 설정

---

## 7. 기록 범주별 상세 설계

## 7.1 단기적으로 기록하면서 관리해야 하는 항목

### 수업/세특 준비

1. 과목명
2. 수업 주제
3. 참여 형태(발표, 질문, 토론, 실험, 문제해결, 수행평가)
4. 내가 한 행동
5. 배운 점
6. 더 탐구할 점
7. 진로 연관성
8. 증빙 자료 여부

### 창체

1. 활동 영역(자율·자치/동아리/진로)
2. 활동명
3. 날짜
4. 역할
5. 활동 내용
6. 드러난 역량
7. 다음 활동 아이디어

### 봉사

1. 날짜 또는 기간
2. 장소/주관기관명
3. 시간
4. 활동 내용
5. 느낀 점
6. 증빙 여부

### 독서

1. 도서명
2. 저자
3. 읽은 날짜
4. 관련 교과 또는 관심 분야
5. 핵심 내용
6. 진로 연결 포인트

## 7.2 중장기적으로 기록하고 관리해야 하는 항목

### 과목별 세특 성장 흐름

1. 과목별 반복 참여 패턴
2. 강점이 드러난 활동 유형
3. 수행평가/탐구 주제 이력
4. 교사 피드백 메모
5. 성장 변화 포인트
6. 다음 학기 확장 아이디어

### 창체 포트폴리오

1. 학기별 주요 활동
2. 역할 변화
3. 결과물
4. 협업/주도성 사례
5. 진로 연결도

### 진로 방향성

1. 희망 계열/학과/직업
2. 관심이 생긴 이유
3. 관련 수업/독서/활동
4. 부족한 경험
5. 보완 계획

### 수상/자격증 관리

1. 교내 수상 여부
2. 수상/취득 일자
3. 증빙 보관 상태
4. 학기말 확인 상태

## 7.3 아이디어를 기록해야 하는 항목

### 세특/탐구 아이디어

1. 과목
2. 궁금증
3. 탐구 질문
4. 확장 방법
5. 결과물 아이디어
6. 진로 연계

### 보고서/발표 아이디어

1. 주제
2. 배경
3. 사용 자료
4. 예상 산출물
5. 실행 시기

### 진로 관련 아이디어

1. 관심 학과/직업
2. 관심 계기
3. 확인해야 할 정보
4. 관련 활동 계획

## 7.4 학기말 확인해야 하는 항목

1. 과목별 세특 반영 근거가 충분한가
2. 창체 3영역 기록이 고르게 있는가
3. 봉사 실적의 날짜/시간/장소가 정확한가
4. 독서 기록이 누락되지 않았는가
5. 수상/자격증 증빙이 남아 있는가
6. 금지 표현이 포함되어 있지 않은가
7. 실제 학생부와 차이가 있는 부분이 있는가
8. 활동 흐름이 진로 방향성과 연결되는가

## 7.5 단순 입력만 하면 되는 항목

1. 봉사: 날짜, 시간, 장소/주관기관, 활동명
2. 수상: 수상명, 등급, 수상일, 수여기관
3. 자격증: 자격명, 번호, 취득일, 발급기관
4. 독서 기본정보: 도서명, 저자, 읽은 시기
5. 출결 참고메모: 날짜, 유형, 사유, 증빙 여부

---

## 8. 입력 금지/제한 가이드

다음 내용은 학생부 공식 기록 대상으로 분류하지 않는다.

1. 교외대회 참가 사실 및 교외 수상 실적
2. 해외 봉사활동, 해외 어학연수, 해외 활동 실적
3. 방과후학교 활동
4. 소논문 실적(제목, 연구 주제, 참여 인원, 소요시간 등)
5. 특정 대학명, 기관명, 상호명, 강사명
6. 자격증 정보를 자격증 외 다른 항목에 기재하는 행위

예외/주의:

1. 봉사활동의 `장소 또는 주관기관명`, 수상경력의 `수여기관`은 공식 항목 특성상 별도 관리가 필요하다.
2. 독서 기록의 도서명/저자명 자체에 포함된 대학명, 기관명은 입력 가능하다.
3. 앱 내 자유 메모에는 저장할 수 있더라도 학생부 반영 가능 항목으로 자동 승격하지 않는다.

---

## 9. 화면 구조 초안

## 9.1 라우트 구조

1. `/records`
2. `/records/today`
3. `/records/inbox`
4. `/records/subject`
5. `/records/creative-activities`
6. `/records/volunteer`
7. `/records/reading`
8. `/records/awards`
9. `/records/certificates`
10. `/records/career-ideas`
11. `/records/review`
12. `/records/[recordId]`
13. `/records/new`

## 9.2 주요 화면

### 학생부 대시보드

1. 오늘의 기록 CTA
2. 이번 주 기록 수
3. 과목별/카테고리별 분포
4. 기록이 부족한 영역 알림
5. 학기말 검토 상태

### 오늘의 기록

1. 빠른 질문 카드
2. 카테고리 추천
3. 음성/짧은 메모 입력 옵션
4. 저장 후 분류 추천

### 기록 인박스

1. 아직 분류되지 않은 `dailyLog`
2. 세특/창체/아이디어로 승격
3. 증빙 첨부 유도

### 카테고리별 상세 화면

1. 목록
2. 필터(학기, 과목, 하위유형)
3. 상세/수정
4. 템플릿 기반 새 기록 작성

### 학기말 검토 화면

1. 체크리스트
2. 누락 가능 항목
3. 실제 학생부 대조 메모
4. 다음 학기 목표

---

## 10. 데이터 모델 초안

## 10.1 공통 레코드 모델

`users/{uid}/records/{recordId}`

- 공통 필드:
  - `category: "dailyLog" | "subjectNote" | "creativeActivity" | "volunteer" | "reading" | "award" | "certificate" | "careerIdea" | "semesterReview"`
  - `semester: string`
  - `title: string`
  - `content: string`
  - `recordDate: timestamp`
  - `status: "draft" | "active" | "archived"`
  - `source: "dailyPrompt" | "manual" | "weeklyReview" | "semesterReview"`
  - `tags: string[]`
  - `evidenceStatus: "none" | "hasEvidence" | "needsUpload"`
  - `createdAt: timestamp`
  - `updatedAt: timestamp`

## 10.2 타입별 확장 필드

### `subjectNote`

- `subject.name: string`
- `subject.activityType: "question" | "discussion" | "presentation" | "experiment" | "performance" | "project" | "other"`
- `subject.myRole: string`
- `subject.learningPoint: string`
- `subject.inquiryIdea: string`
- `subject.careerConnection: string`

### `creativeActivity`

- `creative.subtype: "autonomy" | "club" | "career"`
- `creative.activityName: string`
- `creative.role: string`
- `creative.hours: number | null`
- `creative.competencies: string[]`
- `creative.nextAction: string`

### `volunteer`

- `volunteer.dateText: string`
- `volunteer.placeOrOrganization: string`
- `volunteer.hours: number`
- `volunteer.activityDetails: string`
- `volunteer.reflection: string`

### `reading`

- `reading.bookTitle: string`
- `reading.author: string`
- `reading.relatedSubject: string`
- `reading.summary: string`
- `reading.careerConnection: string`

### `award`

- `award.name: string`
- `award.rankOrLevel: string`
- `award.awardedOn: string`
- `award.organization: string`
- `award.isInternal: boolean`

### `certificate`

- `certificate.name: string`
- `certificate.number: string`
- `certificate.acquiredOn: string`
- `certificate.organization: string`

### `careerIdea`

- `career.topicType: "major" | "job" | "inquiry" | "project" | "reading" | "other"`
- `career.reason: string`
- `career.nextResearchAction: string`
- `career.relatedSubject: string`

### `semesterReview`

- `review.checklist: string[]`
- `review.missingAreas: string[]`
- `review.realRecordComparison: string`
- `review.nextSemesterGoal: string`

---

## 11. API 구조 초안

## 11.1 MVP API

1. `POST /api/records`
2. `GET /api/records?type=...&semester=...&cursor=...`
3. `GET /api/records/:recordId`
4. `PATCH /api/records/:recordId`
5. `DELETE /api/records/:recordId`

## 11.2 확장 API

1. `POST /api/records/daily-log`
2. `POST /api/records/:recordId/promote`
3. `GET /api/records/dashboard`
4. `GET /api/records/review/semester?semester=...`

---

## 12. 알림 설계 초안

## 12.1 알림 종류

1. 일일 기록 알림
2. 주간 정리 알림
3. 학기말 검토 알림
4. 기록 부족 카테고리 알림

## 12.2 기본 문구 예시

### 일일 기록

1. `오늘의 기록을 남겨보세요`
2. `오늘 수업이나 활동에서 기억할 장면이 있었나요?`
3. `지금 3분만 기록해두면 학기말 정리가 쉬워집니다`

### 주간 정리

1. `이번 주 기록을 학생부형 메모로 정리해보세요`
2. `분류되지 않은 기록이 쌓였어요`

### 학기말 검토

1. `학기 기록을 점검할 시기입니다`
2. `실제 학생부와 비교할 메모를 정리해보세요`

---

## 13. 구현 우선순위

## Phase A. 기록 기초 구조

1. 공통 `Record` 타입
2. `dailyLog`, `subjectNote`, `creativeActivity`, `careerIdea` 우선 구현
3. 기본 CRUD API
4. `/records`, `/records/today`, `/records/[recordId]`

## Phase B. 사실형 카테고리 확장

1. `volunteer`
2. `reading`
3. `award`
4. `certificate`
5. 카테고리별 입력 템플릿

## Phase C. 점검/정리 기능

1. 기록 인박스
2. 승격/분류 기능
3. 학기말 검토 화면
4. 기록 분포 및 누락 안내

---

## 14. 오픈 이슈

1. 중학교 모드에서 `certificate` 노출 여부를 별도 정책으로 분리할지 결정 필요
2. `출결 참고메모`를 독립 카테고리로 둘지, `dailyLog` 하위 메모로 둘지 결정 필요
3. 첨부파일 업로드 범위 및 저장소 정책(Storage, 10MB 제한 등) 확정 필요
4. 학기말 실제 학생부 대조 기능의 UX 범위(수기 대조 vs 항목별 체크리스트) 결정 필요
5. AI 초안 기능 도입 시 `subjectNote`와 `careerIdea` 중 어느 타입을 입력 소스로 우선 사용할지 결정 필요

---

## 15. Changelog

### v1.0 - 2026-03-08

1. 학생부 기록 기능의 사용자 관점 정보 구조 정의
2. 고등학교 기재요령 기준 입력 가능/제한 항목 정리
3. 일일/주간/학기말 기록 프로세스 설계
4. 카테고리, 데이터 모델, 화면 구조, 알림 초안 추가
