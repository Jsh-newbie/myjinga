/**
 * 커리어넷 결과 URL에서 seq를 추출하고,
 * 결과 페이지가 사용하는 공개 데이터를 fetch하여 정규화된 결과를 반환한다.
 *
 * 3개 소스:
 * 1. /api/inspect/report?seq=        → 영역별 점수 (rawScore, percentile, tScore, level)
 * 2. /data/report{검사번호}.json      → 영역 설명, 수준별 해석 텍스트, 팁
 * 3. /api/inspect/recommendClassificationList?seq= → 추천 직업/학과
 */

import type {
  AggregateScore,
  CompetencyGroupScore,
  HollandProfile,
  RealmInterpretation,
  RealmMeta,
  RecommendedJob,
  RecommendedMajor,
  ReportDetail,
  ReportRealm,
  ValuesSubDim,
  ValuesUpper,
} from '@/lib/careernet/types';

const BASE = 'https://www.career.go.kr/cloud';
const TIMEOUT_MS = 10000;

// --- Raw types for /api/inspect/report ---

interface RawReportJson {
  inspctseq: string;
  qestnrseq: string;
  gender: string;
  gendercd: string | null;
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
  resscore?: number;
  // 상위 영역 (competency)
  design?: string;
  designnm?: string;
  designw?: string;
  designp?: string;
  designt?: string;
  designlvl?: string;
  prepare?: string;
  preparenm?: string;
  preparew?: string;
  preparep?: string;
  preparet?: string;
  preparelvl?: string;
  // maturity 집계
  attitudew?: string; attitudep?: string; attitudet?: string; attitudelvl?: string;
  abilityw?: string; abilityp?: string; abilityt?: string; abilitylvl?: string;
  careerw?: string; careerp?: string; careert?: string;
  examw?: string; examp?: string; examt?: string;
  resDesc?: string;
  [key: string]: unknown;
}

// --- Raw types for /data/report{seq}.json ---

// aptitude: { realms: [{ code, name, desc, userDfn1, userDfn3, improves, intrprt, relatedJobs }] }
interface RawAptitudeRealm {
  code: string;
  name: string;
  desc: string;
  userDfn1?: string;
  userDfn3?: string;
  improves?: string[];
  relatedJobs?: Array<{ job_cd: string; name: string }>;
  intrprt?: {
    upptValue?: string;
    middlValue?: string;
    lwptValue?: string;
  };
}

// maturity: { realms: [{ seq, name, cmt, high, mid, low, dc }], attitude, ability, honesty }
interface RawMaturityRealm {
  seq: string;
  name: string;
  cmt?: string;
  cn?: string;
  high?: string;
  mid?: string;
  low?: string;
  dc?: string;
}

// values: { realms: [{ seq, codeNm, codeDc, jobs, relms }] }
interface RawValuesRealm {
  seq: string;
  codeNm: string;
  codeDc: string;
  relms?: Array<{
    seq: string;
    codeNm: string;
    codeDc: string;
  }>;
}

// competency: { plans: [{ seq, codeNm, comment, userDfn1/2/3, tips }], readys: [...], plan, ready }
interface RawCompetencySubRealm {
  seq: string;
  codeNm: string;
  codeDc?: string;
  comment?: string;
  userDfn1?: string;
  userDfn2?: string;
  userDfn3?: string;
  tips?: string[];
  etc?: string;
}

// interest: { realms: [{ icode, name, kr, natures, occupation, comments, representative, future, majors }] }
interface RawInterestRealm {
  icode: string;
  name: string;
  kr: string;
  natures?: string[];
  occupation?: string[];
  comments?: string[];
  representative?: Array<{ name: string; no: string }>;
  future?: Array<{ name: string; no: string }>;
  majors?: Array<{ name: string; no: string }>;
}

// --- Raw types for recommend API ---

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

/**
 * qestnrseq → testTypeId 매핑
 */
function resolveTestType(qestnrseq: string): string {
  const map: Record<string, string> = {
    '20': 'aptitude', '21': 'aptitude',
    '33': 'interest', '34': 'interest',
    '22': 'maturity', '23': 'maturity',
    '24': 'values', '25': 'values',
    '26': 'competency', '27': 'competency',
  };
  return map[qestnrseq] ?? 'unknown';
}

// --- Realm interpretation parsers per test type ---

