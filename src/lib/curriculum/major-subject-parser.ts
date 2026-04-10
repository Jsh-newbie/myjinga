export interface MajorSubjectBuckets {
  general: string[];
  career: string[];
  convergence: string[];
}

export interface ParsedMajorSubjectExample {
  majorName: string;
  buckets: MajorSubjectBuckets;
}

export interface SubjectNameRef {
  id: string;
  nameKo: string;
}

export interface MajorNameRef {
  id: string;
  nameKo: string;
}

export interface LinkSourceSeed {
  sourceId: string;
  pages: number[];
  sectionLabel: string;
}

export interface MajorSubjectLinkCandidate {
  id: string;
  majorId: string;
  subjectId: string;
  subjectNameKo: string;
  selectionBucket: keyof MajorSubjectBuckets;
  sourceType: 'majorExample';
  recommendationStrength: 'recommended';
  reason: string;
  sourceRefs: Array<
    LinkSourceSeed & {
      extractionMethod: 'parser';
      confidence: 'medium';
    }
  >;
}

export interface MajorSubjectLinkBuildResult {
  candidates: MajorSubjectLinkCandidate[];
  unresolvedMajors: string[];
  unresolvedSubjects: string[];
}

const SECTION_HEADER = '관련 고등학교 선택 과목 예시';

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitSubjects(line: string) {
  return normalizeWhitespace(line)
    .replace(/\s+과목\s+등$/u, '')
    .replace(/\s+과목\s*$/u, '')
    .replace(/\s+등$/u, '')
    .split(',')
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function findSectionStart(block: string) {
  const index = block.indexOf(SECTION_HEADER);
  if (index === -1) {
    throw new Error(`'${SECTION_HEADER}' 구간을 찾을 수 없습니다.`);
  }

  return block.slice(index + SECTION_HEADER.length).trim();
}

export function parseMajorSubjectExampleBlock(
  majorName: string,
  block: string
): ParsedMajorSubjectExample {
  const section = findSectionStart(block);
  const paragraphs = section
    .split(/\n\s*\n/u)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  const headerIndex = paragraphs.findIndex(
    (part) => part.includes('일반 선택') && part.includes('진로 선택') && part.includes('융합 선택')
  );

  if (headerIndex === -1) {
    throw new Error('선택 유형 헤더 문단을 찾을 수 없습니다.');
  }

  const generalLine = paragraphs[headerIndex + 1];
  const careerLine = paragraphs[headerIndex + 2];
  const convergenceLine = paragraphs[headerIndex + 3];

  if (!generalLine || !careerLine || !convergenceLine) {
    throw new Error('과목 예시 본문 3문단을 모두 찾을 수 없습니다.');
  }

  return {
    majorName,
    buckets: {
      general: splitSubjects(generalLine),
      career: splitSubjects(careerLine),
      convergence: splitSubjects(convergenceLine),
    },
  };
}

export function parseMajorSubjectExampleDocument(text: string, majorNames: string[]) {
  return majorNames.map((majorName, index) => {
    const start = findMajorBlockStart(text, majorName, majorNames[index + 1]);
    if (start === -1) {
      throw new Error(`'${majorName}' 블록을 찾을 수 없습니다.`);
    }

    const nextMajorName = majorNames[index + 1];
    const end = nextMajorName ? text.indexOf(nextMajorName, start + majorName.length) : text.length;
    const block = text.slice(start, end === -1 ? text.length : end);

    return parseMajorSubjectExampleBlock(majorName, block);
  });
}

function findMajorBlockStart(text: string, majorName: string, nextMajorName?: string) {
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf(majorName, cursor);
    if (start === -1) {
      return -1;
    }

    const end = nextMajorName ? text.indexOf(nextMajorName, start + majorName.length) : text.length;
    const block = text.slice(start, end === -1 ? text.length : end);

    if (block.includes(SECTION_HEADER)) {
      return start;
    }

    cursor = start + majorName.length;
  }

  return -1;
}

export function buildMajorSubjectLinkCandidates(
  parsedExamples: ParsedMajorSubjectExample[],
  majors: MajorNameRef[],
  subjects: SubjectNameRef[],
  sourceSeed: LinkSourceSeed
): MajorSubjectLinkBuildResult {
  const majorMap = new Map(majors.map((major) => [major.nameKo, major.id]));
  const subjectMap = new Map(subjects.map((subject) => [subject.nameKo, subject.id]));
  const unresolvedMajors = new Set<string>();
  const unresolvedSubjects = new Set<string>();
  const candidates: MajorSubjectLinkCandidate[] = [];

  for (const parsed of parsedExamples) {
    const majorId = majorMap.get(parsed.majorName);
    if (!majorId) {
      unresolvedMajors.add(parsed.majorName);
      continue;
    }

    for (const [bucket, names] of Object.entries(parsed.buckets) as Array<
      [keyof MajorSubjectBuckets, string[]]
    >) {
      for (const subjectName of names) {
        const subjectId = subjectMap.get(subjectName);
        if (!subjectId) {
          unresolvedSubjects.add(subjectName);
          continue;
        }

        candidates.push({
          id: `${majorId}__${subjectId}`,
          majorId,
          subjectId,
          subjectNameKo: subjectName,
          selectionBucket: bucket,
          sourceType: 'majorExample',
          recommendationStrength: 'recommended',
          reason: `${parsed.majorName} 관련 고등학교 선택 과목 예시의 ${bucketLabel(bucket)} 과목에 포함된다.`,
          sourceRefs: [
            {
              ...sourceSeed,
              extractionMethod: 'parser',
              confidence: 'medium',
            },
          ],
        });
      }
    }
  }

  return {
    candidates,
    unresolvedMajors: Array.from(unresolvedMajors).sort(),
    unresolvedSubjects: Array.from(unresolvedSubjects).sort(),
  };
}

function bucketLabel(bucket: keyof MajorSubjectBuckets) {
  switch (bucket) {
    case 'general':
      return '일반 선택';
    case 'career':
      return '진로 선택';
    case 'convergence':
      return '융합 선택';
  }
}
