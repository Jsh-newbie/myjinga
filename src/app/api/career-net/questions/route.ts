import { ZodError } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { fetchQuestions } from '@/lib/careernet/client';
import { isCareerTestTypeId } from '@/lib/careernet/constants';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { getUserProfile } from '@/lib/users/repository';

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
    const testTypeId = url.searchParams.get('testTypeId') ?? '';

    if (!isCareerTestTypeId(testTypeId)) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: 'testTypeId 값이 올바르지 않습니다. (aptitude, interest, maturity, values, competency)',
        },
        400
      );
    }

    const uid = authResult.decodedToken.uid;
    const profile = await getUserProfile(uid);
    const schoolLevel = profile?.schoolLevel ?? 'middle';
    const questionnaire = await fetchQuestions(testTypeId, schoolLevel);

    return ok(questionnaire);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(
        {
          code: 'VALIDATION_ERROR',
          message: '요청 파라미터가 올바르지 않습니다.',
          details: { issues: error.issues },
        },
        400
      );
    }

    const message = error instanceof Error ? error.message : '질문 조회 중 오류가 발생했습니다.';
    const isExternal = typeof message === 'string' && message.startsWith('CAREERNET_');

    return fail(
      {
        code: isExternal ? 'EXTERNAL_API_ERROR' : 'INTERNAL_ERROR',
        message: isExternal
          ? '커리어넷 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : '서버 오류가 발생했습니다.',
        details: { message },
      },
      isExternal ? 502 : 500
    );
  }
}
