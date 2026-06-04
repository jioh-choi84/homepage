import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getWorkFolders, updateWorkFolders } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 폴더 메타데이터(라벨/순서/숨김/슬러그) 조회·저장. 관리자 전용.
export async function GET() {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getWorkFolders());
}

export async function PUT(request: NextRequest) {
  if (!(await isAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Array expected' }, { status: 400 });
    await updateWorkFolders(body);
    revalidatePath('/works', 'layout');
    return NextResponse.json(body);
  } catch (err) {
    console.error('work-folders PUT error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
