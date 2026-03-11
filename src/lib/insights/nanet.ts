/**
 * 국회도서관 자료검색 API 클라이언트
 * https://apis.data.go.kr/9720000/searchservice/basic
 */

import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';

const NANET_BASE = 'https://apis.data.go.kr/9720000/searchservice/basic';
const NANET_TIMEOUT_MS = 8000;
const NANET_MAX_PER_KEYWORD = 5;
const NANET_DISPLAY_LINES = 10;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
});

type NanetRecord = {
  title: string;
  author: string;
  publisher: string;
  keywords: string;
  year: string;
  controlNo: string;
  hasFulltext: boolean;
  language: string;
};

type NanetItem = {
  name: string;
  value: string;
};

/** 30분 TTL 캐시 */
const cache = new Map<string, { data: NanetRecord[]; expires: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key: string): NanetRecord[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: NanetRecord[]) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function parseRecords(xml: string): NanetRecord[] {
  const parsed = parser.parse(xml) as {
    response?: {
      total?: number;
      recode?: { item: NanetItem | NanetItem[] } | Array<{ item: NanetItem | NanetItem[] }>;
    };
  };

  const recodes = parsed.response?.recode;
  if (!recodes) return [];

  const recodeArray = Array.isArray(recodes) ? recodes : [recodes];

  return recodeArray.map((recode) => {
    const items = Array.isArray(recode.item) ? recode.item : [recode.item];
    const fieldMap = new Map(items.map((item) => [item.name, String(item.value ?? '')]));

    return {
      title: (fieldMap.get('자료명') ?? fieldMap.get('기사명') ?? '').replace(/<[^>]+>/g, ''),
      author: (fieldMap.get('저자명') ?? '').replace(/<[^>]+>/g, ''),
      publisher: fieldMap.get('발행자') ?? '',
      keywords: (fieldMap.get('키워드') ?? '').replace(/<[^>]+>/g, ''),
      year: fieldMap.get('발행년도') ?? '',
      controlNo: fieldMap.get('제어번호') ?? '',
      hasFulltext: (fieldMap.get('원문DB유무') ?? fieldMap.get('원본DB유무')) === 'Y',
      language: fieldMap.get('본문언어') ?? '',
    };
  }).filter((record) => record.title.length > 0 && record.language === 'kor');
}

function buildNanetSourceUrl(controlNo: string) {
  if (!controlNo) return 'https://dl.nanet.go.kr/';
  return `https://dl.nanet.go.kr/search/searchInnerDetail.do?controlNo=${encodeURIComponent(controlNo)}`;
}

function makeNanetContentId(controlNo: string, title: string) {
  return 'nanet-' + createHash('sha1').update(`${controlNo}::${title}`).digest('hex').slice(0, 16);
}

export async function searchNanetLibrary(keyword: string): Promise<NanetRecord[]> {
  const cached = getCached(keyword);
  if (cached) return cached;

  const apiKey = process.env.DATA_GO_KR_API_KEY?.trim();
  if (!apiKey) return [];

  // 자료명과 키워드 필드를 모두 검색하여 적중률 향상
  const searchParam = `전체,${keyword}`;
  const url = `${NANET_BASE}?serviceKey=${encodeURIComponent(apiKey)}&pageno=1&displaylines=${NANET_DISPLAY_LINES}&search=${encodeURIComponent(searchParam)}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(NANET_TIMEOUT_MS),
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      console.error(`[insights][nanet] HTTP ${response.status} for keyword: ${keyword}`);
      return [];
    }

    const xml = await response.text();
    const records = parseRecords(xml).slice(0, NANET_MAX_PER_KEYWORD);
    console.log(`[insights][nanet] keyword="${keyword}" results=${records.length}`);
    setCache(keyword, records);
    return records;
  } catch (error) {
    console.error('[insights][nanet] fetch failed', { keyword, error });
    return [];
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function nanetRecordToFeedItem(
  record: NanetRecord,
  groupLabel: string,
) {
  const id = makeNanetContentId(record.controlNo, record.title);

  // 제목/저자에서 HTML 태그 및 후행 슬래시 정리
  const title = stripHtml(record.title).replace(/\s*\/\s*$/, '').replace(/\s*;\s*$/, '').trim();
  const author = stripHtml(record.author).replace(/^지은이:\s*/, '').trim();
  const sourceUrl = buildNanetSourceUrl(record.controlNo);

  const keywordTokens = stripHtml(record.keywords)
    .split(/[;,]/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 20)
    .slice(0, 5);

  const summary = author
    ? `${author} | ${record.publisher || '국회도서관'} (${record.year})`
    : `${record.publisher || '국회도서관'} (${record.year})`;

  return {
    id,
    title,
    sourceName: '국회도서관',
    sourceUrl,
    publishedAt: record.year ? `${record.year}-01-01T00:00:00.000Z` : null,
    contentType: 'research' as const,
    topics: keywordTokens.length > 0 ? keywordTokens : [groupLabel],
    relatedJobs: [] as string[],
    relatedMajors: [] as string[],
    summary,
    whyItMatters: `${groupLabel}와 관련된 국회도서관 소장 자료로, 탐구 보고서나 발표의 학술적 근거로 활용할 수 있습니다.`,
    studentInsightPoints: [
      `${groupLabel} 관련 심화 자료로 학생부 탐구 활동의 깊이를 더할 수 있습니다.`,
      '국회도서관 소장 자료를 참고하면 보고서의 신뢰도를 높일 수 있습니다.',
    ],
    exploreQuestions: [
      `이 자료에서 다루는 핵심 주제를 ${groupLabel}와 어떻게 연결할 수 있을까?`,
    ],
  };
}
