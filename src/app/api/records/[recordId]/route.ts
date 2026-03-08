import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { updateRecordSchema } from '@/lib/records/schema';
import { deleteRecord, getRecord, updateRecord } from '@/lib/records/repository';

export const runtime = 'nodejs';

type RouteContext = {
  params: {
    recordId: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
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

    const record = await getRecord(authResult.decodedToken.uid, context.params.recordId);
    if (!record) {
      return fail({ code: 'NOT_FOUND', message: '기록을 찾을 수 없습니다.' }, 404);
    }

    return ok({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록 조회 중 오류가 발생했습니다.';
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

export async function PATCH(request: Request, context: RouteContext) {
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

    const parsed = updateRecordSchema.safeParse(body);
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
      const record = await updateRecord(authResult.decodedToken.uid, context.params.recordId, parsed.data);
      if (!record) {
        return fail({ code: 'NOT_FOUND', message: '기록을 찾을 수 없습니다.' }, 404);
      }

      return ok({ record });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_HOURS_CATEGORY') {
        return fail({ code: 'VALIDATION_ERROR', message: '봉사 기록에서만 시간(hours)을 수정할 수 있습니다.' }, 400);
      }

      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
      }

      if (error instanceof Error && error.message === 'AI_DRAFT_FORBIDDEN') {
        return fail({ code: 'FORBIDDEN', message: 'AI 초안은 프리미엄 사용자만 사용할 수 있습니다.' }, 403);
      }

      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록 수정 중 오류가 발생했습니다.';
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

export async function DELETE(_request: Request, context: RouteContext) {
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

    const deleted = await deleteRecord(authResult.decodedToken.uid, context.params.recordId);
    if (!deleted) {
      return fail({ code: 'NOT_FOUND', message: '기록을 찾을 수 없습니다.' }, 404);
    }

    return ok({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '기록 삭제 중 오류가 발생했습니다.';
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
