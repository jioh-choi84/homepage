import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPortfolioById, updateArtwork, getTags, addTag } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artwork = await getPortfolioById(id);
  if (!artwork) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(artwork.tags || []);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { tagIds } = await request.json();
  
  const allTags = await getTags();
  const tags = allTags.filter((t: { id: string }) => tagIds.includes(t.id));
  
  const updated = await updateArtwork(id, { tags });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(tags);
}

// POST: 작품에 태그 추가 (tag_ids 또는 tag_names)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  
  const artwork = await getPortfolioById(id);
  if (!artwork) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const currentTags = artwork.tags || [];
  const allTags = await getTags();

  // replace 모드: tag_names 전체를 작품 태그로 '설정'(중복 제거, '#' 제외, 없으면 생성)
  // → 클라이언트 로컬 상태를 단일 소스로 하여 누적/중복/조각 문제를 원천 차단
  if (body.replace && Array.isArray(body.tag_names)) {
    const resolved: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const raw of body.tag_names) {
      const name = String(raw ?? '').trim();
      if (!name || name.includes('#')) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      let tag = allTags.find((t: { name: string }) => t.name.toLowerCase() === key);
      if (!tag) { tag = await addTag({ name }); allTags.push(tag); }
      resolved.push({ id: tag.id, name: tag.name });
    }
    const updated = await updateArtwork(id, { tags: resolved });
    if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    return NextResponse.json(resolved);
  }

  let tagsToAdd: { id: string; name: string }[] = [];

  if (body.tag_ids) {
    // tag_ids로 추가
    tagsToAdd = allTags.filter((t: { id: string }) => 
      body.tag_ids.includes(t.id) && !currentTags.some((ct: { id: string }) => ct.id === t.id)
    );
  } else if (body.tag_names) {
    // tag_names로 추가 (없으면 생성)
    for (const name of body.tag_names) {
      let tag = allTags.find((t: { name: string }) => t.name.toLowerCase() === name.toLowerCase());
      if (!tag) {
        tag = await addTag({ name });
      }
      if (!currentTags.some((ct: { id: string }) => ct.id === tag.id)) {
        tagsToAdd.push(tag);
      }
    }
  }
  
  const newTags = [...currentTags, ...tagsToAdd];
  const updated = await updateArtwork(id, { tags: newTags });
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json(newTags);
}

// DELETE: 작품에서 태그 제거
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { tag_ids } = await request.json();
  
  const artwork = await getPortfolioById(id);
  if (!artwork) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const currentTags = artwork.tags || [];
  const newTags = currentTags.filter((t: { id: string }) => !tag_ids.includes(t.id));
  
  const updated = await updateArtwork(id, { tags: newTags });
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json(newTags);
}
