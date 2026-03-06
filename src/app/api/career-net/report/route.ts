import { fail, ok } from '@/lib/api/response';
import { submitReport } from '@/lib/careernet/client';
import { CAREER_TESTS, GENDER_CODE } from '@/lib/careernet/constants';
import {
  getTestSession,
  markSessionSubmitted,
  saveTestResult,
} from '@/lib/careernet/repository';
import { fetchReportDetail } from '@/lib/careernet/report-scraper';
import { toV1AnswerString, toV2AnswerArray } from '@/lib/careernet/answer-format';
import { submitRequestSchema } from '@/lib/careernet/types';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    const parsed = submitRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
        400
      );
    }

    const uid = authResult.decodedToken.uid;
    const session = await getTestSession(uid, parsed.data.sessionId);

    if (!session) {
      return fail({ code: 'NOT_FOUND', message: '검사 세션을 찾을 수 없습니다.' }, 404);
    }

    if (session.status === 'submitted') {
      return fail({ code: 'CONFLICT', message: '이미 제출된 검사입니다.' }, 409);
    }

    const meta = CAREER_TESTS[session.testTypeId];

    // TODO: 사용자 프로필에서 실제 값 가져오기
    const result = await submitReport({
      testTypeId: session.testTypeId,
      qestrnSeq: session.qestrnSeq,
      trgetSe: session.trgetSe,
      answers: session.answers,
      startDtm: session.startDtm,
      name: '',
      gender: GENDER_CODE.male,
      school: '',
      grade: '1',
    });

    const answerPayload = meta.apiVersion === 'v2'
      ? { format: 'v2' as const, raw: toV2AnswerArray(session.answers) }
      : { format: 'v1' as const, raw: toV1AnswerString(session.answers) };

    // 결과 상세 데이터 fetch (실패해도 결과 저장은 진행)
    const reportDetail = await fetchReportDetail(result.resultUrl) ?? undefined;

    const saved = await saveTestResult(uid, {
      testTypeId: session.testTypeId,
      qestrnSeq: session.qestrnSeq,
      trgetSe: session.trgetSe,
      inspctSeq: result.inspctSeq,
      resultUrl: result.resultUrl,
      answerPayload,
      reportDetail,
    });

    await markSessionSubmitted(uid, session.id);

    return ok({
      resultId: saved.resultId,
      resultUrl: result.resultUrl,
      inspctSeq: result.inspctSeq,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '결과 생성 중 오류가 발생했습니다.';
    const isExternal = typeof message === 'string' && message.startsWith('CAREERNET_');

    return fail(
      {
        code: isExternal ? 'EXTERNAL_API_ERROR' : 'INTERNAL_ERROR',
        message: isExternal
          ? '커리어넷 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
          : '서버 오류가 발생했습니다.',
        details: { message },
      },
      isExternal ? 502 : 500
    );
  }
}
