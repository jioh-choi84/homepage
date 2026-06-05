'use client';

import { useState, useMemo } from 'react';
import { StatsData } from '@/types/artwork';
import Button from '@/components/common/Button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface NamedItem { id: string; title?: string | null; title_en?: string | null }

interface StatsPanelProps {
  stats: StatsData | null;
  loading: boolean;
  onRefresh: () => void;
  artworks?: NamedItem[];
  exhibitions?: NamedItem[];
}

const PERIODS = [
  { key: '7', label: '7일', days: 7 },
  { key: '30', label: '30일', days: 30 },
  { key: '90', label: '90일', days: 90 },
  { key: 'all', label: '전체', days: 0 },
];

const BAR = '#6366f1';
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

function kstDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}
function periodRange(days: number): { from?: string; to?: string } {
  if (!days) return {};
  const to = kstDay(new Date());
  const f = new Date();
  f.setDate(f.getDate() - (days - 1));
  return { from: kstDay(f), to };
}
function fmtDwell(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  return `${m}분 ${s % 60}초`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function aggregate(daily: Record<string, Any>, from?: string, to?: string): Any {
  const dims = ['hours', 'countries', 'referrers', 'search', 'devices', 'browsers', 'paths', 'artworks', 'exhibitions', 'series', 'themes'];
  const dates = Object.keys(daily || {}).filter((dt) => (!from || dt >= from) && (!to || dt <= to)).sort();
  const agg: Any = { pageviews: 0, visits: 0, dwellSum: 0, dwellCount: 0, trend: [] };
  dims.forEach((d) => (agg[d] = {}));
  for (const dt of dates) {
    const day = daily[dt] || {};
    agg.pageviews += day.pageviews || 0;
    agg.visits += day.visits || 0;
    agg.dwellSum += day.dwellSum || 0;
    agg.dwellCount += day.dwellCount || 0;
    for (const dim of dims) {
      const src = day[dim] || {};
      for (const k in src) agg[dim][k] = (agg[dim][k] || 0) + src[k];
    }
    agg.trend.push({ date: dt.slice(5), pageviews: day.pageviews || 0, visits: day.visits || 0 });
  }
  agg.avgDwellMs = agg.dwellCount ? Math.round(agg.dwellSum / agg.dwellCount) : 0;
  return agg;
}

function topEntries(obj: Record<string, number>, n: number, nameMap?: Map<string, string>) {
  return Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ name: nameMap?.get(k) || k, value: v }));
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-medium text-gray-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

