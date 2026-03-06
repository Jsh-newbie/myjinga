import { FieldValue } from 'firebase-admin/firestore';

import type { CareerTestTypeId } from '@/lib/careernet/constants';
import { CAREER_TESTS } from '@/lib/careernet/constants';
import type { ReportDetail, TestResultWithId, TestSessionWithId } from '@/lib/careernet/types';
import { getAdminDb } from '@/lib/firebase/admin';

// --- Test Sessions (임시저장) ---

export async function upsertTestSession(
  uid: string,
  data: {
    testTypeId: CareerTestTypeId;
    answers: Record<string, string>;
    currentIndex: number;
    answeredCount: number;
    totalQuestions: number;
  }
): Promise<{ sessionId: string }> {
  const db = getAdminDb();
  const sessionsRef = db.collection('users').doc(uid).collection('testSessions');

  const existing = await sessionsRef
    .where('testTypeId', '==', data.testTypeId)
    .where('status', '==', 'in_progress')
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({
      answers: data.answers,
      currentIndex: data.currentIndex,
      answeredCount: data.answeredCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { sessionId: doc.id };
  }

  const meta = CAREER_TESTS[data.testTypeId];
  const schoolLevel = 'middle'; // TODO: 사용자 프로필에서 가져오기
  const ref = sessionsRef.doc();

  await ref.set({
    testTypeId: data.testTypeId,
    qestrnSeq: meta.qestrnSeq[schoolLevel],
    trgetSe: meta.trgetSe[schoolLevel],
    status: 'in_progress',
    totalQuestions: data.totalQuestions,
    answeredCount: data.answeredCount,
    currentIndex: data.currentIndex,
    answers: data.answers,
    startDtm: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { sessionId: ref.id };
}

export async function listInProgressSessions(uid: string): Promise<TestSessionWithId[]> {
  const snapshot = await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testSessions')
    .where('status', '==', 'in_progress')
    .orderBy('updatedAt', 'desc')
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TestSessionWithId[];
}

export async function getTestSession(uid: string, sessionId: string): Promise<TestSessionWithId | null> {
  const doc = await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testSessions')
    .doc(sessionId)
    .get();

  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as TestSessionWithId;
}

export async function markSessionSubmitted(uid: string, sessionId: string): Promise<void> {
  await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testSessions')
    .doc(sessionId)
    .update({
      status: 'submitted',
      updatedAt: FieldValue.serverTimestamp(),
    });
}

// --- Test Results (완료된 결과) ---

export async function saveTestResult(
  uid: string,
  data: {
    testTypeId: CareerTestTypeId;
    qestrnSeq: string;
    trgetSe: string;
    inspctSeq: string;
    resultUrl: string;
    answerPayload: {
      format: 'v1' | 'v2';
      raw: string | Array<{ no: string; val: string }>;
    };
    reportDetail?: ReportDetail;
  }
): Promise<{ resultId: string }> {
  const db = getAdminDb();
  const ref = db.collection('users').doc(uid).collection('testResults').doc();

  await ref.set({
    testTypeId: data.testTypeId,
    qestrnSeq: data.qestrnSeq,
    trgetSe: data.trgetSe,
    inspctSeq: data.inspctSeq,
    resultUrl: data.resultUrl,
    answerPayload: data.answerPayload,
    ...(data.reportDetail && { reportDetail: data.reportDetail }),
    completedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { resultId: ref.id };
}

export async function listTestResults(uid: string, testTypeId?: string): Promise<TestResultWithId[]> {
  let query = getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testResults')
    .orderBy('completedAt', 'desc')
    .limit(20);

  if (testTypeId) {
    query = query.where('testTypeId', '==', testTypeId);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TestResultWithId[];
}

export async function getTestResult(uid: string, resultId: string): Promise<TestResultWithId | null> {
  const doc = await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testResults')
    .doc(resultId)
    .get();

  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as TestResultWithId;
}
