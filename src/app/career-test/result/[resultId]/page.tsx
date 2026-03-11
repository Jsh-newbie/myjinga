'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';
import { CAREER_TESTS } from '@/lib/careernet/constants';

import { numify, ReliabilityBadge, type ResultData } from './_components/shared';
import { AptitudeSections } from './_components/AptitudeSections';
import { InterestSections } from './_components/InterestSections';
import { MaturitySections } from './_components/MaturitySections';
import { ValuesSections } from './_components/ValuesSections';
import { CompetencySections } from './_components/CompetencySections';

export default function CareerTestResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;

  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError(null);
      try {
        const token = await user!.getIdToken();
        const res = await api.getResult(token, resultId);
        if (res.success) {
          setResult((res.data.item as unknown as ResultData) ?? null);
        } else {
          setLoadError('검사 결과를 불러오지 못했습니다.');
        }
      } catch {
        setLoadError('데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, resultId]);

  const meta = result?.testTypeId ? CAREER_TESTS[result.testTypeId] : null;
  const detail = result?.reportDetail;
  const recommendedJobName = detail?.recommendedJobs?.[0]?.name?.trim() ?? '';
  const recommendedMajorName = detail?.recommendedMajors?.[0]?.name?.trim() ?? '';
  const completedDate = result?.completedAt
    ? new Date(result.completedAt._seconds * 1000).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const normalizedRealms = useMemo(
    () =>
      (detail?.realms ?? []).map((r) => ({
        ...r,
        percentile: numify(r.percentile),
        tScore: numify(r.tScore),
        rawScore: numify(r.rawScore),
      })),
    [detail?.realms]
  );

  if (loading) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/career-test" className="ct-back">
            &lsaquo;
          </Link>
          <span className="ct-header-title">검사 결과</span>
          <span />
        </header>
        <div className="ct-loading">
          <div className="main-skeleton" style={{ height: 200, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/career-test" className="ct-back">
            &lsaquo;
          </Link>
          <span className="ct-header-title">검사 결과</span>
          <span />
        </header>
        <div className="ct-error">
          <p>{loadError}</p>
          <button onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="ct-page">
        <header className="ct-header">
          <Link href="/career-test" className="ct-back">
            &lsaquo;
          </Link>
          <span className="ct-header-title">검사 결과</span>
          <span />
        </header>
        <div className="ctr-empty">
          <p>검사 결과를 찾을 수 없습니다.</p>
          <Link href="/career-test" className="ctr-back-link">
            검사 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/career-test" className="ct-back">
          &lsaquo;
        </Link>
        <span className="ct-header-title">검사 결과</span>
        <span />
      </header>

      <section className="ctr-result-info">
        <h1 className="ctr-title">{meta?.name ?? result.testTypeId} 결과</h1>
        {completedDate && <p className="ctr-date">{completedDate} 완료</p>}
        {detail && <ReliabilityBadge detail={detail} testTypeId={result.testTypeId} />}
      </section>

      {detail && (
        <>
          {result.testTypeId === 'aptitude' && (
            <AptitudeSections detail={detail} realms={normalizedRealms} />
          )}
          {result.testTypeId === 'interest' && (
            <InterestSections detail={detail} realms={normalizedRealms} />
          )}
          {result.testTypeId === 'maturity' && (
            <MaturitySections detail={detail} realms={normalizedRealms} />
          )}
          {result.testTypeId === 'values' && (
            <ValuesSections detail={detail} realms={normalizedRealms} />
          )}
          {result.testTypeId === 'competency' && (
            <CompetencySections detail={detail} realms={normalizedRealms} />
          )}
        </>
      )}

      {/* 데이터가 아예 없는 경우 */}
      {detail &&
        normalizedRealms.length === 0 &&
        !detail.interestProfiles &&
        !detail.valuesHierarchy && (
          <section className="ctr-recommend">
            <p className="ctr-empty-detail">
              상세 결과를 불러오는 중입니다. 잠시 후 다시 확인해 주세요.
            </p>
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
        {recommendedJobName ? (
          <Link
            href={`/explore/jobs?jobName=${encodeURIComponent(recommendedJobName)}`}
            className="ctr-action-card"
          >
            <span className="ctr-action-icon">{'\uD83D\uDD0D'}</span>
            <span>{recommendedJobName} 탐색하기</span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        ) : (
          <Link href="/explore/jobs" className="ctr-action-card">
            <span className="ctr-action-icon">{'\uD83D\uDD0D'}</span>
            <span>직업 탐색으로 이어가기</span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
        {recommendedMajorName ? (
          <Link
            href={`/explore/majors?q=${encodeURIComponent(recommendedMajorName)}`}
            className="ctr-action-card"
          >
            <span className="ctr-action-icon">{'\uD83C\uDF93'}</span>
            <span>{recommendedMajorName} 탐색하기</span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        ) : (
          <Link href="/records/new" className="ctr-action-card">
            <span className="ctr-action-icon">{'\u270F\uFE0F'}</span>
            <span>학생부에 기록하기</span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
      </section>
    </div>
  );
}
