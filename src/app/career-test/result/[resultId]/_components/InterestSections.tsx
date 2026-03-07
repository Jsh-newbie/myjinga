'use client';

import {
  CollapsibleSection,
  RadarChart,
  type RealmData,
  type RealmInterpData,
  type ReportDetailData,
} from './shared';
import { JobBadgeList } from './JobBadgeList';

export function InterestSections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const profiles = detail.interestProfiles;
  const interestData = profiles?.interest ?? [];
  const jobData = profiles?.job ?? [];
  const interpList = detail.realmInterpretations ?? [];

  // icode → Holland code 매핑
  const ICODE_TO_HOLLAND: Record<string, string> = {
    '101895': 'R', '101896': 'I', '101897': 'A',
    '101898': 'S', '101899': 'E', '101900': 'C',
  };
  // Holland code로 interp 찾기 (icode 또는 이름 매칭)
  function findInterp(hollandCode: string) {
    return interpList.find((ri) => {
      if (ICODE_TO_HOLLAND[ri.code] === hollandCode) return true;
      const nameMap: Record<string, string[]> = {
        R: ['현실형'], I: ['탐구형'], A: ['예술형'],
        S: ['사회형'], E: ['기업형', '진취형'], C: ['관습형'],
      };
      return nameMap[hollandCode]?.includes(ri.name) ?? false;
    });
  }

  // Top 2 흥미 유형 (점수순)
  const sortedInterest = [...interestData].sort((a, b) => b.tScore - a.tScore);
  const top2Interest = sortedInterest.slice(0, 2);

  // Top 2 선호직업군 (점수순)
  const sortedJob = [...jobData].sort((a, b) => b.tScore - a.tScore);
  const top2Job = sortedJob.slice(0, 2);

  const maxT = Math.max(...interestData.map((p) => p.tScore), ...jobData.map((p) => p.tScore), 1);

  return (
    <>
      {/* 검사 설명 */}
      <section className="ctr-test-intro">
        <h3 className="ctr-test-intro-title">직업흥미검사란?</h3>
        <p>
          커리어넷 직업흥미검사는 홀랜드 직업흥미유형 이론에 따라 설계되었습니다.
          홀랜드 직업흥미유형은 미국의 심리학자인 John L. Holland가 개발한 것으로
          성격 유형에 기반하여 개인 흥미를 탐색하는 심리검사 이론입니다.
        </p>
        <p>
          본 검사를 통하여 나의 성격과 생활모습, 어떤 직업적 활동에 흥미를 느끼는지
          살펴보고 관련 직업과 학과정보를 다양하게 탐색할 수 있습니다.
          향후 합리적 진로의사를 내리고 진로를 설계할 때 도움이 될 것입니다.
        </p>
        <div className="ctr-test-intro-diff">
          <h4>일반 흥미 유형 vs 선호직업군의 차이</h4>
          <ul>
            <li>
              <strong>일반 흥미 유형</strong>은 나의 성격과 생활모습을 바탕으로 측정한
              흥미 유형입니다. 평소 어떤 활동을 좋아하고 어떤 성향을 가지고 있는지를 반영합니다.
            </li>
            <li>
              <strong>선호직업군(흥미)</strong>은 구체적인 직업 활동에 대한 선호도를 측정한
              결과입니다. 실제 직업에서 하는 일 중 어떤 것을 좋아하는지를 반영합니다.
            </li>
            <li>
              두 결과가 일치하면 흥미와 직업 선호가 같은 방향이며, 불일치하더라도 진로 선택에
              다양한 가능성이 있다는 의미이므로 부정적으로 볼 필요가 없습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* 1. 일반 흥미 유형 및 관련 직업군 (상위 2개) */}
      <CollapsibleSection title="1. 일반 흥미 유형 및 관련 직업군 (상위 2개)">
        {top2Interest.length > 0 ? (
          <div className="ctr-holland-top2">
            {top2Interest.map((p, idx) => {
              const interp = findInterp(p.code);
              return (
                <div key={p.code} className="ctr-holland-card">
                  <div className="ctr-holland-rank">{idx + 1}순위</div>
                  <div className="ctr-holland-type">
                    <span className="ctr-holland-code">{p.code}</span>
                    <span className="ctr-holland-name">{p.name}</span>
                  </div>
                  {interp?.natures && (
                    <div className="ctr-holland-traits">
                      {interp.natures.map((n) => (
                        <span key={n} className="ctr-holland-trait">{n}</span>
                      ))}
                    </div>
                  )}
                  {interp && (
                    <ul className="ctr-holland-comments">
                      {interp.description.split('\n').filter(Boolean).slice(0, 5).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                  {interp?.occupation && (
                    <div className="ctr-holland-occupation">
                      <strong>관련 직업군</strong>
                      <div className="ctr-job-badges">
                        {interp.occupation.map((o) => (
                          <span key={o} className="ctr-job-badge">{o}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ctr-empty-detail">흥미 프로파일 데이터를 불러오는 중입니다.</p>
        )}
      </CollapsibleSection>

      {/* 2. 선호직업군(흥미) 및 관련 직업군 (상위 2개) */}
      {top2Job.length > 0 && (
        <CollapsibleSection title="2. 선호직업군(흥미) 및 관련 직업군 (상위 2개)">
          <div className="ctr-holland-job-table">
            <div className="ctr-holland-job-header">
              <span>구분</span>
              <span>1순위</span>
              <span>2순위</span>
            </div>
            <div className="ctr-holland-job-row">
              <span className="ctr-holland-job-label">선호 직업군</span>
              {top2Job.map((j) => {
                const interp = findInterp(j.code);
                return <span key={j.code}>{interp?.occupation?.join(', ') ?? '-'}</span>;
              })}
              {top2Job.length < 2 && <span>-</span>}
            </div>
            <div className="ctr-holland-job-row">
              <span className="ctr-holland-job-label">선호 직업</span>
              {top2Job.map((j) => {
                const interp = findInterp(j.code);
                const jobs = interp?.relatedJobs?.slice(0, 10);
                return <span key={j.code}>{jobs?.map((r) => r.name).join(', ') ?? '-'}</span>;
              })}
              {top2Job.length < 2 && <span>-</span>}
            </div>
            <div className="ctr-holland-job-row">
              <span className="ctr-holland-job-label">해당 유형</span>
              {top2Job.map((j) => (
                <span key={j.code}>{j.code}유형({j.name})</span>
              ))}
              {top2Job.length < 2 && <span>-</span>}
            </div>
          </div>
          <p className="ctr-holland-note">
            ※ 일반흥미의 상위 유형과 선호 직업군(흥미)의 해당 유형은 일치하지 않을 수 있습니다.
          </p>
        </CollapsibleSection>
      )}

      {/* 3. 일반흥미별 결과 (T점수) 레이더 차트 + 점수 테이블 */}
      {interestData.length > 0 && (
        <CollapsibleSection title="3. 일반흥미별 결과 (T점수)">
          <p className="ctr-section-desc">
            홀랜드 검사 결과를 통해 알아본 검사자님의 대표적인 유형은 <strong>{sortedInterest[0]?.code}유형</strong>입니다.
          </p>
          <RadarChart
            data={interestData.map((p) => ({ label: `${p.code}(${p.name})`, value: p.tScore }))}
            maxValue={Math.ceil(maxT / 10) * 10}
          />
          <div className="ctr-interest-score-table">
            <div className="ctr-interest-score-header">
              {interestData.map((p) => (
                <span key={p.code}>{p.code}({p.name})</span>
              ))}
            </div>
            <div className="ctr-interest-score-row">
              {interestData.map((p) => (
                <span key={p.code}>{p.tScore.toFixed(1)}</span>
              ))}
            </div>
          </div>
          <InterestChartFooter detail={detail} />
        </CollapsibleSection>
      )}

      {/* 4. 홀랜드 유형별 성격 및 흥미 특성 (6유형 전체 카드) */}
      {interpList.length > 0 && (
        <CollapsibleSection title="4. 홀랜드 유형별 성격 및 흥미 특성">
          <div className="ctr-holland-grid">
            {['R', 'I', 'A', 'S', 'E', 'C'].map((code) => {
              const interp = findInterp(code);
              const profile = interestData.find((p) => p.code === code);
              const isTop2 = top2Interest.some((p) => p.code === code);
              const NAMES: Record<string, string> = {
                R: '현실형', I: '탐구형', A: '예술형', S: '사회형', E: '기업형', C: '관습형',
              };
              const ENG: Record<string, string> = {
                R: 'Realistic', I: 'Investigative', A: 'Artistic',
                S: 'Social', E: 'Enterprising', C: 'Conventional',
              };
              const rank = top2Interest.findIndex((p) => p.code === code);
              return (
                <div key={code} className={`ctr-holland-type-card ${isTop2 ? 'ctr-holland-type-card--active' : ''}`}>
                  {rank >= 0 && <div className="ctr-holland-type-rank">{rank + 1}순위</div>}
                  <div className="ctr-holland-type-code">{code}</div>
                  <div className="ctr-holland-type-name">{NAMES[code]}</div>
                  <div className="ctr-holland-type-eng">{ENG[code]}</div>
                  {interp?.natures && (
                    <div className="ctr-holland-type-traits">
                      {interp.natures.map((n) => (
                        <span key={n} className={`ctr-holland-trait ${isTop2 ? 'ctr-holland-trait--active' : ''}`}>{n}</span>
                      ))}
                    </div>
                  )}
                  {profile && <div className="ctr-holland-type-score">T{profile.tScore.toFixed(1)}</div>}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* 5. 상위 유형별 직업 정보 (대표직업 + 신생직업) */}
      {top2Interest.length > 0 && interpList.length > 0 && (
        <CollapsibleSection title="5. 상위 유형별 직업 정보">
          <p className="ctr-section-desc">
            검사자님의 상위 2개 흥미 유형에 해당하는 대표적인 직업과 관련 신생직업을 살펴보세요.
          </p>
          {top2Interest.map((p, idx) => {
            const interp = findInterp(p.code);
            return (
              <div key={p.code} className="ctr-job-info-card">
                <div className="ctr-job-info-header">
                  <span className="ctr-job-info-rank">{idx + 1}</span>
                  <div>
                    <strong>{p.code} {p.name}</strong>
                    {interp?.occupation && (
                      <span className="ctr-job-info-occupation">직업군 {interp.occupation.join(', ')}</span>
                    )}
                  </div>
                </div>
                {interp?.relatedJobs && interp.relatedJobs.length > 0 && (
                  <div className="ctr-job-info-section">
                    <strong>대표직업</strong>
                    <JobBadgeList jobs={interp.relatedJobs} />
                  </div>
                )}
                {interp?.futureJobs && interp.futureJobs.length > 0 && (
                  <div className="ctr-job-info-section">
                    <strong>신생직업</strong>
                    <JobBadgeList jobs={interp.futureJobs} />
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* 6. 상위 유형별 관련 직업 */}
      {top2Interest.length > 0 && interpList.length > 0 && (
        <CollapsibleSection title="6. 상위 유형별 관련 직업">
          <p className="ctr-section-desc">
            검사자님의 상위 2개 흥미 유형과 관련된 직업을 살펴보세요.
          </p>
          {top2Interest.map((p, idx) => {
            const interp = findInterp(p.code);
            const relatives = interp?.relativeJobs ?? [];
            if (relatives.length === 0) return null;
            return (
              <div key={p.code} className="ctr-job-info-card">
                <div className="ctr-job-info-header">
                  <span className="ctr-job-info-rank">{idx + 1}</span>
                  <div>
                    <strong>{p.code} {p.name}</strong>
                    {interp?.occupation && (
                      <span className="ctr-job-info-occupation">직업군 {interp.occupation.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="ctr-job-info-section">
                  <strong>관련직업</strong>
                  <JobBadgeList jobs={relatives} />
                </div>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* 7. 선호직업 상세 결과 (백분위 점수) */}
      {(detail.jobPercentiles ?? []).length > 0 && (
        <CollapsibleSection title="7. 선호직업 상세 결과 (백분위 점수)">
          <p className="ctr-section-desc">
            내가 선호하는 직업군은 어떤 유형에 속해 있나요? 아래 그래프를 통해 확인해보세요.
          </p>
          <div className="ctr-job-percentile-list">
            {['R', 'I', 'A', 'S', 'E', 'C'].map((code) => {
              const jp = detail.jobPercentiles!.find((j) => j.code === code);
              if (!jp) return null;
              return (
                <div key={code} className="ctr-job-percentile-row">
                  <div className="ctr-job-percentile-type">
                    <strong>{code} {jp.name}</strong>
                    <span className="ctr-job-percentile-occ">{jp.occupation.join(', ')}</span>
                  </div>
                  <div className="ctr-job-percentile-bar-wrap">
                    <div className="ctr-job-percentile-bar">
                      <div
                        className="ctr-job-percentile-fill"
                        style={{ width: `${jp.percentile}%` }}
                      />
                    </div>
                    <span className="ctr-job-percentile-val">{jp.percentile.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* 8. 종합 결과: 일반흥미-선호직업군 일치정도 */}
      {interestData.length > 0 && jobData.length > 0 && (
        <CollapsibleSection title="8. 종합 결과: 일반흥미-선호직업군 일치 정도">
          <RadarChart
            data={interestData.map((p) => ({ label: `${p.code}(${p.name})`, value: p.percentile }))}
            maxValue={100}
            secondaryData={jobData.map((p) => ({ label: `${p.code}(${p.name})`, value: p.percentile }))}
          />
          {detail.interestCongruence && (
            <div className="ctr-congruence-card">
              <div className="ctr-congruence-badge">
                <span className="ctr-congruence-label">일치정도</span>
                <strong className={`ctr-congruence-level ${detail.interestCongruence.level === '일치' ? 'ctr-congruence--match' : 'ctr-congruence--mismatch'}`}>
                  {detail.interestCongruence.level}
                </strong>
              </div>
              <p className="ctr-congruence-desc">{detail.interestCongruence.description}</p>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* 9. 진로활동 방법 */}
      {detail.careerActivities && detail.careerActivities.length > 0 && (
        <CollapsibleSection title="9. 진로활동 방법">
          <div className="ctr-career-activities">
            {detail.interestCongruence && (
              <p className="ctr-career-activities-intro">
                검사자님은 일반흥미와 선호직업군(흥미)이 <strong>{detail.interestCongruence.level}</strong>합니다.
                {detail.interestCongruence.level === '불일치'
                  ? ' 다음의 진로활동을 추천드립니다.'
                  : ' 아래 활동으로 흥미를 더욱 발전시켜보세요.'}
              </p>
            )}
            <ul className="ctr-career-activities-list">
              {detail.careerActivities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <p className="ctr-career-activities-note">
              ※ 성장과 발달시기에는 좋아하는 흥미가 변할 수 있으니 주기적으로 이 검사를 해보시고
              자신의 흥미와 선호직업군이 일치하는지 체크해 보세요.
              일치하지 않는 것도 진로선택에 다양한 선택지가 있는 것이니 부정적으로 접근하지 마십시오.
            </p>
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

function InterestChartFooter({ detail }: { detail: ReportDetailData }) {
  const sincerity = detail.interestSincerity;
  const ratios = detail.interestChoiceRatios;

  return (
    <div className="ctr-interest-footer">
      {/* 육각형 모양 해석 */}
      <div className="ctr-hexagon-guide">
        <h4 className="ctr-hexagon-guide-title">&lt;참조&gt; 흥미 유형 육각형 모양 해석</h4>
        <div className="ctr-hexagon-table">
          <div className="ctr-hexagon-header">
            <span>구분</span><span>크다</span><span>작다</span>
          </div>
          <div className="ctr-hexagon-row">
            <span className="ctr-hexagon-label">정육각형</span>
            <span>모든 분야에 높은 흥미<br />왕성한 열정으로 많은 분야에 관심을 보이지만 선택과 집중도 필요합니다.</span>
            <span>모든 분야에 낮은 흥미<br />흥미를 가지고 있는 분야가 거의 없습니다. 다양한 분야의 관심과 정보가 필요합니다.</span>
          </div>
          <div className="ctr-hexagon-row">
            <span className="ctr-hexagon-label">찌그러진</span>
            <span>특정 분야에 높은 흥미<br />해당 분야에 대한 지속적인 관심을 가지고 흥미를 발전시켜보세요.</span>
            <span>특정 분야에 낮은 흥미<br />흥미가 낮은 분야에 대한 구체적이고 상세한 정보를 탐색해 보세요.</span>
          </div>
        </div>
      </div>

      {/* 성실도 + 긍정응답률 */}
      {(sincerity != null || ratios) && (
        <div className="ctr-interest-stats">
          {sincerity != null && (
            <div className="ctr-interest-stat-card">
              <span className="ctr-interest-stat-label">설문의 성실도</span>
              <span className="ctr-interest-stat-value">{sincerity.toFixed(1)} / 5.0 점</span>
            </div>
          )}
          {ratios && (
            <div className="ctr-interest-stat-card">
              <span className="ctr-interest-stat-label">긍정응답률</span>
              <div className="ctr-interest-ratios">
                {ratios.map((r, i) => (
                  <span key={i}>{i + 1}. {r.label}. ({r.ratio}%)</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
