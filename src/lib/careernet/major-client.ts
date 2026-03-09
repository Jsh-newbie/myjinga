/**
 * 커리어넷 학과정보 API 클라이언트 (서버 전용)
 *
 * gubun 파라미터: 'univ_list' (대학 학과 전체 목록)
 */

import type {
  CareerNetMajorListResponse,
  CareerNetMajorDetailResponse,
  MajorListItem,
  MajorDetail,
  RelatedSubject,
  MainSubject,
  EnterField,
  CareerActivity,
} from '@/lib/careernet/major-types';

const CAREERNET_MAJOR_BASE = 'https://www.career.go.kr/cnet/openapi/getOpenApi.json';
const TIMEOUT_MS = 10_000;

function getApiKey(): string {
  const key = process.env.CAREERNET_API_KEY?.trim();
  if (!key) {
    throw new Error('CAREERNET_API_KEY 환경변수가 필요합니다.');
  }
  return key;
}

async function fetchCareerNet<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(CAREERNET_MAJOR_BASE);
  url.searchParams.set('apiKey', getApiKey());
  url.searchParams.set('svcType', 'api');
  url.searchParams.set('contentType', 'json');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
      next: { revalidate: 86400 }, // 24시간 캐시
    });

    if (!res.ok) {
      throw new Error(`CAREERNET_MAJOR_HTTP_${res.status}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 학과 목록 조회
 */
export async function fetchMajorList(options: {
  subject?: string;
  searchTitle?: string;
  thisPage?: number;
  perPage?: number;
}): Promise<{ items: MajorListItem[]; totalCount: number }> {
  const params: Record<string, string> = {
    svcCode: 'MAJOR',
    gubun: 'univ_list',
  };

  if (options.subject) params.subject = options.subject;
  if (options.searchTitle) params.searchTitle = options.searchTitle;
  if (options.thisPage) params.thisPage = String(options.thisPage);
  if (options.perPage) params.perPage = String(options.perPage);

  const raw = await fetchCareerNet<CareerNetMajorListResponse>(params);

  const content = raw.dataSearch?.content;
  if (!content || !Array.isArray(content) || content.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const items: MajorListItem[] = content.map((item) => ({
    majorSeq: item.majorSeq,
    name: item.mClass,
    field: item.lClass,
    facilName: item.facilName,
  }));

  // totalCount는 첫 번째 아이템에 포함
  const totalCount = Number(content[0].totalCount) || items.length;

  return { items, totalCount };
}

/**
 * 학과 상세 조회
 */
export async function fetchMajorDetail(majorSeq: string): Promise<MajorDetail | null> {
  const raw = await fetchCareerNet<CareerNetMajorDetailResponse>({
    svcCode: 'MAJOR_VIEW',
    gubun: 'univ_list',
    majorSeq,
  });

  const content = raw.dataSearch?.content;
  if (!content || !Array.isArray(content) || content.length === 0) {
    return null;
  }

  const d = content[0];

  // relate_subject: 배열 → RelatedSubject[]
  const relatedSubjects: RelatedSubject[] = Array.isArray(d.relate_subject)
    ? d.relate_subject
        .filter((s) => s.subject_name && s.subject_description)
        .map((s) => ({
          name: s.subject_name,
          description: s.subject_description ?? '',
        }))
    : [];

  // main_subject: 배열 → MainSubject[]
  const mainSubjects: MainSubject[] = Array.isArray(d.main_subject)
    ? d.main_subject.map((s) => ({
        name: s.SBJECT_NM ?? '',
        summary: s.SBJECT_SUMRY ?? '',
      }))
    : [];

  // enter_field: 배열 → EnterField[]
  const enterFields: EnterField[] = Array.isArray(d.enter_field)
    ? d.enter_field.map((e) => ({
        category: e.gradeuate ?? '',
        description: e.description ?? '',
      }))
    : [];

  // career_act: 배열 → CareerActivity[]
  const careerActivities: CareerActivity[] = Array.isArray(d.career_act)
    ? d.career_act.map((a) => ({
        name: (a.act_name ?? '').replace(/<br\s*\/?>/gi, '').trim(),
        description: (a.act_description ?? '').replace(/<br\s*\/?>/gi, '\n').trim(),
      }))
    : [];

  return {
    majorSeq: d.majorSeq ?? majorSeq,
    name: d.major ?? '',
    field: d.lClass ?? '',
    summary: d.summary ?? '',
    property: d.property ?? '',
    relatedSubjects,
    mainSubjects,
    relatedJobs: d.job ?? '',
    qualifications: d.qualifications ?? '',
    enterFields,
    employment: d.employment ?? '',
    salary: d.salary ?? '',
    department: d.department ?? '',
    interest: d.interest ?? '',
    careerActivities,
    university: d.university ?? '',
  };
}
