'use client';

import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import {
  api,
  type DashboardBootstrap,
  type RecordListItem,
  type ResultItem,
  type SessionItem,
} from '@/lib/api/client';
import {
  deriveBanner,
  deriveGreeting,
  deriveHero,
  deriveRoadmapSteps,
  type BannerType,
  type HeroType,
  type RoadmapStep,
} from '@/lib/dashboard/ux';
import { normalizeInsightSourceUrl } from '@/lib/insights/source-url';
import type { InsightFeedItem } from '@/types/insight';
import type { UserProfile } from '@/types/user';

type LoadingState = 'loading' | 'ready' | 'error';

const dashboardBootstrapRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof api.getDashboardBootstrap>>>
>();
const dashboardInsightRequestCache = new Map<
  string,
  Promise<Awaited<ReturnType<typeof api.getInsightFeed>>>
>();

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');
  const [inProgressSessions, setInProgressSessions] = useState<SessionItem[]>([]);
  const [insightItems, setInsightItems] = useState<InsightFeedItem[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [completedResults, setCompletedResults] = useState<ResultItem[]>([]);
  const [favoriteJobNames, setFavoriteJobNames] = useState<string[]>([]);
  const [favoriteMajorNames, setFavoriteMajorNames] = useState<string[]>([]);
  const [recentRecord, setRecentRecord] = useState<RecordListItem | null>(null);
  const [savedInsightCount, setSavedInsightCount] = useState(0);
  const lastLoadedUidRef = useRef<string | null>(null);
  const lastInsightUidRef = useRef<string | null>(null);

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase 설정을 확인해 주세요.');
      setState('error');
      return null;
    }
  }, []);

  function applyBootstrap(data: DashboardBootstrap) {
    const nextProfile = data.profile as UserProfile;

    setProfile(nextProfile);
    setInProgressSessions(data.sessions);
    setCompletedResults(data.results);
    setFavoriteJobNames(data.favoriteJobNames);
    setFavoriteMajorNames(data.favoriteMajorNames);
    setRecentRecord(data.recentRecord);
    setSavedInsightCount(data.savedInsightCount);
    setState('ready');
    lastLoadedUidRef.current = data.uid;
  }

  useEffect(() => {
    if (!auth) return;

    let active = true;

    async function loadInsights(token: string, uid: string) {
      if (!active) return;

      if (lastInsightUidRef.current === uid) {
        return;
      }

      setInsightLoading(true);

      try {
        let insightRequest = dashboardInsightRequestCache.get(token);
        if (!insightRequest) {
          insightRequest = api.getInsightFeed(token, { tab: 'all', limit: 6 });
          dashboardInsightRequestCache.set(token, insightRequest);
        }

        const insightResult = await insightRequest;
        dashboardInsightRequestCache.delete(token);

        if (!active || !insightResult.success) {
          return;
        }

        const shuffledInsightItems = [...insightResult.data.items];
        for (let index = shuffledInsightItems.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [shuffledInsightItems[index], shuffledInsightItems[swapIndex]] = [
            shuffledInsightItems[swapIndex],
            shuffledInsightItems[index],
          ];
        }

        setInsightItems(shuffledInsightItems);
        lastInsightUidRef.current = uid;
      } finally {
        if (active) {
          setInsightLoading(false);
        }
      }
    }

    async function loadDashboard(nextUser: User | null) {
      if (!active) return;

      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);

      try {
        const token = await nextUser.getIdToken();

        if (lastLoadedUidRef.current === nextUser.uid) {
          void loadInsights(token, nextUser.uid);
          return;
        }

        let bootstrapRequest = dashboardBootstrapRequestCache.get(token);
        if (!bootstrapRequest) {
          bootstrapRequest = api.getDashboardBootstrap(token);
          dashboardBootstrapRequestCache.set(token, bootstrapRequest);
        }

        const bootstrapResult = await bootstrapRequest;
        dashboardBootstrapRequestCache.delete(token);

        if (!bootstrapResult.success) {
          const detailMessage =
            typeof bootstrapResult.error?.details?.message === 'string'
              ? bootstrapResult.error.details.message
              : '';
          setError(
            detailMessage
              ? `${bootstrapResult.error.message} (${detailMessage})`
              : bootstrapResult.error.message
          );
          setState('error');
          return;
        }

        applyBootstrap(bootstrapResult.data);

        // Insight는 bootstrap 완료 후 백그라운드로 로드
        void loadInsights(token, nextUser.uid);
      } catch {
        if (!active) return;
        setError('프로필 조회 중 오류가 발생했습니다.');
        setState('error');
      }
    }

    const initialUser = auth.currentUser;
    if (initialUser) {
      void loadDashboard(initialUser);
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      if (initialUser && nextUser?.uid === initialUser.uid) {
        return;
      }

      void loadDashboard(nextUser);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [auth, router]);

  const displayName = profile?.nickname || profile?.name || user?.displayName || '';
  const banner = deriveBanner({
    sessions: inProgressSessions,
    results: completedResults,
    favoriteJobNames,
    favoriteMajorNames,
  });
  const hero = deriveHero({
    results: completedResults,
    favoriteJobNames,
    favoriteMajorNames,
  });
  const greeting = deriveGreeting({
    results: completedResults,
    favoriteJobNames,
    favoriteMajorNames,
    recentRecord,
  });
  const roadmapSteps = deriveRoadmapSteps({
    sessions: inProgressSessions,
    results: completedResults,
    favoriteJobNames,
    favoriteMajorNames,
    recentRecord,
    savedInsightCount,
  });

  if (state === 'loading') {
    return <MainSkeleton />;
  }

  return (
    <div className="main-page">
      <header className="main-header">
        <span
          className="main-header-logo"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="마진가 로고"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
          <span>
            My <strong style={{ color: 'var(--brand-700)' }}>진로</strong> Guide
          </span>
        </span>
      </header>

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
        <p>{greeting.message}</p>
        <Link href={greeting.ctaHref} className="main-greeting-link">
          {greeting.ctaLabel}
        </Link>
      </section>

      {error && <p className="main-error">{error}</p>}

      <ContextBanner banner={banner} />
      <HeroCard hero={hero} />
      <OnboardingRoadmap steps={roadmapSteps} />

      <h2 className="main-section-title">바로가기</h2>
      <div className="main-quick-grid">
        <QuickItem icon={<TestIcon />} label="진로 검사" href="/career-test" />
        <QuickItem icon={<RecordIcon />} label="학생부 기록" href="/records" />
        <QuickItem icon={<ExploreIcon />} label="탐색 허브" href="/explore" />
        <QuickItem icon={<StarIcon />} label="관심 직업" href="/favorites/jobs" />
        <QuickItem icon={<FavoriteMajorIcon />} label="관심 학과" href="/favorites/majors" />
        <QuickItem icon={<InsightIcon />} label="Insight" href="/ai" />
      </div>

      {(inProgressSessions.length > 0 || recentRecord) && (
        <>
          <h2 className="main-section-title">진행 중인 활동</h2>
          {inProgressSessions.map((session) => {
            const progress = Math.round((session.answeredCount / session.totalQuestions) * 100);
            return (
              <Link
                key={session.sessionId}
                href={`/career-test/${session.testTypeId}`}
                className="main-card"
              >
                <div
                  className="main-card-icon"
                  style={{ background: 'var(--brand-100)', color: 'var(--brand-700)' }}
                >
                  <TestIcon />
                </div>
                <div className="main-card-body">
                  <strong>{session.testName}</strong>
                  <div className="ct-progress-bar-bg" style={{ marginTop: 6 }}>
                    <div className="ct-progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span>
                    {session.answeredCount}/{session.totalQuestions} ({progress}%)
                  </span>
                </div>
                <span className="main-card-arrow">&rsaquo;</span>
              </Link>
            );
          })}
          {recentRecord && (
            <Link href={`/records/${recentRecord.id}`} className="main-card">
              <div className="main-card-icon" style={{ background: '#fef9c3', color: '#a16207' }}>
                <RecordIcon />
              </div>
              <div className="main-card-body">
                <strong>{recentRecord.title || '최근 기록'}</strong>
                <span>{recentRecord.category}</span>
              </div>
              <span className="main-card-arrow">&rsaquo;</span>
            </Link>
          )}
        </>
      )}

      {(insightLoading || insightItems.length > 0) && (
        <section className="main-insight-section">
          <div className="main-section-head">
            <div>
              <h2 className="main-section-title" style={{ margin: 0 }}>
                학생부 Insight
              </h2>
              <p className="main-section-note">
                {favoriteJobNames.length > 0 || favoriteMajorNames.length > 0
                  ? '저장한 관심 진로를 바탕으로 골랐어요.'
                  : '프로필 관심사와 기본 추천을 바탕으로 골랐어요.'}
              </p>
            </div>
            <Link href="/ai" className="main-more-link">
              더보기+
            </Link>
          </div>
          {insightItems.length > 0 ? (
            <div className="main-insight-scroll">
              {insightItems.map((item) => (
                <a
                  key={item.id}
                  href={normalizeInsightSourceUrl(item.sourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="main-insight-card"
                >
                  <span className="main-insight-source">{item.sourceName}</span>
                  <strong className="main-insight-title">{item.title}</strong>
                  <p className="main-insight-summary">{item.summary}</p>
                  <div className="main-insight-tags">
                    {item.topics.slice(0, 2).map((topic) => (
                      <span key={topic} className="main-insight-tag">
                        {topic}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="main-insight-scroll" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`insight-skeleton-${index + 1}`}
                  className="main-insight-card"
                  style={{ opacity: 0.55 }}
                >
                  <span className="main-insight-source">Insight 불러오는 중</span>
                  <strong className="main-insight-title">추천 콘텐츠를 준비하고 있어요.</strong>
                  <p className="main-insight-summary">
                    관심 진로와 최근 활동을 기준으로 맞춤 인사이트를 가져오는 중입니다.
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ContextBanner({ banner }: { banner: BannerType }) {
  if (banner.kind === 'ready') return null;

  if (banner.kind === 'new-user') {
    return (
      <Link href="/career-test" className="main-context-banner main-context-banner--guide">
        <span className="main-context-banner-icon">
          <CompassIcon />
        </span>
        <div className="main-context-banner-body">
          <strong>나를 알아보는 첫 걸음</strong>
          <span>진로 검사를 시작해 볼까요?</span>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>
    );
  }

  if (banner.kind === 'in-progress') {
    const progress = Math.round(
      (banner.session.answeredCount / banner.session.totalQuestions) * 100
    );
    return (
      <Link
        href={`/career-test/${banner.session.testTypeId}`}
        className="main-context-banner main-context-banner--progress"
      >
        <span className="main-context-banner-icon">
          <TestIcon />
        </span>
        <div className="main-context-banner-body">
          <strong>
            {banner.session.testName} {progress}% 진행 중
          </strong>
          <span>이어서 할까요?</span>
        </div>
        <span className="main-card-arrow">&rsaquo;</span>
      </Link>
    );
  }

  return (
    <Link href="/career-test" className="main-context-banner main-context-banner--guide">
      <span className="main-context-banner-icon">
        <StarIcon />
      </span>
      <div className="main-context-banner-body">
        <strong>검사 결과를 활용해 보세요</strong>
        <span>관심 직업을 저장하면 맞춤 추천이 시작돼요</span>
      </div>
      <span className="main-card-arrow">&rsaquo;</span>
    </Link>
  );
}

function HeroCard({ hero }: { hero: HeroType }) {
  if (hero.kind === 'no-test') {
    return (
      <section className="main-hero main-hero--cta">
        <strong className="main-hero-heading">나의 진로를 알아볼까요?</strong>
        <p className="main-hero-desc">진로 검사로 나의 적성, 흥미, 가치관을 탐색해 보세요</p>
        <Link href="/career-test" className="main-hero-btn">
          진로 검사 시작하기
        </Link>
      </section>
    );
  }

  if (hero.kind === 'no-favorites') {
    return (
      <section className="main-hero main-hero--summary">
        <strong className="main-hero-heading">검사 결과를 활용해 볼까요?</strong>
        <p className="main-hero-desc">완료한 검사 결과에서 관심 가는 직업과 학과를 저장해 보세요</p>
        <div className="main-hero-stat">
          <span>완료 검사</span>
          <Link href="/career-test" className="main-hero-stat-link">
            {hero.completedCount}/5
          </Link>
        </div>
        <Link href="/career-test" className="main-hero-btn">
          결과 확인하기
        </Link>
      </section>
    );
  }

  const jobSummary =
    hero.favJobNames.length === 0
      ? '-'
      : hero.favJobNames.length === 1
        ? hero.favJobNames[0]
        : `${hero.favJobNames[0]} 외 ${hero.favJobNames.length - 1}`;
  const majorSummary =
    hero.favMajorNames.length === 0
      ? '-'
      : hero.favMajorNames.length === 1
        ? hero.favMajorNames[0]
        : `${hero.favMajorNames[0]} 외 ${hero.favMajorNames.length - 1}`;
  const summaryHref = hero.favJobNames.length > 0 ? '/favorites/jobs' : '/favorites/majors';

  return (
    <section className="main-hero main-hero--summary">
      <strong className="main-hero-heading">나의 진로 요약</strong>
      <div className="main-hero-stats">
        <HeroStat label="관심 직업" value={jobSummary} href="/favorites/jobs" />
        <HeroStat label="관심 학과" value={majorSummary} href="/favorites/majors" />
        <HeroStat label="완료 검사" value={`${hero.completedCount}/5`} href="/career-test" />
      </div>
      <Link href={summaryHref} className="main-hero-btn">
        저장한 진로 보기
      </Link>
    </section>
  );
}

function HeroStat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="main-hero-stat">
      <span>{label}</span>
      <Link href={href} className="main-hero-stat-link">
        {value}
      </Link>
    </div>
  );
}

function OnboardingRoadmap({ steps }: { steps: RoadmapStep[] }) {
  const completedCount = steps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <section className="main-roadmap">
      <div className="main-roadmap-head">
        <div>
          <h2 className="main-roadmap-title">탐색 로드맵</h2>
          <p className="main-roadmap-subtitle">
            {completedCount === steps.length
              ? '기본 탐색을 모두 완료했어요.'
              : '다음 단계까지 한 번에 이어가 보세요.'}
          </p>
        </div>
        <span className="main-roadmap-badge">
          {completedCount}/{steps.length} 완료
        </span>
      </div>
      <div className="main-roadmap-progress" aria-hidden="true">
        <div className="main-roadmap-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="main-roadmap-list">
        {steps.map((step, index) => (
          <Link key={step.id} href={step.href} className="main-roadmap-item">
            <span className={`main-roadmap-check${step.done ? ' main-roadmap-check--done' : ''}`}>
              {step.done ? '✓' : index + 1}
            </span>
            <span className="main-roadmap-label">{step.label}</span>
            <span className="main-roadmap-state">{step.done ? '완료' : '이동'}</span>
          </Link>
        ))}
      </div>
    </section>
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
        <span
          className="main-header-logo"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="마진가 로고"
            width={32}
            height={32}
            style={{ borderRadius: 8 }}
          />
          <span>
            My <strong style={{ color: 'var(--brand-700)' }}>진로</strong> Guide
          </span>
        </span>
      </header>
      <section className="main-greeting">
        <div className="main-skeleton" style={{ width: 180, height: 26, marginBottom: 8 }} />
        <div className="main-skeleton" style={{ width: 140, height: 16, marginBottom: 10 }} />
        <div className="main-skeleton" style={{ width: 88, height: 28, borderRadius: 999 }} />
      </section>
      <div className="main-skeleton" style={{ height: 120, borderRadius: 18, margin: '12px 0' }} />
      <div
        className="main-skeleton"
        style={{ height: 140, borderRadius: 18, margin: '0 0 16px' }}
      />
      <div
        className="main-skeleton"
        style={{ height: 170, borderRadius: 18, margin: '0 0 16px' }}
      />
      <div className="main-skeleton" style={{ width: 60, height: 16, margin: '0 0 10px' }} />
      <div className="main-quick-grid">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="main-skeleton" style={{ height: 80, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );
}

function TestIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function InsightIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function FavoriteMajorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
