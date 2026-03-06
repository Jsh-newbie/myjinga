# Myjinga 모바일 앱 전환 가이드라인 v1.0

> 작성일: 2026-03-06
> 목적: 현재 Next.js 웹앱을 Flutter 모바일 앱으로 전환할 때 필요한 아키텍처 점검 및 가이드라인

---

## 1. 현재 아키텍처 점검 결과

### 1.1 전체 구조 요약

| 항목 | 현황 | 모바일 전환 준비도 |
|------|------|-------------------|
| API 구조 | REST API 9개, 통일 응답 형식 | 양호 |
| 클라이언트-서버 분리 | Server Action 미사용, HTTP API 기반 | 양호 |
| 인증 | Firebase Auth, Bearer Token 패턴 | 양호 |
| 데이터 접근 | 모두 API 경유 (클라이언트 직접 Firestore 접근 없음) | 양호 |
| API 클라이언트 레이어 | 없음 (fetch 직접 호출) | 개선 필요 |
| 상태 관리 | 라이브러리 없음, 로컬 state만 사용 | 보통 |
| 스타일링 | 순수 CSS, 모바일 우선 설계 | 재작성 필요 |
| 의존성 | 최소 7개 (범용 위주) | 양호 |

### 1.2 API 엔드포인트 현황

```
GET    /api/users/me                         사용자 프로필 조회
POST   /api/users/init                       회원가입 후 프로필 초기화
GET    /api/career-net/questions?testTypeId=  검사 문항 조회
GET    /api/career-net/sessions              진행 중 세션 목록
PUT    /api/career-net/sessions              세션 임시저장
GET    /api/career-net/sessions/[sessionId]  세션 상세
GET    /api/career-net/results               완료 결과 목록
GET    /api/career-net/results/[testId]      결과 상세
POST   /api/career-net/report                검사 제출
```

- 모든 엔드포인트: `Authorization: Bearer <Firebase ID Token>` 인증 필수
- 응답 형식: `{ success: boolean, data: T | null, error: ApiError | null }`

### 1.3 발견된 문제점

| 우선순위 | 문제 | 영향 |
|----------|------|------|
| 높음 | API 클라이언트 레이어 없음 | 웹/모바일 양쪽에서 중복 코드 발생 |
| 높음 | 하드코딩된 사용자 정보 (schoolLevel, gender, name) | API 정확도 저하 |
| 중간 | 에러 처리 비일관 (try-catch vs response.ok 혼용) | 디버깅 어려움 |
| 중간 | 캐싱/오프라인 전략 없음 | 모바일 UX 저하 |
| 낮음 | 결과 페이지 미구현 | 기능 미완성 |

---

## 2. 모바일 전환을 위한 개발 원칙

### 2.1 API-First 원칙

모든 비즈니스 로직은 서버 API를 통해서만 접근한다. 클라이언트(웹/모바일)는 순수 프레젠테이션 레이어로 유지한다.

```
[웹 클라이언트 (Next.js)]  ──┐
                              ├── HTTP API ──> [Next.js API Routes] ──> [Firestore]
[모바일 클라이언트 (Flutter)] ──┘                                    ──> [커리어넷 API]
```

**규칙:**
- 클라이언트에서 Firestore 직접 접근 금지 (현재 준수 중)
- 외부 API(커리어넷, OpenAI, 토스)는 반드시 서버 경유 (현재 준수 중)
- Server Action 사용 금지 (Next.js 전용이므로 모바일에서 호출 불가)

### 2.2 API 클라이언트 레이어 도입

현재 모든 컴포넌트에서 `fetch()`를 직접 호출하고 있으므로, 공통 API 클라이언트를 도입한다.

**위치:** `src/lib/api/client.ts`

