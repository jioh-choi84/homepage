'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Artwork, WorkFolder, GENRE_OPTIONS, ArtworkGenre, DEFAULT_GENRE } from '@/types/artwork';
import ClassificationValueManager from './ClassificationValueManager';
import SaveBar, { type SaveMsg } from './SaveBar';

interface Props {
  existingArtworks?: Artwork[];
  onToast?: (msg: string) => void;
  /** 분류값 일괄 변경/삭제 후 갱신된 작품 배열을 부모로 전달 */
  onArtworksChanged?: (artworks: Artwork[]) => void;
}

type Axis = 'series' | 'theme' | 'region';
const FIELD = 'w-full h-8 px-2 border border-gray-300 rounded text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400';

function distinct(arts: Artwork[], ko: 'series' | 'theme' | 'region', en: 'series_en' | 'theme_en' | 'region_en') {
  const map = new Map<string, string>();
  for (const a of arts) {
    const v = (a[ko] || '').trim();
    if (!v) continue;
    const e = (a[en] || '').trim();
    if (!map.has(v)) map.set(v, e);
    else if (!map.get(v) && e) map.set(v, e);
  }
  return Array.from(map.entries()).map(([value, value_en]) => ({ value, value_en })).sort((a, b) => a.value.localeCompare(b.value));
}

function clean(f: WorkFolder): WorkFolder | null {
  const out: WorkFolder = { genre: f.genre, axis: f.axis, value: f.value };
  if (f.parent) out.parent = f.parent;
  let has = false;
  if (f.slug) { out.slug = f.slug; has = true; }
  if (f.label && f.label.trim()) { out.label = f.label.trim(); has = true; }
  if (f.label_en && f.label_en.trim()) { out.label_en = f.label_en.trim(); has = true; }
  if (typeof f.order === 'number' && !isNaN(f.order)) { out.order = f.order; has = true; }
  if (f.hidden) { out.hidden = true; has = true; }
  if (f.subdivideByRegion) { out.subdivideByRegion = true; has = true; }
  return has ? out : null;
}

