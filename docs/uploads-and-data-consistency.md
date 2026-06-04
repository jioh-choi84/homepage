# 작품 업로드 · 중복 검출 · 데이터 정합성 (트러블슈팅 기록)

2026-06-04, 일괄 업로드에서 발생한 일련의 버그를 디버깅·수정한 기록. 같은 증상이 재발하면 여기부터 본다.

## 증상(당시 보고)
- 중복 파일을 섞어 일괄 업로드했는데 일부 중복이 안 걸러지고 업로드됨.
- 업로드 직후 관리자 목록엔 보였다가, 강력 새로고침하면 신규/중복이 사라짐.
- 관리자에서 중복을 삭제해도 강력 새로고침하면 다시 살아남.
- 신규 파일을 단독으로 올려도 "중복" 판정으로 막힘.

## 근본 원인 3가지 (모두 수정됨)

### 1. 다중 쓰기 경합으로 인한 유실
- 일괄 업로드가 파일마다 `POST /api/portfolio`를 **순차로 여러 번** 호출 → 각 `addArtwork`가 Blob에서 `portfolio.json`을 읽어 append→쓰기.
- Vercel Blob의 읽기-쓰기 전파 지연으로 다음 호출이 **직전 추가분이 빠진 옛 JSON**을 읽고 덮어써 앞선 업로드가 유실(last-write-wins).
- **수정:** `addArtworks(list)` — 단 한 번의 read-modify-write. `POST /api/portfolio/batch`. 클라(`ArtworkBatchUpload`)는 이미지만 파일별 Cloudinary 업로드 후 **DB 저장은 1회 batch 요청**.

### 2. 공개 Blob의 장기 CDN 캐시 → 읽기 staleness
- `writeJson`의 `put()`에 `cacheControlMaxAge` 미지정 → 공개 URL이 **기본 30일** 캐시. 쓰기는 origin에 즉시 반영되지만(`head()`로 확인), **공개 URL 읽기는 한동안 옛 복사본**을 돌려줌 → 삭제 되살아남/업로드 사라짐.
- 공개 blob은 쿼리 캐시버스터로도 항상 못 뚫고, `get({useCache:false})` origin 직읽기는 **private blob에만** 유효(SDK 문서).
- **수정:** `writeJson`에 `cacheControlMaxAge: 0`(SDK가 **최소 60초로 클램프**). 관리자 목록은 `getPortfolio(fresh)` + `GET /api/portfolio?fresh=1`(no-store)로 최대한 신선하게 읽음.
- **남는 특성(수용함):** 공개 Blob은 **쓰기 후 ~60초 최종정합**. 관리자 화면은 즉시(낙관적) 갱신되지만, 강력 새로고침은 **~1분 뒤** 정확. (지연 0이 필요하면 JSON을 private Blob/KV로 이전.)

### 3. 유니코드 NFC/NFD 불일치 → 중복 미검출 (최종 누수)
- **macOS 파일명은 NFD(분해형)** 유니코드. 일괄 업로드 제목이 NFD가 되는데, 기존 항목 제목은 NFC(조합형). 화면엔 동일하지만 코드포인트가 달라(예: `마음으로 그린 풍경-남도의 들` NFC 16자 / NFD 34자) `artworkDupKey`가 **다른 키로 판정** → 중복인데 통과.
- **수정:** `artworkDupKey`의 `norm()`이 **NFC 정규화 후 비교**. 저장 시 `addArtwork/addArtworks/updateArtwork`가 제목 등 텍스트 필드를 **NFC로 정규화**해 저장. 기존 NFD/중복분은 1회 정리.
- **같은 뿌리의 다른 증상(함께 수정):** 단일 폼의 한/영 자동 분기가 `/[가-힣]/`(NFC 음절)로 한글을 판정 → NFD 파일명은 한글이 자모로 분해돼 매칭 실패 → **한글 제목/재료가 영문 칸으로** 잘못 입력됐다. `parseArtworkFilename`이 입력을 **NFC로 정규화**해 반환하고, 폼의 한글 검출을 NFC+자모 범위까지 보강해 해결. (`src/lib/parse-artwork-filename.ts`, `ArtworkForm` `handleImageUpload`)

## 업로드 시 분류 입력(개선)
업로드 후 기존 작품에 뒤섞여 방금 올린 것을 찾기 어려워, **일괄 업로드 화면에서 분류(시리즈/주제/지역)를 입력**하도록 함. 상단 **공통 분류**(배치 전체 적용) + 행별 override. 저장 시 행값 우선·없으면 공통값. (`ArtworkBatchUpload.tsx`)

## 핵심 규칙 (유지보수 시 지킬 것)
- 중복 키 = `artworkDupKey` = `NFC(title) | year | width | height` (대소문자·공백 무시). 클라이언트와 서버가 **동일 함수** 공유.
- 작품 추가/수정은 데이터 계층에서 **텍스트 NFC 정규화** 후 저장.
- 일괄 추가는 반드시 `addArtworks`(단일 write). 파일별 개별 POST 금지.
- 가변 JSON 쓰기는 `cacheControlMaxAge: 0`. 신선이 필요한 관리자 읽기는 `fetchJson(name, true)`(skipCache) 또는 `?fresh=1`.

## 관련 파일
- `src/lib/artwork-dedup.ts` — NFC 정규화 dedup 키
- `src/lib/data.ts` — `writeJson`(cacheControlMaxAge:0), `nfcArtwork`, `addArtwork`/`addArtworks`(서버측 dedup), `getPortfolio(fresh)`
- `src/app/api/portfolio/route.ts` — `GET ?fresh=1`(no-store), `POST` 409(DUPLICATE)
- `src/app/api/portfolio/batch/route.ts` — 일괄 저장
- `src/components/admin/ArtworkBatchUpload.tsx` — 이미지 업로드 후 1회 batch 저장
- `src/app/admin/page.tsx` — `fetchArtworks`가 `?fresh=1` 사용
