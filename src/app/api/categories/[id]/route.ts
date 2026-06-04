import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCategoryById, getCategories, updateCategories } from '@/lib/data';

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
  const categories = await getCategories();
  const idx = categories.findIndex((c: { id: string }) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  categories[idx] = { ...categories[idx], ...body, updated_at: new Date().toISOString() };
  await updateCategories(categories);
  return NextResponse.json(categories[idx]);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const categories = await getCategories();
  const filtered = categories.filter((c: { id: string }) => c.id !== id);
  if (filtered.length === categories.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await updateCategories(filtered);
  return NextResponse.json({ success: true });
}
