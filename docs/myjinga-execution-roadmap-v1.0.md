# Myjinga Execution Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고1 학생과 학부모를 위한 `과목 선택 + 학생부 근거 관리` MVP를 8주 안에 검증 가능한 수준으로 압축한다.

**Architecture:** 기존 Next.js 14 + Firebase 구조를 유지하면서, 현재 구현된 진로검사/탐색/기록/Insight 흐름 위에 `다음 행동 유도`, `선택과목 추천/로드맵`, `학부모 결제 검증`, `품질 게이트`를 순차적으로 얹는다. 신규 기능은 기존 Route Handler + `lib/` 도메인 로직 분리 패턴을 따르고, 검증 가능한 작은 배포 단위로 나눈다.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Firebase Auth, Firestore, Zod, CareerNet Open API, Toss Payments(예정), Vitest/Playwright(도입 예정)

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-business-viability-v1.0.md`, `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-curriculum-reference-data-spec-v1.0.md`, `docs/myjinga-project-rules-v1.0.md`, `docs/myjinga-records-spec-v1.0.md`, `docs/myjinga-insight-spec-v1.0.md`, `docs/dashboard-ux-feedback-v1.0.md`
- 작성일: 2026-04-09
- 상태: Draft (실행 기준안)
- 적용 범위: 제품 우선순위 재정렬, 8주 MVP 실행 순서, 작업 단위, 검증 게이트, 관련 문서 정합성
- 영향 범위: 기능 우선순위, API, 데이터, 테스트, 운영 문서, 릴리스 계획

---

## 1. 목적

이 문서는 `사업성 평가서`를 실제 구현 순서로 번역한 실행 문서다.

핵심 전제는 아래와 같다.

1. 현재 저장소는 이미 정적 사이트 단계를 지나 인증/검사/기록/Insight까지 구현된 상태다.
2. 따라서 기존 `docs/myjinga-phase1-development-plan-v1.0.md`의 초기 가정 중 일부는 현재 코드베이스와 맞지 않는다.
3. 앞으로의 실행은 `코드베이스 기반 전환`이 아니라 `가치 검증 우선순위 재배치`가 중심이어야 한다.

---

## 2. 실행 원칙

1. `고1 학생 + 학부모`를 초기 핵심 고객으로 둔다.
2. `과목 선택`과 `학생부 근거 관리`를 MVP의 2대 가치로 고정한다.
3. 진로검사, 탐색, Insight는 이 2대 가치를 보조하는 방향으로만 확장한다.
4. 배포 가능한 단위로 작게 나누고, 각 단계마다 검증 기준을 둔다.
5. 결제보다 먼저 `반복 사용`과 `결제 의향`을 검증한다.

---

## 3. 현재 상태와 주요 갭

### 3.1 현재 확보된 기반

1. 인증 플로우와 사용자 프로필 저장
2. 커리어넷 검사 세션/결과 저장
3. 직업/학과 탐색 및 즐겨찾기
4. 학생부 기록 CRUD
5. Insight 피드와 저장
6. `lint`, `typecheck`, `build` 통과 가능한 앱 구조

### 3.2 현재 가장 큰 갭

1. `검사 → 저장 → 기록` 흐름이 약하다
2. `고교학점제 과목 설계`가 사실상 비어 있다
3. 프리미엄/결제는 운영 가능한 수준이 아니다
4. 테스트와 CI가 부족하다
5. 학부모 관점 가치 표현이 없다

---

## 4. 작업 단위와 파일 구조

### 4.1 Workstream A: 사용자 여정 연결 강화

**목적:** 사용자가 검사 후 무엇을 해야 하는지 바로 이어지게 만든다.

**Modify**
- `src/app/dashboard/page.tsx`
- `src/lib/dashboard/ux.ts`
- `src/lib/dashboard/bootstrap.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/career-test/result/[resultId]/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/favorites/jobs/page.tsx`
- `src/app/favorites/majors/page.tsx`

**Create**
- `src/lib/onboarding/roadmap.ts`
- `src/types/onboarding.ts`

### 4.2 Workstream B: 선택과목 추천/로드맵 MVP

**목적:** Myjinga의 핵심 차별화 기능을 만든다.

**Create**
- `src/types/subject.ts`
- `src/lib/subjects/recommendation.ts`
- `src/lib/subjects/repository.ts`
- `src/lib/subjects/schema.ts`
- `src/app/api/subjects/recommendations/route.ts`
- `src/app/subjects/page.tsx`
- `data/reference/curriculum/canonical/`
- `docs/myjinga-subject-roadmap-spec-v1.0.md`
- `docs/myjinga-curriculum-reference-data-spec-v1.0.md`

**Modify**
- `src/app/dashboard/page.tsx`
- `src/components/BottomNav.tsx`
- `src/lib/api/client.ts`
- `docs/myjinga-development-spec-v1.1.md`

### 4.3 Workstream C: 기록 가치 루프 강화

**목적:** 기록이 쌓이기만 하지 않고 주간/학기말 가치로 돌아오게 만든다.

**Modify**
- `src/app/records/page.tsx`
- `src/app/records/new/page.tsx`
- `src/app/records/[recordId]/page.tsx`
- `src/lib/records/repository.ts`
- `src/lib/records/presenter.ts`
- `src/lib/records/schema.ts`
- `src/app/ai/page.tsx`

**Create**
- `src/lib/records/review.ts`
- `src/app/records/review/page.tsx`

### 4.4 Workstream D: 학부모 결제 가설과 프리미엄 운영 기초

**목적:** 실제 매출 검증 전 단계의 결제 구조와 프리미엄 가치 노출을 만든다.

**Create**
- `src/lib/payments/toss.ts`
- `src/lib/subscriptions/repository.ts`
- `src/app/pricing/page.tsx`
- `src/app/api/payments/billing/route.ts`
- `src/app/api/payments/confirm/route.ts`
- `src/app/api/payments/webhook/route.ts`
- `src/app/api/subscription/cancel/route.ts`
- `src/app/api/subscription/resume/route.ts`
- `docs/myjinga-payments-spec-v1.0.md`

**Modify**
- `src/app/profile/page.tsx`
- `src/lib/users/repository.ts`
- `docs/myjinga-development-spec-v1.1.md`
- `docs/firestore-schema-v1.0.md`

### 4.5 Workstream E: 측정, 테스트, 릴리스 게이트

**목적:** 검증 결과를 수치로 보고, 배포 전 품질 기준을 고정한다.

**Create**
- `tests/integration/dashboard-bootstrap.test.ts`
- `tests/integration/records-route.test.ts`
- `tests/integration/subjects-recommendations-route.test.ts`
- `tests/e2e/onboarding-roadmap.spec.ts`
- `tests/e2e/subject-roadmap.spec.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `.github/workflows/ci.yml`
- `docs/myjinga-release-checklist-v1.0.md`
- `docs/myjinga-qa-scenarios-v1.0.md`

