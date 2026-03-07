import { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from '@/lib/firebase/admin';
import { verifyBearerToken } from '@/lib/firebase/server-auth';
import { ok, fail } from '@/lib/api/response';

export async function GET() {
  const auth = await verifyBearerToken();
  if (!auth.ok) return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);

  const uid = auth.decodedToken.uid;
  const snapshot = await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('favoriteMajors')
    .orderBy('createdAt', 'desc')
    .get();

  const majors = snapshot.docs.map((doc) => ({
    majorId: doc.id,
    ...doc.data(),
  }));

  return ok({ majors });
}

export async function POST(req: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);

  const body = await req.json() as { majorName: string };
  if (!body.majorName) {
    return fail({ code: 'VALIDATION_ERROR', message: 'majorName이 필요합니다.' });
  }

  const uid = auth.decodedToken.uid;
  const majorId = body.majorName.replace(/\s+/g, '_');
  const docRef = getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('favoriteMajors')
    .doc(majorId);

  await docRef.set({
    majorName: body.majorName,
    createdAt: FieldValue.serverTimestamp(),
  });

  return ok({ majorId, majorName: body.majorName }, 201);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);

  const { searchParams } = new URL(req.url);
  const majorId = searchParams.get('majorId');
  if (!majorId) {
    return fail({ code: 'VALIDATION_ERROR', message: 'majorId가 필요합니다.' });
  }

  const uid = auth.decodedToken.uid;
  await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('favoriteMajors')
    .doc(majorId)
    .delete();

  return ok({ deleted: true });
}
