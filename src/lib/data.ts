// JSON-based data layer using Vercel Blob for read/write
import { put, get, BlobPreconditionFailedError } from '@vercel/blob';
import { artworkDupKey } from './artwork-dedup';
import { classifyReferrerSource, seriesKeyFromPath, kstHourWeekday, clampDwell } from './stats';

// Public base URL of the Vercel Blob store, injected via env.
// e.g. NEXT_PUBLIC_BLOB_BASE=https://<id>.public.blob.vercel-storage.com
const BLOB_ORIGIN = process.env.NEXT_PUBLIC_BLOB_BASE ?? '';
const BLOB_BASE = `${BLOB_ORIGIN}/data`;
// When the Blob store URL isn't configured yet (local dev / first setup),
// read seed JSON from src/data instead of issuing an invalid relative fetch.
const BLOB_CONFIGURED = BLOB_ORIGIN.startsWith('http');

// In-memory cache with TTL
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10_000; // 10 seconds — serverless instances are short-lived

// Write mutex per JSON file — prevents concurrent read-modify-write races
const writeLocks = new Map<string, Promise<void>>();
async function withWriteLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeLocks.get(name) ?? Promise.resolve();
  let resolve: () => void;
  const next = new Promise<void>(r => { resolve = r; });
  writeLocks.set(name, next);
  await prev;
  try {
    return await fn();
  } finally {
    resolve!();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

async function readLocalJson<T>(name: string): Promise<T | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'src', 'data', `${name}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchJson<T>(name: string, skipCache = false): Promise<T> {
  const now = Date.now();
  if (!skipCache) {
    const cached = cache.get(name);
    if (cached && now - cached.ts < CACHE_TTL) {
      return cached.data as T;
    }
  }

  // Blob store not configured yet: serve seed JSON from src/data.
  if (!BLOB_CONFIGURED) {
    const local = await readLocalJson<T>(name);
    if (local !== null) {
      cache.set(name, { data: local, ts: now });
      return local;
    }
    throw new Error(`Failed to fetch ${name}: blob not configured and no local seed`);
  }

  try {
    const res = await fetch(
      skipCache ? `${BLOB_BASE}/${name}.json?t=${now}` : `${BLOB_BASE}/${name}.json`,
      // 신선 읽기: 고유 쿼리 + no-cache 요청 헤더로 엣지 캐시를 재검증(덮어쓰기 직후에도 최신 반영)
      skipCache ? { cache: 'no-store', headers: { 'cache-control': 'no-cache' } } : { next: { revalidate: 10 } },
    );
    if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
    const data = await res.json();
    cache.set(name, { data, ts: now });
    return data as T;
  } catch {
    // Fallback only when Blob fetch is unavailable (e.g. build/network issue)
    const local = await readLocalJson<T>(name);
    if (local !== null) {
      cache.set(name, { data: local, ts: now });
      return local;
    }
    throw new Error(`Failed to fetch ${name}`);
  }
}

async function writeJson(name: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await put(`data/${name}.json`, content, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    // 가변 데이터다. 기본값(30일 엣지 캐시)을 두면 쓰기 후에도 읽기가 옛 내용을
    // 받아 "업로드가 사라지고/삭제가 되살아나는" 것처럼 보인다. 캐시 없이 매번 재검증.
    cacheControlMaxAge: 0,
  });
  // Update cache immediately so next read within same instance gets fresh data
  cache.set(name, { data, ts: Date.now() });
  // 비-CAS 전체쓰기는 ETag를 알 수 없으므로 CAS 스냅샷을 무효화(다음 mutate가 Blob 재읽기)
  snapshot.delete(name);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// 현재 blob을 ETag와 함께 읽는다(없으면 {data:null, etag:null}).
// get()은 내용(stream)과 etag를 한 응답에서 원자적으로 반환 → 내용·etag가 같은 버전(함정 3).
// 압축 시 약한 ETag(W/"...")는 W/를 떼서 강한 저장 ETag와 맞춘다(함정 2).
async function readWithEtag<T>(name: string): Promise<{ data: T | null; etag: string | null }> {
  if (!BLOB_CONFIGURED) {
    return { data: await readLocalJson<T>(name), etag: null };
  }
  const res = await get(`data/${name}.json`, { access: 'public' });
  if (!res || !res.stream) return { data: null, etag: null };
  const text = await new Response(res.stream as ReadableStream).text();
  const etag = res.blob.etag ? res.blob.etag.replace(/^W\//, '') : null;
  return { data: JSON.parse(text) as T, etag };
}

const CAS_MAX_ATTEMPTS = 8;

// 인스턴스 권위 스냅샷(함정 4): 이 인스턴스가 마지막으로 성공적으로 쓴 {data, etag}.
// put이 돌려준 강한 ETag를 보관 → 같은 인스턴스의 다음 수정이 CDN 전파 지연과 무관하게
// 자기 최신본을 base로 사용(연속 단건 수정 즉시 성공). 다른 인스턴스가 끼어들면 ifMatch
// 충돌로 감지 → 스냅샷 버리고 Blob 재읽기. CAS가 정합을 보장하므로 스냅샷 base도 안전.
const snapshot = new Map<string, { data: unknown; etag: string }>();

// 낙관적 동시성 제어(CAS) read-modify-write.
// fn(current)이 {next, result}를 반환. next===undefined면 기록하지 않고 result만 반환
// (대상 없음/변경 없음). put({ifMatch})로 충돌 감지 → 최신본 재읽기·재시도.
export async function mutate<T, R>(
  name: string,
  fn: (current: T | null) => { next?: AnyData; result: R },
): Promise<R> {
  return withWriteLock(name, async () => {            // 같은 인스턴스 내 직렬화
    const snap = snapshot.get(name);
    let base: { data: T | null; etag: string | null } | null =
      snap ? { data: snap.data as T, etag: snap.etag } : null;

    for (let attempt = 0; attempt < CAS_MAX_ATTEMPTS; attempt++) {
      if (!base) base = await readWithEtag<T>(name);    // 스냅샷 없으면 Blob 신선 읽기
      const { next, result } = fn(base.data);
      if (next === undefined) return result;
      if (!BLOB_CONFIGURED) {
        snapshot.set(name, { data: next, etag: 'local' });
        cache.set(name, { data: next, ts: Date.now() });
        return result;
      }
      try {
        const putRes = await put(`data/${name}.json`, JSON.stringify(next, null, 2), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
          ...(base.etag ? { ifMatch: base.etag } : {}),
        });
        const newEtag = putRes.etag ? putRes.etag.replace(/^W\//, '') : '';
        snapshot.set(name, { data: next, etag: newEtag }); // 자기 최신본 갱신(함정 4)
        cache.set(name, { data: next, ts: Date.now() });
        return result;
      } catch (e) {
        if (e instanceof BlobPreconditionFailedError) {    // 다른 인스턴스가 끼어듦
          snapshot.delete(name);                            // 스냅샷 폐기
          base = null;                                      // Blob 재읽기
          await sleep(120 + attempt * 130);                 // 백오프(전파 대기)
          continue;
        }
        throw e;
      }
    }
    throw new Error(`동시 수정 충돌이 반복됩니다(${name}). 잠시 후 다시 시도해 주세요.`);
  });
}

// ============ READ ============

// fresh=true면 엣지 캐시를 우회해 저장소 최신본을 읽는다(관리자 화면용).
export async function getPortfolio(fresh = false): Promise<AnyData[]> {
  const data = await fetchJson<AnyData[]>('portfolio', fresh);
  return data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// 공개 사이트용: 숨김(hidden) 작품 제외
export async function getPublicPortfolio(): Promise<AnyData[]> {
  return (await getPortfolio()).filter(a => !a.hidden);
}

export async function getPortfolioById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('portfolio');
  return data.find(a => a.id === id);
}

export async function getFeaturedArtworks(): Promise<AnyData[]> {
  const data = await getPortfolio();
  return data.filter(a => a.is_featured && !a.hidden);
}

export async function getCategories(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('categories');
}

export async function getCategoryById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('categories');
  return data.find(c => c.id === id);
}

export async function getTags(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('tags');
}

export async function getTagById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('tags');
  return data.find(t => t.id === id);
}

export async function addTag(tag: AnyData): Promise<AnyData> {
  return withWriteLock('tags', async () => {
    const tags = await fetchJson<AnyData[]>('tags', true);
    const newTag = {
      ...tag,
      id: tag.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    tags.push(newTag);
    await writeJson('tags', tags);
    return newTag;
  });
}

export async function getAbout(): Promise<AnyData> {
  return fetchJson<AnyData>('about');
}

// cv.json이 아직 Blob에 없을 때(첫 저장 전)의 기본값.
// 서버리스 런타임에선 src/data 시드 파일 fs 읽기가 안 되므로 코드에 기본값을 둔다.
const DEFAULT_CV = {
  id: 'cv',
  birth_city: '', birth_city_en: '', birth_country: '', birth_country_en: '',
  live_city: '', live_city_en: '', live_country: '', live_country_en: '',
  education: [], residencies: [], collections: [], fellowships: [], awards: [], publications: [],
  cv_file_url: null, updated_at: null,
};

export async function getCv(): Promise<AnyData> {
  // 파일이 없거나(404) 시드 fallback 실패 시 throw 대신 기본값 반환 → 첫 저장(PUT)이 cv.json을 생성할 수 있게.
  try {
    return await fetchJson<AnyData>('cv');
  } catch {
    return { ...DEFAULT_CV };
  }
}

export async function getExhibitions(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('exhibitions');
}

export async function getExhibitionById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('exhibitions');
  return data.find(e => e.id === id);
}

export async function getPress(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('press');
}

export async function getPressById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('press');
  return data.find(n => n.id === id);
}

export async function getAdminSettings(): Promise<AnyData> {
  return fetchJson<AnyData>('admin_settings');
}

// ============ WRITE ============

export async function updatePortfolio(artworks: AnyData[]): Promise<void> {
  await writeJson('portfolio', artworks);
}

// 작품 텍스트 필드를 NFC로 정규화(macOS 파일명 NFD 유입 방지 → 중복판정·검색 일관).
const ARTWORK_TEXT_FIELDS = [
  'title', 'title_en', 'medium', 'medium_en', 'collection', 'collection_en',
  'series', 'series_en', 'theme', 'theme_en', 'region', 'region_en',
];
function nfcArtwork<T extends Record<string, AnyData>>(a: T): T {
  const out: Record<string, AnyData> = { ...a };
  for (const f of ARTWORK_TEXT_FIELDS) {
    if (typeof out[f] === 'string') out[f] = (out[f] as string).normalize('NFC');
  }
  return out as T;
}

export async function addArtwork(artwork: AnyData): Promise<AnyData> {
  const art = nfcArtwork(artwork);
  return mutate<AnyData[], AnyData>('portfolio', (current) => {
    const artworks = current ?? [];
    // 서버측 중복 차단(권위 기준): 신선 목록과 제목·연도·크기가 같으면 거부.
    const key = artworkDupKey(art);
    if (artworks.some((a) => artworkDupKey(a) === key)) {
      throw new Error('DUPLICATE');
    }
    const maxOrder = Math.max(...artworks.map(a => a.order ?? 0), -1);
    const now = new Date().toISOString();
    const newArtwork = {
      ...art,
      id: art.id || crypto.randomUUID(),
      tags: artwork.tags || [],
      order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    return { next: [...artworks, newArtwork], result: newArtwork };
  });
}

// 여러 작품을 단 한 번의 read-modify-write로 추가한다.
// 파일별로 POST를 여러 번 보내면 Blob 읽기-쓰기 전파 지연으로 앞선 추가분이 유실되므로
// (last-write-wins), 일괄 업로드는 반드시 이 함수로 한 번에 저장한다.
export async function addArtworks(list: AnyData[]): Promise<{ created: AnyData[]; skipped: number }> {
  if (!Array.isArray(list) || list.length === 0) return { created: [], skipped: 0 };
  return mutate<AnyData[], { created: AnyData[]; skipped: number }>('portfolio', (current) => {
    const artworks = [...(current ?? [])];
    // 서버측 중복 차단: 신선 목록 + 이번 배치 내 키를 모두 비교(클라 상태 stale 무관).
    const keys = new Set(artworks.map((a) => artworkDupKey(a)));
    let maxOrder = Math.max(...artworks.map(a => a.order ?? 0), -1);
    const now = new Date().toISOString();
    const created: AnyData[] = [];
    let skipped = 0;
    for (const raw of list) {
      const artwork = nfcArtwork(raw);
      const key = artworkDupKey(artwork);
      if (keys.has(key)) { skipped += 1; continue; }
      keys.add(key);
      maxOrder += 1;
      const na = {
        ...artwork,
        id: artwork.id || crypto.randomUUID(),
        tags: artwork.tags || [],
        order: maxOrder,
        created_at: now,
        updated_at: now,
      };
      created.push(na);
      artworks.push(na);
    }
    if (!created.length) return { result: { created: [], skipped } };
    return { next: artworks, result: { created, skipped } };
  });
}

export async function updateArtwork(id: string, updates: Partial<AnyData>): Promise<AnyData | null> {
  // CAS read-modify-write: 다른 단건 수정이 끼어들어도 ifMatch로 충돌을 감지해 재시도하므로
  // 작품을 하나씩 연속 수정해도 앞선 변경이 사라지지 않는다(lost-update 방지).
  return mutate<AnyData[], AnyData | null>('portfolio', (current) => {
    const artworks = current ? [...current] : [];
    const idx = artworks.findIndex((a) => a.id === id);
    if (idx === -1) return { result: null };
    const updated = nfcArtwork({ ...artworks[idx], ...updates, updated_at: new Date().toISOString() });
    artworks[idx] = updated;
    return { next: artworks, result: updated };
  });
}

// 분류값(series/theme/region 및 _en) 일괄 재작성 — 이름변경(병합) 또는 삭제(제거).
// 그 값을 가진 모든 작품의 해당 필드를 to로 바꾸거나(null이면 제거) 일괄 변경한다.
// KO 축(series/theme/region)이면 work_folders.json의 매칭 value/parent도 함께 동기화.
const RECLASSIFY_FIELDS = ['series', 'series_en', 'theme', 'theme_en', 'region', 'region_en'];
const AXIS_FIELDS = ['series', 'theme', 'region'];

export async function reclassifyArtworks(field: string, from: string, to: string | null): Promise<{ count: number; artworks: AnyData[] }> {
  if (!RECLASSIFY_FIELDS.includes(field)) throw new Error('허용되지 않은 필드');
  const oldVal = String(from || '').trim();
  const newVal = to && String(to).trim() ? String(to).trim() : null;

  const result = await withWriteLock('portfolio', async () => {
    let list: AnyData[];
    try {
      const res = await fetch(`${BLOB_BASE}/portfolio.json?t=${Date.now()}_${Math.random()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      list = await res.json() as AnyData[];
    } catch {
      list = await fetchJson<AnyData[]>('portfolio', true);
    }
    let count = 0;
    const now = new Date().toISOString();
    for (const a of list) {
      if (String(a[field] ?? '').trim() === oldVal) {
        a[field] = newVal;
        a.updated_at = now;
        count++;
      }
    }
    if (count) await writeJson('portfolio', list);
    return { list, count };
  });

  // 폴더 메타데이터 동기화(저장된 work_folders가 있을 때만; 없으면 작품값에서 자동 도출됨)
  if (AXIS_FIELDS.includes(field)) {
    await withWriteLock('work_folders', async () => {
      let folders: AnyData[];
      try { folders = await fetchJson<AnyData[]>('work_folders', true); } catch { folders = []; }
      if (!Array.isArray(folders) || !folders.length) return;
      let changed = false;
      const out: AnyData[] = [];
      for (const f of folders) {
        // 매칭 폴더의 value 변경/제거
        if (f.axis === field && String(f.value ?? '').trim() === oldVal) {
          if (newVal === null) { changed = true; continue; }
          out.push({ ...f, value: newVal });
          changed = true;
          continue;
        }
        // series 변경 시 그 하위 region 폴더의 parent도 따라감
        if (field === 'series' && f.axis === 'region' && String(f.parent ?? '').trim() === oldVal) {
          out.push({ ...f, parent: newVal ?? undefined });
          changed = true;
          continue;
        }
        out.push(f);
      }
      if (changed) await writeJson('work_folders', out);
    });
  }

  return { count: result.count, artworks: [...result.list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) };
}

