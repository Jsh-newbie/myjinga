import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { createRecordSchema, listRecordsQuerySchema } from '@/lib/records/schema';
import { createRecord, listRecords } from '@/lib/records/repository';

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
    const parsed = listRecordsQuerySchema.safeParse({
      category: url.searchParams.get('category') ?? undefined,
      semester: url.searchParams.get('semester') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
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

    const result = await listRecords(authResult.decodedToken.uid, parsed.data);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록 목록 조회 중 오류가 발생했습니다.';
    console.error('[records][GET] failed', error);
    return ok({
      items: [],
      nextCursor: null,
      warning: {
        code: 'RECORDS_LIST_FALLBACK',
        message,
      },
    });
  }
}

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

    const parsed = createRecordSchema.safeParse(body);
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

    try {
      const record = await createRecord(authResult.decodedToken.uid, parsed.data);
      return ok({ record }, 201);
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
      }

      if (error instanceof Error && error.message === 'AI_DRAFT_FORBIDDEN') {
        return fail({ code: 'FORBIDDEN', message: 'AI 초안은 프리미엄 사용자만 사용할 수 있습니다.' }, 403);
      }

      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록 생성 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.',
        details: { message },
      },
      500
    );
  }
}
