'use client';

import { useState } from 'react';
import { StatsData } from '@/types/artwork';
import Button from '@/components/common/Button';

interface StatsPanelProps {
  stats: StatsData | null;
  loading: boolean;
  onRefresh: () => void;
}

// 최근 N일 날짜 배열('YYYY-MM-DD'), 오늘(KST) 기준 역순으로 생성
function recentDays(n: number): string[] {
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const out: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(fmt(d));
  }
  return out;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-medium text-gray-900 mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

// 키-값(내림차순) 비율 바 목록
function RankList({ title, data, emptyText }: { title: string; data: Record<string, number>; emptyText: string }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = entries.length ? entries[0][1] : 0;
  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map(([key, count]) => (
            <li key={key} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm text-gray-700 truncate" title={key}>{key}</span>
                <span className="text-sm text-gray-500 tabular-nums shrink-0">{count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-gray-400 rounded" style={{ width: max ? `${(count / max) * 100}%` : '0%' }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StatsPanel({ stats, loading, onRefresh }: StatsPanelProps) {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm('운영 통계를 모두 초기화하시겠습니까? 되돌릴 수 없습니다.')) return;
    setResetting(true);
    try {
      await fetch('/api/stats', { method: 'DELETE' });
      onRefresh();
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500">통계를 불러올 수 없습니다.</p>;
  }

  const days = recentDays(30);
  const daily = stats.daily || {};
  const maxDaily = Math.max(1, ...days.map((d) => daily[d]?.pageviews ?? 0));
  const today = days[days.length - 1];

  return (
    <div className="space-y-8">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard label="전체 페이지뷰" value={stats.totals?.pageviews ?? 0} />
        <SummaryCard label="전체 방문(고유)" value={stats.totals?.visits ?? 0} />
        <SummaryCard label="오늘 방문(고유)" value={daily[today]?.visits ?? 0} />
      </div>

      {/* 최근 30일 추이 */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">최근 30일 페이지뷰 추이</h3>
          <span className="text-xs text-gray-400">막대 위 숫자 = 일 페이지뷰</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex items-end gap-1 h-40 min-w-[640px]">
            {days.map((d) => {
              const pv = daily[d]?.pageviews ?? 0;
              const h = (pv / maxDaily) * 100;
              return (
                <div key={d} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] text-gray-500 mb-0.5 tabular-nums">{pv || ''}</span>
                  <div
                    className="w-full bg-gray-300 group-hover:bg-gray-500 rounded-t transition-colors"
                    style={{ height: `${h}%`, minHeight: pv ? '2px' : '0' }}
                    title={`${d}: ${pv} PV`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-2 min-w-[640px]">
            <span>{days[0]}</span>
            <span>{today}</span>
          </div>
        </div>
      </div>

      {/* 페이지별 인기 / 유입 경로 / 기기 / 브라우저 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList title="페이지별 인기 (경로)" data={stats.paths} emptyText="데이터 없음" />
        <RankList title="유입 경로 (referrer)" data={stats.referrers} emptyText="데이터 없음" />
        <RankList title="기기" data={stats.devices} emptyText="데이터 없음" />
        <RankList title="브라우저" data={stats.browsers} emptyText="데이터 없음" />
      </div>

      {/* 액션 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          {stats.updated_at ? `마지막 업데이트: ${new Date(stats.updated_at).toLocaleString('ko-KR')}` : '아직 수집된 데이터가 없습니다.'}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRefresh}>새로고침</Button>
          <Button variant="secondary" onClick={handleReset} loading={resetting}>초기화</Button>
        </div>
      </div>
    </div>
  );
}
