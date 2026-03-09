'use client';

import { usePathname } from 'next/navigation';

import BottomNav from '@/components/BottomNav';

/** BottomNav를 표시하지 않는 경로 prefix */
const EXCLUDED_PREFIXES = [
  '/auth',
  '/signin',
  '/signup',
];

/** 마케팅 랜딩(정확히 '/')도 제외 */
function shouldShowNav(pathname: string): boolean {
  if (pathname === '/') return false;
  return !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  );
}
