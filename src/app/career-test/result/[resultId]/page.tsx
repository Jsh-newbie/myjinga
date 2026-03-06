'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { CAREER_TESTS, type CareerTestTypeId } from '@/lib/careernet/constants';

// --- Client-side type mirrors (from ReportDetail) ---

interface RealmData {
  rank: number;
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
  level?: string;
}

interface RealmMetaData {
  code: string;
  name: string;
  description: string;
}

interface RealmInterpData {
  code: string;
  name: string;
  description: string;
  interpretations: { high: string; mid: string; low: string };
  tips?: string[];
  relatedJobs?: Array<{ code: string; name: string }>;
  improves?: string[];
  category?: string;
}

interface HollandProfileData {
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
}

interface ValuesUpperData {
  code: string;
  name: string;
  score: number;
}

interface ValuesSubDimData {
  code: string;
  name: string;
  description: string;
  userScore: number;
  demographicAvg?: number;
}

interface AggregateScoreData {
  rawScore: number;
  percentile: number;
  tScore: number;
  level: string;
}

interface CompetencyGroupData {
  code: string;
  name: string;
  tScore: number;
  level: string;
  avgScore: number;
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
  responseScore?: number;
  schemaVersion?: number;
  realms: RealmData[];
  realmMeta?: RealmMetaData[];
  realmInterpretations?: RealmInterpData[];
  competencyGroups?: CompetencyGroupData[];
  interestProfiles?: { interest: HollandProfileData[]; job: HollandProfileData[] };
  valuesHierarchy?: { uppers: ValuesUpperData[]; subDimensions: ValuesSubDimData[] };
  maturityAggregates?: Record<string, AggregateScoreData>;
  maturityConsistency?: { level: string; description: string };
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

// --- Shared helpers ---

function numify(v: unknown): number {
  return typeof v === 'string' ? parseFloat(v) || 0 : (v as number) ?? 0;
}

function getGradeLabel(percentile: number): { label: string; className: string } {
  if (percentile >= 85) return { label: '매우높음', className: 'ctr-grade--5' };
  if (percentile >= 65) return { label: '높음', className: 'ctr-grade--4' };
  if (percentile >= 35) return { label: '보통', className: 'ctr-grade--3' };
  if (percentile >= 15) return { label: '약간낮음', className: 'ctr-grade--2' };
  return { label: '낮음', className: 'ctr-grade--1' };
}

function getLevelFromTScore(t: number): 'high' | 'mid' | 'low' {
  if (t >= 55) return 'high';
  if (t >= 45) return 'mid';
  return 'low';
}

function getLevelFromPercentile(p: number): 'high' | 'mid' | 'low' {
  if (p >= 65) return 'high';
  if (p >= 35) return 'mid';
  return 'low';
}

// --- CollapsibleSection ---

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className={`ctr-section ${open ? 'ctr-section--open' : ''}`}>
      <button className="ctr-section-header" onClick={() => setOpen(!open)} type="button">
        <h2 className="ctr-section-title" style={{ margin: 0 }}>{title}</h2>
        <span className="ctr-section-arrow" />
      </button>
      {open && <div className="ctr-section-body">{children}</div>}
    </section>
  );
}

// --- LevelIndicator ---

function LevelIndicator({ level }: { level: 'high' | 'mid' | 'low' }) {
  const dots = level === 'high' ? 3 : level === 'mid' ? 2 : 1;
  const label = level === 'high' ? '높음' : level === 'mid' ? '보통' : '낮음';
  return (
    <span className="ctr-level-dots" title={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`ctr-level-dot ${i <= dots ? 'ctr-level-dot--filled' : ''}`} />
      ))}
      <span className="ctr-level-label">{label}</span>
    </span>
  );
}

// --- RadarChart ---

