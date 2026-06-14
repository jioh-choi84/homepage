import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getPortfolio, addArtwork } from '@/lib/data';

// 작품 변경 시 재검증할 공개 경로
function revalidatePortfolioPaths() {
  for (const p of ['/', '/portfolio']) revalidatePath(p);
}

const SESSION_COOKIE_NAME = 'admin_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const minimal = searchParams.get('minimal') === 'true';
  const fresh = searchParams.get('fresh') === '1';

  let artworks = await getPortfolio(fresh);

  if (minimal) {
    artworks = artworks.map((a: Record<string, unknown>) => ({
      id: a.id, title: a.title, title_en: a.title_en, year: a.year,
      image_url: a.image_url, thumbnail_url: a.thumbnail_url,
      is_featured: a.is_featured,
      order: a.order, category_id: a.category_id,
    }));
  }

  const headers = new Headers();
  // 신선 요청(관리자)은 캐시 금지, 공개 조회는 짧게 CDN 캐시
  headers.set('Cache-Control', fresh ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300');

  return NextResponse.json(artworks, { headers });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const artwork = await addArtwork(body);
    revalidatePortfolioPaths();
    return NextResponse.json(artwork, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'DUPLICATE') {
      return NextResponse.json({ error: '이미 동일한 작품(제목·연도·크기)이 있습니다.' }, { status: 409 });
    }
    console.error('Artwork POST error:', err);
    return NextResponse.json({ error: `Invalid request: ${message}` }, { status: 400 });
  }
}
