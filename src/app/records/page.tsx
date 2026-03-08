'use client';

import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, type RecordListItem } from '@/lib/api/client';
import { getClientAuth } from '@/lib/firebase/client';
import { getRecordCategoryLabel, RECORD_CATEGORY_META } from '@/lib/records/presenter';

type LoadingState = 'loading' | 'ready' | 'error';

const CATEGORY_CARDS = ['dailyLog', 'subjectNote', 'creativeActivity', 'careerIdea'] as const;

function formatTimestamp(value: RecordListItem['updatedAt']) {
  const seconds = value?.seconds ?? value?._seconds;
  if (!seconds) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(seconds * 1000));
}

export default function RecordsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');
  const [recentRecords, setRecentRecords] = useState<RecordListItem[]>([]);

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
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);

      try {
        const token = await nextUser.getIdToken();
        const result = await api.listRecords(token, { limit: 6 });

        if (!result.success) {
          setError(result.error.message);
          setState('error');
          return;
        }

        setRecentRecords(result.data.items);
        setState('ready');
      } catch {
        setError('학생부 기록을 불러오는 중 오류가 발생했습니다.');
        setState('error');
      }
    });

    return () => unsub();
  }, [auth, router]);

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/dashboard" className="ct-back" aria-label="대시보드로 돌아가기">
          &lsaquo;
        </Link>
        <span className="ct-header-title">학생부 기록</span>
        <span />
      </header>

      <section className="ct-intro">
        <h1>매일 기록을 남기고 학기말에 정리하세요</h1>
        <p>수업, 활동, 아이디어를 학생부형 근거로 관리합니다.</p>
      </section>

      <section className="records-hero">
        <div>
          <strong>오늘의 기록</strong>
          <p>수업, 활동, 아이디어를 3분 안에 남기고 학기말에 정리하세요.</p>
        </div>
        <button
          type="button"
          className="records-primary-btn"
          onClick={() => router.push('/records/new?intent=daily')}
        >
          오늘의 기록 시작
        </button>
      </section>

      <section className="ct-section">
        <h2 className="ct-section-title">기록 카테고리</h2>
        <div className="records-category-grid">
          {CATEGORY_CARDS.map((card) => {
            const meta = RECORD_CATEGORY_META[card];
            return (
              <button
                key={card}
                type="button"
                className="records-category-card records-category-card--button"
                onClick={() => router.push(`/records/new?category=${card}`)}
              >
                <div className="records-category-icon" style={meta.accent}>
                  {meta.shortLabel}
                </div>
                <strong>{meta.label}</strong>
                <p>{meta.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ct-section">
        <h2 className="ct-section-title">관리 흐름</h2>
        <div className="records-flow-list">
          <div className="records-flow-item">
            <strong>1. 매일 기록</strong>
            <span>오늘 있었던 수업, 활동, 질문, 아이디어를 짧게 남깁니다.</span>
          </div>
          <div className="records-flow-item">
            <strong>2. 주간 정리</strong>
            <span>중요한 기록을 세특·창체·진로 아이디어로 분류합니다.</span>
          </div>
          <div className="records-flow-item">
            <strong>3. 학기말 검토</strong>
            <span>실제 학생부와 비교하며 누락과 금지 표현을 점검합니다.</span>
          </div>
        </div>
      </section>

      <section className="ct-section">
        <h2 className="ct-section-title">최근 기록</h2>
        {state === 'loading' && <div className="records-empty">최근 기록을 불러오는 중입니다.</div>}
        {state === 'error' && <div className="records-empty records-empty--error">{error}</div>}
        {state === 'ready' && recentRecords.length === 0 && (
          <div className="records-empty">
            아직 기록이 없습니다.
            <br />
            첫 기록은 오늘 한 수업이나 활동부터 시작하면 됩니다.
          </div>
        )}
        {state === 'ready' && recentRecords.length > 0 && (
          <div>
            {recentRecords.map((record) => (
              <Link key={record.id} href={`/records/${record.id}`} className="main-card">
                <div className="main-card-icon" style={RECORD_CATEGORY_META[record.category]?.accent ?? { background: '#f3f4f6', color: '#1f2937' }}>
                  {RECORD_CATEGORY_META[record.category]?.shortLabel ?? getRecordCategoryLabel(record.category).charAt(0)}
                </div>
                <div className="main-card-body">
                  <strong>{record.title}</strong>
                  <span>{getRecordCategoryLabel(record.category)} · {record.semester}</span>
                  <span className="records-item-meta">
                    {record.subject ? `${record.subject} · ` : ''}
                    {formatTimestamp(record.updatedAt ?? record.createdAt)}
                  </span>
                </div>
                <span className="main-card-arrow">&rsaquo;</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="ct-section">
        <h2 className="ct-section-title">기록할 때 주의할 점</h2>
        <div className="records-guide-card">
          <strong>학생부 반영 제한 항목</strong>
          <ul className="records-guide-list">
            <li>교외대회, 교외상, 해외활동, 방과후학교 활동은 학생부형 기록으로 분류하지 않습니다.</li>
            <li>특정 대학명, 기관명, 상호명, 강사명은 서술형 기록에 넣지 않는 것을 기본으로 합니다.</li>
            <li>수상은 교내상, 자격증은 자격증 항목에서만 관리합니다.</li>
          </ul>
        </div>
      </section>

      {user && <div className="records-footer-note">{user.email}</div>}
    </div>
  );
}
