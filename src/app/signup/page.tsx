import { redirect } from 'next/navigation';

import { AUTH_SIGNUP_PATH } from '@/lib/navigation/entry-policy';

export default function SignUpRedirectPage() {
  redirect(AUTH_SIGNUP_PATH);
}
