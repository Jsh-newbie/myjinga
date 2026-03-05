export default function CareernetApiKeyRequestPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: '48px auto',
        padding: '0 20px',
      }}
    >
      <section
        style={{
          background: 'white',
          border: '1px solid #dde3ee',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 10px 30px rgba(18, 31, 53, 0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 10px', fontSize: 30, lineHeight: 1.3 }}>
          마진가(Myjinga) 커리어넷 API 활용 안내
        </h1>
        <p style={{ margin: '0 0 14px', color: '#5b6475', lineHeight: 1.7 }}>
          본 페이지는 커리어넷 API Key 신청을 위한 서비스 소개 및 활용 목적 안내용으로
          작성되었습니다.
        </p>

        <h2 style={{ margin: '28px 0 10px', fontSize: 20 }}>1. 서비스 소개</h2>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          마진가(Myjinga)는 학생의 진로 탐색, 검사 결과 확인, 과목/전공 정보 탐색을 하나의 흐름으로
          제공하는 웹 기반 서비스입니다.
        </p>

        <h2 style={{ margin: '28px 0 10px', fontSize: 20 }}>2. 커리어넷 API 활용 목적</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>진로심리검사 결과 조회 및 시각화</li>
          <li>직업/학과 관련 공공 데이터 기반 정보 제공</li>
          <li>학생의 진로 탐색 과정에서 신뢰 가능한 공공 데이터 활용</li>
        </ul>

        <h2 style={{ margin: '28px 0 10px', fontSize: 20 }}>3. 데이터 처리 및 보안 원칙</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>API 키는 서버 환경변수로만 저장하며 클라이언트에 노출하지 않습니다.</li>
          <li>외부 API 호출은 서버에서만 수행하고, 필수 범위 내 데이터만 사용합니다.</li>
          <li>민감정보/개인정보는 로그에 기록하지 않으며 최소 수집 원칙을 준수합니다.</li>
        </ul>

        <h2 style={{ margin: '28px 0 10px', fontSize: 20 }}>4. 운영 및 문의</h2>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          담당자: (기입 필요)
          <br />
          이메일: contact@myjinga.com
          <br />
          홈페이지: https://myjinga.com
        </p>

        <p
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #dde3ee',
            fontSize: 14,
            color: '#5b6475',
            lineHeight: 1.7,
          }}
        >
          작성일: 2026-03-05
          <br />
          문서 성격: API Key 신청용 기본 소개 페이지
        </p>
      </section>
    </main>
  );
}
