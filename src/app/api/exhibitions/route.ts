import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getExhibitions, mutate } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getExhibitions());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const newExh = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  // CAS: 동시 추가 시 lost-update 방지([id] 수정/삭제와 동일 패턴).
  await mutate<Array<Record<string, unknown>>, void>('exhibitions', (current) => {
    const exhibitions = current ? [...current] : [];
    return { next: [...exhibitions, newExh], result: undefined };
  });
  revalidatePath('/exhibition', 'layout'); revalidatePath('/cv');
  return NextResponse.json(newExh, { status: 201 });
}
