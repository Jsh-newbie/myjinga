# 마진가(Myjinga) 고도화 개발 실행 명세서

- 문서 버전: v1.1
- 기준 문서: `마진가_Myjinga_종합개발기획서_v1.0.md`, `docs/myjinga-course-recommendation-rules-spec-v1.0.md`, `docs/myjinga-curriculum-reference-data-spec-v1.0.md`, `docs/myjinga-course-planning-eligibility-spec-v1.0.md`
- 작성일: 2026-03-05
- 최근 수정일: 2026-04-10
- 상태: 개발 착수용 실행 명세
- 적용 범위: 아키텍처, 도메인 모델, API 계약, 인증/결제/AI/운영 정책, 테스트/릴리스 기준
- 독자: PM, FE/BE 개발자, QA, 운영 담당자

---

## 1. 문서 목적과 범위

본 문서는 기존 종합 기획서를 실제 개발/검증/배포 가능한 수준으로 구체화한 실행 문서다.

- 포함 범위:
  - 아키텍처, 도메인 모델, API 계약, 데이터 규칙
  - 인증/결제/AI/외부 API 연동 상세 정책
  - 품질 기준(SLO/테스트/보안), 운영 기준(로그/모니터링/장애 대응)
  - 릴리스 게이트와 인수 기준
- 제외 범위:
  - 마케팅 운영 플랜
  - 조직 채용/인사 계획

---

## 2. 제품 목표 및 성공 지표

## 2.1 제품 목표

1. 학생이 진로 탐색부터 학생부 기록까지 하나의 서비스에서 완료하도록 한다.
2. 유료 기능(선택과목 심화, AI 보조)으로 LTV를 만든다.
3. 개인정보/청소년 보호 이슈를 초기부터 준수 가능한 구조로 고정한다.

## 2.2 KPI (MVP 출시 후 8주)

1. 회원가입 완료율: 55% 이상
2. 첫 심리검사 완료율: 45% 이상
3. 첫 학생부 기록 작성률(가입 7일 내): 35% 이상
4. 무료 → 유료 전환율: 3% 이상
5. 주간 활성 사용자 재방문율(W2): 30% 이상

## 2.3 운영 SLO

1. 월간 서비스 가용성: 99.5% 이상
2. API p95 응답시간: 800ms 이하(외부 API 호출 제외)
3. 결제 웹훅 처리 성공률: 99.9% 이상
4. 주요 오류율(HTTP 5xx): 0.5% 미만

---

## 3. 시스템 아키텍처

## 3.1 상위 구성

1. Client: Next.js 14 App Router 기반 웹앱
2. API Layer: Next.js Route Handlers (서버사이드)
3. Data: Firebase Auth, Firestore, Storage
4. External: 커리어넷 API, OpenAI API, 토스페이먼츠
5. Hosting: Vercel (웹/API), Firebase (데이터/인증/스토리지)

## 3.2 신뢰 경계(Trust Boundary)

1. 브라우저는 비신뢰 영역이다. API 키/빌링키/관리 권한은 절대 노출 금지.
2. 외부 API는 항상 서버 라우트에서 프록시/검증 후 사용.
3. Firestore 접근은 보안 규칙과 커스텀 클레임(역할)로 이중 통제.

## 3.3 런타임 정책

1. 중요 서버 라우트는 Node 런타임 사용(결제 검증, OpenAI 호출).
2. 서버 로그에 민감정보(원문 프롬프트, 카드정보, 주민번호 등) 저장 금지.
3. 지역/시간 기준은 기본 `Asia/Seoul`로 통일.

---

## 4. 도메인 모델(정규화 규칙 포함)

## 4.1 사용자 역할

- `student` (MVP 기본)
- `parent` (Phase 2)
- `teacher` (Phase 3)
- `admin` (운영)

MVP에서는 `student`, `admin`만 실제 권한 처리한다.

## 4.2 핵심 엔티티

