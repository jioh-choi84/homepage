import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { reclassifyArtworks } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  return !!(await cookies()).get(SESSION_COOKIE_NAME);
}

// 분류값 일괄 이름변경(병합)/삭제 — { field, from, to(null=삭제) }
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { field, from, to } = await request.json();
    if (!field || typeof from !== 'string' || !from.trim()) {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
    }
    const result = await reclassifyArtworks(field, from, to ?? null);
    revalidatePath('/');
    revalidatePath('/works', 'layout');
    return NextResponse.json(result);
  } catch (err) {
    console.error('reclassify error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '실패' }, { status: 400 });
  }
}
