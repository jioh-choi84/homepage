import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import cloudinary from '@/lib/cloudinary';
import type { ExhibitionFormData } from '@/types/artwork';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 네오룩은 브라우저 헤더가 없으면 0바이트를 반환한다.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  Referer: 'https://neolook.com/',
};

// 한글 광역 지역명 → 영문
const CITY_EN: Record<string, string> = {
  서울: 'Seoul', 부산: 'Busan', 대구: 'Daegu', 인천: 'Incheon', 광주: 'Gwangju',
  대전: 'Daejeon', 울산: 'Ulsan', 세종: 'Sejong', 경기: 'Gyeonggi', 강원: 'Gangwon',
  충북: 'Chungbuk', 충남: 'Chungnam', 전북: 'Jeonbuk', 전남: 'Jeonnam', 경북: 'Gyeongbuk',
  경남: 'Gyeongnam', 제주: 'Jeju',
};
const REGION_RE = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청북도|충청남도|충북|충남|전라북도|전라남도|전북|전남|경상북도|경상남도|경북|경남|제주)/;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

// 네오룩 페이지 HTML 가져오기: 직접 → (403/차단 시) r.jina.ai 프록시 폴백
async function fetchNeolookPage(
  pageUrl: string
): Promise<{ html: string; via: string } | { error: string }> {
  // 1) 직접
  try {
    const res = await fetch(pageUrl, { headers: BROWSER_HEADERS, redirect: 'follow' });
    const html = await res.text();
    if (res.ok && html.length >= 200) return { html, via: 'direct' };
  } catch {
    /* 폴백으로 진행 */
  }
  // 2) r.jina.ai (차단되지 않은 IP 경유, 원본 HTML 반환)
  try {
    const res = await fetch(`https://r.jina.ai/${pageUrl}`, {
      headers: { 'x-respond-with': 'html', 'User-Agent': BROWSER_HEADERS['User-Agent'] },
      redirect: 'follow',
    });
    const html = await res.text();
    if (res.ok && html.length >= 200 && html.includes('og:')) return { html, via: 'jina' };
    return { error: `프록시 응답 이상 (status=${res.status}, length=${html.length})` };
  } catch (e) {
    return { error: `연결 실패: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// 이미지 1장을 Cloudinary로 재호스팅. 네오룩 이미지도 Vercel에서 직접 받으면 403이라
// images.weserv.nl 이미지 프록시를 경유해 바이트를 받은 뒤 업로드. 실패 시 null.
async function rehostImage(absUrl: string): Promise<string | null> {
  const noProto = absUrl.replace(/^https?:\/\//, '');
  const sources = [
    `https://images.weserv.nl/?url=${encodeURIComponent(noProto)}`, // 프록시 우선
    absUrl, // 차단 안 된 환경이면 직접
  ];
  for (const src of sources) {
    try {
      const res = await fetch(src, { headers: BROWSER_HEADERS, redirect: 'follow' });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) continue;
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: 'exhibitions/imported', resource_type: 'image' },
            (error, result) => (error ? reject(error) : resolve(result as { secure_url: string }))
          )
          .end(buf);
      });
      return result.secure_url;
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let url: string;
  try {
    ({ url } = await request.json());
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  // 네오룩 아카이브 URL만 허용
  if (typeof url !== 'string' || !/^https?:\/\/(www\.)?neolook\.com\/archives\//i.test(url.trim())) {
    return NextResponse.json(
      { error: '네오룩 아카이브 주소(neolook.com/archives/...)만 가져올 수 있습니다.' },
      { status: 400 }
    );
  }
  const pageUrl = url.trim();

  // 1) 페이지 fetch (직접 → 차단 시 프록시 폴백)
  const fetched = await fetchNeolookPage(pageUrl);
  if ('error' in fetched) {
    return NextResponse.json(
      { error: `네오룩 페이지를 불러오지 못했습니다. ${fetched.error}` },
      { status: 502 }
    );
  }
  const html = fetched.html;

  const warnings: string[] = [];

  // 2) 메타/본문 파싱
  const canonical = extractMeta(html, 'og:url') || pageUrl.replace(/^https?:\/\/www\./, 'https://');
  const title = extractMeta(html, 'og:title') || '';
  const ogDesc = extractMeta(html, 'og:description') || ''; // 예: "지오 최展 / Jioh Choi / painting"
  const ogImage = extractMeta(html, 'og:image') || '';

  // 유형 추론: 단체/그룹 키워드 없으면 개인전(solo)
  const type: ExhibitionFormData['type'] = /단체|그룹|기획전|group/i.test(ogDesc + ' ' + title)
    ? 'group'
    : 'solo';

  // document 블록 + 헤더(center) 분리
  const docStart = html.indexOf('<div class="document');
  const docBody = docStart >= 0 ? html.slice(docStart) : html;
  const headerMatch = docBody.match(/<div style="text-align:\s*center;?">([\s\S]*?)<\/div>/i);
  const header = headerMatch ? headerMatch[1] : '';

  // 기간: YYYY_MMDD 두 개 (시작 ▶ 종료)
  let start_date = '';
  let end_date = '';
  let year = new Date().getFullYear();
  const periods = [...(header || docBody).matchAll(/(\d{4})_(\d{2})(\d{2})/g)];
  if (periods.length >= 1) {
    const [, y1, m1, d1] = periods[0];
    start_date = `${y1}-${m1}-${d1}`;
    year = parseInt(y1, 10);
  }
  if (periods.length >= 2) {
    const [, y2, m2, d2] = periods[1];
    end_date = `${y2}-${m2}-${d2}`;
  }
  if (!start_date) warnings.push('전시 기간을 찾지 못했습니다. 직접 입력해주세요.');

  // 장소: 주소(지역명)를 포함한 블록에서 추출.
  // 옛 포맷은 <p class="color-r">, 신형(2026~) 포맷은 <address> 태그를 쓰므로 둘 다 탐색.
  // 헤더 인식이 흔들려도 동작하도록 document 전체에서 찾는다.
  let venue = '';
  let venue_en = '';
  let location = '';
  let location_en = '';
  let city = '';
  let city_en = '';
  const venueCandidates = [
    ...docBody.matchAll(/<address[^>]*>([\s\S]*?)<\/address>/gi),
    ...docBody.matchAll(/<p class="color-r[^"]*">([\s\S]*?)<\/p>/gi),
  ].map((m) => m[1]);
  for (const inner of venueCandidates) {
    const spans = [...inner.matchAll(/<span class="line">([\s\S]*?)<\/span>/gi)].map((s) =>
      stripTags(s[1])
    );
    const addrIdx = spans.findIndex((s) => REGION_RE.test(s));
    if (addrIdx === -1) continue; // 초대일시/관람시간 등 주소 없는 블록은 건너뜀
    venue = spans[0] || '';
    if (spans[1] && /[A-Za-z]/.test(spans[1]) && !/^(tel|fax|www|http)/i.test(spans[1])) {
      venue_en = spans[1]; // 갤러리 영문명
    }
    // 지역: 주소 맨 앞 토큰만 (예: "경기도", "서울")
    city = spans[addrIdx].split(/\s+/)[0] || '';
    const cityBase = city.replace(/(특별자치도|특별자치시|광역시|특별시|도|시)$/, '') || city;
    city_en = CITY_EN[cityBase] || CITY_EN[city] || '';
    location = city;
    location_en = city_en ? `${city_en}, Korea` : '';
    break;
  }
  if (!venue) warnings.push('장소를 자동으로 찾지 못했습니다. 직접 입력해주세요.');

  // 3) 이미지 재호스팅 (대표 + 본문 작품 전부)
  const archivePaths = Array.from(
    new Set([...docBody.matchAll(/\/archives\/(20\d{6,8}\w?\.jpg)/gi)].map((m) => m[1]))
  );
  const ogImagePath = ogImage.match(/\/archives\/(20\d{6,8}\w?\.jpg)/i)?.[1];
  if (ogImagePath && !archivePaths.includes(ogImagePath)) archivePaths.unshift(ogImagePath);

  const urlMap = new Map<string, string>();
  await Promise.all(
    archivePaths.map(async (p) => {
      const hosted = await rehostImage(`https://neolook.com/archives/${p}`);
      if (hosted) urlMap.set(p, hosted);
      else warnings.push(`이미지를 가져오지 못했습니다: ${p}`);
    })
  );

  const image_url = ogImagePath ? urlMap.get(ogImagePath) || '' : '';

  // 4) 본문 description HTML 재구성
  // 헤더(center) 이후 본문만 사용, footer tag 제거
  let bodyHtml = headerMatch
    ? docBody.slice(docBody.indexOf(headerMatch[0]) + headerMatch[0].length)
    : docBody;
  bodyHtml = bodyHtml.replace(/<p class="tag">[\s\S]*$/i, ''); // footer 태그라인 이후 제거
  // dl(이미지 그룹) → figure 묶음
  bodyHtml = bodyHtml.replace(/<dl>([\s\S]*?)<\/dl>/gi, (_m, inner: string) => {
    const pairs = [...inner.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)];
    return pairs
      .map((pr) => {
        const imgSrc = pr[1].match(/src="([^"]+)"/i)?.[1] || '';
        const cap = stripTags(pr[2]);
        return `<figure><img src="${imgSrc}" alt="${cap}" /><figcaption>${cap}</figcaption></figure>`;
      })
      .join('\n');
  });
  // 빈 스페이서 문단 제거
  bodyHtml = bodyHtml.replace(/<p class="line-\d+">\s*<\/p>/gi, '');
  // 남은 클래스/링크속성 정리 (p 클래스 제거)
  bodyHtml = bodyHtml.replace(/<p class="[^"]*">/gi, '<p>');
  bodyHtml = bodyHtml.replace(/<span class="line">/gi, '').replace(/<\/span>/gi, '<br />');
  // 이미지 src를 Cloudinary로 치환
  bodyHtml = bodyHtml.replace(/src="(?:https:\/\/neolook\.com)?\/archives\/(20\d{6,8}\w?\.jpg)"/gi, (m, p) => {
    const hosted = urlMap.get(p);
    return hosted ? `src="${hosted}"` : m;
  });
  // 공백 정리
  bodyHtml = bodyHtml.replace(/\n{3,}/g, '\n\n').trim();
  // 출처 표기 추가
  const description =
    `${bodyHtml}\n<p>원문 출처: <a href="${canonical}" target="_blank" rel="noopener noreferrer">네오룩</a></p>`;

  const data: ExhibitionFormData = {
    title,
    title_en: '',
    venue,
    venue_en,
    location,
    location_en,
    year,
    type,
    external_url: canonical,
    start_date,
    end_date,
    image_url,
    description,
    is_special: false,
    city,
    city_en,
  };

  if (fetched.via === 'jina') warnings.push('네오룩이 직접 접근을 차단해 프록시(r.jina.ai)로 가져왔습니다.');

  return NextResponse.json({ data, warnings, via: fetched.via });
}