1. User: 계정, 학교 정보, 구독 정보, 보호자 동의 상태
2. TestResult: 커리어넷 검사 결과 원본/정규화 데이터
3. Major/Subject: 추천 로직 기반 데이터셋
4. GraduationRequirement: 교과군별 필수 이수 규정, 총 이수/자율 이수 제약
5. CreditOperationPolicy: 과목 기본 학점, 편성·운영 범위, 증감 허용 규칙
6. Record: 학생부 활동 기록 단위
7. Subscription/Payment: 결제 상태와 이력
8. AIUsageLog: 호출량, 과금, 실패 추적

## 4.3 Firestore 컬렉션 명세

## users/{uid}

- required:
  - `email: string`
  - `name: string`
  - `birthDate: timestamp`
  - `schoolLevel: "middle" | "high"`
  - `grade: 1 | 2 | 3`
  - `role: "student" | "admin"`
  - `subscription.plan: "free" | "premium"`
  - `subscription.status: "active" | "paused" | "cancelled"`
  - `createdAt: timestamp`
  - `updatedAt: timestamp`
- optional:
  - `schoolName: string`
  - `interests: string[]`
  - `parentConsent: { parentEmail, consentStatus, requestedAt, consentedAt }`
- constraints:
  - `birthDate` 기반으로 가입 시점에 `isMinor` 계산 저장
  - `grade`는 `schoolLevel`과 논리 충돌 불가(예: 유효 범위 이외 값 금지)

## users/{uid}/testResults/{testId}

- required:
  - `testType: string`
  - `answerPayload: object`
  - `resultUrl: string`
  - `recommendedJobs: string[]`
  - `completedAt: timestamp`
- optional:
  - `normalizedScores: object`
  - `sourceRaw: object` (원본 보관, 30일 보관 후 삭제 가능)

## users/{uid}/records/{recordId}

- required:
  - `category: string`
  - `semester: string` (`YYYY-1`, `YYYY-2`)
  - `title: string` (1~120자)
  - `content: string` (1~3000자)
  - `createdAt: timestamp`
  - `updatedAt: timestamp`
- optional:
  - `careerRelevance: string`
  - `subject: string`
  - `hours: number`
  - `attachments: string[]`
  - `aiDraft: string`
- constraints:
  - `hours`는 봉사 카테고리에서만 허용
  - `aiDraft`는 premium 사용자만 생성 가능

## curriculumSources/{sourceId}

- required:
  - `title: string`
  - `fileName: string`
  - `curriculumRevision: string`
  - `guideYear: number`
  - `region: string`
  - `publisher: string`
  - `publishedAt: timestamp`
  - `pageCount: number`
- optional:
  - `checksum: string`
  - `status: "active" | "archived"`

## fieldSubjectGuides/{guideId}

- required:
  - `field: string`
  - `coreSubjects: string[]`
  - `recommendedSubjects: string[]`
  - `sourceRefs: object[]`
- optional:
  - `subfield: string`
  - `notes: string[]`

## majors/{majorId}

- required:
  - `nameKo: string`
  - `fieldNameKo: string`
  - `summary: string`
  - `sourceRefs: object[]`
- optional:
  - `aliasesKo: string[]`
  - `fieldGuideId: string`
  - `recommendedStudentTraits: string[]`
  - `majorCourseBuckets: { label: string; courseNames: string[] }[]`
  - `similarMajorGroups: { label: string; majorNames: string[] }[]`
  - `careerPathGroups: { label: string; careerNames: string[] }[]`
  - `universityExampleGroups: { label: string; seoul?: string[]; metro?: string[]; nonMetro?: string[] }[]`
  - `relatedHighSchoolSubjectExamples: { general: string[]; career: string[]; convergence: string[] }`
  - `notes: string[]`

메모:
- `review/majors-draft.json`은 원문 보존을 위해 `sourceText`, `reviewStatus`, `notes`를 함께 가질 수 있다.
- Firestore 서빙 데이터는 페이지 단위 추적을 위해 `sourceRefs`를 사용한다.

