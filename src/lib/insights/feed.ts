import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';

import { getAdminDb } from '@/lib/firebase/admin';
import { normalizeInsightSourceUrl } from '@/lib/insights/source-url';
import { expandInsightKeywords, findInsightMatches } from '@/lib/insights/topic-map';
import { searchNanetLibrary, nanetRecordToFeedItem } from '@/lib/insights/nanet';
import type { InsightFeedItem, InsightFeedTab } from '@/types/insight';

type UserSignals = {
  favoriteJobs: string[];
  favoriteJobKeywords: string[];
  favoriteJobKeywordGroups: string[][];
  favoriteMajors: string[];
  favoriteMajorKeywordGroups: string[][];
  recordTopics: string[];
  interests: string[];
};

type SignalGroup = {
  id: string;
  label: string;
  type: 'job' | 'major' | 'record';
  keywords: string[];
};

type RawRssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { '#text'?: string };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
});

const CAREERNET_BASE = 'https://www.career.go.kr/cnet/front/openapi';
const CAREERNET_TIMEOUT_MS = 8000;
const CAREERNET_MAX_RETRIES = 1;
const CAREERNET_KEYWORD_LIMIT = 6;
const CAREERNET_JOB_ENRICH_LIMIT = 3;
const RECENT_DAYS_LIMIT = 30;
const MAX_ITEMS_PER_GROUP = 6;

const FALLBACK_ITEMS: Array<Omit<InsightFeedItem, 'score' | 'matchedKeywords'>> = [
  {
    id: 'fallback-healthcare-ai',
    title: '헬스케어 AI 확산, 의료 현장은 어떻게 달라질까',
    sourceName: 'Myjinga Curated',
    sourceUrl: 'https://news.google.com/search?q=%ED%97%AC%EC%8A%A4%EC%BC%80%EC%96%B4%20AI&hl=ko&gl=KR&ceid=KR:ko',
    publishedAt: null,
    summary: '의료와 기술의 결합은 간호, 의생명, 컴퓨터공학 관심 학생에게 모두 연결될 수 있는 대표 주제입니다.',
    whyItMatters: '생명과학, 정보, 윤리 과목을 함께 연결해 볼 수 있는 탐구 소재입니다.',
    topics: ['헬스케어', 'AI', '생명과학'],
    relatedJobs: ['간호사', '개발자'],
    relatedMajors: ['간호학과', '의생명공학과', '컴퓨터공학과'],
    studentInsightPoints: ['생명과학과 정보 과목을 묶은 탐구 주제로 확장 가능', '의료 AI의 장점과 한계를 비교하는 보고서 소재로 적합'],
    exploreQuestions: ['의료 AI는 어떤 상황에서 보조 역할을 하는 것이 적절할까?'],
    contentType: 'trend',
  },
  {
    id: 'fallback-education-ai',
    title: '학교 현장에서 AI와 디지털 학습 도구는 어떻게 쓰일까',
    sourceName: 'Myjinga Curated',
    sourceUrl: 'https://news.google.com/search?q=%EA%B5%90%EC%9C%A1%20AI&hl=ko&gl=KR&ceid=KR:ko',
    publishedAt: null,
    summary: '교육과 기술이 만나는 흐름은 교육학, 심리학, 컴퓨터공학 관심 학생에게 모두 흥미로운 주제입니다.',
    whyItMatters: '교수법, 학습 격차, 기술 윤리를 함께 고민해 볼 수 있습니다.',
    topics: ['교육', 'AI', '학습'],
    relatedJobs: ['교사'],
    relatedMajors: ['교육학과', '심리학과', '컴퓨터공학과'],
    studentInsightPoints: ['교육학과 정보 과목 연계 탐구에 적합', '기술 활용과 학습 효과를 비교하는 발표 주제로 연결 가능'],
    exploreQuestions: ['AI 학습 도구는 학생마다 어떤 차이를 만들까?'],
    contentType: 'trend',
  },
  {
    id: 'fallback-media-career',
    title: '콘텐츠와 미디어 직업은 왜 더 세분화되고 있을까',
    sourceName: 'Myjinga Curated',
    sourceUrl: 'https://news.google.com/search?q=%EB%AF%B8%EB%94%94%EC%96%B4%20%EC%A7%81%EC%97%85&hl=ko&gl=KR&ceid=KR:ko',
    publishedAt: null,
    summary: '기자, 디자이너, 콘텐츠 기획자처럼 미디어 관련 진로는 기술과 플랫폼 변화에 따라 역할이 계속 달라지고 있습니다.',
    whyItMatters: '미디어커뮤니케이션, 디자인, 사회이슈 탐구와 자연스럽게 연결됩니다.',
    topics: ['미디어', '콘텐츠', '직업변화'],
    relatedJobs: ['기자', '디자이너'],
    relatedMajors: ['미디어커뮤니케이션학과'],
    studentInsightPoints: ['사회문화와 국어 과목 탐구 소재로 활용 가능', '플랫폼 변화가 직업 역할에 미치는 영향을 정리하기 좋음'],
    exploreQuestions: ['플랫폼 변화는 미디어 직업의 역량을 어떻게 바꾸고 있을까?'],
    contentType: 'career-story',
  },
];

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function sanitizeText(value: string | undefined) {
  if (!value) return '';
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyKoreanText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const hangulMatches = trimmed.match(/[가-힣]/g) ?? [];
  const latinWordMatches = trimmed.match(/[A-Za-z]{3,}/g) ?? [];

  if (hangulMatches.length >= 4) return true;
  if (hangulMatches.length === 0) return false;

  return hangulMatches.length >= latinWordMatches.length;
}

