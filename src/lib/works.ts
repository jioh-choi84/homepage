import type { Artwork, ArtworkGenre, WorkFolder } from '@/types/artwork';

// 폴더 하위(지역) 노드
export interface SubFolderNav {
  slug: string;
  value: string;     // 매칭용 원본 값(region)
  label: string;     // ko
  label_en: string;
  order: number;
}

// 2차 네비 폴더 노드 — 연도/시리즈/주제. 시리즈는 지역 하위(children)를 가질 수 있다.
export interface WorksGroupNav {
  slug: string;
  value: string;     // 매칭용 원본 값(decade 문자열 / series / theme)
  label: string;     // ko
  label_en: string;
  kind: 'decade' | 'series' | 'theme';
  order: number;
  children?: SubFolderNav[];
}

export function decadeOf(year: number): string {
  if (!year || isNaN(year)) return '';
  return `${Math.floor(year / 10) * 10}s`;
}

const DECADE_RE = /^\d{4}s$/;

// 결정적 슬러그: 영문/숫자면 그대로, (한글 등) 비면 prefix+해시.
function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}
function autoSlug(prefix: 's' | 't' | 'r', value: string): string {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `${prefix}-${shortHash(value)}`;
}

function metaFor(
  folders: WorkFolder[], genre: ArtworkGenre, axis: 'series' | 'theme' | 'region', value: string, parent?: string,
): WorkFolder | undefined {
  return folders.find((f) =>
    f.genre === genre && f.axis === axis && f.value === value &&
    (axis !== 'region' || (f.parent ?? '') === (parent ?? '')));
}
function slugFor(
  folders: WorkFolder[], genre: ArtworkGenre, axis: 'series' | 'theme' | 'region', value: string, parent?: string,
): string {
  const m = metaFor(folders, genre, axis, value, parent);
  if (m?.slug) return m.slug;
  return autoSlug(axis === 'theme' ? 't' : axis === 'region' ? 'r' : 's', value);
}

// koField 고유값 + 대응 en값(첫 비어있지 않은 값) 수집 (가나다/알파벳 정렬)
function distinctWithEn(
  arts: Artwork[],
  koField: 'series' | 'theme' | 'region',
  enField: 'series_en' | 'theme_en' | 'region_en',
): { value: string; value_en: string }[] {
  const map = new Map<string, string>();
  for (const a of arts) {
    const v = (a[koField] || '').trim();
    if (!v) continue;
    const en = (a[enField] || '').trim();
    if (!map.has(v)) map.set(v, en);
    else if (!map.get(v) && en) map.set(v, en);
  }
  return Array.from(map.entries())
    .map(([value, value_en]) => ({ value, value_en }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

const byOrderThenLabel = (a: { order: number; label: string }, b: { order: number; label: string }) =>
  (a.order - b.order) || a.label.localeCompare(b.label);

/**
 * genre로 필터된 작품 + 폴더 메타데이터로 폴더 트리를 자동 도출.
 * - 연도(decade): 미분류 포함 전체 브라우징
 * - 시리즈(series): 상위 폴더, 지역(region) 고유값이 2개 이상이면 하위 폴더 자동 생성
 * - 주제(theme): 시리즈와 별개의 상위 폴더
 * 라벨/순서/숨김/슬러그는 메타데이터가 있으면 적용.
 */
export function buildGenreTree(
  genreArtworks: Artwork[],
  folders: WorkFolder[],
  genre: ArtworkGenre,
): WorksGroupNav[] {
  const decades = Array.from(
    new Set(genreArtworks.map((a) => decadeOf(a.year)).filter(Boolean)),
  ).sort();
  const decadeNav: WorksGroupNav[] = decades.map((d, i) => ({
    slug: d, value: d, label: d, label_en: d, kind: 'decade', order: i,
  }));

  const seriesNav: WorksGroupNav[] = distinctWithEn(genreArtworks, 'series', 'series_en')
    .flatMap((s) => {
      const m = metaFor(folders, genre, 'series', s.value);
      if (m?.hidden) return [];
      const arts = genreArtworks.filter((a) => (a.series || '').trim() === s.value);
      // 지역 하위 폴더는 이 시리즈가 명시적으로 '지역별 분할'을 켰을 때만 생성(region은 범용 필드라 자동 분할 금지)
      const regions: SubFolderNav[] = !m?.subdivideByRegion ? [] : distinctWithEn(arts, 'region', 'region_en')
        .flatMap((r) => {
          const rm = metaFor(folders, genre, 'region', r.value, s.value);
          if (rm?.hidden) return [];
          return [{
            slug: slugFor(folders, genre, 'region', r.value, s.value),
            value: r.value,
            label: rm?.label || r.value,
            label_en: rm?.label_en || r.value_en || r.value,
            order: rm?.order ?? Number.MAX_SAFE_INTEGER,
          }];
        })
        .sort(byOrderThenLabel);
      return [{
        slug: slugFor(folders, genre, 'series', s.value),
        value: s.value,
        label: m?.label || s.value,
        label_en: m?.label_en || s.value_en || s.value,
        kind: 'series' as const,
        order: m?.order ?? Number.MAX_SAFE_INTEGER,
        ...(regions.length >= 2 ? { children: regions } : {}),
      }];
    })
    .sort(byOrderThenLabel);

  const themeNav: WorksGroupNav[] = distinctWithEn(genreArtworks, 'theme', 'theme_en')
    .flatMap((t) => {
      const m = metaFor(folders, genre, 'theme', t.value);
      if (m?.hidden) return [];
      return [{
        slug: slugFor(folders, genre, 'theme', t.value),
        value: t.value,
        label: m?.label || t.value,
        label_en: m?.label_en || t.value_en || t.value,
        kind: 'theme' as const,
        order: m?.order ?? Number.MAX_SAFE_INTEGER,
      }];
    })
    .sort(byOrderThenLabel);

  return [...decadeNav, ...seriesNav, ...themeNav];
}

/** 특정 폴더(+선택적 지역 하위)에 속한 작품 */
export function artworksForGroup(
  genreArtworks: Artwork[],
  folders: WorkFolder[],
  genre: ArtworkGenre,
  groupSlug: string,
  subSlug?: string | null,
): Artwork[] {
  if (DECADE_RE.test(groupSlug)) {
    return genreArtworks.filter((a) => decadeOf(a.year) === groupSlug);
  }

  const s = distinctWithEn(genreArtworks, 'series', 'series_en')
    .find((v) => slugFor(folders, genre, 'series', v.value) === groupSlug);
  if (s) {
    let arts = genreArtworks.filter((a) => (a.series || '').trim() === s.value);
    if (subSlug) {
      const r = distinctWithEn(arts, 'region', 'region_en')
        .find((v) => slugFor(folders, genre, 'region', v.value, s.value) === subSlug);
      if (r) arts = arts.filter((a) => (a.region || '').trim() === r.value);
    }
    return arts;
  }

  const th = distinctWithEn(genreArtworks, 'theme', 'theme_en')
    .find((v) => slugFor(folders, genre, 'theme', v.value) === groupSlug);
  if (th) return genreArtworks.filter((a) => (a.theme || '').trim() === th.value);

  return [];
}

/** genre의 기본 폴더 slug (가장 최근 연도, 없으면 첫 폴더) */
export function defaultGroupSlug(groups: WorksGroupNav[]): string | null {
  const decades = groups.filter((g) => g.kind === 'decade');
  if (decades.length) return decades[decades.length - 1].slug; // 최신 연도
  return groups[0]?.slug ?? null;
}
