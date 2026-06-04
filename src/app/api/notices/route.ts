import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getNotices, addNotice } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() {
  return !!(await cookies()).get(SESSION);
}

export async function GET() {
  return NextResponse.json(await getNotices());
}

export async function POST(request: NextRequest) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const created = await addNotice(body);
    revalidatePath('/');
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Notice POST error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 400 });
  }
}
