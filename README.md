# 지오 최 포트폴리오 (Jioh Choi Portfolio)

화가 지오 최 작가 포트폴리오 사이트입니다. 아래는 **관리자(작가)용 사용법** 요약입니다. (개발·배포 설정은 맨 아래 "환경변수 설정" 참고)

---

## 관리자 사용법 (한눈에)

### 1) 로그인
- 주소: **`/admin`** (예: `https://www.jiohchoi.com/admin`)
- 비밀번호로 로그인 → 상단 탭으로 항목 이동.

### 2) 탭별 역할
| 탭 | 무엇을 하나 |
|----|------------|
| **Works** | 작품 등록·수정·삭제, 일괄 업로드, 대표작/숨김/태그, 시리즈·주제·지역 입력 |
| **Series** | Works 분류값으로 자동 생성된 폴더의 **라벨·순서·숨김** 조정 + **분류값 이름변경/삭제** |
| **Exhibition** | 전시 등록(개인전·그룹전·기획전·아트페어·비엔날레 등). **Special** 체크 시 상단 고정 노출 |
| **CV** | 학력·전시·수상·레지던시·소장처·출생/거주 등 이력 |
| **Resources** | Process(제작 과정)·Writings(글) 포스팅 |
| **Press** | Articles(기사)·Broadcasts(방송) |
| **About** | 작가명·소개글·연락처·SNS·프로필 이미지 |
| **공지** | 홈 화면 팝업 공지(최대 2개, 위치 지정) |
| **통계** | 방문/페이지뷰 통계 |
| **Setting** | 관리자 비밀번호 변경 |

### 3) 자주 쓰는 기능
- **작품 추가**: `+ 새 작품`(하나씩) 또는 `일괄 업로드`(여러 장). 파일명이 `제목 100x80 재료 2024` 형식이면 **제목·크기·재료·연도 자동 입력**(cm 없어도 됨). 같은 작품(제목+연도+크기)은 **중복 자동 차단**(맥/메신저 파일의 NFD 한글도 인식).
- **일괄 업로드 분류**: 여러 장 올릴 때 상단 **공통 분류**(시리즈/주제/지역)를 한 번 넣으면 전체에 적용되고, 행마다 다르면 각 행 2번째 줄에서 수정. 업로드 후 기존 목록에서 따로 찾아 분류할 필요가 없습니다.
- **한글/영문**: 각 영문 칸 옆 **`AI 영작`** 버튼, 또는 폼 상단 **`AI로 영문 일괄 채우기`**로 한 번에 번역.
- **Resources·Press 본문**: 위쪽 **메인 글(한글+이미지·영상)** + 아래쪽 **영문 글(AI 생성·글만)**. 공개 화면에선 한글 본문 아래에 영문이 자연스럽게 이어집니다(언어 전환과 무관).
- **Press 스캔 자동 변환(OCR)**: Press 폼 상단 박스에 **신문기사 스캔 이미지**를 올리면 AI가 제목·본문(한/영)·기사 속 사진(자동 오려내기)·하단 전시정보를 자동으로 채웁니다. 변환 후 검토·수정해 저장. 대표 이미지는 아래 **본문 그림 썸네일을 클릭**해 교체할 수 있습니다.
- **저장 버튼**: 모든 폼에서 가운데의 **`저장`** 버튼으로 통일. 저장 결과(성공/실패 원인)는 버튼 아래에 표시됩니다.
- **분류값 정리(시리즈·주제·지역)**: 입력칸 아래 칩에서 **✎ 이름변경**(같은 이름이면 병합) · **× 삭제**. 모든 작품에 일괄 반영되고 Series 폴더·공개 메뉴에도 연동됩니다. (예: "Nature/nature" 중복 → 한쪽으로 병합)
- **폴더 구조**: 폴더는 따로 만들지 않습니다. 작품의 **시리즈/지역/주제** 값에서 자동 생성 (아래 "작품 폴더 구조 사용법" 참고).
- **대표작/숨김**: Works 목록에서 대표작 순서 지정, 숨김 체크 시 공개 사이트에서 감춤.

