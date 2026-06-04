'use client';

import { Exhibition } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import LocalizedRichContent from '@/components/common/LocalizedRichContent';
import ExhibitionNav from './ExhibitionNav';

function fmtPeriod(ex: Exhibition): string {
  if (ex.start_date || ex.end_date) {
    const s = ex.start_date ? ex.start_date.slice(0, 10) : '';
    const e = ex.end_date ? ex.end_date.slice(0, 10) : '';
    if (s && e) return `${s} – ${e}`;
    return s || e;
  }
  return ex.year ? String(ex.year) : '';
}

// Special 전시 — 블로그 글처럼 본문을 항상 펼친(open) 상태로 표시. display_order 순 최상단.
export default function ExhibitionFeatured({ items }: { items: Exhibition[] }) {
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <ExhibitionNav active="special" />

        {items.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-16 text-center">등록된 주요 전시가 없습니다.</p>
        ) : (
          <div className="mt-10 space-y-16">
            {items.map((ex) => {
              const title = getLocalizedValue(locale, ex.title, ex.title_en);
              const venue = getLocalizedValue(locale, ex.venue, ex.venue_en);
              const place = getLocalizedValue(locale, ex.location, ex.location_en);
              const period = fmtPeriod(ex);
              return (
                <article key={ex.id}>
                  <h2 className="text-2xl md:text-3xl font-light text-[var(--foreground)] leading-tight">{title}</h2>
                  <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                    {[venue, place].filter(Boolean).join(', ')}{period ? ` · ${period}` : ''}
                  </p>
                  {ex.description && (
                    <LocalizedRichContent html={ex.description} en={ex.description_en} className="mt-5 text-[var(--foreground)]" />
                  )}
                  {ex.external_url && (
                    <a href={ex.external_url} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-4 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] underline">
                      {locale === 'en' ? 'Learn more →' : '자세히 보기 →'}
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
