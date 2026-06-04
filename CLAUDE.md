# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ## ⚠️ 디렉토리/프로젝트 구분 — 절대 혼동 금지 (깊게 기억할 것)
>
> 이 저장소는 **지오 최(Jioh Choi) 작가 홈페이지**이며, **추니박(chuni_park) 프로젝트를 그대로 복제**해 만든 베이스다.
> 비슷한 이름의 디렉토리/프로젝트가 여럿 있어 혼동하기 쉽다. 반드시 구분하라:
>
> | 경로/이름 | 정체 | 상태 |
> |---|---|---|
> | `/git/jioh_choi` (언더스코어 O) | **현재 이 프로젝트.** 지오 최 홈페이지 (chuni_park 복제본) | **작업 대상** |
> | `/git/jiohchoi` (언더스코어 X) | 이전에 만들던 옛 지오 최 프로젝트 | **2026-06-04 삭제됨. 부활/참조 금지** |
> | `/git/chuni_park` | 복제 원본(추니박 포트폴리오) | 별개 프로젝트. 건드리지 말 것 |
>
> **인프라(현재 jioh_choi가 사용):** GitHub `jioh-choi84/homepage`, Vercel 프로젝트 `homepage`(team jioh-choi84s-projects, 도메인 www.jiohchoi.com), Cloudinary `dw2gl9cnx`, Vercel Blob `1emnts5a5zzhky2p`. 모든 자격증명은 누나 계정(jioh-choi84 / chj6859@gmail.com) 소유.
> **chuni 인프라(절대 사용 금지):** Cloudinary `dqtx4qzgj`, Blob `cacqlea3b4exg53h`, 도메인 `chuniart.com`. 코드에 이 식별자가 하드코딩으로 새어들면 버그다.
>
> **환경변수 주의:** 코드(`src/lib/data.ts`)는 `NEXT_PUBLIC_BLOB_BASE`를 읽는다(끝에 `/data`는 코드가 자동 부착). 옛 `BLOB_BASE_URL` 키와 혼동 금지.
> **아래 문서 본문은 복제 원본(chuni_park) 기준 서술이 다수 남아 있다.** "Chuni Park", "chuniart.com" 등 표시 텍스트는 복제 시 의도적으로 그대로 둔 것이며, 추후 "최소 수정" 단계에서 지오 최 콘텐츠로 교체 예정이다.

## Project Overview

Artist portfolio website for Chuni Park (화가 추니박) — a full-stack Next.js application with bilingual support (Korean/English) and an admin CMS. Images are stored on Cloudinary; structured content (artworks, exhibitions, resources, press, about, etc.) is stored as JSON on Vercel Blob. Live at **https://www.chuniart.com**, deployed on Vercel.

The information architecture follows a David Hockney–style reference: a top horizontal nav with hover dropdowns, genre-based Works, cinematic Exhibitions, and rich-text Resources.

## Commands

```bash
npm run dev      # Development server at localhost:3000
npm run build    # Production build (also the primary local verification step)
npm start        # Run production server
npm run lint     # ESLint check
```

## Architecture

### Tech Stack
- **Framework**: Next.js **15.5.x** (App Router). Note: only `eslint-config-next` is on 16.x — the runtime is Next 15.5, React **18.3**.
- **Styling**: Tailwind CSS **4**, TypeScript 5
- **Image storage**: Cloudinary (signed direct uploads + transformation URLs)
- **Data storage**: Vercel Blob — JSON files under `data/` (see `src/lib/data.ts`); seed copies in `src/data/`
- **Rich text editor**: **CKEditor 5** (`ClassicEditor`, GPL license — no license key needed). Used in admin Resources/Press.
- **AI**: Google Gemini via Vercel AI SDK (`ai` + `@ai-sdk/google`) — KO→EN translate + scan OCR (see AI features). *(TipTap packages are still installed but unused — see Vestigial Dependencies.)*
- **Email**: Resend (contact form)
- **UI**: Headless UI for accessible components
- **i18n**: Custom React Context solution (not next-intl)

