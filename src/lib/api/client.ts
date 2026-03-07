import type { ApiResponse } from '@/types/api';
import type { UserProfile } from '@/types/user';
import type { NormalizedQuestionnaire, TestResultWithId, TestSessionWithId } from '@/lib/careernet/types';

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
};
