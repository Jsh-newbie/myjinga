import type { RecordCategory } from '@/types/record';

export type RecordIntent =
  | 'daily'
  | 'subject'
  | 'activity'
  | 'fact'
  | 'idea'
  | 'review';

export const RECORD_INTENTS: Array<{
  id: RecordIntent;
  title: string;
  description: string;
}> = [
  {
    id: 'daily',
    title: '오늘 있었던 일',
    description: '수업, 활동, 생각을 짧게 남기고 나중에 분류합니다.',
  },
  {
    id: 'subject',
    title: '수업과 세특 준비',
    description: '질문, 발표, 탐구, 수행평가 근거를 과목별로 모읍니다.',
  },
  {
    id: 'activity',
    title: '창체와 학교 활동',
    description: '자율, 동아리, 진로활동에서 한 역할과 배운 점을 정리합니다.',
  },
  {
    id: 'fact',
    title: '사실 입력',
    description: '봉사, 독서, 수상, 자격증처럼 정확한 사실을 기록합니다.',
  },
  {
    id: 'idea',
    title: '탐구와 진로 아이디어',
    description: '나중에 키울 주제와 관심 학과, 프로젝트 아이디어를 메모합니다.',
  },
  {
    id: 'review',
    title: '학기말 점검',
    description: '실제 학생부와 비교하며 누락과 다음 목표를 확인합니다.',
  },
];

export const RECORD_CATEGORY_META: Record<
  RecordCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    accent: { background: string; color: string };
    recommendedFor: RecordIntent[];
  }
> = {
  dailyLog: {
    label: '오늘의 기록',
    shortLabel: '오늘',
    description: '오늘 한 활동과 배운 점을 빠르게 남깁니다.',
    accent: { background: '#e0f2fe', color: '#0369a1' },
    recommendedFor: ['daily'],
  },
  subjectNote: {
    label: '세특 준비',
    shortLabel: '세특',
    description: '과목별 수업 참여, 질문, 탐구, 수행평가 근거를 남깁니다.',
    accent: { background: '#ede9fe', color: '#6d28d9' },
    recommendedFor: ['subject', 'daily'],
  },
  creativeActivity: {
    label: '창체 기록',
    shortLabel: '창체',
    description: '자율·동아리·진로 활동과 역할, 변화, 배운 점을 기록합니다.',
    accent: { background: '#dcfce7', color: '#166534' },
    recommendedFor: ['activity', 'daily'],
  },
  volunteer: {
    label: '봉사 기록',
    shortLabel: '봉사',
    description: '날짜, 시간, 장소와 활동 내용을 정확히 남깁니다.',
    accent: { background: '#fef3c7', color: '#b45309' },
    recommendedFor: ['fact'],
  },
  reading: {
    label: '독서 기록',
    shortLabel: '독서',
    description: '도서명, 저자, 관련 교과와 기억할 포인트를 정리합니다.',
    accent: { background: '#ffe4e6', color: '#be123c' },
    recommendedFor: ['fact', 'daily'],
  },
  award: {
    label: '수상 기록',
    shortLabel: '수상',
    description: '교내 수상만 기록하고 증빙 여부를 함께 관리합니다.',
    accent: { background: '#fef9c3', color: '#a16207' },
    recommendedFor: ['fact'],
  },
  certificate: {
    label: '자격증 기록',
    shortLabel: '자격',
    description: '자격증명, 취득일, 발급기관을 정확히 관리합니다.',
    accent: { background: '#dbeafe', color: '#1d4ed8' },
    recommendedFor: ['fact'],
  },
  careerIdea: {
    label: '진로 아이디어',
    shortLabel: '진로',
    description: '관심 학과, 직업, 탐구 주제, 프로젝트 아이디어를 저장합니다.',
    accent: { background: '#ffedd5', color: '#c2410c' },
    recommendedFor: ['idea', 'daily', 'subject'],
  },
  semesterReview: {
    label: '학기말 점검',
    shortLabel: '점검',
    description: '실제 학생부와 비교하면서 누락, 금지 표현, 다음 목표를 확인합니다.',
    accent: { background: '#e2e8f0', color: '#334155' },
    recommendedFor: ['review'],
  },
};

export function getCategoriesForIntent(intent: RecordIntent): RecordCategory[] {
  return (Object.keys(RECORD_CATEGORY_META) as RecordCategory[]).filter((category) =>
    RECORD_CATEGORY_META[category].recommendedFor.includes(intent)
  );
}

export function getRecordCategoryLabel(category: string) {
  return RECORD_CATEGORY_META[category as RecordCategory]?.label ?? category;
}

export function getCurrentSemester(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const semester = month >= 3 && month <= 8 ? 1 : 2;
  return `${year}-${semester}`;
}
