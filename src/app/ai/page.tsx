'use client';

import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, type InsightSaveItem } from '@/lib/api/client';
import { getClientAuth } from '@/lib/firebase/client';
import { normalizeInsightSourceUrl } from '@/lib/insights/source-url';
import type { InsightFeedItem, InsightFeedTab } from '@/types/insight';

type LoadingState = 'loading' | 'ready' | 'error';
const FEED_PAGE_SIZE = 12;

const TABS: Array<{ id: InsightFeedTab; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'jobs', label: '관심 직업' },
  { id: 'majors', label: '관심 학과' },
  { id: 'record-linked', label: '학생부 연결' },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '추천 콘텐츠';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '추천 콘텐츠';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatTimestamp(
  value: {
    seconds?: number;
    _seconds?: number;
  } | null | undefined
) {
  const seconds = value?.seconds ?? value?._seconds;
  if (!seconds) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(seconds * 1000));
}

function getInsightReactionLabel(reactionType: InsightSaveItem['reactionType']) {
  switch (reactionType) {
    case 'explore':
      return '메모 저장';
    case 'record':
      return '기록 연결';
    case 'curious':
      return '더 보기';
    case 'saved':
    default:
      return '저장';
  }
}

function getInsightSourceHostLabel(value: string) {
  try {
    const url = new URL(normalizeInsightSourceUrl(value));
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '외부 링크';
  }
}

function buildSavedItemChips(item: InsightSaveItem) {
  const chips: Array<{ key: string; label: string; muted?: boolean }> = [];
  const seen = new Set<string>();

  const pushChip = (value: string | undefined, options?: { muted?: boolean; prefix?: string }) => {
    const normalized = value?.trim();
    if (!normalized) return;

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    chips.push({
      key: `${options?.prefix ?? 'tag'}:${dedupeKey}`,
      label: options?.prefix ? `${options.prefix} · ${normalized}` : normalized,
      muted: options?.muted,
    });
  };

  pushChip(item.linkedJob, { prefix: '직업' });
  pushChip(item.linkedMajor, { prefix: '학과' });
  (item.tags ?? []).slice(0, 3).forEach((tag) => pushChip(tag, { muted: true }));

  return chips;
}

