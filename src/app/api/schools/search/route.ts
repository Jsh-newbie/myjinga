import { NextRequest } from 'next/server';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

const NEIS_API_URL = 'https://open.neis.go.kr/hub/schoolInfo';

const SCHOOL_LEVEL_MAP: Record<string, string> = {
  middle: '중학교',
  high: '고등학교',
};

interface NeisSchoolRow {
  SCHUL_NM: string;
  ORG_RDNMA: string;
  SD_SCHUL_CODE: string;
  ATPT_OFCDC_SC_CODE: string;
}

interface NeisResponse {
  schoolInfo?: [
    { head: [{ list_total_count: number }, { RESULT: { CODE: string; MESSAGE: string } }] },
    { row: NeisSchoolRow[] },
  ];
  RESULT?: { CODE: string; MESSAGE: string };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim();
    const schoolLevel = searchParams.get('schoolLevel') ?? 'high';

    if (!query || query.length < 2) {
      return fail({ code: 'VALIDATION_ERROR', message: '검색어는 2글자 이상이어야 합니다.' }, 400);
    }

    const neisKey = process.env.NEIS_API_KEY;
    if (!neisKey) {
      return fail({ code: 'INTERNAL_ERROR', message: '학교 검색 서비스가 설정되지 않았습니다.' }, 500);
    }

    const schulKnd = SCHOOL_LEVEL_MAP[schoolLevel] ?? '고등학교';

    const params = new URLSearchParams({
      KEY: neisKey,
      Type: 'json',
      pIndex: '1',
      pSize: '20',
      SCHUL_NM: query,
      SCHUL_KND_SC_NM: schulKnd,
    });

    const res = await fetch(`${NEIS_API_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    const data = (await res.json()) as NeisResponse;

    // NEIS returns RESULT.CODE when no data or error
    if (data.RESULT) {
      if (data.RESULT.CODE === 'INFO-200') {
        return ok({ schools: [] });
      }
      return fail(
        { code: 'EXTERNAL_API_ERROR', message: '학교 검색 중 오류가 발생했습니다.', details: { neisCode: data.RESULT.CODE } },
        502
      );
    }

    const rows = data.schoolInfo?.[1]?.row ?? [];

    const schools = rows.map((row) => ({
      name: row.SCHUL_NM,
      address: row.ORG_RDNMA,
      code: `${row.ATPT_OFCDC_SC_CODE}-${row.SD_SCHUL_CODE}`,
    }));

    return ok({ schools });
  } catch (error) {
    const message = error instanceof Error ? error.message : '학교 검색 중 오류가 발생했습니다.';

    return fail(
      { code: 'INTERNAL_ERROR', message: '학교 검색 중 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}
