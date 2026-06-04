'use client';

import { Fragment, useEffect, useRef, useCallback, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidePanel } from '@/contexts/SidePanelContext';
import { useLocale } from '@/i18n';
import { buildMenu } from '@/lib/menu';

export default function SidePanel() {
  const pathname = usePathname();
  const { isOpen, open, close } = useSidePanel();
  const { t } = useLocale();
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const startX = e.touches[0].clientX;
    // 패널 닫힘: 좌측 30px 영역에서만 추적 (엣지 스와이프 열기)
    // 패널 열림: 어디서든 추적 (스와이프 닫기)
    if (!isOpen && startX > 30) return;
    swipeRef.current = { startX, startY: e.touches[0].clientY };
  }, [isOpen]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!swipeRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = touch.clientY - swipeRef.current.startY;
    swipeRef.current = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (!isOpen && deltaX > 0) {
      open();
    } else if (isOpen && deltaX < 0) {
      close();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const menu = buildMenu(t.nav as unknown as Record<string, string>);

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={close} className="relative z-50">
          {/* Overlay - clicking this closes the panel */}
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-black/50 cursor-pointer"
              aria-hidden="true"
              onClick={close}
            />
          </TransitionChild>

          {/* Panel */}
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-out duration-300"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel
              className="fixed left-0 top-0 h-full w-56 sm:w-72 shadow-xl"
              style={{
                background: 'linear-gradient(to right, #141414, #1f1f1f)',
              }}
            >
              {/* Close button */}
              <div className="flex justify-end p-4 sm:p-6">
                <button
                  onClick={close}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label={t.aria.closeMenu}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Navigation - 하위 메뉴는 탭하면 펼쳐짐 (계단식 들여쓰기) */}
              <nav className="px-4 sm:px-6 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <ul className="space-y-1">
                  {menu.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
                    if (!item.children) {
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            className={`block py-3 text-lg tracking-wide transition-colors ${
                              active ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    }
                    const isOpenItem = expanded === item.href;
                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpenItem ? null : item.href)}
                          className={`w-full flex items-center justify-between py-3 text-lg tracking-wide transition-colors ${
                            active ? 'text-white font-medium' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <span>{item.label}</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isOpenItem ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {/* grid-rows 트릭으로 높이 애니메이션 + 한 글자 들여쓰기 */}
                        <div
                          className={`grid transition-all duration-300 ease-out ${
                            isOpenItem ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <ul className="overflow-hidden pl-[1ch]">
                            {item.children.map((sub) => (
                              <li key={sub.href}>
                                <Link
                                  href={sub.href}
                                  onClick={close}
                                  className={`block py-2 text-base tracking-wide transition-colors ${
                                    pathname === sub.href ? 'text-white' : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 tracking-wide">
                  {t.common.logo}
                </p>
              </div>

              {/* Handle on right edge - vertical grip bar when open */}
              <button
                onClick={close}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full rounded-r-md px-1.5 py-6 hover:brightness-110 transition-all shadow-md group"
                style={{
                  background: 'linear-gradient(to right, #1f1f1f, #2a2a2a)',
                }}
                aria-label="메뉴 닫기"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-300 transition-colors" />
                  <div className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-300 transition-colors" />
                  <div className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-300 transition-colors" />
                </div>
              </button>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}
