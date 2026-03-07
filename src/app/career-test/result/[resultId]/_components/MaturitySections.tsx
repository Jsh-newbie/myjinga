'use client';

import {
  CollapsibleSection,
  LevelIndicator,
  RadarChart,
  stripHtmlAndNumber,
  type RealmData,
  type ReportDetailData,
} from './shared';

// maturity 영역 차원별 분류 (코드 기준)
const MATURITY_ATTITUDE_CODES = new Set(['102231', '102233', '102232', '102234']);
const MATURITY_ABILITY_CODES = new Set(['102235', '102236', '102237', '102238']);
const MATURITY_CAREER_CODES = new Set(['102239']);

const MATURITY_DIM_NAMES: Record<string, string[]> = {
  attitude: ['계획성', '독립성', '직업에 대한 태도', '직업태도', '진로낙관성'],
  ability: ['자기이해', '정보탐색', '합리적 의사결정', '합리적의사결정', '희망직업 지식', '희망직업지식'],
  career: ['진로탐색 준비행동', '진로탐색준비행동'],
};

function classifyMaturityRealm(r: RealmData): 'attitude' | 'ability' | 'career' | null {
  if (MATURITY_ATTITUDE_CODES.has(r.code)) return 'attitude';
  if (MATURITY_ABILITY_CODES.has(r.code)) return 'ability';
  if (MATURITY_CAREER_CODES.has(r.code)) return 'career';
  for (const [dim, names] of Object.entries(MATURITY_DIM_NAMES)) {
    if (names.some((n) => r.name.includes(n))) return dim as 'attitude' | 'ability' | 'career';
  }
  return null;
}

function getMaturityLevel(t: number): 'high' | 'mid' | 'low' {
  if (t >= 55) return 'high';
  if (t >= 35) return 'mid';
  return 'low';
}

function getMaturityLevelLabel(t: number): string {
  if (t >= 55) return '높음';
  if (t >= 35) return '보통';
  return '낮음';
}

