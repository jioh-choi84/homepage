import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAbout, getAdminSettings, updateAdminSettings } from '@/lib/data';

// 혼동 문자(O/0, I/l/1) 제외한 임시 비밀번호 생성
function genTempPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

// 공개(비인증) 엔드포인트 — 비밀번호 분실 시 등록된 작가 이메일로만 임시 비밀번호 발송.
// 임시 비밀번호 자체는 작가 메일함으로만 가므로, 요청자가 메일에 접근하지 못하면 로그인 불가.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const about = await getAbout().catch(() => null);
    const artistEmail = String(about?.contact_email ?? '').trim();
    if (!artistEmail) {
      return NextResponse.json(
        { error: '등록된 작가 이메일이 없어 재설정할 수 없습니다. About에서 이메일을 먼저 등록하세요.' },
        { status: 400 },
      );
    }

    if (!email || String(email).trim().toLowerCase() !== artistEmail.toLowerCase()) {
      return NextResponse.json({ error: '등록된 작가 이메일과 일치하지 않습니다.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json({ error: '이메일 서비스가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 임시 비밀번호 생성 → 해시로 저장(기존 설정 병합, 평문 미저장)
    const tempPassword = genTempPassword(10);
    const bcrypt = await import('bcryptjs');
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const settings = (await getAdminSettings().catch(() => ({}))) || {};
    await updateAdminSettings({
      ...settings,
      id: 'admin_settings',
      password_hash,
      updated_at: new Date().toISOString(),
    });

    // 작가 이메일로 임시 비밀번호 발송
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: 'Chuni Park Admin <onboarding@resend.dev>',
      to: artistEmail,
      subject: '[chuniart.com] 관리자 임시 비밀번호 안내',
      html: `
        <div style="font-family:sans-serif;line-height:1.6;color:#111">
          <h2>관리자 임시 비밀번호</h2>
          <p>요청하신 임시 비밀번호입니다. 아래 비밀번호로 로그인하세요.</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f3f4f6;padding:12px 16px;border-radius:8px;display:inline-block">
            ${tempPassword}
          </p>
          <p style="color:#b45309"><strong>안내</strong> · 보안상 데이터 전파로 인해 <strong>최대 1분</strong> 후부터 이 비밀번호로 로그인할 수 있습니다.</p>
          <p>로그인 후 <strong>설정(Setting) → 비밀번호 변경</strong>에서 반드시 새 비밀번호로 바꿔주세요.</p>
          <p style="color:#6b7280;font-size:13px">본인이 요청하지 않았다면, 즉시 로그인하여 비밀번호를 변경하시기 바랍니다.</p>
        </div>
      `,
    });
    if (error) {
      console.error('reset email error:', error);
      return NextResponse.json({ error: '이메일 전송에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, masked: maskEmail(artistEmail) });
  } catch (err) {
    console.error('Password reset error:', err);
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.' }, { status: 400 });
  }
}
