'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { CAREER_TEST_LIST } from '@/lib/careernet/constants';

interface SessionItem {
  sessionId: string;
  testTypeId: string;
  testName: string;
  totalQuestions: number;
  answeredCount: number;
  currentIndex: number;
  updatedAt: string;
}

interface ResultItem {
  id: string;
  testTypeId: string;
  resultUrl: string;
  completedAt: { _seconds: number };
}

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
        const headers = { Authorization: `Bearer ${token}` };

        const [sessRes, resRes] = await Promise.all([
          fetch('/api/career-net/sessions', { headers }),
          fetch('/api/career-net/results', { headers }),
        ]);

        if (sessRes.ok) {
          const d = await sessRes.json();
          setSessions(d.data?.sessions ?? []);
        }
        if (resRes.ok) {
          const d = await resRes.json();
          setResults(d.data?.items ?? []);
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

      {/* 진행 중인 검사 */}
      {sessions.length > 0 && (
        <section className="ct-section">
          <h2 className="ct-section-title">진행 중인 검사</h2>
          {sessions.map((s) => {
            const pct = Math.round((s.answeredCount / s.totalQuestions) * 100);
            return (
              <Link
                key={s.sessionId}
                href={`/career-test/${s.testTypeId}`}
                className="ct-progress-card"
              >
                <div className="ct-progress-top">
                  <strong>{s.testName}</strong>
                  <span className="ct-progress-resume">이어하기 &rsaquo;</span>
                </div>
                <div className="ct-progress-bar-bg">
                  <div className="ct-progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="ct-progress-info">
                  <span>{s.answeredCount}/{s.totalQuestions} ({pct}%)</span>
                </div>
              </Link>
            );
          })}
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

      {/* 완료한 검사 */}
      {results.length > 0 && (
        <section className="ct-section">
          <h2 className="ct-section-title">완료한 검사</h2>
          {results.map((r) => {
            const meta = CAREER_TEST_LIST.find((t) => t.id === r.testTypeId);
            return (
              <Link
                key={r.id}
                href={`/career-test/result/${r.id}`}
                className="ct-result-card"
              >
                <div className="ct-result-body">
                  <strong>{meta?.name ?? r.testTypeId}</strong>
                  <span>{r.completedAt ? formatDate(r.completedAt) : ''}</span>
                </div>
                <span className="ct-result-link">결과보기 &rsaquo;</span>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
