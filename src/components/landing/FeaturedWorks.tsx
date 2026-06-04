'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Artwork } from '@/types/artwork';
import ArtworkCard from '@/components/artwork/ArtworkCard';
import ArtworkModal from '@/components/artwork/ArtworkModal';

interface FeaturedWorksProps {
  artworks: Artwork[];
}

export default function FeaturedWorks({ artworks }: FeaturedWorksProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedArtwork = selectedIndex !== null ? artworks[selectedIndex] : null;

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < artworks.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (artworks.length === 0) {
    return null;
  }

  return (
    <>
      <section id="featured-works" className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl md:text-3xl text-center mb-12">
            Selected Works
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {artworks.slice(0, 6).map((artwork, index) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onClick={() => setSelectedIndex(index)}
                priority={index < 3}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/works"
              className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <span>View All Works</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          onClose={() => setSelectedIndex(null)}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={selectedIndex !== null && selectedIndex > 0}
          hasNext={selectedIndex !== null && selectedIndex < artworks.length - 1}
        />
      )}
    </>
  );
}
