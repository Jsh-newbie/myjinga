'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { CAREER_TESTS, type CareerTestTypeId } from '@/lib/careernet/constants';

interface RealmData {
  rank: number;
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
}

interface RealmMetaData {
  code: string;
  name: string;
  description: string;
}

interface RecommendedJobData {
  name: string;
  code: number;
  description: string;
  thumbnail?: string;
}

interface RecommendedMajorData {
  name: string;
  seq: number;
  summary: string;
  thumbnail?: string;
}

interface ReportDetailData {
  inspctSeq: string;
  testCode: string;
  gender: string;
  target: string;
  grade: string;
  completedAt: string;
  responseTime: number;
  responsePattern?: string;
  realms: RealmData[];
  realmMeta?: RealmMetaData[];
  recommendedJobs?: RecommendedJobData[];
  recommendedMajors?: RecommendedMajorData[];
}

interface ResultData {
  id: string;
  testTypeId: CareerTestTypeId;
  resultUrl: string;
  reportDetail?: ReportDetailData;
  completedAt?: { _seconds: number };
}

function getGradeLabel(percentile: number): { label: string; className: string } {
  if (percentile >= 85) return { label: '매우높음', className: 'ctr-grade--5' };
  if (percentile >= 65) return { label: '높음', className: 'ctr-grade--4' };
  if (percentile >= 35) return { label: '보통', className: 'ctr-grade--3' };
  if (percentile >= 15) return { label: '약간낮음', className: 'ctr-grade--2' };
  return { label: '낮음', className: 'ctr-grade--1' };
}

