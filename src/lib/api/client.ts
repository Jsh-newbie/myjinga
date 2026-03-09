import type { ApiResponse } from '@/types/api';
import type { UserProfile } from '@/types/user';
import type { NormalizedQuestionnaire, TestResultWithId, TestSessionWithId } from '@/lib/careernet/types';
import type { StudentRecord } from '@/types/record';
import type { InsightFeedResponse, InsightFeedTab, InsightSave } from '@/types/insight';
import type { MajorListItem, MajorDetail } from '@/lib/careernet/major-types';

export interface SessionItem {
  sessionId: string;
  testTypeId: string;
  testName: string;
  totalQuestions: number;
  answeredCount: number;
  currentIndex: number;
  updatedAt: string;
}

export interface ResultItem {
  id: string;
  testTypeId: string;
  resultUrl: string;
  completedAt: { _seconds: number };
}

export interface SchoolSearchItem {
  name: string;
  address: string;
  code: string;
}

export interface SerializedTimestamp {
  seconds?: number;
  _seconds?: number;
  nanoseconds?: number;
  _nanoseconds?: number;
}

export interface RecordListItem extends Omit<StudentRecord, 'createdAt' | 'updatedAt'> {
  createdAt?: SerializedTimestamp | null;
  updatedAt?: SerializedTimestamp | null;
}

export interface InsightSaveItem extends Omit<InsightSave, 'savedAt' | 'updatedAt'> {
  savedAt?: SerializedTimestamp | null;
  updatedAt?: SerializedTimestamp | null;
}

export interface SessionSaveRequest {
  testTypeId: string;
  answers: Record<string, string>;
  currentIndex: number;
  answeredCount: number;
  totalQuestions: number;
}

async function request<T>(
  path: string,
  token: string,
  options?: { method?: string; body?: unknown }
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers,
  };

  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(path, init);
  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

