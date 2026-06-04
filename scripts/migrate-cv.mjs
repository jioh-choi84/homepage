// chuni_park CV 분리 마이그레이션 (1회성)
// 기존 about.json(Blob)에서 CV 필드를 추출해 cv.json을 만들고,
// about.json에서는 CV 필드를 제거한다. 단일 파일 put만 사용(전체 seed 금지).
//
// 사용:  NEXT_PUBLIC_BLOB_BASE=https://<id>.public.blob.vercel-storage.com \
//        BLOB_READ_WRITE_TOKEN=... node scripts/migrate-cv.mjs
import { put } from '@vercel/blob';

const base = process.env.NEXT_PUBLIC_BLOB_BASE;
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!base || !token) {
  console.error('NEXT_PUBLIC_BLOB_BASE 와 BLOB_READ_WRITE_TOKEN 환경변수가 모두 필요합니다.');
  process.exit(1);
}

// CV로 이동할 필드(스칼라 + 배열)
const CV_SCALAR = [
  'birth_city', 'birth_city_en', 'birth_country', 'birth_country_en',
  'live_city', 'live_city_en', 'live_country', 'live_country_en',
  'cv_file_url',
];
const CV_ARRAY = ['education', 'residencies', 'fellowships', 'awards', 'publications'];
const CV_KEYS = [...CV_SCALAR, ...CV_ARRAY];

// 1) 현재 about.json 읽기
const res = await fetch(`${base}/data/about.json?t=${Date.now()}`, { cache: 'no-store' });
if (!res.ok) {
  console.error(`about.json 읽기 실패: ${res.status}`);
  process.exit(1);
}
const about = await res.json();

// 2) 멱등 가드: about에 CV 필드가 하나도 없으면 이미 마이그레이션됨
const hasCvFields = CV_KEYS.some((k) => k in about);
if (!hasCvFields) {
  console.log('about.json에 CV 필드가 없습니다 — 이미 마이그레이션됨. 건너뜁니다.');
  process.exit(0);
}

// 3) cv 객체 구성
const cv = {
  id: 'cv',
  birth_city: about.birth_city ?? '',
  birth_city_en: about.birth_city_en ?? '',
  birth_country: about.birth_country ?? '',
  birth_country_en: about.birth_country_en ?? '',
  live_city: about.live_city ?? '',
  live_city_en: about.live_city_en ?? '',
  live_country: about.live_country ?? '',
  live_country_en: about.live_country_en ?? '',
  education: about.education ?? [],
  residencies: about.residencies ?? [],
  fellowships: about.fellowships ?? [],
  awards: about.awards ?? [],
  publications: about.publications ?? [],
  cv_file_url: about.cv_file_url ?? null,
  updated_at: new Date().toISOString(),
};

// 4) about에서 CV 필드 제거
const trimmedAbout = { ...about };
for (const k of CV_KEYS) delete trimmedAbout[k];
trimmedAbout.updated_at = new Date().toISOString();

// 5) 단일 파일 put (cv 먼저 — 실패 시 about은 그대로 유지되어 데이터 보존)
const putOpts = { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, token };
const cvRes = await put('data/cv.json', JSON.stringify(cv, null, 2), putOpts);
console.log(`cv.json 생성: ${cvRes.url}`);
const aboutRes = await put('data/about.json', JSON.stringify(trimmedAbout, null, 2), putOpts);
console.log(`about.json 갱신(CV 필드 제거): ${aboutRes.url}`);

console.log('\n마이그레이션 완료.');
