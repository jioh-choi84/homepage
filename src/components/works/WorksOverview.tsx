'use client';

import Link from 'next/link';
import Image from 'next/image';
import { GENRE_OPTIONS, type ArtworkGenre } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

export default function WorksOverview({ covers }: { covers: Partial<Record<ArtworkGenre, string>> }) {
  // 장르명은 상단 메뉴(Paintings 등 영어 고정)와 통일 — 한/영 전환 없이 항상 영어
  const { t } = useLocale();
  const genreMenuLabel = (slug: string) => (t.nav as Record<string, string>)[slug] ?? slug;
  const isCloud = (u?: string) => !!u && u.includes('res.cloudinary.com');

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-3xl font-light tracking-wide text-[var(--foreground)] mb-8">{t.nav.works}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
          {GENRE_OPTIONS.map((g) => {
            const cover = covers[g.value];
            return (
              <Link key={g.value} href={`/works/${g.slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden bg-[var(--surface)]">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={genreMenuLabel(g.slug)}
                      fill
                      sizes="(max-width:640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      {...(isCloud(cover) ? { loader: cloudinaryLoader } : {})}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] text-sm">No works yet</div>
                  )}
                </div>
                <h2 className="mt-3 text-xl tracking-wide text-[var(--foreground)]">{genreMenuLabel(g.slug)}</h2>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
