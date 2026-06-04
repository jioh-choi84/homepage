'use client';

import { useState } from 'react';
import { Exhibition, EXHIBITION_TYPE_OPTIONS } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import LocalizedRichContent from '@/components/common/LocalizedRichContent';
import ExhibitionNav from './ExhibitionNav';

const SOLO_PER_PAGE = 5;

function fmtPeriod(ex: Exhibition): string {
  if (ex.start_date || ex.end_date) {
    const s = ex.start_date ? ex.start_date.slice(0, 10) : '';
    const e = ex.end_date ? ex.end_date.slice(0, 10) : '';
    if (s && e) return `${s} – ${e}`;
    return s || e;
  }
  return ex.year ? String(ex.year) : '';
}

function typeLabel(ex: Exhibition, locale: 'ko' | 'en'): string {
  const opt = EXHIBITION_TYPE_OPTIONS.find((t) => t.value === ex.type);
  if (!opt) return '';
  return locale === 'en' ? opt.en : opt.ko;
}

// Current / Past — 제목 목록, 클릭하면 본문을 펼쳐 보여줌(아코디언)
export default function ExhibitionList({ status, items }: { status: 'current' | 'past'; items: Exhibition[] }) {
  const { locale } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const [soloPage, setSoloPage] = useState(0);
  const [groupPage, setGroupPage] = useState(0);

  // 아코디언 항목 1개 렌더 (제목 + 갤러리·지역·기간·유형 + 펼침 본문)
  const renderItem = (ex: Exhibition) => {
    const title = getLocalizedValue(locale, ex.title, ex.title_en);
    const venue = getLocalizedValue(locale, ex.venue, ex.venue_en);
    const place = getLocalizedValue(locale, ex.location, ex.location_en);
    const period = fmtPeriod(ex);
    const tLabel = typeLabel(ex, locale);
    const isOpen = openId === ex.id;
    const hasBody = !!ex.description;
    return (
      <li key={ex.id} className="py-4">
        <button
          type="button"
          onClick={() => setOpenId(isOpen ? null : ex.id)}
          className="w-full text-left group flex items-start justify-between gap-3"
          aria-expanded={isOpen}
        >
          <span>
            <span className="block text-lg text-[var(--foreground)] group-hover:opacity-70 transition-opacity">{title}</span>
            <span className="block text-sm text-[var(--text-secondary)] mt-0.5">
              {[venue, place].filter(Boolean).join(', ')}
              {period && <span className="text-[var(--text-secondary)]/70"> · {period}</span>}
              {tLabel && <span className="text-[var(--text-secondary)]/70"> · {tLabel}</span>}
            </span>
          </span>
          {hasBody && (
            <span className={`mt-1 shrink-0 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden>
              ⌄
            </span>
          )}
        </button>

        {isOpen && hasBody && (
          <div className="mt-4">
            {ex.description && (
              <LocalizedRichContent html={ex.description} className="text-[var(--foreground)]" />
            )}
            {ex.external_url && (
              <a href={ex.external_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] underline">
                {locale === 'en' ? 'Learn more →' : '자세히 보기 →'}
              </a>
            )}
          </div>
        )}
      </li>
    );
  };

  const sectionHead = (label: string) => (
    <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mt-10 mb-1">{label}</h2>
  );

  const pager = (pageCount: number, page: number, setPage: (n: number) => void) =>
    pageCount > 1 && (
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
          className="px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] disabled:opacity-40">←</button>
        {Array.from({ length: pageCount }, (_, i) => (
          <button key={i} type="button" onClick={() => setPage(i)}
            className={`w-7 h-7 rounded ${i === page ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>{i + 1}</button>
        ))}
        <button type="button" onClick={() => setPage(Math.min(pageCount - 1, page + 1))} disabled={page === pageCount - 1}
          className="px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] disabled:opacity-40">→</button>
      </div>
    );

  // 5개씩 페이지네이션되는 섹션
  const paginatedSection = (label: string, list: Exhibition[], pageState: number, setPage: (n: number) => void) => {
    if (list.length === 0) return null;
    const pageCount = Math.max(1, Math.ceil(list.length / SOLO_PER_PAGE));
    const page = Math.min(pageState, pageCount - 1);
    const paged = list.slice(page * SOLO_PER_PAGE, page * SOLO_PER_PAGE + SOLO_PER_PAGE);
    return (
      <section>
        {sectionHead(label)}
        <ul className="divide-y divide-[var(--border)]">{paged.map(renderItem)}</ul>
        {pager(pageCount, page, setPage)}
      </section>
    );
  };

  // Past: 유형별 정렬 — 개인전(상단, 5개씩) → 기타 유형 → 그룹전(하단, 5개씩)
  const renderPast = () => {
    const solo = items.filter((e) => e.type === 'solo');
    const group = items.filter((e) => e.type === 'group');
    const others = items.filter((e) => e.type !== 'solo' && e.type !== 'group');

    return (
      <>
        {paginatedSection(locale === 'en' ? 'Solo Exhibitions' : '개인전', solo, soloPage, setSoloPage)}

        {others.length > 0 && (
          <section>
            {sectionHead(locale === 'en' ? 'Other' : '기타')}
            <ul className="divide-y divide-[var(--border)]">{others.map(renderItem)}</ul>
          </section>
        )}

        {paginatedSection(locale === 'en' ? 'Group Exhibitions' : '그룹전', group, groupPage, setGroupPage)}
      </>
    );
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <ExhibitionNav active={status} />

        {items.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-16 text-center">전시가 없습니다.</p>
        ) : status === 'past' ? (
          <div className="mt-2">{renderPast()}</div>
        ) : (
          <ul className="mt-8 divide-y divide-[var(--border)]">{items.map(renderItem)}</ul>
        )}
      </div>
    </main>
  );
}
