import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Cloudinary URL에 transformation을 삽입하는 유틸
export function optimizeCloudinaryUrl(
  url: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  }
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const transforms: string[] = [];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  transforms.push(`c_${options?.crop || 'limit'}`);
  transforms.push(`q_${options?.quality || 'auto'}`);
  transforms.push(`f_${options?.format || 'auto'}`);

  const transformStr = transforms.join(',');
  return url.replace('/upload/', `/upload/${transformStr}/`);
}

// Next.js Image loader for Cloudinary
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (!src.includes('res.cloudinary.com')) return src;

  const q = quality || 'auto';
  return src.replace('/upload/', `/upload/w_${width},c_limit,q_${q},f_auto/`);
}
