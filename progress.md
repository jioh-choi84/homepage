# chuni_park 작업 진행 상황 (progress)

> 컨텍스트 초기화 대비 연속성 보존용. 다음 세션에서 이 파일 + `CLAUDE.md` + `~/.claude/.../memory/` 를 먼저 읽고 이어서 진행.

## 프로젝트 개요
- 화가 **추니박(Chuni Park)** 포트폴리오. Next.js **15.5.x 런타임**(eslint-config-next만 16) / 이미지=Cloudinary(cloud `dqtx4qzgj`) / 데이터=Vercel Blob JSON(`src/lib/data.ts`) / 메일=Resend / **AI=Google Gemini**(번역·OCR) / 배포=Vercel. **배포 워크플로(원칙)**: 작업 완료→자동 commit→push→Vercel 빌드→**배포상태 폴링 보고**. 폴링용 `VERCEL_TOKEN`은 `.env.local`(gitignore).
- 라이브: **https://www.chuniart.com** (및 chuniart.com). Vercel: team `chunipark-s-projects`, project `chuni-park`. Blob 공개 URL `https://cacqlea3b4exg53h.public.blob.vercel-storage.com`.
- GitHub: **morran444/chuni_park** (private). **`git push origin main` → 자동 프로덕션 배포.** 커밋 작성자=`Chuni Park <morran444@gmail.com>`(repo-local), push 자격증명은 `.git/.morran-credentials`(morran444 PAT).
- 최신 커밋: **78e3149** (docs, 2026-06-04). 기능 최신=cf0d73f(Press·AI·notices·SaveBar 등).

---