## subjects/{subjectId}

- required:
  - `name: string`
  - `subjectGroup: string`
  - `selectionType: "common" | "general" | "career" | "convergence" | "specialized"`
  - `summary: string`
  - `keyTopics: string[]`
  - `sourceRefs: object[]`
- optional:
  - `aliases: string[]`
  - `creditPolicy: object`
  - `evaluation: object`
  - `relatedJobs: string[]`
  - `relatedMajorNames: string[]`
  - `tags: string[]`

## majorSubjectLinks/{linkId}

- required:
  - `majorId: string`
  - `subjectId: string`
  - `selectionBucket: "general" | "career" | "convergence"`
  - `recommendationStrength: "core" | "recommended" | "exploratory"`
  - `sourceRefs: object[]`
- optional:
  - `sourceType: "majorExample" | "fieldGuide" | "manualCuration"`
  - `reason: string`

## graduationRequirements/{policyId}

- required:
  - `schoolType: "general-high-school"`
  - `entryYear: number`
  - `curriculumRevision: string`
  - `creditSummary: object`
  - `subjectGroupRequirements: object[]`
- optional:
  - `electiveCreditPolicyText: string`
  - `constraintNotes: string[]`
  - `sourceText: string`
- constraints:
  - 추천 가능 여부 검사는 `subjects`보다 먼저 `graduationRequirements`를 기준으로 수행
  - `체육`, `예술`, `기술·가정/정보/제2외국어/한문/교양`은 현재 단계에서 학점 총량 기준 검증 허용

## creditOnlySubjectGroupRequirements/{entryId}

- required:
  - `subjectGroup: string`
  - `requiredCredits: number`
  - `validationMode: "credits-only"`
- optional:
  - `subjectMetadataStatus: "not-started" | "partial"`
  - `knownStructure: object`
  - `childSubjectGroups: string[]`
  - `sourceText: string`
- constraints:
  - `graduationRequirements.subjectGroupRequirements[].validationMode = "credits-only"`인 교과군만 대상으로 한다.
  - 현재 단계에서는 세부 과목 일치보다 필수 학점 총량 충족 여부 검증에 사용한다.

## creditOperationPolicies/{policyId}

- required:
  - `schoolType: "general-high-school"`
  - `entryYear: number`
  - `curriculumRevision: string`
  - `policyCategory: "common" | "selection"`
  - `appliesTo: object`
  - `defaultCredits: number`
  - `creditRange: { min: number, max: number }`
  - `adjustmentPolicy: object`
- optional:
  - `exceptionRules: object[]`
  - `sourceText: string`
- constraints:
  - `graduationRequirements`가 `무엇을 들어야 하는가`를 정의한다면, `creditOperationPolicies`는 `몇 학점으로 편성할 수 있는가`를 정의한다.
  - 학교별 실제 개설 과목 데이터(`schoolSubjectOfferings`)와 분리해 관리한다.

## subscriptions/{subscriptionId}

- required:
  - `userId`
  - `provider: "toss"`
  - `plan: "premium"`
  - `status: "active" | "paused" | "cancelled"`
  - `billingKey`
  - `currentPeriodStart`
  - `currentPeriodEnd`

## payments/{paymentId}

- required:
  - `userId, amount, status, provider, providerPaymentKey`
  - `requestedAt, approvedAt`
- constraints:
  - 웹훅 재수신 대비 `providerPaymentKey` unique 보장 필요(트랜잭션/중복 방지 문서 ID 전략)

## aiUsageLogs/{logId}

- required:
  - `userId, featureType, model, promptTokens, completionTokens, totalTokens`
  - `latencyMs, success, createdAt`

---

## 5. 인덱스 및 쿼리 설계

## 5.1 복합 인덱스

