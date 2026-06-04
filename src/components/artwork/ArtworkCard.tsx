'use client';

import Image from 'next/image';
import { Artwork } from '@/types/artwork';
import { useLocale } from '@/i18n';
import { getLocalizedValue } from '@/lib/i18n-utils';
import { cloudinaryLoader } from '@/lib/cloudinary-loader';

interface ArtworkCardProps {
  artwork: Artwork;
  onClick: () => void;
  priority?: boolean;
}

export default function ArtworkCard({ artwork, onClick, priority = false }: ArtworkCardProps) {
  const { locale, t } = useLocale();
  const title = getLocalizedValue(locale, artwork.title, artwork.title_en);
  const isCloudinary = artwork.image_url?.includes('res.cloudinary.com');

  return (
    <button
      onClick={onClick}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      aria-label={`${t.aria.viewArtwork}: ${title}`}
    >
      {/* 이미지 영역 */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{ backgroundColor: artwork.dominant_color || 'var(--background)' }}
      >
        <Image
          src={artwork.image_url}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain transition-transform duration-500 group-hover:scale-105"
          priority={priority}
          {...(isCloudinary ? { loader: cloudinaryLoader } : {})}
        />
      </div>
      {/* 하단 정보 영역 - 항상 표시 */}
      <div className="py-2 bg-[var(--background)]">
        <p className="text-[var(--foreground)] text-sm font-medium truncate">{title}</p>
        <p className="text-[var(--text-secondary)] text-xs mt-0.5">{artwork.year}</p>
      </div>
    </button>
  );
}
