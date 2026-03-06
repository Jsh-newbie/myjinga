import { CAREER_TESTS, type CareerTestTypeId } from '@/lib/careernet/constants';
import { toV1AnswerString, toV2AnswerArray } from '@/lib/careernet/answer-format';
import { normalizeV1Questions, normalizeV2Questions } from '@/lib/careernet/normalize';
import type {
  NormalizedQuestionnaire,
  V1RawResponse,
  V1ReportResponse,
  V2RawQuestionResponse,
  V2ReportResponse,
} from '@/lib/careernet/types';

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 1;

// --- Config ---

interface LiveConfig {
  mode: 'live';
  apiKey: string;
}

interface MockConfig {
  mode: 'mock';
}

type ApiConfig = LiveConfig | MockConfig;

function getApiConfig(): ApiConfig {
  const apiKey = process.env.CAREERNET_API_KEY?.trim();
  const useMock = process.env.CAREERNET_USE_MOCK === 'true';

  if (useMock) {
    return { mode: 'mock' };
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      return { mode: 'mock' };
    }
    throw new Error('CAREERNET_API_KEY 환경변수가 필요합니다.');
  }

  return { mode: 'live', apiKey };
}

// --- HTTP helper ---

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`CAREERNET_HTTP_${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('CAREERNET_REQUEST_FAILED');
}

// --- Mock data ---

function getMockV1Questions(testTypeId: CareerTestTypeId): NormalizedQuestionnaire {
  const meta = CAREER_TESTS[testTypeId];
  const count = testTypeId === 'aptitude' ? 66 : 45;
  const questions = Array.from({ length: count }, (_, i) => ({
    no: i + 1,
    text: `${meta.name} 문항 ${i + 1} (mock)`,
    choices: [
      { value: '1', label: '매우낮음' },
      { value: '2', label: '낮음' },
      { value: '3', label: '약간낮음' },
      { value: '4', label: '보통' },
      { value: '5', label: '약간높음' },
      { value: '6', label: '높음' },
      { value: '7', label: '매우높음' },
    ],
    tip: i < 3 ? `문항 ${i + 1}에 대한 보충 설명입니다.` : undefined,
  }));

  return {
    testTypeId,
    qestrnSeq: meta.qestrnSeq.middle,
    testName: meta.name,
    totalQuestions: questions.length,
    estimatedMinutes: meta.estimatedMinutes,
    questions,
  };
}

function getMockV2Questions(): NormalizedQuestionnaire {
  const meta = CAREER_TESTS.interest;
  const count = 145;
  const questions = Array.from({ length: count }, (_, i) => ({
    no: i + 1,
    text: `직업흥미검사 문항 ${i + 1} (mock)`,
    choices: [
      { value: '1', label: '매우 싫어한다' },
      { value: '2', label: '싫어한다' },
      { value: '3', label: '보통이다' },
      { value: '4', label: '좋아한다' },
      { value: '5', label: '매우 좋아한다' },
    ],
  }));

  return {
    testTypeId: 'interest',
    qestrnSeq: meta.qestrnSeq.middle,
    testName: meta.name,
    totalQuestions: questions.length,
    estimatedMinutes: meta.estimatedMinutes,
    questions,
  };
}

// --- Public API ---

/**
 * 검사 문항 조회 (V1/V2 자동 분기)
 */
export async function fetchQuestions(
  testTypeId: CareerTestTypeId,
  schoolLevel: 'middle' | 'high'
): Promise<NormalizedQuestionnaire> {
  const meta = CAREER_TESTS[testTypeId];
  const qestrnSeq = meta.qestrnSeq[schoolLevel];
  const config = getApiConfig();

  if (config.mode === 'mock') {
    return meta.apiVersion === 'v2' ? getMockV2Questions() : getMockV1Questions(testTypeId);
  }

  if (meta.apiVersion === 'v1') {
    return fetchV1Questions(config, testTypeId, qestrnSeq);
  }
  return fetchV2Questions(config, testTypeId, qestrnSeq);
}

async function fetchV1Questions(
  config: LiveConfig,
  testTypeId: CareerTestTypeId,
  qestrnSeq: string
): Promise<NormalizedQuestionnaire> {
  const url = `https://www.career.go.kr/inspct/openapi/test/questions?apikey=${encodeURIComponent(config.apiKey)}&q=${encodeURIComponent(qestrnSeq)}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const raw = (await response.json()) as V1RawResponse;
  return normalizeV1Questions(raw, testTypeId, qestrnSeq);
}