export async function deleteArtwork(id: string): Promise<boolean> {
  // CAS: 하나씩 연속 삭제해도 ifMatch 충돌 재시도로 lost-update가 없다.
  return mutate<AnyData[], boolean>('portfolio', (current) => {
    const artworks = current ?? [];
    const filtered = artworks.filter(a => a.id !== id);
    if (filtered.length === artworks.length) return { result: false };
    return { next: filtered, result: true };
  });
}

// 여러 작품을 단 한 번의 read-modify-write로 삭제(경합/유실 방지).
// 1건씩 연속 삭제하면 Blob 쓰기-후-읽기 전파 지연 때문에 뒤 삭제가 옛 목록을 읽어
// 앞 삭제를 되살리는 lost-update가 생긴다. 일괄 삭제는 한 번만 읽고 한 번만 쓴다.
export async function deleteArtworks(ids: string[]): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  return mutate<AnyData[], number>('portfolio', (current) => {
    const artworks = current ?? [];
    const idSet = new Set(ids);
    const filtered = artworks.filter((a) => !idSet.has(a.id));
    const removed = artworks.length - filtered.length;
    if (removed === 0) return { result: 0 };
    return { next: filtered, result: removed };
  });
}

export async function updateCategories(categories: AnyData[]): Promise<void> {
  await writeJson('categories', categories);
}

