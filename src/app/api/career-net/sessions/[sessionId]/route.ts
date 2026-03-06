import { fail, ok } from '@/lib/api/response';
import { deleteTestSession, getTestSession } from '@/lib/careernet/repository';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: { sessionId: string } }
) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    const session = await getTestSession(authResult.decodedToken.uid, context.params.sessionId);
    if (!session) {
      return fail({ code: 'NOT_FOUND', message: '검사 세션을 찾을 수 없습니다.' }, 404);
    }

    return ok({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : '세션 조회 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { sessionId: string } }
) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    const uid = authResult.decodedToken.uid;
    const session = await getTestSession(uid, context.params.sessionId);
    if (!session) {
      return fail({ code: 'NOT_FOUND', message: '검사 세션을 찾을 수 없습니다.' }, 404);
    }

    await deleteTestSession(uid, context.params.sessionId);
    return ok({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '세션 삭제 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}
