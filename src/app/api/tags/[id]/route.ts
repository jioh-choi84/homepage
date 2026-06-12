import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTagById, mutate } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tag = await getTagById(id);
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tag);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  // CAS: 동시 수정/삭제에도 ifMatch 재시도로 lost-update가 없다.
  const updated = await mutate<Array<{ id: string }>, { id: string } | null>('tags', (current) => {
    const tags = current ? [...current] : [];
    const idx = tags.findIndex((t) => t.id === id);
    if (idx === -1) return { result: null };
    tags[idx] = { ...tags[idx], ...body };
    return { next: tags, result: tags[idx] };
  });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await mutate<Array<{ id: string }>, boolean>('tags', (current) => {
    const tags = current ?? [];
    const filtered = tags.filter((t) => t.id !== id);
    if (filtered.length === tags.length) return { result: false };
    return { next: filtered, result: true };
  });
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
