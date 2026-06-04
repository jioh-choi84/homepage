import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

const MAX_LEN = 6000;
const MODEL = 'gemini-2.5-flash';

const SYSTEM = [
  '당신은 한국 화가(지오 최/최현주)의 포트폴리오 웹사이트 콘텐츠를 한국어에서 영어로 번역합니다.',
  '톤: 자연스럽고 단정하며 적당히 격식 있는 표준 영어. 과한 미사여구나 학술적·난해한 문체는 피합니다.',
  '고유명사(갤러리·기관·인명·지명)는 통용되는 영문 표기를 우선합니다.',
  '제목·매체·지명처럼 짧은 항목은 간결한 표준 표기로 옮깁니다.',
  '원문의 의미와 줄바꿈 구조를 보존하고, 번역문 외에 설명·따옴표·접두어를 덧붙이지 않습니다.',
].join(' ');

type Item = { id: string; text: string };

// 여러 항목을 한 번의 호출로 번역. 실패 시 빈 결과.
async function translateBatch(items: Item[]): Promise<Record<string, string>> {
  const payload = items.map((it) => ({ id: it.id, ko: it.text }));
  const prompt = [
    '다음 JSON 배열의 각 항목 ko를 영어로 번역하세요.',
    '반드시 같은 길이의 JSON 배열만 출력하세요. 형식: [{"id":"...","en":"..."}]',
    '코드펜스(```)나 다른 텍스트 없이 순수 JSON만 출력합니다.',
    '',
    JSON.stringify(payload),
  ].join('\n');

  const { text } = await generateText({
    model: google(MODEL),
    system: SYSTEM,
    prompt,
    temperature: 0.3,
    // 무료 티어 분당 한도 소진을 막기 위해 재시도 최소화(각 재시도도 요청을 소비).
    maxRetries: 2,
    // 단순 번역에는 thinking 불필요 — 끄면 더 빠르고 토큰 절약
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
  });

  // 코드펜스/잡텍스트가 섞여도 첫 JSON 배열을 추출
  const raw = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  const jsonStr = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  const parsed = JSON.parse(jsonStr) as { id: string; en: string }[];
  const out: Record<string, string> = {};
  for (const row of parsed) {
    if (row && typeof row.id === 'string' && typeof row.en === 'string') {
      out[row.id] = row.en.trim();
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: '번역 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' },
      { status: 503 }
    );
  }

  let items: Item[];
  try {
    const body = await request.json();
    items = Array.isArray(body?.items) ? body.items : [];
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  // 정제: 빈 텍스트 제외, 길이 제한
  const clean = items
    .filter((it) => it && typeof it.id === 'string' && typeof it.text === 'string' && it.text.trim())
    .map((it) => ({ id: it.id, text: it.text.slice(0, MAX_LEN) }));

  if (clean.length === 0) {
    return NextResponse.json({ translations: [] });
  }

  try {
    let map = await translateBatch(clean);
    // 일부 항목이 누락되면 누락분만 1회 개별 재시도
    const missing = clean.filter((it) => !(it.id in map));
    if (missing.length > 0) {
      const retry = await translateBatch(missing);
      map = { ...map, ...retry };
    }
    const translations = clean
      .filter((it) => it.id in map)
      .map((it) => ({ id: it.id, text: map[it.id] }));
    return NextResponse.json({ translations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const quota = /quota|rate.?limit|exceeded|429|too many/i.test(msg);
    return NextResponse.json(
      {
        error: quota
          ? 'AI 무료 사용량(분당 한도)을 초과했습니다. 1~2분 후 다시 시도해 주세요.'
          : `번역에 실패했습니다: ${msg}`,
      },
      { status: quota ? 429 : 502 }
    );
  }
}
