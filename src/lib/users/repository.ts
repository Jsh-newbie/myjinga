import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { getAdminDb } from '@/lib/firebase/admin';

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
