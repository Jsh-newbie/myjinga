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
  const [favoriteJobCodes, setFavoriteJobCodes] = useState<string[]>([]);
  const [favoriteMajors, setFavoriteMajors] = useState<Array<{ majorId: string; majorName: string }>>(
    []
  );
  const [savingFavorite, setSavingFavorite] = useState<'job' | 'major' | null>(null);

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
        const [resultResponse, favoriteJobsResponse, favoriteMajorsResponse] = await Promise.all([
          api.getResult(token, resultId),
          api.listFavoriteJobs(token),
          api.listFavoriteMajors(token),
        ]);

        if (resultResponse.success) {
          setResult((resultResponse.data.item as unknown as ResultData) ?? null);
          if (favoriteJobsResponse.success) {
            setFavoriteJobCodes(favoriteJobsResponse.data.jobs.map((job) => String(job.jobCode)));
          }
          if (favoriteMajorsResponse.success) {
            setFavoriteMajors(favoriteMajorsResponse.data.majors);
          }
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
  const recommendedJob = detail?.recommendedJobs?.[0];
  const recommendedMajor = detail?.recommendedMajors?.[0];
  const recommendedJobName = recommendedJob?.name?.trim() ?? '';
  const recommendedMajorName = recommendedMajor?.name?.trim() ?? '';
  const completedDate = result?.completedAt
    ? new Date(result.completedAt._seconds * 1000).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const isRecommendedJobSaved = recommendedJob
    ? favoriteJobCodes.includes(String(recommendedJob.code))
    : false;
  const recommendedMajorFavorite = recommendedMajor
    ? favoriteMajors.find((major) => major.majorName === recommendedMajor.name)
    : null;

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

  async function handleSaveRecommendedJob() {
    if (!user || !recommendedJob || savingFavorite) return;
    setSavingFavorite('job');

    try {
      const token = await user.getIdToken();
      const response = await api.addFavoriteJob(token, recommendedJob.code, recommendedJob.name);
      if (response.success) {
        setFavoriteJobCodes((prev) => {
          const next = String(response.data.jobCode);
          return prev.includes(next) ? prev : [...prev, next];
        });
      }
    } finally {
      setSavingFavorite(null);
    }
  }

  async function handleSaveRecommendedMajor() {
    if (!user || !recommendedMajor || savingFavorite) return;
    setSavingFavorite('major');

    try {
      const token = await user.getIdToken();
      const response = await api.addFavoriteMajor(token, recommendedMajor.name);
      if (response.success) {
        setFavoriteMajors((prev) => {
          if (prev.some((major) => major.majorId === response.data.majorId)) {
            return prev;
          }

          return [
            ...prev,
            {
              majorId: response.data.majorId,
              majorName: response.data.majorName,
            },
          ];
        });
      }
    } finally {
      setSavingFavorite(null);
    }
  }

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
        {recommendedJob && !isRecommendedJobSaved && (
          <button
            type="button"
            className="ctr-action-card ctr-action-card--button"
            onClick={handleSaveRecommendedJob}
            disabled={savingFavorite !== null}
          >
            <span className="ctr-action-icon">★</span>
            <span className="ctr-action-copy">
              <strong>{recommendedJob.name} 관심 직업으로 저장하기</strong>
              <span>저장하면 대시보드와 인사이트에서 더 자주 이어서 볼 수 있어요.</span>
            </span>
            <span className="ct-test-arrow">{savingFavorite === 'job' ? '...' : '+'}</span>
          </button>
        )}
        {recommendedJob && isRecommendedJobSaved && (
          <Link href="/favorites/jobs" className="ctr-action-card">
            <span className="ctr-action-icon">★</span>
            <span className="ctr-action-copy">
              <strong>{recommendedJob.name} 관심 직업 보기</strong>
              <span>저장한 직업 목록에서 다시 확인하고 탐색으로 이어갈 수 있어요.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
        {recommendedMajor && !recommendedMajorFavorite && (
          <button
            type="button"
            className="ctr-action-card ctr-action-card--button"
            onClick={handleSaveRecommendedMajor}
            disabled={savingFavorite !== null}
          >
            <span className="ctr-action-icon">★</span>
            <span className="ctr-action-copy">
              <strong>{recommendedMajor.name} 관심 학과로 저장하기</strong>
              <span>학과를 저장해 두면 과목 추천과 학생부 연결에 바로 활용할 수 있어요.</span>
            </span>
            <span className="ct-test-arrow">{savingFavorite === 'major' ? '...' : '+'}</span>
          </button>
        )}
        {recommendedMajor && recommendedMajorFavorite && (
          <Link href="/favorites/majors" className="ctr-action-card">
            <span className="ctr-action-icon">★</span>
            <span className="ctr-action-copy">
              <strong>{recommendedMajor.name} 관심 학과 보기</strong>
              <span>저장한 학과 목록에서 다시 보고 과목 탐색으로 이어갈 수 있어요.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
        <Link href="/career-test" className="ctr-action-card">
          <span className="ctr-action-icon">{'\uD83D\uDCCB'}</span>
          <span className="ctr-action-copy">
            <strong>다른 검사도 해보기</strong>
            <span>적성, 가치관, 진로성숙도까지 이어서 보면 추천 해석이 더 선명해집니다.</span>
          </span>
          <span className="ct-test-arrow">&rsaquo;</span>
        </Link>
        {recommendedJobName ? (
          <Link
            href={`/explore/jobs?jobName=${encodeURIComponent(recommendedJobName)}`}
            className="ctr-action-card"
          >
            <span className="ctr-action-icon">{'\uD83D\uDD0D'}</span>
            <span className="ctr-action-copy">
              <strong>{recommendedJobName} 탐색하기</strong>
              <span>직업 정보와 필요한 역량을 더 자세히 확인해 보세요.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        ) : (
          <Link href="/explore/jobs" className="ctr-action-card">
            <span className="ctr-action-icon">{'\uD83D\uDD0D'}</span>
            <span className="ctr-action-copy">
              <strong>직업 탐색으로 이어가기</strong>
              <span>관심 직업을 찾아 저장하면 맞춤 추천이 더 좋아집니다.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
        {recommendedMajorName ? (
          <Link
            href={
              recommendedMajor
                ? `/explore/majors/${recommendedMajor.seq}`
                : `/explore/majors?q=${encodeURIComponent(recommendedMajorName)}`
            }
            className="ctr-action-card"
          >
            <span className="ctr-action-icon">{'\uD83C\uDF93'}</span>
            <span className="ctr-action-copy">
              <strong>{recommendedMajorName} 탐색하기</strong>
              <span>추천 학과의 특성과 관련 교과목을 바로 확인할 수 있어요.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        ) : (
          <Link href="/records/new" className="ctr-action-card">
            <span className="ctr-action-icon">{'\u270F\uFE0F'}</span>
            <span className="ctr-action-copy">
              <strong>학생부에 기록하기</strong>
              <span>검사에서 떠오른 생각을 바로 기록으로 남겨 보세요.</span>
            </span>
            <span className="ct-test-arrow">&rsaquo;</span>
          </Link>
        )}
      </section>
    </div>
  );
}
