import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getPortfolioById, updateArtwork, deleteArtwork } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';

function revalidatePortfolioPaths() {
  for (const p of ['/', '/portfolio']) revalidatePath(p);
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await getPortfolioById(id);
  if (!artwork) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(artwork);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateArtwork(id, body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    revalidatePortfolioPaths();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateArtwork(id, body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    revalidatePortfolioPaths();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const deleted = await deleteArtwork(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    revalidatePortfolioPaths();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed' }, { status: 500 });
  }
}
