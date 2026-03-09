import { NextRequest } from 'next/server';

import { ok, fail } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { fetchMajorDetail } from '@/lib/careernet/major-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { majorSeq: string } },
) {
  const auth = await verifyBearerToken();
  if (!auth.ok) {
    return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);
  }

  const { majorSeq } = params;

  if (!majorSeq || !/^\d+$/.test(majorSeq)) {
    return fail({ code: 'VALIDATION_ERROR', message: '유효하지 않은 학과코드입니다.' });
  }

  try {
    const detail = await fetchMajorDetail(majorSeq);

    if (!detail) {
      return fail({ code: 'NOT_FOUND', message: '해당 학과를 찾을 수 없습니다.' }, 404);
    }

    return ok({ major: detail });
  } catch (error) {
    console.error('[explore/majors/detail] fetchMajorDetail error:', error);
    return fail(
      { code: 'EXTERNAL_API_ERROR', message: '학과 상세 정보를 불러오는 데 실패했습니다.' },
      502,
    );
  }
}
