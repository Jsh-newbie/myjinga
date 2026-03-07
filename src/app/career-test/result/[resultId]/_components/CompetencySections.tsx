'use client';

import {
  CollapsibleSection,
  LevelIndicator,
  RadarChart,
  stripHtmlAndNumber,
  type RealmData,
  type ReportDetailData,
} from './shared';

type CompetencyTypeKey = 'selfDirected' | 'practicing' | 'potential' | 'stopped';

const COMPETENCY_TYPES: Record<CompetencyTypeKey, { name: string; designLabel: string; readyLabel: string; description: string }> = {
  selfDirected: {
    name: '자기주도 진로개발자',
    designLabel: '진로설계 높음', readyLabel: '진로준비 높음',
    description: '자기주도 진로개발자는 현재 자신의 진로를 효과적으로 계획하고 실천하며, 생애에 걸쳐 미래 진로 관련 문제를 자기 주도적으로 할 수 있는 능력을 가지고 있습니다. 이들은 자신의 흥미, 성격 등 자신의 특성을 파악하고, 직업에 대한 정보를 탐색하여 현재 진로 목표를 세우고 목표 실현을 위한 계획을 세울 수 있습니다. 또한 미래 진로에 대해서 긍정적이고 자신감 있는 태도로 미래 직업세계를 탐색합니다. 자신의 미래 진로에 대해서 개방적인 자세로 다양한 가능성을 갖고 지속적으로 탐색하고 도전하면서 자신이 원하는 미래를 건설해 갑니다.',
  },
  practicing: {
    name: '실천하는 진로개발자',
    designLabel: '진로설계 높음', readyLabel: '진로준비 낮음',
    description: '실천하는 진로개발자는 현재 진로나 직업, 진학에 대한 결정을 효과적으로 할 수 있는 능력을 가지고 있습니다. 이들은 자신의 성격, 흥미, 가치 등 자신의 특성에 대해서 잘 이해하고, 관심 있는 직업이나 진학 정보에 대해 알고 있습니다. 이들은 자신의 특성과 직업에 대한 정보를 가지고 현재 가장 자신에게 잘 맞는 진로 목표를 세우고, 목표에 따라 계획을 세워서 실천해 갑니다. 다만 실천하는 진로개발자는 현재 진로나 직업, 진학 관련 의사결정에 신중한 나머지 미래 변화 가능성을 고려하지 않는 경향이 있을 수 있습니다. 현재 결정한 진로나 직업이 있어도 미래 직업 세계에 호기심을 갖고 다른 진로 선택을 할 수 있다는 유연한 자세를 갖는 것이 도움이 될 수 있습니다.',
  },
  potential: {
    name: '잠재력있는 진로개발자',
    designLabel: '진로설계 낮음', readyLabel: '진로준비 높음',
    description: '잠재력 있는 진로개발자는 미래 진로에 대해 긍정적이고 자신감 있는 태도를 갖고, 흥미 있는 미래 직업에 대해 탐구하고 도전하려는 자세를 가지고 있습니다. 이들은 지속적으로 변화하는 미래 직업 세계에 유연하게 적응할 수 있는 직업인의 능력을 가지고 있습니다. 다만 잠재력 있는 진로개발자는 미래 직업이나 진로에 관심이 집중되어 있어 다소 현실적인 진로목표를 세우는 것이 다소 부족할 수 있습니다. 따라서 현재 진로나 진학 목표를 구체적으로 세우고 계획하고 실행하는 능력을 개발할 필요가 있습니다.',
  },
  stopped: {
    name: '멈춰있는 진로개발자',
    designLabel: '진로설계 낮음', readyLabel: '진로준비 낮음',
    description: '멈춰있는 진로개발자는 현재나 미래 진로를 명확하게 결정하고 싶지만 어떻게 결정을 해야 할지 명확하지 않아 숨을 고르고 있는 것으로 보입니다. 멈춰있는 진로개발자는 직업이나 학과 선택에 대해 어떤 과정을 거쳐서 결정해야 할지, 그리고 어떤 계획을 세워서 목표를 이루어야 할지에 대해 알고 싶어 합니다. 따라서 진로나 직업을 선택하기 위해 자신의 흥미, 적성 등 특성과 직업을 살펴보고 흥미 있는 진로나 직업 대안을 몇 가지 선택해보는 등 실천 가능한 진로목표를 세우고 실천해가는 시도를 해 보면 좋을 것 같습니다. 또한 미래 직업이나 진로 대안을 지속적으로 탐구하면서 가장 최적의 직업이나 진로를 개척할 필요가 있습니다.',
  },
};

