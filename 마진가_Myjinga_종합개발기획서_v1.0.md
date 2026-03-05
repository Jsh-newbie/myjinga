# 마진가(Myjinga) 종합 개발 기획서

**마이 진로 가이드 — 학생 진로 탐색 및 학생부 종합 관리 플랫폼**

**문서 버전:** v1.0  
**작성일:** 2026년 3월 4일  
**상태:** 기획 확정 → 개발 착수 단계

---

## 1. 프로젝트 개요

### 1.1 서비스 정의

마진가(Myjinga)는 중·고등학생을 대상으로 진로 탐색부터 학생부 관리까지 원스톱으로 지원하는 웹앱 서비스이다. 커리어넷 진로심리검사 연동을 통해 학생이 자신의 적성과 흥미를 파악하고, 검사 결과에 기반한 진로/직업/학과 탐색, 고교학점제 하의 선택과목 추천, 학생부 전 항목 기록 및 AI 기반 작성 보조까지 제공한다.

### 1.2 서비스 목적

- 학생이 자기주도적으로 진로를 탐색하고 설계할 수 있도록 지원
- 고교학점제 시대에 맞는 선택과목 가이드 제공
- 학생부 활동을 진로와 연결지어 체계적으로 기록·관리
- AI를 활용한 학생부 작성 보조로 활동 기록의 질 향상

### 1.3 대상 사용자

| 구분 | 대상 | 비고 |
|------|------|------|
| 1차 (MVP) | 중학생, 고등학생 | 핵심 타겟 |
| 2차 (확장) | 학부모 | 자녀 진로 현황 열람 |
| 3차 (확장) | 교사 (담임/진로상담) | 학생 관리 대시보드 |

### 1.4 수익 모델

**프리미엄(Freemium) 구독 모델**

| 구분 | 무료 | 유료 (월 9,900원) |
|------|------|------|
| 회원가입/로그인 | O | O |
| 커리어넷 심리검사 | O | O |
| 검사 결과 확인 | O | O |
| 진로/직업/학과 탐색 | O | O |
| 학생부 활동 기록 저장 | O | O |
| 선택과목 추천 가이드 | 기본 | 심화 (진로별 맞춤) |
| AI 활동 가이드 | X | O |
| AI 세특 작성 보조 | X | O |
| AI 과목 선택 컨설팅 | X | O |
| 학생부 통계/분석 | X | O |

---

## 2. 기술 스택

### 2.1 확정 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| 프론트엔드 (웹) | Next.js 14+ (App Router) | 기존 경험 보유, SSR/SEO 지원, Vercel 배포 용이 |
| 프론트엔드 (앱, 추후) | Flutter | 기존 경험 보유, iOS/Android 동시 개발 |
| 인증 | Firebase Authentication | 이메일/비밀번호 + 소셜 로그인(Google, Kakao, Naver) 지원 |
| 데이터베이스 | Cloud Firestore | Firebase 경험 보유, 실시간 동기화, 빠른 개발 |
| 스토리지 | Firebase Storage | 프로필 이미지, 활동 증빙 파일 저장 |
| 호스팅/배포 | Vercel | Next.js 최적화, 무료 티어, 자동 배포 |
| 서버리스 함수 | Firebase Cloud Functions 또는 Vercel Serverless Functions | 커리어넷 API 프록시, AI API 호출 |
| 외부 API | 커리어넷 Open API | 심리검사 문항 제공 + 결과 조회 |
| AI API | 별도 비교 후 결정 (아래 2.2 참고) | 가이드/작성 보조 기능 |
| 결제 | PG사 연동 (아래 2.3 참고) | 월 구독 결제 |

### 2.2 AI API 비교 및 추천

| 항목 | OpenAI (GPT-4o) | Anthropic (Claude Sonnet) |
|------|------|------|
| 한국어 품질 | 우수 | 우수 |
| 입력 토큰 비용 | $2.50 / 1M tokens | $3.00 / 1M tokens |
| 출력 토큰 비용 | $10.00 / 1M tokens | $15.00 / 1M tokens |
| 컨텍스트 윈도우 | 128K | 200K |
| 교육 콘텐츠 적합성 | 높음 | 높음 (장문 분석에 강점) |
| SDK 지원 | Node.js SDK 성숙 | Node.js SDK 안정 |

**추천:** 초기에는 OpenAI GPT-4o-mini를 사용하여 비용을 최소화하고(입력 $0.15, 출력 $0.60 / 1M tokens), 품질 검증 후 필요시 GPT-4o 또는 Claude로 업그레이드하는 전략을 권장한다. 학생부 작성 보조는 장문 생성이 핵심이므로 비용 대비 품질을 지속 모니터링해야 한다.

### 2.3 PG사 비교 및 추천

