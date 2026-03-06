import { fail, ok } from '@/lib/api/response';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function GET() {
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

    const userRef = getAdminDb().collection('users').doc(authResult.decodedToken.uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
    }

    return ok({ uid: authResult.decodedToken.uid, profile: snapshot.data() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '사용자 프로필을 조회하는 중 오류가 발생했습니다.';

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
