import { NextRequest, NextResponse } from 'next/server';
import { recordPageview } from '@/lib/data';

// 공개(비보호) 페이지뷰 수집 엔드포인트. 클라이언트 비콘(PageViewTracker)이 호출.
// 실패해도 방문자 경험에 영향이 없도록 항상 조용히 204를 반환한다.

function parseDevice(ua: string): string {
  return /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua) ? 'mobile' : 'desktop';
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Other';
}

function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview|monitor|pingdom|gtmetrix/i.test(ua);
}

// document.referrer → 외부 호스트명. 비었거나 자기 사이트면 'direct'.
function normalizeReferrer(referrer: string, selfHost: string): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    const self = selfHost.replace(/^www\./, '').split(':')[0];
    if (!host || host === self) return 'direct';
    return host;
  } catch {
    return 'direct';
  }
}

// 검색엔진 referrer host 판별 → 검색엔진명(아니면 null). 검색어 자체는 외부에서 수집 불가.
function detectSearchEngine(host: string): string | null {
  if (!host || host === 'direct') return null;
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/(^|\.)naver\./.test(host)) return 'naver';
  if (/(^|\.)daum\./.test(host)) return 'daum';
  if (/(^|\.)bing\./.test(host)) return 'bing';
  if (/(^|\.)yahoo\./.test(host)) return 'yahoo';
  if (/duckduckgo\./.test(host)) return 'duckduckgo';
  if (/(^|\.)yandex\./.test(host)) return 'yandex';
  if (/(^|\.)baidu\./.test(host)) return 'baidu';
  if (/(^|\.)search\./.test(host)) return '기타검색';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (isBot(ua)) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : '';

    // 유효성: '/'로 시작, 길이 제한, 관리자/내부 경로 제외
    if (!path.startsWith('/') || path.length > 256) {
      return new NextResponse(null, { status: 204 });
    }
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return new NextResponse(null, { status: 204 });
    }

    const selfHost = request.headers.get('host') || '';
    const refHost = normalizeReferrer(
      typeof body.referrer === 'string' ? body.referrer : '',
      selfHost,
    );
    const search = detectSearchEngine(refHost);
    // 국가코드: Vercel 런타임에서만 채워짐(로컬은 없음 → 'ZZ')
    const country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase() || 'ZZ';
    const dwellMs = typeof body.dwellMs === 'number' && isFinite(body.dwellMs) ? body.dwellMs : undefined;
    const dwellOnly = body.dwellOnly === true;

    await recordPageview({
      path,
      referrer: refHost,
      search,
      country,
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      newVisit: body.newVisit === true,
      dwellMs,
      dwellOnly,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // 집계 실패는 조용히 무시
    return new NextResponse(null, { status: 204 });
  }
}
