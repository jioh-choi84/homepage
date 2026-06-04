import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import cloudinary from '@/lib/cloudinary';

export const runtime = 'nodejs';
// 고해상도 입력의 큰 기사도 여유 있게 처리(2.5-pro는 보통 1분 내외).
export const maxDuration = 180;

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

// 스캔 OCR·이미지 인식은 번역보다 어려운 작업 → 상위 모델(Pro) 사용(유료 티어).
// 3.1-pro-preview도 시도했으나 품질 차이가 크지 않고 비용·지연만 늘어 2.5-pro로 유지.
// OCR 정확도 개선은 모델보다 입력 해상도가 좌우 → mediaResolution HIGH + 고해상도 업로드 유지.
const MODEL = 'gemini-2.5-pro';

const PROMPT = `너는 스캔된 한국 신문 기사 이미지를 분석한다(화가 추니박/박병춘 관련 보도 자료).
다음을 수행해 **순수 JSON만** 출력하라(코드펜스·설명 금지):
1) 기사 텍스트를 OCR하고 자연스럽게 정리(오탈자·줄바꿈 정돈).
2) 같은 내용을 화가 포트폴리오에 어울리는 단정하고 자연스러운 영어로도 번역(과한 미사여구·학술체 금지).
3) 지면 속 "사진(도판/그림)"의 위치를 bounding box로 표시(글자 영역 제외, 사진만).
4) 지면 하단의 전시/행사 정보(행사명·특별기획전·기간·장소·규모·참여작가·참여갤러리 등)와 출처(신문명·날짜·면)를 가능하면 항상 추출.

출력 형식:
{
  "kicker": string|null, "kicker_en": string|null,
  "title": string, "title_en": string,
  "subtitle": string|null, "subtitle_en": string|null,
  "byline": string|null, "byline_en": string|null,
  "blocks": [{"type":"p"|"quote","text":string,"text_en":string}],
  "photos": [{"box":[ymin,xmin,ymax,xmax],"caption":string|null,"caption_en":string|null}],
  "info": [{"label":string,"label_en":string,"value":string,"value_en":string}],
  "source": string|null, "source_en": string|null,
  "date": "YYYY-MM-DD"|null
}
box는 0~1000으로 정규화한 [ymin,xmin,ymax,xmax]. 사진이 없으면 photos=[], 정보가 없으면 info=[].`;

type Block = { type: 'p' | 'quote'; text?: string; text_en?: string };
type Photo = { box?: number[]; caption?: string | null; caption_en?: string | null; url?: string };
type InfoItem = { label?: string; label_en?: string; value?: string; value_en?: string };
interface Parsed {
  kicker?: string | null; kicker_en?: string | null;
  title?: string; title_en?: string;
  subtitle?: string | null; subtitle_en?: string | null;
  byline?: string | null; byline_en?: string | null;
  blocks?: Block[];
  photos?: Photo[];
  info?: InfoItem[];
  source?: string | null; source_en?: string | null;
  date?: string | null;
}

const esc = (s: string) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type UploadResult = { secure_url: string; width?: number; height?: number };
async function uploadBuffer(buf: Buffer, folder: string): Promise<UploadResult | null> {
  try {
    return await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'image' }, (e, r) => (e ? reject(e) : resolve(r as UploadResult)))
        .end(buf);
    });
  } catch {
    return null;
  }
}

// Cloudinary 원본 URL에 c_crop 변환을 삽입해 사진만 잘라 서빙 (sharp 불필요)
function cropUrl(secureUrl: string, x: number, y: number, w: number, h: number): string {
  return secureUrl.replace('/upload/', `/upload/c_crop,x_${x},y_${y},w_${w},h_${h}/`);
}

