// 일회성: Blob의 news.json → press.json 이전 (type→category 매핑) 후 news.json 삭제
import fs from 'fs';
import { put, del } from '@vercel/blob';
const t=fs.readFileSync(new URL('../.env.local',import.meta.url),'utf-8');
for(const l of t.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const BASE=process.env.NEXT_PUBLIC_BLOB_BASE, TOKEN=process.env.BLOB_READ_WRITE_TOKEN;
const COMMIT=process.argv.includes('--commit');
const news=await fetch(`${BASE}/data/news.json?t=${Date.now()}`).then(r=>r.ok?r.json():[]).catch(()=>[]);
console.log('기존 news 항목:',news.length);
const press=news.map(n=>{ const {type, ...rest}=n; return {...rest, category: type==='broadcast'?'broadcast':'article'}; });
press.forEach(p=>console.log(' →',p.category,'|',p.title));
if(!COMMIT){console.log('\n(dry-run — 실제 기록하려면 --commit)');process.exit(0);}
await put('data/press.json', JSON.stringify(press,null,2), {access:'public',token:TOKEN,contentType:'application/json',addRandomSuffix:false,allowOverwrite:true});
console.log('✓ data/press.json 기록 완료 ('+press.length+'건)');
try{ await del(`${BASE}/data/news.json`,{token:TOKEN}); console.log('✓ data/news.json 삭제 완료'); }
catch(e){ console.log('news.json 삭제 실패(무시 가능):',e.message); }