### Directory Structure
```
src/
├── app/
│   ├── page.tsx                          # Home (landing)
│   ├── about/  cv/  contact/             # Static-ish pages
│   ├── press/                            # Press (= ex-News): /press → /press/[category]/[id] (articles|broadcasts)
│   ├── works/                            # Genre cards
│   │   ├── [genre]/                      # Genre landing (2nd nav: decade + custom groups)
│   │   └── [genre]/[group]/              # Master-detail artwork view (+ ArtworkModal zoom/pan)
│   ├── exhibition/                       # Special = cinematic fullscreen scroll
│   │   └── [status]/                     # special | current | past (date-classified)
│   ├── resources/                        # making / writings
│   │   └── [category]/[id]/              # Resource detail (CKEditor HTML body)
│   ├── admin/  admin/login/              # Protected tabbed CMS
│   └── api/                              # REST API endpoints
├── components/
│   ├── common/      # TopNav, SidePanel (mobile drawer), Header, Footer, Modal, LanguageSwitch
│   ├── artwork/     # ArtworkCard, ArtworkGrid, ArtworkModal, ZoomableImage
│   ├── works/       # WorksOverview, WorksGenreScreen
│   ├── landing/  exhibition/  press/  contact/  about/  resources/
│   └── admin/       # Forms + tables, RichEditor(+Client), WorkGroupManager,
│                    #   ResourceManager, ImageUploader, ArtworkBatchUpload
├── lib/             # see below
├── i18n/            # index.tsx + translations/ko.ts, en.ts
├── contexts/        # React Context providers (e.g. SidePanelContext)
└── types/           # artwork.ts (all domain types)
```

`/portfolio` and `/artworks` are **not pages** — they redirect to `/works`. (Only `/api/portfolio` exists as an endpoint.)

### `src/lib/` modules
- `data.ts` — Vercel Blob JSON data layer (read/write) with in-memory cache + per-file write-lock mutex
- `cloudinary.ts` / `cloudinary-loader.ts` — Cloudinary config + `optimizeCloudinaryUrl()` / Next.js Image loader
- `works.ts` / `works-page.ts` — Works grouping (decade groups, genre filtering, custom group nav) + server-side page data
- `exhibition.ts` — Exhibition status classification (special/current/past) + sorting
- `menu.ts` — builds TopNav/SidePanel menu structure from i18n labels
- `i18n-utils.ts` — `getLocalizedValue()` locale fallback + `formatTranslation()`
- `parse-artwork-filename.ts` — `parseArtworkFilename()` extracts title/size/medium/year from filename
- `image-compress.ts` — client-side WebP compression (incl. TIFF via `utif`) before upload
- `client-cache.ts` — browser fetch cache with TTL for public API calls

### Data Flow
1. **Public pages**: SSR/ISR with client-side hydration
2. **Admin pages**: Client-side with cookie-based auth
3. **API routes**: Server-side mutations write JSON to Vercel Blob (`BLOB_READ_WRITE_TOKEN`); admin routes guarded by the `admin_session` cookie

### Data Collections (Vercel Blob JSON)
Each is a JSON file under `data/` (seed copy in `src/data/`). All content types carry bilingual `*_en` field variants.
- `portfolio` — Artworks (genre, series/theme, medium, year, tags, hidden flag, order)
- `categories` — Artwork categories with slugs
- `tags` — Global tag set
- `exhibitions` — Exhibition records (is_special, start/end_date, image_url, city, subtitle, description, **hidden**)
- `press` — **Press** items (renamed from `news`; `category: article | broadcast`, bilingual body). Public at `/press` → `/press/articles|broadcasts`; `/news/*` 301-redirects to `/press`.
- `about` — Artist bio / CV (single object)
- `work_folders` — Works 2nd-level nav (folders by series/theme/region; current system; legacy `work_groups` still present)
- `resources` — Making-works / writings (CKEditor HTML body)
- `notices` — Home popup notices (NoticePopup); `/api/notices`
- `admin_settings` — Admin config (incl. password hash)

