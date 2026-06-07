'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Artwork, ArtworkGenre, genreLabel } from '@/types/artwork';
import type { WorksGroupNav } from '@/lib/works';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';
import ArtworkModal from '@/components/artwork/ArtworkModal';
import WorksCollectionsNav from '@/components/works/WorksCollectionsNav';

interface Props {
  genre: ArtworkGenre;
  genreSlug: string;
  groups: WorksGroupNav[];
  currentSlug: string | null;
  currentSub?: string | null;
  artworks: Artwork[];
}

export default function WorksGenreScreen({ genre, genreSlug, groups, currentSlug, currentSub = null, artworks }: Props) {
  const { locale, t } = useLocale();
  const [selected, setSelected] = useState(0);
  const [modalIdx, setModalIdx] = useState<number | null>(null);

  // 장르(브레드크럼)·연도는 영어 고정이지만, 주제/시리즈/지역은 한/영 전환되게 한다.
  // 연도(decade)는 label===label_en이라 locale과 무관하게 동일하게 표시됨.
  const labelOf = (n: { label: string; label_en: string }) => (locale === 'en' ? n.label_en : n.label);
  const current = groups.find((g) => g.slug === currentSlug);
  const subFolders = current?.kind === 'series' ? current.children ?? [] : [];
  const currentSubNode = subFolders.find((s) => s.slug === currentSub);
  const allLabel = locale === 'en' ? 'All' : '전체';
  const decades = groups.filter((g) => g.kind === 'decade');
  const seriesList = groups.filter((g) => g.kind === 'series');
  const themeList = groups.filter((g) => g.kind === 'theme');
  const sel = artworks[selected] ?? artworks[0];
  const isCloud = (u?: string) => !!u && u.includes('res.cloudinary.com');

  const caption = (a: Artwork) => {
    const title = getLocalizedValue(locale, a.title, a.title_en);
    const medium = getLocalizedValue(locale, a.medium, a.medium_en);
    // 한글: cm만. 영어: cm 뒤 ( inch ) 추가 (ArtworkModal과 동일 규칙)
    let dims = '';
    if (!a.variable_size && a.height && a.width) {
      dims = ` ${a.height}×${a.width}cm`;
      if (locale === 'en') {
        const hi = (a.height * 0.393701).toFixed(1);
        const wi = (a.width * 0.393701).toFixed(1);
        dims += ` (${hi}×${wi}in)`;
      }
    }
    return `${title}${a.year ? `, ${a.year}` : ''}${medium ? ` · ${medium}` : ''}${dims}`;
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb (우측 정렬 — Hockney) */}
        <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-lg">
          <Link href="/works" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-wide">{t.nav.works.toUpperCase()}</Link>
          <span className="text-[var(--text-secondary)]">/</span>
          <Link href={`/works/${genreSlug}`} className="text-[var(--foreground)] tracking-wide">{(t.nav as Record<string, string>)[genreSlug] ?? genreLabel(genre, 'en')}</Link>
          {current && (
            <>
              <span className="text-[var(--text-secondary)]">/</span>
              <span className="text-[var(--foreground)] font-medium tracking-wide">{labelOf(current)}</span>
            </>
          )}
          {currentSubNode && (
            <>
              <span className="text-[var(--text-secondary)]">/</span>
              <span className="text-[var(--foreground)] font-medium tracking-wide">{labelOf(currentSubNode)}</span>
            </>
          )}
        </div>

        {/* 연도 줄 (독립) */}
        {decades.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)]/70 mr-1">{locale === 'en' ? 'Years' : '연도'}</span>
            {decades.map((g, i) => (
              <span key={g.slug} className="flex items-center gap-2">
                {i > 0 && <span className="text-[var(--border)]">·</span>}
                <Link
                  href={`/works/${genreSlug}/${g.slug}`}
                  className={`hover:text-[var(--foreground)] transition-colors ${g.slug === currentSlug ? 'text-[var(--foreground)] font-medium' : ''}`}
                >
                  {labelOf(g)}
                </Link>
              </span>
            ))}
          </div>
        )}

        {/* 시리즈 · 주제 드롭다운 버튼 (동적 + 지역 플라이아웃) */}
        <WorksCollectionsNav
          genreSlug={genreSlug}
          series={seriesList}
          themes={themeList}
          currentSlug={currentSlug}
          currentSub={currentSub}
        />

        {/* Sub row (시리즈 하위 지역) — 시리즈 폴더에 지역 하위가 있을 때만 */}
        {subFolders.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
            <Link
              href={`/works/${genreSlug}/${currentSlug}`}
              className={`hover:text-[var(--foreground)] transition-colors ${!currentSub ? 'text-[var(--foreground)] font-medium' : ''}`}
            >
              {allLabel}
            </Link>
            {subFolders.map((s) => (
              <span key={s.slug} className="flex items-center gap-2">
                <span className="text-[var(--border)]">/</span>
                <Link
                  href={`/works/${genreSlug}/${currentSlug}/${s.slug}`}
                  className={`hover:text-[var(--foreground)] transition-colors ${s.slug === currentSub ? 'text-[var(--foreground)] font-medium' : ''}`}
                >
                  {labelOf(s)}
                </Link>
              </span>
            ))}
          </div>
        )}

        <hr className="my-6 border-[var(--border)]" />

        {artworks.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-16 text-center">표시할 작품이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
            {/* 대형 선택작 — 호버 시 + 버튼, 클릭하면 확대(줌/팬) 모달 */}
            <div className="lg:sticky lg:top-20 self-start">
              <button
                type="button"
                onClick={() => setModalIdx(selected)}
                className="group relative w-full aspect-[4/3] bg-[var(--surface)] block cursor-zoom-in"
                aria-label={t.aria.viewArtwork}
              >
                {sel && (
                  <Image
                    src={sel.image_url}
                    alt={getLocalizedValue(locale, sel.title, sel.title_en)}
                    fill
                    sizes="(max-width:1024px) 100vw, 60vw"
                    className="object-contain"
                    priority
                    {...(isCloud(sel.image_url) ? { loader: cloudinaryLoader } : {})}
                  />
                )}
                {/* + 버튼 (호버) */}
                <span className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              {sel && <p className="mt-3 text-sm text-[var(--text-secondary)]">{caption(sel)}</p>}
            </div>

            {/* 썸네일 그리드 */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 lg:w-[360px] self-start content-start">
              {artworks.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(i)}
                  className={`relative aspect-square overflow-hidden bg-[var(--surface)] border transition-all ${i === selected ? 'border-[var(--foreground)]' : 'border-transparent hover:border-[var(--border)]'}`}
                  title={getLocalizedValue(locale, a.title, a.title_en)}
                >
                  <Image
                    src={a.thumbnail_url || a.image_url}
                    alt={getLocalizedValue(locale, a.title, a.title_en)}
                    fill
                    sizes="80px"
                    className="object-cover"
                    {...(isCloud(a.thumbnail_url || a.image_url) ? { loader: cloudinaryLoader } : {})}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 확대 모달 (줌/팬 + 좌우 화살표) */}
      {modalIdx !== null && artworks[modalIdx] && (
        <ArtworkModal
          artwork={artworks[modalIdx]}
          onClose={() => setModalIdx(null)}
          onPrev={() => setModalIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setModalIdx((i) => (i !== null && i < artworks.length - 1 ? i + 1 : i))}
          hasPrev={modalIdx > 0}
          hasNext={modalIdx < artworks.length - 1}
          preloadImages={[artworks[modalIdx - 1]?.image_url, artworks[modalIdx + 1]?.image_url].filter(Boolean) as string[]}
        />
      )}
    </main>
  );
}