### 4) 저장과 반영
- 관리자에서 **저장하면 콘텐츠는 바로 반영**됩니다(공개 화면은 캐시로 **최대 1분** 지연될 수 있음).
- 별도의 "배포" 작업은 필요 없습니다. (사이트 코드 변경만 개발자가 배포)

### 5) ⚠️ 작품 삭제 시 주의사항 (중요)

여러 작품을 지울 때는 **반드시 "선택 삭제(일괄 삭제)"를 사용하세요.** 하나씩 연달아 삭제하면 일부가 **되살아날 수 있습니다.**

#### ✅ 올바른 방법 — 여러 개 한 번에 (선택 삭제)
1. Works 목록 표 **맨 왼쪽 열의 체크박스**로 지울 작품들을 선택합니다.
   - 표 **머리글의 전체선택 체크박스**를 누르면 전 작품이 한 번에 선택됩니다(하나만 남기려면 그 작품만 체크 해제).
2. 표 상단 오른쪽의 **`선택 삭제 (N)`** 빨간 버튼 클릭 → 확인.
3. 선택한 작품이 **한 번에** 삭제됩니다(되살아나지 않음).

#### ❌ 피해야 할 방법 — 하나씩 빠르게 연속 삭제
- 작품을 1개씩 **연달아 빠르게** 지우면, 일부만 지워지고 나머지가 **다시 나타나는** 경우가 있습니다.
- 화면에서는 사라진 듯 보여도 강력 새로고침(Ctrl/⌘+Shift+R) 후 되살아나 있을 수 있습니다.

#### 왜 이런 일이 생기나
- 데이터 저장소(Vercel Blob)는 **저장 직후 다시 읽기까지 최대 1분 정도 시차**가 있습니다.
- 1건씩 삭제하면 각 삭제가 "전체 목록을 읽어 1개만 빼고 다시 저장"하는데, 시차 때문에 **방금 지운 게 반영되기 전의 옛 목록**을 읽어 저장하면 직전 삭제가 **덮어써져(되살아나)** 버립니다.
- **선택 삭제**는 고른 작품을 **한 번의 읽기·한 번의 저장**으로 묶어 지우므로 이 문제가 없습니다.

> 정리: **하나만 지울 땐** 각 작품의 `삭제` 버튼, **여러 개를 지울 땐** 항상 **체크박스 → `선택 삭제`** 를 쓰세요. 그리고 공개 화면 반영은 최대 1분 정도 기다리면 됩니다.

---

## 환경변수 설정

`.env.local` 파일을 생성하고 아래 환경변수를 설정하세요:

```bash
# Cloudinary (이미지 저장)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Vercel Blob (JSON 데이터 저장)
NEXT_PUBLIC_BLOB_BASE=https://<id>.public.blob.vercel-storage.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxx   # Vercel 배포 시 자동 주입

# Admin
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_ADMIN_HINT=비밀번호 힌트 (선택)

# Contact Form (이메일 발송)
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_TO_EMAIL=artist@example.com

# Google Gemini (관리자 AI 영작 + 스캔 OCR) — Google AI Studio 키, 결제(billing) 설정 권장
GOOGLE_GENERATIVE_AI_API_KEY=
```

