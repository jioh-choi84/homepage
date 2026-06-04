'use client';

import { useLocale } from '@/i18n';

export default function LanguageSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => setLocale('ko')}
        className={`px-2 py-1 transition-colors ${
          locale === 'ko'
            ? 'text-[var(--foreground)] font-medium'
            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
        }`}
      >
        KR
      </button>
      <span className="text-[var(--text-secondary)]">/</span>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 transition-colors ${
          locale === 'en'
            ? 'text-[var(--foreground)] font-medium'
            : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
