'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

interface FavoriteMajor {
  majorId: string;
  majorName: string;
}

export default function FavoriteMajorsPage() {
  const router = useRouter();
  const [majors, setMajors] = useState<FavoriteMajor[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth/signin'); return; }
      try {
        const token = await user.getIdToken();
        const res = await api.listFavoriteMajors(token);
        if (res.success) setMajors(res.data.majors);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [router]);

  async function handleRemove(major: FavoriteMajor) {
    setRemovingId(major.majorId);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await api.removeFavoriteMajor(token, major.majorId);
      if (res.success) {
        setMajors((prev) => prev.filter((m) => m.majorId !== major.majorId));
      }
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  }

  return (
    <div className="main-page">
      <header className="main-header">
        <button className="main-header-btn" onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="main-header-logo">관심 학과</span>
        <div style={{ width: 36 }} />
      </header>

      {loading ? (
        <div className="fav-loading">불러오는 중...</div>
      ) : majors.length === 0 ? (
        <div className="fav-empty">
          <p>아직 관심 학과가 없어요</p>
          <p className="fav-empty-hint">검사 결과에서 학과를 탭하면 ☆로 추가할 수 있어요</p>
          <Link href="/career-test" className="fav-empty-link">진로 검사 하러 가기</Link>
        </div>
      ) : (
        <ul className="fav-list">
          {majors.map((major) => (
            <li key={major.majorId} className="fav-item">
              <div className="fav-item-info">
                <span className="fav-item-star">★</span>
                <span className="fav-item-name">{major.majorName}</span>
              </div>
              <button
                type="button"
                className="fav-item-remove"
                onClick={() => handleRemove(major)}
                disabled={removingId === major.majorId}
                aria-label={`${major.majorName} 삭제`}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
