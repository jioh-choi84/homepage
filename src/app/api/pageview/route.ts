import { NextRequest, NextResponse } from 'next/server';
import { recordPageview, recordDwell } from '@/lib/data';

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

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (isBot(ua)) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path : '';

    if (!path.startsWith('/') || path.length > 256) {
      return new NextResponse(null, { status: 204 });
    }
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return new NextResponse(null, { status: 204 });
    }

    // 체류시간 이벤트
    if (body.type === 'dwell') {
      const dwellMs = typeof body.dwellMs === 'number' ? body.dwellMs : 0;
      await recordDwell({ path, dwellMs });
      return new NextResponse(null, { status: 204 });
    }

    // 페이지뷰 이벤트
    const selfHost = request.headers.get('host') || '';
    const referrer = normalizeReferrer(
      typeof body.referrer === 'string' ? body.referrer : '',
      selfHost,
    );
    const country = request.headers.get('x-vercel-ip-country') || 'XX';

    await recordPageview({
      path,
      referrer,
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      newVisit: body.newVisit === true,
      country,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
