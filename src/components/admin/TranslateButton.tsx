'use client';

import { useState } from 'react';

type Translation = { id: string; text: string };

/** 여러 문자열을 순서대로 번역. 실패 항목은 null. (배열 필드 등 커스텀 처리용) */
export async function translateMany(texts: string[]): Promise<(string | null)[]> {
  const items = texts.map((t, i) => ({ id: String(i), text: t }));
  const map = await callTranslate(items.filter((it) => it.text.trim()));
  return texts.map((_, i) => (map[String(i)] !== undefined ? map[String(i)] : null));
}

async function callTranslate(items: { id: string; text: string }[]): Promise<Record<string, string>> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '번역 실패');
  const out: Record<string, string> = {};
  for (const t of (json.translations || []) as Translation[]) out[t.id] = t.text;
  return out;
}

/** 영문칸 옆 단일 필드 번역 버튼. 한글(source)을 번역해 onResult로 채운다(덮어씀). */
export function TranslateButton({
  source,
  onResult,
  className = '',
}: {
  source: string;
  onResult: (en: string) => void;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const disabled = !source.trim() || loading;

  const run = async () => {
    if (disabled) return;
    setLoading(true);
    setErr(false);
    try {
      const map = await callTranslate([{ id: 'x', text: source }]);
      if (map.x !== undefined) onResult(map.x);
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      title={err ? '번역 실패 — 다시 시도' : '한글을 AI로 영작'}
      className={`shrink-0 px-2 py-1 text-xs rounded border transition-colors ${
        disabled
          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
          : err
            ? 'border-red-300 text-red-500 hover:bg-red-50'
            : 'border-blue-300 text-blue-600 hover:bg-blue-50'
      } ${className}`}
    >
      {loading ? '…' : err ? '재시도' : 'AI 영작'}
    </button>
  );
}

export type TranslatePair = {
  source: string;
  target: string;
  apply: (en: string) => void;
};

/** 폼 상단 일괄 버튼. source가 있고(onlyEmpty면 target이 빈) 쌍만 모아 1회 호출로 채운다. */
export function TranslateAllButton({
  pairs,
  onlyEmpty = true,
  onToast,
  className = '',
}: {
  pairs: TranslatePair[];
  onlyEmpty?: boolean;
  onToast?: (m: string) => void;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const targets = pairs
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.source.trim() && (!onlyEmpty || !p.target.trim()));
    if (targets.length === 0) {
      onToast?.(onlyEmpty ? '채울 빈 영문칸이 없습니다' : '번역할 한글이 없습니다');
      return;
    }
    setLoading(true);
    try {
      const map = await callTranslate(targets.map((t) => ({ id: String(t.i), text: t.source })));
      let n = 0;
      for (const t of targets) {
        const en = map[String(t.i)];
        if (en !== undefined) { t.apply(en); n++; }
      }
      onToast?.(n > 0 ? `${n}개 영문 채움` : '번역 결과가 없습니다');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className={`px-3 py-1.5 text-xs rounded border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 ${className}`}
    >
      {loading ? '영작 중…' : (onlyEmpty ? 'AI로 영문 일괄 채우기' : 'AI로 영문 전체 다시 영작')}
    </button>
  );
}