**Modify**
- `package.json`
- `package-lock.json`
- `docs/myjinga-development-spec-v1.1.md`

---

## 5. 8주 로드맵

### Phase 1. 행동 연결 복구 (Week 1-2)

**목표:** 검사 이후의 다음 행동이 보이는 상태를 만든다.

**산출물**
1. 대시보드 온보딩 로드맵
2. 검사 결과 페이지의 저장/탐색 CTA 보강
3. 즐겨찾기와 기록 유도 연결
4. 기본 Insight 피드 노출 조건 개선

**완료 기준**
1. 신규 사용자가 대시보드에서 다음 행동 1개 이상 바로 실행 가능
2. 검사 완료 후 관심 직업/학과 저장 경로가 1탭 이내
3. 대시보드 bootstrap 응답에 온보딩 상태가 포함

### Phase 2. 선택과목 추천 MVP (Week 3-4)

**목표:** `내 진로에 맞는 과목`이라는 핵심 가치 화면을 출시한다.

**산출물**
1. 과목 추천 API
2. 과목 추천/로드맵 화면
3. 대시보드 진입 카드
4. 과목 추천 spec 문서

**완료 기준**
1. 관심 직업/학과 또는 검사 결과가 있는 사용자는 추천 과목을 볼 수 있음
2. 추천 근거가 직업/학과/주제 태그로 표시됨
3. 과목 추천 API에 입력 검증과 fallback이 적용됨