function RadarChart({
  data,
  maxValue,
  secondaryData,
}: {
  data: Array<{ label: string; value: number }>;
  maxValue: number;
  secondaryData?: Array<{ label: string; value: number }>;
}) {
  const n = data.length;
  if (n < 3) return null;

  const cx = 150;
  const cy = 150;
  const R = 110;
  const levels = 4;

  function polarToXY(angle: number, r: number) {
    const a = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  const angleStep = 360 / n;

  // Grid
  const gridPaths: string[] = [];
  for (let l = 1; l <= levels; l++) {
    const r = (R / levels) * l;
    const pts = Array.from({ length: n }, (_, i) => {
      const { x, y } = polarToXY(i * angleStep, r);
      return `${x},${y}`;
    });
    gridPaths.push(`M${pts.join('L')}Z`);
  }

  // Axes
  const axes = data.map((_, i) => polarToXY(i * angleStep, R));

  // Data polygon
  function makePolygon(items: Array<{ value: number }>) {
    return items
      .map((d, i) => {
        const r = (Math.min(d.value, maxValue) / maxValue) * R;
        const { x, y } = polarToXY(i * angleStep, r);
        return `${x},${y}`;
      })
      .join(' ');
  }

  // Labels
  const labels = data.map((d, i) => {
    const { x, y } = polarToXY(i * angleStep, R + 20);
    return { ...d, x, y };
  });

  return (
    <div className="ctr-radar-wrap">
      <svg viewBox="0 0 300 300" className="ctr-radar-svg">
        {/* Grid */}
        {gridPaths.map((d, i) => (
          <path key={i} d={d} className="ctr-radar-grid" />
        ))}
        {/* Axes */}
        {axes.map((a, i) => (
          <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} className="ctr-radar-axis" />
        ))}
        {/* Secondary data (if provided) */}
        {secondaryData && (
          <polygon points={makePolygon(secondaryData)} className="ctr-radar-poly--secondary" />
        )}
        {/* Primary data */}
        <polygon points={makePolygon(data)} className="ctr-radar-poly" />
        {/* Dots */}
        {data.map((d, i) => {
          const r = (Math.min(d.value, maxValue) / maxValue) * R;
          const { x, y } = polarToXY(i * angleStep, r);
          return <circle key={i} cx={x} cy={y} r={3.5} className="ctr-radar-dot" />;
        })}
        {/* Labels */}
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y} className="ctr-radar-label" textAnchor="middle" dominantBaseline="middle">
            {l.label}
          </text>
        ))}
      </svg>
      {secondaryData && (
        <div className="ctr-radar-legend">
          <span className="ctr-radar-legend-item ctr-radar-legend--primary">나의 흥미</span>
          <span className="ctr-radar-legend-item ctr-radar-legend--secondary">직업 적합</span>
        </div>
      )}
    </div>
  );
}

// --- InterpCard ---

