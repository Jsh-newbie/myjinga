# 마진가(Myjinga) 개발 환경 설정 가이드

- 문서 버전: v1.0
- 작성일: 2026-03-05
- 상태: Active
- 적용 범위: 로컬 개발/기본 검증

---

## 1. 요구 사항

1. Node.js 20 이상
2. npm 10 이상

---

## 2. 실행 방법

1. 의존성 설치
```bash
npm install
```

2. 환경변수 파일 생성
```bash
cp .env.example .env.local
```

3. 개발 서버 실행
```bash
npm run dev
```

4. 품질 점검
```bash
npm run lint
npm run typecheck
npm run format:check
```

---

## 3. 기본 구조

1. `src/app`: 라우팅 및 페이지
2. `src/components`: UI 컴포넌트
3. `src/lib`: 도메인/서버 공용 유틸
4. `src/types`: 공통 타입

---

## 4. 공통 API 응답 형식

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```
