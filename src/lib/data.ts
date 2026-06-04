// JSON-based data layer using Vercel Blob for read/write
import { put } from '@vercel/blob';
import { artworkDupKey } from './artwork-dedup';

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
  return withWriteLock('portfolio', async () => {
    const artworks = await fetchJson<AnyData[]>('portfolio', true);
    const art = nfcArtwork(artwork);
    // 서버측 중복 차단(권위 기준): 신선 목록과 제목·연도·크기가 같으면 거부.
    const key = artworkDupKey(art);
    if (artworks.some((a) => artworkDupKey(a) === key)) {
      throw new Error('DUPLICATE');
    }
    const maxOrder = Math.max(...artworks.map(a => a.order ?? 0), -1);
    const newArtwork = {
      ...art,
      id: art.id || crypto.randomUUID(),
      tags: artwork.tags || [],
      order: maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    artworks.push(newArtwork);
    await writeJson('portfolio', artworks);
    return newArtwork;
  });
}

// 여러 작품을 단 한 번의 read-modify-write로 추가한다.
// 파일별로 POST를 여러 번 보내면 Blob 읽기-쓰기 전파 지연으로 앞선 추가분이 유실되므로
// (last-write-wins), 일괄 업로드는 반드시 이 함수로 한 번에 저장한다.
export async function addArtworks(list: AnyData[]): Promise<{ created: AnyData[]; skipped: number }> {
  if (!Array.isArray(list) || list.length === 0) return { created: [], skipped: 0 };
  return withWriteLock('portfolio', async () => {
    const artworks = await fetchJson<AnyData[]>('portfolio', true);
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
    if (created.length) await writeJson('portfolio', artworks);
    return { created, skipped };
  });
}

export async function updateArtwork(id: string, updates: Partial<AnyData>): Promise<AnyData | null> {
  // put() 성공을 신뢰한다. 과거의 verify-재시도 루프는 Blob CDN 전파 지연 때문에
  // 정상 저장에도 실패(throw→500)를 일으켜 제거. 쓰기 잠금 안에서 최신본을 읽어 병합·기록한다.
  return withWriteLock('portfolio', async () => {
    let artworks: AnyData[];
    try {
      const res = await fetch(`${BLOB_BASE}/portfolio.json?t=${Date.now()}_${Math.random()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      artworks = await res.json() as AnyData[];
    } catch {
      // Blob 직접 읽기 실패 시 캐시/로컬 fallback
      artworks = await fetchJson<AnyData[]>('portfolio', true);
    }

    const idx = artworks.findIndex((a: AnyData) => a.id === id);
    if (idx === -1) return null;
    artworks[idx] = nfcArtwork({ ...artworks[idx], ...updates, updated_at: new Date().toISOString() });
    await writeJson('portfolio', artworks);
    return artworks[idx];
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
  return withWriteLock('portfolio', async () => {
    const artworks = await fetchJson<AnyData[]>('portfolio', true);
    const filtered = artworks.filter(a => a.id !== id);
    if (filtered.length === artworks.length) return false;
    await writeJson('portfolio', filtered);
    return true;
  });
}

// 여러 작품을 단 한 번의 read-modify-write로 삭제(경합/유실 방지).
// 1건씩 연속 삭제하면 Blob 쓰기-후-읽기 전파 지연 때문에 뒤 삭제가 옛 목록을 읽어
// 앞 삭제를 되살리는 lost-update가 생긴다. 일괄 삭제는 한 번만 읽고 한 번만 쓴다.
export async function deleteArtworks(ids: string[]): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  return withWriteLock('portfolio', async () => {
    const artworks = await fetchJson<AnyData[]>('portfolio', true);
    const idSet = new Set(ids);
    const filtered = artworks.filter((a) => !idSet.has(a.id));
    const removed = artworks.length - filtered.length;
    if (removed > 0) await writeJson('portfolio', filtered);
    return removed;
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

const STATS_MAX_DAILY = 90;   // 일별 기록 보존 일수
const STATS_MAX_KEYS = 300;   // paths/referrers 최대 보존 키 수

const DEFAULT_STATS = {
  id: 'stats',
  totals: { pageviews: 0, visits: 0 },
  daily: {} as Record<string, { pageviews: number; visits: number }>,
  paths: {} as Record<string, number>,
  referrers: {} as Record<string, number>,
  devices: {} as Record<string, number>,
  browsers: {} as Record<string, number>,
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
  referrer: string;
  device: string;
  browser: string;
  newVisit: boolean;
}): Promise<void> {
  await withWriteLock('stats', async () => {
    let s: AnyData;
    try {
      s = await fetchJson<AnyData>('stats', true);
    } catch {
      s = freshStats();
    }
    // 누락 필드 방어 (이전 스키마/부분 데이터 대비)
    s.totals ??= { pageviews: 0, visits: 0 };
    s.daily ??= {}; s.paths ??= {}; s.referrers ??= {};
    s.devices ??= {}; s.browsers ??= {};

    const day = seoulDay();
    s.totals.pageviews = (s.totals.pageviews ?? 0) + 1;
    if (input.newVisit) s.totals.visits = (s.totals.visits ?? 0) + 1;

    const d = s.daily[day] ?? { pageviews: 0, visits: 0 };
    d.pageviews += 1;
    if (input.newVisit) d.visits += 1;
    s.daily[day] = d;

    s.paths[input.path] = (s.paths[input.path] ?? 0) + 1;
    const ref = input.referrer || 'direct';
    s.referrers[ref] = (s.referrers[ref] ?? 0) + 1;
    s.devices[input.device] = (s.devices[input.device] ?? 0) + 1;
    s.browsers[input.browser] = (s.browsers[input.browser] ?? 0) + 1;

    s.daily = pruneDaily(s.daily, STATS_MAX_DAILY);
    s.paths = pruneTop(s.paths, STATS_MAX_KEYS);
    s.referrers = pruneTop(s.referrers, STATS_MAX_KEYS);

    s.updated_at = new Date().toISOString();
    await writeJson('stats', s);
  });
}
