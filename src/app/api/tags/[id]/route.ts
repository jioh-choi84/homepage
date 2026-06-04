import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTagById, getTags, updateTags } from '@/lib/data';

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
  const tags = await getTags();
  const idx = tags.findIndex((t: { id: string }) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tags[idx] = { ...tags[idx], ...body };
  await updateTags(tags);
  return NextResponse.json(tags[idx]);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const tags = await getTags();
  const filtered = tags.filter((t: { id: string }) => t.id !== id);
  if (filtered.length === tags.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await updateTags(filtered);
  return NextResponse.json({ success: true });
}
