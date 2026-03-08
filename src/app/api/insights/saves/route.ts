import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { createInsightSaveSchema, listInsightSavesQuerySchema } from '@/lib/insights/schema';

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
    const parsed = listInsightSavesQuerySchema.safeParse({
      status: url.searchParams.get('status') ?? undefined,
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

    const { listInsightSaves } = await import('@/lib/insights/repository');
    const items = await listInsightSaves(authResult.decodedToken.uid, parsed.data);
    return ok({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : '저장한 인사이트를 불러오는 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '저장한 인사이트를 불러오지 못했습니다.',
        details: { message },
      },
      500
    );
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

    const parsed = createInsightSaveSchema.safeParse(body);
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

    const { upsertInsightSave } = await import('@/lib/insights/repository');
    const item = await upsertInsightSave(authResult.decodedToken.uid, parsed.data);
    return ok({ item }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : '인사이트 저장 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '인사이트를 저장하지 못했습니다.',
        details: { message },
      },
      500
    );
  }
}
