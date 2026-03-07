'use client';

import { useState } from 'react';
import { JobBadgeList } from './JobBadgeList';

// --- Shared helpers ---

export function numify(v: unknown): number {
  return typeof v === 'string' ? parseFloat(v) || 0 : (v as number) ?? 0;
}

/** HTML 태그를 제거하고 <li> 내용을 텍스트로 변환, 선행 번호도 제거 */
export function stripHtmlAndNumber(html: string): string {
  const liContents: string[] = [];
  const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    liContents.push(match[1].replace(/<[^>]*>/g, '').trim());
  }
  let text = html;
  if (liContents.length > 0) {
    text = text.replace(/<ul[^>]*>.*?<\/ul>/gi, '').trim();
    const liText = liContents.join('\n');
    text = text ? `${text} ${liText}` : liText;
  }
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/^\d+\.\s*/, '');
  return text.trim();
}

export function getGradeLabel(percentile: number): { label: string; className: string } {
  if (percentile >= 85) return { label: '매우높음', className: 'ctr-grade--5' };
  if (percentile >= 65) return { label: '높음', className: 'ctr-grade--4' };
  if (percentile >= 35) return { label: '보통', className: 'ctr-grade--3' };
  if (percentile >= 15) return { label: '약간낮음', className: 'ctr-grade--2' };
  return { label: '낮음', className: 'ctr-grade--1' };
}

export function getLevelFromTScore(t: number): 'high' | 'mid' | 'low' {
  if (t >= 55) return 'high';
  if (t >= 45) return 'mid';
  return 'low';
}

export function getLevelFromPercentile(p: number): 'high' | 'mid' | 'low' {
  if (p >= 65) return 'high';
  if (p >= 35) return 'mid';
  return 'low';
}

// --- Shared types (client-side mirrors) ---

export interface RealmData {
  rank: number;
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
  level?: string;
}

export interface RealmMetaData {
  code: string;
  name: string;
  description: string;
}

export interface RealmInterpData {
  code: string;
  name: string;
  description: string;
  interpretations: { high: string; mid: string; low: string };
  tips?: string[];
  relatedJobs?: Array<{ code: string; name: string }>;
  improves?: string[];
  jobGroupDescription?: string;
  jobGroups?: Array<{ groupName: string; jobs: Array<{ code: number; name: string }> }>;
  category?: string;
  natures?: string[];
  occupation?: string[];
  futureJobs?: Array<{ code: string; name: string }>;
  relativeJobs?: Array<{ code: string; name: string }>;
}

export interface HollandProfileData {
  code: string;
  name: string;
  rawScore: number;
  percentile: number;
  tScore: number;
}

export interface ValuesUpperData {
  code: string;
  name: string;
  score: number;
}

export interface ValuesSubDimData {
  code: string;
  name: string;
  description: string;
  userScore: number;
  demographicAvg?: number;
}

export interface ValuesOrientationJobData {
  name: string;
  jobCode?: string;
}

export interface ValuesOrientationData {
  code: string;
  name: string;
  description: string;
  score: number;
  subValues: string[];
  jobs: ValuesOrientationJobData[];
}

export interface AggregateScoreData {
  rawScore: number;
  percentile: number;
  tScore: number;
  level: string;
}

export interface CompetencyGroupData {
  code: string;
  name: string;
  tScore: number;
  level: string;
  avgScore: number;
}

export interface JobPercentileData {
  code: string;
  name: string;
  occupation: string[];
  percentile: number;
}

export interface ReportDetailData {
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
  interestSincerity?: number;
  interestChoiceRatios?: Array<{ label: string; ratio: number }>;
  jobPercentiles?: JobPercentileData[];
  interestCongruence?: { level: string; description: string };
  careerActivities?: string[];
  valuesHierarchy?: { uppers: ValuesUpperData[]; subDimensions: ValuesSubDimData[] };
  valuesOrientations?: ValuesOrientationData[];
  maturityAggregates?: Record<string, AggregateScoreData>;
  maturityConsistency?: { level: string; description: string };
  recommendedJobs?: Array<{ name: string; code: number; description: string }>;
  recommendedMajors?: Array<{ name: string; seq: number; summary: string }>;
}