| 항목 | 토스페이먼츠 | 포트원(구 아임포트) |
|------|------|------|
| 연동 난이도 | 낮음 (REST API 중심) | 낮음 (통합 SDK) |
| 정기결제 지원 | O (빌링키 방식) | O (다수 PG 통합) |
| 수수료 | 카드 3.3% + VAT | PG사별 상이 (보통 3.3~3.5%) |
| 문서화 | 매우 우수 | 우수 |
| Next.js 연동 | 공식 가이드 있음 | 공식 가이드 있음 |
| 개인 사업자 | 가능 | 가능 |

**추천:** 토스페이먼츠를 1순위로 추천한다. API 문서가 명확하고, 정기결제(빌링) 구현이 간편하며, Next.js 연동 가이드가 공식 제공된다. 혼자 개발하는 환경에서 연동 시간을 최소화할 수 있다.

**사전 요건:** PG사 연동을 위해서는 사업자등록이 필요하다. 아직 사업자등록이 되어 있지 않다면, 개발과 병행하여 사업자등록을 진행해야 한다.

---

## 3. 핵심 사용자 흐름 (User Flow)

### 3.1 전체 서비스 흐름

```
[회원가입] → [기본 정보 입력] → [진로 심리검사] → [검사 결과 확인]
    ↓
[추천 진로/직업 탐색] → [관련 학과 탐색] → [선택과목 추천 확인]
    ↓
[학생부 활동 기록 시작] → [주기적 알림으로 기록 유도]
    ↓
[유료 전환 시] → [AI 가이드] → [AI 작성 보조]
```

### 3.2 회원가입 흐름

```
[시작] → [이메일/비밀번호 입력]
  ↓
[생년월일 확인] → 만 14세 미만? → [법정대리인 동의 절차]
  ↓                                    ↓
[기본 정보 입력]  ←←←←←←←←←←←  [부모 이메일 인증]
  ↓
[학교급 선택: 중학교/고등학교]
[학년 선택]
[학교명 입력 (선택)]
[관심 분야 선택 (선택)]
  ↓
[가입 완료 → 진로 검사 안내]
```

**만 14세 미만 개인정보보호 처리:**

한국 개인정보보호법(제22조의2)에 따라 만 14세 미만 아동의 개인정보 수집 시 법정대리인의 동의가 필수이다. 처리 방안은 다음과 같다.

1. 회원가입 시 생년월일 입력을 통해 만 14세 미만 여부 판별
2. 만 14세 미만인 경우 법정대리인(부모) 이메일 입력 요청
3. 법정대리인 이메일로 동의 요청 메일 발송
4. 법정대리인이 동의 링크 클릭 시 가입 완료 처리
5. 동의 기록을 Firestore에 저장하여 감사 추적 가능하게 관리

### 3.3 커리어넷 심리검사 흐름

```
[검사 선택 화면] → [검사 종류 선택 (5종 중 택1)]
  ↓
[검사 안내 페이지] → [검사 시작]
  ↓
[문항 응답 UI] → [커리어넷 API: 문항 요청]
  ↓                     ↓
[학생이 문항에 답변]   [문항 데이터 수신]
  ↓
[모든 문항 완료] → [답변 데이터 POST → 커리어넷 API: 결과 요청]
  ↓
[결과 URL 수신] → [결과 파싱 또는 WebView 표시]
  ↓
[결과를 Firestore에 저장] → [추천 진로/직업 표시]
```

**커리어넷 API 연동 상세:**

- 문항 요청 엔드포인트: `GET /inspct/openapi/test/questions?apikey={KEY}&q={검사변수}`
- 결과 요청 엔드포인트: `POST /inspct/openapi/test/report`
- 결과 응답에 포함되는 URL을 통해 상세 결과 페이지 접근 가능
- API 호출은 보안을 위해 서버사이드(Cloud Functions 또는 Vercel API Routes)에서 처리
- API 키가 클라이언트에 노출되지 않도록 반드시 서버 프록시를 통해 호출

**검사 UI 설계 원칙:**

- 5종 검사 모두 "질문 + 선택지" 형태이므로 하나의 공통 검사 UI 컴포넌트로 구현
- 검사 종류에 따라 문항 데이터만 교체하는 방식
- 진행률 표시 (프로그레스바)
- 중간 저장 기능 (검사 도중 이탈 시 이어서 진행 가능)
- 모바일 환경을 고려한 터치 최적화 UI

**제공 검사 5종:**

| 검사명 | 검사 변수 | 대상 | 설명 |
|--------|-----------|------|------|
| 직업흥미검사(H) | 추후 확인 | 중·고 | 흥미 유형 파악, 진로 탐색 시작점 |
| 직업흥미검사(K) | 추후 확인 | 중·고 | Holland 이론 기반 흥미 유형 |
| 직업적성검사 | 추후 확인 | 중·고 | 잠재 능력 영역 파악 |
| 직업가치관검사 | 추후 확인 | 중·고 | 직업 선택 시 중요 가치 파악 |
| 진로성숙도검사 | 추후 확인 | 중·고 | 진로 준비 상태 점검 |

(검사 변수는 API 키 발급 후 확인하여 업데이트)

### 3.4 진로/직업/학과 탐색 흐름

