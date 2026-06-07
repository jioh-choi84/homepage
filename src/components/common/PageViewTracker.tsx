'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 경로 변경마다 1회 페이지뷰 비콘 전송 + 경로 이탈 시 체류시간 비콘.
// /admin 경로는 추적하지 않는다. fire-and-forget.
const VISIT_KEY = 'cp_lastVisit';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function send(payload: object) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/pageview', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* 전송 실패 무시 */
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  // 현재 경로의 체류 측정용
  const currentPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(0);
  const dwellSent = useRef<boolean>(false);

  // 직전 경로의 체류시간 전송(중복 방지)
  const flushDwell = () => {
    if (!currentPath.current || dwellSent.current) return;
    if (currentPath.current.startsWith('/admin')) return;
    const ms = Date.now() - enteredAt.current;
    if (ms > 0 && ms <= 30 * 60 * 1000) {
      send({ type: 'dwell', path: currentPath.current, dwellMs: ms });
    }
    dwellSent.current = true;
  };

  // 페이지뷰 전송 + 체류 타이머 시작
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;

    // 경로 이동 시 직전 경로 체류 전송
    if (currentPath.current && currentPath.current !== pathname) {
      flushDwell();
    }
    currentPath.current = pathname;
    enteredAt.current = Date.now();
    dwellSent.current = false;

    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    let newVisit = false;
    try {
      const today = todayLocal();
      if (localStorage.getItem(VISIT_KEY) !== today) {
        newVisit = true;
        localStorage.setItem(VISIT_KEY, today);
      }
    } catch {
      /* localStorage 불가 */
    }

    send({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      newVisit,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 탭 숨김/이탈 시 체류 전송
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushDwell();
    };
    const onPageHide = () => flushDwell();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
