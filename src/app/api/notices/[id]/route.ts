import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { updateNotice, deleteNotice } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() {
  return !!(await cookies()).get(SESSION);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const updated = await updateNotice(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidatePath('/');
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await deleteNotice(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