export const api = {
  getMe(token: string) {
    return request<{ uid: string; profile: UserProfile }>('/api/users/me', token);
  },

  updateProfile(token: string, data: {
    nickname?: string;
    birthDate?: string;
    schoolLevel?: string;
    grade?: number;
    schoolName?: string;
    interests?: string[];
    phoneNumber?: string;
    phoneVerified?: boolean;
  }) {
    return request<{ uid: string; profile: UserProfile }>('/api/users/me', token, {
      method: 'PATCH',
      body: data,
    });
  },

  deleteAccount(token: string) {
    return request<{ deleted: boolean }>('/api/users/me', token, {
      method: 'DELETE',
    });
  },

  searchSchools(token: string, query: string, schoolLevel: string) {
    const params = new URLSearchParams({ q: query, schoolLevel });
    return request<{ schools: SchoolSearchItem[] }>(`/api/schools/search?${params}`, token);
  },

  initUser(token: string, data: { email: string; name: string; birthDate: string; schoolLevel: string; grade: number }) {
    return request<{ uid: string; profile: UserProfile }>('/api/users/init', token, {
      method: 'POST',
      body: data,
    });
  },

  getQuestions(token: string, testTypeId: string) {
    return request<NormalizedQuestionnaire>(`/api/career-net/questions?testTypeId=${testTypeId}`, token);
  },

  listSessions(token: string) {
    return request<{ sessions: SessionItem[] }>('/api/career-net/sessions', token);
  },

  getSession(token: string, sessionId: string) {
    return request<{ session: TestSessionWithId }>(`/api/career-net/sessions/${sessionId}`, token);
  },

  deleteSession(token: string, sessionId: string) {
    return request<{ deleted: boolean }>(`/api/career-net/sessions/${sessionId}`, token, {
      method: 'DELETE',
    });
  },

  saveSession(token: string, data: SessionSaveRequest) {
    return request<{ sessionId: string; savedAt: string }>('/api/career-net/sessions', token, {
      method: 'PUT',
      body: data,
    });
  },

  listResults(token: string, testTypeId?: string) {
    const query = testTypeId ? `?testTypeId=${testTypeId}` : '';
    return request<{ items: ResultItem[] }>(`/api/career-net/results${query}`, token);
  },

  getResult(token: string, resultId: string) {
    return request<{ item: TestResultWithId }>(`/api/career-net/results/${resultId}`, token);
  },

  submitTest(token: string, sessionId: string) {
    return request<{ resultId: string; resultUrl: string; inspctSeq: string }>('/api/career-net/report', token, {
      method: 'POST',
      body: { sessionId },
    });
  },

  getJobDetail(token: string, jobCode: number) {
    return request<{ job: Record<string, unknown> }>(`/api/career-net/jobs?jobCode=${jobCode}`, token);
  },

  searchJobs(token: string, jobName: string) {
    return request<{ jobs: Array<{ seq: number; jobCode: number; jobName: string; work: string }>; count: number }>(
      `/api/career-net/jobs?jobName=${encodeURIComponent(jobName)}`,
      token,
    );
  },

  listFavoriteJobs(token: string) {
    return request<{ jobs: Array<{ jobCode: string; jobName: string }> }>('/api/career-net/favorite-jobs', token);
  },

  addFavoriteJob(token: string, jobCode: number, jobName: string) {
    return request<{ jobCode: string; jobName: string }>('/api/career-net/favorite-jobs', token, {
      method: 'POST',
      body: { jobCode, jobName },
    });
  },

  removeFavoriteJob(token: string, jobCode: number) {
    return request<{ deleted: boolean }>(`/api/career-net/favorite-jobs?jobCode=${jobCode}`, token, {
      method: 'DELETE',
    });
  },

  listFavoriteMajors(token: string) {
    return request<{ majors: Array<{ majorId: string; majorName: string }> }>('/api/career-net/favorite-majors', token);
  },

  addFavoriteMajor(token: string, majorName: string) {
    return request<{ majorId: string; majorName: string }>('/api/career-net/favorite-majors', token, {
      method: 'POST',
      body: { majorName },
    });
  },

  removeFavoriteMajor(token: string, majorId: string) {
    return request<{ deleted: boolean }>(`/api/career-net/favorite-majors?majorId=${encodeURIComponent(majorId)}`, token, {
      method: 'DELETE',
    });
  },

  listRecords(token: string, query?: {
    category?: string;
    semester?: string;
    limit?: number;
    cursor?: string;
  }) {
    const params = new URLSearchParams();
    if (query?.category) params.set('category', query.category);
    if (query?.semester) params.set('semester', query.semester);
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.cursor) params.set('cursor', query.cursor);

    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return request<{ items: RecordListItem[]; nextCursor: string | null }>(`/api/records${suffix}`, token);
  },

  getRecord(token: string, recordId: string) {
    return request<{ record: StudentRecord }>(`/api/records/${recordId}`, token);
  },

  createRecord(token: string, data: Record<string, unknown>) {
    return request<{ record: StudentRecord }>('/api/records', token, {
      method: 'POST',
      body: data,
    });
  },

  updateRecord(token: string, recordId: string, data: Record<string, unknown>) {
    return request<{ record: StudentRecord }>(`/api/records/${recordId}`, token, {
      method: 'PATCH',
      body: data,
    });
  },

  deleteRecord(token: string, recordId: string) {
    return request<{ deleted: boolean }>(`/api/records/${recordId}`, token, {
      method: 'DELETE',
    });
  },

  getInsightFeed(token: string, query?: { tab?: InsightFeedTab; limit?: number; keyword?: string }) {
    const params = new URLSearchParams();
    if (query?.tab) params.set('tab', query.tab);
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.keyword) params.set('keyword', query.keyword);
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return request<InsightFeedResponse>(`/api/insights/feed${suffix}`, token);
  },

  listInsightSaves(token: string, query?: { status?: 'active' | 'used' | 'archived'; limit?: number }) {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return request<{ items: InsightSaveItem[] }>(`/api/insights/saves${suffix}`, token);
  },

  saveInsight(
    token: string,
    data: {
      contentId: string;
      reactionType: 'saved' | 'curious' | 'explore' | 'record';
      titleSnapshot: string;
      sourceUrlSnapshot: string;
      memo?: string;
      linkedJob?: string;
      linkedMajor?: string;
      linkedRecordId?: string;
      exploreQuestion?: string;
      tags?: string[];
      status?: 'active' | 'used' | 'archived';
    }
  ) {
    return request<{ item: InsightSaveItem }>('/api/insights/saves', token, {
      method: 'POST',
      body: data,
    });
  },

  updateInsightSave(
    token: string,
    saveId: string,
    data: {
      reactionType?: 'saved' | 'curious' | 'explore' | 'record';
      memo?: string;
      linkedJob?: string;
      linkedMajor?: string;
      linkedRecordId?: string;
      exploreQuestion?: string;
      tags?: string[];
      status?: 'active' | 'used' | 'archived';
    }
  ) {
    return request<{ item: InsightSaveItem }>(`/api/insights/saves/${saveId}`, token, {
      method: 'PATCH',
      body: data,
    });
  },

  deleteInsightSave(token: string, saveId: string) {
    return request<{ deleted: boolean }>(`/api/insights/saves/${saveId}`, token, {
      method: 'DELETE',
    });
  },

  // --- 학과 탐색 ---

  exploreMajors(token: string, query?: { q?: string; field?: string; page?: number; perPage?: number }) {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.field) params.set('field', query.field);
    if (query?.page !== undefined) params.set('page', String(query.page));
    if (query?.perPage !== undefined) params.set('perPage', String(query.perPage));
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return request<{ items: MajorListItem[]; totalCount: number; page: number; perPage: number }>(
      `/api/explore/majors${suffix}`,
      token,
    );
  },

  getMajorDetail(token: string, majorSeq: string) {
    return request<{ major: MajorDetail }>(`/api/explore/majors/${majorSeq}`, token);
  },
};
