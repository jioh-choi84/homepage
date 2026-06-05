'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 경로 변경마다 1회 페이지뷰 비콘 전송 + 체류시간(active-time 근사) 측정.
// /admin 경로는 추적하지 않는다. fire-and-forget(sendBeacon).
const VISIT_KEY = 'cp_lastVisit';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sendBeacon(payload: string) {
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/pageview', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // 무시
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);
  // 현재 경로의 체류 측정 상태(보이는 동안만 누적)
  const dwell = useRef<{ path: string; activeStart: number; acc: number } | null>(null);

  // 이전 경로의 체류시간을 dwellOnly 비콘으로 전송
  const flushDwell = () => {
    const dw = dwell.current;
    if (!dw) return;
    let total = dw.acc;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      total += Date.now() - dw.activeStart;
    }
    dwell.current = null;
    if (total < 1000) return; // 1초 미만은 무시(오탐 방지)
    sendBeacon(JSON.stringify({ path: dw.path, dwellMs: total, dwellOnly: true }));
  };

  // 경로 변경 → 이전 체류 flush + 페이지뷰 비콘 + 새 체류 시작
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (lastSent.current === pathname) return;
    flushDwell();
    lastSent.current = pathname;

    let newVisit = false;
    try {
      const today = todayLocal();
      if (localStorage.getItem(VISIT_KEY) !== today) {
        newVisit = true;
        localStorage.setItem(VISIT_KEY, today);
      }
    } catch {
      // localStorage 불가 — newVisit=false
    }

    sendBeacon(JSON.stringify({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      newVisit,
    }));

    dwell.current = { path: pathname, activeStart: Date.now(), acc: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 탭 가시성 변화 누적 + 페이지 이탈 시 flush
  useEffect(() => {
    const onVis = () => {
      const dw = dwell.current;
      if (!dw) return;
      if (document.visibilityState === 'hidden') {
        dw.acc += Date.now() - dw.activeStart;
      } else {
        dw.activeStart = Date.now();
      }
    };
    const onHide = () => flushDwell();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
