import { getPublicPortfolio } from '@/lib/data';
import { GENRE_OPTIONS, DEFAULT_GENRE, type Artwork, type ArtworkGenre } from '@/types/artwork';
import WorksOverview from '@/components/works/WorksOverview';

export const revalidate = 3600;

export default async function Page() {
  const all = (await getPublicPortfolio()) as Artwork[];
  const covers: Partial<Record<ArtworkGenre, string>> = {};
  for (const g of GENRE_OPTIONS) {
    const first = all.find((a) => (a.genre || DEFAULT_GENRE) === g.value);
    if (first) covers[g.value] = first.image_url;
  }
  return <WorksOverview covers={covers} />;
}
