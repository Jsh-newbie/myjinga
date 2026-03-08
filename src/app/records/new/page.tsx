'use client';

import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Suspense, useMemo, useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { api } from '@/lib/api/client';
import { getClientAuth } from '@/lib/firebase/client';
import {
  getCategoriesForIntent,
  getCurrentSemester,
  getRecordCategoryLabel,
  RECORD_CATEGORY_META,
  RECORD_INTENTS,
  type RecordIntent,
} from '@/lib/records/presenter';
import type { RecordCategory } from '@/types/record';

type Step = 1 | 2 | 3 | 4;

const STEP_META: Array<{ value: Step; label: string; helper: string }> = [
  { value: 1, label: '기록 목적', helper: '무엇을 남길지' },
  { value: 2, label: '기록 종류', helper: '어떤 항목인지' },
  { value: 3, label: '내용 입력', helper: '필요한 정보만' },
  { value: 4, label: '저장 전 검토', helper: '한 번 더 확인' },
];

function toIsoDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<NewRecordPageFallback />}>
      <NewRecordPageContent />
    </Suspense>
  );
}

function NewRecordPageFallback() {
  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/records" className="ct-back">&lsaquo;</Link>
        <span className="ct-header-title">기록 작성</span>
        <span />
      </header>
    </div>
  );
}

function NewRecordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();

  const initialIntent = (searchParams.get('intent') as RecordIntent | null) ?? 'daily';
  const initialCategory = searchParams.get('category') as RecordCategory | null;

  const [intent, setIntent] = useState<RecordIntent>(initialIntent);
  const [category, setCategory] = useState<RecordCategory | ''>(initialCategory ?? '');
  const [semester, setSemester] = useState(getCurrentSemester());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [careerRelevance, setCareerRelevance] = useState('');
  const [recordDate, setRecordDate] = useState(toIsoDateTimeLocal(new Date()));
  const [tags, setTags] = useState('');
  const [hours, setHours] = useState('');

  const [myRole, setMyRole] = useState('');
  const [learningPoint, setLearningPoint] = useState('');
  const [ideaNote, setIdeaNote] = useState('');
  const [subtype, setSubtype] = useState<'autonomy' | 'club' | 'career'>('autonomy');
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [organization, setOrganization] = useState('');
  const [acquiredOn, setAcquiredOn] = useState('');
  const [rankOrLevel, setRankOrLevel] = useState('');

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);
      setLoading(false);
    });

    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      setStep(3);
    }
  }, [initialCategory]);

  const categories = getCategoriesForIntent(intent);
  const selectedMeta = category ? RECORD_CATEGORY_META[category] : null;

  function handleIntentSelect(nextIntent: RecordIntent) {
    setIntent(nextIntent);
    setCategory('');
    setStep(2);
  }

  function handleCategorySelect(nextCategory: RecordCategory) {
    setCategory(nextCategory);
    setStep(3);
  }

  function canProceedToReview() {
    return Boolean(category && title.trim() && content.trim());
  }

  function buildPayload() {
    const metadata: Record<string, unknown> = {};

    if (myRole.trim()) metadata.myRole = myRole.trim();
    if (learningPoint.trim()) metadata.learningPoint = learningPoint.trim();
    if (ideaNote.trim()) metadata.ideaNote = ideaNote.trim();

    if (category === 'creativeActivity') {
      metadata.subtype = subtype;
    }

    if (category === 'reading') {
      if (bookTitle.trim()) metadata.bookTitle = bookTitle.trim();
      if (author.trim()) metadata.author = author.trim();
    }

    if (category === 'award') {
      if (rankOrLevel.trim()) metadata.rankOrLevel = rankOrLevel.trim();
      if (organization.trim()) metadata.organization = organization.trim();
    }

    if (category === 'certificate') {
      if (organization.trim()) metadata.organization = organization.trim();
      if (acquiredOn.trim()) metadata.acquiredOn = acquiredOn.trim();
    }

    return {
      category,
      semester,
      title: title.trim(),
      content: content.trim(),
      subject: subject.trim() || undefined,
      careerRelevance: careerRelevance.trim() || undefined,
      recordDate: new Date(recordDate).toISOString(),
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      hours: category === 'volunteer' && hours.trim() ? Number(hours) : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      source: intent === 'daily' ? 'dailyPrompt' : intent === 'review' ? 'semesterReview' : 'manual',
      status: 'active',
      evidenceStatus: 'none',
    };
  }

  function handleSubmit() {
    if (!user || !category) return;

    setSubmitError('');

    startTransition(async () => {
      try {
        const token = await user.getIdToken();
        const result = await api.createRecord(token, buildPayload());

        if (!result.success) {
          setSubmitError(result.error.message);
          return;
        }

        router.replace(`/records/${result.data.record.id}`);
      } catch {
        setSubmitError('기록 저장 중 오류가 발생했습니다.');
      }
    });
  }

  if (loading) {
    return <NewRecordPageFallback />;
  }

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Link href="/records" className="ct-back">&lsaquo;</Link>
        <span className="ct-header-title">기록 작성</span>
        <span />
      </header>

      <section className="ct-intro">
        <h1>오늘 기록을 남기는 가장 쉬운 방법</h1>
        <p>무엇을 기록할지 고르면, 필요한 질문만 보여줍니다.</p>
      </section>

      <div className="record-progress" aria-label="기록 작성 단계">
        {STEP_META.map((item, index) => {
          const isComplete = step > item.value;
          const isCurrent = step === item.value;

          return (
            <div
              key={item.value}
              className={`record-progress-item ${isComplete ? 'record-progress-item--complete' : ''} ${isCurrent ? 'record-progress-item--current' : ''}`}
            >
              {index < STEP_META.length - 1 && <span className="record-progress-line" aria-hidden="true" />}
              <div className="record-progress-node">
                {isComplete ? '✓' : item.value}
              </div>
              <div className="record-progress-copy">
                <strong>{item.label}</strong>
                <span>{item.helper}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="record-progress-summary">
        <strong>{STEP_META[step - 1].label}</strong>
        <span>{STEP_META[step - 1].helper}</span>
      </div>

      {step === 1 && (
        <section className="ct-section">
          <h2 className="ct-section-title">1. 무엇을 남기고 싶은가요?</h2>
          <div className="record-option-list">
            {RECORD_INTENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`record-option-card ${intent === item.id ? 'record-option-card--selected' : ''}`}
                onClick={() => handleIntentSelect(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ct-section">
          <h2 className="ct-section-title">2. 기록 종류를 선택하세요</h2>
          <div className="record-option-list">
            {categories.map((item) => {
              const meta = RECORD_CATEGORY_META[item];
              return (
                <button
                  key={item}
                  type="button"
                  className={`record-option-card ${category === item ? 'record-option-card--selected' : ''}`}
                  onClick={() => handleCategorySelect(item)}
                >
                  <div className="record-option-head">
                    <span className="record-option-badge" style={meta.accent}>{meta.shortLabel}</span>
                    <strong>{meta.label}</strong>
                  </div>
                  <span>{meta.description}</span>
                </button>
              );
            })}
          </div>
          <div className="record-footer-actions">
            <button type="button" className="record-secondary-btn" onClick={() => setStep(1)}>
              이전
            </button>
          </div>
        </section>
      )}

      {step === 3 && category && selectedMeta && (
        <section className="ct-section">
          <h2 className="ct-section-title">3. 필요한 내용만 입력하세요</h2>
          <div className="record-form-shell">
            <div className="record-selected-chip" style={selectedMeta.accent}>
              {selectedMeta.label}
            </div>

            <label className="record-field">
              <span>학기</span>
              <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="2026-1" />
            </label>

            <label className="record-field">
              <span>기록 시점</span>
              <input type="datetime-local" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </label>

            <label className="record-field">
              <span>제목</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  category === 'subjectNote'
                    ? '예: 생명과학 시간 유전자 편집 토론'
                    : category === 'creativeActivity'
                      ? '예: 동아리 프로젝트 중간 발표'
                      : '기억하기 쉬운 제목을 적어주세요'
                }
              />
            </label>

            {(category === 'subjectNote' || category === 'reading') && (
              <label className="record-field">
                <span>과목</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 생명과학" />
              </label>
            )}

            {category === 'creativeActivity' && (
              <label className="record-field">
                <span>활동 영역</span>
                <select value={subtype} onChange={(e) => setSubtype(e.target.value as 'autonomy' | 'club' | 'career')}>
                  <option value="autonomy">자율·자치활동</option>
                  <option value="club">동아리활동</option>
                  <option value="career">진로활동</option>
                </select>
              </label>
            )}

            {category === 'volunteer' && (
              <label className="record-field">
                <span>봉사 시간</span>
                <input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="예: 2" />
              </label>
            )}

            {category === 'reading' && (
              <>
                <label className="record-field">
                  <span>도서명</span>
                  <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="예: 이기적 유전자" />
                </label>
                <label className="record-field">
                  <span>저자</span>
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="예: 리처드 도킨스" />
                </label>
              </>
            )}

            {category === 'award' && (
              <>
                <label className="record-field">
                  <span>등급/구분</span>
                  <input value={rankOrLevel} onChange={(e) => setRankOrLevel(e.target.value)} placeholder="예: 최우수상" />
                </label>
                <label className="record-field">
                  <span>수여기관</span>
                  <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="예: ○○고등학교장" />
                </label>
              </>
            )}

            {category === 'certificate' && (
              <>
                <label className="record-field">
                  <span>발급기관</span>
                  <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="예: 한국생산성본부" />
                </label>
                <label className="record-field">
                  <span>취득일</span>
                  <input type="date" value={acquiredOn} onChange={(e) => setAcquiredOn(e.target.value)} />
                </label>
              </>
            )}

            <label className="record-field">
              <span>핵심 내용</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="무슨 일이 있었고, 무엇을 했는지 사실 중심으로 적어주세요."
                rows={6}
              />
            </label>

            <label className="record-field">
              <span>내 역할 또는 참여 방식</span>
              <input value={myRole} onChange={(e) => setMyRole(e.target.value)} placeholder="예: 발표 정리, 자료 조사, 토론 진행" />
            </label>

            <label className="record-field">
              <span>배운 점 또는 변화</span>
              <textarea value={learningPoint} onChange={(e) => setLearningPoint(e.target.value)} rows={3} placeholder="이 경험을 통해 배운 점이나 달라진 점을 적어주세요." />
            </label>

            <label className="record-field">
              <span>진로와 연결되는 점</span>
              <textarea value={careerRelevance} onChange={(e) => setCareerRelevance(e.target.value)} rows={3} placeholder="관심 학과, 직업, 탐구 주제와의 연결이 있다면 적어주세요." />
            </label>

            <label className="record-field">
              <span>나중에 키우고 싶은 아이디어</span>
              <textarea value={ideaNote} onChange={(e) => setIdeaNote(e.target.value)} rows={3} placeholder="보고서, 발표, 탐구, 진로활동으로 확장할 아이디어를 적어주세요." />
            </label>

            <label className="record-field">
              <span>태그</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 발표, 토론, 생명과학, 의생명공학" />
            </label>
          </div>

          <div className="record-footer-actions">
            <button type="button" className="record-secondary-btn" onClick={() => setStep(2)}>
              이전
            </button>
            <button
              type="button"
              className="records-primary-btn"
              onClick={() => setStep(4)}
              disabled={!canProceedToReview()}
            >
              검토 단계로 이동
            </button>
          </div>
        </section>
      )}

      {step === 4 && category && (
        <section className="ct-section">
          <h2 className="ct-section-title">4. 저장 전 확인</h2>
          <div className="record-review-card">
            <div className="record-review-row">
              <span>기록 종류</span>
              <strong>{getRecordCategoryLabel(category)}</strong>
            </div>
            <div className="record-review-row">
              <span>학기</span>
              <strong>{semester}</strong>
            </div>
            <div className="record-review-row">
              <span>제목</span>
              <strong>{title}</strong>
            </div>
            <div className="record-review-block">
              <span>핵심 내용</span>
              <p>{content}</p>
            </div>
            {careerRelevance && (
              <div className="record-review-block">
                <span>진로 연결</span>
                <p>{careerRelevance}</p>
              </div>
            )}
            {ideaNote && (
              <div className="record-review-block">
                <span>확장 아이디어</span>
                <p>{ideaNote}</p>
              </div>
            )}
          </div>

          <div className="records-guide-card">
            <strong>저장 전 체크</strong>
            <ul className="records-guide-list">
              <li>사실 중심으로 적고, 대학명이나 교외대회 같은 제한 항목은 넣지 않는 것이 좋습니다.</li>
              <li>오늘 기록은 짧아도 괜찮습니다. 주간 정리와 학기말 점검에서 더 다듬을 수 있습니다.</li>
              <li>교과 수업 기록은 내가 한 행동, 배운 점, 탐구 확장 포인트가 같이 보이면 좋습니다.</li>
            </ul>
          </div>

          {submitError && <p className="record-error-text">{submitError}</p>}

          <div className="record-footer-actions">
            <button type="button" className="record-secondary-btn" onClick={() => setStep(3)}>
              수정
            </button>
            <button type="button" className="records-primary-btn" onClick={handleSubmit} disabled={isPending}>
              {isPending ? '저장 중...' : '기록 저장'}
            </button>
          </div>
        </section>
      )}

      {(error || submitError) && !step && <p className="record-error-text">{error || submitError}</p>}
    </div>
  );
}