1. `users/{uid}/records`: `category ASC, semester ASC, createdAt DESC`
2. `users/{uid}/records`: `semester ASC, updatedAt DESC`
3. `users/{uid}/testResults`: `testType ASC, completedAt DESC`
4. `majors`: `field ASC, name ASC`
5. `subjects`: `subjectGroup ASC, selectionType ASC, name ASC`
6. `majorSubjectLinks`: `majorId ASC, selectionBucket ASC, recommendationStrength ASC`

## 5.2 금지 쿼리

1. 서브컬렉션 전체 `collectionGroup` 무분별 사용 금지
2. 페이지당 50개 초과 조회 금지
3. 정렬 없는 full scan 금지

---

## 6. 보안 및 컴플라이언스 명세

## 6.1 인증/권한

1. 클라이언트: Firebase ID Token
2. 서버: 토큰 검증 후 `uid`, `role`, `subscription` 조회
3. 권한 정책:
  - 본인 데이터만 읽기/쓰기
  - `curriculumSources`, `fieldSubjectGuides`, `majors`, `subjects`, `majorSubjectLinks`는 인증 사용자 읽기 전용
  - 관리자 쓰기 작업은 Admin SDK 전용 경로로 분리

## 6.2 만 14세 미만 동의

1. 가입 시 생년월일로 연령 계산
2. `isMinor=true`면 보호자 동의 완료 전 핵심 기능 제한
3. `parentConsent` 로그를 변경 불가 이벤트성으로 저장(감사 추적)

## 6.3 데이터 보존

1. 결제 데이터: 5년(회계/분쟁 대응)
2. AI 원문 요청 본문: 기본 저장 금지, 필요 시 마스킹/해시만 저장
3. 탈퇴 사용자 데이터: 30일 유예 후 비식별/삭제 배치

## 6.4 보안 체크리스트

1. `.env.local` 커밋 금지
2. API 응답에서 내부 오류 스택 노출 금지
3. 파일 업로드 확장자/용량 제한(예: pdf, jpg, png / 10MB)
4. 웹훅 서명 검증 실패 시 즉시 401 반환

## 6.5 계정 복구 및 비밀번호 재설정 이메일 정책

1. MVP에서는 Firebase Auth 관리형 비밀번호 재설정 메일을 기본 사용한다. 클라이언트는 `sendPasswordResetEmail`만 호출하고, 메일 템플릿과 기본 액션 링크 생성은 Firebase 관리 범위로 둔다.
2. 무상 또는 저비용 커스터마이즈 허용 범위는 아래 3가지다.
  - Firebase Console의 `Password reset` 템플릿 문구 수정
  - Firebase 프로젝트 `public-facing name` 수정
  - 클라이언트 `auth.languageCode = "ko"` 설정을 통한 한국어 메일 우선 적용
3. 브랜드 도메인 기반 메일은 보유 도메인과 DNS 검증이 선행 조건이다. 도메인 구매/갱신 비용은 외부 비용으로 본다.
4. 완전 커스텀 HTML 메일은 MVP 범위 밖이다. 도입 시 `generatePasswordResetLink()` 기반 서버 링크 생성, 외부 메일 발송 서비스, 링크 만료/리다이렉트 정책, 감사 로그 정책을 함께 설계하고 ADR 작성 후 진행한다.
5. 공개 로그인 화면에서 이메일 존재 여부를 직접 알려주는 `계정 찾기` API는 기본 금지한다. 계정 복구는 안내형 UX 또는 인증된 사용자 프로필 경로를 우선 사용해 계정 열거 위험을 줄인다.

---

## 7. API 계약(초안)

모든 응답 공통 형식:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

오류 형식:

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

## 7.1 인증/사용자

1. `GET /api/me`
  - purpose: 내 프로필 조회
  - auth: required
2. `PATCH /api/me`
  - body: `name, schoolLevel, grade, schoolName, interests`
  - validation: 필드별 타입/범위 검증

## 7.2 커리어넷

1. `GET /api/career-net/questions?testType=...`
  - auth: required
  - process: 서버에서 `CAREER_NET_API_KEY`로 호출 후 normalize