### Phase 3. 기록 가치 루프 강화 (Week 5-6)

**목표:** 기록이 축적, 검토, 정리로 이어지게 만든다.

**산출물**
1. 주간/학기말 리뷰 화면
2. 기록 요약 카드
3. Insight 저장 항목과 기록 연결 강화
4. 프리미엄 미리보기 영역

**완료 기준**
1. 기록이 3개 이상인 사용자는 리뷰 화면에서 분류/누락 점검 가능
2. 기록 화면에서 다음 추천 액션이 보임
3. AI 없이도 기록 가치가 드러나는 요약 UX 제공

### Phase 4. 결제 가설 + 품질 게이트 (Week 7-8)

**목표:** 소규모 베타 테스트와 결제 의향 검증이 가능한 상태를 만든다.

**산출물**
1. 가격/플랜 페이지
2. 결제 API 초안 및 토스 결제 연동 골격
3. Vitest/Playwright/CI 도입
4. QA/릴리스 체크리스트

**완료 기준**
1. 프리미엄 기능과 무료 기능 차이가 UI 상 명확히 보임
2. 테스트/CI가 기본 흐름을 검증함
3. 클로즈드 베타 운영 문서가 준비됨

---

## 6. 실행 태스크

### Task 1: 온보딩 로드맵과 다음 행동 안내

**Files**
- Create: `src/lib/onboarding/roadmap.ts`
- Create: `src/types/onboarding.ts`
- Modify: `src/lib/dashboard/bootstrap.ts`
- Modify: `src/app/api/dashboard/bootstrap/route.ts`
- Modify: `src/lib/dashboard/ux.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/career-test/result/[resultId]/page.tsx`
- Test: `tests/integration/dashboard-bootstrap.test.ts`
- Test: `tests/e2e/onboarding-roadmap.spec.ts`

- [ ] `dashboard bootstrap` 응답에 온보딩 상태 계산 필드를 추가한다.
- [ ] 대시보드 상단에 `검사 완료`, `관심 직업 저장`, `관심 학과 저장`, `첫 기록 작성`, `인사이트 저장` 5단계 로드맵을 노출한다.
- [ ] 검사 결과 화면에서 직업/학과 저장 또는 탐색으로 바로 이동하는 CTA를 추가한다.
- [ ] 신규 테스트 러너 도입 전까지는 `npm run lint && npm run typecheck && npm run build`를 최소 검증 명령으로 사용한다.
- [ ] Vitest 도입 후에는 `npm run test -- dashboard-bootstrap`과 E2E 한 건을 추가 검증 명령으로 고정한다.

### Task 2: 선택과목 추천 API와 화면

**Files**
- Create: `src/types/subject.ts`
- Create: `src/lib/subjects/schema.ts`
- Create: `src/lib/subjects/repository.ts`
- Create: `src/lib/subjects/recommendation.ts`
- Create: `src/app/api/subjects/recommendations/route.ts`
- Create: `src/app/subjects/page.tsx`
- Modify: `src/lib/api/client.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/BottomNav.tsx`
- Test: `tests/integration/subjects-recommendations-route.test.ts`
- Test: `tests/e2e/subject-roadmap.spec.ts`
- Docs: `docs/myjinga-subject-roadmap-spec-v1.0.md`
- Docs: `docs/myjinga-curriculum-reference-data-spec-v1.0.md`

