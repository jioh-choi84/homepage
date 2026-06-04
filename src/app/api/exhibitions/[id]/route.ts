import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getExhibitionById, getExhibitions, updateExhibitions } from '@/lib/data';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exhibition = await getExhibitionById(id);
  if (!exhibition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(exhibition);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const exhibitions = await getExhibitions();
  const idx = exhibitions.findIndex((e: { id: string }) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  exhibitions[idx] = { ...exhibitions[idx], ...body };
  await updateExhibitions(exhibitions);
    revalidatePath('/exhibition', 'layout'); revalidatePath('/cv');
  return NextResponse.json(exhibitions[idx]);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const exhibitions = await getExhibitions();
  const idx = exhibitions.findIndex((e: { id: string }) => e.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  exhibitions[idx] = { ...exhibitions[idx], ...body };
  await updateExhibitions(exhibitions);
    revalidatePath('/exhibition', 'layout'); revalidatePath('/cv');
  return NextResponse.json(exhibitions[idx]);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const exhibitions = await getExhibitions();
  const filtered = exhibitions.filter((e: { id: string }) => e.id !== id);
  if (filtered.length === exhibitions.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await updateExhibitions(filtered);
    revalidatePath('/exhibition', 'layout'); revalidatePath('/cv');
  return NextResponse.json({ success: true });
}
