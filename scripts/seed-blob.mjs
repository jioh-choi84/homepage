// chuni_park Blob 시드 스크립트
// src/data/*.json 의 초기(빈) 데이터를 Vercel Blob 스토어의 data/ 경로로 업로드한다.
// app(src/lib/data.ts)의 writeJson 과 동일하게 put(`data/${name}.json`)를 사용한다.
//
// 사용:  BLOB_READ_WRITE_TOKEN=... node scripts/seed-blob.mjs
import { put } from '@vercel/blob';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('BLOB_READ_WRITE_TOKEN 환경변수가 필요합니다.');
  process.exit(1);
}

const names = ['portfolio', 'categories', 'tags', 'exhibitions', 'news', 'about', 'cv', 'admin_settings', 'work_groups', 'resources', 'notices'];

let firstUrl = null;
for (const name of names) {
  const content = readFileSync(join(dataDir, `${name}.json`), 'utf8');
  const { url } = await put(`data/${name}.json`, content, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
  if (!firstUrl) firstUrl = url;
  console.log(`seeded: ${url}`);
}

// 공개 베이스 URL 도출: https://<id>.public.blob.vercel-storage.com
const base = firstUrl.replace(/\/data\/.*$/, '');
console.log(`\nNEXT_PUBLIC_BLOB_BASE=${base}`);
