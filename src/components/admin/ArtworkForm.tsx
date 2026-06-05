'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Artwork, ArtworkFormData, Category, ArtworkGenre, GENRE_OPTIONS, DEFAULT_GENRE } from '@/types/artwork';
import Button from '@/components/common/Button';
import ImageUploader from './ImageUploader';
import { TranslateButton, TranslateAllButton } from './TranslateButton';
import ClassificationValueManager from './ClassificationValueManager';
import SaveBar, { type SaveMsg } from './SaveBar';
import { parseArtworkFilename } from '@/lib/parse-artwork-filename';
import { artworkDupKey } from '@/lib/artwork-dedup';

interface ArtworkFormProps {
  artwork?: Artwork;
  categories: Category[];
  /** 자동완성 제안용: 기존 작품들에서 시리즈/주제/지역 값을 모은다 */
  existingArtworks?: Artwork[];
  onSubmit: (data: ArtworkFormData & { image_url: string; thumbnail_url: string }) => Promise<void>;
  onCancel: () => void;
  /** 분류값 일괄 변경/삭제 후 갱신된 작품 배열을 부모로 전달 */
  onArtworksChanged?: (artworks: Artwork[]) => void;
  onToast?: (m: string) => void;
}

// 분류 입력칸 + 호버/포커스 시 뜨는 기존값 드롭다운(클릭=채우기, ✎ 이름변경, × 삭제)
function FieldWithValues({ field, values, onPick, onChanged, onToast, children }: {
  field: string;
  values: string[];
  onPick: (v: string) => void;
  onChanged?: (a: Artwork[]) => void;
  onToast?: (m: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative group">
      {children}
      {values.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 rounded-md rounded-t-none border border-gray-200 border-t-0 bg-white/95 backdrop-blur-sm shadow-lg p-2 max-h-60 overflow-auto invisible opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <p className="text-[11px] text-gray-400 mb-1 px-0.5">기존 값 — 클릭: 입력 · ✎ 이름변경 · × 삭제(전체 반영)</p>
          <ClassificationValueManager field={field} values={values} onPick={onPick} onChanged={(a) => onChanged?.(a)} onToast={onToast} />
        </div>
      )}
    </div>
  );
}

