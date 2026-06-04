'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notice, NoticePosition, NOTICE_POSITION_OPTIONS, MAX_NOTICES } from '@/types/artwork';
import Button from '@/components/common/Button';
import ImageUploader from './ImageUploader';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import SaveBar, { type SaveMsg } from './SaveBar';

const FIELD = 'w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400';

const posLabel = (p: NoticePosition) => NOTICE_POSITION_OPTIONS.find((o) => o.value === p)?.ko ?? p;

export default function NoticeManager({ onToast }: { onToast?: (m: string) => void }) {
  const [list, setList] = useState<Notice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [position, setPosition] = useState<NoticePosition>('center');
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [body, setBody] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkLabelEn, setLinkLabelEn] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  const fetchList = useCallback(async () => {
    const res = await fetch('/api/notices?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) setList(await res.json());
  }, []);
  useEffect(() => { fetchList(); }, [fetchList]);

  const reset = () => {
    setEditingId(null); setActive(true); setPosition('center');
    setTitle(''); setTitleEn(''); setBody(''); setBodyEn('');
    setImageUrl(''); setLinkUrl(''); setLinkLabel(''); setLinkLabelEn('');
    setStartDate(''); setEndDate('');
  };

  const atMax = list.length >= MAX_NOTICES;
  const showForm = editingId !== null || !atMax;

  const submit = async () => {
    if (!title.trim()) { setSaveMsg({ ok: false, text: '제목을 입력하세요.' }); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      const wasEdit = !!editingId;
      const payload = {
        active, position,
        title: title.trim(), title_en: titleEn.trim() || undefined,
        body: body.trim() || undefined, body_en: bodyEn.trim() || undefined,
        image_url: imageUrl || null,
        link_url: linkUrl.trim() || undefined,
        link_label: linkLabel.trim() || undefined,
        link_label_en: linkLabelEn.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const res = await fetch(editingId ? `/api/notices/${editingId}` : '/api/notices', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved: Notice = await res.json();
        reset();
        // 낙관적 갱신(refetch 금지 — Blob 전파 지연 대응)
        setList((prev) => (wasEdit ? prev.map((n) => (n.id === saved.id ? saved : n)) : [...prev, saved]));
        setSaveMsg({ ok: true, text: '저장되었습니다.' });
      } else {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j.error || detail; } catch { detail = `${detail}: ${(await res.text().catch(() => '')).slice(0, 300)}`; }
        setSaveMsg({ ok: false, text: `저장 실패 — ${detail}` });
      }
    } catch (e) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${e instanceof Error ? e.message : String(e)}` });
    } finally { setSaving(false); }
  };

  const startEdit = (n: Notice) => {
    setEditingId(n.id); setActive(n.active); setPosition(n.position);
    setTitle(n.title); setTitleEn(n.title_en || ''); setBody(n.body || ''); setBodyEn(n.body_en || '');
    setImageUrl(n.image_url || ''); setLinkUrl(n.link_url || '');
    setLinkLabel(n.link_label || ''); setLinkLabelEn(n.link_label_en || '');
    setStartDate((n.start_date || '').slice(0, 10)); setEndDate((n.end_date || '').slice(0, 10));
    setSaveMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('이 공지를 삭제할까요?')) return;
    const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 404) {
      onToast?.('삭제됨');
      if (editingId === id) reset();
      setList((prev) => prev.filter((n) => n.id !== id));
    } else onToast?.('삭제 실패');
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">홈 화면에 뜨는 팝업 공지입니다. <b>최대 {MAX_NOTICES}개</b>까지, 각 공지의 화면 위치를 지정할 수 있습니다.</p>

      {showForm ? (
        <div className="border border-gray-200 rounded p-4 space-y-3 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-800">{editingId ? '공지 수정' : '새 공지 추가'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4" />
              활성(노출)
            </label>
            <label className="text-xs text-gray-600">화면 위치
              <select value={position} onChange={(e) => setPosition(e.target.value as NoticePosition)} className={FIELD}>
                {NOTICE_POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.ko}</option>)}
              </select>
            </label>
            <div />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">제목
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} placeholder="공지 제목" />
            </label>
            <label className="text-xs text-gray-600">제목 (영문)
              <div className="flex items-center gap-2">
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={FIELD} placeholder="Title" />
                <TranslateButton source={title} onResult={setTitleEn} />
              </div>
            </label>
            <label className="text-xs text-gray-600">내용 (간단한 글)
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={FIELD} placeholder="공지 내용" />
            </label>
            <label className="text-xs text-gray-600">내용 (영문)
              <div className="flex items-start gap-2">
                <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} rows={3} className={FIELD} placeholder="Message" />
                <TranslateButton source={body} onResult={setBodyEn} />
              </div>
            </label>
          </div>

          <div>
            <span className="text-xs text-gray-600">대표 이미지 (선택)</span>
            <div className="w-[30%] min-w-[160px]">
              <ImageUploader currentImage={imageUrl} onUpload={(url) => setImageUrl(url)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">링크 URL (선택)
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={FIELD} placeholder="https://..." />
            </label>
            <label className="text-xs text-gray-600">버튼 라벨
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={FIELD} placeholder="바로가기" />
            </label>
            <label className="text-xs text-gray-600">버튼 라벨 (영문)
              <div className="flex items-center gap-2">
                <input value={linkLabelEn} onChange={(e) => setLinkLabelEn(e.target.value)} className={FIELD} placeholder="View" />
                <TranslateButton source={linkLabel} onResult={setLinkLabelEn} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">시작일 (선택)
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FIELD} />
            </label>
            <label className="text-xs text-gray-600">종료일 (선택)
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={FIELD} />
            </label>
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
                  { source: body, target: bodyEn, apply: setBodyEn },
                  { source: linkLabel, target: linkLabelEn, apply: setLinkLabelEn },
                ]}
                onToast={onToast}
              />
            }
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500 border border-gray-200 rounded p-4 bg-gray-50">
          공지는 최대 {MAX_NOTICES}개까지 등록할 수 있습니다. 추가하려면 기존 공지를 삭제하세요.
        </p>
      )}

      {/* 목록 */}
      {list.length === 0 ? (
        <p className="text-sm text-gray-400">아직 공지가 없습니다.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">활성</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">위치</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">기간</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((n) => (
                <tr key={n.id} className={`hover:bg-gray-50 ${n.active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 text-sm">{n.active ? <span className="text-green-600">ON</span> : <span className="text-gray-400">OFF</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{posLabel(n.position)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{n.title}{n.title_en ? <span className="text-gray-400"> / {n.title_en}</span> : null}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {(n.start_date || n.end_date) ? `${(n.start_date || '').slice(0, 10)} ~ ${(n.end_date || '').slice(0, 10)}` : '제한 없음'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(n)} className="text-gray-600 hover:text-gray-900 text-sm mr-3">수정</button>
                    <button onClick={() => remove(n.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
