import type {
  OnboardingNextAction,
  OnboardingSignals,
  OnboardingState,
  OnboardingStep,
  OnboardingStepId,
} from '@/types/onboarding';

type StepDefinition = Pick<OnboardingStep, 'id' | 'label' | 'href'> & {
  isDone: (signals: OnboardingSignals) => boolean;
};

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: 'career-test',
    label: '진로 검사 완료하기',
    href: '/career-test',
    isDone: (signals) => signals.results.length > 0,
  },
  {
    id: 'favorite-jobs',
    label: '관심 직업 저장하기',
    href: '/favorites/jobs',
    isDone: (signals) => signals.favoriteJobNames.length > 0,
  },
  {
    id: 'favorite-majors',
    label: '관심 학과 저장하기',
    href: '/favorites/majors',
    isDone: (signals) => signals.favoriteMajorNames.length > 0,
  },
  {
    id: 'first-record',
    label: '첫 학생부 기록 작성하기',
    href: '/records/new',
    isDone: (signals) => signals.recentRecord !== null,
  },
  {
    id: 'save-insight',
    label: '인사이트 1개 저장하기',
    href: '/ai',
    isDone: (signals) => signals.savedInsightCount > 0,
  },
];

function createNextAction(stepId: OnboardingStepId): OnboardingNextAction {
  switch (stepId) {
    case 'career-test':
      return {
        stepId,
        message: '진로 검사부터 시작해 볼까요?',
        ctaLabel: '검사 시작',
        ctaHref: '/career-test',
      };
    case 'favorite-jobs':
      return {
        stepId,
        message: '검사 결과에서 관심 직업을 저장해 보세요.',
        ctaLabel: '결과 확인',
        ctaHref: '/career-test',
      };
    case 'favorite-majors':
      return {
        stepId,
        message: '관심 직업과 함께 관심 학과도 저장해 보세요.',
        ctaLabel: '검사 결과 보기',
        ctaHref: '/career-test',
      };
    case 'first-record':
      return {
        stepId,
        message: '관심 분야를 학생부 기록으로 남겨볼까요?',
        ctaLabel: '기록 작성',
        ctaHref: '/records/new',
      };
    case 'save-insight':
      return {
        stepId,
        message: '오늘의 인사이트를 확인해 보세요.',
        ctaLabel: '인사이트 보기',
        ctaHref: '/ai',
      };
  }
}

export function buildOnboardingState(signals: OnboardingSignals): OnboardingState {
  let currentStepFound = false;

  const steps = STEP_DEFINITIONS.map<OnboardingStep>((definition) => {
    const done = definition.isDone(signals);
    const state = done ? 'done' : currentStepFound ? 'upcoming' : 'current';

    if (!done && !currentStepFound) {
      currentStepFound = true;
    }

    return {
      id: definition.id,
      label: definition.label,
      done,
      href: definition.href,
      state,
    };
  });

  const completedCount = steps.filter((step) => step.done).length;
  const totalCount = steps.length;
  const allDone = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const currentStep = steps.find((step) => step.state === 'current');

  return {
    steps: allDone ? steps.map((step) => ({ ...step, state: 'done' as const })) : steps,
    completedCount,
    totalCount,
    allDone,
    progressPercent,
    nextAction: createNextAction(currentStep?.id ?? 'save-insight'),
  };
}