```
[검사 결과] → [추천 직업 목록]
  ↓
[직업 선택] → [직업 상세 정보]
  ↓
[관련 학과 목록] → [학과 상세 정보]
  ↓              ├ 학과 설명
  ↓              ├ 주요 전공 교과목
  ↓              ├ 권장 선택 과목 (일반/진로/융합)
  ↓              └ "이런 학생에게 추천"
  ↓
[선택과목 추천 확인] → [나의 선택과목 계획 저장]
```

**데이터 연결 구조:**

커리어넷 검사 결과(추천 직업) → 직업-학과 매핑 데이터 → 선택과목 안내서 DB (학과별 권장 과목)

이 연결을 위해 직업과 학과 간 매핑 테이블이 필요하며, 커리어넷 API의 직업 코드와 선택과목 안내서의 학과 데이터를 연결하는 중간 매핑 데이터를 구축해야 한다.

### 3.5 학생부 활동 기록 흐름

```
[학생부 대시보드] → [항목 선택]
  ↓
[항목별 입력 폼] → [내용 작성]
  ↓
[저장] → [Firestore에 기록]
  ↓
[주기적 알림] → [기록 유도]
```

---

## 4. 데이터베이스 설계 (Firestore)

### 4.1 컬렉션 구조

Firestore는 NoSQL이므로 관계형 DB와 달리 데이터를 중복 저장하거나 서브컬렉션으로 구조화하는 것이 일반적이다. 아래는 핵심 컬렉션 설계이다.

**users (사용자)**

```
users/{userId}
├ email: string
├ name: string
├ birthDate: timestamp
├ isMinor: boolean (만 14세 미만 여부)
├ parentConsent: { parentEmail, consentDate, consentStatus }
├ schoolLevel: "middle" | "high"
├ grade: number (1, 2, 3)
├ schoolName: string (선택)
├ interests: string[] (관심 분야)
├ subscription: { plan: "free"|"premium", startDate, endDate, status }
├ createdAt: timestamp
├ updatedAt: timestamp
│
├ /testResults (서브컬렉션: 검사 결과)
│  └ {testId}
│    ├ testType: string (직업흥미, 직업적성, 가치관, 성숙도)
│    ├ answers: string (응답 데이터)
│    ├ resultUrl: string (커리어넷 결과 URL)
│    ├ recommendedJobs: string[] (추천 직업)
│    ├ completedAt: timestamp
│
├ /careerPlan (서브컬렉션: 진로 계획)
│  └ {planId}
│    ├ targetCareer: string (희망 진로)
│    ├ targetMajor: string (희망 학과)
│    ├ selectedSubjects: object[] (선택 과목 계획)
│    ├ createdAt: timestamp
│
├ /records (서브컬렉션: 학생부 기록)
│  └ {recordId}
│    ├ category: string (세특, 창체_자율, 창체_동아리, 창체_봉사, 창체_진로, 독서, 행특 등)
│    ├ semester: string ("2026-1")
│    ├ title: string
│    ├ content: string (활동 내용)
│    ├ careerRelevance: string (진로 연관성 메모)
│    ├ subject: string (세특인 경우 과목명)
│    ├ hours: number (봉사인 경우 시간)
│    ├ attachments: string[] (첨부 파일 URL)
│    ├ aiDraft: string (AI 작성 보조 결과, 유료)
│    ├ createdAt: timestamp
│    ├ updatedAt: timestamp
```

**subjects (선택과목 데이터 — PDF에서 추출)**

```
subjects/{subjectId}
├ name: string (과목명)
├ category: string (교과군: 국어, 수학, 영어, 사회, 과학 등)
├ type: string (일반선택, 진로선택, 융합선택)
├ credits: string (학점 범위)
├ description: string (과목 설명)
├ evaluation: object (평가 정보: 절대평가 여부, 석차등급 여부 등)
├ suneung: boolean (수능 출제 여부)
├ prerequisites: string[] (선수 과목)
```

**majors (학과 데이터 — PDF에서 추출)**

```
majors/{majorId}
├ name: string (학과명)
├ field: string (계열: 인문, 사회, 자연, 공학, 보건의약, 교육, 예술체육)
├ description: string (학과 설명)
├ relatedMajors: string[] (관련 학과)
├ majorSubjects: object (전공 교과목: 기초, 심화)
├ recommendedSubjects: object
│  ├ general: string[] (일반 선택 권장 과목)
│  ├ career: string[] (진로 선택 권장 과목)
│  └ convergence: string[] (융합 선택 권장 과목)
├ targetStudents: string[] ("이런 학생에게 추천" 내용)
├ relatedJobs: string[] (관련 직업 — 커리어넷 직업 코드와 매핑)
```

**payments (결제 내역)**

```
payments/{paymentId}
├ userId: string
├ amount: number
├ plan: string
├ status: string (paid, cancelled, refunded)
├ pgProvider: string
├ pgTransactionId: string
├ billingKey: string (정기결제용)
├ paidAt: timestamp
├ nextPaymentDate: timestamp
```

