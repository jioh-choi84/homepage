// 통계 순수 로직(테스트 대상). 부수효과/IO 없음.

export type StatsDimension = 'countries' | 'series' | 'paths' | 'sources';

// referrer host(정규화된 호스트명 또는 'direct'/'') → 출처 그룹
export function classifyReferrerSource(host: string): string {
  const h = (host || '').toLowerCase();
  if (!h || h === 'direct') return 'direct';
  if (/(^|\.)naver\.(com|me)$|naver\./.test(h)) return 'naver';
  if (/(^|\.)google\./.test(h)) return 'google';
  if (/(^|\.)daum\.net$|(^|\.)kakao\.com$/.test(h)) return 'daum';
  if (/(^|\.)instagram\.com$/.test(h)) return 'instagram';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return 'facebook';
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(h)) return 'youtube';
  if (/(^|\.)(twitter\.com|x\.com)$|^t\.co$/.test(h)) return 'x';
  return 'other';
}

// '/works/{genre}/{group}[/...]' → 'genre/group', 그 외 null
export function seriesKeyFromPath(path: string): string | null {
  const segs = (path || '').split('?')[0].split('/').filter(Boolean);
  if (segs.length >= 3 && segs[0] === 'works') {
    return `${segs[1]}/${segs[2]}`;
  }
  return null;
}

// KST(Asia/Seoul) 기준 hour(0~23), weekday(0=일~6=토)
export function kstHourWeekday(date: Date): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const wdStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(hourStr) % 24;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, weekday: wdMap[wdStr] ?? 0 };
}

const MAX_DWELL_MS = 30 * 60 * 1000;
// 체류시간(ms) 검증: 0 이하/30분 초과/비유한 → null
export function clampDwell(ms: number): number | null {
  if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_DWELL_MS) return null;
  return Math.round(ms);
}

type DailyEntry = {
  pageviews: number;
  visits: number;
  countries?: Record<string, number>;
  series?: Record<string, number>;
  paths?: Record<string, number>;
  sources?: Record<string, number>;
};

// daily 중 dateKeys 범위의 한 차원을 합산
export function sumDailyDimension(
  daily: Record<string, DailyEntry>,
  dimension: StatsDimension,
  dateKeys: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of dateKeys) {
    const dim = daily[day]?.[dimension];
    if (!dim) continue;
    for (const [k, v] of Object.entries(dim)) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

// daily 중 dateKeys 범위의 pageviews/visits 합산
export function sumDailyTotals(
  daily: Record<string, DailyEntry>,
  dateKeys: string[],
): { pageviews: number; visits: number } {
  let pageviews = 0;
  let visits = 0;
  for (const day of dateKeys) {
    pageviews += daily[day]?.pageviews ?? 0;
    visits += daily[day]?.visits ?? 0;
  }
  return { pageviews, visits };
}

// 2차원 문자열 배열 → CSV(엑셀 한글용 UTF-8 BOM 포함)
export function toCsv(rows: string[][]): string {
  const esc = (cell: string) => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
