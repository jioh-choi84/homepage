'use client';

import { useState, useEffect, useCallback } from 'react';
import { Resource, ResourceCategory, RESOURCE_CATEGORIES } from '@/types/artwork';
import Button from '@/components/common/Button';
import ImageUploader from './ImageUploader';
import RichEditor from './RichEditor';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import { stripMediaHtml } from '@/lib/strip-media';
import SaveBar, { type SaveMsg } from './SaveBar';

const FIELD = 'w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400';

export default function ResourceManager({ onToast }: { onToast?: (m: string) => void }) {
  const [list, setList] = useState<Resource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<ResourceCategory>('making');
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [content, setContent] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [thumb, setThumb] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  const fetchList = useCallback(async () => {
    const res = await fetch('/api/resources?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) setList(await res.json());
  }, []);
  useEffect(() => { fetchList(); }, [fetchList]);

  const reset = () => {
    setEditingId(null); setCategory('making'); setTitle(''); setTitleEn('');
    setContent(''); setContentEn(''); setThumb('');
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) { setSaveMsg({ ok: false, text: '제목과 내용을 입력하세요.' }); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      const body = { category, title: title.trim(), title_en: titleEn.trim() || undefined, content, content_en: contentEn.trim() || undefined, thumbnail_url: thumb || null };
      const res = await fetch(editingId ? `/api/resources/${editingId}` : '/api/resources', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { reset(); fetchList(); setSaveMsg({ ok: true, text: '저장되었습니다.' }); }
      else {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j.error || detail; } catch { detail = `${detail}: ${(await res.text().catch(() => '')).slice(0, 300)}`; }
        setSaveMsg({ ok: false, text: `저장 실패 — ${detail}` });
      }
    } catch (e) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${e instanceof Error ? e.message : String(e)}` });
    } finally { setSaving(false); }
  };

  const startEdit = (r: Resource) => {
    setEditingId(r.id); setCategory(r.category); setTitle(r.title); setTitleEn(r.title_en || '');
    setContent(r.content); setContentEn(r.content_en || ''); setThumb(r.thumbnail_url || '');
    setSaveMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = async (id: string) => {
    if (!confirm('삭제할까요?')) return;
    const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
    // 낙관적 갱신: refetch 금지(Blob 전파 지연으로 삭제본이 되살아남). 로컬에서 즉시 제거.
    if (res.ok || res.status === 404) {
      onToast?.('삭제됨');
      if (editingId === id) reset();
      setList((prev) => prev.filter((r) => r.id !== id));
    } else {
      onToast?.('삭제 실패');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">Process(제작 과정)와 Writings(글)를 관리합니다.</p>

      <div className="border border-gray-200 rounded p-4 space-y-3 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-800">{editingId ? '항목 수정' : '새 항목 추가'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">분류
            <select value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)} className={FIELD}>
              {RESOURCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <div />
          <label className="text-xs text-gray-600">제목
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
          </label>
          <label className="text-xs text-gray-600">제목 (영문)
            <div className="flex items-center gap-2">
              <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={FIELD} />
              <TranslateButton source={title} onResult={setTitleEn} />
            </div>
          </label>
        </div>
        <div>
          <span className="text-xs text-gray-600">대표 이미지</span>
          <div className="w-[30%] min-w-[160px]">
            <ImageUploader currentImage={thumb} onUpload={(url) => setThumb(url)} />
          </div>
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

      {/* 목록 — Exhibition 표 스타일과 동일 */}
      <div>
        {RESOURCE_CATEGORIES.map((c) => {
          const items = list.filter((r) => r.category === c.value);
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
                    {items.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{(r.published_at || '').slice(0, 10)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {r.title}{r.title_en ? <span className="text-gray-400"> / {r.title_en}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => startEdit(r)} className="text-gray-600 hover:text-gray-900 text-sm mr-3">수정</button>
                          <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
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