2. `POST /api/career-net/report`
  - body: `testType`, `answers[]`
  - process: 결과 URL 반환 후 `testResults` 저장

## 7.3 탐색

1. `GET /api/explore/jobs?fromTestId=...`
2. `GET /api/explore/majors?jobCode=...`
3. `GET /api/explore/subjects?majorId=...&grade=...`

## 7.4 학생부 기록

1. `POST /api/records`
2. `GET /api/records?category=...&semester=...&cursor=...`
3. `GET /api/records/:recordId`
4. `PATCH /api/records/:recordId`
5. `DELETE /api/records/:recordId`

## 7.5 AI

1. `POST /api/ai/guide`
2. `POST /api/ai/writing`
3. `POST /api/ai/consulting`

공통 정책:

1. premium 여부 확인
2. 분당 호출 제한(예: user당 10회)
3. 금칙어/금지표현 필터링
4. 결과에 "AI 초안, 사용자 검토 필요" 표시 강제

## 7.6 결제

1. `POST /api/payments/billing`
2. `POST /api/payments/confirm`
3. `POST /api/payments/webhook`
4. `POST /api/subscription/cancel`
5. `POST /api/subscription/resume`

웹훅 처리 규칙:

1. 멱등성 키(`eventId`) 저장
2. 동일 이벤트 재수신 시 no-op 반환
3. 실패 시 지수 백오프 재시도 큐 등록

---

## 8. AI 프롬프트/안전 설계

## 8.1 프롬프트 레이어

1. 시스템 프롬프트: 학생부 기재요령, 금지사항
2. 정책 프롬프트: 허위 생성 금지, 과장 표현 금지
3. 사용자 입력: 과목/활동/진로 맥락

## 8.2 출력 후처리

1. 금지 키워드 필터(대학명/특정 기관명 등)
2. 길이 제한(세특 초안 500자 이내 옵션 제공)
3. 문체 규칙(사실 중심, 근거 없는 평가 금지)

## 8.3 토큰/비용 제어

1. 기본 모델: `gpt-4o-mini`
2. 기능별 max token 하드캡
3. 사용자 월간 토큰 예산 초과 시 soft limit 경고 + hard stop

---

## 9. 결제/구독 상태 머신

## 9.1 상태

- `trial` (선택)
- `active`
- `past_due`
- `paused`
- `cancelled`

## 9.2 전이 규칙

1. 첫 결제 성공: `free -> active`
2. 정기결제 1~3회 실패: `active -> past_due`
3. 3회 초과 실패: `past_due -> paused`
4. 사용자 해지 요청: `active -> cancelled` (기간 종료 시점 적용)
5. 결제 수단 갱신 성공: `past_due/paused -> active`

---

## 10. 프론트엔드 구현 기준

## 10.1 페이지/컴포넌트

1. 서버 컴포넌트 우선, 상호작용 영역만 클라이언트 컴포넌트 사용
2. 폼은 공통 유효성 스키마(zod)로 통일
3. 로딩/에러/빈 상태 UI를 페이지마다 명시 구현

## 10.2 접근성/반응형

1. 키보드 탐색 가능
2. 색 대비 WCAG AA 이상
3. 모바일 최소 360px, 데스크톱 1440px 기준 레이아웃 검증

---

## 11. 테스트 전략

## 11.1 테스트 계층

1. Unit: 유틸/도메인 함수/검증 로직
2. Integration: API Route + Firestore emulator
3. E2E: 핵심 시나리오(가입, 검사, 기록, 결제, AI)

## 11.2 최소 커버리지 목표

1. Unit: 70%+
2. Integration: 주요 API 100% 경로 존재
3. E2E: 릴리스 게이트 시나리오 12개 모두 통과

## 11.3 릴리스 차단 버그

1. 타인 데이터 접근 가능 이슈
2. 결제 승인/취소 불일치
3. 검사 결과 저장 유실
4. 기록 CRUD 데이터 손실

