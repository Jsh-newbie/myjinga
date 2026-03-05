export function LandingPage() {
  return (
    <main>
      <section
        style={{
          padding: '72px 0 48px',
          background:
            'radial-gradient(circle at 15% 10%, #dcfce7 0%, transparent 40%), radial-gradient(circle at 85% 90%, #fef3c7 0%, transparent 40%)',
        }}
      >
        <div className="container">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 24 }}>myjinga</strong>
            <nav style={{ display: 'flex', gap: 24, fontWeight: 600 }}>
              <a href="#features">핵심 기능</a>
              <a href="#how">사용 흐름</a>
              <a href="#pricing">요금 안내</a>
            </nav>
          </header>
          <div style={{ textAlign: 'center', padding: '64px 0 28px' }}>
            <p style={{ color: '#15803d', fontWeight: 700 }}>고교학점제 완벽 대비 진로·학습 플랫폼</p>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1.15, margin: '18px 0' }}>
              막막한 과목 선택부터
              <br />
              <span className="gradientText">AI 세특 기록</span>까지 한 번에.
            </h1>
            <p style={{ color: '#3f3f46', fontSize: 19 }}>
              커리어넷 진단 기반의 맞춤형 전공 설계와 2026 기재요령 반영 보조 기능으로 학생부 준비를
              돕습니다.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <a
                href="#pricing"
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: '#15803d',
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                지금 무료로 진단하기
              </a>
              <a
                href="#features"
                style={{
                  padding: '12px 20px',
                  borderRadius: 12,
                  border: '1px solid #d4d4d8',
                  fontWeight: 600,
                  background: 'white',
                }}
              >
                서비스 둘러보기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container" style={{ padding: '56px 0' }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>학교 생활과 진로 준비를 따로 하지 마세요.</h2>
        <p style={{ color: '#52525b', fontSize: 18, marginBottom: 24 }}>
          진단, 과목 설계, 기록 관리를 하나의 사용자 흐름으로 제공합니다.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <article style={{ border: '1px solid #e4e4e7', borderRadius: 16, padding: 18, background: 'white' }}>
            <h3>커리어넷 연동</h3>
            <p>직업흥미/적성 검사 결과를 저장하고 시각화합니다.</p>
          </article>
          <article style={{ border: '1px solid #e4e4e7', borderRadius: 16, padding: 18, background: 'white' }}>
            <h3>과목/전공 탐색</h3>
            <p>고교학점제 기준으로 진로 맞춤 과목 설계를 지원합니다.</p>
          </article>
          <article style={{ border: '1px solid #e4e4e7', borderRadius: 16, padding: 18, background: 'white' }}>
            <h3>학생부 기록 관리</h3>
            <p>세부능력특기사항 작성을 위한 구조화된 기록 도구를 제공합니다.</p>
          </article>
        </div>
      </section>

      <section id="how" style={{ background: 'white', padding: '56px 0', borderTop: '1px solid #f1f5f9' }}>
        <div className="container">
          <h2 style={{ fontSize: 32, marginBottom: 24 }}>사용 흐름</h2>
          <ol style={{ lineHeight: 1.9, color: '#3f3f46', paddingLeft: 20 }}>
            <li>회원가입 후 기본 학년/관심 분야 설정</li>
            <li>커리어넷 검사 수행 및 결과 저장</li>
            <li>추천 과목 확인 후 학생부 기록 작성</li>
          </ol>
        </div>
      </section>

      <section id="pricing" className="container" style={{ padding: '56px 0 80px' }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>요금 안내</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <article style={{ border: '1px solid #d4d4d8', borderRadius: 16, padding: 18 }}>
            <h3>Free</h3>
            <p>기본 진단/기록 기능</p>
          </article>
          <article style={{ border: '2px solid #22c55e', borderRadius: 16, padding: 18, background: '#f7fee7' }}>
            <h3>Premium</h3>
            <p>AI 보조 작성, 심화 추천 기능</p>
          </article>
        </div>
      </section>
    </main>
  );
}
