'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const router = useRouter();

  return (
    <div className="explore-page">
      <header className="explore-header">
        <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="explore-title">탐색</h1>
        <div style={{ width: 24 }} />
      </header>

      <div className="explore-hub">
        <Link href="/explore/majors" className="explore-hub-card">
          <div className="explore-hub-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 12 3 12 0v-5" />
            </svg>
          </div>
          <div>
            <h3 className="explore-hub-card-title">학과 탐색</h3>
            <p className="explore-hub-card-desc">대학 학과 정보를 검색하고 관심 학과를 저장하세요</p>
          </div>
          <span className="explore-card-arrow">&rsaquo;</span>
        </Link>

        <Link href="/explore/jobs" className="explore-hub-card">
          <div className="explore-hub-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div>
            <h3 className="explore-hub-card-title">직업 탐색</h3>
            <p className="explore-hub-card-desc">다양한 직업 정보를 탐색하고 관심 직업을 저장하세요</p>
          </div>
          <span className="explore-card-arrow">&rsaquo;</span>
        </Link>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
