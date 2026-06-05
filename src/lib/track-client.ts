// 클라이언트 전용: 작품/전시 상세 조회 비콘. fire-and-forget.
export function trackView(input: {
  kind: 'artwork' | 'exhibition';
  id: string;
  series?: string | null;
  theme?: string | null;
}) {
  if (!input?.id || typeof navigator === 'undefined') return;
  try {
    const payload = JSON.stringify(input);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-view', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track-view', {
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
