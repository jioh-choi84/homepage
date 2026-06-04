'use client';

import { Artwork } from '@/types/artwork';
import ArtworkCard from './ArtworkCard';

interface ArtworkGridProps {
  artworks: Artwork[];
  onSelect: (artwork: Artwork, index: number) => void;
}

export default function ArtworkGrid({ artworks, onSelect }: ArtworkGridProps) {
  if (artworks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--text-secondary)]">아직 등록된 작품이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {artworks.map((artwork, index) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
          onClick={() => onSelect(artwork, index)}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