export default function CareerTestResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;

  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
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
      if (!u) { router.replace('/auth/signin'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch(`/api/career-net/results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setResult(d.data?.item ?? null);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, resultId]);

  const meta = result?.testTypeId ? CAREER_TESTS[result.testTypeId] : null;
  const detail = result?.reportDetail;
  const completedDate = result?.completedAt
    ? new Date(result.completedAt._seconds * 1000).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  if (loading) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/career-test" className="ct-back">&lsaquo;</Link>
          <span className="ct-header-title">검사 결과</span>
          <span />
        </header>
        <div className="ct-loading">
          <div className="main-skeleton" style={{ height: 200, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/career-test" className="ct-back">&lsaquo;</Link>
          <span className="ct-header-title">검사 결과</span>
          <span />
        </header>
        <div className="ctr-empty">
          <p>검사 결과를 찾을 수 없습니다.</p>
          <Link href="/career-test" className="ctr-back-link">검사 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const sortedRealms = detail ? [...detail.realms].sort((a, b) => b.percentile - a.percentile) : [];
  const top3 = sortedRealms.slice(0, 3);
  const maxPercentile = detail ? Math.max(...detail.realms.map((r) => r.percentile)) : 100;
  const metaMap = new Map((detail?.realmMeta ?? []).map((m) => [m.code, m]));

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/career-test" className="ct-back">&lsaquo;</Link>
        <span className="ct-header-title">검사 결과</span>
        <span />
      </header>

      <section className="ctr-result-info">
        <h1 className="ctr-title">{meta?.name ?? result.testTypeId} 결과</h1>
        {completedDate && <p className="ctr-date">{completedDate} 완료</p>}
      </section>

      {/* 상세 결과가 있으면 표시 */}
      {detail && (
        <>
          {/* 상위 3개 영역 */}
          <section className="ctr-top3">
            <h2 className="ctr-section-title">나의 상위 적성</h2>
            <div className="ctr-top3-list">
              {top3.map((realm, idx) => {
                const desc = metaMap.get(realm.code)?.description;
                return (
                  <div key={realm.code} className="ctr-top3-item">
                    <span className="ctr-top3-rank">{idx + 1}</span>
                    <div className="ctr-top3-body">
                      <span className="ctr-top3-name">{realm.name}</span>
                      {desc && <span className="ctr-top3-desc">{desc}</span>}
                    </div>
                    <span className="ctr-top3-score">{realm.percentile}점</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 영역별 백분위 차트 */}
          <section className="ctr-chart">
            <h2 className="ctr-section-title">영역별 백분위</h2>
            <div className="ctr-bar-list">
              {sortedRealms.map((realm) => {
                  const grade = getGradeLabel(realm.percentile);
                  return (
                    <div key={realm.code} className="ctr-bar-row">
                      <span className="ctr-bar-label">{realm.name}</span>
                      <div className="ctr-bar-track">
                        <div
                          className={`ctr-bar-fill ${grade.className}`}
                          style={{ width: `${(realm.percentile / maxPercentile) * 100}%` }}
                        />
                      </div>
                      <span className="ctr-bar-value">{realm.percentile}</span>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* 전체 결과 테이블 */}
          <section className="ctr-table-section">
            <h2 className="ctr-section-title">상세 결과</h2>
            <div className="ctr-table-wrap">
              <table className="ctr-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>적성 영역</th>
                    <th>백분위</th>
                    <th>수준</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRealms.map((realm, idx) => {
                    const grade = getGradeLabel(realm.percentile);
                    const desc = metaMap.get(realm.code)?.description;
                    return (
                      <tr key={realm.code}>
                        <td>{idx + 1}</td>
                        <td className="ctr-td-name">
                          {realm.name}
                          {desc && <span className="ctr-td-desc">{desc}</span>}
                        </td>
                        <td className="ctr-td-score">{realm.percentile}</td>
                        <td>
                          <span className={`ctr-grade-badge ${grade.className}`}>{grade.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {detail.responsePattern && (
            <p className="ctr-pattern-warn">{detail.responsePattern}</p>
          )}
        </>
      )}

      {/* 추천 직업 */}
      {detail?.recommendedJobs && detail.recommendedJobs.length > 0 && (
        <section className="ctr-recommend">
          <h2 className="ctr-section-title">추천 직업</h2>
          <div className="ctr-recommend-list">
            {detail.recommendedJobs.map((job) => (
              <div key={job.code} className="ctr-recommend-card">
                <strong className="ctr-recommend-name">{job.name}</strong>
                <p className="ctr-recommend-desc">{job.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 추천 학과 */}
      {detail?.recommendedMajors && detail.recommendedMajors.length > 0 && (
        <section className="ctr-recommend">
          <h2 className="ctr-section-title">추천 학과</h2>
          <div className="ctr-recommend-list">
            {detail.recommendedMajors.map((major) => (
              <div key={major.seq} className="ctr-recommend-card">
                <strong className="ctr-recommend-name">{major.name}</strong>
                <p className="ctr-recommend-desc">{major.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 커리어넷 상세 결과 링크 */}
      <section className="ctr-report-card">
        <div className="ctr-report-label">커리어넷 상세 리포트</div>
        <a
          href={result.resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ctr-report-link"
        >
          커리어넷에서 전체 결과 보기 &rarr;
        </a>
        <p className="ctr-report-desc">
          추천 직업, 강화방법 등 더 자세한 분석 결과를 확인할 수 있습니다.
        </p>
      </section>

      <section className="ctr-actions">
        <h2 className="ctr-section-title">다음 추천 액션</h2>
        <Link href="/career-test" className="ctr-action-card">
          <span className="ctr-action-icon">{'\uD83D\uDCCB'}</span>
          <span>다른 검사도 해보기</span>
          <span className="ct-test-arrow">&rsaquo;</span>
        </Link>
        <Link href="/explore" className="ctr-action-card">
          <span className="ctr-action-icon">{'\uD83D\uDD0D'}</span>
          <span>결과 기반 직업 탐색하기</span>
          <span className="ct-test-arrow">&rsaquo;</span>
        </Link>
        <Link href="/records" className="ctr-action-card">
          <span className="ctr-action-icon">{'\u270F\uFE0F'}</span>
          <span>학생부에 기록하기</span>
          <span className="ct-test-arrow">&rsaquo;</span>
        </Link>
      </section>
    </div>
  );
}