export async function updateTags(tags: AnyData[]): Promise<void> {
  await writeJson('tags', tags);
}

export async function updateAbout(about: AnyData): Promise<void> {
  await writeJson('about', about);
}

export async function updateCv(cv: AnyData): Promise<void> {
  await writeJson('cv', cv);
}

export async function updateExhibitions(exhibitions: AnyData[]): Promise<void> {
  await writeJson('exhibitions', exhibitions);
}

export async function updatePress(press: AnyData[]): Promise<void> {
  await writeJson('press', press);
}

export async function updateAdminSettings(settings: AnyData): Promise<void> {
  await writeJson('admin_settings', settings);
}

// 작품 묶음(그룹)
export async function getWorkGroups(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('work_groups');
}
export async function updateWorkGroups(groups: AnyData[]): Promise<void> {
  await writeJson('work_groups', groups);
}

// 폴더 메타데이터(work_folders.json). 없으면 기존 work_groups를 1회 변환해 반환(읽기 전용).
// admin에서 저장하면 work_folders.json이 생성되어 그때부터 단일 출처가 된다.
export async function getWorkFolders(): Promise<AnyData[]> {
  let folders: AnyData[] = [];
  try {
    folders = await fetchJson<AnyData[]>('work_folders');
  } catch {
    folders = [];
  }
  if (Array.isArray(folders) && folders.length) return folders;

  // 폴백: 기존 work_groups → 폴더 메타데이터 매핑
  try {
    const groups = await fetchJson<AnyData[]>('work_groups');
    if (Array.isArray(groups) && groups.length) {
      return groups.map((g) => ({
        genre: g.genre,
        axis: g.match_field === 'theme' ? 'theme' : 'series',
        value: g.match_value,
        slug: g.slug || undefined,
        label: g.name && g.name !== g.match_value ? g.name : undefined,
        label_en: g.name_en || undefined,
        order: g.order,
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

export async function updateWorkFolders(folders: AnyData[]): Promise<void> {
  await writeJson('work_folders', folders);
}

function slugifyGroup(s: string): string {
  const base = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `group-${crypto.randomUUID().slice(0, 6)}`;
}

// 추가/수정/삭제는 쓰기 잠금 안에서 '신선한' 목록을 읽어 처리한다.
// (addArtwork와 동일 패턴 — Blob 전파 지연으로 옛 목록을 읽어 덮어써 데이터가 사라지는 것 방지)
export async function addWorkGroup(input: AnyData): Promise<AnyData> {
  return withWriteLock('work_groups', async () => {
    const groups = await fetchJson<AnyData[]>('work_groups', true);
    let slug = slugifyGroup(input.name_en || input.name);
    while (groups.some((g) => g.slug === slug)) slug = `${slug}-${crypto.randomUUID().slice(0, 2)}`;
    const maxOrder = Math.max(...groups.map((g) => g.order ?? 0), -1);
    const newGroup = {
      id: crypto.randomUUID(),
      genre: input.genre,
      name: input.name,
      name_en: input.name_en || null,
      slug,
      match_field: input.match_field === 'theme' ? 'theme' : 'series',
      match_value: input.match_value,
      order: input.order ?? maxOrder + 1,
      created_at: new Date().toISOString(),
    };
    await writeJson('work_groups', [...groups, newGroup]);
    return newGroup;
  });
}

export async function updateWorkGroup(id: string, patch: Partial<AnyData>): Promise<AnyData | null> {
  return withWriteLock('work_groups', async () => {
    const groups = await fetchJson<AnyData[]>('work_groups', true);
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    groups[idx] = { ...groups[idx], ...patch };
    await writeJson('work_groups', groups);
    return groups[idx];
  });
}

export async function deleteWorkGroup(id: string): Promise<boolean> {
  return withWriteLock('work_groups', async () => {
    const groups = await fetchJson<AnyData[]>('work_groups', true);
    const filtered = groups.filter((g) => g.id !== id);
    if (filtered.length === groups.length) return false;
    await writeJson('work_groups', filtered);
    return true;
  });
}

// Resources (Making Works / Writings)
export async function getResources(): Promise<AnyData[]> {
  return fetchJson<AnyData[]>('resources');
}
export async function getResourceById(id: string): Promise<AnyData | undefined> {
  const data = await fetchJson<AnyData[]>('resources');
  return data.find((r) => r.id === id);
}
export async function updateResources(resources: AnyData[]): Promise<void> {
  await writeJson('resources', resources);
}

// 홈 팝업 공지 (최대 2개). 잠금+신선한 읽기로 read-modify-write (묶음과 동일 패턴).
const NOTICES_MAX = 2;
export async function getNotices(): Promise<AnyData[]> {
  // notices.json이 아직 없으면(첫 저장 전) throw 대신 빈 배열 반환
  try {
    return await fetchJson<AnyData[]>('notices');
  } catch {
    return [];
  }
}
export async function addNotice(input: AnyData): Promise<AnyData> {
  return withWriteLock('notices', async () => {
    let notices: AnyData[];
    try { notices = await fetchJson<AnyData[]>('notices', true); } catch { notices = []; }
    if (notices.length >= NOTICES_MAX) throw new Error(`공지는 최대 ${NOTICES_MAX}개까지 등록할 수 있습니다.`);
    const maxOrder = Math.max(...notices.map((n) => n.order ?? 0), -1);
    const now = new Date().toISOString();
    const newNotice = {
      id: crypto.randomUUID(),
      active: input.active ?? true,
      position: input.position || 'center',
      title: input.title || '',
      title_en: input.title_en || null,
      body: input.body || '',
      body_en: input.body_en || null,
      image_url: input.image_url || null,
      link_url: input.link_url || null,
      link_label: input.link_label || null,
      link_label_en: input.link_label_en || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    await writeJson('notices', [...notices, newNotice]);
    return newNotice;
  });
}
export async function updateNotice(id: string, patch: Partial<AnyData>): Promise<AnyData | null> {
  return withWriteLock('notices', async () => {
    let notices: AnyData[];
    try { notices = await fetchJson<AnyData[]>('notices', true); } catch { notices = []; }
    const idx = notices.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notices[idx] = { ...notices[idx], ...patch, id, updated_at: new Date().toISOString() };
    await writeJson('notices', notices);
    return notices[idx];
  });
}
export async function deleteNotice(id: string): Promise<boolean> {
  return withWriteLock('notices', async () => {
    let notices: AnyData[];
    try { notices = await fetchJson<AnyData[]>('notices', true); } catch { notices = []; }
    const filtered = notices.filter((n) => n.id !== id);
    if (filtered.length === notices.length) return false;
    await writeJson('notices', filtered);
    return true;
  });
}

// ============ STATS (운영 통계 / 방문자) ============
// 저트래픽 포트폴리오 전제의 근사 집계. stats.json을 read-modify-write로 증분한다.
// 서버리스 인스턴스별 메모리 뮤텍스(withWriteLock)이므로 동시 인스턴스 간 경합으로
// 드물게 증분이 유실될 수 있으나 트래픽이 낮아 무시 가능.

const STATS_MAX_DAILY = 90;        // 일별 기록 보존 일수
const STATS_MAX_DAILY_KEYS = 50;   // 일별 차원별 최대 키 수
const STATS_MAX_REFERRERS = 300;   // 상세 referrer 호스트 상한
const STATS_MAX_PATHDWELL = 200;   // 페이지별 체류 상한
const STATS_MAX_COUNTRY = 60;      // 안전상한(일별 국가)

const DEFAULT_STATS = {
  id: 'stats',
  totals: { pageviews: 0, visits: 0 },
  daily: {} as Record<string, {
    pageviews: number; visits: number;
    countries?: Record<string, number>;
    series?: Record<string, number>;
    paths?: Record<string, number>;
    sources?: Record<string, number>;
  }>,
  devices: {} as Record<string, number>,
  browsers: {} as Record<string, number>,
  referrers: {} as Record<string, number>,
  hours: {} as Record<string, number>,
  weekdays: {} as Record<string, number>,
  dwell: { totalMs: 0, samples: 0 },
  pathDwell: {} as Record<string, { totalMs: number; samples: number }>,
  updated_at: null as string | null,
};

function freshStats(): AnyData {
  return JSON.parse(JSON.stringify(DEFAULT_STATS));
}

// 상위 N개 키만 값 내림차순으로 보존
function pruneTop(obj: Record<string, number>, max: number): Record<string, number> {
  const entries = Object.entries(obj);
  if (entries.length <= max) return obj;
  return Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, max));
}

// 최근 max일만 보존 (날짜 문자열 정렬)
function pruneDaily(daily: Record<string, { pageviews: number; visits: number }>, max: number) {
  const keys = Object.keys(daily).sort();
  if (keys.length <= max) return daily;
  const keep = keys.slice(keys.length - max);
  return Object.fromEntries(keep.map((k) => [k, daily[k]]));
}

// 일별 entry 안의 각 차원을 Top N으로 prune
function pruneDailyDims(
  daily: Record<string, { countries?: Record<string, number>; series?: Record<string, number>; paths?: Record<string, number>; sources?: Record<string, number> }>,
) {
  for (const day of Object.keys(daily)) {
    const e = daily[day];
    if (e.countries) e.countries = pruneTop(e.countries, STATS_MAX_COUNTRY);
    if (e.series) e.series = pruneTop(e.series, STATS_MAX_DAILY_KEYS);
    if (e.paths) e.paths = pruneTop(e.paths, STATS_MAX_DAILY_KEYS);
    if (e.sources) e.sources = pruneTop(e.sources, STATS_MAX_DAILY_KEYS);
  }
}

// 서버 기준 한국 시간(KST)의 'YYYY-MM-DD'
function seoulDay(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

export async function getStats(): Promise<AnyData> {
  try {
    return await fetchJson<AnyData>('stats');
  } catch {
    return freshStats();
  }
}

export async function updateStats(stats: AnyData): Promise<void> {
  await writeJson('stats', stats);
}

export async function resetStats(): Promise<AnyData> {
  const fresh = freshStats();
  fresh.updated_at = new Date().toISOString();
  await writeJson('stats', fresh);
  return fresh;
}

export async function recordPageview(input: {
  path: string;
  referrer: string;   // 정규화된 host 또는 'direct'
  device: string;
  browser: string;
  newVisit: boolean;
  country: string;    // 'KR' 등, 없으면 'XX'
}): Promise<void> {
  await withWriteLock('stats', async () => {
    let s: AnyData;
    try {
      s = await fetchJson<AnyData>('stats', true);
    } catch {
      s = freshStats();
    }
    // 누락 필드 방어
    s.totals ??= { pageviews: 0, visits: 0 };
    s.daily ??= {}; s.devices ??= {}; s.browsers ??= {};
    s.referrers ??= {}; s.hours ??= {}; s.weekdays ??= {};
    s.dwell ??= { totalMs: 0, samples: 0 }; s.pathDwell ??= {};

    const now = new Date();
    const day = seoulDay();
    const { hour, weekday } = kstHourWeekday(now);

    s.totals.pageviews += 1;
    if (input.newVisit) s.totals.visits += 1;

    const e = s.daily[day] ?? { pageviews: 0, visits: 0 };
    e.pageviews += 1;
    if (input.newVisit) e.visits += 1;
    e.countries ??= {}; e.series ??= {}; e.paths ??= {}; e.sources ??= {};

    // 국가
    const country = (input.country || 'XX').toUpperCase().slice(0, 2);
    e.countries[country] = (e.countries[country] ?? 0) + 1;
    // 경로
    e.paths[input.path] = (e.paths[input.path] ?? 0) + 1;
    // 시리즈/주제
    const series = seriesKeyFromPath(input.path);
    if (series) e.series[series] = (e.series[series] ?? 0) + 1;
    // 유입 출처 그룹
    const source = classifyReferrerSource(input.referrer);
    e.sources[source] = (e.sources[source] ?? 0) + 1;
    s.daily[day] = e;

    // 전체 누적
    s.devices[input.device] = (s.devices[input.device] ?? 0) + 1;
    s.browsers[input.browser] = (s.browsers[input.browser] ?? 0) + 1;
    const ref = input.referrer || 'direct';
    s.referrers[ref] = (s.referrers[ref] ?? 0) + 1;
    s.hours[String(hour)] = (s.hours[String(hour)] ?? 0) + 1;
    s.weekdays[String(weekday)] = (s.weekdays[String(weekday)] ?? 0) + 1;

    // prune
    s.daily = pruneDaily(s.daily, STATS_MAX_DAILY);
    pruneDailyDims(s.daily);
    s.referrers = pruneTop(s.referrers, STATS_MAX_REFERRERS);

    s.updated_at = now.toISOString();
    await writeJson('stats', s);
  });
}

export async function recordDwell(input: { path: string; dwellMs: number }): Promise<void> {
  const ms = clampDwell(input.dwellMs);
  if (ms === null) return;
  await withWriteLock('stats', async () => {
    let s: AnyData;
    try {
      s = await fetchJson<AnyData>('stats', true);
    } catch {
      s = freshStats();
    }
    s.dwell ??= { totalMs: 0, samples: 0 };
    s.pathDwell ??= {};
    s.dwell.totalMs += ms;
    s.dwell.samples += 1;
    const p = s.pathDwell[input.path] ?? { totalMs: 0, samples: 0 };
    p.totalMs += ms; p.samples += 1;
    s.pathDwell[input.path] = p;
    s.pathDwell = pruneTopByField(s.pathDwell, STATS_MAX_PATHDWELL);
    s.updated_at = new Date().toISOString();
    await writeJson('stats', s);
  });
}

// {key: {samples}} 객체를 samples 기준 Top N 보존
function pruneTopByField(
  obj: Record<string, { totalMs: number; samples: number }>,
  max: number,
): Record<string, { totalMs: number; samples: number }> {
  const entries = Object.entries(obj);
  if (entries.length <= max) return obj;
  return Object.fromEntries(entries.sort((a, b) => b[1].samples - a[1].samples).slice(0, max));
}
