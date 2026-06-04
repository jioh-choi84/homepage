'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Notice, NoticePosition } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

const POS_CLASS: Record<NoticePosition, string> = {
  'center': 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-left': 'left-4 top-20',
  'top-right': 'right-4 top-20',
  'bottom-left': 'left-4 bottom-4',
  'bottom-right': 'right-4 bottom-4',
};

const isCloud = (u?: string | null) => !!u && u.includes('res.cloudinary.com');

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function inRange(n: Notice, t: string): boolean {
  if (n.start_date && t < n.start_date.slice(0, 10)) return false;
  if (n.end_date && t > n.end_date.slice(0, 10)) return false;
  return true;
}
const hideKey = (id: string) => `chuni_notice_hide_${id}`;

// 홈(/)에서만 뜨는 팝업 공지 — 최대 2개, 각자의 위치에 떠 있는 카드
export default function NoticePopup() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [closed, setClosed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (pathname !== '/') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notices');
        if (!res.ok) return;
        const all: Notice[] = await res.json();
        const t = todayStr();
        const visible = all
          .filter((n) => n.active && inRange(n, t))
          .filter((n) => {
            try {
              const raw = localStorage.getItem(hideKey(n.id));
              if (!raw) return true;
              const { sig, date } = JSON.parse(raw);
              return !(date === t && sig === n.updated_at); // 오늘+같은 버전이면 숨김
            } catch { return true; }
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .slice(0, 2);
        if (!cancelled) setNotices(visible);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  const close = useCallback((id: string) => setClosed((prev) => new Set(prev).add(id)), []);
  const hideToday = useCallback((n: Notice) => {
    try { localStorage.setItem(hideKey(n.id), JSON.stringify({ sig: n.updated_at, date: todayStr() })); } catch { /* ignore */ }
    close(n.id);
  }, [close]);

  if (pathname !== '/') return null;
  const shown = notices.filter((n) => !closed.has(n.id));
  if (shown.length === 0) return null;

  return (
    <>
      {shown.map((n) => {
        const title = getLocalizedValue(locale, n.title, n.title_en);
        const body = getLocalizedValue(locale, n.body, n.body_en);
        const linkLabel = getLocalizedValue(locale, n.link_label, n.link_label_en) || (locale === 'en' ? 'View' : '바로가기');
        return (
          <div key={n.id} className={`fixed z-[70] w-[88vw] max-w-[340px] ${POS_CLASS[n.position] || POS_CLASS.center}`}>
            <div className="animate-notice-pop bg-[var(--surface)] rounded-2xl overflow-hidden border border-black/5 ring-1 ring-black/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]">
              {n.image_url && (
                <div className="relative w-full aspect-[4/3] bg-[var(--border)]/30">
                  <Image src={n.image_url} alt={title} fill sizes="340px" className="object-cover"
                    {...(isCloud(n.image_url) ? { loader: cloudinaryLoader } : {})} />
                </div>
              )}
              <div className="p-4">
                {title && <h3 className="text-base font-medium text-[var(--foreground)] mb-1">{title}</h3>}
                {body && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{body}</p>}
                {n.link_url && (
                  <a href={n.link_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm font-medium text-[var(--foreground)] underline">
                    {linkLabel} →
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-xs">
                <button onClick={() => hideToday(n)} className="text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                  {locale === 'en' ? "Don't show today" : '오늘 하루 보지 않기'}
                </button>
                <button onClick={() => close(n.id)} className="text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                  {locale === 'en' ? 'Close' : '닫기'} ✕
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
