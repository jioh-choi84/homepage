import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPress, updatePress } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

async function update(request: NextRequest, id: string) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const list = await getPress();
    const idx = list.findIndex((n: { id: string }) => n.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    list[idx] = { ...list[idx], ...body, updated_at: new Date().toISOString() };
    await updatePress(list);
    revalidatePath('/press', 'layout');
    return NextResponse.json(list[idx]);
  } catch (e) {
    return NextResponse.json(
      { error: `저장 중 오류: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return update(request, id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return update(request, id);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const list = await getPress();
  const filtered = list.filter((n: { id: string }) => n.id !== id);
  if (filtered.length === list.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await updatePress(filtered);
  revalidatePath('/press', 'layout');
  return NextResponse.json({ success: true });
}
