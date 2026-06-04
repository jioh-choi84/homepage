import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPortfolio, updateArtwork } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session;
}

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const artworks = await getPortfolio();
    // dominant_color가 없는 작품만 분석
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missing = artworks.filter((a: any) => !a.dominant_color && a.image_url);
    
    let updated = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const artwork of missing as any[]) {
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        // 내부 API 호출로 색상 분석
        const cookieStore = await cookies();
        const session = cookieStore.get(SESSION_COOKIE_NAME);
        
        const res = await fetch(`${baseUrl}/api/portfolio/analyze-color`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `${SESSION_COOKIE_NAME}=${session?.value}`,
          },
          body: JSON.stringify({ image_url: artwork.image_url }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.dominant_color) {
            await updateArtwork(artwork.id, { dominant_color: data.dominant_color });
            updated++;
          }
        }
      } catch (err) {
        console.error(`Color analysis failed for ${artwork.id}:`, err);
      }
    }
    
    return NextResponse.json({ 
      total: artworks.length, 
      missing: missing.length, 
      updated 
    });
  } catch (err) {
    console.error('Batch color analysis error:', err);
    return NextResponse.json({ error: 'Batch analysis failed' }, { status: 500 });
  }
}
