'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { toAuthErrorMessage } from '@/lib/auth/error-message';
import { getClientAuth } from '@/lib/firebase/client';
import { api } from '@/lib/api/client';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('2010-01-01');
  const [schoolLevel, setSchoolLevel] = useState<'middle' | 'high'>('high');
  const [grade, setGrade] = useState<'1' | '2' | '3'>('1');
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

    if (password !== passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setPending(true);
    setError('');

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });

      const token = await credential.user.getIdToken();
      const result = await api.initUser(token, {
        email,
        name,
        birthDate: new Date(birthDate).toISOString(),
        schoolLevel,
        grade: Number(grade),
      });

      if (!result.success) {
        throw new Error(result.error.message || '회원정보 초기화에 실패했습니다.');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(toAuthErrorMessage(err, err instanceof Error ? err.message : '회원가입에 실패했습니다.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      mode="signup"
      title="회원가입"
      subtitle="기본 정보를 입력하면 학생 맞춤 진로 기록을 시작할 수 있어요."
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
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <input
          required
          type="password"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <input
          required
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <input
          required
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
        />
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value as 'middle' | 'high')}
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
          >
            <option value="middle">중학교</option>
            <option value="high">고등학교</option>
          </select>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as '1' | '2' | '3')}
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #d4d4d8' }}
          >
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
        </div>

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
          {pending ? '가입 처리 중...' : '회원가입 완료'}
        </button>
      </form>

      {error && <p style={{ marginTop: 12, color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

      <p style={{ marginTop: 16, color: '#52525b' }}>
        이미 계정이 있나요?{' '}
        <Link href="/auth/signin" style={{ color: 'var(--brand-700)', fontWeight: 700 }}>
          로그인 하기
        </Link>
      </p>
    </AuthShell>
  );
}
