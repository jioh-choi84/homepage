import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { mutate } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() { return !!(await cookies()).get(SESSION); }
function reval() { revalidatePath('/resources', 'layout'); }

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const updated = await mutate<Array<{ id: string }>, { id: string } | null>('resources', (current) => {
    const list = current ? [...current] : [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return { result: null };
    list[idx] = { ...list[idx], ...body, updated_at: new Date().toISOString() };
    return { next: list, result: list[idx] };
  });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  reval();
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await mutate<Array<{ id: string }>, boolean>('resources', (current) => {
    const list = current ?? [];
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length === list.length) return { result: false };
    return { next: filtered, result: true };
  });
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  reval();
  return NextResponse.json({ success: true });
}
