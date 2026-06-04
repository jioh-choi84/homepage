import { getPress } from '@/lib/data';
import { PRESS_CATEGORIES, type Press, type PressCategory } from '@/types/artwork';
import { PressOverview } from '@/components/press/PressView';

export const revalidate = 3600;

export default async function Page() {
  const all = (await getPress()) as Press[];
  const covers: Partial<Record<PressCategory, string>> = {};
  for (const c of PRESS_CATEGORIES) {
    const first = all.find((p) => p.category === c.value && p.thumbnail_url);
    if (first?.thumbnail_url) covers[c.value] = first.thumbnail_url;
  }
  return <PressOverview covers={covers} />;
}
