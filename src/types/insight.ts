export type InsightFeedTab = 'all' | 'jobs' | 'majors' | 'record-linked';

export type InsightReactionType = 'saved' | 'curious' | 'explore' | 'record';
export type InsightSaveStatus = 'active' | 'used' | 'archived';

export type InsightFeedItem = {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  summary: string;
  whyItMatters: string;
  topics: string[];
  relatedJobs: string[];
  relatedMajors: string[];
  studentInsightPoints: string[];
  exploreQuestions: string[];
  score: number;
  matchedKeywords: string[];
  contentType: 'news' | 'trend' | 'research' | 'career-story' | 'major-story';
};

export type InsightFeedResponse = {
  items: InsightFeedItem[];
  keywords: string[];
  fallback: boolean;
  hasMore: boolean;
  totalCount: number;
  warning?: {
    code: string;
    message: string;
  };
};

export type InsightSave = {
  id: string;
  contentId: string;
  reactionType: InsightReactionType;
  titleSnapshot: string;
  sourceUrlSnapshot: string;
  memo?: string;
  linkedJob?: string;
  linkedMajor?: string;
  linkedRecordId?: string;
  exploreQuestion?: string;
  tags?: string[];
  status?: InsightSaveStatus;
  savedAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;
};

export type InsightSaveListQuery = {
  status?: InsightSaveStatus;
  limit?: number;
};
