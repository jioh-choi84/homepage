import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { addArtworks, deleteArtworks } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 일괄 작품 저장 — 단 한 번의 read-modify-write로 전체를 추가(경합/유실 방지).
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const list = Array.isArray(body) ? body : Array.isArray(body?.artworks) ? body.artworks : null;
    if (!list) return NextResponse.json({ error: 'Array expected' }, { status: 400 });
    const result = await addArtworks(list); // { created, skipped }
    for (const p of ['/', '/portfolio']) revalidatePath(p);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('Artwork batch POST error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}

// 일괄 삭제 — 단 한 번의 read-modify-write로 여러 작품을 제거(경합/유실 방지).
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids = Array.isArray(body) ? body : Array.isArray(body?.ids) ? body.ids : null;
    if (!ids) return NextResponse.json({ error: 'ids array expected' }, { status: 400 });
    const removed = await deleteArtworks(ids);
    for (const p of ['/', '/portfolio']) revalidatePath(p);
    return NextResponse.json({ removed });
  } catch (err) {
    console.error('Artwork batch DELETE error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed' }, { status: 500 });
  }
}
