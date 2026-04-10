import { describe, expect, it } from 'vitest';

import { buildOnboardingState } from '@/lib/onboarding/roadmap';

describe('buildOnboardingState', () => {
  it('guides a brand new user to start a career test first', () => {
    const state = buildOnboardingState({
      results: [],
      favoriteJobNames: [],
      favoriteMajorNames: [],
      recentRecord: null,
      savedInsightCount: 0,
    });

    expect(state.completedCount).toBe(0);
    expect(state.nextAction.ctaHref).toBe('/career-test');
    expect(state.nextAction.ctaLabel).toBe('검사 시작');
    expect(state.steps[0]).toMatchObject({
      id: 'career-test',
      label: '진로 검사 완료하기',
      done: false,
      state: 'current',
    });
  });

  it('prompts a user with results to save favorites before writing records', () => {
    const state = buildOnboardingState({
      results: [{ testTypeId: 'interest' }],
      favoriteJobNames: [],
      favoriteMajorNames: [],
      recentRecord: null,
      savedInsightCount: 0,
    });

    expect(state.completedCount).toBe(1);
    expect(state.progressPercent).toBe(20);
    expect(state.nextAction).toMatchObject({
      stepId: 'favorite-jobs',
      ctaHref: '/career-test',
      ctaLabel: '결과 확인',
    });
    expect(state.steps[1]).toMatchObject({
      id: 'favorite-jobs',
      done: false,
      state: 'current',
    });
  });

  it('marks onboarding complete when favorites, records, and insight saves exist', () => {
    const state = buildOnboardingState({
      results: [{ testTypeId: 'interest' }],
      favoriteJobNames: ['간호사'],
      favoriteMajorNames: ['간호학과'],
      recentRecord: { id: 'record-1' },
      savedInsightCount: 1,
    });

    expect(state.allDone).toBe(true);
    expect(state.completedCount).toBe(5);
    expect(state.progressPercent).toBe(100);
    expect(state.nextAction).toMatchObject({
      stepId: 'save-insight',
      ctaHref: '/ai',
      ctaLabel: '인사이트 보기',
    });
    expect(state.steps.every((step) => step.done)).toBe(true);
  });
});