// 캡션은 figure 안의 <figcaption>(=캡션 포함 이미지 위젯)으로 넣지 않는다.
// 그렇게 하면 편집기에서 캡션이 위젯 안에 묶여 별도 선택 영역·빈 공간이 생긴다.
// 이미지 위젯은 '이미지 하나'만 선택되도록 plain figure.image 로 두고,
// 캡션·설명은 그림 뒤에 일반 문단(free text)으로 붙인다(아래 figure() 헬퍼).
function figureHtml(p: Photo, lang: 'ko' | 'en'): string {
  if (!p.url) return '';
  const cap = lang === 'en' ? (p.caption_en || p.caption || '') : (p.caption || '');
  return `<figure class="image"><img src="${p.url}" alt="${esc(cap)}" /></figure>`;
}

// 빈 줄(간격)용 — CKEditor .ck-content에서 빈 문단으로 렌더됨
const BLANK = '<p>&nbsp;</p>';

function buildContent(d: Parsed, photos: Photo[], lang: 'ko' | 'en'): string {
  const pick = (ko?: string | null, en?: string | null) => (lang === 'en' ? (en || ko || '') : (ko || '')) || '';
  const out: string[] = [];
  // 간격 규칙용 헬퍼: 직전이 빈 줄이 아니면 빈 줄 추가(중복 방지)
  const blank = () => { if (out.length && out[out.length - 1] !== BLANK) out.push(BLANK); };
  // 그림 삽입: ①앞에 빈 줄  ②그림(이미지 위젯 1개)  ③캡션은 그림 뒤 일반 문단(free text)  ④빈 줄
  const figure = (p: Photo) => {
    blank();
    out.push(figureHtml(p, lang));
    const cap = lang === 'en' ? (p.caption_en || p.caption || '') : (p.caption || '');
    if (cap) out.push(`<p>${esc(cap)}</p>`); // 캡션을 자유 텍스트로(위젯 밖)
    out.push(BLANK);
  };

  const kicker = pick(d.kicker, d.kicker_en);
  const subtitle = pick(d.subtitle, d.subtitle_en);
  const byline = pick(d.byline, d.byline_en);
  if (kicker) out.push(`<p><em>${esc(kicker)}</em></p>`);
  if (subtitle) out.push(`<p><strong>${esc(subtitle)}</strong></p>`);
  if (byline) out.push(`<p>${esc(byline)}</p>`);

  const figs = photos.filter((p) => p.url);
  if (figs[0]) figure(figs[0]);

  const blocks = d.blocks || [];
  const rest = figs.slice(1);
  blocks.forEach((b, i) => {
    const t = pick(b.text, b.text_en);
    if (!t) return;
    out.push(b.type === 'quote' ? `<blockquote>${esc(t)}</blockquote>` : `<p>${esc(t)}</p>`);
    const per = Math.max(1, Math.ceil((blocks.length || 1) / Math.max(1, rest.length)));
    if (rest.length && (i + 1) % per === 0) {
      const f = rest.shift();
      if (f) figure(f);
    }
  });
  rest.forEach((f) => figure(f));

  const info = (d.info || []).filter((it) => (it.value || it.value_en));
  if (info.length) {
    blank(); // 전시 정보 앞에 항상 빈 줄
    out.push(`<h3>${lang === 'en' ? 'Exhibition Info' : '전시 정보'}</h3>`);
    out.push('<ul>' + info.map((it) => {
      const label = pick(it.label, it.label_en);
      const value = pick(it.value, it.value_en);
      return `<li><strong>${esc(label)}</strong> ${esc(value)}</li>`;
    }).join('') + '</ul>');
  }
  const source = pick(d.source, d.source_en);
  if (source) { blank(); out.push(`<p style="font-size:.85em;opacity:.7">${lang === 'en' ? 'Source' : '출처'}: ${esc(source)}</p>`); }

  return out.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: '번역/OCR API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' }, { status: 503 });
    }

    let buf: Buffer;
    let mediaType = 'image/jpeg';
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: '이미지 파일이 없습니다.' }, { status: 400 });
    mediaType = file.type || 'image/jpeg';
    buf = Buffer.from(await file.arrayBuffer());
    if (buf.length < 100) return NextResponse.json({ error: '파일이 비어있습니다.' }, { status: 400 });

    const warnings: string[] = [];

    // 1) 원본 스캔을 Cloudinary에 업로드 (width/height 확보, 크롭 기준)
    const orig = await uploadBuffer(buf, 'press/scans');
    if (!orig) return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 502 });
    const W = orig.width || 0;
    const H = orig.height || 0;

    // 2) Gemini OCR + 분석
    let parsed: Parsed;
    try {
      const { text } = await generateText({
        model: google(MODEL),
        maxRetries: 2,
        temperature: 0.2,
        providerOptions: {
          google: {
            // 신문처럼 조밀한 텍스트의 OCR 정확도 ↑ (이미지를 고해상도 토큰으로 처리).
            // 2.5-pro도 지원 — 모델 등급보다 OCR 품질 기여가 큰 부분이라 유지.
            mediaResolution: 'MEDIA_RESOLUTION_HIGH',
          },
        },
        // 2.5-pro thinking은 기본(동적)으로 둔다 — 레이아웃/바운딩박스 이해에 도움.
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image', image: buf, mediaType },
          ],
        }],
      });
      const raw = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      const s = raw.indexOf('{'); const e = raw.lastIndexOf('}');
      parsed = JSON.parse(s >= 0 && e > s ? raw.slice(s, e + 1) : raw) as Parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const quota = /quota|rate.?limit|exceeded|429|too many/i.test(msg);
      return NextResponse.json({
        error: quota
          ? 'AI 무료 사용량(분당 한도)을 초과했습니다. 1~2분 후 다시 시도해 주세요. (자주 쓰시려면 Google AI 결제 설정으로 한도 상향을 권장합니다.)'
          : `기사 분석에 실패했습니다: ${msg}`,
        original_scan_url: orig.secure_url,
      }, { status: quota ? 429 : 502 });
    }

    // 3) 사진 오려내기 → Cloudinary c_crop URL (sharp 불필요)
    const photos: Photo[] = Array.isArray(parsed.photos) ? parsed.photos : [];
    photos.sort((a, b) => (a.box?.[0] ?? 0) - (b.box?.[0] ?? 0));
    if (W && H) {
      for (const p of photos) {
        const box = p.box;
        if (!Array.isArray(box) || box.length < 4) continue;
        const [ymin, xmin, ymax, xmax] = box;
        const x = Math.max(0, Math.min(W - 1, Math.round((xmin / 1000) * W)));
        const y = Math.max(0, Math.min(H - 1, Math.round((ymin / 1000) * H)));
        let w = Math.round(((xmax - xmin) / 1000) * W);
        let h = Math.round(((ymax - ymin) / 1000) * H);
        w = Math.min(w, W - x);
        h = Math.min(h, H - y);
        if (w < 24 || h < 24) continue;
        p.url = cropUrl(orig.secure_url, x, y, w, h);
      }
    } else {
      warnings.push('이미지 크기를 확인하지 못해 사진 오려내기를 건너뜁니다.');
    }
    const cropped = photos.filter((p) => p.url);
    if (photos.length && cropped.length === 0) warnings.push('사진을 오려내지 못했습니다. 원본 스캔을 대표 이미지로 사용합니다.');

    const content = buildContent(parsed, cropped, 'ko');
    const content_en = buildContent(parsed, cropped, 'en');
    const thumbnail_url = cropped[0]?.url || orig.secure_url || '';

    let published_at: string | undefined;
    if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      published_at = new Date(parsed.date).toISOString();
    }

    return NextResponse.json({
      title: parsed.title || '',
      title_en: parsed.title_en || '',
      content,
      content_en,
      thumbnail_url,
      original_scan_url: orig.secure_url,
      published_at,
      warnings,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `변환 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
