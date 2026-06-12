import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTags, addTag } from '@/lib/data';

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
  // CAS(addTag) 사용 — 동시 추가 시 태그 유실(lost-update) 방지.
  const newTag = await addTag(body);
  return NextResponse.json(newTag, { status: 201 });
}