### 4.2 Firestore 인덱스 설계

자주 사용되는 쿼리에 대한 복합 인덱스를 사전에 설계해야 한다.

| 컬렉션 | 인덱스 필드 | 용도 |
|--------|------------|------|
| users/{uid}/records | category + semester (ASC) | 항목별, 학기별 기록 조회 |
| users/{uid}/records | createdAt (DESC) | 최신 기록 조회 |
| users/{uid}/testResults | testType + completedAt (DESC) | 검사 유형별 최신 결과 |
| majors | field + name (ASC) | 계열별 학과 목록 |
| subjects | category + type (ASC) | 교과군별 선택과목 목록 |

### 4.3 Firestore 보안 규칙 (개요)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /testResults/{testId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /records/{recordId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /careerPlan/{planId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // 과목, 학과 데이터는 모든 인증 사용자가 읽기 가능
    match /subjects/{subjectId} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자만 (추후 Admin SDK 통해)
    }
    match /majors/{majorId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 5. 학생부 관리 기능 상세 설계

### 5.1 관리 항목 (2026학년도 기재요령 기준)

**중학교 학생부 항목:**

| 항목 | 앱 내 기록 기능 | 비고 |
|------|----------------|------|
| 출결상황 | 출결 기록 | 결석/지각/조퇴/결과 사유 기록 |
| 수상경력 | 교내상 기록 | 수상명, 등급, 일자 |
| 창의적 체험활동 - 자율활동 | 활동 내용 기록 | |
| 창의적 체험활동 - 동아리활동 | 정규/자율 동아리 기록 | 시간 포함 |
| 창의적 체험활동 - 봉사활동 | 봉사 실적 기록 | 장소, 시간, 내용 |
| 창의적 체험활동 - 진로활동 | 진로 활동 기록 | 진로 검사 결과 연동 |
| 교과학습발달상황 | 성적 + 세특 기록 | 과목별 |
| 독서활동 | 독서 기록 | 도서명, 감상, 진로 연관성 |
| 행동특성 및 종합의견 | 자기 평가 기록 | |

**고등학교 학생부 항목 (중학교 + 추가 항목):**

| 추가 항목 | 앱 내 기록 기능 | 비고 |
|-----------|----------------|------|
| 자격증 취득 | 자격증 기록 | 명칭, 취득일, 발급기관 |
| 교과학습발달상황 (고교학점제) | 학점 이수 관리 | 성취도 5단계, 석차등급 |

### 5.2 학생부 입력 폼 설계 원칙

1. 학교급(중/고)에 따라 입력 항목 자동 분기
2. 각 항목별 입력 가이드 제공 (기재요령 기반)
3. 진로와의 연관성을 기록할 수 있는 필드 포함
4. 학기별 정리 및 타임라인 뷰 제공
5. 주기적 알림으로 기록 유도 (푸시 알림 / 앱 내 알림)

### 5.3 알림 설계

| 알림 종류 | 주기 | 내용 |
|-----------|------|------|
| 정기 기록 알림 | 주 1회 (금요일) | "이번 주 활동을 기록해보세요" |
| 학기말 정리 알림 | 학기말 2주 전 | "학기 활동을 정리할 시간입니다" |
| 검사 권유 알림 | 미검사 항목 있을 시 월 1회 | "아직 하지 않은 검사가 있어요" |
| 독서 기록 알림 | 격주 | "최근 읽은 책을 기록해보세요" |

---

## 6. 선택과목 추천 가이드 설계

### 6.1 데이터 구조 (PDF 분석 결과)

2025학년도 2022 개정 교육과정 선택 과목 안내서(159페이지)에서 추출해야 하는 데이터는 크게 두 가지이다.

**A) 과목 정보 데이터 (Section II: 26~136페이지)**

총 10개 교과군에 걸쳐 각 선택과목의 상세 정보가 수록되어 있다.

- 국어, 수학, 영어, 사회(역사/도덕 포함), 과학, 체육, 예술, 기술·가정/정보, 제2외국어/한문, 교양
- 각 과목별: 과목명, 선택 유형(일반/진로/융합), 학점, 평가 정보, 수능 출제 여부, 과목 설명

**B) 학과별 권장 과목 데이터 (Section III: 158~305페이지)**

8개 분야에 걸쳐 각 학과의 상세 정보와 권장 선택 과목이 수록되어 있다.

- 인문 분야, 사회 분야, 자연 분야, 공학 분야, 보건·의약학 분야, 교육 분야, 예술·체육 분야, 자율전공 분야
- 각 학과별: 학과 설명, 관련 학과, 주요 전공 교과목, 권장 선택 과목(일반/진로/융합), "이런 학생에게 추천"

### 6.2 데이터베이스화 계획

PDF에서 데이터를 추출하여 Firestore에 적재하는 작업이 필요하다. 자동 추출 후 수동 검수 방식(병행)을 권장한다.

**추출 스크립트 제작:**

