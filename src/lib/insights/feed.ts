import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';

import { getAdminDb } from '@/lib/firebase/admin';
import { expandInsightKeywords, findInsightMatches } from '@/lib/insights/topic-map';
import type { InsightFeedItem, InsightFeedTab } from '@/types/insight';

type UserSignals = {
  favoriteJobs: string[];
  favoriteMajors: string[];
  recordTopics: string[];
  interests: string[];
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

const FALLBACK_ITEMS: Array<Omit<InsightFeedItem, 'score' | 'matchedKeywords'>> = [
  {
    id: 'fallback-healthcare-ai',
    title: '헬스케어 AI 확산, 의료 현장은 어떻게 달라질까',
    sourceName: 'Myjinga Curated',
    sourceUrl: 'https://news.google.com/rss/search?q=%ED%97%AC%EC%8A%A4%EC%BC%80%EC%96%B4%20AI&hl=ko&gl=KR&ceid=KR:ko',
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
    sourceUrl: 'https://news.google.com/rss/search?q=%EA%B5%90%EC%9C%A1%20AI&hl=ko&gl=KR&ceid=KR:ko',
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
    sourceUrl: 'https://news.google.com/rss/search?q=%EB%AF%B8%EB%94%94%EC%96%B4%20%EC%A7%81%EC%97%85&hl=ko&gl=KR&ceid=KR:ko',
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

function makeContentId(link: string, title: string) {
  return createHash('sha1').update(`${link}::${title}`).digest('hex').slice(0, 20);
}

function formatKoreanDate(date: string | null) {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

async function getUserSignals(uid: string): Promise<UserSignals> {
  const [jobsSnapshot, majorsSnapshot, recordsSnapshot, userSnapshot] = await Promise.all([
    getAdminDb().collection('users').doc(uid).collection('favoriteJobs').orderBy('createdAt', 'desc').limit(5).get(),
    getAdminDb().collection('users').doc(uid).collection('favoriteMajors').orderBy('createdAt', 'desc').limit(5).get(),
    getAdminDb().collection('users').doc(uid).collection('records').orderBy('updatedAt', 'desc').limit(12).get(),
    getAdminDb().collection('users').doc(uid).get(),
  ]);

  const favoriteJobs = jobsSnapshot.docs.map((doc) => String(doc.data().jobName ?? '')).filter(Boolean);
  const favoriteMajors = majorsSnapshot.docs.map((doc) => String(doc.data().majorName ?? '')).filter(Boolean);

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

  return { favoriteJobs, favoriteMajors, recordTopics, interests };
}

function buildKeywords(signals: UserSignals, tab: InsightFeedTab) {
  const base =
    tab === 'jobs'
      ? signals.favoriteJobs
      : tab === 'majors'
        ? signals.favoriteMajors
        : tab === 'record-linked'
          ? signals.recordTopics
          : [...signals.favoriteJobs, ...signals.favoriteMajors, ...signals.recordTopics, ...signals.interests];

  const expanded = expandInsightKeywords(base).slice(0, 6);
  if (expanded.length > 0) return expanded;

  return ['진로', '학과', '직업', '탐구'];
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

export async function getInsightFeed(uid: string, tab: InsightFeedTab = 'all', limit = 12) {
  const signals = await getUserSignals(uid);
  const keywords = buildKeywords(signals, tab);

  try {
    const rawFeeds = await Promise.all(keywords.slice(0, 4).map((keyword) => fetchGoogleNewsFeed(keyword)));
    const deduped = new Map<string, Omit<InsightFeedItem, 'score' | 'matchedKeywords'>>();

    rawFeeds.forEach((items, index) => {
      const keyword = keywords[index];

      items.slice(0, 8).forEach((entry) => {
        const title = sanitizeText(entry.title);
        const link = sanitizeText(entry.link);
        if (!title || !link) return;

        const description = sanitizeText(entry.description);
        const sourceField = typeof entry.source === 'string' ? entry.source : entry.source?.['#text'];
        const sourceName = sanitizeText(sourceField) || 'Google News';
        const relation = inferRelations(keyword, title, description);
        const id = makeContentId(link, title);

        if (!deduped.has(id)) {
          deduped.set(id, {
            id,
            title,
            sourceName,
            sourceUrl: link,
            publishedAt: formatKoreanDate(entry.pubDate ?? null),
            contentType: 'news',
            ...relation,
          });
        }
      });
    });

    const items = [...deduped.values()]
      .map((item) => scoreItem(item, signals, keywords))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (items.length === 0) {
      throw new Error('EMPTY_FEED');
    }

    return {
      items,
      keywords,
      fallback: false,
    };
  } catch (error) {
    console.error('[insights][feed] fallback', error);

    return {
      items: FALLBACK_ITEMS.map((item) => scoreItem(item, signals, keywords)).sort((a, b) => b.score - a.score).slice(0, limit),
      keywords,
      fallback: true,
      warning: {
        code: 'INSIGHT_FEED_FALLBACK',
        message: '일부 최신 콘텐츠를 불러오지 못해 기본 추천 콘텐츠를 먼저 보여드리고 있어요.',
      },
    };
  }
}
