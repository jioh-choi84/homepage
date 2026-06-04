'use client';

import Link from 'next/link';

const TABS = [
  { slug: 'special', label: 'Featured' },
  { slug: 'current', label: 'Current' },
  { slug: 'past', label: 'Past' },
] as const;

// Exhibition 2차 네비 (Works/Resources와 동일한 우측 정렬 스타일)
export default function ExhibitionNav({ active }: { active: 'special' | 'current' | 'past' }) {
  const cur = TABS.find((t) => t.slug === active);
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-lg">
        <Link href="/exhibition" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-wide">EXHIBITIONS</Link>
        <span className="text-[var(--text-secondary)]">/</span>
        <span className="font-medium tracking-wide text-[var(--foreground)]">{cur?.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-[var(--text-secondary)]">
        {TABS.map((s, i) => (
          <span key={s.slug} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--border)]">/</span>}
            <Link href={`/exhibition/${s.slug}`}
              className={`hover:text-[var(--foreground)] transition-colors ${s.slug === active ? 'text-[var(--foreground)] font-medium' : ''}`}>
              {s.label}
            </Link>
          </span>
        ))}
      </div>
    </>
  );
}
