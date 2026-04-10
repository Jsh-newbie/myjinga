# 마진가(Myjinga) 교육과정 참조 데이터 스펙

- 문서 버전: v1.0
- 기준 문서: `docs/myjinga-development-spec-v1.1.md`, `docs/myjinga-course-recommendation-rules-spec-v1.0.md`, `docs/firestore-schema-v1.0.md`, `docs/myjinga-execution-roadmap-v1.0.md`, `2025학년도 2022 개정 교육과정 선택 과목 안내서 (1).pdf`
- 작성일: 2026-04-10
- 상태: Draft (정규화 데이터 설계 기준)
- 적용 범위: 선택 과목 안내서 기반 과목/학과/출처/매핑/이수 규정/학점 편성 기준 참조 데이터 설계, Git 정본 구조, Firestore 서빙 구조, 추출/검수 파이프라인
- 영향 범위: Firestore 스키마, 추천 API, 과목 설계 검증 로직, seed 스크립트, 데이터 검수 프로세스, 관련 개발 문서

---

## 1. 목적

본 문서는 `2025학년도 2022 개정 교육과정 선택 과목 안내서`를 앱에서 재사용 가능한 참조 데이터로 전환하기 위한 구조를 정의한다.

이 문서의 목적은 아래 4가지다.

1. PDF를 매번 AI에 입력하지 않고도 과목 추천과 학과 탐색에 사용할 수 있는 구조를 고정한다.
2. `과목`, `학과`, `학과-과목 연결`, `출처`를 분리해 유지보수 가능한 참조 데이터 계층을 만든다.
3. Git에서 검수 가능한 정본 데이터와 Firestore에서 서빙하는 읽기 최적화 데이터를 구분한다.
4. 추천 결과에 대해 `왜 이 과목을 추천했는지` 출처와 근거를 설명할 수 있게 한다.

---

## 2. 설계 전제

### 2.1 현재 판단

1. 이 PDF는 단순 문서 검색 대상이 아니라 `정규화 가능한 공식 참조 데이터`에 가깝다.
2. 과목 추천의 품질은 AI 생성보다 `정확한 매핑 데이터`에 더 크게 좌우된다.
3. `선택 과목`만 정규화하면 반쪽이고, `학과 정보`와 `학과별 관련 과목 예시`도 함께 정규화해야 한다.
4. 추천 로직은 우선 규칙 기반으로 구현하고, AI는 설명 문구 보조에만 제한적으로 사용한다.
5. 목표 학과 권장 과목의 기본 출처는 현재 단계에서 `서울고교학점제지원센터`를 사용하고, 추후 학교별 공식 발표자료가 확보되면 출처 우선순위를 재정의한다.

### 2.2 문서 상태에 대한 주의

본 스펙은 PDF 전체 구조와 대표 섹션 샘플 확인을 바탕으로 만든 설계 초안이다. 아직 전 페이지 수작업 검수 결과를 반영한 최종 추출 명세는 아니다. 따라서 실제 파서 구현과 검수 단계에서 세부 필드는 보정될 수 있다.

### 2.3 현재 저장소 운영 상태

1. 현재 저장소는 `템플릿 우선` 상태를 기본으로 한다.
2. `canonical/`에는 승인된 실제 데이터만 저장한다.
3. 승인 전 구조 예시는 `templates/`에 저장한다.
4. 자동 파서 산출물은 `review/` 임시 파일로만 다루며, 기본 워크플로우에는 포함하지 않는다.

---

## 3. 주요 요구사항