function HBar({ data, empty }: { data: { name: string; value: number }[]; empty: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  const h = Math.max(120, data.length * 32);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill={BAR} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function StatsPanel({ stats, loading, onRefresh, artworks = [], exhibitions = [] }: StatsPanelProps) {
  const [resetting, setResetting] = useState(false);
  const [period, setPeriod] = useState('30');

  const artMap = useMemo(() => new Map(artworks.map((a) => [a.id, (a.title || a.id) as string])), [artworks]);
  const exMap = useMemo(() => new Map(exhibitions.map((e) => [e.id, (e.title || e.id) as string])), [exhibitions]);

  const range = useMemo(() => periodRange(PERIODS.find((p) => p.key === period)?.days ?? 0), [period]);
  const agg = useMemo(() => aggregate(stats?.daily || {}, range.from, range.to), [stats, range]);

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

  const exportCsv = () => {
    const qs = new URLSearchParams();
    if (range.from) qs.set('from', range.from);
    if (range.to) qs.set('to', range.to);
    window.location.href = `/api/stats/export?${qs.toString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />)}
      </div>
    );
  }
  if (!stats) return <p className="text-gray-500">통계를 불러올 수 없습니다.</p>;

  // 국가: 국내(KR)/해외/미상(ZZ)
  const countries: Record<string, number> = agg.countries || {};
  const krCount = countries['KR'] || 0;
  const zzCount = countries['ZZ'] || 0;
  const abroadCount = Object.entries(countries).reduce((s, [k, v]) => (k !== 'KR' && k !== 'ZZ' ? s + v : s), 0);
  const localPie = [
    { name: '국내', value: krCount },
    { name: '해외', value: abroadCount },
    ...(zzCount ? [{ name: '미상', value: zzCount }] : []),
  ].filter((d) => d.value > 0);
  const countryTop = topEntries(Object.fromEntries(Object.entries(countries).filter(([k]) => k !== 'ZZ')), 10);

  // 시간대 0~23
  const hours = agg.hours || {};
  const hourData = Array.from({ length: 24 }, (_, h) => ({ name: `${h}시`, value: hours[String(h)] || 0 }));

  const SEARCH_LABEL: Record<string, string> = { google: '구글', naver: '네이버', daum: '다음', bing: '빙', yahoo: '야후', duckduckgo: 'DuckDuckGo', yandex: 'Yandex', baidu: 'Baidu', '기타검색': '기타검색' };
  const searchData = topEntries(agg.search || {}, 8, new Map(Object.entries(SEARCH_LABEL)));
  const DEVICE_LABEL: Record<string, string> = { mobile: '모바일', desktop: '데스크톱' };

  return (
    <div className="space-y-8">
      {/* 기간 필터 + CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded border border-gray-200 overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-sm ${period === p.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >{p.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>CSV 내보내기</Button>
          <Button variant="secondary" onClick={onRefresh}>새로고침</Button>
          <Button variant="secondary" onClick={handleReset} loading={resetting}>초기화</Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="페이지뷰(기간)" value={agg.pageviews} />
        <SummaryCard label="방문·고유(기간)" value={agg.visits} />
        <SummaryCard label="평균 체류시간" value={fmtDwell(agg.avgDwellMs)} />
        <SummaryCard label="전체 누적 PV" value={stats.totals?.pageviews ?? 0} />
      </div>

      {/* 추이 */}
      <Card title="일별 추이 (페이지뷰 · 방문)">
        {agg.trend.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={agg.trend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="pageviews" name="페이지뷰" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="visits" name="방문" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* 국가 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="국내 / 해외 비율">
          {localPie.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">데이터 없음</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={localPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {localPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="국가 Top">
          <HBar data={countryTop} empty="데이터 없음" />
        </Card>
      </div>

      {/* 시간대 */}
      <Card title="시간대별 분포 (KST)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
            <Tooltip />
            <Bar dataKey="value" name="조회" fill={BAR} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 작품 / 전시 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="작품별 조회 Top"><HBar data={topEntries(agg.artworks, 10, artMap)} empty="작품 조회 데이터 없음" /></Card>
        <Card title="전시별 조회 Top"><HBar data={topEntries(agg.exhibitions, 10, exMap)} empty="전시 조회 데이터 없음" /></Card>
      </div>

      {/* 시리즈 / 주제 (핵심) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="시리즈별 인기 Top"><HBar data={topEntries(agg.series, 10)} empty="시리즈 데이터 없음" /></Card>
        <Card title="주제별 인기 Top"><HBar data={topEntries(agg.themes, 10)} empty="주제 데이터 없음" /></Card>
      </div>

      {/* 유입 / 검색엔진 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="검색엔진별 유입"><HBar data={searchData} empty="검색 유입 없음" /></Card>
        <Card title="유입 경로 (referrer)"><HBar data={topEntries(agg.referrers, 10)} empty="데이터 없음" /></Card>
      </div>

      {/* 페이지 / 기기 / 브라우저 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="페이지별 인기"><HBar data={topEntries(agg.paths, 10)} empty="데이터 없음" /></Card>
        <Card title="기기"><HBar data={topEntries(agg.devices, 5, new Map(Object.entries(DEVICE_LABEL)))} empty="데이터 없음" /></Card>
        <Card title="브라우저"><HBar data={topEntries(agg.browsers, 8)} empty="데이터 없음" /></Card>
      </div>

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          {stats.updated_at ? `마지막 업데이트: ${new Date(stats.updated_at).toLocaleString('ko-KR')}` : '아직 수집된 데이터가 없습니다.'}
          {range.from && ` · 기간 ${range.from} ~ ${range.to}`}
        </p>
      </div>
    </div>
  );
}
