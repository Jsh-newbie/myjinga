import { describe, expect, it } from 'vitest';

import {
  buildMajorSubjectLinkCandidates,
  parseMajorSubjectExampleBlock,
  parseMajorSubjectExampleDocument,
} from '@/lib/curriculum/major-subject-parser';

const businessAdministrationBlock = `
경영학과

관련 고등학교 선택 과목 예시
일반 선택
진로 선택
융합 선택

화법과 언어, 독서와 작문, 문학, 대수, 미적분Ⅰ, 확률과 통계, 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 세계시민과
지리, 세계사, 사회와 문화, 정보, 제2외국어 과목 등

미적분Ⅱ, 기하, 경제 수학, 영어 발표와 토론, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 인공지능 기초,
데이터 과학 등

실용 통계, 수학과제 탐구, 실생활 영어 회화, 세계 문화와 영어, 사회문제 탐구, 금융과 경제생활, 제2외국어
문화 과목 등
`;

const multiMajorDocument = `
경영학과

관련 고등학교 선택 과목 예시
일반 선택
진로 선택
융합 선택

화법과 언어, 독서와 작문, 문학, 대수, 미적분Ⅰ, 확률과 통계, 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 세계시민과
지리, 세계사, 사회와 문화, 정보, 제2외국어 과목 등

미적분Ⅱ, 기하, 경제 수학, 영어 발표와 토론, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 인공지능 기초,
데이터 과학 등

실용 통계, 수학과제 탐구, 실생활 영어 회화, 세계 문화와 영어, 사회문제 탐구, 금융과 경제생활, 제2외국어
문화 과목 등

경제학과

관련 고등학교 선택 과목 예시
일반 선택
진로 선택
융합 선택

화법과 언어, 독서와 작문, 문학, 대수, 미적분Ⅰ, 확률과 통계, 영어Ⅰ, 영어Ⅱ, 영어 독해와 작문, 세계시민과
지리, 세계사, 사회와 문화, 정보, 제2외국어 과목  등

미적분Ⅱ, 기하, 경제 수학, 영어 발표와 토론, 법과 사회, 경제, 윤리와 사상, 국제 관계의 이해, 인공지능 기초,
데이터 과학 등

실용 통계, 수학과제 탐구, 실생활 영어 회화, 세계 문화와 영어, 사회문제 탐구, 금융과 경제생활, 제2외국어
문화 과목 등
`;

describe('parseMajorSubjectExampleBlock', () => {
  it('splits a major example block into general, career, and convergence subjects', () => {
    const parsed = parseMajorSubjectExampleBlock('경영학과', businessAdministrationBlock);

    expect(parsed).toEqual({
      majorName: '경영학과',
      buckets: {
        general: [
          '화법과 언어',
          '독서와 작문',
          '문학',
          '대수',
          '미적분Ⅰ',
          '확률과 통계',
          '영어Ⅰ',
          '영어Ⅱ',
          '영어 독해와 작문',
          '세계시민과 지리',
          '세계사',
          '사회와 문화',
          '정보',
          '제2외국어',
        ],
        career: [
          '미적분Ⅱ',
          '기하',
          '경제 수학',
          '영어 발표와 토론',
          '법과 사회',
          '경제',
          '윤리와 사상',
          '국제 관계의 이해',
          '인공지능 기초',
          '데이터 과학',
        ],
        convergence: [
          '실용 통계',
          '수학과제 탐구',
          '실생활 영어 회화',
          '세계 문화와 영어',
          '사회문제 탐구',
          '금융과 경제생활',
          '제2외국어 문화',
        ],
      },
    });
  });
});

describe('parseMajorSubjectExampleDocument', () => {
  it('extracts multiple major blocks from one text document', () => {
    const parsed = parseMajorSubjectExampleDocument(multiMajorDocument, ['경영학과', '경제학과']);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].majorName).toBe('경영학과');
    expect(parsed[1].majorName).toBe('경제학과');
    expect(parsed[1].buckets.career).toContain('경제 수학');
    expect(parsed[1].buckets.convergence).toContain('금융과 경제생활');
  });
});

describe('buildMajorSubjectLinkCandidates', () => {
  it('maps parsed subject names to canonical major and subject ids', () => {
    const parsed = parseMajorSubjectExampleBlock('경영학과', businessAdministrationBlock);

    const result = buildMajorSubjectLinkCandidates(
      [parsed],
      [{ id: 'major-business-administration', nameKo: '경영학과' }],
      [
        { id: 'subject-math-algebra', nameKo: '대수' },
        { id: 'subject-math-economic-math', nameKo: '경제 수학' },
        { id: 'subject-info-data-science', nameKo: '데이터 과학' },
      ],
      {
        sourceId: 'source-2025-seoul-subject-guide',
        pages: [177],
        sectionLabel: '관련 고등학교 선택 과목 예시',
      }
    );

    expect(result.unresolvedMajors).toEqual([]);
    expect(result.unresolvedSubjects).toContain('확률과 통계');
    expect(result.unresolvedSubjects).toContain('금융과 경제생활');
    expect(result.candidates).toEqual([
      {
        id: 'major-business-administration__subject-math-algebra',
        majorId: 'major-business-administration',
        subjectId: 'subject-math-algebra',
        subjectNameKo: '대수',
        selectionBucket: 'general',
        sourceType: 'majorExample',
        recommendationStrength: 'recommended',
        reason: '경영학과 관련 고등학교 선택 과목 예시의 일반 선택 과목에 포함된다.',
        sourceRefs: [
          {
            sourceId: 'source-2025-seoul-subject-guide',
            pages: [177],
            sectionLabel: '관련 고등학교 선택 과목 예시',
            extractionMethod: 'parser',
            confidence: 'medium',
          },
        ],
      },
      {
        id: 'major-business-administration__subject-math-economic-math',
        majorId: 'major-business-administration',
        subjectId: 'subject-math-economic-math',
        subjectNameKo: '경제 수학',
        selectionBucket: 'career',
        sourceType: 'majorExample',
        recommendationStrength: 'recommended',
        reason: '경영학과 관련 고등학교 선택 과목 예시의 진로 선택 과목에 포함된다.',
        sourceRefs: [
          {
            sourceId: 'source-2025-seoul-subject-guide',
            pages: [177],
            sectionLabel: '관련 고등학교 선택 과목 예시',
            extractionMethod: 'parser',
            confidence: 'medium',
          },
        ],
      },
      {
        id: 'major-business-administration__subject-info-data-science',
        majorId: 'major-business-administration',
        subjectId: 'subject-info-data-science',
        subjectNameKo: '데이터 과학',
        selectionBucket: 'career',
        sourceType: 'majorExample',
        recommendationStrength: 'recommended',
        reason: '경영학과 관련 고등학교 선택 과목 예시의 진로 선택 과목에 포함된다.',
        sourceRefs: [
          {
            sourceId: 'source-2025-seoul-subject-guide',
            pages: [177],
            sectionLabel: '관련 고등학교 선택 과목 예시',
            extractionMethod: 'parser',
            confidence: 'medium',
          },
        ],
      },
    ]);
  });
});
