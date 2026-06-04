'use client';

import Link from 'next/link';
import SidePanel from './SidePanel';
import LanguageSwitch from './LanguageSwitch';
import { useSidePanel } from '@/contexts/SidePanelContext';
import { useLocale } from '@/i18n';

export default function Header() {
  const { open } = useSidePanel();
  const { t } = useLocale();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--background)]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Hamburger Menu Button - Left */}
          <button
            onClick={open}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            aria-label={t.aria.openMenu}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Right side: Logo + Language Switch */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-2xl tracking-wider font-medium text-[var(--foreground)]"
              style={{ fontFamily: 'var(--font-noto-serif), serif' }}
            >
              {t.common.logo}
            </Link>
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Side Panel */}
      <SidePanel />
    </>
  );
}
