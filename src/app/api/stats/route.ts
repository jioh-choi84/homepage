import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStats, resetStats } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 관리자 전용 통계 조회/초기화
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getStats());
}

export async function DELETE() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const fresh = await resetStats();
    return NextResponse.json(fresh);
  } catch (err) {
    console.error('Stats reset error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Reset failed' }, { status: 500 });
  }
}
