/**
 * 선택 과목 안내서 PDF에서 학과별 "관련 고등학교 선택 과목 예시"를 추출해
 * review용 JSON 산출물을 생성한다.
 *
 * 실행:
 * npm run curriculum:parse:major-links -- --pdf "2025학년도 2022 개정 교육과정 선택 과목 안내서 (1).pdf" --majors 경영학과,경제학과
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildMajorSubjectLinkCandidates,
  parseMajorSubjectExampleBlock,
} from '@/lib/curriculum/major-subject-parser';

interface CliOptions {
  pdfPath: string;
  outputPath: string;
  majorNames: string[];
  sourceId: string;
}

interface CanonicalMajor {
  id: string;
  nameKo: string;
  sourceRefs?: Array<{
    pages?: number[];
  }>;
}

interface CanonicalSubject {
  id: string;
  nameKo: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  const options: CliOptions = {
    pdfPath: '2025학년도 2022 개정 교육과정 선택 과목 안내서 (1).pdf',
    outputPath: 'data/reference/curriculum/review/major-subject-links.generated.json',
    majorNames: [],
    sourceId: 'source-2025-seoul-subject-guide',
  };

  while (args.length > 0) {
    const current = args.shift();

    switch (current) {
      case '--pdf':
        options.pdfPath = args.shift() ?? options.pdfPath;
        break;
      case '--output':
        options.outputPath = args.shift() ?? options.outputPath;
        break;
      case '--majors':
        options.majorNames = (args.shift() ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        break;
      case '--source-id':
        options.sourceId = args.shift() ?? options.sourceId;
        break;
      default:
        break;
    }
  }

  return options;
}

function readJsonFile<T>(relativePath: string): T {
  const absolutePath = path.resolve(relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as T;
}

function extractTextFromPdf(pdfPath: string) {
  return execFileSync('pdftotext', [pdfPath, '-'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function splitPdfTextIntoPages(text: string) {
  return text.split('\f');
}

function getMajorSourcePages(major: CanonicalMajor) {
  const pages = new Set<number>();

  for (const sourceRef of major.sourceRefs ?? []) {
    for (const page of sourceRef.pages ?? []) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const majors = readJsonFile<CanonicalMajor[]>('data/reference/curriculum/canonical/majors.json');
  const subjects = readJsonFile<CanonicalSubject[]>(
    'data/reference/curriculum/canonical/subjects.json'
  );
  const targetMajorNames =
    options.majorNames.length > 0 ? options.majorNames : majors.map((major) => major.nameKo);

  const text = extractTextFromPdf(options.pdfPath);
  const pages = splitPdfTextIntoPages(text);
  const parsedExamples = targetMajorNames.map((majorName) => {
    const major = majors.find((item) => item.nameKo === majorName);
    if (!major) {
      throw new Error(`majors.json에서 '${majorName}'를 찾을 수 없습니다.`);
    }

    const sourcePages = getMajorSourcePages(major);
    if (sourcePages.length === 0) {
      throw new Error(`'${majorName}'의 sourceRefs.pages가 비어 있습니다.`);
    }

    const excerpt = sourcePages
      .map((page) => pages[page - 1] ?? '')
      .join('\n');

    return {
      ...parseMajorSubjectExampleBlock(majorName, excerpt),
      sourcePages,
    };
  });

  const buildResult = buildMajorSubjectLinkCandidates(parsedExamples, majors, subjects, {
    sourceId: options.sourceId,
    pages: [],
    sectionLabel: '관련 고등학교 선택 과목 예시',
  });

  const reviewDocument = {
    generatedAt: new Date().toISOString(),
    inputPdfPath: options.pdfPath,
    targetMajors: targetMajorNames,
    parsedMajorCount: parsedExamples.length,
    generatedCandidateCount: buildResult.candidates.length,
    unresolvedMajors: buildResult.unresolvedMajors,
    unresolvedSubjects: buildResult.unresolvedSubjects,
    parsedExamples,
    candidates: buildResult.candidates.map((candidate) => {
      const matchedExample = parsedExamples.find(
        (example) => candidate.id.startsWith(`${resolveMajorId(example.majorName, majors)}__`)
      );
      const sourcePages = matchedExample?.sourcePages ?? [];

      return {
        ...candidate,
        sourceRefs: candidate.sourceRefs.map((sourceRef) => ({
          ...sourceRef,
          pages: sourcePages,
        })),
      };
    }),
  };

  const outputPath = path.resolve(options.outputPath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(reviewDocument, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        parsedMajorCount: reviewDocument.parsedMajorCount,
        generatedCandidateCount: reviewDocument.generatedCandidateCount,
        unresolvedMajors: reviewDocument.unresolvedMajors.length,
        unresolvedSubjects: reviewDocument.unresolvedSubjects.length,
      },
      null,
      2
    )
  );
}

function resolveMajorId(majorName: string, majors: CanonicalMajor[]) {
  const found = majors.find((major) => major.nameKo === majorName);
  return found?.id ?? majorName;
}

main();
