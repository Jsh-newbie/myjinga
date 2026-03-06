'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';

import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';
import { CAREER_TESTS, isCareerTestTypeId } from '@/lib/careernet/constants';

interface Choice {
  value: string;
  label: string;
}

interface Question {
  no: number;
  text: string;
  choices: Choice[];
  tip?: string;
  useScoreLabel?: boolean;
}

type ModalState = 'none' | 'confirm' | 'submitting' | 'done';

export default function CareerTestProgressPage() {
  const params = useParams();
  const router = useRouter();
  const testTypeId = params.testTypeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalState>('none');
  const [resultId, setResultId] = useState<string | null>(null);

  const unsavedCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch {
      return null;
    }
  }, []);

  // Auth
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace('/auth/signin'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [auth, router]);

  // Validate testTypeId
  useEffect(() => {
    if (!isCareerTestTypeId(testTypeId)) {
      router.replace('/career-test');
    }
  }, [testTypeId, router]);

  // Load questions & existing session
  useEffect(() => {
    if (!user || !isCareerTestTypeId(testTypeId)) return;

    async function load() {
      try {
        const token = await user!.getIdToken();

        // Check for existing session
        const sessResult = await api.listSessions(token);
        if (sessResult.success) {
          const existing = sessResult.data.sessions.find(
            (s) => s.testTypeId === testTypeId
          );
          if (existing) {
            const detailResult = await api.getSession(token, existing.sessionId);
            if (detailResult.success) {
              const session = detailResult.data.session;
              setSessionId(existing.sessionId);
              setAnswers(session.answers ?? {});
              setCurrentIndex(session.currentIndex ?? 0);
            }
          }
        }

        // Load questions
        const qResult = await api.getQuestions(token, testTypeId);
        if (qResult.success) {
          setQuestions(qResult.data.questions);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, testTypeId]);

  // Auto-save timer (30s)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (unsavedCountRef.current > 0) {
        saveSession();
      }
    }, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId, questions.length]);

  const getToken = useCallback(async () => {
    return user ? user.getIdToken() : null;
  }, [user]);

  const saveSession = useCallback(async () => {
    const token = await getToken();
    if (!token || questions.length === 0) return;

    setSaving(true);
    try {
      const currentAnswers = answersRef.current;
      const result = await api.saveSession(token, {
        testTypeId,
        answers: currentAnswers,
        currentIndex,
        answeredCount: Object.keys(currentAnswers).length,
        totalQuestions: questions.length,
      });
      if (result.success) {
        setSessionId(result.data.sessionId);
        unsavedCountRef.current = 0;
      }
    } catch (err) {
      console.error('[saveSession]', err);
      setToast('저장에 실패했습니다. 다시 시도해 주세요.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }, [getToken, testTypeId, currentIndex, questions.length]);

  function handleAnswer(questionNo: number, value: string) {
    setAnswers((prev) => ({ ...prev, [String(questionNo)]: value }));
    unsavedCountRef.current += 1;

    // Auto-save every 5 answers
    if (unsavedCountRef.current >= 5) {
      saveSession();
    }

    // Auto-advance to next question after brief delay
    setTimeout(() => {
      goNext();
    }, 250);
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  async function handleExit() {
    await saveSession();
    router.push('/career-test');
  }

  async function handleExplicitSave() {
    await saveSession();
    setToast('저장되었습니다');
    setTimeout(() => setToast(''), 2000);
  }

  function handleSubmitClick() {
    setModal('confirm');
  }

  async function handleConfirmSubmit() {
    setModal('submitting');
    await saveSession();

    const token = await getToken();
    if (!token || !sessionId) {
      setModal('none');
      return;
    }

    try {
      const result = await api.submitTest(token, sessionId);

      if (result.success) {
        setResultId(result.data.resultId);
        setModal('done');
      } else {
        setModal('none');
        setToast(result.error.message || '제출에 실패했습니다. 다시 시도해 주세요.');
        setTimeout(() => setToast(''), 3000);
      }
    } catch {
      setModal('none');
      setToast('제출 중 오류가 발생했습니다.');
      setTimeout(() => setToast(''), 3000);
    }
  }

  if (!isCareerTestTypeId(testTypeId)) return null;

  const meta = CAREER_TESTS[testTypeId];
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const pct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLast = currentIndex === questions.length - 1;

  const unanswered = questions
    .filter((q) => !answers[String(q.no)])
    .map((q) => q.no);

  if (loading) {
    return (
      <div className="ctp-page">
        <header className="ctp-header">
          <button className="ctp-exit" onClick={() => router.push('/career-test')}>
            &lsaquo; 나가기
          </button>
          <span />
        </header>
        <div className="ct-loading">
          <div className="main-skeleton" style={{ height: 20, width: '60%', marginBottom: 16, borderRadius: 8 }} />
          <div className="main-skeleton" style={{ height: 200, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ctp-page">
      {/* Header */}
      <header className="ctp-header">
        <button className="ctp-exit" onClick={handleExit}>
          &lsaquo; 나가기
        </button>
        <button className="ctp-save-btn" onClick={handleExplicitSave} disabled={saving}>
          {saving ? '저장 중...' : '임시저장'}
        </button>
      </header>

      {/* Test info & progress */}
      <div className="ctp-info">
        <div className="ctp-test-name">{meta.name}</div>
        <div className="ctp-progress-row">
          <div className="ct-progress-bar-bg">
            <div className="ct-progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="ctp-progress-text">{answeredCount}/{questions.length}</span>
        </div>
      </div>

      {/* Question */}
      {currentQ && (
        <div className="ctp-question-card" key={currentQ.no}>
          <div className="ctp-q-no">Q{currentQ.no}.</div>
          <div className="ctp-q-text">{currentQ.text}</div>

          {currentQ.tip && (
            <div className="ctp-q-tip" style={{ whiteSpace: 'pre-line' }}>{currentQ.tip}</div>
          )}

          {currentQ.useScoreLabel ? (
            <div className="ctp-score-choices">
              {currentQ.choices.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`ctp-score-btn ${answers[String(currentQ.no)] === c.value ? 'ctp-score-btn--selected' : ''}`}
                  onClick={() => handleAnswer(currentQ.no, c.value)}
                >
                  {c.value}
                </button>
              ))}
            </div>
          ) : (
            <div className="ctp-choices">
              {currentQ.choices.map((c) => (
                <label
                  key={c.value}
                  className={`ctp-choice ${answers[String(currentQ.no)] === c.value ? 'ctp-choice--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQ.no}`}
                    value={c.value}
                    checked={answers[String(currentQ.no)] === c.value}
                    onChange={() => handleAnswer(currentQ.no, c.value)}
                  />
                  <span className="ctp-choice-label">{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="ctp-nav">
        <button className="ctp-nav-btn" onClick={goPrev} disabled={currentIndex === 0}>
          &lsaquo; 이전
        </button>
        {isLast ? (
          <button className="ctp-nav-btn ctp-nav-btn--submit" onClick={handleSubmitClick}>
            제출하기
          </button>
        ) : (
          <button className="ctp-nav-btn" onClick={goNext}>
            다음 &rsaquo;
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="ctp-toast">{toast}</div>}

      {/* Submit Modal */}
      {modal !== 'none' && (
        <div className="ctp-modal-overlay">
          <div className="ctp-modal">
            {modal === 'confirm' && (
              <>
                {unanswered.length > 0 ? (
                  <>
                    <div className="ctp-modal-title">미응답 문항이 있습니다</div>
                    <p>전체 {questions.length}문항 중 {answeredCount}문항 응답 완료</p>
                    <p className="ctp-modal-unanswered">
                      미응답: {unanswered.slice(0, 10).join(', ')}
                      {unanswered.length > 10 ? ` 외 ${unanswered.length - 10}개` : ''}번
                    </p>
                    <div className="ctp-modal-actions">
                      <button className="ctp-modal-btn" onClick={() => {
                        setModal('none');
                        setCurrentIndex(questions.findIndex((q) => q.no === unanswered[0]) ?? 0);
                      }}>
                        돌아가서 답변
                      </button>
                      <button className="ctp-modal-btn ctp-modal-btn--primary" onClick={handleConfirmSubmit}>
                        그래도 제출
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ctp-modal-title">검사를 제출하시겠습니까?</div>
                    <p>전체 {questions.length}문항 중 {answeredCount}문항 응답 완료</p>
                    <p className="ctp-modal-warn">제출 후에는 수정할 수 없습니다</p>
                    <div className="ctp-modal-actions">
                      <button className="ctp-modal-btn" onClick={() => setModal('none')}>취소</button>
                      <button className="ctp-modal-btn ctp-modal-btn--primary" onClick={handleConfirmSubmit}>
                        제출하기
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {modal === 'submitting' && (
              <div className="ctp-modal-loading">
                <div className="ctp-spinner" />
                <p>제출 중입니다...</p>
              </div>
            )}
            {modal === 'done' && (
              <>
                <div className="ctp-modal-title">제출 완료!</div>
                <p>검사가 성공적으로 제출되었습니다.</p>
                <div className="ctp-modal-actions">
                  {resultId ? (
                    <button
                      className="ctp-modal-btn ctp-modal-btn--primary"
                      onClick={() => router.push(`/career-test/result/${resultId}`)}
                    >
                      결과 확인하기
                    </button>
                  ) : (
                    <button
                      className="ctp-modal-btn ctp-modal-btn--primary"
                      onClick={() => router.push('/career-test')}
                    >
                      돌아가기
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