function parseAptitudeInterpretations(data: { realms?: RawAptitudeRealm[] }): RealmInterpretation[] {
  if (!data.realms) return [];
  return data.realms.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.desc ?? '',
    interpretations: {
      high: r.intrprt?.upptValue ?? r.userDfn1 ?? '',
      mid: r.intrprt?.middlValue ?? '',
      low: r.intrprt?.lwptValue ?? r.userDfn3 ?? '',
    },
    improves: r.improves,
    relatedJobs: r.relatedJobs?.map((j) => ({ code: j.job_cd, name: j.name })),
  }));
}

function parseMaturityInterpretations(data: { realms?: RawMaturityRealm[] }): RealmInterpretation[] {
  if (!data.realms) return [];
  return data.realms.map((r) => ({
    code: r.seq,
    name: r.name,
    description: r.cmt ?? '',
    interpretations: {
      high: r.high ?? '',
      mid: r.mid ?? '',
      low: r.low ?? r.cn ?? '',
    },
    tips: r.dc ? r.dc.split(/<br\s*\/?>/).filter(Boolean) : undefined,
  }));
}

function parseValuesInterpretations(data: { realms?: RawValuesRealm[] }): RealmInterpretation[] {
  if (!data.realms) return [];
  return data.realms.map((r) => ({
    code: r.seq,
    name: r.codeNm,
    description: r.codeDc ?? '',
    interpretations: { high: '', mid: '', low: '' },
  }));
}

function parseCompetencyInterpretations(
  data: { plans?: RawCompetencySubRealm[]; readys?: RawCompetencySubRealm[] }
): RealmInterpretation[] {
  const results: RealmInterpretation[] = [];

  for (const r of data.plans ?? []) {
    results.push({
      code: r.seq,
      name: r.codeNm,
      description: r.comment ?? '',
      interpretations: {
        high: r.userDfn1 ?? '',
        mid: r.userDfn2 ?? '',
        low: r.userDfn3 ?? '',
      },
      tips: r.tips,
      category: '진로설계',
    });
  }

  for (const r of data.readys ?? []) {
    results.push({
      code: r.seq,
      name: r.codeNm,
      description: r.comment ?? '',
      interpretations: {
        high: r.userDfn1 ?? '',
        mid: r.userDfn2 ?? '',
        low: r.userDfn3 ?? '',
      },
      tips: r.tips,
      category: '진로준비',
    });
  }

  return results;
}

