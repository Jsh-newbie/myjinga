import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { getAdminDb } from '@/lib/firebase/admin';
import type { CreateRecordInput, UpdateRecordInput } from '@/lib/records/schema';
import type { RecordCategory, StudentRecord, StudentRecordListQuery } from '@/types/record';

function getRecordsCollection(uid: string) {
  return getAdminDb().collection('users').doc(uid).collection('records');
}

async function getUserPlan(uid: string): Promise<'free' | 'premium' | null> {
  const userSnap = await getAdminDb().collection('users').doc(uid).get();
  if (!userSnap.exists) return null;

  const plan = userSnap.data()?.subscription?.plan;
  return plan === 'premium' ? 'premium' : 'free';
}

async function assertAiDraftAllowed(uid: string, aiDraft: string | undefined) {
  if (aiDraft === undefined) return;

  const plan = await getUserPlan(uid);
  if (plan === null) {
    throw new Error('USER_NOT_FOUND');
  }

  if (plan !== 'premium') {
    throw new Error('AI_DRAFT_FORBIDDEN');
  }
}

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  return { id: doc.id, ...(data ?? {}) } as StudentRecord;
}

function getSortableTime(value: unknown): number {
  if (!value) return 0;

  if (typeof value === 'object' && value !== null) {
    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }

    if ('_seconds' in value && typeof value._seconds === 'number') {
      return value._seconds * 1000;
    }
  }

  return 0;
}

function parseCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const millis = Number(cursor);
  return Number.isFinite(millis) && millis > 0 ? Timestamp.fromMillis(millis) : null;
}

export async function createRecord(uid: string, input: CreateRecordInput): Promise<StudentRecord> {
  await assertAiDraftAllowed(uid, input.aiDraft);

  const ref = getRecordsCollection(uid).doc();

  await ref.set({
    ...input,
    status: input.status ?? 'active',
    source: input.source ?? 'manual',
    tags: input.tags ?? [],
    evidenceStatus: input.evidenceStatus ?? 'none',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await ref.get();
  return mapDoc(snapshot);
}

export async function listRecords(uid: string, query: StudentRecordListQuery): Promise<{
  items: StudentRecord[];
  nextCursor: string | null;
}> {
  const limit = query.limit ?? 20;
  const cursor = parseCursor(query.cursor);
  const recordsRef = getRecordsCollection(uid);

  if (query.category && query.semester) {
    let firestoreQuery: FirebaseFirestore.Query = recordsRef
      .where('category', '==', query.category)
      .where('semester', '==', query.semester)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (cursor) {
      firestoreQuery = firestoreQuery.startAfter(cursor);
    }

    const snapshot = await firestoreQuery.get();
    const items = snapshot.docs.map(mapDoc);
    const last = items.at(-1)?.createdAt;

    return {
      items,
      nextCursor: last?.toMillis ? String(last.toMillis()) : null,
    };
  }

  if (query.semester && !query.category) {
    let firestoreQuery: FirebaseFirestore.Query = recordsRef
      .where('semester', '==', query.semester)
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (cursor) {
      firestoreQuery = firestoreQuery.startAfter(cursor);
    }

    const snapshot = await firestoreQuery.get();
    const items = snapshot.docs.map(mapDoc);
    const last = items.at(-1)?.updatedAt;

    return {
      items,
      nextCursor: last?.toMillis ? String(last.toMillis()) : null,
    };
  }

  const snapshot = await recordsRef.get();
  let items = snapshot.docs.map(mapDoc).filter((item) => typeof item.category === 'string');

  if (query.category) {
    items = items.filter((item) => item.category === query.category);
  }

  items.sort((a, b) => {
    const aTime = getSortableTime(a.updatedAt) || getSortableTime(a.createdAt);
    const bTime = getSortableTime(b.updatedAt) || getSortableTime(b.createdAt);
    return bTime - aTime;
  });

  const sliced = items.slice(0, limit);
  const last = sliced.at(-1)?.updatedAt ?? sliced.at(-1)?.createdAt;

  return {
    items: sliced,
    nextCursor: getSortableTime(last) > 0 ? String(getSortableTime(last)) : null,
  };
}

export async function getRecord(uid: string, recordId: string): Promise<StudentRecord | null> {
  const snapshot = await getRecordsCollection(uid).doc(recordId).get();
  if (!snapshot.exists) return null;
  return mapDoc(snapshot);
}

export async function updateRecord(uid: string, recordId: string, input: UpdateRecordInput): Promise<StudentRecord | null> {
  const ref = getRecordsCollection(uid).doc(recordId);
  const snapshot = await ref.get();

  if (!snapshot.exists) return null;

  const current = mapDoc(snapshot);
  const nextCategory = (input.category ?? current.category) as RecordCategory;

  if (input.hours !== undefined && nextCategory !== 'volunteer') {
    throw new Error('INVALID_HOURS_CATEGORY');
  }

  await assertAiDraftAllowed(uid, input.aiDraft);

  await ref.update({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapDoc(updated);
}

export async function deleteRecord(uid: string, recordId: string): Promise<boolean> {
  const ref = getRecordsCollection(uid).doc(recordId);
  const snapshot = await ref.get();

  if (!snapshot.exists) return false;

  await ref.delete();
  return true;
}
