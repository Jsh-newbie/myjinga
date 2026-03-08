import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { updateInsightSaveSchema } from '@/lib/insights/schema';

export const runtime = 'nodejs';

type Params = {
  params: {
    saveId: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
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

    const parsed = updateInsightSaveSchema.safeParse(body);
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

    const { updateInsightSave } = await import('@/lib/insights/repository');
    const item = await updateInsightSave(authResult.decodedToken.uid, params.saveId, parsed.data);
    if (!item) {
      return fail({ code: 'NOT_FOUND', message: '저장한 인사이트를 찾을 수 없습니다.' }, 404);
    }

    return ok({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : '인사이트 수정 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '인사이트를 수정하지 못했습니다.',
        details: { message },
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
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

    const { deleteInsightSave } = await import('@/lib/insights/repository');
    const deleted = await deleteInsightSave(authResult.decodedToken.uid, params.saveId);
    if (!deleted) {
      return fail({ code: 'NOT_FOUND', message: '저장한 인사이트를 찾을 수 없습니다.' }, 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '인사이트 삭제 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '인사이트를 삭제하지 못했습니다.',
        details: { message },
      },
      500
    );
  }
}
