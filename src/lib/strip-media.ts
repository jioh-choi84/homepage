// CKEditor HTML에서 미디어(이미지·유튜브 등)를 제거하고 글(텍스트/단락)만 남긴다.
// 영문 글을 "글만"으로 만들기 위해 한글 본문을 번역하기 전에 적용한다.
export function stripMediaHtml(html: string): string {
  if (!html) return '';
  // 브라우저: DOMParser로 안전하게 제거
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('figure.image, figure.media, img, iframe, oembed, picture, video, source').forEach((el) => el.remove());
      return doc.body.innerHTML;
    } catch {
      // fall through to regex
    }
  }
  // fallback: 정규식 (서버/비DOM 환경)
  return html
    .replace(/<figure[^>]*\bclass="[^"]*\b(?:image|media)\b[^"]*"[\s\S]*?<\/figure>/gi, '')
    .replace(/<(img|iframe|oembed|source)\b[^>]*\/?>(?:[\s\S]*?<\/\1>)?/gi, '')
    .replace(/<(picture|video)\b[\s\S]*?<\/\1>/gi, '');
}
