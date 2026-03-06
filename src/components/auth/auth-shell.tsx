import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  mode,
  children,
}: {
  title: string;
  subtitle: string;
  mode: 'signin' | 'signup';
  children: React.ReactNode;
}) {
  return (
    <main className="container" style={{ padding: '56px 0 72px' }}>
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          background: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        }}
      >
        <Link href="/" style={{ color: '#15803d', fontWeight: 700, fontSize: 14 }}>
          ← 메인으로 돌아가기
        </Link>
        <h1 style={{ margin: '14px 0 8px', fontSize: 34 }}>{title}</h1>
        <p style={{ marginTop: 0, color: '#52525b' }}>{subtitle}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <Link
            href="/auth/signin"
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 12px',
              borderRadius: 12,
              fontWeight: 700,
              border: '1px solid #d4d4d8',
              background: mode === 'signin' ? '#15803d' : 'white',
              color: mode === 'signin' ? 'white' : '#27272a',
            }}
          >
            로그인
          </Link>
          <Link
            href="/auth/signup"
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 12px',
              borderRadius: 12,
              fontWeight: 700,
              border: '1px solid #d4d4d8',
              background: mode === 'signup' ? '#15803d' : 'white',
              color: mode === 'signup' ? 'white' : '#27272a',
            }}
          >
            회원가입
          </Link>
        </div>

        {children}
      </div>
    </main>
  );
}
