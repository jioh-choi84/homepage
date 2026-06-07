'use client';

import { useMemo, useState } from 'react';
import { StatsData, WorkFolder, Artwork, GENRE_OPTIONS } from '@/types/artwork';
import Button from '@/components/common/Button';
import { groupLabelBySlug } from '@/lib/works';
import { sumDailyDimension, sumDailyTotals, toCsv, type StatsDimension } from '@/lib/stats';

interface StatsPanelProps {
  stats: StatsData | null;
  loading: boolean;
  onRefresh: () => void;
  folders: WorkFolder[];
  artworks: Artwork[];
}

type RangeKey = '7' | '30' | '90' | 'all';

// 국가 코드 → 전체 국가명(한글). Intl로 모든 ISO 국가를 자동 변환(약자 대신 풀네임).
const REGION_NAMES = new Intl.DisplayNames(['ko'], { type: 'region' });
function countryName(code: string): string {
  if (!code || code === 'XX') return '미상';
  try { return REGION_NAMES.of(code) || code; } catch { return code; }
}
const SOURCE_NAMES: Record<string, string> = {
  naver: '네이버', google: '구글', daum: '다음', instagram: '인스타그램',
  facebook: '페이스북', youtube: '유튜브', x: 'X(트위터)', direct: '직접 유입', other: '기타',
};
// 주요 페이지 경로 → 한글명(정확 일치). '/'는 홈(랜딩)이며 admin은 애초에 집계되지 않음.
const PAGE_NAMES: Record<string, string> = {
  '/': '홈 (메인)', '/about': '소개(About)', '/cv': 'CV', '/contact': '연락처(Contact)',
  '/works': '작품(Works)', '/exhibition': '전시(Exhibition)', '/press': '언론(Press)', '/resources': '아카이브(Resources)',
};
// 오늘(KST) 기준 최근 n일 'YYYY-MM-DD' 배열(오래된→최신)
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

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '0초';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}분 ${rest}초` : `${m}분`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function RankList({
  title, data, emptyText, labelFn, onCsv,
}: {
  title: string;
  data: Record<string, number>;
  emptyText: string;
  labelFn?: (key: string) => string;
  onCsv?: () => void;
}) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = entries.length ? entries[0][1] : 0;
  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
        {onCsv && entries.length > 0 && (
          <button onClick={onCsv} className="text-xs text-gray-400 hover:text-gray-600">CSV</button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map(([key, count]) => {
            const label = labelFn ? labelFn(key) : key;
            return (
              <li key={key} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm text-gray-700 truncate" title={label}>{label}</span>
                  <span className="text-sm text-gray-500 tabular-nums shrink-0">{count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-gray-400 rounded" style={{ width: max ? `${(count / max) * 100}%` : '0%' }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function StatsPanel({ stats, loading, onRefresh, folders, artworks }: StatsPanelProps) {
  const [resetting, setResetting] = useState(false);
  const [range, setRange] = useState<RangeKey>('30');

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

  // '/works/{genreSlug}/{groupSlug}' → 한글 라벨 (작품에서 도출되는 모든 시리즈/주제 포함)
  const groupMap = useMemo(() => groupLabelBySlug(artworks || [], folders || []), [artworks, folders]);

  // 선택 기간의 날짜 키 집합
  const days = useMemo(() => {
    const daily = stats?.daily || {};
    if (range === 'all') return Object.keys(daily).sort();
    return recentDays(Number(range));
  }, [stats, range]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    );
  }
  if (!stats) return <p className="text-gray-500">통계를 불러올 수 없습니다.</p>;

  const daily = stats.daily || {};
  // 기간 합산
  const rangeTotals = sumDailyTotals(daily, days);
  const dim = (d: StatsDimension) => sumDailyDimension(daily, d, days);
  const countries = dim('countries');
  const series = dim('series');
  const paths = dim('paths');
  const sources = dim('sources');

  // 국내/해외
  const krCount = countries['KR'] ?? 0;
  const totalCountry = Object.values(countries).reduce((a, b) => a + b, 0);
  const overseasCount = totalCountry - krCount;
  const overseasPct = totalCountry ? Math.round((overseasCount / totalCountry) * 100) : 0;

  // 체류
  const avgDwellMs = stats.dwell?.samples ? stats.dwell.totalMs / stats.dwell.samples : 0;
  const pathDwellRank = Object.entries(stats.pathDwell || {})
    .filter(([, v]) => v.samples >= 3)
    .map(([k, v]) => [k, v.totalMs / v.samples] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 방문 추이(막대) — 선택 기간(최대 60개까지만 막대 표시)
  const trendDays = days.slice(-60);
  const maxDailyPv = Math.max(1, ...trendDays.map((d) => daily[d]?.pageviews ?? 0));

  const seriesLabelFn = (key: string) => groupMap[key] || key;
  const countryLabelFn = countryName;
  const sourceLabelFn = (k: string) => SOURCE_NAMES[k] || k;
  // 경로를 읽기 쉬운 한글로: /works/{genreSlug}/{groupSlug}[/sub] → 작품 › 장르 › 그룹
  const pathLabelFn = (path: string) => {
    const clean = (path || '').split('?')[0];
    if (PAGE_NAMES[clean]) return PAGE_NAMES[clean];
    const segs = clean.split('/').filter(Boolean);
    if (segs[0] !== 'works' || segs.length < 2) return path;
    const g = GENRE_OPTIONS.find((o) => o.slug === segs[1]);
    const parts = ['작품', g ? g.ko : segs[1]];
    if (segs[2]) parts.push(groupMap[`${segs[1]}/${segs[2]}`] || segs[2]);
    if (segs[3]) parts.push(segs[3]);
    return parts.join(' › ');
  };

  // 일별 전체 CSV(현재 기간)
  const exportDailyCsv = () => {
    const rows: string[][] = [['날짜', '페이지뷰', '방문(고유)']];
    for (const d of days) rows.push([d, String(daily[d]?.pageviews ?? 0), String(daily[d]?.visits ?? 0)]);
    downloadCsv(`stats-daily-${range}.csv`, rows);
  };
  const rankCsv = (name: string, data: Record<string, number>, labelFn?: (k: string) => string) => () => {
    const rows: string[][] = [['항목', '횟수']];
    Object.entries(data).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => rows.push([labelFn ? labelFn(k) : k, String(v)]));
    downloadCsv(`stats-${name}-${range}.csv`, rows);
  };

  return (
    <div className="space-y-8">
      {/* 기간 필터 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(['7', '30', '90', 'all'] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded border ${range === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {r === 'all' ? '전체' : `최근 ${r}일`}
            </button>
          ))}
        </div>
        <button onClick={exportDailyCsv} className="text-xs text-gray-500 hover:text-gray-800 underline">일별 전체 CSV 내보내기</button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label={`기간 페이지뷰`} value={rangeTotals.pageviews.toLocaleString()} />
        <SummaryCard label={`기간 방문(고유)`} value={rangeTotals.visits.toLocaleString()} />
        <SummaryCard label={`해외 비율`} value={`${overseasPct}%`} />
        <SummaryCard label={`평균 체류시간`} value={fmtDuration(avgDwellMs)} />
      </div>

      {/* 방문 추이 */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">페이지뷰 추이 ({range === 'all' ? '전체' : `최근 ${range}일`})</h3>
          <span className="text-xs text-gray-400">막대 위 숫자 = 일 페이지뷰</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex items-end gap-1 h-40 min-w-[640px]">
            {trendDays.map((d) => {
              const pv = daily[d]?.pageviews ?? 0;
              return (
                <div key={d} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] text-gray-500 mb-0.5 tabular-nums">{pv || ''}</span>
                  <div
                    className="w-full bg-gray-300 group-hover:bg-gray-500 rounded-t transition-colors"
                    style={{ height: `${(pv / maxDailyPv) * 100}%`, minHeight: pv ? '2px' : '0' }}
                    title={`${d}: ${pv} PV`}
                  />
                </div>
              );
            })}
          </div>
          {trendDays.length > 0 && (
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 min-w-[640px]">
              <span>{trendDays[0]}</span>
              <span>{trendDays[trendDays.length - 1]}</span>
            </div>
          )}
        </div>
      </div>

      {/* 국가 + 시리즈/주제 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="bg-white rounded border border-gray-200 p-4 mb-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700">국내(KR) {totalCountry ? Math.round((krCount / totalCountry) * 100) : 0}%</span>
              <span className="text-gray-700">해외 {overseasPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded overflow-hidden flex">
              <div className="h-full bg-gray-700" style={{ width: `${totalCountry ? (krCount / totalCountry) * 100 : 0}%` }} />
              <div className="h-full bg-[#0e7490]" style={{ width: `${overseasPct}%` }} />
            </div>
          </div>
          <RankList title="국가별 접속" data={countries} emptyText="데이터 없음" labelFn={countryLabelFn} onCsv={rankCsv('countries', countries, countryLabelFn)} />
        </div>
        <RankList title="시리즈/주제별 인기 ⭐" data={series} emptyText="데이터 없음" labelFn={seriesLabelFn} onCsv={rankCsv('series', series, seriesLabelFn)} />
      </div>

      {/* 페이지 + 유입출처 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList title="페이지별 인기 (경로)" data={paths} emptyText="데이터 없음" labelFn={pathLabelFn} onCsv={rankCsv('paths', paths, pathLabelFn)} />
        <RankList title="유입 출처 (검색/SNS)" data={sources} emptyText="데이터 없음" labelFn={sourceLabelFn} onCsv={rankCsv('sources', sources, sourceLabelFn)} />
      </div>

      {/* 기기 / 브라우저 (전체 누적) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankList title="기기 (전체)" data={stats.devices} emptyText="데이터 없음" />
        <RankList title="브라우저 (전체)" data={stats.browsers} emptyText="데이터 없음" />
      </div>

      {/* 페이지별 체류시간 */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200"><h3 className="font-medium text-gray-900 text-sm">페이지별 평균 체류시간 (전체, 3회+)</h3></div>
        {pathDwellRank.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">데이터 없음</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pathDwellRank.map(([path, avg]) => (
              <li key={path} className="px-4 py-2 flex justify-between text-sm">
                <span className="text-gray-700 truncate" title={path}>{pathLabelFn(path)}</span>
                <span className="text-gray-500 tabular-nums shrink-0">{fmtDuration(avg)}</span>
              </li>
            ))}
          </ul>
        )}
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
