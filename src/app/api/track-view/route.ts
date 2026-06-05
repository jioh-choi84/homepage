import { NextRequest, NextResponse } from 'next/server';
import { recordView } from '@/lib/data';

// 작품/전시 상세 조회 수집(공개). 모달 오픈/항목 노출 시 비콘 호출. 항상 204.
function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview|monitor|pingdom|gtmetrix/i.test(ua);
}

export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (isBot(ua)) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const kind = body.kind === 'exhibition' ? 'exhibition' : body.kind === 'artwork' ? 'artwork' : null;
    const id = typeof body.id === 'string' ? body.id.slice(0, 100) : '';
    if (!kind || !id) return new NextResponse(null, { status: 204 });

    await recordView({
      kind,
      id,
      series: typeof body.series === 'string' ? body.series.slice(0, 120) : null,
      theme: typeof body.theme === 'string' ? body.theme.slice(0, 120) : null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
