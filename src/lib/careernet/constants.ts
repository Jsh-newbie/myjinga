export type CareerTestTypeId = 'aptitude' | 'interest' | 'maturity' | 'values' | 'competency';

export interface CareerTestMeta {
  id: CareerTestTypeId;
  name: string;
  description: string;
  qestrnSeq: { middle: string; high: string };
  trgetSe: { middle: string; high: string };
  apiVersion: 'v1' | 'v2';
  estimatedMinutes: number;
}

export const CAREER_TESTS: Record<CareerTestTypeId, CareerTestMeta> = {
  aptitude: {
    id: 'aptitude',
    name: '직업적성검사',
    description: '나의 잠재 능력과 적성을 알아봐요',
    qestrnSeq: { middle: '20', high: '21' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 30,
  },
  interest: {
    id: 'interest',
    name: '직업흥미검사(H)',
    description: '어떤 일에 흥미가 있는지 알아봐요',
    qestrnSeq: { middle: '33', high: '34' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v2',
    estimatedMinutes: 20,
  },
  maturity: {
    id: 'maturity',
    name: '진로성숙도검사',
    description: '진로 결정 준비가 얼마나 되었는지 확인해요',
    qestrnSeq: { middle: '22', high: '23' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
  values: {
    id: 'values',
    name: '직업가치관검사',
    description: '직업 선택 시 중요하게 여기는 가치를 알아봐요',
    qestrnSeq: { middle: '24', high: '25' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
  competency: {
    id: 'competency',
    name: '진로개발역량검사',
    description: '진로 개발을 위한 역량 수준을 확인해요',
    qestrnSeq: { middle: '26', high: '27' },
    trgetSe: { middle: '100206', high: '100207' },
    apiVersion: 'v1',
    estimatedMinutes: 20,
  },
};

export const CAREER_TEST_LIST: CareerTestMeta[] = [
  CAREER_TESTS.aptitude,
  CAREER_TESTS.interest,
  CAREER_TESTS.maturity,
  CAREER_TESTS.values,
  CAREER_TESTS.competency,
];

export const GENDER_CODE = { male: '100323', female: '100324' } as const;
export const TARGET_CODE = { middle: '100206', high: '100207' } as const;

export function isCareerTestTypeId(value: string): value is CareerTestTypeId {
  return value in CAREER_TESTS;
}