1. pdfplumber로 텍스트 추출
2. 정규식 및 구조 패턴으로 과목/학과 데이터 파싱
3. JSON 형태로 1차 추출
4. 수동 검수 및 교정
5. Firestore 업로드 스크립트로 적재

**추출 우선순위:**

1순위: 학과별 권장 과목 매핑 데이터 (추천 기능의 핵심)
2순위: 과목 상세 정보 데이터 (과목 탐색 기능)
3순위: 계열별 선택 과목 요약 데이터

### 6.3 추천 로직

```
[학생의 검사 결과 (추천 직업)] 
  → [직업-학과 매핑 테이블에서 관련 학과 조회]
  → [학과별 권장 선택 과목 데이터 조회]
  → [학생의 학교급/학년에 맞는 선택과목 필터링]
  → [추천 결과 표시]
```

무료 사용자: 학과별 권장 과목 목록만 표시
유료 사용자: AI 기반 맞춤 컨설팅 (학생의 현재 성적, 관심사, 학교 개설 과목 등을 고려한 개인화 추천)

---

## 7. AI 기능 상세 설계

### 7.1 AI 활동 가이드 (유료)

학생의 진로 목표와 현재 학생부 기록 상태를 분석하여 "앞으로 어떤 활동을 하면 좋을지" 가이드를 제공한다.

**입력 데이터:**
- 학생의 희망 진로/학과
- 현재까지의 학생부 기록 내역
- 학교급/학년

**출력:**
- 추천 활동 목록 (동아리, 봉사, 독서, 탐구 주제 등)
- 활동과 진로의 연관성 설명
- 학기별 활동 계획 제안

### 7.2 AI 세특 작성 보조 (유료)

학생이 선생님께 제출할 활동 내용 초안을 작성하는 것을 돕는다.

**입력 데이터:**
- 과목명
- 활동 내용 키워드 또는 메모
- 학생의 희망 진로
- 기재요령 가이드라인 (시스템 프롬프트에 포함)

**출력:**
- 세특에 기재 가능한 형태의 활동 내용 문장
- 2~3개의 대안 제시
- 진로와의 연관성이 드러나는 표현 포함

**주의사항:**
- AI가 생성한 내용은 "초안"이며, 학생이 반드시 수정/보완하도록 안내
- 허위 내용 생성 방지를 위한 가이드라인 표시
- 학생부 기재요령에 어긋나는 표현(특정 대학명, 기관명 등) 자동 필터링

### 7.3 AI 과목 선택 컨설팅 (유료)

학생의 진로 목표, 성적, 관심사를 종합적으로 분석하여 맞춤형 과목 선택 가이드를 제공한다.

### 7.4 AI API 호출 아키텍처

```
[클라이언트] → [Vercel API Route / Cloud Function]
                    ↓
              [사용자 인증 확인]
              [구독 상태 확인 (유료 여부)]
              [사용량 제한 확인]
                    ↓
              [프롬프트 구성 (시스템 프롬프트 + 사용자 데이터)]
                    ↓
              [AI API 호출 (OpenAI / Claude)]
                    ↓
              [응답 후처리 (필터링, 포맷팅)]
                    ↓
[클라이언트에 결과 반환]
```

AI API 키는 절대 클라이언트에 노출하지 않으며, 반드시 서버사이드에서 호출한다.

---

## 8. 결제 시스템 설계

### 8.1 구독 플로우

```
[유료 기능 접근 시도] → [구독 안내 페이지]
  ↓
[결제 수단 입력 (카드)] → [토스페이먼츠 결제 위젯]
  ↓
[빌링키 발급] → [첫 결제 처리]
  ↓
[구독 활성화] → [Firestore에 구독 상태 업데이트]
  ↓
[매월 자동 결제] → [웹훅으로 결제 결과 수신]
```

### 8.2 구독 관리

- 구독 시작/해지/재개 기능
- 결제 실패 시 재시도 로직 (3회)
- 3회 실패 시 구독 일시정지 → 사용자에게 알림
- 해지 시 현재 결제 주기 종료까지 서비스 이용 가능
- 환불 정책 수립 필요

---

## 9. 페이지 구조 (Sitemap)

### 9.1 퍼블릭 페이지 (비로그인)

```
/ (랜딩 페이지)
/login (로그인)
/signup (회원가입)
/signup/minor-consent (미성년자 부모 동의)
/pricing (요금 안내)
```

### 9.2 인증 필요 페이지

