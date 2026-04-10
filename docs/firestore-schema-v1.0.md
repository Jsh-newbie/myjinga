# Firestore 데이터베이스 스키마 문서 v1.0

> 작성일: 2026-03-06
> 최근 수정일: 2026-04-10
> 프로젝트: 마진가(Myjinga)
> 데이터베이스: Firebase Firestore

---

## 목차

1. [개요](#1-개요)
2. [컬렉션 구조 맵](#2-컬렉션-구조-맵)
3. [구현 완료 컬렉션](#3-구현-완료-컬렉션)
4. [미구현 컬렉션 (명세서 정의)](#4-미구현-컬렉션-명세서-정의)
5. [보안 규칙](#5-보안-규칙)
6. [복합 인덱스](#6-복합-인덱스)
7. [데이터 흐름](#7-데이터-흐름)
8. [구현 패턴](#8-구현-패턴)
9. [명세서 vs 구현 차이점](#9-명세서-vs-구현-차이점)
10. [개선 필요 사항](#10-개선-필요-사항)

---

## 1. 개요

마진가 프로젝트는 Firebase Firestore를 주 데이터베이스로 사용한다. 모든 데이터 접근은 Firebase Admin SDK를 통해 서버 사이드(API Route Handler)에서 수행하며, 클라이언트의 직접 Firestore 접근은 금지한다.

### 구현 현황

| 상태 | 컬렉션 | 비고 |
|------|--------|------|
| 구현 완료 | `users`, `testSessions`, `testResults` | Phase 1~2 |
| 미구현 | `records`, `curriculumSources`, `fieldSubjectGuides`, `majors`, `subjects`, `majorSubjectLinks` | Phase 3 |
| 미구현 | `subscriptions`, `payments`, `aiUsageLogs` | Phase 4 |
| 미구현 | `insightContents`, `users/{uid}/insightSaves`, `users/{uid}/insightDrafts` | 학생부 Insight 초안 |

### 파일 위치

| 역할 | 경로 |
|------|------|
| Users Repository | `src/lib/users/repository.ts` |
| CareerNet Repository | `src/lib/careernet/repository.ts` |
| 사용자 타입 | `src/types/user.ts` |
| API 응답 타입 | `src/types/api.ts` |
| 검사 타입 | `src/lib/careernet/types.ts` |
| 보안 규칙 | `firestore.rules` |
| Firebase Admin | `src/lib/firebase/admin.ts` |

---

## 2. 컬렉션 구조 맵

```
firestore/
├── users/{uid}                              # 사용자 프로필
│   ├── testSessions/{sessionId}             # 진행 중 검사 세션
│   ├── testResults/{resultId}               # 완료된 검사 결과
│   ├── records/{recordId}                   # 학생부 기록 (미구현)
│   ├── insightSaves/{saveId}                # 학생부 Insight 저장 항목 (미구현)
│   └── insightDrafts/{draftId}              # 학생부 Insight 초안 (미구현)
├── majors/{majorId}                         # 추천 학과 (미구현, 읽기전용)
├── subjects/{subjectId}                     # 고교학점제 과목 (미구현, 읽기전용)
├── curriculumSources/{sourceId}             # 교육과정 출처 문서 (미구현, 읽기전용)
├── fieldSubjectGuides/{guideId}             # 계열별 핵심/권장 과목 가이드 (미구현, 읽기전용)
├── majorSubjectLinks/{linkId}               # 학과-과목 추천 연결 (미구현, 읽기전용)
├── insightContents/{contentId}              # 학생부 Insight 콘텐츠 (미구현)
├── subscriptions/{subscriptionId}           # 구독 (미구현)
├── payments/{paymentId}                     # 결제 (미구현)
└── aiUsageLogs/{logId}                      # AI 사용 로그 (미구현)
```

참고: `curriculumSources`, `fieldSubjectGuides`, `majors`, `subjects`, `majorSubjectLinks`의 상세 설계는 [myjinga-curriculum-reference-data-spec-v1.0.md](/Users/sunghyunji/개발/myjinga/docs/myjinga-curriculum-reference-data-spec-v1.0.md)에 따른다.

---

## 3. 구현 완료 컬렉션

### 3.1 users/{uid}

사용자 프로필 문서. Firebase Auth UID를 문서 ID로 사용한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | `string` | O | 이메일 |
| `name` | `string` | O | 이름 (변경 불가) |
| `nickname` | `string` | - | 닉네임 (표시용, 변경 가능) |
| `birthDate` | `string` (ISO) | O | 생년월일 (변경 불가) |
| `schoolLevel` | `'middle' \| 'high'` | O | 학교급 |
| `grade` | `1 \| 2 \| 3` | O | 학년 |
| `role` | `'student' \| 'admin'` | O | 역할 (가입 시 `'student'` 고정) |
| `subscription.plan` | `'free' \| 'premium'` | O | 구독 플랜 (가입 시 `'free'`) |
| `subscription.status` | `'active' \| 'paused' \| 'cancelled'` | O | 구독 상태 (가입 시 `'active'`) |
| `createdAt` | `Timestamp` (server) | O | 생성일시 (최초 1회) |
| `updatedAt` | `Timestamp` (server) | O | 수정일시 (매 업데이트) |
| `phoneNumber` | `string` | - | 전화번호 (E.164 형식, 예: +821012345678) |
| `phoneVerified` | `boolean` | - | 전화번호 인증 여부 |
| `schoolName` | `string` | - | 학교명 |
| `interests` | `string[]` | - | 관심사 |
| `parentConsent` | `object` | - | 보호자 동의 정보 |

**접근 패턴:**
- 생성/수정: `upsertUserProfile()` — 트랜잭션으로 원자성 보장
- 조회: `getUserProfile()` — 단건 조회

**타입 정의:** `src/types/user.ts` > `UserProfile`

---

### 3.2 users/{uid}/testSessions/{sessionId}

진행 중인 검사를 임시 저장하는 서브컬렉션. 검사 유형별 `in_progress` 세션은 최대 1개.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `testTypeId` | `CareerTestTypeId` | O | 검사 유형 (`'aptitude'` `'interest'` `'maturity'` `'values'` `'competency'`) |
| `qestrnSeq` | `string` | O | 커리어넷 검사번호 |
| `trgetSe` | `string` | O | 대상코드 (`'100206'`=중학생, `'100207'`=고등학생) |
| `status` | `'in_progress' \| 'submitted'` | O | 세션 상태 |
| `totalQuestions` | `number` | O | 전체 문항수 |
| `answeredCount` | `number` | O | 응답 완료 문항수 |
| `currentIndex` | `number` | O | 현재 문항 위치 (0-based) |
| `answers` | `Record<string, string>` | O | 답변 (`{"1":"5", "2":"3", ...}`) |
| `startDtm` | `number` | O | 검사 시작 시각 (epoch ms, 커리어넷 제출용) |
| `startedAt` | `Timestamp` (server) | O | 검사 시작 시각 (내부 기록용 서버 타임스탬프) |
| `createdAt` | `Timestamp` (server) | O | 생성일시 |
| `updatedAt` | `Timestamp` (server) | O | 수정일시 |

**접근 패턴:**
- 생성/갱신: `upsertTestSession()` — 트랜잭션 내에서 기존 `in_progress` 세션 조회 후 update 또는 신규 set
- 목록 조회: `listInProgressSessions()` — `status == 'in_progress'` + `updatedAt DESC`
- 단건 조회: `getTestSession()`
- 상태 변경: `markSessionSubmitted()` — `status`를 `'submitted'`로 변경

**타입 정의:** `src/lib/careernet/types.ts` > `TestSession`, `TestSessionWithId`

---

### 3.3 users/{uid}/testResults/{resultId}

완료된 검사 결과를 저장하는 서브컬렉션.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `testTypeId` | `CareerTestTypeId` | O | 검사 유형 |
| `qestrnSeq` | `string` | O | 커리어넷 검사번호 |
| `trgetSe` | `string` | O | 대상코드 |
| `inspctSeq` | `string` | O | 커리어넷 결과 번호 (제출 후 반환) |
| `resultUrl` | `string` | O | 커리어넷 결과 페이지 URL |
| `answerPayload.format` | `'v1' \| 'v2'` | O | 커리어넷 API 버전 |
| `answerPayload.raw` | `string \| Array<{no, val}>` | O | 원본 답변 (V1: 문자열, V2: 배열) |
| `reportDetail` | `ReportDetail` | - | 결과 상세 (비동기 fetch 후 업데이트) |
| `reportDetailFetching` | `boolean` | - | reportDetail fetch 진행 중 플래그 (중복 방지, 완료 시 삭제) |
| `completedAt` | `Timestamp` (server) | O | 완료일시 |
| `createdAt` | `Timestamp` (server) | O | 생성일시 |

**reportDetail 하위 구조:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `inspctSeq` | `string` | 검사 번호 |
| `testCode` | `string` | 검사 코드 |
| `gender` | `string` | 성별 |
| `target` | `string` | 대상 |
| `grade` | `string` | 학년 |
| `completedAt` | `string` | 완료 시각 |
| `responseTime` | `number` | 응답 소요 시간 |
| `responsePattern` | `string` | 응답 패턴 (선택) |
| `realms[]` | `ReportRealm[]` | 결과 영역 목록 |
| `realmMeta[]` | `RealmMeta[]` | 영역 메타데이터 (선택) |
| `recommendedJobs[]` | `RecommendedJob[]` | 추천 직업 (선택) |
| `recommendedMajors[]` | `RecommendedMajor[]` | 추천 학과 (선택) |

**ReportRealm 구조:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `rank` | `number` | 순위 |
| `code` | `string` | 코드 |
| `name` | `string` | 영역명 |
| `rawScore` | `number` | 원점수 |
| `percentile` | `number` | 백분위 |
| `tScore` | `number` | T점수 |

**접근 패턴:**
- 저장: `saveTestResult()` — 검사 제출 후 결과 저장
- 목록 조회: `listTestResults()` — `testTypeId` 필터(선택) + `completedAt DESC`
- 단건 조회: `getTestResult()` — `reportDetail` 없으면 실시간 fetch + 비동기 update
- 비동기 업데이트: `reportDetail` 후속 저장 (응답 지연 방지)

**타입 정의:** `src/lib/careernet/types.ts` > `TestResult`, `TestResultWithId`, `ReportDetail`

---

## 4. 미구현 컬렉션 (명세서 정의)

### 4.1 users/{uid}/records/{recordId}

학생부 기록. `docs/myjinga-development-spec-v1.1.md` 참조.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `category` | `string` | O | 기록 카테고리 |
| `semester` | `string` | O | 학기 (`YYYY-1`, `YYYY-2`) |
| `title` | `string` | O | 제목 (1~120자) |
| `content` | `string` | O | 내용 (1~3000자) |
| `createdAt` | `Timestamp` | O | 생성일시 |
| `updatedAt` | `Timestamp` | O | 수정일시 |
| `careerRelevance` | `string` | - | 진로 연관성 |
| `subject` | `string` | - | 과목 |
| `hours` | `number` | - | 봉사시간 (봉사 카테고리만) |
| `attachments` | `string[]` | - | 첨부파일 경로 |
| `aiDraft` | `string` | - | AI 초안 (premium만) |

---

### 4.2 majors/{majorId}

추천 학과 (읽기 전용 참조 데이터).

상세 스키마는 `docs/myjinga-curriculum-reference-data-spec-v1.0.md` 기준을 따른다. 본 문서에는 현재 Firestore 관점의 핵심 필드만 요약한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | O | 학과명 |
| `field` | `string` | O | 분야 |
| `summary` | `string` | O | 학과 요약 |
| `recommendedStudentTraits` | `string[]` | - | 추천 학생 특성 |
| `foundationCourses` | `string[]` | - | 전공 기초 교과목 |
| `advancedCourses` | `string[]` | - | 전공 심화 교과목 |
| `careerPaths` | `string[]` | - | 졸업 후 진로 |
| `similarMajors` | `string[]` | - | 유사 학과 |
| `sourceRefs` | `object[]` | O | 출처 참조 |

---

### 4.3 subjects/{subjectId}

고교학점제 과목 (읽기 전용 참조 데이터).

상세 스키마는 `docs/myjinga-curriculum-reference-data-spec-v1.0.md` 기준을 따른다. 본 문서에는 현재 Firestore 관점의 핵심 필드만 요약한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | O | 과목명 |
| `subjectGroup` | `string` | O | 교과(군) |
| `selectionType` | `string` | O | 선택 유형 (`common`, `general`, `career`, `convergence`, `specialized`) |
| `summary` | `string` | O | 과목 요약 |
| `keyTopics` | `string[]` | O | 주요 내용 |
| `creditPolicy` | `object` | - | 학점 정책 |
| `evaluation` | `object` | - | 평가 방식 |
| `relatedJobs` | `string[]` | - | 관련 직업 |
| `relatedMajorNames` | `string[]` | - | 관련 학과명 |
| `sourceRefs` | `object[]` | O | 출처 참조 |

---

### 4.4 subscriptions/{subscriptionId}

구독 관리.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | O | 사용자 UID |
| `provider` | `'toss'` | O | 결제 제공자 |
| `plan` | `'premium'` | O | 플랜 |
| `status` | `'active' \| 'paused' \| 'cancelled'` | O | 상태 |
| `billingKey` | `string` | O | 빌링 키 |
| `currentPeriodStart` | `Timestamp` | O | 현재 기간 시작 |
| `currentPeriodEnd` | `Timestamp` | O | 현재 기간 종료 |

---

### 4.5 payments/{paymentId}

결제 내역.

---

### 4.6 insightContents/{contentId}

학생부 Insight 기능의 공용 콘텐츠 저장소. 외부 수집 콘텐츠와 내부 재가공 메타데이터를 함께 관리한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | O | 콘텐츠 제목 |
| `sourceName` | `string` | O | 출처명 |
| `sourceUrl` | `string` | O | 원문 링크 |
| `publishedAt` | `Timestamp` | O | 원문 발행일 |
| `contentType` | `string` | O | 콘텐츠 유형 (`news`, `trend`, `research`, `career-story`, `major-story`) |
| `topics` | `string[]` | O | 주제 태그 |
| `relatedJobs` | `string[]` | O | 관련 직업 태그 |
| `relatedMajors` | `string[]` | O | 관련 학과 태그 |
| `summary` | `string` | O | 기본 요약 |
| `studentInsightPoints` | `string[]` | O | 학생부 연결 포인트 |
| `status` | `string` | O | 상태 (`draft`, `published`, `archived`) |
| `createdAt` | `Timestamp` | O | 생성일시 |
| `updatedAt` | `Timestamp` | O | 수정일시 |
| `studentFriendlySummary` | `string` | - | 학생용 쉬운 요약 |
| `whyItMatters` | `string` | - | 왜 중요한지 설명 |
| `exploreQuestions` | `string[]` | - | 탐구 질문 |

### 4.7 users/{uid}/insightSaves/{saveId}

학생이 저장하거나 반응한 학생부 Insight 항목.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `contentId` | `string` | O | 연결된 콘텐츠 ID |
| `savedAt` | `Timestamp` | O | 저장일시 |
| `reactionType` | `string` | O | 반응 유형 (`saved`, `curious`, `explore`, `record`) |
| `titleSnapshot` | `string` | O | 저장 시점 제목 |
| `sourceUrlSnapshot` | `string` | O | 저장 시점 원문 링크 |
| `memo` | `string` | - | 학생 메모 |
| `linkedJob` | `string` | - | 연결 직업 |
| `linkedMajor` | `string` | - | 연결 학과 |
| `linkedRecordId` | `string` | - | 연결 기록 ID |
| `exploreQuestion` | `string` | - | 학생이 남긴 탐구 질문 |
| `tags` | `string[]` | - | 사용자 태그 |
| `status` | `string` | - | 상태 (`active`, `used`, `archived`) |

### 4.8 users/{uid}/insightDrafts/{draftId}

학생이 저장한 인사이트를 기반으로 만든 탐구/학생부 준비 초안.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `draftType` | `string` | O | 초안 유형 (`reportOutline`, `selfReviewMaterial`, `subjectNoteMaterial`) |
| `title` | `string` | O | 초안 제목 |
| `sourceContentIds` | `string[]` | O | 입력 콘텐츠 목록 |
| `createdAt` | `Timestamp` | O | 생성일시 |
| `updatedAt` | `Timestamp` | O | 수정일시 |
| `outline` | `string` | - | 초안 본문 또는 개요 |
| `keyQuestions` | `string[]` | - | 핵심 질문 |
| `linkedRecordIds` | `string[]` | - | 연결 기록 목록 |
| `aiAssisted` | `boolean` | - | AI 보조 여부 |
| `status` | `string` | - | 상태 (`draft`, `completed`, `archived`) |

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | O | 사용자 UID |
| `amount` | `number` | O | 결제 금액 |
| `status` | `string` | O | 상태 |
| `provider` | `string` | O | 제공자 |
| `providerPaymentKey` | `string` | O | 제공자 결제 키 (unique) |
| `requestedAt` | `Timestamp` | O | 요청 일시 |
| `approvedAt` | `Timestamp` | O | 승인 일시 |

---

### 4.6 aiUsageLogs/{logId}

AI 기능 사용 로그.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | O | 사용자 UID |
| `featureType` | `string` | O | 기능 유형 |
| `model` | `string` | O | 모델 |
| `promptTokens` | `number` | O | 프롬프트 토큰 |
| `completionTokens` | `number` | O | 응답 토큰 |
| `totalTokens` | `number` | O | 총 토큰 |
| `latencyMs` | `number` | O | 지연시간(ms) |
| `success` | `boolean` | O | 성공 여부 |
| `createdAt` | `Timestamp` | O | 생성일시 |

---

## 5. 보안 규칙

파일: `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    // 사용자 프로필 - 본인만 접근
    match /users/{uid} {
      allow read, write: if isOwner(uid);

      match /records/{recordId} {
        allow read, write: if isOwner(uid);
      }

      match /testResults/{testId} {
        allow read, write: if isOwner(uid);
      }

      match /testSessions/{sessionId} {
        allow read, write: if isOwner(uid);
      }
    }

    // 참조 데이터 - 인증 사용자 읽기 전용
    match /curriculumSources/{sourceId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    match /fieldSubjectGuides/{guideId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    match /majors/{majorId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    match /subjects/{subjectId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    match /majorSubjectLinks/{linkId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    // 기본 거부
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 권한 요약

| 컬렉션 | 읽기 | 쓰기 | 비고 |
|--------|------|------|------|
| `users/{uid}` | 본인만 | 본인만 | |
| `users/{uid}/testSessions` | 본인만 | 본인만 | |
| `users/{uid}/testResults` | 본인만 | 본인만 | |
| `users/{uid}/records` | 본인만 | 본인만 | |
| `curriculumSources` | 인증 사용자 | 불가 | 읽기 전용 |
| `fieldSubjectGuides` | 인증 사용자 | 불가 | 읽기 전용 |
| `majors` | 인증 사용자 | 불가 | 읽기 전용 |
| `subjects` | 인증 사용자 | 불가 | 읽기 전용 |
| `majorSubjectLinks` | 인증 사용자 | 불가 | 읽기 전용 |
| 기타 | 불가 | 불가 | 기본 거부 |

---

## 6. 복합 인덱스

### 현재 코드에서 필요한 인덱스

| 컬렉션 | 필드 | 용도 |
|--------|------|------|
| `users/{uid}/testSessions` | `status ASC` + `updatedAt DESC` | 진행 중 세션 목록 |
| `users/{uid}/testSessions` | `testTypeId ASC` + `status ASC` | 세션 중복 확인 |
| `users/{uid}/testResults` | `testTypeId ASC` + `completedAt DESC` | 유형별 결과 조회 |

### 명세서에서 추가로 정의된 인덱스

| 컬렉션 | 필드 | 용도 |
|--------|------|------|
| `users/{uid}/records` | `category ASC` + `semester ASC` + `createdAt DESC` | 기록 필터링 |
| `users/{uid}/records` | `semester ASC` + `updatedAt DESC` | 기록 최신순 |
| `majors` | `field ASC` + `name ASC` | 학과 검색 |
| `subjects` | `subjectGroup ASC` + `selectionType ASC` + `name ASC` | 과목 검색 |
| `majorSubjectLinks` | `majorId ASC` + `selectionBucket ASC` + `recommendationStrength ASC` | 학과별 추천 과목 조회 |

---

## 7. 데이터 흐름

### 7.1 회원가입/프로필 초기화

```
클라이언트 → POST /api/users/init
           → verifyBearerToken()
           → upsertUserProfile(uid, input)
              → transaction: users/{uid} set 또는 merge
           ← { success: true, data: UserProfile }
```

### 7.2 검사 진행 (임시저장 포함)

```
1. 문항 로드
   GET /api/career-net/questions?testTypeId=aptitude
   → getUserProfile(uid) → schoolLevel로 대상코드 결정
   → fetchQuestions() → 커리어넷 API 호출
   ← 정규화된 문항 목록

2. 임시저장 (자동/수동)
   PUT /api/career-net/sessions
   → upsertTestSession(uid, { testTypeId, answers, currentIndex, ... })
      → users/{uid}/testSessions/{sessionId} 생성 또는 갱신
   ← 세션 ID

3. 이어하기
   GET /api/career-net/sessions → 진행 중 세션 목록
   GET /api/career-net/sessions/{sessionId} → 세션 상세 + answers 복원

4. 제출
   POST /api/career-net/report
   → getTestSession() → 답변 확인
   → getUserProfile() → 성별/학년 조회
   → submitReport() → 커리어넷 API 제출
   → saveTestResult() → users/{uid}/testResults/{resultId} 저장
   → markSessionSubmitted() → 세션 status를 'submitted'로 변경
   ← 결과 ID + URL
```

### 7.3 결과 조회

```
GET /api/career-net/results
→ listTestResults(uid, testTypeId?) → completedAt DESC, limit 20

GET /api/career-net/results/{resultId}
→ getTestResult(uid, resultId)
→ reportDetail 없으면 → fetchReportDetail() → 비동기 update
← 결과 상세
```

---

## 8. 구현 패턴

### 8.1 트랜잭션 (users 프로필)

신규 생성과 업데이트를 하나의 트랜잭션으로 처리하여 동시성 문제를 방지한다.

```typescript
await adminDb.runTransaction(async (tx) => {
  const snap = await tx.get(userRef);
  if (!snap.exists) {
    tx.set(userRef, { ...data, createdAt: FieldValue.serverTimestamp() });
  } else {
    tx.set(userRef, { ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
});
```

### 8.2 세션 Upsert (testSessions)

검사 유형별 `in_progress` 세션이 이미 있으면 업데이트, 없으면 신규 생성한다. 트랜잭션으로 감싸서 race condition을 방지한다.

```typescript
return await db.runTransaction(async (tx) => {
  const existing = await tx.get(
    sessionsRef
      .where('testTypeId', '==', data.testTypeId)
      .where('status', '==', 'in_progress')
      .limit(1)
  );
  // 기존 세션 있으면 update, 없으면 set
});
```

### 8.3 비동기 백그라운드 업데이트 (reportDetail)

API 응답은 즉시 반환하고, `reportDetail`은 백그라운드에서 Firestore에 저장한다. `reportDetailFetching` 플래그로 동시 요청 시 중복 fetch를 방지한다.

```typescript
// fetch 시작 전 플래그 설정
await docRef.update({ reportDetailFetching: true });
// fetch 완료 후 결과 저장 + 플래그 해제
docRef.update({ reportDetail, reportDetailFetching: FieldValue.delete() });
```

### 8.4 서버 타임스탬프

모든 문서의 `createdAt`, `updatedAt`은 `FieldValue.serverTimestamp()`를 사용한다. `startDtm`은 커리어넷 API 제출용 epoch ms, `startedAt`은 내부 기록용 서버 타임스탬프로 둘 다 저장한다.

---

## 9. 명세서 vs 구현 차이점

| 항목 | 명세서 | 실제 구현 | 비고 |
|------|--------|----------|------|
| testSession 시작 시각 | `startedAt: Timestamp` | `startDtm` + `startedAt` 둘 다 저장 | 해결됨 |
| testSessions 보안규칙 | (미언급) | firestore.rules에 명시 | 해결됨 |
| testResult.testType | `string` | `CareerTestTypeId` (union type) | 코드가 더 엄격 |
| subscriptions 컬렉션 | 정의됨 | 미구현 | Phase 4 |
| payments 컬렉션 | 정의됨 | 미구현 | Phase 4 |
| aiUsageLogs 컬렉션 | 정의됨 | 미구현 | Phase 4 |
| records 컬렉션 | 정의됨 | 미구현 | Phase 3 |
| curriculumSources / fieldSubjectGuides / majors / subjects / majorSubjectLinks | 정의됨 | 미구현 | Phase 3 |

---

## 10. Firestore 개발 규칙 (재발 방지)

새로운 컬렉션이나 서브컬렉션을 추가할 때 반드시 아래 체크리스트를 따른다.

### 10.1 서브컬렉션 추가 시 체크리스트

1. **보안 규칙**: `firestore.rules`에 해당 서브컬렉션의 `match` 규칙을 반드시 명시한다. 상위 규칙 상속에 의존하지 않는다.
2. **복합 인덱스**: 쿼리에 `where()` + `orderBy()` 조합이 있으면 `firestore.indexes.json`에 인덱스를 추가한다.
3. **타입 정의**: `src/types/` 또는 `src/lib/*/types.ts`에 해당 문서의 interface를 정의한다.
4. **스키마 문서**: 이 문서(`docs/firestore-schema-v1.0.md`)에 컬렉션 스키마를 기록한다.

### 10.2 Firestore 쓰기 규칙

1. **타임스탬프**: 모든 문서에 `createdAt`, `updatedAt`을 `FieldValue.serverTimestamp()`로 기록한다.
2. **외부 API용 시간값**: 외부 API가 특정 포맷(epoch ms 등)을 요구하면, 해당 포맷 필드와 서버 타임스탬프 필드를 둘 다 저장한다.
3. **트랜잭션**: 조회 후 조건부 생성/업데이트(upsert) 패턴은 반드시 `runTransaction()`으로 감싸서 race condition을 방지한다.

### 10.3 비동기 업데이트 규칙

1. **중복 방지 플래그**: 비동기 백그라운드 fetch/update가 있으면, `{fieldName}Fetching` boolean 플래그를 설정하여 동시 요청 시 중복 처리를 방지한다.
2. **플래그 정리**: fetch 성공/실패 모두에서 `FieldValue.delete()`로 플래그를 해제한다.
3. **silent catch**: 비동기 업데이트의 `.catch()`는 응답에 영향을 주지 않지만, 로깅은 고려한다.
