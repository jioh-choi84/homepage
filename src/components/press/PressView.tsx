'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Press, PRESS_CATEGORIES, PressCategory, pressSlug } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';
import LocalizedRichContent from '@/components/common/LocalizedRichContent';
import { coverImage, firstImageFromHtml } from '@/lib/media-cover';

const isCloud = (u?: string | null) => !!u && u.includes('res.cloudinary.com');

function formatDate(dateString: string, locale: 'ko' | 'en') {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PressOverview({ covers }: { covers: Partial<Record<PressCategory, string>> }) {
  const { t } = useLocale();
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-light tracking-wide text-[var(--foreground)] mb-8">{t.press.title}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PRESS_CATEGORIES.map((c) => (
            <Link key={c.value} href={`/press/${c.slug}`} className="group block">
              <div className="relative aspect-[3/2] overflow-hidden bg-[var(--surface)]">
                {covers[c.value] ? (
                  <Image src={covers[c.value]!} alt={c.label} fill sizes="(max-width:640px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    {...(isCloud(covers[c.value]) ? { loader: cloudinaryLoader } : {})} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] text-sm">No items yet</div>
                )}
              </div>
              <h2 className="mt-3 text-xl tracking-wide text-[var(--foreground)]">{c.label}</h2>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PressList({ category, items }: { category: PressCategory; items: Press[] }) {
  const { locale } = useLocale();
  const label = PRESS_CATEGORIES.find((c) => c.value === category)?.label ?? '';
  const slug = pressSlug(category);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* 2차 네비 — 우측 정렬 (Resources와 동일) */}
        <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-lg">
          <Link href="/press" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-wide">PRESS</Link>
          <span className="text-[var(--text-secondary)]">/</span>
          <span className="font-medium tracking-wide text-[var(--foreground)]">{label}</span>
        </div>
        <div className="mt-2 mb-8 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
          {PRESS_CATEGORIES.map((c, i) => (
            <span key={c.value} className="flex items-center gap-2">
              {i > 0 && <span className="text-[var(--border)]">/</span>}
              <Link href={`/press/${c.slug}`}
                className={`hover:text-[var(--foreground)] transition-colors ${c.value === category ? 'text-[var(--foreground)] font-medium' : ''}`}>
                {c.label}
              </Link>
            </span>
          ))}
        </div>
        {items.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-12 text-center">아직 등록된 항목이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((p) => (
              <Link key={p.id} href={`/press/${slug}/${p.id}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
                  {(() => {
                    const cover = coverImage(p.thumbnail_url, p.content);
                    return cover ? (
                      // 외부(네오룩 등) 이미지가 많아 일반 img 사용
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={getLocalizedValue(locale, p.title, p.title_en) || ''}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : <div className="absolute inset-0 bg-[var(--border)]/30" />;
                  })()}
                </div>
                <h3 className="mt-2 text-base text-[var(--foreground)] line-clamp-2">{getLocalizedValue(locale, p.title, p.title_en)}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{formatDate(p.published_at, locale)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export function PressDetail({ press }: { press: Press }) {
  const { locale, t } = useLocale();
  const title = getLocalizedValue(locale, press.title, press.title_en);
  const slug = pressSlug(press.category);
  const label = PRESS_CATEGORIES.find((c) => c.value === press.category)?.label ?? '';

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <article className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <Link href={`/press/${slug}`} className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          {label}
        </Link>

        <header className="mb-8">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
          <h1 className="text-3xl font-light text-[var(--foreground)] mt-2 mb-4">{title}</h1>
          <p className="text-[var(--text-secondary)]">{formatDate(press.published_at, locale)}</p>
        </header>

        {/* 본문에 그림이 있으면 상단 대표이미지 생략(바로 글 시작), 없을 때만 fallback 표지 표시 */}
        {!firstImageFromHtml(press.content) && (() => {
          const top = coverImage(press.thumbnail_url, press.content);
          return top ? (
            <div className="aspect-video relative bg-[var(--border)] mb-8 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={top} alt={title || ''} className="w-full h-full object-cover" />
            </div>
          ) : null;
        })()}

        <LocalizedRichContent html={press.content} en={press.content_en} className="mt-2 text-[var(--foreground)]" />

        <div className="flex gap-4 mt-10 pt-8 border-t border-[var(--border)]">
          {press.link_url && (
            <a href={press.link_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 border border-[var(--foreground)] text-[var(--foreground)] text-sm tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors">
              {t.press.externalLink}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {press.pdf_url && (
            <a href={press.pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] text-sm tracking-wider hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-colors">
              {t.press.downloadPdf}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
          )}
        </div>
      </article>
    </main>
  );
}
