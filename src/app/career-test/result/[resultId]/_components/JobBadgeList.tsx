'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

// --- Types ---

interface JobItem {
  code: string | number;
  name: string;
}

interface JobDetailData {
  jobCode: number;
  jobName: string;
  work: string[];
  wage: number;
  wlb: string;
  satisfication: number;
  social: string;
  aptitName: string;
  relJobName: string;
  stdJobName: string;
  departments: string[];
  certificates: string[];
  interests: string[];
  abilities: string[];
  research: string[];
  forecast: string[];
  jobReady?: {
    recruit: string;
    certificate: string;
    training: string;
    curriculum: string;
  };
}

// --- JobBadgeList ---

const COLLAPSE_THRESHOLD = 25;

export function JobBadgeList({ jobs }: { jobs: JobItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  const shouldCollapse = jobs.length > COLLAPSE_THRESHOLD;
  const visibleJobs = shouldCollapse && !expanded ? jobs.slice(0, COLLAPSE_THRESHOLD) : jobs;
  const hiddenCount = jobs.length - COLLAPSE_THRESHOLD;

  return (
    <>
      <div className="ctr-job-badges">
        {visibleJobs.map((j) => (
          <button
            key={`${j.code}-${j.name}`}
            type="button"
            className="ctr-job-badge ctr-job-badge--clickable"
            onClick={() => setSelectedJob(j)}
          >
            {j.name}
          </button>
        ))}
        {shouldCollapse && !expanded && (
          <button
            type="button"
            className="ctr-job-badge ctr-job-badge--more"
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount}개 더보기
          </button>
        )}
        {shouldCollapse && expanded && (
          <button
            type="button"
            className="ctr-job-badge ctr-job-badge--more"
            onClick={() => setExpanded(false)}
          >
            접기
          </button>
        )}
      </div>
      {selectedJob && (
        <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </>
  );
}

// --- JobModal ---

function JobModal({ job, onClose }: { job: JobItem; onClose: () => void }) {
  const [detail, setDetail] = useState<JobDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) { setError('로그인이 필요합니다.'); return; }

      const token = await user.getIdToken();

      // 직업 코드로 먼저 검색 시도
      const numCode = typeof job.code === 'string' ? parseInt(job.code, 10) : job.code;
      if (numCode && !isNaN(numCode)) {
        const res = await api.getJobDetail(token, numCode);
        if (res.success && res.data.job) {
          setDetail(res.data.job as unknown as JobDetailData);
          return;
        }
      }

      // 코드가 없거나 실패하면 이름으로 검색
      const searchRes = await api.searchJobs(token, job.name);
      if (searchRes.success && searchRes.data.jobs.length > 0) {
        // 첫 번째 결과의 seq로 상세 조회
        const firstJob = searchRes.data.jobs[0];
        const detailRes = await api.getJobDetail(token, firstJob.seq);
        if (detailRes.success && detailRes.data.job) {
          setDetail(detailRes.data.job as unknown as JobDetailData);
          return;
        }
      }

      setError('직업 정보를 찾을 수 없습니다.');
    } catch {
      setError('직업 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [job]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 관심 직업 여부 확인
  useEffect(() => {
    async function checkFavorite() {
      try {
        const auth = getClientAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await api.listFavoriteJobs(token);
        if (res.success) {
          const jobCode = detail?.jobCode ?? (typeof job.code === 'string' ? parseInt(job.code, 10) : job.code);
          setIsFavorite(res.data.jobs.some((f) => f.jobCode === String(jobCode)));
        }
      } catch { /* ignore */ }
    }
    checkFavorite();
  }, [detail, job.code]);

  async function toggleFavorite() {
    if (!detail || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      if (isFavorite) {
        await api.removeFavoriteJob(token, detail.jobCode);
        setIsFavorite(false);
      } else {
        await api.addFavoriteJob(token, detail.jobCode, detail.jobName);
        setIsFavorite(true);
      }
    } catch { /* ignore */ }
    finally { setFavoriteLoading(false); }
  }

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div className="ctr-modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="ctr-modal" role="dialog" aria-modal="true" aria-label={`${job.name} 직업 정보`}>
        <div className="ctr-modal-header">
          <h3 className="ctr-modal-title">{job.name}</h3>
          <button type="button" className="ctr-modal-close" onClick={onClose} aria-label="닫기">&times;</button>
        </div>

        <div className="ctr-modal-body">
          {loading && (
            <div className="ctr-modal-loading">
              <div className="ctr-modal-spinner" />
              <span>직업 정보를 불러오는 중...</span>
            </div>
          )}

          {error && !loading && (
            <div className="ctr-modal-error">
              <p>{error}</p>
            </div>
          )}

          {detail && !loading && (
            <div className="ctr-modal-detail">
              {/* 기본 정보 */}
              <div className="ctr-modal-section">
                <h4>하는 일</h4>
                {detail.work.length > 0 ? (
                  <ul className="ctr-modal-work-list">
                    {detail.work.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : (
                  <p className="ctr-modal-empty">정보 없음</p>
                )}
              </div>

              {/* 연봉/만족도 */}
              <div className="ctr-modal-stats">
                {detail.wage != null && detail.wage > 0 && (
                  <div className="ctr-modal-stat">
                    <span className="ctr-modal-stat-label">평균 연봉</span>
                    <span className="ctr-modal-stat-value">{detail.wage.toLocaleString()}만원</span>
                  </div>
                )}
                {detail.satisfication != null && detail.satisfication > 0 && (
                  <div className="ctr-modal-stat">
                    <span className="ctr-modal-stat-label">직업 만족도</span>
                    <span className="ctr-modal-stat-value">{detail.satisfication}%</span>
                  </div>
                )}
                {detail.wlb && (
                  <div className="ctr-modal-stat">
                    <span className="ctr-modal-stat-label">일·가정 균형</span>
                    <span className="ctr-modal-stat-value">{detail.wlb}</span>
                  </div>
                )}
              </div>

              {/* 관련 학과 */}
              {detail.departments.length > 0 && (
                <div className="ctr-modal-section">
                  <h4>관련 학과</h4>
                  <div className="ctr-modal-tags">
                    {detail.departments.map((d, i) => <span key={i} className="ctr-modal-tag">{d}</span>)}
                  </div>
                </div>
              )}

              {/* 관련 자격증 */}
              {detail.certificates.length > 0 && (
                <div className="ctr-modal-section">
                  <h4>관련 자격증</h4>
                  <div className="ctr-modal-tags">
                    {detail.certificates.map((c, i) => <span key={i} className="ctr-modal-tag">{c}</span>)}
                  </div>
                </div>
              )}

              {/* 핵심 능력 */}
              {detail.abilities.length > 0 && (
                <div className="ctr-modal-section">
                  <h4>핵심 능력</h4>
                  <div className="ctr-modal-tags">
                    {detail.abilities.map((a, i) => <span key={i} className="ctr-modal-tag">{a}</span>)}
                  </div>
                </div>
              )}

              {/* 직업 전망 */}
              {detail.forecast.length > 0 && (
                <div className="ctr-modal-section">
                  <h4>직업 전망</h4>
                  <ul className="ctr-modal-work-list">
                    {detail.forecast.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}

              {/* 입직 및 취업 방법 */}
              {detail.jobReady && (
                <div className="ctr-modal-section">
                  <h4>취업 준비</h4>
                  {detail.jobReady.recruit && (
                    <div className="ctr-modal-ready-item">
                      <strong>입직 및 취업방법</strong>
                      <p>{detail.jobReady.recruit}</p>
                    </div>
                  )}
                  {detail.jobReady.curriculum && (
                    <div className="ctr-modal-ready-item">
                      <strong>정규 교육과정</strong>
                      <p>{detail.jobReady.curriculum}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단: 관심 직업 + 자세히 보기 */}
        {detail && !loading && (
          <div className="ctr-modal-footer">
            <button
              type="button"
              className={`ctr-modal-favorite${isFavorite ? ' ctr-modal-favorite--active' : ''}`}
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              aria-label={isFavorite ? '관심 직업 해제' : '관심 직업 추가'}
              title={isFavorite ? '관심 직업 해제' : '관심 직업 추가'}
            >
              <span className="ctr-modal-favorite-star">{isFavorite ? '★' : '☆'}</span>
              <span className="ctr-modal-favorite-label">관심 직업</span>
            </button>
            <a
              href={`https://www.career.go.kr/cnet/front/base/job/jobView.do?SEQ=${detail.jobCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ctr-modal-detail-link"
            >
              커리어넷에서 자세히 보기 &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
