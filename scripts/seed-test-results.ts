/**
 * 사용자에 대해 5종 검사를 커리어넷 API에 실제 제출하고
 * Firestore에 결과를 저장하는 시드 스크립트
 *
 * 실행: npx tsx scripts/seed-test-results.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 수동 로드
const envPath = resolve(import.meta.dirname ?? __dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// mock 모드 강제 해제
delete process.env.CAREERNET_USE_MOCK;

const API_KEY = process.env.CAREERNET_API_KEY!;
if (!API_KEY) {
  console.error('CAREERNET_API_KEY not found in .env.local');
  process.exit(1);
}

// Firebase Admin 초기화 (.env.local 환경변수 사용)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Firebase Admin 환경변수가 필요합니다 (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const databaseId = process.env.FIRESTORE_DATABASE_ID;
const db = databaseId ? getFirestore(undefined!, databaseId) : getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const UID = 'YmfVK301OgaMh6xujmgQFiOfU503';

// --- 검사 정의 ---

interface TestConfig {
  id: string;
  name: string;
  apiVersion: 'v1' | 'v2';
  qestrnSeq: string;
  trgetSe: string;
}

const TESTS: TestConfig[] = [
  { id: 'interest', name: '직업흥미검사(H)', apiVersion: 'v2', qestrnSeq: '33', trgetSe: '100206' },
];

// --- 문항 조회 ---

interface QuestionChoice {
  value: string;
  label: string;
}

interface Question {
  no: number;
  choices: QuestionChoice[];
}

async function fetchV1Questions(qestrnSeq: string): Promise<Question[]> {
  const url = `https://www.career.go.kr/inspct/openapi/test/questions?apikey=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(qestrnSeq)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json() as { SUCC_YN: string; RESULT: Record<string, string>[] };

  if (data.SUCC_YN !== 'Y') throw new Error(`V1 questions failed for seq=${qestrnSeq}`);

  return data.RESULT.map((item: Record<string, string>, idx: number) => {
    const choices: QuestionChoice[] = [];
    for (let i = 1; i <= 10; i++) {
      const label = item[`answer${String(i).padStart(2, '0')}`];
      const value = item[`answerScore${String(i).padStart(2, '0')}`];
      if (label && value) choices.push({ value, label });
    }
    return { no: idx + 1, choices };
  });
}

async function fetchV2Questions(qestrnSeq: string): Promise<Question[]> {
  const url = `https://www.career.go.kr/inspct/openapi/v2/test?apikey=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(qestrnSeq)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json() as { success: string; result: { questions: Array<{ no: string; choices: Array<{ val: string; text: string }> }> } };

  if (data.success !== 'Y') throw new Error(`V2 questions failed for seq=${qestrnSeq}`);

  return data.result.questions.map((q) => ({
    no: Number(q.no),
    choices: q.choices.map((c) => ({ value: c.val, label: c.text })),
  }));
}

// --- 임의 답변 생성 ---

function generateRandomAnswers(questions: Question[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of questions) {
    if (q.choices.length === 0) {
      // 선택지가 없는 문항은 기본값 사용
      answers[String(q.no)] = '1';
      continue;
    }
    const randomChoice = q.choices[Math.floor(Math.random() * q.choices.length)];
    answers[String(q.no)] = randomChoice.value;
  }
  return answers;
}

// --- 결과 제출 ---

interface V1ReportResult { SUCC_YN: string; RESULT: { inspctSeq: number; url: string }; ERROR_REASON?: string }
interface V2ReportResult { success: string; result: { inspct: { inspctseq: string; reporturl: string } }; message?: string }

async function submitV1(test: TestConfig, answers: Record<string, string>): Promise<{ inspctSeq: string; resultUrl: string }> {
  const answerStr = Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => `${no}=${val}`)
    .join(' ');

  const body = {
    apikey: API_KEY,
    qestrnSeq: test.qestrnSeq,
    trgetSe: test.trgetSe,
    name: '지성현',
    gender: '100323',
    school: '',
    grade: '1',
    email: '',
    startDtm: Date.now() - 600000,
    answers: answerStr,
  };

  const res = await fetch('https://www.career.go.kr/inspct/openapi/test/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.json() as V1ReportResult;
  if (raw.SUCC_YN !== 'Y') throw new Error(`V1 report failed: ${raw.ERROR_REASON}`);

  return { inspctSeq: String(raw.RESULT.inspctSeq), resultUrl: raw.RESULT.url };
}

async function submitV2(test: TestConfig, answers: Record<string, string>): Promise<{ inspctSeq: string; resultUrl: string }> {
  const answersArray = Object.entries(answers)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([no, val]) => ({ no, val }));

  const body = {
    apikey: API_KEY,
    qno: Number(test.qestrnSeq),
    trgetse: test.trgetSe,
    gender: '100323',
    grade: '1',
    startdtm: Date.now() - 600000,
    school: '',
    answers: answersArray,
  };

  console.log(`  -> V2 request body (first 300): ${JSON.stringify(body).slice(0, 300)}`);
  const res = await fetch('https://www.career.go.kr/inspct/openapi/v2/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log(`  -> V2 response: ${rawText.slice(0, 200)}`);
  const raw = JSON.parse(rawText) as V2ReportResult;
  if (raw.success !== 'Y') throw new Error(`V2 report failed: ${raw.message ?? JSON.stringify(raw)}`);

  return { inspctSeq: raw.result.inspct.inspctseq, resultUrl: raw.result.inspct.reporturl };
}

// --- 결과 상세 fetch ---

async function fetchReportDetail(resultUrl: string) {
  const url = new URL(resultUrl);
  const seq = url.searchParams.get('seq');
  if (!seq) return null;

  const BASE = 'https://www.career.go.kr/cloud';

  try {
    const reportRes = await fetch(`${BASE}/api/inspect/report?seq=${encodeURIComponent(seq)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!reportRes.ok) return null;
    const raw = await reportRes.json() as Record<string, unknown>;

    const [realmMetaRaw, recommendRaw] = await Promise.all([
      fetch(`${BASE}/data/report${raw.qestnrseq}.json`, { headers: { Accept: 'application/json' } })
        .then(r => r.ok ? r.json() : null).catch(() => null) as Promise<{ realms?: Array<{ code: string; name: string; desc: string }> } | null>,
      fetch(`${BASE}/api/inspect/recommendClassificationList?seq=${encodeURIComponent(seq)}`, { headers: { Accept: 'application/json' } })
        .then(r => r.ok ? r.json() : null).catch(() => null) as Promise<{ jobList?: Array<{ job_nm: string; job_cd: number; work: string }>; departContents?: Array<{ major_nm: string; seq: number; major_sumry: string }> } | null>,
    ]);

    const realms = [];
    for (let i = 1; i <= 11; i++) {
      const name = raw[`realm${i}nm`] as string | undefined;
      const percentile = raw[`w${i}`] as number | undefined;
      if (name && percentile != null) {
        realms.push({
          rank: i,
          code: (raw[`realm${i}`] as string) ?? '',
          name,
          rawScore: (raw[`score${i}`] as number) ?? 0,
          percentile,
          tScore: (raw[`t${i}`] as number) ?? 0,
        });
      }
    }

    return {
      inspctSeq: raw.inspctseq,
      testCode: raw.qestnrseq,
      gender: raw.gender,
      target: raw.target,
      grade: raw.grade,
      completedAt: raw.comptdtm,
      responseTime: raw.restime,
      realms,
      ...(realmMetaRaw?.realms && {
        realmMeta: realmMetaRaw.realms.map(r => ({ code: r.code, name: r.name, description: r.desc })),
      }),
      ...(recommendRaw?.jobList && {
        recommendedJobs: recommendRaw.jobList.map(j => ({ name: j.job_nm, code: j.job_cd, description: j.work })),
      }),
      ...(recommendRaw?.departContents && {
        recommendedMajors: recommendRaw.departContents.map(d => ({ name: d.major_nm, seq: d.seq, summary: d.major_sumry })),
      }),
    };
  } catch {
    return null;
  }
}

// --- Firestore 저장 ---

async function saveToFirestore(
  test: TestConfig,
  answers: Record<string, string>,
  result: { inspctSeq: string; resultUrl: string },
  reportDetail: unknown
) {
  const ref = db.collection('users').doc(UID).collection('testResults').doc();

  const answerPayload = test.apiVersion === 'v2'
    ? {
        format: 'v2',
        raw: Object.entries(answers).sort(([a], [b]) => Number(a) - Number(b)).map(([no, val]) => ({ no, val })),
      }
    : {
        format: 'v1',
        raw: Object.entries(answers).sort(([a], [b]) => Number(a) - Number(b)).map(([no, val]) => `${no}=${val}`).join(' '),
      };

  await ref.set({
    testTypeId: test.id,
    qestrnSeq: test.qestrnSeq,
    trgetSe: test.trgetSe,
    inspctSeq: result.inspctSeq,
    resultUrl: result.resultUrl,
    answerPayload,
    ...(reportDetail ? { reportDetail: reportDetail as Record<string, unknown> } : {}),
    completedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

// --- Main ---

async function main() {
  console.log(`\nSeed test results for user: ${UID}\n`);

  for (const test of TESTS) {
    try {
      console.log(`[${test.id}] ${test.name} - 문항 조회 중...`);

      const questions = test.apiVersion === 'v2'
        ? await fetchV2Questions(test.qestrnSeq)
        : await fetchV1Questions(test.qestrnSeq);

      console.log(`  -> ${questions.length}개 문항 조회 완료`);

      const answers = generateRandomAnswers(questions);

      // V2(interest)는 146개 문항 필요, 132~136은 텍스트 답변
      if (test.apiVersion === 'v2') {
        for (let i = 1; i <= 146; i++) {
          if (!answers[String(i)]) {
            if (i >= 132 && i <= 136) {
              answers[String(i)] = '-'; // 텍스트 문항: 빈 값 대신 placeholder
            } else {
              answers[String(i)] = '3';
            }
          }
        }
        // 132~136 직접 설정 (텍스트 입력 문항 - 매뉴얼 예시 참조)
        answers['132'] = '-';
        answers['133'] = '소프트웨어개발자';
        answers['134'] = '교사';
        answers['135'] = '수학,과학';
        answers['136'] = '음악,미술';
        console.log(`  -> 임의 답변 생성 완료 (${Object.keys(answers).length}개, 146개까지 패딩)`);
      } else {
        console.log(`  -> 임의 답변 생성 완료`);
      }

      console.log(`  -> 커리어넷에 제출 중...`);
      const result = test.apiVersion === 'v2'
        ? await submitV2(test, answers)
        : await submitV1(test, answers);

      console.log(`  -> 제출 완료! inspctSeq=${result.inspctSeq}`);
      console.log(`  -> 결과 URL: ${result.resultUrl}`);

      // 잠시 대기 후 결과 상세 fetch
      await new Promise(r => setTimeout(r, 2000));
      console.log(`  -> 결과 상세 데이터 가져오는 중...`);
      const reportDetail = await fetchReportDetail(result.resultUrl);

      console.log(`  -> Firestore에 저장 중...`);
      const docId = await saveToFirestore(test, answers, result, reportDetail);
      console.log(`  -> 저장 완료! docId=${docId}`);
      console.log(`  -> reportDetail: ${reportDetail ? 'OK' : 'null (나중에 lazy fetch)'}`);
      console.log('');

      // API rate limit 방지
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[${test.id}] 실패:`, err);
      console.log('');
    }
  }

  console.log('완료!');
  process.exit(0);
}

main();