| 요구사항 ID | 설명 |
| --- | --- |
| `REQ-CURRICULUM-001` | 과목/학과 추천에 사용할 공식 참조 데이터는 PDF 직접 질의가 아니라 정규화 데이터셋으로 관리해야 한다. |
| `REQ-CURRICULUM-002` | 정규화 데이터는 출처 문서와 페이지 단위 근거를 추적할 수 있어야 한다. |
| `REQ-CURRICULUM-003` | 정본 데이터는 Git에서 diff/review 가능해야 하며, 앱 서빙 데이터와 분리해야 한다. |
| `REQ-CURRICULUM-004` | 추천 엔진은 `학과`, `직업`, `검사 결과`, `관심사`를 조합해 과목 추천을 계산할 수 있어야 한다. |
| `REQ-CURRICULUM-005` | 학과 상세 화면은 PDF 수준의 풍부한 정보(요약, 추천 학생, 주요 전공 교과목, 유사 학과, 졸업 후 진로)를 제공할 수 있어야 한다. |
| `REQ-CURRICULUM-006` | 데이터 추출 자동화 이후에도 사람이 검수하고 수동 수정할 수 있는 워크플로우가 있어야 한다. |
| `REQ-CURRICULUM-007` | 추천 가능 여부 검사를 위한 이수 규정 데이터는 과목/학과 데이터와 분리된 참조 엔티티로 관리해야 한다. |
| `REQ-CURRICULUM-008` | 과목 기본 학점과 편성·운영 가능 범위는 졸업 규정 및 학교별 실제 개설 정보와 분리된 참조 엔티티로 관리해야 한다. |

---

## 4. 데이터 계층 구조

### 4.1 계층 정의

1. `원천 자료`
  - PDF, 공공 API, 서울고교학점제지원센터 학과 안내, 후속 안내서, 학교별 개설 과목 자료
2. `정본(Canonical)`
  - Git에 저장되는 JSON 데이터
  - 사람이 리뷰하고 버전 관리하는 기준 데이터
3. `서빙(Serving)`
  - Firestore에 적재되는 읽기 최적화 데이터
  - 앱 API와 UI가 직접 조회하는 데이터
4. `파생(Derived)`
  - 추천 점수, 검색 토큰, 화면 카드용 요약 데이터

### 4.2 이번 단계의 기본 정책

1. 정본은 Firestore가 아니라 Git 저장소의 JSON 파일이다.
2. Firestore는 정본을 seed한 결과물이며, 직접 수동 수정하지 않는다.
3. 추천 근거는 항상 `sourceRefs`를 통해 추적 가능해야 한다.
4. PDF 전체를 비정형 chunk로 저장하는 방식은 1차 구현 범위에서 제외한다.

---

## 5. 핵심 엔티티

이번 참조 데이터 계층은 아래 6개 엔티티를 기본으로 한다.

1. `curriculumSources`
  - 어떤 문서를 기준으로 삼았는지 관리하는 출처 메타데이터
2. `graduationRequirements`
  - 총 이수 학점, 필수 이수 학점, 교과군별 필수 이수 조건
3. `fieldSubjectGuides`
  - 계열/분야 수준의 핵심 과목, 권장 과목 가이드
4. `subjects`
  - 과목 자체 정보
5. `majors`
  - 학과 자체 정보
6. `majorSubjectLinks`
  - 특정 학과와 특정 과목 사이의 추천 관계

필요 시 이후 확장 엔티티로 아래를 둘 수 있다.

1. `sourcePassages`
  - 구조화가 어려운 원문 단락을 보조 저장
2. `creditOnlySubjectGroupRequirements`
  - 체육, 예술, 기술·가정/정보/제2외국어/한문/교양처럼 아직 과목 메타데이터를 다 채우지 않은 교과군의 학점 중심 임시 규칙
3. `creditOperationPolicies`
  - 과목 기본 학점, 편성·운영 범위, 증감 허용 여부, 학교 유형별 예외 편성 기준
4. `majorGuideRecommendations`
  - 목표 학과 기준 필수 고정 과목과 보조 추천 과목 묶음
5. `schoolSubjectOfferings`
  - 학교별 실제 개설 과목
6. `jobMajorLinks`
  - 직업과 학과 간 별도 추천 매핑

---

## 6. 정본 JSON 저장 구조

### 6.1 권장 경로

