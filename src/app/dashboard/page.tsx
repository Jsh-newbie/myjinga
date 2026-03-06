'use client';

import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api, type SessionItem } from '@/lib/api/client';
import type { UserProfile } from '@/types/user';

type LoadingState = 'loading' | 'ready' | 'error';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');
  const [inProgressSessions, setInProgressSessions] = useState<SessionItem[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase 설정을 확인해 주세요.');
      setState('error');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);

      try {
        const token = await nextUser.getIdToken();
        const meResult = await api.getMe(token);

        if (!meResult.success) {
          const detailMessage =
            typeof meResult.error?.details?.message === 'string' ? meResult.error.details.message : '';
          setError(
            detailMessage
              ? `${meResult.error.message} (${detailMessage})`
              : meResult.error.message
          );
          setState('error');
          return;
        }

        setProfile(meResult.data.profile as UserProfile);
        setState('ready');

        // Load in-progress test sessions
        try {
          const sessResult = await api.listSessions(token);
          if (sessResult.success) {
            setInProgressSessions(sessResult.data.sessions);
          }
        } catch {
          // silent - non-critical
        }
      } catch {
        setError('프로필 조회 중 오류가 발생했습니다.');
        setState('error');
      }
    });

    return () => unsub();
  }, [auth, router]);

  async function handleLogout() {
    if (!auth) {
      return;
    }

    await signOut(auth);
    router.replace('/auth/signin');
  }

  const displayName = profile?.nickname || profile?.name || user?.displayName || '';
  const schoolLabel = profile
    ? `${profile.schoolLevel === 'high' ? '고' : '중'}${profile.grade} 학생`
    : '';
  // 베타 기간 중 프리미엄 기능 비활성화
  // const isPremium = profile?.subscription?.plan === 'premium';

  if (state === 'loading') {
    return <MainSkeleton />;
  }

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <span className="main-header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="마진가 로고" width={32} height={32} style={{ borderRadius: 8 }} />
          <span>My <strong style={{ color: 'var(--brand-700)' }}>진로</strong> Guide</span>
        </span>
        <div className="main-header-actions">
          <button className="main-header-btn" onClick={() => setShowLogoutModal(true)} aria-label="로그아웃">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Greeting */}
      <section className="main-greeting">
        <h1>
          {displayName ? (
            <>
              <span className="gradientText">{displayName}</span>님, 안녕하세요
            </>
          ) : (
            '안녕하세요'
          )}
        </h1>
        <p>오늘도 한 걸음 더 나아가 볼까요?</p>
      </section>

      {/* Profile card */}
      <Link href="/profile" className="main-profile-card" style={{ cursor: 'pointer' }}>
        <div className="main-profile-avatar">
          {displayName ? displayName.charAt(0) : '?'}
        </div>
        <div className="main-profile-info">
          <div className="main-profile-name">
            {displayName || user?.email || '-'}
            {' '}
            <span className="main-plan-badge main-plan-badge--beta">
              Beta (무료)
            </span>
          </div>
          <div className="main-profile-detail">
            {schoolLabel || user?.email || ''}
          </div>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>

      {error && (
        <p style={{ color: '#b91c1c', fontSize: 13, fontWeight: 600, margin: '12px 0 0' }}>{error}</p>
      )}

      {/* Quick Actions */}
      <h2 className="main-section-title">바로가기</h2>
      <div className="main-quick-grid">
        <QuickItem icon={<TestIcon />} label="진로 검사" href="/career-test" />
        <QuickItem icon={<RecordIcon />} label="학생부 기록" href="/records" />
        <QuickItem icon={<ExploreIcon />} label="학과 탐색" href="/explore" />
        <QuickItem icon={<AiIcon />} label="AI 도우미" href="/ai" />
      </div>

      {/* In-progress test sessions */}
      {inProgressSessions.length > 0 && (
        <>
          <h2 className="main-section-title">진행 중인 검사</h2>
          {inProgressSessions.map((s) => {
            const pct = Math.round((s.answeredCount / s.totalQuestions) * 100);
            return (
              <Link key={s.sessionId} href={`/career-test/${s.testTypeId}`} className="main-card">
                <div className="main-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                  <TestIcon />
                </div>
                <div className="main-card-body">
                  <strong>{s.testName}</strong>
                  <div className="ct-progress-bar-bg" style={{ marginTop: 6 }}>
                    <div className="ct-progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span>{s.answeredCount}/{s.totalQuestions} ({pct}%)</span>
                </div>
                <span className="main-card-arrow">&rsaquo;</span>
              </Link>
            );
          })}
        </>
      )}

      {/* Career Test */}
      <h2 className="main-section-title">진로 탐색</h2>
      <Link href="/career-test" className="main-card">
        <div className="main-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
          <TestIcon />
        </div>
        <div className="main-card-body">
          <strong>커리어넷 진로 검사</strong>
          <span>적성, 흥미, 가치관 검사로 나를 알아봐요</span>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>

      {/* Records */}
      <h2 className="main-section-title">학생부 관리</h2>
      <Link href="/records" className="main-card">
        <div className="main-card-icon" style={{ background: '#fef9c3', color: '#a16207' }}>
          <RecordIcon />
        </div>
        <div className="main-card-body">
          <strong>학생부 기록</strong>
          <span>활동 기록을 작성하고 관리해요</span>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>
      <Link href="/explore" className="main-card">
        <div className="main-card-icon" style={{ background: 'var(--brand-100)', color: 'var(--brand-700)' }}>
          <ExploreIcon />
        </div>
        <div className="main-card-body">
          <strong>학과 / 과목 탐색</strong>
          <span>진로에 맞는 학과와 선택과목을 찾아봐요</span>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>

      {/* AI - 베타 기간 중 숨김 처리 */}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="logout-handle" />
            <div className="logout-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 className="logout-title">로그아웃</h3>
            <p className="logout-desc">정말 로그아웃 하시겠습니까?</p>
            <div className="logout-actions">
              <button className="logout-btn logout-btn--cancel" onClick={() => setShowLogoutModal(false)}>
                취소
              </button>
              <button className="logout-btn logout-btn--confirm" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="main-bottom-nav">
      <Link href="/dashboard" className="main-nav-item main-nav-item--active">
        <span className="main-nav-icon">
          <HomeIcon />
        </span>
        홈
      </Link>
      <Link href="/career-test" className="main-nav-item">
        <span className="main-nav-icon">
          <TestIcon />
        </span>
        검사
      </Link>
      <Link href="/records" className="main-nav-item">
        <span className="main-nav-icon">
          <RecordIcon />
        </span>
        기록
      </Link>
      <Link href="/explore" className="main-nav-item">
        <span className="main-nav-icon">
          <ExploreIcon />
        </span>
        탐색
      </Link>
    </nav>
  );
}

function QuickItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} className="main-quick-item">
      <div className="main-quick-icon">{icon}</div>
      <div className="main-quick-label">{label}</div>
    </Link>
  );
}

function MainSkeleton() {
  return (
    <div className="main-page">
      <header className="main-header">
        <span className="main-header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="마진가 로고" width={32} height={32} style={{ borderRadius: 8 }} />
          <span>My <strong style={{ color: 'var(--brand-700)' }}>진로</strong> Guide</span>
        </span>
      </header>
      <section className="main-greeting">
        <div className="main-skeleton" style={{ width: 180, height: 26, marginBottom: 8 }} />
        <div className="main-skeleton" style={{ width: 140, height: 16 }} />
      </section>
      <div className="main-profile-card">
        <div className="main-skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="main-skeleton" style={{ width: 120, height: 16, marginBottom: 6 }} />
          <div className="main-skeleton" style={{ width: 80, height: 14 }} />
        </div>
      </div>
      <div className="main-skeleton" style={{ width: 60, height: 16, margin: '24px 0 10px' }} />
      <div className="main-quick-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="main-skeleton" style={{ height: 80, borderRadius: 14 }} />
        ))}
      </div>
      <BottomNav />
    </div>
  );
}

/* SVG Icons */
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TestIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
