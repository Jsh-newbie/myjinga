/** 커리어넷 학과정보 API 응답 타입 */

// --- 목록 조회 응답 (svcCode=MAJOR) ---

export interface CareerNetMajorListItem {
  /** 학과코드 */
  majorSeq: string;
  /** 계열 */
  lClass: string;
  /** 학과명 */
  mClass: string;
  /** 세부학과명 */
  facilName: string;
  /** 총 결과 수 (첫 아이템에만 포함) */
  totalCount?: string;
}

export interface CareerNetMajorListResponse {
  dataSearch: {
    content: CareerNetMajorListItem[];
  };
}

// --- 상세 조회 응답 (svcCode=MAJOR_VIEW) ---

export interface CareerNetSubjectInfo {
  subject_name: string;
  subject_description: string | null;
}

export interface CareerNetCareerActivity {
  act_name: string;
  act_description: string;
}

export interface CareerNetMainSubject {
  SBJECT_NM: string;
  SBJECT_SUMRY: string;
}

export interface CareerNetEnterField {
  gradeuate: string;
  description: string;
}

export interface CareerNetMajorDetail {
  /** 학과코드 */
  majorSeq: string;
  /** 학과명 */
  major: string;
  /** 계열 */
  lClass: string;
  /** 학과개요 */
  summary: string;
  /** 학과특성 */
  property: string;
  /** 관련 고교 교과목 (배열) */
  relate_subject: CareerNetSubjectInfo[];
  /** 주요 교과목 (배열) */
  main_subject: CareerNetMainSubject[];
  /** 관련직업 */
  job: string;
  /** 관련자격 */
  qualifications: string;
  /** 졸업 후 진출분야 (배열) */
  enter_field: CareerNetEnterField[];
  /** 취업률 */
  employment: string;
  /** 졸업 후 임금 */
  salary: string;
  /** 세부관련학과 */
  department: string;
  /** 흥미와 적성 */
  interest: string;
  /** 진로 탐색 활동 (배열) */
  career_act: CareerNetCareerActivity[];
  /** 개설대학 정보 */
  university: string;
}

export interface CareerNetMajorDetailResponse {
  dataSearch: {
    content: CareerNetMajorDetail[];
  };
}

// --- 정규화된 타입 (프론트엔드용) ---

export interface MajorListItem {
  majorSeq: string;
  name: string;
  field: string;
  facilName: string;
}

export interface RelatedSubject {
  name: string;
  description: string;
}

export interface MainSubject {
  name: string;
  summary: string;
}

export interface EnterField {
  category: string;
  description: string;
}

export interface CareerActivity {
  name: string;
  description: string;
}

export interface MajorDetail {
  majorSeq: string;
  name: string;
  field: string;
  summary: string;
  property: string;
  relatedSubjects: RelatedSubject[];
  mainSubjects: MainSubject[];
  relatedJobs: string;
  qualifications: string;
  enterFields: EnterField[];
  employment: string;
  salary: string;
  department: string;
  interest: string;
  careerActivities: CareerActivity[];
  university: string;
}

// --- 계열 코드 ---

export const MAJOR_FIELD_CODES: Record<string, string> = {
  '100391': '인문계열',
  '100392': '사회계열',
  '100393': '교육계열',
  '100394': '공학계열',
  '100395': '자연계열',
  '100396': '의약계열',
  '100397': '예체능계열',
} as const;

export const MAJOR_FIELDS = Object.entries(MAJOR_FIELD_CODES).map(([code, name]) => ({
  code,
  name,
}));
