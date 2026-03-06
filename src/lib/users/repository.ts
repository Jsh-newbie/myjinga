import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { getAdminDb } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types/user';

export const initUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  birthDate: z.string().datetime(),
  schoolLevel: z.enum(['middle', 'high']),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type InitUserInput = z.infer<typeof initUserSchema>;

export async function upsertUserProfile(uid: string, input: InitUserInput) {
  const adminDb = getAdminDb();
  const userRef = adminDb.collection('users').doc(uid);
  const now = FieldValue.serverTimestamp();

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);

    if (!snap.exists) {
      tx.set(userRef, {
        email: input.email,
        name: input.name,
        birthDate: input.birthDate,
        schoolLevel: input.schoolLevel,
        grade: input.grade,
        role: 'student',
        subscription: {
          plan: 'free',
          status: 'active',
        },
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    tx.set(
      userRef,
      {
        email: input.email,
        name: input.name,
        birthDate: input.birthDate,
        schoolLevel: input.schoolLevel,
        grade: input.grade,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  const updated = await userRef.get();
  return updated.data();
}

export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),
  birthDate: z.string().datetime().optional(),
  schoolLevel: z.enum(['middle', 'high']).optional(),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  schoolName: z.string().max(100).optional(),
  interests: z.array(z.string().min(1).max(30)).max(10).optional(),
  phoneNumber: z.string().min(10).max(15).optional(),
  phoneVerified: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateUserProfile(uid: string, input: UpdateProfileInput) {
  const adminDb = getAdminDb();
  const userRef = adminDb.collection('users').doc(uid);

  const snap = await userRef.get();
  if (!snap.exists) {
    return null;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.nickname !== undefined) updateData.nickname = input.nickname;
  if (input.birthDate !== undefined) updateData.birthDate = input.birthDate;
  if (input.schoolLevel !== undefined) updateData.schoolLevel = input.schoolLevel;
  if (input.grade !== undefined) updateData.grade = input.grade;
  if (input.schoolName !== undefined) updateData.schoolName = input.schoolName;
  if (input.interests !== undefined) updateData.interests = input.interests;
  if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber;
  if (input.phoneVerified !== undefined) updateData.phoneVerified = input.phoneVerified;

  await userRef.update(updateData);

  const updated = await userRef.get();
  return { uid, ...updated.data() } as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getAdminDb().collection('users').doc(uid).get();
  if (!snap.exists) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function deleteUserProfile(uid: string): Promise<boolean> {
  const adminDb = getAdminDb();
  const userRef = adminDb.collection('users').doc(uid);

  const snap = await userRef.get();
  if (!snap.exists) return false;

  // Delete subcollections
  const subcollections = ['testSessions', 'testResults', 'records'];
  for (const sub of subcollections) {
    const subSnaps = await userRef.collection(sub).listDocuments();
    for (const doc of subSnaps) {
      await doc.delete();
    }
  }

  await userRef.delete();
  return true;
}
