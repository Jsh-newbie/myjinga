'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';
import type { MajorDetail } from '@/lib/careernet/major-types';

type LoadState = 'loading' | 'ready' | 'error';

export default function MajorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const majorSeq = params.majorSeq as string;
  const fieldFromQuery = searchParams.get('field') ?? '';

  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [major, setMajor] = useState<MajorDetail | null>(null);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace('/auth/signin');
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, [auth, router]);

  const fetchDetail = useCallback(async (u: User) => {
    setState('loading');
    try {
      const token = await u.getIdToken();

      const [detailRes, favRes] = await Promise.all([
        api.getMajorDetail(token, majorSeq),
        api.listFavoriteMajors(token),
      ]);

      if (!detailRes.success) {
        setError(detailRes.error.message);
        setState('error');
        return;
      }

      setMajor(detailRes.data.major);

      if (favRes.success) {
        const found = favRes.data.majors.some(
          (m) => m.majorName === detailRes.data.major.name
        );
        setIsFavorite(found);
      }

      setState('ready');
    } catch {
      setError('학과 정보를 불러오는 데 실패했습니다.');
      setState('error');
    }
  }, [majorSeq]);

  useEffect(() => {
    if (user) fetchDetail(user);
  }, [user, fetchDetail]);

  async function toggleFavorite() {
    if (!user || !major || favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const token = await user.getIdToken();
      if (isFavorite) {
        const favRes = await api.listFavoriteMajors(token);
        if (favRes.success) {
          const fav = favRes.data.majors.find((m) => m.majorName === major.name);
          if (fav) {
            await api.removeFavoriteMajor(token, fav.majorId);
          }
        }
        setIsFavorite(false);
      } else {
        await api.addFavoriteMajor(token, major.name);
        setIsFavorite(true);
      }
    } catch {
      // silent
    } finally {
      setFavoriteLoading(false);
    }
  }

  if (state === 'loading') {
    return (
      <div className="explore-page">
        <header className="explore-header">
          <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="explore-title">학과 상세</h1>
          <div style={{ width: 24 }} />
        </header>
        <div className="explore-loading">
          <div className="explore-card-skeleton" style={{ height: 120 }} />
          <div className="explore-card-skeleton" style={{ height: 200 }} />
          <div className="explore-card-skeleton" style={{ height: 160 }} />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="explore-page">
        <header className="explore-header">
          <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="explore-title">학과 상세</h1>
          <div style={{ width: 24 }} />
        </header>
        <div className="explore-empty">
          <p>{error}</p>
          <button className="explore-retry-btn" onClick={() => user && fetchDetail(user)}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!major) return null;

  return (
    <div className="explore-page">
      {/* Header */}
      <header className="explore-header">
        <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="explore-title">학과 상세</h1>
        <div style={{ width: 24 }} />
      </header>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div>
            {(major.field || fieldFromQuery) && (
              <span className="explore-card-field">{major.field || fieldFromQuery}</span>
            )}
            <h2 className="detail-name">{major.name}</h2>
          </div>
          <button
            className={`detail-fav-chip${isFavorite ? ' detail-fav-chip--active' : ''}`}
            onClick={toggleFavorite}
            disabled={favoriteLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{isFavorite ? '관심 학과' : '관심 등록'}</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      {major.summary && (
        <DetailSection title="학과 개요">
          <p className="detail-text">{major.summary}</p>
        </DetailSection>
      )}

      {/* 학과 특성 */}
      {major.property && (
        <DetailSection title="학과 특성">
          <p className="detail-text">{major.property}</p>
        </DetailSection>
      )}

      {/* 흥미와 적성 */}
      {major.interest && (
        <DetailSection title="흥미와 적성">
          <p className="detail-text">{major.interest}</p>
        </DetailSection>
      )}

      {/* 관련 고교 교과목 */}
      {major.relatedSubjects.length > 0 && (
        <DetailSection title="관련 고교 교과목">
          <ul className="detail-subject-list">
            {major.relatedSubjects.map((s, i) => (
              <li key={i} className="detail-subject-item">
                <strong className="detail-subject-name">{s.name}</strong>
                {s.description && (
                  <span className="detail-subject-desc">{s.description}</span>
                )}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* 주요 교과목 */}
      {major.mainSubjects.length > 0 && (
        <DetailSection title="대학 주요 교과목">
          <ul className="detail-subject-list">
            {major.mainSubjects.map((s, i) => (
              <li key={i} className="detail-subject-item">
                <strong className="detail-subject-name">{s.name}</strong>
                {s.summary && <span className="detail-subject-desc">{s.summary}</span>}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* 관련 직업 */}
      {major.relatedJobs && (
        <DetailSection title="관련 직업">
          <p className="detail-text">{major.relatedJobs}</p>
        </DetailSection>
      )}

      {/* 관련 자격 */}
      {major.qualifications && (
        <DetailSection title="관련 자격">
          <p className="detail-text">{major.qualifications}</p>
        </DetailSection>
      )}

      {/* 졸업 후 진출분야 */}
      {major.enterFields.length > 0 && (
        <DetailSection title="졸업 후 진출분야">
          <ul className="detail-subject-list">
            {major.enterFields.map((e, i) => (
              <li key={i} className="detail-subject-item">
                <strong className="detail-subject-name">{e.category}</strong>
                <span className="detail-subject-desc">{e.description}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* 세부 관련 학과 */}
      {major.department && (
        <DetailSection title="세부 관련 학과">
          <p className="detail-text">{major.department}</p>
        </DetailSection>
      )}

      {/* 진로 탐색 활동 */}
      {major.careerActivities.length > 0 && (
        <DetailSection title="진로 탐색 활동">
          <ul className="detail-activity-list">
            {major.careerActivities.map((a, i) => (
              <li key={i} className="detail-activity-item">
                <strong className="detail-activity-name">{a.name}</strong>
                <p className="detail-text">{a.description}</p>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* Bottom spacing */}
      <div style={{ height: 80 }} />
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h3 className="detail-section-title">{title}</h3>
      {children}
    </section>
  );
}
