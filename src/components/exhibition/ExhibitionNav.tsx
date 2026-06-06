'use client';

import Link from 'next/link';
import { useLocale } from '@/i18n';

const SLUGS = ['special', 'current', 'past'] as const;

// Exhibition 2차 네비 (Works/Resources와 동일한 우측 정렬 스타일)
export default function ExhibitionNav({ active }: { active: 'special' | 'current' | 'past' }) {
  const { t } = useLocale();
  const label = (slug: 'special' | 'current' | 'past') =>
    slug === 'special' ? t.nav.special : slug === 'current' ? t.nav.current : t.nav.past;
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-lg">
        <Link href="/exhibition" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-wide">{t.nav.exhibitions}</Link>
        <span className="text-[var(--text-secondary)]">/</span>
        <span className="font-medium tracking-wide text-[var(--foreground)]">{label(active)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
        {SLUGS.map((slug, i) => (
          <span key={slug} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--border)]">/</span>}
            <Link href={`/exhibition/${slug}`}
              className={`hover:text-[var(--foreground)] transition-colors ${slug === active ? 'text-[var(--foreground)] font-medium' : ''}`}>
              {label(slug)}
            </Link>
          </span>
        ))}
      </div>
    </>
  );
}
