'use client';

import { useState, useEffect } from 'react';
import { Category, CategoryFormData } from '@/types/artwork';
import ImageUploader from '@/components/admin/ImageUploader';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import SaveBar, { type SaveMsg } from './SaveBar';

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryFormData & { cover_image_url?: string }) => Promise<void>;
  onCancel: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function CategoryForm({
  category,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    name_en: '',
    slug: '',
    description: '',
    description_en: '',
  });
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        name_en: category.name_en || '',
        slug: category.slug,
        description: category.description || '',
        description_en: category.description_en || '',
      });
      setCoverImageUrl(category.cover_image_url || '');
    }
  }, [category]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: category ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg(null);

    try {
      await onSubmit({
        ...formData,
        cover_image_url: coverImageUrl || '',
      });
      setSaveMsg({ ok: true, text: '저장되었습니다.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            카테고리 이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            required
            placeholder="예: 풍경화, 인물화, 추상화"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            카테고리 이름 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="e.g. Landscape, Portrait, Abstract"
            />
            <TranslateButton source={formData.name} onResult={(en) => setFormData((p) => ({ ...p, name_en: en }))} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          슬러그 (URL) <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
          required
          placeholder="예: landscape, portrait, abstract"
        />
        <p className="text-xs text-gray-400 mt-1">
          URL에 사용됩니다: /portfolio/{formData.slug || 'slug'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">설명</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none bg-white text-gray-900 placeholder-gray-400"
            rows={3}
            placeholder="이 카테고리에 대한 간단한 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">설명 (영문)</label>
          <div className="flex items-start gap-2">
            <textarea
              value={formData.description_en}
              onChange={(e) =>
                setFormData({ ...formData, description_en: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none bg-white text-gray-900 placeholder-gray-400"
              rows={3}
              placeholder="Brief description of this category"
            />
            <TranslateButton source={formData.description || ''} onResult={(en) => setFormData((p) => ({ ...p, description_en: en }))} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">커버 이미지</label>
        <ImageUploader
          onUpload={(imageUrl) => setCoverImageUrl(imageUrl)}
          currentImage={coverImageUrl}
        />
        <p className="text-xs text-gray-400 mt-1">
          포트폴리오 페이지에서 카테고리 썸네일로 표시됩니다
        </p>
      </div>

      <SaveBar
        type="submit"
        loading={loading}
        message={saveMsg}
        onCancel={onCancel}
        extra={
          <TranslateAllButton
            pairs={[
              { source: formData.name, target: formData.name_en || '', apply: (en) => setFormData((p) => ({ ...p, name_en: en })) },
              { source: formData.description || '', target: formData.description_en || '', apply: (en) => setFormData((p) => ({ ...p, description_en: en })) },
            ]}
          />
        }
      />
    </form>
  );
}
