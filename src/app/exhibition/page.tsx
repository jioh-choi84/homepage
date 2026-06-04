import { getExhibitions } from '@/lib/data';
import { getSpecial } from '@/lib/exhibition';
import type { Exhibition } from '@/types/artwork';
import ExhibitionFeatured from '@/components/exhibition/ExhibitionFeatured';

export const revalidate = 3600;

export default async function Page() {
  const all = (await getExhibitions()) as Exhibition[];
  return <ExhibitionFeatured items={getSpecial(all)} />;
}
