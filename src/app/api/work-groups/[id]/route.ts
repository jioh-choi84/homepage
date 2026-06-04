import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { updateWorkGroup, deleteWorkGroup } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() {
  return !!(await cookies()).get(SESSION);
}
function revalidateWorks() {
  revalidatePath('/works', 'layout');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  // 잠금 안에서 신선하게 읽어 병합 → 다른 묶음 덮어쓰기 방지
  const updated = await updateWorkGroup(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidateWorks();
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await deleteWorkGroup(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  revalidateWorks();
  return NextResponse.json({ success: true });
}
