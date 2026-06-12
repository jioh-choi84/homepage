import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCategories, mutate } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

export async function GET() {
  return NextResponse.json(await getCategories());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const now = new Date().toISOString();
  const newCat = { ...body, id: crypto.randomUUID(), created_at: now, updated_at: now };
  // CAS: 동시 추가 시 lost-update 방지.
  await mutate<Array<Record<string, unknown>>, void>('categories', (current) => {
    const categories = current ? [...current] : [];
    return { next: [...categories, newCat], result: undefined };
  });
  return NextResponse.json(newCat, { status: 201 });
}
