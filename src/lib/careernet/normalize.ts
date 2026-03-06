import type { CareerTestTypeId } from '@/lib/careernet/constants';
import { CAREER_TESTS } from '@/lib/careernet/constants';
import type {
  NormalizedQuestion,
  NormalizedQuestionnaire,
  V1RawQuestion,
  V1RawResponse,
  V2RawQuestion,
  V2RawQuestionResponse,
} from '@/lib/careernet/types';

/**
 * V1 원시 응답 → 정규화된 문항 배열로 변환
 * V1은 answer01~answer10 / answerScore01~answerScore10 구조
 */
export function normalizeV1Questions(
  raw: V1RawResponse,
  testTypeId: CareerTestTypeId,
  qestrnSeq: string
): NormalizedQuestionnaire {
  const meta = CAREER_TESTS[testTypeId];

  if (raw.SUCC_YN !== 'Y') {
    throw new Error(`CAREERNET_V1_ERROR: ${raw.ERROR_REASON ?? 'Unknown error'}`);
  }

  const questions: NormalizedQuestion[] = raw.RESULT.map((item: V1RawQuestion, index: number) => {
    const choices: Array<{ value: string; label: string }> = [];

    for (let i = 1; i <= 10; i++) {
      const answerKey = `answer${String(i).padStart(2, '0')}` as keyof V1RawQuestion;
      const scoreKey = `answerScore${String(i).padStart(2, '0')}` as keyof V1RawQuestion;
      const label = item[answerKey];
      const value = item[scoreKey];

      if (typeof label === 'string' && typeof value === 'string') {
        choices.push({ value, label });
      }
    }

    const tipParts: string[] = [];
    if (typeof item.tip1Desc === 'string' && item.tip1Desc.trim()) {
      const score1 = item.tip1Score ?? '';
      tipParts.push(`${score1}점: ${item.tip1Desc.trim()}`);
    }
    if (typeof item.tip2Desc === 'string' && item.tip2Desc.trim()) {
      const score2 = item.tip2Score ?? '';
      tipParts.push(`${score2}점: ${item.tip2Desc.trim()}`);
    }
    if (typeof item.tip3Desc === 'string' && item.tip3Desc.trim()) {
      const score3 = item.tip3Score ?? '';
      tipParts.push(`${score3}점: ${item.tip3Desc.trim()}`);
    }
    const tip = tipParts.length > 0 ? tipParts.join('\n') : undefined;

    return {
      no: index + 1,
      text: item.question,
      choices,
      tip,
      ...(testTypeId === 'aptitude' && { useScoreLabel: true }),
    };
  });

  return {
    testTypeId,
    qestrnSeq,
    testName: meta.name,
    totalQuestions: questions.length,
    estimatedMinutes: meta.estimatedMinutes,
    questions,
  };
}

/**
 * V2 원시 응답 → 정규화된 문항 배열로 변환
 * V2는 questions[].choices[]{val, text, type} 구조
 */
export function normalizeV2Questions(
  raw: V2RawQuestionResponse,
  testTypeId: CareerTestTypeId,
  qestrnSeq: string
): NormalizedQuestionnaire {
  const meta = CAREER_TESTS[testTypeId];

  if (raw.success !== 'Y') {
    throw new Error(`CAREERNET_V2_ERROR: ${raw.message ?? 'Unknown error'}`);
  }

  const questions: NormalizedQuestion[] = raw.result.questions.map((item: V2RawQuestion) => {
    const choices = item.choices.map((c) => ({
      value: c.val,
      label: c.text,
    }));

    return {
      no: Number(item.no),
      text: item.text,
      choices,
    };
  });

  return {
    testTypeId,
    qestrnSeq,
    testName: raw.result.qnm || meta.name,
    totalQuestions: questions.length,
    estimatedMinutes: Number(raw.result.etime) || meta.estimatedMinutes,
    questions,
  };
}