```text
data/
└── reference/
    └── curriculum/
        ├── raw/
        │   ├── 2025-seoul-subject-guide.pdf
        │   └── 2025-seoul-subject-guide.txt
        ├── canonical/
        │   ├── curriculum-sources.json
        │   ├── credit-only-subject-group-requirements.json
        │   ├── credit-operation-policies.json
        │   ├── graduation-requirements.json
        │   ├── field-subject-guides.json
        │   ├── major-guide-recommendations.json
        │   ├── subjects.json
        │   ├── majors.json
        │   └── major-subject-links.json
        ├── templates/
        │   ├── curriculum-sources.template.json
        │   ├── credit-only-subject-group-requirements.template.json
        │   ├── credit-operation-policies.template.json
        │   ├── graduation-requirements.template.json
        │   ├── field-subject-guides.template.json
        │   ├── major-guide-recommendations.template.json
        │   ├── subjects.template.json
        │   ├── majors.template.json
        │   └── major-subject-links.template.json
        └── review/
            ├── extraction-issues.md
            ├── credit-only-subject-group-requirements-draft.json
            ├── credit-operation-policies-draft.json
            ├── graduation-requirements-draft.json
            ├── major-guide-recommendations-draft.json
            ├── subjects-draft.json
            └── unresolved-entries.csv
```

### 6.2 저장 원칙

1. 파일은 도메인별로 분리하고, 한 파일에 모든 엔티티를 넣지 않는다.
2. 정본 JSON은 사람이 diff를 읽기 쉽도록 배열 항목 정렬 규칙을 고정한다.
3. 파서가 자동 생성한 값과 사람이 보정한 값의 구분이 필요하면 `lastReviewedAt`, `reviewStatus`를 둔다.
4. `canonical/`은 빈 배열로 시작해도 되며, 승인된 데이터만 채운다.
5. 스키마 예시는 `templates/`에서 관리하고 seed 입력 전 검수 체크리스트를 거친다.

### 6.3 템플릿 운영 원칙

1. 템플릿 파일은 구조 설명용 예시이며 앱 런타임에서 직접 읽지 않는다.
2. 템플릿 값은 placeholder이므로 seed 입력이나 추천 로직에서 사용하면 안 된다.
3. 실제 데이터 등록은 템플릿 복사 후 `canonical/`에 반영하는 방식으로 진행한다.

---

## 7. 공통 타입

### 7.1 ID 규칙

1. Firestore 문서 ID와 정본 JSON의 `id`는 동일한 안정 ID를 사용한다.
2. ID는 사람이 읽기 쉬운 ASCII slug를 기본으로 한다.
3. 이름이 바뀌어도 추적이 가능하도록 표시명과 ID는 분리한다.

예시:

```json
{
  "id": "major-business-administration",
  "nameKo": "경영학과"
}
```

### 7.2 공통 출처 참조 타입

```json
{
  "sourceId": "source-2025-seoul-subject-guide",
  "pages": [177, 178],
  "sectionLabel": "관련 고등학교 선택 과목 예시",
  "extractionMethod": "parser",
  "confidence": "medium"
}
```

필드 정의:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `sourceId` | `string` | 출처 문서 ID |
| `pages` | `number[]` | 근거 페이지 |
| `sectionLabel` | `string` | 섹션명 |
| `extractionMethod` | `"parser" \| "manual" \| "import"` | 추출 방식 |
| `confidence` | `"high" \| "medium" \| "low"` | 파싱 신뢰도 |

---

## 8. 엔티티 상세 스키마

### 8.1 curriculumSources

출처 문서 메타데이터.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 출처 문서 ID |
| `title` | `string` | O | 문서 제목 |
| `fileName` | `string` | O | 저장 파일명 |
| `curriculumRevision` | `string` | O | 교육과정 버전 (`2022`) |
| `guideYear` | `number` | O | 안내서 발간 기준 연도 (`2025`) |
| `region` | `string` | O | 발행 기관 지역/범위 (`서울`) |
| `publisher` | `string` | O | 발행 기관 |
| `publishedAt` | `string` | O | 발행일 |
| `pageCount` | `number` | O | 총 페이지 수 |
| `checksum` | `string` | - | 파일 무결성 체크값 |
| `status` | `"active" \| "archived"` | O | 사용 상태 |

