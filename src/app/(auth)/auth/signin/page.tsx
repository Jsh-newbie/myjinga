'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { toAuthErrorMessage } from '@/lib/auth/error-message';
import { getClientAuth } from '@/lib/firebase/client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const auth = useMemo(() => {
    try {
      return getClientAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase 설정을 확인해 주세요.');
      return null;
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      return;
    }

    setPending(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(toAuthErrorMessage(err, '로그인에 실패했습니다. 입력 정보를 확인해 주세요.'));
    } finally {
      setPending(false);
    }
  }

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
            background: pending ? '#86efac' : '#15803d',
            color: 'white',
            fontWeight: 700,
            cursor: pending ? 'default' : 'pointer',
          }}
        >
          {pending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {error && <p style={{ marginTop: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

      <p style={{ marginTop: 16, color: '#52525b' }}>
        계정이 없나요?{' '}
        <Link href="/auth/signup" style={{ color: '#15803d', fontWeight: 700 }}>
          회원가입 하기
        </Link>
      </p>
    </AuthShell>
  );
}
