/**
 * 내부 답변 저장 형태(Record<string, string>)를 커리어넷 제출 형식으로 변환
 */

/**
 * V1 형식: "1=5 2=3 3=7 4=1 ..."
 * 키를 숫자 정렬 후 "번호=값" 공백 구분
 */
export function toV1AnswerString(answers: Record<string, string>): string {
  return Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => `${no}=${val}`)
    .join(' ');
}

/**
 * V2 형식: [{no: "1", val: "5"}, {no: "2", val: "3"}, ...]
 * 키를 숫자 정렬 후 객체 배열
 */
export function toV2AnswerArray(answers: Record<string, string>): Array<{ no: string; val: string }> {
  return Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => ({ no, val }));
}
