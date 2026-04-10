import { redirect } from 'next/navigation';

import { AUTH_SIGNIN_PATH } from '@/lib/navigation/entry-policy';

export default function AuthIndexPage() {
  redirect(AUTH_SIGNIN_PATH);
}
