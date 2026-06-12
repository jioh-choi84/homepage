import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPress, mutate } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getPress());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const newItem = {
      ...body,
      category: body.category === 'broadcast' ? 'broadcast' : 'article',
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    // CAS: 동시 추가 시 lost-update 방지([id] 수정/삭제와 동일 패턴).
    await mutate<Array<Record<string, unknown>>, void>('press', (current) => {
      const press = current ? [...current] : [];
      return { next: [...press, newItem], result: undefined };
    });
    revalidatePath('/press', 'layout');
    return NextResponse.json(newItem, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: `저장 중 오류: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
