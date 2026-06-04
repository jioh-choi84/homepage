'use client';

import Image from 'next/image';
import { Artwork } from '@/types/artwork';

interface HeroProps {
  featuredArtwork?: Artwork;
}

export default function Hero({ featuredArtwork }: HeroProps) {
  const scrollToWorks = () => {
    const element = document.getElementById('featured-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background image */}
      {featuredArtwork ? (
        <Image
          src={featuredArtwork.image_url}
          alt={featuredArtwork.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--accent)]" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-[var(--foreground)]">
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-7xl font-light tracking-wide">
          Chuni Park
        </h1>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToWorks}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[var(--foreground)]/70 hover:text-[var(--foreground)] transition-colors"
        aria-label="아래로 스크롤"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-bounce-slow"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </section>
  );
}