예시:

```json
{
  "id": "source-2025-seoul-subject-guide",
  "title": "2025학년도 입학생을 위한 2022 개정 교육과정 선택 과목 안내서",
  "fileName": "2025학년도 2022 개정 교육과정 선택 과목 안내서 (1).pdf",
  "curriculumRevision": "2022",
  "guideYear": 2025,
  "region": "서울",
  "publisher": "서울특별시교육청교육연구정보원",
  "publishedAt": "2025-04-25",
  "pageCount": 159,
  "status": "active"
}
```

### 8.2 fieldSubjectGuides

계열 수준의 핵심/권장 과목 가이드.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 문서 ID |
| `field` | `string` | O | 대분류 계열 (`인문`, `사회`, `자연`, `공학` 등) |
| `subfield` | `string` | - | 세부 분야 (`재료/화공·고분자·에너지`) |
| `coreSubjects` | `string[]` | O | 핵심 과목 ID 목록 |
| `recommendedSubjects` | `string[]` | O | 권장 과목 ID 목록 |
| `notes` | `string[]` | - | 가이드 문장 |
| `sourceRefs` | `object[]` | O | 출처 참조 |

### 8.3 subjects

과목 참조 데이터의 기본 엔티티.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 과목 ID |
| `nameKo` | `string` | O | 과목명 |
| `aliasesKo` | `string[]` | - | 별칭/검색 보조명 |
| `schoolLevel` | `"high"` | O | 학교급 |
| `curriculumRevision` | `string` | O | 교육과정 버전 |
| `subjectGroup` | `string` | O | 교과(군) (`국어`, `수학`, `사회`, `과학` 등) |
| `selectionType` | `"common" \| "general" \| "career" \| "convergence" \| "specialized"` | O | 선택 유형 |
| `creditPolicy.default` | `number` | - | 기본 학점 |
| `creditPolicy.min` | `number` | - | 최소 학점 |
| `creditPolicy.max` | `number` | - | 최대 학점 |
| `evaluation.mode` | `"absolute" \| "relative" \| "pass"` | - | 평가 방식 |
| `evaluation.gradeLabel` | `string` | - | 표기 방식 (`성취도`, `A~E`, `P`) |
| `summary` | `string` | O | 과목 요약 |
| `keyTopics` | `string[]` | O | 주요 내용 요약 |
| `relatedJobs` | `string[]` | - | 관련 직업 |
| `relatedMajorNames` | `string[]` | - | 관련 학과명 문자열 |
| `tags` | `string[]` | - | 탐색용 태그 |
| `sourceRefs` | `object[]` | O | 출처 참조 |

예시:

```json
{
  "id": "subject-math-calculus-1",
  "nameKo": "미적분Ⅰ",
  "schoolLevel": "high",
  "curriculumRevision": "2022",
  "subjectGroup": "수학",
  "selectionType": "career",
  "creditPolicy": {
    "default": 4,
    "min": 3,
    "max": 5
  },
  "evaluation": {
    "mode": "relative",
    "gradeLabel": "A~E"
  },
  "summary": "함수의 극한, 미분, 적분의 기초를 다루며 자연과 사회 현상을 수학적으로 해석하는 기반 과목이다.",
  "keyTopics": [
    "함수의 극한",
    "미분법",
    "적분법"
  ],
  "tags": ["수학", "자연계열", "공학계열"],
  "sourceRefs": [
    {
      "sourceId": "source-2025-seoul-subject-guide",
      "pages": [36, 37],
      "sectionLabel": "수학",
      "extractionMethod": "parser",
      "confidence": "medium"
    }
  ]
}
```

### 8.4 majors

