import { CAREER_TESTS } from '@/lib/careernet/constants';
import { getAdminDb } from '@/lib/firebase/admin';
import { listInProgressSessions, listTestResults } from '@/lib/careernet/repository';
import { listInsightSaves } from '@/lib/insights/repository';
import { listRecords } from '@/lib/records/repository';
import type { UserProfile } from '@/types/user';

export async function getDashboardBootstrap(uid: string) {
  const userRef = getAdminDb().collection('users').doc(uid);

  const [
    profileSnapshot,
    sessions,
    results,
    favoriteJobsSnapshot,
    favoriteMajorsSnapshot,
    recordsResult,
    insightSaves,
  ] = await Promise.all([
    userRef.get(),
    listInProgressSessions(uid),
    listTestResults(uid),
    userRef.collection('favoriteJobs').orderBy('createdAt', 'desc').get(),
    userRef.collection('favoriteMajors').orderBy('createdAt', 'desc').get(),
    listRecords(uid, { limit: 1 }),
    listInsightSaves(uid, { limit: 1 }),
  ]);

  if (!profileSnapshot.exists) {
    return null;
  }

  const profile = profileSnapshot.data() as UserProfile;

  return {
    uid,
    profile,
    sessions: sessions.map((session) => ({
      sessionId: session.id,
      testTypeId: session.testTypeId,
      testName: CAREER_TESTS[session.testTypeId]?.name ?? session.testTypeId,
      totalQuestions: session.totalQuestions,
      answeredCount: session.answeredCount,
      currentIndex: session.currentIndex,
      updatedAt: session.updatedAt,
    })),
    results: results.map((result) => ({
      id: result.id,
      testTypeId: result.testTypeId,
      resultUrl: result.resultUrl,
      completedAt: result.completedAt,
    })),
    favoriteJobNames: favoriteJobsSnapshot.docs
      .map((doc) => String(doc.data().jobName ?? ''))
      .filter(Boolean),
    favoriteMajorNames: favoriteMajorsSnapshot.docs
      .map((doc) => String(doc.data().majorName ?? ''))
      .filter(Boolean),
    recentRecord: recordsResult.items[0] ?? null,
    savedInsightCount: insightSaves.length,
  };
}
