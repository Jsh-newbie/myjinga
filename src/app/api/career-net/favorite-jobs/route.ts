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
    .collection('favoriteJobs')
    .orderBy('createdAt', 'desc')
    .get();

  const jobs = snapshot.docs.map((doc) => ({
    jobCode: doc.id,
    ...doc.data(),
  }));

  return ok({ jobs });
}

export async function POST(req: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);

  const body = await req.json() as { jobCode: number; jobName: string };
  if (!body.jobCode || !body.jobName) {
    return fail({ code: 'VALIDATION_ERROR', message: 'jobCode와 jobName이 필요합니다.' });
  }

  const uid = auth.decodedToken.uid;
  const docRef = getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('favoriteJobs')
    .doc(String(body.jobCode));

  await docRef.set({
    jobName: body.jobName,
    createdAt: FieldValue.serverTimestamp(),
  });

  return ok({ jobCode: String(body.jobCode), jobName: body.jobName }, 201);
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyBearerToken();
  if (!auth.ok) return fail({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401);

  const { searchParams } = new URL(req.url);
  const jobCode = searchParams.get('jobCode');
  if (!jobCode) {
    return fail({ code: 'VALIDATION_ERROR', message: 'jobCode가 필요합니다.' });
  }

  const uid = auth.decodedToken.uid;
  await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('favoriteJobs')
    .doc(jobCode)
    .delete();

  return ok({ deleted: true });
}
