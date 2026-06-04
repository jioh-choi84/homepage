import { Artwork } from '@/types/artwork';
import Slideshow from '@/components/landing/Slideshow';
import { getFeaturedArtworks } from '@/lib/data';

export const revalidate = 3600;

export default async function Home() {
  const featuredArtworks = await getFeaturedArtworks() as Artwork[];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Slideshow artworks={featuredArtworks} />
    </main>
  );
}
