# 마진가(Myjinga) 1차 개발 작업 계획서

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-project-rules-v1.0.md`
- 작성일: 2026-03-05
- 상태: Draft (개발 착수용)
- 적용 범위: 1차 개발(코드베이스 기반 구축 ~ 핵심 사용자 여정 MVP)

---

## 1. 목적

현재 코드베이스(정적 랜딩 페이지 중심)를 실행 명세(`v1.1`) 수준의 서비스 구조로 전환하고,
아래 핵심 사용자 여정 MVP를 1차로 구현한다.

1. 회원가입/로그인/로그아웃
2. 커리어넷 검사 결과 저장/조회
3. 학생부 기록 CRUD
4. 유료 기능 게이트(무료/프리미엄 권한 분리)
5. 기본 운영 품질 게이트(lint/typecheck/test)

---

## 2. 현재 코드베이스 기준 진단

## 2.1 현재 상태

1. 런타임: 정적 HTML 기반 (`index.html`, `careernet-api-key-request.html`)
2. 패키지: `serve` 단일 의존성
3. 앱 프레임워크/서버/API/DB 연동 코드 부재
4. 테스트/CI/보안 규칙/인프라 설정 부재

## 2.2 1차 개발 선행 과제(갭)

1. Next.js 14 + TypeScript strict 기반으로 전환 필요
2. Firebase Auth/Firestore 보안 구조 초기화 필요
3. API 입력 검증(zod), 공통 오류 스키마 도입 필요
4. 테스트 러너 및 품질 게이트 구성 필요

---

## 3. 1차 개발 범위(Scope)

## 3.1 포함

1. FE/BE 통합 모노구조(Next.js App Router)
2. 인증(Firebase Auth)
3. Firestore 핵심 컬렉션(`users`, `users/{uid}/testResults`, `users/{uid}/records`)
4. 커리어넷 연동 서버 API(프록시/검증/타임아웃)
5. 기록 CRUD API + 기본 UI
6. 구독 상태 기반 권한 게이트(`free`/`premium`)
7. 기본 관측(에러 로깅, 요청 ID, 운영 문서 초안)

## 3.2 제외(2차 이후)

1. 결제 실결제 정식 오픈(토스 정산 운영)
2. AI 세특 고도화(필터/프롬프트 버저닝 정교화)
3. 보호자 동의 전체 플로우 자동화
4. 관리자 콘솔

---

## 4. 순차 개발 계획(코드베이스 기준)

## Phase 0. 리포지토리 기반 전환 (예상 2~3일)

목표: 정적 사이트 리포지토리를 제품 개발 가능한 구조로 전환

작업:
1. Next.js 14 + TypeScript strict + ESLint + Prettier 초기화
2. `src/` 구조 생성 (`app/`, `lib/`, `components/`, `types/`)
3. 환경변수 템플릿 추가 (`.env.example`)
4. 공통 응답/오류 스키마 정의 (`success/data/error`)
5. 기존 랜딩(`index.html`)을 `app/(marketing)` 라우트로 이관

산출물:
1. 실행 가능한 Next.js 앱
2. 기본 lint/typecheck 스크립트
3. 개발 문서: 실행/환경설정 섹션

완료 기준(DoD):
1. `npm run lint`, `npm run typecheck` 통과
2. 로컬에서 마케팅 페이지 정상 표시

---

## Phase 1. 인증/사용자 도메인 기초 (예상 3~4일)

목표: 사용자 식별 및 최소 사용자 프로필 저장

작업:
1. Firebase 프로젝트/에뮬레이터 연결
2. 회원가입/로그인/로그아웃 UI + 서버 검증
3. `users/{uid}` 생성/업데이트 로직(`createdAt`, `updatedAt` 자동화)
4. 역할/구독 기본 필드(`role`, `subscription.plan`, `subscription.status`) 반영
5. Firestore 보안 규칙 초안 작성(본인 데이터 접근만 허용)

산출물:
1. 인증 플로우 작동 화면
2. 사용자 문서 자동 생성
3. Firestore rules v1

완료 기준(DoD):
1. 신규 사용자 가입 후 `users/{uid}` 생성 확인
2. 타 사용자 데이터 접근 차단 테스트 통과
3. 통합 테스트 1개 이상 추가

---

## Phase 2. 커리어넷 결과 저장/조회 (예상 3~4일)

목표: 외부 API 의존 기능의 안정적인 서버 연동

작업:
1. 커리어넷 서버 라우트 구성(키 서버 보관, 클라이언트 노출 금지)
2. 입력 검증(zod), 타임아웃/재시도 정책 적용
3. 결과 정규화 후 `users/{uid}/testResults/{testId}` 저장
4. 검사 이력 목록/상세 조회 API 구현
5. 실패 시 사용자 fallback 메시지/재시도 UX 제공

산출물:
1. 커리어넷 연동 API 세트
2. 검사 결과 저장/조회 화면
3. 장애 대응 규칙(기본)

완료 기준(DoD):
1. 외부 API 실패 시 서비스 5xx 전파 최소화
2. 결과 저장/조회 통합 테스트 통과
3. 로그에 민감정보 미노출 확인

---

## Phase 3. 학생부 기록 CRUD + 권한 게이트 (예상 4~5일)

목표: 핵심 사용자 가치(기록 관리) 제공

기준 문서:
1. `docs/myjinga-development-spec-v1.1.md`
2. `docs/myjinga-records-spec-v1.0.md`

작업:
1. `records` CRUD API(생성/목록/상세/수정/삭제)
2. 필드 검증(제목/본문 길이, `semester` 포맷)
3. 인덱스 정의 (`category+semester+createdAt`, `semester+updatedAt`)
4. 기본 목록/에디터 UI 구현
5. `free`/`premium` 기능 분기(예: AI draft 필드 접근 제한)

산출물:
1. 기록 관리 기능 MVP
2. Firestore 인덱스 문서/설정
3. 권한 분기 규칙 구현

완료 기준(DoD):
1. CRUD 전 경로 통합 테스트 통과
2. 인덱스 누락 없이 쿼리 정상 수행
3. 권한 없는 기능 접근 시 표준 오류 응답 반환

---

## Phase 4. 품질 게이트/릴리스 준비 (예상 2~3일)

목표: 머지/배포 가능한 최소 운영 품질 확보

작업:
1. 테스트 피라미드 최소선 구축(Unit/Integration/E2E 핵심 1개 이상)
2. CI 파이프라인 구성(lint/typecheck/test)
3. QA 체크리스트 초안 작성(규칙서 7.3 반영)
4. 릴리스 체크리스트/롤백 절차 문서화
5. 오류 모니터링/알림 기본 연결

산출물:
1. CI 배지 가능한 파이프라인
2. QA/릴리스 문서 세트
3. 1차 릴리스 후보 태그 기준

완료 기준(DoD):
1. 머지 차단 규칙 자동화
2. 핵심 사용자 여정 E2E 1개 이상 green
3. 릴리스 체크리스트 기준 충족

---

## 5. 요구사항 추적 매핑(초안)

| 요구사항 ID | 구현 대상 | 테스트 ID(예시) |
| --- | --- | --- |
| REQ-AUTH-001 | 회원가입/로그인/로그아웃, `users/{uid}` | TC-AUTH-001 |
| REQ-CAREER-001 | 커리어넷 결과 저장/조회 | TC-CAREER-001 |
| REQ-RECORD-001 | 기록 CRUD | TC-RECORD-001 |
| REQ-SUB-001 | 무료/유료 권한 분기 | TC-SUB-001 |
| REQ-OPS-001 | CI 품질 게이트 | TC-OPS-001 |

---

## 6. 리스크 및 대응

1. 외부 API 불안정
- 대응: 타임아웃/재시도/서킷브레이커 유사 정책, fallback 메시지

2. Firestore 규칙/인덱스 누락
- 대응: 기능 구현 전에 rules/indexes 선반영, 에뮬레이터 테스트 필수

3. 정적 코드에서 프레임워크 전환 중 회귀
- 대응: 마케팅 라우트 우선 이관 후 기능 라우트 점진 추가

4. 일정 지연
- 대응: 1차 범위 고정, 결제/AI 고도화는 2차로 명시적 이월

---

## 7. 검증 게이트(머지/릴리스)

1. lint/typecheck/test 전부 통과
2. 신규 API별 통합 테스트 최소 1개
3. 보안 규칙 변경 시 시나리오 테스트 포함
4. 주요 사용자 여정(가입→검사결과→기록작성) 수동 QA 완료

---

## 8. 작업 순서 요약(체크리스트)

1. [ ] Phase 0: Next.js 전환/기반 설정
2. [ ] Phase 1: 인증/사용자 모델
3. [ ] Phase 2: 커리어넷 연동
4. [ ] Phase 3: 기록 CRUD/권한 게이트
5. [ ] Phase 4: 품질 게이트/릴리스 준비

---

## 9. 변경 이력

- v1.0 (2026-03-05): 코드베이스 현황 기반 1차 개발 순차 계획 신규 작성
