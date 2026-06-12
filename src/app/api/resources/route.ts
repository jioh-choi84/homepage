import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getResources, mutate } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() { return !!(await cookies()).get(SESSION); }
function reval() { revalidatePath('/resources', 'layout'); }

export async function GET() {
  return NextResponse.json(await getResources());
}
export async function POST(request: NextRequest) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    category: body.category === 'writing' ? 'writing' : 'making',
    title: body.title || '',
    title_en: body.title_en || null,
    content: body.content || '',
    content_en: body.content_en || null,
    thumbnail_url: body.thumbnail_url || null,
    published_at: body.published_at || now,
    created_at: now,
    updated_at: now,
  };
  // CAS: 동시 추가 시 lost-update 방지([id] 수정/삭제와 동일 패턴).
  await mutate<Array<Record<string, unknown>>, void>('resources', (current) => {
    const list = current ? [...current] : [];
    return { next: [...list, item], result: undefined };
  });
  reval();
  return NextResponse.json(item, { status: 201 });
}
