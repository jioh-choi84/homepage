'use client';

import { useState } from 'react';
import { Artwork } from '@/types/artwork';

interface Props {
  /** 작품 필드 키: series/series_en/theme/theme_en/region/region_en */
  field: string;
  /** 이 필드의 distinct 값 목록(부모가 작품에서 추출해 전달) */
  values: string[];
  /** 칩 클릭 시 입력칸에 값 채우기(선택) */
  onPick?: (value: string) => void;
  /** 일괄 변경/삭제 후 갱신된 전체 작품 배열 전달 */
  onChanged: (artworks: Artwork[]) => void;
  onToast?: (m: string) => void;
}

async function reclassify(field: string, from: string, to: string | null): Promise<{ count: number; artworks: Artwork[] }> {
  const res = await fetch('/api/portfolio/reclassify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, from, to }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '실패');
  return res.json();
}

// 분류값을 태그처럼 칩으로 보여주고, 각 값에 이름변경(✎)·삭제(×) 제공.
// 변경은 모든 작품에 일괄 반영(/api/portfolio/reclassify).
export default function ClassificationValueManager({ field, values, onPick, onChanged, onToast }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  if (!values.length) return null;

  const doRename = async (from: string) => {
    const to = draft.trim();
    setEditing(null);
    if (!to || to === from) return;
    if (!confirm(`'${from}' → '${to}'\n이 값을 가진 모든 작품을 일괄 변경합니다. 진행할까요?`)) return;
    setBusy(true);
    try {
      const r = await reclassify(field, from, to);
      onChanged(r.artworks);
      onToast?.(`${r.count}개 작품 변경됨`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '변경 실패');
    } finally { setBusy(false); }
  };

  const doDelete = async (from: string) => {
    if (!confirm(`'${from}'을(를) 모든 작품에서 제거합니다. 진행할까요?`)) return;
    setBusy(true);
    try {
      const r = await reclassify(field, from, null);
      onChanged(r.artworks);
      onToast?.(`${r.count}개 작품에서 제거됨`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '삭제 실패');
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {values.map((v) => editing === v ? (
        <input
          key={v}
          autoFocus
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); doRename(v); }
            if (e.key === 'Escape') setEditing(null);
          }}
          onBlur={() => doRename(v)}
          className="w-28 px-2 py-0.5 text-xs border border-blue-400 rounded outline-none bg-white text-gray-900"
        />
      ) : (
        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
          <button type="button" disabled={busy} onClick={() => onPick?.(v)} className="hover:text-gray-900" title="입력칸에 넣기">{v}</button>
          <button type="button" disabled={busy} onClick={() => { setEditing(v); setDraft(v); }} className="text-gray-400 hover:text-blue-600" title="이름 변경">✎</button>
          <button type="button" disabled={busy} onClick={() => doDelete(v)} className="text-gray-400 hover:text-red-500" title="삭제">×</button>
        </span>
      ))}
    </div>
  );
}