---

## 12. 관측성(Observability) 및 운영

## 12.1 로그 표준 필드

- `timestamp, level, route, uid(hash), requestId, latencyMs, statusCode, errorCode`

## 12.2 대시보드 지표

1. API 성공률/지연
2. 외부 API 실패율(커리어넷/AI/토스)
3. 결제 성공/실패 비율
4. AI 호출량 및 평균 비용

## 12.3 경보 기준

1. 5xx 5분 평균 2% 초과
2. 웹훅 실패 10분 내 5건 초과
3. 결제 승인률 일간 90% 미만

---

## 13. 개발 일정(실행 단위 재정의)

4주 계획은 유지하되, 릴리스 리스크를 줄이기 위해 각 주차 종료 시 `완료 기준(DoD)`를 강제한다.

## Week 1 DoD

1. 인증 플로우 동작(미성년자 분기 포함)
2. Firestore 스키마/인덱스/규칙 반영
3. 기본 대시보드 및 라우트 접근 제어 동작

## Week 2 DoD

1. 커리어넷 모의/실 API 둘 다 동작 가능한 추상화
2. 검사 5종 공통 UI + 중간저장
3. 결과 저장 및 추천 탐색 시작 가능

## Week 3 DoD

1. 학생부 전 카테고리 CRUD 완료
2. 추천 로직 연결(직업->학과->과목)
3. 필터/검색/정렬 포함된 기록 조회

## Week 4 DoD

1. 결제/구독 상태 머신 구현
2. AI 2개 기능(guide/writing) 운영 가능
3. QA 체크리스트 100% 통과 후 배포

---

## 14. 릴리스 게이트 체크리스트

출시 전 모든 항목이 `PASS`여야 한다.

1. 보안 규칙 검증 완료
2. 환경 변수 분리(dev/stage/prod) 완료
3. 백업/복구 절차 문서화 완료
4. 결제 웹훅 재처리 시나리오 테스트 완료
5. 장애 대응 연락 체계/런북 준비 완료
6. 개인정보처리방침/이용약관 최신 반영 완료

---

## 15. 오픈 이슈(결정 필요)

1. AI 모델 업그레이드 조건(품질 임계치, 비용 임계치)
2. 미성년자 동의 고도화(본인인증 API 도입 시점)
3. 환불 정책 세부 기준(부분 환불/중도 해지)
4. 부모/교사 계정 롤아웃 우선순위
5. 비밀번호 재설정 메일을 Firebase 관리형으로 유지할지, 외부 메일 서비스 기반 브랜드 메일로 전환할지 결정

---

## 16. 산출물 목록

1. API 명세 파일(OpenAPI 또는 markdown)
2. Firestore 보안 규칙 파일
3. 인덱스 정의 파일
4. 데이터 추출/적재 스크립트
5. QA 시나리오 문서
6. 운영 런북

---

## 17. 변경 이력

### v1.1 - 2026-04-09

1. 문서 헤더에 `최근 수정일`, `적용 범위`를 추가해 문서 규칙과 정합성을 보강
2. 계정 복구 및 비밀번호 재설정 이메일 정책 신설
3. Firebase 관리형 메일의 무상 커스터마이즈 범위와 향후 브랜드 메일 전환 조건 명시

### v1.1 - 2026-04-10

1. 교육과정 참조 데이터 스펙을 기준 문서에 추가
2. `curriculumSources`, `fieldSubjectGuides`, `majorSubjectLinks`를 포함한 참조 데이터 레이어 반영
3. `majors`, `subjects` 도메인 모델과 인덱스/권한 설명을 통합 데이터 모델 기준으로 보강
4. `creditOperationPolicies`를 추가해 과목 기본 학점과 편성·운영 범위를 별도 참조 규칙으로 정의
5. 통합 상위 규칙 문서(`myjinga-course-recommendation-rules-spec-v1.0.md`)를 기준 문서에 추가

---

문서 끝.
