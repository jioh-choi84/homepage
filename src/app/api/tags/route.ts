import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTags, updateTags } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getTags());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const tags = await getTags();
  const newTag = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  tags.push(newTag);
  await updateTags(tags);
  return NextResponse.json(newTag, { status: 201 });
}
