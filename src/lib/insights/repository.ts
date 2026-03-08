import { FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from '@/lib/firebase/admin';
import type { CreateInsightSaveInput, ListInsightSavesQueryInput, UpdateInsightSaveInput } from '@/lib/insights/schema';
import type { InsightSave } from '@/types/insight';

function getInsightSavesCollection(uid: string) {
  return getAdminDb().collection('users').doc(uid).collection('insightSaves');
}

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  return { id: doc.id, ...(data ?? {}) } as InsightSave;
}

export async function listInsightSaves(uid: string, query: ListInsightSavesQueryInput): Promise<InsightSave[]> {
  const limit = query.limit ?? 20;
  let firestoreQuery: FirebaseFirestore.Query = getInsightSavesCollection(uid)
    .orderBy('updatedAt', 'desc')
    .limit(limit);

  if (query.status) {
    firestoreQuery = getInsightSavesCollection(uid)
      .where('status', '==', query.status)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
  }

  const snapshot = await firestoreQuery.get();
  return snapshot.docs.map(mapDoc);
}

export async function upsertInsightSave(uid: string, input: CreateInsightSaveInput): Promise<InsightSave> {
  const ref = getInsightSavesCollection(uid).doc(input.contentId);

  await ref.set(
    {
      ...input,
      status: input.status ?? 'active',
      tags: input.tags ?? [],
      savedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const snapshot = await ref.get();
  return mapDoc(snapshot);
}

export async function updateInsightSave(
  uid: string,
  saveId: string,
  input: UpdateInsightSaveInput
): Promise<InsightSave | null> {
  const ref = getInsightSavesCollection(uid).doc(saveId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  await ref.update({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return mapDoc(updated);
}

export async function deleteInsightSave(uid: string, saveId: string): Promise<boolean> {
  const ref = getInsightSavesCollection(uid).doc(saveId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;

  await ref.delete();
  return true;
}
