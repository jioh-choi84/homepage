import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { aggregateStats, getPortfolio, getExhibitions } from '@/lib/data';

const SESSION_COOKIE_NAME = 'admin_session';
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(SESSION_COOKIE_NAME);
}

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// 관리자 전용 통계 CSV 내보내기. ?from&to(YYYY-MM-DD, 미지정=전체).
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const agg = await aggregateStats(from, to);

  // 작품/전시 id → 제목 매핑
  const [arts, exs] = await Promise.all([getPortfolio().catch(() => []), getExhibitions().catch(() => [])]);
  const artMap = new Map<string, string>(arts.map((a: Record<string, unknown>) => [String(a.id), String(a.title || a.id)]));
  const exMap = new Map<string, string>(exs.map((e: Record<string, unknown>) => [String(e.id), String(e.title || e.id)]));

  const lines: string[] = [];
  lines.push(`# 통계 내보내기,${from || '전체'} ~ ${to || '전체'}`);
  lines.push('');
  lines.push('항목,값');
  lines.push(`총 페이지뷰,${agg.pageviews}`);
  lines.push(`총 방문(고유),${agg.visits}`);
  lines.push(`평균 체류시간(초),${Math.round((agg.avgDwellMs || 0) / 1000)}`);
  lines.push('');

  const section = (title: string, label: string, obj: Record<string, number>, mapKey?: (k: string) => string) => {
    lines.push(`# ${title}`);
    lines.push(`${label},조회수`);
    Object.entries(obj || {})
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => lines.push(`${esc(mapKey ? mapKey(k) : k)},${v}`));
    lines.push('');
  };

  lines.push('# 일별 추이');
  lines.push('날짜,페이지뷰,방문');
  (agg.trend || []).forEach((t: { date: string; pageviews: number; visits: number }) =>
    lines.push(`${t.date},${t.pageviews},${t.visits}`));
  lines.push('');

  section('국가', '국가코드', agg.countries);
  section('시간대', '시(KST)', agg.hours);
  section('작품 조회', '작품', agg.artworks, (k) => artMap.get(k) || k);
  section('전시 조회', '전시', agg.exhibitions, (k) => exMap.get(k) || k);
  section('시리즈', '시리즈', agg.series);
  section('주제', '주제', agg.themes);
  section('검색엔진 유입', '검색엔진', agg.search);
  section('유입 경로', 'referrer', agg.referrers);
  section('페이지', '경로', agg.paths);
  section('기기', 'device', agg.devices);
  section('브라우저', 'browser', agg.browsers);

  const csv = '﻿' + lines.join('\n'); // UTF-8 BOM (엑셀 한글 깨짐 방지)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stats_${from || 'all'}_${to || 'all'}.csv"`,
    },
  });
}
