import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCategories, updateCategories } from '@/lib/data';

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
  const categories = await getCategories();
  const newCat = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  categories.push(newCat);
  await updateCategories(categories);
  return NextResponse.json(newCat, { status: 201 });
}
