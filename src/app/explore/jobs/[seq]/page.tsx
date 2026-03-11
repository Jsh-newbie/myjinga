'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter, useParams } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

interface JobDetailData {
  jobCode: number;
  jobName: string;
  imageUrl?: string;
  work: string[];
  wage: number;
  wlb: string;
  satisfication: number;
  social: string;
  aptitName: string;
  relJobName: string;
  stdJobName: string;
  departments: string[];
  certificates: string[];
  interests: string[];
  abilities: string[];
  research: string[];
  forecast: string[];
  jobReady?: {
    recruit: string;
    certificate: string;
    training: string;
    curriculum: string;
  };
}

type LoadState = 'loading' | 'ready' | 'error';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seq = params.seq as string;

  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [job, setJob] = useState<JobDetailData | null>(null);
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
        api.getJobDetail(token, Number(seq)),
        api.listFavoriteJobs(token),
      ]);

      if (!detailRes.success) {
        setError(detailRes.error.message);
        setState('error');
        return;
      }

      const data = detailRes.data.job as unknown as JobDetailData;
      setJob(data);

      if (favRes.success) {
        const found = favRes.data.jobs.some((f) => String(f.jobCode) === String(data.jobCode));
        setIsFavorite(found);
      }

      setState('ready');
    } catch {
      setError('직업 정보를 불러오는 데 실패했습니다.');
      setState('error');
    }
  }, [seq]);

  useEffect(() => {
    if (user) fetchDetail(user);
  }, [user, fetchDetail]);

  async function toggleFavorite() {
    if (!user || !job || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const token = await user.getIdToken();
      if (isFavorite) {
        await api.removeFavoriteJob(token, job.jobCode);
        setIsFavorite(false);
      } else {
        await api.addFavoriteJob(token, job.jobCode, job.jobName);
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
          <h1 className="explore-title">직업 상세</h1>
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
          <h1 className="explore-title">직업 상세</h1>
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

  if (!job) return null;

  return (
    <div className="explore-page">
      {/* Header */}
      <header className="explore-header">
        <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="explore-title">직업 상세</h1>
        <div style={{ width: 24 }} />
      </header>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div>
            {job.stdJobName && (
              <span className="explore-card-field">{job.stdJobName}</span>
            )}
            <h2 className="detail-name">{job.jobName}</h2>
          </div>
          <button
            className={`detail-fav-chip${isFavorite ? ' detail-fav-chip--active' : ''}`}
            onClick={toggleFavorite}
            disabled={favoriteLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{isFavorite ? '관심 직업' : '관심 등록'}</span>
          </button>
        </div>

        {/* Stats */}
        {(job.wage || job.satisfication || job.wlb) && (
          <div className="detail-stats">
            {job.wage != null && Number(job.wage) > 0 && (
              <div className="detail-stat">
                <span className="detail-stat-label">평균 연봉</span>
                <span className="detail-stat-value">{Number(job.wage).toLocaleString()}만원</span>
              </div>
            )}
            {job.satisfication != null && Number(job.satisfication) > 0 && (
              <div className="detail-stat">
                <span className="detail-stat-label">만족도</span>
                <span className="detail-stat-value">{job.satisfication}%</span>
              </div>
            )}
            {job.wlb && (
              <div className="detail-stat">
                <span className="detail-stat-label">일·생활 균형</span>
                <span className="detail-stat-value">{job.wlb}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      {job.imageUrl && (
        <div className="detail-section">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.imageUrl}
            alt={`${job.jobName} 관련 이미지`}
            style={{ width: '100%', borderRadius: 10, marginBottom: 0 }}
          />
        </div>
      )}

      {/* 하는 일 */}
      {job.work.length > 0 && (
        <DetailSection title="하는 일">
          <ul className="detail-subject-list">
            {job.work.map((w, i) => (
              <li key={i} className="detail-subject-item">
                <span className="detail-text">{w}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* 적성 및 흥미 */}
      {(job.aptitName || job.interests.length > 0) && (
        <DetailSection title="적성 및 흥미">
          {job.aptitName && <p className="detail-text">{job.aptitName}</p>}
          {job.interests.length > 0 && (
            <div className="detail-tags" style={{ marginTop: job.aptitName ? 8 : 0 }}>
              {job.interests.map((interest, i) => (
                <span key={i} className="detail-tag">{interest}</span>
              ))}
            </div>
          )}
        </DetailSection>
      )}

      {/* 핵심 능력 */}
      {job.abilities.length > 0 && (
        <DetailSection title="핵심 능력">
          <div className="detail-tags">
            {job.abilities.map((ability, i) => (
              <span key={i} className="detail-tag">{ability}</span>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 관련 학과 */}
      {job.departments.length > 0 && (
        <DetailSection title="관련 학과">
          <div className="detail-tags">
            {job.departments.map((dept, i) => (
              <span key={i} className="detail-tag">{dept}</span>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 관련 자격증 */}
      {job.certificates.length > 0 && (
        <DetailSection title="관련 자격증">
          <div className="detail-tags">
            {job.certificates.map((cert, i) => (
              <span key={i} className="detail-tag">{cert}</span>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 직업 전망 */}
      {job.forecast.length > 0 && (
        <DetailSection title="직업 전망">
          <ul className="detail-subject-list">
            {job.forecast.map((f, i) => (
              <li key={i} className="detail-subject-item">
                <span className="detail-text">{f}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* 취업 준비 */}
      {job.jobReady && (
        <DetailSection title="취업 준비">
          {job.jobReady.recruit && (
            <div style={{ marginBottom: 12 }}>
              <strong className="detail-ready-label">입직 및 취업방법</strong>
              <p className="detail-text">{job.jobReady.recruit}</p>
            </div>
          )}
          {job.jobReady.curriculum && (
            <div style={{ marginBottom: 12 }}>
              <strong className="detail-ready-label">정규 교육과정</strong>
              <p className="detail-text">{job.jobReady.curriculum}</p>
            </div>
          )}
          {job.jobReady.training && (
            <div style={{ marginBottom: 12 }}>
              <strong className="detail-ready-label">직업 훈련</strong>
              <p className="detail-text">{job.jobReady.training}</p>
            </div>
          )}
          {job.jobReady.certificate && (
            <div>
              <strong className="detail-ready-label">관련 자격증</strong>
              <p className="detail-text">{job.jobReady.certificate}</p>
            </div>
          )}
        </DetailSection>
      )}

      {/* 관련 직업 */}
      {job.relJobName && (
        <DetailSection title="관련 직업">
          <p className="detail-text">{job.relJobName}</p>
        </DetailSection>
      )}

      {/* 커리어넷 링크 */}
      <a
        href={`https://www.career.go.kr/cnet/front/base/job/jobView.do?SEQ=${job.jobCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="detail-external-link"
      >
        커리어넷에서 자세히 보기 &rarr;
      </a>

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
