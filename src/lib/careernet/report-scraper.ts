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
  ValuesOrientation,
  ValuesOrientationJob,
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
  // maturity 집계 (API 필드명: attitudes*, ability*, career*, exam*)
  attitudesw?: string | number; attitudesp?: string | number; attitudest?: string | number; attitudeslvl?: string;
  attitudescomment?: string;
  abilityw?: string | number; abilityp?: string | number; abilityt?: string | number; abilitylvl?: string;
  abilitycomment?: string;
  // maturity 행동차원 (career = 진로탐색 준비행동)
  career?: string; careernm?: string;
  careerw?: string | number; careerp?: string | number; careert?: string | number; careerlvl?: string;
  // maturity 수검태도 (exam)
  exam?: string; examnm?: string;
  examw?: string | number; examp?: string | number; examt?: string | number;
  resDesc?: string;
  [key: string]: unknown;
}

// --- Raw types for /data/report{seq}.json ---

// aptitude: { realms: [{ code, name, desc, userDfn1, userDfn3, improves, intrprt, relatedJobs, etc, jobgroups }] }
interface RawAptitudeRealm {
  code: string;
  name: string;
  desc: string;
  userDfn1?: string;
  userDfn3?: string;
  improves?: string[];
  relatedJobs?: Array<{ job_cd: string; name: string }>;
  /** 직업군 설명 텍스트 */
  etc?: string;
  /** 세부직업군별 직업 */
  jobgroups?: Array<{
    jobGroupCode: number;
    jobGroupName: string;
    jobs: Array<{ jobCode: number; jobNm: string; link?: string }>;
  }>;
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
  jobs?: Array<{
    name: string;
    job_cd?: string;
    ordr?: number;
  }>;
  relms?: Array<{
    seq: string;
    codeNm: string;
    codeDc: string;
    sortOrdr?: number;
  }>;
}

// values: 학년 평균 점수 API 응답
interface RawValuesRealmAvg {
  realm: string;
  avg: number | string;
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

// interest: { realms: [{ icode, name, kr, natures, occupation, comments, representative, future, relative }] }
interface RawInterestRealm {
  icode: string;
  name: string;
  kr: string;
  natures?: string[];
  occupation?: string[];
  comments?: string[];
  representative?: Array<{ name: string; no: string }>;
  future?: Array<{ name: string; no: string }>;
  relative?: Array<{ name: string; no: string }>;
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
    jobGroupDescription: r.etc ?? undefined,
    jobGroups: r.jobgroups?.map((jg) => ({
      groupName: jg.jobGroupName,
      jobs: jg.jobs.map((j) => ({ code: j.jobCode, name: j.jobNm })),
    })),
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
    description: (r.comments ?? []).join('\n'),
    interpretations: { high: '', mid: '', low: '' },
    relatedJobs: r.representative?.map((j) => ({ code: j.no, name: j.name })),
    natures: r.natures,
    occupation: r.occupation,
    futureJobs: r.future?.map((j) => ({ code: j.no, name: j.name })),
    relativeJobs: r.relative?.map((j) => ({ code: j.no, name: j.name })),
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

  // 2) 영역 메타 + 3) 추천 직업/학과 + 4) values 학년 평균을 병렬로 fetch
  const fetchPromises: [
    Promise<Record<string, unknown> | null>,
    Promise<RawRecommendResponse | null>,
    Promise<RawValuesRealmAvg[] | null>,
  ] = [
    fetchJson<Record<string, unknown>>(`${BASE}/data/report${raw.qestnrseq}.json`),
    fetchJson<RawRecommendResponse>(`${BASE}/api/inspect/recommendClassificationList?seq=${encodeURIComponent(seq)}`),
    testType === 'values'
      ? fetchJson<RawValuesRealmAvg[]>(`${BASE}/api/inspect/value2realmavg?t=${encodeURIComponent(raw.targetcd)}&g=${encodeURIComponent(raw.grade)}`)
      : Promise.resolve(null),
  ];
  const [staticData, recommendRaw, valuesAvgRaw] = await Promise.all(fetchPromises);

