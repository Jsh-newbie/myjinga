'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api, type SessionItem, type ResultItem } from '@/lib/api/client';
import { CAREER_TEST_LIST } from '@/lib/careernet/constants';

export default function CareerTestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!user) return;

    async function load() {
      try {
        const token = await user!.getIdToken();

        const [sessResult, resResult] = await Promise.all([
          api.listSessions(token),
          api.listResults(token),
        ]);

        if (sessResult.success) {
          setSessions(sessResult.data.sessions);
        }
        if (resResult.success) {
          setResults(resResult.data.items);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const inProgressMap = new Map(sessions.map((s) => [s.testTypeId, s]));

  const TEST_ICONS: Record<string, string> = {
    aptitude: '\uD83D\uDCCB',
    interest: '\uD83C\uDFAF',
    maturity: '\uD83D\uDCCA',
    values: '\u2696\uFE0F',
    competency: '\uD83D\uDE80',
  };

  async function handleDeleteSession(sessionId: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const result = await api.deleteSession(token, sessionId);
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      }
    } catch {
      // silent
    }
  }

  function formatDate(ts: { _seconds: number }) {
    return new Date(ts._seconds * 1000).toLocaleDateString('ko-KR');
  }

  if (loading) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/dashboard" className="ct-back">&lsaquo;</Link>
          <span className="ct-header-title">진로 검사</span>
          <span />
        </header>
        <div className="ct-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="main-skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/dashboard" className="ct-back">&lsaquo;</Link>
        <span className="ct-header-title">진로 검사</span>
        <span />
      </header>

      <section className="ct-intro">
        <h1>나에게 맞는 진로를 찾아보세요</h1>
        <p>커리어넷 공인 심리검사 5종</p>
      </section>

      {/* 완료한 검사 */}
      {results.length > 0 && (
        <section className="ct-section">
          <h2 className="ct-section-title">완료한 검사</h2>
          <div className="ct-done-list">
            {groupResultsByType(results).map((group) => (
              <DoneGroupCard
                key={group.testTypeId}
                group={group}
                icon={TEST_ICONS[group.testTypeId] ?? '\uD83D\uDCCB'}
                formatDate={formatDate}
              />
            ))}
          </div>
        </section>
      )}

      {/* 진행 중인 검사 */}
      {sessions.length > 0 && (
        <section className="ct-section">
          <h2 className="ct-section-title">진행 중인 검사</h2>
          {sessions.map((s) => (
            <SwipeableSessionCard
              key={s.sessionId}
              session={s}
              onDelete={handleDeleteSession}
            />
          ))}
        </section>
      )}

      {/* 전체 검사 목록 */}
      <section className="ct-section">
        <h2 className="ct-section-title">전체 검사</h2>
        {CAREER_TEST_LIST.map((test) => {
          const inProgress = inProgressMap.get(test.id);
          return (
            <Link
              key={test.id}
              href={`/career-test/${test.id}`}
              className="ct-test-card"
            >
              <div className="ct-test-icon">{TEST_ICONS[test.id] ?? '\uD83D\uDCCB'}</div>
              <div className="ct-test-body">
                <div className="ct-test-name">
                  {test.name}
                  {inProgress && <span className="ct-badge-progress">진행 중</span>}
                </div>
                <div className="ct-test-meta">{test.estimatedMinutes}분</div>
                <div className="ct-test-desc">{test.description}</div>
              </div>
              <span className="ct-test-arrow">&rsaquo;</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

// --- 완료 결과 그룹핑 ---

interface ResultGroup {
  testTypeId: string;
  testName: string;
  latest: ResultItem;
  older: ResultItem[];
}

function groupResultsByType(items: ResultItem[]): ResultGroup[] {
  const map = new Map<string, ResultItem[]>();
  for (const r of items) {
    const list = map.get(r.testTypeId) ?? [];
    list.push(r);
    map.set(r.testTypeId, list);
  }

  const groups: ResultGroup[] = [];
  for (const [testTypeId, list] of map) {
    // completedAt._seconds 기준 내림차순 정렬 (최신 먼저)
    list.sort((a, b) => (b.completedAt?._seconds ?? 0) - (a.completedAt?._seconds ?? 0));
    const meta = CAREER_TEST_LIST.find((t) => t.id === testTypeId);
    groups.push({
      testTypeId,
      testName: meta?.name ?? testTypeId,
      latest: list[0],
      older: list.slice(1),
    });
  }

  // 가장 최근 결과가 있는 검사가 위로
  groups.sort(
    (a, b) => (b.latest.completedAt?._seconds ?? 0) - (a.latest.completedAt?._seconds ?? 0)
  );
  return groups;
}

function DoneGroupCard({
  group,
  icon,
  formatDate: fmt,
}: {
  group: ResultGroup;
  icon: string;
  formatDate: (ts: { _seconds: number }) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalCount = 1 + group.older.length;

  return (
    <div className="ct-done-group">
      {/* 최신 결과 카드 */}
      <Link href={`/career-test/result/${group.latest.id}`} className="ct-done-card">
        <div className="ct-done-icon">{icon}</div>
        <div className="ct-done-body">
          <strong className="ct-done-name">
            {group.testName}
            {totalCount > 1 && (
              <span className="ct-done-count">{totalCount}회 응시</span>
            )}
          </strong>
          <span className="ct-done-date">
            {group.latest.completedAt ? fmt(group.latest.completedAt) : ''} 완료
          </span>
        </div>
        <span className="ct-done-action">
          결과보기 <span className="ct-test-arrow">&rsaquo;</span>
        </span>
      </Link>

      {/* 이전 회차 토글 */}
      {group.older.length > 0 && (
        <>
          <button
            className="ct-done-toggle"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            <span>이전 회차 {group.older.length}건</span>
            <span className={`ct-done-toggle-arrow ${expanded ? 'ct-done-toggle-arrow--open' : ''}`} />
          </button>
          {expanded && (
            <div className="ct-done-older">
              {group.older.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/career-test/result/${r.id}`}
                  className="ct-done-older-item"
                >
                  <span className="ct-done-older-label">
                    {totalCount - 1 - idx}회차
                  </span>
                  <span className="ct-done-older-date">
                    {r.completedAt ? fmt(r.completedAt) : ''}
                  </span>
                  <span className="ct-done-older-link">보기 &rsaquo;</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SWIPE_THRESHOLD = 70;
const DELETE_BTN_WIDTH = 80;

function SwipeableSessionCard({
  session,
  onDelete,
}: {
  session: SessionItem;
  onDelete: (sessionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const isOpenRef = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const pct = Math.round((session.answeredCount / session.totalQuestions) * 100);

  const handleStart = useCallback((clientX: number) => {
    isSwipingRef.current = true;
    startXRef.current = clientX;
    currentXRef.current = clientX;
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isSwipingRef.current) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    const base = isOpenRef.current ? -DELETE_BTN_WIDTH : 0;
    const next = Math.min(0, Math.max(-DELETE_BTN_WIDTH * 1.2, base + diff));
    setOffsetX(next);
  }, []);

  const handleEnd = useCallback(() => {
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const diff = currentXRef.current - startXRef.current;

    if (isOpenRef.current) {
      if (diff > SWIPE_THRESHOLD / 2) {
        setOffsetX(0);
        isOpenRef.current = false;
      } else {
        setOffsetX(-DELETE_BTN_WIDTH);
        isOpenRef.current = true;
      }
    } else {
      if (diff < -SWIPE_THRESHOLD) {
        setOffsetX(-DELETE_BTN_WIDTH);
        isOpenRef.current = true;
      } else {
        setOffsetX(0);
        isOpenRef.current = false;
      }
    }
  }, []);

  const handleDelete = useCallback(() => {
    setDeleting(true);
    onDelete(session.sessionId);
  }, [onDelete, session.sessionId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOffsetX(0);
        isOpenRef.current = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="ct-swipe-container">
      <div className="ct-swipe-delete-bg">
        <button
          className="ct-swipe-delete-btn"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? '...' : '삭제'}
        </button>
      </div>
      <Link
        href={`/career-test/${session.testTypeId}`}
        className="ct-progress-card ct-swipe-card"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwipingRef.current ? 'none' : 'transform 0.25s ease',
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => { if (isSwipingRef.current) handleEnd(); }}
        onClick={(e) => {
          if (isOpenRef.current || Math.abs(currentXRef.current - startXRef.current) > 10) {
            e.preventDefault();
          }
        }}
      >
        <div className="ct-progress-top">
          <strong>{session.testName}</strong>
          <span className="ct-progress-resume">이어하기 &rsaquo;</span>
        </div>
        <div className="ct-progress-bar-bg">
          <div className="ct-progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ct-progress-info">
          <span>{session.answeredCount}/{session.totalQuestions} ({pct}%)</span>
          <span className="ct-swipe-hint">&larr; 밀어서 삭제</span>
        </div>
      </Link>
    </div>
  );
}
