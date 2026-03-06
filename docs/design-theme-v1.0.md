# Myjinga Design Theme - Midnight Pine v1.0

## Theme Overview

**Theme Name**: Midnight Pine (미드나잇 파인)
**Keywords**: 신뢰, 안정감, 지속적인 성장, 차분함

짙은 소나무 숲을 연상케 하는 고급스러운 그린 톤. 진로라는 긴 여정에서 학생들에게 심리적 안정감을 주며, 교육 서비스 특유의 신뢰도를 극대화한다.

## Color Palette

| Role | CSS Variable | Hex | Description |
|------|-------------|-----|-------------|
| Primary | `--brand-700` | `#1B4938` | 다크 파인 그린. 버튼, 링크, 강조 텍스트 등 메인 액션 색상 |
| Primary Mid | `--brand-500` | `#2D7A5A` | 중간 톤 그린. 그라데이션, hover 상태 등 |
| Primary Light | `--brand-100` | `#D6E8DE` | 연한 그린. 뱃지 배경, 선택 상태, 비활성 버튼 등 |
| Accent | `--accent` | `#E6915B` | 소프트 탠저린. 그린과 보색 대비로 CTA 강조, 알림 등 |
| Background | `--bg` | `#F4F7F5` | 옅은 그린빛 쿨 그레이. 페이지 배경 |
| Surface | `--surface` | `#FFFFFF` | 순백색. 카드, 모달, 입력 필드 배경 |
| Ink | `--ink` | `#12241C` | 딥 그린 블랙. 본문 텍스트 |

## Usage Guidelines

### Primary (`--brand-700`, `--brand-500`, `--brand-100`)

- **--brand-700**: CTA 버튼 배경, 활성 탭, 링크 텍스트, 로고 강조색
- **--brand-500**: 그라데이션 끝점, hover 효과, 보조 강조
- **--brand-100**: 뱃지/태그 배경, 선택된 항목 배경, disabled 버튼 배경

### Accent (`--accent`)

- 주의를 끌어야 하는 CTA (업그레이드 배너, 중요 알림)
- Primary와 함께 과도하게 사용하지 않는다 (화면당 1~2회)
- 텍스트 색상으로 사용하지 않는다

### Background & Surface

- 페이지 전체 배경은 항상 `--bg`
- 카드, 모달, 입력 필드 배경은 `--surface`
- 두 색의 차이로 자연스러운 계층 구분

### Ink (`--ink`)

- 모든 본문 텍스트의 기본 색상
- 순수 black(`#000`) 사용 금지 — `--ink` 사용

## CSS Variable 사용 규칙

1. **인라인 스타일에서도 CSS 변수 사용**: `style={{ color: 'var(--brand-700)' }}`
2. **하드코딩 금지**: 위 팔레트에 정의된 색상을 hex값으로 직접 쓰지 않는다
3. **새 색상 추가 시**: 반드시 `:root`에 변수를 추가하고, 이 문서에 기록한다
4. **시맨틱 네이밍**: 용도가 명확한 경우 시맨틱 변수 추가 가능 (예: `--error: #b91c1c`)

## Gradient Patterns

```css
/* 배너, CTA 영역 그라데이션 */
background: linear-gradient(135deg, var(--brand-700) 0%, var(--brand-500) 100%);

/* 랜딩 페이지 배경 효과 */
background: radial-gradient(circle at 15% 10%, var(--brand-100) 0%, transparent 40%);
```

## Reference

- CSS 변수 정의: `src/app/globals.css` `:root` 블록
- 랜딩 페이지: `public/landing.html` (별도 Tailwind 설정, 동기화 필요)