  // Normalize realms from /api/inspect/report
  // aptitude API 필드: score{i}=원점수, w{i}=백분위, t{i}=T점수, p{i} 없음
  // 다른 검사 API 필드: w{i}=원점수, p{i}=백분위, t{i}=T점수
  const isAptitude = testType === 'aptitude';
  const realms: ReportRealm[] = [];
  for (let i = 1; i <= 11; i++) {
    const code = raw[`realm${i}`] as string | undefined;
    const name = raw[`realm${i}nm`] as string | undefined;
    const tScore = raw[`t${i}`] as string | number | undefined;
    const level = (raw[`lvl${i}`] ?? raw[`level${i}`]) as string | undefined;

    let rawScore: string | number | undefined;
    let percentile: string | number | undefined;

    if (isAptitude) {
      rawScore = raw[`score${i}`] as string | number | undefined;
      percentile = raw[`w${i}`] as string | number | undefined;
    } else {
      rawScore = raw[`w${i}`] as string | number | undefined;
      percentile = raw[`p${i}`] as string | number | undefined;
    }

    if (name && (rawScore != null || percentile != null || tScore != null)) {
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

  // maturity: 행동차원 "진로탐색 준비행동"은 career* 필드에 별도 저장됨 → realms에 추가
  if (testType === 'maturity' && raw.careernm) {
    realms.push({
      rank: realms.length + 1,
      code: (raw.career as string) ?? '',
      name: raw.careernm as string,
      rawScore: Number(raw.careerw) || 0,
      percentile: Number(raw.careerp) || 0,
      tScore: Number(raw.careert) || 0,
      level: (raw.careerlvl as string) ?? undefined,
    });
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
        description: (r.comments ?? []).join('\n'),
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
  // API 응답은 점수순으로 정렬되어 있고, itrstcode{i}nm에 "탐구형 (I형)" 형태로 유형명이 들어있음
  // jobcode{i}nm에는 "A유형" 형태로 들어있음
  const interestProfiles = (() => {
    if (testType !== 'interest') return undefined;

    // 이름에서 Holland 코드 추출 헬퍼
    function extractHollandCode(nm: string): string {
      // "탐구형 (I형)" → "I", "A유형" → "A"
      const m = nm.match(/\(([RIASEC])형\)/) ?? nm.match(/^([RIASEC])유형$/);
      return m?.[1] ?? '';
    }
    const HOLLAND_NAMES: Record<string, string> = {
      R: '현실형', I: '탐구형', A: '예술형', S: '사회형', E: '기업형', C: '관습형',
    };

    const interest: HollandProfile[] = [];
    const job: HollandProfile[] = [];
    for (let i = 1; i <= 6; i++) {
      const iNm = (raw[`itrstcode${i}nm`] as string) ?? '';
      const iCode = extractHollandCode(iNm);
      const iWon = raw[`itrstwon${i}`] as string | number | undefined;
      const iP = raw[`itrstp${i}`] as string | number | undefined;
      const iT = raw[`itrstt${i}`] as string | number | undefined;
      if (iCode && (iWon != null || iP != null || iT != null)) {
        interest.push({
          code: iCode,
          name: HOLLAND_NAMES[iCode] ?? iNm,
          rawScore: Number(iWon) || 0,
          percentile: Number(iP) || 0,
          tScore: Number(iT) || 0,
        });
      }

      const jNm = (raw[`jobcode${i}nm`] as string) ?? '';
      const jCode = extractHollandCode(jNm);
      const jWon = raw[`jobwon${i}`] as string | number | undefined;
      const jP = raw[`jobp${i}`] as string | number | undefined;
      const jT = raw[`jobt${i}`] as string | number | undefined;
      if (jCode && (jWon != null || jP != null || jT != null)) {
        job.push({
          code: jCode,
          name: HOLLAND_NAMES[jCode] ?? jNm,
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
    // 하위 영역은 realm{i}, realm{i}nm, realm{i}w에서 점수 추출
    for (let i = 1; i <= 12; i++) {
      const code = (raw[`realm${i}`] as string) ?? `${i}`;
      const name = (raw[`realm${i}nm`] as string) ?? '';
      const userScore = Number(raw[`realm${i}w`] ?? raw[`w${i}`]) || 0;
      if (name) {
        // 12개 하위 가치 설명은 staticData의 realms[].relms[] 에서 추출
        let description = '';
        if (staticData && Array.isArray(staticData.realms)) {
          for (const realm of staticData.realms as RawValuesRealm[]) {
            const found = realm.relms?.find((r) => r.seq === code || r.codeNm === name);
            if (found) { description = found.codeDc ?? ''; break; }
          }
        }
        if (!description) {
          description = realmMeta?.find((m) => m.code === code || m.name === name)?.description ?? '';
        }
        // 학년 평균 점수 매칭
        const avg = valuesAvgRaw?.find((a) => String(a.realm) === code);
        subDimensions.push({
          code,
          name,
          description,
          userScore,
          demographicAvg: avg ? Number(avg.avg) || undefined : undefined,
        });
      }
    }
    return (uppers.length > 0 || subDimensions.length > 0)
      ? { uppers, subDimensions }
      : undefined;
  })();

  // --- Values orientations (4개 가치지향 유형 + 관련 직업) ---
  const valuesOrientations: ValuesOrientation[] | undefined = (() => {
    if (testType !== 'values' || !staticData || !Array.isArray(staticData.realms)) return undefined;
    const rawRealms = staticData.realms as RawValuesRealm[];
    const orientations: ValuesOrientation[] = rawRealms.map((r) => {
      // upper score 매칭: upper{i} seq와 realm seq 비교
      let score = 0;
      for (let i = 1; i <= 4; i++) {
        if (String(raw[`upper${i}`]) === r.seq) {
          score = Number(raw[`upper${i}w`]) || 0;
          break;
        }
      }
      const subValues = (r.relms ?? []).map((rl) => rl.codeNm);
      const jobs: ValuesOrientationJob[] = (r.jobs ?? []).map((j) => ({
        name: j.name,
        jobCode: j.job_cd ?? undefined,
      }));
      return {
        code: r.seq,
        name: r.codeNm,
        description: r.codeDc ?? '',
        score,
        subValues,
        jobs,
      };
    });
    return orientations.length > 0 ? orientations : undefined;
  })();

  // --- Maturity aggregates ---
  // API 필드명: attitudes(w/p/t/lvl), ability(w/p/t/lvl), career(w/p/t/lvl), exam(w/p/t)
  const maturityAggregates = (() => {
    if (testType !== 'maturity') return undefined;
    const agg: Record<string, AggregateScore> = {};
    // [표시키, w필드, p필드, t필드, lvl필드]
    const fields: Array<[string, string, string, string, string]> = [
      ['attitude', 'attitudesw', 'attitudesp', 'attitudest', 'attitudeslvl'],
      ['ability', 'abilityw', 'abilityp', 'abilityt', 'abilitylvl'],
      ['career', 'careerw', 'careerp', 'careert', 'careerlvl'],
      ['exam', 'examw', 'examp', 'examt', ''],
    ];
    for (const [key, wf, pf, tf, lf] of fields) {
      const w = raw[wf] as string | number | undefined;
      const p = raw[pf] as string | number | undefined;
      const t = raw[tf] as string | number | undefined;
      const lvl = lf ? ((raw[lf] as string) ?? '') : '';
      if (w != null || p != null || t != null) {
        agg[key] = {
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

  // --- Interest: 선호직업 백분위 (Part 2) ---
  const jobPercentiles = (() => {
    if (testType !== 'interest' || !interestProfiles) return undefined;
    const HOLLAND_OCCUPATION: Record<string, string[]> = {
      R: ['기계기술', '사회안전', '농림환경', '운동'],
      I: ['이학공학연구', '인문사회연구'],
      A: ['음악', '미술', '문학', '방송영상'],
      S: ['교육', '사회복지서비스'],
      E: ['관리경영', '사회언론', '영업판매'],
      C: ['사무법률행정', '세무회계'],
    };
    const items: Array<{ code: string; name: string; occupation: string[]; percentile: number }> = [];
    for (let i = 1; i <= 6; i++) {
      const jNm = (raw[`jobcode${i}nm`] as string) ?? '';
      const m = jNm.match(/\(([RIASEC])형\)/) ?? jNm.match(/^([RIASEC])유형$/);
      const code = m?.[1] ?? '';
      const jP = Number(raw[`jobp${i}`]) || 0;
      const NAMES: Record<string, string> = {
        R: '현실형', I: '탐구형', A: '예술형', S: '사회형', E: '기업형', C: '관습형',
      };
      if (code) {
        items.push({
          code,
          name: NAMES[code] ?? jNm,
          occupation: HOLLAND_OCCUPATION[code] ?? [],
          percentile: jP,
        });
      }
    }
    return items.length > 0 ? items : undefined;
  })();

  // --- Interest: 일치정도 ---
  const interestCongruence = (() => {
    if (testType !== 'interest') return undefined;
    const congruence = raw.congruence as string | undefined;
    const congruenceDesc = raw.congruenceDesc as string | undefined;
    if (!congruence && !congruenceDesc) {
      // 일치정도를 일반흥미 top2 vs 선호직업 top2 코드 비교로 계산
      if (interestProfiles) {
        const iTop2 = [...interestProfiles.interest].sort((a, b) => b.tScore - a.tScore).slice(0, 2).map((p) => p.code);
        const jTop2 = [...interestProfiles.job].sort((a, b) => b.tScore - a.tScore).slice(0, 2).map((p) => p.code);
        const matched = iTop2.filter((c) => jTop2.includes(c)).length;
        if (matched === 2) {
          return {
            level: '일치',
            description: '일반흥미와 선호직업군이 일치합니다. 자신의 흥미를 잘 알고 있으며, 흥미에 맞는 직업을 선호하고 있습니다.',
          };
        }
        return {
          level: '불일치',
          description: '일반흥미와 선호직업이 같거나 다르다고 하여 좋고 나쁜 것은 없습니다. 성장하면서 또는 상황에 따라 결과가 달라질 수 있습니다. 구체적인 내용이 궁금하다면 활용안내서에 제시된 해석상담을 활용해주세요.',
        };
      }
      return undefined;
    }
    return { level: congruence ?? '', description: congruenceDesc ?? '' };
  })();

  // --- Interest: 진로활동 방법 ---
  const careerActivities = (() => {
    if (testType !== 'interest') return undefined;
    const activities = [
      '내가 선호하는 직업들의 실제 작업 환경을 체험해보며 자신의 직업 흥미를 확인해 보기',
      '나의 흥미 유형과 관련된 동아리에 가입하여 활동해 보기',
      '내가 선호하는 직업군과 관련된 공부를 하거나 일하는 선배를 만나, 보다 세부적인 정보를 알아보기',
      '학교 졸업 후, 만족스런 직업생활을 영위하기 위하여 필요한 학과 선택 및 준비가 무엇인지 알아보기',
      '나의 흥미 및 선호 직업의 변화에 지속적인 관심을 가져보기',
    ];
    return activities;
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
    schemaVersion: 7,
    realms,
    ...(realmMeta && { realmMeta }),
    ...(realmInterpretations && { realmInterpretations }),
    ...(competencyGroups && { competencyGroups }),
    ...(interestProfiles && { interestProfiles }),
    ...(testType === 'interest' && raw.sincerity != null && {
      interestSincerity: Number(raw.sincerity) || 0,
    }),
    ...(testType === 'interest' && raw.choiceratio1 != null && {
      interestChoiceRatios: [
        { label: '매우 싫어한다', ratio: Number(raw.choiceratio1) || 0 },
        { label: '싫어한다', ratio: Number(raw.choiceratio2) || 0 },
        { label: '보통이다', ratio: Number(raw.choiceratio3) || 0 },
        { label: '좋아한다', ratio: Number(raw.choiceratio4) || 0 },
        { label: '매우 좋아한다', ratio: Number(raw.choiceratio5) || 0 },
      ],
    }),
    ...(jobPercentiles && { jobPercentiles }),
    ...(interestCongruence && { interestCongruence }),
    ...(careerActivities && { careerActivities }),
    ...(valuesHierarchy && { valuesHierarchy }),
    ...(valuesOrientations && { valuesOrientations }),
    ...(maturityAggregates && { maturityAggregates }),
    ...(maturityConsistency && { maturityConsistency }),
    ...(recommendedJobs && { recommendedJobs }),
    ...(recommendedMajors && { recommendedMajors }),
  };
}