```
/dashboard (메인 대시보드)
│
├ /test (진로 심리검사)
│  ├ /test/select (검사 선택)
│  ├ /test/[testType] (검사 진행)
│  └ /test/results/[resultId] (검사 결과)
│
├ /explore (진로 탐색)
│  ├ /explore/jobs (직업 탐색)
│  ├ /explore/jobs/[jobId] (직업 상세)
│  ├ /explore/majors (학과 탐색)
│  ├ /explore/majors/[majorId] (학과 상세)
│  └ /explore/subjects (선택과목 탐색)
│
├ /records (학생부 관리)
│  ├ /records/dashboard (학생부 대시보드 / 타임라인)
│  ├ /records/new (새 기록 작성)
│  ├ /records/[recordId] (기록 상세/수정)
│  └ /records/category/[category] (항목별 보기)
│
├ /plan (진로 계획)
│  ├ /plan/career (진로 설계)
│  └ /plan/subjects (선택과목 계획)
│
├ /ai (AI 기능 — 유료)
│  ├ /ai/guide (활동 가이드)
│  ├ /ai/writing (세특 작성 보조)
│  └ /ai/consulting (과목 선택 컨설팅)
│
├ /subscription (구독 관리)
│  ├ /subscription/plans (요금제)
│  └ /subscription/manage (구독 관리/해지)
│
└ /settings (설정)
   ├ /settings/profile (프로필 수정)
   └ /settings/notifications (알림 설정)
```

---

## 10. MVP 개발 로드맵 (4주, 일 4~5시간)

### 10.1 선행 작업 (Day 0 — 개발 시작 전 즉시)

| 작업 | 소요 시간 | 비고 |
|------|-----------|------|
| Vercel에 빈 Next.js 프로젝트 배포 → URL 확보 | 30분 | API 신청용 URL 확보 |
| 커리어넷 Open API 신청 | 30분 | 승인까지 수일 소요 예상 |
| Firebase 프로젝트 생성 | 30분 | Auth, Firestore, Storage 활성화 |
| 사업자등록 신청 (미완료 시) | 별도 | PG사 연동 전 필수 |
| AI API 키 발급 (OpenAI) | 15분 | |

### 10.2 1주차: 기반 구축 + 인증 + 데이터 (28~35시간)

**목표:** 프로젝트 셋업, 회원가입/로그인 완성, 선택과목 DB 적재

| 일자 | 작업 | 예상 시간 |
|------|------|-----------|
| Day 1 | Next.js 프로젝트 초기 셋업 (폴더 구조, 라우팅, Tailwind CSS) | 4h |
| Day 2 | Firebase 연동 + 이메일/비밀번호 회원가입·로그인 구현 | 5h |
| Day 3 | 회원가입 추가 정보 입력 (학교급, 학년) + 만 14세 미만 동의 로직 | 5h |
| Day 4 | 랜딩 페이지 + 로그인 후 대시보드 기본 레이아웃 | 4h |
| Day 5 | 선택과목 PDF 데이터 추출 스크립트 작성 + 1차 추출 | 5h |
| Day 6 | 추출 데이터 검수 + Firestore 업로드 스크립트 | 4h |
| Day 7 | 학과 데이터 추출 + 업로드 + 직업-학과 매핑 기초 데이터 작성 | 5h |

**1주차 산출물:**
- 로그인/회원가입 동작하는 웹앱
- Firestore에 과목/학과 데이터 적재 완료
- 기본 대시보드 레이아웃

### 10.3 2주차: 커리어넷 연동 + 진로 탐색 (28~35시간)

**목표:** 심리검사 진행 가능, 검사 결과 기반 탐색

| 일자 | 작업 | 예상 시간 |
|------|------|-----------|
| Day 8 | 커리어넷 API 연동 (서버 프록시 설정, 문항 요청 구현) | 5h |
| Day 9 | 검사 UI 공통 컴포넌트 개발 (문항 표시, 선택, 진행률) | 5h |
| Day 10 | 검사 완료 → 결과 요청 → 결과 저장 → 결과 화면 | 5h |
| Day 11 | 5종 검사 모두 연동 테스트 + 중간 저장 기능 | 4h |
| Day 12 | 직업 탐색 페이지 (검사 결과 → 추천 직업 목록 → 상세) | 5h |
| Day 13 | 학과 탐색 페이지 (직업 → 관련 학과 → 상세 + 권장 과목) | 5h |
| Day 14 | 선택과목 탐색 페이지 + 과목 상세 정보 | 4h |

**2주차 산출물:**
- 커리어넷 심리검사 앱 내 진행 가능
- 검사 결과 → 직업 → 학과 → 선택과목 탐색 흐름 완성

**비상 계획:** 커리어넷 API 승인이 늦어질 경우, 목(mock) 데이터로 UI를 먼저 완성하고 API 승인 후 실제 연동으로 교체한다.

### 10.4 3주차: 학생부 관리 + 선택과목 추천 (28~35시간)

**목표:** 학생부 전 항목 기록 가능, 선택과목 추천 동작

| 일자 | 작업 | 예상 시간 |
|------|------|-----------|
| Day 15 | 학생부 대시보드 (항목별 카드 뷰 / 타임라인 뷰) | 5h |
| Day 16 | 학생부 기록 입력 폼 — 세특 | 4h |
| Day 17 | 학생부 기록 입력 폼 — 창체(자율, 동아리, 봉사, 진로) | 5h |
| Day 18 | 학생부 기록 입력 폼 — 독서, 수상, 출결, 자격증, 행특 | 5h |
| Day 19 | 기록 수정/삭제 + 학기별 필터링 + 항목별 필터링 | 4h |
| Day 20 | 선택과목 추천 로직 구현 (진로 → 학과 → 권장과목) | 5h |
| Day 21 | 나의 선택과목 계획 저장/수정 기능 | 4h |

