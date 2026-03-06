import { z } from 'zod';

import type { CareerTestTypeId } from '@/lib/careernet/constants';

// --- Zod schemas ---

export const careerTestTypeIdSchema = z.enum([
  'aptitude',
  'interest',
  'maturity',
  'values',
  'competency',
]);

export const sessionSaveRequestSchema = z.object({
  testTypeId: careerTestTypeIdSchema,
  answers: z.record(z.string(), z.string()),
  currentIndex: z.number().int().min(0),
  answeredCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
});

export const submitRequestSchema = z.object({
  sessionId: z.string().min(1),
});

// --- Normalized question (공통 구조, V1/V2 정규화 결과) ---

export interface NormalizedQuestion {
  no: number;
  text: string;
  choices: Array<{ value: string; label: string }>;
  tip?: string;
  /** true이면 선택지를 점수(1~7)로 표시 */
  useScoreLabel?: boolean;
}

export interface NormalizedQuestionnaire {
  testTypeId: CareerTestTypeId;
  qestrnSeq: string;
  testName: string;
  totalQuestions: number;
  estimatedMinutes: number;
  questions: NormalizedQuestion[];
}

// --- TestSession (임시저장) ---

export interface TestSession {
  testTypeId: CareerTestTypeId;
  qestrnSeq: string;
  trgetSe: string;

  status: 'in_progress' | 'submitted';
  totalQuestions: number;
  answeredCount: number;
  currentIndex: number;

  answers: Record<string, string>;

  startDtm: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface TestSessionWithId extends TestSession {
  id: string;
}

// --- TestResult (완료된 결과) ---

export interface TestResult {
  testTypeId: CareerTestTypeId;
  qestrnSeq: string;
  trgetSe: string;

  inspctSeq: string;
  resultUrl: string;

  answerPayload: {
    format: 'v1' | 'v2';
    raw: string | Array<{ no: string; val: string }>;
  };

  reportDetail?: ReportDetail;

  completedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface TestResultWithId extends TestResult {
  id: string;
}

// --- 커리어넷 원시 응답 타입 ---

export interface V1RawQuestion {
  question: string;
  qitemNo: number;
  answer01?: string | null;
  answer02?: string | null;
  answer03?: string | null;
  answer04?: string | null;
  answer05?: string | null;
  answer06?: string | null;
  answer07?: string | null;
  answer08?: string | null;
  answer09?: string | null;
  answer10?: string | null;
  answerScore01?: string | null;
  answerScore02?: string | null;
  answerScore03?: string | null;
  answerScore04?: string | null;
  answerScore05?: string | null;
  answerScore06?: string | null;
  answerScore07?: string | null;
  answerScore08?: string | null;
  answerScore09?: string | null;
  answerScore10?: string | null;
  tip1Score?: string | null;
  tip2Score?: string | null;
  tip3Score?: string | null;
  tip1Desc?: string | null;
  tip2Desc?: string | null;
  tip3Desc?: string | null;
}

export interface V1RawResponse {
  SUCC_YN: string;
  ERROR_REASON?: string;
  RESULT: V1RawQuestion[];
}

export interface V2RawChoice {
  val: string;
  text: string;
  type: string;
}

export interface V2RawQuestion {
  no: string;
  limit: string;
  text: string;
  title?: string | null;
  choices: V2RawChoice[];
}

export interface V2RawQuestionResponse {
  result: {
    qnm: string;
    qno: string;
    etime: string;
    questions: V2RawQuestion[];
  };
  success: string;
  message?: string;
}

export interface V1ReportResponse {
  SUCC_YN: string;
  ERROR_REASON?: string;
  RESULT: {
    inspctSeq: number;
    url: string;
  };
}

export interface V2ReportResponse {
  result: {
    inspct: {
      inspctseq: string;
      reporturl: string;
      trgetse: string;
      sexdstn: string;
    };
  };
  success: string;
  message?: string;
}

// --- ReportDetail (결과 페이지에서 추출한 상세 데이터) ---

export interface ReportRealm {
  rank: number;
  code: string;
  name: string;
  rawScore: number;
  /** 백분위 */
  percentile: number;
  /** T점수 */
  tScore: number;
}

export interface RealmMeta {
  code: string;
  name: string;
  description: string;
}

export interface RecommendedJob {
  name: string;
  code: number;
  description: string;
  thumbnail?: string;
}

export interface RecommendedMajor {
  name: string;
  seq: number;
  summary: string;
  thumbnail?: string;
}

export interface ReportDetail {
  inspctSeq: string;
  testCode: string;
  gender: string;
  target: string;
  grade: string;
  completedAt: string;
  responseTime: number;
  responsePattern?: string;
  realms: ReportRealm[];
  realmMeta?: RealmMeta[];
  recommendedJobs?: RecommendedJob[];
  recommendedMajors?: RecommendedMajor[];
}

// --- Legacy (하위 호환, 기존 코드가 참조할 수 있음) ---

/** @deprecated careerTestTypeIdSchema 사용 */
export const careerNetTestTypeSchema = careerTestTypeIdSchema;
/** @deprecated CareerTestTypeId 사용 */
export type CareerNetTestType = CareerTestTypeId;