학과 참조 데이터의 기본 엔티티.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 학과 ID |
| `nameKo` | `string` | O | 학과명 |
| `aliasesKo` | `string[]` | - | 유사 명칭 |
| `fieldNameKo` | `string` | O | 계열명 |
| `fieldGuideId` | `string` | - | 계열 가이드 ID |
| `summary` | `string` | O | 학과 요약 |
| `majorCourseBuckets` | `object[]` | - | 원문 분류를 유지한 주요 전공 교과목 묶음 |
| `recommendedStudentTraits` | `string[]` | - | 이런 학생에게 추천 |
| `similarMajorGroups` | `object[]` | - | 원문 분류를 유지한 유사 학과 묶음 |
| `careerPathGroups` | `object[]` | - | 원문 분류를 유지한 졸업 후 진로 묶음 |
| `universityExampleGroups` | `object[]` | - | 원문 분류를 유지한 개설 대학 묶음 |
| `relatedHighSchoolSubjectExamples` | `object` | - | 일반/진로/융합 선택 과목 예시 |
| `sourceRefs` | `object[]` | O | 출처 참조 |
| `notes` | `string[]` | - | 내부 검수/정규화 메모 |

구조 규칙:

1. `majorCourseBuckets[]`는 `{ label, courseNames[] }` 구조를 사용한다.
2. `similarMajorGroups[]`는 `{ label, majorNames[] }` 구조를 사용한다.
3. `careerPathGroups[]`는 `{ label, careerNames[] }` 구조를 사용한다.
4. `universityExampleGroups[]`는 `{ label, seoul[], metro[], nonMetro[] }` 구조를 사용한다.
5. `relatedHighSchoolSubjectExamples`는 `{ general[], career[], convergence[] }` 구조를 사용한다.
6. `review/majors-draft.json` 단계에서는 페이지 단위 `sourceRefs` 정규화 전까지 `sourceText`, `reviewStatus`, `notes`를 임시로 함께 보유할 수 있다.

예시:

```json
{
  "id": "major-korean-language-and-literature",
  "nameKo": "국어국문학과",
  "aliasesKo": [],
  "fieldNameKo": "언어 · 문학 계열",
  "fieldGuideId": "field-guide-language-and-literature",
  "summary": "우리말과 우리 문학을 연구하여 민족 문화를 창조적으로 계승하고 발전시키는 것을 목표로 한다.",
  "majorCourseBuckets": [
    {
      "label": "국어학",
      "courseNames": [
        "한국어문법론",
        "한국어음운론"
      ]
    },
    {
      "label": "현대문학",
      "courseNames": [
        "한국현대시론",
        "한국현대소설론"
      ]
    }
  ],
  "recommendedStudentTraits": [
    "우리말의 유래·구조·원리에 관심이 있는 학생",
    "문학 작품 읽기와 분석을 좋아하는 학생"
  ],
  "similarMajorGroups": [
    {
      "label": "유사 학과",
      "majorNames": [
        "한국어문학과",
        "한국언어문화교육전공"
      ]
    }
  ],
  "careerPathGroups": [
    {
      "label": "언론계",
      "careerNames": [
        "신문·방송기자",
        "편집기자",
        "아나운서"
      ]
    }
  ],
  "universityExampleGroups": [
    {
      "label": "개설 대학",
      "seoul": [
        "고려대",
        "서울대"
      ],
      "metro": [
        "가천대"
      ],
      "nonMetro": [
        "강원대",
        "충남대"
      ]
    }
  ],
  "relatedHighSchoolSubjectExamples": {
    "general": [
      "화법과 언어",
      "독서와 작문",
      "문학"
    ],
    "career": [
      "주제 탐구 독서",
      "문학과 영상"
    ],
    "convergence": [
      "독서 토론과 글쓰기",
      "매체 의사소통"
    ]
  },
  "sourceRefs": [
    {
      "sourceId": "source-2025-seoul-subject-guide",
      "pages": [161],
      "sectionLabel": "국어국문학과",
      "extractionMethod": "manual",
      "confidence": "high"
    }
  ]
}
```

### 8.5 majorSubjectLinks