**3주차 산출물:**
- 학생부 전 항목 기록/조회/수정/삭제 가능
- 진로 기반 선택과목 추천 동작
- 나의 과목 계획 저장 기능

### 10.5 4주차: 결제 + AI + 마무리 (28~35시간)

**목표:** 결제 시스템 동작, AI 기능 기본 구현, 전체 QA

| 일자 | 작업 | 예상 시간 |
|------|------|-----------|
| Day 22 | 토스페이먼츠 연동 — 결제 위젯 + 빌링키 발급 | 5h |
| Day 23 | 구독 관리 (상태 관리, 해지, 웹훅 처리) | 5h |
| Day 24 | AI 활동 가이드 기능 (프롬프트 설계 + API 연동) | 5h |
| Day 25 | AI 세특 작성 보조 기능 (프롬프트 설계 + API 연동) | 5h |
| Day 26 | 유료/무료 접근 제어 + 알림 기능 기초 구현 | 4h |
| Day 27 | 전체 QA + 버그 수정 + 반응형 모바일 대응 점검 | 5h |
| Day 28 | 최종 점검 + 배포 + 커리어넷 API 실데이터 전환 | 4h |

**4주차 산출물:**
- 결제 시스템 동작
- AI 가이드/작성 보조 기능 동작
- 프로덕션 배포 완료

---

## 11. 리스크 및 대응 방안

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 커리어넷 API 승인 지연 | 높음 | Mock 데이터로 UI 선개발, 승인 후 교체 |
| 커리어넷 API 이용량 제한 | 중간 | 검사 결과 캐싱, 사용량 모니터링 |
| PDF 데이터 추출 정확도 | 중간 | 자동 추출 후 수동 검수 병행 |
| 1인 개발 일정 초과 | 높음 | AI 기능을 MVP 후 업데이트로 연기 가능 (핵심은 검사+기록) |
| PG사 사업자등록 미비 | 높음 | 결제를 2차 업데이트로 연기하고 MVP는 전체 무료 오픈 |
| 만 14세 미만 동의 절차 복잡성 | 중간 | MVP에서는 이메일 동의 방식, 추후 본인인증 API 연동 |

**일정이 부족할 경우 기능 우선순위:**

1순위(필수): 회원가입 + 커리어넷 검사 + 기본 탐색 + 학생부 기록
2순위(가능하면): 선택과목 추천 + 결제
3순위(연기 가능): AI 기능 + 고급 알림

---

## 12. 향후 확장 계획

### Phase 2 (MVP 출시 후 1~3개월)

- 소셜 로그인 추가 (Google, Kakao, Naver)
- AI 기능 고도화 (과목 선택 컨설팅)
- 학생부 통계 대시보드 (활동 분포, 진로 일관성 분석)
- 사용자 피드백 기반 UX 개선
- 커리어넷 검사 종류 커스텀 (테스트 결과 기반)

### Phase 3 (출시 후 3~6개월)

- Flutter 앱 개발 착수 (동일 Firebase 백엔드 공유)
- 학부모 계정 (자녀 진로 현황 열람)
- 푸시 알림 (FCM)

### Phase 4 (출시 후 6개월 이후)

- 교사 계정 (학생 관리 대시보드)
- 대학 입시 정보 연동
- 커뮤니티 기능 (진로별 게시판)
- 멘토링 매칭 기능

---

## 13. 프로젝트 디렉토리 구조 (Next.js)

