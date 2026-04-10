# Curriculum Reference Data

이 디렉터리는 선택 과목 안내서 기반 참조 데이터의 정본을 관리한다.

구성:

- `raw/`: 원천 자료 위치 및 추출 메모
- `canonical/`: 승인된 데이터만 담는 정본 JSON
- `templates/`: 엔티티별 기본 템플릿 예시
- `review/`: 추출 이슈, 수동 검수 메모, draft 참조 데이터

현재 상태:

1. 자동 파서 기반 정규화는 보류 상태다.
2. `canonical/`은 실제 데이터 없이 빈 배열만 유지한다.
3. 구조 예시는 `templates/`에만 둔다.
4. review 산출물은 승인 대상 정본으로 간주하지 않는다.
5. 실제 과목/학과 데이터는 수동 검수 기준이 확정된 뒤 다시 채운다.
6. 현재 `review/`에는 `subjects-draft.json`, `majors-draft.json`, `field-subject-guides-draft.json`, `graduation-requirements-draft.json`, `credit-only-subject-group-requirements-draft.json`, `credit-operation-policies-draft.json`, `major-guide-recommendations-draft.json`이 임시 기준 데이터로 존재한다.

상세 구조와 필드 정의는 `docs/myjinga-curriculum-reference-data-spec-v1.0.md`를 따른다.
