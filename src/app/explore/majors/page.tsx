'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';
import type { MajorListItem } from '@/lib/careernet/major-types';
import { MAJOR_FIELDS } from '@/lib/careernet/major-types';

const PER_PAGE = 20;

export default function ExploreMajorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MajorListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState('');

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

  /** 첫 페이지 로드 (검색/필터 변경 시) */
  const fetchInitial = useCallback(async (u: User, q: string, field: string) => {
    setInitialLoading(true);
    setError('');
    setItems([]);
    setPage(1);
    try {
      const token = await u.getIdToken();
      const res = await api.exploreMajors(token, {
        q: q || undefined,
        field: field || undefined,
        page: 1,
        perPage: PER_PAGE,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setItems(res.data.items);
      setTotalCount(res.data.totalCount);
      setPage(1);
    } catch {
      setError('학과 정보를 불러오는 데 실패했습니다.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  /** 다음 페이지 로드 (무한스크롤) */
  const fetchMore = useCallback(async (u: User, q: string, field: string, nextPage: number) => {
    setLoadingMore(true);
    try {
      const token = await u.getIdToken();
      const res = await api.exploreMajors(token, {
        q: q || undefined,
        field: field || undefined,
        page: nextPage,
        perPage: PER_PAGE,
      });
      if (!res.success) return;
      setItems((prev) => [...prev, ...res.data.items]);
      setTotalCount(res.data.totalCount);
      setPage(nextPage);
    } catch {
      // silent - 스크롤 시 재시도 가능
    } finally {
      setLoadingMore(false);
    }
  }, []);

  // 검색/필터 변경 시 첫 페이지 로드
  useEffect(() => {
    if (user) fetchInitial(user, searchQuery, selectedField);
  }, [user, searchQuery, selectedField, fetchInitial]);

  // IntersectionObserver로 무한스크롤
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading && user) {
          fetchMore(user, searchQuery, selectedField, page + 1);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, initialLoading, user, searchQuery, selectedField, page, fetchMore]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function handleFieldSelect(code: string) {
    setSelectedField(code === selectedField ? '' : code);
  }

  return (
    <div className="explore-page">
      {/* Header */}
      <header className="explore-header">
        <button className="explore-back" onClick={() => router.back()} aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="explore-title">학과 탐색</h1>
        <div style={{ width: 24 }} />
      </header>

      {/* Search */}
      <form className="explore-search" onSubmit={handleSearch}>
        <input
          type="text"
          className="explore-search-input"
          placeholder="학과명 검색 (예: 컴퓨터, 경영, 의학)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="explore-search-btn" aria-label="검색">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      {/* Field filters */}
      <div className="explore-fields">
        {MAJOR_FIELDS.map((f) => (
          <button
            key={f.code}
            className={`explore-field-chip${selectedField === f.code ? ' explore-field-chip--active' : ''}`}
            onClick={() => handleFieldSelect(f.code)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Results info */}
      {!initialLoading && !error && (
        <p className="explore-result-count">
          {searchQuery && <span>&ldquo;{searchQuery}&rdquo; </span>}
          총 <strong>{totalCount}</strong>개 학과
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="explore-empty">
          <p>{error}</p>
          <button className="explore-retry-btn" onClick={() => user && fetchInitial(user, searchQuery, selectedField)}>
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
              key={item.majorSeq}
              href={`/explore/majors/${item.majorSeq}?field=${encodeURIComponent(item.field)}`}
              className="explore-card"
            >
              <span className="explore-card-field">{item.field}</span>
              <h3 className="explore-card-name">{item.name}</h3>
              <span className="explore-card-arrow">&rsaquo;</span>
            </Link>
          ))}
        </div>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="explore-loading-more">
          <div className="explore-spinner" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Bottom spacing for nav */}
      <div style={{ height: 80 }} />
    </div>
  );
}
