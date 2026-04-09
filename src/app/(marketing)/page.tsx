import { redirect } from 'next/navigation';

import { MARKETING_LANDING_PATH } from '@/lib/navigation/entry-policy';

export default function MarketingPage() {
  redirect(MARKETING_LANDING_PATH);
}
