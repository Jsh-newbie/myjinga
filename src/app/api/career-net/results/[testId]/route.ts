import { fail, ok } from '@/lib/api/response';
import { getTestResult } from '@/lib/careernet/repository';
import { fetchReportDetail } from '@/lib/careernet/report-scraper';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/server-auth';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: { testId: string } }
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
    const item = await getTestResult(uid, context.params.testId);
    if (!item) {
      return fail({ code: 'NOT_FOUND', message: '검사 결과를 찾을 수 없습니다.' }, 404);
    }

    // reportDetail이 없거나 불완전하면 실시간으로 fetch 후 저장
    const needsFetch = !item.reportDetail || !item.reportDetail.realmMeta;
    if (needsFetch && item.resultUrl) {
      const reportDetail = await fetchReportDetail(item.resultUrl);
      if (reportDetail) {
        item.reportDetail = reportDetail;
        // 비동기로 Firestore에 저장 (응답 지연 방지)
        getAdminDb()
          .collection('users')
          .doc(uid)
          .collection('testResults')
          .doc(item.id)
          .update({ reportDetail })
          .catch(() => { /* silent */ });
      }
    }

    return ok({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : '결과 상세 조회 중 오류가 발생했습니다.';
    return fail(
      { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', details: { message } },
      500
    );
  }
}
