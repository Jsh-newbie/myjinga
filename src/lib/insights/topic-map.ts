const TOPIC_MAP: Record<string, string[]> = {
  간호사: ['의료', '간호', '보건', '헬스케어', '생명과학'],
  의사: ['의료', '보건', '의학', '헬스케어', '생명과학'],
  교사: ['교육', '수업', '학습', '청소년', '학교'],
  개발자: ['AI', '소프트웨어', '데이터', '프로그래밍', '기술'],
  프로그래머: ['AI', '소프트웨어', '데이터', '프로그래밍', '기술'],
  디자이너: ['디자인', '브랜딩', '사용자경험', '콘텐츠', '창작'],
  심리상담사: ['심리', '상담', '청소년', '정신건강', '복지'],
  사회복지사: ['복지', '청소년', '지역사회', '돌봄', '정책'],
  기자: ['미디어', '콘텐츠', '사회이슈', '저널리즘', '커뮤니케이션'],
  기계공학과: ['로봇', '제조', '공학', '에너지', '자동화'],
  컴퓨터공학과: ['AI', '소프트웨어', '데이터', '보안', '프로그래밍'],
  의생명공학과: ['생명과학', '의료', '바이오', '헬스케어', '공학'],
  간호학과: ['간호', '의료', '보건', '생명과학', '헬스케어'],
  경영학과: ['경영', '경제', '마케팅', '기업', '창업'],
  심리학과: ['심리', '행동', '상담', '청소년', '연구'],
  교육학과: ['교육', '학습', '교수법', '청소년', '학교'],
  미디어커뮤니케이션학과: ['미디어', '콘텐츠', '광고', '커뮤니케이션', '브랜딩'],
};

export function expandInsightKeywords(input: string[]): string[] {
  const unique = new Set<string>();

  input
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      unique.add(value);

      for (const related of TOPIC_MAP[value] ?? []) {
        unique.add(related);
      }
    });

  return [...unique];
}

export function findInsightMatches(source: string, keywords: string[]) {
  const lower = source.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}