학과와 과목의 추천 관계를 표현하는 연결 엔티티.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 연결 ID |
| `majorId` | `string` | O | 학과 ID |
| `subjectId` | `string` | O | 과목 ID |
| `selectionBucket` | `"general" \| "career" \| "convergence"` | O | PDF 내 과목 예시 구분 |
| `recommendationStrength` | `"core" \| "recommended" \| "exploratory"` | O | 내부 추천 강도 |
| `sourceType` | `"majorExample" \| "fieldGuide" \| "manualCuration"` | O | 관계 생성 출처 |
| `reason` | `string` | - | 추천 이유 요약 |
| `sourceRefs` | `object[]` | O | 출처 참조 |

예시:

```json
{
  "id": "major-business-administration__subject-math-economic-math",
  "majorId": "major-business-administration",
  "subjectId": "subject-math-economic-math",
  "selectionBucket": "career",
  "recommendationStrength": "core",
  "sourceType": "majorExample",
  "reason": "경영학과 관련 고등학교 선택 과목 예시 중 진로 선택 과목으로 제시됨",
  "sourceRefs": [
    {
      "sourceId": "source-2025-seoul-subject-guide",
      "pages": [177],
      "sectionLabel": "관련 고등학교 선택 과목 예시",
      "extractionMethod": "parser",
      "confidence": "high"
    }
  ]
}
```

### 8.6 majorGuideRecommendations

목표 학과가 정해졌을 때 `필수 고정 과목(lockedRequiredSubjects)`과 보조 추천 과목 묶음을 제공하는 테스트/운영 보조 엔티티.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 엔트리 ID |
| `majorId` | `string` | O | 학과 ID |
| `majorNameKo` | `string` | O | 검수용 학과명 |
| `sourceProvider` | `string` | O | 출처 제공자 (`seoul-hsc`) |
| `sourceUrl` | `string` | O | 출처 URL |
| `requiredSubjectIds` | `string[]` | O | 필수 고정 과목 ID 목록 |
| `recommendedSubjectIds` | `string[]` | O | 잔여 학점 추천 우선 과목 ID 목록 |
| `targetUse` | `"prototype-testing" \| "production"` | O | 현재 사용 단계 |
| `reviewStatus` | `"draft" \| "reviewed" \| "approved"` | O | 검수 상태 |
| `notes` | `string[]` | - | 메모 |

예시:

```json
{
  "id": "major-guide-recommendation-business-administration",
  "majorId": "major-business-administration",
  "majorNameKo": "경영학과",
  "sourceProvider": "seoul-hsc",
  "sourceUrl": "https://seoulhsc.sen.go.kr/fus/MI000000000000000066/subjectGuide/2022/seriesInfoContent.do?series_seq=247",
  "requiredSubjectIds": [
    "subject-math-economic-math",
    "subject-social-economics",
    "subject-social-finance-and-economic-life"
  ],
  "recommendedSubjectIds": [
    "subject-english-for-occupation",
    "subject-english-presentation-and-debate"
  ],
  "targetUse": "prototype-testing",
  "reviewStatus": "draft"
}
```

### 8.7 creditOperationPolicies

과목 기본 학점, 편성·운영 범위, 증감 허용 여부, 학교 유형별 예외를 표현하는 보조 엔티티.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | `string` | O | 정책 ID |
| `schoolType` | `string` | O | 적용 학교 유형 |
| `entryYear` | `number` | O | 적용 입학생 연도 |
| `curriculumRevision` | `string` | O | 교육과정 버전 |
| `policyCategory` | `"common" \| "selection"` | O | 공통/선택 과목 정책 구분 |
| `appliesTo` | `object` | O | 적용 대상 과목명/교과군/선택유형 |
| `defaultCredits` | `number` | O | 기본 학점 |
| `creditRange` | `object` | O | 편성·운영 허용 범위 |
| `adjustmentPolicy` | `object` | O | 증감 허용 여부와 허용 폭 |
| `exceptionRules` | `object[]` | - | 특정 학교 유형 예외 규칙 |
| `sourceText` | `string` | O | 출처 설명 |
| `reviewStatus` | `"draft" \| "reviewed" \| "approved"` | O | 검수 상태 |
| `notes` | `string[]` | - | 메모 |

