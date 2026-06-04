// Client-side fetch cache — window 전역에 저장
const CACHE_TTL = 5 * 60 * 1000; // 5분

interface CacheEntry {
  data: unknown;
  ts: number;
}

function getCache(): Map<string, CacheEntry> {
  if (typeof window === 'undefined') return new Map();
  const w = window as unknown as { __fetchCache?: Map<string, CacheEntry> };
  if (!w.__fetchCache) {
    w.__fetchCache = new Map();
  }
  return w.__fetchCache;
}

export async function cachedFetch<T>(url: string, ttl = CACHE_TTL): Promise<T> {
  const cache = getCache();
  const now = Date.now();
  const cached = cache.get(url);
  
  if (cached && now - cached.ts < ttl) {
    return cached.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  
  cache.set(url, { data, ts: now });
  return data as T;
}

export function getCached<T>(url: string, ttl = CACHE_TTL): T | null {
  const cache = getCache();
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now - cached.ts < ttl) {
    return cached.data as T;
  }
  return null;
}

export function invalidateCache(url?: string) {
  const cache = getCache();
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}
