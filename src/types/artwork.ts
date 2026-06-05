// 작품 장르 (회화 기본). 키로 저장하고 화면에서 한/영 라벨로 매핑한다.
export type ArtworkGenre = 'painting' | 'installation' | 'object' | 'drawing';

export const DEFAULT_GENRE: ArtworkGenre = 'painting';

export const GENRE_OPTIONS: { value: ArtworkGenre; ko: string; en: string; slug: string }[] = [
  { value: 'painting', ko: '회화', en: 'Painting', slug: 'paintings' },
  { value: 'installation', ko: '설치', en: 'Installation', slug: 'installations' },
  { value: 'object', ko: '오브제', en: 'Object', slug: 'objets' },
  { value: 'drawing', ko: '드로잉', en: 'Drawing', slug: 'drawings' },
];

// URL slug(paintings/installations/objets/drawings) ↔ genre 매핑
export function genreFromSlug(slug: string): ArtworkGenre | null {
  return GENRE_OPTIONS.find((g) => g.slug === slug)?.value ?? null;
}
export function slugFromGenre(genre: ArtworkGenre): string {
  return GENRE_OPTIONS.find((g) => g.value === genre)?.slug ?? 'paintings';
}

// 작품 묶음(그룹) — genre별 커스텀 묶음. 시리즈/주제 값 매칭으로 정의.
export interface WorkGroup {
  id: string;
  genre: ArtworkGenre;
  name: string;
  name_en: string | null;
  slug: string;            // URL용
  match_field: 'series' | 'theme';
  match_value: string;     // 이 값과 일치하는 작품을 묶음
  order: number;
  created_at: string;
}

export interface WorkGroupFormData {
  genre: ArtworkGenre;
  name: string;
  name_en?: string;
  match_field: 'series' | 'theme';
  match_value: string;
  order?: number;
}

export function genreLabel(genre: ArtworkGenre | null | undefined, locale: 'ko' | 'en' = 'ko'): string {
  const opt = GENRE_OPTIONS.find((g) => g.value === (genre || DEFAULT_GENRE)) ?? GENRE_OPTIONS[0];
  return locale === 'en' ? opt.en : opt.ko;
}

// 폴더 메타데이터 — 작품 분류값에서 자동 도출되는 폴더에 라벨/순서/숨김/슬러그만 덧입힘.
// (멤버십은 작품의 series/theme/region 값으로 결정되므로 여기엔 매칭 정보가 없다.)
export interface WorkFolder {
  genre: ArtworkGenre;
  axis: 'series' | 'theme' | 'region';
  value: string;        // 작품 필드 원본값(보통 한글)
  parent?: string;      // axis='region'일 때 속한 시리즈 값
  slug?: string;        // URL 슬러그 오버라이드(없으면 결정적 생성)
  label?: string;       // 한글 표시 오버라이드(없으면 value)
  label_en?: string;    // 영문 표시 오버라이드(없으면 value_en/value)
  order?: number;       // 같은 축 내 정렬 순서(작을수록 앞)
  hidden?: boolean;     // 공개 네비에서 숨김
  subdivideByRegion?: boolean; // (axis='series') 지역별 하위 폴더로 분할할지 — 켠 시리즈만 지역 하위 노출
}

