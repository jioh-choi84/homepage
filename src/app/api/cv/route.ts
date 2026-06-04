import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getCv, updateCv } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getCv());
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const current = await getCv();
    const updated = { ...current, ...body, id: 'cv', updated_at: new Date().toISOString() };
    await updateCv(updated);
    // CV를 쓰는 공개 페이지 즉시 재검증
    revalidatePath('/cv');
    return NextResponse.json(updated);
  } catch (err) {
    console.error('CV PUT error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