```typescript
// API 클라이언트 인터페이스 (플랫폼 독립적)
interface MyjingaApiClient {
  // Users
  getMe(): Promise<ApiResponse<UserProfile>>;
  initUser(data: InitUserRequest): Promise<ApiResponse<UserProfile>>;

  // Career Test - Questions
  getQuestions(testTypeId: string): Promise<ApiResponse<NormalizedQuestionnaire>>;

  // Career Test - Sessions
  listSessions(): Promise<ApiResponse<{ sessions: SessionItem[] }>>;
  getSession(sessionId: string): Promise<ApiResponse<TestSessionWithId>>;
  saveSession(data: SessionSaveRequest): Promise<ApiResponse<{ sessionId: string; savedAt: string }>>;

  // Career Test - Results
  listResults(testTypeId?: string): Promise<ApiResponse<{ items: TestResultWithId[] }>>;
  getResult(resultId: string): Promise<ApiResponse<{ item: TestResultWithId }>>;
  submitTest(sessionId: string): Promise<ApiResponse<{ resultId: string; resultUrl: string }>>;
}
```

**웹 구현:** HTTP fetch 기반
**Flutter 구현:** Dio/http 패키지 기반, 동일 인터페이스

### 2.3 인증 흐름 통일

```
[웹]     Firebase JS SDK  → getIdToken() → Bearer Header → API Route → Admin SDK 검증
[Flutter] Firebase Flutter SDK → getIdToken() → Bearer Header → API Route → Admin SDK 검증
```

**핵심:** 서버는 항상 Bearer Token만 검증하므로, 클라이언트가 어떤 플랫폼이든 동일하게 동작한다.

**Flutter 측 고려사항:**
- `firebase_auth` 패키지 사용
- 토큰 자동 갱신은 Firebase SDK가 처리
- SecureStorage에 refresh token 저장 (Firebase SDK 내부 처리)

### 2.4 데이터 관리 원칙

| 원칙 | 설명 |
|------|------|
| 단일 진실 공급원 | 서버 API 응답이 유일한 데이터 소스 |
| 캐싱 | 문항 데이터 등 변경 빈도 낮은 데이터는 로컬 캐시 허용 |
| 오프라인 | 검사 진행 중 답변은 로컬에 임시 저장, 네트워크 복구 시 동기화 |
| 상태 관리 | 웹: React Query 또는 SWR 도입 권장 / Flutter: Riverpod 또는 Bloc |

---

## 3. 코드 분리 전략

### 3.1 재사용 가능한 코드 (서버 측)

현재 `src/lib/` 아래의 서버 로직은 Next.js API Routes에서만 실행되므로 모바일 전환과 무관하게 그대로 유지한다.

```
src/lib/
  api/response.ts          # API 응답 헬퍼 (서버 전용) - 유지
  firebase/admin.ts         # Admin SDK (서버 전용) - 유지
  firebase/server-auth.ts   # 토큰 검증 (서버 전용) - 유지
  careernet/client.ts       # 커리어넷 API 호출 (서버 전용) - 유지
  careernet/repository.ts   # Firestore CRUD (서버 전용) - 유지
  careernet/normalize.ts    # 데이터 정규화 (서버 전용) - 유지
  careernet/answer-format.ts # 답변 형식 변환 (서버 전용) - 유지
  users/repository.ts       # 사용자 CRUD (서버 전용) - 유지
```

### 3.2 플랫폼별 구현이 필요한 코드

| 영역 | 웹 (Next.js) | 모바일 (Flutter) |
|------|-------------|-----------------|
| UI 컴포넌트 | React + CSS | Flutter Widget |
| 라우팅 | App Router | GoRouter / Navigator |
| 인증 SDK | firebase (JS) | firebase_auth (Dart) |
| HTTP 클라이언트 | fetch API | Dio / http |
| 로컬 저장소 | localStorage | SharedPreferences / Hive |
| 상태 관리 | useState / React Query | Riverpod / Bloc |

### 3.3 공유 가능한 스키마/타입

`src/types/` 아래의 타입 정의는 Flutter Dart 클래스로 1:1 변환 가능하다.

```typescript
// TypeScript (현재)
interface UserProfile {
  name: string;
  email: string;
  birthDate: string;
  schoolLevel: 'middle' | 'high';
  grade: 1 | 2 | 3;
}

// Dart (Flutter 전환 시)
class UserProfile {
  final String name;
  final String email;
  final String birthDate;
  final String schoolLevel; // 'middle' | 'high'
  final int grade;
}
```

**권장:** API 응답 스키마를 OpenAPI/Swagger로 문서화하면 Dart 모델을 자동 생성할 수 있다.

---

