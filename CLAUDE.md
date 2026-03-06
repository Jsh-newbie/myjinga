# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

마진가(Myjinga) - 중·고등학생을 위한 진로 탐색 및 AI 학생부 기록 지원 플랫폼. 커리어넷 연동 진단, 고교학점제 과목 설계, 학생부 기록 관리를 제공한다.

## Commands

```bash
npm run dev          # Next.js 개발 서버
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm run typecheck    # TypeScript strict 타입 검사 (tsconfig.typecheck.json 사용)
npm run format:check # Prettier 포맷 확인
npm run format       # Prettier 포맷 적용
```

## Architecture

Next.js 14 App Router 모노리포 구조. 프론트엔드와 API가 하나의 프로젝트에 통합되어 있다.

### Directory Layout

- `src/app/` - Next.js App Router 페이지 및 API Route Handlers
  - `(marketing)/` - 랜딩 페이지 (route group)
  - `(auth)/auth/` - 인증 페이지 (signin, signup)
  - `dashboard/` - 대시보드
  - `api/` - 서버 API 엔드포인트
- `src/lib/` - 비즈니스 로직 (UI와 분리)
  - `firebase/admin.ts` - Firebase Admin SDK (서버 전용)
  - `firebase/client.ts` - Firebase Client SDK (클라이언트)
  - `firebase/server-auth.ts` - Bearer 토큰 검증 유틸
  - `careernet/client.ts` - 커리어넷 API 클라이언트 (mock/live 모드)
  - `users/repository.ts` - Firestore 사용자 CRUD
  - `api/response.ts` - API 응답 헬퍼 (`ok()`, `fail()`)
- `src/types/` - 공유 타입 정의
- `src/components/` - UI 컴포넌트

### Key Patterns

**API 응답 형식**: 모든 API는 `{ success, data, error }` 통일 구조 사용. `src/lib/api/response.ts`의 `ok()`/`fail()` 헬퍼 사용 필수.

**인증 흐름**: 클라이언트에서 Firebase ID Token을 `Authorization: Bearer <token>` 헤더로 전송 → API Route에서 `verifyBearerToken()`으로 검증.

**외부 API 프록시**: 외부 API(커리어넷, OpenAI, 토스)는 반드시 서버 Route Handler에서 호출. 클라이언트 직접 호출 금지. 타임아웃/재시도 정책 적용.

**커리어넷 mock 모드**: `CAREERNET_USE_MOCK=true`로 설정하면 실제 API 호출 없이 개발 가능.

**입력 검증**: 모든 API 입력은 zod 스키마로 검증.

**Firestore 규칙**: 사용자는 본인 데이터만 읽기/쓰기. `majors`/`subjects`는 인증 사용자 읽기 전용. 컬렉션/필드명은 camelCase.

### Data Model (Firestore)

핵심 컬렉션: `users/{uid}`, `users/{uid}/testResults/{testId}`, `users/{uid}/records/{recordId}`, `majors/{majorId}`, `subjects/{subjectId}`

## Coding Rules

- TypeScript `strict` 모드. `any` 사용 금지 (불가피 시 근거 주석 필수)
- 서버 비밀키는 서버 Route Handler 내부에서만 접근
- 비즈니스 로직은 `lib/`에 분리, UI 컴포넌트는 표현 책임만
- 서버 컴포넌트 우선, 상호작용이 필요한 영역만 클라이언트 컴포넌트
- Firestore 쓰기 시 `createdAt`, `updatedAt` 자동 기록
- Path alias: `@/*` → `./src/*`

## Branch & Commit

- 브랜치: `main` (배포), `feat/*`, `fix/*`, `chore/*`
- 커밋: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)

## Reference Documents

프로젝트 규칙/설계 관련 의사결정은 아래 문서 참조:
- `docs/myjinga-project-rules-v1.0.md` - 프로젝트 규칙서 (아키텍처, API, 보안, 테스트 기준)
- `docs/myjinga-development-spec-v1.1.md` - 개발 실행 명세서 (도메인 모델, API 계약, Firestore 스키마)
- `AGENTS.md` - 구조적 변경 시 규칙서 참조 의무
