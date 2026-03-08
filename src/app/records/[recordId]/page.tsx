'use client';

import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { api } from '@/lib/api/client';
import { getClientAuth } from '@/lib/firebase/client';
import { getRecordCategoryLabel, RECORD_CATEGORY_META } from '@/lib/records/presenter';
import type { StudentRecord } from '@/types/record';

type LoadingState = 'loading' | 'ready' | 'error';

function formatDateString(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR');
}

export default function RecordDetailPage() {
  const router = useRouter();
  const params = useParams<{ recordId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [record, setRecord] = useState<StudentRecord | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);
    });

    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (!user || !params.recordId) return;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const result = await api.getRecord(token, params.recordId);

        if (!result.success) {
          setError(result.error.message);
          setState('error');
          return;
        }

        setRecord(result.data.record);
        setState('ready');
      } catch {
        setError('기록을 불러오는 중 오류가 발생했습니다.');
        setState('error');
      }
    }

    load();
  }, [user, params.recordId]);

  const accent = record ? RECORD_CATEGORY_META[record.category]?.accent : undefined;

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/records" className="ct-back">&lsaquo;</Link>
        <span className="ct-header-title">기록 상세</span>
        <span />
      </header>

      {state === 'loading' && (
        <div className="records-empty">기록을 불러오는 중입니다.</div>
      )}

      {state === 'error' && (
        <div className="records-empty records-empty--error">{error}</div>
      )}

      {state === 'ready' && record && (
        <>
          <section className="ct-intro">
            <h1>{record.title}</h1>
            <p>{getRecordCategoryLabel(record.category)} · {record.semester}</p>
          </section>

          <section className="record-detail-shell">
            <div className="record-selected-chip" style={accent}>
              {getRecordCategoryLabel(record.category)}
            </div>

            <div className="record-review-row">
              <span>기록 시점</span>
              <strong>{formatDateString(record.recordDate)}</strong>
            </div>

            {record.subject && (
              <div className="record-review-row">
                <span>과목</span>
                <strong>{record.subject}</strong>
              </div>
            )}

            {typeof record.hours === 'number' && (
              <div className="record-review-row">
                <span>시간</span>
                <strong>{record.hours}시간</strong>
              </div>
            )}

            <div className="record-review-block">
              <span>핵심 내용</span>
              <p>{record.content}</p>
            </div>

            {record.careerRelevance && (
              <div className="record-review-block">
                <span>진로 연결</span>
                <p>{record.careerRelevance}</p>
              </div>
            )}

            {record.tags && record.tags.length > 0 && (
              <div className="record-tag-list">
                {record.tags.map((tag) => (
                  <span key={tag} className="record-tag">{tag}</span>
                ))}
              </div>
            )}

            {record.metadata && Object.keys(record.metadata).length > 0 && (
              <div className="record-meta-panel">
                <strong>추가 메모</strong>
                <div className="record-meta-grid">
                  {Object.entries(record.metadata).map(([key, value]) => (
                    <div key={key} className="record-meta-item">
                      <span>{key}</span>
                      <p>{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