```
myjinga/
├ src/
│  ├ app/                          # App Router
│  │  ├ layout.tsx                 # 루트 레이아웃
│  │  ├ page.tsx                   # 랜딩 페이지
│  │  ├ (auth)/
│  │  │  ├ login/page.tsx
│  │  │  ├ signup/page.tsx
│  │  │  └ signup/minor-consent/page.tsx
│  │  ├ (main)/                    # 인증 필요 영역
│  │  │  ├ layout.tsx              # 사이드바/네비게이션 포함 레이아웃
│  │  │  ├ dashboard/page.tsx
│  │  │  ├ test/
│  │  │  │  ├ select/page.tsx
│  │  │  │  ├ [testType]/page.tsx
│  │  │  │  └ results/[resultId]/page.tsx
│  │  │  ├ explore/
│  │  │  │  ├ jobs/page.tsx
│  │  │  │  ├ jobs/[jobId]/page.tsx
│  │  │  │  ├ majors/page.tsx
│  │  │  │  ├ majors/[majorId]/page.tsx
│  │  │  │  └ subjects/page.tsx
│  │  │  ├ records/
│  │  │  │  ├ dashboard/page.tsx
│  │  │  │  ├ new/page.tsx
│  │  │  │  ├ [recordId]/page.tsx
│  │  │  │  └ category/[category]/page.tsx
│  │  │  ├ plan/
│  │  │  │  ├ career/page.tsx
│  │  │  │  └ subjects/page.tsx
│  │  │  ├ ai/
│  │  │  │  ├ guide/page.tsx
│  │  │  │  ├ writing/page.tsx
│  │  │  │  └ consulting/page.tsx
│  │  │  ├ subscription/
│  │  │  │  ├ plans/page.tsx
│  │  │  │  └ manage/page.tsx
│  │  │  └ settings/
│  │  │     ├ profile/page.tsx
│  │  │     └ notifications/page.tsx
│  │  └ api/                       # API Routes (서버사이드)
│  │     ├ career-net/
│  │     │  ├ questions/route.ts   # 커리어넷 문항 프록시
│  │     │  └ report/route.ts      # 커리어넷 결과 프록시
│  │     ├ ai/
│  │     │  ├ guide/route.ts       # AI 가이드 API
│  │     │  └ writing/route.ts     # AI 작성 보조 API
│  │     └ payments/
│  │        ├ billing/route.ts     # 결제 처리
│  │        └ webhook/route.ts     # PG 웹훅 수신
│  │
│  ├ components/
│  │  ├ ui/                        # 공통 UI 컴포넌트
│  │  ├ auth/                      # 인증 관련 컴포넌트
│  │  ├ test/                      # 검사 관련 컴포넌트
│  │  │  └ TestQuestionCard.tsx    # 공통 검사 문항 컴포넌트
│  │  ├ records/                   # 학생부 관련 컴포넌트
│  │  ├ explore/                   # 탐색 관련 컴포넌트
│  │  └ ai/                        # AI 관련 컴포넌트
│  │
│  ├ lib/
│  │  ├ firebase.ts                # Firebase 초기화
│  │  ├ firestore.ts               # Firestore 유틸리티
│  │  ├ auth.ts                    # 인증 유틸리티
│  │  └ career-net.ts              # 커리어넷 API 유틸리티
│  │
│  ├ hooks/
│  │  ├ useAuth.ts                 # 인증 상태 훅
│  │  ├ useSubscription.ts         # 구독 상태 훅
│  │  └ useRecords.ts              # 학생부 기록 훅
│  │
│  ├ types/
│  │  ├ user.ts
│  │  ├ test.ts
│  │  ├ record.ts
│  │  ├ subject.ts
│  │  └ major.ts
│  │
│  └ constants/
│     ├ record-categories.ts       # 학생부 항목 상수
│     └ test-types.ts              # 검사 종류 상수
│
├ public/
├ scripts/
│  └ data-import/                  # PDF 데이터 추출/업로드 스크립트
│     ├ extract-subjects.py
│     ├ extract-majors.py
│     └ upload-to-firestore.js
│
├ .env.local                       # 환경 변수 (API 키 등)
├ next.config.js
├ tailwind.config.js
├ tsconfig.json
└ package.json
```

---

## 14. 환경 변수 목록

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (서버사이드용)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# 커리어넷 API
CAREER_NET_API_KEY=

# AI API
OPENAI_API_KEY=

# 토스페이먼츠
TOSS_PAYMENTS_SECRET_KEY=
TOSS_PAYMENTS_CLIENT_KEY=

# 앱 설정
NEXT_PUBLIC_APP_URL=
```

---

## 부록 A: 커리어넷 API 엔드포인트 정리

| API | Method | URL | 설명 |
|-----|--------|-----|------|
| 문항 요청 | GET | /inspct/openapi/test/questions | 검사 문항 조회 |
| 결과 요청 | POST | /inspct/openapi/test/report | 답변 제출 → 결과 URL 반환 |

파라미터 상세는 API 키 발급 후 공식 문서에서 확인하여 업데이트한다.

## 부록 B: 학생부 항목별 기재요령 핵심 요약

2026학년도 학교생활기록부 기재요령(중학교 173p, 고등학교 223p)에서 앱 개발에 필요한 핵심 기재 규칙을 요약한다. 이 내용은 학생부 기록 입력 폼의 가이드라인 및 AI 작성 보조의 시스템 프롬프트에 활용된다.

**공통 금지 사항:**
- 특정 대학명, 기관명, 상호명, 강사명 기재 불가
- 교외 활동 기재 제한 (교육관련기관 예외)
- 사교육 관련 내용 기재 불가

**세부능력 및 특기사항:**
- 과목별 성취기준에 따른 성취수준의 특성 및 학습활동 참여도를 문장으로 입력
- 학생의 성장 과정과 학습 과정 중심 기록

**창의적 체험활동:**
- 자율활동: 학교교육계획에 따른 활동
- 동아리활동: 정규 + 자율동아리 (시간 포함)
- 봉사활동: 실적 기록 (장소, 시간)
- 진로활동: 진로 탐색 및 체험 활동

상세 기재 가이드라인은 각 PDF 원문을 참조한다.

---

**문서 끝**
