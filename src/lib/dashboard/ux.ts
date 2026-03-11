import type { RecordListItem, ResultItem, SessionItem } from '@/lib/api/client';

export type BannerType =
  | { kind: 'new-user' }
  | { kind: 'in-progress'; session: SessionItem }
  | { kind: 'no-favorites' }
  | { kind: 'ready' };

export type HeroType =
  | { kind: 'no-test' }
  | { kind: 'summary'; completedCount: number; favJobNames: string[]; favMajorNames: string[] }
  | { kind: 'no-favorites'; completedCount: number };

export type GreetingContent = {
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export type RoadmapStep = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

type DashboardSignals = {
  sessions: SessionItem[];
  results: ResultItem[];
  favoriteJobNames: string[];
  favoriteMajorNames: string[];
  recentRecord: RecordListItem | null;
  savedInsightCount: number;
};

function getCompletedTestCount(results: ResultItem[]) {
  return new Set(results.map((result) => result.testTypeId)).size;
}

export function deriveBanner({
  sessions,
  results,
  favoriteJobNames,
  favoriteMajorNames,
}: Pick<
  DashboardSignals,
  'sessions' | 'results' | 'favoriteJobNames' | 'favoriteMajorNames'
>): BannerType {
  if (results.length === 0 && sessions.length === 0) return { kind: 'new-user' };
  if (sessions.length > 0) return { kind: 'in-progress', session: sessions[0] };
  if (results.length > 0 && favoriteJobNames.length === 0 && favoriteMajorNames.length === 0) {
    return { kind: 'no-favorites' };
  }
  return { kind: 'ready' };
}

export function deriveHero({
  results,
  favoriteJobNames,
  favoriteMajorNames,
}: Pick<DashboardSignals, 'results' | 'favoriteJobNames' | 'favoriteMajorNames'>): HeroType {
  const completedCount = getCompletedTestCount(results);

  if (results.length === 0) return { kind: 'no-test' };
  if (favoriteJobNames.length === 0 && favoriteMajorNames.length === 0) {
    return { kind: 'no-favorites', completedCount };
  }
  return {
    kind: 'summary',
    completedCount,
    favJobNames: favoriteJobNames,
    favMajorNames: favoriteMajorNames,
  };
}

export function deriveGreeting({
  results,
  favoriteJobNames,
  favoriteMajorNames,
  recentRecord,
}: Pick<
  DashboardSignals,
  'results' | 'favoriteJobNames' | 'favoriteMajorNames' | 'recentRecord'
>): GreetingContent {
  if (results.length === 0) {
    return {
      message: '진로 검사부터 시작해 볼까요?',
      ctaLabel: '검사 시작',
      ctaHref: '/career-test',
    };
  }

  if (favoriteJobNames.length === 0 && favoriteMajorNames.length === 0) {
    return {
      message: '검사 결과에서 관심 직업을 저장해 보세요.',
      ctaLabel: '결과 확인',
      ctaHref: '/career-test',
    };
  }

  if (!recentRecord) {
    return {
      message: '관심 분야를 학생부 기록으로 남겨볼까요?',
      ctaLabel: '기록 작성',
      ctaHref: '/records/new',
    };
  }

  return {
    message: '오늘의 인사이트를 확인해 보세요.',
    ctaLabel: '인사이트 보기',
    ctaHref: '/ai',
  };
}

export function deriveRoadmapSteps({
  results,
  favoriteJobNames,
  favoriteMajorNames,
  recentRecord,
  savedInsightCount,
}: DashboardSignals): RoadmapStep[] {
  return [
    {
      id: 'interest-test',
      label: '흥미검사 완료하기',
      done: results.some((result) => result.testTypeId === 'interest'),
      href: '/career-test',
    },
    {
      id: 'favorite-jobs',
      label: '관심 직업 3개 저장하기',
      done: favoriteJobNames.length >= 3,
      href: '/favorites/jobs',
    },
    {
      id: 'favorite-majors',
      label: '관심 학과 1개 저장하기',
      done: favoriteMajorNames.length >= 1,
      href: '/favorites/majors',
    },
    {
      id: 'first-record',
      label: '첫 학생부 기록 작성하기',
      done: recentRecord !== null,
      href: '/records/new',
    },
    {
      id: 'save-insight',
      label: '인사이트 1개 저장하기',
      done: savedInsightCount > 0,
      href: '/ai',
    },
  ];
}
