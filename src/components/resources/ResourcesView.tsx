'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Resource, RESOURCE_CATEGORIES, ResourceCategory, resourceSlug } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';
import LocalizedRichContent from '@/components/common/LocalizedRichContent';
import { coverImage, firstImageFromHtml } from '@/lib/media-cover';

const isCloud = (u?: string | null) => !!u && u.includes('res.cloudinary.com');

export function ResourcesOverview({ covers }: { covers: Partial<Record<ResourceCategory, string>> }) {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-light tracking-wide text-[var(--foreground)] mb-8">Resources</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {RESOURCE_CATEGORIES.map((c) => (
            <Link key={c.value} href={`/resources/${c.slug}`} className="group block">
              <div className="relative aspect-video overflow-hidden bg-[var(--background)]">
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

export function ResourceList({ category, items }: { category: ResourceCategory; items: Resource[] }) {
  const { locale } = useLocale();
  const label = RESOURCE_CATEGORIES.find((c) => c.value === category)?.label ?? '';
  const slug = resourceSlug(category);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* 2차 네비 — 우측 정렬(Works와 동일) */}
        <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-lg">
          <Link href="/resources" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-wide">RESOURCES</Link>
          <span className="text-[var(--text-secondary)]">/</span>
          <span className="font-medium tracking-wide text-[var(--foreground)]">{label}</span>
        </div>
        <div className="mt-2 mb-8 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
          {RESOURCE_CATEGORIES.map((c, i) => (
            <span key={c.value} className="flex items-center gap-2">
              {i > 0 && <span className="text-[var(--border)]">/</span>}
              <Link href={`/resources/${c.slug}`}
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
            {items.map((r) => (
              <Link key={r.id} href={`/resources/${slug}/${r.id}`} className="group block">
                <div className="relative aspect-video overflow-hidden bg-[var(--background)]">
                  {(() => {
                    const cover = coverImage(r.thumbnail_url, r.content);
                    return cover ? (
                      <Image src={cover} alt={getLocalizedValue(locale, r.title, r.title_en)} fill sizes="(max-width:640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        {...(isCloud(cover) ? { loader: cloudinaryLoader } : {})} />
                    ) : <div className="absolute inset-0 bg-[var(--border)]/30" />;
                  })()}
                </div>
                <h3 className="mt-2 text-base text-[var(--foreground)]">{getLocalizedValue(locale, r.title, r.title_en)}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{(r.published_at || '').slice(0, 10)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export function ResourceDetail({ resource }: { resource: Resource }) {
  const { locale } = useLocale();
  const title = getLocalizedValue(locale, resource.title, resource.title_en);
  const slug = resourceSlug(resource.category);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <article className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <Link href={`/resources/${slug}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]">← {RESOURCE_CATEGORIES.find((c) => c.value === resource.category)?.label}</Link>
        <h1 className="mt-3 text-3xl font-light text-[var(--foreground)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{(resource.published_at || '').slice(0, 10)}</p>
        {/* 본문에 그림이 있으면 상단 대표이미지 생략, 없을 때만 fallback 표지 표시 */}
        {!firstImageFromHtml(resource.content) && (() => {
          const top = coverImage(resource.thumbnail_url, resource.content);
          return top ? (
            <div className="relative w-full aspect-video my-6 bg-[var(--background)]">
              <Image src={top} alt={title} fill sizes="100vw" className="object-contain"
                {...(isCloud(top) ? { loader: cloudinaryLoader } : {})} />
            </div>
          ) : null;
        })()}
        <LocalizedRichContent html={resource.content} en={resource.content_en} className="mt-6 text-[var(--foreground)]" />
      </article>
    </main>
  );
}
