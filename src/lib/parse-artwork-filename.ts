// 작품 파일명에서 메타데이터를 파싱한다.
// 규칙: "<제목> <세로>x<가로>[cm] <재료/기법> <연도>"
// 예) "Birth and Life 194x97cm Acrylic, swarovski on canvas 2021"
//     "마음의 정원 100x80 캔버스에 유채 2021"  (cm 없어도 인식)
//     -> { title, height, width, medium, year }
//
// 제목 뒤에 나오는 'KxK' 형식을 cm 단위 유무와 상관없이 크기로 인식한다.
// 그 뒤의 (한글/영문) 문자열은 항상 재료, 끝의 4자리 수는 연도.
// 제목/재료에 공백·한글·로마자·하이픈·쉼표가 섞여 있어도 동작하도록,
// 치수와 끝의 4자리 연도를 기준점으로 분리한다.

export interface ParsedArtwork {
  title?: string;
  height?: number; // 세로 (cm)
  width?: number; // 가로 (cm)
  medium?: string;
  year?: number;
}

// 세로 x 가로  (x, X, × 허용 / 소수점 허용 / cm 단위는 선택 — 붙든 안 붙든 크기로 인식)
const DIM_RE = /(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(?:cm)?\b/i;
// 끝에 오는 4자리 연도 (1900~2099)
const YEAR_RE = /\b(19|20)\d{2}\b\s*$/;

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '');
}

export function parseArtworkFilename(filename: string): ParsedArtwork {
  const result: ParsedArtwork = {};
  // NFC 정규화 필수: macOS 파일명은 NFD(분해형)이라 한글이 자모로 분해돼 있어,
  // 이후 한/영 판정(`[가-힣]`)이 한글을 못 알아보고 영문 칸으로 잘못 넣는다.
  let s = stripExtension(filename).normalize('NFC').trim();

  // 1) 끝의 연도 추출
  const yearMatch = s.match(YEAR_RE);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0].trim(), 10);
    s = s.slice(0, yearMatch.index).trim();
  }

  // 2) 치수(세로x가로cm) 추출 — 제목/재료 분리 기준
  const dimMatch = s.match(DIM_RE);
  if (dimMatch && dimMatch.index !== undefined) {
    const h = Math.round(parseFloat(dimMatch[1]));
    const w = Math.round(parseFloat(dimMatch[2]));
    if (h > 0) result.height = h;
    if (w > 0) result.width = w;

    const title = s.slice(0, dimMatch.index).trim();
    const medium = s.slice(dimMatch.index + dimMatch[0].length).trim();
    if (title) result.title = title;
    if (medium) result.medium = medium.replace(/^[,\s]+|[,\s]+$/g, '');
  } else {
    // 치수가 없으면 (연도 제거된) 나머지를 제목으로
    if (s) result.title = s;
  }

  return result;
}
