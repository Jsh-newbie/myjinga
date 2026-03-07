import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ok, fail } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

const CAREERNET_BASE = 'https://www.career.go.kr/cnet/front/openapi';
const TIMEOUT_MS = 10000;

const searchSchema = z.object({
  jobName: z.string().min(1).optional(),
  jobCode: z.coerce.number().int().optional(),
});

/**
 * GET /api/career-net/jobs?jobName=소프트웨어&jobCode=123
 * 직업백과 검색 (이름 또는 코드)
 */
export async function GET(req: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) {
    return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);
  }

  const apiKey = process.env.CAREERNET_API_KEY?.trim();
  if (!apiKey) {
    return fail({ code: 'INTERNAL_ERROR', message: '커리어넷 API 키가 설정되지 않았습니다.' }, 500);
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = searchSchema.safeParse(params);
  if (!parsed.success) {
    return fail({ code: 'VALIDATION_ERROR', message: '검색어 또는 직업코드가 필요합니다.' }, 400);
  }

  const { jobName, jobCode } = parsed.data;
  if (!jobName && jobCode == null) {
    return fail({ code: 'VALIDATION_ERROR', message: 'jobName 또는 jobCode 중 하나가 필요합니다.' }, 400);
  }

  try {
    // 직업코드가 있으면 상세 조회
    if (jobCode != null) {
      const url = `${CAREERNET_BASE}/job.json?apiKey=${encodeURIComponent(apiKey)}&seq=${jobCode}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) {
        return fail({ code: 'EXTERNAL_API_ERROR', message: '커리어넷 직업백과 조회 실패' }, 502);
      }
      const raw = await res.json() as Record<string, unknown>;
      return ok({ job: normalizeJobDetail(raw) });
    }

    // 이름 검색
    const url = `${CAREERNET_BASE}/jobs.json?apiKey=${encodeURIComponent(apiKey)}&searchJobNm=${encodeURIComponent(jobName!)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      return fail({ code: 'EXTERNAL_API_ERROR', message: '커리어넷 직업백과 검색 실패' }, 502);
    }
    const raw = await res.json() as Record<string, unknown>;
    const jobs = ((raw.jobs ?? []) as Record<string, unknown>[]).map(normalizeJobListItem);
    return ok({ jobs, count: raw.count ?? jobs.length });
  } catch (err) {
    console.error('[career-net/jobs] fetch error', err);
    return fail({ code: 'EXTERNAL_API_ERROR', message: '커리어넷 API 호출 중 오류가 발생했습니다.' }, 502);
  }
}

// 외부 API 원시 응답
function normalizeJobListItem(raw: Record<string, unknown>) {
  return {
    seq: raw.seq,
    jobCode: raw.job_cd,
    jobName: raw.job_nm,
    work: raw.work,
    wage: raw.wage,
    wlb: raw.wlb,
    aptitName: raw.aptit_name,
    relJobName: raw.rel_job_nm,
  };
}

// 외부 API 원시 응답
interface RawJobReady { recruit: string; certificate: string; training: string; curriculum: string }

function normalizeJobDetail(raw: Record<string, unknown>) {
  const base = (raw.baseInfo ?? {}) as Record<string, unknown>;
  const workList = (raw.workList ?? []) as Array<{ work: string }>;
  const departList = (raw.departList ?? []) as Array<{ depart_name: string }>;
  const certiList = (raw.certiList ?? []) as Array<{ certi: string }>;
  const interestList = (raw.interestList ?? []) as Array<{ interest: string }>;
  const abilityList = (raw.abilityList ?? []) as Array<{ ability_name: string }>;
  const researchList = (raw.researchList ?? []) as Array<{ research: string }>;
  const forecastList = (raw.forecastList ?? []) as Array<{ forecast: string }>;
  const jobReadyList = (raw.jobReadyList ?? []) as RawJobReady[];

  return {
    jobCode: base.job_cd,
    jobName: base.job_nm,
    work: workList.map((w) => w.work),
    wage: base.wage,
    wlb: base.wlb,
    satisfication: base.satisfication,
    social: base.social,
    aptitName: base.aptit_name,
    relJobName: base.rel_job_nm,
    stdJobName: base.std_job_nm,
    departments: departList.map((d) => d.depart_name),
    certificates: certiList.map((c) => c.certi),
    interests: interestList.map((i) => i.interest),
    abilities: abilityList.map((a) => a.ability_name),
    research: researchList.map((r) => r.research),
    forecast: forecastList.map((f) => f.forecast),
    jobReady: jobReadyList[0]
      ? {
          recruit: jobReadyList[0].recruit,
          certificate: jobReadyList[0].certificate,
          training: jobReadyList[0].training,
          curriculum: jobReadyList[0].curriculum,
        }
      : undefined,
  };
}
