// 브라우저에서 큰 이미지를 업로드 전에 자동으로 축소·WebP 압축한다.
// Cloudinary 무료 플랜의 10MB 업로드 제한을 넘지 않도록 보장한다.
// 원본이 이미 제한 이하이면 그대로 둔다(화질 보존). 제한을 넘을 때만 압축한다.

export interface CompressOptions {
  /** 긴 변(가로/세로 중 큰 쪽) 최대 픽셀. 초과 시 비율 유지하며 축소 */
  maxEdge?: number;
  /** 결과 파일 최대 바이트. 이 값 이하가 되도록 품질/크기를 단계적으로 낮춤 */
  maxBytes?: number;
  /** 첫 인코딩 품질(0~1) */
  initialQuality?: number;
  /** 더 낮추지 않는 최저 품질 */
  minQuality?: number;
}

// 고화질 기본값: 긴 변 4000px, 9.5MB(10MB 제한 안전 여유), WebP q0.92~0.6
const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 4000,
  maxBytes: Math.floor(9.5 * 1024 * 1024),
  initialQuality: 0.92,
  minQuality: 0.6,
};

/** 비율을 유지하며 긴 변이 maxEdge 이하가 되는 목표 크기를 계산한다(순수 함수). */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function drawTo(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

export function isTiff(file: File): boolean {
  return /image\/tiff/i.test(file.type) || /\.tiff?$/i.test(file.name);
}

interface ImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

// 파일을 캔버스에 그릴 수 있는 소스로 디코딩. TIFF는 브라우저가 못 푸므로 utif로 디코딩.
async function loadImageSource(file: File): Promise<ImageSource> {
  if (isTiff(file)) {
    const UTIF = (await import('utif')).default ?? (await import('utif'));
    const buf = await file.arrayBuffer();
    const ifds = UTIF.decode(buf);
    if (!ifds.length) throw new Error('TIFF decode: no image');
    UTIF.decodeImage(buf, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const w = ifds[0].width as number;
    const h = ifds[0].height as number;
    const full = document.createElement('canvas');
    full.width = w;
    full.height = h;
    const fctx = full.getContext('2d');
    if (!fctx) throw new Error('canvas 2d context unavailable');
    const clamped = new Uint8ClampedArray(w * h * 4);
    clamped.set(rgba);
    fctx.putImageData(new ImageData(clamped, w, h), 0, 0);
    return { source: full, width: w, height: h };
  }
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close?.() };
}

/**
 * 필요 시 이미지를 압축해 WebP File 로 반환한다.
 * - 원본이 maxBytes 이하면 원본 그대로 반환(재인코딩 안 함 → 화질 보존)
 * - 초과 시 긴 변을 maxEdge 로 축소 후 WebP 인코딩, 여전히 크면 품질을 단계적으로 낮추고,
 *   최저 품질에서도 크면 크기를 0.85배씩 줄여 재시도한다.
 * - 어떤 이유로든 압축에 실패하면 원본 파일을 그대로 반환한다(상위에서 처리).
 */
export async function compressImage(file: File, options?: CompressOptions): Promise<File> {
  const opts = { ...DEFAULTS, ...options };
  const tiff = isTiff(file);

  // TIFF는 항상 WebP로 변환(브라우저가 TIFF를 직접 표시 못 함).
  // 그 외 포맷은 이미 제한 이하면 원본 보존(재인코딩 안 함).
  if (!tiff && file.size <= opts.maxBytes) return file;

  // 브라우저 기능 가드
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return file;
  }

  let img: ImageSource;
  try {
    img = await loadImageSource(file);
  } catch {
    return file; // 디코딩 실패 시 원본 반환(상위에서 처리)
  }

  try {
    let { width, height } = computeTargetSize(img.width, img.height, opts.maxEdge);

    // 최대 5회: (긴변 축소 → 품질 하향) 조합으로 maxBytes 이하 달성 시도
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = drawTo(img.source, width, height);
      let quality = opts.initialQuality;
      let best: Blob | null = null;

      while (quality >= opts.minQuality) {
        const blob = await canvasToBlob(canvas, 'image/webp', quality);
        if (!blob) break;
        best = blob;
        if (blob.size <= opts.maxBytes) {
          return toWebpFile(file, blob);
        }
        quality -= 0.1;
      }

      // 최저 품질에서도 큼 → 크기를 줄여 재시도
      if (best && best.size <= opts.maxBytes) return toWebpFile(file, best);
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }

    // 마지막 시도 결과라도 반환(원본보다는 작음). 실패 시 원본.
    const finalCanvas = drawTo(img.source, width, height);
    const finalBlob = await canvasToBlob(finalCanvas, 'image/webp', opts.minQuality);
    return finalBlob ? toWebpFile(file, finalBlob) : file;
  } catch {
    return file;
  } finally {
    img.close?.();
  }
}

function toWebpFile(original: File, blob: Blob): File {
  const base = original.name.replace(/\.[^./\\]+$/, '');
  return new File([blob], `${base}.webp`, { type: 'image/webp' });
}
