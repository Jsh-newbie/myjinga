import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { insightFeedQuerySchema } from '@/lib/insights/schema';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
          details: { reason: authResult.reason },
        },
        401
      );
    }

    const url = new URL(request.url);
    const parsed = insightFeedQuerySchema.safeParse({
      tab: url.searchParams.get('tab') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: '조회 조건이 올바르지 않습니다.',
          details: z.flattenError(parsed.error),
        },
        400
      );
    }

    const { getInsightFeed } = await import('@/lib/insights/feed');
    const result = await getInsightFeed(
      authResult.decodedToken.uid,
      parsed.data.tab ?? 'all',
      parsed.data.limit ?? 12
    );

    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '인사이트 피드 조회 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '인사이트 피드를 불러오지 못했습니다.',
        details: { message },
      },
      500
    );
  }
}
