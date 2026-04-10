export type OnboardingStepId =
  | 'career-test'
  | 'favorite-jobs'
  | 'favorite-majors'
  | 'first-record'
  | 'save-insight';

export type OnboardingStepState = 'done' | 'current' | 'upcoming';

export interface OnboardingSignals {
  results: Array<{ testTypeId: string }>;
  favoriteJobNames: string[];
  favoriteMajorNames: string[];
  recentRecord: { id?: string } | null;
  savedInsightCount: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  done: boolean;
  href: string;
  state: OnboardingStepState;
}

export interface OnboardingNextAction {
  stepId: OnboardingStepId;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  allDone: boolean;
  nextAction: OnboardingNextAction;
}
