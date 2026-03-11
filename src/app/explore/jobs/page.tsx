'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

/** 커리어넷 직업백과 테마 코드 */
const JOB_THEMES = [
  { code: '102420', name: 'AI·로봇' },
  { code: '102421', name: 'IT·SW' },
  { code: '102422', name: '게임' },
  { code: '102423', name: '공학' },
  { code: '102424', name: '건설' },
  { code: '102425', name: '과학' },
  { code: '102426', name: '교육' },
  { code: '102427', name: '금융' },
  { code: '102428', name: '디자인' },
  { code: '102429', name: '미디어' },
  { code: '102430', name: '법률' },
  { code: '102431', name: '보건·의료' },
  { code: '102432', name: '사회복지' },
  { code: '102433', name: '스포츠' },
  { code: '102434', name: '식품' },
  { code: '102435', name: '여행·관광' },
  { code: '102436', name: '예술' },
  { code: '102437', name: '자연·환경' },
  { code: '102438', name: '항공·우주' },
  { code: '102439', name: '해양' },
] as const;

interface JobListItem {
  seq: number;
  jobCode: number;
  jobName: string;
  work: string;
  wage: string;
  wlb: string;
  aptitName: string;
  relJobName: string;
}

export default function ExploreJobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<JobListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = items.length < totalCount;

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const presetQuery = new URLSearchParams(window.location.search).get('jobName')?.trim() ?? '';
    if (!presetQuery) return;

    setSearchInput((current) => (current === presetQuery ? current : presetQuery));
    setSearchQuery((current) => (current === presetQuery ? current : presetQuery));
  }, []);

  const fetchInitial = useCallback(async (u: User, q: string, theme: string) => {
    setInitialLoading(true);
    setError('');
    setItems([]);
    setPageIndex(1);
    try {
      const token = await u.getIdToken();
      const res = await api.exploreJobs(token, {
        jobName: q || undefined,
        searchThemeCode: theme || undefined,
        pageIndex: 1,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setItems(res.data.jobs);
      setTotalCount(res.data.count);
      setPageIndex(res.data.pageIndex);
      setPageSize(res.data.pageSize);
    } catch {
      setError('직업 정보를 불러오는 데 실패했습니다.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async (u: User, q: string, theme: string, nextPage: number) => {
    setLoadingMore(true);
    try {
      const token = await u.getIdToken();
      const res = await api.exploreJobs(token, {
        jobName: q || undefined,
        searchThemeCode: theme || undefined,
        pageIndex: nextPage,
      });
      if (!res.success) return;
      setItems((prev) => [...prev, ...res.data.jobs]);
      setTotalCount(res.data.count);
      setPageIndex(res.data.pageIndex);
      setPageSize(res.data.pageSize);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchInitial(user, searchQuery, selectedTheme);
  }, [user, searchQuery, selectedTheme, fetchInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading && user) {
          fetchMore(user, searchQuery, selectedTheme, pageIndex + 1);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasMore,
    loadingMore,
    initialLoading,
    user,
    searchQuery,
    selectedTheme,
    pageIndex,
    fetchMore,
  ]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function handleThemeSelect(code: string) {
    setSelectedTheme(code === selectedTheme ? '' : code);
  }

  return (
    <div className="explore-page">
      {/* Header */}
      <header className="explore-header">
        <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="explore-title">직업 탐색</h1>
        <Link href="/favorites/jobs" className="explore-fav-link" aria-label="관심 직업 목록">
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
        </Link>
      </header>

      {/* Search */}
      <form className="explore-search" onSubmit={handleSearch}>
        <input
          type="text"
          className="explore-search-input"
          placeholder="직업명 검색 (예: 소프트웨어, 의사, 교사)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="explore-search-btn" aria-label="검색">
          <svg
            width="20"
            height="20"
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
        </button>
      </form>

      {/* Theme filters */}
      <div className="explore-fields">
        {JOB_THEMES.map((t) => (
          <button
            key={t.code}
            className={`explore-field-chip${selectedTheme === t.code ? ' explore-field-chip--active' : ''}`}
            onClick={() => handleThemeSelect(t.code)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Results info */}
      {!initialLoading && !error && (
        <p className="explore-result-count">
          {searchQuery && <span>&ldquo;{searchQuery}&rdquo; </span>}총 <strong>{totalCount}</strong>
          개 직업
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="explore-empty">
          <p>{error}</p>
          <button
            className="explore-retry-btn"
            onClick={() => user && fetchInitial(user, searchQuery, selectedTheme)}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Initial loading */}
      {initialLoading && (
        <div className="explore-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="explore-card-skeleton" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!initialLoading && !error && items.length === 0 && (
        <div className="explore-empty">
          <p>검색 결과가 없습니다.</p>
          <p style={{ fontSize: 13, color: 'var(--brand-500)' }}>다른 키워드로 검색해 보세요.</p>
        </div>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div className="explore-list">
          {items.map((item) => (
            <Link
              key={item.seq}
              href={`/explore/jobs/${item.seq}`}
              className="explore-card explore-card--job"
            >
              <h3 className="explore-card-name">{item.jobName}</h3>
              {item.work && (
                <p className="explore-card-desc">
                  {item.work.length > 80 ? `${item.work.slice(0, 80)}…` : item.work}
                </p>
              )}
              <div className="explore-card-meta">
                {item.wage && <span className="explore-card-tag">연봉 {item.wage}</span>}
                {item.aptitName && <span className="explore-card-tag">{item.aptitName}</span>}
              </div>
              <span className="explore-card-arrow">&rsaquo;</span>
            </Link>
          ))}
        </div>
      )}

      {/* Loading more */}
      {loadingMore && (
        <div className="explore-loading-more">
          <div className="explore-spinner" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      <div style={{ height: 80 }} />
    </div>
  );
}
