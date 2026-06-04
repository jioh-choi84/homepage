import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminSettings, updateAdminSettings } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 비밀번호 해시는 노출하지 않는다 — 로그인 힌트만 반환(로그인 페이지는 비인증 접근).
export async function GET() {
  const settings = await getAdminSettings().catch(() => null);
  return NextResponse.json({ password_hint: settings?.password_hint ?? '' });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { current_password, new_password, password_hint } = await request.json();
    const settings = (await getAdminSettings().catch(() => ({}))) || {};

    // 현재 비밀번호 검증: 저장된 해시 우선, 없으면(첫 설정/이전 데이터) 환경변수 ADMIN_PASSWORD.
    const bcrypt = await import('bcryptjs');
    let ok = false;
    if (settings.password_hash) {
      ok = await bcrypt.compare(current_password ?? '', settings.password_hash);
    } else if (process.env.ADMIN_PASSWORD) {
      ok = (current_password ?? '') === process.env.ADMIN_PASSWORD;
    }
    if (!ok) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다' }, { status: 401 });
    }

    // 기존 설정을 병합해 보존하고, 평문 비밀번호는 절대 저장하지 않는다.
    const updated: Record<string, unknown> = { ...settings, id: 'admin_settings' };
    delete updated.current_password;
    delete updated.new_password;

    if (new_password !== undefined && new_password !== '') {
      if (typeof new_password !== 'string' || new_password.length < 4) {
        return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다' }, { status: 400 });
      }
      updated.password_hash = await bcrypt.hash(new_password, 10);
    }
    if (password_hint !== undefined) {
      updated.password_hint = password_hint ?? '';
    }
    updated.updated_at = new Date().toISOString();

    await updateAdminSettings(updated);
    return NextResponse.json({ success: true, password_hint: updated.password_hint ?? '' });
  } catch (err) {
    console.error('admin-settings PUT error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