export interface ResultData {
  id: string;
  testTypeId: import('@/lib/careernet/constants').CareerTestTypeId;
  resultUrl: string;
  reportDetail?: ReportDetailData;
  completedAt?: { _seconds: number };
}

// --- CollapsibleSection ---

export function CollapsibleSection({
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

// --- LevelIndicator5 (5단계: 매우높음~낮음) ---

export function LevelIndicator5({ percentile }: { percentile: number }) {
  const grade = getGradeLabel(percentile);
  const filled = percentile >= 85 ? 5 : percentile >= 65 ? 4 : percentile >= 35 ? 3 : percentile >= 15 ? 2 : 1;
  return (
    <span className="ctr-level-blocks" title={grade.label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`ctr-level-block ${i <= filled ? `ctr-level-block--filled ${grade.className}` : ''}`} />
      ))}
      <span className="ctr-level-label">{grade.label}</span>
    </span>
  );
}

// --- LevelIndicator (3단계: 높음/보통/낮음) ---

export function LevelIndicator({ level }: { level: 'high' | 'mid' | 'low' }) {
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

export function RadarChart({
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
        {labels.map((l, i) => {
          const LABEL_WRAP: Record<string, [string, string]> = {
            '합리적 의사결정': ['합리적', '의사결정'],
            '직업에 대한 태도': ['직업에', '대한 태도'],
          };
          const wrap = LABEL_WRAP[l.label];
          if (wrap) {
            return (
              <text key={i} x={l.x} className="ctr-radar-label" textAnchor="middle">
                <tspan x={l.x} y={l.y - 6}>{wrap[0]}</tspan>
                <tspan x={l.x} y={l.y + 6}>{wrap[1]}</tspan>
              </text>
            );
          }
          const parenMatch = l.label.match(/^(.+)\((.+)\)$/);
          if (parenMatch) {
            return (
              <text key={i} x={l.x} className="ctr-radar-label" textAnchor="middle">
                <tspan x={l.x} y={l.y - 6}>{parenMatch[1]}</tspan>
                <tspan x={l.x} y={l.y + 7} className="ctr-radar-label-score">{parenMatch[2]}</tspan>
              </text>
            );
          }
          return (
            <text key={i} x={l.x} y={l.y} className="ctr-radar-label" textAnchor="middle" dominantBaseline="middle">
              {l.label}
            </text>
          );
        })}
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

export function InterpCard({ interp, level }: { interp: RealmInterpData; level: 'high' | 'mid' | 'low' }) {
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
          <JobBadgeList jobs={interp.relatedJobs} />
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

// --- ReliabilityBadge ---

export function ReliabilityBadge({ detail, testTypeId }: { detail: ReportDetailData; testTypeId: import('@/lib/careernet/constants').CareerTestTypeId }) {
  let needsRetest = false;
  let reason = '';

  if (testTypeId === 'maturity' && detail.maturityConsistency) {
    const c = detail.maturityConsistency;
    if (c.description.includes('주의') || c.description.includes('부족') || c.level.includes('비일관')) {
      needsRetest = true;
      reason = '응답 일관성이 낮아 결과 해석에 주의가 필요합니다.';
    }
  }

  if (testTypeId === 'interest' && detail.interestSincerity != null) {
    if (detail.interestSincerity <= 2) {
      needsRetest = true;
      reason = `설문 성실도가 낮습니다. (${detail.interestSincerity.toFixed(1)}/5.0)`;
    }
  }

  if (testTypeId === 'competency' && detail.responseScore != null) {
    if (detail.responseScore <= 71 || detail.responseScore >= 247) {
      needsRetest = true;
      reason = '응답이 한쪽으로 치우쳐 결과 해석에 주의가 필요합니다.';
    }
  }

  if (!needsRetest) return null;

  return (
    <div className="ctr-retest-badge">
      <span className="ctr-retest-badge-icon">!</span>
      <div className="ctr-retest-badge-content">
        <strong>재검사 필요</strong>
        <span>{reason}</span>
      </div>
    </div>
  );
}
