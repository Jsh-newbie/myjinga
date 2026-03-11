import { fail, ok } from '@/lib/api/response';
import { getDashboardBootstrap } from '@/lib/dashboard/bootstrap';
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

    const data = await getDashboardBootstrap(authResult.decodedToken.uid);
    if (!data) {
      return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
    }

    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '대시보드 초기 데이터 조회 중 오류가 발생했습니다.';
    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '대시보드 초기 데이터를 불러오지 못했습니다.',
        details: { message },
      },
      500
    );
  }
}