const KOREAN_HOST_ALLOWLIST = [
  '.kr',
  'yna.co.kr',
  'chosun.com',
  'joongang.co.kr',
  'donga.com',
  'hani.co.kr',
  'khan.co.kr',
  'mk.co.kr',
  'hankyung.com',
  'sedaily.com',
  'mt.co.kr',
  'newsis.com',
  'nocutnews.co.kr',
  'ytn.co.kr',
  'sbs.co.kr',
  'kbs.co.kr',
  'mbc.co.kr',
];

const TRANSLATED_PATH_PATTERNS = [
  /^\/ko(\/|$)/i,
  /^\/kr(\/|$)/i,
  /\/ko\/$/i,
  /\/ko\//i,
  /[?&](lang|locale)=ko\b/i,
  /[?&]lang=kr\b/i,
];

const BLOCKED_HOST_SUFFIXES = [
  '.vn',
];

function isLikelyTranslatedForeignUrl(link: string) {
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();
    const pathWithQuery = `${url.pathname}${url.search}`;

    if (BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))) {
      return true;
    }

    const isKoreanHost = KOREAN_HOST_ALLOWLIST.some((domain) => host === domain || host.endsWith(domain));
    if (isKoreanHost) return false;

    return TRANSLATED_PATH_PATTERNS.some((pattern) => pattern.test(pathWithQuery));
  } catch {
    return false;
  }
}

function isKoreanNewsEntry(title: string, description: string, sourceName: string, link: string) {
  const normalizedSource = sourceName.toLowerCase();
  if (
    BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedSource === suffix.slice(1) || normalizedSource.endsWith(suffix) || normalizedSource.includes(suffix))
  ) {
    return false;
  }

  if (isLikelyTranslatedForeignUrl(link)) return false;
  if (isLikelyKoreanText(title)) return true;
  if (description && isLikelyKoreanText(description)) return true;

  return normalizedSource.includes('코리아') || normalizedSource.includes('한국') || normalizedSource.includes('연합뉴스');
}

function makeContentId(link: string, title: string) {
  return createHash('sha1').update(`${link}::${title}`).digest('hex').slice(0, 20);
}

