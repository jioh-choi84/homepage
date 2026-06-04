import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getWorkGroups, addWorkGroup } from '@/lib/data';

const SESSION = 'admin_session';
async function isAuth() {
  return !!(await cookies()).get(SESSION);
}
function revalidateWorks() {
  revalidatePath('/works', 'layout');
}

export async function GET() {
  return NextResponse.json(await getWorkGroups());
}

export async function POST(request: NextRequest) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    // 잠금 안에서 신선한 목록을 읽어 추가 → 직전에 만든 묶음이 사라지는 문제 방지
    const newGroup = await addWorkGroup(body);
    revalidateWorks();
    return NextResponse.json(newGroup, { status: 201 });
  } catch (err) {
    console.error('WorkGroup POST error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