예시:

```json
{
  "id": "credit-operation-policy-selection-core-groups",
  "schoolType": "general-high-school",
  "entryYear": 2025,
  "curriculumRevision": "2022",
  "policyCategory": "selection",
  "appliesTo": {
    "subjectGroups": [
      "국어",
      "수학",
      "영어",
      "사회(역사/도덕 포함)",
      "과학",
      "기술·가정",
      "정보",
      "제2외국어",
      "한문"
    ],
    "selectionTypes": ["general", "career", "convergence"]
  },
  "defaultCredits": 4,
  "creditRange": {
    "min": 3,
    "max": 5
  },
  "adjustmentPolicy": {
    "maxAbsoluteAdjustment": 1,
    "canDecrease": true,
    "canIncrease": true
  },
  "sourceText": "사용자 제공 이미지 - 과목 기본 학점 및 편성·운영 범위 표",
  "reviewStatus": "draft"
}
```

---

## 9. Firestore 서빙 구조

### 9.1 컬렉션

```text
firestore/
├── curriculumSources/{sourceId}
├── fieldSubjectGuides/{guideId}
├── subjects/{subjectId}
├── majors/{majorId}
└── majorSubjectLinks/{linkId}
```

### 9.2 서빙 원칙

1. `subjects`, `majors`는 상세 화면과 검색 화면에서 직접 조회 가능해야 한다.
2. `majorSubjectLinks`는 추천 API와 학과 상세의 관련 과목 탭에서 사용한다.
3. Firestore 문서는 화면 렌더링 비용을 줄이기 위해 일부 파생 필드를 포함할 수 있다.
4. 파생 필드는 seed 단계에서 계산하며, 런타임에서 임의 재계산하지 않는다.

### 9.3 Firestore 파생 필드 예시

| 컬렉션 | 필드 | 용도 |
| --- | --- | --- |
| `subjects` | `searchTokens` | 과목 검색 |
| `majors` | `searchTokens` | 학과 검색 |
| `majors` | `recommendedSubjectIds` | 학과 상세 화면 빠른 조회 |
| `majorSubjectLinks` | `field` | 학과 계열 필터 보조 |

---

## 10. 추천 엔진에서의 사용 방식

### 10.1 입력 우선순위

1. 저장한 관심 학과
2. 검사 결과에서 얻은 추천 학과/직업
3. 관심 직업
4. 사용자 관심사

### 10.2 추천 흐름

1. 입력으로부터 후보 학과를 만든다.
2. `graduationRequirements`를 기준으로 추천 가능 여부와 하드 제약을 먼저 계산한다.
3. 후보 학과의 `majorSubjectLinks`를 모은다.
4. `selectionBucket`, `recommendationStrength`, 중복 빈도를 기준으로 과목 점수를 계산한다.
5. `fieldSubjectGuides`가 있으면 계열 수준 가중치를 추가한다.
6. 추천 결과는 `과목 + 근거 + 출처 + 규정 충족 상태`를 함께 반환한다.

### 10.3 출력 예시

```json
{
  "subjectId": "subject-math-economic-math",
  "nameKo": "경제 수학",
  "score": 9.2,
  "reasons": [
    "경영학과 관련 진로 선택 과목 예시에 포함됨",
    "사회 계열 과목 가이드에서 권장 과목으로 연결됨"
  ],
  "sourceRefs": [
    {
      "sourceId": "source-2025-seoul-subject-guide",
      "pages": [177]
    }
  ]
}
```

---

## 11. 추출 및 검수 워크플로우

### 11.1 1차 추출

1. PDF를 `pdftotext`로 텍스트화한다.
2. 과목 파트와 학과 파트를 구분해 parser 입력으로 사용한다.
3. 반복 패턴(`과목 정보`, `주요 내용`, `관련 직업 및 학과`, `관련 고등학교 선택 과목 예시`)을 기준으로 엔티티 후보를 생성한다.