## 4. Flutter 전환 시 구체적 고려사항

### 4.1 백엔드 배포 분리

현재 Next.js가 프론트엔드 + API를 모두 서빙한다. Flutter 앱이 추가되면:

**옵션 A (권장 - 단기):** Next.js API Routes 유지, Flutter에서 동일 엔드포인트 호출
```
Flutter App → https://myjinga.web.app/api/* → Next.js API Routes
```

**옵션 B (장기):** API를 독립 서버로 분리 (Express/Fastify/NestJS)
```
Next.js Web  → https://api.myjinga.com/*
Flutter App  → https://api.myjinga.com/*
```

**당분간 옵션 A가 효율적이다.** API Routes의 로직이 단순하고, Firebase App Hosting에서 이미 서빙 중이므로 별도 서버 없이 진행 가능하다.

### 4.2 CORS 설정

Flutter 앱에서 Next.js API를 호출하려면 CORS 설정이 필요하다.

```typescript
// next.config.mjs에 추가
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' }, // 운영시 도메인 제한
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
      ],
    },
  ];
}
```

### 4.3 Firebase 프로젝트 설정

Flutter 앱 추가 시 Firebase 프로젝트에서:
1. Android 앱 등록 (`com.myjinga.app`)
2. iOS 앱 등록 (`com.myjinga.app`)
3. `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) 다운로드
4. SHA-1 인증서 등록 (Android)

### 4.4 푸시 알림 (향후)

웹에는 없지만 모바일에서 필요할 기능:
- FCM (Firebase Cloud Messaging) 토큰 관리
- 서버에 디바이스 토큰 등록 API 추가 필요
- Firestore `users/{uid}` 문서에 `fcmTokens` 필드 추가

### 4.5 딥링크 / 유니버설 링크

검사 결과 공유 등을 위해 딥링크 설정 필요:
```
myjinga://career-test/result/{resultId}
https://myjinga.web.app/career-test/result/{resultId}
```

---

## 5. 즉시 실행해야 할 개선 사항

모바일 전환과 무관하게 현재 웹앱 품질을 높이면서, 동시에 모바일 준비도를 높이는 작업들이다.

### 5.1 API 클라이언트 레이어 생성 (우선순위: 높음)

**파일:** `src/lib/api/client.ts`

모든 fetch 호출을 하나의 클라이언트로 통합한다. 토큰 주입, 에러 처리, 타입 안전성을 보장한다.

### 5.2 하드코딩 제거 (우선순위: 높음)

현재 API Route에 하드코딩된 값들을 사용자 프로필에서 동적으로 가져온다:
- `schoolLevel` → `users/{uid}.schoolLevel`
- `name`, `gender`, `grade` → `users/{uid}` 프로필

### 5.3 에러 처리 표준화 (우선순위: 중간)

모든 API 호출에서 일관된 에러 처리 패턴을 사용한다:
```typescript
const result = await apiClient.getMe();
if (!result.success) {
  // 에러 코드별 분기 처리
  handleApiError(result.error);
  return;
}
// result.data 사용
```

### 5.4 API 문서화 (우선순위: 중간)

OpenAPI/Swagger 스펙으로 API를 문서화한다. Flutter 전환 시 Dart 모델 자동 생성에 활용한다.

### 5.5 환경 변수 정리 (우선순위: 낮음)

API base URL을 환경 변수로 분리한다:
```
# 웹 (현재: 상대 경로 사용 중)
NEXT_PUBLIC_API_BASE_URL=/api

