# 설계: 관리자 메뉴 개편 + CV/About 스키마 분리

작성일: 2026-06-02

## Context (배경)

관리자 CMS의 상단 탭이 홈페이지 공개 메뉴와 제목·순서·컬러가 제각각이라 일관성이 없다. 또한 작가 정보가 `about` 한 컬렉션에 **About(바이오/연락처)**와 **CV(학력/경력)**가 뒤섞여 있어 편집·관리가 혼란스럽다. 이 작업은 (1) 관리자 탭을 공개 메뉴와 시각적으로 일치시키고, (2) CV 데이터를 별도 스키마/컬렉션으로 분리해 전용 관리자 메뉴에서 편집하게 하며, (3) 부수적 UI 정리(업로더 크기, 명칭)를 수행한다.

## 요구사항 (사용자 확정)

1. 관리자 상단 탭 = 홈페이지 메뉴의 **제목·순서·컬러** 일치
2. About에서 **CV 관련 필드를 분리**해 신규 CV 관리자 탭에서 편집 (DB 스키마 분리 — 신중히)
3. 묶음관리 → **series**로 개명(홈페이지 메뉴엔 없음), 전시→Exhibition, 뉴스→News 식 대응
4. 작가소개·Resources 이미지 업로더 영역 → **너비 30%** 축소·좌측정렬
5. 설정 → **setting**으로 개명

### 결정사항
- 탭 순서: 홈 순서 그대로(CV·Works·Exhibition·Resources·News) + 나머지 뒤(series·About·setting). Home·Contact은 편집 콘텐츠 없어 제외.
- CV/About 경계: **표준 분리**. `artist_name`은 About 유지, CV가 참조.
- 범위: **관리자+공개 페이지 모두 갱신** + 기존 데이터 마이그레이션.
- 업로더: **너비 30%, 좌측정렬**.

## 1. 데이터 스키마 분리

**신규 `cv` 컬렉션 / `CvInfo` 타입** (CV 전용):
`id`, `birth_city/birth_city_en/birth_country/birth_country_en`, `live_city/live_city_en/live_country/live_country_en`, `education[]`, `residencies[]`, `fellowships[]`, `awards[]`, `publications[]`, `cv_file_url`, `updated_at`

**축소된 `AboutInfo`** (위 CV 필드 제거): `id`, `artist_name(+en)`, `bio_paragraphs(+en)`, `footer_bio(+en)`, `contact_email`, `contact_phone`, `phone_visible`, `studio_address(+en)`, `contact_note(+en)`, `social_links[]`, `profile_image_url`, `updated_at`

`CvFormData` 신설(필드 optional, id/updated_at 제외). `AboutFormData`에서 CV 필드 제거.

> 타입에서 CV 필드를 깔끔히 제거 → TS 컴파일러가 누락 reader를 자동 적발.

**파일**: `src/types/artwork.ts`

## 2. 데이터 계층

`src/lib/data.ts`에 추가 (기존 about 함수 미러):
```ts
export async function getCv(): Promise<AnyData> { return fetchJson<AnyData>('cv'); }
export async function updateCv(cv: AnyData): Promise<void> { await writeJson('cv', cv); }
```
`cv` 이름은 fetchJson/writeJson이 자동 처리(중앙 레지스트리 없음).

## 3. 마이그레이션

**Seed** (빌드/로컬 fallback):
- `src/data/cv.json` 신설 (기존 about seed의 CV 필드 이전, 빈 기본값)
- `src/data/about.json`에서 CV 필드 제거

**`scripts/migrate-cv.mjs`** (1회성, 라이브 Blob):
1. `about.json`(Blob 공개 URL) 읽기
2. **멱등 가드**: CV 필드가 없으면 이미 마이그레이션됨 → skip
3. CV 필드 추출 → `put('data/cv.json', cv)`; CV 필드 제거 → `put('data/about.json', about)`
4. 단일 파일 put만(`allowOverwrite:true`), 전체 seed 금지
- 🔑 실행 필요: `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_BLOB_BASE`

## 4. API

- 신규 `src/app/api/cv/route.ts` — `/api/about` 미러: GET 공개(`getCv`), PUT 인증(`getCv`+merge+`updateCv`), `revalidatePath('/cv')`
- `src/app/api/about/route.ts` — revalidate 경로 `['/', '/contact', '/about']` (`/cv` 제거, `/about` 추가)

## 5. 관리자 UI

**탭 (`src/app/admin/page.tsx`)** — `Tab` 타입에 `'cv'` 추가, 순서/라벨/컬러:

| key | 라벨 | 컬러 |
|-----|------|------|
| cv (신규) | CV | #2563eb |
| artworks | Works | #d12d2d |
| exhibitions | Exhibition | #0e7490 |
| resources | Resources | #15803d |
| news | News | #b45309 |
| workgroups | series | #6b7280 |
| about | About | #6b7280 |
| settings | setting | #6b7280 |

- cv 상태(`cvInfo`, `cvLoading`), `fetchCv`, `handleCvSubmit`(PUT /api/cv) 추가
- 탭 텍스트=컬러, 활성=동일 컬러 underline. 기본 활성 탭은 `artworks`(Works) 유지.
- 색상 공유: `NAV_COLORS`를 `TopNav.tsx` → `src/lib/menu.ts`로 추출, TopNav·admin 공통 import

**폼**:
- 신규 `src/components/admin/CvForm.tsx` — AboutForm에서 CV 섹션(출생/거주·학력·레지던시·펠로십·수상·출판) 추출, `CvFormData` 제출
- `src/components/admin/AboutForm.tsx` — CV 섹션 제거, About 필드만
- `cv_file_url`: 현재 폼 UI 없음 → 스키마/데이터만 보존, 신규 UI 미추가(범위 외)

## 6. 공개 페이지

- 기존 `src/components/about/AboutContent.tsx`(실제 CV 렌더) → `src/components/cv/CvContent.tsx`로 이동·개명. props: `cvInfo: CvInfo | null`, `artistName: string`, `exhibitions: Exhibition[]`
- `src/app/cv/page.tsx` → `getCv()` + `getAbout()`(이름) + `getExhibitions()` → `CvContent`
- `src/app/about/page.tsx` → 신규 `AboutContent`(프로필+바이오+연락처 요약), `getAbout()`만
- `ContactContent`·`Footer`·`ArtworkModal` → About 필드 그대로, **변경 없음**

## 7. 이미지 업로더 축소

- `AboutForm`(프로필)·`ResourceManager`(썸네일)의 `<ImageUploader>`를 `<div className="w-[30%] min-w-[160px]">`로 감싸 좌측정렬
- ArtworkForm·ExhibitionForm·CategoryForm 업로더는 **변경 없음**

## 8. 검증

- `npm run build` (타입체크로 스키마 누락 reader 적발)
- 로컬: 관리자 탭 8개 순서/컬러, CV·About 폼 분리 저장, `/cv`·`/about`·`/contact`·footer 렌더 확인
- 마이그레이션: 로컬 seed fallback 확인 후 사용자가 토큰으로 Blob 마이그레이션 실행

## 구현 순서

스키마/타입 → data.ts → seed + 마이그레이션 스크립트 → API(cv route, about revalidate) → menu.ts 색상 추출 → 관리자(탭·CvForm·AboutForm) → 공개페이지(CvContent·about) → 업로더 → build 검증
