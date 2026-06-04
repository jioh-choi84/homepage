/**
 * 네오룩 전시 일괄 등록 (일회성 마이그레이션)
 *
 * - 네오룩 '지오최' 검색 결과 18건(개인전+참여 단체전, 기존 중복 URL은 스킵)
 * - 개인전/단체전 구분(type)은 og:description의 작가 표기로 자동 판별
 * - 대표 이미지(og:image)만 Cloudinary 재호스팅, 본문 이미지는 네오룩 링크 유지
 * - exhibitions.json 만 read→append→write (다른 컬렉션은 절대 건드리지 않음)
 *
 * 사용법:
 *   node scripts/import-neolook-bulk.mjs           # dry-run (미리보기만)
 *   node scripts/import-neolook-bulk.mjs --commit  # 실제 Blob 기록
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';

const COMMIT = process.argv.includes('--commit');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- .env.local 로드 ----
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  const txt = fs.readFileSync(p, 'utf-8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_BASE;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// ---- 대상 목록 (네오룩 '지오최' 검색 결과 18건) ----
// type(solo/group)은 parse()에서 og:description의 작가 표기로 자동 판별
const TARGETS = [
  '20080621a','20091002g','20111008g','20150618f','20160706f','20171013j',
  '20180427d','20190918g','20200920f','20220706f','20221128b','20230721f',
  '20240313a','20250620c','20251129b','20260116a','20260529b','20260603b',
];

// ---- 파싱 유틸 (단일 import 라우트와 동일 규칙) ----
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  Referer: 'https://neolook.com/',
};
const CITY_EN = { 서울:'Seoul',부산:'Busan',대구:'Daegu',인천:'Incheon',광주:'Gwangju',대전:'Daejeon',울산:'Ulsan',세종:'Sejong',경기:'Gyeonggi',강원:'Gangwon',충북:'Chungbuk',충남:'Chungnam',전북:'Jeonbuk',전남:'Jeonnam',경북:'Gyeongbuk',경남:'Gyeongnam',제주:'Jeju' };
const REGION_RE = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청북도|충청남도|충북|충남|전라북도|전라남도|전북|전남|경상북도|경상남도|경북|경남|제주)/;
const dec = (s) => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&#x27;/gi,"'").replace(/&#160;/g,' ').replace(/&nbsp;/g,' ');
const strip = (h) => dec(h.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const meta = (h, p) => { const m = h.match(new RegExp(`<meta\\s+property=["']${p}["']\\s+content=["']([^"']*)["']`,'i')); return m ? dec(m[1]).trim() : null; };

async function fetchPage(url) {
  try {
    const r = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    const h = await r.text();
    if (r.ok && h.length >= 200) return h;
  } catch {}
  const r = await fetch('https://r.jina.ai/' + url, { headers: { 'x-respond-with':'html', 'User-Agent': BROWSER_HEADERS['User-Agent'] }, redirect: 'follow' });
  const h = await r.text();
  if (r.ok && h.length >= 200 && h.includes('og:')) return h;
  throw new Error('fetch 실패');
}

async function rehostLead(absUrl) {
  const noProto = absUrl.replace(/^https?:\/\//, '');
  for (const src of [`https://images.weserv.nl/?url=${encodeURIComponent(noProto)}`, absUrl]) {
    try {
      const r = await fetch(src, { headers: BROWSER_HEADERS, redirect: 'follow' });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) continue;
      const res = await new Promise((resolve, reject) =>
        cloudinary.uploader.upload_stream({ folder: 'exhibitions/imported', resource_type: 'image' }, (e, x) => e ? reject(e) : resolve(x)).end(buf)
      );
      return res.secure_url;
    } catch {}
  }
  return null;
}

function parse(html, archiveId) {
  const warnings = [];
  const canonical = meta(html, 'og:url') || `https://neolook.com/archives/${archiveId}`;
  const title = meta(html, 'og:title') || '';
  const ogImage = meta(html, 'og:image') || '';
  const ogDesc = meta(html, 'og:description') || '';
  // 개인전: og 설명에 작가 표기(지오최/최현주/JIOH CHOI)가 있으면 solo, 없으면 group(참여전)
  const type = /지오최|최현주|JIOH CHOI/i.test(ogDesc) ? 'solo' : 'group';
  const docStart = html.indexOf('<div class="document');
  const docBody = docStart >= 0 ? html.slice(docStart) : html;
  const headerMatch = docBody.match(/<div style="text-align:\s*center;?">([\s\S]*?)<\/div>/i);

  // 기간/연도
  let start_date = '', end_date = '', year = 0;
  const periods = [...docBody.matchAll(/(\d{4})_(\d{2})(\d{2})/g)];
  if (periods.length >= 1) { const [,y,m,d]=periods[0]; start_date=`${y}-${m}-${d}`; year=parseInt(y,10); }
  if (periods.length >= 2) { const [,y,m,d]=periods[1]; end_date=`${y}-${m}-${d}`; }
  if (!year) { const ym = archiveId.match(/^(\d{4})/); year = ym ? parseInt(ym[1],10) : new Date().getFullYear(); }
  if (!start_date) warnings.push('기간 미검출');

  // 장소/지역 (color-r 또는 address)
  let venue='', venue_en='', location='', city='', city_en='', location_en='';
  const cands = [...docBody.matchAll(/<address[^>]*>([\s\S]*?)<\/address>/gi), ...docBody.matchAll(/<p class="color-r[^"]*">([\s\S]*?)<\/p>/gi)].map((m)=>m[1]);
  for (const inner of cands) {
    const spans = [...inner.matchAll(/<span class="line">([\s\S]*?)<\/span>/gi)].map((s)=>strip(s[1]));
    const ai = spans.findIndex((s)=>REGION_RE.test(s));
    if (ai === -1) continue;
    venue = spans[0]||'';
    if (spans[1] && /[A-Za-z]/.test(spans[1]) && !/^(tel|fax|www|http)/i.test(spans[1])) venue_en = spans[1];
    city = spans[ai].split(/\s+/)[0]||'';
    const base = city.replace(/(특별자치도|특별자치시|광역시|특별시|도|시)$/,'')||city;
    city_en = CITY_EN[base]||CITY_EN[city]||'';
    location = city; location_en = city_en ? `${city_en}, Korea` : '';
    break;
  }
  if (!venue) warnings.push('장소 미검출');

  // 본문 (대표 제외 헤더 이후), 이미지는 네오룩 절대경로 유지
  let body = headerMatch ? docBody.slice(docBody.indexOf(headerMatch[0]) + headerMatch[0].length) : docBody;
  body = body.replace(/<p class="tag">[\s\S]*$/i, '');
  body = body.replace(/<dl>([\s\S]*?)<\/dl>/gi, (_m, inner) => {
    const pairs = [...inner.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)];
    return pairs.map((pr) => { const src=(pr[1].match(/src="([^"]+)"/i)?.[1]||'').replace(/^\/archives/,'https://neolook.com/archives'); const cap=strip(pr[2]); return `<figure><img src="${src}" alt="${cap}" /><figcaption>${cap}</figcaption></figure>`; }).join('\n');
  });
  body = body.replace(/<p class="line-\d+">\s*<\/p>/gi,'').replace(/<p class="[^"]*">/gi,'<p>').replace(/<span class="line">/gi,'').replace(/<\/span>/gi,'<br />');
  body = body.replace(/src="\/archives\//gi,'src="https://neolook.com/archives/');
  body = body.replace(/\n{3,}/g,'\n\n').trim();
  const description = `${body}\n<p>원문 출처: <a href="${canonical}" target="_blank" rel="noopener noreferrer">네오룩</a></p>`;

  return { canonical, title, venue, venue_en, location, location_en, city, city_en, year, start_date, end_date, type, ogImage, description, warnings };
}

async function main() {
  console.log(`\n=== 네오룩 일괄 등록 (${COMMIT ? '🔴 COMMIT' : 'DRY-RUN'}) — 대상 ${TARGETS.length}건 ===\n`);

  // 기존 데이터
  const existing = await fetch(`${BLOB_BASE}/data/exhibitions.json?t=${Date.now()}`).then((r)=>r.ok?r.json():[]).catch(()=>[]);
  const existingUrls = new Set(existing.map((e)=> (e.external_url||'').replace(/^https?:\/\/www\./,'https://')));
  console.log(`기존 전시 ${existing.length}건. 중복 URL은 스킵합니다.\n`);

  const toAdd = [];
  for (const id of TARGETS) {
    const url = `https://neolook.com/archives/${id}`;
    const norm = url.replace(/^https?:\/\/www\./,'https://');
    if (existingUrls.has(norm)) { console.log(`· ${id} 스킵(이미 등록됨)`); continue; }
    try {
      const html = await fetchPage(url);
      const d = parse(html, id);
      let image_url = '';
      if (!COMMIT) {
        image_url = d.ogImage; // dry-run: 업로드 생략
      } else if (d.ogImage) {
        image_url = (await rehostLead(d.ogImage)) || '';
        if (!image_url) d.warnings.push('대표이미지 업로드 실패');
      }
      const exh = {
        title: d.title, title_en: '', venue: d.venue, venue_en: d.venue_en,
        location: d.location, location_en: d.location_en, year: d.year, type: d.type,
        external_url: d.canonical, start_date: d.start_date, end_date: d.end_date,
        image_url, description: d.description, is_special: false, hidden: false,
        city: d.city, city_en: d.city_en,
      };
      toAdd.push(exh);
      console.log(`✓ ${id} [${d.type}] ${d.year} | ${d.title} | ${d.venue}${d.venue_en?' / '+d.venue_en:''} | ${d.location}${d.warnings.length?'  ⚠ '+d.warnings.join(', '):''}`);
    } catch (e) {
      console.log(`✗ ${id} 실패: ${e.message}`);
    }
  }

  console.log(`\n신규 추가 대상: ${toAdd.length}건`);
  if (!COMMIT) { console.log('\n(dry-run 종료 — 실제 기록하려면 --commit 옵션)'); return; }

  // append 후 기록 (최신순 display_order)
  const stamp = Date.now();
  const merged = [...existing];
  toAdd.forEach((e, i) => merged.push({ ...e, id: `nl-${stamp}-${i}`, created_at: new Date().toISOString(), display_order: i }));
  const json = JSON.stringify(merged, null, 2);
  await put('data/exhibitions.json', json, { access: 'public', token: BLOB_TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  console.log(`\n🔴 기록 완료: 총 ${merged.length}건 (기존 ${existing.length} + 신규 ${toAdd.length})`);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