export default function InsightPage() {
  const [showHeroGuide, setShowHeroGuide] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [feedState, setFeedState] = useState<LoadingState>('loading');
  const [savesState, setSavesState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');
  const [feedWarning, setFeedWarning] = useState('');
  const [tab, setTab] = useState<InsightFeedTab>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);
  const [feedItems, setFeedItems] = useState<InsightFeedItem[]>([]);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedTotalCount, setFeedTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [savedItems, setSavedItems] = useState<InsightSaveItem[]>([]);
  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [editingSavedMemoId, setEditingSavedMemoId] = useState<string | null>(null);
  const [savedMemoDraft, setSavedMemoDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase 설정을 확인해 주세요.');
      setState('error');
      return null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = window.localStorage.getItem('insight-hero-guide-dismissed');
    if (dismissed === 'true') {
      setShowHeroGuide(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);
      setState('ready');
    });

    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    setFeedLimit(FEED_PAGE_SIZE);
    setIsLoadingMore(false);
    setSelectedKeyword(null);
  }, [tab]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const currentUser = user;

    async function loadFeed() {
      const isInitialLoad = feedLimit === FEED_PAGE_SIZE;
      if (isInitialLoad) {
        setFeedState('loading');
      } else {
        setIsLoadingMore(true);
      }

      try {
        const token = await currentUser.getIdToken();
        const result = await api.getInsightFeed(token, { tab, limit: feedLimit, keyword: selectedKeyword ?? undefined });
        if (!result.success) {
          if (!cancelled) {
            setFeedState('error');
            setError(result.error.message);
          }
          return;
        }

        if (!cancelled) {
          setFeedItems(result.data.items);
          setFeedHasMore(result.data.hasMore);
          setFeedTotalCount(result.data.totalCount);
          setKeywords(result.data.keywords);
          setFeedWarning(result.data.warning?.message ?? '');
          setFeedState('ready');
          setIsLoadingMore(false);
        }
      } catch {
        if (!cancelled) {
          setFeedState('error');
          setError('학생부 Insight 피드를 불러오는 중 오류가 발생했습니다.');
          setIsLoadingMore(false);
        }
      }
    }

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, [feedLimit, selectedKeyword, tab, user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const currentUser = user;

    async function loadSaves() {
      setSavesState('loading');

      try {
        const token = await currentUser.getIdToken();
        const result = await api.listInsightSaves(token, { limit: 12 });
        if (!result.success) {
          if (!cancelled) {
            setSavesState('error');
          }
          return;
        }

        if (!cancelled) {
          setSavedItems(result.data.items);
          setSavesState('ready');
        }
      } catch {
        if (!cancelled) {
          setSavesState('error');
        }
      }
    }

    loadSaves();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function refreshSaves() {
    if (!user) return;
    const token = await user.getIdToken();
    const result = await api.listInsightSaves(token, { limit: 12 });
    if (result.success) {
      setSavedItems(result.data.items);
      setSavesState('ready');
    }
  }

  async function handleSave(item: InsightFeedItem, memo?: string) {
    if (!user) return;

    setSavingId(item.id);
    try {
      const token = await user.getIdToken();
      const result = await api.saveInsight(token, {
        contentId: item.id,
        reactionType: memo ? 'explore' : 'saved',
        titleSnapshot: item.title,
        sourceUrlSnapshot: normalizeInsightSourceUrl(item.sourceUrl),
        memo: memo?.trim() || undefined,
        linkedJob: item.relatedJobs[0],
        linkedMajor: item.relatedMajors[0],
        tags: item.topics.slice(0, 5),
      });

      if (result.success) {
        await refreshSaves();
        setActiveMemoId(null);
        setMemoDraft('');
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteSave(saveId: string) {
    if (!user) return;

    setSavingId(saveId);
    try {
      const token = await user.getIdToken();
      const result = await api.deleteInsightSave(token, saveId);
      if (result.success) {
        await refreshSaves();
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleUpdateSavedMemo(saveId: string) {
    if (!user) return;

    setSavingId(saveId);
    try {
      const token = await user.getIdToken();
      const result = await api.updateInsightSave(token, saveId, {
        memo: savedMemoDraft.trim() || undefined,
        reactionType: savedMemoDraft.trim() ? 'explore' : 'saved',
      });

      if (result.success) {
        await refreshSaves();
        setEditingSavedMemoId(null);
        setSavedMemoDraft('');
      }
    } finally {
      setSavingId(null);
    }
  }

  function openSavedMemoEditor(item: InsightSaveItem) {
    setEditingSavedMemoId(item.id);
    setSavedMemoDraft(item.memo ?? '');
  }

  function closeSavedMemoEditor() {
    setEditingSavedMemoId(null);
    setSavedMemoDraft('');
  }

  const savedIdSet = new Set(savedItems.map((item) => item.contentId));

  function dismissHeroGuide() {
    setShowHeroGuide(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('insight-hero-guide-dismissed', 'true');
    }
  }

  function reopenHeroGuide() {
    setShowHeroGuide(true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('insight-hero-guide-dismissed');
    }
  }

  function handleLoadMore() {
    setFeedLimit((prev) => prev + FEED_PAGE_SIZE);
  }

  function handleKeywordToggle(keyword: string) {
    setFeedLimit(FEED_PAGE_SIZE);
    setSelectedKeyword((prev) => (prev === keyword ? null : keyword));
  }

  function handleKeywordReset() {
    setFeedLimit(FEED_PAGE_SIZE);
    setSelectedKeyword(null);
  }

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/dashboard" className="ct-back" aria-label="대시보드로 돌아가기">
          &lsaquo;
        </Link>
        <span className="ct-header-title">학생부 Insight</span>
        {showHeroGuide ? (
          <span />
        ) : (
          <button
            type="button"
            className="insight-header-help"
            aria-label="학생부 Insight 안내 다시 보기"
            onClick={reopenHeroGuide}
          >
            ?
          </button>
        )}
      </header>

      {showHeroGuide && (
        <section className="insight-hero">
          <div className="insight-hero-head">
            <strong>최신 이슈를 학생부 소재로 바꾸세요</strong>
            <button type="button" className="insight-hero-close" onClick={dismissHeroGuide}>
              닫기
            </button>
          </div>
          <p>관심 직업과 학과에 맞는 이야기를 보고, 메모하고, 탐구 노트로 저장할 수 있습니다.</p>
          <div className="insight-hero-guide">
            <strong>이 피드는 이렇게 보면 됩니다</strong>
            <p>흥미로운 기사나 이야기를 먼저 저장하고, 메모로 내 관심 직업·학과와의 연결점을 짧게 남기세요. 학생부 연결과 탐구 질문은 저장 후 탐구 노트에서 이어가면 됩니다.</p>
          </div>
        </section>
      )}

      <section className="ct-section">
        <h2 className="ct-section-title">추천 키워드</h2>
        <div className="insight-chip-row">
          {keywords.length === 0 && <span className="insight-chip insight-chip--muted">관심 직업과 학과를 저장하면 추천이 더 정확해집니다</span>}
          {keywords.length > 0 ? (
            <button
              type="button"
              className={`insight-chip insight-chip--button${selectedKeyword === null ? ' insight-chip--active' : ''}`}
              onClick={handleKeywordReset}
            >
              전체
            </button>
          ) : null}
          {keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className={`insight-chip insight-chip--button${selectedKeyword === keyword ? ' insight-chip--active' : ''}`}
              onClick={() => handleKeywordToggle(keyword)}
            >
              {keyword}
            </button>
          ))}
        </div>
      </section>

      <section className="ct-section">
        <div className="insight-tabs" role="tablist" aria-label="학생부 Insight 피드 탭">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`insight-tab${tab === item.id ? ' insight-tab--active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="ct-section">
        <div className="insight-section-head">
          <h2 className="ct-section-title" style={{ margin: 0 }}>오늘의 피드</h2>
          <span className="insight-section-caption">관심 기반 최신 추천</span>
        </div>

        {feedWarning && <div className="insight-warning">{feedWarning}</div>}
        {state === 'error' || feedState === 'error' ? (
          <div className="records-empty records-empty--error">{error || '피드를 불러오지 못했습니다.'}</div>
        ) : null}
        {feedState === 'loading' ? (
          <div className="insight-skeleton-list">
            {[1, 2, 3].map((item) => (
              <div key={item} className="main-skeleton insight-skeleton-card" />
            ))}
          </div>
        ) : null}
        {feedState === 'ready' && feedItems.length === 0 ? (
          <div className="records-empty">아직 추천할 콘텐츠가 없습니다.</div>
        ) : null}
        {feedState === 'ready' && feedItems.length > 0 ? (
          <>
            <div className="insight-feed-list">
              {feedItems.map((item) => (
                <article key={item.id} className="insight-card">
                  <div className="insight-card-meta">
                    <span>{item.sourceName}</span>
                    <span>{formatDate(item.publishedAt)}</span>
                  </div>
                  <h3 className="insight-card-title">{item.title}</h3>
                  <p className="insight-card-summary">{item.summary}</p>

                  <div className="insight-chip-row">
                    {item.topics.slice(0, 4).map((topic) => (
                      <span key={`${item.id}-${topic}`} className="insight-chip">{topic}</span>
                    ))}
                  </div>

                  <div className="insight-card-actions">
                    <button
                      type="button"
                      className="insight-action-btn"
                      onClick={() => handleSave(item)}
                      disabled={savingId === item.id}
                    >
                      {savedIdSet.has(item.id) ? '저장됨' : '저장'}
                    </button>
                    <button
                      type="button"
                      className="insight-action-btn insight-action-btn--ghost"
                      onClick={() => {
                        setActiveMemoId(item.id);
                        const existing = savedItems.find((saved) => saved.contentId === item.id);
                        setMemoDraft(existing?.memo ?? '');
                      }}
                    >
                      메모
                    </button>
                    <a
                      className="insight-action-btn insight-action-btn--link"
                      href={normalizeInsightSourceUrl(item.sourceUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      원문 보기
                    </a>
                  </div>

                  {activeMemoId === item.id && (
                    <div className="insight-memo-panel">
                      <textarea
                        className="insight-textarea"
                        maxLength={300}
                        value={memoDraft}
                        onChange={(event) => setMemoDraft(event.target.value)}
                        placeholder="왜 흥미로웠는지, 어떤 과목이나 활동과 연결되는지 짧게 남겨보세요."
                      />
                      <div className="insight-memo-actions">
                        <button
                          type="button"
                          className="insight-action-btn"
                          onClick={() => handleSave(item, memoDraft)}
                          disabled={savingId === item.id}
                        >
                          메모 저장
                        </button>
                        <button
                          type="button"
                          className="insight-action-btn insight-action-btn--ghost"
                          onClick={() => {
                            setActiveMemoId(null);
                            setMemoDraft('');
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="insight-load-more">
              <span className="insight-section-caption">
                {feedItems.length} / {feedTotalCount}
              </span>
              {feedHasMore ? (
                <button
                  type="button"
                  className="insight-load-more-btn"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? '불러오는 중...' : '콘텐츠 더 보기'}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      <section className="ct-section">
        <div className="insight-section-head">
          <h2 className="ct-section-title" style={{ margin: 0 }}>내 탐구 노트</h2>
          <span className="insight-section-caption">저장한 인사이트와 메모</span>
        </div>

        {savesState === 'loading' ? <div className="records-empty">저장한 탐구 노트를 불러오는 중입니다.</div> : null}
        {savesState === 'error' ? <div className="records-empty records-empty--error">저장한 탐구 노트를 불러오지 못했습니다.</div> : null}
        {savesState === 'ready' && savedItems.length === 0 ? (
          <div className="records-empty">
            아직 저장한 탐구 노트가 없습니다.
            <br />
            피드에서 흥미로운 콘텐츠를 저장해 보세요.
          </div>
        ) : null}
        {savesState === 'ready' && savedItems.length > 0 ? (
          <div className="insight-saved-list">
            {savedItems.map((item) => (
              <article key={item.id} className="insight-saved-card">
                <div className="insight-saved-head">
                  <strong>{item.titleSnapshot}</strong>
                  <span className="insight-status-badge">{getInsightReactionLabel(item.reactionType)}</span>
                </div>
                <div className="insight-saved-meta">
                  <span>{getInsightSourceHostLabel(item.sourceUrlSnapshot)}</span>
                  <span>{formatTimestamp(item.updatedAt ?? item.savedAt)}</span>
                </div>
                <div className="insight-saved-memo-box">
                  <strong className="insight-saved-label">내 메모</strong>
                  {item.memo ? <p className="insight-saved-memo">{item.memo}</p> : <p className="insight-saved-memo insight-saved-memo--muted">아직 메모가 없습니다.</p>}
                </div>
                <div className="insight-chip-row">
                  {buildSavedItemChips(item).map((chip) => (
                    <span key={`${item.id}-${chip.key}`} className={`insight-chip${chip.muted ? ' insight-chip--muted' : ''}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>
                {editingSavedMemoId === item.id ? (
                  <div className="insight-memo-panel">
                    <textarea
                      className="insight-textarea"
                      maxLength={300}
                      value={savedMemoDraft}
                      onChange={(event) => setSavedMemoDraft(event.target.value)}
                      placeholder="왜 흥미로웠는지, 어떤 과목이나 활동과 연결되는지 짧게 남겨보세요."
                    />
                    <div className="insight-memo-actions">
                      <button
                        type="button"
                        className="insight-action-btn"
                        onClick={() => handleUpdateSavedMemo(item.id)}
                        disabled={savingId === item.id}
                      >
                        메모 저장
                      </button>
                      <button
                        type="button"
                        className="insight-action-btn insight-action-btn--ghost"
                        onClick={closeSavedMemoEditor}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="insight-saved-actions">
                  <button
                    type="button"
                    className="insight-action-btn"
                    onClick={() => openSavedMemoEditor(item)}
                    disabled={savingId === item.id}
                  >
                    {item.memo ? '메모 수정' : '메모 작성'}
                  </button>
                  <a
                    className="insight-action-btn insight-action-btn--link"
                    href={normalizeInsightSourceUrl(item.sourceUrlSnapshot)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    원문 보기
                  </a>
                  <Link href={`/records/new?intent=careerIdea&source=insight&contentId=${encodeURIComponent(item.contentId)}`} className="insight-action-btn insight-action-btn--ghost">
                    기록으로 연결
                  </Link>
                  <button
                    type="button"
                    className="insight-action-btn insight-action-btn--ghost insight-action-btn--danger"
                    onClick={() => handleDeleteSave(item.id)}
                    disabled={savingId === item.id}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="ct-section">
        <h2 className="ct-section-title">다음 액션</h2>
        <div className="insight-next-grid">
          <Link href="/records/new?intent=careerIdea" className="insight-next-card">
            <strong>탐구 아이디어로 이어보기</strong>
            <span>저장한 인사이트를 진로/탐구 아이디어 기록으로 옮깁니다.</span>
          </Link>
          <Link href="/records" className="insight-next-card">
            <strong>학생부 기록에서 정리하기</strong>
            <span>기존 기록과 함께 연결 흐름을 정리합니다.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