- [ ] 선택과목 추천 전에 `과목`, `학과`, `학과-과목 연결`, `출처`를 다루는 참조 데이터 레이어를 확정한다.
- [ ] Git 정본 JSON과 Firestore seed 구조를 분리해 설계한다.
- [ ] 관심 직업/학과, 검사 결과, 사용자 관심사(`interests`)를 입력으로 받는 추천 스키마를 정의한다.
- [ ] Firestore 또는 정적 seed 기준으로 추천 과목을 반환하는 repository 계층을 만든다.
- [ ] 추천 근거를 `관련 직업`, `관련 학과`, `연결 과목군`으로 보여주는 API를 구현한다.
- [ ] `/subjects` 화면에서 추천 과목, 이유, 다음 탐구 액션을 보여준다.
- [ ] 대시보드와 하단 네비에 `과목 설계` 진입점을 추가한다.
- [ ] 과목 추천 spec 문서를 별도로 추가하고 개발 명세와 용어를 맞춘다.

### Task 3: 기록 리뷰와 학기말 정리 가치 강화

**Files**
- Create: `src/lib/records/review.ts`
- Create: `src/app/records/review/page.tsx`
- Modify: `src/app/records/page.tsx`
- Modify: `src/app/records/new/page.tsx`
- Modify: `src/app/records/[recordId]/page.tsx`
- Modify: `src/lib/records/repository.ts`
- Modify: `src/lib/records/presenter.ts`
- Modify: `src/app/ai/page.tsx`
- Test: `tests/integration/records-route.test.ts`

- [ ] 최근 기록의 카테고리 분포, 누락 영역, 다음 권장 행동을 계산하는 `review` 로직을 추가한다.
- [ ] 기록 목록 화면에서 `주간 정리` 또는 `학기말 점검` 진입 CTA를 노출한다.
- [ ] 리뷰 화면에서 `세특 준비`, `창체`, `진로 아이디어`, `독서`, `봉사` 분포를 요약한다.
- [ ] Insight 저장 항목을 기록 화면에서 다시 이어서 쓸 수 있도록 링크를 추가한다.
- [ ] AI 초안 없이도 가치가 드러나는 요약 UX를 먼저 제공하고, 프리미엄 미리보기는 이후 단계로 제한한다.

### Task 4: 가격/플랜 페이지와 결제 골격

**Files**
- Create: `src/app/pricing/page.tsx`
- Create: `src/lib/payments/toss.ts`
- Create: `src/lib/subscriptions/repository.ts`
- Create: `src/app/api/payments/billing/route.ts`
- Create: `src/app/api/payments/confirm/route.ts`
- Create: `src/app/api/payments/webhook/route.ts`
- Create: `src/app/api/subscription/cancel/route.ts`
- Create: `src/app/api/subscription/resume/route.ts`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/lib/users/repository.ts`
- Docs: `docs/myjinga-payments-spec-v1.0.md`

- [ ] `무료`, `프리미엄`, `학부모가 기대하는 가치`를 분리한 가격 페이지를 만든다.
- [ ] 토스 결제 연동은 실제 상용 오픈이 아닌 베타 검증 기준으로 골격만 구현한다.
- [ ] 구독 상태 저장, 취소, 재개, 웹훅 검증 흐름을 개발 명세와 맞춘다.
- [ ] 결제 관련 문서와 Firestore 스키마 문서를 함께 갱신한다.
- [ ] 실결제 오픈 전까지는 예약 결제 또는 내부 테스트 모드 중심으로 운영한다.

### Task 5: 테스트/CI/릴리스 게이트 도입

**Files**
- Create: `tests/integration/dashboard-bootstrap.test.ts`
- Create: `tests/integration/records-route.test.ts`
- Create: `tests/integration/subjects-recommendations-route.test.ts`
- Create: `tests/e2e/onboarding-roadmap.spec.ts`
- Create: `tests/e2e/subject-roadmap.spec.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Docs: `docs/myjinga-qa-scenarios-v1.0.md`
- Docs: `docs/myjinga-release-checklist-v1.0.md`

