import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCategoryById, mutate } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(category);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  // CAS: 동시 수정/삭제에도 ifMatch 재시도로 lost-update가 없다.
  const updated = await mutate<Array<{ id: string }>, { id: string } | null>('categories', (current) => {
    const categories = current ? [...current] : [];
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) return { result: null };
    categories[idx] = { ...categories[idx], ...body, updated_at: new Date().toISOString() };
    return { next: categories, result: categories[idx] };
  });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await mutate<Array<{ id: string }>, boolean>('categories', (current) => {
    const categories = current ?? [];
    const filtered = categories.filter((c) => c.id !== id);
    if (filtered.length === categories.length) return { result: false };
    return { next: filtered, result: true };
  });
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