export function MaturitySections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const interpList = detail.realmInterpretations ?? [];
  const agg = detail.maturityAggregates;
  const interpMap = new Map(interpList.map((ri) => [ri.code || ri.name, ri]));

  const attitudeRealms = realms.filter((r) => classifyMaturityRealm(r) === 'attitude');
  const abilityRealms = realms.filter((r) => classifyMaturityRealm(r) === 'ability');
  const careerRealms = realms.filter((r) => classifyMaturityRealm(r) === 'career');

  const mainRealms = [...attitudeRealms, ...abilityRealms];
  const sortedByT = [...mainRealms].sort((a, b) => b.tScore - a.tScore);
  const highRealms = sortedByT.slice(0, 2);
  const lowRealms = sortedByT.slice(-2).reverse();

  const radarRealms = [...attitudeRealms, ...abilityRealms];
  const maxT = Math.max(...realms.map((r) => r.tScore), 70);

  function dimAvgTScore(key: string): number {
    const dimRealms = key === 'attitude' ? attitudeRealms : key === 'ability' ? abilityRealms : careerRealms;
    if (dimRealms.length === 0) return 0;
    return dimRealms.reduce((s, r) => s + r.tScore, 0) / dimRealms.length;
  }

  function aggLevelLabel(key: string): string {
    const avg = dimAvgTScore(key);
    if (avg === 0) return '';
    return `${getMaturityLevelLabel(avg)} (평균: ${avg.toFixed(1)})`;
  }

  function aggInterpText(key: string, dimLabel: string): string {
    const avg = dimAvgTScore(key);
    if (avg === 0) return '';
    const lvl = getMaturityLevelLabel(avg);
    const isAttitude = dimLabel === '진로태도차원';
    if (lvl.includes('낮')) {
      return `검사자님의 ${dimLabel} 검사결과는 낮은 수준인 것으로 나타났습니다. 자신의 진로에 대한 ${isAttitude ? '태도를' : '능력을'} 갖추기 위해 노력이 필요합니다.`;
    }
    return `검사자님의 ${dimLabel} 검사결과는 보통 혹은 높은 수준인 것으로 나타났습니다. 앞으로도 지금처럼 자신의 진로에 대한 ${isAttitude ? '태도를 갖춰' : '능력을 갖춰'} 진로준비를 잘 하길 바랍니다.`;
  }

  const allRealmsByDim: Array<{ dim: string; dimLabel: string; realms: RealmData[] }> = [
    { dim: 'attitude', dimLabel: '태도', realms: attitudeRealms },
    { dim: 'ability', dimLabel: '능력', realms: abilityRealms },
    { dim: 'career', dimLabel: '행동', realms: careerRealms },
  ];

  return (
    <>
      {/* 검사 설명 */}
      <section className="ctr-test-intro">
        <h3 className="ctr-test-intro-title">나의 진로 준비도는?</h3>
        <p>
          진로성숙도는 여러분의 진로선택과 결정과정에서 필요한 태도, 능력, 행동의 준비 정도를
          의미합니다. 따라서 진로성숙도는 여러분의 진로준비를 위한 노력에 따라 변화될 수 있으며,
          이 검사의 결과는 자기이해를 위한 참고자료로 활용하세요.
        </p>
      </section>

      {/* 1. 검사자님의 검사결과 (높은/낮은 영역) */}
      <CollapsibleSection title="1. 검사자님의 검사결과">
        <div className="ctr-main-result">
          <div className="ctr-main-result-card ctr-main-result--high">
            <div className="ctr-main-result-badge">높은 영역</div>
            <div className="ctr-main-result-items">
              {highRealms.map((r) => (
                <span key={r.code || r.name} className="ctr-main-result-tag">{r.name}</span>
              ))}
            </div>
          </div>
          <div className="ctr-main-result-card ctr-main-result--low">
            <div className="ctr-main-result-badge">낮은 영역</div>
            <div className="ctr-main-result-items">
              {lowRealms.map((r) => (
                <span key={r.code || r.name} className="ctr-main-result-tag">{r.name}</span>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 2. 9가지 영역별 점수결과 */}
      <CollapsibleSection title="2. 9가지 영역별 점수결과">
        <div className="ctr-competency-score-legend">
          <span className="ctr-score-legend-item ctr-score-legend--low">점수 35미만 : 낮은 수준</span>
          <span className="ctr-score-legend-item ctr-score-legend--mid">점수 35이상 55미만 : 보통 수준</span>
          <span className="ctr-score-legend-item ctr-score-legend--high">점수 55이상 : 높은 수준</span>
        </div>
        <div className="ctr-maturity-cols">
          <div className="ctr-competency-table-col">
            <div className="ctr-competency-table-header ctr-competency-table-header--design">
              태도차원 ({attitudeRealms.length > 0 ? getMaturityLevelLabel(attitudeRealms.reduce((s, r) => s + r.tScore, 0) / attitudeRealms.length) : ''})
            </div>
            <div className="ctr-competency-table-subheader">
              <span>구분</span><span>점수</span>
            </div>
            {attitudeRealms.map((r) => (
              <div key={r.code || r.name} className="ctr-competency-table-row">
                <span>{r.name}</span>
                <span className={`ctr-competency-score ctr-competency-score--${getMaturityLevel(r.tScore)}`}>
                  {r.tScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <div className="ctr-competency-table-col">
            <div className="ctr-competency-table-header ctr-competency-table-header--ready">
              능력차원 ({abilityRealms.length > 0 ? getMaturityLevelLabel(abilityRealms.reduce((s, r) => s + r.tScore, 0) / abilityRealms.length) : ''})
            </div>
            <div className="ctr-competency-table-subheader">
              <span>구분</span><span>점수</span>
            </div>
            {abilityRealms.map((r) => (
              <div key={r.code || r.name} className="ctr-competency-table-row">
                <span>{r.name}</span>
                <span className={`ctr-competency-score ctr-competency-score--${getMaturityLevel(r.tScore)}`}>
                  {r.tScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          {careerRealms.length > 0 && (
            <div className="ctr-competency-table-col">
              <div className="ctr-competency-table-header ctr-maturity-table-header--career">
                행동차원 ({getMaturityLevelLabel(careerRealms[0].tScore)})
              </div>
              <div className="ctr-competency-table-subheader">
                <span>구분</span><span>점수</span>
              </div>
              {careerRealms.map((r) => (
                <div key={r.code || r.name} className="ctr-competency-table-row">
                  <span>{r.name}</span>
                  <span className={`ctr-competency-score ctr-competency-score--${getMaturityLevel(r.tScore)}`}>
                    {r.tScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="ctr-maturity-note">
          ※ 점수는 또래 안에서 자신의 상대적인 위치를 알려줍니다.
        </p>
      </CollapsibleSection>

      {/* 3. 태도-능력차원별 결과해석 */}
      {agg && (
        <CollapsibleSection title="3. 태도-능력차원별 결과해석">
          <div className="ctr-maturity-dim-table">
            <div className="ctr-maturity-dim-table-header">
              <span>차원</span>
              <span>태도차원<br /><em>{aggLevelLabel('attitude')}</em></span>
              <span>능력차원<br /><em>{aggLevelLabel('ability')}</em></span>
            </div>
            <div className="ctr-maturity-dim-table-row">
              <span className="ctr-maturity-dim-table-label">영역</span>
              <span className="ctr-maturity-dim-table-realms">
                {attitudeRealms.map((r) => r.name).join(' / ')}
              </span>
              <span className="ctr-maturity-dim-table-realms">
                {abilityRealms.map((r) => r.name).join(' / ')}
              </span>
            </div>
            <div className="ctr-maturity-dim-table-row">
              <span className="ctr-maturity-dim-table-label">해석</span>
              <span className="ctr-maturity-dim-table-interp">
                {aggInterpText('attitude', '진로태도차원')}
              </span>
              <span className="ctr-maturity-dim-table-interp">
                {aggInterpText('ability', '진로능력차원')}
              </span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* 4. 종합프로파일 및 하위영역별 해석 */}
      <CollapsibleSection title="4. 종합프로파일 및 하위영역별 해석">
        <p className="ctr-section-desc">
          진로성숙도는 태도차원과 능력차원, 행동차원 총 3가지 차원으로 구성되며,
          9개 하위영역으로 이루어져 있습니다. 각 차원의 하위영역별 점수에 대한 해석은 다음과 같습니다.
        </p>

        {radarRealms.length >= 3 && (
          <div className="ctr-maturity-radar-section">
            <div className="ctr-radar-legend">
              <span className="ctr-radar-legend-item ctr-radar-legend--attitude">태도차원</span>
              <span className="ctr-radar-legend-item ctr-radar-legend--ability">능력차원</span>
            </div>
            <RadarChart
              data={radarRealms.map((r) => ({ label: r.name, value: r.tScore }))}
              maxValue={Math.ceil(maxT / 10) * 10}
            />
          </div>
        )}

        {careerRealms.length > 0 && (
          <div className="ctr-maturity-career-bar">
            <div className="ctr-maturity-career-bar-header">
              <span className="ctr-maturity-career-bar-label">행동차원<br />(진로탐색 준비행동)</span>
              <div className="ctr-maturity-career-bar-track">
                <div className="ctr-maturity-career-bar-markers">
                  <span style={{ left: `${(35 / maxT) * 100}%` }}>35</span>
                  <span style={{ left: `${(55 / maxT) * 100}%` }}>55</span>
                </div>
                <div
                  className="ctr-maturity-career-bar-fill"
                  style={{ width: `${(careerRealms[0].tScore / maxT) * 100}%` }}
                />
              </div>
              <span className="ctr-maturity-career-bar-val">{careerRealms[0].tScore.toFixed(2)}T</span>
            </div>
          </div>
        )}

        <div className="ctr-maturity-level-legend">
          <span>* 나의 수준</span>
          <span className="ctr-maturity-level-legend-item ctr-maturity-level--high">높음</span>
          <span className="ctr-maturity-level-legend-item ctr-maturity-level--mid">보통</span>
          <span className="ctr-maturity-level-legend-item ctr-maturity-level--low">낮음</span>
        </div>

        {allRealmsByDim.map(({ dim, dimLabel, realms: dimRealms }) =>
          dimRealms.length > 0 ? (
            <div key={dim} className="ctr-maturity-detail-group">
              {dimRealms.map((realm) => {
                const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
                const lvl = getMaturityLevel(realm.tScore);
                const interpText = interp?.interpretations[lvl] ?? '';
                const tips = interp?.tips ?? [];

                return (
                  <div key={realm.code || realm.name} className="ctr-maturity-detail-card">
                    <div className="ctr-maturity-detail-top">
                      <span className="ctr-maturity-detail-dim">{dimLabel}</span>
                      <span className="ctr-maturity-detail-name">{realm.name}</span>
                      <span className="ctr-maturity-detail-score">{realm.tScore.toFixed(2)}</span>
                      <LevelIndicator level={lvl} />
                    </div>
                    {interp?.description && (
                      <p className="ctr-maturity-detail-desc">{interp.description}</p>
                    )}

                    {interpText && (
                      <div className="ctr-maturity-detail-interp">
                        <strong>결과해석</strong>
                        <p>{interpText}</p>
                      </div>
                    )}

                    {tips.length > 0 && (
                      <div className="ctr-maturity-detail-tips">
                        <strong>[이렇게 해 보아요]</strong>
                        <ol>
                          {tips.map((t, i) => (
                            <li key={i}>{stripHtmlAndNumber(t)}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null
        )}
      </CollapsibleSection>
    </>
  );
}
