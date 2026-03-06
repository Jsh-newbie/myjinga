import { FieldValue } from 'firebase-admin/firestore';

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
    // reportDetailFetching 플래그로 동시 요청 시 중복 fetch 방지
    const needsFetch = !item.reportDetail || (item.reportDetail.schemaVersion ?? 0) < 2;
    if (needsFetch && item.resultUrl && !item.reportDetailFetching) {
      const docRef = getAdminDb()
        .collection('users')
        .doc(uid)
        .collection('testResults')
        .doc(item.id);

      // fetch 시작 전 플래그 설정
      await docRef.update({ reportDetailFetching: true });

      try {
        const reportDetail = await fetchReportDetail(item.resultUrl);
        if (reportDetail) {
          item.reportDetail = reportDetail;
          // fetch 완료 후 결과 저장 + 플래그 해제
          docRef
            .update({ reportDetail, reportDetailFetching: FieldValue.delete() })
            .catch(() => { /* silent */ });
        } else {
          docRef
            .update({ reportDetailFetching: FieldValue.delete() })
            .catch(() => { /* silent */ });
        }
      } catch {
        // fetch 실패 시 플래그 해제
        docRef
          .update({ reportDetailFetching: FieldValue.delete() })
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