### AI 기능(번역·OCR) 설정 (Google Gemini)
관리자 **AI 영작**과 **Press 스캔 OCR**은 Google Gemini를 씁니다.
1. [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key** 발급
2. `.env.local`(및 Vercel 환경변수)의 `GOOGLE_GENERATIVE_AI_API_KEY`에 입력
3. 자주 쓰려면 해당 키의 프로젝트에 **결제(billing) 설정** 권장(무료 티어는 분당/일일 한도가 있어 가끔 "사용량 초과"가 날 수 있음). 모델: 번역=`gemini-2.5-flash`, OCR=`gemini-2.5-pro`.

### Contact 폼 이메일 설정 (Resend)

웹사이트의 Contact 페이지에서 방문자가 문의 메일을 보낼 수 있습니다. 이를 위해 [Resend](https://resend.com) 서비스를 사용합니다.

**설정 방법:**

1. [Resend](https://resend.com)에 가입
2. Dashboard → API Keys → Create API Key
3. Permission: **Sending access** 선택 (Full access 불필요)
4. 생성된 키를 `.env.local`의 `RESEND_API_KEY`에 입력
5. `CONTACT_TO_EMAIL`에 문의 메일을 받을 이메일 주소 입력

**API 키 교체 방법:**

다른 Resend 계정으로 변경하려면:
1. 새 계정에서 API Key 발급 (Sending access)
2. `.env.local` 파일의 `RESEND_API_KEY` 값만 교체
3. 서버 재시작 (`npm run dev` 재실행)

> 참고: 무료 플랜에서는 `onboarding@resend.dev`에서 발송됩니다. 커스텀 도메인 사용 시 Resend에서 도메인 인증 후 `src/app/api/contact/route.ts`의 `from` 필드를 수정하세요.

## 작품 폴더(트리) 구조 사용법

작품 목록은 **폴더처럼** 보입니다. 폴더는 **따로 만들지 않습니다.** 작품을 등록할 때 입력한 분류값에서 **자동으로** 만들어집니다.

### 분류값 3가지 (작품 등록 화면에서 입력)

| 입력 항목 | 역할 | 예시 |
|-----------|------|------|
| **시리즈(Series)** | 상위 폴더 | 미국서부, 하늘에서 본 풍경 |
| **지역(Region)** | 시리즈 안의 하위 폴더 | 애리조나, 캘리포니아 |
| **주제(Theme)** | 시리즈와 별개의 폴더 | 죽음, 자연 |

- 입력칸은 **이미 쓴 값이 자동완성**으로 뜹니다. 같은 폴더로 묶으려면 **똑같은 값을 고르세요**(오타로 새 값을 넣으면 다른 폴더가 됩니다).
- 한글·영문을 각각 입력하면, 사이트 언어(KR/EN)에 따라 폴더 이름이 바뀝니다.

### 폴더가 만들어지는 규칙

```
회화 (장르)
├─ 연도 폴더: 2010s · 2020s …      ← 모든 작품이 연도별로 자동 분류(분류 안 한 작품도 여기에 나옴)
├─ 미국서부 (시리즈)                ← Series 탭에서 "지역별 하위 폴더" 켠 시리즈만 아래로 펼쳐짐
│   ├─ 애리조나 (지역)
│   └─ 캘리포니아 (지역)
├─ 하늘에서 본 풍경 (시리즈)
└─ 죽음 (주제)
```

- **시리즈를 안 넣은 작품**(대부분)은 **연도 폴더**에서 그대로 볼 수 있습니다.
- 한 작품이 **시리즈 폴더와 주제 폴더 양쪽**에 동시에 보일 수 있습니다.
- 지역(하위 폴더)은 자동으로 생기지 않습니다. 지역과 무관한 시리즈(예: '가족')도 있으므로, **관리자 → Series 탭에서 해당 시리즈의 "지역별 하위 폴더로 분할"을 켠 경우에만**(그리고 지역값이 2곳 이상일 때) 하위 폴더가 노출됩니다. 공개 화면에선 시리즈 메뉴에 마우스를 올리면 지역이 **옆으로** 펼쳐집니다.

### 폴더로 묶는 방법 (요약)

1. 관리자 → Works에서 작품을 등록/수정합니다.
2. **시리즈**(상위로 묶을 이름), 필요하면 **지역**(시리즈 안 세부), 또는 **주제**를 입력합니다.
3. 저장하면 공개 사이트 Works에서 해당 폴더가 자동으로 나타납니다.
4. 묶음을 풀려면 그 값을 비우면 됩니다.

> URL 구조: `/works/회화` → `/works/회화/미국서부` → `/works/회화/미국서부/애리조나` (3단계)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
테스트 중에는 Resend 가입 이메일로만 수신 가능
나중에 실제 운영 시: Resend에서 도메인 인증 → 아무 이메일로나 발송 가능