function InterpCard({ interp, level }: { interp: RealmInterpData; level: 'high' | 'mid' | 'low' }) {
  const text = interp.interpretations[level];
  if (!text && !interp.description) return null;
  return (
    <div className="ctr-interp-card">
      <div className="ctr-interp-header">
        <strong>{interp.name}</strong>
        <LevelIndicator level={level} />
      </div>
      {interp.description && <p className="ctr-interp-desc">{interp.description}</p>}
      {text && <p className="ctr-interp-text">{text}</p>}
      {interp.tips && interp.tips.length > 0 && (
        <div className="ctr-interp-tips">
          <strong>이렇게 해 보아요</strong>
          <ul>{interp.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {interp.relatedJobs && interp.relatedJobs.length > 0 && (
        <div className="ctr-interp-jobs">
          <strong>관련 직업</strong>
          <span>{interp.relatedJobs.map((j) => j.name).join(', ')}</span>
        </div>
      )}
      {interp.improves && interp.improves.length > 0 && (
        <div className="ctr-interp-tips">
          <strong>향상 활동</strong>
          <ul>{interp.improves.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// --- Section builders per test type ---

function AptitudeSections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const sorted = [...realms].sort((a, b) => b.percentile - a.percentile);
  const top3 = sorted.slice(0, 3);
  const maxP = Math.max(...realms.map((r) => r.percentile), 1);
  const interpMap = new Map((detail.realmInterpretations ?? []).map((ri) => [ri.code || ri.name, ri]));

  return (
    <>
      <CollapsibleSection title="상위 적성 요약 (Top 3)" defaultOpen>
        <div className="ctr-top3-list">
          {top3.map((realm, idx) => {
            const grade = getGradeLabel(realm.percentile);
            return (
              <div key={realm.code || realm.name} className="ctr-top3-item">
                <span className="ctr-top3-rank">{idx + 1}</span>
                <div className="ctr-top3-body">
                  <span className="ctr-top3-name">{realm.name}</span>
                  <span className="ctr-top3-desc">{grade.label} ({Math.round(realm.percentile)}%ile)</span>
                </div>
                <span className="ctr-top3-score">{Math.round(realm.percentile)}점</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="적성 영역별 백분위 차트" defaultOpen>
        <div className="ctr-bar-list">
          {sorted.map((realm) => {
            const grade = getGradeLabel(realm.percentile);
            return (
              <div key={realm.code || realm.name} className="ctr-bar-row">
                <span className="ctr-bar-label">{realm.name}</span>
                <div className="ctr-bar-track">
                  <div className={`ctr-bar-fill ${grade.className}`} style={{ width: `${(realm.percentile / maxP) * 100}%` }} />
                </div>
                <span className="ctr-bar-value">{Math.round(realm.percentile)}</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {(detail.realmInterpretations ?? []).length > 0 && (
        <CollapsibleSection title="영역별 상세 해석">
          {sorted.map((realm) => {
            const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
            if (!interp) return null;
            return <InterpCard key={realm.code || realm.name} interp={interp} level={getLevelFromPercentile(realm.percentile)} />;
          })}
        </CollapsibleSection>
      )}

      <RecommendSections detail={detail} />
    </>
  );
}

function InterestSections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const profiles = detail.interestProfiles;
  const interestData = profiles?.interest ?? [];
  const jobData = profiles?.job ?? [];
  const interpList = detail.realmInterpretations ?? [];

  // Top 2 흥미 유형
  const sortedInterest = [...interestData].sort((a, b) => b.tScore - a.tScore);
  const top2 = sortedInterest.slice(0, 2);

  const maxT = Math.max(...interestData.map((p) => p.tScore), ...jobData.map((p) => p.tScore), 1);

  return (
    <>
      <CollapsibleSection title="나의 흥미 유형 (Top 2)" defaultOpen>
        {top2.length > 0 ? (
          <div className="ctr-top3-list">
            {top2.map((p, idx) => {
              const interp = interpList.find((ri) => ri.code === p.code || ri.name === p.name);
              return (
                <div key={p.code} className="ctr-top3-item">
                  <span className="ctr-top3-rank">{idx + 1}</span>
                  <div className="ctr-top3-body">
                    <span className="ctr-top3-name">{p.name}</span>
                    {interp?.description && <span className="ctr-top3-desc">{interp.description}</span>}
                  </div>
                  <span className="ctr-top3-score">T{Math.round(p.tScore)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ctr-empty-detail">흥미 프로파일 데이터를 불러오는 중입니다.</p>
        )}
      </CollapsibleSection>

      {interestData.length > 0 && (
        <CollapsibleSection title="흥미 프로파일 차트" defaultOpen>
          <RadarChart
            data={interestData.map((p) => ({ label: p.name, value: p.tScore }))}
            maxValue={Math.ceil(maxT / 10) * 10}
          />
        </CollapsibleSection>
      )}

      {interpList.length > 0 && (
        <CollapsibleSection title="유형별 상세">
          {interpList.map((interp) => {
            const profile = interestData.find((p) => p.code === interp.code || p.name === interp.name);
            return (
              <InterpCard
                key={interp.code}
                interp={interp}
                level={profile ? getLevelFromTScore(profile.tScore) : 'mid'}
              />
            );
          })}
        </CollapsibleSection>
      )}

      {interestData.length > 0 && jobData.length > 0 && (
        <CollapsibleSection title="흥미-직업 비교 차트">
          <RadarChart
            data={interestData.map((p) => ({ label: p.name, value: p.tScore }))}
            maxValue={Math.ceil(maxT / 10) * 10}
            secondaryData={jobData.map((p) => ({ label: p.name, value: p.tScore }))}
          />
        </CollapsibleSection>
      )}

      <RecommendSections detail={detail} />
    </>
  );
}

function MaturitySections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const sorted = [...realms].sort((a, b) => b.percentile - a.percentile);
  const topN = sorted.slice(0, 2);
  const bottomN = sorted.slice(-2).reverse();
  const interpList = detail.realmInterpretations ?? [];
  const agg = detail.maturityAggregates;
  const consistency = detail.maturityConsistency;

  // Group realms by category based on interpretations
  const interpMap = new Map(interpList.map((ri) => [ri.code || ri.name, ri]));

  const AGG_LABELS: Record<string, string> = {
    attitude: '태도', ability: '능력', career: '진로행동', exam: '시험불안',
  };

  return (
    <>
      <CollapsibleSection title="주요 결과 (높은/낮은 영역)" defaultOpen>
        <div className="ctr-group-summary">
          <div>
            <strong className="ctr-group-label">강점 영역</strong>
            <div className="ctr-top3-list">
              {topN.map((r) => (
                <div key={r.code || r.name} className="ctr-score-row">
                  <span>{r.name}</span>
                  <span className="ctr-score-val">{Math.round(r.percentile)}%ile</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <strong className="ctr-group-label">보완 영역</strong>
            <div className="ctr-top3-list">
              {bottomN.map((r) => (
                <div key={r.code || r.name} className="ctr-score-row">
                  <span>{r.name}</span>
                  <span className="ctr-score-val">{Math.round(r.percentile)}%ile</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="영역별 점수" defaultOpen>
        {agg && (
          <div className="ctr-agg-grid">
            {Object.entries(agg).map(([k, v]) => (
              <div key={k} className="ctr-agg-item">
                <span className="ctr-agg-name">{AGG_LABELS[k] ?? k}</span>
                <span className="ctr-agg-score">
                  {Math.round(v.percentile)}%ile
                  {v.level && <span className="ctr-agg-level"> ({v.level})</span>}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="ctr-bar-list" style={{ marginTop: 12 }}>
          {sorted.map((realm) => {
            const grade = getGradeLabel(realm.percentile);
            return (
              <div key={realm.code || realm.name} className="ctr-bar-row">
                <span className="ctr-bar-label">{realm.name}</span>
                <div className="ctr-bar-track">
                  <div className={`ctr-bar-fill ${grade.className}`} style={{ width: `${realm.percentile}%` }} />
                </div>
                <span className="ctr-bar-value">{Math.round(realm.percentile)}</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {realms.length >= 3 && (
        <CollapsibleSection title="종합 프로파일 차트">
          <RadarChart
            data={realms.map((r) => ({ label: r.name, value: r.percentile }))}
            maxValue={100}
          />
        </CollapsibleSection>
      )}

      {interpList.length > 0 && (
        <CollapsibleSection title="영역별 상세 해석">
          {sorted.map((realm) => {
            const interp = interpMap.get(realm.code) ?? interpMap.get(realm.name);
            if (!interp) return null;
            return <InterpCard key={realm.code || realm.name} interp={interp} level={getLevelFromPercentile(realm.percentile)} />;
          })}
        </CollapsibleSection>
      )}

      {consistency && (
        <CollapsibleSection title="응답 일관성">
          <div className="ctr-interp-card">
            <div className="ctr-interp-header">
              <strong>일관성 수준: {consistency.level}</strong>
            </div>
            <p className="ctr-interp-desc">{consistency.description}</p>
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

function ValuesSections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const hierarchy = detail.valuesHierarchy;
  const uppers = hierarchy?.uppers ?? [];
  const subDims = hierarchy?.subDimensions ?? [];
  const interpList = detail.realmInterpretations ?? [];

  return (
    <>
      <CollapsibleSection title="나의 직업가치 유형 (상위 카테고리)" defaultOpen>
        {uppers.length > 0 ? (
          <div className="ctr-top3-list">
            {uppers
              .sort((a, b) => b.score - a.score)
              .map((u, idx) => (
                <div key={u.code} className="ctr-top3-item">
                  <span className="ctr-top3-rank">{idx + 1}</span>
                  <div className="ctr-top3-body">
                    <span className="ctr-top3-name">{u.name}</span>
                  </div>
                  <span className="ctr-top3-score">{u.score}점</span>
                </div>
              ))}
          </div>
        ) : realms.length > 0 ? (
          <div className="ctr-top3-list">
            {[...realms].sort((a, b) => b.rawScore - a.rawScore).slice(0, 3).map((r, idx) => (
              <div key={r.code || r.name} className="ctr-top3-item">
                <span className="ctr-top3-rank">{idx + 1}</span>
                <div className="ctr-top3-body">
                  <span className="ctr-top3-name">{r.name}</span>
                </div>
                <span className="ctr-top3-score">{r.rawScore}점</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="ctr-empty-detail">가치 유형 데이터를 불러오는 중입니다.</p>
        )}
      </CollapsibleSection>

      {subDims.length > 0 && (
        <CollapsibleSection title="12가지 가치 하위영역" defaultOpen>
          <div className="ctr-subdim-list">
            {subDims.map((sd) => (
              <div key={sd.code} className="ctr-score-row">
                <div className="ctr-score-row-left">
                  <span className="ctr-score-name">{sd.name}</span>
                  {sd.description && <span className="ctr-score-desc">{sd.description}</span>}
                </div>
                <div className="ctr-score-row-right">
                  <span className="ctr-score-val">{sd.userScore}점</span>
                  {sd.demographicAvg != null && (
                    <span className="ctr-score-avg">평균 {sd.demographicAvg}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {subDims.length >= 3 && (
        <CollapsibleSection title="가치 프로파일 차트">
          <RadarChart
            data={subDims.map((sd) => ({ label: sd.name, value: sd.userScore }))}
            maxValue={Math.max(...subDims.map((sd) => sd.userScore), 1) * 1.2}
          />
        </CollapsibleSection>
      )}

      {interpList.length > 0 && (
        <CollapsibleSection title="하위영역별 설명">
          {interpList.map((interp) => (
            <InterpCard key={interp.code} interp={interp} level="mid" />
          ))}
        </CollapsibleSection>
      )}

      <RecommendSections detail={detail} />
    </>
  );
}

function CompetencySections({ detail, realms }: { detail: ReportDetailData; realms: RealmData[] }) {
  const groups = detail.competencyGroups ?? [];
  const interpList = detail.realmInterpretations ?? [];
  const designRealms = interpList.filter((ri) => ri.category === '진로설계');
  const readyRealms = interpList.filter((ri) => ri.category === '진로준비');

  // 4유형 판별
  const designGroup = groups.find((g) => g.name?.includes('설계'));
  const readyGroup = groups.find((g) => g.name?.includes('준비'));
  const dLvl = designGroup?.level ?? '';
  const rLvl = readyGroup?.level ?? '';

  let competencyType = '';
  if (dLvl.includes('높') && rLvl.includes('높')) competencyType = '적극실행형';
  else if (dLvl.includes('높')) competencyType = '설계선행형';
  else if (rLvl.includes('높')) competencyType = '준비선행형';
  else competencyType = '탐색필요형';

  const designRealmData = realms.filter((r) => designRealms.some((dr) => dr.code === r.code));
  const readyRealmData = realms.filter((r) => readyRealms.some((dr) => dr.code === r.code));

  const sorted = [...realms].sort((a, b) => b.tScore - a.tScore);

  return (
    <>
      <CollapsibleSection title="나의 진로역량 유형" defaultOpen>
        <div className="ctr-type-card">
          <strong className="ctr-type-name">{competencyType}</strong>
          <div className="ctr-type-groups">
            {groups.map((g) => (
              <div key={g.code} className="ctr-type-group-item">
                <span>{g.name}</span>
                <span className="ctr-type-group-score">T{Math.round(g.tScore)} ({g.level})</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="10가지 하위역량 점수" defaultOpen>
        <div className="ctr-bar-list">
          {sorted.map((realm) => {
            const isDesign = designRealms.some((dr) => dr.code === realm.code);
            return (
              <div key={realm.code || realm.name} className="ctr-bar-row">
                <span className="ctr-bar-label">
                  {realm.name}
                  <span className="ctr-bar-tag">{isDesign ? '설계' : '준비'}</span>
                </span>
                <div className="ctr-bar-track">
                  <div className="ctr-bar-fill ctr-grade--4" style={{ width: `${Math.min(realm.tScore / 80 * 100, 100)}%` }} />
                </div>
                <span className="ctr-bar-value">T{Math.round(realm.tScore)}</span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {designRealmData.length >= 3 && (
        <CollapsibleSection title="진로설계 프로파일 차트">
          <RadarChart
            data={designRealmData.map((r) => ({ label: r.name, value: r.tScore }))}
            maxValue={80}
          />
        </CollapsibleSection>
      )}

      {readyRealmData.length >= 3 && (
        <CollapsibleSection title="진로준비 프로파일 차트">
          <RadarChart
            data={readyRealmData.map((r) => ({ label: r.name, value: r.tScore }))}
            maxValue={80}
          />
        </CollapsibleSection>
      )}

      {interpList.length > 0 && (
        <CollapsibleSection title="영역별 상세 해석">
          {sorted.map((realm) => {
            const interp = interpList.find((ri) => ri.code === realm.code);
            if (!interp) return null;
            return <InterpCard key={realm.code} interp={interp} level={getLevelFromTScore(realm.tScore)} />;
          })}
        </CollapsibleSection>
      )}

      {detail.responseScore != null && (
        <CollapsibleSection title="응답 점수 유효성">
          <div className="ctr-interp-card">
            <p className="ctr-interp-desc">
              응답 점수: <strong>{detail.responseScore}</strong>
              {detail.responseScore >= 80
                ? ' — 성실하게 응답하였습니다.'
                : ' — 응답의 성실도가 낮을 수 있습니다.'}
            </p>
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

function RecommendSections({ detail }: { detail: ReportDetailData }) {
  const hasJobs = (detail.recommendedJobs ?? []).length > 0;
  const hasMajors = (detail.recommendedMajors ?? []).length > 0;
  if (!hasJobs && !hasMajors) return null;

  return (
    <>
      {hasJobs && (
        <CollapsibleSection title="추천 직업">
          <div className="ctr-recommend-list">
            {detail.recommendedJobs!.map((job, idx) => (
              <div key={job.code || idx} className="ctr-recommend-card">
                <strong className="ctr-recommend-name">{job.name}</strong>
                <p className="ctr-recommend-desc">{job.description}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
      {hasMajors && (
        <CollapsibleSection title="추천 학과">
          <div className="ctr-recommend-list">
            {detail.recommendedMajors!.map((major, idx) => (
              <div key={major.seq || idx} className="ctr-recommend-card">
                <strong className="ctr-recommend-name">{major.name}</strong>
                <p className="ctr-recommend-desc">{major.summary}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}

// --- Main Page ---

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

  // Normalize realm numbers
  const normalizedRealms = useMemo(() =>
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
        {detail?.responseTime != null && detail.responseTime > 0 && (
          <p className="ctr-date">소요 시간: {Math.round(detail.responseTime)}분</p>
        )}
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

          {detail.responsePattern && (
            <p className="ctr-pattern-warn">{detail.responsePattern}</p>
          )}
        </>
      )}

      {/* 데이터가 아예 없는 경우 */}
      {detail && normalizedRealms.length === 0 && !detail.interestProfiles && !detail.valuesHierarchy && (
        <section className="ctr-recommend">
          <p className="ctr-empty-detail">상세 결과를 불러오는 중입니다. 잠시 후 다시 확인해 주세요.</p>
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
