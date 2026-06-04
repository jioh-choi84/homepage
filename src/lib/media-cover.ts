// 대표이미지 fallback — 대표이미지가 없을 때 본문에서 표지를 도출한다.
// 우선순위: 지정 썸네일 → 본문 첫 이미지 → 본문 첫 유튜브 영상의 썸네일(정지화면).

export function youtubeIdFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const m = html.match(/(?:youtube\.com\/(?:watch\?[^"'&]*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function firstImageFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const m = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// 유튜브 영상 썸네일(첫 화면). hqdefault는 항상 존재.
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** 표지 이미지 URL 결정. 없으면 null. */
export function coverImage(thumbnail_url?: string | null, content?: string | null): string | null {
  if (thumbnail_url && thumbnail_url.trim()) return thumbnail_url;
  const img = firstImageFromHtml(content);
  if (img) return img;
  const yt = youtubeIdFromHtml(content);
  if (yt) return youtubeThumb(yt);
  return null;
}
