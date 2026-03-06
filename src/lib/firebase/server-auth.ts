import { headers } from 'next/headers';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { getAdminAuth } from '@/lib/firebase/admin';

type VerifyTokenResult =
  | { ok: true; decodedToken: DecodedIdToken }
  | { ok: false; reason: 'MISSING_AUTH_HEADER' | 'MALFORMED_AUTH_HEADER' | 'INVALID_ID_TOKEN' };

export async function verifyBearerToken(): Promise<VerifyTokenResult> {
  const authHeader = headers().get('authorization');

  if (!authHeader) {
    return { ok: false, reason: 'MISSING_AUTH_HEADER' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, reason: 'MALFORMED_AUTH_HEADER' };
  }

  const idToken = authHeader.slice('Bearer '.length);
  if (!idToken) {
    return { ok: false, reason: 'MALFORMED_AUTH_HEADER' };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return { ok: true, decodedToken };
  } catch (error) {
    console.error('[auth] verifyIdToken failed', error);
    return { ok: false, reason: 'INVALID_ID_TOKEN' };
  }
}
