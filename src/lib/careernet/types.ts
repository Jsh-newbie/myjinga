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

  /** epoch ms (커리어넷 API 제출용) */
  startDtm: number;
  /** 서버 타임스탬프 (내부 기록용) */
  startedAt: FirebaseFirestore.Timestamp;
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
  /** reportDetail fetch 진행 중 여부 (중복 fetch 방지) */
  reportDetailFetching?: boolean;

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
  /** 수준 (높음/보통/낮음 등) */
  level?: string;
}

export interface RealmMeta {
  code: string;
  name: string;
  description: string;
}

/** 검사별 영역 상세 해석 (정적 JSON에서 추출) */
export interface RealmInterpretation {
  code: string;
  name: string;
  /** 영역 설명 */
  description: string;
  /** 수준별 해석 텍스트 (점수 기준으로 선택) */
  interpretations: {
    high: string;
    mid: string;
    low: string;
  };
  /** 역량 개발 팁 */
  tips?: string[];
  /** 관련 직업 (aptitude) */
  relatedJobs?: Array<{ code: string; name: string }>;
  /** 능력 향상 활동 (aptitude) */
  improves?: string[];
  /** 직업군 설명 (aptitude: etc) */
  jobGroupDescription?: string;
  /** 세부직업군별 직업 (aptitude: jobgroups) */
  jobGroups?: Array<{
    groupName: string;
    jobs: Array<{ code: number; name: string }>;
  }>;
  /** 상위 카테고리 (competency: 진로설계/진로준비) */
  category?: string;
  /** 흥미 유형 특성 (interest: natures) */
  natures?: string[];
  /** 관련 직업군 (interest: occupation) */
  occupation?: string[];
  /** 신생직업 (interest: future) */
  futureJobs?: Array<{ code: string; name: string }>;
  /** 관련직업 (interest: relative) */
  relativeJobs?: Array<{ code: string; name: string }>;
}

/** competency 전용: 상위 영역(진로설계/진로준비) 점수 */
export interface CompetencyGroupScore {
  code: string;
  name: string;
  tScore: number;
  level: string;
  avgScore: number;
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

/** interest 전용: Holland 6유형 프로파일 */
export interface HollandProfile {
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
}

/** values 전용: 상위 4개 카테고리 */
export interface ValuesUpper {
  code: string;
  name: string;
  score: number;
}

/** values 전용: 12개 하위 차원 */
export interface ValuesSubDim {
  code: string;
  name: string;
  description: string;
  userScore: number;
  demographicAvg?: number;
}

/** values 전용: 가치지향 유형별 관련 직업 */
export interface ValuesOrientationJob {
  name: string;
  jobCode?: string;
}

/** values 전용: 가치지향 유형 (안정지향/의미지향/변화지향/성취지향) */
export interface ValuesOrientation {
  code: string;
  name: string;
  description: string;
  score: number;
  subValues: string[];
  jobs: ValuesOrientationJob[];
}

/** maturity 전용: 집계 점수 */
export interface AggregateScore {
  rawScore: number;
  percentile: number;
  tScore: number;
  level: string;
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
  /** 응답 총점 (competency: 성실응답 여부 판단) */
  responseScore?: number;
  /** 스키마 버전 (re-fetch 트리거용) */
  schemaVersion?: number;
  realms: ReportRealm[];
  realmMeta?: RealmMeta[];
  /** 영역별 상세 해석 (정적 JSON에서 추출) */
  realmInterpretations?: RealmInterpretation[];
  /** competency 전용: 상위 영역 점수 */
  competencyGroups?: CompetencyGroupScore[];
  /** interest 전용: 흥미/직업 Holland 프로파일 */
  interestProfiles?: { interest: HollandProfile[]; job: HollandProfile[] };
  /** interest 전용: 설문 성실도 (sincerity, 5점 만점) */
  interestSincerity?: number;
  /** interest 전용: 긍정응답률 (choiceratio1~5) */
  interestChoiceRatios?: Array<{ label: string; ratio: number }>;
  /** interest 전용: 선호직업 백분위 (Part 2) */
  jobPercentiles?: Array<{ code: string; name: string; occupation: string[]; percentile: number }>;
  /** interest 전용: 일반흥미-선호직업군 일치정도 */
  interestCongruence?: { level: string; description: string };
  /** interest 전용: 진로활동 방법 추천 */
  careerActivities?: string[];
  /** values 전용: 상위 카테고리 + 하위 차원 */
  valuesHierarchy?: { uppers: ValuesUpper[]; subDimensions: ValuesSubDim[] };
  /** values 전용: 4개 가치지향 유형 (직업 포함) */
  valuesOrientations?: ValuesOrientation[];
  /** maturity 전용: 태도/능력/진로행동/시험불안 집계 */
  maturityAggregates?: Record<string, AggregateScore>;
  /** maturity 전용: 응답 일관성 */
  maturityConsistency?: { level: string; description: string };
  recommendedJobs?: RecommendedJob[];
  recommendedMajors?: RecommendedMajor[];
}

// --- Legacy (하위 호환, 기존 코드가 참조할 수 있음) ---

/** @deprecated careerTestTypeIdSchema 사용 */
export const careerNetTestTypeSchema = careerTestTypeIdSchema;
/** @deprecated CareerTestTypeId 사용 */
export type CareerNetTestType = CareerTestTypeId;