async function fetchV2Questions(
  config: LiveConfig,
  testTypeId: CareerTestTypeId,
  qestrnSeq: string
): Promise<NormalizedQuestionnaire> {
  const url = `https://www.career.go.kr/inspct/openapi/v2/test?apikey=${encodeURIComponent(config.apiKey)}&q=${encodeURIComponent(qestrnSeq)}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const raw = (await response.json()) as V2RawQuestionResponse;
  return normalizeV2Questions(raw, testTypeId, qestrnSeq);
}

/**
 * 검사 결과 제출 (V1/V2 자동 분기)
 */
export interface SubmitParams {
  testTypeId: CareerTestTypeId;
  qestrnSeq: string;
  trgetSe: string;
  answers: Record<string, string>;
  startDtm: number;
  name: string;
  gender: string;
  school: string;
  grade: string;
}

export interface SubmitResult {
  inspctSeq: string;
  resultUrl: string;
}

export async function submitReport(params: SubmitParams): Promise<SubmitResult> {
  const meta = CAREER_TESTS[params.testTypeId];
  const config = getApiConfig();

  if (config.mode === 'mock') {
    return {
      inspctSeq: `mock-${Date.now()}`,
      resultUrl: `https://www.career.go.kr/inspct/web/psycho/vocation/report?seq=mock-${Date.now()}`,
    };
  }

  if (meta.apiVersion === 'v1') {
    return submitV1Report(config, params);
  }
  return submitV2Report(config, params);
}

async function submitV1Report(config: LiveConfig, params: SubmitParams): Promise<SubmitResult> {
  const url = 'https://www.career.go.kr/inspct/openapi/test/report';
  const answersString = toV1AnswerString(params.answers);

  const body = {
    apikey: config.apiKey,
    qestrnSeq: params.qestrnSeq,
    trgetSe: params.trgetSe,
    name: params.name,
    gender: params.gender,
    school: params.school,
    grade: params.grade,
    email: '',
    startDtm: params.startDtm,
    answers: answersString,
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const raw = (await response.json()) as V1ReportResponse;

  if (raw.SUCC_YN !== 'Y') {
    throw new Error(`CAREERNET_V1_REPORT_ERROR: ${raw.ERROR_REASON ?? 'Unknown error'}`);
  }

  return {
    inspctSeq: String(raw.RESULT.inspctSeq),
    resultUrl: raw.RESULT.url,
  };
}

async function submitV2Report(config: LiveConfig, params: SubmitParams): Promise<SubmitResult> {
  const url = 'https://www.career.go.kr/inspct/openapi/v2/report';
  const answersArray = toV2AnswerArray(params.answers);

  const body = {
    apikey: config.apiKey,
    qno: Number(params.qestrnSeq),
    trgetse: params.trgetSe,
    gender: params.gender,
    grade: params.grade,
    startdtm: params.startDtm,
    name: params.name,
    school: params.school,
    email: '',
    answers: answersArray,
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const raw = (await response.json()) as V2ReportResponse;

  if (raw.success !== 'Y') {
    throw new Error(`CAREERNET_V2_REPORT_ERROR: ${raw.message ?? 'Unknown error'}`);
  }

  return {
    inspctSeq: raw.result.inspct.inspctseq,
    resultUrl: raw.result.inspct.reporturl,
  };
}
