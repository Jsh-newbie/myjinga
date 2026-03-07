'use client';

import Link from 'next/link';
import { onAuthStateChanged, signOut, sendPasswordResetEmail, type User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
} from 'firebase/auth';

import { getClientAuth } from '@/lib/firebase/client';
import { api, type SchoolSearchItem } from '@/lib/api/client';
import type { UserProfile } from '@/types/user';

declare global {
  interface Window {
    __recaptchaVerifier?: RecaptchaVerifier;
  }
}

type LoadingState = 'loading' | 'ready' | 'error';
type PhoneStep = 'idle' | 'input' | 'code-sent' | 'verifying' | 'verified';

const INTEREST_PRESETS = [
  '인문', '사회', '경영', '교육', '자연과학',
  '공학', 'IT', '의약', '예술', '체육',
  '법학', '심리', '미디어', '환경', '디자인',
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Form fields
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [schoolLevel, setSchoolLevel] = useState<'middle' | 'high'>('high');
  const [grade, setGrade] = useState<1 | 2 | 3>(1);
  const [schoolName, setSchoolName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  // School search
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolSearchItem[]>([]);
  const [schoolSearching, setSchoolSearching] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const schoolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  // Phone verification
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        router.replace('/auth/signin');
        return;
      }

      setUser(nextUser);

      try {
        const token = await nextUser.getIdToken();
        const meResult = await api.getMe(token);

        if (!meResult.success) {
          setError(meResult.error.message);
          setState('error');
          return;
        }

        const p = meResult.data.profile as UserProfile;
        setProfile(p);
        setNickname(p.nickname ?? '');
        setBirthDate(p.birthDate ? p.birthDate.slice(0, 10) : '');
        setSchoolLevel(p.schoolLevel);
        setGrade(p.grade);
        setSchoolName(p.schoolName ?? '');
        setSchoolQuery(p.schoolName ?? '');
        setInterests(p.interests ?? []);
        if (p.phoneNumber) setPhoneNumber(p.phoneNumber);
        if (p.phoneVerified) setPhoneStep('verified');
        setState('ready');
      } catch {
        setError('프로필 조회 중 오류가 발생했습니다.');
        setState('error');
      }
    });

    return () => unsub();
  }, [auth, router]);

  // Close school dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const searchSchools = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setSchoolResults([]);
      setShowSchoolDropdown(false);
      return;
    }

    setSchoolSearching(true);
    try {
      const token = await user.getIdToken();
      const result = await api.searchSchools(token, query, schoolLevel);
      if (result.success) {
        setSchoolResults(result.data.schools);
        setShowSchoolDropdown(result.data.schools.length > 0);
      }
    } catch {
      // silent
    } finally {
      setSchoolSearching(false);
    }
  }, [user, schoolLevel]);

  function handleSchoolQueryChange(value: string) {
    setSchoolQuery(value);
    setSchoolName('');

    if (schoolDebounceRef.current) clearTimeout(schoolDebounceRef.current);

    if (value.trim().length >= 2) {
      schoolDebounceRef.current = setTimeout(() => searchSchools(value.trim()), 400);
    } else {
      setSchoolResults([]);
      setShowSchoolDropdown(false);
    }
  }

  function handleSchoolSelect(school: SchoolSearchItem) {
    setSchoolName(school.name);
    setSchoolQuery(school.name);
    setShowSchoolDropdown(false);
  }

  async function handleSave() {
    if (!user || saving) return;

    setSaving(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const result = await api.updateProfile(token, {
        nickname: nickname || undefined,
        birthDate: new Date(birthDate).toISOString(),
        schoolLevel,
        grade,
        schoolName: schoolName || undefined,
        interests: interests.length > 0 ? interests : undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setProfile(result.data.profile);
      showToast('프로필이 저장되었습니다.');
    } catch {
      setError('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function formatPhoneE164(raw: string): string {
    let formatted = raw.trim();
    if (formatted.startsWith('0')) {
      formatted = '+82' + formatted.slice(1);
    }
    if (!formatted.startsWith('+')) {
      formatted = '+82' + formatted;
    }
    return formatted;
  }

  async function handleSendCode() {
    if (!auth || !user) return;

    setPhoneError('');
    const formatted = formatPhoneE164(phoneNumber);

    try {
      setPhoneStep('verifying');

      if (!window.__recaptchaVerifier) {
        window.__recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const appVerifier = window.__recaptchaVerifier;

      const provider = new PhoneAuthProvider(auth);
      const vId = await provider.verifyPhoneNumber(formatted, appVerifier);
      setVerificationId(vId);
      setPhoneStep('code-sent');
    } catch (err) {
      console.error('[phone] send code error', err);
      setPhoneError('인증번호 발송에 실패했습니다. 전화번호를 확인해 주세요.');
      setPhoneStep('input');
    }
  }

  async function handleVerifyCode() {
    if (!auth || !user || !verificationId) return;

    setPhoneError('');
    setPhoneStep('verifying');

    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);

      try {
        await linkWithCredential(user, credential);
      } catch (linkErr) {
        const code = (linkErr as { code?: string }).code;
        if (code === 'auth/provider-already-linked' || code === 'auth/credential-already-in-use') {
          await signInWithCredential(auth, credential);
        } else {
          throw linkErr;
        }
      }

      const formatted = formatPhoneE164(phoneNumber);

      const token = await user.getIdToken(true);
      const result = await api.updateProfile(token, {
        phoneNumber: formatted,
        phoneVerified: true,
      });

      if (result.success) {
        setProfile(result.data.profile);
      }

      setPhoneStep('verified');
      showToast('전화번호가 인증되었습니다.');
    } catch (err) {
      console.error('[phone] verify error', err);
      setPhoneError('인증번호가 올바르지 않습니다.');
      setPhoneStep('code-sent');
    }
  }

  function handleChangePhone() {
    setPhoneStep('input');
    setPhoneNumber('');
    setVerificationCode('');
    setVerificationId('');
    setPhoneError('');
  }

  async function handlePasswordReset() {
    if (!auth || !user?.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      showToast('비밀번호 재설정 이메일을 발송했습니다.');
    } catch {
      setError('비밀번호 재설정 이메일 발송에 실패했습니다.');
    }
  }

  function toggleInterest(tag: string) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 10 ? [...prev, tag] : prev
    );
  }

  function addCustomInterest() {
    const tag = customInterest.trim();
    if (!tag || interests.includes(tag) || interests.length >= 10) return;
    setInterests((prev) => [...prev, tag]);
    setCustomInterest('');
  }

  async function handleDeleteAccount() {
    if (!user || deleting) return;

    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const result = await api.deleteAccount(token);

      if (!result.success) {
        setError(result.error.message);
        setDeleting(false);
        return;
      }

      if (auth) {
        await signOut(auth);
      }
      router.replace('/auth/signin');
    } catch {
      setError('계정 삭제 중 오류가 발생했습니다.');
      setDeleting(false);
    }
  }

  const displayName = profile?.nickname || profile?.name || '';

  const hasChanges =
    profile &&
    (nickname !== (profile.nickname ?? '') ||
      birthDate !== (profile.birthDate ? profile.birthDate.slice(0, 10) : '') ||
      schoolLevel !== profile.schoolLevel ||
      grade !== profile.grade ||
      schoolName !== (profile.schoolName ?? '') ||
      JSON.stringify(interests) !== JSON.stringify(profile.interests ?? []));

  const createdAtLabel = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('ko-KR')
    : '-';

  // 베타 기간 중 프리미엄 기능 비활성화
  // const isPremium = profile?.subscription?.plan === 'premium';

  if (state === 'loading') {
    return (
      <div className="pf-page">
        <header className="pf-header">
          <Link href="/dashboard" className="pf-back">&lsaquo;</Link>
          <span className="pf-header-title">프로필 수정</span>
          <span style={{ width: 32 }} />
        </header>
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#71717a' }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      {/* Header */}
      <header className="pf-header">
        <Link href="/dashboard" className="pf-back">&lsaquo;</Link>
        <span className="pf-header-title">프로필 수정</span>
        <span style={{ width: 32 }} />
      </header>

      {/* Avatar & Account Summary */}
      <div className="pf-avatar-section">
        <div className="pf-avatar">
          {displayName ? displayName.charAt(0) : '?'}
        </div>
        <div className="pf-name-display">{displayName || '-'}</div>
        <div className="pf-email">{user?.email ?? ''}</div>
        <span className="pf-plan-badge pf-plan-badge--beta">
          Beta (무료)
        </span>
      </div>

      {/* Beta 안내 배너 */}
      <div className="pf-beta-banner">
        <div className="pf-beta-banner-content">
          <strong>Beta 서비스 이용 중</strong>
          <span>현재 베타 서비스 기간으로 모든 기능을 무료로 이용하실 수 있습니다</span>
        </div>
      </div>

      {/* Basic Info */}
      <section className="pf-section">
        <h2 className="pf-section-title">기본 정보</h2>

        <label className="pf-label">이름</label>
        <input
          className="pf-input pf-input--readonly"
          value={profile?.name ?? ''}
          readOnly
          disabled
        />

        <label className="pf-label">닉네임</label>
        <input
          className="pf-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="앱에서 표시될 닉네임"
          maxLength={30}
        />

        <label className="pf-label">생년월일</label>
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />

        <div className="pf-row">
          <div className="pf-col">
            <label className="pf-label">학교급</label>
            <SelectButton
              value={schoolLevel === 'middle' ? '중학교' : '고등학교'}
              options={[
                { value: 'middle', label: '중학교' },
                { value: 'high', label: '고등학교' },
              ]}
              onSelect={(v) => {
                setSchoolLevel(v as 'middle' | 'high');
                setSchoolName('');
                setSchoolQuery('');
                setSchoolResults([]);
              }}
            />
          </div>
          <div className="pf-col">
            <label className="pf-label">학년</label>
            <SelectButton
              value={`${grade}학년`}
              options={[
                { value: '1', label: '1학년' },
                { value: '2', label: '2학년' },
                { value: '3', label: '3학년' },
              ]}
              onSelect={(v) => setGrade(Number(v) as 1 | 2 | 3)}
            />
          </div>
        </div>

        {/* School Search */}
        <label className="pf-label">학교</label>
        <div className="pf-school-search" ref={schoolDropdownRef}>
          <div className="pf-phone-row">
            <input
              className="pf-input"
              value={schoolQuery}
              onChange={(e) => handleSchoolQueryChange(e.target.value)}
              placeholder="학교명을 입력하세요 (2글자 이상)"
              style={{ flex: 1, marginBottom: 0 }}
            />
            {schoolSearching && (
              <span className="pf-school-spinner" />
            )}
          </div>
          {showSchoolDropdown && schoolResults.length > 0 && (
            <ul className="pf-school-dropdown">
              {schoolResults.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    className="pf-school-option"
                    onClick={() => handleSchoolSelect(s)}
                  >
                    <strong>{s.name}</strong>
                    <span>{s.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {schoolName && (
            <div className="pf-school-selected">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {schoolName}
            </div>
          )}
        </div>
      </section>

      {/* Interests */}
      <section className="pf-section">
        <h2 className="pf-section-title">
          관심 분야
          <span className="pf-section-sub">{interests.length}/10</span>
        </h2>
        <div className="pf-tags">
          {INTEREST_PRESETS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`pf-tag ${interests.includes(tag) ? 'pf-tag--active' : ''}`}
              onClick={() => toggleInterest(tag)}
            >
              {tag}
            </button>
          ))}
          {interests
            .filter((t) => !INTEREST_PRESETS.includes(t))
            .map((tag) => (
              <button
                key={tag}
                type="button"
                className="pf-tag pf-tag--active pf-tag--custom"
                onClick={() => toggleInterest(tag)}
              >
                {tag} &times;
              </button>
            ))}
        </div>
        <div className="pf-custom-tag-row">
          <input
            className="pf-input"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="직접 입력"
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomInterest();
              }
            }}
            style={{ marginBottom: 0 }}
          />
          <button
            type="button"
            className="pf-phone-btn"
            onClick={addCustomInterest}
            disabled={!customInterest.trim() || interests.length >= 10}
          >
            추가
          </button>
        </div>
      </section>

      {/* Phone Verification */}
      <section className="pf-section">
        <h2 className="pf-section-title">전화번호 인증</h2>

        {phoneStep === 'verified' ? (
          <div className="pf-verified-row">
            <div className="pf-verified-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>인증 완료 ({profile?.phoneNumber ?? phoneNumber})</span>
            </div>
            <button type="button" className="pf-link-btn" onClick={handleChangePhone}>
              변경
            </button>
          </div>
        ) : (
          <>
            <label className="pf-label">전화번호</label>
            <div className="pf-phone-row">
              <input
                className="pf-input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01012345678"
                disabled={phoneStep === 'code-sent' || phoneStep === 'verifying'}
                style={{ flex: 1 }}
              />
              <button
                className="pf-phone-btn"
                onClick={handleSendCode}
                disabled={!phoneNumber.trim() || phoneStep === 'verifying'}
              >
                {phoneStep === 'verifying' ? '발송 중...' : phoneStep === 'code-sent' ? '재발송' : '인증번호 발송'}
              </button>
            </div>

            {phoneStep === 'code-sent' && (
              <>
                <label className="pf-label" style={{ marginTop: 12 }}>인증번호</label>
                <div className="pf-phone-row">
                  <input
                    className="pf-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6자리 인증번호"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="pf-phone-btn pf-phone-btn--verify"
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length < 6}
                  >
                    확인
                  </button>
                </div>
              </>
            )}

            {phoneError && <p className="pf-error">{phoneError}</p>}
          </>
        )}
      </section>

      {/* Save Button */}
      <button
        className="pf-save-btn"
        onClick={handleSave}
        disabled={saving || !hasChanges}
      >
        {saving ? '저장 중...' : '변경사항 저장'}
      </button>

      {error && <p className="pf-error" style={{ textAlign: 'center', marginBottom: 16 }}>{error}</p>}

      {/* Account Management */}
      <section className="pf-section pf-section--account">
        <h2 className="pf-section-title">계정 관리</h2>

        <div className="pf-account-row">
          <div>
            <div className="pf-account-label">이메일</div>
            <div className="pf-account-value">{user?.email ?? '-'}</div>
          </div>
        </div>

        <div className="pf-account-row">
          <div>
            <div className="pf-account-label">가입일</div>
            <div className="pf-account-value">{createdAtLabel}</div>
          </div>
        </div>

        <div className="pf-account-row">
          <div>
            <div className="pf-account-label">이용 플랜</div>
            <div className="pf-account-value">
              <span className="pf-plan-badge-inline pf-plan-badge--beta">
                Beta (무료)
              </span>
            </div>
          </div>
        </div>

        <button type="button" className="pf-text-btn" onClick={handlePasswordReset}>
          비밀번호 재설정 이메일 발송
        </button>

        <button
          type="button"
          className="pf-text-btn pf-text-btn--danger"
          onClick={() => setShowDeleteModal(true)}
        >
          회원 탈퇴
        </button>
      </section>

      {/* Toast */}
      {toast && <div className="ctp-toast">{toast}</div>}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="pf-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="pf-modal-title">정말 탈퇴하시겠습니까?</h3>
            <p className="pf-modal-desc">
              탈퇴하면 모든 검사 결과, 학생부 기록, 프로필 정보가<br />
              <strong>영구적으로 삭제</strong>되며 복구할 수 없습니다.
            </p>
            <label className="pf-label" style={{ marginTop: 16 }}>
              확인을 위해 <strong>&quot;탈퇴합니다&quot;</strong>를 입력해 주세요
            </label>
            <input
              className="pf-input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="탈퇴합니다"
              style={{ marginBottom: 16 }}
            />
            <div className="pf-modal-actions">
              <button
                className="pf-modal-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                취소
              </button>
              <button
                className="pf-modal-btn pf-modal-btn--danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== '탈퇴합니다' || deleting}
              >
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recaptcha container (invisible) */}
      <div id="recaptcha-container" />
    </div>
  );
}

function BirthDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = value ? new Date(value) : null;
  const year = parsed ? parsed.getFullYear() : 0;
  const month = parsed ? parsed.getMonth() + 1 : 0;
  const day = parsed ? parsed.getDate() : 0;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function update(y: number, m: number, d: number) {
    if (!y || !m || !d) return;
    const maxDay = new Date(y, m, 0).getDate();
    const safeDay = Math.min(d, maxDay);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(dateStr);
  }

  return (
    <div className="pf-birth-picker">
      <select
        className="pf-input pf-birth-select"
        value={year || ''}
        onChange={(e) => update(Number(e.target.value), month || 1, day || 1)}
      >
        <option value="" disabled>년</option>
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
      <select
        className="pf-input pf-birth-select"
        value={month || ''}
        onChange={(e) => update(year || currentYear - 15, Number(e.target.value), day || 1)}
      >
        <option value="" disabled>월</option>
        {months.map((m) => <option key={m} value={m}>{m}월</option>)}
      </select>
      <select
        className="pf-input pf-birth-select"
        value={day || ''}
        onChange={(e) => update(year || currentYear - 15, month || 1, Number(e.target.value))}
      >
        <option value="" disabled>일</option>
        {days.map((d) => <option key={d} value={d}>{d}일</option>)}
      </select>
    </div>
  );
}

function SelectButton({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="pf-select-btn"
        onClick={() => setOpen(true)}
      >
        <span>{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="pf-select-overlay" onClick={() => setOpen(false)}>
          <div className="pf-select-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pf-select-handle" />
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`pf-select-option${opt.label === value ? ' pf-select-option--active' : ''}`}
                onClick={() => { onSelect(opt.value); setOpen(false); }}
              >
                {opt.label}
                {opt.label === value && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
