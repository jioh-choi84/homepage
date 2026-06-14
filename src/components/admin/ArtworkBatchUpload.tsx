'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Artwork, ArtworkGenre, GENRE_OPTIONS, DEFAULT_GENRE } from '@/types/artwork';
import { parseArtworkFilename } from '@/lib/parse-artwork-filename';
import { artworkDupKey } from '@/lib/artwork-dedup';
import { compressImage, isTiff } from '@/lib/image-compress';
import Button from '@/components/common/Button';

interface ArtworkBatchUploadProps {
  onComplete: (created: Artwork[]) => void; // 생성된 작품을 부모 목록에 반영
  onClose: () => void;
  existingArtworks?: Artwork[]; // 중복 판정 기준(이미 등록된 작품)
}

type RowStatus = 'pending' | 'uploading' | 'done' | 'error';

interface Row {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  titleEn: string;
  height: string;
  width: string;
  medium: string;
  mediumEn: string;
  year: string;
  series: string;
  theme: string;
  region: string;
  status: RowStatus;
  error?: string;
}

// 기존 작품에서 특정 분류 필드의 중복 없는 값(제안용)
function distinctVals(arts: Artwork[], field: 'series' | 'theme' | 'region'): string[] {
  return Array.from(new Set(arts.map((a) => (a[field] || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const COMPRESS_THRESHOLD = Math.floor(9.5 * 1024 * 1024);
// 한 번에 안전하게 처리 가능한 최대 장수 (순차 업로드·브라우저 메모리 고려).
// 더 많으면 나눠서 업로드.
const MAX_FILES = 30;

async function uploadToCloudinary(file: File): Promise<{ image_url: string; thumbnail_url: string }> {
  const uploadFile = (isTiff(file) || file.size > COMPRESS_THRESHOLD) ? await compressImage(file) : file;

  const sigRes = await fetch(
    `/api/portfolio/upload?filename=${encodeURIComponent(uploadFile.name)}&contentType=${encodeURIComponent(uploadFile.type)}`
  );
  if (!sigRes.ok) throw new Error('업로드 서명 실패');
  const { signature, timestamp, publicId, folder, cloudName, apiKey } = await sigRes.json();

  const fd = new FormData();
  fd.append('file', uploadFile);
  fd.append('api_key', apiKey);
  fd.append('timestamp', timestamp.toString());
  fd.append('signature', signature);
  fd.append('folder', folder);
  fd.append('public_id', publicId);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!upRes.ok) throw new Error('Cloudinary 업로드 실패');
  const result = await upRes.json();
  const image_url: string = result.secure_url;
  const thumbnail_url = image_url.replace('/upload/', '/upload/c_fill,w_400,h_400/');
  return { image_url, thumbnail_url };
}

export default function ArtworkBatchUpload({ onComplete, onClose, existingArtworks = [] }: ArtworkBatchUploadProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [genre, setGenre] = useState<ArtworkGenre>(DEFAULT_GENRE);
  // 이번 배치 공통 분류(빈 행에 적용). 보통 한 배치는 같은 시리즈라 한 번에 지정.
  const [commonSeries, setCommonSeries] = useState('');
  const [commonTheme, setCommonTheme] = useState('');
  const [commonRegion, setCommonRegion] = useState('');
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [overLimit, setOverLimit] = useState(false);
  // 등록 성공 후 잠깐 보여줄 메시지(이후 자동으로 모달이 닫힘)
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 기존 작품 중복키 집합
  const existingKeys = useMemo(
    () => new Set(existingArtworks.map((a) => artworkDupKey(a))),
    [existingArtworks],
  );

  // 중복 행 id 집합 — 기존 작품 또는 같은 배치 내 앞선 행과 제목+연도+크기가 겹치면 중복.
  // 이미 처리된 행(업로드/완료/실패)은 제외한다. 등록 완료 후 부모의 작품 목록이
  // 갱신되어 existingKeys에 방금 올린 작품이 포함되면, done 행이 다시 중복으로 잡혀
  // "N개 중복"이 부풀려지는 버그가 있었다. 'pending' 행만 중복 판정한다.
  const dupIds = useMemo(() => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const r of rows) {
      if (r.status !== 'pending') continue;
      const key = artworkDupKey({ title: r.title, title_en: r.titleEn, year: r.year, width: r.width, height: r.height });
      if (existingKeys.has(key) || seen.has(key)) dups.add(r.id);
      else seen.add(key);
    }
    return dups;
  }, [rows, existingKeys]);

  const uploadableCount = rows.filter((r) => !dupIds.has(r.id) && r.status !== 'done').length;

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setOverLimit(false);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/tif'];
    const next: Row[] = [];
    Array.from(files).forEach((file, i) => {
      if (!allowed.includes(file.type) && !isTiff(file)) return;
      const parsed = parseArtworkFilename(file.name);
      // 파싱값을 한/영으로 분기: 한글 포함이면 한글 칸, 아니면 영문 칸.
      // (NFC 음절 + 호환 자모 + NFD 분해형 자모까지 한글로 인정 — 단일 폼과 동일)
      const hasHangul = (s: string) => /[가-힣ㄱ-ㅎㅏ-ㅣᄀ-ᇿ]/.test(s.normalize('NFC'));
      const pTitle = parsed.title?.normalize('NFC') || '';
      const pMedium = parsed.medium?.normalize('NFC') || '';
      const titleIsKo = pTitle ? hasHangul(pTitle) : true; // 파싱 실패 시 파일명은 한글 칸으로
      const mediumIsKo = pMedium ? hasHangul(pMedium) : true;
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '').normalize('NFC');
      next.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: titleIsKo ? (pTitle || fallbackTitle) : '',
        titleEn: titleIsKo ? '' : pTitle,
        height: parsed.height?.toString() || '',
        width: parsed.width?.toString() || '',
        medium: mediumIsKo ? pMedium : '',
        mediumEn: mediumIsKo ? '' : pMedium,
        year: parsed.year?.toString() || new Date().getFullYear().toString(),
        series: '',
        theme: '',
        region: '',
        status: 'pending',
      });
    });
    setRows((prev) => {
      const room = Math.max(0, MAX_FILES - prev.length);
      if (next.length > room) {
        // 초과분은 제외(메모리/시간 안전 한도). 미리보기 URL도 해제.
        next.slice(room).forEach((r) => URL.revokeObjectURL(r.previewUrl));
        setTimeout(() => setOverLimit(true), 0);
      }
      return [...prev, ...next.slice(0, room)];
    });
  }, []);

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => {
      const r = prev.find((x) => x.id === id);
      if (r) URL.revokeObjectURL(r.previewUrl);
      return prev.filter((x) => x.id !== id);
    });

  const startUpload = async () => {
    if (!rows.length || running) return;
    setRunning(true);
    setDoneCount(0);

    // 등록 대상: 중복 아님 & 아직 미완료. (중복 행은 사전 차단되어 업로드/저장하지 않음)
    const targets = rows.filter((r) => !dupIds.has(r.id) && r.status !== 'done');
    const bodies: Record<string, unknown>[] = [];
    const okRowIds: string[] = [];

    let hadError = false;
    // 1) 이미지만 파일별로 Cloudinary 업로드(진행 표시) — 본문은 모아둔다
    for (const row of targets) {
      updateRow(row.id, { status: 'uploading', error: undefined });
      try {
        const { image_url, thumbnail_url } = await uploadToCloudinary(row.file);

        bodies.push({
          // 한글 제목이 비어 있고 영문만 있으면 한글 칸은 비워 둔다(영문은 title_en으로).
          // 둘 다 비면 파일명을 한글 제목으로 폴백.
          title: row.title.trim() || (row.titleEn.trim() ? '' : row.file.name),
          title_en: row.titleEn.trim() || undefined,
          year: parseInt(row.year) || new Date().getFullYear(),
          height: row.height ? parseInt(row.height) : undefined,
          width: row.width ? parseInt(row.width) : undefined,
          medium: row.medium.trim() || undefined,
          medium_en: row.mediumEn.trim() || undefined,
          // 행별 값이 있으면 우선, 없으면 공통 분류값 적용
          series: (row.series.trim() || commonSeries.trim()) || undefined,
          theme: (row.theme.trim() || commonTheme.trim()) || undefined,
          region: (row.region.trim() || commonRegion.trim()) || undefined,
          genre,
          image_url,
          thumbnail_url,
        });
        okRowIds.push(row.id);
        setDoneCount((c) => c + 1);
      } catch (err) {
        hadError = true;
        updateRow(row.id, { status: 'error', error: err instanceof Error ? err.message : '이미지 업로드 실패' });
      }
    }

    // 2) DB 저장은 단 한 번의 요청으로(경합·유실 방지)
    let created: Artwork[] = [];
    let skipped = 0;
    let saveFailed = false;
    if (bodies.length) {
      try {
        const res = await fetch('/api/portfolio/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodies),
        });
        if (!res.ok) {
          const detail = (await res.json().catch(() => ({}))).error || `HTTP ${res.status}`;
          throw new Error(detail);
        }
        // 서버 응답: { created, skipped } — 서버측 중복 차단 결과
        const result = await res.json();
        created = Array.isArray(result) ? result : (result.created || []);
        skipped = Array.isArray(result) ? 0 : (result.skipped || 0);
        okRowIds.forEach((id) => updateRow(id, { status: 'done' }));
      } catch (err) {
        saveFailed = true;
        hadError = true;
        okRowIds.forEach((id) => updateRow(id, { status: 'error', error: err instanceof Error ? err.message : '작품 저장 실패' }));
      }
    }

    setRunning(false);
    if (created.length) onComplete(created);

    // 성공(저장 실패·행 오류 없음) 시: 성공 메시지를 잠깐 보여준 뒤 자동으로 모달을 닫는다.
    // 오류가 하나라도 있으면 사용자가 확인/재시도할 수 있게 닫지 않는다.
    if (!saveFailed && !hadError && created.length) {
      const skipNote = skipped > 0 ? ` · ${skipped}개는 이미 등록되어 제외됨` : '';
      setSuccessMsg(`✓ ${created.length}개 등록 완료${skipNote}`);
      setTimeout(() => onClose(), 1200);
    } else if (skipped > 0) {
      // 일부 행 오류 등으로 자동 닫기는 하지 않지만, 서버 중복 제외는 안내한다.
      setSuccessMsg(`${created.length}개 등록 · ${skipped}개는 이미 등록되어 제외됨`);
    }
  };

  // 중복(제외 대상)은 'done'이 되지 않으므로, 처리 완료 판단에서 제외
  const allDone = rows.length > 0 && rows.every((r) => r.status === 'done' || dupIds.has(r.id));
  const inputClass =
    'w-full h-8 px-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        여러 이미지를 한 번에 선택하면 파일명을 자동 분석해 <b>제목·세로×가로·재료·연도</b>를 채웁니다.
        형식: <code className="text-xs">제목 194x97cm Acrylic on canvas 2021</code>. <b>한글이면 한글 칸, 영문이면 영문 칸</b>으로 자동 입력됩니다. 등록 전 표에서 수정할 수 있고, <b>시리즈·주제·지역</b>은 공통값을 한 번에 적용하거나 행별로 지정할 수 있습니다.
        <br /><b className="text-gray-700">한 번에 최대 {MAX_FILES}장</b>까지 올릴 수 있습니다. 더 많으면 나눠서 업로드해 주세요.
      </p>
      {overLimit && (
        <p className="text-sm text-amber-600">한 번에 최대 {MAX_FILES}장까지만 추가됩니다. 초과분은 제외했어요 — 이번 등록 후 나머지를 다시 올려주세요.</p>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff"
          multiple
          onChange={(e) => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = ''; }}
          className="hidden"
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={running}>
          + 이미지 선택
        </Button>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          공통 장르
          <select value={genre} onChange={(e) => setGenre(e.target.value as ArtworkGenre)}
            disabled={running}
            className="h-8 px-2 border border-gray-300 rounded bg-white text-gray-900 text-sm">
            {GENRE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.ko} / {g.en}</option>)}
          </select>
        </label>
        {rows.length > 0 && (
          <span className="text-sm text-gray-500">
            {rows.length}개 선택됨
            {dupIds.size > 0 && <span className="text-red-500"> · 중복 {dupIds.size}개 제외</span>}
            {running && ` · ${doneCount}/${rows.length} 등록 중`}
          </span>
        )}
      </div>

      {/* 공통 분류 — 이번 배치 전체에 적용(행별로 다르면 아래 표에서 개별 수정) */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2">
          <span className="text-gray-500">공통 분류(빈 행에 적용):</span>
          <input list="batch-series-list" value={commonSeries} onChange={(e) => setCommonSeries(e.target.value)} disabled={running}
            placeholder="시리즈" className={`${inputClass} w-40`} />
          <input list="batch-theme-list" value={commonTheme} onChange={(e) => setCommonTheme(e.target.value)} disabled={running}
            placeholder="주제" className={`${inputClass} w-32`} />
          <input list="batch-region-list" value={commonRegion} onChange={(e) => setCommonRegion(e.target.value)} disabled={running}
            placeholder="지역" className={`${inputClass} w-32`} />
        </div>
      )}

      <datalist id="batch-series-list">{distinctVals(existingArtworks, 'series').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="batch-theme-list">{distinctVals(existingArtworks, 'theme').map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="batch-region-list">{distinctVals(existingArtworks, 'region').map((v) => <option key={v} value={v} />)}</datalist>

      {rows.length > 0 && (
        <div className="border border-gray-200 rounded overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
            {rows.map((row) => {
              const isDup = dupIds.has(row.id);
              return (
              <div key={row.id} className={`flex items-start gap-3 p-2 ${isDup ? 'bg-red-50' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.previewUrl} alt="" className={`w-14 h-14 object-cover rounded bg-gray-100 flex-shrink-0 mt-0.5 ${isDup ? 'opacity-50' : ''}`} />
                <div className="flex-1 space-y-1.5">
                  <div className="grid grid-cols-12 gap-2">
                    <input className={`${inputClass} col-span-4`} value={row.title}
                      onChange={(e) => updateRow(row.id, { title: e.target.value })} placeholder="제목(한)" disabled={running} />
                    <input className={`${inputClass} col-span-4`} value={row.titleEn}
                      onChange={(e) => updateRow(row.id, { titleEn: e.target.value })} placeholder="제목(영)" disabled={running} />
                    <input className={`${inputClass} col-span-1`} value={row.height}
                      onChange={(e) => updateRow(row.id, { height: e.target.value })} placeholder="세로" disabled={running} />
                    <input className={`${inputClass} col-span-1`} value={row.width}
                      onChange={(e) => updateRow(row.id, { width: e.target.value })} placeholder="가로" disabled={running} />
                    <input className={`${inputClass} col-span-2`} value={row.year}
                      onChange={(e) => updateRow(row.id, { year: e.target.value })} placeholder="연도" disabled={running} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputClass} value={row.medium}
                      onChange={(e) => updateRow(row.id, { medium: e.target.value })} placeholder="재료(한)" disabled={running} />
                    <input className={inputClass} value={row.mediumEn}
                      onChange={(e) => updateRow(row.id, { mediumEn: e.target.value })} placeholder="재료(영)" disabled={running} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputClass} list="batch-series-list" value={row.series}
                      onChange={(e) => updateRow(row.id, { series: e.target.value })} placeholder={commonSeries ? `시리즈: ${commonSeries}` : '시리즈'} disabled={running} />
                    <input className={inputClass} list="batch-theme-list" value={row.theme}
                      onChange={(e) => updateRow(row.id, { theme: e.target.value })} placeholder={commonTheme ? `주제: ${commonTheme}` : '주제'} disabled={running} />
                    <input className={inputClass} list="batch-region-list" value={row.region}
                      onChange={(e) => updateRow(row.id, { region: e.target.value })} placeholder={commonRegion ? `지역: ${commonRegion}` : '지역'} disabled={running} />
                  </div>
                </div>
                <div className="w-20 text-center flex-shrink-0 flex flex-col items-center gap-1">
                  {isDup && row.status === 'pending' && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-500 text-white rounded" title="제목·연도·크기가 같은 작품이 이미 있어 등록되지 않습니다">중복 · 제외</span>
                  )}
                  {row.status === 'pending' && !running && (
                    <button type="button" onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
                  )}
                  {row.status === 'uploading' && <span className="text-xs text-gray-500">업로드…</span>}
                  {row.status === 'done' && <span className="text-xs text-green-600">✓ 완료</span>}
                  {row.status === 'error' && <span className="text-xs text-red-500" title={row.error}>실패</span>}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {successMsg && (
        <p className="text-sm text-green-600 text-center font-medium">{successMsg}</p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onClose} disabled={running}>
          {allDone ? '닫기' : '취소'}
        </Button>
        <Button type="button" onClick={startUpload} loading={running} disabled={uploadableCount === 0 || allDone}>
          전체 등록 ({uploadableCount})
        </Button>
      </div>
    </div>
  );
}
