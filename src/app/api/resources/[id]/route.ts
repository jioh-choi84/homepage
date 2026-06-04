import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getResources, updateResources } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() { return !!(await cookies()).get(SESSION); }
function reval() { revalidatePath('/resources', 'layout'); }

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const list = await getResources();
  const idx = list.findIndex((r: { id: string }) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  list[idx] = { ...list[idx], ...body, updated_at: new Date().toISOString() };
  await updateResources(list);
  reval();
  return NextResponse.json(list[idx]);
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const list = await getResources();
  const filtered = list.filter((r: { id: string }) => r.id !== id);
  if (filtered.length === list.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await updateResources(filtered);
  reval();
  return NextResponse.json({ success: true });
}
