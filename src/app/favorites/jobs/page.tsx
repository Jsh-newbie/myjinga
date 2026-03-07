'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

interface FavoriteJob {
  jobCode: string;
  jobName: string;
}

export default function FavoriteJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<FavoriteJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth/signin'); return; }
      try {
        const token = await user.getIdToken();
        const res = await api.listFavoriteJobs(token);
        if (res.success) setJobs(res.data.jobs);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [router]);

  async function handleRemove(job: FavoriteJob) {
    setRemovingId(job.jobCode);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await api.removeFavoriteJob(token, Number(job.jobCode));
      if (res.success) {
        setJobs((prev) => prev.filter((j) => j.jobCode !== job.jobCode));
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
        <span className="main-header-logo">관심 직업</span>
        <div style={{ width: 36 }} />
      </header>

      {loading ? (
        <div className="fav-loading">불러오는 중...</div>
      ) : jobs.length === 0 ? (
        <div className="fav-empty">
          <p>아직 관심 직업이 없어요</p>
          <p className="fav-empty-hint">검사 결과에서 직업을 탭하면 ☆로 추가할 수 있어요</p>
          <Link href="/career-test" className="fav-empty-link">진로 검사 하러 가기</Link>
        </div>
      ) : (
        <ul className="fav-list">
          {jobs.map((job) => (
            <li key={job.jobCode} className="fav-item">
              <div className="fav-item-info">
                <span className="fav-item-star">★</span>
                <span className="fav-item-name">{job.jobName}</span>
              </div>
              <button
                type="button"
                className="fav-item-remove"
                onClick={() => handleRemove(job)}
                disabled={removingId === job.jobCode}
                aria-label={`${job.jobName} 삭제`}
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
