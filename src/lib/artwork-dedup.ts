// 작품 중복 판정 키: 제목(한글 또는 영문) + 연도 + 세로 + 가로 가 모두 같으면 중복.
// 대소문자·앞뒤/연속 공백 무시. 단일 추가 폼과 일괄 업로더가 공유한다.

function norm(s: string | null | undefined): string {
  // NFC 정규화 필수: macOS 파일명은 NFD(분해형)이라, 같은 글자라도 NFC 기존본과
  // 코드포인트가 달라 중복 판정이 어긋난다. 먼저 NFC로 합친 뒤 비교한다.
  return (s || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface DupKeyFields {
  title?: string | null;
  title_en?: string | null;
  year?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
}

export function artworkDupKey(a: DupKeyFields): string {
  // 제목은 채워진 쪽(한글 우선, 없으면 영문)을 대표값으로 사용
  const title = norm((a.title && String(a.title).trim()) ? String(a.title) : String(a.title_en ?? ''));
  const year = String(a.year ?? '').trim();
  const width = String(a.width ?? '').trim();
  const height = String(a.height ?? '').trim();
  return `${title}|${year}|${width}|${height}`;
}