### Domain Concepts
- **Genre** (`ArtworkGenre`): `painting | installation | object | drawing` → URL slugs `paintings | installations | objets | drawings` (`genreFromSlug`/`slugFromGenre` in `types/artwork.ts`)
- **WorkGroup**: an admin-defined custom bundle matching artworks by series/theme; renders as the right-aligned 2nd-level nav on Works pages. Years auto-group into decades.
- **Exhibition**: classified by date — `special` (cinematic fullscreen), `current`, `past` (auto when `end_date` passes)
- **Resource**: category `making` (slug `making`) or `writing` (slug `writings`); body is CKEditor-produced HTML rendered via `.rich-content` styles
- **Press**: category `article` (slug `articles`) or `broadcast` (slug `broadcasts`); CKEditor HTML body (ko) + optional `content_en`

### AI features (Google Gemini via AI SDK)
Uses `ai` + `@ai-sdk/google`. Key: **`GOOGLE_GENERATIVE_AI_API_KEY`** (paid/billing-enabled). All routes are admin-guarded.
- **KO→EN translate** (`/api/translate`, model `gemini-2.5-flash`): admin forms have per-field `TranslateButton` + per-form `TranslateAllButton` (`src/components/admin/TranslateButton.tsx`) to auto-fill `*_en` fields.
- **Scan → Press OCR** (`/api/press/ocr`, model **`gemini-2.5-pro`**, multimodal): upload a scanned newspaper image → OCR (ko+en) + photo bounding boxes → photos cropped via **Cloudinary `c_crop` URL** (not sharp) → builds Neolook-style HTML (figure `class="image"` so `.ck-content` styles the caption) + extracts 전시정보/source. PressManager top dropzone. OCR accuracy levers (model-independent, kept): `providerOptions.google.mediaResolution: HIGH` (dense-text OCR) + client uploads at maxEdge 4000/7MB; route `maxDuration=180`, `maxRetries=2`, default (dynamic) thinking. *(gemini-3.1-pro-preview was trialed but reverted — quality gain over 2.5-pro was negligible while cost/latency rose; thinkingLevel is a Gemini-3-only option.)*
- **Neolook import** (`/api/exhibitions/import-neolook`): server-fetches a neolook.com article (falls back to `r.jina.ai` when its WAF 403s Vercel IPs; images via `images.weserv.nl`) → fills the Exhibition form.
- Notes: Gemini free tier rate-limits (429) — keep `maxRetries` low; thinking disabled for translate, on for OCR.

### Admin save UI
Centralized in **`src/components/admin/SaveBar.tsx`** — one big centered "저장" button (term unified), inline success/error message below it (failure shows the cause in red). Used by all admin forms; cancel button (right of save) only where logical (modals; managers/Exhibition in edit mode).

### Authentication
- Single admin password (bcrypt-hashed comparison)
- HTTP-only cookie: `admin_session`
- `src/middleware.ts` protects `/admin/*` routes (except `/admin/login`)

### i18n Pattern
```tsx
const { locale, t } = useLocale();   // src/i18n/index.tsx — default 'ko', persisted to localStorage
// t.nav.home, t.footer.title, etc.  (translations in src/i18n/translations/{ko,en}.ts)
// Database fields: title/title_en, description/description_en
getLocalizedValue(locale, koValue, enValue);  // returns en if non-empty, else ko fallback
```

## Key Patterns

### Path Aliases
- `@/*` maps to `./src/*` (e.g., `@/components/common/Header`)

### Image Handling
- Upload pipeline compresses client-side to **WebP, long edge ≤ 4000px, ~9.5MB** and stores **only the compressed version** on Cloudinary (originals are *not* preserved). Upload size limit: **200MB**.
- **TIFF supported** — decoded via `utif` then re-encoded to WebP. Shared across `ImageUploader`, `ArtworkBatchUpload`, and the rich editor.
- `ZoomableImage` (react-zoom-pan-pinch) provides pan/zoom on artwork detail; `ArtworkModal` adds zoom + left/right arrow navigation.