export function CompetencySections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const groups = detail.competencyGroups ?? [];
  const interpList = detail.realmInterpretations ?? [];
  const designInterps = interpList.filter((ri) => ri.category === '진로설계');
  const readyInterps = interpList.filter((ri) => ri.category === '진로준비');

  const designGroup = groups.find((g) => g.name?.includes('설계'));
  const readyGroup = groups.find((g) => g.name?.includes('준비'));
  const dLvl = designGroup?.level ?? '';
  const rLvl = readyGroup?.level ?? '';

  let competencyTypeKey: CompetencyTypeKey = 'stopped';
  if (dLvl.includes('높') && rLvl.includes('높')) competencyTypeKey = 'selfDirected';
  else if (dLvl.includes('높')) competencyTypeKey = 'practicing';
  else if (rLvl.includes('높')) competencyTypeKey = 'potential';
  else competencyTypeKey = 'stopped';

  const currentType = COMPETENCY_TYPES[competencyTypeKey];

  const designRealmData = realms.filter((r) => designInterps.some((dr) => dr.code === r.code));
  const readyRealmData = realms.filter((r) => readyInterps.some((dr) => dr.code === r.code));

  function getScoreLevel(t: number): 'high' | 'mid' | 'low' {
    if (t >= 50) return 'high';
    if (t >= 30) return 'mid';
    return 'low';
  }

  return (
    <>
      {/* 검사 소개 */}
      <section className="ctr-test-intro">
        <h3 className="ctr-test-intro-title">나의 진로개발역량은?</h3>
        <p>
          진로개발역량 검사는 여러분의 진로개발역량 수준을 객관적으로 진단하고
          이를 기반으로 지속적이고 효과적으로 진로개발역량을 함양할 수 있도록
          돕기 위한 검사입니다.
        </p>
        <p>
          진로개발역량은 진로를 합리적인 방식으로 결정하고 계획하여 효과적으로
          실천해 나가는데 필요한 역량인 <strong>진로설계역량</strong>과
          자신의 진로를 효과적으로 준비하고 관리하는데 필요한 역량인
          <strong> 진로준비역량</strong>으로 구성되어 있습니다.
        </p>
        <div className="ctr-test-intro-diff">
          <h4>진로설계역량 vs 진로준비역량</h4>
          <ul>
            <li>
              <strong>진로설계역량</strong>은 진로를 합리적인 방식으로 결정하고 계획하여
              효과적으로 실천해 나가는데 필요한 역량으로, 자기이해, 직업이해, 진로탐색,
              진로계획 총 4가지 하위역량으로 구성되어 있습니다.
            </li>
            <li>
              <strong>진로준비역량</strong>은 자신의 진로를 효과적으로 준비하고 관리하는데
              필요한 역량으로, 낙관성, 지속성, 호기심, 유연성, 도전성, 의사소통 총 6가지
              하위역량으로 구성되어 있습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* 1. 진로개발역량 유형 */}
      <CollapsibleSection title="1. 진로개발역량 유형">
        <div className="ctr-competency-quadrant">
          <div className={`ctr-quadrant-item ${competencyTypeKey === 'practicing' ? 'ctr-quadrant-item--active' : ''}`}>
            <strong>실천하는 진로개발자</strong>
            <span>진로설계 높음 / 진로준비 낮음</span>
          </div>
          <div className={`ctr-quadrant-item ${competencyTypeKey === 'selfDirected' ? 'ctr-quadrant-item--active' : ''}`}>
            <strong>자기주도 진로개발자</strong>
            <span>진로설계 높음 / 진로준비 높음</span>
          </div>
          <div className={`ctr-quadrant-item ${competencyTypeKey === 'stopped' ? 'ctr-quadrant-item--active' : ''}`}>
            <strong>멈춰있는 진로개발자</strong>
            <span>진로설계 낮음 / 진로준비 낮음</span>
          </div>
          <div className={`ctr-quadrant-item ${competencyTypeKey === 'potential' ? 'ctr-quadrant-item--active' : ''}`}>
            <strong>잠재력있는 진로개발자</strong>
            <span>진로설계 낮음 / 진로준비 높음</span>
          </div>
        </div>

        <div className="ctr-type-card">
          <strong className="ctr-type-name">{currentType.name}</strong>
          <div className="ctr-type-groups">
            {groups.map((g) => (
              <div key={g.code} className="ctr-type-group-item">
                <span>{g.name}</span>
                <span className="ctr-type-group-score">평균점수: {Math.round(g.avgScore)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ctr-competency-type-desc">
          <p>{currentType.description}</p>
        </div>
      </CollapsibleSection>

      {/* 2. 검사결과 - 10가지 하위역량별 점수 */}
      <CollapsibleSection title="2. 검사결과">
        <p className="ctr-section-desc">
          또래 안에서 자신의 상대적인 위치를 알려줍니다.
          점수 30미만은 낮은 수준, 30이상 50미만은 보통 수준, 50이상은 높은 수준입니다.
        </p>
        <div className="ctr-competency-score-legend">
          <span className="ctr-score-legend-item ctr-score-legend--low">점수 30미만 : 낮은 수준</span>
          <span className="ctr-score-legend-item ctr-score-legend--mid">점수 30이상 50미만 : 보통 수준</span>
          <span className="ctr-score-legend-item ctr-score-legend--high">점수 50이상 : 높은 수준</span>
        </div>

        <div className="ctr-competency-table">
          <div className="ctr-competency-table-col">
            <div className="ctr-competency-table-header ctr-competency-table-header--design">
              진로설계역량(평균점수:{designGroup ? Math.round(designGroup.avgScore) : '-'})
            </div>
            <div className="ctr-competency-table-subheader">
              <span>구분</span><span>점수</span>
            </div>
            {designRealmData.map((r) => (
              <div key={r.code || r.name} className="ctr-competency-table-row">
                <span>{r.name}</span>
                <span className={`ctr-competency-score ctr-competency-score--${getScoreLevel(r.tScore)}`}>
                  {Math.round(r.tScore)}
                </span>
              </div>
            ))}
          </div>
          <div className="ctr-competency-table-col">
            <div className="ctr-competency-table-header ctr-competency-table-header--ready">
              진로준비역량(평균점수:{readyGroup ? Math.round(readyGroup.avgScore) : '-'})
            </div>
            <div className="ctr-competency-table-subheader">
              <span>구분</span><span>점수</span>
            </div>
            {readyRealmData.map((r) => (
              <div key={r.code || r.name} className="ctr-competency-table-row">
                <span>{r.name}</span>
                <span className={`ctr-competency-score ctr-competency-score--${getScoreLevel(r.tScore)}`}>
                  {Math.round(r.tScore)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* 3. 진로설계역량 상세 결과 */}
      {designRealmData.length > 0 && (
        <CollapsibleSection title="3. 진로설계역량 결과">
          <p className="ctr-section-desc">
            진로설계역량은 진로를 합리적인 방식으로 결정하고 계획하여 효과적으로 실천해 나가는데 필요한 역량으로,
            자기이해, 직업이해, 진로탐색, 진로계획 총 4가지 하위역량으로 구성되어 있습니다.
          </p>
          {designRealmData.length >= 3 && (
            <RadarChart
              data={designRealmData.map((r) => ({ label: `${r.name}(${Math.round(r.tScore)})`, value: r.tScore }))}
              maxValue={70}
            />
          )}
          <div className="ctr-competency-detail-list">
            {designRealmData.map((realm) => {
              const interp = interpList.find((ri) => ri.code === realm.code);
              if (!interp) return null;
              const level = getScoreLevel(realm.tScore);
              const interpText = interp.interpretations[level];
              return (
                <div key={realm.code} className="ctr-competency-detail-card">
                  <div className="ctr-competency-detail-header">
                    <div className="ctr-competency-detail-left">
                      <span className="ctr-competency-detail-category">진로설계역량</span>
                      <strong className="ctr-competency-detail-name">{realm.name}</strong>
                    </div>
                    <div className="ctr-competency-detail-right">
                      <span className="ctr-competency-detail-score">{Math.round(realm.tScore)}</span>
                      <LevelIndicator level={level} />
                    </div>
                  </div>
                  {interp.description && (
                    <p className="ctr-competency-detail-desc">{interp.description}</p>
                  )}
                  {interpText && (
                    <div className="ctr-competency-detail-result">
                      <strong>검사결과</strong>
                      <p>{interpText}</p>
                    </div>
                  )}
                  {interp.tips && interp.tips.length > 0 && (
                    <div className="ctr-competency-detail-tips">
                      <strong>{realm.name} 개발을 위한 TIP</strong>
                      <ol>{interp.tips.map((t, i) => <li key={i}>{stripHtmlAndNumber(t)}</li>)}</ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* 4. 진로준비역량 상세 결과 */}
      {readyRealmData.length > 0 && (
        <CollapsibleSection title="4. 진로준비역량 결과">
          <p className="ctr-section-desc">
            진로준비역량은 자신의 진로를 효과적으로 준비하고 관리하는데 필요한 역량으로,
            낙관성, 지속성, 호기심, 유연성, 도전성, 의사소통 총 6가지 하위역량으로 구성되어 있습니다.
          </p>
          {readyRealmData.length >= 3 && (
            <RadarChart
              data={readyRealmData.map((r) => ({ label: `${r.name}(${Math.round(r.tScore)})`, value: r.tScore }))}
              maxValue={70}
            />
          )}
          <div className="ctr-competency-detail-list">
            {readyRealmData.map((realm) => {
              const interp = interpList.find((ri) => ri.code === realm.code);
              if (!interp) return null;
              const level = getScoreLevel(realm.tScore);
              const interpText = interp.interpretations[level];
              return (
                <div key={realm.code} className="ctr-competency-detail-card">
                  <div className="ctr-competency-detail-header">
                    <div className="ctr-competency-detail-left">
                      <span className="ctr-competency-detail-category">진로준비역량</span>
                      <strong className="ctr-competency-detail-name">{realm.name}</strong>
                    </div>
                    <div className="ctr-competency-detail-right">
                      <span className="ctr-competency-detail-score">{Math.round(realm.tScore)}</span>
                      <LevelIndicator level={level} />
                    </div>
                  </div>
                  {interp.description && (
                    <p className="ctr-competency-detail-desc">{interp.description}</p>
                  )}
                  {interpText && (
                    <div className="ctr-competency-detail-result">
                      <strong>검사결과</strong>
                      <p>{interpText}</p>
                    </div>
                  )}
                  {interp.tips && interp.tips.length > 0 && (
                    <div className="ctr-competency-detail-tips">
                      <strong>{realm.name} 개발을 위한 TIP</strong>
                      <ol>{interp.tips.map((t, i) => <li key={i}>{stripHtmlAndNumber(t)}</li>)}</ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* 5. 해석 시 유의사항 */}
      {detail.responseScore != null && (
        <CollapsibleSection title="5. 해석 시 유의사항">
          <div className="ctr-competency-caution">
            <p>응답 점수: <strong>{detail.responseScore}점</strong></p>
            <ul>
              <li>응답점수는 검사 전체 문항에 대한 응답점수입니다.</li>
              <li>응답점수가 247점에서 265점 사이라면 거의 모든 검사 문항에서 주로 &apos;긍정응답&apos;에 응답한 것이고,
                53점에서 71점 사이라면 주로 &apos;부정응답&apos;에 응답한 것입니다.</li>
              <li>응답점수가 지나치게 높거나 낮은 경우 검사문항에 성실하게 응답했는지 확인해보시면 좋겠습니다.</li>
            </ul>
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}
