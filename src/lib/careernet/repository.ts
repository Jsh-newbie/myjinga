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
    schoolLevel: 'middle' | 'high';
    answers: Record<string, string>;
    currentIndex: number;
    answeredCount: number;
    totalQuestions: number;
  }
): Promise<{ sessionId: string }> {
  const db = getAdminDb();
  const sessionsRef = db.collection('users').doc(uid).collection('testSessions');

  // 트랜잭션으로 감싸서 race condition 방지 (동시 요청 시 중복 세션 생성 차단)
  return await db.runTransaction(async (tx) => {
    const existingSnapshot = await tx.get(
      sessionsRef
        .where('testTypeId', '==', data.testTypeId)
    );

    const existing = existingSnapshot.docs.find(
      (doc) => doc.data().status === 'in_progress'
    );

    if (existing) {
      const doc = existing;
      tx.update(doc.ref, {
        answers: data.answers,
        currentIndex: data.currentIndex,
        answeredCount: data.answeredCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { sessionId: doc.id };
    }

    const meta = CAREER_TESTS[data.testTypeId];
    const ref = sessionsRef.doc();

    tx.set(ref, {
      testTypeId: data.testTypeId,
      qestrnSeq: meta.qestrnSeq[data.schoolLevel],
      trgetSe: meta.trgetSe[data.schoolLevel],
      status: 'in_progress',
      totalQuestions: data.totalQuestions,
      answeredCount: data.answeredCount,
      currentIndex: data.currentIndex,
      answers: data.answers,
      startDtm: Date.now(),
      startedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { sessionId: ref.id };
  });
}

export async function listInProgressSessions(uid: string): Promise<TestSessionWithId[]> {
  const snapshot = await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testSessions')
    .where('status', '==', 'in_progress')
    .get();

  const sessions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TestSessionWithId[];

  // updatedAt 기준 내림차순 정렬 (복합 인덱스 없이 동작)
  sessions.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() ?? 0;
    const bTime = b.updatedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return sessions.slice(0, 10);
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

export async function deleteTestSession(uid: string, sessionId: string): Promise<void> {
  await getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testSessions')
    .doc(sessionId)
    .delete();
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
  let query: FirebaseFirestore.Query = getAdminDb()
    .collection('users')
    .doc(uid)
    .collection('testResults');

  if (testTypeId) {
    query = query.where('testTypeId', '==', testTypeId);
  }

  const snapshot = await query.get();
  const results = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TestResultWithId[];

  // completedAt 기준 내림차순 정렬 (복합 인덱스 없이 동작)
  results.sort((a, b) => {
    const aTime = a.completedAt?.toMillis?.() ?? 0;
    const bTime = b.completedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return results.slice(0, 20);
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
