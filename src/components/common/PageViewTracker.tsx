'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 경로 변경마다 1회 페이지뷰 비콘 전송. /admin 경로는 추적하지 않는다.
// fire-and-forget(sendBeacon) — 방문자 경험에 영향 없음.
const VISIT_KEY = 'cp_lastVisit';

function todayLocal(): string {
  // 클라이언트 로컬 기준 'YYYY-MM-DD'
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (lastSent.current === pathname) return; // 동일 경로 중복 방지
    lastSent.current = pathname;

    // 하루 첫 방문 여부(고유 방문자 근사)
    let newVisit = false;
    try {
      const today = todayLocal();
      if (localStorage.getItem(VISIT_KEY) !== today) {
        newVisit = true;
        localStorage.setItem(VISIT_KEY, today);
      }
    } catch {
      // localStorage 불가 환경 — newVisit=false로 진행
    }

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      newVisit,
    });

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
      // 전송 실패 무시
    }
  }, [pathname]);

  return null;
}
