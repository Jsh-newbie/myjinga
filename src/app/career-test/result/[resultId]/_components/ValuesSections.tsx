'use client';

import {
  CollapsibleSection,
  RadarChart,
  type RealmData,
  type ReportDetailData,
} from './shared';
import { JobBadgeList } from './JobBadgeList';

export function ValuesSections({ detail }: { detail: ReportDetailData; realms: RealmData[] }) {
  const hierarchy = detail.valuesHierarchy;
  const uppers = hierarchy?.uppers ?? [];
  const subDims = hierarchy?.subDimensions ?? [];
  const orientations = detail.valuesOrientations ?? [];

  const sortedSubDims = [...subDims].sort((a, b) => b.userScore - a.userScore);
  const top3Values = sortedSubDims.slice(0, 3);

  const maxScore = Math.max(
    ...subDims.map((sd) => sd.userScore),
    ...subDims.map((sd) => sd.demographicAvg ?? 0),
    1
  );

  const sortedOrientations = [...orientations].sort((a, b) => b.score - a.score);
  const topOrientation = sortedOrientations[0];

  return (
    <>
      {/* 검사 설명 */}
      <section className="ctr-test-intro">
        <h3 className="ctr-test-intro-title">직업가치관검사란?</h3>
        <p>
          직업가치관검사는 여러분이 직업을 선택할 때 상대적으로 어떠한 가치를
          중요하게 여기는지를 알아보기 위한 것입니다. 직업가치를 잘 알면
          직업선택에 중요한 기준이 되며, 자신의 가치와 일치하는 직업을 선택했을 때
          더 큰 만족감과 성취감을 느끼게 됩니다.
        </p>
        <p className="ctr-test-intro-note">
          ※ 직업가치관검사는 정답이 없습니다. 맞고 틀리거나 좋고
          나쁜 것으로 구분될 수 없음에 유의하여 결과를 참고하시기 바랍니다.
        </p>
      </section>

      {/* 1. 검사자님의 검사결과 */}
      <CollapsibleSection title="1. 검사자님의 검사결과">
        {top3Values.length > 0 ? (
          <div className="ctr-values-summary">
            <div className="ctr-values-summary-col">
              <div className="ctr-values-summary-icon">📊</div>
              <div className="ctr-values-summary-label">검사결과<br />상위 직업가치관</div>
              <div className="ctr-values-summary-tags">
                {top3Values.map((v) => (
                  <span key={v.code} className="ctr-values-tag">{v.name}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="ctr-empty-detail">가치관 데이터를 불러오는 중입니다.</p>
        )}
      </CollapsibleSection>

      {/* 2. 12가지 직업가치관 점수 */}
      {subDims.length > 0 && (
        <CollapsibleSection title="2. 12가지 직업가치관 점수">
          <p className="ctr-section-desc">
            12가지 직업가치관 점수가 각 직업가치관을 중요하게 생각하는 정도를 나타냅니다.
          </p>
          <div className="ctr-values-score-table ctr-values-score-table--dual">
            <div className="ctr-values-score-header">
              <span>가치</span>
              <span>학년 평균 점수</span>
              <span>나의 점수</span>
              <span>가치</span>
              <span>학년 평균 점수</span>
              <span>나의 점수</span>
            </div>
            {Array.from({ length: Math.ceil(subDims.length / 2) }).map((_, i) => {
              const left = subDims[i];
              const right = subDims[i + Math.ceil(subDims.length / 2)];
              return (
                <div key={i} className="ctr-values-score-row">
                  <span className="ctr-values-score-name">{left?.name ?? ''}</span>
                  <span className="ctr-values-score-avg">
                    {left?.demographicAvg != null ? left.demographicAvg.toFixed(2) : '-'}
                  </span>
                  <span className="ctr-values-score-val">{left?.userScore ?? ''}</span>
                  <span className="ctr-values-score-name">{right?.name ?? ''}</span>
                  <span className="ctr-values-score-avg">
                    {right?.demographicAvg != null ? right.demographicAvg.toFixed(2) : '-'}
                  </span>
                  <span className="ctr-values-score-val">{right?.userScore ?? ''}</span>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* 3. 가치지향 유형 */}
      {orientations.length > 0 && (
        <CollapsibleSection title="3. 가치지향 유형">
          {topOrientation && (
            <p className="ctr-section-desc">
              검사자님은 <strong>&ldquo;{topOrientation.name}&rdquo;</strong> 유형입니다.
            </p>
          )}
          <div className="ctr-values-orient-table">
            <div className="ctr-values-orient-header">
              <span>유형</span>
              <span>주요 가치</span>
              <span>내용</span>
            </div>
            {sortedOrientations.map((o) => (
              <div
                key={o.code}
                className={`ctr-values-orient-row ${topOrientation?.code === o.code ? 'ctr-values-orient-row--active' : ''}`}
              >
                <span className="ctr-values-orient-name">{o.name}</span>
                <span className="ctr-values-orient-subs">{o.subValues.join(', ')}</span>
                <span className="ctr-values-orient-desc">{o.description}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* 4. 12가지 직업가치관 점수 비교 차트 */}
      {subDims.length > 0 && (
        <CollapsibleSection title="4. 12가지 직업가치관 점수 (상세)">
          <p className="ctr-section-desc">
            나의 점수와 학년 평균 점수를 비교하여 각 가치관의 상대적 중요도를 확인해 보세요.
          </p>
          <div className="ctr-values-bar-list">
            {subDims.map((sd) => (
              <div key={sd.code} className="ctr-values-bar-item">
                <span className="ctr-values-bar-label">{sd.name}</span>
                <div className="ctr-values-bar-tracks">
                  <div className="ctr-values-bar-row">
                    <div className="ctr-values-bar-track">
                      <div
                        className="ctr-values-bar-fill ctr-values-bar-fill--user"
                        style={{ width: `${(sd.userScore / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="ctr-values-bar-val">{sd.userScore}</span>
                  </div>
                  {sd.demographicAvg != null && (
                    <div className="ctr-values-bar-row">
                      <div className="ctr-values-bar-track">
                        <div
                          className="ctr-values-bar-fill ctr-values-bar-fill--avg"
                          style={{ width: `${(sd.demographicAvg / maxScore) * 100}%` }}
                        />
                      </div>
                      <span className="ctr-values-bar-val">{sd.demographicAvg.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="ctr-values-bar-legend">
            <span className="ctr-values-legend-item ctr-values-legend--user">나의 점수</span>
            <span className="ctr-values-legend-item ctr-values-legend--avg">학년 평균</span>
          </div>
        </CollapsibleSection>
      )}

      {/* 5. 12가지 직업가치관에 대한 설명 */}
      {subDims.length > 0 && subDims.some((sd) => sd.description) && (
        <CollapsibleSection title="5. 12가지 직업가치관에 대한 설명">
          <div className="ctr-values-desc-list">
            {subDims.map((sd) => (
              sd.description ? (
                <div key={sd.code} className="ctr-values-desc-item">
                  <strong className="ctr-values-desc-name">{sd.name}</strong>
                  <p className="ctr-values-desc-text">{sd.description}</p>
                </div>
              ) : null
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* 6. 4가지 가치지향 유형 결과 및 특성 */}
      {orientations.length > 0 && (
        <CollapsibleSection title="6. 4가지 가치지향 유형 결과 및 특성">
          {topOrientation && (
            <p className="ctr-section-desc">
              검사자님은 <strong>&ldquo;{topOrientation.name}&rdquo;</strong> 유형입니다.
            </p>
          )}
          <div className="ctr-values-orient-bars">
            {sortedOrientations.map((o) => (
              <div key={o.code} className="ctr-values-orient-bar-row">
                <span className="ctr-values-orient-bar-label">{o.name}</span>
                <div className="ctr-values-orient-bar-track">
                  <div
                    className={`ctr-values-orient-bar-fill ${topOrientation?.code === o.code ? 'ctr-values-orient-bar-fill--active' : ''}`}
                    style={{ width: `${(o.score / Math.max(...orientations.map((x) => x.score), 1)) * 100}%` }}
                  />
                </div>
                <span className="ctr-values-orient-bar-val">{o.score}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* 7. 가치 프로파일 차트 (레이더) */}
      {subDims.length >= 3 && (
        <CollapsibleSection title="7. 가치 프로파일 차트">
          <RadarChart
            data={subDims.map((sd) => ({ label: sd.name, value: sd.userScore }))}
            maxValue={Math.max(...subDims.map((sd) => sd.userScore), 1) * 1.2}
          />
        </CollapsibleSection>
      )}

      {/* 8. 가치지향별 관련 직업명 */}
      {orientations.some((o) => o.jobs.length > 0) && (
        <CollapsibleSection title="8. 가치지향별 관련 직업명">
          <div className="ctr-values-jobs-list">
            {orientations.map((o) => (
              o.jobs.length > 0 ? (
                <div key={o.code} className="ctr-values-jobs-group">
                  <div className="ctr-values-jobs-header">{o.name} 관련 직업명</div>
                  <div className="ctr-values-jobs-tags">
                    <JobBadgeList jobs={o.jobs.map((j) => ({ code: j.jobCode ?? '', name: j.name }))} />
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}