function formatKoreanDate(date: string | null) {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function getPublishedTime(date: string | null | undefined) {
  if (!date) return Number.NEGATIVE_INFINITY;
  const value = new Date(date).getTime();
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function isWithinRecentWindow(date: string | null | undefined, days = RECENT_DAYS_LIMIT) {
  const publishedTime = getPublishedTime(date);
  if (!Number.isFinite(publishedTime)) return false;

  return Date.now() - publishedTime <= days * 24 * 60 * 60 * 1000;
}

function normalizeKeyword(value: string) {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[·|]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeadlineClusterKey(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\([^)]+\)/g, ' ')
    .replace(/[“”"'‘’]/g, '')
    .replace(/[!?,.:;/\\|]/g, ' ')
    .replace(/\b(속보|단독|종합|포토|영상|뉴스쏙|브리핑)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    .split(' ')
    .filter((token) => token.length >= 3)
    .slice(0, 5)
    .join(' ');
}

function splitKeywordCandidates(value: string | undefined) {
  if (!value) return [];

  return normalizeKeyword(value)
    .split(/[,\n/]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 18);
}

function uniqueKeywords(values: string[], limit = CAREERNET_KEYWORD_LIMIT) {
  const deduped = new Set<string>();

  values.forEach((value) => {
    const normalized = normalizeKeyword(value);
    if (!normalized || normalized.length < 2 || normalized.length > 18) return;
    deduped.add(normalized);
  });

  return [...deduped].slice(0, limit);
}

function interleaveKeywordGroups(groups: string[][], limit: number) {
  const result: string[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const keyword = group[index];
      if (!keyword || seen.has(keyword)) continue;

      seen.add(keyword);
      result.push(keyword);

      if (result.length >= limit) {
        return result;
      }
    }
  }

  return result;
}

async function fetchCareerNetJobDetail(jobCode: string) {
  const apiKey = process.env.CAREERNET_API_KEY?.trim();
  if (!apiKey) return null;

  const url = `${CAREERNET_BASE}/job.json?apiKey=${encodeURIComponent(apiKey)}&seq=${encodeURIComponent(jobCode)}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= CAREERNET_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CAREERNET_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
        next: { revalidate: 60 * 60 * 24 },
      });

      if (!response.ok) {
        throw new Error(`CAREERNET_HTTP_${response.status}`);
      }

      return await response.json() as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[insights][feed] careernet job keyword fetch failed', { jobCode, error: lastError });
  return null;
}

async function fetchCareerNetJobKeywords(jobCode: string, jobName: string) {
  const raw = await fetchCareerNetJobDetail(jobCode);
  if (!raw) return [jobName];

  const base = (raw.baseInfo ?? {}) as Record<string, unknown>;
  const abilityList = (raw.abilityList ?? []) as Array<{ ability_name?: string }>;
  const interestList = (raw.interestList ?? []) as Array<{ interest?: string }>;
  const departList = (raw.departList ?? []) as Array<{ depart_name?: string }>;

  const derivedKeywords = uniqueKeywords([
    String(base.std_job_nm ?? ''),
    String(base.aptit_name ?? ''),
    ...splitKeywordCandidates(String(base.rel_job_nm ?? '')),
    ...abilityList.map((item) => String(item.ability_name ?? '')),
    ...interestList.map((item) => String(item.interest ?? '')),
    ...departList.map((item) => String(item.depart_name ?? '')),
  ]).filter((keyword) => keyword !== jobName);

  return derivedKeywords.length > 0 ? derivedKeywords : [jobName];
}

function buildMajorKeywordGroup(majorName: string) {
  const expanded = expandInsightKeywords([majorName]).filter((keyword) => keyword !== majorName);
  const keywords = uniqueKeywords([majorName, ...expanded], CAREERNET_KEYWORD_LIMIT);
  return keywords.length > 0 ? keywords : [majorName];
}

type UserSignalsBase = Omit<UserSignals, 'favoriteJobKeywords' | 'favoriteJobKeywordGroups'> & {
  jobDocs: FirebaseFirestore.QueryDocumentSnapshot[];
};

async function getUserSignalsBase(uid: string): Promise<UserSignalsBase> {
  const [jobsSnapshot, majorsSnapshot, recordsSnapshot, userSnapshot] = await Promise.all([
    getAdminDb().collection('users').doc(uid).collection('favoriteJobs').orderBy('createdAt', 'desc').limit(5).get(),
    getAdminDb().collection('users').doc(uid).collection('favoriteMajors').orderBy('createdAt', 'desc').limit(5).get(),
    getAdminDb().collection('users').doc(uid).collection('records').orderBy('updatedAt', 'desc').limit(12).get(),
    getAdminDb().collection('users').doc(uid).get(),
  ]);

  const favoriteJobs = jobsSnapshot.docs.map((doc) => String(doc.data().jobName ?? '')).filter(Boolean);
  const favoriteMajors = majorsSnapshot.docs.map((doc) => String(doc.data().majorName ?? '')).filter(Boolean);
  const favoriteMajorKeywordGroups = favoriteMajors.map((majorName) => buildMajorKeywordGroup(majorName));

  const recordTopics = recordsSnapshot.docs
    .flatMap((doc) => {
      const data = doc.data();
      return [
        typeof data.subject === 'string' ? data.subject : '',
        ...(Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : []),
        typeof data.careerRelevance === 'string' ? data.careerRelevance : '',
        typeof data.title === 'string' ? data.title : '',
      ];
    })
    .map((value) => value.trim())
    .filter((value) => value.length >= 2)
    .slice(0, 8);

  const interests = Array.isArray(userSnapshot.data()?.interests)
    ? userSnapshot.data()?.interests.filter((value: unknown): value is string => typeof value === 'string')
    : [];

  return { favoriteJobs, favoriteMajors, favoriteMajorKeywordGroups, recordTopics, interests, jobDocs: jobsSnapshot.docs };
}

async function enrichJobKeywords(jobDocs: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<{
  favoriteJobKeywords: string[];
  favoriteJobKeywordGroups: string[][];
}> {
  const favoriteJobKeywordGroups = await Promise.all(
    jobDocs
      .slice(0, CAREERNET_JOB_ENRICH_LIMIT)
      .map((doc) => fetchCareerNetJobKeywords(doc.id, String(doc.data().jobName ?? '')))
  );
  const favoriteJobKeywords = interleaveKeywordGroups(favoriteJobKeywordGroups, 12);
  return { favoriteJobKeywords, favoriteJobKeywordGroups };
}

function buildSignalGroups(signals: UserSignals, tab: InsightFeedTab, selectedKeyword?: string): SignalGroup[] {
  if (selectedKeyword) {
    return [
      {
        id: `keyword:${selectedKeyword}`,
        label: selectedKeyword,
        type: 'record',
        keywords: uniqueKeywords([selectedKeyword, ...expandInsightKeywords([selectedKeyword])], 8),
      },
    ];
  }

  const jobGroups = signals.favoriteJobs.map((jobName, index) => ({
    id: `job:${jobName}`,
    label: jobName,
    type: 'job' as const,
    keywords: uniqueKeywords(
      [jobName, ...(signals.favoriteJobKeywordGroups[index] ?? []), ...expandInsightKeywords([jobName])],
      CAREERNET_KEYWORD_LIMIT
    ),
  }));

  const majorGroups = signals.favoriteMajors.map((majorName, index) => ({
    id: `major:${majorName}`,
    label: majorName,
    type: 'major' as const,
    keywords: signals.favoriteMajorKeywordGroups[index] ?? [majorName],
  }));

  const recordGroups = signals.recordTopics.slice(0, 4).map((topic) => ({
    id: `record:${topic}`,
    label: topic,
    type: 'record' as const,
    keywords: uniqueKeywords([topic, ...expandInsightKeywords([topic])], 4),
  }));

  const interestGroups = signals.interests.slice(0, 4).map((interest) => ({
    id: `interest:${interest}`,
    label: interest,
    type: 'record' as const,
    keywords: uniqueKeywords([interest, ...expandInsightKeywords([interest])], 4),
  }));

  const groups =
    tab === 'jobs'
      ? jobGroups
      : tab === 'majors'
        ? majorGroups
        : tab === 'record-linked'
          ? recordGroups
          : [...jobGroups, ...majorGroups, ...interestGroups, ...recordGroups];

  return groups.filter((group) => group.keywords.length > 0);
}

function buildKeywords(groups: SignalGroup[]) {
  const keywords = interleaveKeywordGroups(groups.map((group) => group.keywords), 12);
  return keywords.length > 0 ? keywords : ['진로', '학과', '직업', '탐구'];
}

async function fetchGoogleNewsFeed(keyword: string): Promise<RawRssItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Myjinga Insight Bot/1.0',
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_NEWS_FETCH_FAILED:${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as {
    rss?: {
      channel?: {
        item?: RawRssItem | RawRssItem[];
      };
    };
  };

  return toArray(parsed.rss?.channel?.item);
}

function scoreItem(item: Omit<InsightFeedItem, 'score' | 'matchedKeywords'>, signals: UserSignals, keywords: string[]) {
  const source = `${item.title} ${item.summary} ${item.whyItMatters} ${item.topics.join(' ')} ${item.relatedJobs.join(' ')} ${item.relatedMajors.join(' ')}`;
  const matchedKeywords = findInsightMatches(source, keywords);

  let score = 0;
  score += matchedKeywords.length * 2;

  if (item.relatedJobs.some((job) => signals.favoriteJobs.includes(job))) score += 5;
  if (item.relatedMajors.some((major) => signals.favoriteMajors.includes(major))) score += 5;
  if (item.topics.some((topic) => signals.interests.includes(topic))) score += 2;
  if (item.topics.some((topic) => signals.recordTopics.some((recordTopic) => recordTopic.includes(topic) || topic.includes(recordTopic)))) {
    score += 3;
  }

  if (item.publishedAt) {
    const publishedTime = new Date(item.publishedAt).getTime();
    if (!Number.isNaN(publishedTime)) {
      const diffDays = (Date.now() - publishedTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) score += 3;
      else if (diffDays <= 30) score += 1;
    }
  }

  return {
    ...item,
    score,
    matchedKeywords,
  };
}

function inferRelations(keyword: string, title: string, description: string) {
  const merged = `${keyword} ${title} ${description}`;
  const topics = expandInsightKeywords([keyword]).slice(0, 5);
  const relatedJobs = expandInsightKeywords([keyword]).filter((value) => /사$|자$|교사|기자|개발자|디자이너/.test(value)).slice(0, 3);
  const relatedMajors = expandInsightKeywords([keyword]).filter((value) => /학과$/.test(value)).slice(0, 3);

  const summary = description || `${keyword}와 연결된 최신 이슈입니다.`;
  const whyItMatters = `${keyword}와 연결된 최근 이슈를 통해 진로, 학과, 과목 탐구 아이디어를 넓혀볼 수 있습니다.`;

  const studentInsightPoints = [
    `${keyword}와 연결되는 과목이나 활동을 떠올려 볼 수 있습니다.`,
    `${keyword} 관련 탐구 질문이나 발표 주제로 확장하기 좋습니다.`,
  ];

  const exploreQuestions = [
    `${keyword}와 관련해 최근 변화가 생긴 이유는 무엇일까?`,
    `${keyword}와 연결되는 과목이나 사회 이슈는 무엇일까?`,
  ];

  return {
    topics: topics.length > 0 ? topics : [keyword],
    relatedJobs: merged.includes('학과') ? [] : relatedJobs,
    relatedMajors: relatedMajors.length > 0 ? relatedMajors : merged.includes('학과') ? [keyword] : [],
    summary,
    whyItMatters,
    studentInsightPoints,
    exploreQuestions,
  };
}

export async function getInsightFeed(uid: string, tab: InsightFeedTab = 'all', limit = 12, selectedKeyword?: string) {
  const base = await getUserSignalsBase(uid);

  // CareerNet job enrichment 없이 기본 signals로 groups/keywords를 먼저 계산
  const baseSignals: UserSignals = {
    ...base,
    favoriteJobKeywords: base.favoriteJobs,
    favoriteJobKeywordGroups: base.favoriteJobs.map((name) => [name]),
  };
  const groups = buildSignalGroups(baseSignals, tab, selectedKeyword);
  const keywords = buildKeywords(groups);

  try {
    const feedCache = new Map<string, Promise<RawRssItem[]>>();
    const getFeedByKeyword = (keyword: string) => {
      if (!feedCache.has(keyword)) {
        feedCache.set(keyword, fetchGoogleNewsFeed(keyword));
      }

      return feedCache.get(keyword)!;
    };

    // 국회도서관 키워드를 미리 계산
    const nanetCandidates = [
      ...base.interests,
      ...base.favoriteMajors,
      ...base.favoriteJobs,
      ...base.recordTopics,
    ]
      .map((value) => value.replace(/\([^)]*\)/g, '').replace(/·/g, ' ').trim())
      .filter((value) => value.length >= 2 && value.length <= 10);

    const nanetSeen = new Set<string>();
    const nanetKeywords = nanetCandidates.filter((kw) => {
      if (nanetSeen.has(kw)) return false;
      nanetSeen.add(kw);
      return true;
    }).slice(0, 4);

    // CareerNet job enrichment, Google News, nanet을 모두 병렬 시작
    const enrichPromise = enrichJobKeywords(base.jobDocs);

    const nanetPromise = Promise.all(
      nanetKeywords.map(async (keyword) => {
        const records = await searchNanetLibrary(keyword);
        return records.map((record) => nanetRecordToFeedItem(record, keyword));
      })
    );

    const groupedItemsPromise = Promise.all(
      groups.map(async (group) => {
        const entriesByKeyword = await Promise.all(group.keywords.map(async (keyword) => ({
          keyword,
          items: await getFeedByKeyword(keyword),
        })));

        const groupItems = new Map<string, Omit<InsightFeedItem, 'score' | 'matchedKeywords'>>();

        entriesByKeyword.forEach(({ keyword, items }) => {
          [...items]
            .sort((a, b) => getPublishedTime(b.pubDate) - getPublishedTime(a.pubDate))
            .forEach((entry) => {
              if (!isWithinRecentWindow(entry.pubDate ?? null)) return;

              const title = sanitizeText(entry.title);
              const link = sanitizeText(entry.link);
              if (!title || !link) return;

              const id = makeContentId(link, title);
              const description = sanitizeText(entry.description);
              const sourceField = typeof entry.source === 'string' ? entry.source : entry.source?.['#text'];
              const sourceName = sanitizeText(sourceField) || 'Google News';
              if (!isKoreanNewsEntry(title, description, sourceName, link)) return;

              const relation = inferRelations(group.label, title, description);
              const nextItem = {
                id,
                title,
                sourceName,
                sourceUrl: normalizeInsightSourceUrl(link),
                publishedAt: formatKoreanDate(entry.pubDate ?? null),
                contentType: 'news' as const,
                ...relation,
              };
              const existing = groupItems.get(id);

              if (!existing || getPublishedTime(nextItem.publishedAt) > getPublishedTime(existing.publishedAt)) {
                groupItems.set(id, nextItem);
              }
            });
        });

        return { group, groupItems };
      })
    );

    // 모든 외부 호출을 병렬 대기
    const [enriched, groupedRaw, nanetResults] = await Promise.all([
      enrichPromise,
      groupedItemsPromise,
      nanetPromise,
    ]);

    // enriched job keywords로 최종 signals 완성 후 스코어링
    const signals: UserSignals = {
      ...base,
      favoriteJobKeywords: enriched.favoriteJobKeywords,
      favoriteJobKeywordGroups: enriched.favoriteJobKeywordGroups,
    };

    const groupedItems = groupedRaw.map(({ group, groupItems }) => {
      const items = [...groupItems.values()]
        .map((item) => scoreItem(item, signals, keywords))
        .sort((a, b) => {
          const timeDiff = getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt);
          if (timeDiff !== 0) return timeDiff;
          return b.score - a.score;
        });

      return { group, items };
    });

    const nanetScoredItems = nanetResults
      .flat()
      .map((item) => scoreItem(item, signals, keywords));

    // 국회도서관 자료는 ID 기준으로 중복 제거
    const nanetDeduped = new Map<string, ReturnType<typeof scoreItem>>();
    nanetScoredItems.forEach((item) => {
      const existing = nanetDeduped.get(item.id);
      if (!existing || item.score > existing.score) {
        nanetDeduped.set(item.id, item);
      }
    });

    const nanetPool = [...nanetDeduped.values()]
      .sort((a, b) => b.score - a.score);

    console.log(`[insights][feed] nanet keywords=${JSON.stringify(nanetKeywords)} pool=${nanetPool.length}`);

    const dedupedByHeadline = new Map<
      string,
      {
        groupId: string;
        item: ReturnType<typeof scoreItem>;
      }
    >();

    groupedItems.forEach((entry) => {
      entry.items.forEach((item) => {
        const clusterKey = normalizeHeadlineClusterKey(item.title) || item.id;
        const existing = dedupedByHeadline.get(clusterKey);

        if (!existing) {
          dedupedByHeadline.set(clusterKey, { groupId: entry.group.id, item });
          return;
        }

        const nextPublished = getPublishedTime(item.publishedAt);
        const existingPublished = getPublishedTime(existing.item.publishedAt);

        if (nextPublished > existingPublished || (nextPublished === existingPublished && item.score > existing.item.score)) {
          dedupedByHeadline.set(clusterKey, { groupId: entry.group.id, item });
        }
      });
    });

    const seenIds = new Set<string>();
    const groupCounts = new Map<string, number>();
    const allItems = [...dedupedByHeadline.values()]
      .sort((a, b) => {
        const timeDiff = getPublishedTime(b.item.publishedAt) - getPublishedTime(a.item.publishedAt);
        if (timeDiff !== 0) return timeDiff;
        return b.item.score - a.item.score;
      })
      .filter(({ groupId, item }) => {
        if (seenIds.has(item.id)) return false;

        const currentGroupCount = groupCounts.get(groupId) ?? 0;
        if (currentGroupCount >= MAX_ITEMS_PER_GROUP) return false;

        seenIds.add(item.id);
        groupCounts.set(groupId, currentGroupCount + 1);
        return true;
      });

    const newsItems = allItems.map((entry) => entry.item);

    // 뉴스와 국회도서관 자료를 섞기: 뉴스 3~4개당 국회도서관 1개 비율
    const merged: ReturnType<typeof scoreItem>[] = [];
    let newsIdx = 0;
    let nanetIdx = 0;
    const NANET_INTERVAL = 4; // 뉴스 4개마다 국회도서관 1개 삽입

    while (merged.length < limit && (newsIdx < newsItems.length || nanetIdx < nanetPool.length)) {
      // 뉴스 먼저 채우기
      const newsSliceEnd = Math.min(newsIdx + NANET_INTERVAL, newsItems.length);
      while (newsIdx < newsSliceEnd && merged.length < limit) {
        merged.push(newsItems[newsIdx]);
        newsIdx += 1;
      }

      // 국회도서관 1개 삽입
      if (nanetIdx < nanetPool.length && merged.length < limit) {
        merged.push(nanetPool[nanetIdx]);
        nanetIdx += 1;
      }
    }

    if (merged.length === 0) {
      throw new Error('EMPTY_FEED');
    }

    const totalAvailable = newsItems.length + nanetPool.length;

    return {
      items: merged,
      keywords,
      fallback: false,
      hasMore: totalAvailable > limit,
      totalCount: totalAvailable,
    };
  } catch (error) {
    console.error('[insights][feed] fallback', error);

    const fallbackItems = FALLBACK_ITEMS
      .map((item) => scoreItem(item, baseSignals, keywords))
      .sort((a, b) => b.score - a.score);

    return {
      items: fallbackItems.slice(0, limit),
      keywords,
      fallback: true,
      hasMore: fallbackItems.length > limit,
      totalCount: fallbackItems.length,
      warning: {
        code: 'INSIGHT_FEED_FALLBACK',
        message: '일부 최신 콘텐츠를 불러오지 못해 기본 추천 콘텐츠를 먼저 보여드리고 있어요.',
      },
    };
  }
}