### Component Conventions
- Feature-based organization under `components/`
- Common components reused across features
- Admin components handle their own API calls

## Data Layer Caveats (IMPORTANT)

Vercel Blob has **read-after-write propagation delay** (CDN eventual consistency). Follow these rules or admin edits will appear to "not save":

- **Admin inline edits must NOT re-fetch the full list** after a mutation. Apply **optimistic local state updates** instead (the POST/PATCH response is the source of truth for the just-changed item).
- **Tags** are written as a full-set **replace**: `POST /api/portfolio/[id]/tags { replace: true }`. Do not append-then-refetch.
- `updateArtwork` has **no verify-retry loop** — it trusts a successful `put()`. Mutation routes call `revalidatePath`.
- **Never run `scripts/seed-blob.mjs` in full** against the live store — it overwrites all collections. To create a *new* Blob file, `put()` that single file only (e.g. `put('data/<name>.json', '[]')`).
- `data.ts`: in-memory cache + per-file write-lock mutex; when `NEXT_PUBLIC_BLOB_BASE` is unset it falls back to the `src/data/` seed JSON (build time / before Blob is configured).

## Deployment & Ops

- **`git push origin main` triggers automatic production deploy** on Vercel (team `chunipark-s-projects`, project `chuni-park`). Commit author is repo-local `Chuni Park <morran444@gmail.com>`.
- Live: https://www.chuniart.com · Admin: `/admin`
- **Default workflow when work is done: commit → push → let Vercel build/deploy → report** (do NOT gate on local `npm run build` every time). Vercel builds before promoting, so a compile error fails the deploy and production stays on the last good build. Run a local build only when you suspect a risky change. (The owner authorized auto commit/push for this repo, overriding the global "confirm before push" rule.)
- Polling deploy status or running Blob scripts needs a Vercel token (user-supplied). `BLOB_READ_WRITE_TOKEN` lives in `.env.local` (auto-injected on Vercel).

## Environment Variables

Required in `.env.local` (see `.env.example`):
```
# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Vercel Blob (JSON data)
NEXT_PUBLIC_BLOB_BASE=https://<id>.public.blob.vercel-storage.com
BLOB_READ_WRITE_TOKEN=         # auto-injected on Vercel

# Admin auth
ADMIN_PASSWORD=
NEXT_PUBLIC_ADMIN_HINT=

# Resend (contact form)
RESEND_API_KEY=
CONTACT_TO_EMAIL=

# Google Gemini (admin AI 영작 + 스캔 OCR). Google AI Studio key; billing/paid tier 권장.
GOOGLE_GENERATIVE_AI_API_KEY=
```

(For local ops, `.env.local` also holds a user-supplied `VERCEL_TOKEN` for redeploy/status/env via CLI — gitignored, never commit.)

## Dependency Notes

`ai` + `@ai-sdk/google` power the AI features (translate, Press OCR, see AI features above). `sharp` is kept for Next image optimization (the OCR crop uses Cloudinary `c_crop`, **not** sharp, for Vercel reliability).

Unused clone-leftover packages were removed (graph/mind-map libs `sigma`/`graphology*`/`react-force-graph`/`three`/`d3-force`, `@tiptap/*` → superseded by CKEditor 5, `next-cloudinary` → custom `cloudinary-loader.ts` used instead, `node-vibrant` → color analysis uses the Cloudinary API, `pg` → all data is on Vercel Blob). `@types/react`/`@types/react-dom` are pinned to `^18` to match the React 18.3 runtime.

`sharp` is kept (no explicit import) because Next.js image optimization uses it implicitly — do not remove.

## Documentation

Feature specs are written per-feature under `docs/superpowers/specs/` during the brainstorming → planning workflow. Session continuity notes live in `progress.md` at the repo root.
