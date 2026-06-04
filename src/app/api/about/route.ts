import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getAbout, updateAbout } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getAbout());
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const current = await getAbout();
  const updated = { ...current, ...body, updated_at: new Date().toISOString() };
  await updateAbout(updated);
  // 작가소개를 쓰는 공개 페이지를 즉시 재검증 (ISR 캐시 갱신 → 수정 즉시 반영)
  for (const path of ['/', '/contact', '/about']) revalidatePath(path);
  return NextResponse.json(updated);
}
