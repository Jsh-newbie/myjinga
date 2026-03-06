import { fail, ok } from '@/lib/api/response';
import { listTestResults } from '@/lib/careernet/repository';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    const testTypeId = new URL(request.url).searchParams.get('testTypeId') ?? undefined;
    const items = await listTestResults(authResult.decodedToken.uid, testTypeId);
    return ok({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : '결과 목록 조회 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}
