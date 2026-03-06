import { z } from 'zod';

import { fail, ok } from '@/lib/api/response';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { deleteUserProfile, updateProfileSchema, updateUserProfile } from '@/lib/users/repository';
import { getAdminAuth } from '@/lib/firebase/admin';

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

export async function PATCH(request: Request) {
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

    const parsed = updateProfileSchema.safeParse(body);
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

    const profile = await updateUserProfile(authResult.decodedToken.uid, parsed.data);
    if (!profile) {
      return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
    }

    return ok({ uid: authResult.decodedToken.uid, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '프로필 수정 중 오류가 발생했습니다.';

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

export async function DELETE() {
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

    const uid = authResult.decodedToken.uid;

    const deleted = await deleteUserProfile(uid);
    if (!deleted) {
      return fail({ code: 'NOT_FOUND', message: '사용자 프로필이 없습니다.' }, 404);
    }

    await getAdminAuth().deleteUser(uid);

    return ok({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '계정 삭제 중 오류가 발생했습니다.';

    return fail(
      {
        code: 'INTERNAL_ERROR',
        message: '계정 삭제 중 오류가 발생했습니다.',
        details: { message },
      },
      500
    );
  }
}