## 1) 현재까지의 작업
- **Phase1**: jungwhan_paintings → chuni_park 클론, 전용 Cloudinary/Vercel/Blob 분리, 빈 데이터, 브랜딩, 라이브 배포.
- **소유권 정리**: 레포 morran444로 이전, spchoi 흔적/whanable·jungwhan 흔적 제거(docs/·supabase/·migrations/ 삭제), 커밋·푸시·배포 morran444 일원화.
- **관리자 개선**: 숨기기(hidden, 공개 제외+썸네일/폼 흐림 blur-[3px]), 썸네일 호버 큰그림 미리보기, 태그 인스타식→**로컬 칩 상태 + replace 저장**(전체 새로고침 제거), 목록 컴팩트(px-1, text-xs, 재료→시리즈·주제, 액션 버튼 상하·컴팩트, 헤더 우측/가운데정렬), 대표작/숨김/태그/추가 모두 **낙관적 로컬 갱신**.
- **IA 개편(Hockney 레퍼런스)**:
  - **Phase A**: 상단 수평 `TopNav`(우측 정렬) + 호버 드롭다운, 메뉴별 컬러(**Works 빨강 #d12d2d**), 모바일 `SidePanel` 드로어. 메뉴=Home·CV·Works·Exhibition·Resources·News·Contact (Dialogue 제거). 좌측 브랜드는 텍스트(추후 PNG 교체 예정).
  - **Phase B Works**: genre 4종(painting/installation/object/**drawing 추가**), slug=paintings/installations/objets/drawings. `WorkGroup`(시리즈/주제 매칭 커스텀 묶음) + 관리자 "묶음 관리" 탭(`WorkGroupManager`, API `/api/work-groups`). `/works`(장르카드)·`/works/[genre]`·`/works/[genre]/[group]`: 2차 네비=연도(10년 자동)+커스텀묶음(우측정렬, 호크니식), **마스터-디테일**(대형+썸네일) + **호버 +버튼→ArtworkModal 줌/팬 + 좌우 화살표**. 기존 /portfolio 3뷰·components/portfolio·뷰API 삭제, `/portfolio·/artworks→/works` 리다이렉트.
  - **Phase C Exhibition**: 모델 확장(is_special, start/end_date, image_url, subtitle, description, city +_en). `/exhibition`=special **시네마틱 풀스크린 스크롤**, `/exhibition/{special|current|past}`(목록 우측네비). 분류=날짜 자동(end_date 지나면 past). `ExhibitionForm`에 special토글·이미지·기간·도시·부제·설명 추가.
  - **Phase D Resources**: `/resources`·`/resources/[category]`(making/writings)·`/resources/[category]/[id]`. 관리자 Resources 탭(`ResourceManager`). 편집기=**CKEditor 5(ClassicEditor, GPL)** — 굵게/기울임/제목/목록/링크/인용, **이미지 드래그 리사이즈·정렬·캡션**, **YouTube 임베드 + 너비 50/75/100%**(커스텀 `ResizableMediaPlugin`), 이미지 업로드는 Cloudinary 어댑터. 공개 본문은 HTML 렌더(`.rich-content` 스타일).
- **업로드 개선**: **TIFF 지원**(`utif`로 디코딩→WebP), 원본 한도 **200MB**, 압축본(긴변4000px·WebP·~9.5MB)만 Cloudinary 저장(원본 미보존). ImageUploader/ArtworkBatchUpload/RichEditor 공통.
- **작품추가 버그수정(직전)**: 추가 후 목록 미반영(stale 재조회)→**POST/배치 응답으로 낙관적 추가**. 단일 폼 **파일명 자동 파싱**(`parseArtworkFilename`, 빈 칸만 채움). 일괄업로드 파싱은 원래 동작(파서 검증됨).

- **관리자 메뉴 개편 + CV/About 스키마 분리(직전)**: 설계서 `docs/superpowers/specs/2026-06-02-admin-menu-cv-split-design.md`.
  - 관리자 탭=홈페이지 메뉴와 제목·순서·컬러 일치(홈 순서 그대로+나머지 뒤): **CV·Works·Exhibition·Resources·News·series·About·setting**. 색상은 `src/lib/menu.ts`의 `NAV_COLORS`(TopNav와 공유)+중립색. 묶음→series, 설정→setting, 작품→Works 등 영문 라벨.
  - **CV 스키마 분리**: `AboutInfo`에서 CV 필드(출생/거주·education·residencies·fellowships·awards·publications·cv_file_url) → 신규 `CvInfo`/`cv` Blob 컬렉션. `getCv`/`updateCv`(data.ts), `/api/cv` route, seed `src/data/cv.json`. About는 바이오/연락처/프로필만.
  - 관리자 폼: 신규 `CvForm`(CV 섹션), `AboutForm`은 About 필드만.
  - 공개: 기존 AboutContent(실제 CV) → `src/components/cv/CvContent.tsx`로 이동(props: cvInfo+artistName/En+exhibitions). `/cv`=CvContent(getCv+getAbout이름+getExhibitions), `/about`=새 AboutContent(프로필+바이오+연락처요약). Contact/Footer/ArtworkModal은 About 필드 그대로(무변경).
  - 업로더 30% 축소: AboutForm 프로필·ResourceManager 썸네일 `w-[30%] min-w-[160px]` 래핑.
  - **마이그레이션 필요(배포 후)**: 🔑 `scripts/migrate-cv.mjs` (`NEXT_PUBLIC_BLOB_BASE`+`BLOB_READ_WRITE_TOKEN`) — 라이브 about.json→cv.json 분리. 멱등 가드 有. **미실행 시 /cv의 CV 데이터가 빈 상태**(seed fallback은 빈 값).
  - `npm run build` 통과(31/31).

## 1.5) 2026-06-03~04 세션 주요 작업
- **CV 소장처(collections)**: 레지던시·펠로우십 사이 소장처(연도/기관명·지역, 한·영) 항목 추가(타입·시드·CvForm·공개 CvContent·i18n).
- **좌상단 로고**: 텍스트 → 손글씨 PNG. 평소 검정(`chuni-park-logo.png`)/hover 주황(`-hover.png`) 크로스페이드, 높이 50px, 네비 바 `h-[84px]`, 컨테이너 `max-w-6xl`로 반응형 정렬 일관화(넓은 화면서 로고 밀림 수정).
- **Works 표기 정책**: 2차 네비·장르카드의 장르/연도는 **영어 고정(메뉴명)**, 시리즈/주제/지역은 한·영 전환. 작품 캡션 크기 영어일 때 `(inch)` 병기.
- **Works 폴더 모델 전면 개편(매칭→분류 주도 자동 폴더)**:
  - 작품의 `series`(상위)/`region`(시리즈 하위, **시리즈별 `subdivideByRegion` 옵트인 시에만**)/`theme`(별도 상위) 값에서 폴더 **자동 도출**. 연도 폴더 유지(미분류 다수).
  - 메타데이터 `work_folders.json`(라벨/순서/숨김/슬러그/subdivideByRegion) + `getWorkFolders/updateWorkFolders` + `/api/work-folders`. 기존 `work_groups` 1회 흡수(라벨/슬러그 보존). 결정적 슬러그(한글→해시 폴백).
  - 3단계 라우팅 `/works/[genre]/[group]/[sub]`. 공개 2차 네비 = **연도 줄** + **시리즈▾·주제▾ 드롭다운**(반투명 backdrop-blur 애니, 시리즈 호버 시 지역 **좌측 플라이아웃**). 관리자 "폴더 관리"(WorkGroupManager 재작성)=자동 트리+작품수+라벨/순서/숨김/지역분할 편집.
  - 핵심 파일: `src/lib/works.ts`(buildGenreTree/artworksForGroup), `works-page.ts`, `src/components/works/WorksGenreScreen.tsx`+`WorksCollectionsNav.tsx`.
- **관리자 비밀번호**: 변경 미적용 버그 수정(현재비번 검증+bcrypt 해시 저장+기존 설정 병합, GET은 해시 미노출). 분실 복구=등록된 작가 이메일로 임시비번 발송(`/api/auth/reset`, About `contact_email` 일치 시). 저장 ~1분 반영 경고 추가.
- **운영 통계(방문자) 탭**: 클라 비콘(`PageViewTracker`)→공개 `POST /api/pageview`→Blob `stats.json` 집계(일별/경로/유입/기기). 관리자 통계 화면(카드+CSS 막대+상위 표). 외부 의존성 없음.
- **업로드/데이터 정합성 대수술 → 상세: `docs/uploads-and-data-consistency.md`**:
  - 일괄 업로드 다중쓰기 경합 유실 → `addArtworks` **단일 read-modify-write** + `POST /api/portfolio/batch`.
  - 공개 Blob **30일 CDN 캐시 staleness**(삭제 되살아남/업로드 사라짐) → `writeJson` `cacheControlMaxAge:0`(SDK 최소 60s 클램프), 관리자 목록 **신선읽기**(`getPortfolio(fresh)`+`GET /api/portfolio?fresh=1`). **공개 Blob은 ~60초 최종정합**(수용).
  - 서버측 중복 차단(addArtwork 409 / addArtworks `{created,skipped}`).
  - **NFC/NFD**: macOS 파일명은 NFD라 dedup·한/영 분기가 어긋남 → `artworkDupKey` NFC 정규화, 저장 시 텍스트 NFC(`nfcArtwork`), 파서/폼 한글검출 NFC(한글이 영문 칸으로 가던 문제 수정).
- **일괄 업로드 분류 입력**: 공통 시리즈/주제/지역(전체 적용) + 행별 override → 업로드 후 찾아 분류할 필요 제거.

## 1.6) 콘텐츠·AI·공지·분류값 정리 (2026-06-02~04)
- **News → Press 전면 개명**: `press`(카테고리 article/broadcast), 공개 `/press`·`/press/[category]`·`/press/[id]`, `/news/*`→`/press` 리다이렉트. 관리자 `PressManager`.
- **다국어 본문 방식(Resources·Press)**: 본문 = 단일 글(메인 **한글+이미지·유튜브**) + **영문 글(AI 생성·글만)**. 공개 시 한글 본문 **아래에 영문 이어붙임**(언어 전환 무관). `content_en`(기존 필드 재사용), `LocalizedRichContent(html, en?)`. 공개 본문은 **CKEditor 콘텐츠 스타일(`.ck-content`)** 로 렌더 → 편집기와 동일 배치(WYSIWYG). 미디어 제거 유틸 `strip-media.ts`로 영문은 글만.
- **AI(Google Gemini, env `GOOGLE_GENERATIVE_AI_API_KEY`)**: `/api/translate`(구조 보존 영작) + `TranslateButton`/`TranslateAllButton`(영작·제목/본문 일괄 채우기) + Press **스캔 OCR**·**Neolook import**. 패키지 `ai`+`@ai-sdk/google`.
- **Exhibition 재설계**: 풀스크린 **시네마틱 제거 → 블로그식**. Special=상단 고정·본문 항상 펼침(`ExhibitionFeatured`), Current/Past=제목 목록+클릭 펼침 아코디언(`ExhibitionList`), 공통 2차 네비 `ExhibitionNav`. 유형 확장: 개인전·그룹전·팝업전 + **기획전·초대전·아트페어·비엔날레·공모전**. special 폼은 **체크박스만**(도시·부제·대표이미지 입력 제거; 본문 내 이미지 사용), `hidden` 토글.
- **분류값 일괄 정리(reclassify)**: 시리즈/주제/지역(한·영) 값을 칩으로 **이름변경(병합)·삭제** → 그 값을 가진 **모든 작품 일괄** 변경(`reclassifyArtworks`, 잠금+신선읽기, `POST /api/portfolio/reclassify`) + `work_folders` 동기화. 재사용 컴포넌트 `ClassificationValueManager`(작품 수정 폼 + 폴더 관리 탭).
- **CV 항목 연도 내림차순 자동 정렬**(공개 CvContent): 학력·레지던시·소장처·펠로십·수상·출판을 입력 순서 무관 최근→과거.
- **홈 팝업 공지**: `notices`(최대 2개, 위치 center/4모서리), `/api/notices`(+`[id]`), `NoticePopup`(홈만, 활성·기간·"오늘 그만보기"), 관리자 "공지" 탭 `NoticeManager`. 입체감(그림자·링·등장 애니).
- **대표이미지 fallback**(목록 카드, `src/lib/media-cover.ts`): 지정 썸네일 → 본문 첫 이미지 → 본문 첫 유튜브 썸네일. 상세는 본문에 이미지 있으면 상단 표지 생략. next.config에 `img.youtube.com`/`i.ytimg.com` 허용.
- **일괄 업로드 한도 + 저장 UI**: 한 번에 **최대 30장**(초과분 자동 제외+안내). **SaveBar**로 폼 저장 UI 중앙화. 삭제·추가·저장 전면 **낙관적 갱신**(refetch 금지, Blob 지연 대응).
- **운영 통계(방문자)**: `PageViewTracker`→`/api/pageview`→`stats.json`, 관리자 통계 탭(외부 의존 X).
- **의존성 정리 + CLAUDE.md 리프레시**: clone 잔재 미사용 deps 제거, React 타입 ^18 정렬(이후 `ai`+`@ai-sdk/google` 추가). 배포 워크플로 = 작업 완료 시 자동 commit→push→폴링 보고(토큰 `.env.local`).

## 2) 결정사항
- 모든 소유 자원=**chunipark(morran444)** 계정. spchoi=개발자. git/배포 morran444 명의.
- **whanable7/homepage는 참고용**, 코드 혼입/의존 금지.
- Works=genre 기반, 폴더=시리즈/주제/지역 값에서 **자동 도출**(WorkGroup 매칭 폐기), 연도 10년 그룹.
- Exhibition=**블로그식**(시네마틱 폐기): special 상단 고정 펼침, current/past 아코디언, 유형 8종. **News는 Press로 개명**.
- 리치에디터=**CKEditor 5**(외부키 불필요, GPL). TipTap은 제거됨/미사용.
- 압축: 긴변 4000px, WebP, ~9.5MB, **원본 저장 안 함**.
- **데이터 계층 주의(중요)**: Blob read-after-write 전파 지연 → 관리자 인라인 편집은 **전체 재조회 금지, 낙관적 로컬 갱신**. 태그=전체집합 **replace**(`POST /api/portfolio/[id]/tags {replace:true}`). `updateArtwork`는 verify 루프 제거(put 성공 신뢰). mutation 라우트는 `revalidatePath`. **신규 Blob 파일은 타깃 시드 필요**(전체 `scripts/seed-blob.mjs`는 기존 데이터 덮어쓰므로 절대 전체 실행 금지 — 단일 파일만 put).

## 3) 남은 TODO / 다음 작업 후보
- [ ] 실제 콘텐츠 입력(작품 genre/시리즈, Exhibition special+이미지, Resources)로 전 화면 시각 검증 — **데이터가 비어 화면 확인 필요**.
- [x] 좌측 브랜드 **PNG 로고 교체** 완료(손글씨, hover 색전환, 위치/크기/반응형 정렬).
- [x] canonical 리다이렉트 — **작업 불필요 확인**(2026-06-04). www/non-www 둘 다 Vercel에 배포돼 리다이렉트 없이 200 정상 서빙. 접속 동작 문제 없음(순수 SEO `<link rel=canonical>`은 별개·미요청).
- [x] TipTap 패키지 제거 완료(미사용 deps 정리 시 함께). + clone 잔재 미사용 deps 제거(sigma·graphology·react-force-graph·three·d3-force·node-vibrant·next-cloudinary·pg, dead `react-force-graph.d.ts` 삭제), `@types/react`/`@types/react-dom`를 런타임 React 18에 맞춰 ^18로 정렬. `npm run build` 통과(node_modules 188개 감소). sharp는 Next 이미지 최적화용으로 유지.
- [ ] 이미지 "좌상단/좌하단" 세밀 배치는 현재 좌/중/우 정렬로만 — 필요시 확장.
- [x] 파일명 한글이 영문 칸 가던 문제 = NFC/NFD 원인, 파서·폼 NFC 정규화로 수정.
- [x] **일괄 업로드 한/영 자동 분기**(2026-06-04): 단일 폼에만 있던 `hasHangul` 라우팅을 `ArtworkBatchUpload`에도 적용 — 영문 제목/재료는 영문 칸(`title_en`/`medium_en`)으로 자동 입력. 표에 제목(한/영)·재료(한/영) 분리 노출, dup키에 `title_en` 포함.
- [x] **좌상단 로고 새 손글씨 서명 교체**(2026-06-04, f16c06f): 배경 휘도 제거→투명 PNG, 단일 이미지 미세 hover(확대·진해짐), 50→65px(+30%).
- [x] 작품 목록 '업로드순(최신)' 정렬 — **이미 구현됨**(`ArtworkTable.tsx` `created` 필드, `created_at` 내림차순=최근 등록순).
- [x] **Press 스캔 OCR 개선**(2026-06-04): 3.1-pro-preview 시도했으나 **품질 차이 미미·비용/지연만 증가 → `gemini-2.5-pro`로 원복**. 단, OCR 정확도는 모델보다 **입력 해상도가 좌우** → `mediaResolution: HIGH`(2.5-pro도 지원·검증) + 클라 업로드 4000px/7MB는 **개선점으로 유지**. route `maxDuration=180`/`maxRetries=2`/기본 thinking, 안내문구 "약 1분 내외". 건당 비용 ≈ 둘 다 ~200원대(3.1이 ~20~30% 더 비쌌음).
- [ ] (선택) 지연 0이 필요하면 JSON 데이터를 private Blob/KV로 이전(현재 공개 Blob = ~60초 최종정합).
- [ ] (관찰) 글로벌 태그 동일이름 중복 id 가능(표시 무관).

## 4) 중단 지점
- 직전 작업 = **일괄 업로드 분류(시리즈/주제/지역) 입력 추가** 완료·배포(**f92dc94 READY**). 그 전에 업로드/중복/정합성·NFC 일련 버그 모두 수정·문서화(`docs/uploads-and-data-consistency.md`).
- 데이터 계층 결론: **공개 Blob = 쓰기 후 ~60초 최종정합**(수용). 관리자 화면은 즉시(낙관적)·신선읽기, 강력 새로고침은 ~1분 뒤 정확.

## 5) 다음 시작 힌트
- 다음 차례: 사용자가 admin(https://www.chuniart.com/admin, 비번 `park7419`)에서 실제 작품/전시/리소스 입력 → 화면 확인 후 디자인 디테일 조정 요청 가능성.
- 운영 메모:
  - 배포 = `git push origin main`(자동). 배포 상태 폴링/Blob 작업엔 Vercel 토큰 필요(사용자 재제공). BLOB_READ_WRITE_TOKEN은 `.env.local`.
  - 빌드 확인: `npm run build`.
  - 신규 Blob 파일 시드: `node`로 `@vercel/blob put('data/<name>.json', '[]')` **단일 파일만**(전체 seed 금지).
- 핵심 파일:
  - 내비: `src/components/common/TopNav.tsx`, `SidePanel.tsx`, `src/lib/menu.ts`
  - Works: `src/app/works/*`(+`[genre]/[group]/[sub]`), `src/components/works/*`(`WorksGenreScreen`·`WorksCollectionsNav`), `src/lib/works.ts`, `src/lib/works-page.ts`, `WorkGroupManager.tsx`(폴더 관리), `/api/work-folders`, `work_folders.json`
  - 업로드/통계/정합성: `/api/portfolio/batch`(일괄 단일저장), `/api/pageview`·`/api/stats`(방문통계), `src/lib/artwork-dedup.ts`(NFC dedup키), `docs/uploads-and-data-consistency.md`
  - Exhibition: `src/app/exhibition/*`, `src/components/exhibition/*`, `src/lib/exhibition.ts`, `ExhibitionForm.tsx`
  - Resources/에디터: `src/app/resources/*`, `src/components/resources/ResourcesView.tsx`, `ResourceManager.tsx`, `RichEditor.tsx`+`RichEditorClient.tsx`(CKEditor)
  - 업로드/압축: `ImageUploader.tsx`, `ArtworkBatchUpload.tsx`, `src/lib/image-compress.ts`(TIFF/utif), `src/lib/parse-artwork-filename.ts`
  - 데이터/타입: `src/lib/data.ts`, `src/types/artwork.ts`, 관리자 `src/app/admin/page.tsx`
