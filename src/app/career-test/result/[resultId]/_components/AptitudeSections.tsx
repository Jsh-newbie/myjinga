'use client';

import {
  CollapsibleSection,
  LevelIndicator5,
  getGradeLabel,
  type RealmData,
  type ReportDetailData,
} from './shared';
import { JobBadgeList } from './JobBadgeList';

export function AptitudeSections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const sorted = [...realms].sort((a, b) => b.percentile - a.percentile);
  const top3 = sorted.slice(0, 3);
  const interpMap = new Map((detail.realmInterpretations ?? []).map((ri) => [ri.code || ri.name, ri]));

  return (
    <>
      {/* 검사 설명 */}
      <section className="ctr-test-intro">
        <h3 className="ctr-test-intro-title">커리어넷 직업적성검사</h3>
        <p>
          적성은 지금 현재 내가 잘하고 있거나 앞으로 발전할 가능성이 있는 능력을 말합니다.
          이 검사를 통해서 자신의 적성 영역과 그 영역에 잘 맞는 직업 및 학과를 알아볼 수 있습니다.
        </p>
        <p>
          하지만 검사의 결과는 성적이 아니며 적성은 여러분의 노력에 따라 변할 수 있습니다.
          또한, 적성만으로 직업이 결정되는 것이 아니므로 검사 결과는 참고자료로 활용하세요.
        </p>
      </section>

      {/* 주요 결과: 1. 높은 적성으로 살펴본 종합평가 */}
      <CollapsibleSection title="1. 높은 적성으로 살펴본 종합평가">
        <div className="ctr-apt-summary-list">
          {top3.map((realm) => {
            const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
            return (
              <div key={realm.code || realm.name} className="ctr-apt-summary-item">
                <strong className="ctr-apt-summary-name">{realm.name}</strong>
                <p className="ctr-apt-summary-desc">{interp?.description ?? ''}</p>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* 주요 결과: 2. 적성영역별 결과(백분위) */}
      <CollapsibleSection title="2. 직업적성영역별 결과 (백분위)">
        <div className="ctr-table-wrap">
          <table className="ctr-table">
            <thead>
              <tr>
                <th>적성영역</th>
                <th>백분위</th>
                <th>적성영역</th>
                <th>백분위</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(realms.length / 2) }).map((_, i) => {
                const left = sorted[i * 2];
                const right = sorted[i * 2 + 1];
                return (
                  <tr key={i}>
                    <td className="ctr-td-name">{left?.name ?? ''}</td>
                    <td className="ctr-td-score">{left ? Math.round(left.percentile * 10) / 10 : ''}</td>
                    <td className="ctr-td-name">{right?.name ?? ''}</td>
                    <td className="ctr-td-score">{right ? Math.round(right.percentile * 10) / 10 : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* 주요 결과: 3. 추천 직업군 */}
      {top3.some((r) => {
        const interp = interpMap.get(r.code) ?? interpMap.get(r.name);
        return (interp?.jobGroups && interp.jobGroups.length > 0) || (interp?.relatedJobs && interp.relatedJobs.length > 0);
      }) && (
        <CollapsibleSection title="3. 검사결과를 바탕으로 한 추천 직업군">
          <p className="ctr-section-desc">
            각 적성별 세부직업군과 직업을 아래의 표에서 확인해보세요.
          </p>
          {top3.map((realm) => {
            const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
            const jobGroups = interp?.jobGroups ?? [];
            if (jobGroups.length === 0 && !(interp?.relatedJobs?.length)) return null;
            return (
              <div key={realm.code || realm.name} className="ctr-apt-jobgroup-section">
                <div className="ctr-apt-jobgroup-header">{realm.name} 직업군</div>
                {interp?.jobGroupDescription && (
                  <p className="ctr-apt-jobgroup-desc">{interp.jobGroupDescription}</p>
                )}
                {jobGroups.length > 0 ? (
                  <div className="ctr-table-wrap">
                    <table className="ctr-table">
                      <thead>
                        <tr>
                          <th>세부직업군</th>
                          <th>직업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobGroups.map((jg) => (
                          <tr key={jg.groupName}>
                            <td className="ctr-td-name">{jg.groupName}</td>
                            <td style={{ textAlign: 'left' }}>
                              <JobBadgeList jobs={jg.jobs.map((j) => ({ code: String(j.code), name: j.name }))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ctr-apt-jobgroup-fallback">
                    <JobBadgeList jobs={interp!.relatedJobs!} />
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* 상세 결과: 1. 적성 영역별 결과(백분위) 바 차트 */}
      <CollapsibleSection title="4. 직업적성 영역별 결과 (백분위)">
        <p className="ctr-section-desc">
          검사 결과는 총 {realms.length}개 적성유형별 백분위 점수로 제시됩니다.
          백분위는 학생 전체를 100명으로 하였을 때 본인보다 의미합니다.
          각 영역들 간의 점수 차이보다는 전체적인 경향성을 보는 것이 바람직합니다.
        </p>
        <div className="ctr-bar-list">
          {sorted.map((realm) => {
            const grade = getGradeLabel(realm.percentile);
            return (
              <div key={realm.code || realm.name} className="ctr-bar-row">
                <span className="ctr-bar-label">{realm.name}</span>
                <div className="ctr-bar-track">
                  <div className={`ctr-bar-fill ${grade.className}`} style={{ width: `${realm.percentile}%` }} />
                </div>
                <span className="ctr-bar-value">{Math.round(realm.percentile * 10) / 10}</span>
              </div>
            );
          })}
        </div>
        {/* 5단계 수준 범례 */}
        <div className="ctr-apt-level-legend">
          <span className="ctr-apt-level-legend-label">* 나의 수준</span>
          <span className="ctr-apt-level-legend-item"><span className="ctr-level-block ctr-level-block--filled ctr-grade--5" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--5" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--5" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--5" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--5" /> 매우높음</span>
          <span className="ctr-apt-level-legend-item"><span className="ctr-level-block ctr-level-block--filled ctr-grade--4" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--4" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--4" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--4" /><span className="ctr-level-block" /> 높음</span>
          <span className="ctr-apt-level-legend-item"><span className="ctr-level-block ctr-level-block--filled ctr-grade--3" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--3" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--3" /><span className="ctr-level-block" /><span className="ctr-level-block" /> 보통</span>
          <span className="ctr-apt-level-legend-item"><span className="ctr-level-block ctr-level-block--filled ctr-grade--2" /><span className="ctr-level-block ctr-level-block--filled ctr-grade--2" /><span className="ctr-level-block" /><span className="ctr-level-block" /><span className="ctr-level-block" /> 약간낮음</span>
        </div>
      </CollapsibleSection>

      {/* 상세 결과: 영역별 상세 카드 (PDF 형식) */}
      {(detail.realmInterpretations ?? []).length > 0 && (
        <CollapsibleSection title="5. 영역별 상세 결과">
          <div className="ctr-apt-detail-list">
            {sorted.map((realm) => {
              const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
              if (!interp) return null;
              const p = realm.percentile;
              const isStrength = p >= 65;
              const methodLabel = isStrength ? '강화방법' : '보완방법';
              const methods = interp.improves ?? [];

              return (
                <div key={realm.code || realm.name} className="ctr-apt-detail-card">
                  {/* 상단: 영역 / 백분위 / 수준 / 설명 */}
                  <div className="ctr-apt-detail-top">
                    <div className="ctr-apt-detail-top-row">
                      <span className="ctr-apt-detail-area">영역</span>
                      <span className="ctr-apt-detail-pct-label">백분위 점수</span>
                      <span className="ctr-apt-detail-lvl-label">나의수준</span>
                      <span className="ctr-apt-detail-desc-label">설명</span>
                    </div>
                    <div className="ctr-apt-detail-top-row ctr-apt-detail-top-data">
                      <span className="ctr-apt-detail-name">{realm.name}</span>
                      <span className="ctr-apt-detail-pct">{Math.round(p * 10) / 10}</span>
                      <span className="ctr-apt-detail-lvl"><LevelIndicator5 percentile={p} /></span>
                      <span className="ctr-apt-detail-desc">{interp.description}</span>
                    </div>
                  </div>
                  {/* 하단: 강화/보완방법 */}
                  {methods.length > 0 && (
                    <div className="ctr-apt-detail-methods">
                      <strong>{methodLabel}</strong>
                      <div className="ctr-apt-detail-methods-grid">
                        {methods.map((m, i) => (
                          <span key={i} className="ctr-apt-detail-method">
                            <span className="ctr-apt-detail-method-bullet" />
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}