### 11.2 2차 정규화

1. 문자열 과목명을 `subjects.id`에 매핑한다.
2. 학과명 문자열을 `majors.id`에 매핑한다.
3. PDF의 일반/진로/융합 선택 구분을 `selectionBucket`으로 변환한다.
4. 사람이 보기 좋은 긴 문단은 `summary`, `recommendedStudentTraits`, `careerPathGroups`, `majorCourseBuckets`, `universityExampleGroups` 등으로 분리한다.

### 11.3 3차 검수

1. 파서가 `confidence = low`로 남긴 항목을 우선 검수한다.
2. 페이지 출처가 누락된 데이터는 배포 금지한다.
3. 하나의 학과가 과도하게 많은 과목과 연결되면 원문 대조 후 조정한다.

### 11.4 4차 seed

1. 정본 JSON에서 Firestore용 파생 필드를 생성한다.
2. upsert 방식으로 `curriculumSources`, `fieldSubjectGuides`, `subjects`, `majors`, `majorSubjectLinks`, `majorGuideRecommendations`를 적재한다.
3. seed 실행 결과는 문서 수, 누락 수, 경고 수를 출력해야 한다.

---

## 12. 구현 우선순위

### Phase A. 기반 확정

1. `curriculumSources`
2. `graduationRequirements`
3. `subjects`
4. `majors`

### Phase B. 추천 연결

1. `creditOnlySubjectGroupRequirements`
2. `creditOperationPolicies`
3. `majorSubjectLinks`
4. `fieldSubjectGuides`
5. `majorGuideRecommendations`

### Phase C. 품질 고도화

1. `searchTokens` 파생
2. `confidence` 기반 검수 큐
3. 향후 `schoolSubjectOfferings` 연동

---

## 13. 제외 범위

이번 문서에서 바로 다루지 않는 항목은 아래와 같다.

1. 학교별 실제 개설 과목 데이터 수집
2. 대입 전형별 교과 이수 추천 규칙의 자동화
3. 모든 원문 문단의 chunk 저장 및 벡터 검색
4. AI가 원문 문장을 직접 인용하는 생성형 RAG 설계

---

## 14. 오픈 이슈

1. 과목/학과 ID slug 규칙을 영어 기반으로 할지, 내부 코드 기반으로 할지 결정 필요
2. `relatedMajorNames`를 문자열 배열로 둘지, `subjectMajorLinks`를 별도 둘지 결정 필요
3. `개설 대학` 정보를 majors 내부 배열로 유지할지, 별도 엔티티로 분리할지 결정 필요
4. `sourcePassages`를 1차 배포에 포함할지, 추후 설명 품질 개선용으로만 둘지 결정 필요
5. 서울교육청 안내서 외 다른 지역 안내서를 병합할 때 우선순위 규칙을 어떻게 둘지 결정 필요
6. `majorGuideRecommendations.requiredSubjectIds`를 학교 미개설 상황에서도 항상 유지할지, 학교별 예외 규칙을 둘지 결정 필요

---

## 15. 변경 이력

### v1.0 - 2026-04-10

1. 선택 과목 안내서 기반 참조 데이터 계층 신규 정의
2. Git 정본 JSON과 Firestore 서빙 구조 분리 원칙 명시
3. `graduationRequirements`를 포함한 6개 핵심 엔티티 기준으로 참조 데이터 계층 확장
4. 추천 엔진과 seed 파이프라인에서의 사용 방식 초안 추가
5. `creditOnlySubjectGroupRequirements`를 임시 규칙 보조 엔티티로 추가
6. `creditOperationPolicies`를 기본 학점/편성·운영 범위 보조 엔티티로 추가
7. 통합 상위 규칙 문서(`myjinga-course-recommendation-rules-spec-v1.0.md`)를 기준 문서에 추가
8. 테스트용 `majorGuideRecommendations` 엔티티와 draft 데이터 파일을 추가
