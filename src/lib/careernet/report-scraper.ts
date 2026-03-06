/**
 * 커리어넷 결과 URL에서 seq를 추출하고,
 * 결과 페이지가 사용하는 공개 데이터를 fetch하여 정규화된 결과를 반환한다.
 *
 * 3개 소스:
 * 1. /api/inspect/report?seq=        → 영역별 점수
 * 2. /data/report{검사번호}.json      → 영역 설명 (정적)
 * 3. /api/inspect/recommendClassificationList?seq= → 추천 직업/학과
 */

import type {
  RealmMeta,
  RecommendedJob,
  RecommendedMajor,
  ReportDetail,
  ReportRealm,
} from '@/lib/careernet/types';

const BASE = 'https://www.career.go.kr/cloud';
const TIMEOUT_MS = 10000;

// --- Raw types ---

interface RawReportJson {
  inspctseq: string;
  qestnrseq: string;
  gender: string;
  gendercd: string;
  target: string;
  targetcd: string;
  name: string;
  grade: string;
  school: string | null;
  comptdtm: string;
  begindtm: string;
  enddtm: string;
  restime: number;
  respattern: string | null;
  [key: string]: unknown;
}

interface RawRealmMeta {
  code: string;
  name: string;
  desc: string;
}

interface RawRecommendJob {
  job_nm: string;
  job_cd: number;
  work: string;
  thumbnail?: string;
}

interface RawRecommendMajor {
  major_nm: string;
  seq: number;
  major_sumry: string;
  thumbnail?: string;
}

interface RawRecommendResponse {
  jobList?: RawRecommendJob[];
  departContents?: RawRecommendMajor[];
}

interface RawRealmMetaResponse {
  realms?: RawRealmMeta[];
}

// --- Helpers ---

export function extractSeqFromUrl(resultUrl: string): string | null {
  try {
    const url = new URL(resultUrl);
    return url.searchParams.get('seq');
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --- Public ---

/**
 * 결과 URL에서 모든 데이터를 fetch하여 정규화된 ReportDetail을 반환한다.
 * 실패 시 null을 반환한다 (결과 저장 자체는 실패하면 안 되므로).
 */
export async function fetchReportDetail(resultUrl: string): Promise<ReportDetail | null> {
  const seq = extractSeqFromUrl(resultUrl);
  if (!seq) return null;

  // 1) 핵심 결과 데이터
  const raw = await fetchJson<RawReportJson>(`${BASE}/api/inspect/report?seq=${encodeURIComponent(seq)}`);
  if (!raw) return null;

  // 2) 영역 메타 + 3) 추천 직업/학과를 병렬로 fetch
  const [realmMetaRaw, recommendRaw] = await Promise.all([
    fetchJson<RawRealmMetaResponse>(`${BASE}/data/report${raw.qestnrseq}.json`),
    fetchJson<RawRecommendResponse>(`${BASE}/api/inspect/recommendClassificationList?seq=${encodeURIComponent(seq)}`),
  ]);

  // Normalize realms
  const realms: ReportRealm[] = [];
  for (let i = 1; i <= 11; i++) {
    const code = raw[`realm${i}`] as string | undefined;
    const name = raw[`realm${i}nm`] as string | undefined;
    const score = raw[`score${i}`] as number | undefined;
    const percentile = raw[`w${i}`] as number | undefined;
    const tScore = raw[`t${i}`] as number | undefined;

    if (name && percentile != null) {
      realms.push({
        rank: i,
        code: code ?? '',
        name,
        rawScore: score ?? 0,
        percentile,
        tScore: tScore ?? 0,
      });
    }
  }

  // Normalize realm meta (descriptions)
  const realmMeta: RealmMeta[] | undefined = realmMetaRaw?.realms?.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.desc,
  }));

  // Normalize recommended jobs
  const recommendedJobs: RecommendedJob[] | undefined = recommendRaw?.jobList?.map((j) => ({
    name: j.job_nm,
    code: j.job_cd,
    description: j.work,
    thumbnail: j.thumbnail || undefined,
  }));

  // Normalize recommended majors
  const recommendedMajors: RecommendedMajor[] | undefined = recommendRaw?.departContents?.map((d) => ({
    name: d.major_nm,
    seq: d.seq,
    summary: d.major_sumry,
    thumbnail: d.thumbnail || undefined,
  }));

  return {
    inspctSeq: raw.inspctseq,
    testCode: raw.qestnrseq,
    gender: raw.gender,
    target: raw.target,
    grade: raw.grade,
    completedAt: raw.comptdtm,
    responseTime: raw.restime,
    responsePattern: raw.respattern ?? undefined,
    realms,
    ...(realmMeta && { realmMeta }),
    ...(recommendedJobs && { recommendedJobs }),
    ...(recommendedMajors && { recommendedMajors }),
  };
}
