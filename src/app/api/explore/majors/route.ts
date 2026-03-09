import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ok, fail } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { fetchMajorList } from '@/lib/careernet/major-client';
import { MAJOR_FIELD_CODES } from '@/lib/careernet/major-types';

const querySchema = z.object({
  q: z.string().optional(),
  field: z.string().optional().refine(
    (v) => !v || v in MAJOR_FIELD_CODES,
    { message: '유효하지 않은 계열 코드입니다.' }
  ),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) {
    return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return fail({
      code: 'VALIDATION_ERROR',
      message: '잘못된 요청 파라미터입니다.',
      details: parsed.error.flatten(),
    });
  }

  const { q, field, page, perPage } = parsed.data;

  try {
    const result = await fetchMajorList({
      searchTitle: q,
      subject: field,
      thisPage: page,
      perPage,
    });

    return ok({
      items: result.items,
      totalCount: result.totalCount,
      page,
      perPage,
    });
  } catch (error) {
    console.error('[explore/majors] fetchMajorList error:', error);
    return fail(
      { code: 'EXTERNAL_API_ERROR', message: '학과 정보를 불러오는 데 실패했습니다.' },
      502,
    );
  }
}