- [ ] `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` 스크립트를 도입한다.
- [ ] 최소 3개 통합 테스트와 2개 E2E 테스트를 추가한다.
- [ ] CI에서 `lint`, `typecheck`, `test:integration`을 머지 차단 기준으로 설정한다.
- [ ] QA 시나리오에는 프로젝트 규칙서 7.3 항목과 이번 로드맵의 신규 기능을 반영한다.
- [ ] 릴리스 체크리스트에는 환경변수, Firestore 인덱스, 웹훅 설정, 롤백 절차를 포함한다.

---

## 7. 검증 명령

### 7.1 현재 즉시 실행 가능한 명령

```bash
npm run lint
npm run typecheck
npm run build
```

### 7.2 로드맵 중간 게이트 이후 목표 명령

```bash
npm run lint
npm run typecheck
npm run test:integration
npm run test:e2e
npm run build
```

---

## 8. 요구사항/테스트 추적성

| 요구사항 ID | 구현 묶음 | 테스트 ID |
| --- | --- | --- |
| REQ-AUTH-001 | 온보딩 로드맵 사용자 식별 | TC-AUTH-ONBOARD-001 |
| REQ-CAREER-001 | 검사 결과 → 저장 → 탐색 연결 | TC-CAREER-FLOW-001 |
| REQ-RECORD-001 | 기록 리뷰/정리 | TC-RECORD-REVIEW-001 |
| REQ-INSIGHT-001 | 기본 피드 및 저장 연결 | TC-INSIGHT-FLOW-001 |
| REQ-SUBJECT-001 | 선택과목 추천/로드맵 MVP | TC-SUBJECT-001 |
| REQ-SUB-001 | 무료/유료 분기 및 가격 페이지 | TC-SUBSCRIPTION-001 |
| REQ-OPS-001 | CI/QA/릴리스 게이트 | TC-OPS-001 |

`REQ-SUBJECT-001`은 본 로드맵에서 새로 정의한 실행 요구사항이며, 세부 명세는 `docs/myjinga-subject-roadmap-spec-v1.0.md`에서 확정한다.

---

## 9. 리스크와 대응

1. 과목 추천 데이터 품질이 낮을 수 있다.
  대응: 초기에는 과도한 개인화보다 명시적 추천 근거를 우선 노출한다.
2. 결제 연동이 MVP 일정에 부담이 될 수 있다.
  대응: 실제 결제 오픈보다 가격/플랜 검증과 테스트 모드 연동을 먼저 둔다.
3. 테스트 인프라 도입이 늦어질 수 있다.
  대응: Phase 1부터 최소 통합 테스트 경로를 병행한다.
4. 기존 문서와 우선순위 충돌이 발생할 수 있다.
  대응: 이 문서를 현재 우선 실행 기준으로 두고, 관련 문서에 상위 참조를 추가한다.

---

## 10. 관련 문서 업데이트 원칙

이번 로드맵 실행 시 아래 문서는 기능과 함께 같이 갱신한다.

1. 과목 추천 기능 시작 시 `docs/myjinga-development-spec-v1.1.md`
2. 결제 연동 시작 시 `docs/firestore-schema-v1.0.md`
3. 테스트/릴리스 게이트 도입 시 QA/릴리스 문서 신설
4. 기존 `docs/myjinga-phase1-development-plan-v1.0.md`는 현재 저장소 상태와 충돌하므로, 우선순위 판단은 본 문서를 기준으로 한다

---

## 11. Changelog

- v1.0 (2026-04-09): 사업성 평가 결과를 기반으로 현재 코드베이스 기준 8주 실행 로드맵 신규 작성