// 기존 작품들에서 특정 필드의 중복 없는 값 목록을 추출 (datalist 제안용)
function distinctValues(artworks: Artwork[], field: keyof Artwork): string[] {
  const set = new Set<string>();
  for (const a of artworks) {
    const v = a[field];
    if (typeof v === 'string' && v.trim()) set.add(v.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function ArtworkForm({ artwork, categories, existingArtworks = [], onSubmit, onCancel, onArtworksChanged, onToast }: ArtworkFormProps) {
  const [title, setTitle] = useState(artwork?.title || '');
  const [titleEn, setTitleEn] = useState(artwork?.title_en || '');
  const [year, setYear] = useState(artwork?.year?.toString() || new Date().getFullYear().toString());
  const [width, setWidth] = useState(artwork?.width?.toString() || '');
  const [height, setHeight] = useState(artwork?.height?.toString() || '');
  const [medium, setMedium] = useState(artwork?.medium || '');
  const [mediumEn, setMediumEn] = useState(artwork?.medium_en || '');
  const [collection, setCollection] = useState(artwork?.collection || '');
  const [collectionEn, setCollectionEn] = useState(artwork?.collection_en || '');
  const [series, setSeries] = useState(artwork?.series || '');
  const [seriesEn, setSeriesEn] = useState(artwork?.series_en || '');
  const [theme, setTheme] = useState(artwork?.theme || '');
  const [themeEn, setThemeEn] = useState(artwork?.theme_en || '');
  const [region, setRegion] = useState(artwork?.region || '');
  const [regionEn, setRegionEn] = useState(artwork?.region_en || '');
  const [genre, setGenre] = useState<ArtworkGenre>(artwork?.genre || DEFAULT_GENRE);
  const [variableSize, setVariableSize] = useState(artwork?.variable_size || false);
  const [categoryId, setCategoryId] = useState(artwork?.category_id || '');
  const [showWatermark, setShowWatermark] = useState(artwork?.show_watermark ?? true);
  const [hidden, setHidden] = useState(artwork?.hidden ?? false);
  const [imageUrl, setImageUrl] = useState(artwork?.image_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(artwork?.thumbnail_url || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<SaveMsg | null>(null);

  useEffect(() => {
    setTitle(artwork?.title || '');
    setTitleEn(artwork?.title_en || '');
    setYear(artwork?.year?.toString() || new Date().getFullYear().toString());
    setWidth(artwork?.width?.toString() || '');
    setHeight(artwork?.height?.toString() || '');
    setMedium(artwork?.medium || '');
    setMediumEn(artwork?.medium_en || '');
    setCollection(artwork?.collection || '');
    setCollectionEn(artwork?.collection_en || '');
    setSeries(artwork?.series || '');
    setSeriesEn(artwork?.series_en || '');
    setTheme(artwork?.theme || '');
    setThemeEn(artwork?.theme_en || '');
    setRegion(artwork?.region || '');
    setRegionEn(artwork?.region_en || '');
    setGenre(artwork?.genre || DEFAULT_GENRE);
    setVariableSize(artwork?.variable_size || false);
    setCategoryId(artwork?.category_id || '');
    setShowWatermark(artwork?.show_watermark ?? true);
    setHidden(artwork?.hidden ?? false);
    setImageUrl(artwork?.image_url || '');
    setThumbnailUrl(artwork?.thumbnail_url || '');
    setErrors({});
    setSaveMsg(null);
    setDominantColor(artwork?.dominant_color || null);
  }, [artwork]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() && !titleEn.trim()) {
      newErrors.title = '제목(한글 또는 영문)을 입력해주세요';
    }

    if (!year || isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1) {
      newErrors.year = '올바른 연도를 입력해주세요';
    }

    if (!imageUrl) {
      newErrors.image = '이미지를 업로드해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) { setSaveMsg({ ok: false, text: '필수 항목을 확인해주세요 (제목·연도·이미지).' }); return; }

    // 신규 추가 시 중복(제목·연도·크기 동일) 차단 — 수정 모드는 자기 자신이라 건너뜀
    if (!artwork) {
      const key = artworkDupKey({ title, title_en: titleEn, year, width, height });
      if (existingArtworks.some((a) => artworkDupKey(a) === key)) {
        setSaveMsg({ ok: false, text: '이미 동일한 작품(제목·연도·크기)이 있습니다 — 중복으로 등록하지 않습니다.' });
        return;
      }
    }

    setLoading(true);
    setSaveMsg(null);

    try {
      await onSubmit({
        title: title.trim(),
        // 빈 입력은 undefined가 아닌 ''로 전송해야 서버 병합(updateArtwork: {...기존, ...body})이
        // 옛 값을 빈 값으로 덮어쓴다. undefined면 JSON.stringify가 키를 제거해 삭제가 무시됨.
        title_en: titleEn.trim(),
        year: parseInt(year),
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        medium: medium.trim(),
        medium_en: mediumEn.trim(),
        collection: collection.trim(),
        collection_en: collectionEn.trim(),
        series: series.trim(),
        series_en: seriesEn.trim(),
        theme: theme.trim(),
        theme_en: themeEn.trim(),
        region: region.trim(),
        region_en: regionEn.trim(),
        genre,
        variable_size: variableSize,
        category_id: categoryId || '',
        show_watermark: showWatermark,
        hidden,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        dominant_color: dominantColor,
      });
      setSaveMsg({ ok: true, text: '저장되었습니다.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: `저장 실패 — ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const [dominantColor, setDominantColor] = useState<string | null>(artwork?.dominant_color || null);

  const handleImageUpload = async (newImageUrl: string, newThumbnailUrl: string, originalName?: string) => {
    setImageUrl(newImageUrl);
    setThumbnailUrl(newThumbnailUrl);
    setErrors((prev) => ({ ...prev, image: '' }));

    // 파일명 자동 파싱 — 비어있는 칸만 채움(사용자 입력 보존)
    // 한글이 포함되면 한글 칸, 아니면 영문 칸으로 라우팅
    if (originalName) {
      const p = parseArtworkFilename(originalName);
      // NFC 음절(가-힣) + 호환 자모 + 조합용 자모(NFD 분해형)까지 한글로 인정
      const hasHangul = (s: string) => /[가-힣ㄱ-ㅎㅏ-ㅣᄀ-ᇿ]/.test(s.normalize('NFC'));
      if (p.title) {
        const v = p.title.normalize('NFC');
        if (hasHangul(v)) { if (!title.trim()) setTitle(v); }
        else if (!titleEn.trim()) setTitleEn(v);
      }
      if (p.height && !height) setHeight(String(p.height));
      if (p.width && !width) setWidth(String(p.width));
      if (p.medium) {
        const v = p.medium.normalize('NFC');
        if (hasHangul(v)) { if (!medium.trim()) setMedium(v); }
        else if (!mediumEn.trim()) setMediumEn(v);
      }
      if (p.year) setYear(String(p.year));
    }

    // 색상 자동 분석
    try {
      const res = await fetch('/api/portfolio/analyze-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: newImageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.dominant_color) {
          setDominantColor(data.dominant_color);
        }
      }
    } catch (err) {
      console.error('Color analysis failed:', err);
    }
  };

  // 자동완성(datalist) 제안 목록 — 기존 작품들에서 추출
  const seriesKoList = distinctValues(existingArtworks, 'series');
  const seriesEnList = distinctValues(existingArtworks, 'series_en');
  const themeKoList = distinctValues(existingArtworks, 'theme');
  const themeEnList = distinctValues(existingArtworks, 'theme_en');
  const regionKoList = distinctValues(existingArtworks, 'region');
  const regionEnList = distinctValues(existingArtworks, 'region_en');

  const fieldClass =
    'w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">


      <div>
        <ImageUploader
          onUpload={handleImageUpload}
          currentImage={imageUrl}
          blurred={hidden}
        />
        {errors.image && (
          <p className="text-red-400 text-sm mt-1">{errors.image}</p>
        )}
        {/* 그림 바로 아래 첫 번째: 숨기기 */}
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">숨기기 (공개 사이트에서 감춤 · 미리보기 흐리게)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            제목 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="작품 제목"
          />
          {errors.title && (
            <p className="text-red-400 text-sm mt-1">{errors.title}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            제목 (영문)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Artwork Title"
            />
            <TranslateButton source={title} onResult={setTitleEn} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            연도 <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="2024"
            min="1900"
            max={new Date().getFullYear() + 1}
          />
          {errors.year && (
            <p className="text-red-400 text-sm mt-1">{errors.year}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">세로 (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="80"
            min="1"
            disabled={variableSize}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">가로 (cm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="100"
            min="1"
            disabled={variableSize}
          />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={variableSize}
              onChange={(e) => setVariableSize(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">가변크기</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">재료/기법</label>
          <input
            type="text"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="캔버스에 유채"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">재료/기법 (영문)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={mediumEn}
              onChange={(e) => setMediumEn(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="Oil on canvas"
            />
            <TranslateButton source={medium} onResult={setMediumEn} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">소장처</label>
          <input
            type="text"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
            placeholder="국립현대미술관"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">소장처 (영문)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={collectionEn}
              onChange={(e) => setCollectionEn(e.target.value)}
              className="w-full h-10 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-gray-900 placeholder-gray-400"
              placeholder="National Museum of Modern and Contemporary Art"
            />
            <TranslateButton source={collection} onResult={setCollectionEn} />
          </div>
        </div>
      </div>

      {/* 분류: 시리즈 / 주제 / 지역 (한·영, 이전 입력값 드롭다운 제안 + free text), 장르 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">시리즈</label>
          <FieldWithValues field="series" values={seriesKoList} onPick={setSeries} onChanged={onArtworksChanged} onToast={onToast}>
            <input type="text" value={series}
              onChange={(e) => setSeries(e.target.value)}
              className={fieldClass} placeholder="예: 마음의 정원" />
          </FieldWithValues>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">시리즈 (영문)</label>
          <FieldWithValues field="series_en" values={seriesEnList} onPick={setSeriesEn} onChanged={onArtworksChanged} onToast={onToast}>
            <div className="flex items-center gap-2">
              <input type="text" value={seriesEn}
                onChange={(e) => setSeriesEn(e.target.value)}
                className={fieldClass} placeholder="e.g. Garden of Mind" />
              <TranslateButton source={series} onResult={setSeriesEn} />
            </div>
          </FieldWithValues>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">주제</label>
          <FieldWithValues field="theme" values={themeKoList} onPick={setTheme} onChanged={onArtworksChanged} onToast={onToast}>
            <input type="text" value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={fieldClass} placeholder="예: 자연" />
          </FieldWithValues>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">주제 (영문)</label>
          <FieldWithValues field="theme_en" values={themeEnList} onPick={setThemeEn} onChanged={onArtworksChanged} onToast={onToast}>
            <div className="flex items-center gap-2">
              <input type="text" value={themeEn}
                onChange={(e) => setThemeEn(e.target.value)}
                className={fieldClass} placeholder="e.g. Nature" />
              <TranslateButton source={theme} onResult={setThemeEn} />
            </div>
          </FieldWithValues>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">지역</label>
          <FieldWithValues field="region" values={regionKoList} onPick={setRegion} onChanged={onArtworksChanged} onToast={onToast}>
            <input type="text" value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={fieldClass} placeholder="예: 서울" />
          </FieldWithValues>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">지역 (영문)</label>
          <FieldWithValues field="region_en" values={regionEnList} onPick={setRegionEn} onChanged={onArtworksChanged} onToast={onToast}>
            <div className="flex items-center gap-2">
              <input type="text" value={regionEn}
                onChange={(e) => setRegionEn(e.target.value)}
                className={fieldClass} placeholder="e.g. Seoul" />
              <TranslateButton source={region} onResult={setRegionEn} />
            </div>
          </FieldWithValues>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">장르</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value as ArtworkGenre)}
            className={fieldClass}>
            {GENRE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.ko} / {g.en}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showWatermark}
            onChange={(e) => setShowWatermark(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">저작권 워터마크 표시 (© 마크 오버레이)</span>
        </label>
      </div>

      <SaveBar
        type="submit"
        loading={loading}
        message={saveMsg}
        onCancel={onCancel}
        extra={
          <TranslateAllButton
            pairs={[
              { source: title, target: titleEn, apply: setTitleEn },
              { source: medium, target: mediumEn, apply: setMediumEn },
              { source: collection, target: collectionEn, apply: setCollectionEn },
              { source: series, target: seriesEn, apply: setSeriesEn },
              { source: theme, target: themeEn, apply: setThemeEn },
              { source: region, target: regionEn, apply: setRegionEn },
            ]}
          />
        }
      />
    </form>
  );
}
