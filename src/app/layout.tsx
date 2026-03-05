import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '마진가(Myjinga) | 진로 탐색과 학생부 관리를 하나로',
  description:
    '중·고등학생을 위한 진로 탐색 및 AI 학생부 기록 지원 플랫폼. 커리어넷 연동 진단부터 고교학점제 과목 설계까지 원스톱으로 제공합니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
