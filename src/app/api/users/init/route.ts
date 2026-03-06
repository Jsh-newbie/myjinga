import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { initUserSchema, upsertUserProfile } from '@/lib/users/repository';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail({ code: 'VALIDATION_ERROR', message: '유효한 JSON 본문이 필요합니다.' }, 400);
    }

    const parsed = initUserSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다.',
          details: z.flattenError(parsed.error),
        },
        400
      );
    }

    const userData = await upsertUserProfile(authResult.decodedToken.uid, parsed.data);
    return ok({ uid: authResult.decodedToken.uid, profile: userData });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '사용자 초기화 중 오류가 발생했습니다.';

    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '서버 설정 오류가 발생했습니다.',
        details: { message },
      },
      500
    );
  }
}
