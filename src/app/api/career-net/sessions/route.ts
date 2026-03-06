import { fail, ok } from '@/lib/api/response';
import { CAREER_TESTS } from '@/lib/careernet/constants';
import { listInProgressSessions, upsertTestSession } from '@/lib/careernet/repository';
import { sessionSaveRequestSchema } from '@/lib/careernet/types';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    const sessions = await listInProgressSessions(authResult.decodedToken.uid);

    const items = sessions.map((s) => ({
      sessionId: s.id,
      testTypeId: s.testTypeId,
      testName: CAREER_TESTS[s.testTypeId]?.name ?? s.testTypeId,
      totalQuestions: s.totalQuestions,
      answeredCount: s.answeredCount,
      currentIndex: s.currentIndex,
      updatedAt: s.updatedAt,
    }));

    return ok({ sessions: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : '세션 목록 조회 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await verifyBearerToken();
    if (!authResult.ok) {
      return fail(
        { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', details: { reason: authResult.reason } },
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail({ code: 'VALIDATION_ERROR', message: '유효한 JSON 본문이 필요합니다.' }, 400);
    }

    const parsed = sessionSaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
        400
      );
    }

    const result = await upsertTestSession(authResult.decodedToken.uid, parsed.data);

    return ok({ sessionId: result.sessionId, savedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : '세션 저장 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}