function parseInterestInterpretations(data: { realms?: RawInterestRealm[] }): RealmInterpretation[] {
  if (!data.realms) return [];
  return data.realms.map((r) => ({
    code: r.icode,
    name: r.kr,
    description: (r.comments ?? []).join(' '),
    interpretations: { high: '', mid: '', low: '' },
    relatedJobs: r.representative?.map((j) => ({ code: j.no, name: j.name })),
  }));
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

  const testType = resolveTestType(raw.qestnrseq);

  // 2) 영역 메타 + 3) 추천 직업/학과를 병렬로 fetch
  const [staticData, recommendRaw] = await Promise.all([
    fetchJson<Record<string, unknown>>(`${BASE}/data/report${raw.qestnrseq}.json`),
    fetchJson<RawRecommendResponse>(`${BASE}/api/inspect/recommendClassificationList?seq=${encodeURIComponent(seq)}`),
  ]);

  // Normalize realms from /api/inspect/report
  const realms: ReportRealm[] = [];
  for (let i = 1; i <= 11; i++) {
    const code = raw[`realm${i}`] as string | undefined;
    const name = raw[`realm${i}nm`] as string | undefined;
    const rawScore = raw[`w${i}`] as string | number | undefined;
    const percentile = raw[`p${i}`] as string | number | undefined;
    const tScore = raw[`t${i}`] as string | number | undefined;
    const level = (raw[`lvl${i}`] ?? raw[`level${i}`]) as string | undefined;

    if (name && (rawScore != null || tScore != null)) {
      realms.push({
        rank: i,
        code: code ?? '',
        name,
        rawScore: Number(rawScore) || 0,
        percentile: Number(percentile) || 0,
        tScore: Number(tScore) || 0,
        level: level ?? undefined,
      });
    }
  }

  // Normalize realm meta (legacy format for backward compat)
  const realmMeta: RealmMeta[] | undefined = (() => {
    if (!staticData) return undefined;
    // aptitude has realms[] with { code, name, desc }
    if (testType === 'aptitude' && Array.isArray(staticData.realms)) {
      return (staticData.realms as RawAptitudeRealm[]).map((r) => ({
        code: r.code,
        name: r.name,
        description: r.desc,
      }));
    }
    // maturity has realms[] with { seq, name, cmt }
    if (testType === 'maturity' && Array.isArray(staticData.realms)) {
      return (staticData.realms as RawMaturityRealm[]).map((r) => ({
        code: r.seq,
        name: r.name,
        description: r.cmt ?? '',
      }));
    }
    // competency: build from plans + readys
    if (testType === 'competency') {
      const items: RealmMeta[] = [];
      for (const r of (staticData.plans as RawCompetencySubRealm[] | undefined) ?? []) {
        items.push({ code: r.seq, name: r.codeNm, description: r.comment ?? '' });
      }
      for (const r of (staticData.readys as RawCompetencySubRealm[] | undefined) ?? []) {
        items.push({ code: r.seq, name: r.codeNm, description: r.comment ?? '' });
      }
      return items.length > 0 ? items : undefined;
    }
    // interest: realms[] with { icode, kr, comments }
    if (testType === 'interest' && Array.isArray(staticData.realms)) {
      return (staticData.realms as RawInterestRealm[]).map((r) => ({
        code: r.icode,
        name: r.kr,
        description: (r.comments ?? []).join(' '),
      }));
    }
    // values: realms[] with { seq, codeNm, codeDc }
    if (testType === 'values' && Array.isArray(staticData.realms)) {
      return (staticData.realms as RawValuesRealm[]).map((r) => ({
        code: r.seq,
        name: r.codeNm,
        description: r.codeDc,
      }));
    }
    return undefined;
  })();

  // Parse realm interpretations (detailed per-realm analysis)
  const realmInterpretations: RealmInterpretation[] | undefined = (() => {
    if (!staticData) return undefined;
    let result: RealmInterpretation[] = [];
    switch (testType) {
      case 'aptitude':
        result = parseAptitudeInterpretations(staticData as { realms?: RawAptitudeRealm[] });
        break;
      case 'maturity':
        result = parseMaturityInterpretations(staticData as { realms?: RawMaturityRealm[] });
        break;
      case 'values':
        result = parseValuesInterpretations(staticData as { realms?: RawValuesRealm[] });
        break;
      case 'competency':
        result = parseCompetencyInterpretations(
          staticData as { plans?: RawCompetencySubRealm[]; readys?: RawCompetencySubRealm[] }
        );
        break;
      case 'interest':
        result = parseInterestInterpretations(staticData as { realms?: RawInterestRealm[] });
        break;
    }
    return result.length > 0 ? result : undefined;
  })();

  // Competency group scores (진로설계/진로준비)
  const competencyGroups: CompetencyGroupScore[] | undefined = (() => {
    if (testType !== 'competency') return undefined;
    const groups: CompetencyGroupScore[] = [];
    if (raw.designt != null) {
      // 평균 계산: plans의 tScore 평균
      const planRealms = realms.filter((r) =>
        realmInterpretations?.some((ri) => ri.code === r.code && ri.category === '진로설계')
      );
      const planAvg = planRealms.length > 0
        ? planRealms.reduce((sum, r) => sum + r.tScore, 0) / planRealms.length
        : 0;
      groups.push({
        code: raw.design as string,
        name: raw.designnm as string ?? '진로설계',
        tScore: Number(raw.designt),
        level: raw.designlvl as string ?? '',
        avgScore: Math.round(planAvg),
      });
    }
    if (raw.preparet != null) {
      const readyRealms = realms.filter((r) =>
        realmInterpretations?.some((ri) => ri.code === r.code && ri.category === '진로준비')
      );
      const readyAvg = readyRealms.length > 0
        ? readyRealms.reduce((sum, r) => sum + r.tScore, 0) / readyRealms.length
        : 0;
      groups.push({
        code: raw.prepare as string,
        name: raw.preparenm as string ?? '진로준비',
        tScore: Number(raw.preparet),
        level: raw.preparelvl as string ?? '',
        avgScore: Math.round(readyAvg),
      });
    }
    return groups.length > 0 ? groups : undefined;
  })();

  // --- Interest profiles (Holland 6유형) ---
  const interestProfiles = (() => {
    if (testType !== 'interest') return undefined;
    const HOLLAND_CODES = ['R', 'I', 'A', 'S', 'E', 'C'];
    const HOLLAND_NAMES: Record<string, string> = {
      R: '현실형', I: '탐구형', A: '예술형', S: '사회형', E: '진취형', C: '관습형',
    };
    const interest: HollandProfile[] = [];
    const job: HollandProfile[] = [];
    for (let i = 1; i <= 6; i++) {
      const code = HOLLAND_CODES[i - 1];
      const iWon = raw[`itrstwon${i}`] as string | number | undefined;
      const iP = raw[`itrstp${i}`] as string | number | undefined;
      const iT = raw[`itrstt${i}`] as string | number | undefined;
      if (iWon != null || iP != null || iT != null) {
        interest.push({
          code,
          name: HOLLAND_NAMES[code] ?? code,
          rawScore: Number(iWon) || 0,
          percentile: Number(iP) || 0,
          tScore: Number(iT) || 0,
        });
      }
      const jWon = raw[`jobwon${i}`] as string | number | undefined;
      const jP = raw[`jobp${i}`] as string | number | undefined;
      const jT = raw[`jobt${i}`] as string | number | undefined;
      if (jWon != null || jP != null || jT != null) {
        job.push({
          code,
          name: HOLLAND_NAMES[code] ?? code,
          rawScore: Number(jWon) || 0,
          percentile: Number(jP) || 0,
          tScore: Number(jT) || 0,
        });
      }
    }
    return (interest.length > 0 || job.length > 0) ? { interest, job } : undefined;
  })();

  // --- Values hierarchy (상위 4개 + 하위 12개) ---
  const valuesHierarchy = (() => {
    if (testType !== 'values') return undefined;
    const uppers: ValuesUpper[] = [];
    for (let i = 1; i <= 4; i++) {
      const code = (raw[`upper${i}`] as string) ?? `U${i}`;
      const name = (raw[`upper${i}nm`] as string) ?? '';
      const score = Number(raw[`upper${i}w`]) || 0;
      if (name) uppers.push({ code, name, score });
    }
    const subDimensions: ValuesSubDim[] = [];
    // 하위 영역은 realm1~realm12에서 점수 추출
    for (let i = 1; i <= 12; i++) {
      const code = (raw[`realm${i}`] as string) ?? `${i}`;
      const name = (raw[`realm${i}nm`] as string) ?? '';
      const userScore = Number(raw[`realm${i}w`] ?? raw[`w${i}`]) || 0;
      if (name) {
        const meta = realmMeta?.find((m) => m.code === code || m.name === name);
        subDimensions.push({
          code,
          name,
          description: meta?.description ?? '',
          userScore,
        });
      }
    }
    return (uppers.length > 0 || subDimensions.length > 0)
      ? { uppers, subDimensions }
      : undefined;
  })();

  // --- Maturity aggregates ---
  const maturityAggregates = (() => {
    if (testType !== 'maturity') return undefined;
    const agg: Record<string, AggregateScore> = {};
    const keys = ['attitude', 'ability', 'career', 'exam'] as const;
    for (const k of keys) {
      const w = raw[`${k}w`] as string | undefined;
      const p = raw[`${k}p`] as string | undefined;
      const t = raw[`${k}t`] as string | undefined;
      const lvl = (raw[`${k}lvl`] as string) ?? '';
      if (w != null || p != null || t != null) {
        agg[k] = {
          rawScore: Number(w) || 0,
          percentile: Number(p) || 0,
          tScore: Number(t) || 0,
          level: lvl,
        };
      }
    }
    return Object.keys(agg).length > 0 ? agg : undefined;
  })();

  const maturityConsistency = (() => {
    if (testType !== 'maturity') return undefined;
    const desc = raw.resDesc as string | undefined;
    if (!desc) return undefined;
    // resDesc에서 수준 추출 (예: "일관성 있는 응답...")
    let level = '확인필요';
    if (desc.includes('일관성')) level = '일관';
    if (desc.includes('비일관') || desc.includes('주의')) level = '비일관';
    return { level, description: desc };
  })();

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
    responseScore: raw.resscore,
    schemaVersion: 2,
    realms,
    ...(realmMeta && { realmMeta }),
    ...(realmInterpretations && { realmInterpretations }),
    ...(competencyGroups && { competencyGroups }),
    ...(interestProfiles && { interestProfiles }),
    ...(valuesHierarchy && { valuesHierarchy }),
    ...(maturityAggregates && { maturityAggregates }),
    ...(maturityConsistency && { maturityConsistency }),
    ...(recommendedJobs && { recommendedJobs }),
    ...(recommendedMajors && { recommendedMajors }),
  };
}
