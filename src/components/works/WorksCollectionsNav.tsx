'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n';
import type { WorksGroupNav } from '@/lib/works';

interface Props {
  genreSlug: string;
  series: WorksGroupNav[];   // kind==='series' (children=지역)
  themes: WorksGroupNav[];   // kind==='theme'
  currentSlug: string | null;
  currentSub: string | null;
}

const PANEL =
  'absolute z-30 rounded-md border border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md shadow-lg transition-all duration-200 ease-out';

export default function WorksCollectionsNav({ genreSlug, series, themes, currentSlug, currentSub }: Props) {
  const { locale } = useLocale();
  const labelOf = (n: { label: string; label_en: string }) => (locale === 'en' ? n.label_en : n.label);
  const [open, setOpen] = useState<null | 'series' | 'theme'>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (series.length === 0 && themes.length === 0) return null;

  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(null), 160); };

  const seriesActive = series.some((s) => s.slug === currentSlug);
  const themeActive = themes.some((t) => t.slug === currentSlug);

  const L = {
    series: locale === 'en' ? 'Series' : '시리즈',
    theme: locale === 'en' ? 'Themes' : '주제',
    all: locale === 'en' ? 'All' : '전체',
  };

  const Chevron = ({ on }: { on: boolean }) => (
    <svg className={`w-3 h-3 transition-transform duration-200 ${on ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const btnClass = (active: boolean) =>
    `inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${
      active
        ? 'border-[var(--foreground)] text-[var(--foreground)]'
        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]'
    }`;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-sm">
      {/* 시리즈 */}
      {series.length > 0 && (
        <div className="relative" onMouseEnter={() => { cancelClose(); setOpen('series'); }} onMouseLeave={scheduleClose}>
          <button type="button" aria-expanded={open === 'series'} onClick={() => setOpen(open === 'series' ? null : 'series')} className={btnClass(seriesActive || open === 'series')}>
            {L.series}<Chevron on={open === 'series'} />
          </button>
          <div className={`${PANEL} right-0 top-full mt-2 min-w-[180px] origin-top-right ${open === 'series' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible pointer-events-none'}`}>
            <ul className="py-1">
              {series.map((s) => (
                <li key={s.slug} className="relative group/item">
                  <Link href={`/works/${genreSlug}/${s.slug}`} className={`flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface)] ${s.slug === currentSlug ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>
                    {s.children?.length ? <span className="text-[var(--text-secondary)] shrink-0">‹</span> : null}
                    <span className="truncate">{labelOf(s)}</span>
                  </Link>
                  {/* 지역 플라이아웃 (옆으로 펼침) */}
                  {s.children?.length ? (
                    <div className={`${PANEL} right-full top-0 mr-1 min-w-[150px] origin-top-right opacity-0 translate-x-1 invisible pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:visible group-hover/item:pointer-events-auto`}>
                      <ul className="py-1">
                        <li>
                          <Link href={`/works/${genreSlug}/${s.slug}`} className={`block px-3 py-1.5 hover:bg-[var(--surface)] ${s.slug === currentSlug && !currentSub ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>{L.all}</Link>
                        </li>
                        {s.children.map((r) => (
                          <li key={r.slug}>
                            <Link href={`/works/${genreSlug}/${s.slug}/${r.slug}`} className={`block px-3 py-1.5 hover:bg-[var(--surface)] ${s.slug === currentSlug && r.slug === currentSub ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>{labelOf(r)}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 주제 */}
      {themes.length > 0 && (
        <div className="relative" onMouseEnter={() => { cancelClose(); setOpen('theme'); }} onMouseLeave={scheduleClose}>
          <button type="button" aria-expanded={open === 'theme'} onClick={() => setOpen(open === 'theme' ? null : 'theme')} className={btnClass(themeActive || open === 'theme')}>
            {L.theme}<Chevron on={open === 'theme'} />
          </button>
          <div className={`${PANEL} right-0 top-full mt-2 min-w-[160px] origin-top-right ${open === 'theme' ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible pointer-events-none'}`}>
            <ul className="py-1">
              {themes.map((t) => (
                <li key={t.slug}>
                  <Link href={`/works/${genreSlug}/${t.slug}`} className={`block px-3 py-1.5 hover:bg-[var(--surface)] ${t.slug === currentSlug ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>{labelOf(t)}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
