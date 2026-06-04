// 클라이언트 안전(서버 SDK 미포함) Cloudinary crop URL 유틸.
// 편집기 이미지 자르기는 재업로드 없이 `c_crop` URL 변환으로 처리한다(비파괴).
// 우리가 넣는 crop 변환은 항상 `/upload/` 바로 뒤 첫 변환 컴포넌트라,
// 원본 대비 좌표를 쓰며 다시 자를 때 기존 crop을 '교체'한다(해제/재조정 가능).
//
// 좌표는 OCR 사진 오려내기(api/press/ocr)와 동일하게 **원본 픽셀 단위**를 쓴다.
// (분수 좌표 w_0.5 등은 환경에 따라 적용되지 않는 경우가 있어 픽셀로 통일)

// `/upload/c_crop,.../` 형태의 우리 crop 컴포넌트 매칭
const CROP_RE = /\/upload\/(c_crop[^/]*)\//;

export function isCloudinaryUrl(url: string): boolean {
  return !!url && url.includes('res.cloudinary.com') && url.includes('/upload/');
}

// 현재 URL에서 우리 crop 변환을 제거한 '원본' URL
export function stripCloudinaryCrop(url: string): string {
  return url.replace(CROP_RE, '/upload/');
}

// 원본(crop 없는) URL에 원본 픽셀 좌표 crop을 적용한 새 URL.
// c: 원본 이미지 기준 픽셀 좌표 {x, y, width, height}.
export function applyCloudinaryCrop(
  baseUrl: string,
  c: { x: number; y: number; width: number; height: number },
): string {
  const r = (n: number) => Math.max(0, Math.round(n));
  const w = r(c.width);
  const h = r(c.height);
  const x = r(c.x);
  const y = r(c.y);
  if (w < 1 || h < 1) return baseUrl;
  const t = `c_crop,x_${x},y_${y},w_${w},h_${h}`;
  // 항상 crop이 없는 원본에 적용한다고 가정(호출 전 stripCloudinaryCrop)
  return baseUrl.replace('/upload/', `/upload/${t}/`);
}