# Flutter (절대 경로 필요)
API_BASE_URL=https://myjinga.web.app/api
```

---

## 6. 향후 개발 시 준수 사항

### 6.1 새 API 추가 시

- [ ] REST 표준 준수 (GET 조회, POST 생성, PUT 수정, DELETE 삭제)
- [ ] `ok()`/`fail()` 헬퍼로 통일 응답 형식 사용
- [ ] zod 스키마로 입력 검증
- [ ] Bearer Token 인증 적용
- [ ] API 클라이언트 레이어에 메서드 추가
- [ ] 타입 정의 (`src/types/`)에 요청/응답 타입 추가

### 6.2 새 페이지/화면 추가 시

- [ ] 비즈니스 로직은 API 클라이언트 메서드로 분리
- [ ] UI 컴포넌트는 데이터 fetch 로직과 분리 (Container/Presenter 패턴)
- [ ] Server Action 사용 금지
- [ ] Next.js 전용 기능(Image, Link 등) 사용 시 래퍼 컴포넌트 고려

### 6.3 Firestore 스키마 변경 시

- [ ] `docs/myjinga-development-spec-v1.1.md`에 스키마 변경 반영
- [ ] 하위 호환성 고려 (기존 문서 마이그레이션 전략)
- [ ] `createdAt`/`updatedAt` 필수 포함
- [ ] 필드명 camelCase 유지

### 6.4 금지 사항

- Server Action (`'use server'`) 사용 금지
- 클라이언트에서 Firestore 직접 접근 금지
- 클라이언트에서 외부 API 직접 호출 금지
- Next.js `getServerSideProps`/`getStaticProps` 사용 금지 (App Router 패턴 유지)
- API Route에서 Next.js 전용 기능 의존 최소화 (추후 분리 용이성)

---

## 7. 마이그레이션 로드맵

```
Phase 0: 현재 (웹앱 개발 중)
  ├── API 클라이언트 레이어 도입
  ├── 하드코딩 제거
  ├── 에러 처리 표준화
  └── 웹앱 기능 완성

Phase 1: API 안정화
  ├── API 문서화 (OpenAPI)
  ├── API 버저닝 고려 (/api/v1/*)
  ├── Rate limiting 추가
  └── E2E 테스트

Phase 2: Flutter 앱 개발
  ├── Firebase 프로젝트에 Android/iOS 앱 등록
  ├── Dart 모델 생성 (OpenAPI 기반)
  ├── API 클라이언트 구현 (Dio)
  ├── 인증 플로우 구현
  ├── 화면 구현 (기존 웹 UI 참고)
  └── CORS 설정

Phase 3: 모바일 전용 기능
  ├── 푸시 알림 (FCM)
  ├── 오프라인 모드
  ├── 딥링크
  └── 앱스토어 배포
```

---

## 부록: 현재 프로젝트 파일 구조

```
src/
├── app/
│   ├── (marketing)/page.tsx          # 랜딩
│   ├── (auth)/auth/
│   │   ├── signin/page.tsx           # 로그인
│   │   └── signup/page.tsx           # 회원가입
│   ├── api/
│   │   ├── users/me/route.ts         # 프로필 조회
│   │   ├── users/init/route.ts       # 프로필 초기화
│   │   └── career-net/
│   │       ├── questions/route.ts    # 문항 조회
│   │       ├── sessions/route.ts     # 세션 목록/저장
│   │       ├── sessions/[sessionId]/route.ts
│   │       ├── results/route.ts      # 결과 목록
│   │       ├── results/[testId]/route.ts
│   │       └── report/route.ts       # 검사 제출
│   ├── career-test/
│   │   ├── page.tsx                  # 검사 선택
│   │   ├── [testTypeId]/page.tsx     # 검사 진행
│   │   └── result/[resultId]/page.tsx # 결과 보기
│   ├── dashboard/page.tsx            # 대시보드
│   ├── layout.tsx                    # 루트 레이아웃
│   └── globals.css                   # 전역 스타일
├── lib/
│   ├── api/response.ts               # 응답 헬퍼
│   ├── firebase/admin.ts             # Admin SDK
│   ├── firebase/client.ts            # Client SDK
│   ├── firebase/server-auth.ts       # 토큰 검증
│   ├── auth/error-message.ts         # 에러 매핑
│   ├── users/repository.ts           # 사용자 CRUD
│   └── careernet/
│       ├── client.ts                 # 커리어넷 API
│       ├── types.ts                  # 타입 정의
│       ├── constants.ts              # 상수
│       ├── repository.ts             # Firestore CRUD
│       ├── normalize.ts              # 데이터 정규화
│       ├── answer-format.ts          # 답변 형식
│       └── report-scraper.ts         # 보고서 스크래핑
├── types/
│   ├── api.ts                        # API 타입
│   └── user.ts                       # 사용자 타입
└── components/
    └── auth/auth-shell.tsx           # 인증 셸
```
