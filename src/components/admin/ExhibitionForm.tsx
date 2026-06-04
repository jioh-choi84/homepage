'use client';

import { useState } from 'react';
import { Exhibition, ExhibitionFormData, ExhibitionType, EXHIBITION_TYPE_OPTIONS } from '@/types/artwork';
import Button from '@/components/common/Button';
import RichEditor from './RichEditor';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import SaveBar, { type SaveMsg } from './SaveBar';
import { stripMediaHtml } from '@/lib/strip-media';

interface ExhibitionFormProps {
  exhibition?: Exhibition;
  onSubmit: (data: ExhibitionFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ExhibitionForm({
  exhibition,
  onSubmit,
  onCancel,
}: ExhibitionFormProps) {
  const [formData, setFormData] = useState<ExhibitionFormData>({
    title: exhibition?.title || '',
    title_en: exhibition?.title_en || '',
    venue: exhibition?.venue || '',
    venue_en: exhibition?.venue_en || '',
    location: exhibition?.location || '',
    location_en: exhibition?.location_en || '',
    year: exhibition?.year || new Date().getFullYear(),
    type: exhibition?.type || 'solo',
    external_url: exhibition?.external_url || '',
    display_order: exhibition?.display_order || 0,
    is_special: exhibition?.is_special || false,
    start_date: exhibition?.start_date || '',
    end_date: exhibition?.end_date || '',
    image_url: exhibition?.image_url || '',
    subtitle: exhibition?.subtitle || '',
    subtitle_en: exhibition?.subtitle_en || '',
    description: exhibition?.description || '',
    description_en: exhibition?.description_en || '',
    city: exhibition?.city || '',
    city_en: exhibition?.city_en || '',
    hidden: exhibition?.hidden || false,
  });

  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  // 네오룩 자동 가져오기
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMsg(null);
    setImportWarnings([]);
    try {
      const res = await fetch('/api/exhibitions/import-neolook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '가져오기 실패');
      // 빈 값으로 기존 입력을 덮어쓰지 않도록 채워진 필드만 병합
      const incoming = json.data as Partial<ExhibitionFormData>;
      setFormData((p) => {
        const merged = { ...p };
        (Object.keys(incoming) as (keyof ExhibitionFormData)[]).forEach((k) => {
          const v = incoming[k];
          if (v !== undefined && v !== null && v !== '') {
            // @ts-expect-error 동적 키 할당
            merged[k] = v;
          }
        });
        return merged;
      });
      setImportWarnings(json.warnings || []);
      setImportMsg({ type: 'ok', text: '가져왔습니다. 내용을 검토한 뒤 저장하세요.' });
    } catch (err) {
      setImportMsg({ type: 'error', text: err instanceof Error ? err.message : '가져오기 실패' });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg(null);

    try {
      await onSubmit(formData);
      setSaveMsg({ ok: true, text: '저장되었습니다.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">


      {/* 네오룩에서 자동 가져오기 */}
      <div className="border border-blue-200 bg-blue-50 rounded p-3 space-y-2">
        <label className="block text-sm font-medium text-gray-800">
          네오룩에서 가져오기
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleImport();
              }
            }}
            placeholder="https://neolook.com/archives/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
          />
          <Button type="button" variant="secondary" onClick={handleImport} loading={importing}>
            가져오기
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          네오룩 전시 기사 주소를 넣으면 제목·장소·기간·본문·이미지를 자동으로 채웁니다. (검토 후 저장)
        </p>
        {importMsg && (
          <p className={`text-xs ${importMsg.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
            {importMsg.text}
          </p>
        )}
        {importWarnings.length > 0 && (
          <ul className="text-xs text-amber-700 list-disc pl-5">
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 상단 토글: Featured / 감추기 */}
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded p-3 bg-gray-50 flex-1 min-w-[200px]">
          <input type="checkbox" checked={!!formData.is_special}
            onChange={(e) => setFormData({ ...formData, is_special: e.target.checked })}
            className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-800">Featured — 주요 전시로 표시(상단 고정·본문 펼침)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded p-3 bg-gray-50 flex-1 min-w-[200px]">
          <input type="checkbox" checked={!!formData.hidden}
            onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
            className="w-4 h-4" />
          <span className="text-sm font-medium text-gray-800">감추기 — 공개 사이트에서 숨김</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전시명 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전시명 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.title_en || ''}
              onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Exhibition Title"
            />
            <TranslateButton source={formData.title} onResult={(en) => setFormData((p) => ({ ...p, title_en: en }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            장소 (갤러리/기관명) *
          </label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            장소 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.venue_en || ''}
              onChange={(e) => setFormData({ ...formData, venue_en: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Gallery / Institution Name"
            />
            <TranslateButton source={formData.venue} onResult={(en) => setFormData((p) => ({ ...p, venue_en: en }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            지역
          </label>
          <input
            type="text"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="예: 서울, 한국"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            지역 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.location_en || ''}
              onChange={(e) => setFormData({ ...formData, location_en: e.target.value })}
              placeholder="e.g. Seoul, Korea"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            />
            <TranslateButton source={formData.location || ''} onResult={(en) => setFormData((p) => ({ ...p, location_en: en }))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            연도 *
          </label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            min="1900"
            max="2100"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            유형 *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ExhibitionType })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900"
          >
            {EXHIBITION_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.ko}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          외부 링크
        </label>
        <input
          type="url"
          value={formData.external_url || ''}
          onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* 기간 (지나면 자동 past) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
          <input type="date" value={(formData.start_date || '').slice(0, 10)}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">종료일 (지나면 자동 Past)</label>
          <input type="date" value={(formData.end_date || '').slice(0, 10)}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400" />
        </div>
      </div>

      {/* 전시 본문 — 한글 글(이미지·영상 포함) */}
      <div className="text-sm text-gray-700">
        <span className="block mb-1 font-medium">전시 설명/본문 (글·이미지·유튜브)</span>
        <RichEditor
          value={formData.description || ''}
          onChange={(html) => setFormData((p) => ({ ...p, description: html }))}
        />
      </div>

      {/* 영문 글 (AI 생성·글만) — resources와 동일한 박스 복제 */}
      <div className="text-xs text-gray-600">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">영문 글 (AI 생성·글만) — 공개 시 한글 본문 아래에 이어 붙습니다</span>
          <TranslateButton
            source={stripMediaHtml(formData.description || '')}
            onResult={(en) => setFormData((p) => ({ ...p, description_en: en }))}
          />
        </div>
        <RichEditor
          value={formData.description_en || ''}
          onChange={(html) => setFormData((p) => ({ ...p, description_en: html }))}
          textOnly
        />
      </div>

      <SaveBar
        type="submit"
        loading={loading}
        message={saveMsg}
        onCancel={exhibition ? onCancel : undefined}
        extra={
          <TranslateAllButton
            pairs={[
              { source: formData.title, target: formData.title_en || '', apply: (en) => setFormData((p) => ({ ...p, title_en: en })) },
              { source: formData.venue, target: formData.venue_en || '', apply: (en) => setFormData((p) => ({ ...p, venue_en: en })) },
              { source: formData.location || '', target: formData.location_en || '', apply: (en) => setFormData((p) => ({ ...p, location_en: en })) },
              { source: stripMediaHtml(formData.description || ''), target: formData.description_en || '', apply: (en) => setFormData((p) => ({ ...p, description_en: en })) },
            ]}
          />
        }
      />
    </form>
  );
}
