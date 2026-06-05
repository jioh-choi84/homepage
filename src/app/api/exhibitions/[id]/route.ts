import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getExhibitionById, mutate } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

function revalidate() {
  revalidatePath('/exhibition', 'layout');
  revalidatePath('/cv');
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exhibition = await getExhibitionById(id);
  if (!exhibition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(exhibition);
}

// CAS read-modify-write로 동시 수정 lost-update 방지.
async function applyUpdate(request: NextRequest, params: Promise<{ id: string }>) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const updated = await mutate<Array<{ id: string }>, { id: string } | null>('exhibitions', (current) => {
    const list = current ? [...current] : [];
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return { result: null };
    list[idx] = { ...list[idx], ...body };
    return { next: list, result: list[idx] };
  });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidate();
  return NextResponse.json(updated);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return applyUpdate(request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return applyUpdate(request, params);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await mutate<Array<{ id: string }>, boolean>('exhibitions', (current) => {
    const list = current ?? [];
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return { result: false };
    return { next: filtered, result: true };
  });
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidate();
  return NextResponse.json({ success: true });
}