export default function WorkGroupManager({ existingArtworks = [], onToast, onArtworksChanged }: Props) {
  const [folders, setFolders] = useState<WorkFolder[]>([]);
  const [genre, setGenre] = useState<ArtworkGenre>(DEFAULT_GENRE);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchFolders = useCallback(async () => {
    const res = await fetch('/api/work-folders?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) setFolders(await res.json());
    setLoaded(true);
  }, []);
  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const genreArtworks = useMemo(
    () => existingArtworks.filter((a) => (a.genre || DEFAULT_GENRE) === genre),
    [existingArtworks, genre],
  );

  // 자동 도출: 시리즈(+지역 하위), 주제
  const derived = useMemo(() => {
    const series = distinct(genreArtworks, 'series', 'series_en').map((s) => {
      const arts = genreArtworks.filter((a) => (a.series || '').trim() === s.value);
      const regions = distinct(arts, 'region', 'region_en').map((r) => ({
        ...r, count: arts.filter((a) => (a.region || '').trim() === r.value).length,
      }));
      return { ...s, count: arts.length, regions };
    });
    const themes = distinct(genreArtworks, 'theme', 'theme_en').map((t) => ({
      ...t, count: genreArtworks.filter((a) => (a.theme || '').trim() === t.value).length,
    }));
    return { series, themes };
  }, [genreArtworks]);

  // 장르 내 특정 필드의 distinct 값 목록(이름변경·삭제용)
  const fieldValues = (f: keyof Artwork) =>
    Array.from(new Set(genreArtworks.map((a) => String(a[f] ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const metaOf = (axis: Axis, value: string, parent?: string) =>
    folders.find((f) => f.genre === genre && f.axis === axis && f.value === value && (axis !== 'region' || (f.parent ?? '') === (parent ?? '')));

  const patch = (axis: Axis, value: string, parent: string | undefined, p: Partial<WorkFolder>) => {
    setFolders((prev) => {
      const idx = prev.findIndex((f) => f.genre === genre && f.axis === axis && f.value === value && (axis !== 'region' || (f.parent ?? '') === (parent ?? '')));
      const base: WorkFolder = idx >= 0 ? prev[idx] : { genre, axis, value, ...(parent ? { parent } : {}) };
      const merged = clean({ ...base, ...p });
      const next = [...prev];
      if (!merged) { if (idx >= 0) next.splice(idx, 1); return next; }
      if (idx >= 0) next[idx] = merged; else next.push(merged);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/work-folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folders),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: '저장되었습니다. (공개 반영까지 최대 1분)' });
      } else {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j.error || detail; } catch { detail = `${detail}: ${(await res.text().catch(() => '')).slice(0, 300)}`; }
        setSaveMsg({ ok: false, text: `저장 실패 — ${detail}` });
      }
    } catch (e) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${e instanceof Error ? e.message : String(e)}` });
    } finally { setSaving(false); }
  };

  const Row = ({ axis, value, value_en, count, parent, indent }: {
    axis: Axis; value: string; value_en: string; count: number; parent?: string; indent?: boolean;
  }) => {
    const m = metaOf(axis, value, parent);
    return (
      <div className={`grid grid-cols-[1fr_1fr_1fr_64px_56px] gap-2 items-center py-1.5 ${indent ? 'pl-6' : ''}`}>
        <div className="text-sm text-gray-800 truncate" title={value}>
          {indent && <span className="text-gray-300 mr-1">└</span>}
          {value} <span className="text-gray-400">({count})</span>
        </div>
        <input className={FIELD} placeholder={value} defaultValue={m?.label ?? ''}
          onBlur={(e) => patch(axis, value, parent, { label: e.target.value })} />
        <input className={FIELD} placeholder={value_en || value} defaultValue={m?.label_en ?? ''}
          onBlur={(e) => patch(axis, value, parent, { label_en: e.target.value })} />
        <input type="number" className={FIELD} placeholder="순서" defaultValue={m?.order ?? ''}
          onBlur={(e) => patch(axis, value, parent, { order: e.target.value === '' ? undefined : parseInt(e.target.value) })} />
        <label className="flex items-center justify-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={!!m?.hidden} onChange={(e) => patch(axis, value, parent, { hidden: e.target.checked })} />
          숨김
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        폴더는 작품의 <b>시리즈·지역·주제</b> 값에서 <b>자동 생성</b>됩니다. 여기서는 표시 라벨(한/영)·순서·숨김만 조정합니다.
        (연도 폴더는 자동, 숨긴 폴더의 작품도 연도 폴더에는 계속 노출됩니다.)
      </p>

      {/* 장르 선택 */}
      <div className="flex gap-2">
        {GENRE_OPTIONS.map((g) => (
          <button key={g.value} onClick={() => setGenre(g.value)}
            className={`px-3 py-1.5 rounded text-sm border ${genre === g.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {g.ko}
          </button>
        ))}
      </div>

      {/* 분류값 정리 — 이름변경(병합)·삭제(모든 작품에 일괄 반영) */}
      {(['series', 'theme', 'region'] as const).some((f) => fieldValues(f).length) && (
        <div className="border border-gray-200 rounded p-4 bg-gray-50 space-y-3">
          <h3 className="text-sm font-medium text-gray-800">분류값 정리 <span className="text-gray-400 font-normal">(이름변경·삭제 시 모든 작품에 반영)</span></h3>
          {([
            { ko: 'series', en: 'series_en', label: '시리즈' },
            { ko: 'theme', en: 'theme_en', label: '주제' },
            { ko: 'region', en: 'region_en', label: '지역' },
          ] as const).map(({ ko, en, label }) => {
            const koVals = fieldValues(ko);
            const enVals = fieldValues(en);
            if (!koVals.length && !enVals.length) return null;
            return (
              <div key={ko} className="text-xs text-gray-600">
                <span className="block">{label}</span>
                {koVals.length > 0 && (
                  <ClassificationValueManager field={ko} values={koVals} onChanged={(a) => onArtworksChanged?.(a)} onToast={onToast} />
                )}
                {enVals.length > 0 && (
                  <ClassificationValueManager field={en} values={enVals} onChanged={(a) => onArtworksChanged?.(a)} onToast={onToast} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loaded ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : (derived.series.length === 0 && derived.themes.length === 0) ? (
        <p className="text-sm text-gray-400">이 장르에는 시리즈/주제가 입력된 작품이 없습니다. 작품 등록 시 시리즈·지역·주제를 입력하면 폴더가 생깁니다.</p>
      ) : (
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="grid grid-cols-[1fr_1fr_1fr_64px_56px] gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1">
            <span>값 (작품 수)</span><span>한글 라벨</span><span>영문 라벨</span><span>순서</span><span>숨김</span>
          </div>

          {derived.series.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-1">시리즈</h3>
              {derived.series.map((s) => {
                const sub = !!metaOf('series', s.value)?.subdivideByRegion;
                return (
                  <div key={`${genre}|${s.value}`}>
                    <Row axis="series" value={s.value} value_en={s.value_en} count={s.count} />
                    {s.regions.length > 0 && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 pl-6 py-1">
                        <input type="checkbox" checked={sub} onChange={(e) => patch('series', s.value, undefined, { subdivideByRegion: e.target.checked })} />
                        지역별 하위 폴더로 분할 <span className="text-gray-400">(지역 {s.regions.length}개)</span>
                      </label>
                    )}
                    {sub && s.regions.length >= 2 && s.regions.map((r) => (
                      <Row key={`${genre}|${s.value}|${r.value}`} axis="region" value={r.value} value_en={r.value_en} count={r.count} parent={s.value} indent />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {derived.themes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-1">주제</h3>
              {derived.themes.map((t) => (
                <Row key={`${genre}|t|${t.value}`} axis="theme" value={t.value} value_en={t.value_en} count={t.count} />
              ))}
            </div>
          )}

          <SaveBar type="button" onSave={save} loading={saving} message={saveMsg} />
        </div>
      )}
    </div>
  );
}