export interface Category {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  description: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

// Tag system for mindmap connections
export interface Tag {
  id: string;
  name: string;  // 관리자만 보는 언어적 태그
  created_at: string;
}

export interface ArtworkTag {
  artwork_id: string;
  tag_id: string;
  created_at: string;
}

// Connection info for mindmap view
export interface ArtworkConnection {
  connected_id: string;
  shared_tag_count: number;
  shared_tags: string[];
}

// CV 관련 타입
export interface ResidencyItem {
  year: string;
  program: string;
  program_en?: string;
  location: string;
  location_en?: string;
}

export interface CollectionItem {
  year: string;
  name: string;
  name_en?: string;
  location?: string;
  location_en?: string;
}

export interface FellowshipItem {
  year: string;
  name: string;
  name_en?: string;
  organization?: string;
  organization_en?: string;
}

export interface AwardItem {
  year: string;
  name: string;
  name_en?: string;
  organization?: string;
  organization_en?: string;
}

export interface PublicationItem {
  year: string;
  title: string;
  title_en?: string;
  publisher?: string;
  publisher_en?: string;
  type?: 'book' | 'catalog' | 'article' | 'other';
}

export interface Artwork {
  id: string;
  title: string;
  title_en: string | null;
  year: number;
  width: number | null;
  height: number | null;
  medium: string | null;
  medium_en: string | null;
  description: string | null;
  description_en: string | null;
  collection: string | null;
  collection_en: string | null;
  // 분류 필드 (한/영 대조 free text + 장르 enum)
  series: string | null;
  series_en: string | null;
  theme: string | null;
  theme_en: string | null;
  region: string | null;
  region_en: string | null;
  genre: ArtworkGenre;
  variable_size: boolean;
  image_url: string;
  thumbnail_url: string;
  is_featured: boolean;
  show_watermark: boolean;
  hidden: boolean; // true면 공개 사이트에서 숨김 (관리자에는 흐리게 표시)
  order: number;
  category_id: string | null;
  category?: Category;
  // New fields for views
  dominant_color: string | null;  // HSL format for color wheel
  tags?: Tag[];  // Populated via join
  connections?: ArtworkConnection[];  // Populated for mindmap view
  created_at: string;
  updated_at: string;
}

export interface ArtworkFormData {
  title: string;
  title_en?: string;
  year: number;
  width?: number;
  height?: number;
  medium?: string;
  medium_en?: string;
  description?: string;
  description_en?: string;
  collection?: string;
  collection_en?: string;
  series?: string;
  series_en?: string;
  theme?: string;
  theme_en?: string;
  region?: string;
  region_en?: string;
  genre?: ArtworkGenre;
  variable_size?: boolean;
  is_featured?: boolean;
  show_watermark?: boolean;
  hidden?: boolean;
  category_id?: string;
  dominant_color?: string | null;
}

export interface CategoryFormData {
  name: string;
  name_en?: string;
  slug: string;
  description?: string;
  description_en?: string;
}

export interface EducationItem {
  year: string;
  description: string;
  description_en?: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'website' | 'other';
  url: string;
  label?: string;
}

// About(작가소개) — 바이오/연락처/프로필. CV 정보는 CvInfo로 분리됨.
export interface AboutInfo {
  id: string;
  artist_name: string;
  artist_name_en: string | null;
  bio_paragraphs: string[];
  bio_paragraphs_en: string[];
  footer_bio: string | null;
  footer_bio_en: string | null;
  // 연락처
  contact_email: string | null;
  contact_phone: string | null;
  phone_visible: boolean;
  studio_address: string | null;
  studio_address_en: string | null;
  contact_note: string | null;
  contact_note_en: string | null;
  social_links: SocialLink[];
  profile_image_url: string | null;
  updated_at: string;
}

export interface AboutFormData {
  artist_name: string;
  artist_name_en?: string;
  bio_paragraphs: string[];
  bio_paragraphs_en?: string[];
  footer_bio?: string;
  footer_bio_en?: string;
  // 연락처
  contact_email?: string;
  contact_phone?: string;
  phone_visible?: boolean;
  studio_address?: string;
  studio_address_en?: string;
  contact_note?: string;
  contact_note_en?: string;
  social_links?: SocialLink[];
  profile_image_url?: string;
}

// CV(이력) — About에서 분리된 별도 컬렉션. 학력/경력/출생·거주/CV파일.
export interface CvInfo {
  id: string;
  // 출생지/거주지
  birth_city: string | null;
  birth_city_en: string | null;
  birth_country: string | null;
  birth_country_en: string | null;
  live_city: string | null;
  live_city_en: string | null;
  live_country: string | null;
  live_country_en: string | null;
  // 경력 섹션
  education: EducationItem[];
  residencies: ResidencyItem[];
  collections: CollectionItem[];
  fellowships: FellowshipItem[];
  awards: AwardItem[];
  publications: PublicationItem[];
  cv_file_url: string | null;
  updated_at: string;
}

export interface CvFormData {
  birth_city?: string;
  birth_city_en?: string;
  birth_country?: string;
  birth_country_en?: string;
  live_city?: string;
  live_city_en?: string;
  live_country?: string;
  live_country_en?: string;
  education: EducationItem[];
  residencies?: ResidencyItem[];
  collections?: CollectionItem[];
  fellowships?: FellowshipItem[];
  awards?: AwardItem[];
  publications?: PublicationItem[];
  cv_file_url?: string;
}

// 운영 통계(방문자) — Vercel Blob `stats.json`. 일자별 다차원 집계(기간 필터용).
export interface StatsDay {
  pageviews: number;
  visits: number;
  hours: Record<string, number>;       // KST 시간대 '0'..'23'
  countries: Record<string, number>;   // 국가코드(국내='KR')
  paths: Record<string, number>;       // 경로별
  referrers: Record<string, number>;   // 일반 유입 호스트
  search: Record<string, number>;      // 검색엔진별 유입(google/naver/...)
  devices: Record<string, number>;     // mobile/desktop
  browsers: Record<string, number>;    // Chrome/Safari/...
  artworks: Record<string, number>;    // 작품 id별 조회
  exhibitions: Record<string, number>; // 전시 id별 조회
  series: Record<string, number>;      // 시리즈별 인기
  themes: Record<string, number>;      // 주제별 인기
  dwellSum: number;                    // 체류시간 합(ms)
  dwellCount: number;                  // 체류 측정 건수
}

export interface StatsData {
  id: string;
  totals: { pageviews: number; visits: number }; // 전체 누적
  daily: Record<string, StatsDay>;               // key: 'YYYY-MM-DD'(KST)
  updated_at: string | null;
}

// 기간 합산 결과(StatsPanel/CSV 공용)
export interface StatsAggregate {
  pageviews: number;
  visits: number;
  avgDwellMs: number;
  hours: Record<string, number>;
  countries: Record<string, number>;
  referrers: Record<string, number>;
  search: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  paths: Record<string, number>;
  artworks: Record<string, number>;
  exhibitions: Record<string, number>;
  series: Record<string, number>;
  themes: Record<string, number>;
  trend: { date: string; pageviews: number; visits: number }[];
}

// Exhibition page types
export type ExhibitionType =
  | 'solo' | 'duo' | 'trio' | 'group' | 'popup'
  | 'curated' | 'invitational' | 'artfair' | 'biennale' | 'competition';

export const EXHIBITION_TYPE_OPTIONS: { value: ExhibitionType; ko: string; en: string }[] = [
  { value: 'solo', ko: '개인전', en: 'Solo Exhibition' },
  { value: 'duo', ko: '2인전', en: 'Two-person Exhibition' },
  { value: 'trio', ko: '3인전', en: 'Three-person Exhibition' },
  { value: 'group', ko: '그룹전', en: 'Group Exhibition' },
  { value: 'popup', ko: '팝업전', en: 'Pop-up Exhibition' },
  { value: 'curated', ko: '기획전', en: 'Curated Exhibition' },
  { value: 'invitational', ko: '초대전', en: 'Invitational Exhibition' },
  { value: 'artfair', ko: '아트페어', en: 'Art Fair' },
  { value: 'biennale', ko: '비엔날레', en: 'Biennale' },
  { value: 'competition', ko: '공모전', en: 'Competition' },
];

export function exhibitionTypeLabel(type: ExhibitionType | string, locale: 'ko' | 'en' = 'ko'): string {
  const o = EXHIBITION_TYPE_OPTIONS.find((t) => t.value === type);
  return o ? (locale === 'en' ? o.en : o.ko) : String(type);
}

export interface Exhibition {
  id: string;
  title: string;
  title_en: string | null;
  venue: string;
  venue_en: string | null;
  location: string | null;
  location_en: string | null;
  year: number;
  type: ExhibitionType;
  external_url: string | null;
  display_order: number;
  created_at: string;
  // 확장: special(비엔날레·아트페어 임팩트) + 기간 기반 자동 분류(current/past)
  is_special?: boolean;
  start_date?: string | null;   // ISO (YYYY-MM-DD)
  end_date?: string | null;     // ISO; 지나면 자동 past
  image_url?: string | null;
  subtitle?: string | null;
  subtitle_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  city?: string | null;
  city_en?: string | null;
  hidden?: boolean; // true면 공개 사이트에서 숨김 (관리자 리스트엔 표시)
}

export type ExhibitionStatus = 'special' | 'current' | 'past';

export interface ExhibitionFormData {
  title: string;
  title_en?: string;
  venue: string;
  venue_en?: string;
  location?: string;
  location_en?: string;
  year: number;
  type: ExhibitionType;
  external_url?: string;
  display_order?: number;
  is_special?: boolean;
  start_date?: string;
  end_date?: string;
  image_url?: string;
  subtitle?: string;
  subtitle_en?: string;
  description?: string;
  description_en?: string;
  city?: string;
  city_en?: string;
  hidden?: boolean;
}

// Press 타입 (Articles / Broadcasts) — Resources 패턴 미러링
export type PressCategory = 'article' | 'broadcast';

export const PRESS_CATEGORIES: { value: PressCategory; slug: string; label: string }[] = [
  { value: 'article', slug: 'articles', label: 'Articles' },
  { value: 'broadcast', slug: 'broadcasts', label: 'Broadcasts' },
];

export function pressCategoryFromSlug(slug: string): PressCategory | null {
  return PRESS_CATEGORIES.find((c) => c.slug === slug)?.value ?? null;
}
export function pressSlug(cat: PressCategory): string {
  return PRESS_CATEGORIES.find((c) => c.value === cat)?.slug ?? 'articles';
}

export interface Press {
  id: string;
  category: PressCategory;
  title: string;
  title_en: string | null;
  content: string;
  content_en: string | null;
  thumbnail_url: string | null;
  link_url: string | null;
  pdf_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface PressFormData {
  category: PressCategory;
  title: string;
  title_en?: string;
  content: string;
  content_en?: string;
  thumbnail_url?: string;
  link_url?: string;
  pdf_url?: string;
  published_at?: string;
}

// Resources 타입 (Making Works / Writings) — Press 패턴 미러링
export type ResourceCategory = 'making' | 'writing';

export const RESOURCE_CATEGORIES: { value: ResourceCategory; slug: string; label: string }[] = [
  { value: 'making', slug: 'making', label: 'Process' },
  { value: 'writing', slug: 'writings', label: 'Writings' },
];

export function resourceCategoryFromSlug(slug: string): ResourceCategory | null {
  return RESOURCE_CATEGORIES.find((c) => c.slug === slug)?.value ?? null;
}
export function resourceSlug(cat: ResourceCategory): string {
  return RESOURCE_CATEGORIES.find((c) => c.value === cat)?.slug ?? 'making';
}

export interface Resource {
  id: string;
  category: ResourceCategory;
  title: string;
  title_en: string | null;
  content: string;
  content_en: string | null;
  thumbnail_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceFormData {
  category: ResourceCategory;
  title: string;
  title_en?: string;
  content: string;
  content_en?: string;
  thumbnail_url?: string;
  published_at?: string;
}

// Contact 타입
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// 홈 팝업 공지 (최대 2개)
export const MAX_NOTICES = 2;

export type NoticePosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const NOTICE_POSITION_OPTIONS: { value: NoticePosition; ko: string }[] = [
  { value: 'center', ko: '중앙' },
  { value: 'top-left', ko: '좌상단' },
  { value: 'top-right', ko: '우상단' },
  { value: 'bottom-left', ko: '좌하단' },
  { value: 'bottom-right', ko: '우하단' },
];

export interface Notice {
  id: string;
  active: boolean;
  position: NoticePosition;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  link_label_en: string | null;
  start_date: string | null; // ISO YYYY-MM-DD (미설정 시 제한 없음)
  end_date: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface NoticeFormData {
  active?: boolean;
  position?: NoticePosition;
  title: string;
  title_en?: string;
  body?: string;
  body_en?: string;
  image_url?: string;
  link_url?: string;
  link_label?: string;
  link_label_en?: string;
  start_date?: string;
  end_date?: string;
}
