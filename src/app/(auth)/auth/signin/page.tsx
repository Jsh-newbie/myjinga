'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { toAuthErrorMessage } from '@/lib/auth/error-message';
import { buildAccountRecoveryTips, requestPasswordReset } from '@/lib/auth/recovery';
import { getClientAuth } from '@/lib/firebase/client';
import {
  AUTH_SIGNUP_PATH,
  DASHBOARD_HOME_PATH,
  resolveAuthPageRedirectPath,
} from '@/lib/navigation/entry-policy';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase 설정을 확인해 주세요.');
      return null;
    }
  }, []);

  useEffect(() => {
    router.prefetch(DASHBOARD_HOME_PATH);
  }, [router]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const initialPath = resolveAuthPageRedirectPath(Boolean(auth.currentUser));
    if (initialPath) {
      router.replace(initialPath);
      return;
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      const nextPath = resolveAuthPageRedirectPath(Boolean(nextUser));
      if (nextPath) {
        router.replace(nextPath);
      }
    });

    return unsub;
  }, [auth, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      return;
    }

    setPending(true);
    setError('');
    setNotice('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace(DASHBOARD_HOME_PATH);
    } catch (err) {
      setError(toAuthErrorMessage(err, '로그인에 실패했습니다. 입력 정보를 확인해 주세요.'));
      setPending(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth) {
      return;
    }

    setError('');
    setNotice('');

    try {
      const normalizedEmail = await requestPasswordReset(auth, email, sendPasswordResetEmail);
      setNotice(`${normalizedEmail}로 비밀번호 재설정 이메일을 보냈습니다. 메일함과 스팸함을 확인해 주세요.`);
    } catch (err) {
      setError(
        toAuthErrorMessage(
          err,
          err instanceof Error ? err.message : '비밀번호 재설정 이메일 발송에 실패했습니다.'
        )
      );
    }
  }

  const recoveryTips = buildAccountRecoveryTips(email);

  return (
    <AuthShell
      mode="signin"
      title="로그인"
      subtitle="마진가 계정으로 로그인하고 진로 기록을 이어가세요."
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          required
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <input
          required
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <button
          type="submit"
          disabled={pending || !auth}
          style={{
            marginTop: 6,
            padding: '12px 14px',
            borderRadius: 10,
            border: 'none',
            background: pending ? 'var(--brand-100)' : 'var(--brand-700)',
            color: 'white',
            fontWeight: 700,
            cursor: pending ? 'default' : 'pointer',
          }}
        >
          {pending ? '로그인 중...' : '로그인'}
        </button>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePasswordReset}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              color: 'var(--brand-700)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            비밀번호 재설정
          </button>
          <button
            type="button"
            onClick={() => setShowRecoveryHelp((prev) => !prev)}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              color: 'var(--brand-700)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showRecoveryHelp ? '계정 찾기 안내 닫기' : '계정 찾기 안내'}
          </button>
        </div>
      </form>

      {notice && (
        <p
          style={{
            marginTop: 12,
            color: 'var(--brand-700)',
            fontWeight: 600,
            background: 'var(--brand-100)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          {notice}
        </p>
      )}
      {error && <p style={{ marginTop: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

      {showRecoveryHelp && (
        <div
          style={{
            marginTop: 14,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid #e4e4e7',
            background: '#fafafa',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            계정을 찾을 때 먼저 확인해 보세요
          </strong>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#52525b', fontSize: 13, lineHeight: 1.6 }}>
            {recoveryTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ marginTop: 16, color: '#52525b' }}>
        계정이 없나요?{' '}
        <Link href={AUTH_SIGNUP_PATH} style={{ color: 'var(--brand-700)', fontWeight: 700 }}>
          회원가입 하기
        </Link>
      </p>
    </AuthShell>
  );
}
