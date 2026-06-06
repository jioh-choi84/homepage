'use client';

import Link from 'next/link';
import Image from 'next/image';
import SidePanel from './SidePanel';
import LanguageSwitch from './LanguageSwitch';
import { useSidePanel } from '@/contexts/SidePanelContext';
import { useLocale } from '@/i18n';
import { buildMenu, NAV_COLORS } from '@/lib/menu';

export default function TopNav() {
  const { open } = useSidePanel();
  const { t } = useLocale();
  const menu = buildMenu(t.nav as unknown as Record<string, string>);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--background)]/90 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-[84px] flex items-center justify-between gap-2 md:gap-4">
          {/* Brand (좌측) — 손글씨 서명(배경 투명 PNG).
              마우스 오버 시 평소(청록·보라) ↔ 호버(초록·보라) 색상 크로스페이드. */}
          <Link
            href="/"
            aria-label={t.common.logo}
            className="group relative inline-block shrink-0 md:ml-[38px]"
          >
            {/* 평소 로고 */}
            <Image
              src="/jioh-choi-logo.png"
              alt={t.common.logo}
              width={3545}
              height={850}
              priority
              className="h-9 md:h-[52px] w-auto opacity-90 transition-opacity duration-300 ease-out group-hover:opacity-0"
            />
            {/* 호버 로고 (겹쳐서 색상만 전환) */}
            <Image
              src="/jioh-choi-logo-hover.png"
              alt=""
              aria-hidden
              width={3545}
              height={850}
              className="absolute inset-0 h-9 md:h-[52px] w-auto opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
            />
          </Link>

          {/* 우측 정렬: 메뉴 + 언어 + (모바일)햄버거 */}
          <div className="flex items-center gap-1 md:gap-4 shrink-0">
            <nav className="hidden md:flex items-center gap-1">
              {menu.map((item) => {
                const color = NAV_COLORS[item.href];
                const isWorks = item.href === '/works';
                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      style={{ color }}
                      className={`inline-flex items-center px-3 py-2 text-sm transition-opacity hover:opacity-70 ${isWorks ? 'font-semibold' : 'font-medium'}`}
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <div
                        className="absolute right-0 top-full min-w-[170px] pt-1
                                   opacity-0 invisible -translate-y-1
                                   group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                                   transition-all duration-200 ease-out z-50"
                      >
                        <ul className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg py-1">
                          {item.children.map((sub) => (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                style={{ color }}
                                className="block px-4 py-2 text-sm hover:bg-[var(--background)] hover:opacity-70 transition-all whitespace-nowrap"
                              >
                                {sub.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <LanguageSwitch />
            <button
              onClick={open}
              className="md:hidden p-1 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
              aria-label={t.aria.openMenu}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <SidePanel />
    </>
  );
}
