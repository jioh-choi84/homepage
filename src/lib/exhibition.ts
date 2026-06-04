import type { Exhibition, ExhibitionStatus } from '@/types/artwork';

// 상태 분류: special 우선, 그 외 end_date 기준으로 current/past 자동 판정.
// end_date가 없으면 current(진행/상시)로 간주. (기간이 지나면 자동 past)
export function classifyExhibition(ex: Exhibition, now: Date = new Date()): ExhibitionStatus {
  if (ex.is_special) return 'special';
  if (ex.end_date) {
    const end = new Date(ex.end_date);
    if (!isNaN(end.getTime()) && end.getTime() < now.getTime()) return 'past';
  }
  return 'current';
}

function byRecent(a: Exhibition, b: Exhibition): number {
  const ad = a.end_date || a.start_date || `${a.year}-12-31`;
  const bd = b.end_date || b.start_date || `${b.year}-12-31`;
  return bd.localeCompare(ad); // 최신 먼저
}

export function getSpecial(list: Exhibition[]): Exhibition[] {
  return list
    .filter((e) => e.is_special && !e.hidden)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || byRecent(a, b));
}

export function getByStatus(list: Exhibition[], status: 'current' | 'past', now: Date = new Date()): Exhibition[] {
  return list
    .filter((e) => !e.hidden && !e.is_special && classifyExhibition(e, now) === status)
    .sort(byRecent);
}
