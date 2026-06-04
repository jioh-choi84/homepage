'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Press, PressCategory, PRESS_CATEGORIES } from '@/types/artwork';
import Button from '@/components/common/Button';
import ImageUploader from './ImageUploader';
import RichEditor from './RichEditor';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import { stripMediaHtml } from '@/lib/strip-media';
import { compressImage } from '@/lib/image-compress';
import SaveBar, { type SaveMsg } from './SaveBar';

const FIELD = 'w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400';
const today = () => new Date().toISOString().slice(0, 10);

export default function PressManager({ onToast }: { onToast?: (m: string) => void }) {
  const [list, setList] = useState<Press[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<PressCategory>('article');
  const [publishedAt, setPublishedAt] = useState(today());
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [content, setContent] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [thumb, setThumb] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);
  // 스캔 기사 자동 변환
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanDrag, setScanDrag] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (file: File) => {
    if (!file || scanning) return;
    setScanning(true);
    setScanMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setScanPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // OCR 정확도를 위해 해상도를 넉넉히 보존(신문은 조밀한 텍스트라 디테일이 중요).
      const compressed = await compressImage(file, { maxEdge: 4000, maxBytes: 7 * 1024 * 1024 });
      const fd = new FormData();
      fd.append('file', compressed, compressed.name || 'scan.webp');
      const res = await fetch('/api/press/ocr', { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') || '';
      let json: Record<string, unknown> = {};
      if (ct.includes('application/json')) {
        json = await res.json();
      } else {
        const t = await res.text();
        throw new Error(`서버 오류 (${res.status}): ${t.slice(0, 150)}`);
      }
      if (!res.ok) throw new Error((json.error as string) || '변환 실패');
      const str = (v: unknown) => (typeof v === 'string' ? v : '');
      if (str(json.title)) setTitle(str(json.title));
      if (str(json.title_en)) setTitleEn(str(json.title_en));
      if (str(json.content)) setContent(str(json.content));
      if (str(json.content_en)) setContentEn(str(json.content_en));
      if (str(json.thumbnail_url)) setThumb(str(json.thumbnail_url));
      if (json.published_at) setPublishedAt(String(json.published_at).slice(0, 10));
      setCategory('article');
      const warn = (Array.isArray(json.warnings) ? json.warnings : []).join(' / ');
      setScanMsg({ type: 'ok', text: '변환 완료 — 내용을 검토한 뒤 저장하세요.' + (warn ? ` ⚠ ${warn}` : '') });
      onToast?.('스캔 변환 완료');
    } catch (e) {
      setScanMsg({ type: 'error', text: e instanceof Error ? e.message : '변환 실패' });
      setScanPreview(null);
    } finally {
      setScanning(false);
    }
  };

  const onScanDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setScanDrag(true);
    else if (e.type === 'dragleave') setScanDrag(false);
  };
  const onScanDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setScanDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleScan(f);
  };

  const fetchList = useCallback(async () => {
    const res = await fetch('/api/press?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) setList(await res.json());
  }, []);
  useEffect(() => { fetchList(); }, [fetchList]);

  const reset = () => {
    setEditingId(null); setCategory('article'); setPublishedAt(today());
    setTitle(''); setTitleEn(''); setContent(''); setContentEn(''); setThumb(''); setLinkUrl(''); setPdfUrl('');
    setScanPreview(null); setScanMsg(null);
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) { setSaveMsg({ ok: false, text: '제목과 내용을 입력하세요.' }); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      const body = {
        category,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        title: title.trim(),
        title_en: titleEn.trim() || undefined,
        content,
        content_en: contentEn.trim() || undefined,
        thumbnail_url: thumb || null,
        link_url: linkUrl.trim() || undefined,
        pdf_url: pdfUrl.trim() || undefined,
      };
      const res = await fetch(editingId ? `/api/press/${editingId}` : '/api/press', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // 낙관적 갱신: refetch 금지(Blob 읽기 지연). 응답값으로 로컬 갱신.
        const saved: Press = await res.json();
        setList((prev) => (editingId ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]));
        reset();
        setSaveMsg({ ok: true, text: '저장되었습니다.' });
      } else {
        // 실제 원인 노출 (JSON이면 error 필드, 아니면 상태+본문 일부)
        const ct = res.headers.get('content-type') || '';
        let detail = `HTTP ${res.status}`;
        try {
          if (ct.includes('application/json')) {
            const j = await res.json();
            detail = (j && (j.error || j.message)) || detail;
          } else {
            detail = `${detail}: ${(await res.text()).slice(0, 300)}`;
          }
        } catch { /* ignore */ }
        setSaveMsg({ ok: false, text: `저장 실패 — ${detail}` });
        console.error('Press save failed:', detail);
      }
    } catch (e) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${e instanceof Error ? e.message : String(e)}` });
    } finally { setSaving(false); }
  };

  const startEdit = (p: Press) => {
    setEditingId(p.id); setCategory(p.category || 'article');
    setPublishedAt((p.published_at || '').slice(0, 10) || today());
    setTitle(p.title); setTitleEn(p.title_en || ''); setContent(p.content || ''); setContentEn(p.content_en || '');
    setThumb(p.thumbnail_url || ''); setLinkUrl(p.link_url || ''); setPdfUrl(p.pdf_url || '');
    setScanPreview(null); setScanMsg(null); setSaveMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('삭제할까요?')) return;
    const res = await fetch(`/api/press/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 404) {
      onToast?.('삭제됨');
      if (editingId === id) reset();
      setList((prev) => prev.filter((p) => p.id !== id));
    } else {
      onToast?.('삭제 실패');
    }
  };

  // 본문(주로 OCR로 추출된)에서 그림 URL 목록 — 대표이미지 교체 후보
  const bodyImages = useMemo(() => {
    const urls = [...content.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
    return Array.from(new Set(urls));
  }, [content]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">Articles(기사)와 Broadcasts(방송)를 관리합니다.</p>

      <div className="border border-gray-200 rounded p-4 space-y-3 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-800">{editingId ? '항목 수정' : '새 항목 추가'}</h3>

        {/* 스캔 신문기사 자동 변환 (OCR + 사진 오려내기) — 대표이미지 업로더와 동일 UX, 컴팩트 */}
        <div className="space-y-1.5 max-w-md">
          <span className="block text-sm font-medium text-gray-800">스캔 신문기사 자동 변환 (OCR + 사진 오려내기)</span>
          <div
            className={`relative h-16 px-3 border-2 border-dashed rounded flex items-center justify-center gap-3 cursor-pointer transition-colors overflow-hidden ${
              scanDrag ? 'border-gray-700 bg-gray-100' : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
            onDragEnter={onScanDrag}
            onDragLeave={onScanDrag}
            onDragOver={onScanDrag}
            onDrop={onScanDrop}
            onClick={() => { if (!scanning) scanInputRef.current?.click(); }}
          >
            {scanPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scanPreview} alt="스캔 미리보기" className="absolute inset-0 w-full h-full object-contain bg-gray-50" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 shrink-0">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-gray-600 text-xs leading-tight">
                  신문기사 스캔을 드래그·클릭하여 업로드<br />
                  <span className="text-gray-400">제목·본문(한/영)·사진·전시정보 자동 추출</span>
                </span>
              </>
            )}
            {scanning && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <p className="text-white text-xs">기사 분석 중… (약 1분 내외)</p>
              </div>
            )}
          </div>
          <input
            ref={scanInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = ''; }}
            className="hidden"
          />
          {scanMsg && (
            <p className={`text-xs ${scanMsg.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>{scanMsg.text}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">분류
            <select value={category} onChange={(e) => setCategory(e.target.value as PressCategory)} className={FIELD}>
              {PRESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-600">발행일
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={FIELD} />
          </label>
          <label className="text-xs text-gray-600">제목
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
          </label>
          <label className="text-xs text-gray-600">제목 (영문)
            <div className="flex items-center gap-2">
              <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={FIELD} />
              <TranslateButton source={title} onResult={setTitleEn} />
            </div>
          </label>
          <label className="text-xs text-gray-600">외부 링크 URL (기사 원문 / 방송 영상)
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className={FIELD} />
          </label>
          <label className="text-xs text-gray-600">PDF URL
            <input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://..." className={FIELD} />
          </label>
        </div>
        <div>
          <span className="text-xs text-gray-600">대표 이미지</span>
          <div className="w-[30%] min-w-[160px]">
            <ImageUploader currentImage={thumb} onUpload={(url) => setThumb(url)} />
          </div>
          {bodyImages.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">본문 그림에서 대표로 선택 (클릭):</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {bodyImages.map((url) => {
                  const selected = thumb === url;
                  return (
                    <button
                      type="button"
                      key={url}
                      onClick={() => setThumb(url)}
                      title={selected ? '현재 대표 이미지' : '대표 이미지로 선택'}
                      className={`relative w-14 h-14 rounded overflow-hidden border-2 transition-colors ${selected ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {selected && <span className="absolute bottom-0 inset-x-0 bg-blue-500 text-white text-[9px] text-center leading-tight">대표</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600">
          <span className="block mb-1 font-medium">메인 글 (한글·이미지·유튜브)</span>
          <RichEditor value={content} onChange={setContent} />
        </div>
        <div className="text-xs text-gray-600">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">영문 글 (AI 생성·글만) — 공개 시 한글 본문 아래에 이어 붙습니다</span>
            <TranslateButton source={stripMediaHtml(content)} onResult={setContentEn} />
          </div>
          <RichEditor value={contentEn} onChange={setContentEn} textOnly />
        </div>
        <SaveBar
          type="button"
          onSave={submit}
          loading={saving}
          message={saveMsg}
          onCancel={editingId ? reset : undefined}
          extra={
            <TranslateAllButton
              pairs={[
                { source: title, target: titleEn, apply: setTitleEn },
                { source: stripMediaHtml(content), target: contentEn, apply: setContentEn },
              ]}
              onToast={onToast}
            />
          }
        />
      </div>

      {/* 목록 — 분류별 표 (Resources와 동일 스타일) */}
      <div>
        {PRESS_CATEGORIES.map((c) => {
          const items = list
            .filter((p) => (p.category || 'article') === c.value)
            .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
          if (!items.length) return null;
          return (
            <div key={c.value} className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 mb-3">{c.label} ({items.length})</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">날짜</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">제목</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{(p.published_at || '').slice(0, 10)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {p.title}{p.title_en ? <span className="text-gray-400"> / {p.title_en}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => startEdit(p)} className="text-gray-600 hover:text-gray-900 text-sm mr-3">수정</button>
                          <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-gray-400">아직 항목이 없습니다.</p>}
      </div>
    </div>
  );
}
